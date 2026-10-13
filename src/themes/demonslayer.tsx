// Demon Slayer — "Wisteria Night": a full moon over wisteria, checkered-haori
// card backs, and every colour is a Breathing Style with its own sword form.
import type { Theme, FxKit } from './types';
import type { Pt } from '../fx/engine';
import type { Color } from '../game/types';
import { BackBase, BackClip, byCards, ridgePath, Scene, seeded } from './art';
import { fxSounds } from '../lib/sound';

const INK = '#191428';

function Back() {
  return (
    <>
      <BackBase edge="#f5efe1" fill="url(#t-ds-check)" />
      <BackClip>
        <rect x="5" y="5" width="110" height="176" fill="url(#t-ds-shade)" />
        <circle cx="60" cy="68" r="27" fill="#c62839" stroke="#f5efe1" strokeWidth="3" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <line key={i} x1={60 + Math.cos(a) * 13} y1={68 + Math.sin(a) * 13} x2={60 + Math.cos(a) * 22} y2={68 + Math.sin(a) * 22} stroke="#f5efe1" strokeWidth="2" strokeLinecap="round" />;
        })}
        {/* the blade */}
        <g transform="rotate(-38 60 112)">
          <rect x="-2" y="110" width="124" height="5" rx="2" fill="#d9dfe6" stroke={INK} strokeWidth="1.2" />
          <rect x="-2" y="111.5" width="124" height="1.2" fill="#6aa9e0" />
          <rect x="88" y="104" width="4" height="17" rx="1.5" fill="#d4a017" stroke={INK} strokeWidth="1" />
          <rect x="92" y="109" width="30" height="7" rx="2" fill="#2b2233" />
        </g>
        {/* paper charm with the name */}
        <rect x="47" y="104" width="26" height="70" rx="2" fill="#f5efe1" stroke={INK} strokeWidth="2" />
        <g style={{ fontFamily: 'var(--font-card)' }} textAnchor="middle" fontSize="15" fontWeight="800" fill="#c62839">
          {['N', 'U', 'N', 'O'].map((ch, i) => (
            <text key={i} x="60" y={121 + i * 15}>
              {ch}
            </text>
          ))}
        </g>
      </BackClip>
    </>
  );
}

function Defs() {
  return (
    <>
      <pattern id="t-ds-check" width="22" height="22" patternUnits="userSpaceOnUse">
        <rect width="22" height="22" fill="#1e7a46" />
        <rect width="11" height="11" fill="#111015" />
        <rect x="11" y="11" width="11" height="11" fill="#111015" />
      </pattern>
      <radialGradient id="t-ds-shade" cx="0.5" cy="0.4" r="0.75">
        <stop offset="0" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.55" />
      </radialGradient>
      <pattern id="t-ds-waves" width="24" height="12" patternUnits="userSpaceOnUse">
        {[12, 8, 4].map((r) => (
          <g key={r} fill="none" stroke="#fff" strokeWidth="1.1">
            <path d={`M ${12 - r} 12 A ${r} ${r} 0 0 1 ${12 + r} 12`} />
            <path d={`M ${-r} 6 A ${r} ${r} 0 0 1 ${r} 6`} />
            <path d={`M ${24 - r} 6 A ${r} ${r} 0 0 1 ${24 + r} 6`} />
          </g>
        ))}
      </pattern>
      <pattern id="t-ds-check-felt" width="60" height="60" patternUnits="userSpaceOnUse">
        <rect width="30" height="30" fill="#000" />
        <rect x="30" y="30" width="30" height="30" fill="#000" />
      </pattern>
    </>
  );
}

