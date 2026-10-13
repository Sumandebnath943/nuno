// ─────────────────────────────────────────────────────────────
//  Table effects: turns game events into a timeline of visuals.
//  Every play flies from the player to the pile, every draw flies
//  from the deck to the player, and the round opens with a real deal.
//  The game state itself is untouched — this only decides what the
//  table *shows* while cards are in the air.
//
//  Timings come from game/timing.ts, which the host also uses to hold
//  the bots, so a bot never moves before the last move has been shown.
// ─────────────────────────────────────────────────────────────
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Card, Color, DistributiveOmit, GameEvent, GameMode, GameView, WheelSegment } from '../../game/types';
import { COLOR_NAMES } from '../../game/cards';
import { drawValue, isStackable } from '../../game/modes';
import { dealStagger, drawGap, eventBeat, flightMs, splashMs, WHEEL_SPIN_MS } from '../../game/timing';
import { sfx } from '../../lib/sound';
import { buzz } from '../../lib/haptics';
import { WHEEL_INFO } from '../../lib/modeGuide';
import { currentTheme, playFx } from '../../themes';
import type { MoveKey } from '../../themes/types';
import type { Pt } from '../../fx/engine';
import { pileJitter } from './layout';
import { avatarImage } from '../../themes/characters';
import type { CutInData } from './CutIn';

export interface Box {
  x: number; // centre
  y: number; // centre
  w: number;
  rot: number;
}

export interface Flight {
  id: string;
  card: Pick<Card, 'color' | 'value'> | null;
  /** Starts face-down and turns face-up on the way. */
  flip: boolean;
  from: Box;
  to: Box;
  duration: number;
}

export type BubbleTone = 'info' | 'bad' | 'uno' | 'good' | 'emote';
export interface Bubble {
  id: number;
  text: string;
  tone: BubbleTone;
}

export interface Splash {
  id: number;
  text: string;
  color?: Color | 'wild';
  /** What it means, in plain words ("Rex draws 2"). */
  small?: string;
  /** The theme's flavour line above the big text ("Substitution Jutsu"). */
  kicker?: string;
}

/** Cards shown to everyone for a moment (Spin: Show Hand and War). */
export type Reveal =
  | { id: number; kind: 'show'; player: number; cards: Card[] }
  | { id: number; kind: 'war'; plays: { player: number; cards: Card[] }[]; winner: number | null };

/** A spin of the UNO Spin wheel being animated. */
export interface WheelSpin {
  id: number;
  spinner: number;
  segment: WheelSegment;
}

/** DOM anchors the effects fly between. */
export interface Anchors {
  deck: HTMLElement | null;
  discard: HTMLElement | null;
  seats: Record<number, HTMLElement | null>;
  handCards: Map<string, HTMLElement>;
  hand: HTMLElement | null;
}

export { WHEEL_SPIN_MS };

const ATTACKS = new Set(['draw2', 'wild4', 'stack', 'card', 'challenge', 'roulette', 'start']);

/** Big centre text for an action card, and which theme move it is. */
function actionSplash(card: Card, mode: GameMode): { text: string; plus?: number; move?: MoveKey } | null {
  // No Mercy draw cards announce themselves through the stack instead.
  if (mode === 'nomercy' && isStackable(card.value)) return null;
  const d = drawValue(card.value);
  if (card.spin) return { text: 'SPIN!' };
  switch (card.value) {
    case 'skip':
    case 'wildSkip':
      return { text: 'SKIP!', move: 'skip' };
    case 'wildSkip2':
      return { text: 'SKIP ×2!', move: 'skip' };
    case 'hit2':
      return { text: 'HIT 2!', move: 'launch' };
    case 'wild':
      return mode === 'allwild' ? null : { text: 'WILD!', move: 'wild' };
    case 'wildDrawColor':
      return { text: 'DRAW COLOR!', plus: 4, move: 'bigDraw' };
    case 'wildRoulette':
      return { text: 'ROULETTE!', move: 'wild' };
    case 'wildAllHit':
      return { text: 'ALL HIT!', move: 'launch' };
    case 'wildHitFire':
      return { text: 'HIT-FIRE!', move: 'launch' };
    case 'tradeHands':
    case 'wildSwap':
      return { text: 'SWAP!', move: 'swap' };
    case 'discardAll':
      return { text: 'DISCARD ALL!', move: 'discardAll' };
    case 'wildTargetDraw2':
      return { text: '+2 🎯', plus: 2, move: 'draw' };
    default:
      return d ? { text: `+${d}`, plus: d, move: d >= 4 ? 'bigDraw' : 'draw' } : null;
  }
}

