// Tiny WebAudio synth — every NUNO sound is generated, no audio files needed.
let ctx: AudioContext | null = null;
let muted = localStorage.getItem('nuno.muted') === '1';

function ac(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function isMuted() {
  return muted;
}
export function setMuted(m: boolean) {
  muted = m;
  localStorage.setItem('nuno.muted', m ? '1' : '0');
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, delay = 0, slideTo?: number) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, vol = 0.2, filterFreq = 2500, delay = 0, q = 1) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = filterFreq;
  f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

export const sfx = {
  click: () => tone(660, 0.06, 'triangle', 0.12),
  hover: () => tone(1200, 0.03, 'sine', 0.03),
  play: () => {
    noise(0.09, 0.35, 3200, 0, 0.8);
    tone(240, 0.08, 'triangle', 0.08, 0.01, 120);
  },
  draw: (count = 1) => {
    for (let i = 0; i < Math.min(count, 6); i++) noise(0.12, 0.18, 1600 + i * 120, i * 0.09, 1.5);
  },
  deal: () => {
    for (let i = 0; i < 8; i++) noise(0.06, 0.15, 2800, i * 0.07, 1);
  },
  yourTurn: () => {
    tone(784, 0.12, 'triangle', 0.12);
    tone(1046, 0.18, 'triangle', 0.12, 0.1);
  },
  skip: () => {
    tone(220, 0.18, 'square', 0.08, 0, 110);
    tone(180, 0.22, 'square', 0.07, 0.12, 90);
  },
  reverse: () => {
    tone(300, 0.28, 'sawtooth', 0.06, 0, 900);
    tone(900, 0.28, 'sawtooth', 0.05, 0.22, 300);
  },
  wild: () => {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.1, i * 0.06));
  },
  plus: (n: number) => {
    tone(120, 0.45, 'sawtooth', 0.14, 0, 45);
    noise(0.35, 0.3, 300, 0, 0.6);
    for (let i = 0; i < n; i++) tone(880 - i * 90, 0.08, 'square', 0.05, 0.08 + i * 0.07);
  },
  uno: () => {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.2, 'square', 0.07, i * 0.05));
    tone(1568, 0.4, 'triangle', 0.1, 0.27);
  },
  caught: () => {
    tone(880, 0.1, 'square', 0.1);
    tone(660, 0.1, 'square', 0.1, 0.1);
    tone(440, 0.3, 'square', 0.1, 0.2, 200);
  },
  challenge: () => {
    for (let i = 0; i < 6; i++) tone(140 + i * 25, 0.08, 'square', 0.07, i * 0.07);
  },
  guilty: () => {
    tone(300, 0.15, 'sawtooth', 0.1);
    tone(200, 0.4, 'sawtooth', 0.1, 0.15, 90);
  },
  innocent: () => {
    [392, 523, 659].forEach((f, i) => tone(f, 0.2, 'triangle', 0.1, i * 0.08));
  },
  win: () => {
    const notes = [523, 659, 784, 1046, 784, 1046, 1318, 1568];
    notes.forEach((f, i) => tone(f, 0.25, 'triangle', 0.12, i * 0.11));
    notes.forEach((f, i) => tone(f / 2, 0.25, 'sine', 0.08, i * 0.11));
  },
  lose: () => {
    [392, 370, 349, 330].forEach((f, i) => tone(f, 0.35, 'triangle', 0.1, i * 0.25));
  },
  pop: () => tone(900, 0.07, 'sine', 0.12, 0, 1400),
  error: () => tone(160, 0.12, 'square', 0.06),
};
