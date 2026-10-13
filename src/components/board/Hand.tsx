import { forwardRef, memo, useCallback, useEffect, useRef, useState } from 'react';
import type { Card, Side } from '../../game/types';
import { cardLabel } from '../../game/cards';
import { CARD_RATIO, CardView } from '../CardView';
import { sfx } from '../../lib/sound';

interface Props {
  cards: Card[];
  cw: number;
  maxWidth: number;
  bottom: number;
  hidden: Set<string>;
  playable: Set<string>;
  myTurn: boolean;
  /** Dim the cards you can't play right now. */
  dimOthers: boolean;
  /** The card you just drew and may play. */
  highlightId: string | null;
  side?: Side;
  /** Touch screens: tap once to pick a card up, tap again to play it. */
  touch: boolean;
  registerCard: (id: string, el: HTMLElement | null) => void;
  onPlay: (card: Card, el: HTMLElement) => void;
  /** What a card does, for the hover / tap help ("Next player draws 2"). */
  describe?: (card: Card) => { name: string; text: string } | null;
}

/** Cards can't overlap more than this before the hand turns into a scrollable strip. */
const MIN_SPACING = 0.36;

/**
 * Your hand, fanned along the bottom of the table. Cards glide between spots
 * with CSS transitions (they run off the main thread, so a busy phone doesn't
 * stutter), and each card only re-renders when something about it changes.
 */
