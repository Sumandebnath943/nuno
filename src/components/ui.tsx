import React, { useEffect } from 'react';
import { CARD_COLORS, INK } from '../lib/theme';
import type { Color } from '../game/types';

export const AVATARS = ['😎', '🦄', '🦊', '🐉', '🤖', '🍕', '🚀', '🐼', '🥷', '👾', '🦁', '👑', '🐸', '🐙', '🦖', '🌮'];

const LOGO_TILES: { letter: string; color: Color; rot: number; dy: number }[] = [
  { letter: 'N', color: 'red', rot: -9, dy: 4 },
  { letter: 'U', color: 'yellow', rot: 6, dy: -4 },
  { letter: 'N', color: 'green', rot: -5, dy: 6 },
  { letter: 'O', color: 'blue', rot: 8, dy: -2 },
];

/** The NUNO logo: four letter "cards", one per colour. */
export function Logo({ className = '', animated = true }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 430 150" className={className} role="img" aria-label="NUNO">
      {LOGO_TILES.map((t, i) => {
        const cx = 60 + i * 103;
        const cy = 75 + t.dy;
        return (
          <g key={i} transform={`translate(${cx} ${cy}) rotate(${t.rot})`}>
            <g className={animated ? 'animate-bob' : ''} style={{ animationDelay: `${i * 0.18}s` }}>
              <rect x="-46" y="-58" width="92" height="122" rx="14" fill={INK} transform="translate(4 7)" />
              <rect x="-46" y="-58" width="92" height="122" rx="14" fill="#fff" stroke={INK} strokeWidth="4" />
              <rect x="-39" y="-51" width="78" height="108" rx="9" fill={`url(#nf-${t.color})`} />
              <ellipse rx="30" ry="48" transform="rotate(30)" fill="rgba(255,255,255,0.22)" />
              <g style={{ fontFamily: 'var(--font-display)' }} textAnchor="middle" fontSize="82">
                <text x="3" y="34" fill={INK}>
                  {t.letter}
                </text>
                <text x="0" y="30" fill="#fff" stroke={INK} strokeWidth="9" strokeLinejoin="round" paintOrder="stroke">
                  {t.letter}
                </text>
              </g>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  /** Dim colour of the backdrop. */
  backdrop?: string;
}

export function Modal({ open, onClose, children, className = 'max-w-md', backdrop = 'rgba(10, 8, 30, 0.72)' }: ModalProps) {
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      style={{ background: backdrop, backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`panel relative w-full max-h-[94dvh] flex flex-col animate-popIn ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="icon-btn !h-9 !min-w-9 !px-0 text-lg" aria-label="Close">
      ✕
    </button>
  );
}

/** Colour dot + name, used wherever the active colour is mentioned. */
export function ColorChip({ color, className = '' }: { color: Color; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-0.5 font-display text-white ${className}`}
      style={{ background: CARD_COLORS[color].base, borderColor: INK, textShadow: `0 1px 0 ${INK}` }}
    >
      {color.toUpperCase()}
    </span>
  );
}
