import React from 'react';
import type { Card } from '../game/types';
import { CardView } from './CardView';
import { CloseButton, Modal } from './ui';
import { sfx } from '../lib/sound';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Face = Pick<Card, 'color' | 'value'>;

const GROUPS: { title: string; note: string; cards: { card: Face | null; label: string }[] }[] = [
  {
    title: 'Number cards',
    note: '0–9 in four colours · worth face value',
    cards: [
      { card: { color: 'red', value: '0' }, label: 'Red 0' },
      { card: { color: 'yellow', value: '3' }, label: 'Yellow 3' },
      { card: { color: 'green', value: '6' }, label: 'Green 6' },
      { card: { color: 'blue', value: '9' }, label: 'Blue 9' },
    ],
  },
  {
    title: 'Action cards',
    note: 'Worth 20 points each',
    cards: [
      { card: { color: 'red', value: 'skip' }, label: 'Skip' },
      { card: { color: 'blue', value: 'reverse' }, label: 'Reverse' },
      { card: { color: 'green', value: 'draw2' }, label: 'Draw Two' },
    ],
  },
  {
    title: 'Wild cards',
    note: 'Worth 50 points each',
    cards: [
      { card: { color: 'wild', value: 'wild' }, label: 'Wild' },
      { card: { color: 'wild', value: 'wild4' }, label: 'Wild Draw Four' },
      { card: null, label: 'Card back' },
    ],
  },
];

export const CardGalleryModal: React.FC<Props> = ({ open, onClose }) => {
  const close = () => {
    sfx.click();
    onClose();
  };
  return (
    <Modal open={open} onClose={close} className="max-w-3xl">
      <div className="flex items-center justify-between border-b-[3px] border-[var(--ink)] px-5 py-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl">The NUNO deck</h2>
          <p className="text-sm font-medium text-[#6b6385]">108 cards: 76 numbers, 24 actions, 8 wilds.</p>
        </div>
        <CloseButton onClick={close} />
      </div>
      <div className="nice-scroll space-y-5 overflow-y-auto px-5 py-5">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
              <h3 className="font-display text-xl">{g.title}</h3>
              <span className="text-sm font-medium text-[#6b6385]">{g.note}</span>
            </div>
            <div className="flex flex-wrap gap-4 sm:gap-6">
              {g.cards.map((c) => (
                <figure key={c.label} className="flex flex-col items-center gap-2">
                  <CardView
                    card={c.card}
                    faceDown={!c.card}
                    width={104}
                    className="transition-transform hover:-translate-y-2 hover:rotate-2"
                  />
                  <figcaption className="font-display text-sm">{c.label}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
};
