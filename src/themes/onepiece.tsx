// One Piece — "Grand Line": a sunset at sea, WANTED-poster card backs,
// a ship-plank table with a treasure-map felt, cannonballs and gold.
import type { Theme } from './types';
import { BackBase, BackClip, Scene, seeded } from './art';
import { fxSounds } from '../lib/sound';

const INK = '#2b1a10';

function StrawHat({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="8" rx="34" ry="9" fill="#f2c94c" stroke={INK} strokeWidth="2.5" />
      <path d="M -18 7 C -18 -14 18 -14 18 7 Z" fill="#f2c94c" stroke={INK} strokeWidth="2.5" />
      <path d="M -18 2 C -10 5 10 5 18 2 L 18 7 C 10 10 -10 10 -18 7 Z" fill="#c62828" />
      <path d="M -26 10 L 26 10" stroke="#d4a72c" strokeWidth="1.5" />
    </g>
  );
}

function Back() {
  return (
    <>
      <BackBase edge="#fdf3d8" fill="url(#t-op-paper)" />
      <BackClip>
        <g style={{ fontFamily: 'var(--font-card)' }} textAnchor="middle" fill={INK}>
          <text x="60" y="34" fontSize="27">
            WANTED
          </text>
          <rect x="18" y="42" width="84" height="64" fill="#efe0bd" stroke={INK} strokeWidth="2.5" />
          <path d="M 18 92 Q 60 80 102 92 L 102 106 L 18 106 Z" fill="#1565c0" opacity="0.55" />
          <StrawHat x={60} y={70} s={1.05} />
          <text x="60" y="118" fontSize="8.5">
            DEAD OR ALIVE
          </text>
          <text x="60" y="142" fontSize="26">
            NUNO
          </text>
          <text x="60" y="162" fontSize="11">
            ฿ 3,000,000,000-
          </text>
        </g>
        <rect x="9" y="9" width="102" height="168" rx="4" fill="none" stroke={INK} strokeWidth="1.5" opacity="0.4" />
      </BackClip>
    </>
  );
}

function Decor() {
  return <rect x="9" y="9" width="102" height="168" rx="6" fill="none" stroke="#8d6e4a" strokeWidth="1.6" strokeDasharray="5 3" opacity="0.6" />;
}

function Defs() {
  return (
    <>
      <radialGradient id="t-op-paper" cx="0.5" cy="0.45" r="0.75">
        <stop offset="0" stopColor="#f6e7c1" />
        <stop offset="0.7" stopColor="#e6cf9a" />
        <stop offset="1" stopColor="#b98d52" />
      </radialGradient>
      <pattern id="t-op-grid" width="80" height="80" patternUnits="userSpaceOnUse">
        <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="6 6" />
      </pattern>
    </>
  );
}

function wave(y: number, amp: number, len: number, seed: number) {
  const rnd = seeded(seed);
  let d = `M -50 900 L -50 ${y}`;
  for (let x = -50; x < 1700; x += len) {
    const a = amp * (0.7 + rnd() * 0.6);
    d += ` q ${len / 4} ${-a} ${len / 2} 0 q ${len / 4} ${a} ${len / 2} 0`;
  }
  return `${d} L 1700 900 Z`;
}

