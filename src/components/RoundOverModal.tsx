import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { GameView } from '../game/types';
import { CardView } from './CardView';
import { sfx } from '../lib/sound';

interface Props {
  view: GameView;
  isHost: boolean;
  onNextRound: () => void;
  onNewGame?: () => void;
}

export const RoundOverModal: React.FC<Props> = ({
  view,
  isHost,
  onNextRound,
  onNewGame,
}) => {
  const isGameOver = view.phase === 'gameOver';
  const isRoundOver = view.phase === 'roundOver';

  useEffect(() => {
    if (isGameOver || isRoundOver) {
      const winnerIdx = isGameOver ? view.winner : view.roundWinner;
      if (winnerIdx === view.me) {
        sfx.win();
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        sfx.lose();
      }
    }
  }, [isGameOver, isRoundOver, view.winner, view.roundWinner, view.me]);

  if (!isGameOver && !isRoundOver) return null;

  const winnerSeat = isGameOver ? view.winner! : view.roundWinner!;
  const winner = view.players[winnerSeat];
  const isMeWinner = winnerSeat === view.me;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-gradient-to-b from-[#21163c] to-[#110c22] border-2 border-white/20 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl relative overflow-hidden">
        {/* Confetti decoration / banner */}
        <div className="text-5xl sm:text-6xl mb-3 animate-bounce-slow">
          {isGameOver ? '🏆' : isMeWinner ? '🎉' : '👏'}
        </div>

        <h2
          className="text-3xl sm:text-4xl font-extrabold text-white mb-1 drop-shadow-md"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {isGameOver ? 'MATCH WINNER!' : 'ROUND OVER!'}
        </h2>

        <p className="text-lg text-yellow-300 font-bold mb-4">
          {winner.avatar} {winner.name} won {isGameOver ? 'the match!' : `the round (+${view.roundPoints} pts)!`}
        </p>

        {/* Revealed Opponent Hands with their points */}
        {view.revealedHands && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 mb-5 max-h-56 overflow-y-auto text-left">
            <div className="text-xs uppercase font-bold text-gray-400 mb-2">Remaining Hands:</div>
            <div className="space-y-3">
              {view.players.map((p, idx) => {
                if (idx === winnerSeat) return null;
                const hand = view.revealedHands![idx] || [];
                return (
                  <div key={p.id} className="border-b border-white/5 pb-2 last:border-0">
                    <div className="flex justify-between items-center text-xs mb-1.5 text-gray-300">
                      <span className="font-semibold">
                        {p.avatar} {p.name}
                      </span>
                      <span className="text-yellow-400 font-bold">{hand.length} cards</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {hand.map((c) => (
                        <CardView key={c.id} card={c} size="xs" />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Score Leaderboard */}
        <div className="bg-black/30 rounded-2xl p-3 sm:p-4 mb-6 text-left">
          <div className="text-xs uppercase font-bold text-gray-400 mb-2">Current Standings:</div>
          <div className="space-y-1.5">
            {[...view.players]
              .sort((a, b) => b.score - a.score)
              .map((p, rank) => (
                <div
                  key={p.id}
                  className={`flex justify-between items-center py-1.5 px-3 rounded-lg text-sm ${
                    p.id === winner.id ? 'bg-yellow-500/20 text-yellow-300 font-bold' : 'text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">#{rank + 1}</span>
                    <span>{p.avatar}</span>
                    <span>{p.name}</span>
                  </div>
                  <div className="font-extrabold">{p.score} pts</div>
                </div>
              ))}
          </div>
          {view.targetScore > 0 && (
            <div className="text-center text-xs text-gray-400 mt-2">
              Target Score: {view.targetScore} pts
            </div>
          )}
        </div>

        {/* Action button */}
        {isHost ? (
          isGameOver ? (
            <button
              onClick={() => {
                sfx.click();
                onNewGame?.();
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-extrabold text-base tracking-wider uppercase shadow-lg shadow-green-500/30 transition-transform active:scale-95 cursor-pointer"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Play Again
            </button>
          ) : (
            <button
              onClick={() => {
                sfx.deal();
                onNextRound();
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-extrabold text-base tracking-wider uppercase shadow-lg shadow-yellow-500/30 transition-transform active:scale-95 cursor-pointer"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Deal Next Round ➔
            </button>
          )
        ) : (
          <div className="text-sm text-gray-400 italic">Waiting for host to continue...</div>
        )}
      </div>
    </div>
  );
};
