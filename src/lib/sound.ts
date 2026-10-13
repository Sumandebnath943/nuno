// WebAudio synth — every NUNO sound (and the music) is generated, no audio files.
//
// Signal path: voices → sfx bus / music bus → master → compressor → speakers.
// Noise is pre-rendered once and reused: allocating a fresh buffer for every
// shuffle or slap used to churn memory on phones and make long games stutter.
import { getSettings, subscribeSettings, updateSettings } from './settings';

let ctx: AudioContext | null = null;
let master: GainNode;
let sfxBus: GainNode;
let musicBus: GainNode;
let noiseBuf: AudioBuffer;
let active = 0;
const MAX_VOICES = 48;

function create(): AudioContext | null {
  if (ctx) return ctx;
  const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  ctx = new C({ latencyHint: 'interactive' });
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 10;
  comp.ratio.value = 4;
  comp.attack.value = 0.004;
  comp.release.value = 0.2;
  master = ctx.createGain();
  sfxBus = ctx.createGain();
  musicBus = ctx.createGain();
  sfxBus.connect(master);
  musicBus.connect(master);
  master.connect(comp).connect(ctx.destination);
  // Two seconds of white noise, played from a random offset each time.
  const len = ctx.sampleRate * 2;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  applyVolumes();
  return ctx;
}

function applyVolumes() {
  if (!ctx) return;
  const s = getSettings();
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(s.muted ? 0 : 1, t, 0.03);
  sfxBus.gain.setTargetAtTime(s.sfxVolume, t, 0.03);
  musicBus.gain.setTargetAtTime(s.music ? s.musicVolume * 0.55 : 0, t, 0.08);
}
subscribeSettings(applyVolumes);

/** The audio context, created on first use (browsers only allow it after a tap). */
export function audio(): AudioContext | null {
  if (getSettings().muted) return null;
  const a = create();
  if (a && a.state === 'suspended') void a.resume();
  return a;
}

/** The audio context even when game sounds are muted (voice chat needs it). */
export function audioContext(): AudioContext | null {
  const a = create();
  if (a && a.state === 'suspended' && (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive !== false)
    void a.resume();
  return a;
}

export function musicOut(): AudioNode | null {
  return audio() ? musicBus : null;
}

export function isMuted() {
  return getSettings().muted;
}
export function setMuted(m: boolean) {
  updateSettings({ muted: m });
}

// ── primitives ──────────────────────────────────────────────

export interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  delay?: number;
  /** Absolute start time (music scheduling). Overrides `delay`. */
  at?: number;
  /** Glide to this frequency by the end. */
  slide?: number;
  attack?: number;
  /** Vibrato: [rate Hz, depth Hz]. */
  vibrato?: [number, number];
  /** Low-pass cut-off; `filterTo` sweeps it over the note. */
  filter?: number;
  filterTo?: number;
  q?: number;
  detune?: number;
  dest?: AudioNode;
}

function voiceOk(): boolean {
  return active < MAX_VOICES;
}

function track(node: AudioScheduledSourceNode) {
  active++;
  node.onended = () => {
    active--;
    node.disconnect();
  };
}

export function tone(freq: number, dur: number, o: ToneOpts = {}) {
  const a = audio();
  if (!a || !voiceOk()) return;
  const t = o.at ?? a.currentTime + (o.delay ?? 0);
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.detune) osc.detune.value = o.detune;
  if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
  const vol = o.vol ?? 0.15;
  const atk = o.attack ?? 0.012;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, atk + 0.01));
  let head: AudioNode = osc;
  if (o.filter) {
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(o.filter, t);
    if (o.filterTo) f.frequency.exponentialRampToValueAtTime(o.filterTo, t + dur);
    f.Q.value = o.q ?? 0.8;
    head.connect(f);
    head = f;
  }
  if (o.vibrato) {
    const lfo = a.createOscillator();
    const lg = a.createGain();
    lfo.frequency.value = o.vibrato[0];
    lg.gain.value = o.vibrato[1];
    lfo.connect(lg).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
    lfo.onended = () => lfo.disconnect();
  }
  head.connect(g).connect(o.dest ?? sfxBus);
  track(osc);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export interface NoiseOpts {
  vol?: number;
  freq?: number;
  q?: number;
  type?: BiquadFilterType;
  delay?: number;
  at?: number;
  /** Sweep the filter to this frequency. */
  sweep?: number;
  attack?: number;
  dest?: AudioNode;
}