function Backdrop() {
  return (
    <Scene>
      <circle cx="1180" cy="560" r="230" fill="#ffd27a" opacity="0.25" />
      <circle cx="1180" cy="560" r="120" fill="#ffe2a3" opacity="0.85" />
      {/* clouds */}
      {[
        [220, 170, 1.2],
        [640, 110, 0.9],
        [1350, 200, 1.1],
        [980, 300, 0.7],
      ].map(([cx, cy, s], i) => (
        <g key={i} transform={`translate(${cx} ${cy}) scale(${s})`} fill="#fff" opacity="0.8">
          <ellipse cx="0" cy="0" rx="90" ry="32" />
          <ellipse cx="-50" cy="-18" rx="50" ry="34" />
          <ellipse cx="34" cy="-26" rx="56" ry="40" />
        </g>
      ))}
      {/* seagulls */}
      {[
        [420, 260],
        [470, 230],
        [1050, 180],
        [1500, 300],
      ].map(([x, y], i) => (
        <path key={i} d={`M ${x - 16} ${y} Q ${x - 8} ${y - 10} ${x} ${y} Q ${x + 8} ${y - 10} ${x + 16} ${y}`} fill="none" stroke="#2b1a10" strokeWidth="3" />
      ))}
      {/* the sea */}
      <rect x="0" y="600" width="1600" height="300" fill="#0b4f8a" />
      <path d={wave(610, 10, 120, 1)} fill="#1565a8" />
      <path d={wave(680, 14, 160, 2)} fill="#0e4f8f" />
      <path d={wave(770, 18, 200, 3)} fill="#0a3f74" />
      <path d={wave(850, 20, 240, 4)} fill="#062e57" />
      {/* a pirate ship on the horizon */}
      <g transform="translate(300 560)">
        <path d="M -90 30 L 90 30 L 70 62 L -70 62 Z" fill="#3a2414" />
        <rect x="-4" y="-110" width="7" height="142" fill="#3a2414" />
        <path d="M -60 -96 Q 0 -70 60 -96 L 56 -20 Q 0 -4 -56 -20 Z" fill="#f6efe0" />
        <path d="M -30 -122 L 32 -122 L 28 -102 L -26 -102 Z" fill="#111" />
        <circle cx="0" cy="-58" r="12" fill="#2b1a10" />
        <path d="M -14 -46 L 14 -36 M 14 -46 L -14 -36" stroke="#2b1a10" strokeWidth="5" />
        <ellipse cx="0" cy="-70" rx="18" ry="5" fill="#f2c94c" />
      </g>
    </Scene>
  );
}

function Overlay() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
      <rect width="1000" height="600" fill="url(#t-op-grid)" opacity="0.12" />
      <path d="M 180 430 C 300 330 420 470 560 360 S 760 260 840 200" fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="14 12" opacity="0.18" />
      <path d="M 826 186 L 854 214 M 854 186 L 826 214" stroke="#fff" strokeWidth="6" opacity="0.25" />
    </svg>
  );
}

