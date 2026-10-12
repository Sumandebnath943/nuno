import { afterEach, describe, expect, it } from 'vitest';
import { decideBot } from './bot';
import { actor, createGame, reduce, setRng, toView } from './engine';
import { buildModeDeck, MODE_ORDER, MODES, modePoints } from './modes';
import type { Card, GameMode, GameState, SeatConfig, WheelSegment } from './types';
import { WHEEL } from './types';

const seats = (n: number): SeatConfig[] =>
  Array.from({ length: n }, (_, i) => ({ name: `P${i}`, avatar: '🙂', kind: 'bot' as const }));

const total = (s: GameState) => s.deck.length + s.discard.length + s.players.reduce((a, p) => a + p.hand.length, 0);

let uid = 0;
const card = (color: Card['color'], value: Card['value'], extra: Partial<Card> = {}): Card => ({
  id: `t${uid++}`,
  color,
  value,
  ...extra,
});

/** A controlled mid-game position for a mode. */
function position(mode: GameMode, hands: Card[][], topCard: Card, opts: Partial<GameState> = {}): GameState {
  const s = createGame(seats(hands.length), 500, mode);
  s.players.forEach((p, i) => (p.hand = hands[i]));
  s.discard = [topCard];
  s.deck = Array.from({ length: 60 }, () => card('red', '5'));
  s.currentColor = topCard.color === 'wild' ? 'red' : (topCard.color as GameState['currentColor']);
  s.current = 0;
  s.direction = 1;
  s.phase = 'play';
  s.unoVulnerable = null;
  s.challenge = null;
  s.launch = null;
  s.wheel = null;
  s.chooser = null;
  Object.assign(s, opts);
  return s;
}

const count = (deck: Array<{ value: string; color?: string }>, value: string) => deck.filter((c) => c.value === value).length;

afterEach(() => setRng(Math.random));

describe('decks match the official contents', () => {
  it('every mode has the right number of cards', () => {
    for (const mode of MODE_ORDER) expect(buildModeDeck(mode, Math.random).length).toBe(MODES[mode].deckSize);
  });

  it('No Mercy: 168 cards', () => {
    const d = buildModeDeck('nomercy', Math.random);
    expect(d.filter((c) => /^\d$/.test(c.value)).length).toBe(80);
    expect(count(d, 'skip')).toBe(12);
    expect(count(d, 'reverse')).toBe(12);
    expect(count(d, 'draw2')).toBe(12);
    expect(count(d, 'discardAll')).toBe(12);
    expect(count(d, 'draw4')).toBe(8);
    expect(count(d, 'skipAll')).toBe(8);
    expect(count(d, 'wildReverse4')).toBe(8);
    expect(count(d, 'wild6')).toBe(4);
    expect(count(d, 'wild10')).toBe(4);
    expect(count(d, 'wildRoulette')).toBe(8);
  });

  it('Flip: 112 two-sided cards', () => {
    const d = buildModeDeck('flip', Math.random);
    const dark = d.map((c) => c.alt!);
    expect(d.every((c) => c.alt)).toBe(true);
    expect(d.some((c) => c.value === '0')).toBe(false);
    expect(count(d, 'draw1')).toBe(8);
    expect(count(d, 'flip')).toBe(8);
    expect(count(d, 'wildDraw2')).toBe(4);
    expect(count(dark, 'draw5')).toBe(8);
    expect(count(dark, 'skipAll')).toBe(8);
    expect(count(dark, 'flip')).toBe(8);
    expect(count(dark, 'wildDrawColor')).toBe(4);
    expect(dark.filter((c) => c.color === 'teal').length).toBe(26);
  });

  it('Attack: 112 cards', () => {
    const d = buildModeDeck('attack', Math.random);
    expect(count(d, 'hit2')).toBe(8);
    expect(count(d, 'discardAll')).toBe(4);
    expect(count(d, 'tradeHands')).toBe(4);
    expect(count(d, 'wildAllHit')).toBe(2);
    expect(count(d, 'wildHitFire')).toBe(2);
    expect(count(d, 'wild')).toBe(4);
  });

  it('All Wild: 112 wild cards', () => {
    const d = buildModeDeck('allwild', Math.random);
    expect(d.every((c) => c.color === 'wild')).toBe(true);
    expect(count(d, 'wild')).toBe(54);
    expect(count(d, 'wildSkip2')).toBe(6);
    expect(count(d, 'wildTargetDraw2')).toBe(4);
    expect(count(d, 'wildSwap')).toBe(4);
  });

  it('Spin: 20 Spin cards numbered 1-5', () => {
    const d = buildModeDeck('spin', Math.random);
    const spins = d.filter((c) => c.spin);
    expect(spins.length).toBe(20);
    expect(spins.every((c) => Number(c.value) >= 1 && Number(c.value) <= 5)).toBe(true);
    expect(d.filter((c) => c.color === 'blue').length).toBe(25);
  });

  it('scores per mode', () => {
    expect(modePoints({ color: 'wild', value: 'wild' }, 'allwild')).toBe(20);
    expect(modePoints({ color: 'wild', value: 'wildSkip' }, 'allwild')).toBe(50);
    expect(modePoints({ color: 'teal', value: 'skipAll' }, 'flip')).toBe(30);
    expect(modePoints({ color: 'wild', value: 'wildDrawColor' }, 'flip')).toBe(60);
    expect(modePoints({ color: 'red', value: 'draw1' }, 'flip')).toBe(10);
    expect(modePoints({ color: 'red', value: 'tradeHands' }, 'attack')).toBe(30);
    expect(modePoints({ color: 'wild', value: 'wild10' }, 'nomercy')).toBe(50);
  });
});

