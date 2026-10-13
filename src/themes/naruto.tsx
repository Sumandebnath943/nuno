// Naruto — "Hidden Leaf": sunset over a ninja village, swirl-and-headband
// card backs, leaves on the wind, kunai and shuriken flying at whoever gets hit.
import type { Theme } from './types';
import { BackBase, BackClip, byCards, ridgePath, Scene, seeded, spiralPath } from './art';
import { fxSounds } from '../lib/sound';

const INK = '#1d1b2f';

function Leaf({ x, y, r = 0, s = 1, fill = '#2f9e44' }: { x: number; y: number; r?: number; s?: number; fill?: string }) {
  return (
    <path
      d="M0 -10 C 7 -6 7 6 0 10 C -7 6 -7 -6 0 -10 Z M0 -9 L0 9"
      transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
      fill={fill}
      stroke="rgba(0,0,0,0.3)"
      strokeWidth="0.8"
    />
  );
}

function Back() {
  return (
    <>
      <BackBase edge="#fff4e0" fill="url(#t-nar-back)" />
      <BackClip>
        <path d={spiralPath(60, 62, 3, 4.3)} fill="none" stroke="#ffd29a" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
        <circle cx="60" cy="62" r="34" fill="none" stroke="#ffd29a" strokeWidth="2" opacity="0.35" />
        <Leaf x={18} y={22} r={-30} s={1.1} fill="#51cf66" />
        <Leaf x={102} y={30} r={40} s={0.9} fill="#40c057" />
        <Leaf x={20} y={166} r={20} s={0.9} fill="#40c057" />
        <Leaf x={100} y={164} r={-35} s={1.1} fill="#51cf66" />
        {/* headband */}
        <rect x="0" y="114" width="120" height="30" fill="#1f2b52" />
        <rect x="0" y="114" width="120" height="3" fill="#121a36" />
        <rect x="0" y="141" width="120" height="3" fill="#121a36" />
        <rect x="20" y="108" width="80" height="42" rx="6" fill="url(#t-nar-metal)" stroke={INK} strokeWidth="3" />
        {[
          [27, 115],
          [93, 115],
          [27, 143],
          [93, 143],
        ].map(([cx, cy]) => (
          <circle key={`${cx}${cy}`} cx={cx} cy={cy} r="2.2" fill="#7b8494" stroke={INK} strokeWidth="0.8" />
        ))}
        <g style={{ fontFamily: 'var(--font-card)' }} textAnchor="middle" fontSize="23">
          <text x="60.8" y="138" fill="#ffffff" opacity="0.8">
            NUNO
          </text>
          <text x="60" y="137" fill="#3d4452">
            NUNO
          </text>
        </g>
      </BackClip>
    </>
  );
}

function Defs() {
  return (
    <>
      <radialGradient id="t-nar-back" cx="0.5" cy="0.32" r="0.85">
        <stop offset="0" stopColor="#ffa24a" />
        <stop offset="0.5" stopColor="#e8590c" />
        <stop offset="1" stopColor="#6b2408" />
      </radialGradient>
      <linearGradient id="t-nar-metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f1f4f8" />
        <stop offset="0.55" stopColor="#a9b3c1" />
        <stop offset="1" stopColor="#dde3ea" />
      </linearGradient>
      <pattern id="t-nar-leaves" width="120" height="120" patternUnits="userSpaceOnUse">
        <Leaf x={20} y={24} r={-30} s={1.4} fill="rgba(255,255,255,0.5)" />
        <Leaf x={80} y={70} r={50} s={1.1} fill="rgba(255,255,255,0.4)" />
        <Leaf x={40} y={100} r={10} s={0.9} fill="rgba(255,255,255,0.35)" />
      </pattern>
    </>
  );
}

/** Lit-up village roofs along the bottom. */
function roofs(seed: number, base: number, scale: number) {
  const rnd = seeded(seed);
  const houses: { body: string; roof: string; windows: [number, number][] }[] = [];
  let x = -40;
  while (x < 1640) {
    const w = (70 + rnd() * 90) * scale;
    const h = (50 + rnd() * 110) * scale;
    const top = base - h;
    const rh = (22 + rnd() * 14) * scale;
    houses.push({
      body: `M ${x} ${base} L ${x} ${top} L ${x + w} ${top} L ${x + w} ${base} Z`,
      roof: `M ${x - 14 * scale} ${top + 4} Q ${x + w * 0.15} ${top - 2} ${x + w / 2} ${top - rh} Q ${x + w * 0.85} ${top - 2} ${x + w + 14 * scale} ${top + 4} Z`,
      windows: Array.from({ length: Math.floor(rnd() * 3) }, () => [x + 10 + rnd() * (w - 30), top + 14 + rnd() * (h - 40)]),
    });
    x += w + (8 + rnd() * 30) * scale;
  }
  return houses;
}

