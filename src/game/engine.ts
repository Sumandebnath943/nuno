// ─────────────────────────────────────────────────────────────
//  NUNO rules engine — a pure reducer: (state, action) => state
//
//  Classic follows the official UNO rules:
//   • 108 card deck, 7 cards each, first to empty their hand wins the round
//   • match by colour, number or symbol; Wilds can always be played
//   • Wild Draw Four is legal only with no card matching the current colour —
//     bluffing is allowed, and the next player may challenge it
//   • if you can't (or don't want to) play, draw 1; if playable you may play it
//   • Reverse acts like Skip with 2 players
//   • say UNO when down to one card or draw 2 if caught before the next player starts
//   • first-card rules (W+4 reshuffled, Wild → first player picks colour, etc.)
//   • scoring: numbers face value, actions 20, wilds 50; first to the target wins
//
//  The other modes follow their official instruction sheets:
//   • No Mercy — 168 cards; stack draw cards of equal or higher value; draw until
//     you can play (and must play it); 0 passes hands, 7 swaps with anyone;
//     25+ cards knocks you out (Mercy Rule); 250 points per knockout
//   • Flip — two-sided cards; Flip turns everything over; Light side has Draw One
//     and Wild Draw Two, Dark side has Draw Five, Skip Everyone and Wild Draw Color
//   • Attack — no drawing: press the launcher instead; Hit 2, Wild All Hit,
//     Wild Hit-Fire, Trade Hands and Discard All
//   • All Wild — every card is wild; Skip Two, Targeted Draw Two, Forced Swap
//   • Spin — Spin cards make the next player spin the wheel
// ─────────────────────────────────────────────────────────────
import { isNumberCard, isPlayable, isWild, shuffle, type Rng } from './cards';
import {
  buildModeDeck,
  drawValue,
  isStackable,
  KNOCKOUT_POINTS,
  MERCY_LIMIT,
  modePoints,
  needsColor,
  needsTarget,
  palette,
} from './modes';
import type {
  Action,
  Card,
  ChallengeKind,
  Color,
  DrawReason,
  Face,
  GameEventBody,
  GameMode,
  GameState,
  GameView,
  LaunchStep,
  PickKind,
  Player,
  SeatConfig,
  WheelSegment,
} from './types';
import { WHEEL } from './types';

export const HAND_SIZE = 7;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
const MAX_EVENTS = 120;

let rng: Rng = Math.random;
/** For tests: make the engine deterministic. */
export function setRng(r: Rng) {
  rng = r;
}

// ── helpers ────────────────────────────────────────────────
function emit(s: GameState, e: GameEventBody) {
  s.seq += 1;
  s.events.push({ ...e, seq: s.seq } as GameState['events'][number]);
  if (s.events.length > MAX_EVENTS) s.events.splice(0, s.events.length - MAX_EVENTS);
}

function withIds(s: GameState, faces: Array<Omit<Card, 'id'>>): Card[] {
  return faces.map((f) => ({ ...f, id: `c${(s.idCounter++).toString(36)}` }));
}

export function top(s: Pick<GameState, 'discard'>): Card {
  return s.discard[s.discard.length - 1];
}

/** The seat `steps` turns away from `from`, skipping players knocked out by the Mercy Rule. */
export function nextIndex(s: Pick<GameState, 'players' | 'direction'>, from: number, steps = 1): number {
  const n = s.players.length;
  let i = from;
  for (let k = 0; k < steps; k++) {
    let guard = 0;
    do {
      i = (((i + s.direction) % n) + n) % n;
      guard++;
    } while (s.players[i].out && guard <= n);
  }
  return i;
}

const isOver = (s: GameState) => s.phase === 'roundOver' || s.phase === 'gameOver';
const activeSeats = (s: GameState) => s.players.map((_, i) => i).filter((i) => !s.players[i].out);

/** Reshuffles the discard pile (minus the top card) into a fresh draw pile. */
function reshuffle(s: GameState): boolean {
  if (s.discard.length <= 1) return false;
  const keep = s.discard.pop()!;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const faces = shuffle(
    s.discard.map(({ id: _id, ...face }) => face),
    rng,
  );
  // Fresh ids so nobody can track which card is which.
  s.deck = withIds(s, faces);
  s.discard = [keep];
  emit(s, { type: 'reshuffle' });
  return true;
}

function drawOne(s: GameState): Card | undefined {
  if (s.deck.length === 0) reshuffle(s);
  return s.deck.pop();
}

const mercyHit = (s: GameState, i: number) =>
  s.mode === 'nomercy' && !s.players[i].out && s.players[i].hand.length >= MERCY_LIMIT;

function afterDraw(s: GameState, player: number, count: number, reason: DrawReason) {
  const p = s.players[player];
  if (p.hand.length > 1) p.saidUno = false;
  if (s.unoVulnerable === player && p.hand.length !== 1) s.unoVulnerable = null;
  emit(s, { type: 'draw', player, count, reason });
  if (mercyHit(s, player)) eliminate(s, player);
}

function drawCards(s: GameState, player: number, count: number, reason: DrawReason): Card[] {
  const drawn: Card[] = [];
  const p = s.players[player];
  for (let i = 0; i < count; i++) {
    const c = drawOne(s);
    if (!c) break;
    p.hand.push(c);
    drawn.push(c);
    if (mercyHit(s, player)) break;
  }
  afterDraw(s, player, drawn.length, reason);
  return drawn;
}

