// ─────────────────────────────────────────────────────────────
//  NUNO — core types
//  Six game modes, each following the official rules of its UNO
//  counterpart (Classic, Show 'Em No Mercy, Flip, Attack, All Wild, Spin).
// ─────────────────────────────────────────────────────────────

export type GameMode = 'classic' | 'nomercy' | 'flip' | 'attack' | 'allwild' | 'spin';

/** Light-side colours (every mode) and Flip's Dark-side colours. */
export type LightColor = 'red' | 'yellow' | 'green' | 'blue';
export type DarkColor = 'pink' | 'teal' | 'orange' | 'purple';
export type Color = LightColor | DarkColor;
export type CardColor = Color | 'wild';
export type Side = 'light' | 'dark';

export type NumberValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type ActionValue =
  | 'skip'
  | 'reverse'
  | 'draw2'
  // No Mercy
  | 'draw4'
  | 'discardAll'
  | 'skipAll'
  // Flip
  | 'draw1'
  | 'draw5'
  | 'flip'
  // Attack (also uses discardAll)
  | 'hit2'
  | 'tradeHands';
export type WildValue =
  | 'wild'
  | 'wild4'
  // No Mercy
  | 'wildReverse4'
  | 'wild6'
  | 'wild10'
  | 'wildRoulette'
  // Flip (wildDraw2 is also in All Wild)
  | 'wildDraw2'
  | 'wildDrawColor'
  // Attack
  | 'wildAllHit'
  | 'wildHitFire'
  // All Wild
  | 'wildReverse'
  | 'wildSkip'
  | 'wildSkip2'
  | 'wildDraw4'
  | 'wildTargetDraw2'
  | 'wildSwap';
export type CardValue = NumberValue | ActionValue | WildValue;

export const COLORS: LightColor[] = ['red', 'yellow', 'green', 'blue'];
export const DARK_COLORS: DarkColor[] = ['pink', 'teal', 'orange', 'purple'];

export interface Face {
  color: CardColor;
  value: CardValue;
}

export interface Card extends Face {
  id: string;
  /** UNO Spin: a number card with the swirl that makes the next player spin. */
  spin?: boolean;
  /** UNO Flip: the other side of the card. `color`/`value` is always the side in play. */
  alt?: Face;
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
  /** No Mercy: knocked out of this round by the Mercy Rule. */
  out: boolean;
}

export type Phase =
  | 'play' // current player must play or draw
  | 'drawn' // current player drew a playable card: play it (or keep it, where allowed)
  | 'chooseColor' // someone has to name a colour (first card Wild, revealed Wild after a Flip…)
  | 'challenge' // a Wild Draw Four / Wild Draw Two / Wild Draw Color may be challenged
  | 'roulette' // No Mercy: the victim of Wild Color Roulette names a colour
  | 'launch' // Attack: someone has to press the launcher
  | 'spin' // Spin: someone has to spin the wheel
  | 'wheelPick' // Spin: the spinner picks which cards to discard
  | 'unoSpinRace' // Spin: everyone races to call "UNO Spin"
  | 'unoSpinPick' // Spin: the race winner discards one card
  | 'roundOver'
  | 'gameOver';

export type ChallengeKind = 'wild4' | 'wildDraw2' | 'wildDrawColor';

export interface ChallengeContext {
  offender: number;
  target: number;
  /** The colour in play before the wild was played. */
  prevColor: Color;
  kind: ChallengeKind;
}

export interface LaunchStep {
  player: number;
  presses: number;
  /** Wild Hit-Fire: keep pressing until cards come out. */
  untilFire: boolean;
}

export type WheelSegment =
  'almostUno' | 'discardNumber' | 'discardColor' | 'drawRed' | 'drawBlue' | 'tradeHands' | 'showHand' | 'war' | 'unoSpin';

export const WHEEL: WheelSegment[] = [
  'unoSpin',
  'discardColor',
  'drawBlue',
  'drawRed',
  'war',
  'discardNumber',
  'showHand',
  'tradeHands',
  'almostUno',
];

export type PickKind = 'keep2' | 'number' | 'color' | 'one';

export type DrawReason =
  'turn' | 'draw2' | 'wild4' | 'penalty' | 'challenge' | 'start' | 'stack' | 'roulette' | 'launch' | 'wheel' | 'card';

