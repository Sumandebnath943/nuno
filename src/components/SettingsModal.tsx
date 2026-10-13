import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CloseButton } from './ui';
import { ALL_TRACKS, preloadThemeFonts, THEME_ORDER, THEMES } from '../themes';
import type { Theme } from '../themes';
import { setPreviewTheme, updateSettings, useSettings, type FxQuality, type Pace, type ThemeId } from '../lib/settings';
import { sfx } from '../lib/sound';
import { artFor, preload } from '../themes/characters';
import type { Color } from '../game/types';
import { checkRelay, type RelayStatus } from '../net/ice';

export type SettingsTab = 'themes' | 'sound' | 'game';

interface Props {
  open: boolean;
  tab?: SettingsTab;
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

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'themes', label: '🎨 Themes' },
  { id: 'sound', label: '🔊 Sound' },
  { id: 'game', label: '🎮 Game' },
];

/** Themes, sound and game settings in one sheet: full screen on phones, a big panel elsewhere. */
export function SettingsModal({ open, tab = 'themes', onClose, onOpenRules }: Props) {
  const [current, setCurrent] = useState<SettingsTab>(tab);
  useEffect(() => {
    if (open) {
      setCurrent(tab);
      preloadThemeFonts();
    } else setPreviewTheme(null);
  }, [open, tab]);
  useEffect(() => () => setPreviewTheme(null), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;

  return (
    <div className="settings-wrap fixed inset-0 z-[70] flex items-stretch justify-center sm:items-center sm:p-4 animate-fadeIn" style={{ background: 'rgba(10, 8, 30, 0.6)' }} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="panel settings-sheet relative flex w-full max-w-3xl flex-col overflow-hidden !rounded-none sm:!rounded-[24px] sm:max-h-[94dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="safe-top flex items-center gap-2 border-b-[3px] border-[var(--ink)] px-3 pb-2 sm:px-5 sm:pt-3">
          <h2 className="font-display mr-auto text-2xl sm:text-3xl">Settings</h2>
          <CloseButton onClick={onClose} />
        </div>
        <div className="flex gap-1.5 border-b-[3px] border-[var(--ink)] bg-[var(--panel-2)] px-2 py-1.5 sm:px-4" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={current === t.id}
              onClick={() => {
                sfx.click();
                if (t.id !== 'themes') setPreviewTheme(null);
                setCurrent(t.id);
              }}
              className={`font-ui h-9 flex-1 rounded-xl text-[15px] transition-colors sm:flex-none sm:px-5 ${
                current === t.id ? 'border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)] shadow-[0_2px_0_var(--ink)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="nice-scroll min-h-0 flex-1 overflow-y-auto">
          {current === 'themes' && <ThemeGallery />}
          {current === 'sound' && <SoundSettings />}
          {current === 'game' && <GameSettings onOpenRules={onOpenRules ? () => (onClose(), onOpenRules()) : undefined} />}
        </div>
      </div>
    </div>
  );
}

// ── themes ──────────────────────────────────────────────────

/**
 * Big swipeable theme cards. The sheet repaints in whichever theme is in the
 * middle (a preview: nothing is saved), and picking one plays its hero's
 * entrance. In someone else's room the host's theme is locked in.
 */
function ThemeGallery() {
  const s = useSettings();
  const strip = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState<ThemeId>(s.ownTheme);
  const [flourish, setFlourish] = useState<{ id: ThemeId; n: number } | null>(null);
  const locked = s.themeLocked;

  // Fetch every theme's showcase art up front, so swiping never waits on it.
  useEffect(() => {
    preload(THEME_ORDER.flatMap((id) => [artFor(id).backdrop?.url, artFor(id).hero?.url]).filter((u): u is string => !!u));
  }, []);

  // Start centred on your theme.
  useLayoutEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>(`[data-theme-card="${locked ? s.theme : s.ownTheme}"]`);
    if (el && strip.current) strip.current.scrollLeft = el.offsetLeft - (strip.current.clientWidth - el.clientWidth) / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whichever card settles in the middle is previewed.
  useEffect(() => {
    const el = strip.current;
    if (!el || locked) return;
    let timer: ReturnType<typeof setTimeout>;
    const settle = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const mid = el.scrollLeft + el.clientWidth / 2;
        let best: ThemeId = focus;
        let gap = Infinity;
        el.querySelectorAll<HTMLElement>('[data-theme-card]').forEach((card) => {
          const d = Math.abs(card.offsetLeft + card.clientWidth / 2 - mid);
          if (d < gap) {
            gap = d;
            best = card.dataset.themeCard as ThemeId;
          }
        });
        setFocus(best);
      }, 140);
    };
    el.addEventListener('scroll', settle, { passive: true });
    return () => {
      el.removeEventListener('scroll', settle);
      clearTimeout(timer);
    };
  }, [focus, locked]);

  useEffect(() => {
    if (locked) return;
    setPreviewTheme(focus === s.ownTheme ? null : focus);
  }, [focus, locked, s.ownTheme]);

  const go = (dir: 1 | -1) => {
    const el = strip.current;
    if (!el) return;
    const i = THEME_ORDER.indexOf(focus);
    const next = THEME_ORDER[Math.max(0, Math.min(THEME_ORDER.length - 1, i + dir))];
    const card = el.querySelector<HTMLElement>(`[data-theme-card="${next}"]`);
    if (card) el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.clientWidth) / 2, behavior: 'smooth' });
    sfx.click();
  };

  const pick = (id: ThemeId) => {
    if (locked) return;
    updateSettings({ theme: id });
    setPreviewTheme(null);
    setFocus(id);
    const t = THEMES[id];
    (t.sfx?.wild ?? sfx.wild)();
    setTimeout(() => (t.sfx?.uno ?? sfx.uno)(), 260);
    setFlourish({ id, n: Date.now() });
  };

  return (
    <div className="relative py-3 sm:py-4">
      {locked && (
        <div className="mx-3 mb-3 flex items-center gap-2 rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--highlight)] px-3 py-2 sm:mx-5">
          <span className="text-xl">🔒</span>
          <p className="font-body text-sm font-semibold leading-snug text-[var(--ink)]">
            The host picked <b>{THEMES[s.theme].title}</b> for this room. Everyone plays in it — you’ll get yours back when you leave.
          </p>
        </div>
      )}
      <div ref={strip} className="theme-strip nice-scroll flex snap-x snap-mandatory gap-3 overflow-x-auto px-[9vw] pb-3 sm:gap-4 sm:px-[calc(50%-150px)]">
        {THEME_ORDER.map((id) => (
          <ThemeCard
            key={id}
            theme={THEMES[id]}
            focused={(locked ? s.theme : focus) === id}
            selected={(locked ? s.theme : s.ownTheme) === id}
            disabled={locked && id !== s.theme}
            onPick={() => pick(id)}
          />
        ))}
      </div>
      {!locked && (
        <div className="mt-1 flex items-center justify-center gap-3">
          <button className="icon-btn !h-9 !min-w-9 !px-0" onClick={() => go(-1)} aria-label="Previous theme">
            ◀
          </button>
          <div className="flex gap-1.5">
            {THEME_ORDER.map((id) => (
              <span
                key={id}
                className={`h-2.5 rounded-full border-2 border-[var(--ink)] transition-all duration-300 ${focus === id ? 'w-6 bg-[var(--accent-b)]' : 'w-2.5 bg-[var(--surface)]'}`}
              />
            ))}
          </div>
          <button className="icon-btn !h-9 !min-w-9 !px-0" onClick={() => go(1)} aria-label="Next theme">
            ▶
          </button>
        </div>
      )}
      <Roster theme={locked ? s.theme : focus} />
      {flourish && <ThemeFlourish key={flourish.n} theme={THEMES[flourish.id]} onDone={() => setFlourish(null)} />}
    </div>
  );
}

/** The faces you'll play against in a theme: its characters become the bots. */
function Roster({ theme }: { theme: ThemeId }) {
  const chars = artFor(theme).characters;
  if (!chars.length) return null;
  return (
    <div className="mx-3 mt-3 sm:mx-5">
      <div className="label mb-1.5 text-center">Who you’ll face</div>
      <div key={theme} className="flex flex-wrap justify-center gap-1.5">
        {chars.slice(0, 15).map((c, i) => (
          <span
            key={c.id}
            title={c.name}
            className="relative h-10 w-10 overflow-hidden rounded-full border-[2.5px] border-[var(--ink)] bg-[var(--surface)] shadow-[0_2px_0_var(--ink)] animate-popIn"
            style={{ animationDelay: `${i * 0.03}s` }}
          >
            <img src={c.face} alt={c.name} className="h-full w-full object-cover" draggable={false} />
          </span>
        ))}
      </div>
    </div>
  );
}

function ThemeCard({ theme, focused, selected, disabled, onPick }: { theme: Theme; focused: boolean; selected: boolean; disabled: boolean; onPick: () => void }) {
  const art = artFor(theme.id);
  const Back = theme.card.Back;
  const Defs = theme.Defs;
  const font = theme.vars['--font-display'] ?? "'Lilita One', system-ui";
  const dfs = Number(theme.vars['--dfs'] ?? 1);
  const colors: Color[] = ['red', 'yellow', 'green', 'blue'];
  return (
    <div
      data-theme-card={theme.id}
      className={`theme-card relative flex shrink-0 snap-center flex-col overflow-hidden rounded-[22px] border-[3px] border-[var(--ink)] transition-[transform,box-shadow,opacity] duration-300 ${
        focused ? 'is-focused shadow-[0_8px_0_var(--ink)]' : 'scale-[0.92] opacity-80 shadow-[0_4px_0_var(--ink)]'
      } ${disabled ? 'grayscale-[0.6]' : ''}`}
      style={{ width: 'min(82vw, 300px)', height: 'clamp(340px, calc(100dvh - 330px), 470px)', background: theme.vars['--room-bg'] ?? 'linear-gradient(180deg, #241d63, #100d2b)' }}
    >
      {art.backdrop && <img src={art.backdrop.url} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0) 48%, rgba(0,0,0,0.88) 100%)' }} />
      {art.hero && (
        <div className="absolute inset-x-0 bottom-[54px] top-[86px] flex items-end justify-center">
          <img
            src={art.hero.url}
            alt=""
            draggable={false}
            className={`h-full w-auto max-w-none object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.6)] ${focused ? 'idle-breathe' : ''}`}
          />
        </div>
      )}
      {!art.hero && (
        <div className="absolute inset-x-0 bottom-[60px] top-[96px] flex items-center justify-center">
          <svg viewBox="0 0 120 186" className="h-[72%] drop-shadow-[0_8px_0_rgba(0,0,0,0.4)]" style={{ transform: 'rotate(-8deg)' }} aria-hidden="true">
            {Defs && (
              <defs>
                <Defs />
              </defs>
            )}
            <Back />
          </svg>
        </div>
      )}

      {/* title */}
      <div className="relative px-3 pt-3 text-white">
        <div className="flex items-start gap-2">
          <span className="text-2xl leading-none drop-shadow">{theme.emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate leading-none" style={{ fontFamily: font, fontSize: 26 * dfs, textShadow: '0 3px 0 rgba(0,0,0,0.85), 0 0 8px rgba(0,0,0,0.8), 1.5px 0 0 rgba(0,0,0,0.7), -1.5px 0 0 rgba(0,0,0,0.7)' }}>
              {theme.title}
            </div>
            <div className="font-body mt-1 truncate text-xs font-semibold text-white" style={{ textShadow: '0 2px 0 rgba(0,0,0,0.85), 0 0 6px rgba(0,0,0,0.75), 1px 0 0 rgba(0,0,0,0.6), -1px 0 0 rgba(0,0,0,0.6)' }}>
              {theme.name}
              {theme.edition ? ` · ${theme.edition}` : ''}
            </div>
          </div>
          <svg viewBox="0 0 120 186" width="30" height="46" className="shrink-0 drop-shadow-[0_3px_0_rgba(0,0,0,0.5)]" aria-hidden="true">
            {Defs && (
              <defs>
                <Defs />
              </defs>
            )}
            <Back />
          </svg>
        </div>
      </div>

      {/* tagline, colours and the button */}
      <div className="relative mt-auto px-3 pb-3">
        <p className="font-body mb-2 line-clamp-2 text-[12.5px] font-semibold leading-snug text-white" style={{ textShadow: '0 2px 0 rgba(0,0,0,0.85), 0 0 6px rgba(0,0,0,0.75), 1px 0 0 rgba(0,0,0,0.6), -1px 0 0 rgba(0,0,0,0.6)' }}>
          {theme.tagline}
        </p>
        <div className="flex items-center gap-2">
          <span className="flex gap-1">
            {colors.map((c) => (
              <span key={c} className="h-4 w-4 rounded-full border-2 border-[var(--ink)]" style={{ background: theme.cardColors[c].base }} />
            ))}
          </span>
          <button
            type="button"
            onClick={onPick}
            disabled={disabled || selected}
            className={`btn ml-auto h-10 px-4 text-base ${selected ? 'btn-green' : 'btn-yellow'} disabled:!opacity-100 disabled:!filter-none`}
          >
            {selected ? '✓ Selected' : disabled ? '🔒' : 'Select'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The chosen theme's hero bursts in on a band, fighting-game style. */
function ThemeFlourish({ theme, onDone }: { theme: Theme; onDone: () => void }) {
  const art = artFor(theme.id);
  useEffect(() => {
    const t = setTimeout(onDone, 1400);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="cutin is-right pointer-events-none fixed inset-0 z-[80] overflow-hidden" style={{ ['--cut-ms' as string]: '1350ms' }} aria-hidden="true">
      <div className="absolute inset-x-[-6%] top-1/2 h-[120px] -translate-y-1/2" style={{ transform: 'translateY(-50%) skewY(-4deg)' }}>
        <div className="cutin-band absolute inset-0 overflow-hidden border-y-[4px] border-[var(--ink)]">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, var(--accent-b), var(--accent-a) 50%, var(--accent-b))' }} />
          <div
            className="cutin-lines absolute inset-y-0 left-0"
            style={{ width: 'calc(100% + 120px)', background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.32) 0 4px, rgba(255,255,255,0) 4px 60px)' }}
          />
        </div>
      </div>
      {art.hero && (
        <div className="cutin-img absolute bottom-[calc(50%-80px)] right-[4%] h-[min(56dvh,460px)]" style={{ aspectRatio: `${art.hero.w} / ${art.hero.h}` }}>
          <img src={art.hero.url} alt="" className="h-full w-full object-contain drop-shadow-[0_10px_12px_rgba(0,0,0,0.55)]" />
        </div>
      )}
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-[560px] -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="cutin-name font-display outline-text inline-block text-[clamp(26px,8vw,52px)] leading-none" style={{ fontFamily: theme.vars['--font-display'] }}>
          {theme.title}!
        </div>
      </div>
    </div>
  );
}

// ── sound ───────────────────────────────────────────────────

function SoundSettings() {
  const s = useSettings();
  const set = (patch: Parameters<typeof updateSettings>[0]) => {
    updateSettings(patch);
    sfx.click();
  };
  return (
    <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-5">
      <div className="rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--surface)] p-3">
        <Toggle label="🔊 Sound" on={!s.muted} onChange={(v) => set({ muted: !v })} />
        <Slider label="Effects volume" value={s.sfxVolume} disabled={s.muted} onChange={(v) => updateSettings({ sfxVolume: v })} onDone={() => sfx.pop()} />
      </div>
      <div className="rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--surface)] p-3">
        <Toggle label="🎵 Music" on={s.music} onChange={(v) => set({ music: v })} />
        <Slider label="Music volume" value={s.musicVolume} disabled={s.muted || !s.music} onChange={(v) => updateSettings({ musicVolume: v })} />
        <label className="mt-2 block">
          <span className="label">Soundtrack</span>
          <select value={s.track} onChange={(e) => set({ track: e.target.value })} className="field mt-1 h-10 w-full px-2 text-sm" disabled={s.muted || !s.music}>
            <option value="auto">Match the theme</option>
            {ALL_TRACKS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--surface)] p-3 sm:col-span-2">
        <Toggle label="🎧 Voice chat" on={s.voiceSpeaker} onChange={(v) => set({ voiceSpeaker: v })} />
        <Slider label="Friends’ voices" value={s.voiceVolume} disabled={!s.voiceSpeaker} onChange={(v) => updateSettings({ voiceVolume: v })} />
        <p className="font-body mt-2 text-xs font-semibold leading-snug text-[var(--muted)]">
          In online rooms, tap the 🎙️ button to talk. Tap the mic badge on someone’s seat to mute just them.
        </p>
      </div>
    </div>
  );
}

// ── game ────────────────────────────────────────────────────

function GameSettings({ onOpenRules }: { onOpenRules?: () => void }) {
  const s = useSettings();
  const set = (patch: Parameters<typeof updateSettings>[0]) => {
    updateSettings(patch);
    sfx.click();
  };
  return (
    <div className="space-y-5 p-3 sm:p-5">
      <section>
        <div className="label mb-2">Game pace</div>
        <div className="grid grid-cols-3 gap-2">
          {PACES.map((p) => (
            <button
              key={p.id}
              onClick={() => set({ pace: p.id })}
              className={`chip flex h-14 flex-col items-center justify-center px-1 leading-none ${s.pace === p.id ? 'is-on' : ''}`}
            >
              <span className="text-[15px]">{p.label}</span>
              <span className="font-body mt-1 text-[11px] font-semibold leading-tight">{p.hint}</span>
            </button>
          ))}
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
              <span className="font-body mt-1 text-[10.5px] font-semibold leading-tight">{q.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="label mb-2">Online play</div>
        <RelayStatusCard />
      </section>

      {onOpenRules && (
        <button onClick={onOpenRules} className="btn btn-white h-12 w-full text-lg">
          📖 How to play
        </button>
      )}
    </div>
  );
}

const RELAY_TEXT: Record<RelayStatus | 'checking', { badge: string; tone: string; text: string }> = {
  checking: { badge: 'Checking…', tone: 'bg-[var(--panel-2)] text-[var(--ink)]', text: 'Asking the relay server for a line from this network…' },
  working: {
    badge: 'On ✓',
    tone: 'bg-[#dcffe5] text-[#106628]',
    text: 'Friends whose network blocks a direct link (mobile data, some Wi-Fi) are connected through the relay.',
  },
  unreachable: {
    badge: 'Not answering',
    tone: 'bg-[#ffe9cc] text-[#8a3b00]',
    text: 'A relay is set up but didn’t answer from this network. This network may block it, or its settings in Vercel need checking.',
  },
  off: {
    badge: 'Off',
    tone: 'bg-[var(--panel-2)] text-[var(--ink)]',
    text: 'No relay is set up. Most players connect directly, but some on mobile data or strict Wi-Fi won’t be able to join.',
  },
};

/** Is the relay for players who can't connect directly set up, and does it answer from here? */
function RelayStatusCard() {
  const [status, setStatus] = useState<RelayStatus | 'checking'>('checking');
  const run = (fresh = false) => {
    setStatus('checking');
    checkRelay(fresh).then(setStatus, () => setStatus('unreachable'));
  };
  useEffect(() => run(), []);
  const t = RELAY_TEXT[status];
  return (
    <div className="flex items-start gap-3 rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--surface)] p-3">
      <span className="text-2xl leading-none">📡</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-ui text-[15px] text-[var(--ink)]">Mobile-data relay</span>
          <span className={`font-ui rounded-full border-2 border-[var(--ink)] px-2 text-xs leading-5 ${t.tone} ${status === 'checking' ? 'animate-pulse' : ''}`}>{t.badge}</span>
        </div>
        <p className="font-body mt-1 text-xs font-semibold leading-snug text-[var(--muted)]">{t.text}</p>
      </div>
      {status !== 'checking' && status !== 'off' && (
        <button type="button" onClick={() => run(true)} className="chip shrink-0 px-2 py-1 text-xs" title="Check again">
          ↻
        </button>
      )}
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-2" aria-pressed={on}>
      <span className="font-ui text-lg">{label}</span>
      <span className={`relative h-7 w-12 rounded-full border-[2.5px] border-[var(--ink)] transition-colors ${on ? 'bg-[var(--green)]' : 'bg-[var(--panel-2)]'}`}>
        <span className="absolute top-0.5 h-[18px] w-[18px] rounded-full border-2 border-[var(--ink)] bg-[var(--surface)] transition-all" style={{ left: on ? 22 : 2 }} />
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
    <label className={`mt-2 block ${disabled ? 'opacity-60' : ''}`}>
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
        className="mt-1 w-full"
        style={{ accentColor: 'var(--link)' } as React.CSSProperties}
      />
    </label>
  );
}