/** Draws until a card satisfies `pred` (that card is kept too), then `extra` more. */
function drawUntil(s: GameState, player: number, pred: (c: Card) => boolean, reason: DrawReason, extra = 0): Card[] {
  const drawn: Card[] = [];
  const p = s.players[player];
  let found = false;
  let left = extra;
  for (;;) {
    if (found && left <= 0) break;
    const c = drawOne(s);
    if (!c) break;
    p.hand.push(c);
    drawn.push(c);
    if (mercyHit(s, player)) break;
    if (found) left--;
    else if (pred(c)) found = true;
  }
  afterDraw(s, player, drawn.length, reason);
  return drawn;
}

/** No Mercy: a player with 25+ cards is out. Their cards are discarded. */
function eliminate(s: GameState, i: number) {
  const p = s.players[i];
  if (p.out) return;
  p.out = true;
  s.discard.unshift(...p.hand);
  p.hand = [];
  p.saidUno = false;
  if (s.unoVulnerable === i) s.unoVulnerable = null;
  emit(s, { type: 'eliminated', player: i });
  const alive = activeSeats(s);
  if (alive.length === 1) {
    endRound(s, alive[0]);
    return;
  }
  if (s.current === i) s.current = nextIndex(s, i, 1);
}

/** A turn action by someone other than the vulnerable player closes the UNO catch window. */
function closeUnoWindow(s: GameState, actorSeat: number) {
  if (s.unoVulnerable !== null && s.unoVulnerable !== actorSeat) s.unoVulnerable = null;
}

/** Hands changed hands: anyone left holding one card has to shout UNO again. */
function afterHandsChanged(s: GameState, seats: number[]) {
  if (s.unoVulnerable !== null && s.players[s.unoVulnerable].hand.length !== 1) s.unoVulnerable = null;
  for (const i of seats) {
    const p = s.players[i];
    p.saidUno = false;
    if (p.hand.length === 1 && s.unoVulnerable === null) s.unoVulnerable = i;
  }
}

function swapHands(s: GameState, a: number, b: number) {
  const h = s.players[a].hand;
  s.players[a].hand = s.players[b].hand;
  s.players[b].hand = h;
  emit(s, { type: 'swap', a, b });
  afterHandsChanged(s, [a, b]);
}

/** Everyone passes their hand one seat along (`dir` +1 = to the left). */
function passHands(s: GameState, dir: 1 | -1) {
  const seats = activeSeats(s).filter((i) => i !== s.pendingWin);
  if (seats.length < 2) return;
  const hands = seats.map((i) => s.players[i].hand);
  seats.forEach((seat, k) => {
    s.players[seat].hand = hands[(k - dir + seats.length) % seats.length];
  });
  emit(s, { type: 'passHands', direction: dir });
  afterHandsChanged(s, seats);
}

function clone(s: GameState): GameState {
  return structuredClone(s);
}

// ── setup ──────────────────────────────────────────────────
export function createGame(seats: SeatConfig[], targetScore: number, mode: GameMode = 'classic'): GameState {
  if (seats.length < MIN_PLAYERS || seats.length > MAX_PLAYERS) {
    throw new Error(`NUNO needs ${MIN_PLAYERS}-${MAX_PLAYERS} players`);
  }
  const players: Player[] = seats.map((seat, i) => ({
    id: `p${i}`,
    name: seat.name,
    avatar: seat.avatar,
    kind: seat.kind,
    hand: [],
    saidUno: false,
    score: 0,
    connected: true,
    out: false,
  }));
  const s: GameState = {
    mode,
    side: 'light',
    players,
    deck: [],
    discard: [],
    currentColor: 'red',
    current: 0,
    direction: 1,
    dealer: Math.floor(rng() * players.length),
    phase: 'play',
    drawnCardId: null,
    drawnMustPlay: false,
    challenge: null,
    wild4Bluff: false,
    chooser: null,
    stack: null,
    roulette: null,
    launch: null,
    wheel: null,
    pick: null,
    pendingWin: null,
    unoVulnerable: null,
    round: 0,
    targetScore,
    roundWinner: null,
    roundPoints: 0,
    winner: null,
    events: [],
    seq: 0,
    idCounter: 0,
  };
  startRound(s);
  return s;
}

