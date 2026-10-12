import React, { memo } from 'react';
import type { Card, Color } from '../game/types';
import { cardLabel } from '../game/cards';
import { CARD_COLORS, INK } from '../lib/theme';

// Every card is one 120×186 SVG (the real card ratio), so it stays crisp at any size.
export const CARD_RATIO = 186 / 120;

const SIZES = { xs: 38, sm: 56, md: 84, lg: 110, xl: 140 } as const;
export type CardSize = keyof typeof SIZES;

export interface CardViewProps {
  card?: Pick<Card, 'color' | 'value'> | null;
  faceDown?: boolean;
  size?: CardSize;
  /** Width in px (overrides `size`). */
  width?: number;
  glow?: boolean;
  dim?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const DISPLAY: React.CSSProperties = { fontFamily: 'var(--font-display)' };
const OVAL = { cx: 60, cy: 93, rx: 41, ry: 72, rot: 30 };

export const CardView = memo(function CardView({
  card,
  faceDown = false,
  size = 'md',
  width,
  glow = false,
  dim = false,
  className = '',
  style,
  onClick,
}: CardViewProps) {
  const w = width ?? SIZES[size];
  const showBack = faceDown || !card;
  return (
    <div
      onClick={onClick}
      role="img"
      aria-label={showBack ? 'Face-down card' : cardLabel(card)}
      className={`nuno-card ${glow ? 'is-glow' : ''} ${dim ? 'is-dim' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: w, height: w * CARD_RATIO, borderRadius: w * 0.1, ...style }}
    >
      <svg viewBox="0 0 120 186" width="100%" height="100%" aria-hidden="true">
        {showBack ? <Back /> : <Face card={card} />}
      </svg>
    </div>
  );
});

// ── faces ───────────────────────────────────────────────────

function Face({ card }: { card: Pick<Card, 'color' | 'value'> }) {
  const wild = card.color === 'wild';
  const c = wild ? '#fff' : CARD_COLORS[card.color as Color].base;
  return (
    <>
      <rect width="120" height="186" rx="12" fill="#fff" />
      <rect x="6" y="6" width="108" height="174" rx="8" fill={wild ? 'url(#nf-wild)' : `url(#nf-${card.color})`} />
      <path d="M6 14 Q6 6 14 6 H84 L6 100 Z" fill="url(#n-sheen)" />

      {card.value === 'wild' ? (
        <QuarteredOval />
      ) : (
        <ellipse
          cx={OVAL.cx}
          cy={OVAL.cy}
          rx={OVAL.rx}
          ry={OVAL.ry}
          transform={`rotate(${OVAL.rot} ${OVAL.cx} ${OVAL.cy})`}
          fill="#fff"
        />
      )}

      <g transform={`translate(${OVAL.cx} ${OVAL.cy})`}>
        <CenterGlyph value={card.value} color={c} />
      </g>

      <Corner value={card.value} />
      <g transform="rotate(180 60 93)">
        <Corner value={card.value} />
      </g>
    </>
  );
}

function CenterGlyph({ value, color }: { value: Card['value']; color: string }) {
  switch (value) {
    case 'skip':
      return <SkipGlyph color={color} />;
    case 'reverse':
      return <ReverseGlyph color={color} />;
    case 'draw2':
      return (
        <g transform="rotate(-8)">
          <MiniCard x={-9} y={9} color={color} />
          <MiniCard x={9} y={-9} color={color} />
        </g>
      );
    case 'wild4':
      return (
        <g>
          {(['blue', 'green', 'red', 'yellow'] as Color[]).map((col, i) => (
            <g key={col} transform={`translate(0 30) rotate(${-33 + i * 22}) translate(0 -36)`}>
              <MiniCard x={0} y={0} color={CARD_COLORS[col].base} />
            </g>
          ))}
        </g>
      );
    case 'wild':
      return null;
    default:
      return (
        <g style={DISPLAY} textAnchor="middle" fontSize="88">
          <text x="3" y="35" fill={INK}>
            {value}
          </text>
          <text x="0" y="31" fill={color} stroke={INK} strokeWidth="6" strokeLinejoin="round" paintOrder="stroke">
            {value}
          </text>
          {(value === '6' || value === '9') && (
            <rect x="-16" y="38" width="32" height="7" rx="3" fill={color} stroke={INK} strokeWidth="3" />
          )}
        </g>
      );
  }
}

function Corner({ value }: { value: Card['value'] }) {
  const text = (t: string, size = 30) => (
    <text
      x="21"
      y="39"
      textAnchor="middle"
      fontSize={size}
      style={DISPLAY}
      fill="#fff"
      stroke={INK}
      strokeWidth="5"
      strokeLinejoin="round"
      paintOrder="stroke"
    >
      {t}
    </text>
  );
  switch (value) {
    case 'skip':
      return (
        <g transform="translate(21 29) scale(0.36)">
          <SkipGlyph color="#fff" />
        </g>
      );
    case 'reverse':
      return (
        <g transform="translate(21 29) scale(0.36)">
          <ReverseGlyph color="#fff" />
        </g>
      );
    case 'draw2':
      return text('+2', 24);
    case 'wild4':
      return text('+4', 24);
    case 'wild':
      return (
        <g transform="translate(21 29)">
          <Quarters rx={10} ry={13} stroke={1.5} />
        </g>
      );
    default:
      return (
        <>
          {text(value)}
          {(value === '6' || value === '9') && (
            <rect x="14" y="43" width="14" height="4" rx="1.5" fill="#fff" stroke={INK} strokeWidth="1.5" />
          )}
        </>
      );
  }
}

// ── glyphs (centred on 0,0) ─────────────────────────────────

function SkipGlyph({ color }: { color: string }) {
  return (
    <g strokeLinecap="round" fill="none">
      <circle r="26" stroke={INK} strokeWidth="17" />
      <line x1="-18" y1="-18" x2="18" y2="18" stroke={INK} strokeWidth="17" />
      <circle r="26" stroke={color} strokeWidth="10" />
      <line x1="-18" y1="-18" x2="18" y2="18" stroke={color} strokeWidth="10" />
    </g>
  );
}

const ARROW = 'M -6 27 L 6 27 L 6 -3 L 16 -3 L 0 -28 L -16 -3 L -6 -3 Z';
function ReverseGlyph({ color }: { color: string }) {
  const p = { fill: color, stroke: INK, strokeWidth: 5, strokeLinejoin: 'round' as const, paintOrder: 'stroke' };
  return (
    <g transform="rotate(45)">
      <path d={ARROW} transform="translate(-13 3)" {...p} />
      <path d={ARROW} transform="translate(13 -3) rotate(180)" {...p} />
    </g>
  );
}

function MiniCard({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-14" y="-20" width="28" height="40" rx="4" fill="#fff" stroke={INK} strokeWidth="3" />
      <rect x="-10" y="-16" width="20" height="32" rx="2.5" fill={color} />
    </g>
  );
}

function Quarters({ rx, ry, stroke }: { rx: number; ry: number; stroke: number }) {
  return (
    <g>
      <path d={`M0 0 L0 ${-ry} A ${rx} ${ry} 0 0 0 ${-rx} 0 Z`} fill={CARD_COLORS.red.base} />
      <path d={`M0 0 L${rx} 0 A ${rx} ${ry} 0 0 0 0 ${-ry} Z`} fill={CARD_COLORS.blue.base} />
      <path d={`M0 0 L0 ${ry} A ${rx} ${ry} 0 0 0 ${rx} 0 Z`} fill={CARD_COLORS.green.base} />
      <path d={`M0 0 L${-rx} 0 A ${rx} ${ry} 0 0 0 0 ${ry} Z`} fill={CARD_COLORS.yellow.base} />
      <ellipse rx={rx} ry={ry} fill="none" stroke="#fff" strokeWidth={stroke} />
    </g>
  );
}

function QuarteredOval() {
  return (
    <g transform={`translate(${OVAL.cx} ${OVAL.cy}) rotate(${OVAL.rot})`}>
      <Quarters rx={OVAL.rx} ry={OVAL.ry} stroke={4} />
    </g>
  );
}

// ── back ────────────────────────────────────────────────────

function Back() {
  return (
    <>
      <rect width="120" height="186" rx="12" fill="#fff" />
      <rect x="5" y="5" width="110" height="176" rx="8.5" fill="#1d1828" />
      <ellipse
        cx={OVAL.cx}
        cy={OVAL.cy}
        rx={OVAL.rx + 1}
        ry={OVAL.ry + 2}
        transform={`rotate(${OVAL.rot} ${OVAL.cx} ${OVAL.cy})`}
        fill="url(#nb-red)"
      />
      <path d="M5 13 Q5 5 13 5 H80 L5 96 Z" fill="url(#n-sheen)" />
      <g transform="rotate(-20 60 93)" style={DISPLAY} textAnchor="middle" fontSize="38">
        <text x="62.5" y="109" fill={INK}>
          NUNO
        </text>
        <text x="60" y="106" fill="#ffd21f" stroke={INK} strokeWidth="6" strokeLinejoin="round" paintOrder="stroke">
          NUNO
        </text>
      </g>
    </>
  );
}

/** Shared gradients for every card. Rendered once at the app root. */
export function CardDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        {(Object.keys(CARD_COLORS) as Color[]).map((k) => (
          <linearGradient key={k} id={`nf-${k}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={CARD_COLORS[k].light} />
            <stop offset="0.5" stopColor={CARD_COLORS[k].base} />
            <stop offset="1" stopColor={CARD_COLORS[k].dark} />
          </linearGradient>
        ))}
        <linearGradient id="nf-wild" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a3346" />
          <stop offset="0.5" stopColor="#1d1828" />
          <stop offset="1" stopColor="#0d0b12" />
        </linearGradient>
        <radialGradient id="nb-red" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#ff5a5a" />
          <stop offset="1" stopColor="#c0141d" />
        </radialGradient>
        <linearGradient id="n-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