function Backdrop() {
  const far = roofs(11, 760, 0.7);
  const near = roofs(23, 900, 1.1);
  return (
    <Scene>
      <circle cx="1240" cy="330" r="190" fill="#ffd8a8" opacity="0.22" />
      <circle cx="1240" cy="330" r="100" fill="#ffe8c7" opacity="0.75" />
      {/* the great cliff */}
      <path d={ridgePath(1600, 540, 900, 110, 4, 5, true)} fill="#7a3a3c" opacity="0.55" />
      <path d={ridgePath(1600, 620, 900, 80, 6, 9)} fill="#4f2331" opacity="0.85" />
      {far.map((hs, i) => (
        <g key={`f${i}`} fill="#3a1b2a">
          <path d={hs.body} />
          <path d={hs.roof} fill="#2b1420" />
          {hs.windows.map(([wx, wy], j) => (
            <rect key={j} x={wx} y={wy} width="10" height="12" fill="#ffb347" opacity="0.65" />
          ))}
        </g>
      ))}
      {/* poles and wires */}
      {[160, 560, 1040, 1460].map((px) => (
        <rect key={px} x={px} y="470" width="8" height="330" fill="#22111b" />
      ))}
      <path d="M 164 480 Q 362 540 564 480 Q 800 545 1044 480 Q 1252 540 1464 480" fill="none" stroke="#22111b" strokeWidth="2.5" />
      <path d="M 164 500 Q 362 570 564 500 Q 800 575 1044 500 Q 1252 570 1464 500" fill="none" stroke="#22111b" strokeWidth="2" />
      {near.map((hs, i) => (
        <g key={`n${i}`} fill="#1f0f18">
          <path d={hs.body} />
          <path d={hs.roof} fill="#160a11" />
          {hs.windows.map(([wx, wy], j) => (
            <rect key={j} x={wx} y={wy} width="14" height="16" fill="#ffa94d" opacity="0.55" />
          ))}
        </g>
      ))}
      {/* a leafy branch in the corner */}
      <path d="M -20 60 Q 160 120 330 70" fill="none" stroke="#2a1a14" strokeWidth="12" strokeLinecap="round" />
      {Array.from({ length: 14 }, (_, i) => (
        <Leaf key={i} x={20 + i * 22} y={80 + Math.sin(i) * 26} r={i * 37} s={2.2} fill={i % 2 ? '#2b8a3e' : '#37b24d'} />
      ))}
    </Scene>
  );
}

function Overlay() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
      <rect width="1000" height="600" fill="url(#t-nar-leaves)" opacity="0.12" />
    </svg>
  );
}

function Emblem() {
  return (
    <g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
      <path d="M -30 34 C -46 6 -30 -30 0 -40 C 30 -30 46 6 30 34 C 14 46 -14 46 -30 34 Z" strokeWidth="5" />
      <path d={spiralPath(0, 2, 2.5, 4.5)} strokeWidth="5" />
      <path d="M 26 38 L 44 52" strokeWidth="6" />
    </g>
  );
}

const LEAVES = ['#51cf66', '#40c057', '#94d82d', '#2f9e44'];