function startRound(s: GameState) {
  s.round += 1;
  s.direction = 1;
  s.side = 'light';
  s.drawnCardId = null;
  s.drawnMustPlay = false;
  s.challenge = null;
  s.wild4Bluff = false;
  s.chooser = null;
  s.stack = null;
  s.roulette = null;
  s.launch = null;
  s.wheel = null;
  s.pick = null;
  s.pendingWin = null;
  s.unoVulnerable = null;
  s.roundWinner = null;
  s.roundPoints = 0;
  s.discard = [];
  s.deck = withIds(s, shuffle(buildModeDeck(s.mode, rng), rng));
  for (const p of s.players) {
    p.hand = [];
    p.saidUno = false;
    p.out = false;
  }
  emit(s, { type: 'deal', round: s.round, dealer: s.dealer });
  // Deal one card at a time, starting left of the dealer.
  for (let r = 0; r < HAND_SIZE; r++) {
    for (let k = 1; k <= s.players.length; k++) {
      const idx = (s.dealer + k) % s.players.length;
      s.players[idx].hand.push(s.deck.pop()!);
    }
  }

  // Flip the first card. Some cards go back into the deck, depending on the mode.
  const sendBack: Record<GameMode, string | null> = {
    classic: 'wild4',
    spin: 'wild4',
    flip: 'wildDraw2',
    attack: 'tradeHands',
    nomercy: null,
    allwild: null,
  };
  let first = s.deck.pop()!;
  while (first.value === sendBack[s.mode]) {
    const pos = Math.floor(rng() * (s.deck.length + 1));
    s.deck.splice(pos, 0, first);
    first = s.deck.pop()!;
  }
  // No Mercy: action cards are ignored and another card is flipped.
  if (s.mode === 'nomercy') {
    while (!isNumberCard(first)) {
      s.discard.push(first);
      emit(s, { type: 'firstCard', card: first });
      first = s.deck.pop()!;
    }
  }
  s.discard.push(first);
  emit(s, { type: 'firstCard', card: first });

  const left = nextIndex(s, s.dealer, 1);
  s.phase = 'play';
  s.currentColor = isWild(first) ? palette('light')[Math.floor(rng() * 4)] : (first.color as Color);
  s.current = left;

  // All Wild ignores the action on the first card; No Mercy only starts on numbers.
  if (s.mode === 'allwild' || s.mode === 'nomercy') return;

  switch (first.value) {
    case 'wild':
      s.phase = 'chooseColor';
      s.chooser = left;
      break;
    case 'draw2':
    case 'draw1':
      drawCards(s, left, drawValue(first.value), 'start');
      emit(s, { type: 'skip', player: left });
      s.current = nextIndex(s, left, 1);
      break;
    case 'skip':
      emit(s, { type: 'skip', player: left });
      s.current = nextIndex(s, left, 1);
      break;
    case 'reverse':
      // Dealer starts and play goes to the right.
      s.direction = -1;
      emit(s, { type: 'reverse', direction: -1 });
      s.current = s.dealer;
      break;
    // ── Attack ──
    case 'hit2':
      s.launch = { queue: [{ player: left, presses: 2, untilFire: false }], resume: nextIndex(s, left, 1) };
      s.phase = 'launch';
      break;
    case 'wildAllHit': {
      // Everyone but the dealer presses once, starting left of the dealer; then play as normal.
      const queue: LaunchStep[] = [];
      for (let k = 1; k < s.players.length; k++) {
        queue.push({ player: (s.dealer + k) % s.players.length, presses: 1, untilFire: false });
      }
      s.launch = { queue, resume: left };
      s.phase = 'chooseColor';
      s.chooser = left;
      break;
    }
    case 'wildHitFire':
      s.launch = { queue: [{ player: left, presses: 0, untilFire: true }], resume: nextIndex(s, left, 1) };
      s.phase = 'chooseColor';
      s.chooser = left;
      break;
    default:
      break;
  }
}

// ── turn mechanics ─────────────────────────────────────────
function endRound(s: GameState, winner: number) {
  let points = 0;
  s.players.forEach((p, i) => {
    if (i !== winner) points += p.hand.reduce((sum, c) => sum + modePoints(c, s.mode), 0);
  });
  if (s.mode === 'nomercy') points += KNOCKOUT_POINTS * s.players.filter((p) => p.out).length;
  s.players[winner].score += points;
  s.roundWinner = winner;
  s.roundPoints = points;
  s.unoVulnerable = null;
  s.drawnCardId = null;
  s.drawnMustPlay = false;
  s.challenge = null;
  s.chooser = null;
  s.stack = null;
  s.roulette = null;
  s.launch = null;
  s.wheel = null;
  s.pick = null;
  s.pendingWin = null;
  emit(s, { type: 'roundOver', winner, points });
  if (s.targetScore <= 0 || s.players[winner].score >= s.targetScore) {
    s.phase = 'gameOver';
    s.winner = winner;
    emit(s, { type: 'gameOver', winner });
  } else {
    s.phase = 'roundOver';
  }
}

/** Everything that decides whether a card may be played, shared by the engine, bots and UI. */
export interface PlayContext {
  mode: GameMode;
  currentColor: Color;
  stack: { total: number; last: number } | null;
}

export function canPlayCard(ctx: PlayContext, topCard: Face, hand: Card[], card: Card): boolean {
  // No Mercy: under a draw penalty you may only stack an equal or bigger draw card.
  if (ctx.mode === 'nomercy' && ctx.stack) return isStackable(card.value) && drawValue(card.value) >= ctx.stack.last;
  if (ctx.mode === 'allwild') return true;
  // Attack: you can't go out on a Trade Hands card.
  if (ctx.mode === 'attack' && card.value === 'tradeHands' && hand.length === 1) return false;
  // Spin: Wild Draw Four only when you hold nothing of the current colour (no challenge in UNO Spin).
  if (ctx.mode === 'spin' && card.value === 'wild4' && hand.some((c) => c.id !== card.id && c.color === ctx.currentColor)) {
    return false;
  }
  return isPlayable(card, topCard, ctx.currentColor);
}

function canPlay(s: GameState, player: number, card: Card): boolean {
  return canPlayCard(s, top(s), s.players[player].hand, card);
}

function playCard(s: GameState, player: number, card: Card, color: Color | undefined, uno: boolean, target?: number) {
  const p = s.players[player];
  const prevColor = s.currentColor;
  p.hand = p.hand.filter((c) => c.id !== card.id);
  s.discard.push(card);
  s.drawnCardId = null;
  s.drawnMustPlay = false;

  // Discard All also takes every other card of its colour with it.
  const sweep = card.value === 'discardAll' ? p.hand.filter((c) => c.color === card.color) : [];

  if (uno && p.hand.length - sweep.length === 1) {
    p.saidUno = true;
    emit(s, { type: 'uno', player });
  }

  const named = needsColor(s.mode, card);
  if (isWild(card)) {
    if (named) s.currentColor = color!;
    emit(s, { type: 'play', player, card, chosenColor: named ? color : undefined, target });
    if (named) emit(s, { type: 'colorChange', player, color: color! });
  } else {
    s.currentColor = card.color as Color;
    emit(s, { type: 'play', player, card, target });
  }

  if (sweep.length) {
    p.hand = p.hand.filter((c) => c.color !== card.color);
    // The extra cards go under the Discard All card.
    s.discard.splice(s.discard.length - 1, 0, ...sweep);
    emit(s, { type: 'discardAll', player, count: sweep.length });
  }

  // Did they just win the round?
  if (p.hand.length === 0) {
    goOut(s, player, card);
    return;
  }

  if (p.hand.length === 1) {
    if (!p.saidUno) s.unoVulnerable = player;
  } else {
    p.saidUno = false;
  }

  s.phase = 'play';
  resolveCard(s, player, card, prevColor, target);
}

