import { memo } from 'react';
import type { Color } from '../../game/types';
import { COLOR_ORDER } from '../../lib/theme';
import { useTheme } from '../../themes';

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

/** Chevrons around the rim; small tables get fewer (each one is its own animated layer). */
const chevronCount = (rx: number, ry: number) => (rx + ry < 520 ? 18 : rx + ry < 800 ? 24 : 30);

/**
 * The oval table. The felt takes on the colour in play so you can read it at a glance,
 * and the chevrons printed around the rim show which way play is going.
 * The rim, felt pattern and emblem come from the theme.
 */
export const Table = memo(function Table({ cx, cy, rx, ry, color, direction, rainbow = false, dark = false }: Props) {
  const theme = useTheme();
  const { Overlay, Emblem } = theme.table;
  const inset = Math.min(34, ry * 0.16);
  const crx = rx - inset;
  const cry = ry - inset;
  const emblem = Math.min(rx, ry) * 0.9;
  const CHEVRONS = chevronCount(rx, ry);

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
          background: dark ? 'linear-gradient(180deg, #2a2433 0%, #0d0b12 100%)' : theme.table.rim,
          border: '4px solid var(--ink)',
          boxShadow: '0 16px 0 rgba(10, 6, 30, 0.55), inset 0 4px 0 rgba(255,255,255,0.18), inset 0 -6px 12px rgba(0,0,0,0.35)',
        }}
      />
      {/* felt */}
      <div className="absolute inset-0 overflow-hidden rounded-[50%]" style={{ border: '4px solid var(--ink)' }}>
        <Felt colors={theme.neutralFelt} visible={!rainbow && color === null} />
        {COLOR_ORDER.map((c) => (
          <Felt key={c} colors={theme.felt[c]} visible={!rainbow && color === c} />
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
        {Overlay ? <Overlay /> : <div className="bg-dots absolute inset-0 opacity-60" />}
        {Emblem && (
          <svg
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            width={emblem}
            height={emblem}
            viewBox="-50 -50 100 100"
            style={{ opacity: 0.13 }}
          >
            <Emblem />
          </svg>
        )}
        <div className="absolute rounded-[50%]" style={{ inset: inset - 12, border: '2px solid rgba(255,255,255,0.14)' }} />
      </div>
      {/* direction chevrons: plain divs so the shimmer runs on the compositor */}
      <div className="absolute inset-0" style={{ ['--chev' as string]: theme.table.chevron ?? '#fff' }}>
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
            <span
              key={i}
              className="chev"
              style={{ left: x, top: y, transform: `rotate(${rot}deg)`, animationDelay: `${(order * 2.4) / CHEVRONS}s` }}
            >
              <i />
            </span>
          );
        })}
      </div>
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
