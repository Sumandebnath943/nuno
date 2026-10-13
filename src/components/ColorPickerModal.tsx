import React from 'react';
import type { Card, Color, Side } from '../game/types';
import { INK } from '../lib/theme';
import { useTheme } from '../themes';
import { Modal } from './ui';
import { sfx } from '../lib/sound';

interface Props {
  open: boolean;
  title?: string;
  subtitle?: string;
  /** UNO Flip: the Dark Side has its own four colours. */
  side?: Side;
  /** Your hand, to show how many cards of each colour you hold. */
  hand?: Card[];
  /** The wild being played (not counted). */
  exclude?: string;
  onSelect: (color: Color) => void;
  onCancel?: () => void;
}

const R = 100;
const GAP = 5;
const SLOTS = [
  { d: `M0 0 L0 ${-R} A ${R} ${R} 0 0 0 ${-R} 0 Z`, dx: -GAP, dy: -GAP, lx: -46, ly: -40 },
  { d: `M0 0 L${R} 0 A ${R} ${R} 0 0 0 0 ${-R} Z`, dx: GAP, dy: -GAP, lx: 46, ly: -40 },
  { d: `M0 0 L${-R} 0 A ${R} ${R} 0 0 0 0 ${R} Z`, dx: -GAP, dy: GAP, lx: -46, ly: 52 },
  { d: `M0 0 L0 ${R} A ${R} ${R} 0 0 0 ${R} 0 Z`, dx: GAP, dy: GAP, lx: 46, ly: 52 },
];
/** Same layout as the quarters on a Wild card. */
const LAYOUT: Record<Side, Color[]> = {
  light: ['red', 'blue', 'yellow', 'green'],
  dark: ['pink', 'teal', 'purple', 'orange'],
};

export const ColorPickerModal: React.FC<Props> = ({
  open,
  title = 'Pick a colour',
  subtitle = 'The next player has to match it. Numbers show how many you hold.',
  side = 'light',
  hand = [],
  exclude,
  onSelect,
  onCancel,
}) => {
  const pal = useTheme().cardColors;
  const alias = useTheme().colorAlias;
  const WEDGES = SLOTS.map((slot, i) => ({ ...slot, color: LAYOUT[side][i] }));
  const counts = new Map<Color, number>(WEDGES.map((w) => [w.color, 0]));
  for (const c of hand) {
    const k = c.color as Color;
    if (c.id !== exclude && counts.has(k)) counts.set(k, counts.get(k)! + 1);
  }
  const best = Math.max(...counts.values());

  return (
    <Modal open={open} onClose={onCancel} className="max-w-sm">
      <div className="p-5 text-center sm:p-6">
        <h2 className="font-display text-2xl sm:text-3xl">{title}</h2>
        <p className="mt-1 text-sm font-medium text-[var(--muted)]">{subtitle}</p>

        <svg viewBox="-112 -112 224 224" className="animate-wheelIn mx-auto mt-4 w-60 overflow-visible sm:w-64" role="group" aria-label="Colours">
          <circle r={R + 8} fill={INK} transform="translate(0 7)" />
          {WEDGES.map((w, i) => (
            <g key={w.color} className="wedge-in" style={{ animationDelay: `${0.12 + i * 0.06}s` }}>
            <g
              role="button"
              tabIndex={0}
              aria-label={`${w.color}${alias?.[w.color] ? ` (${alias[w.color]})` : ''}, you hold ${counts.get(w.color)!}`}
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
              <path d={w.d} fill={pal[w.color].base} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
              <path d={w.d} fill="url(#n-sheen)" />
              {counts.get(w.color)! === best && best > 0 && <path d={w.d} fill="#fff" className="most-glow pointer-events-none" style={{ mixBlendMode: 'soft-light' }} />}
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
                {counts.get(w.color)!}
              </text>
              {counts.get(w.color)! === best && best > 0 && (
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
            className="mt-5 text-sm font-semibold text-[var(--muted)] underline underline-offset-2 hover:text-[var(--ink)]"
          >
            Cancel — keep the card
          </button>
        )}
      </div>
    </Modal>
  );
};
