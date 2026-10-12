import { forwardRef } from 'react';
import type { Card, Color } from '../../game/types';
import { CARD_RATIO, CardView } from '../CardView';
import { CARD_COLORS } from '../../lib/theme';
import { pileJitter } from './layout';

interface DeckProps {
  width: number;
  count: number;
  canDraw: boolean;
  onDraw: () => void;
  label?: boolean;
}

export const Deck = forwardRef<HTMLDivElement, DeckProps>(function Deck({ width, count, canDraw, onDraw, label = true }, ref) {
  const h = width * CARD_RATIO;
  const layers = count > 20 ? 3 : count > 6 ? 2 : count > 0 ? 1 : 0;
  return (
    <div className="relative flex flex-col items-center" style={{ width }}>
      <button
        type="button"
        onClick={onDraw}
        disabled={!canDraw}
        aria-label={canDraw ? 'Draw a card' : `Draw pile, ${count} cards`}
        className={`group relative block rounded-[10%/6.5%] ${canDraw ? 'cursor-pointer animate-bob' : 'cursor-default'}`}
        style={{ width, height: h }}
      >
        {/* thickness of the pile */}
        {Array.from({ length: layers }).map((_, i) => (
          <div
            key={i}
            className="absolute left-0 top-0"
            style={{ transform: `translate(${(layers - i) * 2.5}px, ${(layers - i) * 3}px)` }}
          >
            <CardView faceDown width={width} />
          </div>
        ))}
        <div
          ref={ref}
          data-card-w={width}
          className="absolute left-0 top-0 transition-transform group-hover:-translate-y-1"
          style={{ width, height: h }}
        >
          {count > 0 && <CardView faceDown width={width} glow={canDraw} />}
        </div>
        <span
          className="font-display absolute -bottom-2 -right-3 z-10 rounded-full border-[2.5px] border-[var(--ink)] bg-white px-2 text-sm leading-6 text-[var(--ink)] shadow-[0_2px_0_var(--ink)]"
          title="Cards left in the draw pile"
        >
          {count}
        </span>
      </button>
      {label && (
        <span
          className={`font-display mt-3 whitespace-nowrap rounded-full px-2.5 text-xs uppercase leading-5 tracking-wider ${
            canDraw ? 'bg-[var(--yellow)] text-[var(--ink)] border-2 border-[var(--ink)]' : 'text-white/60'
          }`}
        >
          {canDraw ? (width < 80 ? 'Draw!' : 'Tap to draw') : width < 80 ? 'Deck' : 'Draw pile'}
        </span>
      )}
    </div>
  );
});

interface DiscardProps {
  width: number;
  cards: Card[];
  hidden: Set<string>;
  color: Color | null;
  label?: boolean;
}

export const Discard = forwardRef<HTMLDivElement, DiscardProps>(function Discard(
  { width, cards, hidden, color, label = true },
  ref,
) {
  const h = width * CARD_RATIO;
  const visible = cards.filter((c) => !hidden.has(c.id));
  return (
    <div className="relative flex flex-col items-center" style={{ width }}>
      <div ref={ref} data-card-w={width} className="relative" style={{ width, height: h }}>
        {/* glow in the active colour */}
        <div
          className="absolute -inset-5 rounded-[50%] blur-xl transition-colors duration-500"
          style={{ background: color ? CARD_COLORS[color].light : 'rgba(255,255,255,0.35)', opacity: 0.55 }}
        />
        {visible.map((c) => {
          const j = pileJitter(c.id);
          return (
            <div
              key={c.id}
              className="absolute left-0 top-0"
              style={{ transform: `translate(${j.dx}px, ${j.dy}px) rotate(${j.rot}deg)` }}
            >
              <CardView card={c} width={width} />
            </div>
          );
        })}
      </div>
      {label && (
        <span
          className="font-display mt-3 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-[var(--ink)] px-2.5 text-xs uppercase leading-5 tracking-wider text-white shadow-[0_2px_0_var(--ink)] transition-colors duration-500"
          style={{ background: color ? CARD_COLORS[color].base : '#6a55d9', textShadow: '0 1px 0 var(--ink)' }}
        >
          {color ? (width < 80 ? color : `${color} to play`) : width < 80 ? '…' : 'Picking colour…'}
        </span>
      )}
    </div>
  );
});