/** The last card left a hand. Some final cards still take effect (they count for points). */
function goOut(s: GameState, player: number, card: Card) {
  const next = nextIndex(s, player, 1);
  switch (s.mode) {
    case 'classic':
    case 'spin':
    case 'flip':
      if (card.value === 'wildDrawColor') drawUntil(s, next, (c) => c.color === s.currentColor, 'card');
      else if (drawValue(card.value) && card.value !== 'hit2')
        drawCards(s, next, drawValue(card.value), card.value === 'wild4' ? 'wild4' : 'draw2');
      if (card.value === 'flip') doFlip(s, player);
      if (s.mode === 'spin' && card.spin) {
        // The next player still spins, and that is resolved before scoring.
        s.pendingWin = player;
        startSpin(s, next);
        return;
      }
      break;
    case 'attack':
      if (card.value === 'wildAllHit' || card.value === 'wildHitFire') {
        s.pendingWin = player;
        startLaunch(s, player, card.value, next);
        return;
      }
      break;
    default:
      // No Mercy and All Wild: "When a player plays their final card, they win."
      break;
  }
  if (!isOver(s)) endRound(s, player);
}

function resolveCard(s: GameState, player: number, card: Card, prevColor: Color, target?: number) {
  const next = nextIndex(s, player, 1);
  const twoPlayers = activeSeats(s).length === 2;

  if (s.mode === 'spin' && card.spin) {
    startSpin(s, next);
    return;
  }

  switch (card.value) {
    case 'skip':
    case 'wildSkip':
      emit(s, { type: 'skip', player: next });
      s.current = nextIndex(s, player, 2);
      return;
    case 'wildSkip2': {
      const second = nextIndex(s, player, 2);
      emit(s, { type: 'skip', player: next });
      if (second !== player) emit(s, { type: 'skip', player: second });
      s.current = nextIndex(s, player, 3);
      return;
    }
    case 'skipAll':
      emit(s, { type: 'skipAll', player });
      s.current = player;
      return;
    case 'reverse':
    case 'wildReverse':
      if (twoPlayers) {
        emit(s, { type: 'reverse', direction: s.direction });
        emit(s, { type: 'skip', player: next });
        s.current = player;
      } else {
        s.direction = s.direction === 1 ? -1 : 1;
        emit(s, { type: 'reverse', direction: s.direction });
        s.current = nextIndex(s, player, 1);
      }
      return;

    // ── draw cards ──
    case 'draw1':
    case 'draw2':
    case 'draw4':
    case 'draw5':
    case 'wildDraw4':
    case 'wild6':
    case 'wild10':
      if (s.mode === 'nomercy') {
        addToStack(s, drawValue(card.value), next);
        return;
      }
      drawCards(s, next, drawValue(card.value), 'draw2');
      emit(s, { type: 'skip', player: next });
      s.current = nextIndex(s, player, 2);
      return;
    case 'wildReverse4': {
      // Reverse, then the next player in the new direction faces +4.
      // With just two players it skips the other player and makes YOU draw 4 (unless you stack).
      if (!twoPlayers) s.direction = s.direction === 1 ? -1 : 1;
      emit(s, { type: 'reverse', direction: s.direction });
      const victim = twoPlayers ? player : nextIndex(s, player, 1);
      addToStack(s, 4, victim);
      return;
    }
    case 'wild4':
      if (s.mode === 'spin') {
        // Legality is enforced when playing, so there's nothing to challenge.
        drawCards(s, next, 4, 'wild4');
        emit(s, { type: 'skip', player: next });
        s.current = nextIndex(s, player, 2);
        return;
      }
      startChallenge(s, player, next, prevColor, 'wild4');
      return;
    case 'wildDraw2':
      if (s.mode === 'flip') {
        startChallenge(s, player, next, prevColor, 'wildDraw2');
        return;
      }
      drawCards(s, next, 2, 'draw2');
      emit(s, { type: 'skip', player: next });
      s.current = nextIndex(s, player, 2);
      return;
    case 'wildDrawColor':
      startChallenge(s, player, next, prevColor, 'wildDrawColor');
      return;
    case 'wildRoulette':
      s.roulette = { victim: next };
      s.current = next;
      s.phase = 'roulette';
      return;
    case 'wildTargetDraw2':
      // The target draws 2 but does not lose their turn.
      if (target !== undefined) drawCards(s, target, 2, 'card');
      if (!isOver(s)) s.current = nextIndex(s, player, 1);
      return;

    // ── hand swaps ──
    case 'tradeHands':
    case 'wildSwap':
      if (target !== undefined) swapHands(s, player, target);
      s.current = next;
      return;
    case 'flip':
      doFlip(s, player);
      return;

    // ── Attack launcher cards ──
    case 'hit2':
    case 'wildAllHit':
    case 'wildHitFire':
      startLaunch(s, player, card.value, next);
      return;

    default:
      if (s.mode === 'nomercy' && card.value === '7' && target !== undefined) swapHands(s, player, target);
      if (s.mode === 'nomercy' && card.value === '0') passHands(s, s.direction);
      s.current = next;
  }
}

