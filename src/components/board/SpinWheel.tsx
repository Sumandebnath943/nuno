import { motion } from 'framer-motion';
import type { PublicPlayer, WheelSegment } from '../../game/types';
import { WHEEL } from '../../game/types';
import { WHEEL_INFO } from '../../lib/modeGuide';
import { INK } from '../../lib/theme';
import { WHEEL_SPIN_MS, type WheelSpin } from './useTableFx';
import { Avatar } from '../Avatar';

const SHORT: Record<WheelSegment, string> = {
  almostUno: 'Almost NUNO',
  discardNumber: 'Discard #',
  discardColor: 'Discard Color',
  drawRed: 'Draw Red',
  drawBlue: 'Draw Blue',
  tradeHands: 'Trade Hands',
  showHand: 'Show Hand',
  war: 'War',
  unoSpin: 'NUNO Spin',
};

const STEP = 360 / WHEEL.length;

interface Props {
  /** Waiting for this player to spin (null once spun). */
  waitingFor: number | null;
  spin: WheelSpin | null;
  players: PublicPlayer[];
  me: number;
  size: number;
  x: number;
  y: number;
  onSpin: () => void;
}

/** The UNO Spin wheel: appears when someone has to spin, and animates the result. */
export function SpinWheel({ waitingFor, spin, players, me, size, x, y, onSpin }: Props) {
  if (waitingFor === null && !spin) return null;
  const spinner = spin?.spinner ?? waitingFor!;
  const mine = waitingFor === me && !spin;
  const target = spin ? 5 * 360 - (WHEEL.indexOf(spin.segment) * STEP + STEP / 2) : 0;
  const r = 100;

  return (
    <div
      className="pointer-events-none absolute z-[47] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{ left: x, top: y }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        {/* a soft shadow (a gradient, not a blur filter: much cheaper on phones) */}
        <div className="absolute -inset-[12%] rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(10,8,30,0.5), rgba(10,8,30,0) 100%)' }} />
        <motion.svg
          key={spin?.id ?? 'idle'}
          viewBox="-110 -110 220 220"
          width={size}
          height={size}
          className="relative"
          initial={{ rotate: 0 }}
          animate={{ rotate: target }}
          transition={{ duration: spin ? WHEEL_SPIN_MS / 1000 : 0, ease: [0.12, 0.65, 0.18, 1] }}
        >
          <circle r={r + 8} fill={INK} />
          {WHEEL.map((seg, i) => {
            const a0 = ((i * STEP - 90) * Math.PI) / 180;
            const a1 = (((i + 1) * STEP - 90) * Math.PI) / 180;
            const mid = i * STEP + STEP / 2;
            return (
              <g key={seg}>
                <path
                  d={`M0 0 L${Math.cos(a0) * r} ${Math.sin(a0) * r} A ${r} ${r} 0 0 1 ${Math.cos(a1) * r} ${Math.sin(a1) * r} Z`}
                  fill={WHEEL_INFO[seg].color}
                  stroke={INK}
                  strokeWidth="2.5"
                />
                <g transform={`rotate(${mid})`}>
                  <text y={-r * 0.74} textAnchor="middle" fontSize="16" dominantBaseline="middle">
                    {WHEEL_INFO[seg].icon}
                  </text>
                  <text
                    y={-r * 0.46}
                    textAnchor="middle"
                    fontSize="9.5"
                    fill="#fff"
                    stroke={INK}
                    strokeWidth="2.5"
                    paintOrder="stroke"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {SHORT[seg]}
                  </text>
                </g>
              </g>
            );
          })}
          <circle r="16" fill="#fff" stroke={INK} strokeWidth="4" />
          <text y="5" textAnchor="middle" fontSize="13" style={{ fontFamily: 'var(--font-display)' }} fill={INK}>
            SPIN
          </text>
        </motion.svg>
        {/* pointer */}
        <svg
          viewBox="-20 -10 40 34"
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: -size * 0.06, width: size * 0.16 }}
        >
          <path d="M -14 -6 L 14 -6 L 0 22 Z" fill="#fff" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="pointer-events-auto mt-3">
        {mine ? (
          <button onClick={onSpin} className="btn btn-yellow animate-buzz h-14 px-8 text-2xl">
            SPIN! 🎡
          </button>
        ) : (
          <span className="font-display whitespace-nowrap rounded-full bg-[rgba(27,21,48,0.8)] px-3 py-1 text-base text-white">
            {spin ? (
              `${players[spinner]?.name} spun…`
            ) : (
              <>
                <Avatar value={players[spinner]?.avatar} /> {players[spinner]?.name} has to spin…
              </>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
