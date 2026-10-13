import { describe, expect, it } from 'vitest';
import { mixSeats } from './seating';

/** Longest run of humans sitting side by side around the (round) table. */
function longestRun(seated: boolean[]): number {
  const n = seated.length;
  let best = 0;
  for (let start = 0; start < n; start++) {
    let run = 0;
    while (run < n && seated[(start + run) % n]) run++;
    best = Math.max(best, run);
  }
  return best;
}

describe('mixed seating', () => {
  it('keeps everyone, exactly once', () => {
    for (let n = 2; n <= 10; n++) {
      for (let h = 0; h <= n; h++) {
        const isHuman = Array.from({ length: n }, (_, i) => i < h);
        const order = mixSeats(isHuman);
        expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i));
      }
    }
  });

  it('never seats two humans together while there are enough bots', () => {
    for (let n = 2; n <= 10; n++) {
      for (let h = 2; h <= Math.floor(n / 2); h++) {
        for (let trial = 0; trial < 200; trial++) {
          const isHuman = Array.from({ length: n }, (_, i) => i < h);
          const seated = mixSeats(isHuman).map((old) => isHuman[old]);
          expect(longestRun(seated), `${h} humans at ${n}`).toBe(1);
        }
      }
    }
  });

  it('keeps human runs as short as possible when humans outnumber bots', () => {
    for (let n = 3; n <= 10; n++) {
      for (let h = Math.floor(n / 2) + 1; h < n; h++) {
        const bots = n - h;
        const shortest = Math.ceil(h / bots);
        for (let trial = 0; trial < 100; trial++) {
          const isHuman = Array.from({ length: n }, (_, i) => i < h);
          const seated = mixSeats(isHuman).map((old) => isHuman[old]);
          expect(longestRun(seated), `${h} humans at ${n}`).toBeLessThanOrEqual(shortest);
        }
      }
    }
  });

  it('is random: the same table comes out in different orders', () => {
    const isHuman = [true, true, false, false, false, false];
    const seen = new Set(Array.from({ length: 50 }, () => mixSeats(isHuman).join(',')));
    expect(seen.size).toBeGreaterThan(10);
  });
});
