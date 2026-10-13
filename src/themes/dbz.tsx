// Dragon Ball Z — "Power Level": rocky wasteland, star-orb card backs,
// ki blasts and beams for draw cards, and a golden aura at one card.
import type { Theme } from './types';
import { BackBase, BackClip, burstPoints, ridgePath, Scene } from './art';
import { fxSounds } from '../lib/sound';

const INK = '#1a1230';

function Orb({ x, y, r, stars = 4 }: { x: number; y: number; r: number; stars?: number }) {
  const spots: [number, number][] =
    stars === 4
      ? [
          [-0.32, -0.28],
          [0.3, -0.28],
          [-0.3, 0.3],
          [0.32, 0.3],
        ]
      : [[0, 0]];
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill="url(#t-dbz-orb)" stroke={INK} strokeWidth={r * 0.08} />
      {spots.map(([sx, sy], i) => (
        <polygon key={i} points={burstPoints(5, r * 0.2, r * 0.085, sx * r, sy * r)} fill="#d32f2f" />
      ))}
      <ellipse cx={-r * 0.35} cy={-r * 0.45} rx={r * 0.28} ry={r * 0.16} fill="#fff" opacity="0.7" transform={`rotate(-30 ${-r * 0.35} ${-r * 0.45})`} />
    </g>
  );
}

function Back() {
  return (
    <>
      <BackBase edge="#fffaf0" fill="url(#t-dbz-back)" />
      <BackClip>
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2;
          return (
            <path
              key={i}
              d={`M 60 82 L ${60 + Math.cos(a - 0.09) * 150} ${82 + Math.sin(a - 0.09) * 150} L ${60 + Math.cos(a + 0.09) * 150} ${82 + Math.sin(a + 0.09) * 150} Z`}
              fill="#fff59d"
              opacity="0.22"
            />
          );
        })}
        <Orb x={60} y={78} r={32} />
        <g style={{ fontFamily: 'var(--font-card)' }} textAnchor="middle" fontSize="22">
          <text x="61.5" y="152" fill={INK}>
            NUNO
          </text>
          <text x="60" y="150" fill="#ffd600" stroke="#1e3a8a" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke">
            NUNO
          </text>
        </g>
      </BackClip>
    </>
  );
}

function Decor() {
  return <rect x="8" y="8" width="104" height="170" rx="7" fill="none" stroke="#ff8f00" strokeWidth="1.6" opacity="0.7" />;
}

function Defs() {
  return (
    <>
      <radialGradient id="t-dbz-back" cx="0.5" cy="0.42" r="0.8">
        <stop offset="0" stopColor="#ffe082" />
        <stop offset="0.4" stopColor="#ff9800" />
        <stop offset="1" stopColor="#bf360c" />
      </radialGradient>
      <radialGradient id="t-dbz-orb" cx="0.38" cy="0.35" r="0.7">
        <stop offset="0" stopColor="#fff3c4" />
        <stop offset="0.45" stopColor="#ffb300" />
        <stop offset="1" stopColor="#e65100" />
      </radialGradient>
      <pattern id="t-dbz-grid" width="50" height="50" patternUnits="userSpaceOnUse">
        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#7CFC9A" strokeWidth="1.5" />
      </pattern>
    </>
  );
}

function Backdrop() {
  return (
    <Scene>
      <circle cx="320" cy="230" r="160" fill="#fff59d" opacity="0.18" />
      {/* clouds */}
      {[
        [300, 150, 1],
        [1200, 120, 1.2],
        [800, 260, 0.8],
      ].map(([cx, cy, s], i) => (
        <g key={i} transform={`translate(${cx} ${cy}) scale(${s})`} fill="#fff" opacity="0.65">
          <ellipse cx="0" cy="0" rx="110" ry="26" />
          <ellipse cx="-40" cy="-16" rx="60" ry="28" />
          <ellipse cx="40" cy="-20" rx="70" ry="32" />
        </g>
      ))}
      {/* mesas */}
      <path
        d="M 0 900 L 0 560 L 120 560 L 150 600 L 260 600 L 290 520 L 420 520 L 450 640 L 700 640 L 730 580 L 860 580 L 880 650 L 1100 650 L 1140 500 L 1290 500 L 1320 600 L 1480 600 L 1500 540 L 1600 540 L 1600 900 Z"
        fill="#a0522d"
        opacity="0.75"
      />
      <path d={ridgePath(1600, 720, 900, 60, 10, 47, true)} fill="#6d3b1f" />
      <path d={ridgePath(1600, 800, 900, 40, 16, 51, true)} fill="#3e2213" />
      {/* energy streaks */}
      <path d="M 100 420 Q 700 300 1500 380" fill="none" stroke="#fffde7" strokeWidth="5" opacity="0.25" />
      <path d="M 200 460 Q 800 360 1560 430" fill="none" stroke="#81d4fa" strokeWidth="3" opacity="0.25" />
    </Scene>
  );
}

