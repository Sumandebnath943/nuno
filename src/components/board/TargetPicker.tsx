import type { PublicPlayer } from '../../game/types';
import { Modal } from '../ui';
import { sfx } from '../../lib/sound';
import { Avatar } from '../Avatar';

interface Props {
  open: boolean;
  title: string;
  subtitle: string;
  players: PublicPlayer[];
  me: number;
  myCount: number;
  onPick: (seat: number) => void;
  onCancel: () => void;
}

/** Choose another player — for swaps and targeted draws. */
export function TargetPicker({ open, title, subtitle, players, me, myCount, onPick, onCancel }: Props) {
  const fewest = Math.min(...players.filter((p, i) => i !== me && !p.out).map((p) => p.handCount));
  return (
    <Modal open={open} onClose={onCancel} className="max-w-md">
      <div className="p-5 sm:p-6">
        <h2 className="font-display text-center text-3xl">{title}</h2>
        <p className="mt-1 text-center text-sm font-medium text-[var(--muted)]">{subtitle}</p>
        <div className="nice-scroll mt-4 grid max-h-[50dvh] gap-2 overflow-y-auto pr-1">
          {players.map((p, i) => {
            if (i === me || p.out) return null;
            return (
              <button
                key={p.id}
                onClick={() => {
                  sfx.pop();
                  onPick(i);
                }}
                className="flex items-center gap-3 rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--surface)] px-3 py-2 text-left shadow-[0_3px_0_var(--ink)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
              >
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--cream)] text-2xl">
                  <Avatar value={p.avatar} fill />
                </span>
                <span className="font-display min-w-0 flex-1 truncate text-lg">{p.name}</span>
                {p.handCount === fewest && <span className="rounded-full bg-[var(--highlight)] px-2 text-xs font-bold">fewest</span>}
                <span
                  className={`font-display rounded-full border-2 border-[var(--ink)] px-2.5 text-lg leading-7 ${
                    p.handCount < myCount ? 'bg-[#dcffe5]' : 'bg-[var(--surface)]'
                  }`}
                  title="Cards in hand"
                >
                  {p.handCount} 🃏
                </span>
              </button>
            );
          })}
        </div>
        <button onClick={onCancel} className="mt-4 w-full text-sm font-semibold text-[var(--muted)] underline underline-offset-2">
          Cancel — keep the card
        </button>
      </div>
    </Modal>
  );
}
