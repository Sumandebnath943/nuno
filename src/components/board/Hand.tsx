import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { Card } from '../../game/types';
import { cardLabel } from '../../game/cards';
import { CARD_RATIO, CardView } from '../CardView';

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
  registerCard: (id: string, el: HTMLElement | null) => void;
  onPlay: (card: Card, el: HTMLElement) => void;
}

/** Your hand, fanned along the bottom of the table. */
export const Hand = forwardRef<HTMLDivElement, Props>(function Hand(
  { cards, cw, maxWidth, bottom, hidden, playable, myTurn, dimOthers, highlightId, registerCard, onPlay },
  ref,
) {
  const n = cards.length;
  const ch = cw * CARD_RATIO;
  const mid = (n - 1) / 2;
  // Big hands fan flatter so the edge cards don't tip into the controls.
  const rotStep = Math.min(3.4, 26 / Math.max(n, 1));
  const spill = ch * Math.sin((mid * rotStep * Math.PI) / 180);
  const spacing = n <= 1 ? 0 : Math.min(cw * 0.74, (maxWidth - cw - spill * 2) / (n - 1));
  const total = cw + spacing * Math.max(0, n - 1);
  const curve = Math.min(cw * 0.2, n * 2.2);

  return (
    <div
      ref={ref}
      className="absolute left-1/2 z-30"
      style={{ bottom, width: Math.max(total, cw), height: ch, transform: 'translateX(-50%)' }}
    >
      {cards.map((card, i) => {
        const isPlayable = playable.has(card.id);
        const isDrawn = card.id === highlightId;
        const rot = (i - mid) * rotStep;
        const arc = mid > 0 ? ((i - mid) / mid) ** 2 * curve : 0;
        const lift = isDrawn ? -cw * 0.34 : isPlayable ? -cw * 0.2 : 0;
        return (
          <motion.div
            key={card.id}
            className="hand-slot absolute bottom-0 left-0"
            style={{ zIndex: i + 1, transformOrigin: '50% 100%' }}
            initial={false}
            animate={{ x: i * spacing, y: arc + lift, rotate: rot }}
            transition={{ type: 'spring', stiffness: 520, damping: 40, mass: 0.8 }}
          >
            <button
              type="button"
              ref={(el) => registerCard(card.id, el)}
              data-card-w={cw}
              data-rot={rot}
              disabled={!myTurn}
              onClick={(e) => onPlay(card, e.currentTarget)}
              aria-label={`${cardLabel(card)}${isPlayable ? ' (playable)' : ''}`}
              className={`hand-card block rounded-[10%/6.5%] p-0 ${isPlayable ? 'is-playable' : ''}`}
              style={{ visibility: hidden.has(card.id) ? 'hidden' : 'visible' }}
            >
              <CardView card={card} width={cw} glow={isPlayable} dim={dimOthers && !isPlayable} />
            </button>
          </motion.div>
        );
      })}
    </div>
  );
});
