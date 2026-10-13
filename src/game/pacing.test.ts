import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGame } from './engine';
import { GameHost } from './host';
import { eventBeat, eventsDuration, setPaceScale } from './timing';
import type { GameEvent, SeatConfig } from './types';

const bots = (n: number): SeatConfig[] => Array.from({ length: n }, (_, i) => ({ name: `Bot ${i}`, avatar: '🤖', kind: 'bot' }));

afterEach(() => {
  vi.useRealTimers();
  setPaceScale(1);
});

describe('timing', () => {
  it('every visible event takes some time, and action cards take longer than numbers', () => {
    const number = eventBeat({ type: 'play', player: 0, card: { id: 'a', color: 'red', value: '5' } }, 4);
    const action = eventBeat({ type: 'play', player: 0, card: { id: 'b', color: 'red', value: 'skip' } }, 4);
    expect(number).toBeGreaterThan(500);
    expect(action).toBeGreaterThan(number);
    expect(eventBeat({ type: 'draw', player: 1, count: 4, reason: 'draw2' }, 4)).toBeGreaterThan(
      eventBeat({ type: 'draw', player: 1, count: 1, reason: 'turn' }, 4),
    );
  });

  it('the pace setting scales everything', () => {
    const e = { type: 'play', player: 0, card: { id: 'a', color: 'red', value: 'skip' } } as const;
    const normal = eventBeat(e, 4);
    setPaceScale(1.4);
    expect(eventBeat(e, 4)).toBeCloseTo(normal * 1.4, 0);
    setPaceScale(0.7);
    expect(eventBeat(e, 4)).toBeLessThan(normal);
  });

  it('catching up runs much faster', () => {
    const e = { type: 'reverse', direction: -1 } as const;
    expect(eventBeat(e, 4, true)).toBeLessThan(eventBeat(e, 4) / 2);
  });
});

describe('bot pacing', () => {
  it('a bot never moves before the table has finished showing the previous move', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const host = new GameHost(createGame(bots(4), 0, 'classic'), 'normal');
    // When each batch of events arrived, and when the table would be done showing it.
    let busyUntil = 0;
    let seen = 0;
    const violations: string[] = [];
    let plays = 0;
    host.subscribe((s) => {
      const fresh = s.events.filter((e) => e.seq > seen) as GameEvent[];
      if (!fresh.length) return;
      seen = s.events[s.events.length - 1].seq;
      const now = Date.now();
      // A bot's own move must come after the previous batch was shown.
      const firstPlay = fresh.find((e) => e.type === 'play' || (e.type === 'draw' && e.reason === 'turn'));
      if (firstPlay && now < busyUntil - 1) violations.push(`${firstPlay.type} at ${now} < ${busyUntil}`);
      if (fresh.some((e) => e.type === 'play')) plays++;
      busyUntil = Math.max(now, busyUntil) + eventsDuration(fresh, 4);
    });
    vi.advanceTimersByTime(120_000);
    host.destroy();
    expect(plays).toBeGreaterThan(10);
    expect(violations).toEqual([]);
  });
});
