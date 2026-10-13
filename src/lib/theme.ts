import type { Color, GameMode } from '../game/types';

// Card colours, felts and everything else that changes with the theme live in
// src/themes. What's left here is shared by every theme.

/** Outline colour used for the chunky "toy box" look (cards, buttons, panels). */
export const INK = '#1b1530';

export const COLOR_ORDER: Color[] = ['red', 'yellow', 'green', 'blue', 'pink', 'teal', 'orange', 'purple'];

/** Relative luminance (0–1) of a #rrggbb colour. */
export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  if (h.length !== 6) return 0.5;
  const c = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Ink or white, whichever reads better on this background. */
export function readableOn(hex: string): { color: string; shadow: string } {
  // Above ~0.22, dark text has more contrast than white.
  return luminance(hex) > 0.22 ? { color: INK, shadow: 'none' } : { color: '#fff', shadow: `0 1px 0 ${INK}` };
}

/** Badge backgrounds for each game mode. */
export const MODE_BG: Record<GameMode, string> = {
  classic: 'linear-gradient(135deg, #ff6268, #e8333a)',
  nomercy: 'linear-gradient(135deg, #4a4058, #141019 70%)',
  flip: 'linear-gradient(135deg, #62a0ff 0%, #2f72e0 48%, #7a4cdb 52%, #e5449a 100%)',
  attack: 'linear-gradient(135deg, #ffa75c, #f27a1f)',
  allwild: 'conic-gradient(from 210deg, #e8333a, #ffc21a, #2eb34f, #2f72e0, #e8333a)',
  spin: 'radial-gradient(circle at 30% 30%, #ffe680, #ffc21a 60%, #dc9300)',
};
