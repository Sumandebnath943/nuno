// Animation timings shared by the table UI and the host. The host uses the
// same numbers to hold the bots until the table has finished showing the last
// move, so nobody plays while cards are still in the air.
import type { GameEventBody } from './types';

let scale = 1;

/** Game pace: 1 is normal, bigger is slower. */
export function setPaceScale(s: number) {
  scale = s;
}
export function paceScale(): number {
  return scale;
}

const BASE_FLIGHT = 580;

/** How long a single card takes to fly across the table. */
export function flightMs(): number {
  return Math.round(BASE_FLIGHT * scale);
}

/** Gap between consecutive cards while dealing. */
export function dealStagger(players: number): number {
  return Math.max(30, Math.min(95, 2100 / (7 * players))) * scale;
}

/** The dealer riffles the deck before the cards go out. */
export const RIFFLE_MS = 640;

/** How long the shuffle before a deal takes at the current pace. */
export function riffleMs(): number {
  return RIFFLE_MS * scale;
}

/** How long the Spin wheel takes to stop. */
export const WHEEL_SPIN_MS = 2600;

/** Gap between cards when several are drawn at once. */
export function drawGap(count: number): number {
  return (count > 8 ? 85 : 165) * scale;
}

/** How long a splash (SKIP!, +4…) stays on screen. */
export function splashMs(): number {
  return 1700 * scale;
}

const isNumber = (v: string) => /^\d$/.test(v);

/**
 * How long the table spends showing one event before the next one starts.
 * `fast` is the catch-up speed used when the table has fallen far behind.
 */
export function eventBeat(e: GameEventBody, players: number, fast = false): number {
  const f = fast ? 0.3 : 1;
  // Unscaled here: the pace is applied once, at the end.
  const flight = BASE_FLIGHT;
  let ms: number;
  switch (e.type) {
    case 'deal':
      return (fast ? 7 * players * 10 : riffleMs() + 7 * players * dealStagger(players)) + flightMs() * 0.6 * f;
    case 'firstCard':
      ms = flight + 350;
      break;
    case 'play':
      ms = flight + (isNumber(e.card.value) && !e.card.spin ? 420 : 680);
      break;
    case 'draw':
      if (e.count <= 0) return 0;
      ms = (e.count - 1) * (drawGap(e.count) / scale) + flight * 0.75 + 260;
      break;
    case 'skip':
      ms = 520;
      break;
    case 'skipAll':
      ms = 900;
      break;
    case 'reverse':
      ms = 760;
      break;
    case 'colorChange':
      ms = 480;
      break;
    case 'uno':
      ms = 380;
      break;
    case 'caught':
      ms = 1150;
      break;
    case 'challenge':
      ms = 1400;
      break;
    case 'accept4':
    case 'pass':
      ms = 320;
      break;
    case 'reshuffle':
      ms = 950;
      break;
    case 'stack':
      ms = 950;
      break;
    case 'eliminated':
      ms = 1600;
      break;
    case 'swap':
      ms = 1050;
      break;
    case 'passHands':
      ms = 1200;
      break;
    case 'discardAll':
    case 'wheelDiscard':
      ms = Math.min(e.count, 6) * 110 + flight * 0.6 + 260;
      break;
    case 'roulette':
      ms = 1050;
      break;
    case 'flip':
      ms = 1400;
      break;
    case 'launch':
      ms = e.count === 0 ? 760 : 380;
      break;
    case 'spin':
      ms = WHEEL_SPIN_MS + 900;
      break;
    case 'showHand':
      ms = 2600;
      break;
    case 'war':
      ms = e.winner !== null ? 3000 : 1600;
      break;
    case 'unoSpinCall':
      ms = 760;
      break;
    default:
      return 0;
  }
  return ms * f * (e.type === 'spin' ? 1 : scale);
}

/** Total time the table needs to show a batch of events. */
export function eventsDuration(events: GameEventBody[], players: number): number {
  return events.reduce((sum, e) => sum + eventBeat(e, players), 0);
}