describe('No Mercy', () => {
  it('starts on a number card', () => {
    for (let i = 0; i < 100; i++) {
      const s = createGame(seats(3), 0, 'nomercy');
      expect(s.discard.at(-1)!.value).toMatch(/^\d$/);
      expect(total(s)).toBe(168);
    }
  });

  it('stacks equal or higher draw cards and the last player takes it all', () => {
    const d2 = card('red', 'draw2');
    const d4 = card('blue', 'draw4');
    const small = card('green', 'draw2');
    const s = position(
      'nomercy',
      [
        [d2, card('red', '1'), card('red', '2')],
        [d4, small, card('blue', '1')],
        [card('yellow', '1'), card('yellow', '2')],
      ],
      card('red', '7'),
    );
    const a = reduce(s, { type: 'play', player: 0, cardId: d2.id });
    expect(a.stack).toEqual({ total: 2, last: 2 });
    expect(a.current).toBe(1);
    // Can't play a non-draw card under a stack; a +4 on a +2 is fine (colour doesn't matter).
    expect(reduce(a, { type: 'play', player: 1, cardId: a.players[1].hand[2].id })).toBe(a);
    const b = reduce(a, { type: 'play', player: 1, cardId: d4.id });
    expect(b.stack).toEqual({ total: 6, last: 4 });
    expect(b.current).toBe(2);
    // Player 2 can't stack: takes 6 and loses the turn.
    const c = reduce(b, { type: 'draw', player: 2 });
    expect(c.players[2].hand.length).toBe(8);
    expect(c.stack).toBeNull();
    expect(c.current).toBe(0);
  });

  it('a smaller draw card cannot be stacked on a bigger one', () => {
    const w6 = card('wild', 'wild6');
    const d4 = card('blue', 'draw4');
    const s = position(
      'nomercy',
      [
        [w6, card('red', '1'), card('red', '2')],
        [d4, card('blue', '1')],
      ],
      card('red', '7'),
    );
    const a = reduce(s, { type: 'play', player: 0, cardId: w6.id, color: 'blue' });
    expect(reduce(a, { type: 'play', player: 1, cardId: d4.id })).toBe(a);
  });

  it('Mercy Rule: 25 cards and you are out', () => {
    const w10 = card('wild', 'wild10');
    const many = Array.from({ length: 20 }, () => card('green', '3'));
    const s = position(
      'nomercy',
      [[w10, card('red', '1'), card('red', '2')], many, [card('yellow', '1'), card('yellow', '2')]],
      card('red', '7'),
    );
    const a = reduce(s, { type: 'play', player: 0, cardId: w10.id, color: 'blue' });
    const b = reduce(a, { type: 'draw', player: 1 });
    expect(b.players[1].out).toBe(true);
    expect(b.players[1].hand.length).toBe(0);
    expect(total(b)).toBe(total(s));
    expect(b.current).toBe(2);
  });

  it('knocking out the last opponent wins the round with 250 points each', () => {
    const w10 = card('wild', 'wild10');
    const many = Array.from({ length: 20 }, () => card('green', '3'));
    const s = position('nomercy', [[w10, card('red', '1')], many], card('red', '7'));
    const a = reduce(s, { type: 'play', player: 0, cardId: w10.id, color: 'blue', uno: true });
    const b = reduce(a, { type: 'draw', player: 1 });
    expect(b.roundWinner).toBe(0);
    // 250 for the knockout; the winner's own card doesn't score.
    expect(b.roundPoints).toBe(250);
  });

  it('7 swaps with a chosen player, 0 passes every hand along', () => {
    const seven = card('red', '7');
    const s = position(
      'nomercy',
      [[seven, card('red', '1')], [card('blue', '1'), card('blue', '2'), card('blue', '3')], [card('green', '1')]],
      card('red', '9'),
    );
    expect(reduce(s, { type: 'play', player: 0, cardId: seven.id })).toBe(s); // needs a target
    const a = reduce(s, { type: 'play', player: 0, cardId: seven.id, target: 1 });
    expect(a.players[0].hand.length).toBe(3);
    expect(a.players[1].hand.length).toBe(1);

    const zero = card('red', '0');
    const s2 = position(
      'nomercy',
      [
        [zero, card('red', '1'), card('red', '2')],
        [card('blue', '1')],
        [card('green', '1'), card('green', '2'), card('green', '3')],
      ],
      card('red', '9'),
    );
    const b = reduce(s2, { type: 'play', player: 0, cardId: zero.id });
    expect(b.players.map((p) => p.hand.length)).toEqual([3, 2, 1]);
  });

  it('draws until a playable card, which must then be played', () => {
    const s = position('nomercy', [[card('blue', '1'), card('blue', '2')], [card('green', '1')]], card('red', '7'));
    const playable = card('red', '3');
    s.deck = [playable, card('green', '8'), card('green', '9')];
    const a = reduce(s, { type: 'draw', player: 0 });
    expect(a.players[0].hand.length).toBe(5);
    expect(a.phase).toBe('drawn');
    expect(a.drawnMustPlay).toBe(true);
    expect(reduce(a, { type: 'pass', player: 0 })).toBe(a);
    expect(reduce(a, { type: 'play', player: 0, cardId: playable.id }).discard.at(-1)!.id).toBe(playable.id);
  });

  it('Wild Reverse Draw 4 with two players makes YOU face the +4', () => {
    const wr = card('wild', 'wildReverse4');
    const s = position('nomercy', [[wr, card('red', '1'), card('red', '2')], [card('blue', '1')]], card('red', '7'));
    const a = reduce(s, { type: 'play', player: 0, cardId: wr.id, color: 'green' });
    expect(a.current).toBe(0);
    expect(a.stack?.total).toBe(4);
  });

  it('Discard All discards every card of its colour; Skip Everyone plays again', () => {
    const da = card('red', 'discardAll');
    const s = position(
      'nomercy',
      [[da, card('red', '1'), card('red', '2'), card('blue', '4')], [card('blue', '1')], [card('blue', '2')]],
      card('red', '7'),
    );
    const a = reduce(s, { type: 'play', player: 0, cardId: da.id });
    expect(a.players[0].hand.map((c) => c.value)).toEqual(['4']);
    expect(a.discard.at(-1)!.id).toBe(da.id);

    const sa = card('red', 'skipAll');
    const s2 = position('nomercy', [[sa, card('red', '1')], [card('blue', '1')], [card('blue', '2')]], card('red', '7'));
    expect(reduce(s2, { type: 'play', player: 0, cardId: sa.id, uno: true }).current).toBe(0);
  });

  it('Color Roulette: the victim names a colour and flips until it shows up', () => {
    const r = card('wild', 'wildRoulette');
    const s = position(
      'nomercy',
      [[r, card('red', '1'), card('red', '2')], [card('blue', '1')], [card('green', '1')]],
      card('red', '7'),
    );
    s.deck = [card('green', '4'), card('wild', 'wild6'), card('red', '8'), card('yellow', '9')];
    const a = reduce(s, { type: 'play', player: 0, cardId: r.id });
    expect(a.phase).toBe('roulette');
    expect(actor(a)).toBe(1);
    const b = reduce(a, { type: 'chooseColor', player: 1, color: 'green' });
    expect(b.players[1].hand.length).toBe(1 + 4);
    expect(b.currentColor).toBe('green');
    expect(b.current).toBe(2);
  });
});

