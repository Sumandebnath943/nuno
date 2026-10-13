import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Card, Color, GameEvent, GameView, Phase, PublicPlayer } from '../../game/types';
import { cardLabel, COLOR_NAMES, VALUE_NAMES } from '../../game/cards';
import { WHEEL_INFO } from '../../lib/modeGuide';
import { GENERAL_TAUNTS, THEME_TAUNTS, type Taunt } from '../../lib/taunts';
import { burstPoints } from '../../themes/art';
import { useTheme } from '../../themes';
import type { Bubble, Splash } from './useTableFx';
import { SpeechBubble } from './Seat';
import { Avatar } from '../Avatar';

// ── your name plate ─────────────────────────────────────────

/** How long you wait between two taunts. */
export const TAUNT_COOLDOWN = 2500;

interface PlateProps {
  me: PublicPlayer;
  count: number;
  myTurn: boolean;
  showScore: boolean;
  compact: boolean;
  bubble?: Bubble;
  onTaunt: (id: string) => void;
  /** No Mercy: show how close you are to the 25-card knockout. */
  mercy?: boolean;
  /** The theme's title for you ("Jonin", "PL 1,285"). */
  rank?: string;
  /** Extra classes for the avatar (theme auras). */
  aura?: string;
}

export function MyPlate({ me, count, myTurn, showScore, compact, bubble, onTaunt, mercy = false, rank, aura = '' }: PlateProps) {
  const [open, setOpen] = useState(false);
  const av = compact ? 40 : 54;
  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 rounded-2xl border-[3px] border-[var(--ink)] pr-1.5 shadow-[0_4px_0_var(--ink)] transition-colors ${
          myTurn ? 'bg-[var(--turn-bg)]' : 'bg-[var(--cream)]'
        } ${compact ? 'p-1' : 'p-1.5'}`}
      >
        <div
          className={`relative flex shrink-0 items-center justify-center rounded-full border-[3px] border-[var(--ink)] bg-[var(--surface)] ${myTurn ? 'animate-pulseRing' : ''} ${aura}`}
          style={{ width: av, height: av, fontSize: av * 0.55 }}
        >
          <Avatar value={me.avatar} fill />
        </div>
        <div className="min-w-0 text-[var(--ink)]">
          <div className={`font-display truncate leading-tight ${compact ? 'max-w-[84px] text-sm' : 'max-w-[120px] text-base'}`}>
            {me.name}
          </div>
          <div className={`text-xs font-semibold leading-tight ${mercy && count >= 20 ? 'text-[#d91f27]' : 'text-[var(--muted)]'}`}>
            {mercy ? `${count}/25 cards` : `${count} card${count === 1 ? '' : 's'}`}
            {showScore && ` · ${me.score} pts`}
          </div>
          {rank && !compact && <div className="font-display truncate text-[11px] leading-tight text-[var(--link)]">{rank}</div>}
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className={`ml-0.5 flex h-9 shrink-0 items-center justify-center gap-1 rounded-xl border-2 border-[var(--ink)] px-2 text-base text-[var(--ink)] shadow-[0_2px_0_var(--ink)] transition-transform hover:-translate-y-0.5 ${
            open ? 'bg-[var(--accent-a)]' : 'bg-[var(--surface)]'
          }`}
          aria-label="Trash talk"
          aria-expanded={open}
          title="Trash talk"
        >
          💬{!compact && <span className="font-display text-xs">Talk</span>}
        </button>
      </div>
      {open && <TauntPicker onPick={(id) => onTaunt(id)} onClose={() => setOpen(false)} />}
      {bubble && !open && <SpeechBubble key={bubble.id} bubble={bubble} above />}
    </div>
  );
}

/** The ready-made trash talk: the theme's lines first, then the classics. */
function TauntPicker({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  const theme = useTheme();
  const [cooling, setCooling] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const themed = THEME_TAUNTS[theme.id];
  const groups: [string, Taunt[]][] = themed.length ? [[`${theme.emoji} ${theme.title}`, themed], ['🗯️ Classics', GENERAL_TAUNTS]] : [['🗯️ Trash talk', GENERAL_TAUNTS]];

  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('[aria-label="Trash talk"]')) onClose();
    };
    window.addEventListener('pointerdown', away);
    return () => window.removeEventListener('pointerdown', away);
  }, [onClose]);

  useEffect(() => {
    if (!cooling) return;
    const id = setTimeout(() => setCooling(0), TAUNT_COOLDOWN);
    return () => clearTimeout(id);
  }, [cooling]);

  return (
    <div
      ref={ref}
      className="panel absolute bottom-full left-0 z-50 mb-3 w-[min(92vw,360px)] !rounded-2xl p-2 animate-popIn"
      role="menu"
      aria-label="Trash talk"
    >
      <div className="nice-scroll max-h-[46dvh] overflow-y-auto pr-1">
        {groups.map(([title, list]) => (
          <div key={title} className="mb-1.5 last:mb-0">
            <div className="label px-1 pb-1">{title}</div>
            <div className="grid grid-cols-2 gap-1.5">
              {list.map((x) => (
                <button
                  key={x.id}
                  role="menuitem"
                  disabled={!!cooling}
                  onClick={() => {
                    onPick(x.id);
                    setCooling(Date.now());
                    onClose();
                  }}
                  className="rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] px-2 py-1.5 text-left text-[13px] font-semibold leading-tight text-[var(--ink)] shadow-[0_2px_0_var(--ink)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-50"
                >
                  {x.text}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A taunt floating up from a seat. */
export interface FloatingTaunt {
  key: string;
  x: number;
  y: number;
  text: string;
  avatar: string;
}

export function TauntLayer({ taunts }: { taunts: FloatingTaunt[] }) {
  const theme = useTheme();
  return (
    <div className="pointer-events-none absolute inset-0 z-[47]" aria-live="polite">
      {taunts.map((t) => (
        <div key={t.key} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: t.x, top: t.y }}>
          <div
            className="taunt-float font-display flex max-w-[min(70vw,280px)] items-center gap-1.5 rounded-2xl border-[3px] border-[var(--ink)] px-3 py-1.5 text-[15px] leading-tight text-[var(--ink)] shadow-[0_4px_0_var(--ink)]"
            style={{ background: theme.id === 'classic' ? '#fff' : 'var(--highlight)' }}
          >
            <span className="text-xl leading-none">
              <Avatar value={t.avatar} className="!h-9 !w-9 border-2 border-[var(--ink)]" />
            </span>
            <span>{t.text}</span>
          </div>
        </div>
      ))}
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
  const theme = useTheme();
  return (
    // The outer box centres the text; framer-motion owns the inner transform.
    <div
      className="pointer-events-none absolute z-[48] flex -translate-x-1/2 -translate-y-1/2 justify-center"
      style={{ left: x, top: y }}
      aria-live="polite"
    >
      {/* One splash at a time: the old one gets out of the way before the next pops in,
          so two half-faded messages never sit on top of each other. */}
      <AnimatePresence mode="wait" initial={false}>
        {splash && (
          <motion.div
            key={splash.id}
            className="relative flex flex-col items-center"
            initial={{ scale: 0.3, opacity: 0, rotate: -10 }}
            animate={{ scale: [0.3, 1.14, 1], opacity: 1, rotate: -4 }}
            exit={{ scale: 0.92, opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.34, times: [0, 0.65, 1], ease: 'easeOut' }}
          >
            {/* A soft dark pool behind the message so it reads over cards and banners. */}
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: 'calc(100% + 180px)',
                height: 'calc(100% + 110px)',
                background: 'radial-gradient(closest-side, rgba(10,8,25,0.72), rgba(10,8,25,0.5) 55%, rgba(10,8,25,0) 100%)',
              }}
            />
            {splash.kicker && (
              <span
                className="splash-kicker relative z-[2] mb-2 whitespace-nowrap rounded-lg border-[2.5px] border-[var(--ink)] px-2.5 py-0.5 text-sm uppercase shadow-[0_3px_0_var(--ink)]"
                style={{ background: theme.splash.kickerBg ?? '#fff', color: theme.splash.kickerInk ?? 'var(--ink)' }}
              >
                {splash.kicker}
              </span>
            )}
            <span className="relative z-[1] inline-block">
              <SplashBackdrop kind={theme.splash.backdrop} color={theme.splash.color} ink={theme.splash.ink} />
              <span
                className="font-display relative whitespace-nowrap leading-none"
                style={splashStyle(splash.color, scale * Math.min(1, 9 / splash.text.length), theme.cardColors)}
              >
                {splash.text}
              </span>
            </span>
            {splash.small && (
              <span className="font-display relative z-[2] mt-3 max-w-[88vw] truncate whitespace-nowrap rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--surface)] px-3 py-0.5 text-sm text-[var(--ink)] shadow-[0_3px_0_var(--ink)]">
                {splash.small}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The theme's shape behind the big words: comic burst, ink brush, scroll, steel plate or ki glow. */
function SplashBackdrop({ kind, color = '#fff', ink = '#1b1530' }: { kind: string; color?: string; ink?: string }) {
  if (kind === 'none') return null;
  const box = 'pointer-events-none absolute';
  switch (kind) {
    case 'burst':
      return (
        <svg className={box} style={{ inset: '-55% -28%' }} viewBox="-100 -60 200 120" preserveAspectRatio="none" aria-hidden="true">
          <polygon points={burstPoints(14, 100, 62, 0, 0, 0.3, 4)} fill={ink} transform="translate(4 6)" />
          <polygon points={burstPoints(14, 100, 62, 0, 0, 0.3, 4)} fill={color} stroke={ink} strokeWidth="4" strokeLinejoin="round" />
          <polygon points={burstPoints(14, 70, 44, 0, 0, 0.25, 8)} fill="#fff" opacity="0.35" />
        </svg>
      );
    case 'brush':
      return (
        <svg className={box} style={{ inset: '-30% -16%' }} viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M4 32 C 18 8, 62 12, 100 9 S 178 3, 196 20 C 199 33, 189 50, 150 53 S 62 58, 26 55 C 10 53, 1 44, 4 32 Z"
            fill={color}
            opacity="0.94"
          />
          <path d="M 12 14 Q 70 6 150 10" stroke={color} strokeWidth="2" fill="none" opacity="0.6" />
          <path d="M 40 58 Q 110 62 188 50" stroke={color} strokeWidth="2.5" fill="none" opacity="0.5" />
        </svg>
      );
    case 'scroll':
      return (
        <svg className={box} style={{ inset: '-30% -22%' }} viewBox="0 0 220 64" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 0 14 L 26 14 L 26 58 L 0 58 L 10 36 Z" fill="#c9a66b" stroke={ink} strokeWidth="2.5" />
          <path d="M 220 14 L 194 14 L 194 58 L 220 58 L 210 36 Z" fill="#c9a66b" stroke={ink} strokeWidth="2.5" />
          <rect x="16" y="6" width="188" height="48" rx="4" fill={color} stroke={ink} strokeWidth="3" />
          <path d="M 16 54 L 26 58 L 26 50 Z M 204 54 L 194 58 L 194 50 Z" fill="#8a6a3b" />
        </svg>
      );
    case 'plate':
      return (
        <svg className={box} style={{ inset: '-28% -14%' }} viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="splash-steel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d8dde2" />
              <stop offset="0.5" stopColor={color} />
              <stop offset="1" stopColor="#5b6168" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="196" height="56" rx="6" fill="url(#splash-steel)" stroke={ink} strokeWidth="3" />
          {[
            [10, 10],
            [190, 10],
            [10, 50],
            [190, 50],
          ].map(([cx, cy]) => (
            <circle key={`${cx}${cy}`} cx={cx} cy={cy} r="3" fill="#3a3f45" />
          ))}
        </svg>
      );
    case 'glow':
      return (
        <svg className={box} style={{ inset: '-80% -36%' }} viewBox="-100 -60 200 120" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <radialGradient id="splash-ki">
              <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
              <stop offset="0.45" stopColor={color} stopOpacity="0.75" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </radialGradient>
          </defs>
          <polygon points={burstPoints(20, 100, 50, 0, 0, 0.5, 11)} fill={color} opacity="0.35" />
          <ellipse rx="96" ry="56" fill="url(#splash-ki)" />
        </svg>
      );
    default:
      return null;
  }
}

function splashStyle(
  color: Splash['color'],
  scale: number,
  pal: Record<Color, { base: string }>,
): React.CSSProperties {
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
        `6px 8px 0 ${pal.red.base}`,
        `10px 13px 0 ${pal.yellow.base}`,
        `14px 18px 0 ${pal.green.base}`,
        `18px 23px 0 ${pal.blue.base}`,
      ].join(','),
    };
  }
  return {
    fontSize: 92 * scale,
    color: color ? pal[color].base : '#fff',
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
  hidden = false,
}: {
  view: GameView;
  hint: string;
  x: number;
  y: number;
  compact?: boolean;
  /** A splash is showing: step aside so the two don't overlap. */
  hidden?: boolean;
}) {
  if (view.phase === 'roundOver' || view.phase === 'gameOver') return null;
  const fade: React.CSSProperties = { left: x, top: y, opacity: hidden ? 0 : 1, transition: 'opacity 0.15s' };
  if (view.phase === 'unoSpinRace') {
    return (
      <div
        className="pointer-events-none absolute z-[26] flex -translate-x-1/2 flex-col items-center"
        style={fade}
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
    <div className="pointer-events-none absolute z-[26] flex -translate-x-1/2 flex-col items-center" style={fade}>
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
          <span className="text-xl">
            <Avatar value={waitingOn?.avatar} />
          </span>
          {waitingOn?.name}
          {WAITING[view.phase] ?? (view.stack ? ` must stack or take +${view.stack.total}` : '’s turn')}
        </span>
      )}
    </div>
  );
}

/** A line describing one event, or null for events that aren't worth a line. */
export function describeEvent(view: GameView, e: GameEvent, prev?: GameEvent): string | null {
  const name = (i: number) => (i === view.me ? 'You' : (view.players[i]?.name ?? 'Someone'));
  switch (e.type) {
    case 'play':
      return `${name(e.player)} played ${cardLabel(e.card)}${e.chosenColor ? ` → ${COLOR_NAMES[e.chosenColor as Color]}` : ''}${
        e.target !== undefined ? ` on ${name(e.target)}` : ''
      }`;
    case 'draw':
      if (e.reason === 'launch') return null;
      if (e.reason === 'turn') return `${name(e.player)} drew ${e.count === 1 ? 'a card' : `${e.count} cards`}`;
      if (e.reason === 'penalty') return `${name(e.player)} drew 2 for not shouting NUNO`;
      return `${name(e.player)} drew ${e.count}`;
    case 'skip':
      return `${name(e.player)} ${e.player === view.me ? 'were' : 'was'} skipped`;
    case 'reverse':
      return 'Direction reversed';
    case 'pass':
      if (view.mode === 'attack') return null;
      return `${name(e.player)} passed`;
    case 'firstCard':
      return `First card: ${cardLabel(e.card)}`;
    case 'colorChange':
      if (prev?.type === 'play') return null; // the play line already names the colour
      return `${name(e.player)} picked ${COLOR_NAMES[e.color]}`;
    case 'uno':
      return `${name(e.player)} shouted NUNO!`;
    case 'caught':
      return `${name(e.by)} caught ${name(e.player)}!`;
    case 'challenge':
      return e.guilty ? `${name(e.offender)} was bluffing!` : `${name(e.offender)} played it legally`;
    case 'accept4':
      return `${name(e.player)} took it without a challenge`;
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
    case 'reshuffle':
      return 'The discard pile was reshuffled';
    case 'roundOver':
      return `${name(e.winner)} won the round (+${e.points})`;
    default:
      return null;
  }
}

/** One line under the piles saying what just happened. */
export function eventLine(view: GameView): string | null {
  for (let i = view.events.length - 1; i >= 0; i--) {
    const e = view.events[i];
    if (e.type === 'skip' || e.type === 'uno' || e.type === 'reverse' || e.type === 'accept4') continue;
    const line = describeEvent(view, e, view.events[i - 1]);
    if (line) return line;
  }
  return null;
}

/** The recent history, newest first, for the log panel. */
export function recentEvents(view: GameView, max = 16): { seq: number; text: string; who: number | null }[] {
  const out: { seq: number; text: string; who: number | null }[] = [];
  for (let i = view.events.length - 1; i >= 0 && out.length < max; i--) {
    const e = view.events[i];
    if (e.type === 'deal') break;
    const text = describeEvent(view, e, view.events[i - 1]);
    if (!text) continue;
    const who = e.type === 'caught' ? e.by : 'player' in e ? e.player : e.type === 'stack' ? e.victim : null;
    out.push({ seq: e.seq, text, who });
  }
  return out;
}

export function EventLog({ view, onClose }: { view: GameView; onClose: () => void }) {
  const items = recentEvents(view);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('[data-log-toggle]')) onClose();
    };
    window.addEventListener('pointerdown', away);
    return () => window.removeEventListener('pointerdown', away);
  }, [onClose]);
  return (
    <div ref={ref} className="panel absolute right-2 top-full z-50 mt-2 w-[min(92vw,340px)] !rounded-2xl p-2 animate-popIn sm:right-4">
      <div className="label px-1 pb-1">What just happened</div>
      <ol className="nice-scroll max-h-[52dvh] space-y-1 overflow-y-auto pr-1">
        {items.length === 0 && <li className="px-1 py-2 text-sm text-[var(--muted)]">Nothing yet — the round just started.</li>}
        {items.map((it, i) => (
          <li
            key={it.seq}
            className={`flex items-start gap-2 rounded-xl px-2 py-1 text-[13px] font-semibold leading-snug text-[var(--soft)] ${i === 0 ? 'bg-[var(--highlight)]' : 'bg-[var(--surface)]'}`}
          >
            <span className="w-5 shrink-0 text-center text-base leading-5">{it.who !== null ? <Avatar value={view.players[it.who]?.avatar} /> : '🃏'}</span>
            <span>{it.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
