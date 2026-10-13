// The original NUNO look: toy-box purple room, bright felt, red card backs.
import type { Theme } from './types';
import { CLASSIC_TRACKS } from '../lib/music';

const INK = '#1b1530';
const OVAL = { cx: 60, cy: 93, rx: 41, ry: 72, rot: 30 };
const outlined = { stroke: INK, strokeLinejoin: 'round' as const, paintOrder: 'stroke' };

function Back() {
  return (
    <>
      <rect width="120" height="186" rx="12" fill="#fff" />
      <rect x="5" y="5" width="110" height="176" rx="8.5" fill="#1d1828" />
      <ellipse
        cx={OVAL.cx}
        cy={OVAL.cy}
        rx={OVAL.rx + 1}
        ry={OVAL.ry + 2}
        transform={`rotate(${OVAL.rot} ${OVAL.cx} ${OVAL.cy})`}
        fill="url(#nb-red)"
      />
      <path d="M5 13 Q5 5 13 5 H80 L5 96 Z" fill="url(#n-sheen)" />
      <g transform="rotate(-20 60 93)" style={{ fontFamily: 'var(--font-card)' }} textAnchor="middle" fontSize="38">
        <text x="62.5" y="109" fill={INK}>
          NUNO
        </text>
        <text x="60" y="106" fill="#ffd21f" strokeWidth="6" {...outlined}>
          NUNO
        </text>
      </g>
    </>
  );
}

export const classic: Theme = {
  id: 'classic',
  name: 'Classic',
  title: 'NUNO Classic',
  tagline: 'The original toy-box look.',
  emoji: '🎴',
  vars: {},
  cardColors: {
    red: { base: '#e8333a', light: '#ff6268', dark: '#ad1820' },
    yellow: { base: '#ffc21a', light: '#ffdc5e', dark: '#dc9300' },
    green: { base: '#2eb34f', light: '#5ad377', dark: '#167a34' },
    blue: { base: '#2f72e0', light: '#62a0ff', dark: '#1a47aa' },
    pink: { base: '#e5449a', light: '#ff7dbf', dark: '#a3176a' },
    teal: { base: '#17aeab', light: '#53e0dc', dark: '#0b7472' },
    orange: { base: '#f27a1f', light: '#ffa75c', dark: '#b94d05' },
    purple: { base: '#7a4cdb', light: '#a985ff', dark: '#4f28a3' },
  },
  felt: {
    red: ['#e0484a', '#9c1d27', '#5c0d17'],
    yellow: ['#f0b52a', '#b47708', '#6e4504'],
    green: ['#36b25c', '#177a3b', '#0a4523'],
    blue: ['#3d7fe6', '#1a4ca6', '#0c2a66'],
    pink: ['#d94c95', '#8e1c5b', '#4f0b31'],
    teal: ['#22aaa6', '#0f6b6a', '#063c3c'],
    orange: ['#ec8436', '#a64d0d', '#5e2a05'],
    purple: ['#8159d8', '#4a2a9c', '#25145a'],
  },
  neutralFelt: ['#6a55d9', '#3f2f9c', '#231a5e'],
  card: { edge: '#fff', Back },
  table: { rim: 'linear-gradient(180deg, #3b2f86 0%, #241c5c 100%)' },
  ambient: null,
  splash: { backdrop: 'none' },
  music: CLASSIC_TRACKS[0],
};