export const naruto: Theme = {
  id: 'naruto',
  name: 'Naruto',
  title: 'Hidden Leaf',
  tagline: 'Leaves on the wind, kunai in the air. Believe it!',
  emoji: '🍥',
  edition: 'Shinobi Edition',
  fonts: 'family=Shojumaru',
  vars: {
    '--ink': INK,
    '--cream': '#fff3dc',
    '--night': '#1a1424',
    '--yellow': '#ff922b',
    '--muted': '#7a5b3a',
    '--soft': '#5a4128',
    '--faint': '#836b53',
    '--panel-2': '#f5e0b8',
    '--panel-3': '#f2e2c4',
    '--line': '#e8cfa2',
    '--highlight': '#ffd59a',
    '--chip-hover': '#ffe8c2',
    '--link': '#a94109',
    '--accent-a': '#ffb257',
    '--accent-b': '#f76707',
    '--surface': '#fffaf0',
    '--turn-bg': '#ffd59a',
    '--ring': 'rgba(255, 146, 43, 0.95)',
    '--font-display': "'Shojumaru', 'Lilita One', system-ui, sans-serif",
    '--font-card': "'Shojumaru', 'Lilita One', system-ui, sans-serif",
    '--font-ui': "'Lilita One', system-ui, sans-serif",
    '--dfs': '0.86',
    '--panel-bg': 'linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 30%), var(--cream)',
    '--room-bg': 'linear-gradient(180deg, #2b1d3f 0%, #5c2a44 30%, #b8502e 58%, #e8833a 70%, #3a1c24 100%)',
  },
  cardColors: {
    red: { base: '#e03131', light: '#ff6b6b', dark: '#a61e1e' },
    yellow: { base: '#fab005', light: '#ffd43b', dark: '#d08700' },
    green: { base: '#2f9e44', light: '#51cf66', dark: '#1b6e2c' },
    blue: { base: '#1c7ed6', light: '#4dabf7', dark: '#1157a0' },
    pink: { base: '#e64980', light: '#f783ac', dark: '#a61e4d' },
    teal: { base: '#12b886', light: '#38d9a9', dark: '#087f5b' },
    orange: { base: '#f76707', light: '#ff922b', dark: '#b34700' },
    purple: { base: '#7048e8', light: '#9775fa', dark: '#4b2bb3' },
  },
  felt: {
    red: ['#d9483b', '#8f2a1f', '#4a130e'],
    yellow: ['#e8a530', '#a8670c', '#5c3604'],
    green: ['#3f9b52', '#1f6431', '#0c3418'],
    blue: ['#3b7fc4', '#1c4f86', '#0b2849'],
    pink: ['#d4537f', '#8d2550', '#4a0f29'],
    teal: ['#23a385', '#106753', '#06372c'],
    orange: ['#e8782f', '#a14a0f', '#552406'],
    purple: ['#7a5bd6', '#45309a', '#221654'],
  },
  neutralFelt: ['#a9744a', '#6b4425', '#3a220f'],
  card: { edge: '#fff7ea', Back },
  Defs,
  Backdrop,
  table: {
    rim: 'repeating-linear-gradient(100deg, #8d5524 0px, #9b6230 14px, #7d4a1d 26px, #8d5524 40px)',
    Overlay,
    Emblem,
    chevron: '#ffd29a',
  },
  ambient: {
    shapes: ['leaf'],
    colors: LEAVES,
    count: 22,
    size: [14, 26],
    fall: [28, 62],
    drift: [-40, 12],
    spin: 1.6,
    sway: 28,
    flutter: true,
    alpha: [0.6, 0.95],
  },
  onFx: (e, k) => {
    const { fx } = k;
    switch (e.kind) {
      case 'deal':
        fx.smoke(e.at.x, e.at.y, { count: 8, color: '#f1f3f5' });
        return;
      case 'draw':
        if (e.count >= 2) fx.smoke(e.to.x, e.to.y, { count: 5, color: '#e9ecef', size: [30, 60] });
        return;
      case 'hit': {
        const n = Math.min(4, Math.max(1, Math.round(e.amount / 2)));
        for (let i = 0; i < n; i++) {
          fx.projectile(e.from, e.to, {
            shape: 'shuriken',
            color: '#adb5bd',
            size: 30,
            spin: 22,
            arc: 40 + i * 30,
            dur: 0.42,
            delay: i * 0.09,
            onHit: () => {
              fx.burst(e.to.x, e.to.y, { shapes: ['spark'], colors: ['#fff', '#ffd43b'], count: 8, glow: true, speed: [100, 260] });
              if (i === n - 1) {
                fx.smoke(e.to.x, e.to.y, { count: 7, color: '#dee2e6' });
                if (e.amount >= 4) fx.shake(e.amount >= 6 ? 12 : 8);
              }
            },
          });
        }
        return;
      }
      case 'skip':
        fx.projectile(e.from, e.to, {
          shape: 'kunai',
          color: '#ff922b',
          size: 40,
          aim: true,
          arc: 30,
          dur: 0.36,
          onHit: () => fx.burst(e.to.x, e.to.y, { shapes: ['spark'], colors: ['#fff', '#ffa94d'], count: 12, glow: true }),
        });
        return;
      case 'reverse':
      case 'passHands':
        fx.burst(e.at.x, e.at.y, { shapes: ['leaf'], colors: LEAVES, count: 30, speed: [200, 420], gravity: 40, flutter: true, size: [14, 24], life: [0.8, 1.4] });
        fx.ring(e.at.x, e.at.y, { color: '#8ce99a', r0: 40, r1: 240, width: 5, squash: 0.6, dur: 0.7 });
        return;
      case 'color':
        // A spinning chakra sphere in the new colour.
        for (let i = 0; i < 3; i++) fx.ring(e.at.x, e.at.y, { color: e.hex, r0: 70 - i * 18, r1: 18, width: 6, dur: 0.45 + i * 0.1, glow: true });
        fx.burst(e.at.x, e.at.y, { shapes: ['orb', 'spark'], colors: [e.hex, '#a5d8ff', '#fff'], count: 26, glow: true, speed: [160, 420] });
        return;
      case 'uno':
        fx.burst(e.at.x, e.at.y, { shapes: ['ember'], colors: ['#4dabf7', '#74c0fc', '#fff'], count: 26, glow: true, gravity: -260, speed: [60, 200], size: [16, 30] });
        fx.ring(e.at.x, e.at.y, { color: '#ff922b', r0: 20, r1: 120, width: 7 });
        return;
      case 'caught':
        fx.smoke(e.at.x, e.at.y, { count: 10 });
        fx.burst(e.at.x, e.at.y, { shapes: ['rock'], colors: ['#8d5524', '#a9744a'], count: 10, size: [10, 18] });
        return;
      case 'swap':
        fx.smoke(e.a.x, e.a.y, { count: 8 });
        fx.smoke(e.b.x, e.b.y, { count: 8 });
        return;
      case 'knockout':
        fx.smoke(e.at.x, e.at.y, { count: 16, size: [60, 120] });
        fx.shake(12, 500);
        return;
      case 'win':
        fx.rain({ shapes: ['leaf', 'square'], colors: [...LEAVES, '#ff922b', '#1d1b2f'], count: 60, flutter: true });
        return;
      case 'stack':
        fx.shake(8 + Math.min(8, e.total / 2));
        fx.burst(e.to.x, e.to.y, { shapes: ['shuriken'], colors: ['#adb5bd'], count: 8, spin: 20, size: [18, 26] });
        return;
      case 'discardAll':
        fx.burst(e.to.x, e.to.y, { shapes: ['leaf'], colors: LEAVES, count: 14 + e.count * 3, flutter: true, gravity: 80 });
        return;
      case 'yourTurn':
        fx.ring(e.at.x, e.at.y, { color: '#ff922b', r0: 30, r1: 140, width: 5, squash: 0.45, dur: 0.6 });
        return;
      default:
        k.base(e);
    }
  },
  splash: { backdrop: 'brush', color: '#1d1b2f', kickerBg: '#ff922b', kickerInk: '#1d1b2f' },
  moves: {
    skip: 'Substitution Jutsu',
    skipAll: 'Shadow Possession',
    reverse: 'Reverse Summoning',
    draw: 'Shuriken Toss',
    bigDraw: 'Shadow Clone Barrage',
    wild: 'Transformation Jutsu',
    uno: 'NUNO Jutsu!',
    swap: 'Body Swap Jutsu',
    flip: 'Sage Mode',
    stack: 'Clone Pile-Up',
    knockout: 'Out of chakra',
    caught: 'Genjutsu broken!',
    discardAll: 'Leaf Hurricane',
    launch: 'Paper Bomb',
  },
  rank: (cards) =>
    byCards(cards, [
      [1, 'Hokage'],
      [3, 'Jonin'],
      [6, 'Chunin'],
      [10, 'Genin'],
      [999, 'Academy'],
    ]),
  auraClass: 'aura-chakra',
  hotClass: 'aura-fox',
  sfx: {
    skip: () => {
      fxSounds.whoosh();
      fxSounds.clank(0.28);
    },
    plus: (n: number) => {
      for (let i = 0; i < Math.min(4, Math.max(1, Math.round(n / 2))); i++) fxSounds.whoosh(i * 0.09);
      fxSounds.poof(0.42);
      if (n >= 4) fxSounds.taiko(0.45);
    },
    wild: () => {
      fxSounds.poof();
      fxSounds.sparkle(true, 0.12);
    },
    reverse: () => fxSounds.wind(),
    uno: () => {
      fxSounds.taiko(0, 0.3);
      fxSounds.taiko(0.16, 0.3);
      fxSounds.taiko(0.32, 0.4);
      fxSounds.fanfare();
    },
    deal: () => {
      fxSounds.riffle();
      fxSounds.poof(0.1);
    },
    yourTurn: () => fxSounds.bell(0, 784),
  },
  music: {
    id: 'leaf',
    name: 'Hidden Leaf Hustle',
    bpm: 148,
    root: 62,
    scale: [0, 3, 5, 7, 10],
    chords: [0, 4, 3, 2],
    drums: {
      kick: 'x.....x...x.....',
      snare: '....x.......x...',
      hat: 'x.x.x.x.x.x.x.x.',
      taiko: 'x...........x.x.',
      hatTense: 'xxxxxxxxxxxxxxxx',
    },
    bass: { pattern: '0.0.2.0.0.0.2.1.', wave: 'triangle', vol: 0.22, cut: 800 },
    arp: { pattern: '0.2.4.2.0.2.4.5.', wave: 'triangle', vol: 0.03, octave: 0, cut: 2400 },
    lead: {
      bars: ['d-c-a---.c-d-f--', 'f-d-c-d-a-------', 'd-f-g-f-d-c-a-c-', 'd-------........'],
      wave: 'sine',
      vol: 0.09,
      octave: 1,
      vibrato: [5, 6],
    },
  },
};
