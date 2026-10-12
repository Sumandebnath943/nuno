// ─────────────────────────────────────────────────────────────
//  The six NUNO modes: decks, point values and descriptions.
//  Every deck matches the contents list of its official UNO game.
// ─────────────────────────────────────────────────────────────
import type { Card, CardValue, Color, DarkColor, Face, GameMode, LightColor, Side } from './types';
import { COLORS, DARK_COLORS } from './types';
import { shuffle, type Rng } from './cards';

export interface ModeInfo {
  id: GameMode;
  name: string;
  /** The UNO game it is based on. */
  basedOn: string;
  tagline: string;
  /** Short bullet points shown when choosing a mode. */
  highlights: string[];
  /** Official points target. */
  officialTarget: number;
  deckSize: number;
  icon: string;
}

export const MODES: Record<GameMode, ModeInfo> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    basedOn: 'UNO',
    tagline: 'The original. Match, shout, win.',
    highlights: ['108 cards', 'Challenge a Wild Draw Four', 'First to 500'],
    officialTarget: 500,
    deckSize: 108,
    icon: '🎴',
  },
  nomercy: {
    id: 'nomercy',
    name: 'No Mercy',
    basedOn: "UNO Show 'Em No Mercy",
    tagline: 'Stack draws, swap hands, knock players out.',
    highlights: ['Stack +2 / +4 / +6 / +10', '0 passes hands, 7 swaps', '25 cards and you’re OUT'],
    officialTarget: 1000,
    deckSize: 168,
    icon: '💀',
  },
  flip: {
    id: 'flip',
    name: 'Flip',
    basedOn: 'UNO Flip',
    tagline: 'Two-sided cards. Flip to the brutal Dark Side.',
    highlights: ['Light & Dark sides', 'Draw Five, Skip Everyone', 'See the backs of their cards'],
    officialTarget: 500,
    deckSize: 112,
    icon: '🌗',
  },
  attack: {
    id: 'attack',
    name: 'Attack',
    basedOn: 'UNO Attack',
    tagline: 'No drawing. Hit the launcher and pray.',
    highlights: ['Card launcher', 'Hit 2, Wild All Hit, Hit-Fire', 'Trade Hands'],
    officialTarget: 500,
    deckSize: 112,
    icon: '🚀',
  },
  allwild: {
    id: 'allwild',
    name: 'All Wild',
    basedOn: 'UNO All Wild',
    tagline: 'Every card is wild. Every card goes.',
    highlights: ['No colours, no matching', 'Skip Two, Forced Swap', 'Targeted Draw Two'],
    officialTarget: 500,
    deckSize: 112,
    icon: '🌈',
  },
  spin: {
    id: 'spin',
    name: 'Spin',
    basedOn: 'UNO Spin',
    tagline: 'Play a Spin card and the next player spins the wheel.',
    highlights: ['Spin wheel with 9 actions', 'War, Trade Hands, Show Hand', 'Race to call “NUNO Spin”'],
    officialTarget: 500,
    deckSize: 108,
    icon: '🎡',
  },
};

export const MODE_ORDER: GameMode[] = ['classic', 'nomercy', 'flip', 'attack', 'allwild', 'spin'];

/** Colours a player can name on the current side. */
export function palette(side: Side): Color[] {
  return side === 'dark' ? [...DARK_COLORS] : [...COLORS];
}

// ── decks ───────────────────────────────────────────────────

type F = Omit<Card, 'id'>;