// ── No Mercy stacking ──
function addToStack(s: GameState, value: number, victim: number) {
  const total = (s.stack?.total ?? 0) + value;
  s.stack = { total, last: value };
  emit(s, { type: 'stack', total, victim });
  s.current = victim;
  s.phase = 'play';
}

// ── challengeable wilds ──
function startChallenge(s: GameState, offender: number, target: number, prevColor: Color, kind: ChallengeKind) {
  s.challenge = { offender, target, prevColor, kind };
  // Judged on the hand at the moment it was played (hidden from views).
  s.wild4Bluff = s.players[offender].hand.some((c) => c.color === prevColor);
  s.phase = 'challenge';
  s.current = target;
}

function challengePenalty(s: GameState, kind: ChallengeKind, who: number, extra: number, reason: DrawReason) {
  if (kind === 'wildDrawColor') drawUntil(s, who, (c) => c.color === s.currentColor, reason, extra);
  else drawCards(s, who, (kind === 'wild4' ? 4 : 2) + extra, reason);
}

// ── Flip ──
function swapFace(c: Card) {
  if (!c.alt) return;
  const other = c.alt;
  c.alt = { color: c.color, value: c.value };
  c.color = other.color;
  c.value = other.value;
}

/** Flip the discard pile (the Flip card ends up at the bottom), the draw pile, and every hand. */
function doFlip(s: GameState, player: number) {
  s.side = s.side === 'light' ? 'dark' : 'light';
  s.discard.reverse();
  s.deck.reverse();
  for (const c of s.discard) swapFace(c);
  for (const c of s.deck) swapFace(c);
  for (const p of s.players) p.hand.forEach(swapFace);
  emit(s, { type: 'flip', side: s.side });
  s.current = nextIndex(s, player, 1);
  const t = top(s);
  if (isWild(t)) {
    // A revealed Wild needs a colour: the player who flipped names it.
    s.phase = 'chooseColor';
    s.chooser = player;
  } else {
    s.currentColor = t.color as Color;
  }
}

// ── Attack launcher ──
/** How many cards one press of the launcher fires (the real launcher is random). */
function launcherShot(): number {
  const r = rng();
  if (r < 0.6) return 0;
  if (r < 0.85) return 1 + Math.floor(rng() * 3);
  if (r < 0.95) return 4 + Math.floor(rng() * 3);
  return 7 + Math.floor(rng() * 4);
}

function pressLauncher(s: GameState, player: number): number {
  const shot = launcherShot();
  const p = s.players[player];
  let got = 0;
  for (let i = 0; i < shot; i++) {
    const c = drawOne(s);
    if (!c) break;
    p.hand.push(c);
    got++;
  }
  emit(s, { type: 'launch', player, count: got });
  if (got) afterDraw(s, player, got, 'launch');
  return got;
}

function startLaunch(s: GameState, player: number, value: string, next: number) {
  if (value === 'hit2') {
    s.launch = { queue: [{ player: next, presses: 2, untilFire: false }], resume: nextIndex(s, player, 2) };
  } else if (value === 'wildHitFire') {
    s.launch = { queue: [{ player: next, presses: 0, untilFire: true }], resume: nextIndex(s, player, 2) };
  } else {
    // Wild All Hit: everyone else presses once, starting with the next player; then play goes on as normal.
    const queue: LaunchStep[] = [];
    let i = next;
    while (i !== player) {
      queue.push({ player: i, presses: 1, untilFire: false });
      i = nextIndex(s, i, 1);
    }
    s.launch = { queue, resume: next };
  }
  s.phase = 'launch';
}

function finishLaunch(s: GameState) {
  const resume = s.launch!.resume;
  s.launch = null;
  if (s.pendingWin !== null) {
    endRound(s, s.pendingWin);
    return;
  }
  s.phase = 'play';
  s.current = resume;
}

// ── Spin wheel ──
function startSpin(s: GameState, spinner: number) {
  s.wheel = { spinner, segment: null };
  s.phase = 'spin';
  s.current = spinner;
}

function resolveWheel(s: GameState, spinner: number, segment: WheelSegment) {
  const hand = s.players[spinner].hand;
  const pickPhase = (kind: PickKind) => {
    s.pick = { player: spinner, kind };
    s.phase = 'wheelPick';
  };
  switch (segment) {
    case 'almostUno':
      if (hand.length > 2) return pickPhase('keep2');
      break;
    case 'discardNumber':
      if (hand.some(isNumberCard)) return pickPhase('number');
      break;
    case 'discardColor':
      if (hand.some((c) => !isWild(c))) return pickPhase('color');
      break;
    case 'drawRed':
    case 'drawBlue': {
      const want = segment === 'drawRed' ? 'red' : 'blue';
      drawUntil(s, spinner, (c) => c.color === want || isWild(c), 'wheel');
      break;
    }
    case 'tradeHands':
      passHands(s, 1);
      break;
    case 'showHand':
      emit(s, { type: 'showHand', player: spinner, cards: hand.map((c) => ({ ...c })) });
      break;
    case 'war': {
      const winner = resolveWar(s);
      finishWheel(s, winner ?? spinner);
      return;
    }
    case 'unoSpin':
      s.phase = 'unoSpinRace';
      return;
  }
  finishWheel(s, spinner);
}

