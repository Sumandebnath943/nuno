// ─────────────────────────────────────────────────────────────
//  NUNO rules engine — a pure reducer: (state, action) => state
//  Implements the official UNO rules:
//   • 108 card deck, 7 cards each, first to empty their hand wins the round
//   • match by colour, number or symbol; Wilds can always be played
//   • Wild Draw Four is legal only with no card matching the current colour —
//     bluffing is allowed, and the next player may challenge it
//   • if you can't (or don't want to) play, draw 1; if playable you may play it
//   • Reverse acts like Skip with 2 players
//   • say UNO when down to one card or draw 2 if caught before the next player starts
//   • first-card rules (W+4 reshuffled, Wild → first player picks colour, etc.)
//   • scoring: numbers face value, actions 20, wilds 50; first to the target wins
// ─────────────────────────────────────────────────────────────
import { buildDeckFaces, cardPoints, isPlayable, isWild, shuffle, type Rng } from './cards';
import type {
  Action,
  Card,
  Color,
  DrawReason,
  GameEventBody,
  GameState,
  GameView,
  Player,
  SeatConfig,
} from './types';
import { COLORS } from './types';

export const HAND_SIZE = 7;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
const MAX_EVENTS = 60;

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

export function top(s: GameState): Card {
  return s.discard[s.discard.length - 1];
}

export function nextIndex(s: GameState, from: number, steps = 1): number {
  const n = s.players.length;
  return (((from + s.direction * steps) % n) + n) % n;
}

/** Reshuffles the discard pile (minus the top card) into a fresh draw pile. */
function reshuffle(s: GameState) {
  if (s.discard.length <= 1) return;
  const keep = s.discard.pop()!;
  const faces = shuffle(
    s.discard.map(({ color, value }) => ({ color, value })),
    rng,
  );
  // Fresh ids so nobody can track which card is which.
  s.deck = withIds(s, faces);
  s.discard = [keep];
  emit(s, { type: 'reshuffle' });
}

function drawCards(s: GameState, player: number, count: number, reason: DrawReason): Card[] {
  const drawn: Card[] = [];
  for (let i = 0; i < count; i++) {
    if (s.deck.length === 0) reshuffle(s);
    const c = s.deck.pop();
    if (!c) break;
    drawn.push(c);
  }
  const p = s.players[player];
  p.hand.push(...drawn);
  if (p.hand.length > 1) p.saidUno = false;
  if (s.unoVulnerable === player && p.hand.length !== 1) s.unoVulnerable = null;
  emit(s, { type: 'draw', player, count: drawn.length, reason });
  return drawn;
}

/** A turn action by someone other than the vulnerable player closes the UNO catch window. */
function closeUnoWindow(s: GameState, actor: number) {
  if (s.unoVulnerable !== null && s.unoVulnerable !== actor) s.unoVulnerable = null;
}

function clone(s: GameState): GameState {
  return structuredClone(s);
}

// ── setup ──────────────────────────────────────────────────
export function createGame(seats: SeatConfig[], targetScore: number): GameState {
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
  }));
  const s: GameState = {
    players,
    deck: [],
    discard: [],
    currentColor: 'red',
    current: 0,
    direction: 1,
    dealer: Math.floor(rng() * players.length),
    phase: 'play',
    drawnCardId: null,
    challenge: null,
    wild4Bluff: false,
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
  s.drawnCardId = null;
  s.challenge = null;
  s.unoVulnerable = null;
  s.roundWinner = null;
  s.roundPoints = 0;
  s.discard = [];
  s.deck = withIds(s, shuffle(buildDeckFaces(), rng));
  for (const p of s.players) {
    p.hand = [];
    p.saidUno = false;
  }
  emit(s, { type: 'deal', round: s.round, dealer: s.dealer });
  // Deal one card at a time, starting left of the dealer.
  for (let r = 0; r < HAND_SIZE; r++) {
    for (let k = 1; k <= s.players.length; k++) {
      const idx = (s.dealer + k) % s.players.length;
      s.players[idx].hand.push(s.deck.pop()!);
    }
  }

  // Flip the first card. A Wild Draw Four goes back into the deck.
  let first = s.deck.pop()!;
  while (first.value === 'wild4') {
    const pos = Math.floor(rng() * (s.deck.length + 1));
    s.deck.splice(pos, 0, first);
    first = s.deck.pop()!;
  }
  s.discard.push(first);
  emit(s, { type: 'firstCard', card: first });

  const left = nextIndex(s, s.dealer, 1);
  s.phase = 'play';
  s.currentColor = isWild(first) ? COLORS[Math.floor(rng() * 4)] : (first.color as Color);

  switch (first.value) {
    case 'wild':
      s.current = left;
      s.phase = 'chooseColor';
      break;
    case 'draw2':
      drawCards(s, left, 2, 'start');
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
    default:
      s.current = left;
  }
}

