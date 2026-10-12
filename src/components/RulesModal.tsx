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

const ACTIONS: { card: Face; name: string; text: string }[] = [
  { card: { color: 'red', value: 'skip' }, name: 'Skip', text: 'The next player loses their turn.' },
  {
    card: { color: 'blue', value: 'reverse' },
    name: 'Reverse',
    text: 'Play changes direction. With 2 players it works like a Skip.',
  },
  { card: { color: 'green', value: 'draw2' }, name: 'Draw Two', text: 'The next player draws 2 and loses their turn.' },
  { card: { color: 'wild', value: 'wild' }, name: 'Wild', text: 'Play it on anything and pick the colour.' },
  {
    card: { color: 'wild', value: 'wild4' },
    name: 'Wild Draw Four',
    text: 'Pick the colour; the next player draws 4 and loses their turn. Only allowed when you hold no card of the current colour.',
  },
];

export const RulesModal: React.FC<Props> = ({ open, onClose }) => {
  const close = () => {
    sfx.click();
    onClose();
  };
  return (
    <Modal open={open} onClose={close} className="max-w-3xl">
      <div className="flex items-center justify-between border-b-[3px] border-[var(--ink)] px-5 py-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl">How to play NUNO</h2>
          <p className="text-sm font-medium text-[#6b6385]">Same rules as the classic card game. Nothing made up.</p>
        </div>
        <CloseButton onClick={close} />
      </div>

      <div className="nice-scroll grid gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5">
        <Section icon="🎯" title="Goal">
          Be the first to get rid of all your cards. You score the points left in everyone else's hands. In a points game, the
          first to reach the target wins.
        </Section>

        <Section icon="🃏" title="Your turn">
          Match the top card by <b>colour</b>, <b>number</b> or <b>symbol</b>, or play a <b>Wild</b>. Can't (or don't want to)?
          Draw one card. If it matches you may play it straight away, or keep it.
        </Section>

        <div className="rounded-2xl border-[2.5px] border-[var(--ink)] bg-white p-4 sm:col-span-2">
          <h3 className="font-display mb-3 flex items-center gap-2 text-xl">⚡ Action cards</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {ACTIONS.map((a) => (
              <div key={a.name} className="flex items-center gap-3">
                <CardView card={a.card} width={44} />
                <div className="text-sm leading-snug text-[#4d4566]">
                  <div className="font-display text-base text-[var(--ink)]">{a.name}</div>
                  {a.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Section icon="⚖️" title="Challenging a +4">
          Think a Wild Draw Four was a bluff? Challenge it. If they <b>did</b> hold the colour, they draw the 4 instead. If they
          didn't, <b>you</b> draw 6 and lose your turn.
        </Section>

        <Section icon="📣" title="Shout NUNO!">
          Hit the <b>NUNO!</b> button when you're about to play your second-to-last card. Forget, and anyone can <b>catch</b> you
          before the next player moves: you draw 2.
        </Section>

        <Section icon="🏁" title="First card">
          A Wild Draw Four goes back in the deck. A Wild lets the first player pick the colour. Skip, Reverse and Draw Two work on
          the first player as usual.
        </Section>

        <Section icon="🏆" title="Scoring">
          Number cards are worth their number. Skip, Reverse and Draw Two are 20. Wilds are 50.
        </Section>

        <div className="rounded-2xl border-[2.5px] border-dashed border-[#c9bfa8] p-4 text-sm text-[#4d4566] sm:col-span-2">
          <span className="font-display text-[var(--ink)]">Keyboard:</span> <Kbd>D</Kbd> draw · <Kbd>K</Kbd> keep drawn card ·{' '}
          <Kbd>U</Kbd> or <Kbd>Space</Kbd> shout NUNO · <Kbd>S</Kbd> sort your cards
        </div>
      </div>
    </Modal>
  );
};

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border-[2.5px] border-[var(--ink)] bg-white p-4">
      <h3 className="font-display mb-1 flex items-center gap-2 text-xl">
        <span aria-hidden>{icon}</span> {title}
      </h3>
      <p className="text-sm leading-relaxed text-[#4d4566]">{children}</p>
    </section>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-md border-2 border-[var(--ink)] bg-white px-1.5 font-display text-xs">{children}</kbd>;
}
