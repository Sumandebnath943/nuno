import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import type { GameView, Intent, Difficulty, GameMode } from './game/types';
import type { ChatMessage, LobbyState, RoomOptions } from './net/protocol';
import { ClientSession, HostSession, LocalSession, type Session } from './net/network';
import { HomeMenu } from './components/HomeMenu';
import { LobbyView } from './components/LobbyView';
import { GameBoard } from './components/GameBoard';
import { RulesModal } from './components/RulesModal';
import { CardDefs } from './components/CardView';
import { Logo } from './components/ui';
import { ThemeBackdrop } from './components/ThemeStage';
import { SettingsModal, type SettingsTab } from './components/SettingsModal';
import { Intro } from './components/Intro';
import { THEMES, ThemeContext } from './themes';
import { useSettings } from './lib/settings';

/** Long games collect a lot of trash talk; the table only needs the recent part. */
const keepRecent = (list: ChatMessage[], msg: ChatMessage) => [...list.slice(-80), msg];

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export const App: React.FC = () => {
  const [screen, setScreen] = useState<'home' | 'lobby' | 'game'>('home');
  const [profile, setProfile] = useState<{ name: string; avatar: string }>(() => {
    const saved = localStorage.getItem('nuno.profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return { name: `Player${Math.floor(100 + Math.random() * 900)}`, avatar: '😎' };
  });

  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<GameView | null>(null);
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [yourSeat, setYourSeat] = useState<number>(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rules, setRules] = useState<{ open: boolean; mode: GameMode; focus: 'rules' | 'cards' }>({
    open: false,
    mode: 'classic',
    focus: 'rules',
  });
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null);
  const openSettings = (tab: SettingsTab = 'themes') => setSettingsTab(tab);
  const sessionRef = useRef<Session | null>(null);
  const settings = useSettings();
  const theme = THEMES[settings.theme];
  // The opening plays every time the game is opened.
  const [intro, setIntro] = useState(true);
  const [inviteCode] = useState(() => new URLSearchParams(window.location.search).get('room'));

  // An invite link joins the room straight away (it connects while the intro plays).
  useEffect(() => {
    if (inviteCode) handleJoinRoom(inviteCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateProfile = (name: string, avatar: string) => {
    const next = { name, avatar };
    setProfile(next);
    localStorage.setItem('nuno.profile', JSON.stringify(next));
  };

  const cleanupSession = () => {
    if (sessionRef.current) {
      sessionRef.current.destroy();
      sessionRef.current = null;
    }
    setSession(null);
    setView(null);
    setLobby(null);
    setChatMessages([]);
  };

  const openRules = (mode: GameMode, focus: 'rules' | 'cards' = 'rules') => setRules({ open: true, mode, focus });

  const handleQuickPlay = (playerCount: number, difficulty: Difficulty, targetScore: number, mode: GameMode) => {
    cleanupSession();
    const options: RoomOptions = { playerCount, difficulty, targetScore, mode };
    const sess = new LocalSession(profile.name, profile.avatar, options, {
      onView: (v) => setView(v),
      onLobby: () => {},
      onChat: (msg) => setChatMessages((prev) => keepRecent(prev, msg)),
      onError: (err) => setErrorMessage(err),
    });
    sessionRef.current = sess;
    setSession(sess);
    setScreen('game');
  };

  const handleCreateRoom = (playerCount: number, difficulty: Difficulty, targetScore: number, mode: GameMode) => {
    cleanupSession();
    const roomId = generateRoomId();
    const options: RoomOptions = { playerCount, difficulty, targetScore, mode };

    const sess = new HostSession(roomId, profile.name, profile.avatar, options, {
      onView: (v) => {
        setView(v);
        setScreen('game');
      },
      onLobby: (l, seat) => {
        setLobby(l);
        setYourSeat(seat);
      },
      onChat: (msg) => setChatMessages((prev) => keepRecent(prev, msg)),
      onError: (err) => setErrorMessage(err),
    });

    sessionRef.current = sess;
    setSession(sess);
    setScreen('lobby');
  };

  const handleJoinRoom = (roomId: string) => {
    cleanupSession();
    const cleanId = roomId.trim().toUpperCase();

    const sess = new ClientSession(cleanId, profile.name, profile.avatar, {
      onView: (v) => {
        setView(v);
        setScreen('game');
      },
      onLobby: (l, seat) => {
        setLobby(l);
        setYourSeat(seat);
        if (!l.inGame) setScreen('lobby');
      },
      onChat: (msg) => setChatMessages((prev) => keepRecent(prev, msg)),
      onError: (err) => setErrorMessage(err),
    });

    sessionRef.current = sess;
    setSession(sess);
    setScreen('lobby');
  };

  const handleStartGame = () => {
    if (session && session.startGame) {
      session.startGame();
    }
  };

  const handleLeave = () => {
    cleanupSession();
    window.history.replaceState({}, '', window.location.pathname);
    setScreen('home');
  };

  // Stable, so the table's memoised seats don't re-render on every move.
  const handleAction = useCallback((intent: Intent) => {
    sessionRef.current?.sendAction(intent);
  }, []);
  const seatPeers = useMemo(() => lobby?.seats.map((s, i) => (i === lobby.hostSeat ? lobby.hostPeerId : s.peerId)), [lobby]);

  const handleNextRound = () => {
    if (session) {
      session.sendAction({ type: 'nextRound' });
    }
  };

  const handleNewGame = () => {
    session?.restart?.();
  };

  return (
    <ThemeContext.Provider value={theme}>
      <div className="relative min-h-screen w-full">
        <CardDefs />
        {/* The room and its scenery sit behind every screen. */}
        <div className="bg-room fixed inset-0" aria-hidden="true">
          <ThemeBackdrop focus={screen === 'game'} />
        </div>

        {/* Toast Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="font-display fixed left-1/2 top-4 z-[90] flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-2xl border-[3px] border-[var(--ink)] bg-[#ffe1e1] px-4 py-2.5 text-[var(--ink)] shadow-[0_4px_0_var(--ink)] animate-popIn"
          >
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="icon-btn !h-8 !min-w-8 !px-0" aria-label="Dismiss">
              ✕
            </button>
          </div>
        )}

        {/* Screen Router */}
        {screen === 'home' && (
          <HomeMenu
            name={profile.name}
            avatar={profile.avatar}
            onUpdateProfile={handleUpdateProfile}
            onQuickPlay={handleQuickPlay}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onOpenRules={openRules}
            onOpenSettings={openSettings}
          />
        )}

        {screen === 'lobby' && !lobby && (
          <div className="relative flex h-[100dvh] flex-col items-center justify-center gap-6 p-6 text-center">
            <Logo className="w-64" />
            <div className="panel flex items-center gap-3 px-6 py-4">
              <span className="text-3xl animate-wiggle">🎲</span>
              <span className="font-display text-xl">Finding the room…</span>
            </div>
            <button onClick={handleLeave} className="icon-btn">
              ← Back to menu
            </button>
          </div>
        )}

        {screen === 'lobby' && lobby && (
          <LobbyView
            lobby={lobby}
            yourSeat={yourSeat}
            isHost={session?.isHost ?? false}
            chatMessages={chatMessages}
            onStartGame={handleStartGame}
            onUpdateOptions={(opts) => session?.updateOptions?.(opts)}
            onUpdateSeat={(idx, kind) => session?.updateSeat?.(idx, kind)}
            onSendChat={(text) => session?.sendChat(text)}
            onLeave={handleLeave}
            onOpenRules={(m) => openRules(m)}
            onOpenSettings={openSettings}
            voice={session?.voice}
          />
        )}

        {screen === 'game' && view && (
          <GameBoard
            view={view}
            isHost={session?.isHost ?? false}
            roomId={lobby?.roomId}
            chatMessages={chatMessages}
            voice={session?.voice}
            seatPeers={seatPeers}
            onAction={handleAction}
            onTaunt={(id) => session?.sendTaunt(id)}
            onLeave={handleLeave}
            onNextRound={handleNextRound}
            onNewGame={handleNewGame}
            onOpenRules={() => openRules(view.mode)}
            onOpenSettings={openSettings}
          />
        )}

        <RulesModal
          open={rules.open}
          mode={rules.mode}
          focus={rules.focus}
          onClose={() => setRules((r) => ({ ...r, open: false }))}
        />
        <SettingsModal
          open={settingsTab !== null}
          tab={settingsTab ?? 'themes'}
          onClose={() => setSettingsTab(null)}
          onOpenRules={() => openRules(view?.mode ?? 'classic')}
        />
        {intro && <Intro joining={inviteCode} onDone={() => setIntro(false)} />}
      </div>
    </ThemeContext.Provider>
  );
};
