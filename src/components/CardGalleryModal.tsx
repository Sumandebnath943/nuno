import React from 'react';
import { CardView } from './CardView';
import { sfx } from '../lib/sound';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const CardGalleryModal: React.FC<Props> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-gradient-to-b from-[#22183c] to-[#130d22] border-2 border-white/20 rounded-3xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <div>
            <h2
              className="text-2xl sm:text-3xl font-extrabold text-yellow-400 flex items-center gap-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <span>🎴</span> Card Designs Gallery
            </h2>
            <p className="text-xs text-gray-300 mt-1">
              Official Uno deck architecture: 108 cards with high-contrast colors, rotated center ovals, and glossy highlights.
            </p>
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

        {/* 1. Core Colors & Numbers */}
        <div className="mb-8 bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-200 mb-3 flex items-center gap-1.5">
            <span>●</span> The 4 Colors & Number Cards (0–9)
          </h3>
          <div className="flex flex-wrap gap-4 justify-around items-center">
            <div className="flex flex-col items-center gap-1">
              <CardView card={{ id: 'g1', color: 'red', value: '7' }} size="md" />
              <span className="text-xs text-red-400 font-bold">Red 7</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <CardView card={{ id: 'g2', color: 'blue', value: '4' }} size="md" />
              <span className="text-xs text-blue-400 font-bold">Blue 4</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <CardView card={{ id: 'g3', color: 'green', value: '9' }} size="md" />
              <span className="text-xs text-green-400 font-bold">Green 9</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <CardView card={{ id: 'g4', color: 'yellow', value: '2' }} size="md" />
              <span className="text-xs text-yellow-300 font-bold">Yellow 2</span>
            </div>
          </div>
        </div>

        {/* 2. Action Cards */}
        <div className="mb-8 bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-200 mb-3 flex items-center gap-1.5">
            <span>⚡</span> Action Cards (20 Points Each)
          </h3>
          <div className="flex flex-wrap gap-4 justify-around items-center">
            <div className="flex flex-col items-center gap-1">
              <CardView card={{ id: 'g5', color: 'red', value: 'skip' }} size="md" />
              <span className="text-xs text-white font-bold">Skip (⊘)</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <CardView card={{ id: 'g6', color: 'blue', value: 'reverse' }} size="md" />
              <span className="text-xs text-white font-bold">Reverse (⇄)</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <CardView card={{ id: 'g7', color: 'green', value: 'draw2' }} size="md" />
              <span className="text-xs text-white font-bold">Draw Two (+2)</span>
            </div>
          </div>
        </div>

        {/* 3. Wild Cards & Card Back */}
        <div className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10 mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-200 mb-3 flex items-center gap-1.5">
            <span>🌟</span> Wild Cards (50 Points) & Deck Back
          </h3>
          <div className="flex flex-wrap gap-4 justify-around items-center">
            <div className="flex flex-col items-center gap-1">
              <CardView card={{ id: 'g8', color: 'wild', value: 'wild' }} size="md" />
              <span className="text-xs text-white font-bold">Wild Card</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <CardView card={{ id: 'g9', color: 'wild', value: 'wild4' }} size="md" />
              <span className="text-xs text-yellow-300 font-bold">Wild Draw Four (+4)</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <CardView faceDown size="md" />
              <span className="text-xs text-gray-300 font-bold">Card Back</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <button
            onClick={() => {
              sfx.click();
              onClose();
            }}
            className="py-3 px-8 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-extrabold text-sm uppercase tracking-wider shadow-lg transition-transform active:scale-95 cursor-pointer"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Close Gallery
          </button>
        </div>
      </div>
    </div>
  );
};