describe('Flip', () => {
  it('flips the whole game to the Dark Side', () => {
    const flip = card('red', 'flip', { alt: { color: 'pink', value: '5' } });
    const bottom = card('red', '1', { alt: { color: 'teal', value: '8' } });
    const mine = card('red', '3', { alt: { color: 'orange', value: 'draw5' } });
    const s = position(
      'flip',
      [
        [flip, mine, card('blue', '2', { alt: { color: 'pink', value: '1' } })],
        [card('green', '4', { alt: { color: 'purple', value: '2' } })],
      ],
      card('red', '7', { alt: { color: 'pink', value: '9' } }),
    );
    s.discard = [bottom, s.discard[0]];
    const a = reduce(s, { type: 'play', player: 0, cardId: flip.id });
    expect(a.side).toBe('dark');
    // The old bottom card is now on top, showing its dark side.
    expect(a.discard.at(-1)!.color).toBe('teal');
    expect(a.currentColor).toBe('teal');
    expect(a.players[0].hand.find((c) => c.id === mine.id)!.value).toBe('draw5');
    expect(a.current).toBe(1);
  });

  it('everyone else sees the other side of your cards', () => {
    const s = createGame(seats(3), 0, 'flip');
    const v = toView(s, 0);
    expect(v.myHand.every((c) => !c.alt)).toBe(true);
    expect(v.players[1].altFaces?.length).toBe(s.players[1].hand.length);
    expect(v.players[0].altFaces).toBeUndefined();
    expect(v.deckTopAlt).toEqual(s.deck.at(-1)!.alt);
  });

  it('Draw Five and Skip Everyone on the Dark Side', () => {
    const d5 = card('pink', 'draw5');
    const s = position(
      'flip',
      [[d5, card('pink', '1'), card('pink', '2')], [card('teal', '1')], [card('teal', '2')]],
      card('pink', '7'),
      { side: 'dark' },
    );
    const a = reduce(s, { type: 'play', player: 0, cardId: d5.id });
    expect(a.players[1].hand.length).toBe(6);
    expect(a.current).toBe(2);
    const se = card('pink', 'skipAll');
    const s2 = position('flip', [[se, card('pink', '1')], [card('teal', '1')], [card('teal', '2')]], card('pink', '7'), {
      side: 'dark',
    });
    expect(reduce(s2, { type: 'play', player: 0, cardId: se.id, uno: true }).current).toBe(0);
  });

  it('Wild Draw Color: innocent challenger draws until the colour plus 2', () => {
    const wdc = card('wild', 'wildDrawColor');
    const s = position(
      'flip',
      [[wdc, card('teal', '1'), card('teal', '2')], [card('purple', '1')], [card('purple', '2')]],
      card('pink', '7'),
      { side: 'dark', currentColor: 'pink' },
    );
    s.deck = [card('purple', '9'), card('purple', '8'), card('orange', '1'), card('purple', '3')];
    const a = reduce(s, { type: 'play', player: 0, cardId: wdc.id, color: 'orange' });
    expect(a.phase).toBe('challenge');
    const b = reduce(a, { type: 'challenge', player: 1, challenge: true });
    // purple 3, orange 1 (found) + 2 more.
    expect(b.players[1].hand.length).toBe(1 + 4);
    expect(b.current).toBe(2);
  });

  it('dark side wilds need a dark colour', () => {
    const w = card('wild', 'wild');
    const s = position('flip', [[w, card('pink', '1'), card('pink', '2')], [card('teal', '1')]], card('pink', '7'), {
      side: 'dark',
      currentColor: 'pink',
    });
    expect(reduce(s, { type: 'play', player: 0, cardId: w.id, color: 'red' })).toBe(s);
    expect(reduce(s, { type: 'play', player: 0, cardId: w.id, color: 'teal' }).currentColor).toBe('teal');
  });
});

