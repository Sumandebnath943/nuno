import React, { useState, useMemo } from 'react';
import type { Card, Color, GameEvent, GameView, Intent } from '../game/types';
import { COLOR_NAMES, isPlayable, sortHand } from '../game/cards';
import { CardView } from './CardView';
import { ColorPickerModal } from './ColorPickerModal';
import { Wild4ChallengeModal } from './Wild4ChallengeModal';
import { ChallengeResultModal } from './ChallengeResultModal';
import { RoundOverModal } from './RoundOverModal';
import { sfx } from '../lib/sound';

interface Props {
  view: GameView;
  isHost: boolean;
  roomId?: string;
  onAction: (intent: Intent) => void;
  onLeave: () => void;
  onNextRound: () => void;
  onNewGame: () => void;
}

const COLOR_HEX: Record<Color, string> = {
  red: '#ea262d',
  blue: '#006cb7',
  green: '#009f4d',
  yellow: '#ffb703',
};

export const GameBoard: React.FC<Props> = ({
  view,
  isHost,
  roomId,
  onAction,
  onLeave,
  onNextRound,
  onNewGame,
}) => {
  const [wildCardToPlay, setWildCardToPlay] = useState<Card | null>(null);
  const [sayUnoChecked, setSayUnoChecked] = useState(true);
  const [showChallengeResult, setShowChallengeResult] = useState<GameEvent | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sorted, setSorted] = useState(false);

  const myTurn = view.current === view.me;
  const me = view.players[view.me];
  const topDiscard = view.discardTop[view.discardTop.length - 1];

  // Hand sorting
  const displayHand = useMemo(() => {
    return sorted ? sortHand(view.myHand) : view.myHand;
  }, [view.myHand, sorted]);

  // Determine playability of each card in hand
  const playableCardIds = useMemo(() => {
    if (!myTurn || !topDiscard) return new Set<string>();
    if (view.phase === 'drawn') {
      return new Set(view.drawnCardId ? [view.drawnCardId] : []);
    }
    if (view.phase !== 'play') return new Set<string>();

    const set = new Set<string>();
    for (const c of view.myHand) {
      if (isPlayable(c, topDiscard, view.currentColor)) {
        set.add(c.id);
      }
    }
    return set;
  }, [myTurn, topDiscard, view.currentColor, view.phase, view.drawnCardId, view.myHand]);

  // Catch recent challenge events for modal popup
  React.useEffect(() => {
    const lastEvent = view.events[view.events.length - 1];
    if (lastEvent && lastEvent.type === 'challenge') {
      setShowChallengeResult(lastEvent);
    }
  }, [view.events]);

  const handleCardClick = (card: Card) => {
    if (!myTurn) return;
    if (!playableCardIds.has(card.id)) {
      sfx.error();
      return;
    }

    if (card.color === 'wild') {
      sfx.click();
      setWildCardToPlay(card);
    } else {
      sfx.play();
      onAction({
        type: 'play',
        cardId: card.id,
        uno: view.myHand.length === 2 ? sayUnoChecked : undefined,
      });
    }
  };

  const handleColorPicked = (color: Color) => {
    if (view.phase === 'chooseColor') {
      onAction({ type: 'chooseColor', color });
      return;
    }

    if (!wildCardToPlay) return;
    sfx.wild();
    onAction({
      type: 'play',
      cardId: wildCardToPlay.id,
      color,
      uno: view.myHand.length === 2 ? sayUnoChecked : undefined,
    });
    setWildCardToPlay(null);
  };

  const handleDraw = () => {
    if (!myTurn || view.phase !== 'play') return;
    sfx.draw(1);
    onAction({ type: 'draw' });
  };

  const handlePass = () => {
    if (!myTurn || view.phase !== 'drawn') return;
    sfx.click();
    onAction({ type: 'pass' });
  };

  const handleUnoShout = () => {
    sfx.uno();
    onAction({ type: 'uno' });
  };

  const handleCatch = (target: number) => {
    sfx.caught();
    onAction({ type: 'catch', target });
  };

  const copyRoomInvite = () => {
    if (!roomId) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Opponents list excluding me
  const opponents = view.players
    .map((p, idx) => ({ ...p, seatIndex: idx }))
    .filter((p) => p.seatIndex !== view.me);

  // Latest event banner message
  const latestEventMessage = useMemo(() => {
    const ev = view.events[view.events.length - 1];
    if (!ev) return null;
    switch (ev.type) {
      case 'skip':
        return `🚫 ${view.players[ev.player]?.name || 'Player'} was skipped!`;
      case 'reverse':
        return `⇄ Play direction reversed!`;
      case 'colorChange':
        return `🎨 Color changed to ${COLOR_NAMES[ev.color]}!`;
      case 'uno':
        return `🔥 ${view.players[ev.player]?.name} yelled NUNO!`;
      case 'caught':
        return `🚨 ${view.players[ev.player]?.name} was caught without NUNO (+2 cards)!`;
      case 'draw':
        if (ev.reason === 'draw2') return `💥 +2 cards drawn!`;
        if (ev.reason === 'wild4') return `⚡ +4 cards drawn!`;
        return null;
      default:
        return null;
    }
  }, [view.events, view.players]);

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col bg-[#140e26] select-none">
      {/* ── TOP NAV BAR ── */}
      <header className="h-14 bg-black/40 border-b border-white/10 px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="text-2xl font-black tracking-wider text-yellow-400 drop-shadow flex items-center gap-1.5"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span>NUNO</span>
            <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-sans uppercase">
              R{view.round}
            </span>
          </div>

          {roomId && (
            <button
              onClick={copyRoomInvite}
              className="text-xs bg-white/10 hover:bg-white/20 text-gray-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Room: <strong className="text-yellow-300">{roomId}</strong></span>
              <span>{copiedLink ? '✓ Copied' : '📋'}</span>
            </button>
          )}
        </div>

        {/* Current status pill */}
        <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs text-gray-300">
          <span>Current Turn:</span>
          <span className="font-bold text-white flex items-center gap-1">
            <span>{view.players[view.current]?.avatar}</span>
            <span>{myTurn ? 'YOU' : view.players[view.current]?.name}</span>
          </span>
          <span className="text-gray-500">|</span>
          <span className="flex items-center gap-1">
            Direction:
            <span className="text-yellow-300 font-bold">{view.direction === 1 ? '↷ Clockwise' : '↶ Counter'}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSorted(!sorted)}
            className="text-xs bg-white/10 hover:bg-white/20 text-gray-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Sort cards in your hand"
          >
            {sorted ? 'Unsort Hand' : 'Sort Hand 🗂️'}
          </button>

          <button
            onClick={onLeave}
            className="text-xs bg-red-600/30 hover:bg-red-600/50 text-red-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Leave
          </button>
        </div>
      </header>

      {/* ── MAIN TABLE AREA ── */}
      <main className="relative flex-1 flex flex-col justify-between p-2 sm:p-4 overflow-hidden">
        {/* Table Felt Background */}
        <div
          className="absolute inset-2 sm:inset-4 rounded-[40px] sm:rounded-[50px] border-4 border-white/10 shadow-inner overflow-hidden pointer-events-none"
          style={{ background: 'var(--table-felt)' }}
        >
          {/* Subtle active color ambient glow */}
          <div
            className="absolute inset-0 opacity-20 transition-all duration-700 blur-3xl"
            style={{ backgroundColor: COLOR_HEX[view.currentColor] }}
          />
        </div>

        {/* ── TOP & SIDE OPPONENTS ── */}
        <div className="relative z-10 w-full flex flex-wrap justify-around items-start gap-2 pt-2 px-2 max-w-5xl mx-auto">
          {opponents.map((opp) => {
            const isHisTurn = view.current === opp.seatIndex;
            const isVulnerable = view.unoVulnerable === opp.seatIndex;

            return (
              <div
                key={opp.id}
                className={`flex flex-col items-center transition-all duration-300 p-2 rounded-2xl ${
                  isHisTurn
                    ? 'bg-yellow-400/20 ring-2 ring-yellow-400 scale-105 shadow-lg'
                    : 'bg-black/30'
                }`}
              >
                {/* Avatar & Badges */}
                <div className="relative flex items-center gap-1.5">
                  <div className="text-2xl sm:text-3xl">{opp.avatar}</div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      <span>{opp.name}</span>
                      {opp.kind === 'bot' && (
                        <span className="text-[9px] bg-purple-700/80 px-1 py-0.2 rounded text-gray-200">
                          BOT
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-yellow-300 font-semibold">
                      {opp.score} pts
                    </div>
                  </div>

                  {opp.saidUno && (
                    <span className="absolute -top-2 -right-3 text-[10px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded-full ring-2 ring-white animate-bounce-slow">
                      UNO!
                    </span>
                  )}
                </div>

                {/* Opponent Card Stack */}
                <div className="flex items-center justify-center mt-1.5 relative h-12 w-20">
                  {Array.from({ length: Math.min(opp.handCount, 7) }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute"
                      style={{
                        left: `${i * 7}px`,
                        transform: `rotate(${(i - 3) * 4}deg)`,
                      }}
                    >
                      <CardView faceDown size="xs" />
                    </div>
                  ))}
                  <span className="absolute -bottom-1 -right-1 text-[11px] font-extrabold bg-black/80 px-1.5 rounded-md text-white border border-white/20">
                    {opp.handCount}
                  </span>
                </div>

                {/* Catch Button if player forgot UNO */}
                {isVulnerable && (
                  <button
                    onClick={() => handleCatch(opp.seatIndex)}
                    className="mt-1.5 py-1 px-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-full shadow-lg ring-2 ring-white animate-shake cursor-pointer"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    🚨 CATCH NUNO!
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* ── CENTER DISCARD & DRAW PILE ── */}
        <div className="relative z-10 flex flex-col items-center justify-center my-auto">
          {/* Latest Action Toast Banner */}
          {latestEventMessage && (
            <div className="mb-3 px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/20 text-xs sm:text-sm font-bold text-yellow-300 shadow-lg animate-fadeIn">
              {latestEventMessage}
            </div>
          )}

          <div className="flex items-center justify-center gap-6 sm:gap-12 relative">
            {/* 1. DRAW DECK */}
            <div className="flex flex-col items-center">
              <div
                onClick={handleDraw}
                className={`relative cursor-pointer transition-transform duration-200 ${
                  myTurn && view.phase === 'play'
                    ? 'hover:scale-105 active:scale-95 ring-4 ring-yellow-400/60 rounded-xl'
                    : 'opacity-90'
                }`}
                title={myTurn ? 'Click to Draw a Card' : 'Draw Deck'}
              >
                {/* 3D stacked deck look */}
                <div className="absolute top-1.5 left-1.5 opacity-60">
                  <CardView faceDown size="md" />
                </div>
                <div className="absolute top-0.5 left-0.5 opacity-80">
                  <CardView faceDown size="md" />
                </div>
                <CardView faceDown size="md" />

                {/* Card count badge */}
                <div className="absolute -bottom-2 -right-2 bg-black/90 text-yellow-300 font-extrabold text-xs px-2 py-0.5 rounded-full border border-yellow-400/40">
                  {view.deckCount}
                </div>
              </div>
              <span className="text-[11px] font-bold text-gray-300 mt-2 uppercase tracking-wider">
                {myTurn && view.phase === 'play' ? 'Draw Card' : 'Deck'}
              </span>
            </div>

            {/* Orbiting Direction Arrows Indicator */}
            <div
              className={`absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border-2 border-dashed border-white/20 pointer-events-none ${
                view.direction === 1 ? 'animate-spin-slow' : 'animate-spin-reverse'
              }`}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-400 text-lg">
                ➤
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-180 text-yellow-400 text-lg">
                ➤
              </div>
            </div>

            {/* 2. DISCARD PILE */}
            <div className="flex flex-col items-center">
              <div className="relative">
                {/* Active Color Aura Ring */}
                <div
                  className="absolute -inset-2.5 rounded-2xl opacity-80 blur-md transition-colors duration-500"
                  style={{ backgroundColor: COLOR_HEX[view.currentColor] }}
                />

                {/* Stack of recently discarded cards with slight rotations */}
                {view.discardTop.slice(-4, -1).map((c, idx) => (
                  <div
                    key={c.id}
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      transform: `rotate(${(idx % 2 === 0 ? -1 : 1) * (idx * 5 + 3)}deg)`,
                    }}
                  >
                    <CardView card={c} size="md" />
                  </div>
                ))}

                {/* Top active discard card */}
                {topDiscard && <CardView card={topDiscard} size="md" />}
              </div>

              {/* Active Color Tag */}
              <div
                className="mt-2 px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider text-white shadow-md flex items-center gap-1.5"
                style={{
                  backgroundColor: COLOR_HEX[view.currentColor],
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                }}
              >
                <span>●</span>
                <span>{COLOR_NAMES[view.currentColor]}</span>
              </div>
            </div>
          </div>

          {/* Drawn card decision prompt: PLAY or PASS/KEEP */}
          {myTurn && view.phase === 'drawn' && (
            <div className="mt-4 flex items-center gap-3 bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-yellow-400/40 animate-fadeIn">
              <span className="text-xs sm:text-sm text-yellow-200 font-bold">
                You drew a playable card! Play it or Keep it?
              </span>
              <button
                onClick={handlePass}
                className="py-1.5 px-4 bg-gray-700 hover:bg-gray-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Keep & Pass Turn
              </button>
            </div>
          )}
        </div>

        {/* ── BOTTOM PLAYER AREA (YOU) ── */}
        <div className="relative z-20 w-full flex flex-col items-center pb-2">
          {/* Action bar right above hand */}
          <div className="flex items-center justify-between w-full max-w-4xl px-4 mb-2">
            {/* Player Info */}
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
              <span className="text-2xl">{me.avatar}</span>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  <span>{me.name} (You)</span>
                  {myTurn && (
                    <span className="text-[10px] bg-yellow-400 text-black px-1.5 py-0.2 rounded font-extrabold uppercase animate-pulse">
                      YOUR TURN!
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-yellow-300 font-semibold">
                  Score: {me.score} pts • {view.myHand.length} cards
                </div>
              </div>
            </div>

            {/* Quick UNO Controls */}
            <div className="flex items-center gap-3">
              {/* If player has 2 cards, toggle "Say NUNO" checkbox so it automatically shouts with play */}
              {view.myHand.length === 2 && (
                <label className="flex items-center gap-2 bg-red-600/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-xl cursor-pointer shadow-md text-xs font-bold transition-all">
                  <input
                    type="checkbox"
                    checked={sayUnoChecked}
                    onChange={(e) => setSayUnoChecked(e.target.checked)}
                    className="w-4 h-4 accent-yellow-400"
                  />
                  <span>SHOUT NUNO! 🔥</span>
                </label>
              )}

              {/* If down to 1 card and forgot to say NUNO, button to call it before caught */}
              {view.myHand.length === 1 && !me.saidUno && (
                <button
                  onClick={handleUnoShout}
                  className="py-2 px-5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl ring-2 ring-yellow-400 shadow-xl animate-shake cursor-pointer"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  ⚡ SHOUT NUNO NOW!
                </button>
              )}

              {/* Pass button if drawn */}
              {myTurn && view.phase === 'drawn' && (
                <button
                  onClick={handlePass}
                  className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Pass Turn
                </button>
              )}
            </div>
          </div>

          {/* Hand Fan View */}
          <div className="relative w-full max-w-4xl flex items-center justify-center min-h-[140px] sm:min-h-[175px] overflow-x-auto px-4 py-2">
            <div className="flex items-center justify-center -space-x-8 sm:-space-x-12 hover:-space-x-4 transition-all duration-300">
              {displayHand.map((card, i) => {
                const isCardPlayable = playableCardIds.has(card.id);
                // Gentle fan rotation: -15deg to +15deg based on index
                const mid = (displayHand.length - 1) / 2;
                const rot = mid === 0 ? 0 : ((i - mid) / mid) * 12;

                return (
                  <div
                    key={card.id}
                    className="transition-all duration-200"
                    style={{ transform: `rotate(${rot}deg)` }}
                  >
                    <CardView
                      card={card}
                      playable={isCardPlayable}
                      size="md"
                      onClick={() => handleCardClick(card)}
                      className={!isCardPlayable && myTurn ? 'opacity-60 grayscale-[25%]' : ''}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* ── MODALS & POPUPS ── */}
      {/* 1. Wild Color Picker */}
      <ColorPickerModal
        open={view.phase === 'chooseColor' && myTurn || wildCardToPlay !== null}
        onSelect={handleColorPicked}
        title={view.phase === 'chooseColor' ? 'First Card Wild: Pick Color!' : 'Pick Wild Color!'}
      />

      {/* 2. Wild Draw 4 Challenge Decision Modal */}
      <Wild4ChallengeModal
        open={view.phase === 'challenge' && view.challenge?.target === view.me}
        context={view.challenge}
        offenderName={view.players[view.challenge?.offender ?? 0]?.name || 'Player'}
        onChoice={(challenge) => onAction({ type: 'challenge', challenge })}
      />

      {/* 3. Challenge Result Modal */}
      {showChallengeResult && showChallengeResult.type === 'challenge' && (
        <ChallengeResultModal
          open={true}
          challengerName={view.players[showChallengeResult.challenger]?.name || 'Player'}
          offenderName={view.players[showChallengeResult.offender]?.name || 'Player'}
          guilty={showChallengeResult.guilty}
          revealedHand={showChallengeResult.revealedHand}
          onClose={() => setShowChallengeResult(null)}
        />
      )}

      {/* 4. Round Over / Match Over Modal */}
      <RoundOverModal
        view={view}
        isHost={isHost}
        onNextRound={onNextRound}
        onNewGame={onNewGame}
      />
    </div>
  );
};
