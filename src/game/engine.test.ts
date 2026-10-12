import { describe, expect, it } from 'vitest';
import { decideBot } from './bot';
import { buildDeckFaces, cardPoints } from './cards';
import { actor, createGame, reduce, toView } from './engine';
import type { Card, GameState, SeatConfig } from './types';

const seats = (n: number): SeatConfig[] =>
  Array.from({ length: n }, (_, i) => ({ name: `P${i}`, avatar: '🙂', kind: 'bot' as const }));

const totalCards = (s: GameState) =>
  s.deck.length + s.discard.length + s.players.reduce((a, p) => a + p.hand.length, 0);

let uid = 0;
const card = (color: Card['color'], value: Card['value']): Card => ({ id: `t${uid++}`, color, value });

/** Build a controlled mid-game position. */
function position(hands: Card[][], topCard: Card, opts: Partial<GameState> = {}): GameState {
  const s = createGame(seats(hands.length), 500);
  s.players.forEach((p, i) => (p.hand = hands[i]));
  s.discard = [topCard];
  s.deck = Array.from({ length: 30 }, () => card('red', '5'));
  s.currentColor = topCard.color === 'wild' ? 'red' : (topCard.color as GameState['currentColor']);
  s.current = 0;
  s.direction = 1;
  s.phase = 'play';
  s.unoVulnerable = null;
  s.challenge = null;
  Object.assign(s, opts);
  return s;
}

describe('deck', () => {
  it('has the official 108 cards', () => {
    const d = buildDeckFaces();
    expect(d.length).toBe(108);
    expect(d.filter((c) => c.value === 'wild').length).toBe(4);
    expect(d.filter((c) => c.value === 'wild4').length).toBe(4);
    expect(d.filter((c) => c.value === '0').length).toBe(4);
    expect(d.filter((c) => c.value === '7').length).toBe(8);
    expect(d.filter((c) => c.value === 'skip').length).toBe(8);
    expect(d.filter((c) => c.value === 'reverse').length).toBe(8);
    expect(d.filter((c) => c.value === 'draw2').length).toBe(8);
  });
  it('scores cards officially', () => {
    expect(cardPoints(card('red', '7'))).toBe(7);
    expect(cardPoints(card('red', 'skip'))).toBe(20);
    expect(cardPoints(card('wild', 'wild4'))).toBe(50);
  });
});

describe('setup', () => {
  it('deals 7 cards to each player and flips a non-W+4 card', () => {
    for (let i = 0; i < 200; i++) {
      const s = createGame(seats(4), 500);
      expect(totalCards(s)).toBe(108);
      expect(s.discard[0].value).not.toBe('wild4');
      const handSizes = s.players.map((p) => p.hand.length).sort();
      if (s.discard[0].value === 'draw2') expect(handSizes).toEqual([7, 7, 7, 9]);
      else expect(handSizes).toEqual([7, 7, 7, 7]);
      if (s.discard[0].value === 'wild') expect(s.phase).toBe('chooseColor');
    }
  });
});