describe('Attack', () => {
  it('pressing the launcher ends your turn', () => {
    setRng(() => 0.99); // the launcher fires
    const s = position('attack', [[card('blue', '1')], [card('green', '1')], [card('green', '2')]], card('red', '7'));
    const a = reduce(s, { type: 'draw', player: 0 });
    expect(a.players[0].hand.length).toBeGreaterThan(1);
    expect(a.current).toBe(1);
  });

  it('Hit 2 makes the next player press twice', () => {
    setRng(() => 0.1); // nothing comes out
    const h = card('red', 'hit2');
    const s = position(
      'attack',
      [[h, card('red', '1'), card('red', '2')], [card('green', '1')], [card('green', '2')]],
      card('red', '7'),
    );
    const a = reduce(s, { type: 'play', player: 0, cardId: h.id });
    expect(a.phase).toBe('launch');
    expect(actor(a)).toBe(1);
    const b = reduce(a, { type: 'draw', player: 1 });
    expect(actor(b)).toBe(1);
    const c = reduce(b, { type: 'draw', player: 1 });
    expect(c.phase).toBe('play');
    expect(c.current).toBe(2);
  });

  it('you cannot go out on Trade Hands', () => {
    const th = card('red', 'tradeHands');
    const s = position('attack', [[th], [card('green', '1')]], card('red', '7'));
    expect(reduce(s, { type: 'play', player: 0, cardId: th.id })).toBe(s);
  });

  it('Wild All Hit: everyone else presses once', () => {
    setRng(() => 0.1);
    const w = card('wild', 'wildAllHit');
    const s = position(
      'attack',
      [[w, card('red', '1'), card('red', '2')], [card('green', '1')], [card('green', '2')], [card('green', '3')]],
      card('red', '7'),
    );
    let a = reduce(s, { type: 'play', player: 0, cardId: w.id, color: 'blue' });
    expect(a.launch!.queue.map((q) => q.player)).toEqual([1, 2, 3]);
    for (const p of [1, 2, 3]) a = reduce(a, { type: 'draw', player: p });
    expect(a.phase).toBe('play');
    expect(a.current).toBe(1);
  });

  it('getting caught without UNO means two presses', () => {
    setRng(() => 0.1);
    const r1 = card('red', '1');
    const s = position('attack', [[r1, card('blue', '9')], [card('green', '3')], [card('green', '4')]], card('red', '7'));
    const a = reduce(s, { type: 'play', player: 0, cardId: r1.id });
    const b = reduce(a, { type: 'catch', player: 2, target: 0 });
    expect(b.phase).toBe('launch');
    expect(b.launch!.queue[0]).toEqual({ player: 0, presses: 2, untilFire: false });
  });
});

