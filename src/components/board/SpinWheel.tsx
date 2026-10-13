import { useEffect, useRef, useState } from 'react';
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
/** The wheel's slow-down curve (a CSS cubic-bezier). */
const EASE: [number, number, number, number] = [0.12, 0.65, 0.18, 1];

const bez = (t: number, a: number, b: number) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;

/** When (as a fraction of the spin) the wheel has turned `frac` of the way round. */
function timeAt(frac: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (bez(mid, EASE[1], EASE[3]) < frac) lo = mid;
    else hi = mid;
  }
  return bez(hi, EASE[0], EASE[2]);
}

/** The pointer flicks back each time a peg goes past it: fast at first, then slower and slower. */
function pointerFrames(target: number): Keyframe[] {
  const hits: number[] = [];
  for (let a = STEP; a < target; a += STEP) hits.push(timeAt(a / target));
  const frames: Keyframe[] = [{ transform: 'rotate(0deg)', offset: 0 }];
  hits.forEach((at, i) => {
    const next = hits[i + 1] ?? 1;
    const gap = next - at;
    frames.push({ transform: 'rotate(-26deg)', offset: at });
    // When pegs come thick and fast the pointer never gets all the way back.
    frames.push({ transform: `rotate(${gap < 0.02 ? -18 : 0}deg)`, offset: at + gap * 0.6 });
  });
  frames.push({ transform: 'rotate(0deg)', offset: 1 });
  return frames;
}

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
  const target = spin ? 5 * 360 - (WHEEL.indexOf(spin.segment) * STEP + STEP / 2) : 0;
  const pointer = useRef<SVGSVGElement>(null);
  const [landed, setLanded] = useState<number | null>(null);
  useEffect(() => {
    if (!spin) return;
    const anim = pointer.current?.animate(pointerFrames(target), { duration: WHEEL_SPIN_MS, easing: 'linear' });
    const t = setTimeout(() => setLanded(spin.id), WHEEL_SPIN_MS);
    return () => {
      anim?.cancel();
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin?.id]);

  if (waitingFor === null && !spin) return null;
  const spinner = spin?.spinner ?? waitingFor!;
  const mine = waitingFor === me && !spin;
  const r = 100;
  const winIndex = spin ? WHEEL.indexOf(spin.segment) : -1;
  const wedge = (i: number) => {
    const a0 = ((i * STEP - 90) * Math.PI) / 180;
    const a1 = (((i + 1) * STEP - 90) * Math.PI) / 180;
    return `M0 0 L${Math.cos(a0) * r} ${Math.sin(a0) * r} A ${r} ${r} 0 0 1 ${Math.cos(a1) * r} ${Math.sin(a1) * r} Z`;
  };

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
          transition={{ duration: spin ? WHEEL_SPIN_MS / 1000 : 0, ease: EASE }}
        >
          <circle r={r + 8} fill={INK} />
          {WHEEL.map((seg, i) => {
            const mid = i * STEP + STEP / 2;
            return (
              <g key={seg}>
                <path d={wedge(i)} fill={WHEEL_INFO[seg].color} stroke={INK} strokeWidth="2.5" />
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
          {/* The winning wedge flashes once the wheel stops. */}
          {spin && landed === spin.id && winIndex >= 0 && <path d={wedge(winIndex)} fill="#fff" className="seg-flash" />}
          <circle r="16" fill="#fff" stroke={INK} strokeWidth="4" />
          <text y="5" textAnchor="middle" fontSize="13" style={{ fontFamily: 'var(--font-display)' }} fill={INK}>
            SPIN
          </text>
        </motion.svg>
        {/* pointer */}
        <div className="absolute left-1/2" style={{ top: -size * 0.06, width: size * 0.16, marginLeft: -size * 0.08 }}>
          <svg ref={pointer} viewBox="-20 -10 40 34" className="block w-full" style={{ transformOrigin: '50% 12%' }}>
            <path d="M -14 -6 L 14 -6 L 0 22 Z" fill="#fff" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          </svg>
        </div>
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
