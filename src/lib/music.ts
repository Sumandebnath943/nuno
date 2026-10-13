// A tiny step sequencer for the soundtracks. Every track is a few bars of
// drums, bass, chords and a melody written as scale steps, synthesised live.
// It schedules a fraction of a second ahead and sleeps while the tab is hidden.
import { audio, musicOut, noise, tone } from './sound';
import { getSettings, subscribeSettings } from './settings';

type Wave = OscillatorType;

/** A pattern is one character per step: 'x' hit, '.' rest (drums); digits are scale steps. */
export interface Track {
  id: string;
  name: string;
  bpm: number;
  /** Steps per bar: 16 (4/4) or 12 (6/8). */
  steps?: number;
  /** Delay every other step by this fraction of a step. */
  swing?: number;
  /** MIDI note of the key's root. */
  root: number;
  /** Semitones of the scale. */
  scale: number[];
  /** Chord root (scale step) for each bar. The progression loops. */
  chords: number[];
  drums: {
    kick?: string;
    snare?: string;
    hat?: string;
    /** Japanese drum or timpani. */
    taiko?: string;
    clap?: string;
    /** Extra hats when the game gets tense. */
    hatTense?: string;
  };
  /** Bass: scale step offsets from the chord root, '.' rest. */
  bass?: { pattern: string; wave?: Wave; octave?: number; vol?: number; cut?: number };
  /** Chord stabs or pads. */
  pad?: { pattern: string; wave?: Wave; vol?: number; len?: number; cut?: number; voicing?: number[] };
  /** Arpeggio over the chord. */
  arp?: { pattern: string; wave?: Wave; vol?: number; octave?: number; cut?: number };
  /** Melody, one string per bar; letters a–k are scale steps 0–10 above the root, '-' holds, '.' rests. */
  lead?: { bars: string[]; wave?: Wave; vol?: number; octave?: number; vibrato?: [number, number]; cut?: number; pluck?: boolean };
  /** Power chords through a fuzz (rock tracks). */
  guitar?: { pattern: string; vol?: number };
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function degree(t: Track, step: number, octave = 0): number {
  const len = t.scale.length;
  const o = Math.floor(step / len);
  const i = ((step % len) + len) % len;
  return midi(t.root + t.scale[i] + 12 * (o + octave));
}

let fuzz: WaveShaperNode | null = null;
function fuzzNode(a: AudioContext, out: AudioNode): AudioNode {
  if (!fuzz) {
    fuzz = a.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      curve[i] = Math.tanh(x * 6) * 0.6;
    }
    fuzz.curve = curve;
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    fuzz.connect(lp).connect(out);
  }
  return fuzz;
}

class Sequencer {
  private track: Track | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextTime = 0;
  private intensity = 0;
  private wanted: Track | null = null;

  constructor() {
    subscribeSettings(() => this.sync());
    document.addEventListener('visibilitychange', () => this.sync());
  }

  /** Ask for a track. It starts once audio is allowed (after the first tap). */
  play(track: Track) {
    if (this.wanted?.id === track.id && this.timer) return;
    this.wanted = track;
    this.sync(true);
  }

  stop() {
    this.wanted = null;
    this.sync();
  }

  setIntensity(n: number) {
    this.intensity = n;
  }

  private waiting = false;
  /** Audio isn't allowed yet: try again on the next tap. */
  private waitForTap() {
    if (this.waiting) return;
    this.waiting = true;
    const retry = () => {
      window.removeEventListener('pointerdown', retry);
      this.waiting = false;
      setTimeout(() => this.sync(true), 50);
    };
    window.addEventListener('pointerdown', retry);
  }