describe('turn rules', () => {
  it('rejects unplayable cards and out-of-turn plays', () => {
    const blue3 = card('blue', '3');
    const s = position([[blue3, card('green', '1')], [card('red', '1')]], card('red', '7'));
    expect(reduce(s, { type: 'play', player: 0, cardId: blue3.id })).toBe(s);
    expect(reduce(s, { type: 'play', player: 1, cardId: s.players[1].hand[0].id })).toBe(s);
  });

  it('matches by number across colours', () => {
    const blue7 = card('blue', '7');
    const s = position([[blue7, card('green', '1'), card('green', '2')], [card('red', '1')], [card('red', '2')]], card('red', '7'));
    const n = reduce(s, { type: 'play', player: 0, cardId: blue7.id });
    expect(n.currentColor).toBe('blue');
    expect(n.current).toBe(1);
  });

  it('reverse acts like skip with 2 players', () => {
    const rev = card('red', 'reverse');
    const s = position([[rev, card('green', '1'), card('green', '2')], [card('blue', '1')]], card('red', '7'));
    const n = reduce(s, { type: 'play', player: 0, cardId: rev.id });
    expect(n.current).toBe(0);
  });

  it('reverse flips direction with 3+ players', () => {
    const rev = card('red', 'reverse');
    const s = position([[rev, card('green', '1'), card('green', '2')], [card('blue', '1')], [card('blue', '2')]], card('red', '7'));
    const n = reduce(s, { type: 'play', player: 0, cardId: rev.id });
    expect(n.direction).toBe(-1);
    expect(n.current).toBe(2);
  });

  it('draw two makes next player draw 2 and lose their turn', () => {
    const d2 = card('red', 'draw2');
    const s = position([[d2, card('green', '1'), card('green', '2')], [card('blue', '1')], [card('blue', '2')]], card('red', '7'));
    const n = reduce(s, { type: 'play', player: 0, cardId: d2.id });
    expect(n.players[1].hand.length).toBe(3);
    expect(n.current).toBe(2);
  });

  it('drawing an unplayable card passes the turn; a playable one may be played', () => {
    const s = position([[card('blue', '1')], [card('blue', '2')]], card('red', '7'));
    s.deck = [card('green', '3')];
    const n = reduce(s, { type: 'draw', player: 0 });
    expect(n.current).toBe(1);

    const s2 = position([[card('blue', '1')], [card('blue', '2')]], card('red', '7'));
    const red2 = card('red', '2');
    s2.deck = [red2];
    const n2 = reduce(s2, { type: 'draw', player: 0 });
    expect(n2.phase).toBe('drawn');
    expect(n2.drawnCardId).toBe(red2.id);
    // Can't play a different card than the one drawn.
    expect(reduce(n2, { type: 'play', player: 0, cardId: s2.players[0].hand[0].id })).toBe(n2);
    const n3 = reduce(n2, { type: 'play', player: 0, cardId: red2.id });
    expect(n3.discard.at(-1)!.id).toBe(red2.id);
  });

  it('wilds require a colour', () => {
    const w = card('wild', 'wild');
    const s = position([[w, card('blue', '1'), card('blue', '2')], [card('blue', '2')]], card('red', '7'));
    expect(reduce(s, { type: 'play', player: 0, cardId: w.id })).toBe(s);
    const n = reduce(s, { type: 'play', player: 0, cardId: w.id, color: 'green' });
    expect(n.currentColor).toBe('green');
  });
});

describe('wild draw four + challenge', () => {
  it('innocent: challenger draws 6 and is skipped', () => {
    const w4 = card('wild', 'wild4');
    const s = position([[w4, card('blue', '1'), card('blue', '2')], [card('blue', '3')], [card('blue', '4')]], card('red', '7'));
    const n = reduce(s, { type: 'play', player: 0, cardId: w4.id, color: 'blue' });
    expect(n.phase).toBe('challenge');
    const c = reduce(n, { type: 'challenge', player: 1, challenge: true });
    expect(c.players[1].hand.length).toBe(7);
    expect(c.current).toBe(2);
  });

  it('guilty: the bluffer draws 4 and the challenger plays', () => {
    const w4 = card('wild', 'wild4');
    const s = position([[w4, card('red', '1'), card('blue', '2')], [card('blue', '3')], [card('blue', '4')]], card('red', '7'));
    const n = reduce(s, { type: 'play', player: 0, cardId: w4.id, color: 'blue' });
    const c = reduce(n, { type: 'challenge', player: 1, challenge: true });
    expect(c.players[0].hand.length).toBe(6);
    expect(c.players[1].hand.length).toBe(1);
    expect(c.current).toBe(1);
    expect(c.currentColor).toBe('blue');
  });

  it('accept: draw 4 and lose turn', () => {
    const w4 = card('wild', 'wild4');
    const s = position([[w4, card('blue', '1'), card('blue', '2')], [card('blue', '3')], [card('blue', '4')]], card('red', '7'));
    const n = reduce(s, { type: 'play', player: 0, cardId: w4.id, color: 'blue' });
    const c = reduce(n, { type: 'challenge', player: 1, challenge: false });
    expect(c.players[1].hand.length).toBe(5);
    expect(c.current).toBe(2);
  });

  it('hides the bluff flag and other hands from views', () => {
    const w4 = card('wild', 'wild4');
    const s = position([[w4, card('red', '1'), card('blue', '2')], [card('blue', '3')]], card('red', '7'));
    const n = reduce(s, { type: 'play', player: 0, cardId: w4.id, color: 'blue' });
    const v = toView(n, 1) as unknown as Record<string, unknown>;
    expect(v.wild4Bluff).toBeUndefined();
    expect(JSON.stringify(v)).not.toContain('"deck"');
    expect((v.myHand as Card[]).length).toBe(1);
  });
});