function Emblem() {
  const pts = Array.from({ length: 16 }, (_, i) => {
    const r = i % 4 === 0 ? 46 : i % 2 === 0 ? 30 : 14;
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');
  return (
    <g>
      <circle r="36" fill="none" stroke="#fff" strokeWidth="3" />
      <polygon points={pts} fill="#fff" />
      <circle r="5" fill="#000" opacity="0.4" />
    </g>
  );
}

const GOLD = ['#ffd54f', '#ffca28', '#ffb300'];

export const onepiece: Theme = {
  id: 'onepiece',
  name: 'One Piece',
  title: 'Grand Line',
  tagline: 'Set sail: bounty posters, cannon fire and treasure.',
  emoji: '🏴‍☠️',
  edition: 'Pirate Edition',
  fonts: 'family=Pirata+One',
  vars: {
    '--ink': INK,
    '--cream': '#f6e7c1',
    '--night': '#06223f',
    '--yellow': '#ffca28',
    '--red': '#c62828',
    '--muted': '#765332',
    '--soft': '#573a20',
    '--faint': '#7b6548',
    '--panel-2': '#ead3a0',
    '--panel-3': '#efdcb0',
    '--line': '#dcc28c',
    '--highlight': '#ffe08a',
    '--chip-hover': '#fbecc2',
    '--link': '#b31b1b',
    '--accent-a': '#ffd54f',
    '--accent-b': '#f59f00',
    '--surface': '#fff7e3',
    '--turn-bg': '#ffe08a',
    '--ring': 'rgba(255, 202, 40, 0.95)',
    '--font-display': "'Pirata One', 'Lilita One', system-ui, serif",
    '--font-card': "'Pirata One', 'Lilita One', system-ui, serif",
    // Pirata One has small letters: a size up for the big moments, a plain face for small print.
    '--font-ui': "'Lilita One', system-ui, sans-serif",
    '--dfs': '1.14',
    '--panel-bg': 'radial-gradient(ellipse at 50% 40%, #fbf0d2 0%, #f6e7c1 60%, #e8d09c 100%)',
    '--room-bg': 'linear-gradient(180deg, #0e3d6e 0%, #2f74b5 35%, #f0a860 75%, #f7c27a 100%)',
  },
  cardColors: {
    red: { base: '#d32f2f', light: '#ff6659', dark: '#9a0007' },
    yellow: { base: '#f9a825', light: '#ffd95a', dark: '#c17900' },
    green: { base: '#388e3c', light: '#6abf69', dark: '#00600f' },
    blue: { base: '#1976d2', light: '#63a4ff', dark: '#004ba0' },
    pink: { base: '#d81b60', light: '#ff5c8d', dark: '#a00037' },
    teal: { base: '#00897b', light: '#4ebaaa', dark: '#005b4f' },
    orange: { base: '#ef6c00', light: '#ff9d3f', dark: '#b53d00' },
    purple: { base: '#6a1b9a', light: '#9c4dcc', dark: '#38006b' },
  },
  felt: {
    red: ['#c9584a', '#86291f', '#45110c'],
    yellow: ['#d9a74a', '#9a6b16', '#523604'],
    green: ['#4f9a5a', '#2a6534', '#123519'],
    blue: ['#3c7fbf', '#1d4f86', '#0b2a4c'],
    pink: ['#c7507a', '#86244b', '#460f25'],
    teal: ['#2f9a8c', '#13665b', '#06362f'],
    orange: ['#d9793a', '#954412', '#4e2105'],
    purple: ['#7e4ca3', '#4c2470', '#26103c'],
  },
  neutralFelt: ['#c9a66b', '#8a6a3b', '#4a3418'],
  card: { edge: '#fdf3d8', oval: '#fff9e8', Back, Decor },
  Defs,
  Backdrop,
  table: {
    rim: 'repeating-linear-gradient(90deg, #6d4425 0 46px, #5a361b 46px 49px, #7a4d2b 49px 95px, #5a361b 95px 98px)',
    Overlay,
    Emblem,
    chevron: '#ffe08a',
  },
  ambient: {
    shapes: ['bubble', 'spark'],
    colors: ['#bbdefb', '#e3f2fd', '#ffe082'],
    count: 16,
    size: [8, 18],
    fall: [-40, -14],
    drift: [-12, 12],
    spin: 0.5,
    sway: 18,
    twinkle: true,
    alpha: [0.35, 0.8],
  },
  onFx: (e, k) => {
    const { fx } = k;
    switch (e.kind) {
      case 'hit':
        fx.projectile(e.from, e.to, {
          shape: 'cannonball',
          color: '#222',
          size: 26 + Math.min(16, e.amount * 2),
          arc: 140,
          dur: 0.55,
          spin: 4,
          trail: { shape: 'smoke', colors: ['#cfd8dc', '#eceff1'], size: [24, 44], life: [0.4, 0.8] },
          onHit: () => {
            fx.burst(e.to.x, e.to.y, { shapes: ['ember', 'spark'], colors: ['#ff9800', '#ffd54f', '#fff'], count: 22, glow: true });
            fx.smoke(e.to.x, e.to.y, { color: '#b0bec5', count: 9 });
            if (e.amount >= 4) fx.shake(e.amount >= 6 ? 14 : 9);
          },
        });
        fx.smoke(e.from.x, e.from.y, { color: '#eceff1', count: 5, size: [30, 60] });
        return;
      case 'skip':
        fx.burst(e.to.x, e.to.y, { shapes: ['drop'], colors: ['#64b5f6', '#bbdefb', '#fff'], count: 18, angle: -Math.PI / 2, spread: 2.2, gravity: 700, speed: [220, 480] });
        return;
      case 'reverse':
      case 'passHands':
        fx.ring(e.at.x, e.at.y, { color: '#8d6e4a', r0: 50, r1: 220, width: 10, squash: 0.6 });
        fx.burst(e.at.x, e.at.y, { shapes: ['drop', 'bubble'], colors: ['#90caf9', '#fff'], count: 18, gravity: 300 });
        return;
      case 'color':
        fx.burst(e.at.x, e.at.y, { shapes: ['coin'], colors: GOLD, count: 14, gravity: 600, angle: -Math.PI / 2, spread: 2.4, speed: [260, 520], spin: 8 });
        fx.ring(e.at.x, e.at.y, { color: e.hex, r0: 30, r1: 170, width: 9, glow: true });
        return;
      case 'uno':
        fx.burst(e.at.x, e.at.y, { shapes: ['coin', 'spark'], colors: GOLD, count: 22, gravity: 500, angle: -Math.PI / 2, spread: 2, speed: [200, 460] });
        return;
      case 'caught':
        fx.burst(e.at.x, e.at.y, { shapes: ['drop'], colors: ['#64b5f6', '#fff'], count: 16, gravity: 600, angle: -Math.PI / 2, spread: 2 });
        return;
      case 'swap':
        fx.projectile(e.a, e.b, { shape: 'coin', color: '#ffca28', size: 22, spin: 10, dur: 0.5 });
        fx.projectile(e.b, e.a, { shape: 'coin', color: '#ffd54f', size: 22, spin: -10, dur: 0.5 });
        return;
      case 'knockout':
        fx.burst(e.at.x, e.at.y, { shapes: ['ember', 'spark'], colors: ['#ff9800', '#ffd54f'], count: 30, glow: true });
        fx.smoke(e.at.x, e.at.y, { color: '#90a4ae', count: 14, size: [60, 120] });
        fx.shake(14, 600);
        return;
      case 'win':
        fx.rain({ shapes: ['coin'], colors: GOLD, count: 70 });
        return;
      case 'discardAll':
        fx.burst(e.to.x, e.to.y, { shapes: ['drop'], colors: ['#64b5f6', '#e3f2fd'], count: 14 + e.count * 2, gravity: 600, angle: -Math.PI / 2, spread: 2 });
        return;
      case 'launch':
        if (e.count > 0) fx.smoke(e.at.x, e.at.y, { color: '#eceff1', count: 6 });
        k.base(e);
        return;
      default:
        k.base(e);
    }
  },
  splash: { backdrop: 'scroll', color: '#f6e7c1', ink: INK, kickerBg: '#c62828', kickerInk: '#fff8e1' },
  moves: {
    skip: 'Man overboard!',
    skipAll: 'All hands below deck',
    reverse: 'Hard to port!',
    draw: 'Cannon fire!',
    bigDraw: 'Full broadside!',
    wild: 'New course set',
    uno: 'I’ll be NUNO King!',
    swap: 'Mutiny!',
    flip: 'Into the New World',
    stack: 'Fleet attack',
    knockout: 'Sunk!',
    caught: 'Marines spotted you!',
    discardAll: 'Treasure dump',
    launch: 'Load the cannon',
  },
  rank: (cards, score) => {
    const bounty = Math.max(0, 12 - cards) * 60_000_000 + score * 1_000_000;
    if (bounty >= 1_000_000_000) return `฿${(bounty / 1_000_000_000).toFixed(1)}B`;
    return bounty ? `฿${Math.round(bounty / 1_000_000)}M` : '฿0';
  },
  auraClass: 'aura-gold',
  hotClass: 'aura-gold',
  sfx: {
    plus: (n: number) => {
      fxSounds.cannon();
      if (n >= 4) fxSounds.cannon(0.22);
    },
    skip: () => fxSounds.splash(),
    reverse: () => {
      fxSounds.wind();
      fxSounds.bell(0.2, 880);
    },
    wild: () => {
      fxSounds.chaChing();
      fxSounds.sparkle(true, 0.15);
    },
    uno: () => {
      fxSounds.bell(0, 880);
      fxSounds.bell(0.22, 880);
      fxSounds.fanfare();
    },
    yourTurn: () => fxSounds.bell(0, 1046),
    win: () => {
      fxSounds.fanfare();
      fxSounds.chaChing(0.4);
      fxSounds.chaChing(0.8);
    },
  },
  music: {
    id: 'shanty',
    name: 'Grand Line Shanty',
    bpm: 112,
    steps: 12,
    root: 55,
    scale: [0, 2, 4, 5, 7, 9, 11],
    chords: [0, 3, 4, 0],
    drums: { kick: 'x.....x.....', snare: '...x.....x..', hat: 'x.xx.xx.xx.x', hatTense: 'xxxxxxxxxxxx' },
    bass: { pattern: '0..4..0..4..', wave: 'triangle', vol: 0.24, cut: 900 },
    pad: { pattern: '.x..x..x..x.', wave: 'square', vol: 0.03, len: 1.5, cut: 1600 },
    lead: {
      bars: ['a--c--e--h--', 'f--e-dc--d--', 'b--d--f--g--', 'h-----e-----'],
      wave: 'square',
      vol: 0.045,
      octave: 1,
      vibrato: [6, 4],
      cut: 1900,
    },
  },
};
