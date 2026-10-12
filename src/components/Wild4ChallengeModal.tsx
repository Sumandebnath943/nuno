import React from 'react';
import type { ChallengeContext } from '../game/types';
import { COLOR_NAMES } from '../game/cards';
import { sfx } from '../lib/sound';

interface Props {
  open: boolean;
  context: ChallengeContext | null;
  offenderName: string;
  onChoice: (challenge: boolean) => void;
}

export const Wild4ChallengeModal: React.FC<Props> = ({
  open,
  context,
  offenderName,
  onChoice,
}) => {
  if (!open || !context) return null;

  const prevColorName = COLOR_NAMES[context.prevColor];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-gradient-to-b from-[#25173b] to-[#120c22] border-2 border-red-500/50 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
        {/* Animated Warning Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-3xl animate-bounce-slow">
          ⚡
        </div>

        <h2
          className="text-2xl sm:text-3xl font-extrabold text-white mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          WILD DRAW FOUR!
        </h2>

        <p className="text-gray-200 text-base mb-4 leading-relaxed">
          <span className="font-bold text-yellow-400">{offenderName}</span> hit you with a +4!
          Under official rules, they can only play this if they did <span className="underline font-bold text-red-400">NOT</span> have any <span className="font-bold text-yellow-300">{prevColorName}</span> cards!
        </p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-gray-300 text-left mb-6 space-y-1.5">
          <div className="font-bold text-white uppercase tracking-wider mb-1 text-[11px]">Official Stakes:</div>
          <div>• If you <span className="text-yellow-400 font-bold">Challenge</span> and they are <span className="text-red-400 font-bold">Guilty</span>: <span className="text-green-300 font-semibold">{offenderName} draws 4</span> instead, and you play!</div>
          <div>• If they are <span className="text-green-400 font-bold">Innocent</span>: You must draw <span className="text-red-400 font-bold">6 cards</span> (4 + 2 penalty) and lose your turn!</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => {
              sfx.click();
              onChoice(false);
            }}
            className="py-4 px-4 rounded-2xl bg-gray-700/80 hover:bg-gray-600 text-white font-bold text-sm tracking-wide transition-all transform hover:scale-[1.02] active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Accept & Draw 4</span>
          </button>

          <button
            onClick={() => {
              sfx.challenge();
              onChoice(true);
            }}
            className="py-4 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-sm uppercase tracking-wider transition-all transform hover:scale-[1.03] active:scale-95 shadow-lg shadow-red-900/50 flex items-center justify-center gap-2 cursor-pointer ring-2 ring-yellow-400/50"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span>⚖️ CHALLENGE!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
