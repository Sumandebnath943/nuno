import React, { useEffect, useRef, useState } from 'react';
import type { ChatMessage, LobbyState, RoomOptions } from '../net/protocol';
import type { VoiceChat } from '../net/voice';
import type { Difficulty, GameMode } from '../game/types';
import { MODES } from '../game/modes';
import { Logo } from './ui';
import { ModeButton, ModePicker } from './ModePicker';
import { sfx } from '../lib/sound';
import { AmbientCanvas } from './ThemeStage';
import { Avatar } from './Avatar';
import { useTheme } from '../themes';
import { useVoice, VoiceBar } from './VoiceControls';
import type { SettingsTab } from './SettingsModal';

interface Props {
  lobby: LobbyState;
  yourSeat: number;
  isHost: boolean;
  chatMessages: ChatMessage[];
  voice?: VoiceChat;
  onStartGame: () => void;
  onUpdateOptions: (opts: Partial<RoomOptions>) => void;
  onUpdateSeat: (index: number, kind: 'bot' | 'human') => void;
  onSendChat: (text: string) => void;
  onLeave: () => void;
  onOpenRules: (mode: GameMode) => void;
  onOpenSettings: (tab?: SettingsTab) => void;
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
  voice,
  onStartGame,
  onUpdateOptions,
  onUpdateSeat,
  onSendChat,
  onLeave,
  onOpenRules,
  onOpenSettings,
}) => {
  const theme = useTheme();
  const snap = useVoice(voice);
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
  const hostSeat = lobby.hostSeat ?? 0;

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

  const peerOf = (idx: number) => (idx === hostSeat ? lobby.hostPeerId : lobby.seats[idx]?.peerId);

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden">
      <AmbientCanvas />
      {/* Header */}
      <header className="safe-top relative flex items-center justify-between gap-2 px-3 pb-3 sm:p-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Logo animated={false} className="hidden w-24 shrink-0 sm:block sm:w-32" />
          <div className="panel flex items-center gap-2 !rounded-2xl px-3 py-1 !shadow-[0_4px_0_var(--ink)]">
            <span className="label">Room</span>
            <span className="font-ui text-xl tracking-[0.16em] sm:text-2xl">{lobby.roomId}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button onClick={copyInvite} className="btn btn-purple h-10 px-3 text-sm sm:h-11 sm:px-4 sm:text-base">
            {copied ? '✓ Copied' : '🔗 Invite'}
          </button>
          <button onClick={() => onOpenSettings(isHost ? 'themes' : 'sound')} className="icon-btn !h-10 sm:!h-11" aria-label="Settings" title="Theme & sound">
            ⚙️
          </button>
          <button onClick={onLeave} className="icon-btn !h-10 sm:!h-11" aria-label="Leave">
            🚪 <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </header>

      <main className="nice-scroll relative mx-auto grid min-h-0 w-full max-w-6xl flex-1 gap-3 overflow-y-auto px-3 pb-4 sm:gap-4 sm:px-4 lg:grid-cols-[1fr_340px]">
        {/* Seats + options */}
        <section className="panel flex min-h-0 flex-col p-3 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
            <h2 className="font-display text-2xl">
              Players <span className="text-[var(--muted)]">({lobby.seats.length})</span>
            </h2>
            <p className="font-body text-sm font-medium text-[var(--muted)]">
              {humans === 1 ? 'Share the link! Friends who join take a bot’s seat.' : `${humans} humans · seats get mixed up when the game starts`}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {lobby.seats.map((seat, idx) => {
              const isMe = idx === yourSeat;
              const peer = peerOf(idx);
              const vs = peer && snap ? snap.states[peer] : undefined;
              const mutedByMe = !!(peer && snap?.muted[peer]);
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 rounded-2xl border-[2.5px] border-[var(--ink)] px-3 py-2 ${
                    isMe ? 'bg-[var(--highlight)]' : seat.kind === 'bot' ? 'bg-[var(--panel-3)]' : 'bg-[var(--surface)]'
                  }`}
                >
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--surface)] text-2xl">
                    <Avatar value={seat.avatar} fill />
                    {vs?.speaking && !mutedByMe && <span className="voice-ring" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-ui truncate text-lg leading-tight">{seat.name}</div>
                    <div className="font-body flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
                      {idx === hostSeat && <Tag className="bg-[var(--yellow)]">Host</Tag>}
                      {isMe && <Tag className="bg-[var(--surface)]">You</Tag>}
                      {seat.kind === 'bot' ? <span>🤖 Bot · seat open</span> : idx !== hostSeat && <span>🌐 Online</span>}
                      {vs?.mic && <span title="Mic on">🎙️</span>}
                    </div>
                  </div>
                  {!isMe && peer && snap && vs?.mic && (
                    <button
                      onClick={() => {
                        sfx.click();
                        voice?.toggleMute(peer);
                      }}
                      className="chip shrink-0 px-2 py-1 text-xs"
                      title={mutedByMe ? 'Hear them again' : 'Mute them for you'}
                    >
                      {mutedByMe ? '🔇 Muted' : '🔊'}
                    </button>
                  )}
                  {isHost && idx !== hostSeat && seat.kind === 'remote' && (
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

          <div className="mt-4 grid gap-4 border-t-2 border-dashed border-[var(--line)] pt-4 md:grid-cols-2">
            <OptionGroup label="Game mode">
              <ModeButton mode={mode} onClick={() => (isHost ? setPicking(true) : onOpenRules(mode))} />
              {!isHost && (
                <button onClick={() => onOpenRules(mode)} className="font-body mt-1.5 text-xs font-bold text-[var(--link)] underline underline-offset-2">
                  How to play {MODES[mode].name}
                </button>
              )}
            </OptionGroup>
            <OptionGroup label="Theme">
              <button
                type="button"
                onClick={() => onOpenSettings('themes')}
                className="group relative flex h-[56px] w-full items-center gap-3 overflow-hidden rounded-2xl border-[2.5px] border-[var(--ink)] px-2.5 text-left shadow-[0_3px_0_var(--ink)]"
                style={{ background: theme.vars['--room-bg'] ?? 'linear-gradient(90deg, #3b2f86, #17143d)' }}
              >
                <span className="text-2xl drop-shadow">{theme.emoji}</span>
                <span className="min-w-0 flex-1 leading-tight text-white" style={{ textShadow: '0 2px 0 rgba(0,0,0,0.6)' }}>
                  <span className="font-display block truncate text-lg">{theme.title}</span>
                  <span className="font-body block text-xs font-semibold">{isHost ? 'Everyone plays in your theme' : 'Picked by the host'}</span>
                </span>
                {isHost && <span className="chip shrink-0 px-2.5 py-1 text-sm">Change</span>}
              </button>
            </OptionGroup>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[auto_1fr_1fr]">
            <OptionGroup label="Seats">
              {isHost ? (
                <div className="flex items-center gap-2">
                  <button className="chip h-10 w-10 text-xl" onClick={() => opt('playerCount', Math.max(2, lobby.options.playerCount - 1))} aria-label="Fewer seats">
                    −
                  </button>
                  <span className="font-ui w-8 text-center text-2xl">{lobby.options.playerCount}</span>
                  <button className="chip h-10 w-10 text-xl" onClick={() => opt('playerCount', Math.min(10, lobby.options.playerCount + 1))} aria-label="More seats">
                    +
                  </button>
                </div>
              ) : (
                <span className="font-ui text-2xl">{lobby.options.playerCount}</span>
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

        {/* Voice + chat + start */}
        <section className="flex min-h-[320px] flex-col gap-3 sm:gap-4">
          {voice && snap && <VoiceBar voice={voice} snap={snap} />}
          <div className="panel flex min-h-0 flex-1 flex-col p-3">
            <h3 className="font-display px-1 text-xl">Chat</h3>
            <div className="nice-scroll mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {chatMessages.length === 0 ? (
                <p className="font-body px-1 pt-6 text-center text-sm font-medium text-[var(--muted)]">Say hi! Trash talk is encouraged.</p>
              ) : (
                chatMessages.map((m) =>
                  m.isSystem ? (
                    <div key={m.id} className="font-body px-1 text-center text-xs font-semibold text-[var(--link)]">
                      {m.text}
                    </div>
                  ) : (
                    <div key={m.id} className="flex items-start gap-2 rounded-xl bg-[var(--surface)] px-2 py-1.5 text-sm">
                      <span className="text-lg leading-none">
                        <Avatar value={m.avatar} />
                      </span>
                      <div className="min-w-0">
                        <span className="font-ui">{m.sender}</span>
                        <p className="font-body break-words font-medium text-[var(--soft)]">{m.text}</p>
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
              <span className="font-ui text-lg">Waiting for the host to start…</span>
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
  return <span className={`font-ui rounded-md border-2 border-[var(--ink)] px-1 text-[10px] uppercase leading-4 text-[var(--ink)] ${className}`}>{children}</span>;
}
