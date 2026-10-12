import React from 'react';
import type { Color } from '../game/types';
import { sfx } from '../lib/sound';

interface Props {
  open: boolean;
  onSelect: (color: Color) => void;
  title?: string;
}

export const ColorPickerModal: React.FC<Props> = ({
  open,
  onSelect,
  title = 'Pick a Color!',
}) => {
  if (!open) return null;

  const choices: { color: Color; label: string; bg: string; shadow: string }[] = [
    { color: 'red', label: 'RED', bg: '#ea262d', shadow: 'rgba(234, 38, 45, 0.7)' },
    { color: 'blue', label: 'BLUE', bg: '#006cb7', shadow: 'rgba(0, 108, 183, 0.7)' },
    { color: 'yellow', label: 'YELLOW', bg: '#ffb703', shadow: 'rgba(255, 183, 3, 0.7)' },
    { color: 'green', label: 'GREEN', bg: '#009f4d', shadow: 'rgba(0, 159, 77, 0.7)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-[#1b1531] border-2 border-white/20 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl animate-scaleUp">
        <h2
          className="text-2xl sm:text-3xl font-extrabold text-white mb-2 drop-shadow-md"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {title}
        </h2>
        <p className="text-sm text-gray-300 mb-6 font-medium">
          Choose the color that the next player must match:
        </p>

        <div className="grid grid-cols-2 gap-4">
          {choices.map((c) => (
            <button
              key={c.color}
              onClick={() => {
                sfx.click();
                onSelect(c.color);
              }}
              className="py-6 rounded-2xl text-white font-extrabold text-xl tracking-wider transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg flex flex-col items-center justify-center gap-1"
              style={{
                backgroundColor: c.bg,
                fontFamily: 'var(--font-display)',
                boxShadow: `0 8px 20px ${c.shadow}`,
              }}
            >
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
