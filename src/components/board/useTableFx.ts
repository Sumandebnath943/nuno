// ─────────────────────────────────────────────────────────────
//  Table effects: turns game events into a timeline of visuals.
//  Every play flies from the player to the pile, every draw flies
//  from the deck to the player, and the round opens with a real deal.
//  The game state itself is untouched — this only decides what the
//  table *shows* while cards are in the air.
// ─────────────────────────────────────────────────────────────
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Card, Color, GameEvent, GameView } from '../../game/types';
import { COLOR_NAMES } from '../../game/cards';
import { dealStagger, FLIGHT_MS } from '../../game/timing';
import { sfx } from '../../lib/sound';
import { pileJitter } from './layout';

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
  small?: string;
}

/** DOM anchors the effects fly between. */
export interface Anchors {
  deck: HTMLElement | null;
  discard: HTMLElement | null;
  seats: Record<number, HTMLElement | null>;
  handCards: Map<string, HTMLElement>;
  hand: HTMLElement | null;
}

const DRAW_GAP = 130;

export function useTableFx(view: GameView, anchors: React.MutableRefObject<Anchors>) {
  const me = view.me;
  const [flights, setFlights] = useState<Flight[]>([]);
  const [hiddenHand, setHiddenHand] = useState<Set<string>>(() => new Set());
  const [hiddenDiscard, setHiddenDiscard] = useState<Set<string>>(() => new Set());
  const [countDelta, setCountDelta] = useState<Record<number, number>>({});
  const [bubbles, setBubbles] = useState<Record<number, Bubble>>({});
  const [splash, setSplash] = useState<Splash | null>(null);
  const [fxColor, setFxColor] = useState<Color | null>(() => (view.phase === 'chooseColor' ? null : view.currentColor));
  const [settled, setSettled] = useState(true);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
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
      timers.current = [];
      landers.current.clear();
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
    timers.current.push(setTimeout(fn, Math.max(0, ms)));
  };

  const bump = (seat: number, by: number) => setCountDelta((d) => ({ ...d, [seat]: (d[seat] ?? 0) + by }));

  const showBubble = useCallback((seat: number, text: string, tone: BubbleTone = 'info', ms = 1700) => {
    const id = ++uid.current;
    setBubbles((b) => ({ ...b, [seat]: { id, text, tone } }));
    setTimeout(() => setBubbles((b) => (b[seat]?.id === id ? omit(b, seat) : b)), ms);
  }, []);

  const showSplash = (text: string, color?: Splash['color'], small?: string) => {
    const id = ++uid.current;
    setSplash({ id, text, color, small });
    setTimeout(() => setSplash((s) => (s?.id === id ? null : s)), 1150);
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

  const launch = (
    card: Flight['card'],
    flip: boolean,
    from: Box | null,
    to: Box | null,
    onLand: () => void,
    duration = FLIGHT_MS,
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

    const myTurnNow =
      (view.current === me && (view.phase === 'play' || view.phase === 'chooseColor')) ||
      (view.phase === 'challenge' && view.challenge?.target === me);

    if (!fresh.length) {
      if (myTurnNow && !wasMyTurn.current) sfx.yourTurn();
      wasMyTurn.current = myTurnNow;
      return;
    }

    const now = performance.now();
    let t = Math.max(0, cursor.current - now);
    // If we fall far behind (e.g. a tab was in the background), catch up quickly.
    const fast = t > 2500;
    const flightMs = fast ? 220 : FLIGHT_MS;
    const queue = [...added];
    const hideHand: string[] = [];
    const hideDiscard: string[] = [];
    const n = view.players.length;
    const nameOf = (i: number) => view.players[i]?.name ?? 'Someone';
    const myCard = (id: string) => view.myHand.find((c) => c.id === id) ?? null;

    for (const ev of fresh) {
      switch (ev.type) {
        case 'deal': {
          const stagger = fast ? 10 : dealStagger(n);
          setBubbles({});
          for (let r = 0; r < 7; r++) {
            for (let k = 1; k <= n; k++) {
              const seat = (ev.dealer + k) % n;
              const delay = t + (r * n + (k - 1)) * stagger;
              if (seat === me) {
                const id = queue.shift();
                if (!id) continue;
                hideHand.push(id);
                const card = myCard(id);
                at(delay, () => launch(card, true, deckBox(), handCardBox(id), () => unhide(setHiddenHand, id), flightMs));
              } else {
                bump(seat, -1);
                at(delay, () => launch(null, false, deckBox(), seatBox(seat), () => bump(seat, 1), flightMs));
              }
            }
          }
          for (let i = 0; i < Math.ceil((7 * n) / 6); i++) at(t + i * 6 * stagger, () => sfx.deal());
          t += 7 * n * stagger + flightMs * 0.6;
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
          t += flightMs + 200;
          break;
        }

        case 'play': {
          const { card, player } = ev;
          hideDiscard.push(card.id);
          const mine = player === me;
          if (!mine) bump(player, 1);
          const start = t;
          at(start, () => {
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
                switch (card.value) {
                  case 'skip':
                    sfx.skip();
                    showSplash('SKIP!', card.color);
                    break;
                  case 'draw2':
                    sfx.plus(2);
                    showSplash('+2', card.color);
                    break;
                  case 'wild4':
                    sfx.plus(4);
                    showSplash('+4', 'wild', ev.chosenColor ? `${COLOR_NAMES[ev.chosenColor]} it is!` : undefined);
                    break;
                  case 'wild':
                    sfx.wild();
                    showSplash('WILD!', 'wild', ev.chosenColor ? `${COLOR_NAMES[ev.chosenColor]} it is!` : undefined);
                    break;
                  case 'reverse':
                    break; // the reverse event has its own splash
                  default:
                    sfx.play();
                }
              },
              flightMs,
            );
          });
          const isNumber = /^\d$/.test(card.value);
          t += flightMs + (isNumber ? 90 : 260);
          break;
        }

        case 'draw': {
          const { player, count, reason } = ev;
          if (count <= 0) break;
          const mine = player === me;
          at(t, () => {
            sfx.draw(count);
            if (reason === 'penalty') return;
            if (reason === 'turn') showBubble(player, mine ? 'Drew a card' : 'Draws 1', 'info', 1300);
            else showBubble(player, `+${count} ${count >= 4 ? '😱' : '😬'}`, 'bad');
          });
          for (let i = 0; i < count; i++) {
            const delay = t + i * (fast ? 40 : DRAW_GAP);
            if (mine) {
              const id = queue.shift();
              if (!id) continue;
              hideHand.push(id);
              const card = myCard(id);
              at(delay, () => launch(card, true, deckBox(), handCardBox(id), () => unhide(setHiddenHand, id), flightMs));
            } else {
              bump(player, -1);
              at(delay, () => launch(null, false, deckBox(), seatBox(player), () => bump(player, 1), flightMs));
            }
          }
          t += (count - 1) * (fast ? 40 : DRAW_GAP) + flightMs * 0.75;
          break;
        }

        case 'skip':
          at(t, () => showBubble(ev.player, 'Skipped! 🚫', 'bad'));
          t += 220;
          break;

        case 'reverse':
          at(t, () => {
            sfx.reverse();
            showSplash('REVERSE!', undefined, n === 2 ? 'Works like a Skip with 2 players' : undefined);
          });
          t += 380;
          break;

        case 'colorChange': {
          const color = ev.color;
          at(t, () => {
            setFxColor(color);
            // Wild plays already announced the colour in their splash.
            if (!fresh.some((e) => e.type === 'play' && e.seq === ev.seq - 1)) {
              sfx.wild();
              showSplash(COLOR_NAMES[color].toUpperCase(), color, `${nameOf(ev.player)} picked`);
            }
          });
          t += 300;
          break;
        }

        case 'uno':
          at(t, () => {
            sfx.uno();
            showBubble(ev.player, 'NUNO!', 'uno', 2200);
          });
          t += 120;
          break;

        case 'caught':
          at(t, () => {
            sfx.caught();
            showSplash('CAUGHT!', 'red', `${nameOf(ev.player)} forgot to shout NUNO · +2`);
            showBubble(ev.player, 'Busted! 🙈', 'bad');
            showBubble(ev.by, 'Gotcha! 👉', 'good');
          });
          t += 450;
          break;

        case 'challenge':
          at(t, () => {
            if (ev.guilty) sfx.guilty();
            else sfx.innocent();
            showSplash(
              ev.guilty ? 'BLUFF!' : 'LEGIT!',
              ev.guilty ? 'red' : 'green',
              ev.guilty ? `${nameOf(ev.offender)} draws 4` : `${nameOf(ev.challenger)} draws 6`,
            );
          });
          t += 700;
          break;

        case 'accept4':
          at(t, () => showBubble(ev.player, 'Fine… +4', 'bad'));
          t += 150;
          break;

        case 'pass':
          at(t, () => showBubble(ev.player, 'Pass', 'info', 1200));
          t += 120;
          break;

        case 'reshuffle':
          at(t, () => {
            sfx.deal();
            showSplash('RESHUFFLE!', undefined, 'Discard pile shuffled into the deck');
          });
          t += 500;
          break;

        case 'seatChange':
          at(t, () => showBubble(ev.player, ev.kind === 'bot' ? '🤖 Bot took over' : '👋 Back!', 'info', 2600));
          break;

        default:
          break;
      }
    }

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

    if (myTurnNow && !wasMyTurn.current) at(t, () => sfx.yourTurn());
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
    fxColor,
    settled,
    rememberPlay,
  };
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