export function noise(dur: number, o: NoiseOpts = {}) {
  const a = audio();
  if (!a || !voiceOk()) return;
  const t = o.at ?? a.currentTime + (o.delay ?? 0);
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  const f = a.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.frequency.setValueAtTime(o.freq ?? 2500, t);
  if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + dur);
  f.Q.value = o.q ?? 1;
  const g = a.createGain();
  const vol = o.vol ?? 0.2;
  if (o.attack) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + o.attack);
  } else {
    g.gain.setValueAtTime(vol, t);
  }
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(o.dest ?? sfxBus);
  track(src);
  src.start(t, Math.random() * 1.5, dur + 0.05);
}

const rnd = (n: number) => (Math.random() - 0.5) * n;
const notes = (freqs: number[], step: number, dur: number, o: ToneOpts = {}) =>
  freqs.forEach((f, i) => tone(f, dur, { ...o, delay: (o.delay ?? 0) + i * step }));

// ── the sound library ───────────────────────────────────────
// Building blocks, also used by the themes.

export const fxSounds = {
  slap: () => {
    noise(0.09, { vol: 0.3, freq: 3000 + rnd(800), q: 0.8 });
    tone(230 + rnd(30), 0.08, { type: 'triangle', vol: 0.08, delay: 0.01, slide: 120 });
  },
  swish: (delay = 0) => noise(0.14, { vol: 0.14, freq: 1400, sweep: 3200, q: 1.4, delay }),
  riffle: () => {
    for (let i = 0; i < 12; i++) noise(0.05, { vol: 0.13, freq: 2600 + rnd(600), q: 1, delay: i * 0.045 });
  },
  chime: () => {
    tone(784, 0.14, { type: 'triangle', vol: 0.11 });
    tone(1175, 0.22, { type: 'triangle', vol: 0.1, delay: 0.09 });
  },
  boing: (delay = 0) => tone(140, 0.5, { type: 'triangle', vol: 0.18, slide: 420, vibrato: [16, 40], delay }),
  slideUp: (delay = 0) => tone(480, 0.32, { vol: 0.13, slide: 1700, vibrato: [9, 18], delay }),
  slideDown: (delay = 0) => tone(1700, 0.32, { vol: 0.13, slide: 480, vibrato: [9, 18], delay }),
  bonk: () => {
    tone(880, 0.05, { type: 'triangle', vol: 0.16, slide: 600 });
    tone(300, 0.18, { type: 'sine', vol: 0.2, slide: 85, delay: 0.01 });
  },
  nope: (delay = 0) => {
    tone(220, 0.14, { type: 'square', vol: 0.06, slide: 180, delay, filter: 1400 });
    tone(165, 0.22, { type: 'square', vol: 0.06, slide: 120, delay: delay + 0.13, filter: 1200 });
  },
  sadTrombone: (delay = 0) => {
    const seq: [number, number][] = [
      [294, 0.32],
      [277, 0.32],
      [262, 0.32],
      [247, 1.0],
    ];
    let t = delay;
    seq.forEach(([f, d], i) => {
      tone(f, d, {
        type: 'sawtooth',
        vol: 0.1,
        delay: t,
        filter: 380,
        filterTo: 1300,
        q: 4,
        vibrato: i === 3 ? [5, 7] : undefined,
        attack: 0.04,
      });
      t += d + 0.02;
    });
  },
  airhorn: (delay = 0, blasts = 3) => {
    const lens = blasts === 1 ? [0.55] : [0.12, 0.12, 0.5];
    let t = delay;
    for (const d of lens) {
      for (const [f, w] of [
        [462, 'sawtooth'],
        [468, 'sawtooth'],
        [231, 'square'],
      ] as const)
        tone(f, d, { type: w, vol: 0.06, delay: t, filter: 2600, slide: f * 0.97, attack: 0.008 });
      t += d + 0.05;
    }
  },
  boom: (delay = 0, size = 1) => {
    noise(0.7 * size, { vol: 0.42, type: 'lowpass', freq: 380, q: 0.5, delay });
    tone(75, 0.6 * size, { vol: 0.32, slide: 32, delay });
  },
  uhOh: () => {
    tone(523, 0.17, { type: 'triangle', vol: 0.13 });
    tone(392, 0.32, { type: 'triangle', vol: 0.13, delay: 0.19, slide: 360, vibrato: [7, 6] });
  },
  scratch: () => {
    noise(0.11, { vol: 0.32, freq: 2600, sweep: 450, q: 5 });
    noise(0.1, { vol: 0.3, freq: 500, sweep: 2200, q: 5, delay: 0.11 });
  },
  drumroll: (len = 1) => {
    const hits = Math.round(22 * len);
    for (let i = 0; i < hits; i++) {
      const p = i / hits;
      noise(0.07, { vol: 0.05 + p * 0.16, type: 'highpass', freq: 1200, delay: p * 0.9 * len });
    }
    noise(1.1, { vol: 0.2, type: 'highpass', freq: 5200, delay: 0.92 * len });
    tone(110, 0.3, { vol: 0.2, slide: 60, delay: 0.92 * len });
  },
  chaChing: (delay = 0) => {
    noise(0.05, { vol: 0.25, freq: 4000, q: 2, delay });
    tone(2093, 0.55, { vol: 0.09, delay: delay + 0.08 });
    tone(2637, 0.6, { vol: 0.08, delay: delay + 0.1 });
    tone(3136, 0.5, { vol: 0.05, delay: delay + 0.12 });
  },
  whoosh: (delay = 0) => noise(0.38, { vol: 0.24, freq: 350, sweep: 2800, q: 1.2, attack: 0.12, delay }),
  laugh: () => {
    [230, 220, 210, 198, 186].forEach((f, i) => {
      tone(f, 0.1, { type: 'sawtooth', vol: 0.11, delay: i * 0.14, slide: f * 0.85, filter: 1100, q: 3 });
      noise(0.06, { vol: 0.05, freq: 1400, q: 2, delay: i * 0.14 });
    });
  },
  quack: () => {
    for (let i = 0; i < 2; i++) tone(320, 0.14, { type: 'sawtooth', vol: 0.12, slide: 210, filter: 1300, q: 6, delay: i * 0.2 });
  },
  neener: () => {
    // The playground taunt, on a kazoo.
    [392, 330, 440, 392, 330].forEach((f, i) =>
      tone(f, i === 4 ? 0.4 : 0.2, { type: 'sawtooth', vol: 0.08, delay: i * 0.21, filter: 1700, q: 2, vibrato: [24, 5] }),
    );
  },
  pew: (delay = 0) => tone(1600, 0.18, { type: 'square', vol: 0.07, slide: 180, delay }),
  coin: (delay = 0) => {
    tone(988, 0.07, { type: 'square', vol: 0.06, delay });
    tone(1319, 0.28, { type: 'square', vol: 0.06, delay: delay + 0.07 });
  },
  siren: () => {
    for (let i = 0; i < 3; i++) {
      tone(700, 0.18, { type: 'triangle', vol: 0.1, slide: 980, delay: i * 0.36 });
      tone(980, 0.18, { type: 'triangle', vol: 0.1, slide: 700, delay: i * 0.36 + 0.18 });
    }
  },
  rimshot: () => {
    tone(190, 0.13, { vol: 0.22, slide: 120 });
    tone(150, 0.13, { vol: 0.22, slide: 95, delay: 0.16 });
    noise(0.55, { vol: 0.18, type: 'highpass', freq: 6000, delay: 0.32 });
  },
  crickets: () => {
    for (let c = 0; c < 2; c++)
      for (let i = 0; i < 3; i++) tone(4600, 0.035, { vol: 0.05, delay: c * 0.5 + i * 0.06, vibrato: [60, 300] });
  },
  applause: () => {
    for (let i = 0; i < 40; i++) noise(0.05, { vol: 0.05 + Math.random() * 0.06, freq: 2200 + rnd(1500), q: 0.6, delay: Math.random() * 1.2 });
  },
  wolfWhistle: () => {
    tone(800, 0.24, { vol: 0.12, slide: 2300 });
    tone(700, 0.25, { vol: 0.12, slide: 2000, delay: 0.32 });
    tone(2000, 0.3, { vol: 0.12, slide: 520, delay: 0.57 });
  },
  dunDun: () => {
    [196, 185, 175].forEach((f, i) =>
      tone(f, i === 2 ? 1.0 : 0.26, { type: 'sawtooth', vol: 0.1, delay: i * 0.32, filter: 900, vibrato: i === 2 ? [5, 4] : undefined }),
    );
  },
  fanfare: () => {
    notes([523, 659, 784, 1046, 1318], 0.05, 0.2, { type: 'square', vol: 0.06, filter: 3000 });
    tone(1568, 0.4, { type: 'triangle', vol: 0.1, delay: 0.27 });
  },
  tada: () => {
    tone(523, 0.12, { type: 'triangle', vol: 0.12 });
    [523, 659, 784].forEach((f) => tone(f, 0.6, { type: 'triangle', vol: 0.08, delay: 0.14 }));
  },
  tick: (delay = 0) => noise(0.02, { vol: 0.2, freq: 3500, q: 3, delay }),
  flush: () => {
    noise(0.9, { vol: 0.25, type: 'lowpass', freq: 2200, sweep: 200, q: 1 });
    for (let i = 0; i < 6; i++) tone(300 + Math.random() * 600, 0.06, { vol: 0.06, slide: 1200, delay: 0.3 + i * 0.09 });
  },
  sparkle: (up = true, delay = 0) => {
    const run = [1047, 1319, 1568, 2093, 2637];
    notes(up ? run : [...run].reverse(), 0.05, 0.18, { type: 'triangle', vol: 0.07, delay });
    noise(0.4, { vol: 0.05, type: 'highpass', freq: 7000, delay });
  },
  gong: (delay = 0) => {
    tone(110, 2.2, { vol: 0.18, delay, vibrato: [3, 1] });
    tone(222, 1.8, { vol: 0.09, delay });
    tone(331, 1.4, { vol: 0.05, delay });
    noise(0.3, { vol: 0.08, freq: 600, q: 0.6, delay });
  },
  taiko: (delay = 0, vol = 0.32) => {
    tone(120, 0.42, { vol, slide: 52, delay });
    noise(0.12, { vol: vol * 0.6, type: 'lowpass', freq: 260, delay });
  },
  bell: (delay = 0, f = 523) => {
    tone(f, 1.6, { vol: 0.1, delay });
    tone(f * 2.01, 1.1, { vol: 0.05, delay });
    tone(f * 2.98, 0.8, { vol: 0.03, delay });
  },
  shing: (delay = 0) => {
    noise(0.26, { vol: 0.2, freq: 6500, q: 6, delay });
    tone(3300, 0.35, { vol: 0.05, slide: 2900, delay });
    tone(4700, 0.25, { vol: 0.03, delay });
  },
  slash: (delay = 0) => {
    noise(0.2, { vol: 0.26, freq: 900, sweep: 5000, q: 1.5, delay });
    fxSounds.shing(delay + 0.1);
  },
  poof: (delay = 0) => {
    noise(0.32, { vol: 0.3, type: 'lowpass', freq: 1200, sweep: 300, attack: 0.02, delay });
    tone(220, 0.2, { vol: 0.12, slide: 70, delay });
  },
  zip: (delay = 0) => {
    tone(180, 0.16, { type: 'sawtooth', vol: 0.06, slide: 1400, filter: 2500, delay });
    noise(0.18, { vol: 0.14, type: 'highpass', freq: 3000, delay });
  },
  stomp: (delay = 0) => {
    fxSounds.boom(delay, 1.3);
    noise(1.2, { vol: 0.2, type: 'lowpass', freq: 120, delay: delay + 0.05 });
  },
  kiCharge: (delay = 0, len = 0.8) => {
    tone(80, len, { type: 'sawtooth', vol: 0.07, slide: 420, filter: 600, filterTo: 3000, vibrato: [22, 12], delay });
    noise(len, { vol: 0.12, freq: 500, sweep: 4000, q: 1, attack: len * 0.8, delay });
  },
  beam: (delay = 0) => {
    tone(196, 0.9, { type: 'sawtooth', vol: 0.07, filter: 500, filterTo: 3500, vibrato: [30, 8], delay });
    tone(294, 0.9, { type: 'square', vol: 0.05, filter: 800, filterTo: 3000, vibrato: [27, 6], delay });
    noise(0.9, { vol: 0.14, freq: 1500, q: 0.7, delay });
    fxSounds.boom(delay + 0.8);
  },
  cannon: (delay = 0) => {
    noise(0.08, { vol: 0.45, type: 'highpass', freq: 1500, delay });
    fxSounds.boom(delay, 1.1);
  },
  splash: (delay = 0) => {
    noise(0.45, { vol: 0.25, freq: 1400, sweep: 400, q: 0.8, delay });
    for (let i = 0; i < 4; i++) tone(500 + Math.random() * 500, 0.05, { vol: 0.05, slide: 1300, delay: delay + 0.15 + i * 0.07 });
  },
  thunder: (delay = 0) => {
    noise(0.12, { vol: 0.4, type: 'highpass', freq: 2500, delay });
    noise(1.4, { vol: 0.3, type: 'lowpass', freq: 220, delay: delay + 0.05 });
  },
  flame: (delay = 0) => {
    noise(0.7, { vol: 0.22, freq: 700, q: 0.6, attack: 0.15, delay });
    for (let i = 0; i < 6; i++) noise(0.02, { vol: 0.15, freq: 3000, q: 2, delay: delay + Math.random() * 0.6 });
  },
  wind: (delay = 0) => noise(1.0, { vol: 0.22, freq: 300, sweep: 1200, q: 2, attack: 0.4, delay }),
  clank: (delay = 0) => {
    tone(1250, 0.12, { type: 'square', vol: 0.05, filter: 4000, delay });
    tone(1690, 0.18, { type: 'square', vol: 0.04, filter: 4000, delay });
    noise(0.08, { vol: 0.15, type: 'highpass', freq: 3000, delay });
  },
  powerUp: (delay = 0) => {
    fxSounds.kiCharge(delay, 0.7);
    notes([330, 415, 494, 659], 0.08, 0.5, { type: 'sawtooth', vol: 0.05, filter: 2500, delay: delay + 0.5 });
  },
};