const NUMBERS_1_9: CardValue[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

function times(n: number, f: () => F): F[] {
  return Array.from({ length: n }, f);
}

function classicDeck(): F[] {
  const out: F[] = [];
  for (const color of COLORS) {
    out.push({ color, value: '0' });
    for (const value of [...NUMBERS_1_9, 'skip', 'reverse', 'draw2'] as CardValue[]) {
      out.push({ color, value }, { color, value });
    }
  }
  out.push(...times(4, () => ({ color: 'wild', value: 'wild' })), ...times(4, () => ({ color: 'wild', value: 'wild4' })));
  return out;
}

/** 168 cards: 80 numbers, 64 coloured actions, 24 wilds. */
function noMercyDeck(): F[] {
  const out: F[] = [];
  for (const color of COLORS) {
    for (const value of ['0', ...NUMBERS_1_9] as CardValue[]) out.push({ color, value }, { color, value });
    for (const value of ['skip', 'reverse', 'draw2', 'discardAll'] as CardValue[])
      out.push(...times(3, () => ({ color, value })));
    for (const value of ['draw4', 'skipAll'] as CardValue[]) out.push(...times(2, () => ({ color, value })));
  }
  out.push(
    ...times(8, () => ({ color: 'wild', value: 'wildReverse4' })),
    ...times(4, () => ({ color: 'wild', value: 'wild6' })),
    ...times(4, () => ({ color: 'wild', value: 'wild10' })),
    ...times(8, () => ({ color: 'wild', value: 'wildRoulette' })),
  );
  return out;
}

function flipSide(colors: (LightColor | DarkColor)[], actions: CardValue[], wilds: CardValue[]): Face[] {
  const out: Face[] = [];
  for (const color of colors) {
    for (const value of NUMBERS_1_9) out.push({ color, value }, { color, value });
    for (const value of actions) out.push({ color, value }, { color, value });
  }
  for (const value of wilds) out.push(...Array.from({ length: 4 }, () => ({ color: 'wild' as const, value })));
  return out;
}

/** 112 two-sided cards. Which dark face sits on which light face is shuffled per game. */
function flipDeck(rng: Rng): F[] {
  const light = flipSide(COLORS, ['draw1', 'reverse', 'skip', 'flip'], ['wild', 'wildDraw2']);
  const dark = shuffle(flipSide(DARK_COLORS, ['draw5', 'reverse', 'skipAll', 'flip'], ['wild', 'wildDrawColor']), rng);
  return light.map((f, i) => ({ ...f, alt: dark[i] }));
}

function attackDeck(): F[] {
  const out: F[] = [];
  for (const color of COLORS) {
    for (const value of NUMBERS_1_9) out.push({ color, value }, { color, value });
    for (const value of ['hit2', 'reverse', 'skip'] as CardValue[]) out.push({ color, value }, { color, value });
    out.push({ color, value: 'discardAll' }, { color, value: 'tradeHands' });
  }
  out.push(
    ...times(4, () => ({ color: 'wild', value: 'wild' })),
    ...times(2, () => ({ color: 'wild', value: 'wildAllHit' })),
    ...times(2, () => ({ color: 'wild', value: 'wildHitFire' })),
  );
  return out;
}

function allWildDeck(): F[] {
  const counts: [CardValue, number][] = [
    ['wild', 54],
    ['wildReverse', 14],
    ['wildSkip', 14],
    ['wildSkip2', 6],
    ['wildDraw2', 10],
    ['wildDraw4', 6],
    ['wildTargetDraw2', 4],
    ['wildSwap', 4],
  ];
  return counts.flatMap(([value, n]) => times(n, () => ({ color: 'wild', value })));
}

/** 108 playing cards (the 4 wheel reference cards aren't played). Spin cards are one each of 1–5 per colour. */
function spinDeck(): F[] {
  const out: F[] = [];
  for (const color of COLORS) {
    out.push({ color, value: '0' });
    for (const value of NUMBERS_1_9) {
      const n = Number(value);
      out.push({ color, value }, n <= 5 ? { color, value, spin: true } : { color, value });
    }
    for (const value of ['skip', 'reverse', 'draw2'] as CardValue[]) out.push({ color, value }, { color, value });
  }
  out.push(...times(4, () => ({ color: 'wild', value: 'wild' })), ...times(4, () => ({ color: 'wild', value: 'wild4' })));
  return out;
}

export function buildModeDeck(mode: GameMode, rng: Rng): F[] {
  switch (mode) {
    case 'nomercy':
      return noMercyDeck();
    case 'flip':
      return flipDeck(rng);
    case 'attack':
      return attackDeck();
    case 'allwild':
      return allWildDeck();
    case 'spin':
      return spinDeck();
    default:
      return classicDeck();
  }
}

// ── scoring ─────────────────────────────────────────────────

const isNumber = (v: CardValue) => /^\d$/.test(v);

/** Official point value of a card in a given mode (Flip uses the side in play). */
export function modePoints(card: Face, mode: GameMode): number {
  const v = card.value;
  if (isNumber(v)) return Number(v);
  switch (mode) {
    case 'allwild':
      return v === 'wild' ? 20 : 50;
    case 'flip':
      return (
        (
          {
            draw1: 10,
            draw5: 20,
            reverse: 20,
            skip: 20,
            skipAll: 30,
            flip: 20,
            wild: 40,
            wildDraw2: 50,
            wildDrawColor: 60,
          } as Record<string, number>
        )[v] ?? 20
      );
    case 'attack':
      if (v === 'discardAll' || v === 'tradeHands') return 30;
      return card.color === 'wild' ? 50 : 20;
    default:
      // Classic, Spin and No Mercy: coloured actions 20, wilds 50.
      return card.color === 'wild' ? 50 : 20;
  }
}

/** No Mercy: points awarded for each player knocked out by the Mercy Rule. */
export const KNOCKOUT_POINTS = 250;
export const MERCY_LIMIT = 25;

/** How many cards a draw card forces (No Mercy stacking value, also used by bots). */
export function drawValue(value: CardValue): number {
  switch (value) {
    case 'draw1':
      return 1;
    case 'draw2':
    case 'wildDraw2':
    case 'hit2':
      return 2;
    case 'draw4':
    case 'wild4':
    case 'wildReverse4':
    case 'wildDraw4':
      return 4;
    case 'draw5':
      return 5;
    case 'wild6':
      return 6;
    case 'wild10':
      return 10;
    default:
      return 0;
  }
}

/** No Mercy draw cards that can be stacked. */
export function isStackable(value: CardValue): boolean {
  return value === 'draw2' || value === 'draw4' || value === 'wildReverse4' || value === 'wild6' || value === 'wild10';
}

/** Cards that make you pick another player. */
export function needsTarget(mode: GameMode, value: CardValue): boolean {
  return (
    (mode === 'nomercy' && value === '7') ||
    (mode === 'attack' && value === 'tradeHands') ||
    (mode === 'allwild' && (value === 'wildTargetDraw2' || value === 'wildSwap'))
  );
}

/** Wilds where the player who plays them names a colour. */
export function needsColor(mode: GameMode, card: Face): boolean {
  if (card.color !== 'wild') return false;
  if (mode === 'allwild') return false;
  return card.value !== 'wildRoulette'; // the victim names the colour
}
