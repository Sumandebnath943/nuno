// ─────────────────────────────────────────────────────────────
//  Voice chat. Everyone in a room links straight to everyone else
//  (a full mesh of audio calls over PeerJS), which is fine for the
//  ten people a table holds.
//
//  Every link always carries one audio track: silence while your mic
//  is off, the mic while it's on. Swapping tracks needs no new call,
//  so turning the mic on and off is instant.
//
//  Whether someone's mic is on and whether they're talking travels
//  over the game's data connection (see protocol.ts), so the rings
//  show up the same on every phone.
// ─────────────────────────────────────────────────────────────
import type { MediaConnection, Peer } from 'peerjs';
import type { VoiceState } from './protocol';
import { audioContext } from '../lib/sound';
import { getSettings, subscribeSettings } from '../lib/settings';

export interface VoiceSnapshot {
  /** Your mic is on. */
  mic: boolean;
  /** Waiting for the browser's mic permission. */
  asking: boolean;
  /** Why the mic couldn't be turned on. */
  error: string | null;
  /** You're talking right now. */
  speaking: boolean;
  /** Everyone's mic and talking state, by peer id (yours included). */
  states: Record<string, VoiceState>;
  /** People you've muted, by peer id. */
  muted: Record<string, true>;
  /** People whose audio reaches you, by peer id. */
  linked: Record<string, true>;
  /** Your own peer id ('' until connected). */
  me: string;
}

const EMPTY: VoiceSnapshot = { mic: false, asking: false, error: null, speaking: false, states: {}, muted: {}, linked: {}, me: '' };

/** Talking is louder than this RMS level (0–1)… */
const TALK_ON = 0.035;
/** …and stops once it stays under this for a moment. */
const TALK_OFF = 0.018;
const TALK_HOLD_MS = 450;

export class VoiceChat {
  private peer: Peer | null = null;
  private calls = new Map<string, MediaConnection>();
  private players = new Map<string, HTMLAudioElement>();
  private wanted = new Set<string>();
  private retries = new Map<string, number>();
  private mic: MediaStream | null = null;
  private silence: MediaStreamTrack | null = null;
  private meter: { analyser: AnalyserNode; source: MediaStreamAudioSourceNode; buf: Float32Array<ArrayBuffer> } | null = null;
  private meterTimer: ReturnType<typeof setInterval> | null = null;
  private quietSince = 0;
  private snap: VoiceSnapshot = EMPTY;
  private listeners = new Set<() => void>();
  private unsubSettings: () => void;
  private destroyed = false;
  private blocked = new Set<HTMLAudioElement>();

  /** `report` sends your mic / talking state to the room. */
  constructor(private report: (state: VoiceState) => void) {
    this.unsubSettings = subscribeSettings(() => this.applyOutput());
    window.addEventListener('pointerdown', this.unblock);
  }

  // ── store for React ──────────────────────────────────────
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = () => this.snap;
  private set(patch: Partial<VoiceSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((fn) => fn());
  }

  /** The PeerJS connection is open: start taking calls. */
  attach(peer: Peer) {
    if (this.destroyed) return;
    this.peer = peer;
    this.set({ me: peer.id });
    peer.on('call', (call) => this.incoming(call));
    this.reconcile();
  }

  /** Everyone in the room, by peer id (yours may be included). */
  setParticipants(ids: string[]) {
    this.wanted = new Set(ids.filter((id) => id && id !== this.peer?.id));
    this.reconcile();
  }

  /** The room's latest voice states, from the host. */
  setStates(states: Record<string, VoiceState>) {
    this.set({ states });
  }

  async toggleMic() {
    if (this.snap.mic) this.micOff();
    else await this.micOn();
  }

  toggleMute(peerId: string) {
    const muted = { ...this.snap.muted };
    if (muted[peerId]) delete muted[peerId];
    else muted[peerId] = true;
    this.set({ muted });
    this.applyOutput();
  }

  destroy() {
    this.destroyed = true;
    this.micOff(false);
    for (const c of this.calls.values()) c.close();
    this.calls.clear();
    for (const el of this.players.values()) this.dropPlayer(el);
    this.players.clear();
    this.silence?.stop();
    this.unsubSettings();
    window.removeEventListener('pointerdown', this.unblock);
    this.listeners.clear();
  }

  // ── links ────────────────────────────────────────────────

  /** Call whoever we should be talking to and hang up on whoever left. */
  private reconcile() {
    const peer = this.peer;
    if (!peer || this.destroyed) return;
    for (const [id, call] of this.calls) {
      if (!this.wanted.has(id)) {
        call.close();
        this.forget(id);
      }
    }
    for (const id of this.wanted) {
      // Each pair links once: the lower id calls the higher one.
      if (this.calls.has(id) || peer.id > id) continue;
      const track = this.outTrack();
      if (!track) continue;
      try {
        this.track(peer.call(id, new MediaStream([track])), id);
      } catch {
        // the peer isn't reachable yet; the next lobby update tries again
      }
    }
  }

  private incoming(call: MediaConnection) {
    if (this.destroyed) {
      call.close();
      return;
    }
    const track = this.outTrack();
    call.answer(track ? new MediaStream([track]) : undefined);
    this.calls.get(call.peer)?.close();
    this.track(call, call.peer);
  }

