// My Hero Academia — "Hero Academy": comic-book halftones, a hero city
// skyline, speed lines and SMASH-style impacts on every big play.
import type { Theme } from './types';
import { BackBase, BackClip, burstPoints, Scene, seeded } from './art';
import { fxSounds } from '../lib/sound';

const INK = '#101010';

function Back() {
  return (
    <>
      <BackBase edge="#ffffff" fill="url(#t-mha-back)" />
      <BackClip>
        {/* speed lines */}
        {Array.from({ length: 18 }, (_, i) => {
          const a = (i / 18) * Math.PI * 2;
          return (
            <path
              key={i}
              d={`M 60 93 L ${60 + Math.cos(a - 0.06) * 140} ${93 + Math.sin(a - 0.06) * 140} L ${60 + Math.cos(a + 0.06) * 140} ${93 + Math.sin(a + 0.06) * 140} Z`}
              fill="#ffffff"
              opacity="0.16"
            />
          );
        })}
        <rect x="5" y="5" width="110" height="176" fill="url(#t-mha-dots)" opacity="0.35" />
        <polygon points={burstPoints(12, 50, 30, 60, 93, 0.35, 3)} fill="#ffd600" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <polygon points={burstPoints(12, 36, 22, 60, 93, 0.3, 9)} fill="#ff3d00" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <g transform="rotate(-12 60 93)" style={{ fontFamily: 'var(--font-card)' }} textAnchor="middle" fontSize="30">
          <text x="62" y="105" fill={INK}>
            NUNO!
          </text>
          <text x="60" y="102" fill="#ffffff" stroke={INK} strokeWidth="5" strokeLinejoin="round" paintOrder="stroke">
            NUNO!
          </text>
        </g>
      </BackClip>
      <rect x="5" y="5" width="110" height="176" rx="8.5" fill="none" stroke={INK} strokeWidth="3" />
    </>
  );
}

function Decor() {
  return <rect x="6" y="6" width="108" height="174" rx="8" fill="none" stroke={INK} strokeWidth="3" />;
}

function Defs() {
  return (
    <>
      <radialGradient id="t-mha-back" cx="0.5" cy="0.5" r="0.8">
        <stop offset="0" stopColor="#42a5f5" />
        <stop offset="0.6" stopColor="#1565c0" />
        <stop offset="1" stopColor="#0b2e6b" />
      </radialGradient>
      <pattern id="t-mha-dots" width="8" height="8" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="1.7" fill="#fff" />
      </pattern>
      <pattern id="t-mha-dots-big" width="22" height="22" patternUnits="userSpaceOnUse">
        <circle cx="11" cy="11" r="4" fill="#fff" />
      </pattern>
    </>
  );
}

function Backdrop() {
  const rnd = seeded(42);
  const buildings: { x: number; w: number; h: number; lit: [number, number][] }[] = [];
  let x = -20;
  while (x < 1640) {
    const w = 60 + rnd() * 110;
    const h = 120 + rnd() * 330;
    const lit: [number, number][] = [];
    for (let wy = 900 - h + 20; wy < 880; wy += 26)
      for (let wx = x + 10; wx < x + w - 14; wx += 20) if (rnd() < 0.35) lit.push([wx, wy]);
    buildings.push({ x, w, h, lit });
    x += w + 6 + rnd() * 18;
  }
  return (
    <Scene>
      {/* comic sky: halftone and speed lines from the top corners */}
      <rect x="0" y="0" width="1600" height="900" fill="url(#t-mha-dots-big)" opacity="0.07" />
      {Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * (Math.PI / 2);
        return (
          <path
            key={i}
            d={`M 0 0 L ${Math.cos(a - 0.02) * 1400} ${Math.sin(a - 0.02) * 1400} L ${Math.cos(a + 0.02) * 1400} ${Math.sin(a + 0.02) * 1400} Z`}
            fill="#fff"
            opacity="0.05"
          />
        );
      })}
      {/* the academy tower */}
      <path d="M 760 900 L 760 330 L 800 290 L 840 330 L 840 900 Z" fill="#0d2a57" />
      <rect x="772" y="350" width="56" height="10" fill="#ffd600" opacity="0.7" />
      {buildings.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={900 - b.h} width={b.w} height={b.h} fill={i % 3 === 0 ? '#0a1f44' : '#0e2a5c'} stroke="#061430" strokeWidth="3" />
          {b.lit.map(([wx, wy], j) => (
            <rect key={j} x={wx} y={wy} width="9" height="13" fill="#ffe082" opacity="0.75" />
          ))}
        </g>
      ))}
    </Scene>
  );
}

function Overlay() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
      <rect width="1000" height="600" fill="url(#t-mha-dots-big)" opacity="0.08" />
      {Array.from({ length: 28 }, (_, i) => {
        const a = (i / 28) * Math.PI * 2;
        return (
          <path
            key={i}
            d={`M 500 300 L ${500 + Math.cos(a - 0.025) * 700} ${300 + Math.sin(a - 0.025) * 700} L ${500 + Math.cos(a + 0.025) * 700} ${300 + Math.sin(a + 0.025) * 700} Z`}
            fill="#fff"
            opacity="0.05"
          />
        );
      })}
    </svg>
  );
}