export const Hand = forwardRef<HTMLDivElement, Props>(function Hand(
  { cards, cw, maxWidth, bottom, hidden, playable, myTurn, dimOthers, highlightId, side, touch, registerCard, onPlay, describe },
  ref,
) {
  const [picked, setPicked] = useState<string | null>(null);
  const n = cards.length;
  const ch = cw * CARD_RATIO;
  const mid = (n - 1) / 2;

  // Forget the picked-up card when it leaves the hand.
  useEffect(() => {
    if (picked && !cards.some((c) => c.id === picked)) setPicked(null);
  }, [cards, picked]);

  // When your turn starts, the playable cards rise in a quick wave, left to right.
  // (Set during render, so the stagger is there in the same frame the cards start to move.)
  const [turnSeen, setTurnSeen] = useState(myTurn);
  const [wave, setWave] = useState(false);
  if (myTurn !== turnSeen) {
    setTurnSeen(myTurn);
    setWave(myTurn);
  }
  useEffect(() => {
    if (!wave) return;
    const t = setTimeout(() => setWave(false), 700);
    return () => clearTimeout(t);
  }, [wave]);

  // Big hands fan flatter so the edge cards don't tip into the controls.
  const rotStep = Math.min(3.4, 26 / Math.max(n, 1));
  const spill = ch * Math.sin((mid * rotStep * Math.PI) / 180);
  const fitted = n <= 1 ? 0 : Math.min(cw * 0.74, (maxWidth - cw - spill * 2) / (n - 1));
  // On touch screens, never squash cards into slivers: scroll instead.
  const scroll = touch && n > 1 && fitted < cw * MIN_SPACING;
  const spacing = scroll ? cw * MIN_SPACING : fitted;
  const total = cw + spacing * Math.max(0, n - 1);
  const curve = scroll ? 0 : Math.min(cw * 0.2, n * 2.2);
  const lift = cw * 0.2;

  // Touch: the first tap picks a card up and says what it does; the second plays it.
  // You can pick cards up to read them even when it isn't your turn.
  const tap = (card: Card, el: HTMLElement) => {
    if (!touch || (picked === card.id && myTurn)) {
      setPicked(null);
      if (myTurn) onPlay(card, el);
      return;
    }
    if (picked === card.id) {
      setPicked(null);
      return;
    }
    sfx.hover();
    setPicked(card.id);
  };
  // One stable handler for every card, so the cards themselves can skip re-rendering.
  const tapRef = useRef(tap);
  tapRef.current = tap;
  const onTap = useCallback((card: Card, el: HTMLElement) => tapRef.current(card, el), []);

  const slots = cards.map((card, i) => {
    const isPlayable = playable.has(card.id);
    const isDrawn = card.id === highlightId;
    const isPicked = card.id === picked;
    const rot = scroll ? 0 : (i - mid) * rotStep;
    const arc = mid > 0 && !scroll ? ((i - mid) / mid) ** 2 * curve : 0;
    const raise = isPicked ? -cw * 0.55 : isDrawn ? -cw * 0.34 : isPlayable ? -lift : 0;
    return (
      <HandCard
        key={card.id}
        card={card}
        x={i * spacing}
        y={arc + raise}
        rot={isPicked ? 0 : rot}
        layoutRot={rot}
        z={isPicked ? 300 : i + 1}
        delay={wave ? Math.min(i, 14) * 30 : 0}
        picked={isPicked}
        playable={isPlayable}
        hidden={hidden.has(card.id)}
        dim={dimOthers && !isPlayable}
        myTurn={myTurn}
        touch={touch}
        cw={cw}
        side={side}
        help={describe?.(card) ?? null}
        registerCard={registerCard}
        onTap={onTap}
      />
    );
  });

  if (scroll) {
    return (
      <div
        className="hand-scroll nice-scroll absolute inset-x-0 z-30 overflow-x-auto overflow-y-hidden"
        style={{ bottom, height: ch + cw * 0.75, paddingTop: cw * 0.75 }}
      >
        <div ref={ref} className="relative mx-auto" style={{ width: total + 16, height: ch, paddingLeft: 8 }}>
          <div className="absolute inset-y-0 left-2" style={{ width: total }}>
            {slots}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="absolute left-1/2 z-30" style={{ bottom, width: Math.max(total, cw), height: ch, transform: 'translateX(-50%)' }}>
      {slots}
    </div>
  );
});

interface CardProps {
  card: Card;
  x: number;
  y: number;
  rot: number;
  /** The tilt the card has in the fan (flights land at it). */
  layoutRot: number;
  z: number;
  /** Staggers the move (ms), for the wave at the start of your turn. */
  delay: number;
  picked: boolean;
  playable: boolean;
  hidden: boolean;
  dim: boolean;
  myTurn: boolean;
  touch: boolean;
  cw: number;
  side?: Side;
  help: { name: string; text: string } | null;
  registerCard: (id: string, el: HTMLElement | null) => void;
  onTap: (card: Card, el: HTMLElement) => void;
}

const HandCard = memo(
  function HandCard({ card, x, y, rot, layoutRot, z, delay, picked, playable, hidden, dim, myTurn, touch, cw, side, help, registerCard, onTap }: CardProps) {
    return (
      <div
        className="hand-slot absolute bottom-0 left-0"
        style={{
          zIndex: z,
          transformOrigin: '50% 100%',
          transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${picked ? 1.12 : 1})`,
          transitionDelay: delay ? `${delay}ms` : undefined,
        }}
      >
        {picked && (
          <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 flex w-max max-w-[220px] -translate-x-1/2 flex-col items-center gap-1 animate-popIn">
            {help && (
              <span className="font-body rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] px-2 py-1 text-center text-[11.5px] font-semibold leading-tight text-[var(--soft)] shadow-[0_2px_0_var(--ink)]">
                <b className="font-ui text-xs text-[var(--ink)]">{help.name}</b>
                <br />
                {help.text}
              </span>
            )}
            <span
              className={`font-ui whitespace-nowrap rounded-full border-2 border-[var(--ink)] px-2 text-xs leading-6 shadow-[0_2px_0_var(--ink)] ${
                playable ? 'bg-[var(--yellow)] text-[var(--ink)]' : 'bg-[var(--surface)] text-[var(--muted)]'
              }`}
            >
              {!myTurn ? 'Not your turn' : playable ? 'Tap again to play' : 'Can’t play this'}
            </span>
          </span>
        )}
        {!touch && help && (
          <span className="card-tip font-body absolute bottom-full left-1/2 z-10 mb-6 w-max max-w-[220px] rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] px-2 py-1 text-center text-[11px] font-semibold leading-tight text-[var(--soft)] shadow-[0_2px_0_var(--ink)]">
            <b className="font-ui text-xs text-[var(--ink)]">{help.name}</b>
            <br />
            {help.text}
          </span>
        )}
        <button
          type="button"
          ref={(el) => registerCard(card.id, el)}
          data-card-w={cw}
          data-rot={layoutRot}
          disabled={!myTurn && !touch}
          onClick={(e) => onTap(card, e.currentTarget)}
          aria-label={`${cardLabel(card)}${playable ? ' (playable)' : ''}`}
          className={`hand-card block rounded-[10%/6.5%] p-0 ${playable ? 'is-playable' : ''}`}
          style={{ visibility: hidden ? 'hidden' : 'visible' }}
        >
          <CardView card={card} side={side} width={cw} glow={playable} dim={dim} />
        </button>
      </div>
    );
  },
  (a, b) =>
    a.card.id === b.card.id &&
    a.card.color === b.card.color &&
    a.card.value === b.card.value &&
    a.x === b.x &&
    a.y === b.y &&
    a.rot === b.rot &&
    a.layoutRot === b.layoutRot &&
    a.z === b.z &&
    a.delay === b.delay &&
    a.picked === b.picked &&
    a.playable === b.playable &&
    a.hidden === b.hidden &&
    a.dim === b.dim &&
    a.myTurn === b.myTurn &&
    a.touch === b.touch &&
    a.cw === b.cw &&
    a.side === b.side &&
    a.help?.text === b.help?.text &&
    a.registerCard === b.registerCard &&
    a.onTap === b.onTap,
);