export type GameEventBody =
  | { type: 'deal'; round: number; dealer: number }
  | { type: 'firstCard'; card: Card }
  | { type: 'play'; player: number; card: Card; chosenColor?: Color; target?: number }
  | { type: 'draw'; player: number; count: number; reason: DrawReason }
  | { type: 'skip'; player: number }
  | { type: 'skipAll'; player: number }
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
  | { type: 'seatChange'; player: number; kind: PlayerKind; note: string }
  // ── mode events ──
  | { type: 'stack'; total: number; victim: number }
  | { type: 'eliminated'; player: number }
  | { type: 'swap'; a: number; b: number }
  | { type: 'passHands'; direction: 1 | -1 }
  | { type: 'flip'; side: Side }
  | { type: 'discardAll'; player: number; count: number }
  | { type: 'launch'; player: number; count: number }
  | { type: 'spin'; player: number; segment: WheelSegment }
  | { type: 'showHand'; player: number; cards: Card[] }
  | { type: 'war'; plays: { player: number; cards: Card[] }[]; winner: number | null }
  | { type: 'roulette'; player: number; color: Color }
  | { type: 'unoSpinCall'; player: number }
  | { type: 'wheelDiscard'; player: number; count: number };

export type GameEvent = GameEventBody & { seq: number };

export interface GameState {
  mode: GameMode;
  side: Side;
  players: Player[];
  deck: Card[];
  discard: Card[];
  currentColor: Color;
  current: number;
  direction: 1 | -1;
  dealer: number;
  phase: Phase;
  drawnCardId: string | null;
  /** No Mercy: a card drawn after "draw until you can play" must be played. */
  drawnMustPlay: boolean;
  challenge: ChallengeContext | null;
  /** Host-only: was the pending wild played illegally? Never sent in views. */
  wild4Bluff: boolean;
  /** Who names the colour in the `chooseColor` phase (defaults to `current`). */
  chooser: number | null;
  /** No Mercy: draw penalty being stacked. `last` is the value the next card must match or beat. */
  stack: { total: number; last: number } | null;
  /** No Mercy: victim of a Wild Color Roulette who must name a colour. */
  roulette: { victim: number } | null;
  /** Attack: launcher presses still owed, then whose turn it is. */
  launch: { queue: LaunchStep[]; resume: number } | null;
  /** Spin: the wheel. */
  wheel: { spinner: number; segment: WheelSegment | null } | null;
  /** Spin: a player choosing cards to discard. */
  pick: { player: number; kind: PickKind } | null;
  /** A player who went out while a final effect (spin, launcher) is still resolving. */
  pendingWin: number | null;
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
  | { type: 'play'; player: number; cardId: string; color?: Color; uno?: boolean; target?: number }
  | { type: 'draw'; player: number }
  | { type: 'pass'; player: number }
  | { type: 'chooseColor'; player: number; color: Color }
  | { type: 'challenge'; player: number; challenge: boolean }
  | { type: 'uno'; player: number }
  | { type: 'catch'; player: number; target: number }
  | { type: 'nextRound'; player: number }
  | { type: 'spin'; player: number }
  | { type: 'pickCards'; player: number; cardIds: string[]; topId?: string; color?: Color }
  | { type: 'unoSpin'; player: number };

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
  out: boolean;
  /** UNO Flip: the backs of their cards, which everyone else can see. */
  altFaces?: Face[];
}

export interface GameView {
  mode: GameMode;
  side: Side;
  me: number;
  myHand: Card[];
  players: PublicPlayer[];
  deckCount: number;
  deckTopIds: string[];
  /** UNO Flip: the visible back of the top card of the draw pile. */
  deckTopAlt: Face | null;
  discardTop: Card[];
  currentColor: Color;
  current: number;
  /** Who has to act right now (null between rounds or while racing). */
  actor: number | null;
  direction: 1 | -1;
  dealer: number;
  phase: Phase;
  drawnCardId: string | null;
  drawnMustPlay: boolean;
  challenge: ChallengeContext | null;
  chooser: number | null;
  stack: { total: number; last: number } | null;
  roulette: { victim: number } | null;
  launch: { player: number; presses: number; untilFire: boolean } | null;
  wheel: { spinner: number; segment: WheelSegment | null } | null;
  pick: { player: number; kind: PickKind } | null;
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
