import { AnimatePresence, motion } from 'framer-motion';
import type { PublicPlayer } from '../../game/types';
import { CardView } from '../CardView';
import type { Reveal } from './useTableFx';

/** Spin: cards shown to everyone for a moment — Show Hand and War. */
export function RevealOverlay({
  reveal,
  players,
  me,
  x,
  y,
}: {
  reveal: Reveal | null;
  players: PublicPlayer[];
  me: number;
  x: number;
  y: number;
}) {
  const name = (i: number) => (i === me ? 'You' : players[i]?.name);
  return (
    <div className="pointer-events-none absolute z-[49] -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
      <AnimatePresence>
        {reveal && (
          <motion.div
            key={reveal.id}
            className="panel w-[min(92vw,560px)] p-3 text-center sm:p-4"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.2 } }}
          >
            {reveal.kind === 'show' ? (
              <>
                <div className="font-display text-xl">
                  👀 {name(reveal.player)} {reveal.player === me ? 'show' : 'shows'} their hand
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {reveal.cards.map((c) => (
                    <CardView key={c.id} card={c} width={reveal.cards.length > 12 ? 30 : 40} />
                  ))}
                  {reveal.cards.length === 0 && <span className="text-sm text-[#6b6385]">No cards!</span>}
                </div>
              </>
            ) : (
              <>
                <div className="font-display text-xl">⚔️ WAR!</div>
                {reveal.plays.length === 0 ? (
                  <p className="mt-1 text-sm text-[#6b6385]">Nobody has a number card. No war today.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap justify-center gap-3">
                    {reveal.plays.map((p) => (
                      <div
                        key={p.player}
                        className={`flex flex-col items-center rounded-xl px-1.5 py-1 ${p.player === reveal.winner ? 'bg-[#fff1a8] ring-2 ring-[var(--ink)]' : ''}`}
                      >
                        <div className="flex -space-x-3">
                          {p.cards.map((c) => (
                            <CardView key={c.id} card={c} width={36} />
                          ))}
                        </div>
                        <span className="font-display mt-1 max-w-[80px] truncate text-xs">
                          {players[p.player]?.avatar} {name(p.player)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {reveal.winner !== null ? (
                  <p className="font-display mt-2 text-base">{name(reveal.winner)} wins and discards!</p>
                ) : (
                  reveal.plays.length > 0 && <p className="mt-2 text-sm text-[#6b6385]">Still tied — nobody wins.</p>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