/** War: everyone shows their highest number card; ties face off with their next highest. */
function resolveWar(s: GameState): number | null {
  const contenders = activeSeats(s)
    .filter((i) => i !== s.pendingWin)
    .map((i) => ({
      i,
      nums: s.players[i].hand.filter(isNumberCard).sort((a, b) => Number(b.value) - Number(a.value)),
    }))
    .filter((x) => x.nums.length > 0);
  const plays = new Map<number, Card[]>();
  let winner: number | null = null;
  let tied = contenders;
  for (let depth = 0; tied.length > 0; depth++) {
    const live = tied.filter((x) => x.nums[depth]);
    if (!live.length) break;
    for (const x of live) plays.set(x.i, [...(plays.get(x.i) ?? []), x.nums[depth]]);
    const best = Math.max(...live.map((x) => Number(x.nums[depth].value)));
    tied = live.filter((x) => Number(x.nums[depth].value) === best);
    if (tied.length === 1) {
      winner = tied[0].i;
      break;
    }
  }
  emit(s, {
    type: 'war',
    plays: [...plays].map(([player, cards]) => ({ player, cards: cards.map((c) => ({ ...c })) })),
    winner,
  });
  if (winner !== null) {
    const cards = plays.get(winner)!;
    const ids = new Set(cards.map((c) => c.id));
    s.players[winner].hand = s.players[winner].hand.filter((c) => !ids.has(c.id));
    // The winning card ends up on top.
    s.discard.push(...cards);
    s.currentColor = cards[cards.length - 1].color as Color;
    afterHandsChanged(s, [winner]);
  }
  return winner;
}

/** The wheel action is done: play continues after `from` (or the round ends). */
function finishWheel(s: GameState, from: number) {
  s.wheel = null;
  s.pick = null;
  if (isOver(s)) return;
  if (s.pendingWin !== null) {
    endRound(s, s.pendingWin);
    return;
  }
  const emptied = activeSeats(s).find((i) => s.players[i].hand.length === 0);
  if (emptied !== undefined) {
    endRound(s, emptied);
    return;
  }
  s.current = nextIndex(s, from, 1);
  s.phase = 'play';
}

// ── reducer ────────────────────────────────────────────────
export function reduce(prev: GameState, action: Action): GameState {
  const s = clone(prev);
  const ok = apply(s, action);
  return ok ? s : prev;
}