// ── turn mechanics ─────────────────────────────────────────
function endRound(s: GameState, winner: number) {
  let points = 0;
  s.players.forEach((p, i) => {
    if (i !== winner) points += p.hand.reduce((sum, c) => sum + cardPoints(c), 0);
  });
  s.players[winner].score += points;
  s.roundWinner = winner;
  s.roundPoints = points;
  s.unoVulnerable = null;
  s.drawnCardId = null;
  s.challenge = null;
  emit(s, { type: 'roundOver', winner, points });
  if (s.targetScore <= 0 || s.players[winner].score >= s.targetScore) {
    s.phase = 'gameOver';
    s.winner = winner;
    emit(s, { type: 'gameOver', winner });
  } else {
    s.phase = 'roundOver';
  }
}

function playCard(s: GameState, player: number, card: Card, color: Color | undefined, uno: boolean) {
  const p = s.players[player];
  const prevColor = s.currentColor;
  const handBefore = p.hand.length;
  p.hand = p.hand.filter((c) => c.id !== card.id);
  s.discard.push(card);
  s.drawnCardId = null;

  if (uno && handBefore === 2) {
    p.saidUno = true;
    emit(s, { type: 'uno', player });
  }

  if (isWild(card)) {
    s.currentColor = color!;
    emit(s, { type: 'play', player, card, chosenColor: color });
    emit(s, { type: 'colorChange', player, color: color! });
  } else {
    s.currentColor = card.color as Color;
    emit(s, { type: 'play', player, card });
  }

  // Did they just win the round?
  if (p.hand.length === 0) {
    const next = nextIndex(s, player, 1);
    // A final Draw Two / Wild Draw Four still makes the next player draw (counts for points).
    if (card.value === 'draw2') drawCards(s, next, 2, 'draw2');
    if (card.value === 'wild4') drawCards(s, next, 4, 'wild4');
    endRound(s, player);
    return;
  }

  if (p.hand.length === 1) {
    if (!p.saidUno) s.unoVulnerable = player;
  } else {
    p.saidUno = false;
  }

  const n = s.players.length;
  s.phase = 'play';
  switch (card.value) {
    case 'skip': {
      const victim = nextIndex(s, player, 1);
      emit(s, { type: 'skip', player: victim });
      s.current = nextIndex(s, player, 2);
      break;
    }
    case 'reverse': {
      if (n === 2) {
        const victim = nextIndex(s, player, 1);
        emit(s, { type: 'reverse', direction: s.direction });
        emit(s, { type: 'skip', player: victim });
        s.current = player;
      } else {
        s.direction = s.direction === 1 ? -1 : 1;
        emit(s, { type: 'reverse', direction: s.direction });
        s.current = nextIndex(s, player, 1);
      }
      break;
    }
    case 'draw2': {
      const victim = nextIndex(s, player, 1);
      drawCards(s, victim, 2, 'draw2');
      emit(s, { type: 'skip', player: victim });
      s.current = nextIndex(s, player, 2);
      break;
    }
    case 'wild4': {
      const target = nextIndex(s, player, 1);
      s.challenge = { offender: player, target, prevColor };
      // Judged on the hand at the moment it was played (hidden from views).
      s.wild4Bluff = p.hand.some((c) => c.color === prevColor);
      s.phase = 'challenge';
      s.current = target;
      break;
    }
    default:
      s.current = nextIndex(s, player, 1);
  }
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
  const active = s.phase !== 'roundOver' && s.phase !== 'gameOver';

  switch (a.type) {
    case 'play': {
      if (a.player !== s.current) return false;
      if (s.phase !== 'play' && s.phase !== 'drawn') return false;
      if (s.phase === 'drawn' && a.cardId !== s.drawnCardId) return false;
      const card = p.hand.find((c) => c.id === a.cardId);
      if (!card) return false;
      if (!isPlayable(card, top(s), s.currentColor)) return false;
      if (isWild(card) && (!a.color || !COLORS.includes(a.color))) return false;
      closeUnoWindow(s, a.player);
      playCard(s, a.player, card, a.color, !!a.uno);
      return true;
    }
    case 'draw': {
      if (a.player !== s.current || s.phase !== 'play') return false;
      closeUnoWindow(s, a.player);
      const [card] = drawCards(s, a.player, 1, 'turn');
      if (card && isPlayable(card, top(s), s.currentColor)) {
        s.phase = 'drawn';
        s.drawnCardId = card.id;
      } else {
        emit(s, { type: 'pass', player: a.player });
        s.current = nextIndex(s, a.player, 1);
      }
      return true;
    }
    case 'pass': {
      if (a.player !== s.current || s.phase !== 'drawn') return false;
      s.phase = 'play';
      s.drawnCardId = null;
      emit(s, { type: 'pass', player: a.player });
      s.current = nextIndex(s, a.player, 1);
      return true;
    }
    case 'chooseColor': {
      if (a.player !== s.current || s.phase !== 'chooseColor') return false;
      if (!COLORS.includes(a.color)) return false;
      s.currentColor = a.color;
      s.phase = 'play';
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
        drawCards(s, a.player, 4, 'wild4');
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
        // The bluffer draws the four instead; the challenger plays normally.
        drawCards(s, ch.offender, 4, 'challenge');
        s.current = a.player;
      } else {
        drawCards(s, a.player, 6, 'challenge');
        emit(s, { type: 'skip', player: a.player });
        s.current = nextIndex(s, a.player, 1);
      }
      return true;
    }
    case 'uno': {
      if (!active) return false;
      const myTurnWithTwo =
        p.hand.length === 2 && s.current === a.player && (s.phase === 'play' || s.phase === 'drawn');
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
      drawCards(s, t, 2, 'penalty');
      return true;
    }
    case 'nextRound': {
      if (s.phase !== 'roundOver') return false;
      s.dealer = (s.dealer + 1) % n;
      startRound(s);
      return true;
    }
  }
  return false;
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
export function playableCards(s: Pick<GameState, 'phase' | 'drawnCardId' | 'currentColor'>, hand: Card[], topCard: Card): Card[] {
  if (s.phase === 'drawn') return hand.filter((c) => c.id === s.drawnCardId && isPlayable(c, topCard, s.currentColor));
  if (s.phase !== 'play') return [];
  return hand.filter((c) => isPlayable(c, topCard, s.currentColor));
}

