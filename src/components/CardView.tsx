import React, { memo } from 'react';
import type { Card, CardValue, Color, Side } from '../game/types';
import { cardLabel } from '../game/cards';
import { CARD_COLORS, INK } from '../lib/theme';

// Every card is one 120×186 SVG (the real card ratio), so it stays crisp at any size.
export const CARD_RATIO = 186 / 120;

const SIZES = { xs: 38, sm: 56, md: 84, lg: 110, xl: 140 } as const;
export type CardSize = keyof typeof SIZES;

type FaceProps = Pick<Card, 'color' | 'value'> & { spin?: boolean };

export interface CardViewProps {
  card?: FaceProps | null;
  faceDown?: boolean;
  /** UNO Flip: which side this face belongs to (Dark Side cards have black borders). */
  side?: Side;
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
const DARK_COLORS = new Set(['pink', 'teal', 'orange', 'purple']);

export const CardView = memo(function CardView({
  card,
  faceDown = false,
  side,
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
  const dark = !showBack && (side === 'dark' || DARK_COLORS.has(card.color) || card.value === 'wildDrawColor');
  return (
    <div
      onClick={onClick}
      role="img"
      aria-label={showBack ? 'Face-down card' : cardLabel(card)}
      className={`nuno-card ${glow ? 'is-glow' : ''} ${dim ? 'is-dim' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: w, height: w * CARD_RATIO, borderRadius: w * 0.1, ...style }}
    >
      <svg viewBox="0 0 120 186" width="100%" height="100%" aria-hidden="true">
        {showBack ? <Back /> : <Face card={card} dark={dark} />}
      </svg>
    </div>
  );
});

// ── faces ───────────────────────────────────────────────────

/** Wilds whose centre is the four-colour oval (the rest sit on a white oval). */
const QUARTERED = new Set<CardValue>([
  'wild',
  'wildReverse4',
  'wild6',
  'wild10',
  'wildRoulette',
  'wildDrawColor',
  'wildAllHit',
  'wildHitFire',
  'wildReverse',
  'wildSkip',
  'wildSkip2',
  'wildTargetDraw2',
  'wildSwap',
]);

function Face({ card, dark }: { card: FaceProps; dark: boolean }) {
  const wild = card.color === 'wild';
  const c = wild ? '#fff' : CARD_COLORS[card.color as Color].base;
  return (
    <>
      <rect width="120" height="186" rx="12" fill={dark ? '#141019' : '#fff'} />
      <rect x="6" y="6" width="108" height="174" rx="8" fill={wild ? 'url(#nf-wild)' : `url(#nf-${card.color})`} />
      <path d="M6 14 Q6 6 14 6 H84 L6 100 Z" fill="url(#n-sheen)" />

      {wild && QUARTERED.has(card.value) ? (
        <g transform={`translate(${OVAL.cx} ${OVAL.cy}) rotate(${OVAL.rot})`}>
          <Quarters rx={OVAL.rx} ry={OVAL.ry} stroke={4} dark={dark} />
        </g>
      ) : (
        <ellipse
          cx={OVAL.cx}
          cy={OVAL.cy}
          rx={OVAL.rx}
          ry={OVAL.ry}
          transform={`rotate(${OVAL.rot} ${OVAL.cx} ${OVAL.cy})`}
          fill={dark ? '#1d1828' : '#fff'}
        />
      )}

      {card.spin && <Swirl color={c} />}

      <g transform={`translate(${OVAL.cx} ${OVAL.cy})`}>
        <CenterGlyph value={card.value} color={c} />
      </g>

      <Corner value={card.value} dark={dark} />
      <g transform="rotate(180 60 93)">
        <Corner value={card.value} dark={dark} />
      </g>
    </>
  );
}

const outlined = { stroke: INK, strokeLinejoin: 'round' as const, paintOrder: 'stroke' };

function BigText({ text, color = '#fff', size = 64, y = 22 }: { text: string; color?: string; size?: number; y?: number }) {
  return (
    <g style={DISPLAY} textAnchor="middle" fontSize={size}>
      <text x="3" y={y + 4} fill={INK}>
        {text}
      </text>
      <text x="0" y={y} fill={color} strokeWidth={size * 0.09} {...outlined}>
        {text}
      </text>
    </g>
  );
}

function CenterGlyph({ value, color }: { value: CardValue; color: string }) {
  const ink = color;
  switch (value) {
    case 'skip':
    case 'wildSkip':
      return <SkipGlyph color={ink} />;
    case 'wildSkip2':
      return (
        <>
          <g transform="translate(-6 -6) scale(0.85)">
            <SkipGlyph color="#fff" />
          </g>
          <BigText text="2" size={44} y={46} />
        </>
      );
    case 'skipAll':
      return (
        <>
          <g transform="translate(0 -10) scale(0.85)">
            <SkipGlyph color={ink} />
          </g>
          <Pill text="ALL" y={34} color={ink} />
        </>
      );
    case 'reverse':
    case 'wildReverse':
      return <ReverseGlyph color={ink} />;
    case 'wildReverse4':
      return (
        <>
          <g transform="translate(0 -12) scale(0.8)">
            <ReverseGlyph color="#fff" />
          </g>
          <BigText text="+4" size={38} y={50} />
        </>
      );
    case 'draw1':
      return <MiniFan colors={[ink]} />;
    case 'draw2':
      return (
        <g transform="rotate(-8)">
          <MiniCard x={-9} y={9} color={ink} />
          <MiniCard x={9} y={-9} color={ink} />
        </g>
      );
    case 'draw4':
      return <MiniFan colors={[ink, ink, ink, ink]} />;
    case 'draw5':
      return <MiniFan colors={[ink, ink, ink, ink, ink]} />;
    case 'wild4':
    case 'wildDraw4':
      return <MiniFan colors={(['blue', 'green', 'red', 'yellow'] as Color[]).map((c) => CARD_COLORS[c].base)} />;
    case 'wildDraw2':
      return <MiniFan colors={[CARD_COLORS.blue.base, CARD_COLORS.red.base]} />;
    case 'wild6':
      return <BigText text="+6" size={70} />;
    case 'wild10':
      return <BigText text="+10" size={56} y={20} />;
    case 'wildDrawColor':
      return <BigText text="+?" size={64} />;
    case 'wildRoulette':
      return <RouletteGlyph />;
    case 'wildAllHit':
      return (
        <>
          <Burst color={CARD_COLORS.red.base} />
          <BigText text="ALL" size={26} y={-2} />
          <BigText text="HIT" size={26} y={22} />
        </>
      );
    case 'wildHitFire':
      return <FlameGlyph />;
    case 'hit2':
      return (
        <>
          <Burst color={ink} />
          <BigText text="2" size={52} y={18} />
        </>
      );
    case 'discardAll':
      return <DiscardAllGlyph color={ink} />;
    case 'tradeHands':
    case 'wildSwap':
      return <SwapGlyph color={value === 'wildSwap' ? '#fff' : ink} />;
    case 'wildTargetDraw2':
      return (
        <>
          <TargetGlyph />
          <BigText text="+2" size={30} y={52} />
        </>
      );
    case 'flip':
      return <FlipGlyph color={ink} />;
    case 'wild':
      return null;
    default:
      return (
        <g style={DISPLAY} textAnchor="middle" fontSize="88">
          <text x="3" y="35" fill={INK}>
            {value}
          </text>
          <text x="0" y="31" fill={ink} strokeWidth="6" {...outlined}>
            {value}
          </text>
          {(value === '6' || value === '9') && (
            <rect x="-16" y="38" width="32" height="7" rx="3" fill={ink} stroke={INK} strokeWidth="3" />
          )}
        </g>
      );
  }
}

/** Short corner labels; symbols get a mini glyph. */
const CORNER_TEXT: Partial<Record<CardValue, [string, number]>> = {
  draw1: ['+1', 24],
  draw2: ['+2', 24],
  draw4: ['+4', 24],
  draw5: ['+5', 24],
  wild4: ['+4', 24],
  wildDraw4: ['+4', 24],
  wildDraw2: ['+2', 24],
  wildReverse4: ['+4', 24],
  wild6: ['+6', 24],
  wild10: ['+10', 18],
  wildDrawColor: ['+?', 24],
  wildTargetDraw2: ['+2', 24],
  wildAllHit: ['HIT', 15],
  hit2: ['×2', 22],
  discardAll: ['ALL', 16],
};

function Corner({ value, dark }: { value: CardValue; dark: boolean }) {
  const label = CORNER_TEXT[value];
  if (label) return <CornerText text={label[0]} size={label[1]} />;
  const mini = (child: React.ReactNode) => <g transform="translate(21 29) scale(0.36)">{child}</g>;
  switch (value) {
    case 'skip':
    case 'wildSkip':
    case 'skipAll':
      return mini(<SkipGlyph color="#fff" />);
    case 'wildSkip2':
      return (
        <>
          {mini(<SkipGlyph color="#fff" />)}
          <CornerText text="2" size={16} x={31} y={46} />
        </>
      );
    case 'reverse':
    case 'wildReverse':
      return mini(<ReverseGlyph color="#fff" />);
    case 'flip':
      return mini(<FlipGlyph color="#fff" />);
    case 'tradeHands':
    case 'wildSwap':
      return mini(<SwapGlyph color="#fff" />);
    case 'wildRoulette':
      return mini(<RouletteGlyph />);
    case 'wildHitFire':
      return mini(<FlameGlyph />);
    case 'wild':
      return (
        <g transform="translate(21 29)">
          <Quarters rx={10} ry={13} stroke={1.5} dark={dark} />
        </g>
      );
    default:
      return (
        <>
          <CornerText text={value} size={30} />
          {(value === '6' || value === '9') && (
            <rect x="14" y="43" width="14" height="4" rx="1.5" fill="#fff" stroke={INK} strokeWidth="1.5" />
          )}
        </>
      );
  }
}

function CornerText({ text, size, x = 21, y = 39 }: { text: string; size: number; x?: number; y?: number }) {
  return (
    <text
      x={x}
      y={size < 24 ? y - (30 - size) / 2.4 : y}
      textAnchor="middle"
      fontSize={size}
      style={DISPLAY}
      fill="#fff"
      strokeWidth="5"
      {...outlined}
    >
      {text}
    </text>
  );
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
  const p = { fill: color, strokeWidth: 5, ...outlined };
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

/** A little fan of cards: how many you have to draw. */
function MiniFan({ colors }: { colors: string[] }) {
  const n = colors.length;
  const spread = n === 1 ? 0 : Math.min(22, 66 / (n - 1));
  return (
    <g>
      {colors.map((col, i) => (
        <g key={i} transform={`translate(0 30) rotate(${(i - (n - 1) / 2) * spread}) translate(0 -36)`}>
          <MiniCard x={0} y={0} color={col} />
        </g>
      ))}
    </g>
  );
}

function Pill({ text, y, color }: { text: string; y: number; color: string }) {
  return (
    <g transform={`translate(0 ${y})`}>
      <rect x="-24" y="-12" width="48" height="22" rx="11" fill={color} stroke={INK} strokeWidth="3" />
      <text y="6" textAnchor="middle" fontSize="16" style={DISPLAY} fill="#fff" strokeWidth="3" {...outlined}>
        {text}
      </text>
    </g>
  );
}

function DiscardAllGlyph({ color }: { color: string }) {
  return (
    <g>
      <MiniCard x={-12} y={-14} color={color} />
      <MiniCard x={0} y={-6} color={color} />
      <MiniCard x={12} y={2} color={color} />
      <path d="M -9 18 H 9 V 28 H 18 L 0 44 L -18 28 H -9 Z" fill="#fff" strokeWidth="5" {...outlined} />
    </g>
  );
}

function SwapGlyph({ color }: { color: string }) {
  const arc = { fill: 'none', strokeLinecap: 'round' as const };
  return (
    <g>
      <path d="M -22 -6 A 24 24 0 0 1 20 -14" stroke={INK} strokeWidth="13" {...arc} />
      <path d="M 22 6 A 24 24 0 0 1 -20 14" stroke={INK} strokeWidth="13" {...arc} />
      <path d="M -22 -6 A 24 24 0 0 1 20 -14" stroke={color} strokeWidth="7" {...arc} />
      <path d="M 22 6 A 24 24 0 0 1 -20 14" stroke={color} strokeWidth="7" {...arc} />
      <path d="M 14 -26 L 30 -12 L 10 -6 Z" fill={color} strokeWidth="4" {...outlined} />
      <path d="M -14 26 L -30 12 L -10 6 Z" fill={color} strokeWidth="4" {...outlined} />
    </g>
  );
}

function FlipGlyph({ color }: { color: string }) {
  return (
    <g>
      <path d="M -26 8 A 27 27 0 0 1 20 -20" fill="none" stroke={INK} strokeWidth="13" strokeLinecap="round" />
      <path d="M -26 8 A 27 27 0 0 1 20 -20" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" />
      <path d="M 12 -32 L 32 -18 L 12 -8 Z" fill={color} strokeWidth="4" {...outlined} />
      <g transform="rotate(-14)">
        <rect x="-11" y="-6" width="26" height="36" rx="4" fill="#fff" stroke={INK} strokeWidth="3" />
        <path d="M -11 30 L 15 -6 L 15 26 Q 15 30 11 30 Z" fill="#141019" />
      </g>
    </g>
  );
}

function Burst({ color }: { color: string }) {
  const pts = Array.from({ length: 16 }, (_, i) => {
    const r = i % 2 ? 22 : 36;
    const a = (i * Math.PI) / 8;
    return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');
  return <polygon points={pts} fill={color} stroke={INK} strokeWidth="4" strokeLinejoin="round" />;
}

function FlameGlyph() {
  return (
    <g>
      <path
        d="M 0 -40 C 14 -22 30 -12 26 10 C 23 28 10 36 0 36 C -12 36 -26 28 -26 10 C -26 -4 -16 -12 -12 -22 C -6 -12 -4 -6 -2 -2 C 2 -16 -2 -28 0 -40 Z"
        fill={CARD_COLORS.orange.base}
        stroke={INK}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M 0 -6 C 8 4 14 12 10 22 C 8 28 4 30 0 30 C -6 30 -12 26 -12 18 C -12 10 -6 6 0 -6 Z"
        fill={CARD_COLORS.yellow.base}
      />
    </g>
  );
}

function TargetGlyph() {
  return (
    <g fill="none" strokeLinecap="round">
      <circle r="24" stroke={INK} strokeWidth="11" />
      <circle r="24" stroke="#fff" strokeWidth="5" />
      <circle r="10" stroke={INK} strokeWidth="9" />
      <circle r="10" stroke={CARD_COLORS.red.base} strokeWidth="4" />
      {[0, 90, 180, 270].map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <line x1="0" y1="-34" x2="0" y2="-18" stroke={INK} strokeWidth="9" />
          <line x1="0" y1="-34" x2="0" y2="-18" stroke="#fff" strokeWidth="4" />
        </g>
      ))}
    </g>
  );
}

function RouletteGlyph() {
  const cols = ['red', 'blue', 'yellow', 'green', 'red', 'blue', 'yellow', 'green'] as Color[];
  return (
    <g>
      <circle r="31" fill={INK} />
      {cols.map((c, i) => {
        const a0 = (i * Math.PI) / 4;
        const a1 = ((i + 1) * Math.PI) / 4;
        const r = 27;
        return (
          <path
            key={i}
            d={`M0 0 L${(Math.cos(a0) * r).toFixed(1)} ${(Math.sin(a0) * r).toFixed(1)} A ${r} ${r} 0 0 1 ${(Math.cos(a1) * r).toFixed(1)} ${(Math.sin(a1) * r).toFixed(1)} Z`}
            fill={CARD_COLORS[c].base}
            stroke={INK}
            strokeWidth="1.5"
          />
        );
      })}
      <circle r="7" fill="#fff" stroke={INK} strokeWidth="3" />
      <path d="M -8 -40 L 8 -40 L 0 -24 Z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
    </g>
  );
}

/** UNO Spin cards: a swirl around the number. */
function Swirl({ color }: { color: string }) {
  return (
    <g
      transform={`translate(${OVAL.cx} ${OVAL.cy}) rotate(${OVAL.rot})`}
      fill="none"
      strokeDasharray="10 6"
      strokeLinecap="round"
    >
      <ellipse rx="33" ry="58" stroke={color} strokeWidth="3" opacity="0.55" />
      <ellipse rx="26" ry="47" stroke={color} strokeWidth="3" opacity="0.4" transform="rotate(12)" />
      <ellipse rx="37" ry="65" stroke={INK} strokeWidth="1.5" opacity="0.25" transform="rotate(-8)" />
    </g>
  );
}

function Quarters({ rx, ry, stroke, dark = false }: { rx: number; ry: number; stroke: number; dark?: boolean }) {
  const [a, b, c, d] = dark ? (['pink', 'teal', 'orange', 'purple'] as Color[]) : (['red', 'blue', 'green', 'yellow'] as Color[]);
  return (
    <g>
      <path d={`M0 0 L0 ${-ry} A ${rx} ${ry} 0 0 0 ${-rx} 0 Z`} fill={CARD_COLORS[a].base} />
      <path d={`M0 0 L${rx} 0 A ${rx} ${ry} 0 0 0 0 ${-ry} Z`} fill={CARD_COLORS[b].base} />
      <path d={`M0 0 L0 ${ry} A ${rx} ${ry} 0 0 0 ${rx} 0 Z`} fill={CARD_COLORS[c].base} />
      <path d={`M0 0 L${-rx} 0 A ${rx} ${ry} 0 0 0 0 ${ry} Z`} fill={CARD_COLORS[d].base} />
      <ellipse rx={rx} ry={ry} fill="none" stroke="#fff" strokeWidth={stroke} />
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
        <text x="60" y="106" fill="#ffd21f" strokeWidth="6" {...outlined}>
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