// ── game sounds (themes can replace any of these) ───────────

const base = {
  click: () => tone(660, 0.06, { type: 'triangle', vol: 0.12 }),
  hover: () => tone(1200, 0.03, { vol: 0.03 }),
  play: () => fxSounds.slap(),
  draw: (count = 1) => {
    for (let i = 0; i < Math.min(count, 6); i++) fxSounds.swish(i * 0.09);
  },
  deal: () => fxSounds.riffle(),
  yourTurn: () => fxSounds.chime(),
  skip: () => {
    fxSounds.bonk();
    fxSounds.nope(0.12);
  },
  reverse: () => {
    fxSounds.slideUp();
    fxSounds.slideDown(0.32);
  },
  wild: () => fxSounds.sparkle(true),
  /** A draw card hits someone. Bigger hits are louder (and sillier). */
  plus: (n: number) => {
    if (n >= 4) {
      fxSounds.airhorn(0, n >= 6 ? 3 : 1);
      fxSounds.boom(0.15);
    } else {
      fxSounds.uhOh();
      tone(110, 0.35, { type: 'sawtooth', vol: 0.1, slide: 50, filter: 800 });
    }
  },
  uno: () => fxSounds.fanfare(),
  caught: () => {
    fxSounds.siren();
    fxSounds.boing(0.5);
  },
  challenge: () => fxSounds.drumroll(),
  guilty: () => {
    fxSounds.scratch();
    fxSounds.dunDun();
  },
  innocent: () => fxSounds.tada(),
  win: () => {
    const run = [523, 659, 784, 1046, 784, 1046, 1318, 1568];
    run.forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.12, delay: i * 0.11 }));
    run.forEach((f, i) => tone(f / 2, 0.25, { vol: 0.08, delay: i * 0.11 }));
    fxSounds.chaChing(0.95);
  },
  lose: () => fxSounds.sadTrombone(),
  pop: () => tone(900, 0.07, { vol: 0.12, slide: 1400 }),
  error: () => tone(160, 0.12, { type: 'square', vol: 0.06 }),
  swap: () => {
    fxSounds.whoosh();
    fxSounds.slideUp(0.15);
  },
  flip: (dark: boolean) => {
    fxSounds.whoosh();
    fxSounds.sparkle(!dark, 0.2);
  },
  launch: (count: number) => {
    if (count === 0) {
      tone(300, 0.08, { type: 'square', vol: 0.06 });
      tone(240, 0.12, { type: 'square', vol: 0.05, delay: 0.09 });
    } else {
      fxSounds.boing();
      for (let i = 0; i < Math.min(count, 5); i++) fxSounds.pew(0.1 + i * 0.08);
    }
  },
  spinTick: (delay: number) => fxSounds.tick(delay),
  spinStop: () => fxSounds.chime(),
  stack: (total: number) => {
    notes([196, 233, 262, 311].slice(0, Math.min(4, Math.ceil(total / 3))), 0.08, 0.25, { type: 'sawtooth', vol: 0.07, filter: 1500 });
    fxSounds.boom(0.2, 0.7);
  },
  knockout: () => {
    fxSounds.boom(0, 1.4);
    fxSounds.sadTrombone(0.5);
  },
  discardAll: () => fxSounds.flush(),
  roulette: () => {
    for (let i = 0; i < 10; i++) fxSounds.tick(i * 0.06 + i * i * 0.004);
    fxSounds.chaChing(0.9);
  },
  reshuffle: () => fxSounds.riffle(),
};

export type SfxName = keyof typeof base;
type Sfx = typeof base;
export type SfxOverrides = { [K in SfxName]?: Sfx[K] };

let overrides: SfxOverrides = {};

/** Themes swap in their own versions of some sounds. */
export function setSfxOverrides(o: SfxOverrides) {
  overrides = o;
}

export const sfx = Object.fromEntries(
  (Object.keys(base) as SfxName[]).map((k) => [
    k,
    (...args: unknown[]) => {
      if (getSettings().muted) return;
      const fn = (overrides[k] ?? base[k]) as (...a: unknown[]) => void;
      try {
        fn(...args);
      } catch {
        // audio is a nice-to-have; never let it break the game
      }
    },
  ]),
) as unknown as Sfx;

// Browsers start audio suspended until a tap: wake it on the first one.
if (typeof window !== 'undefined') {
  const wake = () => {
    if (!getSettings().muted) audio();
    window.removeEventListener('pointerdown', wake);
    window.removeEventListener('keydown', wake);
  };
  window.addEventListener('pointerdown', wake);
  window.addEventListener('keydown', wake);
}
