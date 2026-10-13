import React, { useLayoutEffect, useRef, useState } from 'react';
import type { Card, Difficulty, GameMode } from '../game/types';
import { MODES } from '../game/modes';
import { GUIDES } from '../lib/modeGuide';
import { CardView } from './CardView';
import { ModeBadge, ModeButton, ModePicker } from './ModePicker';
import { AVATARS, Logo } from './ui';
import { sfx, setMuted } from '../lib/sound';
import { useSettings } from '../lib/settings';
import { useTheme } from '../themes';
import { AmbientCanvas } from './ThemeStage';
import { Avatar } from './Avatar';
import { artFor, characterAvatar } from '../themes/characters';
import type { SettingsTab } from './SettingsModal';

interface Props {
  name: string;
  avatar: string;
  onUpdateProfile: (name: string, avatar: string) => void;
  onQuickPlay: (playerCount: number, difficulty: Difficulty, targetScore: number, mode: GameMode) => void;
  onCreateRoom: (playerCount: number, difficulty: Difficulty, targetScore: number, mode: GameMode) => void;
  onJoinRoom: (roomId: string) => void;
  onOpenRules: (mode: GameMode, focus?: 'rules' | 'cards') => void;
  onOpenSettings: (tab?: SettingsTab) => void;
}

const PLAYER_COUNTS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

const DIFFICULTIES: { id: Difficulty; label: string; icon: string }[] = [
  { id: 'chill', label: 'Chill', icon: '☕' },
  { id: 'normal', label: 'Normal', icon: '⚡' },
  { id: 'savage', label: 'Savage', icon: '🔥' },
];

type Format = 'round' | 'short' | 'official';

/** Points to win for each format (the official target comes from the mode's rules). */
export function targetFor(format: Format, mode: GameMode): number {
  const official = MODES[mode].officialTarget;
  return format === 'round' ? 0 : format === 'short' ? official / 2 : official;
}

const FLOATERS: {
  card: Pick<Card, 'color' | 'value'> | null;
  pos: React.CSSProperties;
  r: number;
  w: number;
  delay: number;
  wide?: boolean;
}[] = [
  { card: { color: 'yellow', value: '9' }, pos: { left: '4%', top: '18%' }, r: -18, w: 70, delay: 0 },
  { card: null, pos: { left: '9%', bottom: '8%' }, r: 14, w: 80, delay: 1.2, wide: true },
  { card: { color: 'blue', value: 'skip' }, pos: { right: '5%', top: '14%' }, r: 16, w: 72, delay: 0.6 },
  { card: { color: 'wild', value: 'wild' }, pos: { right: '8%', bottom: '9%' }, r: -12, w: 84, delay: 1.8, wide: true },
  { card: { color: 'red', value: 'draw2' }, pos: { left: '30%', bottom: '-3%' }, r: 22, w: 64, delay: 2.4, wide: true },
  { card: { color: 'green', value: '3' }, pos: { left: '24%', top: '3%' }, r: -24, w: 60, delay: 3, wide: true },
];

const read = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  const v = localStorage.getItem(key) as T | null;
  return v && allowed.includes(v) ? v : fallback;
};