export function useTableFx(view: GameView, anchors: React.MutableRefObject<Anchors>) {
  const me = view.me;
  const [flights, setFlights] = useState<Flight[]>([]);
  const [hiddenHand, setHiddenHand] = useState<Set<string>>(() => new Set());
  const [hiddenDiscard, setHiddenDiscard] = useState<Set<string>>(() => new Set());
  const [countDelta, setCountDelta] = useState<Record<number, number>>({});
  const [bubbles, setBubbles] = useState<Record<number, Bubble>>({});
  const [splash, setSplash] = useState<Splash | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [wheelSpin, setWheelSpin] = useState<WheelSpin | null>(null);
  const [launcherShots, setLauncherShots] = useState(0);
  const [cutIn, setCutIn] = useState<CutInData | null>(null);
  const [fxColor, setFxColor] = useState<Color | null>(() => (view.phase === 'chooseColor' ? null : view.currentColor));
  const [settled, setSettled] = useState(true);

  // Pending timers. Each removes itself when it fires, so long games don't pile them up.
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const cursor = useRef(0);
  const lastSeq = useRef<number | null>(null);
  const prevHand = useRef<Set<string>>(new Set());
  const playRects = useRef(new Map<string, DOMRect>());
  const landers = useRef(new Map<string, () => void>());
  const token = useRef(0);
  const uid = useRef(0);
  const wasMyTurn = useRef(false);
  const viewRef = useRef(view);
  viewRef.current = view;

  // Full reset on unmount. (StrictMode also fakes an unmount in dev; resetting
  // here makes the remount replay the current deal instead of freezing it.)
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
      landers.current.clear();
      playRects.current.clear();
      lastSeq.current = null;
      prevHand.current = new Set();
      cursor.current = 0;
      token.current++;
      setFlights([]);
      setHiddenHand(new Set());
      setHiddenDiscard(new Set());
      setCountDelta({});
    },
    [],
  );

  const at = (ms: number, fn: () => void) => {
    const h = setTimeout(() => {
      timers.current.delete(h);
      fn();
    }, Math.max(0, ms));
    timers.current.add(h);
  };

  const bump = (seat: number, by: number) => setCountDelta((d) => ({ ...d, [seat]: (d[seat] ?? 0) + by }));

  const showBubble = useCallback((seat: number, text: string, tone: BubbleTone = 'info', ms = 2100) => {
    const id = ++uid.current;
    setBubbles((b) => ({ ...b, [seat]: { id, text, tone } }));
    setTimeout(() => setBubbles((b) => (b[seat]?.id === id ? omit(b, seat) : b)), ms);
  }, []);

  const showSplash = (text: string, color?: Splash['color'], small?: string, kicker?: string) => {
    const id = ++uid.current;
    setSplash({ id, text, color, small, kicker });
    setTimeout(() => setSplash((s) => (s?.id === id ? null : s)), splashMs() + (small ? 300 : 0));
  };

  /** A character portrait sliding in, for players whose avatar is a character picture. */
  const showCutIn = (seat: number) => {
    const art = avatarImage(viewRef.current.players[seat]?.avatar);
    if (!art) return;
    const id = ++uid.current;
    const ms = Math.round(splashMs() * 0.9);
    setCutIn({
      id,
      url: art.url,
      name: art.full,
      w: art.w,
      h: art.h,
      srcW: art.srcW,
      srcH: art.srcH,
      cut: art.cut,
      side: seat === me ? 'left' : 'right',
      ms,
    });
    setTimeout(() => setCutIn((c) => (c?.id === id ? null : c)), ms + 50);
  };

  const showReveal = (r: DistributiveOmit<Reveal, 'id'>, ms: number) => {
    const id = ++uid.current;
    setReveal({ ...r, id } as Reveal);
    setTimeout(() => setReveal((x) => (x?.id === id ? null : x)), ms);
  };

  // ── measuring ────────────────────────────────────────────
  const boxOf = (el: HTMLElement | null | undefined, fallbackW = 60): Box | null => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const w = Number(el.dataset.cardW) || r.width || fallbackW;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w, rot: Number(el.dataset.rot) || 0 };
  };

  const deckBox = () => boxOf(anchors.current.deck);
  const seatBox = (seat: number) => {
    if (seat === me) return boxOf(anchors.current.hand);
    const b = boxOf(anchors.current.seats[seat]);
    return b ? { ...b, rot: (Math.random() - 0.5) * 20 } : null;
  };
  const handCardBox = (id: string) => boxOf(anchors.current.handCards.get(id)) ?? boxOf(anchors.current.hand);
  const discardBox = (cardId: string): Box | null => {
    const b = boxOf(anchors.current.discard);
    if (!b) return null;
    const j = pileJitter(cardId);
    return { x: b.x + j.dx, y: b.y + j.dy, w: b.w, rot: j.rot };
  };
  const center = (): Pt => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const pt = (b: Box | null): Pt => (b ? { x: b.x, y: b.y } : center());
  const seatPt = (seat: number) => pt(seatBox(seat));
  const pilePt = () => pt(boxOf(anchors.current.discard));
  const deckPt = () => pt(deckBox());

  const launch = (
    card: Flight['card'],
    flip: boolean,
    from: Box | null,
    to: Box | null,
    onLand: () => void,
    duration = flightMs(),
  ) => {
    // Hidden tabs don't animate: skip straight to the landing.
    if (!from || !to || document.hidden) {
      onLand();
      return;
    }
    const id = `f${++uid.current}`;
    landers.current.set(id, onLand);
    setFlights((f) => [...f, { id, card, flip, from, to, duration }]);
    // Safety net: if the browser stops painting frames (occluded window, embedded
    // preview…) the animation never finishes, so land the card on a timer instead.
    at(duration + 900, () => land(id));
  };

  /** Called by the flight layer when a card lands. */
  const land = useCallback((id: string) => {
    setFlights((f) => f.filter((x) => x.id !== id));
    const fn = landers.current.get(id);
    landers.current.delete(id);
    fn?.();
  }, []);

  const rememberPlay = useCallback((cardId: string, rect: DOMRect) => {
    playRects.current.set(cardId, rect);
    // Forget it if the play never happens (e.g. the server refused it).
    setTimeout(() => playRects.current.delete(cardId), 4000);
  }, []);

  // ── the timeline ─────────────────────────────────────────
  useLayoutEffect(() => {
    const events = view.events;
    // A brand-new game restarts the event counter: start over.
    const newestSeq = events.length ? events[events.length - 1].seq : 0;
    if (lastSeq.current !== null && newestSeq < lastSeq.current) {
      lastSeq.current = null;
      prevHand.current = new Set();
      setHiddenHand(new Set());
      setHiddenDiscard(new Set());
      setCountDelta({});
    }
    const handIds = view.myHand.map((c) => c.id);
    const added = handIds.filter((id) => !prevHand.current.has(id));
    prevHand.current = new Set(handIds);

    let fresh: GameEvent[];
    if (lastSeq.current === null) {
      // First look at the table: only animate if a round was just dealt.
      const dealAt = findLastIndex(events, (e) => e.type === 'deal');
      const moved =
        dealAt >= 0 && events.slice(dealAt).some((e) => e.type === 'play' || (e.type === 'draw' && e.reason === 'turn'));
      fresh = dealAt >= 0 && !moved ? events.slice(dealAt) : [];
    } else {
      const since = lastSeq.current;
      fresh = events.filter((e) => e.seq > since);
    }
    if (events.length) lastSeq.current = events[events.length - 1].seq;
    else if (lastSeq.current === null) lastSeq.current = 0;

    const myTurnNow = view.actor === me && view.phase !== 'unoSpinRace';

    if (!fresh.length) {
      if (myTurnNow && !wasMyTurn.current) yourTurn();
      wasMyTurn.current = myTurnNow;
      return;
    }

    const now = performance.now();
    let t = Math.max(0, cursor.current - now);
    // If we fall far behind (e.g. a tab was in the background), catch up quickly.
    const fast = t > 2500;
    const flight = fast ? 220 : flightMs();
    const n = view.players.length;
    const beat = (ev: GameEvent) => eventBeat(ev, n, fast);
    const queue = [...added];
    const hideHand: string[] = [];
    const hideDiscard: string[] = [];
    const theme = currentTheme();
    const moves = theme.moves ?? {};
    const nameOf = (i: number) => (i === me ? 'You' : (view.players[i]?.name ?? 'Someone'));
    const verb = (i: number, you: string, they: string) => `${nameOf(i)} ${i === me ? you : they}`;
    const colorWord = (c: Color) => {
      const alias = theme.colorAlias?.[c];
      return alias ? `${COLOR_NAMES[c]} · ${alias}` : `${COLOR_NAMES[c]} it is!`;
    };
    const myCard = (id: string) => view.myHand.find((c) => c.id === id) ?? null;
    // UNO Flip has no card backs: show the side everyone else can see.
    const oppFace = (seat: number, idx: number) => (view.mode === 'flip' ? (view.players[seat]?.altFaces?.[idx] ?? null) : null);
    let lastPlayer: number | null = null;
    const hitVictims = new Set<number>();

    /** What a card did, in plain words, from the events that follow it. */
    const consequence = (i: number, card: Card, player: number, target?: number): string | undefined => {
      const after: GameEvent[] = [];
      for (let k = i + 1; k < fresh.length && fresh[k].type !== 'play'; k++) after.push(fresh[k]);
      const skipped = after.filter((e): e is Extract<GameEvent, { type: 'skip' }> => e.type === 'skip').map((e) => e.player);
      const drew = after.find((e): e is Extract<GameEvent, { type: 'draw' }> => e.type === 'draw' && ATTACKS.has(e.reason));
      const next = view.phase === 'challenge' && view.challenge ? view.challenge.target : view.current;
      if (card.spin) return verb(next, 'spin the wheel!', 'spins the wheel!');
      switch (card.value) {
        case 'skip':
        case 'wildSkip':
        case 'wildSkip2':
          return skipped.length ? skipped.map(nameOf).join(' & ') + (skipped.length > 1 || skipped[0] === me ? ' miss a turn' : ' misses a turn') : undefined;
        case 'tradeHands':
        case 'wildSwap':
          return target !== undefined ? `${nameOf(player)} ⇄ ${nameOf(target)}` : undefined;
        case 'wildTargetDraw2':
          return target !== undefined ? verb(target, 'draw 2!', 'draws 2') : undefined;
        case 'hit2':
          return verb(next, 'hit the launcher twice', 'hits the launcher twice');
        case 'wildAllHit':
          return 'Everyone else hits the launcher';
        case 'wildHitFire':
          return verb(next, 'hit until it fires!', 'hits until it fires');
        case 'wildRoulette':
          return verb(next, 'name a colour…', 'names a colour…');
        case 'discardAll':
          return `All ${COLOR_NAMES[card.color as Color] ?? ''} cards go with it`;
        default:
          break;
      }
      if (drew) return verb(drew.player, `draw ${drew.count}!`, `draws ${drew.count}`);
      if (view.phase === 'challenge' && view.challenge) return verb(view.challenge.target, 'can challenge it!', 'can challenge it');
      return undefined;
    };

    /** Cards arriving in my hand from somewhere other than the deck (swaps, passes). */
    const receiveFrom = (seat: number) => {
      const ids = queue.splice(0, queue.length);
      ids.forEach((id, i) => {
        hideHand.push(id);
        const card = myCard(id);
        at(t + i * 60, () => launch(card, true, seatBox(seat), handCardBox(id), () => unhide(setHiddenHand, id), flight));
      });
      return ids.length;
    };

    /** A few cards flying from a player onto the pile (Discard All, wheel discards). */
    const toPile = (player: number, count: number, start = t) => {
      for (let i = 0; i < Math.min(count, 6); i++) {
        at(start + i * 110, () => launch(null, false, seatBox(player), boxOf(anchors.current.discard), () => sfx.play(), flight));
      }
    };

    fresh.forEach((ev, idx) => {
      switch (ev.type) {
        case 'deal': {
          const stagger = fast ? 10 : dealStagger(n);
          setBubbles({});
          at(t, () => playFx({ kind: 'deal', at: deckPt() }));
          for (let r = 0; r < 7; r++) {
            for (let k = 1; k <= n; k++) {
              const seat = (ev.dealer + k) % n;
              const delay = t + (r * n + (k - 1)) * stagger;
              if (seat === me) {
                const id = queue.shift();
                if (!id) continue;
                hideHand.push(id);
                const card = myCard(id);
                at(delay, () => launch(card, true, deckBox(), handCardBox(id), () => unhide(setHiddenHand, id), flight));
              } else {
                bump(seat, -1);
                at(delay, () => launch(oppFace(seat, r), false, deckBox(), seatBox(seat), () => bump(seat, 1), flight));
              }
            }
          }
          for (let i = 0; i < Math.ceil((7 * n) / 6); i++) at(t + i * 6 * stagger, () => sfx.deal());
          break;
        }

        case 'firstCard': {
          const card = ev.card;
          hideDiscard.push(card.id);
          at(t, () =>
            launch(card, true, deckBox(), discardBox(card.id), () => {
              unhide(setHiddenDiscard, card.id);
              sfx.play();
              setFxColor(card.color === 'wild' ? null : card.color);
            }),
          );
          break;
        }

        case 'play': {
          const { card, player } = ev;
          lastPlayer = player;
          hideDiscard.push(card.id);
          const mine = player === me;
          const effect = consequence(idx, card, player, ev.target);
          if (!mine) bump(player, 1);
          at(t, () => {
            let from: Box | null;
            if (mine) {
              const r = playRects.current.get(card.id);
              playRects.current.delete(card.id);
              from = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, rot: 0 } : boxOf(anchors.current.hand);
            } else {
              from = seatBox(player);
              bump(player, -1);
            }
            launch(
              card,
              !mine,
              from,
              discardBox(card.id),
              () => {
                unhide(setHiddenDiscard, card.id);
                if (card.color !== 'wild') setFxColor(card.color);
                else if (ev.chosenColor) setFxColor(ev.chosenColor);
                playFx({ kind: 'land', at: pilePt(), card, mine });
                const sp = actionSplash(card, view.mode);
                const picked = ev.chosenColor ? colorWord(ev.chosenColor) : undefined;
                if (!sp) {
                  sfx.play();
                  if (card.value === 'reverse' || card.value === 'wildReverse') return; // the reverse event has its own splash
                  if (card.color === 'wild' && picked) showSplash('WILD!', 'wild', picked, moves.wild);
                  return;
                }
                if (sp.plus) sfx.plus(sp.plus);
                else if (sp.text.startsWith('SKIP')) sfx.skip();
                else if (card.color === 'wild') sfx.wild();
                else sfx.play();
                const small = [picked, effect].filter(Boolean).join(' · ') || undefined;
                showCutIn(player);
                showSplash(sp.text, card.color === 'wild' ? 'wild' : (card.color as Color), small, sp.move ? moves[sp.move] : undefined);
              },
              flight,
            );
          });
          break;
        }

        case 'draw': {
          const { player, count, reason } = ev;
          if (count <= 0) break;
          const mine = player === me;
          const attacker = lastPlayer;
          at(t, () => {
            sfx.draw(count);
            if (mine && count >= 2) buzz(count >= 4 ? [40, 40, 80] : 40);
            if (ATTACKS.has(reason)) {
              hitVictims.add(player);
              playFx({ kind: 'hit', from: attacker !== null && attacker !== player ? seatPt(attacker) : pilePt(), to: seatPt(player), amount: count });
            } else if (reason === 'turn' || reason === 'wheel') {
              playFx({ kind: 'draw', from: deckPt(), to: seatPt(player), count });
            }
            if (reason === 'penalty' || reason === 'launch') return;
            if (reason === 'turn')
              showBubble(player, mine ? (count > 1 ? `Drew ${count}` : 'Drew a card') : `Draws ${count}`, 'info', 1500);
            else showBubble(player, `+${count} ${count >= 4 ? '😱' : '😬'}`, 'bad', 2300);
          });
          const gap = fast ? 40 : drawGap(count);
          for (let i = 0; i < count; i++) {
            const delay = t + i * gap;
            if (mine) {
              const id = queue.shift();
              if (!id) continue;
              hideHand.push(id);
              const card = myCard(id);
              at(delay, () => launch(card, true, deckBox(), handCardBox(id), () => unhide(setHiddenHand, id), flight));
            } else {
              bump(player, -1);
              const face = oppFace(player, (view.players[player]?.handCount ?? count) - count + i);
              at(delay, () => launch(face, false, deckBox(), seatBox(player), () => bump(player, 1), flight));
            }
          }
          break;
        }

        case 'skip': {
          const attacker = lastPlayer;
          const quiet = hitVictims.has(ev.player);
          at(t, () => {
            showBubble(ev.player, ev.player === me ? 'You’re skipped! 🚫' : 'Skipped! 🚫', 'bad');
            if (!quiet) playFx({ kind: 'skip', from: attacker !== null ? seatPt(attacker) : pilePt(), to: seatPt(ev.player) });
          });
          break;
        }

        case 'skipAll':
          at(t, () => {
            sfx.skip();
            showSplash('SKIP EVERYONE!', undefined, verb(ev.player, 'go again!', 'goes again'), moves.skipAll);
            playFx({ kind: 'skipAll', at: seatPt(ev.player) });
          });
          break;

        case 'reverse':
          at(t, () => {
            sfx.reverse();
            showSplash(
              'REVERSE!',
              undefined,
              n === 2 ? 'Works like a Skip with 2 players' : ev.direction === 1 ? 'Play goes clockwise ↻' : 'Play goes the other way ↺',
              moves.reverse,
            );
            playFx({ kind: 'reverse', at: pilePt() });
          });
          break;

        case 'colorChange': {
          const color = ev.color;
          const afterPlay = fresh[idx - 1]?.type === 'play';
          at(t, () => {
            setFxColor(color);
            playFx({ kind: 'color', at: pilePt(), color, hex: theme.cardColors[color].base });
            // Wild plays already announced the colour in their splash.
            if (!afterPlay) {
              sfx.wild();
              showSplash(COLOR_NAMES[color].toUpperCase(), color, `${nameOf(ev.player)} picked it`, theme.colorAlias?.[color] ?? moves.wild);
            }
          });
          break;
        }

        case 'uno':
          at(t, () => {
            sfx.uno();
            showCutIn(ev.player);
            showBubble(ev.player, 'NUNO!', 'uno', 2400);
            playFx({ kind: 'uno', at: seatPt(ev.player) });
          });
          break;

        case 'caught':
          at(t, () => {
            sfx.caught();
            if (ev.player === me) buzz([60, 40, 60]);
            const cost = view.mode === 'attack' ? 'two launcher hits' : 'draws 2';
            showSplash('CAUGHT!', 'red', `${nameOf(ev.player)} forgot to shout NUNO · ${cost}`, moves.caught);
            showBubble(ev.player, 'Busted! 🙈', 'bad');
            showBubble(ev.by, 'Gotcha! 👉', 'good');
            playFx({ kind: 'caught', at: seatPt(ev.player), by: seatPt(ev.by) });
          });
          break;

        case 'challenge':
          at(t, () => {
            if (ev.guilty) sfx.guilty();
            else sfx.innocent();
            showSplash(
              ev.guilty ? 'BLUFF!' : 'LEGIT!',
              ev.guilty ? 'red' : 'green',
              ev.guilty ? `${nameOf(ev.offender)} takes the penalty` : `${nameOf(ev.challenger)} takes it, plus 2`,
            );
            playFx({ kind: 'challenge', at: pilePt(), guilty: ev.guilty });
          });
          break;

        case 'accept4':
          at(t, () => showBubble(ev.player, 'Fine… 😤', 'bad'));
          break;

        case 'pass':
          if (view.mode === 'attack') break; // the launcher event already said what happened
          at(t, () => showBubble(ev.player, 'Pass', 'info', 1400));
          break;

        case 'reshuffle':
          at(t, () => {
            sfx.reshuffle();
            showSplash('RESHUFFLE!', undefined, 'Discard pile shuffled into the deck');
          });
          break;

        case 'seatChange':
          at(t, () => showBubble(ev.player, ev.kind === 'bot' ? '🤖 Bot took over' : '👋 Back!', 'info', 2600));
          break;

        // ── No Mercy ──
        case 'stack':
          at(t, () => {
            sfx.stack(ev.total);
            showSplash(`+${ev.total}`, 'red', ev.victim === me ? 'Stack a bigger draw card — or take them all!' : `${nameOf(ev.victim)}: stack it or take it!`, moves.stack);
            showBubble(ev.victim, `+${ev.total} incoming 😰`, 'bad', 2400);
            playFx({ kind: 'stack', at: pilePt(), to: seatPt(ev.victim), total: ev.total });
          });
          break;

        case 'eliminated':
          at(t, () => {
            sfx.knockout();
            if (ev.player === me) buzz([100, 60, 200]);
            showSplash('KNOCKED OUT!', 'red', `${nameOf(ev.player)} hit 25 cards`, moves.knockout);
            showBubble(ev.player, '💀 OUT', 'bad', 3000);
            playFx({ kind: 'knockout', at: seatPt(ev.player) });
          });
          break;

        case 'swap': {
          const other = ev.a === me ? ev.b : ev.b === me ? ev.a : null;
          at(t, () => {
            sfx.swap();
            showBubble(ev.a, 'Swapped! 🔄', 'info');
            showBubble(ev.b, 'Swapped! 🔄', 'info');
            if (fresh[idx - 1]?.type !== 'play' || (fresh[idx - 1] as { card?: Card }).card?.value === '7')
              showSplash('SWAP!', undefined, `${nameOf(ev.a)} ⇄ ${nameOf(ev.b)}`, moves.swap);
            playFx({ kind: 'swap', a: seatPt(ev.a), b: seatPt(ev.b) });
          });
          if (other !== null) receiveFrom(other);
          break;
        }

        case 'passHands': {
          at(t, () => {
            sfx.swap();
            showSplash(view.mode === 'spin' ? 'TRADE HANDS!' : 'PASS HANDS!', undefined, 'Everyone passes their hand along', moves.swap);
            playFx({ kind: 'passHands', at: pilePt() });
          });
          // Find who passed to me: the previous active seat in the pass direction.
          let from = me;
          for (let k = 1; k < n; k++) {
            const i = (((me - ev.direction * k) % n) + n) % n;
            if (!view.players[i].out) {
              from = i;
              break;
            }
          }
          if (from !== me) receiveFrom(from);
          break;
        }

        case 'discardAll':
        case 'wheelDiscard':
          at(t, () => {
            showBubble(ev.player, `−${ev.count} card${ev.count === 1 ? '' : 's'}`, 'good');
            if (ev.type === 'discardAll') sfx.discardAll();
            playFx({ kind: 'discardAll', at: seatPt(ev.player), to: pilePt(), count: ev.count });
          });
          toPile(ev.player, ev.count);
          break;

        case 'roulette':
          at(t, () => {
            sfx.roulette();
            showSplash(COLOR_NAMES[ev.color].toUpperCase(), ev.color, `${nameOf(ev.player)} flips cards until it shows up`, theme.colorAlias?.[ev.color]);
            playFx({ kind: 'color', at: pilePt(), color: ev.color, hex: theme.cardColors[ev.color].base });
          });
          break;

        // ── Flip ──
        case 'flip':
          at(t, () => {
            sfx.flip(ev.side === 'dark');
            showSplash(ev.side === 'dark' ? 'DARK SIDE!' : 'LIGHT SIDE!', undefined, 'Every card flips over', moves.flip);
            playFx({ kind: 'flip', at: pilePt(), dark: ev.side === 'dark' });
          });
          break;

        // ── Attack ──
        case 'launch':
          at(t, () => {
            setLauncherShots((x) => x + 1);
            sfx.launch(ev.count);
            playFx({ kind: 'launch', at: deckPt(), to: seatPt(ev.player), count: ev.count });
            if (ev.count === 0) showBubble(ev.player, 'Phew! Nothing 😅', 'good', 1500);
            else showBubble(ev.player, `Launched ${ev.count}! 💥`, 'bad', 2200);
          });
          break;

        // ── Spin ──
        case 'spin': {
          const spin = { spinner: ev.player, segment: ev.segment };
          at(t, () => {
            sfx.deal();
            setWheelSpin({ ...spin, id: ++uid.current });
            // The clicker slows down with the wheel.
            let d = 0;
            for (let i = 0; i < 22 && d < WHEEL_SPIN_MS / 1000 - 0.15; i++) {
              sfx.spinTick(d);
              d += 0.04 + i * i * 0.0011;
            }
          });
          at(t + WHEEL_SPIN_MS, () => {
            sfx.spinStop();
            showSplash(WHEEL_INFO[ev.segment].name.toUpperCase() + '!', undefined, WHEEL_INFO[ev.segment].text);
          });
          at(t + WHEEL_SPIN_MS + 1500, () =>
            setWheelSpin((w) => (w?.segment === spin.segment && w.spinner === spin.spinner ? null : w)),
          );
          break;
        }

        case 'showHand':
          at(t, () => showReveal({ kind: 'show', player: ev.player, cards: ev.cards }, 4000));
          break;

        case 'war':
          at(t, () => {
            sfx.challenge();
            showReveal({ kind: 'war', plays: ev.plays, winner: ev.winner }, 4400);
          });
          if (ev.winner !== null) {
            const w = ev.winner;
            const count = ev.plays.find((p) => p.player === w)?.cards.length ?? 1;
            at(t + 1700, () => showBubble(w, 'Wins the War! ⚔️', 'good', 2200));
            toPile(w, count, t + 1700);
          }
          break;

        case 'unoSpinCall':
          at(t, () => {
            sfx.uno();
            showBubble(ev.player, 'NUNO SPIN!', 'uno', 2000);
            showSplash('NUNO SPIN!', 'yellow', `${nameOf(ev.player)} called it first`);
          });
          break;

        case 'roundOver':
          at(t, () => playFx({ kind: 'win', at: seatPt(ev.winner), mine: ev.winner === me }));
          break;

        default:
          break;
      }
      t += beat(ev);
    });

    // Anything left in the queue arrived without an animation — just show it.
    if (queue.length) hideHand.splice(0, hideHand.length, ...hideHand.filter((id) => !queue.includes(id)));

    if (hideHand.length) setHiddenHand((s) => new Set([...s, ...hideHand]));
    if (hideDiscard.length) setHiddenDiscard((s) => new Set([...s, ...hideDiscard]));

    cursor.current = now + t;
    const mine = ++token.current;
    setSettled(false);
    // Settle once the timeline has run and every card has actually landed
    // (slow devices can run behind the clock).
    const settle = () => {
      if (token.current !== mine) return;
      if (landers.current.size > 0) {
        at(120, settle);
        return;
      }
      setSettled(true);
      const v = viewRef.current;
      if (v.phase !== 'chooseColor') setFxColor(v.currentColor);
    };
    at(t + 60, settle);

    if (myTurnNow && !wasMyTurn.current)
      at(t, () => {
        yourTurn();
        playFx({ kind: 'yourTurn', at: pt(boxOf(anchors.current.hand)) });
      });
    wasMyTurn.current = myTurnNow;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  return {
    flights,
    land,
    hiddenHand,
    hiddenDiscard,
    countDelta,
    bubbles,
    showBubble,
    splash,
    reveal,
    wheelSpin,
    launcherShots,
    cutIn,
    fxColor,
    settled,
    rememberPlay,
  };
}

function yourTurn() {
  sfx.yourTurn();
  buzz(25);
}

function unhide(set: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
  set((s) => {
    if (!s.has(id)) return s;
    const next = new Set(s);
    next.delete(id);
    return next;
  });
}

function omit<T>(obj: Record<number, T>, key: number): Record<number, T> {
  const next = { ...obj };
  delete next[key];
  return next;
}

function findLastIndex<T>(arr: T[], fn: (x: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) if (fn(arr[i])) return i;
  return -1;
}
