import React from 'react';
import { sfx } from '../lib/sound';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<Props> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-gradient-to-b from-[#22183c] to-[#130d22] border-2 border-white/20 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[88vh] overflow-y-auto shadow-2xl relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">📖</span>
            <h2
              className="text-2xl sm:text-3xl font-extrabold text-white"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Official UNO Rules Guide
            </h2>
          </div>
          <button
            onClick={() => {
              sfx.click();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 text-sm text-gray-200 leading-relaxed">
          {/* Objective */}
          <section className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <h3 className="font-extrabold text-yellow-300 text-base mb-1.5 flex items-center gap-1.5">
              <span>🎯</span> Objective
            </h3>
            <p>
              Be the first player to get rid of all your cards in each round. Score points from the cards left in other players&apos; hands. The first player to reach the target score (default 500 points) or win the round wins the game!
            </p>
          </section>

          {/* Core Matching */}
          <section className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <h3 className="font-extrabold text-blue-300 text-base mb-1.5 flex items-center gap-1.5">
              <span>🃏</span> Card Matching
            </h3>
            <p className="mb-2">
              On your turn, you must match a card from your hand to the top of the Discard Pile by either:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-300 ml-2">
              <li><strong className="text-white">Color</strong> (Red, Blue, Green, Yellow)</li>
              <li><strong className="text-white">Number</strong> (0 through 9)</li>
              <li><strong className="text-white">Symbol</strong> (Skip, Reverse, Draw Two)</li>
              <li>Or play any <strong className="text-yellow-300">Wild card</strong>!</li>
            </ul>
            <p className="mt-2 text-xs text-gray-400">
              If you don&apos;t have a match (or choose not to play), draw one card from the deck. If that drawn card is playable, you may play it immediately or choose to keep it and pass.
            </p>
          </section>

          {/* Action Cards */}
          <section className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <h3 className="font-extrabold text-green-300 text-base mb-2 flex items-center gap-1.5">
              <span>⚡</span> Action Cards
            </h3>
            <div className="space-y-3">
              <div>
                <strong className="text-white">Draw Two (+2):</strong> The next player must draw 2 cards and loses their turn.
              </div>
              <div>
                <strong className="text-white">Reverse (⇄):</strong> Reverses the direction of play.
                <span className="block text-xs text-yellow-300 font-semibold mt-0.5">
                  ★ 2-Player Rule: In a 2-player game, Reverse acts just like a Skip!
                </span>
              </div>
              <div>
                <strong className="text-white">Skip (⊘):</strong> The next player is skipped and loses their turn.
              </div>
              <div>
                <strong className="text-white">Wild:</strong> Can be played anytime. Choose the new active color.
              </div>
            </div>
          </section>

          {/* Wild Draw 4 & Challenge */}
          <section className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <h3 className="font-extrabold text-red-400 text-base mb-2 flex items-center gap-1.5">
              <span>⚖️</span> Wild Draw Four & The Challenge Rule
            </h3>
            <p className="mb-2">
              You may play a Wild Draw Four anytime, but under official Mattel rules, you are only legally allowed to play it if you <strong className="text-yellow-300">do NOT hold any card matching the current color</strong> in your hand!
            </p>
            <div className="bg-black/30 rounded-xl p-3 text-xs space-y-1.5 border border-white/5">
              <div className="font-bold text-white uppercase tracking-wider">The Challenge:</div>
              <div>• The victim may <strong className="text-white">Accept</strong> and draw 4 cards, OR <strong className="text-yellow-300">CHALLENGE</strong>!</div>
              <div>• <strong className="text-red-400">If Guilty (Bluffing):</strong> The player who played the Wild Draw Four must draw the 4 cards instead!</div>
              <div>• <strong className="text-green-400">If Innocent:</strong> The challenger must draw <strong className="text-white">6 cards</strong> (4 + 2 penalty) and is skipped!</div>
            </div>
          </section>

          {/* Saying NUNO */}
          <section className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <h3 className="font-extrabold text-amber-300 text-base mb-1.5 flex items-center gap-1.5">
              <span>🔥</span> Saying &quot;NUNO&quot;
            </h3>
            <p className="mb-2">
              When you play your second-to-last card, you must shout <strong className="text-white">&quot;NUNO&quot;</strong> before your turn ends!
            </p>
            <p className="text-xs text-gray-300">
              If you forget and another player catches you before the next player takes their turn, you must draw <strong className="text-red-400 font-bold">2 penalty cards</strong>!
            </p>
          </section>

          {/* Scoring */}
          <section className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <h3 className="font-extrabold text-purple-300 text-base mb-1.5 flex items-center gap-1.5">
              <span>🏆</span> Official Scoring
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
              <div className="bg-black/20 p-2 rounded-lg">• Number cards (0–9): Face Value</div>
              <div className="bg-black/20 p-2 rounded-lg">• Draw Two / Reverse / Skip: 20 pts</div>
              <div className="bg-black/20 p-2 rounded-lg">• Wild: 50 pts</div>
              <div className="bg-black/20 p-2 rounded-lg">• Wild Draw Four: 50 pts</div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <button
            onClick={() => {
              sfx.click();
              onClose();
            }}
            className="py-3 px-8 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-extrabold text-sm uppercase tracking-wider shadow-lg transition-transform active:scale-95 cursor-pointer"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Got It, Let&apos;s Play!
          </button>
        </div>
      </div>
    </div>
  );
};
