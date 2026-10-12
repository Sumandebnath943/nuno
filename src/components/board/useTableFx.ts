// ─────────────────────────────────────────────────────────────
//  Table effects: turns game events into a timeline of visuals.
//  Every play flies from the player to the pile, every draw flies
//  from the deck to the player, and the round opens with a real deal.
//  The game state itself is untouched — this only decides what the
//  table *shows* while cards are in the air.
// ─────────────────────────────────────────────────────────────
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Card, Color, DistributiveOmit, GameEvent, GameMode, GameView, WheelSegment } from '../../game/types';
import { COLOR_NAMES } from '../../game/cards';
import { drawValue, isStackable } from '../../game/modes';
import { dealStagger, FLIGHT_MS, WHEEL_SPIN_MS } from '../../game/timing';
import { sfx } from '../../lib/sound';
import { buzz } from '../../lib/haptics';
import { WHEEL_INFO } from '../../lib/modeGuide';
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

const DRAW_GAP = 130;
export { WHEEL_SPIN_MS };

/** Big centre text for an action card. */
function actionSplash(card: Card, mode: GameMode): { text: string; plus?: number } | null {
  // No Mercy draw cards announce themselves through the stack instead.
  if (mode === 'nomercy' && isStackable(card.value)) return null;
  const d = drawValue(card.value);
  switch (card.value) {
    case 'skip':
    case 'wildSkip':
      return { text: 'SKIP!' };
    case 'wildSkip2':
      return { text: 'SKIP ×2!' };
    case 'hit2':
      return { text: 'HIT 2!' };
    case 'wild':
      return mode === 'allwild' ? null : { text: 'WILD!' };
    case 'wildDrawColor':
      return { text: 'DRAW COLOR!', plus: 4 };
    case 'wildRoulette':
      return { text: 'ROULETTE!' };
    case 'wildAllHit':
      return { text: 'ALL HIT!' };
    case 'wildHitFire':
      return { text: 'HIT-FIRE!' };
    case 'tradeHands':
    case 'wildSwap':
      return { text: 'SWAP!' };
    case 'discardAll':
      return { text: 'DISCARD ALL!' };
    case 'wildTargetDraw2':
      return { text: '+2 🎯', plus: 2 };
    default:
      return d ? { text: `+${d}`, plus: d } : null;
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
    const flightMs = fast ? 220 : FLIGHT_MS;
    const queue = [...added];
    const hideHand: string[] = [];
    const hideDiscard: string[] = [];
    const n = view.players.length;
    const nameOf = (i: number) => (i === me ? 'You' : (view.players[i]?.name ?? 'Someone'));
    const myCard = (id: string) => view.myHand.find((c) => c.id === id) ?? null;
    // UNO Flip has no card backs: show the side everyone else can see.
    const oppFace = (seat: number, idx: number) => (view.mode === 'flip' ? (view.players[seat]?.altFaces?.[idx] ?? null) : null);

    /** Cards arriving in my hand from somewhere other than the deck (swaps, passes). */
    const receiveFrom = (seat: number) => {
      const ids = queue.splice(0, queue.length);
      ids.forEach((id, i) => {
        hideHand.push(id);
        const card = myCard(id);
        at(t + i * 60, () => launch(card, true, seatBox(seat), handCardBox(id), () => unhide(setHiddenHand, id), flightMs));
      });
      return ids.length;
    };

    /** A few cards flying from a player onto the pile (Discard All, wheel discards). */
    const toPile = (player: number, count: number) => {
      for (let i = 0; i < Math.min(count, 6); i++) {
        at(t + i * 90, () => launch(null, false, seatBox(player), boxOf(anchors.current.discard), () => sfx.play(), flightMs));
      }
    };

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
                at(delay, () => launch(oppFace(seat, r), false, deckBox(), seatBox(seat), () => bump(seat, 1), flightMs));
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
                const sp = actionSplash(card, view.mode);
                const picked = ev.chosenColor ? `${COLOR_NAMES[ev.chosenColor]} it is!` : undefined;
                const target = ev.target !== undefined ? `→ ${nameOf(ev.target)}` : undefined;
                if (!sp) {
                  sfx.play();
                  if (card.value === 'reverse' || card.value === 'wildReverse') return; // the reverse event has its own splash
                  if (card.color === 'wild' && picked) showSplash('WILD!', 'wild', picked);
                  return;
                }
                if (sp.plus) sfx.plus(sp.plus);
                else if (sp.text.startsWith('SKIP')) sfx.skip();
                else if (card.color === 'wild') sfx.wild();
                else sfx.play();
                showSplash(sp.text, card.color === 'wild' ? 'wild' : (card.color as Color), picked ?? target);
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
            if (mine && count >= 2) buzz(count >= 4 ? [40, 40, 80] : 40);
            if (reason === 'penalty' || reason === 'launch') return;
            if (reason === 'turn')
              showBubble(player, mine ? (count > 1 ? `Drew ${count}` : 'Drew a card') : `Draws ${count}`, 'info', 1300);
            else showBubble(player, `+${count} ${count >= 4 ? '😱' : '😬'}`, 'bad');
          });
          const gap = fast ? 40 : count > 8 ? 70 : DRAW_GAP;
          for (let i = 0; i < count; i++) {
            const delay = t + i * gap;
            if (mine) {
              const id = queue.shift();
              if (!id) continue;
              hideHand.push(id);
              const card = myCard(id);
              at(delay, () => launch(card, true, deckBox(), handCardBox(id), () => unhide(setHiddenHand, id), flightMs));
            } else {
              bump(player, -1);
              const face = oppFace(player, (view.players[player]?.handCount ?? count) - count + i);
              at(delay, () => launch(face, false, deckBox(), seatBox(player), () => bump(player, 1), flightMs));
            }
          }
          t += (count - 1) * gap + flightMs * 0.75;
          break;
        }

        case 'skip':
          at(t, () => showBubble(ev.player, 'Skipped! 🚫', 'bad'));
          t += 220;
          break;

        case 'skipAll':
          at(t, () => {
            sfx.skip();
            showSplash('SKIP EVERYONE!', undefined, `${nameOf(ev.player)} goes again`);
          });
          t += 450;
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
            if (ev.player === me) buzz([60, 40, 60]);
            const cost = view.mode === 'attack' ? 'two launcher hits' : '+2';
            showSplash('CAUGHT!', 'red', `${nameOf(ev.player)} forgot to shout NUNO · ${cost}`);
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
              ev.guilty ? `${nameOf(ev.offender)} takes the penalty` : `${nameOf(ev.challenger)} takes it, plus 2`,
            );
          });
          t += 700;
          break;

        case 'accept4':
          at(t, () => showBubble(ev.player, 'Fine… 😤', 'bad'));
          t += 150;
          break;

        case 'pass':
          if (view.mode === 'attack') break; // the launcher event already said what happened
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

        // ── No Mercy ──
        case 'stack':
          at(t, () => {
            sfx.plus(Math.min(10, ev.total));
            showSplash(`+${ev.total}`, 'red', `${nameOf(ev.victim)}: stack it or take it!`);
            showBubble(ev.victim, `+${ev.total} incoming 😰`, 'bad', 2200);
          });
          t += 500;
          break;

        case 'eliminated':
          at(t, () => {
            sfx.lose();
            if (ev.player === me) buzz([100, 60, 200]);
            showSplash('KNOCKED OUT!', 'red', `${nameOf(ev.player)} hit 25 cards`);
            showBubble(ev.player, '💀 OUT', 'bad', 3000);
          });
          t += 900;
          break;

        case 'swap': {
          const other = ev.a === me ? ev.b : ev.b === me ? ev.a : null;
          at(t, () => {
            sfx.reverse();
            showBubble(ev.a, 'Swapped! 🔄', 'info');
            showBubble(ev.b, 'Swapped! 🔄', 'info');
          });
          if (other !== null) receiveFrom(other);
          t += 600;
          break;
        }

        case 'passHands': {
          at(t, () => {
            sfx.reverse();
            showSplash(view.mode === 'spin' ? 'TRADE HANDS!' : 'PASS HANDS!', undefined, 'Everyone passes their hand along');
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
          t += 700;
          break;
        }

        case 'discardAll':
        case 'wheelDiscard':
          at(t, () => showBubble(ev.player, `−${ev.count} card${ev.count === 1 ? '' : 's'}`, 'good'));
          toPile(ev.player, ev.count);
          t += Math.min(ev.count, 6) * 90 + flightMs * 0.6;
          break;

        case 'roulette':
          at(t, () => {
            sfx.wild();
            showSplash(COLOR_NAMES[ev.color].toUpperCase(), ev.color, `${nameOf(ev.player)} flips until it shows up`);
          });
          t += 650;
          break;

        // ── Flip ──
        case 'flip':
          at(t, () => {
            sfx.wild();
            showSplash(ev.side === 'dark' ? 'DARK SIDE!' : 'LIGHT SIDE!', undefined, 'Everything flips over');
          });
          t += 700;
          break;

        // ── Attack ──
        case 'launch':
          at(t, () => {
            setLauncherShots((x) => x + 1);
            if (ev.count === 0) {
              sfx.click();
              showBubble(ev.player, 'Phew! Nothing 😅', 'good', 1300);
            } else {
              sfx.plus(Math.min(ev.count, 6));
              showBubble(ev.player, `Launched ${ev.count}! 💥`, 'bad');
            }
          });
          t += ev.count === 0 ? 350 : 150;
          break;

        // ── Spin ──
        case 'spin': {
          const spin = { spinner: ev.player, segment: ev.segment };
          at(t, () => {
            sfx.deal();
            setWheelSpin({ ...spin, id: ++uid.current });
          });
          at(t + WHEEL_SPIN_MS, () => {
            sfx.wild();
            showSplash(WHEEL_INFO[ev.segment].name.toUpperCase() + '!', undefined, WHEEL_INFO[ev.segment].text);
          });
          at(t + WHEEL_SPIN_MS + 1300, () =>
            setWheelSpin((w) => (w?.segment === spin.segment && w.spinner === spin.spinner ? null : w)),
          );
          t += WHEEL_SPIN_MS + 500;
          break;
        }

        case 'showHand':
          at(t, () => showReveal({ kind: 'show', player: ev.player, cards: ev.cards }, 3800));
          t += 900;
          break;

        case 'war':
          at(t, () => {
            sfx.challenge();
            showReveal({ kind: 'war', plays: ev.plays, winner: ev.winner }, 4200);
          });
          if (ev.winner !== null) {
            const w = ev.winner;
            const count = ev.plays.find((p) => p.player === w)?.cards.length ?? 1;
            at(t + 1600, () => showBubble(w, 'Wins the War! ⚔️', 'good', 2000));
            t += 1600;
            toPile(w, count);
          }
          t += 900;
          break;

        case 'unoSpinCall':
          at(t, () => {
            sfx.uno();
            showBubble(ev.player, 'NUNO SPIN!', 'uno', 2000);
            showSplash('NUNO SPIN!', 'yellow', `${nameOf(ev.player)} called it first`);
          });
          t += 400;
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

    if (myTurnNow && !wasMyTurn.current) at(t, yourTurn);
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
