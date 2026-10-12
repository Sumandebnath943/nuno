// ─────────────────────────────────────────────────────────────
//  NUNO bots — they play by exactly the same rules as you.
//  Difficulty only changes how *smart* (and how forgetful) they are.
// ─────────────────────────────────────────────────────────────
import { isNumberCard, isWild } from './cards';
import { canPlayCard, isBluff, nextIndex, top } from './engine';
import { drawValue, modePoints, needsColor, needsTarget, palette } from './modes';
import type { Action, Card, Color, Difficulty, GameState } from './types';

export interface BotPersona {
  name: string;
  avatar: string;
}

export const BOT_PERSONAS: BotPersona[] = [
  { name: 'Captain Shuffle', avatar: '🦜' },
  { name: 'Wild Wanda', avatar: '🦄' },
  { name: 'Sir Skips-a-Lot', avatar: '🐸' },
  { name: 'Reverse Rex', avatar: '🦖' },
  { name: 'Plus-Four Paula', avatar: '🐙' },
  { name: 'DJ Draw Two', avatar: '🐼' },
  { name: 'Granny Bluff', avatar: '👵' },
  { name: 'Robo Ricky', avatar: '🤖' },
  { name: 'Ninja Nia', avatar: '🥷' },
  { name: 'Cosmo Cat', avatar: '🐱' },
  { name: 'Taco Tom', avatar: '🌮' },
  { name: 'Ghosty', avatar: '👻' },
  { name: 'Duchess Duck', avatar: '🦆' },
  { name: 'Alien Al', avatar: '👽' },
];

