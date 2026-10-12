import React from 'react';
import type { Card, Color } from '../game/types';
import { CARD_COLORS, INK } from '../lib/theme';
import { Modal } from './ui';
import { sfx } from '../lib/sound';

interface Props {
  open: boolean;
  title?: string;
  /** Your hand, to show how many cards of each colour you hold. */
  hand?: Card[];
  /** The wild being played (not counted). */
  exclude?: string;
  onSelect: (color: Color) => void;
  onCancel?: () => void;
}

const R = 100;
const GAP = 5;
const WEDGES: { color: Color; d: string; dx: number; dy: number; lx: number; ly: number }[] = [
  { color: 'red', d: `M0 0 L0 ${-R} A ${R} ${R} 0 0 0 ${-R} 0 Z`, dx: -GAP, dy: -GAP, lx: -46, ly: -40 },
  { color: 'blue', d: `M0 0 L${R} 0 A ${R} ${R} 0 0 0 0 ${-R} Z`, dx: GAP, dy: -GAP, lx: 46, ly: -40 },
  { color: 'yellow', d: `M0 0 L${-R} 0 A ${R} ${R} 0 0 0 0 ${R} Z`, dx: -GAP, dy: GAP, lx: -46, ly: 52 },
  { color: 'green', d: `M0 0 L0 ${R} A ${R} ${R} 0 0 0 ${R} 0 Z`, dx: GAP, dy: GAP, lx: 46, ly: 52 },
];

export const ColorPickerModal: React.FC<Props> = ({ open, title = 'Pick a colour', hand = [], exclude, onSelect, onCancel }) => {
  const counts: Record<Color, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
  for (const c of hand) if (c.id !== exclude && c.color !== 'wild') counts[c.color] += 1;
  const best = Math.max(...Object.values(counts));

  return (
    <Modal open={open} onClose={onCancel} className="max-w-sm">
      <div className="p-5 text-center sm:p-6">
        <h2 className="font-display text-3xl">{title}</h2>
        <p className="mt-1 text-sm font-medium text-[#6b6385]">
          The next player has to match it. Numbers show how many you hold.
        </p>

        <svg viewBox="-112 -112 224 224" className="mx-auto mt-4 w-60 overflow-visible sm:w-64" role="group" aria-label="Colours">
          <circle r={R + 8} fill={INK} transform="translate(0 7)" />
          {WEDGES.map((w) => (
            <g
              key={w.color}
              role="button"
              tabIndex={0}
              aria-label={`${w.color}, you hold ${counts[w.color]}`}
              className="wedge cursor-pointer outline-none"
              onClick={() => {
                sfx.click();
                onSelect(w.color);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelect(w.color);
              }}
              style={{ ['--dx' as string]: `${w.dx}px`, ['--dy' as string]: `${w.dy}px` }}
            >
              <path d={w.d} fill={CARD_COLORS[w.color].base} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
              <path d={w.d} fill="url(#n-sheen)" />
              <text
                x={w.lx}
                y={w.ly}
                textAnchor="middle"
                fontSize="40"
                style={{ fontFamily: 'var(--font-display)' }}
                fill="#fff"
                stroke={INK}
                strokeWidth="6"
                paintOrder="stroke"
              >
                {counts[w.color]}
              </text>
              {counts[w.color] === best && best > 0 && (
                <text
                  x={w.lx}
                  y={w.ly + 18}
                  textAnchor="middle"
                  fontSize="12"
                  style={{ fontFamily: 'var(--font-display)' }}
                  fill="#fff"
                  stroke={INK}
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  MOST
                </text>
              )}
            </g>
          ))}
          <circle r="20" fill="#fff" stroke={INK} strokeWidth="4" />
          <text y="7" textAnchor="middle" fontSize="18" style={{ fontFamily: 'var(--font-display)' }} fill={INK}>
            W
          </text>
        </svg>

        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-5 text-sm font-semibold text-[#6b6385] underline underline-offset-2 hover:text-[var(--ink)]"
          >
            Cancel — keep the card
          </button>
        )}
      </div>
    </Modal>
  );
};
