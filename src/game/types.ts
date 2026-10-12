// ─────────────────────────────────────────────────────────────
//  NUNO — core types
//  The rules follow the official UNO rules (108-card deck).
// ─────────────────────────────────────────────────────────────

export type Color = 'red' | 'yellow' | 'green' | 'blue';
export type CardColor = Color | 'wild';
export type NumberValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type ActionValue = 'skip' | 'reverse' | 'draw2';
export type WildValue = 'wild' | 'wild4';
export type CardValue = NumberValue | ActionValue | WildValue;

export const COLORS: Color[] = ['red', 'yellow', 'green', 'blue'];

export interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
}

export type PlayerKind = 'human' | 'bot' | 'remote';
export type Difficulty = 'chill' | 'normal' | 'savage';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  kind: PlayerKind;
  hand: Card[];
  /** Declared "UNO" for the current one-card situation. */
  saidUno: boolean;
  score: number;
  connected: boolean;
}

export type Phase =
  | 'play' // current player must play or draw
  | 'drawn' // current player drew a playable card: play it or keep it
  | 'chooseColor' // first card of round was a Wild: first player picks color
  | 'challenge' // a Wild Draw Four was played; the target decides to accept or challenge
  | 'roundOver'
  | 'gameOver';

export interface ChallengeContext {
  offender: number;
  target: number;
  /** The colour in play before the Wild Draw Four was played. */
  prevColor: Color;
}

export type DrawReason = 'turn' | 'draw2' | 'wild4' | 'penalty' | 'challenge' | 'start';

export type GameEventBody =
  | { type: 'deal'; round: number; dealer: number }
  | { type: 'firstCard'; card: Card }
  | { type: 'play'; player: number; card: Card; chosenColor?: Color }
  | { type: 'draw'; player: number; count: number; reason: DrawReason }
  | { type: 'skip'; player: number }
  | { type: 'reverse'; direction: 1 | -1 }
  | { type: 'colorChange'; player: number; color: Color }
  | { type: 'uno'; player: number }
  | { type: 'caught'; player: number; by: number }
  | {
      type: 'challenge';
      challenger: number;
      offender: number;
      guilty: boolean;
      /** Only revealed to the challenger (redacted in other views). */
      revealedHand?: Card[];
    }
  | { type: 'accept4'; player: number }
  | { type: 'pass'; player: number }
  | { type: 'reshuffle' }
  | { type: 'roundOver'; winner: number; points: number }
  | { type: 'gameOver'; winner: number }
  | { type: 'seatChange'; player: number; kind: PlayerKind; note: string };

export type GameEvent = GameEventBody & { seq: number };

export interface GameState {
  players: Player[];
  deck: Card[];
  discard: Card[];
  currentColor: Color;
  current: number;
  direction: 1 | -1;
  dealer: number;
  phase: Phase;
  drawnCardId: string | null;
  challenge: ChallengeContext | null;
  /** Host-only: was the pending Wild Draw Four played illegally? Never sent in views. */
  wild4Bluff: boolean;
  /** Player who is down to one card and has not said UNO — can be caught. */
  unoVulnerable: number | null;
  round: number;
  /** 0 = single round; otherwise first to reach this many points wins. */
  targetScore: number;
  roundWinner: number | null;
  roundPoints: number;
  winner: number | null;
  events: GameEvent[];
  seq: number;
  idCounter: number;
}

export type Action =
  | { type: 'play'; player: number; cardId: string; color?: Color; uno?: boolean }
  | { type: 'draw'; player: number }
  | { type: 'pass'; player: number }
  | { type: 'chooseColor'; player: number; color: Color }
  | { type: 'challenge'; player: number; challenge: boolean }
  | { type: 'uno'; player: number }
  | { type: 'catch'; player: number; target: number }
  | { type: 'nextRound'; player: number };

/** Distributive Omit so each union member keeps its own fields. */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type Intent = DistributiveOmit<Action, 'player'>;

// ── What a single seat is allowed to see ────────────────────
export interface PublicPlayer {
  id: string;
  name: string;
  avatar: string;
  kind: PlayerKind;
  handCount: number;
  cardIds: string[];
  saidUno: boolean;
  score: number;
  connected: boolean;
}

export interface GameView {
  me: number;
  myHand: Card[];
  players: PublicPlayer[];
  deckCount: number;
  deckTopIds: string[];
  discardTop: Card[];
  currentColor: Color;
  current: number;
  direction: 1 | -1;
  dealer: number;
  phase: Phase;
  drawnCardId: string | null;
  challenge: ChallengeContext | null;
  unoVulnerable: number | null;
  round: number;
  targetScore: number;
  roundWinner: number | null;
  roundPoints: number;
  winner: number | null;
  events: GameEvent[];
  /** All hands, revealed at the end of a round for scoring. */
  revealedHands: Card[][] | null;
}

export interface SeatConfig {
  name: string;
  avatar: string;
  kind: PlayerKind;
}