export const HomeMenu: React.FC<Props> = ({
  name,
  avatar,
  onUpdateProfile,
  onQuickPlay,
  onCreateRoom,
  onJoinRoom,
  onOpenRules,
  onOpenSettings,
}) => {
  const theme = useTheme();
  const art = artFor(theme.id);
  const characters = art.characters;
  const { muted } = useSettings();
  const [tab, setTab] = useState<'bots' | 'friends'>('bots');
  const [mode, setMode] = useState<GameMode>(() =>
    read('nuno.mode', ['classic', 'nomercy', 'flip', 'attack', 'allwild', 'spin'] as const, 'classic'),
  );
  const [picking, setPicking] = useState(false);
  const [playerCount, setPlayerCount] = useState(() => Number(localStorage.getItem('nuno.players')) || 4);
  const [difficulty, setDifficulty] = useState<Difficulty>(() =>
    read('nuno.difficulty', ['chill', 'normal', 'savage'] as const, 'normal'),
  );
  const [format, setFormat] = useState<Format>(() => read('nuno.format', ['round', 'short', 'official'] as const, 'round'));
  const [joinCode, setJoinCode] = useState('');
  const [pickingAvatar, setPickingAvatar] = useState(false);

  const remember = (key: string, value: string | number) => localStorage.setItem(key, String(value));
  const target = targetFor(format, mode);
  const official = MODES[mode].officialTarget;

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (!next) sfx.click();
  };

  const join = () => {
    const code = joinCode.trim();
    if (!code) return;
    sfx.click();
    onJoinRoom(code);
  };

  const modeButton = <ModeButton mode={mode} onClick={() => (sfx.click(), setPicking(true))} />;
  const themeButton = (
    <button
      type="button"
      onClick={() => (sfx.click(), onOpenSettings('themes'))}
      className="theme-button group relative flex h-11 w-full items-center gap-2.5 overflow-hidden rounded-2xl border-[2.5px] border-[var(--ink)] px-2 text-left shadow-[0_3px_0_var(--ink)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 short:h-10"
      style={{ background: theme.vars['--room-bg'] ?? 'linear-gradient(90deg, #3b2f86, #17143d)' }}
      title="Pick a theme"
    >
      {art.backdrop && <img src={art.backdrop.soft ?? art.backdrop.url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" draggable={false} />}
      <span className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/30" aria-hidden="true" />
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--surface)] text-lg">
        {characters[0] ? <img src={characters[0].face} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} /> : theme.emoji}
      </span>
      <span className="relative min-w-0 flex-1 truncate leading-tight text-white" style={{ textShadow: '0 2px 0 rgba(0,0,0,0.85), 0 0 6px rgba(0,0,0,0.75), 1px 0 0 rgba(0,0,0,0.6), -1px 0 0 rgba(0,0,0,0.6)' }}>
        <span className="font-display text-base">{theme.title}</span>
        <span className="font-body ml-1.5 text-[10.5px] font-bold uppercase tracking-wider">{theme.id === 'classic' ? 'try an anime theme!' : 'theme'}</span>
      </span>
      <span className="theme-shine pointer-events-none absolute inset-y-0 w-10" aria-hidden="true" />
      <span className="chip relative shrink-0 px-2.5 py-0.5 text-sm group-hover:bg-[var(--chip-hover)]">🎨 Themes</span>
    </button>
  );

  // Phones: mode and theme share a row as two compact tiles.
  const phoneTiles = (
    <div className="grid grid-cols-2 gap-2 sm:hidden">
      <button
        type="button"
        onClick={() => (sfx.click(), setPicking(true))}
        className="flex h-12 min-w-0 items-center gap-2 rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--surface)] px-2 text-left shadow-[0_3px_0_var(--ink)] active:translate-y-0.5"
      >
        <ModeBadge mode={mode} size={32} />
        <span className="min-w-0 leading-tight">
          <span className="font-ui block truncate text-[15px] text-[var(--ink)]">{MODES[mode].name}</span>
          <span className="font-body block text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">Mode ▾</span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => (sfx.click(), onOpenSettings('themes'))}
        className="relative flex h-12 min-w-0 items-center gap-2 overflow-hidden rounded-2xl border-[2.5px] border-[var(--ink)] px-2 text-left shadow-[0_3px_0_var(--ink)] active:translate-y-0.5"
        style={{ background: theme.vars['--room-bg'] ?? 'linear-gradient(90deg, #3b2f86, #17143d)' }}
      >
        {art.backdrop && <img src={art.backdrop.soft ?? art.backdrop.url} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />}
        <span className="absolute inset-0 bg-gradient-to-r from-black/75 to-black/35" aria-hidden="true" />
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--surface)] text-lg">
          {characters[0] ? <img src={characters[0].face} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} /> : theme.emoji}
        </span>
        <span className="relative min-w-0 leading-tight text-white" style={{ textShadow: '0 2px 0 rgba(0,0,0,0.85), 0 0 6px rgba(0,0,0,0.75), 1px 0 0 rgba(0,0,0,0.6), -1px 0 0 rgba(0,0,0,0.6)' }}>
          <span className="font-ui block truncate text-[15px]">{theme.title}</span>
          <span className="font-body block text-[11px] font-bold uppercase tracking-wide">🎨 Themes</span>
        </span>
        <span className="theme-shine pointer-events-none absolute inset-y-0 w-10" aria-hidden="true" />
      </button>
    </div>
  );

  const heroCards = GUIDES[mode].cards.slice(0, 5);
  const free = useFreeSpots(FLOATERS.length, [theme.id, mode, tab, pickingAvatar]);
  const heroTop = usePanelTop(free.root, free.blockers, [theme.id, tab, pickingAvatar]);

  return (
    <div ref={free.root} className="relative flex h-[100dvh] w-full flex-col overflow-hidden">
      <AmbientCanvas />
      {/* Decorative floating cards: only the ones that land in empty space are shown,
          and none over a theme's own background art. */}
      <div className={`pointer-events-none absolute inset-0 ${art.backdrop ? 'hidden' : ''}`} aria-hidden="true">
        {FLOATERS.map((f, i) => (
          <div
            key={i}
            ref={(el) => (free.items.current[i] = el)}
            className={`absolute animate-floaty ${f.wide ? 'hidden lg:block' : 'hidden sm:block'} land:!hidden`}
            style={{
              ...f.pos,
              ['--r' as string]: `${f.r}deg`,
              animationDelay: `${f.delay}s`,
              visibility: free.ok[i] ? 'visible' : 'hidden',
            }}
          >
            <CardView card={f.card} faceDown={!f.card} width={f.w} />
          </div>
        ))}
      </div>

      {/* Phones: the theme's hero rises behind the logo, title-screen style, in the room above the panel. */}
      {art.hero && heroTop !== null && heroTop > 150 && (
        <div className="pointer-events-none absolute left-1/2 top-0 z-0 w-[min(100vw,460px)] -translate-x-1/2 sm:hidden" style={{ height: heroTop + 24 }} aria-hidden="true">
          <img
            src={art.hero.url}
            alt=""
            draggable={false}
            className="idle-breathe h-full w-full select-none object-cover drop-shadow-[0_12px_16px_rgba(0,0,0,0.55)]"
            style={{
              objectPosition: '50% 8%',
              WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0, #000 14%, #000 72%, rgba(0,0,0,0) 100%)',
              maskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0, #000 14%, #000 72%, rgba(0,0,0,0) 100%)',
            }}
          />
        </div>
      )}

      {/* Top bar (moves into the hero column on short landscape screens) */}
      <header
        ref={(el) => (free.blockers.current[0] = el)}
        className="safe-top relative z-20 flex items-center justify-end gap-2 p-3 phone:py-2 sm:p-4 land:hidden lowdesk:hidden"
      >
        <MenuButtons muted={muted} onToggleMute={toggleMute} onOpenRules={(focus) => onOpenRules(mode, focus)} onOpenSettings={onOpenSettings} />
      </header>

      <main className="nice-scroll relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto flex w-full flex-1 flex-col items-center gap-3 px-4 pb-4 short:gap-2 sm:gap-5 lg:my-auto lg:flex-none lg:flex-row lg:justify-center lg:gap-16 lg:pb-10 lowdesk:!py-3 land:my-auto land:flex-none land:flex-row land:justify-center land:gap-8 land:py-3">
          {/* Hero */}
          <section ref={(el) => (free.blockers.current[1] = el)} className="flex min-h-0 w-full flex-1 flex-col items-center justify-end lg:w-auto lg:flex-none lg:justify-center land:w-auto land:flex-none land:justify-center">
            {/* The theme's hero art stands over the logo, title-screen style (desktop sizes). */}
            {art.hero && (
              <img
                src={art.hero.url}
                alt=""
                draggable={false}
                className="idle-breathe pointer-events-none hidden select-none object-contain drop-shadow-[0_14px_18px_rgba(0,0,0,0.55)] lg:block"
                style={{ height: 'clamp(220px, calc(100dvh - 340px), 640px)', aspectRatio: `${art.hero.w} / ${art.hero.h}` }}
              />
            )}
            <Logo
              className={`relative w-[min(76vw,300px)] drop-shadow-[0_10px_0_rgba(0,0,0,0.25)] phone:w-[min(62vw,230px)] sm:w-[360px] land:!w-[260px] ${
                art.hero ? 'lg:-mt-14 lg:w-[400px] lowdesk:!w-[320px]' : 'lg:w-[470px]'
              }`}
            />
            {theme.edition && (
              <span className="font-display -mt-2 rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--accent-a)] px-3 text-sm leading-6 text-[var(--ink)] shadow-[0_3px_0_var(--ink)] sm:text-base sm:leading-7">
                {theme.emoji} {theme.edition}
              </span>
            )}
            <p
              className={`font-display mt-1 text-center text-base text-white/90 phone:hidden sm:text-xl lg:mt-3 land:!hidden ${theme.edition ? 'hide-on-phone' : ''}`}
              style={{ textShadow: '0 2px 0 rgba(0,0,0,0.45)' }}
            >
              Match it. Slam it. <span className="text-[var(--yellow)]">Shout NUNO!</span>
            </p>
            {/* On short landscape screens the mode and menu buttons live here instead. */}
            <div className="mt-3 hidden w-[280px] space-y-2 land:block">
              {modeButton}
              {themeButton}
            </div>
            <div className="mt-3 hidden gap-2 land:flex lowdesk:mt-4 lowdesk:flex">
              <MenuButtons muted={muted} onToggleMute={toggleMute} onOpenRules={(focus) => onOpenRules(mode, focus)} onOpenSettings={onOpenSettings} />
            </div>
            <div className={`mt-6 hidden h-[190px] items-end justify-center [@media(max-height:760px)]:!hidden ${art.hero ? '' : 'lg:flex'}`}>
              {heroCards.map((c, i) => {
                const off = i - (heroCards.length - 1) / 2;
                return (
                  // Three layers so the fan angle, the hover lift and the pop-in don't fight over `transform`.
                  <div
                    key={`${mode}-${i}`}
                    className="-mx-4 origin-bottom"
                    style={{ transform: `rotate(${off * 11}deg) translateY(${Math.abs(off) * 10}px)` }}
                  >
                    <div className="transition-transform duration-200 hover:-translate-y-5">
                      <div className="animate-popIn" style={{ animationDelay: `${i * 0.05}s` }}>
                        <CardView card={c.card} side={c.side} width={104} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Setup panel */}
          <section
            ref={(el) => (free.blockers.current[2] = el)}
            className="panel relative w-full max-w-[440px] shrink-0 p-4 short:p-3.5 sm:p-5 land:max-w-[400px] land:!p-3.5">
            {/* Profile */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => (sfx.click(), setPickingAvatar((v) => !v))}
                className="chip relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden !rounded-2xl text-2xl sm:h-12 sm:w-12 short:h-10 short:w-10"
                aria-label="Choose avatar"
                title="Choose avatar"
              >
                <Avatar value={avatar} fill />
              </button>
              <div className="min-w-0 flex-1">
                <label htmlFor="nuno-name" className="label block short:sr-only">
                  Your name
                </label>
                <input
                  id="nuno-name"
                  value={name}
                  onChange={(e) => onUpdateProfile(e.target.value.slice(0, 14), avatar)}
                  placeholder="Enter your name"
                  className="field mt-0.5 h-10 w-full px-3 text-base short:mt-0"
                />
              </div>
            </div>

            {pickingAvatar && (
              <div className="panel nice-scroll absolute left-3 right-3 top-[72px] z-20 max-h-[min(60dvh,420px)] overflow-y-auto !rounded-2xl p-2.5 animate-popIn">
                {characters.length > 0 && (
                  <>
                    <div className="label mb-1.5">{theme.id === 'classic' ? 'Characters' : `${theme.emoji} ${theme.title} characters`}</div>
                    <div className="mb-2.5 grid grid-cols-5 gap-1.5">
                      {characters.map((c) => {
                        const av = characterAvatar(c);
                        return (
                          <button
                            key={c.id}
                            title={c.name}
                            onClick={() => {
                              sfx.pop();
                              onUpdateProfile(name, av);
                              setPickingAvatar(false);
                            }}
                            className={`relative aspect-square overflow-hidden rounded-xl border-2 border-[var(--ink)] transition-transform hover:scale-105 ${
                              av === avatar ? 'ring-4 ring-[var(--accent-b)]' : ''
                            }`}
                          >
                            <img src={c.face} alt={c.name} className="h-full w-full object-cover" draggable={false} />
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
                <div className="grid grid-cols-8 gap-1.5">
                  {AVATARS.map((av) => (
                    <button
                      key={av}
                      onClick={() => {
                        sfx.pop();
                        onUpdateProfile(name, av);
                        setPickingAvatar(false);
                      }}
                      className={`flex aspect-square items-center justify-center rounded-xl text-xl transition-transform hover:scale-110 ${
                        av === avatar ? 'bg-[var(--accent-a)] ring-2 ring-[var(--ink)]' : 'hover:bg-black/5'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Game mode and theme */}
            <div className="mt-2.5 short:mt-2 land:hidden">
              {phoneTiles}
              <div className="hidden space-y-2 sm:block">
                {modeButton}
                {themeButton}
              </div>
            </div>

            {/* Bots or friends */}
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--panel-2)] p-1 short:mt-2.5 land:mt-2">
              {(
                [
                  ['bots', '🤖  vs Bots'],
                  ['friends', '🌐  With Friends'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => (sfx.click(), setTab(id))}
                  className={`font-display h-9 rounded-xl text-base transition-colors sm:h-10 short:h-9 land:h-8 ${
                    tab === id
                      ? 'border-2 border-[var(--ink)] bg-[var(--surface)] shadow-[0_2px_0_var(--ink)]'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'bots' ? (
              <div className="mt-3.5 space-y-3 animate-fadeIn short:mt-2.5 short:space-y-2 land:mt-2 land:space-y-1.5">
                <PlayerCountPicker
                  value={playerCount}
                  onChange={(n) => {
                    setPlayerCount(n);
                    remember('nuno.players', n);
                  }}
                />

                <div>
                  <div className="label mb-1.5 short:mb-1">Bot skill</div>
                  <div className="grid grid-cols-3 gap-2">
                    {DIFFICULTIES.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          sfx.click();
                          setDifficulty(d.id);
                          remember('nuno.difficulty', d.id);
                        }}
                        className={`chip h-9 text-[15px] sm:h-10 short:h-9 land:h-8 ${difficulty === d.id ? 'is-on' : ''}`}
                      >
                        {d.icon} {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <FormatPicker
                  format={format}
                  official={official}
                  onChange={(f) => {
                    setFormat(f);
                    remember('nuno.format', f);
                  }}
                />

                <button
                  onClick={() => {
                    sfx.deal();
                    onQuickPlay(playerCount, difficulty, target, mode);
                  }}
                  className="btn btn-yellow mt-1 h-[52px] w-full text-2xl sm:h-14 short:h-12 land:h-10 land:text-xl"
                >
                  PLAY!
                </button>
              </div>
            ) : (
              <div className="mt-3.5 space-y-3 animate-fadeIn short:mt-2.5 short:space-y-2 land:mt-2 land:space-y-1.5">
                <PlayerCountPicker
                  value={playerCount}
                  onChange={(n) => {
                    setPlayerCount(n);
                    remember('nuno.players', n);
                  }}
                  hint="Empty seats are filled with bots until friends join."
                />
                <button
                  onClick={() => {
                    sfx.deal();
                    onCreateRoom(playerCount, difficulty, target, mode);
                  }}
                  className="btn btn-purple h-14 w-full text-xl short:h-12 land:h-11"
                >
                  Create a {MODES[mode].name} room
                </button>

                <div className="flex items-center gap-3 text-[var(--faint)]">
                  <div className="h-[2px] flex-1 bg-[var(--line)]" />
                  <span className="label">or join one</span>
                  <div className="h-[2px] flex-1 bg-[var(--line)]" />
                </div>

                <div className="flex gap-2">
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && join()}
                    placeholder="ROOM CODE"
                    maxLength={8}
                    aria-label="Room code"
                    autoCapitalize="characters"
                    autoComplete="off"
                    className="field h-14 min-w-0 flex-1 px-4 text-center font-display text-2xl tracking-[0.2em] short:h-12 land:h-11"
                  />
                  <button
                    onClick={join}
                    disabled={!joinCode.trim()}
                    className="btn btn-blue h-14 px-6 text-xl short:h-12 land:h-11"
                  >
                    Join
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <ModePicker
        open={picking}
        value={mode}
        onClose={() => setPicking(false)}
        onPick={(m) => {
          setMode(m);
          remember('nuno.mode', m);
          setPicking(false);
        }}
        onRules={(m) => onOpenRules(m)}
      />
    </div>
  );
};

function MenuButtons({
  muted,
  onToggleMute,
  onOpenRules,
  onOpenSettings,
}: {
  muted: boolean;
  onToggleMute: () => void;
  onOpenRules: (focus?: 'rules' | 'cards') => void;
  onOpenSettings: (tab?: SettingsTab) => void;
}) {
  return (
    <>
      <button className="icon-btn" onClick={() => (sfx.click(), onOpenRules('cards'))}>
        <span aria-hidden>🎴</span>
        <span className="hidden sm:inline">Cards</span>
      </button>
      <button className="icon-btn" onClick={() => (sfx.click(), onOpenRules('rules'))}>
        <span aria-hidden>📖</span>
        <span className="hidden sm:inline">How to play</span>
      </button>
      <button className="icon-btn" onClick={onToggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
        {muted ? '🔇' : '🔊'}
      </button>
      <button className="icon-btn" onClick={() => (sfx.click(), onOpenSettings('sound'))} aria-label="Settings" title="Sound, pace & effects">
        ⚙️
      </button>
    </>
  );
}

function FormatPicker({ format, official, onChange }: { format: Format; official: number; onChange: (f: Format) => void }) {
  const options: { id: Format; label: string; hint: string }[] = [
    { id: 'round', label: '1 Round', hint: 'Quick game' },
    { id: 'short', label: `${official / 2} pts`, hint: 'Shorter' },
    { id: 'official', label: `${official} pts`, hint: 'Official' },
  ];
  return (
    <div>
      <div className="label mb-1.5 short:mb-1">Game length</div>
      <div className="grid grid-cols-3 gap-2">
        {options.map((f) => (
          <button
            key={f.id}
            onClick={() => (sfx.click(), onChange(f.id))}
            className={`chip flex h-11 flex-col items-center justify-center leading-none sm:h-12 short:h-9 land:h-8 ${format === f.id ? 'is-on' : ''}`}
          >
            <span className="text-[15px]">{f.label}</span>
            <span className="mt-1 font-body text-[11px] font-semibold short:hidden">{f.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PlayerCountPicker({ value, onChange, hint }: { value: number; onChange: (n: number) => void; hint?: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between short:mb-1">
        <span className="label">Players</span>
        <span className="font-display text-[15px] text-[var(--ink)]">
          {value === 2 ? 'Head to head' : `You + ${value - 1} others`}
        </span>
      </div>
      <div className="grid grid-cols-9 gap-1">
        {PLAYER_COUNTS.map((n) => (
          <button
            key={n}
            onClick={() => (sfx.click(), onChange(n))}
            className={`chip h-9 text-lg sm:h-10 short:h-9 land:h-8 ${value === n ? 'is-on' : ''}`}
            aria-pressed={value === n}
            aria-label={`${n} players`}
          >
            {n}
          </button>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-xs font-medium text-[var(--muted)] short:hidden">{hint}</p>}
    </div>
  );
}

/**
 * Decides which decorative cards have room: a card is shown only if it doesn't
 * touch the top bar, the logo or the setup panel at the current window size.
 */
function useFreeSpots(count: number, deps: unknown[]) {
  const root = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLElement | null)[]>([]);
  const blockers = useRef<(HTMLElement | null)[]>([]);
  const [ok, setOk] = useState<boolean[]>(() => Array(count).fill(false));

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const M = 18; // breathing room, plus the floating bob
    const check = () => {
      const walls = blockers.current.filter(Boolean).map((b) => b!.getBoundingClientRect());
      const next = items.current.map((it) => {
        if (!it) return false;
        const r = it.getBoundingClientRect();
        if (!r.width) return false;
        return !walls.some((w) => r.left < w.right + M && r.right > w.left - M && r.top < w.bottom + M && r.bottom > w.top - M);
      });
      setOk((prev) => (prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next));
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    blockers.current.forEach((b) => b && ro.observe(b));
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { root, items, blockers, ok };
}

/** Where the setup panel starts (px from the top), so the phone hero can fill the room above it. */
function usePanelTop(root: React.RefObject<HTMLElement>, blockers: React.MutableRefObject<(HTMLElement | null)[]>, deps: unknown[]) {
  const [top, setTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = root.current;
    const panel = blockers.current[2];
    if (!el || !panel) return;
    const measure = () => {
      const t = Math.round(panel.getBoundingClientRect().top - el.getBoundingClientRect().top);
      setTop((prev) => (prev === t ? prev : t));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(panel);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return top;
}