function apply(s: GameState, a: Action): boolean {
  const n = s.players.length;
  if (a.player < 0 || a.player >= n) return false;
  const p = s.players[a.player];
  const active = !isOver(s);
  if (p.out && a.type !== 'nextRound') return false;

  switch (a.type) {
    case 'play': {
      if (a.player !== s.current) return false;
      if (s.phase !== 'play' && s.phase !== 'drawn') return false;
      if (s.phase === 'drawn' && a.cardId !== s.drawnCardId) return false;
      const card = p.hand.find((c) => c.id === a.cardId);
      if (!card) return false;
      if (!canPlay(s, a.player, card)) return false;
      if (needsColor(s.mode, card) && (!a.color || !palette(s.side).includes(a.color))) return false;
      const target = a.target;
      if (needsTarget(s.mode, card.value) && p.hand.length > 1) {
        if (target === undefined || target === a.player || !s.players[target] || s.players[target].out) return false;
      }
      closeUnoWindow(s, a.player);
      playCard(s, a.player, card, a.color, !!a.uno, needsTarget(s.mode, card.value) ? target : undefined);
      return true;
    }
    case 'draw': {
      if (s.phase === 'launch') {
        const L = s.launch!;
        const head = L.queue[0];
        if (!head || a.player !== head.player) return false;
        closeUnoWindow(s, a.player);
        const got = pressLauncher(s, head.player);
        const empty = got === 0 && s.deck.length === 0 && s.discard.length <= 1;
        if (head.untilFire) {
          if (got > 0 || empty) L.queue.shift();
        } else if (--head.presses <= 0) {
          L.queue.shift();
        }
        if (!isOver(s) && L.queue.length === 0) finishLaunch(s);
        return true;
      }
      if (a.player !== s.current || s.phase !== 'play') return false;
      closeUnoWindow(s, a.player);

      // No Mercy: can't (or won't) stack — take the whole penalty and lose the turn.
      if (s.mode === 'nomercy' && s.stack) {
        const total = s.stack.total;
        s.stack = null;
        drawCards(s, a.player, total, 'stack');
        if (isOver(s)) return true;
        if (!p.out) emit(s, { type: 'skip', player: a.player });
        s.current = nextIndex(s, a.player, 1);
        return true;
      }
      // Attack: no drawing — press the launcher once and your turn is over.
      if (s.mode === 'attack') {
        pressLauncher(s, a.player);
        emit(s, { type: 'pass', player: a.player });
        s.current = nextIndex(s, a.player, 1);
        return true;
      }
      // No Mercy: draw until you get a card you can play, then you must play it.
      if (s.mode === 'nomercy') {
        let found: Card | null = null;
        let count = 0;
        for (;;) {
          const c = drawOne(s);
          if (!c) break;
          p.hand.push(c);
          count++;
          if (mercyHit(s, a.player)) break;
          if (canPlay(s, a.player, c)) {
            found = c;
            break;
          }
        }
        afterDraw(s, a.player, count, 'turn');
        if (isOver(s) || p.out) return true;
        if (found) {
          s.phase = 'drawn';
          s.drawnCardId = found.id;
          s.drawnMustPlay = true;
        } else {
          emit(s, { type: 'pass', player: a.player });
          s.current = nextIndex(s, a.player, 1);
        }
        return true;
      }
      const [card] = drawCards(s, a.player, 1, 'turn');
      if (card && canPlay(s, a.player, card)) {
        s.phase = 'drawn';
        s.drawnCardId = card.id;
      } else {
        emit(s, { type: 'pass', player: a.player });
        s.current = nextIndex(s, a.player, 1);
      }
      return true;
    }
    case 'pass': {
      if (a.player !== s.current || s.phase !== 'drawn' || s.drawnMustPlay) return false;
      s.phase = 'play';
      s.drawnCardId = null;
      emit(s, { type: 'pass', player: a.player });
      s.current = nextIndex(s, a.player, 1);
      return true;
    }
    case 'chooseColor': {
      if (!palette(s.side).includes(a.color)) return false;
      // No Mercy roulette: the victim names a colour and flips cards until it shows up.
      if (s.phase === 'roulette') {
        if (a.player !== s.roulette?.victim) return false;
        const victim = a.player;
        closeUnoWindow(s, victim);
        s.roulette = null;
        s.currentColor = a.color;
        emit(s, { type: 'roulette', player: victim, color: a.color });
        drawUntil(s, victim, (c) => c.color === a.color, 'roulette');
        if (isOver(s)) return true;
        s.phase = 'play';
        s.current = nextIndex(s, victim, 1);
        return true;
      }
      if (s.phase !== 'chooseColor') return false;
      if (a.player !== (s.chooser ?? s.current)) return false;
      s.currentColor = a.color;
      s.chooser = null;
      s.phase = s.launch ? 'launch' : 'play';
      emit(s, { type: 'colorChange', player: a.player, color: a.color });
      return true;
    }
    case 'challenge': {
      const ch = s.challenge;
      if (s.phase !== 'challenge' || !ch || a.player !== ch.target) return false;
      closeUnoWindow(s, a.player);
      s.challenge = null;
      s.phase = 'play';
      if (!a.challenge) {
        emit(s, { type: 'accept4', player: a.player });
        challengePenalty(s, ch.kind, a.player, 0, ch.kind === 'wild4' ? 'wild4' : 'card');
        emit(s, { type: 'skip', player: a.player });
        s.current = nextIndex(s, a.player, 1);
        return true;
      }
      const offender = s.players[ch.offender];
      const guilty = s.wild4Bluff;
      s.wild4Bluff = false;
      emit(s, {
        type: 'challenge',
        challenger: a.player,
        offender: ch.offender,
        guilty,
        revealedHand: offender.hand.map((c) => ({ ...c })),
      });
      if (guilty) {
        // The bluffer takes the penalty instead; the challenger plays normally.
        challengePenalty(s, ch.kind, ch.offender, 0, 'challenge');
        s.current = a.player;
      } else {
        challengePenalty(s, ch.kind, a.player, 2, 'challenge');
        emit(s, { type: 'skip', player: a.player });
        s.current = nextIndex(s, a.player, 1);
      }
      return true;
    }
    case 'uno': {
      if (!active) return false;
      const myTurnWithTwo = p.hand.length === 2 && s.current === a.player && (s.phase === 'play' || s.phase === 'drawn');
      const lateCall = s.unoVulnerable === a.player && p.hand.length === 1;
      if (p.saidUno) return false;
      if (!myTurnWithTwo && !lateCall) return false;
      p.saidUno = true;
      if (lateCall) s.unoVulnerable = null;
      emit(s, { type: 'uno', player: a.player });
      return true;
    }
    case 'catch': {
      if (!active) return false;
      const t = a.target;
      if (t === a.player || s.unoVulnerable !== t) return false;
      if (s.players[t].hand.length !== 1) return false;
      s.unoVulnerable = null;
      emit(s, { type: 'caught', player: t, by: a.player });
      if (s.mode === 'attack') {
        // Attack: hit the launcher twice instead of drawing 2.
        const step = { player: t, presses: 2, untilFire: false };
        if (s.launch) s.launch.queue.push(step);
        else if (s.phase === 'play') {
          s.launch = { queue: [step], resume: s.current };
          s.phase = 'launch';
        } else drawCards(s, t, 2, 'penalty');
      } else {
        drawCards(s, t, 2, 'penalty');
      }
      return true;
    }
    case 'spin': {
      if (s.phase !== 'spin' || !s.wheel || s.wheel.segment !== null || a.player !== s.wheel.spinner) return false;
      closeUnoWindow(s, a.player);
      const segment = WHEEL[Math.floor(rng() * WHEEL.length)];
      s.wheel.segment = segment;
      emit(s, { type: 'spin', player: a.player, segment });
      resolveWheel(s, a.player, segment);
      return true;
    }
    case 'unoSpin': {
      if (s.phase !== 'unoSpinRace' || a.player === s.pendingWin || p.hand.length === 0) return false;
      emit(s, { type: 'unoSpinCall', player: a.player });
      s.pick = { player: a.player, kind: 'one' };
      s.phase = 'unoSpinPick';
      return true;
    }
    case 'pickCards':
      return applyPick(s, a);
    case 'nextRound': {
      if (s.phase !== 'roundOver') return false;
      s.dealer = (s.dealer + 1) % n;
      startRound(s);
      return true;
    }
  }
  return false;
}