  /** Starts or stops the clock to match the settings and tab visibility. */
  sync(restart = false) {
    const s = getSettings();
    const on = !!this.wanted && s.music && !s.muted && s.musicVolume > 0 && !document.hidden;
    if (!on) {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      return;
    }
    if (this.timer && !restart && this.track === this.wanted) return;
    // Browsers only allow audio after the first tap; don't even try before that.
    const tapped = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? true;
    const a = tapped ? audio() : null;
    if (a && a.state === 'suspended') {
      void a.resume().then(() => (a.state === 'running' ? this.sync(true) : this.waitForTap()));
      return;
    }
    if (!a || a.state !== 'running') {
      this.waitForTap();
      return;
    }
    if (this.timer) clearInterval(this.timer);
    if (this.track !== this.wanted) this.step = 0;
    this.track = this.wanted;
    this.nextTime = a.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 60);
  }

  private schedule() {
    const a = audio();
    const out = musicOut();
    const t = this.track;
    if (!a || !out || !t) return;
    const steps = t.steps ?? 16;
    const stepDur = 60 / (t.bpm * (1 + this.intensity * 0.05)) / (steps === 12 ? 3 : 4);
    // Fell asleep (tab in background, slow phone): don't play a backlog.
    if (this.nextTime < a.currentTime - 0.2) this.nextTime = a.currentTime + 0.05;
    while (this.nextTime < a.currentTime + 0.22) {
      const swing = t.swing && this.step % 2 === 1 ? t.swing * stepDur : 0;
      this.playStep(a, out, t, this.step, this.nextTime + swing, stepDur);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private playStep(a: AudioContext, out: AudioNode, t: Track, n: number, at: number, dur: number) {
    const steps = t.steps ?? 16;
    const s = n % steps;
    const bar = Math.floor(n / steps);
    const chord = t.chords[bar % t.chords.length];
    const hit = (p: string | undefined) => !!p && p[s % p.length] === 'x';
    const d = t.drums;

    if (hit(d.kick)) {
      tone(150, 0.16, { at, slide: 42, vol: 0.5, dest: out });
    }
    if (hit(d.snare)) {
      noise(0.14, { at, vol: 0.22, type: 'highpass', freq: 1500, dest: out });
      tone(190, 0.08, { at, type: 'triangle', vol: 0.14, slide: 140, dest: out });
    }
    if (hit(d.clap)) {
      for (let i = 0; i < 3; i++) noise(0.05, { at: at + i * 0.012, vol: 0.16, freq: 1300, q: 1, dest: out });
    }
    if (hit(d.hat) || (this.intensity > 0 && hit(d.hatTense))) {
      noise(0.035, { at, vol: s % 4 === 0 ? 0.08 : 0.05, type: 'highpass', freq: 7500, dest: out });
    }
    if (hit(d.taiko)) {
      tone(110, 0.45, { at, slide: 50, vol: 0.42, dest: out });
      noise(0.1, { at, vol: 0.12, type: 'lowpass', freq: 250, dest: out });
    }

    if (t.bass) {
      const c = t.bass.pattern[s % t.bass.pattern.length];
      if (c && c !== '.') {
        const f = degree(t, chord + Number(c), t.bass.octave ?? -1);
        tone(f, dur * 1.8, { at, type: t.bass.wave ?? 'triangle', vol: t.bass.vol ?? 0.2, filter: t.bass.cut ?? 900, dest: out });
      }
    }

    if (t.pad && t.pad.pattern[s % t.pad.pattern.length] === 'x') {
      const voicing = t.pad.voicing ?? [0, 2, 4];
      for (const v of voicing) {
        tone(degree(t, chord + v, -1), dur * (t.pad.len ?? 3), {
          at,
          type: t.pad.wave ?? 'triangle',
          vol: (t.pad.vol ?? 0.05) / voicing.length * 2,
          attack: 0.02,
          filter: t.pad.cut ?? 2200,
          dest: out,
        });
      }
    }

    if (t.arp) {
      const c = t.arp.pattern[s % t.arp.pattern.length];
      if (c && c !== '.') {
        tone(degree(t, chord + Number(c), t.arp.octave ?? 0), dur * 1.2, {
          at,
          type: t.arp.wave ?? 'square',
          vol: t.arp.vol ?? 0.04,
          filter: t.arp.cut ?? 3000,
          dest: out,
        });
      }
    }

    if (t.guitar && t.guitar.pattern[s % t.guitar.pattern.length] === 'x') {
      const dest = fuzzNode(a, out);
      for (const v of [0, 4]) {
        tone(degree(t, chord + v, -1), dur * 1.6, { at, type: 'sawtooth', vol: t.guitar.vol ?? 0.12, dest });
      }
    }

    if (t.lead) {
      const line = t.lead.bars[bar % t.lead.bars.length];
      const c = line[s];
      if (c && c >= 'a' && c <= 'k') {
        let len = 1;
        while (line[s + len] === '-') len++;
        tone(degree(t, c.charCodeAt(0) - 97, t.lead.octave ?? 0), dur * len * (t.lead.pluck ? 0.9 : 1.05), {
          at,
          type: t.lead.wave ?? 'triangle',
          vol: t.lead.vol ?? 0.07,
          vibrato: t.lead.vibrato,
          filter: t.lead.cut,
          attack: t.lead.pluck ? 0.004 : 0.03,
          dest: out,
        });
      }
    }
  }
}

export const music = new Sequencer();

// ── the classic tracks (themes bring their own) ─────────────

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];

export const CLASSIC_TRACKS: Track[] = [
  {
    id: 'lounge',
    name: 'Card Shark Lounge',
    bpm: 104,
    swing: 0.28,
    root: 50, // D
    scale: DORIAN,
    chords: [0, 3, 6, 4],
    drums: { kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', hatTense: 'xxxxxxxxxxxxxxxx' },
    bass: { pattern: '0...2...4...5.4.', wave: 'triangle', vol: 0.24, cut: 700 },
    pad: { pattern: 'x.....x.........', wave: 'sine', vol: 0.06, len: 5, voicing: [0, 2, 4, 6] },
    lead: {
      bars: ['e-.d.c-.a-------', '..c.d.e-g-e-d...', 'f-.e.d-.c-.a----', '....g.f.e.d.c---'],
      wave: 'triangle',
      vol: 0.06,
      octave: 1,
      vibrato: [5, 3],
    },
  },
  {
    id: 'arcade',
    name: 'Pixel Party',
    bpm: 138,
    root: 60, // C
    scale: MAJOR,
    chords: [0, 4, 5, 3],
    drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', hatTense: 'x.x.x.x.x.x.x.x.' },
    bass: { pattern: '0.0.0.0.4.4.0.0.', wave: 'triangle', vol: 0.22, cut: 1200 },
    arp: { pattern: '0240240242404204', wave: 'square', vol: 0.025, octave: 0, cut: 2600 },
    lead: {
      bars: ['e-e-.g-.e-d-c---', 'd-d-.f-.d-c-b---', 'c-e-g-h-g-e-c-..', 'b-d-f-e-d---....'],
      wave: 'square',
      vol: 0.035,
      octave: 1,
      cut: 3200,
    },
  },
];