describe('All Wild', () => {
  it('any card can be played and no colour is named', () => {
    const w = card('wild', 'wildSkip');
    const s = position(
      'allwild',
      [[w, card('wild', 'wild'), card('wild', 'wild')], [card('wild', 'wild')], [card('wild', 'wild')]],
      card('wild', 'wildDraw4'),
    );
    const a = reduce(s, { type: 'play', player: 0, cardId: w.id });
    expect(a.current).toBe(2);
  });

  it('Skip Two skips the next two players', () => {
    const w = card('wild', 'wildSkip2');
    const s = position(
      'allwild',
      [[w, card('wild', 'wild'), card('wild', 'wild')], [card('wild', 'wild')], [card('wild', 'wild')], [card('wild', 'wild')]],
      card('wild', 'wild'),
    );
    expect(reduce(s, { type: 'play', player: 0, cardId: w.id }).current).toBe(3);
  });

  it('Targeted Draw Two does not skip the target', () => {
    const w = card('wild', 'wildTargetDraw2');
    const s = position(
      'allwild',
      [[w, card('wild', 'wild'), card('wild', 'wild')], [card('wild', 'wild')], [card('wild', 'wild')]],
      card('wild', 'wild'),
    );
    const a = reduce(s, { type: 'play', player: 0, cardId: w.id, target: 1 });
    expect(a.players[1].hand.length).toBe(3);
    expect(a.current).toBe(1);
  });

  it('Forced Swap swaps hands with the chosen player', () => {
    const w = card('wild', 'wildSwap');
    const s = position(
      'allwild',
      [[w, card('wild', 'wild'), card('wild', 'wild'), card('wild', 'wild')], [card('wild', 'wild')], [card('wild', 'wild')]],
      card('wild', 'wild'),
    );
    const a = reduce(s, { type: 'play', player: 0, cardId: w.id, target: 2 });
    expect(a.players[0].hand.length).toBe(1);
    expect(a.players[2].hand.length).toBe(3);
  });
});

