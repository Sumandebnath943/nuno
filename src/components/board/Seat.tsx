import { memo } from 'react';
import type { PublicPlayer, Side } from '../../game/types';
import { MERCY_LIMIT } from '../../game/modes';
import { fitFontSize, scaleOf, useFontMetrics } from '../../lib/fitText';
import { CardView } from '../CardView';
import type { Bubble } from './useTableFx';
import { fanShape } from './layout';
import { Avatar } from '../Avatar';

/** Voice chat at a seat: is their mic on, are they talking, have you muted them. */
export interface SeatVoice {
  mic: boolean;
  speaking: boolean;
  muted: boolean;
}

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
  /** No Mercy: warn as the hand creeps towards 25 cards. */
  mercy?: boolean;
  /** UNO Flip: side in play — their fan shows the other side. */
  side?: Side;
  /** Keep speech bubbles on screen for seats near the edges. */
  bubbleAlign?: 'left' | 'center' | 'right';
  /** The theme's title for this player ("Jonin", "฿600M"). */
  rank?: string;
  /** Theme aura classes for the avatar. */
  aura?: string;
  voice?: SeatVoice;
  registerFan: (seat: number, el: HTMLElement | null) => void;
  onCatch: (seat: number) => void;
  onToggleMute?: (seat: number) => void;
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
  mercy = false,
  side,
  bubbleAlign = 'center',
  rank,
  aura = '',
  voice,
  registerFan,
  onCatch,
  onToggleMute,
}: Props) {
  useFontMetrics();
  const flipFaces = player.altFaces;
  const fan = fanShape(compact, !!flipFaces);
  const miniW = fan.miniW;
  const avatar = compact ? 44 : 62;
  const shown = Math.min(count, fan.max);
  const low = count > 0 && count <= 2;
  const danger = mercy && count >= MERCY_LIMIT - 5;
  const otherSide: Side = side === 'dark' ? 'light' : 'dark';
  const nameMaxPx = (compact ? 12 : 14.5) * scaleOf('--ufs');
  const nameMinPx = compact ? 9.5 : 10.5;
  let nameSize = fitFontSize(player.name, nameMax - 16, { max: nameMaxPx, min: 7 });
  // Long names wrap onto a second line instead of being cut off.
  const twoLines = nameSize < nameMinPx && player.name.includes(' ');
  nameSize = twoLines ? Math.min(nameMaxPx, fitFontSize(player.name, (nameMax - 16) * 1.7, { max: nameMaxPx, min: nameMinPx })) : Math.max(nameSize, nameMinPx);

  return (
    <div
      className="absolute"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        zIndex: isTurn ? 25 : 20,
        filter: player.out ? 'grayscale(1) brightness(0.7)' : undefined,
      }}
    >
      <div
        className="relative flex flex-col items-center transition-transform duration-300 ease-out"
        style={{ width: compact ? 78 : 124, transform: isTurn ? 'scale(1.08)' : 'scale(1)' }}
      >
        {/* their hand: face down — or, in Flip, showing the other side */}
        <div ref={(el) => registerFan(seat, el)} data-card-w={miniW} className="relative" style={{ width: miniW * 2.6, height: miniW * 1.25 }}>
          {Array.from({ length: shown }).map((_, i) => {
            const off = shown === 1 ? 0 : i / (shown - 1) - 0.5;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-0"
                style={{
                  transform: `translateX(-50%) translateX(${off * fan.offset * 2}px) rotate(${off * fan.tilt * 2}deg)`,
                  transformOrigin: '50% 140%',
                }}
              >
                {flipFaces?.[i] ? <CardView card={flipFaces[i]} side={otherSide} width={miniW} /> : <CardView faceDown width={miniW} />}
              </div>
            );
          })}
        </div>

        {/* avatar */}
        <div
          className={`relative z-10 flex items-center justify-center rounded-full border-[3px] border-[var(--ink)] ${isTurn ? 'animate-pulseRing' : ''} ${aura}`}
          style={{
            width: avatar,
            height: avatar,
            marginTop: -miniW * 0.55,
            fontSize: avatar * 0.56,
            boxShadow: isTurn ? undefined : '0 3px 0 var(--ink)',
            background: isTurn ? 'var(--turn-bg)' : player.connected ? 'var(--surface)' : '#cfcadb',
            filter: player.connected ? undefined : 'grayscale(1)',
          }}
        >
          {/* A transformed wrapper would collapse a picture avatar, so pictures wiggle themselves. */}
          {player.avatar.startsWith('img:') ? (
            <Avatar value={player.avatar} fill className={isTurn && player.kind === 'bot' ? 'animate-wiggle' : ''} />
          ) : (
            <span className={isTurn && player.kind === 'bot' ? 'animate-wiggle inline-block' : ''}>{player.avatar}</span>
          )}
          {voice?.speaking && !voice.muted && <span className="voice-ring" aria-hidden="true" />}

          {/* card count */}
          <div
            className={`font-ui absolute flex items-center justify-center rounded-full border-[2.5px] border-[var(--ink)] leading-none ${
              low ? 'bg-[var(--red)] text-white animate-buzz' : danger ? 'bg-[#ffe1e1] text-[#b3141c]' : 'bg-[var(--surface)] text-[var(--ink)]'
            }`}
            style={{
              right: compact ? -11 : -14,
              top: compact ? -6 : -4,
              minWidth: compact ? 23 : 30,
              height: compact ? 23 : 30,
              padding: '0 4px',
              fontSize: compact ? 13 : 18,
              boxShadow: '0 2px 0 var(--ink)',
            }}
            title={`${count} card${count === 1 ? '' : 's'}`}
          >
            {count}
            {danger && <span className="ml-0.5 text-[0.7em]">/25</span>}
          </div>

          {/* voice: their mic is on — tap to mute them for you */}
          {voice && (voice.mic || voice.muted) && (
            <button
              type="button"
              onClick={() => onToggleMute?.(seat)}
              className={`absolute flex items-center justify-center rounded-full border-2 border-[var(--ink)] shadow-[0_2px_0_var(--ink)] ${
                voice.muted ? 'bg-[#ffe1e1]' : voice.speaking ? 'bg-[#3ddc84]' : 'bg-[var(--surface)]'
              }`}
              style={{ left: compact ? -10 : -12, bottom: compact ? -4 : -2, width: compact ? 21 : 26, height: compact ? 21 : 26, fontSize: compact ? 11 : 13 }}
              aria-label={voice.muted ? `Unmute ${player.name}` : `Mute ${player.name}`}
              title={voice.muted ? 'Muted — tap to hear them' : 'Tap to mute'}
            >
              {voice.muted ? '🔇' : '🎙️'}
            </button>
          )}

          {player.out && (
            <div className="font-display absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-lg border-[3px] border-[#d91f27] bg-white/90 px-1.5 text-base text-[#d91f27]">
              OUT
            </div>
          )}

          {player.saidUno && count === 1 && (
            <div className="font-display absolute -left-3 -top-2 z-20 -rotate-12 rounded-lg border-2 border-[var(--ink)] bg-[var(--yellow)] px-1.5 text-[11px] leading-5 text-[var(--ink)] shadow-[0_2px_0_var(--ink)]">
              NUNO!
            </div>
          )}
        </div>

        {/* name plate */}
        <div
          className={`font-ui relative z-20 -mt-2 border-[2.5px] border-[var(--ink)] text-center leading-[1.1] shadow-[0_2px_0_var(--ink)] ${
            twoLines ? 'line-clamp-2 rounded-xl' : 'truncate whitespace-nowrap rounded-full'
          } ${isTurn ? 'bg-[var(--yellow)] text-[var(--ink)]' : 'bg-[var(--surface)] text-[var(--ink)]'}`}
          style={{ fontSize: nameSize, padding: compact ? '2px 7px' : '2px 10px', width: 'max-content', maxWidth: nameMax }}
          title={player.name}
        >
          {player.name}
        </div>

        <div className="mt-0.5 flex h-4 items-center gap-1">
          {isNext && !isTurn && (
            <span className="font-ui rounded-full bg-[var(--ink)] px-1.5 text-[9.5px] uppercase leading-4 tracking-wider text-white">next</span>
          )}
          {isTurn && player.kind === 'bot' && (
            <span className="thinking-dots rounded-full bg-[var(--surface)] px-1.5 leading-4 [&>span]:!h-1 [&>span]:!w-1">
              <span />
              <span />
              <span />
            </span>
          )}
          {showScore && !compact && (
            <span className="font-ui rounded-full bg-black/45 px-1.5 text-[11px] leading-4 text-white">{player.score} pts</span>
          )}
          {rank && !isTurn && !isNext ? (
            <span className={`font-ui truncate rounded-full bg-black/55 px-1.5 leading-4 text-white ${compact ? 'max-w-[80px] text-[9.5px]' : 'max-w-[110px] text-[10.5px]'}`}>
              {rank}
            </span>
          ) : (
            player.kind === 'bot' &&
            !compact &&
            !isTurn &&
            !isNext && <span className="font-ui rounded-full bg-black/45 px-1.5 text-[10px] uppercase leading-4 tracking-wider text-white/90">bot</span>
          )}
        </div>

        {/* catch button (they forgot to shout NUNO) */}
        {catchable && (
          <button
            onClick={() => onCatch(seat)}
            className={`btn btn-red animate-shake absolute left-1/2 top-[-6px] z-30 -translate-x-1/2 ${compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}
            style={{ pointerEvents: 'auto' }}
          >
            CATCH! 👉
          </button>
        )}

        {/* speech bubble */}
        {bubble && <SpeechBubble key={bubble.id} bubble={bubble} align={bubbleAlign} compact={compact} />}
      </div>
    </div>
  );
});

const TONES: Record<Bubble['tone'], string> = {
  info: 'bg-[var(--surface)] text-[var(--ink)]',
  bad: 'bg-[#ffe1e1] text-[#a3121a]',
  good: 'bg-[#dcffe5] text-[#106628]',
  uno: 'bg-[var(--yellow)] text-[var(--ink)]',
  emote: 'bg-[var(--surface)] text-[var(--ink)]',
};

export function SpeechBubble({
  bubble,
  above = false,
  align = 'center',
  compact = false,
}: {
  bubble: Bubble;
  above?: boolean;
  align?: 'left' | 'center' | 'right';
  compact?: boolean;
}) {
  const pos = align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';
  const tail = align === 'left' ? 'left-6' : align === 'right' ? 'right-6' : 'left-1/2 -translate-x-1/2';
  const big = bubble.tone === 'uno';
  return (
    <div className={`pointer-events-none absolute z-40 ${pos} ${above ? 'bottom-full mb-2' : 'top-full mt-1.5'}`}>
      <div
        className={`font-ui relative whitespace-nowrap rounded-2xl border-[2.5px] border-[var(--ink)] shadow-[0_3px_0_var(--ink)] animate-popIn ${TONES[bubble.tone]} ${
          compact ? `px-2 py-0.5 ${big ? 'text-[14px]' : 'text-[12px]'}` : `px-3 py-1 ${big ? 'text-lg' : 'text-sm'}`
        }`}
      >
        {bubble.text}
        <span
          className={`absolute ${tail} h-3 w-3 rotate-45 border-[var(--ink)] ${TONES[bubble.tone].split(' ')[0]} ${
            above ? '-bottom-[7px] border-b-[2.5px] border-r-[2.5px]' : '-top-[7px] border-l-[2.5px] border-t-[2.5px]'
          }`}
        />
      </div>
    </div>
  );
}
