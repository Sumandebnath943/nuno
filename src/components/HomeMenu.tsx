import React, { useState } from 'react';
import type { Difficulty } from '../game/types';
import { CardView } from './CardView';
import { sfx, isMuted, setMuted } from '../lib/sound';

interface Props {
  name: string;
  avatar: string;
  onUpdateProfile: (name: string, avatar: string) => void;
  onQuickPlay: (playerCount: number, difficulty: Difficulty, targetScore: number) => void;
  onCreateRoom: (playerCount: number, difficulty: Difficulty, targetScore: number) => void;
  onJoinRoom: (roomId: string) => void;
  onOpenRules: () => void;
}

const AVATARS = ['😎', '🦄', '🦊', '🐉', '🤖', '🍕', '🚀', '🐼', '🥷', '👾', '🦁', '👑'];

export const HomeMenu: React.FC<Props> = ({
  name,
  avatar,
  onUpdateProfile,
  onQuickPlay,
  onCreateRoom,
  onJoinRoom,
  onOpenRules,
}) => {
  const [tab, setTab] = useState<'quick' | 'online'>('quick');
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [targetScore, setTargetScore] = useState<number>(500);
  const [joinCode, setJoinCode] = useState<string>('');
  const [muted, setMutedState] = useState<boolean>(isMuted());

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) sfx.click();
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between p-4 sm:p-6 overflow-x-hidden">
      {/* Top Utility Bar */}
      <div className="w-full max-w-4xl flex justify-between items-center z-20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider bg-white/10 px-3 py-1 rounded-full text-yellow-300 border border-white/10">
            ★ Mattel Official Rules
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer border border-white/10"
          >
            <span>📖</span>
            <span>Rules</span>
          </button>

          <button
            onClick={handleToggleMute}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer border border-white/10"
            title="Toggle Sound Effects"
          >
            <span>{muted ? '🔇' : '🔊'}</span>
            <span>{muted ? 'Muted' : 'Sound'}</span>
          </button>
        </div>
      </div>

      {/* Hero Title with playful bouncing Card Graphic */}
      <div className="flex flex-col items-center text-center my-4 sm:my-8 z-10">
        <div className="relative mb-2 flex items-center justify-center">
          {/* Decorative background cards */}
          <div className="absolute -left-12 -top-4 -rotate-12 opacity-80 pointer-events-none hidden sm:block">
            <CardView card={{ id: 'c1', color: 'red', value: '7' }} size="sm" />
          </div>
          <div className="absolute -right-12 -top-4 rotate-12 opacity-80 pointer-events-none hidden sm:block">
            <CardView card={{ id: 'c2', color: 'wild', value: 'wild4' }} size="sm" />
          </div>

          <h1
            className="text-6xl sm:text-8xl font-black tracking-wider text-yellow-400 drop-shadow-2xl animate-bounce-slow"
            style={{
              fontFamily: 'var(--font-display)',
              textShadow:
                '0 8px 0 #b38600, 0 14px 25px rgba(0,0,0,0.8), -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000',
              letterSpacing: '2px',
            }}
          >
            NUNO
          </h1>
        </div>

        <p className="text-gray-200 text-sm sm:text-base font-semibold max-w-md drop-shadow">
          The fast, loud, wildly fun card game. Match by color, number, or symbol. Shout NUNO before anyone catches you!
        </p>
      </div>

      {/* Main Interactive Container */}
      <div className="w-full max-w-xl bg-black/40 border border-white/15 backdrop-blur-md rounded-3xl p-6 shadow-2xl z-20 mb-8">
        {/* Profile Customization */}
        <div className="mb-6 bg-white/5 border border-white/10 rounded-2xl p-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
            Your Player Profile:
          </label>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl border border-white/20 shadow-inner">
                {avatar}
              </div>
            </div>

            <input
              type="text"
              value={name}
              onChange={(e) => onUpdateProfile(e.target.value.slice(0, 15), avatar)}
              placeholder="Enter your name"
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white font-bold placeholder-gray-400 outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {/* Quick Avatar Picker */}
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/10">
            {AVATARS.map((av) => (
              <button
                key={av}
                onClick={() => {
                  sfx.click();
                  onUpdateProfile(name, av);
                }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-transform cursor-pointer ${
                  avatar === av ? 'bg-yellow-400 text-black scale-110 shadow-md' : 'hover:bg-white/10'
                }`}
              >
                {av}
              </button>
            ))}
          </div>
        </div>

        {/* Tab switcher: Quick Play vs Online Friends */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-white/10 rounded-2xl mb-6">
          <button
            onClick={() => {
              sfx.click();
              setTab('quick');
            }}
            className={`py-3 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all cursor-pointer ${
              tab === 'quick'
                ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-md'
                : 'text-gray-300 hover:text-white'
            }`}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            🤖 Play with Bots
          </button>

          <button
            onClick={() => {
              sfx.click();
              setTab('online');
            }}
            className={`py-3 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all cursor-pointer ${
              tab === 'online'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-gray-300 hover:text-white'
            }`}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            🌐 Play Online
          </button>
        </div>

        {/* Tab 1: Quick Play (Solo with Bots) */}
        {tab === 'quick' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Player Count Selector */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">
                  Number of Players (Minimum 2):
                </span>
                <span className="text-base font-extrabold text-yellow-300">
                  {playerCount} Players
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="10"
                value={playerCount}
                onChange={(e) => setPlayerCount(Number(e.target.value))}
                className="w-full accent-yellow-400 cursor-pointer h-2 bg-white/20 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                <span>2 (Duel)</span>
                <span>4 (Classic)</span>
                <span>6</span>
                <span>8</span>
                <span>10 (Party)</span>
              </div>
            </div>

            {/* Difficulty Selector */}
            <div className="grid grid-cols-3 gap-2">
              {(['chill', 'normal', 'savage'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    sfx.click();
                    setDifficulty(d);
                  }}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer border ${
                    difficulty === d
                      ? 'bg-yellow-400/20 border-yellow-400 text-yellow-300 shadow-sm'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  <div>{d === 'chill' ? '☕ Chill' : d === 'normal' ? '⚡ Normal' : '🔥 Savage'}</div>
                  <div className="text-[10px] opacity-70 font-normal">
                    {d === 'chill' ? 'Casual' : d === 'normal' ? 'Balanced' : 'Ruthless'}
                  </div>
                </button>
              ))}
            </div>

            {/* Target Score */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wide mb-1.5">
                Game Format:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => setTargetScore(0)}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    targetScore === 0
                      ? 'bg-white/15 border-yellow-400 text-yellow-300 font-bold'
                      : 'bg-white/5 border-white/10 text-gray-400'
                  }`}
                >
                  <div className="font-bold">⚡ Quick Match</div>
                  <div className="text-[10px] text-gray-400">Single round winner</div>
                </button>

                <button
                  onClick={() => setTargetScore(500)}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    targetScore === 500
                      ? 'bg-white/15 border-yellow-400 text-yellow-300 font-bold'
                      : 'bg-white/5 border-white/10 text-gray-400'
                  }`}
                >
                  <div className="font-bold">🏆 500 Points</div>
                  <div className="text-[10px] text-gray-400">Official tournament mode</div>
                </button>
              </div>
            </div>

            {/* Play Button */}
            <button
              onClick={() => {
                sfx.deal();
                onQuickPlay(playerCount, difficulty, targetScore);
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-400 hover:to-amber-400 text-black font-black text-xl tracking-wider uppercase shadow-xl shadow-yellow-500/30 transition-transform active:scale-95 cursor-pointer mt-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              🚀 PLAY NOW!
            </button>
          </div>
        )}

        {/* Tab 2: Online Multiplayer */}
        {tab === 'online' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Create Room Section */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <h4
                className="font-extrabold text-base text-yellow-300 mb-2 flex items-center gap-1.5"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <span>👑</span> Host a New Room
              </h4>
              <p className="text-xs text-gray-300 mb-4">
                Create a multiplayer room, invite friends via link or code, and fill empty slots with bots!
              </p>

              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs text-gray-300">Slots:</span>
                <select
                  value={playerCount}
                  onChange={(e) => setPlayerCount(Number(e.target.value))}
                  className="bg-white/10 text-white text-xs rounded-xl px-3 py-2 border border-white/20 outline-none cursor-pointer"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n} className="bg-gray-900">
                      {n} Players
                    </option>
                  ))}
                </select>

                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="bg-white/10 text-white text-xs rounded-xl px-3 py-2 border border-white/20 outline-none cursor-pointer"
                >
                  <option value="chill" className="bg-gray-900">Chill Bots</option>
                  <option value="normal" className="bg-gray-900">Normal Bots</option>
                  <option value="savage" className="bg-gray-900">Savage Bots</option>
                </select>
              </div>

              <button
                onClick={() => {
                  sfx.deal();
                  onCreateRoom(playerCount, difficulty, targetScore);
                }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider shadow-lg transition-transform active:scale-95 cursor-pointer"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                + Create Room & Invite
              </button>
            </div>

            {/* Join Room Section */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <h4
                className="font-extrabold text-base text-yellow-300 mb-2 flex items-center gap-1.5"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <span>🔗</span> Join an Existing Room
              </h4>
              <p className="text-xs text-gray-300 mb-3">
                Enter the room code shared by your friend:
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. NUNO-7X9K"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={12}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold uppercase tracking-wider placeholder-gray-500 outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <button
                  onClick={() => {
                    if (joinCode.trim()) {
                      sfx.click();
                      onJoinRoom(joinCode.trim());
                    }
                  }}
                  disabled={!joinCode.trim()}
                  className="py-2.5 px-6 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-extrabold text-xs uppercase tracking-wider shadow-md transition-transform active:scale-95 cursor-pointer"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 z-10 pb-2">
        <p>NUNO — Built with official Uno rules & WebRTC P2P multiplayer</p>
      </footer>
    </div>
  );
};