describe('UNO calls', () => {
  it('forgetting UNO lets others catch you for 2 cards', () => {
    const r1 = card('red', '1');
    const s = position([[r1, card('blue', '9')], [card('green', '3')], [card('green', '4')]], card('red', '7'));
    const n = reduce(s, { type: 'play', player: 0, cardId: r1.id });
    expect(n.unoVulnerable).toBe(0);
    const c = reduce(n, { type: 'catch', player: 2, target: 0 });
    expect(c.players[0].hand.length).toBe(3);
    expect(c.unoVulnerable).toBeNull();
  });

  it('saying UNO protects you', () => {
    const r1 = card('red', '1');
    const s = position([[r1, card('blue', '9')], [card('green', '3')]], card('red', '7'));
    const n = reduce(s, { type: 'play', player: 0, cardId: r1.id, uno: true });
    expect(n.unoVulnerable).toBeNull();
    expect(reduce(n, { type: 'catch', player: 1, target: 0 })).toBe(n);
  });

  it('the window closes once the next player acts', () => {
    const r1 = card('red', '1');
    const s = position([[r1, card('blue', '9')], [card('red', '3'), card('red', '4'), card('red', '5')], [card('green', '4')]], card('red', '7'));
    const n = reduce(s, { type: 'play', player: 0, cardId: r1.id });
    const m = reduce(n, { type: 'play', player: 1, cardId: n.players[1].hand[0].id });
    expect(m.unoVulnerable).toBeNull();
    expect(reduce(m, { type: 'catch', player: 2, target: 0 })).toBe(m);
  });
});

describe('scoring', () => {
  it('winner scores the cards left in opponents hands', () => {
    const r1 = card('red', '1');
    const s = position([[r1], [card('green', '3'), card('wild', 'wild')], [card('blue', 'skip')]], card('red', '7'));
    const n = reduce(s, { type: 'play', player: 0, cardId: r1.id });
    expect(n.roundWinner).toBe(0);
    expect(n.roundPoints).toBe(3 + 50 + 20);
    expect(n.phase).toBe('roundOver');
  });

  it('a final draw two still counts for points', () => {
    const d2 = card('red', 'draw2');
    const s = position([[d2], [card('green', '3')]], card('red', '7'));
    s.deck = [card('blue', '9'), card('blue', '8')];
    const n = reduce(s, { type: 'play', player: 0, cardId: d2.id });
    expect(n.roundPoints).toBe(3 + 9 + 8);
  });
});

describe('simulation', () => {
  it('plays thousands of random bot games without breaking card conservation', () => {
    for (let g = 0; g < 300; g++) {
      const n = 2 + (g % 9);
      let s = createGame(seats(n), 0);
      let steps = 0;
      while (s.phase !== 'gameOver' && steps < 5000) {
        const who = actor(s)!;
        // Random UNO catches to exercise that path.
        if (s.unoVulnerable !== null && Math.random() < 0.3) {
          const catcher = (s.unoVulnerable + 1) % n;
          s = reduce(s, { type: 'catch', player: catcher, target: s.unoVulnerable });
        }
        const a = decideBot(s, who, (['chill', 'normal', 'savage'] as const)[g % 3]);
        expect(a).not.toBeNull();
        const next = reduce(s, a!);
        expect(next).not.toBe(s);
        s = next;
        expect(totalCards(s)).toBe(108);
        steps++;
      }
      expect(s.phase).toBe('gameOver');
      expect(s.players[s.winner!].hand.length).toBe(0);
    }
  });
});