/** Spin: discarding cards chosen by the spinner (or the UNO Spin race winner). */
function applyPick(s: GameState, a: Extract<Action, { type: 'pickCards' }>): boolean {
  if ((s.phase !== 'wheelPick' && s.phase !== 'unoSpinPick') || !s.pick || s.pick.player !== a.player) return false;
  const p = s.players[a.player];
  const ids = new Set(a.cardIds);
  if (ids.size !== a.cardIds.length) return false;
  const chosen = p.hand.filter((c) => ids.has(c.id));
  if (chosen.length !== ids.size) return false;

  let discard: Card[];
  switch (s.pick.kind) {
    case 'keep2':
      if (chosen.length !== 2) return false;
      discard = p.hand.filter((c) => !ids.has(c.id));
      break;
    case 'number':
      if (!chosen.every((c) => isNumberCard(c) && c.value === chosen[0].value)) return false;
      discard = chosen;
      break;
    case 'color':
      if (!chosen.every((c) => !isWild(c) && c.color === chosen[0].color)) return false;
      discard = chosen;
      break;
    case 'one':
      if (chosen.length !== 1) return false;
      discard = chosen;
      break;
    default:
      return false;
  }

  if (discard.length) {
    const topCard = discard.find((c) => c.id === a.topId) ?? discard[discard.length - 1];
    if (isWild(topCard) && (!a.color || !palette(s.side).includes(a.color))) return false;
    const gone = new Set(discard.map((c) => c.id));
    p.hand = p.hand.filter((c) => !gone.has(c.id));
    s.discard.push(...discard.filter((c) => c !== topCard), topCard);
    s.currentColor = isWild(topCard) ? a.color! : (topCard.color as Color);
    emit(s, { type: 'wheelDiscard', player: a.player, count: discard.length });
    if (isWild(topCard)) emit(s, { type: 'colorChange', player: a.player, color: a.color! });
    if (p.hand.length === 1 && !p.saidUno && s.unoVulnerable === null) s.unoVulnerable = a.player;
    if (p.hand.length > 1) p.saidUno = false;
  }
  const from = s.phase === 'unoSpinPick' ? a.player : (s.wheel?.spinner ?? a.player);
  finishWheel(s, from);
  return true;
}

/** Marks a seat as replaced (e.g. disconnected human → bot). */
export function changeSeatKind(prev: GameState, seat: number, kind: Player['kind'], note: string): GameState {
  const s = clone(prev);
  s.players[seat].kind = kind;
  s.players[seat].connected = kind !== 'remote' || s.players[seat].connected;
  emit(s, { type: 'seatChange', player: seat, kind, note });
  return s;
}

// ── queries ────────────────────────────────────────────────
export function playableCards(s: GameState, hand: Card[], topCard: Card): Card[] {
  if (s.phase === 'drawn') return hand.filter((c) => c.id === s.drawnCardId && canPlayCard(s, topCard, hand, c));
  if (s.phase !== 'play') return [];
  return hand.filter((c) => canPlayCard(s, topCard, hand, c));
}

/** True if playing a challengeable wild would be a bluff (player holds a card of the current colour). */
export function isBluff(hand: Card[], currentColor: Color): boolean {
  return hand.some((c) => c.color === currentColor);
}

type ActorState = Pick<GameState, 'phase' | 'current' | 'challenge' | 'chooser' | 'roulette' | 'launch' | 'wheel' | 'pick'>;

/** Who needs to act right now (null if nobody, e.g. between rounds or during a race). */
export function actor(s: ActorState): number | null {
  switch (s.phase) {
    case 'challenge':
      return s.challenge?.target ?? null;
    case 'roundOver':
    case 'gameOver':
    case 'unoSpinRace':
      return null;
    case 'chooseColor':
      return s.chooser ?? s.current;
    case 'roulette':
      return s.roulette?.victim ?? null;
    case 'launch':
      return s.launch?.queue[0]?.player ?? null;
    case 'spin':
      return s.wheel?.spinner ?? null;
    case 'wheelPick':
    case 'unoSpinPick':
      return s.pick?.player ?? null;
    default:
      return s.current;
  }
}

function strip<T extends Card>(c: T): Card {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { alt: _alt, ...rest } = c;
  return rest;
}

export function toView(s: GameState, me: number): GameView {
  const revealed = isOver(s);
  const head = s.launch?.queue[0];
  return {
    mode: s.mode,
    side: s.side,
    me,
    myHand: (s.players[me]?.hand ?? []).map(strip),
    players: s.players.map((p, i) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      kind: p.kind,
      handCount: p.hand.length,
      cardIds: p.hand.map((c) => c.id),
      saidUno: p.saidUno,
      score: p.score,
      connected: p.connected,
      out: p.out,
      // UNO Flip: you hold your cards facing you, so everyone else sees the other side.
      altFaces: s.mode === 'flip' && i !== me ? p.hand.map((c) => c.alt!) : undefined,
    })),
    deckCount: s.deck.length,
    deckTopIds: s.deck.slice(-4).map((c) => c.id),
    deckTopAlt: s.mode === 'flip' && s.deck.length ? (s.deck[s.deck.length - 1].alt ?? null) : null,
    discardTop: s.discard.slice(-6).map(strip),
    currentColor: s.currentColor,
    current: s.current,
    actor: actor(s),
    direction: s.direction,
    dealer: s.dealer,
    phase: s.phase,
    drawnCardId: s.current === me ? s.drawnCardId : null,
    drawnMustPlay: s.drawnMustPlay,
    challenge: s.challenge,
    chooser: s.chooser,
    stack: s.stack,
    roulette: s.roulette,
    launch: head ? { ...head } : null,
    wheel: s.wheel,
    pick: s.pick,
    unoVulnerable: s.unoVulnerable,
    round: s.round,
    targetScore: s.targetScore,
    roundWinner: s.roundWinner,
    roundPoints: s.roundPoints,
    winner: s.winner,
    events: s.events.map((e) => {
      if (e.type === 'challenge') {
        return { ...e, revealedHand: e.challenger === me ? e.revealedHand?.map(strip) : undefined };
      }
      if (e.type === 'play' || e.type === 'firstCard') return { ...e, card: strip(e.card) };
      if (e.type === 'showHand') return { ...e, cards: e.cards.map(strip) };
      if (e.type === 'war') return { ...e, plays: e.plays.map((pl) => ({ ...pl, cards: pl.cards.map(strip) })) };
      return e;
    }),
    revealedHands: revealed ? s.players.map((p) => p.hand.map(strip)) : null,
  };
}