function wisteria(seed: number) {
  const rnd = seeded(seed);
  const clusters: { x: number; dots: [number, number, number, string][] }[] = [];
  const shades = ['#b388ff', '#9575cd', '#d1a7ff', '#7e57c2', '#e1bee7'];
  for (let x = -20; x < 1640; x += 46 + rnd() * 40) {
    const len = 90 + rnd() * 200;
    const dots: [number, number, number, string][] = [];
    for (let y = 0; y < len; y += 9) {
      const w = 1 - y / len;
      for (let k = 0; k < 2; k++) dots.push([x + (rnd() - 0.5) * 34 * w, 20 + y + rnd() * 6, 4 + 7 * w * rnd(), shades[Math.floor(rnd() * shades.length)]]);
    }
    clusters.push({ x, dots });
  }
  return clusters;
}

function pines(seed: number, base: number) {
  const rnd = seeded(seed);
  const out: string[] = [];
  for (let x = -30; x < 1650; x += 40 + rnd() * 60) {
    const h = 120 + rnd() * 160;
    const w = 40 + rnd() * 30;
    let d = '';
    for (let k = 0; k < 4; k++) {
      const top = base - h + k * (h / 5);
      const ww = w * (0.45 + k * 0.22);
      d += `M ${x} ${top} L ${x + ww} ${top + h / 3} L ${x - ww} ${top + h / 3} Z `;
    }
    out.push(d + `M ${x - 4} ${base - 30} L ${x + 4} ${base - 30} L ${x + 4} ${base} L ${x - 4} ${base} Z`);
  }
  return out;
}

const CLUSTERS = wisteria(77);
const PINES = pines(5, 900);

function Backdrop() {
  return (
    <Scene>
      {/* stars */}
      {Array.from({ length: 60 }, (_, i) => {
        const rnd = seeded(i + 1);
        return <circle key={i} cx={rnd() * 1600} cy={rnd() * 520} r={rnd() * 1.8 + 0.4} fill="#fff" opacity={0.3 + rnd() * 0.6} />;
      })}
      <circle cx="1230" cy="250" r="190" fill="#fff6d0" opacity="0.08" />
      <circle cx="1230" cy="250" r="120" fill="#fbf1c7" opacity="0.92" />
      <circle cx="1196" cy="226" r="18" fill="#e8dcae" opacity="0.6" />
      <circle cx="1262" cy="290" r="26" fill="#e8dcae" opacity="0.45" />
      <path d={ridgePath(1600, 640, 900, 140, 5, 21, true)} fill="#1b1533" />
      <path d={ridgePath(1600, 720, 900, 90, 7, 29)} fill="#120e24" />
      {PINES.map((d, i) => (
        <path key={i} d={d} fill="#08060f" />
      ))}
      {/* wisteria hanging from above */}
      <path d="M -20 14 Q 400 40 800 16 T 1640 20" fill="none" stroke="#2a1d2e" strokeWidth="14" />
      {CLUSTERS.map((c, i) => (
        <g key={i}>
          {c.dots.map(([x, y, r, col], j) => (
            <circle key={j} cx={x} cy={y} r={r} fill={col} opacity="0.85" />
          ))}
        </g>
      ))}
    </Scene>
  );
}

function Overlay() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
      <rect width="1000" height="600" fill="url(#t-ds-check-felt)" opacity="0.22" />
    </svg>
  );
}

function Emblem() {
  return (
    <g>
      <circle r="44" fill="none" stroke="#fff" strokeWidth="3" />
      <text y="22" textAnchor="middle" fontSize="62" fill="#fff" style={{ fontFamily: "'Shippori Mincho B1', serif" }} fontWeight="800">
        滅
      </text>
    </g>
  );
}

const PETALS = ['#b388ff', '#d1a7ff', '#9575cd', '#e1bee7'];

