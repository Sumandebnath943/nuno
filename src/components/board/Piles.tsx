import { forwardRef } from 'react';
import type { Card, Color, Face, Side } from '../../game/types';
import { CARD_RATIO, CardView } from '../CardView';
import { contrast, INK, readableOn } from '../../lib/theme';
import { useTheme } from '../../themes';
import { pileJitter } from './layout';

interface DeckProps {
  width: number;
  count: number;
  canDraw: boolean;
  onDraw: () => void;
  label?: boolean;
  /** Button text when drawing is possible. */
  drawLabel?: string;
  /** UNO Flip: the other side of the top card, which everyone can see. */
  topAlt?: Face | null;
  /** UNO Flip: side currently in play (the draw pile shows the other one). */
  side?: Side;
  /** UNO Attack: show the card launcher instead of a pile. */
  launcher?: boolean;
  /** Bumps every time the launcher fires, to replay its shake. */
  shots?: number;
  /** Bumps when the dealer shuffles, to play a riffle. */
  riffles?: number;
}

export const Deck = forwardRef<HTMLDivElement, DeckProps>(function Deck(
  { width, count, canDraw, onDraw, label = true, drawLabel, topAlt, side = 'light', launcher = false, shots = 0, riffles = 0 },
  ref,
) {
  const h = width * CARD_RATIO;
  const layers = count > 20 ? 3 : count > 6 ? 2 : count > 0 ? 1 : 0;
  const backSide: Side = side === 'light' ? 'dark' : 'light';
  const compact = width < 80;
  return (
    <div className="relative flex flex-col items-center" style={{ width }}>
      <button
        type="button"
        onClick={onDraw}
        disabled={!canDraw}
        aria-label={canDraw ? (drawLabel ?? 'Draw a card') : launcher ? 'Card launcher' : `Draw pile, ${count} cards`}
        className={`group relative block rounded-[10%/6.5%] ${canDraw ? 'cursor-pointer animate-bob' : 'cursor-default'}`}
        style={{ width, height: h }}
      >
        {launcher ? (
          <div ref={ref} data-card-w={width} className="absolute inset-0" style={{ width, height: h }}>
            <Launcher width={width} glow={canDraw} shots={shots} />
          </div>
        ) : (
          <>
            {/* thickness of the pile */}
            {Array.from({ length: layers }).map((_, i) => (
              <div
                key={i}
                className="absolute left-0 top-0"
                style={{ transform: `translate(${(layers - i) * 2.5}px, ${(layers - i) * 3}px)` }}
              >
                {topAlt ? <CardView card={topAlt} side={backSide} width={width} /> : <CardView faceDown width={width} />}
              </div>
            ))}
            {/* The riffle: the deck splits in two, the halves fly apart and snap back together, twice. */}
            {riffles > 0 && count > 0 && (
              <div key={riffles} className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="riffle riffle-l absolute left-0 top-0">
                  <CardView faceDown width={width} />
                </div>
                <div className="riffle riffle-r absolute left-0 top-0">
                  <CardView faceDown width={width} />
                </div>
              </div>
            )}
            <div
              ref={ref}
              data-card-w={width}
              key={`top-${riffles}`}
              className={`absolute left-0 top-0 transition-transform group-hover:-translate-y-1 ${riffles > 0 ? 'riffle-top' : ''}`}
              style={{ width, height: h }}
            >
              {count > 0 &&
                (topAlt ? (
                  <CardView card={topAlt} side={backSide} width={width} glow={canDraw} />
                ) : (
                  <CardView faceDown width={width} glow={canDraw} />
                ))}
            </div>
            <span
              className={`font-ui absolute -bottom-2 -right-3 z-10 rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)] shadow-[0_2px_0_var(--ink)] ${compact ? 'px-1.5 text-xs leading-5' : 'px-2 text-sm leading-6'}`}
              title="Cards left in the draw pile"
            >
              {count}
            </span>
          </>
        )}
      </button>
      {label && (
        <span
          className={`font-ui mt-3 whitespace-nowrap rounded-full border-2 uppercase tracking-wider ${compact ? 'px-2 text-[10px] leading-4' : 'px-2.5 text-xs leading-5'} ${
            canDraw
              ? 'border-[var(--ink)] bg-[var(--yellow)] text-[var(--ink)] shadow-[0_2px_0_var(--ink)]'
              : 'border-transparent bg-[rgba(18,14,36,0.55)] text-white/90'
          }`}
        >
          {canDraw
            ? compact
              ? launcher
                ? 'Hit!'
                : 'Draw!'
              : (drawLabel ?? 'Tap to draw')
            : launcher
              ? 'Launcher'
              : compact
                ? 'Deck'
                : 'Draw pile'}
        </span>
      )}
    </div>
  );
});

