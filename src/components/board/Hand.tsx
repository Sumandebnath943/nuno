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
}

/** Cards can't overlap more than this before the hand turns into a scrollable strip. */
const MIN_SPACING = 0.36;

/** Your hand, fanned along the bottom of the table. */
export const Hand = forwardRef<HTMLDivElement, Props>(function Hand(
  { cards, cw, maxWidth, bottom, hidden, playable, myTurn, dimOthers, highlightId, side, touch, registerCard, onPlay },
  ref,
) {
  const [picked, setPicked] = useState<string | null>(null);
  const n = cards.length;
  const ch = cw * CARD_RATIO;
  const mid = (n - 1) / 2;

  // Forget the picked-up card when the turn moves on or it leaves the hand.
  useEffect(() => {
    if (picked && (!myTurn || !cards.some((c) => c.id === picked))) setPicked(null);
  }, [myTurn, cards, picked]);

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

  const tap = (card: Card, el: HTMLElement) => {
    if (!touch || picked === card.id) {
      setPicked(null);
      onPlay(card, el);
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
          <span
            className={`font-display pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-[var(--ink)] px-2 text-xs leading-6 shadow-[0_2px_0_var(--ink)] animate-popIn ${
              isPlayable ? 'bg-[var(--yellow)] text-[var(--ink)]' : 'bg-white text-[#6b6385]'
            }`}
          >
            {isPlayable ? 'Tap again to play' : 'Can’t play this'}
          </span>
        )}
        <button
          type="button"
          ref={(el) => registerCard(card.id, el)}
          data-card-w={cw}
          data-rot={rot}
          disabled={!myTurn}
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