/** Each colour is a Breathing Style with its own sword form. */
function breathe(k: FxKit, color: Color, at: Pt, hex: string) {
  const { fx } = k;
  const L = { x: at.x - 220, y: at.y + 60 };
  const R = { x: at.x + 220, y: at.y - 60 };
  switch (color) {
    case 'blue':
    case 'teal':
      fx.slash(L, R, { color: hex, glow: '#bfe3ff', width: 22, bend: 0.4, dur: 0.7 });
      fx.burst(at.x, at.y, { shapes: ['drop', 'bubble'], colors: ['#90caf9', '#e3f2fd', hex], count: 26, gravity: 380 });
      fxSounds.splash();
      return;
    case 'red':
    case 'orange':
      fx.slash(L, R, { color: '#ff7043', glow: '#ffcc80', width: 22, bend: -0.35, dur: 0.65 });
      fx.burst(at.x, at.y, { shapes: ['ember'], colors: ['#ff7043', '#ffca28', '#fff'], count: 30, glow: true, gravity: -200 });
      fxSounds.flame();
      return;
    case 'yellow':
      fx.bolt({ x: at.x + 40, y: 0 }, at, { color: '#ffe066', width: 6 });
      fx.flash('#fff3b0', 0.4, 180);
      fx.burst(at.x, at.y, { shapes: ['spark'], colors: ['#ffe066', '#fff'], count: 24, glow: true });
      fxSounds.thunder();
      return;
    case 'green':
      for (let i = 0; i < 3; i++)
        fx.slash({ x: L.x, y: L.y - 40 + i * 40 }, { x: R.x, y: R.y - 40 + i * 40 }, { color: hex, glow: '#b9f6ca', width: 12, bend: 0.2, dur: 0.5 + i * 0.08 });
      fx.burst(at.x, at.y, { shapes: ['leaf'], colors: ['#69f0ae', '#b9f6ca'], count: 18, flutter: true, gravity: 60 });
      fxSounds.wind();
      return;
    default:
      fx.slash(L, R, { color: hex, glow: '#f8bbd0', width: 18, bend: 0.3 });
      fx.burst(at.x, at.y, { shapes: ['petal'], colors: [hex, '#f8bbd0', '#fff'], count: 24, flutter: true, gravity: 60 });
      fxSounds.shing();
  }
}