/** True if playing this W+4 would be a bluff (player holds a card of the current colour). */
export function isBluff(hand: Card[], currentColor: Color): boolean {
  return hand.some((c) => c.color === currentColor);
}

/** Who needs to act right now (null if nobody, e.g. between rounds). */
export function actor(s: Pick<GameState, 'phase' | 'current' | 'challenge'>): number | null {
  if (s.phase === 'challenge') return s.challenge?.target ?? null;
  if (s.phase === 'roundOver' || s.phase === 'gameOver') return null;
  return s.current;
}

export function toView(s: GameState, me: number): GameView {
  const revealed = s.phase === 'roundOver' || s.phase === 'gameOver';
  return {
    me,
    myHand: s.players[me]?.hand ?? [],
    players: s.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      kind: p.kind,
      handCount: p.hand.length,
      cardIds: p.hand.map((c) => c.id),
      saidUno: p.saidUno,
      score: p.score,
      connected: p.connected,
    })),
    deckCount: s.deck.length,
    deckTopIds: s.deck.slice(-4).map((c) => c.id),
    discardTop: s.discard.slice(-6),
    currentColor: s.currentColor,
    current: s.current,
    direction: s.direction,
    dealer: s.dealer,
    phase: s.phase,
    drawnCardId: s.current === me ? s.drawnCardId : null,
    challenge: s.challenge,
    unoVulnerable: s.unoVulnerable,
    round: s.round,
    targetScore: s.targetScore,
    roundWinner: s.roundWinner,
    roundPoints: s.roundPoints,
    winner: s.winner,
    events: s.events.map((e) =>
      e.type === 'challenge' && e.challenger !== me ? { ...e, revealedHand: undefined } : e,
    ),
    revealedHands: revealed ? s.players.map((p) => p.hand) : null,
  };
}
