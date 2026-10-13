import type { Color, GameMode } from '../game/types';

// Card colours, felts and everything else that changes with the theme live in
// src/themes. What's left here is shared by every theme.

/** Outline colour used for the chunky "toy box" look (cards, buttons, panels). */
export const INK = '#1b1530';

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