export function pickPersonas(count: number, exclude: string[] = []): BotPersona[] {
  const pool = BOT_PERSONAS.filter((p) => !exclude.includes(p.avatar));
  const out: BotPersona[] = [];
  const copy = pool.slice();
  while (out.length < count && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  while (out.length < count) out.push({ name: `Bot ${out.length + 1}`, avatar: '🎲' });
  return out;
}

interface Tuning {
  sayUnoChance: number; // remembers to say UNO when playing the second-to-last card
  lateUnoChance: number; // remembers a moment later
  catchChance: number; // notices someone who forgot UNO
  catchDelay: [number, number];
  bluffChance: number; // plays an illegal W+4 hoping nobody challenges
  thinkMs: [number, number];
  stackChance: number; // No Mercy: stacks a draw card instead of taking the penalty
  raceDelay: [number, number]; // Spin: how fast it yells "UNO Spin"
}

export const TUNING: Record<Difficulty, Tuning> = {
  chill: {
    sayUnoChance: 0.75,
    lateUnoChance: 0.4,
    catchChance: 0.35,
    catchDelay: [1800, 3200],
    bluffChance: 0,
    thinkMs: [900, 1600],
    stackChance: 0.6,
    raceDelay: [1400, 3200],
  },
  normal: {
    sayUnoChance: 0.88,
    lateUnoChance: 0.5,
    catchChance: 0.6,
    catchDelay: [1300, 2600],
    bluffChance: 0.06,
    thinkMs: [750, 1350],
    stackChance: 0.85,
    raceDelay: [1000, 2400],
  },
  savage: {
    sayUnoChance: 0.97,
    lateUnoChance: 0.7,
    catchChance: 0.9,
    catchDelay: [900, 2000],
    bluffChance: 0.15,
    thinkMs: [600, 1100],
    stackChance: 1,
    raceDelay: [700, 1700],
  },
};

export const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** The colour this hand holds most of (on the side in play). */
function bestColor(s: GameState, hand: Card[]): Color {
  const colors = palette(s.side);
  const counts = new Map<Color, number>(colors.map((c) => [c, 0]));
  for (const c of hand) {
    const k = c.color as Color;
    if (counts.has(k)) counts.set(k, counts.get(k)! + 1);
  }
  const max = Math.max(...counts.values());
  const best = colors.filter((c) => counts.get(c) === max);
  return best[Math.floor(Math.random() * best.length)];
}

/** How much a card hurts the next player. */
function attackValue(card: Card): number {
  const d = drawValue(card.value);
  if (d) return d;
  switch (card.value) {
    case 'skip':
    case 'skipAll':
    case 'wildSkip':
    case 'wildSkip2':
    case 'hit2':
    case 'wildAllHit':
      return 2;
    case 'wildDrawColor':
    case 'wildRoulette':
    case 'wildHitFire':
      return 4;
    case 'reverse':
    case 'wildReverse':
      return 1;
    default:
      return 0;
  }
}

/** The opponent with the fewest cards (best target for swaps and targeted draws). */
function leader(s: GameState, me: number): number {
  let best = -1;
  s.players.forEach((p, i) => {
    if (i === me || p.out) return;
    if (best < 0 || p.hand.length < s.players[best].hand.length) best = i;
  });
  return best;
}

function scoreCard(s: GameState, me: number, card: Card, hand: Card[], difficulty: Difficulty): number {
  if (difficulty === 'chill') return Math.random();
  const nextCount = s.players[nextIndex(s, me, 1)].hand.length;
  const myCount = hand.length;
  const sameColor = hand.filter((c) => c.color === card.color && !isWild(c)).length;
  const realWild = isWild(card) && s.mode !== 'allwild';
  let score = realWild ? 6 : 20 + sameColor * 2;

  // Dump high-point cards first.
  score += modePoints(card, s.mode) * 0.15;

  // Hit the next player hard when they are close to winning.
  score += attackValue(card) * (nextCount <= 2 ? 10 : 2);

  // Keep wilds for emergencies unless we're nearly out.
  if (realWild && myCount <= 3) score += 25;

  // Swaps are great when someone has fewer cards than us.
  if (needsTarget(s.mode, card.value)) {
    const t = leader(s, me);
    if (t >= 0) {
      const theirs = s.players[t].hand.length;
      score += card.value === 'wildTargetDraw2' ? (theirs <= 2 ? 30 : 8) : (myCount - 1 - theirs) * 6;
    }
  }
  // Discard All empties a whole colour.
  if (card.value === 'discardAll') score += sameColor * 8;
  // Flipping to the Dark Side when the next player is close is mean.
  if (card.value === 'flip' && s.side === 'light' && nextCount <= 3) score += 12;

  if (difficulty === 'savage') {
    if (!isWild(card) && card.color !== s.currentColor && nextCount <= 3) score += 6;
    if (s.players.filter((p) => !p.out).length === 2 && attackValue(card) > 0) score += 12;
  }
  return score + Math.random() * 3;
}

/** The main decision. Returns an Action for the given seat. */
export function decideBot(s: GameState, me: number, difficulty: Difficulty): Action | null {
  const t = TUNING[difficulty];
  const hand = s.players[me].hand;

  switch (s.phase) {
    case 'chooseColor':
      return (s.chooser ?? s.current) === me ? { type: 'chooseColor', player: me, color: bestColor(s, hand) } : null;
    case 'roulette':
      return s.roulette?.victim === me ? { type: 'chooseColor', player: me, color: bestColor(s, hand) } : null;
    case 'launch':
      return s.launch?.queue[0]?.player === me ? { type: 'draw', player: me } : null;
    case 'spin':
      return s.wheel?.spinner === me ? { type: 'spin', player: me } : null;
    case 'unoSpinRace':
      return hand.length ? { type: 'unoSpin', player: me } : null;
    case 'wheelPick':
    case 'unoSpinPick':
      return s.pick?.player === me ? pickCards(s, me) : null;
    case 'challenge': {
      if (s.challenge?.target !== me) return null;
      const offenderCards = s.players[s.challenge.offender].hand.length;
      let chance = difficulty === 'chill' ? 0.12 : difficulty === 'normal' ? 0.22 : 0.18;
      if (difficulty === 'savage' && offenderCards >= 5) chance = 0.42;
      if (difficulty === 'savage' && offenderCards <= 1) chance = 0.05;
      return { type: 'challenge', player: me, challenge: Math.random() < chance };
    }
    default:
      break;
  }

  if (s.current !== me) return null;
  const topCard = top(s);

  if (s.phase === 'drawn') {
    const card = hand.find((c) => c.id === s.drawnCardId);
    if (card && canPlayCard(s, topCard, hand, card)) {
      // Chill bots sometimes hold a drawn wild.
      const canKeep = !s.drawnMustPlay && s.mode !== 'allwild';
      if (canKeep && difficulty !== 'savage' && isWild(card) && hand.length > 4 && Math.random() < 0.3) {
        return { type: 'pass', player: me };
      }
      return play(s, me, card, t);
    }
    return s.drawnMustPlay ? null : { type: 'pass', player: me };
  }

  if (s.phase !== 'play') return null;

  let playable = hand.filter((c) => canPlayCard(s, topCard, hand, c));

  // No Mercy: under a stack, sometimes take the hit instead of passing it on.
  if (s.mode === 'nomercy' && s.stack && Math.random() >= t.stackChance) playable = [];

  // Honest bots only play challengeable wilds legally; some will bluff.
  if (s.mode === 'classic' || s.mode === 'flip') {
    if (isBluff(hand, s.currentColor) && Math.random() >= t.bluffChance) {
      playable = playable.filter((c) => c.value !== 'wild4' && c.value !== 'wildDraw2' && c.value !== 'wildDrawColor');
    }
  }
  // All Wild: when the next player is about to win and we have nothing nasty, gamble on a draw.
  if (s.mode === 'allwild') {
    const next = s.players[nextIndex(s, me, 1)];
    const nasty = playable.some((c) => attackValue(c) > 0 || needsTarget(s.mode, c.value));
    if (next.hand.length === 1 && !nasty && Math.random() < 0.5) return { type: 'draw', player: me };
  }
  if (playable.length === 0) return { type: 'draw', player: me };

  const best = playable.map((c) => ({ c, score: scoreCard(s, me, c, hand, difficulty) })).sort((a, b) => b.score - a.score)[0].c;
  return play(s, me, best, t);
}

function play(s: GameState, me: number, card: Card, t: Tuning): Action {
  const hand = s.players[me].hand;
  const remaining = hand.filter((c) => c.id !== card.id);
  const sweep = card.value === 'discardAll' ? remaining.filter((c) => c.color === card.color).length : 0;
  const target = needsTarget(s.mode, card.value) && remaining.length > 0 ? leader(s, me) : undefined;
  return {
    type: 'play',
    player: me,
    cardId: card.id,
    color: needsColor(s.mode, card) ? bestColor(s, remaining) : undefined,
    uno: remaining.length - sweep === 1 ? Math.random() < t.sayUnoChance : undefined,
    target,
  };
}

/** Spin wheel discards: get rid of as much as possible. */
function pickCards(s: GameState, me: number): Action {
  const hand = s.players[me].hand;
  const kind = s.pick!.kind;
  const byPoints = (a: Card, b: Card) => modePoints(b, s.mode) - modePoints(a, s.mode);
  let pool: Card[];
  let ids: string[];
  if (kind === 'keep2') {
    // Keep wilds first, then the most valuable cards.
    const keep = [...hand].sort((a, b) => Number(isWild(b)) - Number(isWild(a)) || byPoints(a, b)).slice(0, 2);
    ids = keep.map((c) => c.id);
    pool = hand.filter((c) => !ids.includes(c.id));
  } else if (kind === 'one') {
    // UNO Spin: ditch the most expensive card.
    pool = [[...hand].sort(byPoints)[0]];
    ids = [pool[0].id];
  } else {
    const groups = new Map<string, Card[]>();
    const candidates = kind === 'number' ? hand.filter(isNumberCard) : hand.filter((c) => !isWild(c));
    for (const c of candidates) {
      const key = kind === 'number' ? c.value : c.color;
      groups.set(key, [...(groups.get(key) ?? []), c]);
    }
    pool = [...groups.values()].sort((a, b) => b.length - a.length)[0] ?? [];
    ids = pool.map((c) => c.id);
  }
  const topCard = pool[Math.floor(Math.random() * pool.length)];
  const keepers = hand.filter((c) => !pool.includes(c));
  return {
    type: 'pickCards',
    player: me,
    cardIds: ids,
    topId: topCard?.id,
    color: topCard && isWild(topCard) ? bestColor(s, keepers) : undefined,
  };
}
