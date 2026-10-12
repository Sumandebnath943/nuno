import React from 'react';
import type { Card } from '../game/types';
import { CardView } from './CardView';
import { sfx } from '../lib/sound';

interface Props {
  open: boolean;
  challengerName: string;
  offenderName: string;
  guilty: boolean;
  revealedHand?: Card[];
  onClose: () => void;
}

export const ChallengeResultModal: React.FC<Props> = ({
  open,
  challengerName,
  offenderName,
  guilty,
  revealedHand,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-gradient-to-b from-[#211638] to-[#120b22] border-2 border-white/20 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl animate-scaleUp">
        <div className="text-5xl mb-3">{guilty ? '💥' : '🛡️'}</div>

        <h2
          className={`text-2xl sm:text-3xl font-extrabold mb-2 ${
            guilty ? 'text-red-400' : 'text-green-400'
          }`}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {guilty ? 'GUILTY! BLUFF CAUGHT!' : 'INNOCENT! CHALLENGE FAILED!'}
        </h2>

        <p className="text-gray-200 text-sm sm:text-base mb-6 leading-relaxed">
          {guilty ? (
            <>
              <span className="font-bold text-yellow-300">{offenderName}</span> had a matching card in hand!
              They were bluffing! <span className="font-bold text-red-400">{offenderName}</span> must draw <span className="font-extrabold text-white">4 cards</span> instead!
            </>
          ) : (
            <>
              <span className="font-bold text-yellow-300">{offenderName}</span> played fair and had NO matching cards!
              <span className="font-bold text-red-400"> {challengerName}</span> must draw <span className="font-extrabold text-white">6 cards</span> and forfeit their turn!
            </>
          )}
        </p>

        {revealedHand && revealedHand.length > 0 && (
          <div className="mb-6 bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="text-xs uppercase font-bold text-gray-400 mb-3 tracking-wider">
              {offenderName}&apos;s Hand at play time:
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-h-48 overflow-y-auto p-1">
              {revealedHand.map((c) => (
                <CardView key={c.id} card={c} size="xs" />
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => {
            sfx.click();
            onClose();
          }}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-extrabold text-base tracking-wider uppercase shadow-lg shadow-yellow-500/30 transition-transform active:scale-95 cursor-pointer"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Continue Game
        </button>
      </div>
    </div>
  );
};
