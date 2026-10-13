import React from 'react';
import type { ChallengeContext, Color, PublicPlayer } from '../game/types';
import { COLOR_NAMES } from '../game/cards';
import { useTheme } from '../themes';
import { CardView } from './CardView';
import { Modal } from './ui';
import { sfx } from '../lib/sound';
import { Avatar } from './Avatar';

interface Props {
  open: boolean;
  context: ChallengeContext | null;
  offender?: PublicPlayer;
  /** The colour they named (Wild Draw Color makes you draw until it). */
  chosen: Color;
  onChoice: (challenge: boolean) => void;
}

/** Challenge a Wild Draw Four (Classic) or a Wild Draw Two / Wild Draw Color (Flip). */
export const Wild4ChallengeModal: React.FC<Props> = ({ open, context, offender, chosen, onChoice }) => {
  const pal = useTheme().cardColors;
  if (!context) return null;
  const prev = COLOR_NAMES[context.prevColor];
  const name = offender?.name ?? 'They';
  const colorName = COLOR_NAMES[chosen];
  const copy = {
    wild4: { card: 'wild4', hit: '+4', take: 'Draw 4, lose your turn', stakes: 'Bluff? They draw 4. Legit? You draw 6.' },
    wildDraw2: { card: 'wildDraw2', hit: '+2', take: 'Draw 2, lose your turn', stakes: 'Bluff? They draw 2. Legit? You draw 4.' },
    wildDrawColor: {
      card: 'wildDrawColor',
      hit: 'Draw Color',
      take: `Draw until ${colorName}, lose your turn`,
      stakes: `Bluff? They draw until ${colorName}. Legit? You do, plus 2.`,
    },
  }[context.kind];

  return (
    <Modal open={open} className="max-w-md">
      <div className="p-5 text-center sm:p-6">
        <div className="relative mx-auto -mt-16 mb-2 flex w-fit items-end justify-center">
          <CardView card={{ color: 'wild', value: copy.card as 'wild4' }} width={92} className="-rotate-12" />
          <span className="absolute -right-6 bottom-0 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-[var(--ink)] bg-[var(--surface)] text-3xl shadow-[0_3px_0_var(--ink)]">
            <Avatar value={offender?.avatar} fill />
          </span>
        </div>
        <h2 className="font-display text-3xl">
          {name} hit you with {copy.hit}!
        </h2>
        <p className="mt-2 font-medium text-[var(--soft)]">
          It's only allowed if they had <b>no</b>{' '}
          <span
            className="font-display rounded-md px-1.5 text-white"
            style={{ background: pal[context.prevColor].base, textShadow: '0 1px 0 var(--ink)' }}
          >
            {prev}
          </span>{' '}
          cards. Bluff?
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              sfx.click();
              onChoice(false);
            }}
            className="btn btn-white flex flex-col items-center px-2 py-3"
          >
            <span className="text-xl">Take it</span>
            <span className="font-body mt-1 whitespace-normal text-xs font-semibold leading-tight tracking-normal text-[var(--muted)]">
              {copy.take}
            </span>
          </button>
          <button
            onClick={() => {
              sfx.challenge();
              onChoice(true);
            }}
            className="btn btn-red flex flex-col items-center px-2 py-3"
          >
            <span className="text-xl">Challenge!</span>
            <span
              className="font-body mt-1 whitespace-normal text-xs font-semibold leading-tight tracking-normal text-white/90"
              style={{ textShadow: 'none' }}
            >
              {copy.stakes}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
