import React, { useState } from 'react';
import type { Card, Difficulty } from '../game/types';
import { CardView } from './CardView';
import { AVATARS, Logo } from './ui';
import { sfx, isMuted, setMuted } from '../lib/sound';

interface Props {
  name: string;
  avatar: string;
  onUpdateProfile: (name: string, avatar: string) => void;
  onQuickPlay: (playerCount: number, difficulty: Difficulty, targetScore: number) => void;
  onCreateRoom: (playerCount: number, difficulty: Difficulty, targetScore: number) => void;
  onJoinRoom: (roomId: string) => void;
  onOpenRules: () => void;
  onOpenCardGallery: () => void;
}

const PLAYER_COUNTS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

const DIFFICULTIES: { id: Difficulty; label: string; icon: string }[] = [
  { id: 'chill', label: 'Chill', icon: '☕' },
  { id: 'normal', label: 'Normal', icon: '⚡' },
  { id: 'savage', label: 'Savage', icon: '🔥' },
];

const FORMATS: { score: number; label: string; hint: string }[] = [
  { score: 0, label: '1 Round', hint: 'Quick game' },
  { score: 250, label: '250 pts', hint: 'Medium' },
  { score: 500, label: '500 pts', hint: 'Official' },
];

const HERO_FAN: Pick<Card, 'color' | 'value'>[] = [
  { color: 'green', value: 'reverse' },
  { color: 'blue', value: '4' },
  { color: 'wild', value: 'wild4' },
  { color: 'red', value: '7' },
  { color: 'yellow', value: 'draw2' },
];

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
  { card: { color: 'green', value: '3' }, pos: { right: '32%', top: '-2%' }, r: -24, w: 60, delay: 3, wide: true },
];