function Emblem() {
  return (
    <g>
      <path d="M 0 -42 L 34 -30 L 34 4 C 34 26 18 38 0 46 C -18 38 -34 26 -34 4 L -34 -30 Z" fill="none" stroke="#fff" strokeWidth="5" />
      <polygon points={burstPoints(5, 20, 8, 0, 2)} fill="#fff" />
    </g>
  );
}

const COMIC = ['#ffd600', '#ff3d00', '#ffffff', '#1e88e5'];

function impact(k: Parameters<NonNullable<Theme['onFx']>>[1], x: number, y: number, power: number) {
  k.fx.lines(x, y, { color: '#ffffff', count: 30, dur: 0.45, inner: 60 });
  k.fx.burst(x, y, { shapes: ['star', 'spark'], colors: COMIC, count: 14 + power * 3, speed: [180, 480], size: [12, 24] });
  k.fx.ring(x, y, { color: '#ffd600', r0: 20, r1: 90 + power * 10, width: 9 });
  if (power >= 4) {
    k.fx.flash('#ffffff', 0.55, 160);
    k.fx.shake(power >= 6 ? 14 : 10);
  }
}

export const mha: Theme = {
  id: 'mha',
  name: 'My Hero Academia',
  title: 'Hero Academy',
  tagline: 'Comic-panel smashes, speed lines and a hero skyline.',
  emoji: '💥',
  edition: 'Hero Edition',
  fonts: 'family=Bangers',
  vars: {
    '--ink': INK,
    '--cream': '#ffffff',
    '--night': '#0b1d3a',
    '--yellow': '#ffd600',
    '--red': '#e53935',
    '--muted': '#4a5a7a',
    '--soft': '#2d3a55',
    '--faint': '#6a758e',
    '--panel-2': '#e8efff',
    '--panel-3': '#eef3ff',
    '--line': '#d0dbf2',
    '--highlight': '#fff59d',
    '--chip-hover': '#fffbe0',
    '--link': '#1565c0',
    '--accent-a': '#ffe14d',
    '--accent-b': '#ffb300',
    '--surface': '#ffffff',
    '--turn-bg': '#fff59d',
    '--ring': 'rgba(255, 214, 0, 0.95)',
    '--font-display': "'Bangers', 'Lilita One', system-ui, sans-serif",
    '--font-card': "'Bangers', 'Lilita One', system-ui, sans-serif",
    // Bangers is tall and narrow: a size up reads the same as everyone else.
    '--dfs': '1.08',
    '--ufs': '1.06',
    '--panel-bg':
      'radial-gradient(circle at 100% 0%, rgba(30,136,229,0.10) 0 1.5px, transparent 2px) 0 0 / 9px 9px, var(--cream)',
    '--room-bg':
      'radial-gradient(ellipse at 50% 40%, rgba(66,165,245,0.45), rgba(0,0,0,0) 60%), linear-gradient(180deg, #1565c0 0%, #0d47a1 45%, #0b1d3a 100%)',
  },
  cardColors: {
    red: { base: '#e53935', light: '#ff6f60', dark: '#ab000d' },
    yellow: { base: '#ffd600', light: '#ffff52', dark: '#c7a500' },
    green: { base: '#00c853', light: '#5efc82', dark: '#009624' },
    blue: { base: '#1e88e5', light: '#6ab7ff', dark: '#005cb2' },
    pink: { base: '#ec407a', light: '#ff77a9', dark: '#b4004e' },
    teal: { base: '#00bfa5', light: '#5df2d6', dark: '#008e76' },
    orange: { base: '#ff6d00', light: '#ff9e40', dark: '#c43c00' },
    purple: { base: '#7c4dff', light: '#b47cff', dark: '#3f1dcb' },
  },
  felt: {
    red: ['#e8504a', '#a3221f', '#5a0d0c'],
    yellow: ['#f2c230', '#b08506', '#5e4502'],
    green: ['#22b35b', '#0f7a37', '#053d1b'],
    blue: ['#3d8ff0', '#1a56b8', '#0a2a66'],
    pink: ['#e05a8c', '#9c2355', '#520c2b'],
    teal: ['#1fb39c', '#0d7464', '#043a32'],
    orange: ['#f07a2a', '#ad4608', '#5c2202'],
    purple: ['#7d5cf0', '#4528b0', '#211160'],
  },
  neutralFelt: ['#5c6f99', '#33426b', '#1a2340'],
  card: { edge: '#ffffff', pattern: 't-mha-dots', patternOpacity: 0.14, Back, Decor },
  Defs,
  Backdrop,
  table: {
    rim: 'repeating-linear-gradient(45deg, #ffd600 0 14px, #101010 14px 28px)',
    Overlay,
    Emblem,
    chevron: '#ffffff',
  },
  ambient: {
    shapes: ['spark', 'star'],
    colors: ['#ffd600', '#ffffff', '#6ab7ff'],
    count: 16,
    size: [8, 16],
    fall: [-50, -20],
    drift: [-10, 10],
    spin: 2,
    sway: 10,
    glow: true,
    twinkle: true,
    alpha: [0.4, 0.85],
  },
  onFx: (e, k) => {
    switch (e.kind) {
      case 'hit':
        k.fx.projectile(e.from, e.to, {
          shape: 'orb',
          color: '#ffd600',
          size: 44,
          glow: true,
          arc: 10,
          dur: 0.3,
          trail: { shape: 'spark', colors: ['#ffd600', '#fff'], glow: true, size: [12, 22] },
          onHit: () => impact(k, e.to.x, e.to.y, e.amount),
        });
        return;
      case 'skip':
        k.fx.lines(e.to.x, e.to.y, { color: '#ffffff', count: 24, dur: 0.35, inner: 50 });
        k.fx.burst(e.to.x, e.to.y, { shapes: ['star'], colors: COMIC, count: 12 });
        return;
      case 'reverse':
      case 'passHands':
        k.fx.lines(e.at.x, e.at.y, { color: '#ffd600', count: 30, dur: 0.5, inner: 140 });
        return;
      case 'color':
        k.fx.lines(e.at.x, e.at.y, { color: e.hex, count: 34, dur: 0.5, inner: 80 });
        k.fx.burst(e.at.x, e.at.y, { shapes: ['star'], colors: [e.hex, '#fff', '#ffd600'], count: 18 });
        return;
      case 'uno':
        impact(k, e.at.x, e.at.y, 3);
        k.fx.flash('#ffd600', 0.3, 200);
        return;
      case 'caught':
        impact(k, e.at.x, e.at.y, 2);
        return;
      case 'knockout':
        impact(k, e.at.x, e.at.y, 8);
        return;
      case 'stack':
        impact(k, e.to.x, e.to.y, Math.min(8, e.total));
        return;
      case 'win':
        k.fx.rain({ shapes: ['star', 'square'], colors: COMIC, count: 60, flutter: true });
        return;
      case 'yourTurn':
        k.fx.lines(e.at.x, e.at.y, { color: '#ffffff', count: 20, dur: 0.35, inner: 120 });
        return;
      default:
        k.base(e);
    }
  },
  splash: { backdrop: 'burst', color: '#ffd600', ink: INK, kickerBg: '#e53935', kickerInk: '#ffffff' },
  moves: {
    skip: 'Sidestep SMASH',
    skipAll: 'Total Shutdown',
    reverse: 'Full Reverse!',
    draw: 'Double SMASH',
    bigDraw: 'ULTRA SMASH',
    wild: 'Quirk Awakening',
    uno: 'GO BEYOND!',
    swap: 'Quirk Swap',
    flip: 'Villain Mode',
    stack: 'Combo Finisher',
    knockout: 'Hero retired…',
    caught: 'Caught red-handed!',
    discardAll: 'Mass Rescue',
    launch: 'Air Cannon',
  },
  rank: (cards) => (cards <= 1 ? 'No.1 Hero' : cards <= 3 ? 'Pro Hero' : cards <= 6 ? 'Sidekick' : cards <= 10 ? 'Hero Student' : 'Civilian'),
  auraClass: 'aura-hero',
  hotClass: 'aura-plus',
  sfx: {
    plus: (n: number) => {
      fxSounds.whoosh();
      fxSounds.boom(0.18, n >= 4 ? 1.3 : 0.8);
      if (n >= 6) fxSounds.airhorn(0.3, 1);
    },
    skip: () => {
      fxSounds.whoosh();
      fxSounds.bonk();
    },
    reverse: () => {
      fxSounds.whoosh();
      fxSounds.slideUp(0.1);
    },
    wild: () => {
      fxSounds.kiCharge(0, 0.4);
      fxSounds.sparkle(true, 0.3);
    },
    uno: () => {
      fxSounds.airhorn(0, 1);
      fxSounds.fanfare();
    },
  },
  music: {
    id: 'hero',
    name: 'Beyond the Limit',
    bpm: 160,
    root: 64,
    scale: [0, 2, 4, 5, 7, 9, 11],
    chords: [0, 5, 3, 4],
    drums: {
      kick: 'x...x...x...x...',
      snare: '....x.......x...',
      hat: 'x.x.x.x.x.x.x.x.',
      clap: '............x...',
      hatTense: 'xxxxxxxxxxxxxxxx',
    },
    bass: { pattern: '0.0.0.0.0.0.0.0.', wave: 'sawtooth', vol: 0.13, cut: 650 },
    pad: { pattern: 'x.......x.......', wave: 'sawtooth', vol: 0.05, len: 6, cut: 1700, voicing: [0, 2, 4] },
    lead: {
      bars: ['a-e-h---g-f-e---', 'f-e-d-c-d---b---', 'a-e-h---g-f-e-h-', 'i---h---e-------'],
      wave: 'sawtooth',
      vol: 0.06,
      octave: 0,
      vibrato: [5, 4],
      cut: 2400,
    },
  },
};
