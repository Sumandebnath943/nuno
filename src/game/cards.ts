import type { Card, CardColor, CardValue, Color, Face, GameMode } from './types';
import { COLORS } from './types';
import { modePoints } from './modes';

export type Rng = () => number;

/** Builds the classic 108 card face list (no ids yet — ids are assigned AFTER shuffling so they never leak card identity). */
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

export function isNumberCard(card: Face): boolean {
  return /^\d$/.test(card.value);
}

/** Basic matching: colour, number or symbol — wilds always match. */
export function isPlayable(card: Face, top: Face, currentColor: Color): boolean {
  if (isWild(card)) return true;
  if (card.color === currentColor) return true;
  return card.value === top.value;
}

/** Official point values used for scoring. */
export function cardPoints(card: Face, mode: GameMode = 'classic'): number {
  return modePoints(card, mode);
}

export const COLOR_NAMES: Record<Color, string> = {
  red: 'Red',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  pink: 'Pink',
  teal: 'Teal',
  orange: 'Orange',
  purple: 'Purple',
};

export const VALUE_NAMES: Record<string, string> = {
  skip: 'Skip',
  reverse: 'Reverse',
  draw2: 'Draw Two',
  draw4: 'Draw Four',
  discardAll: 'Discard All',
  skipAll: 'Skip Everyone',
  draw1: 'Draw One',
  draw5: 'Draw Five',
  flip: 'Flip',
  hit2: 'Hit 2',
  tradeHands: 'Trade Hands',
  wild: 'Wild',
  wild4: 'Wild Draw Four',
  wildReverse4: 'Wild Reverse Draw Four',
  wild6: 'Wild Draw Six',
  wild10: 'Wild Draw Ten',
  wildRoulette: 'Wild Color Roulette',
  wildDraw2: 'Wild Draw Two',
  wildDrawColor: 'Wild Draw Color',
  wildAllHit: 'Wild All Hit',
  wildHitFire: 'Wild Hit-Fire',
  wildReverse: 'Wild Reverse',
  wildSkip: 'Wild Skip',
  wildSkip2: 'Wild Skip Two',
  wildDraw4: 'Wild Draw Four',
  wildTargetDraw2: 'Wild Targeted Draw Two',
  wildSwap: 'Wild Forced Swap',
};

export function cardLabel(card: Pick<Card, 'color' | 'value'> & { spin?: boolean }): string {
  if (card.color === 'wild') return VALUE_NAMES[card.value] ?? 'Wild';
  const name = `${COLOR_NAMES[card.color]} ${VALUE_NAMES[card.value] ?? card.value}`;
  return card.spin ? `${name} (Spin)` : name;
}

const VALUE_ORDER: CardValue[] = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'draw1',
  'skip',
  'skipAll',
  'reverse',
  'draw2',
  'hit2',
  'draw4',
  'draw5',
  'discardAll',
  'tradeHands',
  'flip',
  'wild',
  'wildRoulette',
  'wildReverse',
  'wildSkip',
  'wildSkip2',
  'wildSwap',
  'wildTargetDraw2',
  'wildDraw2',
  'wildAllHit',
  'wildHitFire',
  'wildDrawColor',
  'wild4',
  'wildDraw4',
  'wildReverse4',
  'wild6',
  'wild10',
];
const COLOR_ORDER: CardColor[] = ['red', 'yellow', 'green', 'blue', 'pink', 'teal', 'orange', 'purple', 'wild'];

export function sortHand(hand: Card[]): Card[] {
  return hand
    .slice()
    .sort(
      (a, b) =>
        COLOR_ORDER.indexOf(a.color) - COLOR_ORDER.indexOf(b.color) ||
        VALUE_ORDER.indexOf(a.value) - VALUE_ORDER.indexOf(b.value),
    );
}