/** UNO Attack's card launcher. */
function Launcher({ width, glow, shots }: { width: number; glow: boolean; shots: number }) {
  return (
    <svg
      key={shots}
      viewBox="0 0 120 186"
      width={width}
      height={width * CARD_RATIO}
      className={shots ? 'animate-launch' : ''}
      style={{ filter: glow ? 'drop-shadow(0 0 12px rgba(255,230,80,0.9))' : undefined, overflow: 'visible' }}
      aria-hidden="true"
    >
      {/* base */}
      <path
        d="M 8 118 Q 8 96 30 92 H 90 Q 112 96 112 118 V 160 Q 112 178 94 178 H 26 Q 8 178 8 160 Z"
        fill="#6d4ce6"
        stroke={INK}
        strokeWidth="5"
      />
      <rect x="22" y="132" width="76" height="12" rx="6" fill="#4f28a3" />
      {/* dome */}
      <path
        d="M 14 104 Q 14 30 60 22 Q 106 30 106 104 Z"
        fill="url(#nf-red)"
        stroke={INK}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <ellipse cx="44" cy="52" rx="16" ry="10" fill="#fff" opacity="0.35" transform="rotate(-25 44 52)" />
      {/* card slot */}
      <rect x="30" y="96" width="60" height="10" rx="4" fill={INK} />
      <rect x="38" y="90" width="44" height="8" rx="2" fill="#fff" stroke={INK} strokeWidth="2" />
      {/* button */}
      <circle cx="60" cy="64" r="16" fill="#ffc21a" stroke={INK} strokeWidth="4" />
      <text x="60" y="70" textAnchor="middle" fontSize="15" style={{ fontFamily: 'var(--font-display)' }} fill={INK}>
        HIT
      </text>
      <text
        x="60"
        y="168"
        textAnchor="middle"
        fontSize="17"
        style={{ fontFamily: 'var(--font-display)' }}
        fill="#fff"
        stroke={INK}
        strokeWidth="4"
        paintOrder="stroke"
      >
        NUNO
      </text>
    </svg>
  );
}

interface DiscardProps {
  width: number;
  cards: Card[];
  hidden: Set<string>;
  color: Color | null;
  label?: boolean;
  side?: Side;
  /** All Wild has no colours. */
  colorless?: boolean;
}

export const Discard = forwardRef<HTMLDivElement, DiscardProps>(function Discard(
  { width, cards, hidden, color, label = true, side = 'light', colorless = false },
  ref,
) {
  const theme = useTheme();
  const pal = theme.cardColors;
  const h = width * CARD_RATIO;
  const visible = cards.filter((c) => !hidden.has(c.id));
  const compact = width < 80;
  const alias = color ? theme.colorAlias?.[color] : undefined;
  // The colour's deeper shade: small print reads on it whatever the colour.
  const labelBg = color ? (contrast('#ffffff', pal[color].base) >= 4.5 || contrast(INK, pal[color].base) >= 4.5 ? pal[color].base : pal[color].dark) : '#5a46c9';
  const labelInk = readableOn(labelBg);
  return (
    <div className="relative flex flex-col items-center" style={{ width }}>
      <div ref={ref} data-card-w={width} className="relative" style={{ width, height: h }}>
        {/* glow in the active colour (a soft gradient, not a blur filter: cheaper on phones) */}
        <div
          className="absolute -inset-8 rounded-[50%]"
          style={{
            background: colorless
              ? 'radial-gradient(closest-side, rgba(255,255,255,0.55), rgba(255,255,255,0) 100%)'
              : `radial-gradient(closest-side, ${color ? pal[color].light : 'rgba(255,255,255,0.6)'}, rgba(0,0,0,0) 100%)`,
            opacity: 0.75,
          }}
        />
        {visible.map((c) => {
          const j = pileJitter(c.id);
          return (
            <div
              key={c.id}
              className="absolute left-0 top-0"
              style={{ transform: `translate(${j.dx}px, ${j.dy}px) rotate(${j.rot}deg)` }}
            >
              {/* Cards that land slam down and settle (they mount as they land). */}
              <div className="animate-land">
                <CardView card={c} side={side} width={width} />
              </div>
            </div>
          );
        })}
      </div>
      {label &&
        (colorless ? (
          <span className={`font-ui mt-3 whitespace-nowrap rounded-full border-2 border-[var(--ink)] bg-[var(--surface)] uppercase tracking-wider text-[var(--ink)] shadow-[0_2px_0_var(--ink)] ${compact ? 'px-2 text-[10px] leading-4' : 'px-2.5 text-xs leading-5'}`}>
            {compact ? 'Any card' : 'Anything goes'}
          </span>
        ) : (
          <span
            className={`font-ui mt-3 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-[var(--ink)] uppercase tracking-wider shadow-[0_2px_0_var(--ink)] transition-colors duration-500 ${compact ? 'px-2 text-[10px] leading-4' : 'px-2.5 text-xs leading-5'}`}
            style={{ background: labelBg, color: labelInk.color, textShadow: labelInk.shadow }}
            title={alias}
          >
            {color ? (compact ? color : alias ? `${color} · ${alias}` : `${color} to play`) : compact ? '…' : 'Picking colour…'}
          </span>
        ))}
    </div>
  );
});
