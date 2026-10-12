import React, { useState } from 'react';
import type { ChatMessage, LobbyState, RoomOptions } from '../net/protocol';
import type { Difficulty } from '../game/types';
import { sfx } from '../lib/sound';

interface Props {
  lobby: LobbyState;
  yourSeat: number;
  isHost: boolean;
  chatMessages: ChatMessage[];
  onStartGame: () => void;
  onUpdateOptions: (opts: Partial<RoomOptions>) => void;
  onUpdateSeat: (index: number, kind: 'bot' | 'human') => void;
  onSendChat: (text: string) => void;
  onLeave: () => void;
}

export const LobbyView: React.FC<Props> = ({
  lobby,
  yourSeat,
  isHost,
  chatMessages,
  onStartGame,
  onUpdateOptions,
  onUpdateSeat,
  onSendChat,
  onLeave,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);

  const copyInvite = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${lobby.roomId}`;
    navigator.clipboard.writeText(url);
    sfx.pop();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sfx.click();
    onSendChat(chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="relative min-h-screen w-full bg-[#140e26] text-white flex flex-col p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-black/40 border border-white/10 rounded-2xl p-4 mb-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div
            className="text-3xl font-black text-yellow-400 drop-shadow"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            NUNO LOBBY
          </div>
          <div className="bg-white/10 px-3 py-1 rounded-xl flex items-center gap-2 border border-white/10">
            <span className="text-xs text-gray-400">ROOM:</span>
            <span className="font-extrabold text-yellow-300 tracking-wider">
              {lobby.roomId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyInvite}
            className="py-2 px-4 rounded-xl bg-purple-600/60 hover:bg-purple-600 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
          >
            <span>{copied ? '✓ Link Copied!' : '📋 Copy Invite Link'}</span>
          </button>
          <button
            onClick={onLeave}
            className="py-2 px-4 rounded-xl bg-red-600/30 hover:bg-red-600/50 text-red-200 font-bold text-xs sm:text-sm transition-all cursor-pointer"
          >
            Leave
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Left Column: Player Slots & Match Settings */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Player Seats Grid */}
          <div className="bg-black/30 border border-white/10 rounded-3xl p-5 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3
                className="text-lg font-bold text-gray-200 flex items-center gap-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <span>👥</span>
                <span>Players ({lobby.seats.length} Slots)</span>
              </h3>
              {isHost && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Slots:</span>
                  <select
                    value={lobby.options.playerCount}
                    onChange={(e) =>
                      onUpdateOptions({ playerCount: Number(e.target.value) })
                    }
                    className="bg-white/10 text-white text-xs rounded-lg px-2.5 py-1 border border-white/20 outline-none cursor-pointer"
                  >
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n} className="bg-gray-900 text-white">
                        {n} Players
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lobby.seats.map((seat, idx) => {
                const isMe = idx === yourSeat;
                const isHostSeat = idx === 0;

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      isMe
                        ? 'bg-yellow-500/10 border-yellow-400/50 ring-1 ring-yellow-400/40'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{seat.avatar}</div>
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-1.5">
                          <span>{seat.name}</span>
                          {isMe && (
                            <span className="text-[10px] bg-yellow-400 text-black px-1.5 rounded font-black">
                              YOU
                            </span>
                          )}
                          {isHostSeat && (
                            <span className="text-[10px] bg-amber-600 text-white px-1.5 rounded font-bold">
                              👑 HOST
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 capitalize">
                          {seat.kind === 'bot' ? '🤖 Bot' : seat.kind === 'remote' ? '🌐 Online Player' : 'Host Player'}
                        </div>
                      </div>
                    </div>

                    {/* Host action to switch bot / human */}
                    {isHost && !isHostSeat && (
                      <div>
                        {seat.kind === 'bot' ? (
                          <button
                            onClick={() => onUpdateSeat(idx, 'human')}
                            className="text-[11px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg text-gray-300 transition-colors cursor-pointer"
                            title="Convert into waiting slot for a real player"
                          >
                            Open Slot
                          </button>
                        ) : (
                          <button
                            onClick={() => onUpdateSeat(idx, 'bot')}
                            className="text-[11px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg text-gray-300 transition-colors cursor-pointer"
                            title="Replace with an AI bot"
                          >
                            Add Bot
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Game Settings Card */}
          <div className="bg-black/30 border border-white/10 rounded-3xl p-5 shadow-xl">
            <h3
              className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <span>⚙️</span>
              <span>Game Options</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  Bot Difficulty:
                </label>
                {isHost ? (
                  <select
                    value={lobby.options.difficulty}
                    onChange={(e) =>
                      onUpdateOptions({ difficulty: e.target.value as Difficulty })
                    }
                    className="w-full bg-white/10 text-white rounded-xl px-3 py-2 border border-white/20 outline-none cursor-pointer"
                  >
                    <option value="chill" className="bg-gray-900">Chill (Casual & forgiving)</option>
                    <option value="normal" className="bg-gray-900">Normal (Balanced & fun)</option>
                    <option value="savage" className="bg-gray-900">Savage (Fast & catches all bluffs)</option>
                  </select>
                ) : (
                  <div className="p-2 rounded-xl bg-white/5 capitalize font-medium text-gray-200">
                    {lobby.options.difficulty}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  Target Score (Official Tournament):
                </label>
                {isHost ? (
                  <select
                    value={lobby.options.targetScore}
                    onChange={(e) =>
                      onUpdateOptions({ targetScore: Number(e.target.value) })
                    }
                    className="w-full bg-white/10 text-white rounded-xl px-3 py-2 border border-white/20 outline-none cursor-pointer"
                  >
                    <option value={0} className="bg-gray-900">Quick Match (Single Round)</option>
                    <option value={250} className="bg-gray-900">250 Points</option>
                    <option value={500} className="bg-gray-900">500 Points (Official Rules)</option>
                  </select>
                ) : (
                  <div className="p-2 rounded-xl bg-white/5 font-medium text-gray-200">
                    {lobby.options.targetScore === 0
                      ? 'Quick Match (1 Round)'
                      : `${lobby.options.targetScore} Points`}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: In-Lobby Chat & Start Button */}
        <div className="flex flex-col gap-6">
          <div className="bg-black/30 border border-white/10 rounded-3xl p-4 flex flex-col h-80 sm:h-96 shadow-xl">
            <h3 className="text-sm font-bold text-gray-300 mb-2 flex items-center gap-1.5">
              <span>💬</span> Lobby Chat
            </h3>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {chatMessages.length === 0 ? (
                <div className="text-gray-500 italic text-center my-auto">
                  Say hi to everyone in the room!
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2 rounded-xl ${
                      msg.isSystem
                        ? 'bg-purple-900/40 text-purple-200 border border-purple-500/20'
                        : 'bg-white/5 border border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-bold text-gray-300 mb-0.5">
                      <span>{msg.avatar}</span>
                      <span>{msg.sender}:</span>
                    </div>
                    <div className="text-gray-100 pl-4 break-words">{msg.text}</div>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="mt-2 flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={100}
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-yellow-400"
              />
              <button
                type="submit"
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold px-3 py-2 rounded-xl text-xs uppercase cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>

          {/* Start Game Button Card */}
          <div className="bg-black/30 border border-white/10 rounded-3xl p-5 text-center shadow-xl">
            {isHost ? (
              <button
                onClick={() => {
                  sfx.deal();
                  onStartGame();
                }}
                className="w-full py-5 rounded-2xl bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 hover:from-green-400 hover:to-emerald-400 text-white font-black text-xl tracking-wider uppercase shadow-xl shadow-green-600/40 transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer ring-2 ring-white/30"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                🎮 START GAME NOW!
              </button>
            ) : (
              <div className="py-4 text-center">
                <div className="animate-spin text-3xl mb-2">🎲</div>
                <div className="text-sm font-bold text-yellow-300">
                  Waiting for Host to start...
                </div>
                <div className="text-xs text-gray-400 mt-1">Get ready to shout NUNO!</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
