import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { GameView } from '../game/types';
import { cardPoints } from '../game/cards';
import { KNOCKOUT_POINTS } from '../game/modes';
import { CardView } from './CardView';
import { Modal } from './ui';
import { sfx } from '../lib/sound';
import { CARD_COLORS } from '../lib/theme';

interface Props {
  view: GameView;
  isHost: boolean;
  onNextRound: () => void;
  onNewGame: () => void;
  onLeave: () => void;
}

export const RoundOverModal: React.FC<Props> = ({ view, isHost, onNextRound, onNewGame, onLeave }) => {
  const gameOver = view.phase === 'gameOver';
  const open = gameOver || view.phase === 'roundOver';
  const winnerSeat = (gameOver ? view.winner : view.roundWinner) ?? 0;
  const iWon = winnerSeat === view.me;

  useEffect(() => {
    if (!open) return;
    if (iWon) {
      sfx.win();
      const colors = Object.values(CARD_COLORS).map((c) => c.base);
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.65 }, colors });
      setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0 }, colors }), 250);
      setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1 }, colors }), 400);
    } else {
      sfx.lose();
    }
  }, [open, iWon, view.round]);

  if (!open) return null;

  const winner = view.players[winnerSeat];
  const knockouts = view.mode === 'nomercy' ? view.players.filter((p) => p.out).length : 0;
  const standings = view.players.map((p, i) => ({ ...p, seat: i })).sort((a, b) => b.score - a.score);
  const target = view.targetScore;

  return (
    <Modal open className="max-w-lg" backdrop="rgba(10, 8, 30, 0.8)">
      <div className="relative px-5 pb-5 pt-2 text-center sm:px-6">
        <div className="relative mx-auto -mt-14 flex h-24 w-24 items-center justify-center rounded-full border-4 border-[var(--ink)] bg-white text-6xl shadow-[0_5px_0_var(--ink)]">
          {winner.avatar}
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-4xl animate-bob">👑</span>
        </div>
        <h2 className="font-display mt-3 text-3xl sm:text-4xl">
          {gameOver
            ? iWon
              ? 'You win the game!'
              : `${winner.name} wins the game!`
            : iWon
              ? 'You win the round!'
              : `${winner.name} wins the round`}
        </h2>
        <p className="font-display mt-1 text-lg text-[#6b6385]">
          +{view.roundPoints} points
          {knockouts > 0
            ? ` (incl. ${knockouts} knockout${knockouts === 1 ? '' : 's'} × ${KNOCKOUT_POINTS})`
            : ' from everyone’s leftover cards'}
        </p>
      </div>

      <div className="nice-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-5 sm:px-6">
        {/* Standings */}
        <div className="rounded-2xl border-[2.5px] border-[var(--ink)] bg-white p-2">
          {standings.map((p, rank) => (
            <div
              key={p.id}
              className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${p.seat === winnerSeat ? 'bg-[#fff1a8]' : ''}`}
            >
              <span className="font-display w-6 text-center text-[#9a93ad]">{rank + 1}</span>
              <span className="text-xl">{p.avatar}</span>
              <span className="font-display min-w-0 flex-1 truncate text-left">
                {p.name}
                {p.seat === view.me && <span className="text-[#9a93ad]"> (you)</span>}
                {p.out && <span className="ml-1 rounded bg-[#ffe1e1] px-1 text-xs text-[#b3141c]">💀 OUT</span>}
              </span>
              {target > 0 && (
                <div className="hidden h-2.5 w-24 overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[#efe6d2] sm:block">
                  <div className="h-full bg-[var(--yellow)]" style={{ width: `${Math.min(100, (p.score / target) * 100)}%` }} />
                </div>
              )}
              <span className="font-display w-16 text-right">{p.score}</span>
            </div>
          ))}
          {target > 0 && <div className="mt-1 text-xs font-semibold text-[#9a93ad]">First to {target} points wins</div>}
        </div>

        {/* What everyone was left holding */}
        {view.revealedHands && (
          <div className="space-y-2 rounded-2xl border-[2.5px] border-[var(--ink)] bg-white p-3 text-left">
            <div className="label">Cards left in hand</div>
            {view.players.map((p, i) => {
              const cards = view.revealedHands![i] ?? [];
              if (i === winnerSeat || !cards.length) return null;
              const pts = cards.reduce((s, c) => s + cardPoints(c, view.mode), 0);
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="w-6 text-lg">{p.avatar}</span>
                  <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                    {cards.map((c) => (
                      <CardView key={c.id} card={c} width={26} />
                    ))}
                  </div>
                  <span className="font-display shrink-0 text-sm text-[#6b6385]">{pts} pts</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-3 p-5 sm:px-6">
        <button onClick={onLeave} className="btn btn-white h-12 px-4 text-lg">
          Menu
        </button>
        {isHost ? (
          <button
            onClick={() => {
              sfx.deal();
              if (gameOver) onNewGame();
              else onNextRound();
            }}
            className="btn btn-yellow h-12 text-xl"
            autoFocus
          >
            {gameOver ? 'Play again' : 'Deal next round'}
          </button>
        ) : (
          <div className="font-display flex items-center justify-center rounded-2xl bg-[#efe6d2] text-[#6b6385]">
            Waiting for the host…
          </div>
        )}
      </div>
    </Modal>
  );
};
