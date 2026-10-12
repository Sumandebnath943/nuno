import type { Card, CardColor, CardValue, Color } from './types';
import { COLORS } from './types';

export type Rng = () => number;

/** Builds the 108 card face list (no ids yet — ids are assigned AFTER shuffling so they never leak card identity). */
export function buildDeckFaces(): Array<Omit<Card, 'id'>> {
  const faces: Array<Omit<Card, 'id'>> = [];
  for (const color of COLORS) {
    faces.push({ color, value: '0' });
    const twice: CardValue[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
    for (const value of twice) {
      faces.push({ color, value });
      faces.push({ color, value });
    }
  }
  for (let i = 0; i < 4; i++) {
    faces.push({ color: 'wild', value: 'wild' });
    faces.push({ color: 'wild', value: 'wild4' });
  }
  return faces;
}

export function shuffle<T>(arr: T[], rng: Rng = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function isWild(card: { color: CardColor }): boolean {
  return card.color === 'wild';
}

export function isPlayable(card: Card, top: Card, currentColor: Color): boolean {
  if (isWild(card)) return true;
  if (card.color === currentColor) return true;
  return card.value === top.value;
}

/** Official point values used for scoring. */
export function cardPoints(card: Card): number {
  if (card.value === 'wild' || card.value === 'wild4') return 50;
  if (card.value === 'skip' || card.value === 'reverse' || card.value === 'draw2') return 20;
  return Number(card.value);
}

export const COLOR_NAMES: Record<Color, string> = {
  red: 'Red',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
};

export function cardLabel(card: Pick<Card, 'color' | 'value'>): string {
  const v: Record<string, string> = {
    skip: 'Skip',
    reverse: 'Reverse',
    draw2: 'Draw Two',
    wild: 'Wild',
    wild4: 'Wild Draw Four',
  };
  if (card.color === 'wild') return v[card.value];
  return `${COLOR_NAMES[card.color]} ${v[card.value] ?? card.value}`;
}

const VALUE_ORDER: CardValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2', 'wild', 'wild4'];
const COLOR_ORDER: CardColor[] = ['red', 'yellow', 'green', 'blue', 'wild'];

export function sortHand(hand: Card[]): Card[] {
  return hand
    .slice()
    .sort(
      (a, b) =>
        COLOR_ORDER.indexOf(a.color) - COLOR_ORDER.indexOf(b.color) ||
        VALUE_ORDER.indexOf(a.value) - VALUE_ORDER.indexOf(b.value),
    );
}
