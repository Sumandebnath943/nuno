import type { Color, GameMode } from '../game/types';

/** Outline colour used for the chunky "toy box" look (cards, buttons, panels). */
export const INK = '#1b1530';

export const CARD_COLORS: Record<Color, { base: string; light: string; dark: string }> = {
  red: { base: '#e8333a', light: '#ff6268', dark: '#ad1820' },
  yellow: { base: '#ffc21a', light: '#ffdc5e', dark: '#dc9300' },
  green: { base: '#2eb34f', light: '#5ad377', dark: '#167a34' },
  blue: { base: '#2f72e0', light: '#62a0ff', dark: '#1a47aa' },
  // UNO Flip Dark Side
  pink: { base: '#e5449a', light: '#ff7dbf', dark: '#a3176a' },
  teal: { base: '#17aeab', light: '#53e0dc', dark: '#0b7472' },
  orange: { base: '#f27a1f', light: '#ffa75c', dark: '#b94d05' },
  purple: { base: '#7a4cdb', light: '#a985ff', dark: '#4f28a3' },
};

/** Table felt per active colour: [centre, mid, edge]. */
export const FELT: Record<Color, [string, string, string]> = {
  red: ['#e0484a', '#9c1d27', '#5c0d17'],
  yellow: ['#f0b52a', '#b47708', '#6e4504'],
  green: ['#36b25c', '#177a3b', '#0a4523'],
  blue: ['#3d7fe6', '#1a4ca6', '#0c2a66'],
  pink: ['#d94c95', '#8e1c5b', '#4f0b31'],
  teal: ['#22aaa6', '#0f6b6a', '#063c3c'],
  orange: ['#ec8436', '#a64d0d', '#5e2a05'],
  purple: ['#8159d8', '#4a2a9c', '#25145a'],
};

export const COLOR_ORDER: Color[] = ['red', 'yellow', 'green', 'blue', 'pink', 'teal', 'orange', 'purple'];

/** Badge backgrounds for each game mode. */
export const MODE_BG: Record<GameMode, string> = {
  classic: 'linear-gradient(135deg, #ff6268, #e8333a)',
  nomercy: 'linear-gradient(135deg, #4a4058, #141019 70%)',
  flip: 'linear-gradient(135deg, #62a0ff 0%, #2f72e0 48%, #7a4cdb 52%, #e5449a 100%)',
  attack: 'linear-gradient(135deg, #ffa75c, #f27a1f)',
  allwild: 'conic-gradient(from 210deg, #e8333a, #ffc21a, #2eb34f, #2f72e0, #e8333a)',
  spin: 'radial-gradient(circle at 30% 30%, #ffe680, #ffc21a 60%, #dc9300)',
};
