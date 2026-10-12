import React from 'react';
import type { ChallengeContext, PublicPlayer } from '../game/types';
import { COLOR_NAMES } from '../game/cards';
import { CARD_COLORS } from '../lib/theme';
import { CardView } from './CardView';
import { Modal } from './ui';
import { sfx } from '../lib/sound';

interface Props {
  open: boolean;
  context: ChallengeContext | null;
  offender?: PublicPlayer;
  onChoice: (challenge: boolean) => void;
}

export const Wild4ChallengeModal: React.FC<Props> = ({ open, context, offender, onChoice }) => {
  if (!context) return null;
  const prev = COLOR_NAMES[context.prevColor];
  const name = offender?.name ?? 'They';

  return (
    <Modal open={open} className="max-w-md">
      <div className="p-5 text-center sm:p-6">
        <div className="relative mx-auto -mt-16 mb-2 flex w-fit items-end justify-center">
          <CardView card={{ color: 'wild', value: 'wild4' }} width={92} className="-rotate-12" />
          <span className="absolute -right-6 bottom-0 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-[var(--ink)] bg-white text-3xl shadow-[0_3px_0_var(--ink)]">
            {offender?.avatar}
          </span>
        </div>
        <h2 className="font-display text-3xl">{name} hit you with +4!</h2>
        <p className="mt-2 font-medium text-[#4d4566]">
          It's only allowed if they had <b>no</b>{' '}
          <span
            className="font-display rounded-md px-1.5 text-white"
            style={{ background: CARD_COLORS[context.prevColor].base, textShadow: '0 1px 0 var(--ink)' }}
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
            <span className="font-body mt-1 whitespace-normal text-xs font-semibold leading-tight tracking-normal text-[#6b6385]">
              Draw 4, lose your turn
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
              Bluff? They draw 4. Legit? You draw 6.
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
