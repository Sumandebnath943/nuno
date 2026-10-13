import React, { useEffect, useRef, useState } from 'react';
import type { Card, Color, GameEvent, GameView, Phase, PublicPlayer } from '../../game/types';
import { cardLabel, COLOR_NAMES, VALUE_NAMES } from '../../game/cards';
import { WHEEL_INFO } from '../../lib/modeGuide';
import { GENERAL_TAUNTS, THEME_TAUNTS, type Taunt } from '../../lib/taunts';
import { fitFontSize, scaleOf, useFontMetrics } from '../../lib/fitText';
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
  /** Voice chat: you're talking right now. */
  speaking?: boolean;
}

export function MyPlate({ me, count, myTurn, showScore, compact, bubble, onTaunt, mercy = false, rank, aura = '', speaking = false }: PlateProps) {
  const [open, setOpen] = useState(false);
  useFontMetrics();
  const av = compact ? 40 : 54;
  const nameW = compact ? 92 : 128;
  const max = (compact ? 14 : 16) * scaleOf('--ufs');
  let nameSize = fitFontSize(me.name, nameW, { max, min: 8 });
  // Long names wrap onto a second line rather than getting cut off.
  const twoLines = nameSize < (compact ? 11 : 12.5) && me.name.includes(' ');
  if (twoLines) nameSize = Math.min(compact ? 12 : 14, fitFontSize(me.name, nameW * 1.75, { max, min: compact ? 10 : 11 }));
  else nameSize = Math.max(nameSize, compact ? 10 : 11);
  return (
    <div className="relative">
      <div
        className={`flex items-center gap-1.5 rounded-2xl border-[3px] border-[var(--ink)] pr-1 shadow-[0_4px_0_var(--ink)] transition-colors duration-300 ${
          myTurn ? 'bg-[var(--turn-bg)]' : 'bg-[var(--cream)]'
        } ${compact ? 'p-1' : 'gap-2 p-1.5 pr-1.5'}`}
      >
        <div
          className={`relative flex shrink-0 items-center justify-center rounded-full border-[3px] border-[var(--ink)] bg-[var(--surface)] ${myTurn ? 'animate-pulseRing' : ''} ${aura}`}
          style={{ width: av, height: av, fontSize: av * 0.55 }}
        >
          <Avatar value={me.avatar} fill />
          {speaking && <span className="voice-ring" aria-hidden="true" />}
        </div>
        <div className="min-w-0 text-[var(--ink)]" style={{ width: nameW }}>
          <div className={`font-ui leading-[1.1] ${twoLines ? 'line-clamp-2 break-words' : 'truncate'}`} style={{ fontSize: nameSize }} title={me.name}>
            {me.name}
          </div>
          <div className={`font-body truncate font-semibold leading-tight ${compact ? 'text-[11px]' : 'text-xs'} ${mercy && count >= 20 ? 'text-[#c0141c]' : 'text-[var(--muted)]'}`}>
            {mercy ? `${count}/25 cards` : `${count} card${count === 1 ? '' : 's'}`}
            {showScore && ` · ${me.score} pts`}
          </div>
          {rank && !compact && <div className="font-ui truncate text-[11px] leading-tight text-[var(--link)]">{rank}</div>}
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className={`flex shrink-0 items-center justify-center gap-1 rounded-xl border-2 border-[var(--ink)] text-[var(--ink)] shadow-[0_2px_0_var(--ink)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 ${
            compact ? 'h-8 w-8 text-sm' : 'h-9 px-2 text-base'
          } ${open ? 'bg-[var(--accent-a)]' : 'bg-[var(--surface)]'}`}
          aria-label="Trash talk"
          aria-expanded={open}
          title="Trash talk"
        >
          💬{!compact && <span className="font-ui text-xs">Talk</span>}
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
      className="panel absolute bottom-full left-0 z-50 mb-3 w-[min(calc(100vw-16px),360px)] !rounded-2xl p-2 animate-popIn"
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
                  className="font-body rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] px-2 py-1.5 text-left text-[13px] font-semibold leading-tight text-[var(--ink)] shadow-[0_2px_0_var(--ink)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-50"
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

export function TauntLayer({ taunts, compact = false }: { taunts: FloatingTaunt[]; compact?: boolean }) {
  const theme = useTheme();
  return (
    <div className="pointer-events-none absolute inset-0 z-[47]" aria-live="polite">
      {taunts.map((t) => (
        <div key={t.key} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: t.x, top: t.y }}>
          <div
            className={`taunt-float font-ui flex items-center rounded-2xl border-[3px] border-[var(--ink)] leading-tight text-[var(--ink)] shadow-[0_4px_0_var(--ink)] ${
              compact ? 'max-w-[min(64vw,240px)] gap-1 px-2 py-1 text-[12.5px]' : 'max-w-[min(70vw,300px)] gap-1.5 px-3 py-1.5 text-[15px]'
            }`}
            style={{ background: theme.id === 'classic' ? '#fff' : 'var(--highlight)' }}
          >
            <span className="relative shrink-0 overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--surface)] text-center leading-none" style={{ width: compact ? 24 : 34, height: compact ? 24 : 34, fontSize: compact ? 15 : 21, lineHeight: compact ? '20px' : '30px' }}>
              <Avatar value={t.avatar} fill />
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
    <div className="relative flex flex-col items-center">
      <button
        onClick={onPress}
        aria-label="Shout NUNO"
        title="Shout NUNO (U or Space)"
        className={`nuno-buzzer font-display relative rounded-full border-4 border-[var(--ink)] text-white ${
          state === 'urgent' ? 'animate-shake' : state === 'ready' ? 'animate-buzz' : ''
        }`}
        style={{
          width: size,
          height: size,
          background: bg,
          boxShadow: `0 ${size * 0.07}px 0 var(--ink), inset 0 -${size * 0.06}px 0 rgba(0,0,0,0.2), inset 0 ${size * 0.05}px 0 rgba(255,255,255,0.35)`,
          fontSize: `calc(${size * 0.24}px * var(--dfs))`,
          textShadow: '0 2px 0 var(--ink), 2px 0 0 var(--ink), -2px 0 0 var(--ink), 0 -2px 0 var(--ink)',
        }}
      >
        {(state === 'ready' || state === 'urgent') && <span className="absolute inset-0 rounded-full animate-pulseRing" aria-hidden="true" />}
        {state === 'done' ? '✓' : 'NUNO!'}
      </button>
      {/* On phones only the urgent states get a caption, to save room. */}
      {(!compact || state === 'ready' || state === 'urgent') && (
        <span
          className={`font-ui whitespace-nowrap rounded-full px-1.5 uppercase tracking-wider ${compact ? 'absolute -bottom-4 text-[9.5px] leading-4' : 'mt-2 text-xs'} ${
            state === 'urgent' ? 'bg-[#2a0d12]/80 text-[#ff9a9e]' : state === 'ready' ? 'bg-[var(--ink)]/70 text-[var(--yellow)]' : 'text-white/80'
          }`}
        >
          {NUNO_HINT[state]}
        </span>
      )}
    </div>
  );
}

// ── big centre splash ───────────────────────────────────────

interface SplashProps {
  splash: Splash | null;
  /** Centre of the words. */
  x: number;
  y: number;
  /** Widest the words may be. */
  maxWidth: number;
  /** Biggest font size, in px. */
  size: number;
  compact?: boolean;
}

/**
 * SKIP!, +4, WILD!… The words slam in over the theme's shape with an impact
 * ring and a fan of rays, breathe while they're up, then punch out towards you.
 * All of it is CSS on the compositor, so it stays smooth on a busy phone.
 */
export function SplashText({ splash, x, y, maxWidth, size, compact = false }: SplashProps) {
  const [shown, setShown] = useState<Splash | null>(splash);
  const [leaving, setLeaving] = useState<Splash | null>(null);
  const last = useRef<Splash | null>(splash);
  useEffect(() => {
    if (splash?.id === last.current?.id) return;
    const prev = last.current;
    last.current = splash;
    setShown(splash);
    if (!prev) return;
    setLeaving(prev);
    const t = setTimeout(() => setLeaving((l) => (l?.id === prev.id ? null : l)), 220);
    return () => clearTimeout(t);
  }, [splash]);

  const at = { x, y, maxWidth };
  return (
    <div className="pointer-events-none absolute inset-0 z-[48]" aria-live="polite">
      {leaving && <SplashBody key={leaving.id} splash={leaving} at={at} size={size} compact={compact} leaving />}
      {shown && <SplashBody key={shown.id} splash={shown} at={at} size={size} compact={compact} delayed={!!leaving} />}
    </div>
  );
}

function SplashBody({
  splash,
  at,
  size,
  compact,
  leaving = false,
  delayed = false,
}: {
  splash: Splash;
  at: { x: number; y: number; maxWidth: number };
  size: number;
  compact: boolean;
  leaving?: boolean;
  delayed?: boolean;
}) {
  const theme = useTheme();
  useFontMetrics();
  // Each splash stays where it appeared, even if the cut-in beside it ends first.
  const [{ x, y, maxWidth }] = useState(at);
  const pal = theme.cardColors;
  const outline = compact ? 3 : 4;
  const wild = splash.color === 'wild';
  const fontSize = fitFontSize(splash.text, maxWidth, {
    max: size * scaleOf('--dfs'),
    min: compact ? 24 : 34,
    font: '--font-display',
    extra: outline * 2 + (wild ? outline * 5 : outline),
  });
  const glow = splash.color && splash.color !== 'wild' ? pal[splash.color].base : wild ? '#ffffff' : theme.splash.color ?? '#ffd21f';
  return (
    <div className={`splash absolute flex flex-col items-center ${leaving ? 'is-leaving' : ''} ${delayed ? 'is-delayed' : ''}`} style={{ left: x, top: y }}>
      {/* A soft dark pool behind the message so it reads over cards and banners. */}
      <span
        aria-hidden="true"
        className="splash-pool absolute left-1/2 top-1/2 z-0 rounded-full"
        style={{
          width: 'calc(100% + 160px)',
          height: 'calc(100% + 110px)',
          background: 'radial-gradient(closest-side, rgba(10,8,25,0.7), rgba(10,8,25,0.45) 55%, rgba(10,8,25,0) 100%)',
        }}
      />
      {splash.kicker && (
        <span
          className={`splash-kicker font-display relative z-[3] mb-1.5 max-w-[86vw] truncate whitespace-nowrap rounded-lg border-[2.5px] border-[var(--ink)] uppercase shadow-[0_3px_0_var(--ink)] ${
            compact ? 'px-2 py-px text-[11px]' : 'px-2.5 py-0.5 text-sm'
          }`}
          style={{ background: theme.splash.kickerBg ?? '#fff', color: theme.splash.kickerInk ?? 'var(--ink)' }}
        >
          {splash.kicker}
        </span>
      )}
      <span className="relative z-[1] inline-block">
        <SplashRays id={splash.id} color={glow} />
        <span className="splash-shape absolute inset-0">
          <SplashBackdrop kind={theme.splash.backdrop} color={theme.splash.color} ink={theme.splash.ink} />
        </span>
        <span className="splash-ring absolute left-1/2 top-1/2 rounded-full" style={{ borderColor: glow }} aria-hidden="true" />
        <span className="splash-word font-display relative block whitespace-nowrap leading-none" style={splashStyle(splash.color, fontSize, outline, pal)}>
          {splash.text}
        </span>
      </span>
      {splash.small && (
        <span
          className={`splash-small font-ui relative z-[2] max-w-[90vw] truncate whitespace-nowrap rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)] shadow-[0_3px_0_var(--ink)] ${
            compact ? 'mt-2 px-2.5 py-px text-[12px]' : 'mt-3 px-3 py-0.5 text-sm'
          }`}
          style={{ maxWidth: Math.max(maxWidth, 200) }}
        >
          {splash.small}
        </span>
      )}
    </div>
  );
}

/** A slow-turning fan of light behind the words. */
function SplashRays({ id, color }: { id: number; color: string }) {
  const rays = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const d = 0.07;
    return `M0 0 L${(Math.cos(a - d) * 100).toFixed(1)} ${(Math.sin(a - d) * 100).toFixed(1)} L${(Math.cos(a + d) * 100).toFixed(1)} ${(Math.sin(a + d) * 100).toFixed(1)} Z`;
  }).join(' ');
  return (
    <span className="splash-rays absolute left-1/2 top-1/2" aria-hidden="true">
      <svg viewBox="-100 -100 200 200" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id={`splash-rays-${id}`}>
            <stop offset="0.2" stopColor={color} stopOpacity="0" />
            <stop offset="0.5" stopColor={color} stopOpacity="0.4" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d={rays} fill={`url(#splash-rays-${id})`} />
      </svg>
    </span>
  );
}

/**
 * The theme's shape behind the big words: comic burst, ink brush, scroll, steel
 * plate or ki glow. Shapes are drawn inside generous viewBoxes and never clipped.
 */
function SplashBackdrop({ kind, color = '#fff', ink = '#1b1530' }: { kind: string; color?: string; ink?: string }) {
  if (kind === 'none') return null;
  const box = 'pointer-events-none absolute overflow-visible';
  switch (kind) {
    case 'burst':
      return (
        <svg className={box} style={{ inset: '-75% -30%' }} viewBox="-120 -120 240 240" preserveAspectRatio="none" aria-hidden="true">
          <polygon points={burstPoints(14, 112, 70, 0, 0, 0.26, 4)} fill={ink} transform="translate(5 8)" />
          <polygon points={burstPoints(14, 112, 70, 0, 0, 0.26, 4)} fill={color} stroke={ink} strokeWidth="5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <polygon points={burstPoints(14, 78, 50, 0, 0, 0.22, 8)} fill="#fff" opacity="0.35" />
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
        <svg className={box} style={{ inset: '-62% -22%' }} viewBox="-130 -130 260 260" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <radialGradient id="splash-ki">
              <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
              <stop offset="0.45" stopColor={color} stopOpacity="0.55" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </radialGradient>
          </defs>
          <polygon points={burstPoints(20, 122, 64, 0, 0, 0.45, 11)} fill={color} opacity="0.28" />
          <circle r="108" fill="url(#splash-ki)" />
        </svg>
      );
    default:
      return null;
  }
}

function splashStyle(color: Splash['color'], fontSize: number, o: number, pal: Record<Color, { base: string }>): React.CSSProperties {
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
  const step = Math.max(2, Math.round(fontSize / 20));
  if (color === 'wild') {
    return {
      fontSize,
      color: '#fff',
      textShadow: [
        ...outline,
        `${step + 2}px ${step + 4}px 0 ${pal.red.base}`,
        `${step * 2 + 2}px ${step * 2 + 5}px 0 ${pal.yellow.base}`,
        `${step * 3 + 2}px ${step * 3 + 6}px 0 ${pal.green.base}`,
        `${step * 4 + 2}px ${step * 4 + 7}px 0 ${pal.blue.base}`,
      ].join(','),
    };
  }
  return {
    fontSize,
    color: color ? pal[color].base : '#fff',
    textShadow: [...outline, `0 ${Math.round(fontSize / 9)}px 0 var(--ink)`].join(','),
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
  const fade: React.CSSProperties = {
    left: x,
    top: y,
    opacity: hidden ? 0 : 1,
    transform: `translateX(-50%) ${hidden ? 'scale(0.92)' : ''}`,
    transition: 'opacity 0.15s, transform 0.15s',
  };
  const big = `font-display outline-text whitespace-nowrap leading-none ${compact ? 'text-[22px]' : 'text-4xl'}`;
  const pill = `font-ui mt-1.5 rounded-full bg-[rgba(18,14,36,0.82)] text-center text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)] ${
    compact ? 'max-w-[84vw] px-2.5 py-0.5 text-[12px] leading-snug' : 'max-w-[86vw] px-3 py-0.5 text-sm'
  }`;
  if (view.phase === 'unoSpinRace') {
    return (
      <div className="pointer-events-none absolute z-[26] flex flex-col items-center" style={fade}>
        <span className={`${big} text-[var(--yellow)] animate-buzz`}>RACE!</span>
        <span className={pill}>First to call NUNO Spin discards a card</span>
      </div>
    );
  }
  const who = view.actor ?? view.current;
  const mine = who === view.me;
  const waitingOn = view.players[who];
  return (
    <div className="pointer-events-none absolute z-[26] flex flex-col items-center" style={fade}>
      {mine ? (
        <>
          <span key={`me-${view.current}-${view.phase}`} className={`${big} text-[var(--yellow)] animate-turnIn`}>
            {view.phase === 'play' || view.phase === 'drawn' ? 'YOUR TURN!' : 'YOUR MOVE!'}
          </span>
          {hint && <span className={pill}>{hint}</span>}
        </>
      ) : (
        <span
          key={`p-${who}-${view.phase}`}
          className={`font-ui flex max-w-[84vw] items-center gap-1.5 truncate whitespace-nowrap rounded-full bg-[rgba(18,14,36,0.78)] text-white animate-fadeIn ${
            compact ? 'px-2.5 py-0.5 text-[13px]' : 'gap-2 px-3 py-1 text-base'
          }`}
        >
          <span className={`relative inline-block shrink-0 overflow-hidden rounded-full bg-white/90 text-center ${compact ? 'h-5 w-5 text-sm leading-5' : 'h-7 w-7 text-lg leading-7'}`}>
            <Avatar value={waitingOn?.avatar} fill />
          </span>
          <span className="truncate">
            {waitingOn?.name}
            {WAITING[view.phase] ?? (view.stack ? ` must stack or take +${view.stack.total}` : '’s turn')}
          </span>
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
    <div ref={ref} className="panel absolute right-2 top-full z-50 mt-2 w-[min(calc(100vw-16px),340px)] !rounded-2xl p-2 animate-popIn sm:right-4">
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
