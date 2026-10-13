import { useEffect, useMemo, useState } from 'react';
import type { Card, Color, PickKind, Side } from '../../game/types';
import { COLOR_NAMES, isNumberCard, sortHand } from '../../game/cards';
import { palette } from '../../game/modes';
import { useTheme } from '../../themes';
import { CardView } from '../CardView';
import { Modal } from '../ui';
import { sfx } from '../../lib/sound';

interface Props {
  open: boolean;
  kind: PickKind;
  hand: Card[];
  side: Side;
  onDone: (cardIds: string[], topId?: string, color?: Color) => void;
}

const TITLES: Record<PickKind, [string, string]> = {
  keep2: ['Almost NUNO!', 'Pick the 2 cards you want to KEEP. The rest are discarded.'],
  number: ['Discard Number', 'Tap a number to discard all of it. Tap cards again to keep some.'],
  color: ['Discard Color', 'Tap a colour to discard all of it. Tap cards again to keep some.'],
  one: ['NUNO Spin!', 'You called it first — discard any one card.'],
};

/** Spin: choose which cards to discard, then which one ends up on top. */
export function WheelPickModal({ open, kind, hand, side, onDone }: Props) {
  const pal = useTheme().cardColors;
  const cards = useMemo(() => sortHand(hand), [hand]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'select' | 'top'>('select');
  const [topId, setTopId] = useState<string | null>(null);
  const [color, setColor] = useState<Color | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setStep('select');
    setTopId(null);
    setColor(null);
  }, [open, kind]);

  const eligible = (c: Card) => (kind === 'number' ? isNumberCard(c) : kind === 'color' ? c.color !== 'wild' : true);
  const key = (c: Card) => (kind === 'number' ? c.value : c.color);

  const toggle = (c: Card) => {
    if (!eligible(c)) return;
    sfx.click();
    setSelected((prev) => {
      const next = new Set(prev);
      if (kind === 'one') return new Set([c.id]);
      if (kind === 'keep2') {
        if (next.has(c.id)) next.delete(c.id);
        else if (next.size < 2) next.add(c.id);
        return next;
      }
      // number / colour: a new group selects the whole group; a selected card toggles off.
      const group = prev.size ? key(cards.find((x) => prev.has(x.id))!) : null;
      if (group !== key(c)) return new Set(cards.filter((x) => eligible(x) && key(x) === key(c)).map((x) => x.id));
      if (next.has(c.id)) next.delete(c.id);
      else next.add(c.id);
      return next;
    });
  };

  // The cards that will actually be discarded.
  const discards = kind === 'keep2' ? cards.filter((c) => !selected.has(c.id)) : cards.filter((c) => selected.has(c.id));
  const top = discards.find((c) => c.id === topId) ?? (discards.length === 1 ? discards[0] : null);
  const needColor = !!top && top.color === 'wild';
  const ready = kind === 'keep2' ? selected.size === 2 : kind === 'one' ? selected.size === 1 : true;

  const finish = () => {
    if (discards.length > 1 && step === 'select') {
      setStep('top');
      return;
    }
    if (discards.length && !top) return;
    if (needColor && !color) return;
    sfx.play();
    onDone([...selected], top?.id, needColor ? color! : undefined);
  };

  const [title, sub] = TITLES[kind];
  const showing = step === 'top' ? discards : cards;

  return (
    <Modal open={open} className="max-w-xl">
      <div className="p-4 sm:p-5">
        <h2 className="font-display text-center text-2xl sm:text-3xl">{step === 'top' ? 'Which card goes on top?' : title}</h2>
        <p className="mt-1 text-center text-sm font-medium text-[var(--muted)]">
          {step === 'top' ? 'The next player has to match the top card.' : sub}
        </p>

        <div className="nice-scroll mt-4 flex max-h-[42dvh] flex-wrap justify-center gap-2 overflow-y-auto p-1 pt-3">
          {showing.map((c) => {
            const on = step === 'top' ? top?.id === c.id : selected.has(c.id);
            const off = step === 'select' && !eligible(c);
            return (
              <button
                key={c.id}
                type="button"
                disabled={off}
                onClick={() => (step === 'top' ? (sfx.click(), setTopId(c.id), setColor(null)) : toggle(c))}
                className={`relative rounded-[10%/6.5%] transition-transform ${on ? '-translate-y-2' : ''} ${off ? 'opacity-40' : 'hover:-translate-y-1'}`}
                aria-pressed={on}
              >
                <CardView card={c} side={side} width={58} glow={on} />
                {on && (
                  <span className="font-display absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[#ffe066] text-sm">
                    {step === 'top' ? '★' : kind === 'keep2' ? '✋' : '✓'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {needColor && (step === 'top' || discards.length === 1) && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="label">Colour:</span>
            {palette(side).map((col) => (
              <button
                key={col}
                onClick={() => (sfx.click(), setColor(col))}
                aria-label={COLOR_NAMES[col]}
                className={`h-9 w-9 rounded-full border-[3px] border-[var(--ink)] transition-transform ${color === col ? 'scale-125 shadow-[0_0_0_3px_#fff]' : ''}`}
                style={{ background: pal[col].base }}
              />
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="font-display text-sm text-[var(--muted)]">
            {kind === 'keep2' ? `Keeping ${selected.size}/2 · discarding ${discards.length}` : `Discarding ${discards.length}`}
          </span>
          <button
            onClick={finish}
            disabled={
              !ready ||
              (step === 'top' && (!top || (needColor && !color))) ||
              (step === 'select' && discards.length === 1 && needColor && !color)
            }
            className="btn btn-yellow h-12 px-6 text-lg"
          >
            {step === 'select' && discards.length > 1 ? 'Next' : discards.length ? `Discard ${discards.length}` : 'Keep them all'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
