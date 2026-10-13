import type { GameMode } from '../game/types';
import { MODE_ORDER, MODES } from '../game/modes';
import { MODE_BG } from '../lib/theme';
import { CloseButton, Modal } from './ui';
import { sfx } from '../lib/sound';

/** The round mode emblem. */
export function ModeBadge({ mode, size = 44 }: { mode: GameMode; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border-[2.5px] border-[var(--ink)] shadow-[0_2px_0_var(--ink)]"
      style={{ width: size, height: size, background: MODE_BG[mode], fontSize: size * 0.5 }}
      aria-hidden="true"
    >
      {MODES[mode].icon}
    </span>
  );
}

/** A compact button that shows the selected mode and opens the picker. */
export function ModeButton({ mode, onClick, disabled }: { mode: GameMode; onClick: () => void; disabled?: boolean }) {
  const info = MODES[mode];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-center gap-3 rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--surface)] px-2.5 py-2 text-left shadow-[0_3px_0_var(--ink)] transition-transform enabled:hover:-translate-y-0.5 enabled:active:translate-y-0.5 disabled:cursor-default"
    >
      <ModeBadge mode={mode} size={40} />
      <span className="min-w-0 flex-1">
        <span className="font-display block text-lg leading-tight text-[var(--ink)]">NUNO {info.name}</span>
        <span className="block truncate text-xs font-semibold text-[var(--muted)]">{info.tagline}</span>
      </span>
      {!disabled && <span className="chip shrink-0 px-2.5 py-1 text-sm group-hover:bg-[var(--chip-hover)]">Change</span>}
    </button>
  );
}

interface PickerProps {
  open: boolean;
  value: GameMode;
  onPick: (mode: GameMode) => void;
  onClose: () => void;
  onRules: (mode: GameMode) => void;
}

export function ModePicker({ open, value, onPick, onClose, onRules }: PickerProps) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl">
      <div className="flex items-center justify-between border-b-[3px] border-[var(--ink)] px-4 py-3 sm:px-5">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl">Pick a game mode</h2>
          <p className="text-sm font-medium text-[var(--muted)]">Each one plays by the official rules of its UNO game.</p>
        </div>
        <CloseButton onClick={onClose} />
      </div>
      <div className="nice-scroll grid min-h-0 gap-2.5 overflow-y-auto p-3 sm:grid-cols-2 sm:gap-3 sm:p-4">
        {MODE_ORDER.map((m) => {
          const info = MODES[m];
          const on = m === value;
          return (
            <div
              key={m}
              className={`relative flex flex-col rounded-2xl border-[3px] border-[var(--ink)] p-3 transition-transform ${
                on ? 'bg-[var(--highlight)] shadow-[0_4px_0_var(--ink)]' : 'bg-[var(--surface)] shadow-[0_3px_0_var(--ink)] hover:-translate-y-0.5'
              }`}
            >
              <button
                type="button"
                className="flex items-start gap-3 text-left"
                onClick={() => {
                  sfx.pop();
                  onPick(m);
                }}
                aria-pressed={on}
              >
                <ModeBadge mode={m} size={48} />
                <span className="min-w-0 flex-1">
                  <span className="font-display block text-xl leading-tight">NUNO {info.name}</span>
                  <span className="block text-xs font-semibold text-[var(--muted)]">
                    based on {info.basedOn} · {info.deckSize} cards
                  </span>
                  <span className="mt-1 block text-sm font-medium leading-snug text-[var(--soft)]">{info.tagline}</span>
                </span>
                {on && <span className="font-display absolute right-3 top-2 text-lg">✓</span>}
              </button>
              <div className="mt-2 flex flex-wrap items-center gap-1">
                {info.highlights.map((h) => (
                  <span key={h} className="rounded-full bg-[var(--panel-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--soft)]">
                    {h}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => onRules(m)}
                  className="ml-auto text-xs font-bold text-[var(--link)] underline underline-offset-2"
                >
                  Rules
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
