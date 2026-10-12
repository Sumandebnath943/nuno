import type { Color } from '../game/types';

/** Outline colour used for the chunky "toy box" look (cards, buttons, panels). */
export const INK = '#1b1530';

export const CARD_COLORS: Record<Color, { base: string; light: string; dark: string }> = {
  red: { base: '#e8333a', light: '#ff6268', dark: '#ad1820' },
  yellow: { base: '#ffc21a', light: '#ffdc5e', dark: '#dc9300' },
  green: { base: '#2eb34f', light: '#5ad377', dark: '#167a34' },
  blue: { base: '#2f72e0', light: '#62a0ff', dark: '#1a47aa' },
};

/** Table felt per active colour: [centre, mid, edge]. */
export const FELT: Record<Color, [string, string, string]> = {
  red: ['#e0484a', '#9c1d27', '#5c0d17'],
  yellow: ['#f0b52a', '#b47708', '#6e4504'],
  green: ['#36b25c', '#177a3b', '#0a4523'],
  blue: ['#3d7fe6', '#1a4ca6', '#0c2a66'],
};

export const COLOR_ORDER: Color[] = ['red', 'yellow', 'green', 'blue'];