  private track(call: MediaConnection, id: string) {
    this.calls.set(id, call);
    call.on('stream', (stream) => {
      if (this.calls.get(id) !== call) return;
      this.retries.delete(id);
      this.play(id, stream);
    });
    const lost = () => {
      if (this.calls.get(id) !== call) return;
      this.forget(id);
      // Still in the room: try again in a moment (if it's our turn to call).
      const tries = this.retries.get(id) ?? 0;
      if (this.wanted.has(id) && tries < 4) {
        this.retries.set(id, tries + 1);
        setTimeout(() => this.reconcile(), 1500 * (tries + 1));
      }
    };
    call.on('close', lost);
    call.on('error', lost);
  }

  private forget(id: string) {
    this.calls.delete(id);
    const el = this.players.get(id);
    if (el) this.dropPlayer(el);
    this.players.delete(id);
    const linked = { ...this.snap.linked };
    delete linked[id];
    this.set({ linked });
  }

  // ── hearing the others ───────────────────────────────────

  private play(id: string, stream: MediaStream) {
    const old = this.players.get(id);
    if (old) this.dropPlayer(old);
    const el = document.createElement('audio');
    el.autoplay = true;
    el.setAttribute('playsinline', '');
    el.srcObject = stream;
    el.style.display = 'none';
    document.body.appendChild(el);
    this.players.set(id, el);
    this.applyOutput();
    el.play().catch(() => this.blocked.add(el));
    this.set({ linked: { ...this.snap.linked, [id]: true } });
  }

  private dropPlayer(el: HTMLAudioElement) {
    el.pause();
    el.srcObject = null;
    el.remove();
    this.blocked.delete(el);
  }

  /** Phones only let audio start after a tap: retry anything that was refused. */
  private unblock = () => {
    for (const el of this.blocked) el.play().then(() => this.blocked.delete(el), () => {});
  };

  /** Speaker switch, voice volume and per-person mutes. */
  private applyOutput() {
    const s = getSettings();
    for (const [id, el] of this.players) {
      el.muted = !s.voiceSpeaker || !!this.snap.muted[id];
      el.volume = s.voiceVolume;
    }
  }

  // ── your mic ─────────────────────────────────────────────

  /** What we send: the mic if it's on, otherwise a silent track. */
  private outTrack(): MediaStreamTrack | null {
    const live = this.mic?.getAudioTracks()[0];
    if (live && live.readyState === 'live') return live;
    if (this.silence && this.silence.readyState === 'live') return this.silence;
    const a = audioContext();
    if (!a) return null;
    this.silence = a.createMediaStreamDestination().stream.getAudioTracks()[0] ?? null;
    return this.silence;
  }

  private sendTrack(track: MediaStreamTrack | null) {
    if (!track) return;
    for (const call of this.calls.values()) {
      const sender = call.peerConnection?.getSenders().find((x) => !x.track || x.track.kind === 'audio');
      sender?.replaceTrack(track).catch(() => {});
    }
  }

  private async micOn() {
    if (this.snap.asking) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      this.set({ error: 'Voice chat needs a secure (https) page.' });
      return;
    }
    this.set({ asking: true, error: null });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (this.destroyed) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.mic = stream;
      this.sendTrack(stream.getAudioTracks()[0]);
      this.startMeter(stream);
      this.set({ mic: true, asking: false });
      this.report({ mic: true, speaking: false });
    } catch (err) {
      const denied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      this.set({
        asking: false,
        error: denied ? 'Mic blocked — allow it in your browser’s site settings.' : 'No microphone found.',
      });
    }
  }

  private micOff(report = true) {
    this.stopMeter();
    this.mic?.getTracks().forEach((t) => t.stop());
    this.mic = null;
    if (!this.destroyed) this.sendTrack(this.outTrack());
    if (this.snap.mic || this.snap.speaking) this.set({ mic: false, speaking: false });
    if (report) this.report({ mic: false, speaking: false });
  }

  /** Watches your own mic level to light up your ring while you talk. */
  private startMeter(stream: MediaStream) {
    this.stopMeter();
    const a = audioContext();
    if (!a) return;
    const source = a.createMediaStreamSource(stream);
    const analyser = a.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    this.meter = { analyser, source, buf: new Float32Array(analyser.fftSize) };
    this.meterTimer = setInterval(() => this.measure(), 110);
  }

  private stopMeter() {
    if (this.meterTimer) clearInterval(this.meterTimer);
    this.meterTimer = null;
    this.meter?.source.disconnect();
    this.meter = null;
  }

  private measure() {
    const m = this.meter;
    if (!m) return;
    m.analyser.getFloatTimeDomainData(m.buf);
    let sum = 0;
    for (let i = 0; i < m.buf.length; i++) sum += m.buf[i] * m.buf[i];
    const level = Math.sqrt(sum / m.buf.length);
    const now = performance.now();
    let speaking = this.snap.speaking;
    if (level > TALK_ON) {
      speaking = true;
      this.quietSince = now;
    } else if (level > TALK_OFF) {
      this.quietSince = now;
    } else if (speaking && now - this.quietSince > TALK_HOLD_MS) {
      speaking = false;
    }
    if (speaking !== this.snap.speaking) {
      this.set({ speaking });
      this.report({ mic: true, speaking });
    }
  }
}
