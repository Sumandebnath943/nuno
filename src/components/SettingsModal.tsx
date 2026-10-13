import React, { useEffect } from 'react';
import { CloseButton, Modal } from './ui';
import { ALL_TRACKS, preloadThemeFonts, THEME_ORDER, THEMES, useTheme } from '../themes';
import type { Theme } from '../themes';
import { updateSettings, useSettings, type FxQuality, type Pace } from '../lib/settings';
import { sfx } from '../lib/sound';
import type { Color } from '../game/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenRules?: () => void;
}

const PACES: { id: Pace; label: string; hint: string }[] = [
  { id: 'relaxed', label: '🐢 Relaxed', hint: 'Slow, easy to follow' },
  { id: 'normal', label: '🚶 Normal', hint: 'Bots wait for the table' },
  { id: 'quick', label: '⚡ Quick', hint: 'For veterans' },
];

const QUALITY: { id: FxQuality; label: string; hint: string }[] = [
  { id: 'auto', label: 'Auto', hint: 'Eases off if your device struggles' },
  { id: 'full', label: 'Full', hint: 'Every particle, always' },
  { id: 'lite', label: 'Lite', hint: 'Fewer particles, cooler phone' },
];

/** Theme, pace, sound, music and effects. */
export function SettingsModal({ open, onClose, onOpenRules }: Props) {
  const s = useSettings();
  useEffect(() => {
    if (open) preloadThemeFonts();
  }, [open]);

  const set = (patch: Parameters<typeof updateSettings>[0]) => {
    updateSettings(patch);
    sfx.click();
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl">
      <div className="flex items-center justify-between gap-3 border-b-[3px] border-[var(--ink)] px-4 pb-2 pt-3 sm:px-5">
        <h2 className="font-display text-2xl sm:text-3xl">Settings</h2>
        <CloseButton onClick={onClose} />
      </div>
      <div className="nice-scroll min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
        <section>
          <div className="label mb-2">Theme</div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {THEME_ORDER.map((id) => (
              <ThemeTile key={id} theme={THEMES[id]} on={s.theme === id} onPick={() => set({ theme: id })} />
            ))}
          </div>
        </section>

        <section>
          <div className="label mb-2">Game pace</div>
          <div className="grid grid-cols-3 gap-2">
            {PACES.map((p) => (
              <button
                key={p.id}
                onClick={() => set({ pace: p.id })}
                className={`chip flex h-14 flex-col items-center justify-center leading-none ${s.pace === p.id ? 'is-on' : ''}`}
              >
                <span className="text-[15px]">{p.label}</span>
                <span className="mt-1 font-body text-[11px] font-semibold opacity-70">{p.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--surface)] p-3">
            <Toggle label="🔊 Sound" on={!s.muted} onChange={(v) => set({ muted: !v })} />
            <Slider label="Effects volume" value={s.sfxVolume} disabled={s.muted} onChange={(v) => updateSettings({ sfxVolume: v })} onDone={() => sfx.pop()} />
          </div>
          <div className="rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--surface)] p-3">
            <Toggle label="🎵 Music" on={s.music} onChange={(v) => set({ music: v })} />
            <Slider label="Music volume" value={s.musicVolume} disabled={s.muted || !s.music} onChange={(v) => updateSettings({ musicVolume: v })} />
            <label className="mt-2 block">
              <span className="label">Soundtrack</span>
              <select
                value={s.track}
                onChange={(e) => set({ track: e.target.value })}
                className="field mt-1 h-10 w-full px-2 text-sm"
                disabled={s.muted || !s.music}
              >
                <option value="auto">Match the theme</option>
                {ALL_TRACKS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section>
          <div className="label mb-2">Visual effects</div>
          <div className="grid grid-cols-3 gap-2">
            {QUALITY.map((q) => (
              <button
                key={q.id}
                onClick={() => set({ fx: q.id })}
                className={`chip flex h-14 flex-col items-center justify-center px-1 leading-none ${s.fx === q.id ? 'is-on' : ''}`}
              >
                <span className="text-[15px]">{q.label}</span>
                <span className="mt-1 font-body text-[10.5px] font-semibold leading-tight opacity-70">{q.hint}</span>
              </button>
            ))}
          </div>
        </section>

        {onOpenRules && (
          <button
            onClick={() => {
              onClose();
              onOpenRules();
            }}
            className="btn btn-white h-12 w-full text-lg"
          >
            📖 How to play
          </button>
        )}
      </div>
    </Modal>
  );
}

function ThemeTile({ theme, on, onPick }: { theme: Theme; on: boolean; onPick: () => void }) {
  const current = useTheme();
  const Back = theme.card.Back;
  const Defs = theme.Defs;
  const font = theme.vars['--font-display'] ?? "'Lilita One', system-ui";
  const colors: Color[] = ['red', 'yellow', 'green', 'blue'];
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={on}
      className={`relative flex items-center gap-2.5 overflow-hidden rounded-2xl border-[3px] border-[var(--ink)] p-2 text-left transition-transform ${
        on ? 'shadow-[0_0_0_3px_var(--accent-b)]' : 'shadow-[0_3px_0_var(--ink)] hover:-translate-y-0.5'
      }`}
      style={{ background: theme.vars['--room-bg'] ?? 'linear-gradient(180deg, #241d63, #100d2b)' }}
    >
      <svg viewBox="0 0 120 186" width="40" height="62" className="shrink-0 drop-shadow-[0_3px_0_rgba(0,0,0,0.45)]" aria-hidden="true">
        {/* Each preview carries its own patterns; the page only has the active theme's. */}
        {Defs && current.id !== theme.id && (
          <defs>
            <Defs />
          </defs>
        )}
        <Back />
      </svg>
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-[17px] leading-tight text-white"
          style={{ fontFamily: font, textShadow: '0 2px 0 rgba(0,0,0,0.6), 0 0 6px rgba(0,0,0,0.5)' }}
        >
          {theme.title}
        </span>
        <span className="block truncate text-[11px] font-semibold text-white/85" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          {theme.emoji} {theme.name}
        </span>
        <span className="mt-1 flex gap-1">
          {colors.map((c) => (
            <span key={c} className="h-3 w-3 rounded-full border border-black/50" style={{ background: theme.cardColors[c].base }} />
          ))}
        </span>
      </span>
      {on && (
        <span className="font-display absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--accent-a)] text-sm text-[var(--ink)]">
          ✓
        </span>
      )}
    </button>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-2" aria-pressed={on}>
      <span className="font-display text-lg">{label}</span>
      <span
        className={`relative h-7 w-12 rounded-full border-[2.5px] border-[var(--ink)] transition-colors ${on ? 'bg-[var(--green)]' : 'bg-[var(--panel-2)]'}`}
      >
        <span
          className="absolute top-0.5 h-[18px] w-[18px] rounded-full border-2 border-[var(--ink)] bg-[var(--surface)] transition-all"
          style={{ left: on ? 22 : 2 }}
        />
      </span>
    </button>
  );
}

function Slider({
  label,
  value,
  disabled,
  onChange,
  onDone,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
  onDone?: () => void;
}) {
  return (
    <label className={`mt-2 block ${disabled ? 'opacity-50' : ''}`}>
      <span className="label flex justify-between">
        {label}
        <span>{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onDone}
        className="mt-1 w-full accent-[var(--link)]"
        style={{ accentColor: 'var(--link)' } as React.CSSProperties}
      />
    </label>
  );
}
