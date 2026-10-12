// ─────────────────────────────────────────────────────────────
//  NUNO bots — they play by exactly the same rules as you.
//  Difficulty only changes how *smart* (and how forgetful) they are.
// ─────────────────────────────────────────────────────────────
import { isPlayable, isWild } from './cards';
import { isBluff, nextIndex, top } from './engine';
import type { Action, Card, Color, Difficulty, GameState } from './types';
import { COLORS } from './types';

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
}

export const TUNING: Record<Difficulty, Tuning> = {
  chill: {
    sayUnoChance: 0.75,
    lateUnoChance: 0.4,
    catchChance: 0.35,
    catchDelay: [1800, 3200],
    bluffChance: 0,
    thinkMs: [900, 1600],
  },
  normal: {
    sayUnoChance: 0.88,
    lateUnoChance: 0.5,
    catchChance: 0.6,
    catchDelay: [1300, 2600],
    bluffChance: 0.06,
    thinkMs: [750, 1350],
  },
  savage: {
    sayUnoChance: 0.97,
    lateUnoChance: 0.7,
    catchChance: 0.9,
    catchDelay: [900, 2000],
    bluffChance: 0.15,
    thinkMs: [600, 1100],
  },
};

export const rand = (min: number, max: number) => min + Math.random() * (max - min);

function bestColor(hand: Card[], exclude?: Card): Color {
  const counts: Record<Color, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
  for (const c of hand) {
    if (c === exclude || isWild(c)) continue;
    counts[c.color as Color] += 1;
  }
  const max = Math.max(...Object.values(counts));
  if (max === 0) return COLORS[Math.floor(Math.random() * 4)];
  const best = COLORS.filter((c) => counts[c] === max);
  return best[Math.floor(Math.random() * best.length)];
}

function scoreCard(s: GameState, me: number, card: Card, hand: Card[], difficulty: Difficulty): number {
  const next = nextIndex(s, me, 1);
  const nextCount = s.players[next].hand.length;
  const myCount = hand.length;
  let score = 0;

  if (difficulty === 'chill') return Math.random();

  const sameColorCount = hand.filter((c) => c.color === card.color).length;

  if (card.value === 'wild4') score = 5;
  else if (card.value === 'wild') score = 8;
  else {
    score = 20 + sameColorCount * 2;
    // Dump high-point cards first.
    if (card.value === 'skip' || card.value === 'reverse' || card.value === 'draw2') score += 6;
    else score += Number(card.value) * 0.5;
  }

  // Attack the next player when they are close to winning.
  if (nextCount <= 2) {
    if (card.value === 'draw2') score += 40;
    if (card.value === 'skip') score += 30;
    if (card.value === 'reverse' && s.players.length > 2) score += 20;
    if (card.value === 'reverse' && s.players.length === 2) score += 30;
    if (card.value === 'wild4') score += 45;
  }

  // Keep wilds for emergencies unless we're nearly out.
  if (isWild(card) && myCount <= 3) score += 25;

  if (difficulty === 'savage') {
    // Changing colour away from the one the next player seems to need.
    if (!isWild(card) && card.color !== s.currentColor && nextCount <= 3) score += 6;
    // Chain actions: playing a skip in a 2-player game gives you another turn.
    if (s.players.length === 2 && (card.value === 'skip' || card.value === 'reverse' || card.value === 'draw2')) score += 12;
  }

  return score + Math.random() * 3;
}

/** The main turn decision. Returns an Action for the given seat. */
export function decideBot(s: GameState, me: number, difficulty: Difficulty): Action | null {
  const t = TUNING[difficulty];
  const p = s.players[me];
  const hand = p.hand;

  if (s.phase === 'chooseColor' && s.current === me) {
    return { type: 'chooseColor', player: me, color: bestColor(hand) };
  }

  if (s.phase === 'challenge' && s.challenge?.target === me) {
    const offenderCards = s.players[s.challenge.offender].hand.length;
    let chance = difficulty === 'chill' ? 0.12 : difficulty === 'normal' ? 0.22 : 0.18;
    if (difficulty === 'savage' && offenderCards >= 5) chance = 0.42;
    if (difficulty === 'savage' && offenderCards <= 1) chance = 0.05;
    return { type: 'challenge', player: me, challenge: Math.random() < chance };
  }

  if (s.current !== me) return null;
  const topCard = top(s);

  if (s.phase === 'drawn') {
    const card = hand.find((c) => c.id === s.drawnCardId);
    if (card && isPlayable(card, topCard, s.currentColor)) {
      // Chill bots sometimes hold a drawn wild.
      if (difficulty !== 'savage' && isWild(card) && hand.length > 4 && Math.random() < 0.3) {
        return { type: 'pass', player: me };
      }
      return play(me, card, hand, t);
    }
    return { type: 'pass', player: me };
  }

  if (s.phase !== 'play') return null;

  let playable = hand.filter((c) => isPlayable(c, topCard, s.currentColor));
  // Honest bots only play W+4 legally; some will bluff.
  const bluffing = isBluff(hand, s.currentColor);
  if (bluffing && Math.random() >= t.bluffChance) {
    playable = playable.filter((c) => c.value !== 'wild4');
  }
  if (playable.length === 0) return { type: 'draw', player: me };

  const best = playable
    .map((c) => ({ c, score: scoreCard(s, me, c, hand, difficulty) }))
    .sort((a, b) => b.score - a.score)[0].c;
  return play(me, best, hand, t);
}

function play(me: number, card: Card, hand: Card[], t: Tuning): Action {
  const remaining = hand.filter((c) => c.id !== card.id);
  return {
    type: 'play',
    player: me,
    cardId: card.id,
    color: isWild(card) ? bestColor(remaining) : undefined,
    uno: hand.length === 2 ? Math.random() < t.sayUnoChance : undefined,
  };
}