describe('Spin', () => {
  const spinTo = (seg: WheelSegment) => setRng(() => (WHEEL.indexOf(seg) + 0.5) / WHEEL.length);

  it('a Spin card makes the next player spin instead of taking a turn', () => {
    const sp = card('red', '3', { spin: true });
    const s = position(
      'spin',
      [[sp, card('red', '1'), card('red', '2')], [card('blue', '1'), card('blue', '2'), card('blue', '3')], [card('green', '1')]],
      card('red', '7'),
    );
    const a = reduce(s, { type: 'play', player: 0, cardId: sp.id });
    expect(a.phase).toBe('spin');
    expect(actor(a)).toBe(1);
    spinTo('showHand');
    const b = reduce(a, { type: 'spin', player: 1 });
    expect(b.events.some((e) => e.type === 'showHand')).toBe(true);
    expect(b.current).toBe(2);
  });

  it('Wild Draw Four is only legal without the current colour', () => {
    const w4 = card('wild', 'wild4');
    const s = position('spin', [[w4, card('red', '1'), card('blue', '2')], [card('blue', '1')]], card('red', '7'));
    expect(reduce(s, { type: 'play', player: 0, cardId: w4.id, color: 'blue' })).toBe(s);
  });

  it('Almost UNO: keep two cards', () => {
    const sp = card('red', '2', { spin: true });
    const hand1 = [card('blue', '1'), card('blue', '5'), card('green', '9'), card('wild', 'wild')];
    const s = position('spin', [[sp, card('red', '1'), card('red', '2')], hand1, [card('green', '1')]], card('red', '7'));
    spinTo('almostUno');
    const a = reduce(reduce(s, { type: 'play', player: 0, cardId: sp.id }), { type: 'spin', player: 1 });
    expect(a.phase).toBe('wheelPick');
    const b = reduce(a, { type: 'pickCards', player: 1, cardIds: [hand1[0].id, hand1[3].id], topId: hand1[2].id });
    expect(b.players[1].hand.length).toBe(2);
    expect(b.discard.at(-1)!.id).toBe(hand1[2].id);
    expect(b.currentColor).toBe('green');
    expect(b.current).toBe(2);
  });

  it('War: highest number card is discarded; play continues after the winner', () => {
    const sp = card('red', '4', { spin: true });
    const s = position(
      'spin',
      [
        [sp, card('red', '1'), card('red', '9')],
        [card('blue', '7'), card('blue', '2')],
        [card('green', '8'), card('green', '1')],
      ],
      card('red', '7'),
    );
    spinTo('war');
    const a = reduce(reduce(s, { type: 'play', player: 0, cardId: sp.id }), { type: 'spin', player: 1 });
    expect(a.players[0].hand.length).toBe(1);
    expect(a.discard.at(-1)!.value).toBe('9');
    expect(a.current).toBe(1);
  });

  it('UNO Spin race: first caller discards any card', () => {
    const sp = card('red', '5', { spin: true });
    const big = card('wild', 'wild4');
    const s = position(
      'spin',
      [
        [sp, card('red', '1'), card('red', '2')],
        [card('blue', '1'), card('blue', '2')],
        [big, card('green', '1')],
      ],
      card('red', '7'),
    );
    spinTo('unoSpin');
    const a = reduce(reduce(s, { type: 'play', player: 0, cardId: sp.id }), { type: 'spin', player: 1 });
    expect(a.phase).toBe('unoSpinRace');
    expect(actor(a)).toBeNull();
    const b = reduce(a, { type: 'unoSpin', player: 2 });
    expect(reduce(b, { type: 'unoSpin', player: 1 })).toBe(b);
    const c = reduce(b, { type: 'pickCards', player: 2, cardIds: [big.id], color: 'green' });
    expect(c.players[2].hand.length).toBe(1);
    expect(c.currentColor).toBe('green');
    expect(c.current).toBe(0);
  });

  it('going out on a Spin card still makes the next player spin first', () => {
    const sp = card('red', '1', { spin: true });
    const s = position('spin', [[sp], [card('blue', '1'), card('blue', '2')]], card('red', '7'));
    const a = reduce(s, { type: 'play', player: 0, cardId: sp.id });
    expect(a.phase).toBe('spin');
    spinTo('drawRed');
    s.deck = [];
    const b = reduce(a, { type: 'spin', player: 1 });
    expect(b.roundWinner).toBe(0);
  });
});

