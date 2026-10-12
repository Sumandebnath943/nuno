import { memo } from 'react';
import type { PublicPlayer } from '../../game/types';
import { CardView } from '../CardView';
import type { Bubble } from './useTableFx';

interface Props {
  seat: number;
  player: PublicPlayer;
  count: number;
  x: number;
  y: number;
  compact: boolean;
  /** Widest the name plate may grow (it can overhang the seat). */
  nameMax: number;
  isTurn: boolean;
  isNext: boolean;
  catchable: boolean;
  showScore: boolean;
  bubble?: Bubble;
  registerFan: (seat: number, el: HTMLElement | null) => void;
  onCatch: (seat: number) => void;
}

export const Seat = memo(function Seat({
  seat,
  player,
  count,
  x,
  y,
  compact,
  nameMax,
  isTurn,
  isNext,
  catchable,
  showScore,
  bubble,
  registerFan,
  onCatch,
}: Props) {
  const miniW = compact ? 20 : 30;
  const avatar = compact ? 46 : 62;
  const shown = Math.min(count, compact ? 5 : 7);
  const spread = Math.min(shown - 1, 6) * (compact ? 7 : 8);
  const low = count > 0 && count <= 2;

  return (
    <div className="absolute" style={{ left: x, top: y, transform: 'translate(-50%, -50%)', zIndex: isTurn ? 25 : 20 }}>
      <div
        className="relative flex flex-col items-center transition-transform duration-300"
        style={{ width: compact ? 78 : 124, transform: isTurn ? 'scale(1.08)' : 'scale(1)' }}
      >
        {/* their hand, face down */}
        <div
          ref={(el) => registerFan(seat, el)}
          data-card-w={miniW}
          className="relative"
          style={{ width: miniW * 2.6, height: miniW * 1.25 }}
        >
          {Array.from({ length: shown }).map((_, i) => {
            const off = shown === 1 ? 0 : i / (shown - 1) - 0.5;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-0"
                style={{
                  transform: `translateX(-50%) translateX(${off * spread * 2.2}px) rotate(${off * spread * 2.4}deg)`,
                  transformOrigin: '50% 140%',
                }}
              >
                <CardView faceDown width={miniW} />
              </div>
            );
          })}
        </div>

        {/* avatar */}
        <div
          className={`relative z-10 flex items-center justify-center rounded-full border-[3px] border-[var(--ink)] bg-white ${
            isTurn ? 'animate-pulseRing' : ''
          }`}
          style={{
            width: avatar,
            height: avatar,
            marginTop: -miniW * 0.55,
            fontSize: avatar * 0.56,
            boxShadow: isTurn ? undefined : '0 3px 0 var(--ink)',
            background: isTurn ? '#fff1a8' : player.connected ? '#fff' : '#cfcadb',
            filter: player.connected ? undefined : 'grayscale(1)',
          }}
        >
          <span className={isTurn && player.kind === 'bot' ? 'animate-wiggle inline-block' : ''}>{player.avatar}</span>

          {/* card count */}
          <div
            className={`font-display absolute flex items-center justify-center rounded-full border-[2.5px] border-[var(--ink)] leading-none ${
              low ? 'bg-[var(--red)] text-white animate-buzz' : 'bg-white text-[var(--ink)]'
            }`}
            style={{
              right: compact ? -12 : -14,
              top: compact ? -6 : -4,
              minWidth: compact ? 24 : 30,
              height: compact ? 24 : 30,
              padding: '0 4px',
              fontSize: compact ? 14 : 18,
              boxShadow: '0 2px 0 var(--ink)',
            }}
            title={`${count} card${count === 1 ? '' : 's'}`}
          >
            {count}
          </div>

          {player.saidUno && count === 1 && (
            <div className="font-display absolute -left-3 -top-2 -rotate-12 rounded-lg border-2 border-[var(--ink)] bg-[var(--yellow)] px-1.5 text-[11px] leading-5 text-[var(--ink)] shadow-[0_2px_0_var(--ink)]">
              NUNO!
            </div>
          )}
        </div>

        {/* name plate */}
        <div
          className={`font-display relative z-20 -mt-2 truncate whitespace-nowrap rounded-full border-[2.5px] border-[var(--ink)] px-2.5 leading-tight shadow-[0_2px_0_var(--ink)] ${
            isTurn ? 'bg-[var(--yellow)] text-[var(--ink)]' : 'bg-white text-[var(--ink)]'
          }`}
          style={{ fontSize: compact ? 11 : 14, paddingTop: 1, paddingBottom: 1, width: 'max-content', maxWidth: nameMax }}
          title={player.name}
        >
          {player.name}
        </div>

        <div className="mt-0.5 flex h-4 items-center gap-1">
          {isNext && !isTurn && (
            <span className="font-display rounded-full bg-[var(--ink)] px-1.5 text-[10px] uppercase leading-4 tracking-wider text-white/90">
              next
            </span>
          )}
          {isTurn && player.kind === 'bot' && (
            <span className="thinking-dots rounded-full bg-white px-1.5 leading-4 [&>span]:!h-1 [&>span]:!w-1">
              <span />
              <span />
              <span />
            </span>
          )}
          {showScore && !compact && <span className="font-display text-[11px] text-white/75">{player.score} pts</span>}
          {player.kind === 'bot' && !compact && !isTurn && !isNext && (
            <span className="font-display text-[10px] uppercase tracking-wider text-white/50">bot</span>
          )}
        </div>

        {/* catch button (they forgot to shout NUNO) */}
        {catchable && (
          <button
            onClick={() => onCatch(seat)}
            className="btn btn-red animate-shake absolute left-1/2 top-[-6px] z-30 -translate-x-1/2 px-3 py-1 text-sm"
            style={{ pointerEvents: 'auto' }}
          >
            CATCH! 👉
          </button>
        )}

        {/* speech bubble */}
        {bubble && <SpeechBubble key={bubble.id} bubble={bubble} />}
      </div>
    </div>
  );
});

const TONES: Record<Bubble['tone'], string> = {
  info: 'bg-white text-[var(--ink)]',
  bad: 'bg-[#ffe1e1] text-[#b3141c]',
  good: 'bg-[#dcffe5] text-[#13782f]',
  uno: 'bg-[var(--yellow)] text-[var(--ink)] text-lg',
  emote: 'bg-white text-2xl',
};

export function SpeechBubble({ bubble, above = false }: { bubble: Bubble; above?: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 ${above ? 'bottom-full mb-2' : 'top-full mt-1.5'}`}
    >
      <div
        className={`font-display relative whitespace-nowrap rounded-2xl border-[2.5px] border-[var(--ink)] px-3 py-1 text-sm shadow-[0_3px_0_var(--ink)] animate-popIn ${TONES[bubble.tone]}`}
      >
        {bubble.text}
        <span
          className={`absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-[var(--ink)] ${TONES[bubble.tone].split(' ')[0]} ${
            above ? '-bottom-[7px] border-b-[2.5px] border-r-[2.5px]' : '-top-[7px] border-l-[2.5px] border-t-[2.5px]'
          }`}
        />
      </div>
    </div>
  );
}