export const HomeMenu: React.FC<Props> = ({
  name,
  avatar,
  onUpdateProfile,
  onQuickPlay,
  onCreateRoom,
  onJoinRoom,
  onOpenRules,
  onOpenCardGallery,
}) => {
  const [tab, setTab] = useState<'bots' | 'friends'>('bots');
  const [playerCount, setPlayerCount] = useState(() => Number(localStorage.getItem('nuno.players')) || 4);
  const [difficulty, setDifficulty] = useState<Difficulty>(
    () => (localStorage.getItem('nuno.difficulty') as Difficulty) || 'normal',
  );
  const [targetScore, setTargetScore] = useState(() => {
    const saved = localStorage.getItem('nuno.target');
    return saved === null ? 0 : Number(saved);
  });
  const [joinCode, setJoinCode] = useState('');
  const [muted, setMutedState] = useState(isMuted());
  const [pickingAvatar, setPickingAvatar] = useState(false);

  const remember = (key: string, value: string | number) => localStorage.setItem(key, String(value));

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) sfx.click();
  };

  const startBots = () => {
    sfx.deal();
    onQuickPlay(playerCount, difficulty, targetScore);
  };

  const join = () => {
    const code = joinCode.trim();
    if (!code) return;
    sfx.click();
    onJoinRoom(code);
  };

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
      <header className="relative z-10 flex items-center justify-end gap-2 p-3 sm:p-4 land:hidden">
        <MenuButtons muted={muted} onToggleMute={toggleMute} onOpenRules={onOpenRules} onOpenCardGallery={onOpenCardGallery} />
      </header>

      <main className="nice-scroll relative z-10 flex min-h-0 flex-1 overflow-y-auto">
        <div className="m-auto flex w-full flex-col items-center gap-3 px-4 pb-4 sm:gap-5 lg:flex-row lg:justify-center lg:gap-16 lg:pb-10 land:flex-row land:justify-center land:gap-8 land:py-3">
          {/* Hero */}
          <section className="flex flex-col items-center">
            <Logo className="w-[min(76vw,300px)] drop-shadow-[0_10px_0_rgba(0,0,0,0.25)] sm:w-[360px] lg:w-[470px] land:!w-[280px]" />
            <p className="font-display mt-1 text-center text-base text-white/90 [@media(max-height:700px)]:hidden sm:text-xl lg:mt-3 land:!block">
              Match it. Slam it. <span className="text-[#ffd21f]">Shout NUNO!</span>
            </p>
            <div className="mt-4 hidden gap-2 land:flex">
              <MenuButtons
                muted={muted}
                onToggleMute={toggleMute}
                onOpenRules={onOpenRules}
                onOpenCardGallery={onOpenCardGallery}
              />
            </div>
            <div className="mt-6 hidden h-[190px] items-end justify-center lg:flex [@media(max-height:760px)]:!hidden">
              {HERO_FAN.map((c, i) => {
                const off = i - 2;
                return (
                  <div
                    key={i}
                    className="-mx-4 origin-bottom transition-transform duration-200 hover:-translate-y-5"
                    style={{ transform: `rotate(${off * 11}deg) translateY(${Math.abs(off) * 10}px)` }}
                  >
                    <CardView card={c} width={104} />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Setup panel */}
          <section className="panel relative w-full max-w-[440px] shrink-0 p-4 sm:p-5 land:max-w-[400px] land:p-3.5">
            {/* Profile */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => (sfx.click(), setPickingAvatar((v) => !v))}
                className="chip flex h-12 w-12 shrink-0 items-center justify-center !rounded-2xl text-2xl land:h-10 land:w-10"
                aria-label="Choose avatar"
                title="Choose avatar"
              >
                {avatar}
              </button>
              <div className="min-w-0 flex-1">
                <label htmlFor="nuno-name" className="label block land:sr-only">
                  Your name
                </label>
                <input
                  id="nuno-name"
                  value={name}
                  onChange={(e) => onUpdateProfile(e.target.value.slice(0, 14), avatar)}
                  placeholder="Enter your name"
                  className="field mt-0.5 h-10 w-full px-3 text-base land:h-9"
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

            {/* Mode tabs */}
            <div className="mt-4 grid grid-cols-2 gap-2 land:mt-2 rounded-2xl border-[2.5px] border-[var(--ink)] bg-[#efe6d2] p-1">
              {(
                [
                  ['bots', '🤖  vs Bots'],
                  ['friends', '🌐  With Friends'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => (sfx.click(), setTab(id))}
                  className={`font-display h-10 rounded-xl text-base transition-colors land:h-8 ${
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
              <div className="mt-4 space-y-3.5 animate-fadeIn land:mt-2 land:space-y-1.5">
                <PlayerCountPicker
                  value={playerCount}
                  onChange={(n) => {
                    setPlayerCount(n);
                    remember('nuno.players', n);
                  }}
                />

                <div>
                  <div className="label mb-1.5 land:mb-1">Bot skill</div>
                  <div className="grid grid-cols-3 gap-2">
                    {DIFFICULTIES.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          sfx.click();
                          setDifficulty(d.id);
                          remember('nuno.difficulty', d.id);
                        }}
                        className={`chip h-10 text-[15px] land:h-9 ${difficulty === d.id ? 'is-on' : ''}`}
                      >
                        {d.icon} {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="label mb-1.5 land:mb-1">Game length</div>
                  <div className="grid grid-cols-3 gap-2">
                    {FORMATS.map((f) => (
                      <button
                        key={f.score}
                        onClick={() => {
                          sfx.click();
                          setTargetScore(f.score);
                          remember('nuno.target', f.score);
                        }}
                        className={`chip flex h-12 flex-col items-center justify-center leading-none land:h-9 ${targetScore === f.score ? 'is-on' : ''}`}
                      >
                        <span className="text-[15px]">{f.label}</span>
                        <span className="mt-1 font-body text-[11px] font-semibold opacity-60 land:hidden">{f.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={startBots} className="btn btn-yellow mt-1 h-14 w-full text-2xl land:h-11 land:text-xl">
                  PLAY!
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3.5 animate-fadeIn land:mt-2 land:space-y-1.5">
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
                    onCreateRoom(playerCount, difficulty, targetScore);
                  }}
                  className="btn btn-purple h-14 w-full text-xl land:h-11"
                >
                  Create a room
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
                    className="field h-14 min-w-0 flex-1 px-4 text-center font-display text-2xl tracking-[0.2em] land:h-11"
                  />
                  <button onClick={join} disabled={!joinCode.trim()} className="btn btn-blue h-14 px-6 text-xl land:h-11">
                    Join
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

function MenuButtons({
  muted,
  onToggleMute,
  onOpenRules,
  onOpenCardGallery,
}: {
  muted: boolean;
  onToggleMute: () => void;
  onOpenRules: () => void;
  onOpenCardGallery: () => void;
}) {
  return (
    <>
      <button className="icon-btn" onClick={() => (sfx.click(), onOpenCardGallery())}>
        <span aria-hidden>🎴</span>
        <span className="hidden sm:inline">Cards</span>
      </button>
      <button className="icon-btn" onClick={() => (sfx.click(), onOpenRules())}>
        <span aria-hidden>📖</span>
        <span className="hidden sm:inline">How to play</span>
      </button>
      <button className="icon-btn" onClick={onToggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
        {muted ? '🔇' : '🔊'}
      </button>
    </>
  );
}

function PlayerCountPicker({ value, onChange, hint }: { value: number; onChange: (n: number) => void; hint?: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between land:mb-1">
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
            className={`chip h-10 text-lg land:h-9 ${value === n ? 'is-on' : ''}`}
            aria-pressed={value === n}
            aria-label={`${n} players`}
          >
            {n}
          </button>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-xs font-medium text-[#6b6385]">{hint}</p>}
    </div>
  );
}
