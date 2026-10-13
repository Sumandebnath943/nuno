// Player preferences, saved in this browser. Everything here is cosmetic or
// local (theme, pace, audio), so online players can each pick their own.
import { useSyncExternalStore } from 'react';
import { setPaceScale } from '../game/timing';

export type ThemeId = 'classic' | 'naruto' | 'mha' | 'onepiece' | 'aot' | 'demonslayer' | 'dbz';
export type Pace = 'relaxed' | 'normal' | 'quick';
/** `auto` lowers the particle count by itself if the device starts dropping frames. */
export type FxQuality = 'auto' | 'full' | 'lite';

export interface Settings {
  theme: ThemeId;
  pace: Pace;
  /** Master switch for every sound and the music. */
  muted: boolean;
  sfxVolume: number;
  music: boolean;
  musicVolume: number;
  /** `auto` plays the theme's own soundtrack. */
  track: string;
  fx: FxQuality;
}

export const THEME_IDS: ThemeId[] = ['classic', 'naruto', 'mha', 'onepiece', 'aot', 'demonslayer', 'dbz'];

export const PACE_SCALE: Record<Pace, number> = { relaxed: 1.4, normal: 1, quick: 0.7 };

const KEY = 'nuno.settings';

const DEFAULTS: Settings = {
  theme: 'classic',
  pace: 'normal',
  muted: false,
  sfxVolume: 0.8,
  music: true,
  musicVolume: 0.45,
  track: 'auto',
  fx: 'auto',
};

function load(): Settings {
  const out = { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(out, JSON.parse(raw));
    else if (localStorage.getItem('nuno.muted') === '1') out.muted = true; // older versions
  } catch {
    // private mode or corrupted value: defaults
  }
  if (!THEME_IDS.includes(out.theme)) out.theme = 'classic';
  if (!(out.pace in PACE_SCALE)) out.pace = 'normal';
  out.sfxVolume = clamp01(out.sfxVolume);
  out.musicVolume = clamp01(out.musicVolume);
  return out;
}

const clamp01 = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.6);

let current = load();
setPaceScale(PACE_SCALE[current.pace]);
const listeners = new Set<() => void>();

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  if (patch.pace) setPaceScale(PACE_SCALE[current.pace]);
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

export function subscribeSettings(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribeSettings, getSettings, getSettings);
}
