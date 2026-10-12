import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Card, Color, GameEvent, GameView, Phase, PublicPlayer } from '../../game/types';
import { cardLabel, COLOR_NAMES, VALUE_NAMES } from '../../game/cards';
import { WHEEL_INFO } from '../../lib/modeGuide';
import { CARD_COLORS } from '../../lib/theme';
import type { Bubble, Splash } from './useTableFx';
import { SpeechBubble } from './Seat';

// ── your name plate ─────────────────────────────────────────

export const EMOTES = ['😂', '😎', '😱', '😡', '👏', '🔥', '🙏', '🤡'];

interface PlateProps {
  me: PublicPlayer;
  count: number;
  myTurn: boolean;
  showScore: boolean;
  compact: boolean;
  bubble?: Bubble;
  onEmote: (emoji: string) => void;
  /** No Mercy: show how close you are to the 25-card knockout. */
  mercy?: boolean;
}

export function MyPlate({ me, count, myTurn, showScore, compact, bubble, onEmote, mercy = false }: PlateProps) {
  const [open, setOpen] = useState(false);
  const av = compact ? 40 : 54;
  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 rounded-2xl border-[3px] border-[var(--ink)] pr-1.5 shadow-[0_4px_0_var(--ink)] transition-colors ${
          myTurn ? 'bg-[#fff1a8]' : 'bg-[var(--cream)]'
        } ${compact ? 'p-1' : 'p-1.5'}`}
      >
        <div
          className={`flex shrink-0 items-center justify-center rounded-full border-[3px] border-[var(--ink)] bg-white ${myTurn ? 'animate-pulseRing' : ''}`}
          style={{ width: av, height: av, fontSize: av * 0.55 }}
        >
          {me.avatar}
        </div>
        <div className="min-w-0 text-[var(--ink)]">
          <div className={`font-display truncate leading-tight ${compact ? 'max-w-[84px] text-sm' : 'max-w-[120px] text-base'}`}>
            {me.name}
          </div>
          <div className={`text-xs font-semibold leading-tight ${mercy && count >= 20 ? 'text-[#d91f27]' : 'text-[#6b6385]'}`}>
            {mercy ? `${count}/25 cards` : `${count} card${count === 1 ? '' : 's'}`}
            {showScore && ` · ${me.score} pts`}
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="ml-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg transition-transform hover:scale-110 hover:bg-black/5"
          aria-label="Send a reaction"
          title="Send a reaction"
        >
          😀
        </button>
      </div>
      {open && (
        <div className="panel absolute bottom-full left-0 mb-3 grid grid-cols-4 gap-1 !rounded-2xl p-2 animate-popIn">
          {EMOTES.map((e) => (
            <button
              key={e}
              onClick={() => {
                onEmote(e);
                setOpen(false);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl transition-transform hover:scale-125 hover:bg-black/5"
            >
              {e}
            </button>
          ))}
        </div>
      )}
      {bubble && !open && <SpeechBubble key={bubble.id} bubble={bubble} above />}
    </div>
  );
}

// ── the NUNO buzzer ─────────────────────────────────────────

export type NunoState = 'idle' | 'ready' | 'urgent' | 'done';

export function nunoState(view: GameView): NunoState {
  const me = view.players[view.me];
  const cards = view.myHand.length;
  if (view.unoVulnerable === view.me) return 'urgent';
  if (me.saidUno && cards <= 2) return 'done';
  const active = view.phase === 'play' || view.phase === 'drawn';
  if (view.current === view.me && active && cards === 2) return 'ready';
  return 'idle';
}

const NUNO_HINT: Record<NunoState, string> = {
  idle: 'Shout at 2 cards',
  ready: 'Shout, then play!',
  urgent: 'QUICK! Shout it!',
  done: 'Shouted!',
};

export function NunoButton({
  state,
  size,
  onPress,
  compact = false,
}: {
  state: NunoState;
  size: number;
  onPress: () => void;
  compact?: boolean;
}) {
  const bg =
    state === 'done'
      ? 'radial-gradient(circle at 35% 30%, #7af09a, #22a447 70%)'
      : state === 'idle'
        ? 'radial-gradient(circle at 35% 30%, #b9b2cc, #7d7596 70%)'
        : 'radial-gradient(circle at 35% 30%, #ff7a7e, #d91f27 70%)';
  return (
    <div className="flex flex-col items-center">
      <button
        onClick={onPress}
        aria-label="Shout NUNO"
        title="Shout NUNO (U or Space)"
        className={`font-display relative rounded-full border-4 border-[var(--ink)] text-white transition-transform active:translate-y-1 ${
          state === 'urgent' ? 'animate-shake' : state === 'ready' ? 'animate-buzz' : ''
        }`}
        style={{
          width: size,
          height: size,
          background: bg,
          boxShadow: `0 ${size * 0.07}px 0 var(--ink), inset 0 -${size * 0.06}px 0 rgba(0,0,0,0.2)`,
          fontSize: size * 0.25,
          textShadow: '0 2px 0 var(--ink), 2px 0 0 var(--ink), -2px 0 0 var(--ink), 0 -2px 0 var(--ink)',
        }}
      >
        {(state === 'ready' || state === 'urgent') && (
          <span className="absolute inset-0 rounded-full animate-pulseRing" aria-hidden="true" />
        )}
        {state === 'done' ? '✓' : 'NUNO!'}
      </button>
      {/* On phones only the urgent states get a caption, to save room. */}
      {(!compact || state === 'ready' || state === 'urgent') && (
        <span
          className={`font-display mt-2 whitespace-nowrap uppercase tracking-wider ${compact ? 'text-[10px]' : 'text-xs'} ${
            state === 'urgent' ? 'text-[#ff8a8e]' : state === 'ready' ? 'text-[var(--yellow)]' : 'text-white/60'
          }`}
        >
          {NUNO_HINT[state]}
        </span>
      )}
    </div>
  );
}

// ── big centre splash ───────────────────────────────────────

export function SplashText({ splash, x, y, scale }: { splash: Splash | null; x: number; y: number; scale: number }) {
  return (
    // The outer box centres the text; framer-motion owns the inner transform.
    <div
      className="pointer-events-none absolute z-[48] flex -translate-x-1/2 -translate-y-1/2 justify-center"
      style={{ left: x, top: y }}
      aria-live="polite"
    >
      <AnimatePresence>
        {splash && (
          <motion.div
            key={splash.id}
            className="flex flex-col items-center"
            initial={{ scale: 0.2, opacity: 0, rotate: -12 }}
            animate={{ scale: [0.2, 1.18, 1], opacity: 1, rotate: -5 }}
            exit={{ scale: 1.25, opacity: 0, y: -30, transition: { duration: 0.25 } }}
            transition={{ duration: 0.4, times: [0, 0.65, 1], ease: 'easeOut' }}
          >
            <span
              className="font-display whitespace-nowrap leading-none"
              style={splashStyle(splash.color, scale * Math.min(1, 9 / splash.text.length))}
            >
              {splash.text}
            </span>
            {splash.small && (
              <span className="font-display mt-3 whitespace-nowrap rounded-full border-[2.5px] border-[var(--ink)] bg-white px-3 py-0.5 text-sm text-[var(--ink)] shadow-[0_3px_0_var(--ink)]">
                {splash.small}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function splashStyle(color: Splash['color'], scale: number): React.CSSProperties {
  const o = 4;
  const outline = [
    `${o}px 0 0 var(--ink)`,
    `-${o}px 0 0 var(--ink)`,
    `0 ${o}px 0 var(--ink)`,
    `0 -${o}px 0 var(--ink)`,
    `${o}px ${o}px 0 var(--ink)`,
    `-${o}px ${o}px 0 var(--ink)`,
    `${o}px -${o}px 0 var(--ink)`,
    `-${o}px -${o}px 0 var(--ink)`,
  ];
  if (color === 'wild') {
    return {
      fontSize: 92 * scale,
      color: '#fff',
      textShadow: [
        ...outline,
        `6px 8px 0 ${CARD_COLORS.red.base}`,
        `10px 13px 0 ${CARD_COLORS.yellow.base}`,
        `14px 18px 0 ${CARD_COLORS.green.base}`,
        `18px 23px 0 ${CARD_COLORS.blue.base}`,
      ].join(','),
    };
  }
  return {
    fontSize: 92 * scale,
    color: color ? CARD_COLORS[color].base : '#fff',
    textShadow: [...outline, '0 10px 0 var(--ink)'].join(','),
  };
}

// ── status banner & ticker ──────────────────────────────────

export function turnHint(view: GameView, playable: number): string {
  const top = view.discardTop[view.discardTop.length - 1];
  switch (view.phase) {
    case 'drawn':
      return view.drawnMustPlay ? 'You drew a match — now play it!' : 'You drew a match — play it or keep it';
    case 'chooseColor':
      return 'Name the colour';
    case 'roulette':
      return 'Name a colour — you flip cards until it shows up';
    case 'challenge':
      return 'Challenge it, or take it?';
    case 'launch':
      return view.launch?.untilFire ? 'Hit the launcher until it fires!' : `Hit the launcher (${view.launch?.presses ?? 1} left)`;
    case 'spin':
      return 'Spin the wheel!';
    case 'wheelPick':
    case 'unoSpinPick':
      return 'Choose what to discard';
    case 'play': {
      if (view.stack) {
        return playable
          ? `Stack a +${view.stack.last} or bigger — or take +${view.stack.total}`
          : `Nothing to stack — take +${view.stack.total}`;
      }
      if (view.mode === 'allwild') return 'Play any card — or gamble on a draw';
      if (!playable) {
        if (view.mode === 'attack') return 'No match — hit the launcher';
        if (view.mode === 'nomercy') return 'No match — draw until you can play';
        return 'No match — draw a card';
      }
      const color = COLOR_NAMES[view.currentColor];
      if (!top || top.color === 'wild') return `Play ${article(color)} ${color} card or a Wild`;
      return `Match ${color} or ${valueName(top)} — or play a Wild`;
    }
    default:
      return '';
  }
}

function article(word: string) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

function valueName(c: Card) {
  return /^\d$/.test(c.value) ? c.value : (VALUE_NAMES[c.value] ?? c.value);
}

const WAITING: Partial<Record<Phase, string>> = {
  chooseColor: ' is naming a colour…',
  roulette: ' is naming a colour…',
  challenge: ' is deciding…',
  launch: ' is hitting the launcher…',
  spin: ' has to spin…',
  wheelPick: ' is discarding…',
  unoSpinPick: ' is discarding…',
};

export function StatusBanner({
  view,
  hint,
  x,
  y,
  compact,
}: {
  view: GameView;
  hint: string;
  x: number;
  y: number;
  compact?: boolean;
}) {
  if (view.phase === 'roundOver' || view.phase === 'gameOver') return null;
  if (view.phase === 'unoSpinRace') {
    return (
      <div
        className="pointer-events-none absolute z-[26] flex -translate-x-1/2 flex-col items-center"
        style={{ left: x, top: y }}
      >
        <span
          className={`font-display outline-text whitespace-nowrap leading-none text-[var(--yellow)] animate-buzz ${compact ? 'text-2xl' : 'text-4xl'}`}
        >
          RACE!
        </span>
        <span className="font-display mt-2 whitespace-nowrap rounded-full bg-[rgba(27,21,48,0.75)] px-3 py-0.5 text-sm text-white">
          First to call NUNO Spin discards a card
        </span>
      </div>
    );
  }
  const who = view.actor ?? view.current;
  const mine = who === view.me;
  const waitingOn = view.players[who];
  return (
    <div className="pointer-events-none absolute z-[26] flex -translate-x-1/2 flex-col items-center" style={{ left: x, top: y }}>
      {mine ? (
        <>
          <span
            key={`me-${view.current}-${view.phase}`}
            className={`font-display outline-text whitespace-nowrap leading-none text-[var(--yellow)] animate-popIn ${compact ? 'text-2xl' : 'text-4xl'}`}
          >
            {view.phase === 'play' || view.phase === 'drawn' ? 'YOUR TURN!' : 'YOUR MOVE!'}
          </span>
          {hint && (
            <span className="font-display mt-2 max-w-[86vw] truncate whitespace-nowrap rounded-full bg-[rgba(27,21,48,0.75)] px-3 py-0.5 text-sm text-white">
              {hint}
            </span>
          )}
        </>
      ) : (
        <span
          key={`p-${who}-${view.phase}`}
          className="font-display flex max-w-[86vw] items-center gap-2 truncate whitespace-nowrap rounded-full bg-[rgba(27,21,48,0.7)] px-3 py-1 text-base text-white animate-fadeIn"
        >
          <span className="text-xl">{waitingOn?.avatar}</span>
          {waitingOn?.name}
          {WAITING[view.phase] ?? (view.stack ? ` must stack or take +${view.stack.total}` : '’s turn')}
        </span>
      )}
    </div>
  );
}

/** One line under the piles saying what just happened. */
export function eventLine(view: GameView): string | null {
  const name = (i: number) => (i === view.me ? 'You' : (view.players[i]?.name ?? 'Someone'));
  for (let i = view.events.length - 1; i >= 0; i--) {
    const e: GameEvent = view.events[i];
    switch (e.type) {
      case 'play':
        return `${name(e.player)} played ${cardLabel(e.card)}${e.chosenColor ? ` → ${COLOR_NAMES[e.chosenColor as Color]}` : ''}${
          e.target !== undefined ? ` on ${name(e.target)}` : ''
        }`;
      case 'draw':
        if (e.reason === 'launch') continue;
        if (e.reason === 'turn') return `${name(e.player)} drew ${e.count === 1 ? 'a card' : `${e.count} cards`}`;
        return `${name(e.player)} drew ${e.count}`;
      case 'pass':
        if (view.mode === 'attack') continue;
        return `${name(e.player)} passed`;
      case 'firstCard':
        return `First card: ${cardLabel(e.card)}`;
      case 'colorChange':
        if (view.events[i - 1]?.type === 'play') continue; // the play line already names the colour
        return `${name(e.player)} picked ${COLOR_NAMES[e.color]}`;
      case 'caught':
        return `${name(e.by)} caught ${name(e.player)}!`;
      case 'challenge':
        return e.guilty ? `${name(e.offender)} was bluffing!` : `${name(e.offender)} played it legally`;
      case 'stack':
        return `+${e.total} stacked on ${name(e.victim)}`;
      case 'eliminated':
        return `${name(e.player)} hit 25 cards and is OUT`;
      case 'swap':
        return `${name(e.a)} swapped hands with ${name(e.b)}`;
      case 'passHands':
        return 'Everyone passed their hand along';
      case 'flip':
        return `Flipped to the ${e.side === 'dark' ? 'Dark' : 'Light'} Side`;
      case 'launch':
        return `${name(e.player)} hit the launcher: ${e.count ? `${e.count} card${e.count === 1 ? '' : 's'}!` : 'nothing'}`;
      case 'spin':
        return `${name(e.player)} spun ${WHEEL_INFO[e.segment].name}`;
      case 'roulette':
        return `${name(e.player)} picked ${COLOR_NAMES[e.color]} for the roulette`;
      case 'discardAll':
      case 'wheelDiscard':
        return `${name(e.player)} discarded ${e.count}`;
      case 'unoSpinCall':
        return `${name(e.player)} called NUNO Spin first`;
      case 'skipAll':
        return `${name(e.player)} skipped everyone`;
      default:
        continue;
    }
  }
  return null;
}
