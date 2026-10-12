import React, { useEffect, useRef, useState } from 'react';
import type { ChatMessage, LobbyState, RoomOptions } from '../net/protocol';
import type { Difficulty, GameMode } from '../game/types';
import { MODES } from '../game/modes';
import { Logo } from './ui';
import { ModeButton, ModePicker } from './ModePicker';
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
  onOpenRules: (mode: GameMode) => void;
}

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'chill', label: '☕ Chill' },
  { id: 'normal', label: '⚡ Normal' },
  { id: 'savage', label: '🔥 Savage' },
];

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
  onOpenRules,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [picking, setPicking] = useState(false);
  const mode = lobby.options.mode ?? 'classic';
  const official = MODES[mode].officialTarget;
  const formats = [
    { score: 0, label: '1 Round' },
    { score: official / 2, label: `${official / 2} pts` },
    { score: official, label: `${official} pts` },
  ];
  const [copied, setCopied] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const humans = lobby.seats.filter((s) => s.kind !== 'bot').length;
  const connecting = isHost && !lobby.hostPeerId;

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [chatMessages.length]);

  const copyInvite = () => {
    navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}?room=${lobby.roomId}`);
    sfx.pop();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    sfx.click();
    onSendChat(text);
    setChatInput('');
  };

  const opt = <K extends keyof RoomOptions>(key: K, value: RoomOptions[K]) => {
    sfx.click();
    onUpdateOptions({ [key]: value } as Partial<RoomOptions>);
  };

  /** Switch mode, keeping the same kind of game length (single round, short, official). */
  const pickMode = (next: GameMode) => {
    const t = lobby.options.targetScore;
    const scale = t === 0 ? 0 : t === official ? 1 : 0.5;
    onUpdateOptions({ mode: next, targetScore: MODES[next].officialTarget * scale });
    setPicking(false);
  };

  return (
    <div className="bg-room flex h-[100dvh] w-full flex-col overflow-hidden">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <Logo animated={false} className="w-24 sm:w-32" />
          <div className="panel flex items-center gap-2 !rounded-2xl px-3 py-1 !shadow-[0_4px_0_var(--ink)]">
            <span className="label">Room</span>
            <span className="font-display text-2xl tracking-[0.18em]">{lobby.roomId}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyInvite} className="btn btn-purple h-11 px-4 text-base">
            {copied ? '✓ Link copied' : '🔗 Copy invite link'}
          </button>
          <button onClick={onLeave} className="icon-btn !h-11">
            🚪 <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </header>

      <main className="nice-scroll mx-auto grid min-h-0 w-full max-w-6xl flex-1 gap-4 overflow-y-auto px-3 pb-4 sm:px-4 lg:grid-cols-[1fr_340px]">
        {/* Seats + options */}
        <section className="panel flex min-h-0 flex-col p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl">
              Players <span className="text-[#9a93ad]">({lobby.seats.length})</span>
            </h2>
            <p className="text-sm font-medium text-[#6b6385]">
              {humans === 1 ? 'Share the link! Friends who join take a bot’s seat.' : `${humans} humans at the table`}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {lobby.seats.map((seat, idx) => {
              const isMe = idx === yourSeat;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 rounded-2xl border-[2.5px] border-[var(--ink)] px-3 py-2 ${
                    isMe ? 'bg-[#fff1a8]' : seat.kind === 'bot' ? 'bg-[#f1ebdd]' : 'bg-white'
                  }`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[2.5px] border-[var(--ink)] bg-white text-2xl">
                    {seat.avatar}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-display truncate text-lg leading-tight">{seat.name}</div>
                    <div className="flex gap-1.5 text-xs font-semibold text-[#6b6385]">
                      {idx === 0 && <Tag className="bg-[var(--yellow)]">Host</Tag>}
                      {isMe && <Tag className="bg-white">You</Tag>}
                      {seat.kind === 'bot' ? <span>🤖 Bot · seat open</span> : idx !== 0 && <span>🌐 Online</span>}
                    </div>
                  </div>
                  {isHost && idx !== 0 && seat.kind === 'remote' && (
                    <button
                      onClick={() => onUpdateSeat(idx, 'bot')}
                      className="chip shrink-0 px-2 py-1 text-xs"
                      title="Remove this player and give the seat to a bot"
                    >
                      Swap for bot
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 border-t-2 border-dashed border-[#d8ccb1] pt-4">
            <OptionGroup label="Game mode">
              <div className="max-w-md">
                <ModeButton mode={mode} onClick={() => (isHost ? setPicking(true) : onOpenRules(mode))} />
              </div>
              {!isHost && (
                <button
                  onClick={() => onOpenRules(mode)}
                  className="mt-1.5 text-xs font-bold text-[#6d4ce6] underline underline-offset-2"
                >
                  How to play {MODES[mode].name}
                </button>
              )}
            </OptionGroup>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[auto_1fr_1fr]">
            <OptionGroup label="Seats">
              {isHost ? (
                <div className="flex items-center gap-2">
                  <button
                    className="chip h-10 w-10 text-xl"
                    onClick={() => opt('playerCount', Math.max(2, lobby.options.playerCount - 1))}
                    aria-label="Fewer seats"
                  >
                    −
                  </button>
                  <span className="font-display w-8 text-center text-2xl">{lobby.options.playerCount}</span>
                  <button
                    className="chip h-10 w-10 text-xl"
                    onClick={() => opt('playerCount', Math.min(10, lobby.options.playerCount + 1))}
                    aria-label="More seats"
                  >
                    +
                  </button>
                </div>
              ) : (
                <span className="font-display text-2xl">{lobby.options.playerCount}</span>
              )}
            </OptionGroup>
            <OptionGroup label="Bot skill">
              <div className="grid grid-cols-3 gap-1.5">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.id}
                    disabled={!isHost}
                    onClick={() => opt('difficulty', d.id)}
                    className={`chip h-10 whitespace-nowrap px-1 text-[13px] disabled:cursor-default ${lobby.options.difficulty === d.id ? 'is-on' : ''}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </OptionGroup>
            <OptionGroup label="Game length">
              <div className="grid grid-cols-3 gap-1.5">
                {formats.map((f) => (
                  <button
                    key={f.score}
                    disabled={!isHost}
                    onClick={() => opt('targetScore', f.score)}
                    className={`chip h-10 whitespace-nowrap px-1 text-[13px] disabled:cursor-default ${lobby.options.targetScore === f.score ? 'is-on' : ''}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </OptionGroup>
          </div>
        </section>

        {/* Chat + start */}
        <section className="flex min-h-[320px] flex-col gap-4">
          <div className="panel flex min-h-0 flex-1 flex-col p-3">
            <h3 className="font-display px-1 text-xl">Chat</h3>
            <div className="nice-scroll mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {chatMessages.length === 0 ? (
                <p className="px-1 pt-6 text-center text-sm font-medium text-[#9a93ad]">Say hi! Trash talk is encouraged.</p>
              ) : (
                chatMessages.map((m) =>
                  m.isSystem ? (
                    <div key={m.id} className="px-1 text-center text-xs font-semibold text-[#8a6fd6]">
                      {m.text}
                    </div>
                  ) : (
                    <div key={m.id} className="flex items-start gap-2 rounded-xl bg-white px-2 py-1.5 text-sm">
                      <span className="text-lg leading-none">{m.avatar}</span>
                      <div className="min-w-0">
                        <span className="font-display">{m.sender}</span>
                        <p className="break-words font-medium text-[#4d4566]">{m.text}</p>
                      </div>
                    </div>
                  ),
                )
              )}
              <div ref={chatEnd} />
            </div>
            <form onSubmit={send} className="mt-2 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={100}
                placeholder="Type a message…"
                aria-label="Chat message"
                className="field h-11 min-w-0 flex-1 px-3 text-sm"
              />
              <button type="submit" className="btn btn-yellow h-11 px-4 text-base">
                Send
              </button>
            </form>
          </div>

          {isHost ? (
            <button
              onClick={() => {
                sfx.deal();
                onStartGame();
              }}
              disabled={connecting}
              className="btn btn-green h-16 w-full text-2xl"
            >
              {connecting ? 'Opening room…' : 'Start game!'}
            </button>
          ) : (
            <div className="panel flex h-16 items-center justify-center gap-3">
              <span className="text-3xl animate-wiggle">🎲</span>
              <span className="font-display text-lg">Waiting for the host to start…</span>
            </div>
          )}
        </section>
      </main>

      <ModePicker open={picking} value={mode} onClose={() => setPicking(false)} onPick={pickMode} onRules={onOpenRules} />
    </div>
  );
};

function OptionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function Tag({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`font-display rounded-md border-2 border-[var(--ink)] px-1 text-[10px] uppercase leading-4 text-[var(--ink)] ${className}`}
    >
      {children}
    </span>
  );
}
