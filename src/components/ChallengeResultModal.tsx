import React from 'react';
import type { GameEvent, PublicPlayer } from '../game/types';
import { CardView } from './CardView';
import { Modal } from './ui';
import { sfx } from '../lib/sound';

type ChallengeEvent = Extract<GameEvent, { type: 'challenge' }>;

interface Props {
  open: boolean;
  result: ChallengeEvent;
  me: number;
  players: PublicPlayer[];
  onClose: () => void;
}

export const ChallengeResultModal: React.FC<Props> = ({ open, result, me, players, onClose }) => {
  const offender = players[result.offender];
  const challenger = players[result.challenger];
  const iChallenged = result.challenger === me;
  const won = iChallenged ? result.guilty : !result.guilty;

  const headline = result.guilty ? 'Bluff caught!' : 'Not a bluff!';
  const detail = iChallenged
    ? result.guilty
      ? `${offender.name} had a matching card. They take the penalty and you play on.`
      : `${offender.name} played it fair. You take the penalty plus 2 and lose your turn.`
    : result.guilty
      ? `${challenger.name} called your bluff. You take the penalty.`
      : `${challenger.name} challenged and lost. They take the penalty plus 2!`;

  const close = () => {
    sfx.click();
    onClose();
  };

  return (
    <Modal open={open} onClose={close} className="max-w-md">
      <div className="p-5 text-center sm:p-6">
        <div
          className={`font-display mx-auto w-fit -rotate-6 rounded-2xl border-4 px-5 py-1 text-3xl uppercase animate-stamp sm:text-4xl ${
            won ? 'border-[#16803a] text-[#16803a]' : 'border-[#c4161e] text-[#c4161e]'
          }`}
        >
          {headline}
        </div>
        <p className="mt-4 font-medium text-[var(--soft)]">{detail}</p>

        {result.revealedHand && result.revealedHand.length > 0 && (
          <div className="mt-4 rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--surface)] p-3">
            <div className="label mb-2">{offender.name}'s hand</div>
            <div className="nice-scroll flex max-h-40 flex-wrap justify-center gap-1.5 overflow-y-auto">
              {result.revealedHand.map((c, i) => (
                <div key={c.id} className="animate-rowIn" style={{ animationDelay: `${0.35 + i * 0.05}s` }}>
                  <CardView card={c} size="xs" />
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={close} className="btn btn-yellow mt-5 h-12 w-full text-xl">
          {won ? 'Ha! Continue' : 'Ugh. Continue'}
        </button>
      </div>
    </Modal>
  );
};
