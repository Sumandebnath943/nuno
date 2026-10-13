import { forwardRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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

/** Your hand, fanned along the bottom of the table. */
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

  const slots = cards.map((card, i) => {
    const isPlayable = playable.has(card.id);
    const isDrawn = card.id === highlightId;
    const isPicked = card.id === picked;
    const rot = scroll ? 0 : (i - mid) * rotStep;
    const arc = mid > 0 && !scroll ? ((i - mid) / mid) ** 2 * curve : 0;
    const raise = isPicked ? -cw * 0.55 : isDrawn ? -cw * 0.34 : isPlayable ? -lift : 0;
    const help = describe?.(card) ?? null;
    return (
      <motion.div
        key={card.id}
        className="hand-slot absolute bottom-0 left-0"
        style={{ zIndex: isPicked ? 300 : i + 1, transformOrigin: '50% 100%' }}
        initial={false}
        animate={{ x: i * spacing, y: arc + raise, rotate: isPicked ? 0 : rot, scale: isPicked ? 1.12 : 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 40, mass: 0.8 }}
      >
        {isPicked && (
          <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 flex w-max max-w-[220px] -translate-x-1/2 flex-col items-center gap-1 animate-popIn">
            {help && (
              <span className="rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] px-2 py-1 text-center text-[11px] font-semibold leading-tight text-[var(--soft)] shadow-[0_2px_0_var(--ink)]">
                <b className="font-display text-xs text-[var(--ink)]">{help.name}</b>
                <br />
                {help.text}
              </span>
            )}
            <span
              className={`font-display whitespace-nowrap rounded-full border-2 border-[var(--ink)] px-2 text-xs leading-6 shadow-[0_2px_0_var(--ink)] ${
                isPlayable ? 'bg-[var(--yellow)] text-[var(--ink)]' : 'bg-[var(--surface)] text-[var(--muted)]'
              }`}
            >
              {!myTurn ? 'Not your turn' : isPlayable ? 'Tap again to play' : 'Can’t play this'}
            </span>
          </span>
        )}
        {!touch && help && (
          <span className="card-tip absolute bottom-full left-1/2 z-10 mb-6 w-max max-w-[220px] rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] px-2 py-1 text-center text-[11px] font-semibold leading-tight text-[var(--soft)] shadow-[0_2px_0_var(--ink)]">
            <b className="font-display text-xs text-[var(--ink)]">{help.name}</b>
            <br />
            {help.text}
          </span>
        )}
        <button
          type="button"
          ref={(el) => registerCard(card.id, el)}
          data-card-w={cw}
          data-rot={rot}
          disabled={!myTurn && !touch}
          onClick={(e) => tap(card, e.currentTarget)}
          aria-label={`${cardLabel(card)}${isPlayable ? ' (playable)' : ''}`}
          className={`hand-card block rounded-[10%/6.5%] p-0 ${isPlayable ? 'is-playable' : ''}`}
          style={{ visibility: hidden.has(card.id) ? 'hidden' : 'visible' }}
        >
          <CardView card={card} side={side} width={cw} glow={isPlayable} dim={dimOthers && !isPlayable} />
        </button>
      </motion.div>
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
    <div
      ref={ref}
      className="absolute left-1/2 z-30"
      style={{ bottom, width: Math.max(total, cw), height: ch, transform: 'translateX(-50%)' }}
    >
      {slots}
    </div>
  );
});
