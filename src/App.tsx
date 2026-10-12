import React, { useState, useEffect, useRef } from 'react';
import type { GameView, Intent, Difficulty } from './game/types';
import type { ChatMessage, LobbyState, RoomOptions } from './net/protocol';
import { ClientSession, HostSession, LocalSession, type Session } from './net/network';
import { HomeMenu } from './components/HomeMenu';
import { LobbyView } from './components/LobbyView';
import { GameBoard } from './components/GameBoard';
import { RulesModal } from './components/RulesModal';
import { CardGalleryModal } from './components/CardGalleryModal';
import { CardDefs } from './components/CardView';
import { Logo } from './components/ui';

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
  const [rulesOpen, setRulesOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const sessionRef = useRef<Session | null>(null);

  // Check URL query param for room invite on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      handleJoinRoom(roomParam);
    }
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

  const handleQuickPlay = (
    playerCount: number,
    difficulty: Difficulty,
    targetScore: number,
  ) => {
    cleanupSession();
    const options: RoomOptions = { playerCount, difficulty, targetScore };
    const sess = new LocalSession(profile.name, profile.avatar, options, {
      onView: (v) => setView(v),
      onLobby: () => {},
      onChat: (msg) => setChatMessages((prev) => [...prev, msg]),
      onError: (err) => setErrorMessage(err),
    });
    sessionRef.current = sess;
    setSession(sess);
    setScreen('game');
  };

  const handleCreateRoom = (
    playerCount: number,
    difficulty: Difficulty,
    targetScore: number,
  ) => {
    cleanupSession();
    const roomId = generateRoomId();
    const options: RoomOptions = { playerCount, difficulty, targetScore };

    const sess = new HostSession(roomId, profile.name, profile.avatar, options, {
      onView: (v) => {
        setView(v);
        setScreen('game');
      },
      onLobby: (l, seat) => {
        setLobby(l);
        setYourSeat(seat);
      },
      onChat: (msg) => setChatMessages((prev) => [...prev, msg]),
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
      onChat: (msg) => setChatMessages((prev) => [...prev, msg]),
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

  const handleAction = (intent: Intent) => {
    if (session) {
      session.sendAction(intent);
    }
  };

  const handleNextRound = () => {
    if (session) {
      session.sendAction({ type: 'nextRound' });
    }
  };

  const handleNewGame = () => {
    session?.restart?.();
  };

  return (
    <div className="w-full min-h-screen">
      <CardDefs />
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
          onOpenRules={() => setRulesOpen(true)}
          onOpenCardGallery={() => setGalleryOpen(true)}
        />
      )}

      {screen === 'lobby' && !lobby && (
        <div className="bg-room flex h-[100dvh] flex-col items-center justify-center gap-6 p-6 text-center">
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
        />
      )}

      {screen === 'game' && view && (
        <GameBoard
          view={view}
          isHost={session?.isHost ?? false}
          roomId={lobby?.roomId}
          chatMessages={chatMessages}
          onAction={handleAction}
          onSendChat={(text) => session?.sendChat(text)}
          onLeave={handleLeave}
          onNextRound={handleNextRound}
          onNewGame={handleNewGame}
          onOpenRules={() => setRulesOpen(true)}
        />
      )}

      {/* Rules Modal */}
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      {/* Card Designs Gallery Modal */}
      <CardGalleryModal open={galleryOpen} onClose={() => setGalleryOpen(false)} />
    </div>
  );
};