describe('simulation', () => {
  for (const mode of MODE_ORDER) {
    it(`${MODES[mode].name}: hundreds of bot games without losing a card`, () => {
      for (let g = 0; g < 120; g++) {
        const n = 2 + (g % 9);
        let s = createGame(seats(n), 0, mode);
        const size = MODES[mode].deckSize;
        let steps = 0;
        while (s.phase !== 'gameOver' && steps < 8000) {
          if (s.unoVulnerable !== null && Math.random() < 0.3) {
            const catcher = s.players.findIndex((p, i) => i !== s.unoVulnerable && !p.out);
            s = reduce(s, { type: 'catch', player: catcher, target: s.unoVulnerable });
          }
          let who = actor(s);
          if (s.phase === 'unoSpinRace') {
            const callers = s.players
              .map((_, i) => i)
              .filter((i) => !s.players[i].out && s.players[i].hand.length && i !== s.pendingWin);
            who = callers[Math.floor(Math.random() * callers.length)];
          }
          expect(who).not.toBeNull();
          const a = decideBot(s, who!, (['chill', 'normal', 'savage'] as const)[g % 3]);
          expect(a).not.toBeNull();
          const next = reduce(s, a!);
          expect(next).not.toBe(s);
          s = next;
          expect(total(s)).toBe(size);
          steps++;
        }
        expect(s.phase).toBe('gameOver');
        const w = s.players[s.winner!];
        expect(w.hand.length === 0 || s.players.filter((p) => !p.out).length === 1).toBe(true);
      }
    });
  }
});