function Overlay() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
      <rect width="1000" height="600" fill="url(#t-dbz-grid)" opacity="0.07" />
      <g fill="none" stroke="#7CFC9A" opacity="0.12">
        <ellipse cx="500" cy="300" rx="300" ry="180" strokeWidth="3" />
        <ellipse cx="500" cy="300" rx="160" ry="96" strokeWidth="3" />
        <path d="M 500 60 L 500 540 M 160 300 L 840 300" strokeWidth="2" />
      </g>
    </svg>
  );
}

function Emblem() {
  return <Orb x={0} y={0} r={40} />;
}

const KI = ['#fff59d', '#ffd600', '#ffffff'];

export const dbz: Theme = {
  id: 'dbz',
  name: 'Dragon Ball Z',
  title: 'Power Level',
  tagline: 'Ki blasts, beams and a golden aura when you hit one card.',
  emoji: '🐉',
  edition: 'Saiyan Edition',
  fonts: 'family=Bungee',
  vars: {
    '--ink': INK,
    '--cream': '#fff6e5',
    '--night': '#0e1638',
    '--yellow': '#ffd600',
    '--red': '#e53935',
    '--muted': '#6b5a85',
    '--soft': '#4a3d66',
    '--faint': '#9a8db3',
    '--panel-2': '#ffe3b3',
    '--panel-3': '#ffeccc',
    '--line': '#f0d9a8',
    '--highlight': '#ffe680',
    '--chip-hover': '#fff1cc',
    '--link': '#e65100',
    '--accent-a': '#ffc46b',
    '--accent-b': '#ff8f00',
    '--surface': '#fffaf0',
    '--turn-bg': '#ffe680',
    '--ring': 'rgba(255, 214, 0, 0.95)',
    '--font-display': "'Bungee', 'Lilita One', system-ui, sans-serif",
    '--font-card': "'Bungee', 'Lilita One', system-ui, sans-serif",
    '--panel-bg': 'linear-gradient(180deg, #fffaf0 0%, #fff1d6 100%)',
    '--room-bg': 'linear-gradient(180deg, #0d47a1 0%, #1976d2 32%, #64b5f6 55%, #ffb74d 72%, #8d5a3b 100%)',
  },
  cardColors: {
    red: { base: '#e53935', light: '#ff6f60', dark: '#ab000d' },
    yellow: { base: '#ffc400', light: '#fff350', dark: '#c79400' },
    green: { base: '#43a047', light: '#76d275', dark: '#00701a' },
    blue: { base: '#1e63d6', light: '#6390ff', dark: '#003aa4' },
    pink: { base: '#e91e63', light: '#ff6090', dark: '#b0003a' },
    teal: { base: '#00acc1', light: '#5ddef4', dark: '#007c91' },
    orange: { base: '#ff6d00', light: '#ff9e40', dark: '#c43c00' },
    purple: { base: '#8e24aa', light: '#c158dc', dark: '#5c007a' },
  },
  felt: {
    red: ['#e04a40', '#9c1f17', '#530c08'],
    yellow: ['#f0b52a', '#b47708', '#6e4504'],
    green: ['#3fa04a', '#1d6b28', '#0b3a12'],
    blue: ['#3a74e0', '#1a45a6', '#0b2466'],
    pink: ['#e0457a', '#9c1a47', '#520a23'],
    teal: ['#1fb0c4', '#0d6f80', '#053b45'],
    orange: ['#f07a2a', '#ad4608', '#5c2202'],
    purple: ['#9c3fbf', '#5f1a7d', '#300b40'],
  },
  neutralFelt: ['#7a8aa8', '#46556f', '#232b3b'],
  card: { edge: '#fffaf0', Back, Decor },
  Defs,
  Backdrop,
  table: {
    rim: 'repeating-linear-gradient(90deg, #d6d2c9 0 38px, #a8a39a 38px 41px), repeating-linear-gradient(0deg, rgba(0,0,0,0) 0 22px, rgba(0,0,0,0.18) 22px 25px), #c4bfb5',
    Overlay,
    Emblem,
    chevron: '#fff59d',
  },
  ambient: {
    shapes: ['spark', 'spark', 'rock'],
    colors: ['#fff59d', '#ffd600', '#ffffff', '#a1887f'],
    count: 20,
    size: [8, 16],
    fall: [-70, -25],
    drift: [-8, 8],
    spin: 1,
    sway: 6,
    glow: true,
    twinkle: true,
    alpha: [0.45, 0.9],
  },
  onFx: (e, k) => {
    const { fx } = k;
    switch (e.kind) {
      case 'hit':
        if (e.amount >= 4) {
          fx.beam(e.from, e.to, { color: '#4fc3f7', width: 22 + Math.min(16, e.amount * 2), dur: 1.0 });
          setTimeout(() => {
            fx.flash('#e1f5fe', 0.6, 240);
            fx.shake(e.amount >= 6 ? 16 : 12, 600);
            fx.burst(e.to.x, e.to.y, { shapes: ['orb', 'spark', 'rock'], colors: ['#4fc3f7', '#ffffff', '#a1887f'], count: 34, glow: true, speed: [200, 520] });
          }, 380);
        } else {
          fx.projectile(e.from, e.to, {
            shape: 'orb',
            color: '#ffd600',
            size: 36,
            glow: true,
            arc: 20,
            dur: 0.38,
            trail: { shape: 'ember', colors: KI, glow: true, size: [14, 24] },
            onHit: () => fx.burst(e.to.x, e.to.y, { shapes: ['spark', 'ember'], colors: KI, count: 22, glow: true }),
          });
        }
        return;
      case 'skip':
        fx.burst(e.from.x, e.from.y, { shapes: ['spark'], colors: KI, count: 10, glow: true, speed: [60, 160] });
        fx.ring(e.to.x, e.to.y, { color: '#fff59d', r0: 10, r1: 80, width: 6, glow: true });
        fx.burst(e.to.x, e.to.y, { shapes: ['spark'], colors: KI, count: 14, glow: true });
        return;
      case 'reverse':
      case 'passHands':
        fx.ring(e.at.x, e.at.y, { color: '#ffd600', r0: 30, r1: 260, width: 10, squash: 0.6, glow: true, dur: 0.7 });
        fx.burst(e.at.x, e.at.y, { shapes: ['rock'], colors: ['#a1887f', '#8d6e63'], count: 14, gravity: -120, speed: [80, 220] });
        return;
      case 'color':
        fx.burst(e.at.x, e.at.y, { shapes: ['ember', 'spark'], colors: [e.hex, '#ffffff'], count: 30, glow: true, gravity: -300, speed: [80, 300], size: [14, 28] });
        fx.ring(e.at.x, e.at.y, { color: e.hex, r0: 30, r1: 190, width: 9, glow: true });
        return;
      case 'uno':
        fx.burst(e.at.x, e.at.y, { shapes: ['ember', 'spark'], colors: ['#ffd600', '#fff59d', '#ffffff'], count: 40, glow: true, gravity: -420, speed: [60, 260], size: [16, 30] });
        fx.bolt({ x: e.at.x - 50, y: e.at.y - 80 }, { x: e.at.x - 10, y: e.at.y + 10 }, { color: '#81d4fa' });
        fx.bolt({ x: e.at.x + 60, y: e.at.y - 70 }, { x: e.at.x + 10, y: e.at.y + 20 }, { color: '#81d4fa' });
        fx.shake(6);
        return;
      case 'caught':
        fx.projectile({ x: e.by.x, y: e.by.y }, e.at, {
          shape: 'orb',
          color: '#ffd600',
          size: 30,
          glow: true,
          dur: 0.35,
          onHit: () => fx.burst(e.at.x, e.at.y, { shapes: ['spark'], colors: KI, count: 16, glow: true }),
        });
        return;
      case 'knockout':
        fx.flash('#ffffff', 0.8, 360);
        fx.shake(18, 800);
        fx.burst(e.at.x, e.at.y, { shapes: ['orb', 'rock', 'spark'], colors: ['#ffd600', '#ffffff', '#a1887f'], count: 40, glow: true, speed: [200, 600] });
        return;
      case 'stack':
        fx.beam({ x: e.at.x, y: 0 }, e.to, { color: '#ffd600', width: 18, dur: 0.6 });
        fx.shake(8 + Math.min(10, e.total / 2));
        return;
      case 'swap':
        fx.burst(e.a.x, e.a.y, { shapes: ['spark'], colors: KI, count: 12, glow: true });
        fx.burst(e.b.x, e.b.y, { shapes: ['spark'], colors: KI, count: 12, glow: true });
        return;
      case 'win':
        fx.rain({ shapes: ['spark', 'ember'], colors: ['#ffd600', '#fff59d', '#ffffff'], count: 70, glow: true });
        return;
      case 'yourTurn':
        fx.ring(e.at.x, e.at.y, { color: '#ffd600', r0: 30, r1: 150, width: 6, squash: 0.45, glow: true });
        return;
      default:
        k.base(e);
    }
  },
  splash: { backdrop: 'glow', color: '#ffd600', ink: INK, kickerBg: '#1e3a8a', kickerInk: '#fff59d' },
  moves: {
    skip: 'Instant Transmission',
    skipAll: 'Time Skip',
    reverse: 'Afterimage',
    draw: 'Ki Blast!',
    bigDraw: 'KAME-HAME-HAAA!',
    wild: 'Power Up!',
    uno: 'MAXIMUM POWER!',
    swap: 'Fusion-HA!',
    flip: 'Transformation',
    stack: 'Spirit Bomb',
    knockout: 'Power level: zero',
    caught: 'Scouter detected you!',
    discardAll: 'Energy Wave',
    launch: 'Destructo Disc',
  },
  rank: (cards) => {
    const level = Math.round(9001 / Math.max(1, cards));
    return cards <= 1 ? 'PL 9000+' : `PL ${level.toLocaleString('en-US')}`;
  },
  auraClass: 'aura-ki',
  hotClass: 'aura-super',
  sfx: {
    plus: (n: number) => {
      if (n >= 4) fxSounds.beam();
      else {
        fxSounds.pew();
        fxSounds.boom(0.3, 0.7);
      }
    },
    skip: () => fxSounds.zip(),
    reverse: () => {
      fxSounds.kiCharge(0, 0.35);
      fxSounds.boom(0.3, 0.6);
    },
    wild: () => fxSounds.kiCharge(0, 0.5),
    uno: () => fxSounds.powerUp(),
    win: () => {
      fxSounds.powerUp();
      fxSounds.fanfare();
    },
  },
  music: {
    id: 'power',
    name: 'Power Level Rising',
    bpm: 168,
    root: 52,
    scale: [0, 2, 3, 5, 7, 8, 10],
    chords: [0, 5, 6, 0],
    drums: { kick: 'x.x...x.x.x...x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', hatTense: 'xxxxxxxxxxxxxxxx' },
    guitar: { pattern: 'x..x..x...x.x...', vol: 0.09 },
    bass: { pattern: '0.0.0.0.0.0.0.0.', wave: 'square', vol: 0.1, cut: 600 },
    lead: {
      bars: ['e-e-g-e-d---b---', 'c---d---e-------', 'e-e-g-e-h---g---', 'f---e---d-------'],
      wave: 'square',
      vol: 0.04,
      octave: 1,
      vibrato: [6, 5],
      cut: 2500,
    },
  },
};
