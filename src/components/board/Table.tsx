import { memo } from 'react';
import type { Color } from '../../game/types';
import { COLOR_ORDER, FELT } from '../../lib/theme';

interface Props {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Active colour; null while a colour is being picked. */
  color: Color | null;
  direction: 1 | -1;
  /** All Wild: no colours, just a rainbow. */
  rainbow?: boolean;
  /** Flip: the Dark Side gives the table a black rim. */
  dark?: boolean;
}

const NEUTRAL: [string, string, string] = ['#6a55d9', '#3f2f9c', '#231a5e'];
const CHEVRONS = 30;

/**
 * The oval table. The felt takes on the colour in play so you can read it at a glance,
 * and the chevrons printed around the rim show which way play is going.
 */
export const Table = memo(function Table({ cx, cy, rx, ry, color, direction, rainbow = false, dark = false }: Props) {
  const inset = Math.min(34, ry * 0.16);
  const crx = rx - inset;
  const cry = ry - inset;

  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: cx - rx, top: cy - ry, width: rx * 2, height: ry * 2 }}
      aria-hidden="true"
    >
      {/* drop shadow + rim */}
      <div
        className="absolute rounded-[50%]"
        style={{
          inset: -16,
          background: dark
            ? 'linear-gradient(180deg, #2a2433 0%, #0d0b12 100%)'
            : 'linear-gradient(180deg, #3b2f86 0%, #241c5c 100%)',
          transition: 'background 0.6s',
          border: '4px solid var(--ink)',
          boxShadow: '0 16px 0 rgba(10, 6, 30, 0.55), inset 0 4px 0 rgba(255,255,255,0.18)',
        }}
      />
      {/* felt */}
      <div className="absolute inset-0 overflow-hidden rounded-[50%]" style={{ border: '4px solid var(--ink)' }}>
        <Felt colors={NEUTRAL} visible={!rainbow && color === null} />
        {COLOR_ORDER.map((c) => (
          <Felt key={c} colors={FELT[c]} visible={!rainbow && color === c} />
        ))}
        {rainbow && (
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.25), rgba(0,0,0,0.35) 75%), conic-gradient(from 200deg at 50% 50%, #c7333a, #d89a12, #24934a, #2a5fbf, #6b3fc7, #c7333a)',
            }}
          />
        )}
        <div className="bg-dots absolute inset-0 opacity-60" />
        <div className="absolute rounded-[50%]" style={{ inset: inset - 12, border: '2px solid rgba(255,255,255,0.14)' }} />
      </div>
      {/* direction chevrons */}
      <svg className="absolute inset-0 overflow-visible" width={rx * 2} height={ry * 2}>
        {Array.from({ length: CHEVRONS }).map((_, i) => {
          const deg = 90 - (i * 360) / CHEVRONS; // i increases clockwise on screen
          const a = (deg * Math.PI) / 180;
          const x = rx + crx * Math.cos(a);
          const y = ry - cry * Math.sin(a);
          // Tangent pointing clockwise on screen.
          const tangent = (Math.atan2(cry * Math.cos(a), crx * Math.sin(a)) * 180) / Math.PI;
          const rot = direction === 1 ? tangent : tangent + 180;
          const order = direction === 1 ? i : CHEVRONS - i;
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <g style={{ transform: `rotate(${rot}deg)`, transition: 'transform 0.7s cubic-bezier(.5,1.6,.5,1)' }}>
                <path
                  d="M -5 -7 L 3 0 L -5 7"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animation: `chevronWave 2.4s ease-in-out ${(order * 2.4) / CHEVRONS}s infinite` }}
                />
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
});

function Felt({ colors, visible }: { colors: [string, string, string]; visible: boolean }) {
  return (
    <div
      className="absolute inset-0 transition-opacity duration-500"
      style={{
        opacity: visible ? 1 : 0,
        background: `radial-gradient(ellipse at 50% 42%, ${colors[0]} 0%, ${colors[1]} 58%, ${colors[2]} 100%)`,
      }}
    />
  );
}
