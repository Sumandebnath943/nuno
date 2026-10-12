// Animation timings shared by the table UI and the host, so bots don't
// start playing while the cards are still being dealt.

/** How long a single card takes to fly across the table. */
export const FLIGHT_MS = 430;

/** Gap between consecutive cards while dealing. */
export function dealStagger(players: number): number {
  return Math.max(26, Math.min(85, 1900 / (7 * players)));
}

/** Total time of the opening deal animation. */
export function dealDuration(players: number): number {
  return 7 * players * dealStagger(players) + FLIGHT_MS;
}

/** How long the Spin wheel takes to stop. */
export const WHEEL_SPIN_MS = 2300;

/** How long the host holds the first move of a round. */
export function dealPause(players: number): number {
  return dealDuration(players) + 900;
}