export const demonslayer: Theme = {
  id: 'demonslayer',
  name: 'Demon Slayer',
  title: 'Wisteria Night',
  tagline: 'Every colour is a Breathing Style. Moonlight and wisteria.',
  emoji: '🌸',
  edition: 'Slayer Corps Edition',
  fonts: 'family=Shippori+Mincho+B1:wght@800',
  vars: {
    '--ink': INK,
    '--cream': '#f7f1e3',
    '--night': '#0b0a18',
    '--yellow': '#d9b8ff',
    '--red': '#c62839',
    '--muted': '#6c5b7b',
    '--soft': '#4a3d5a',
    '--faint': '#9a8aa8',
    '--panel-2': '#ebe1cc',
    '--panel-3': '#efe6d6',
    '--line': '#ddd0e8',
    '--highlight': '#efdcff',
    '--chip-hover': '#f6ecff',
    '--link': '#8e44ad',
    '--accent-a': '#e3ccff',
    '--accent-b': '#b28cf0',
    '--surface': '#fffcf5',
    '--turn-bg': '#efdcff',
    '--ring': 'rgba(209, 167, 255, 0.95)',
    '--font-display': "'Shippori Mincho B1', 'Lilita One', serif",
    '--font-card': "'Shippori Mincho B1', 'Lilita One', serif",
    '--panel-bg': 'linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0) 40%), var(--cream)',
    '--room-bg': 'linear-gradient(180deg, #070814 0%, #121233 40%, #2a1a40 75%, #0b0a18 100%)',
  },
  cardColors: {
    red: { base: '#c62839', light: '#ef5465', dark: '#8a0f1e' },
    yellow: { base: '#e0a800', light: '#ffd23f', dark: '#a37800' },
    green: { base: '#2e8b57', light: '#5cbf85', dark: '#165c35' },
    blue: { base: '#2a6fcf', light: '#5e9bf0', dark: '#164a94' },
    pink: { base: '#d9468b', light: '#f57ab4', dark: '#9c1d5c' },
    teal: { base: '#1f9e98', light: '#55cfc8', dark: '#0d6b66' },
    orange: { base: '#e2631c', light: '#ff9452', dark: '#a33e05' },
    purple: { base: '#7d4cc2', light: '#a97ff0', dark: '#4e2a87' },
  },
  felt: {
    red: ['#b53a45', '#6e1a24', '#360a10'],
    yellow: ['#c99a2a', '#80600f', '#3f2e05'],
    green: ['#3d8a5c', '#205536', '#0d2a19'],
    blue: ['#3d6fb5', '#1f4378', '#0c213e'],
    pink: ['#bd4f86', '#762a52', '#3b1228'],
    teal: ['#2f8f8a', '#185a56', '#0a2d2b'],
    orange: ['#c76a32', '#7c3d16', '#3d1c08'],
    purple: ['#7a59b5', '#48337a', '#22183f'],
  },
  neutralFelt: ['#5a4a7a', '#33284d', '#191326'],
  card: { edge: '#f5efe1', pattern: 't-ds-waves', patternOpacity: 0.16, Back },
  Defs,
  Backdrop,
  table: {
    rim: 'linear-gradient(180deg, #3a2a3e 0%, #160f1c 100%)',
    Overlay,
    Emblem,
    chevron: '#e1bee7',
  },
  ambient: {
    shapes: ['petal', 'petal', 'firefly'],
    colors: PETALS,
    count: 26,
    size: [10, 18],
    fall: [22, 55],
    drift: [-30, 10],
    spin: 1.4,
    sway: 26,
    flutter: true,
    alpha: [0.55, 0.95],
  },
  onFx: (e, k) => {
    const { fx } = k;
    switch (e.kind) {
      case 'color':
        breathe(k, e.color, e.at, e.hex);
        return;
      case 'hit': {
        const at = e.to;
        fx.slash({ x: at.x - 90, y: at.y - 70 }, { x: at.x + 90, y: at.y + 70 }, { color: '#e9eef3', glow: '#c62839', width: 12, dur: 0.45 });
        setTimeout(() => {
          fx.slash({ x: at.x + 90, y: at.y - 70 }, { x: at.x - 90, y: at.y + 70 }, { color: '#e9eef3', glow: '#c62839', width: 12, dur: 0.45 });
          fx.burst(at.x, at.y, { shapes: ['petal'], colors: ['#c62839', '#ef5465', '#fff'], count: 12 + e.amount * 3, flutter: true, gravity: 120 });
          if (e.amount >= 4) fx.shake(e.amount >= 6 ? 13 : 9);
        }, 140);
        return;
      }
      case 'skip':
        fx.slash({ x: e.to.x - 100, y: e.to.y + 30 }, { x: e.to.x + 100, y: e.to.y - 30 }, { color: '#e9eef3', glow: '#9fc5ff', width: 11, dur: 0.4 });
        return;
      case 'reverse':
      case 'passHands':
        fx.ring(e.at.x, e.at.y, { color: '#64b5f6', r0: 50, r1: 240, width: 12, squash: 0.55, dur: 0.75, glow: true });
        fx.burst(e.at.x, e.at.y, { shapes: ['drop'], colors: ['#90caf9', '#e3f2fd'], count: 18, gravity: 300 });
        return;
      case 'uno':
        fx.ring(e.at.x, e.at.y, { color: '#ffffff', r0: 18, r1: 90, width: 4, dur: 0.6 });
        fx.ring(e.at.x, e.at.y, { color: '#d1a7ff', r0: 18, r1: 130, width: 4, dur: 0.9 });
        fx.burst(e.at.x, e.at.y, { shapes: ['petal'], colors: PETALS, count: 18, flutter: true, gravity: 40 });
        return;
      case 'caught':
        fx.slash({ x: e.at.x - 80, y: e.at.y - 30 }, { x: e.at.x + 80, y: e.at.y + 30 }, { color: '#ef5465', width: 10 });
        return;
      case 'knockout':
        fx.slash({ x: e.at.x - 160, y: e.at.y - 100 }, { x: e.at.x + 160, y: e.at.y + 100 }, { color: '#fff', glow: '#c62839', width: 18 });
        fx.slash({ x: e.at.x + 160, y: e.at.y - 100 }, { x: e.at.x - 160, y: e.at.y + 100 }, { color: '#fff', glow: '#c62839', width: 18, dur: 0.7 });
        fx.flash('#c62839', 0.35, 300);
        fx.shake(14, 600);
        return;
      case 'win':
        fx.rain({ shapes: ['petal'], colors: PETALS, count: 80, flutter: true });
        return;
      case 'swap':
        fx.slash(e.a, e.b, { color: '#e9eef3', glow: '#d1a7ff', width: 8, bend: 0.2 });
        return;
      case 'stack':
        fx.shake(8 + Math.min(10, e.total / 2));
        fx.burst(e.to.x, e.to.y, { shapes: ['petal'], colors: ['#c62839', '#fff'], count: 20, flutter: true });
        return;
      default:
        k.base(e);
    }
  },
  splash: { backdrop: 'brush', color: '#c62839', ink: INK, kickerBg: '#111015', kickerInk: '#f5efe1' },
  moves: {
    skip: 'First Form: Skip',
    skipAll: 'Total Concentration',
    reverse: 'Whirlpool Form',
    draw: 'Crossing Slash',
    bigDraw: 'Constant Flux',
    wild: 'Breathing changes…',
    uno: 'Total Concentration!',
    swap: 'Blood Demon Art',
    flip: 'Demon Moon',
    stack: 'Dance of the Fire God',
    knockout: 'Turned to ash…',
    caught: 'Smelled your bluff',
    discardAll: 'Dead Calm',
    launch: 'Thunderclap',
  },
  colorAlias: {
    red: 'Flame Breathing',
    blue: 'Water Breathing',
    yellow: 'Thunder Breathing',
    green: 'Wind Breathing',
    pink: 'Love Breathing',
    teal: 'Mist Breathing',
    orange: 'Sun Breathing',
    purple: 'Insect Breathing',
  },
  rank: (cards) =>
    byCards(cards, [
      [1, 'Hashira'],
      [2, 'Kinoe'],
      [3, 'Hinoe'],
      [5, 'Tsuchinoe'],
      [8, 'Kanoe'],
      [12, 'Mizunoe'],
      [999, 'Mizunoto'],
    ]),
  auraClass: 'aura-breath',
  hotClass: 'aura-flame',
  sfx: {
    skip: () => fxSounds.shing(),
    plus: (n: number) => {
      fxSounds.slash();
      fxSounds.slash(0.14);
      if (n >= 4) fxSounds.taiko(0.3, 0.4);
    },
    wild: () => fxSounds.shing(),
    reverse: () => fxSounds.wind(),
    uno: () => {
      fxSounds.wind();
      fxSounds.gong(0.3);
    },
    yourTurn: () => fxSounds.bell(0, 659),
    deal: () => {
      fxSounds.riffle();
      fxSounds.bell(0.1, 440);
    },
  },
  music: {
    id: 'wisteria',
    name: 'Wisteria Night',
    bpm: 92,
    root: 57,
    scale: [0, 2, 3, 7, 8],
    chords: [0, 4, 3, 0],
    drums: { taiko: 'x.......x...x...', hat: '..x...x...x...x.', hatTense: 'x.x.x.x.x.x.x.x.', kick: '........x.......' },
    bass: { pattern: '0.......3.......', wave: 'sine', vol: 0.26, cut: 600 },
    arp: { pattern: '0.2.3.4.3.2.0.2.', wave: 'triangle', vol: 0.045, octave: 0, cut: 2200 },
    lead: {
      bars: ['d---c-b-a-------', '....b-c-d-e-d---', 'e---d---c-b-a---', 'a-------........'],
      wave: 'sine',
      vol: 0.09,
      octave: 1,
      vibrato: [5, 5],
    },
  },
};
