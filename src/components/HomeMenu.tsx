import React, { useState } from 'react';
import type { Card, Difficulty, GameMode } from '../game/types';
import { MODES } from '../game/modes';
import { GUIDES } from '../lib/modeGuide';
import { CardView } from './CardView';
import { ModeButton, ModePicker } from './ModePicker';
import { AVATARS, Logo } from './ui';
import { sfx, isMuted, setMuted } from '../lib/sound';

interface Props {
  name: string;
  avatar: string;
  onUpdateProfile: (name: string, avatar: string) => void;
  onQuickPlay: (playerCount: number, difficulty: Difficulty, targetScore: number, mode: GameMode) => void;
  onCreateRoom: (playerCount: number, difficulty: Difficulty, targetScore: number, mode: GameMode) => void;
  onJoinRoom: (roomId: string) => void;
  onOpenRules: (mode: GameMode, focus?: 'rules' | 'cards') => void;
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
}) => {
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
  const [muted, setMutedState] = useState(isMuted());
  const [pickingAvatar, setPickingAvatar] = useState(false);

  const remember = (key: string, value: string | number) => localStorage.setItem(key, String(value));
  const target = targetFor(format, mode);
  const official = MODES[mode].officialTarget;

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) sfx.click();
  };

  const join = () => {
    const code = joinCode.trim();
    if (!code) return;
    sfx.click();
    onJoinRoom(code);
  };

  const modeButton = <ModeButton mode={mode} onClick={() => (sfx.click(), setPicking(true))} />;
  const heroCards = GUIDES[mode].cards.slice(0, 5);

  return (
    <div className="bg-room relative flex h-[100dvh] w-full flex-col overflow-hidden">
      {/* Decorative floating cards */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {FLOATERS.map((f, i) => (
          <div
            key={i}
            className={`absolute animate-floaty ${f.wide ? 'hidden lg:block' : 'hidden sm:block'} land:!hidden`}
            style={{ ...f.pos, ['--r' as string]: `${f.r}deg`, animationDelay: `${f.delay}s` }}
          >
            <CardView card={f.card} faceDown={!f.card} width={f.w} />
          </div>
        ))}
      </div>

      {/* Top bar (moves into the hero column on short landscape screens) */}
      <header className="safe-top relative z-10 flex items-center justify-end gap-2 p-3 phone:py-2 sm:p-4 lg:absolute lg:inset-x-0 lg:top-0 land:hidden">
        <MenuButtons muted={muted} onToggleMute={toggleMute} onOpenRules={(focus) => onOpenRules(mode, focus)} />
      </header>

      <main className="nice-scroll relative z-10 flex min-h-0 flex-1 overflow-y-auto">
        <div className="m-auto flex w-full flex-col items-center gap-3 px-4 pb-4 short:gap-2 sm:gap-5 lg:flex-row lg:justify-center lg:gap-16 lg:pb-10 land:flex-row land:justify-center land:gap-8 land:py-3">
          {/* Hero */}
          <section className="flex flex-col items-center">
            <Logo className="w-[min(76vw,300px)] drop-shadow-[0_10px_0_rgba(0,0,0,0.25)] phone:w-[min(62vw,230px)] sm:w-[360px] lg:w-[470px] land:!w-[260px]" />
            <p className="font-display mt-1 text-center text-base text-white/90 phone:hidden sm:text-xl lg:mt-3 land:!hidden">
              Match it. Slam it. <span className="text-[#ffd21f]">Shout NUNO!</span>
            </p>
            {/* On short landscape screens the mode and menu buttons live here instead. */}
            <div className="mt-3 hidden w-[280px] land:block">{modeButton}</div>
            <div className="mt-3 hidden gap-2 land:flex">
              <MenuButtons muted={muted} onToggleMute={toggleMute} onOpenRules={(focus) => onOpenRules(mode, focus)} />
            </div>
            <div className="mt-6 hidden h-[190px] items-end justify-center lg:flex [@media(max-height:760px)]:!hidden">
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
          <section className="panel relative w-full max-w-[440px] shrink-0 p-4 short:p-3.5 sm:p-5 land:max-w-[400px] land:!p-3.5">
            {/* Profile */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => (sfx.click(), setPickingAvatar((v) => !v))}
                className="chip flex h-12 w-12 shrink-0 items-center justify-center !rounded-2xl text-2xl short:h-10 short:w-10"
                aria-label="Choose avatar"
                title="Choose avatar"
              >
                {avatar}
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
              <div className="panel absolute left-3 right-3 top-[72px] z-20 grid grid-cols-8 gap-1.5 !rounded-2xl p-2.5 animate-popIn">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    onClick={() => {
                      sfx.pop();
                      onUpdateProfile(name, av);
                      setPickingAvatar(false);
                    }}
                    className={`flex aspect-square items-center justify-center rounded-xl text-xl transition-transform hover:scale-110 ${
                      av === avatar ? 'bg-[#ffe066] ring-2 ring-[var(--ink)]' : 'hover:bg-black/5'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            )}

            {/* Game mode */}
            <div className="mt-3 short:mt-2.5 land:hidden">{modeButton}</div>

            {/* Bots or friends */}
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border-[2.5px] border-[var(--ink)] bg-[#efe6d2] p-1 short:mt-2.5 land:mt-2">
              {(
                [
                  ['bots', '🤖  vs Bots'],
                  ['friends', '🌐  With Friends'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => (sfx.click(), setTab(id))}
                  className={`font-display h-10 rounded-xl text-base transition-colors short:h-9 land:h-8 ${
                    tab === id
                      ? 'border-2 border-[var(--ink)] bg-white shadow-[0_2px_0_var(--ink)]'
                      : 'text-[#6b6385] hover:text-[var(--ink)]'
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
                        className={`chip h-10 text-[15px] short:h-9 land:h-8 ${difficulty === d.id ? 'is-on' : ''}`}
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
                  className="btn btn-yellow mt-1 h-14 w-full text-2xl short:h-12 land:h-10 land:text-xl"
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

                <div className="flex items-center gap-3 text-[#9a93ad]">
                  <div className="h-[2px] flex-1 bg-[#e3d9c3]" />
                  <span className="label">or join one</span>
                  <div className="h-[2px] flex-1 bg-[#e3d9c3]" />
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
}: {
  muted: boolean;
  onToggleMute: () => void;
  onOpenRules: (focus?: 'rules' | 'cards') => void;
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
            className={`chip flex h-12 flex-col items-center justify-center leading-none short:h-9 land:h-8 ${format === f.id ? 'is-on' : ''}`}
          >
            <span className="text-[15px]">{f.label}</span>
            <span className="mt-1 font-body text-[11px] font-semibold opacity-60 short:hidden">{f.hint}</span>
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
            className={`chip h-10 text-lg short:h-9 land:h-8 ${value === n ? 'is-on' : ''}`}
            aria-pressed={value === n}
            aria-label={`${n} players`}
          >
            {n}
          </button>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-xs font-medium text-[#6b6385] short:hidden">{hint}</p>}
    </div>
  );
}
