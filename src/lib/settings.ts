// Player preferences, saved in this browser. Everything here is cosmetic or
// local (theme, pace, audio). In an online room the host's theme is used by
// everyone; it's layered on top of your own and never saved over it.
import { useSyncExternalStore } from 'react';
import { setPaceScale } from '../game/timing';

export type ThemeId = 'classic' | 'naruto' | 'mha' | 'onepiece' | 'aot' | 'demonslayer' | 'dbz';
export type Pace = 'relaxed' | 'normal' | 'quick';
/** `auto` lowers the particle count by itself if the device starts dropping frames. */
export type FxQuality = 'auto' | 'full' | 'lite';

export interface Settings {
  /** The theme on screen: a room's or a preview's if there is one, otherwise your own. */
  theme: ThemeId;
  /** Your own saved theme. */
  ownTheme: ThemeId;
  /** You're in someone else's room: they pick the theme. */
  themeLocked: boolean;
  pace: Pace;
  /** Master switch for every sound and the music. */
  muted: boolean;
  sfxVolume: number;
  music: boolean;
  musicVolume: number;
  /** `auto` plays the theme's own soundtrack. */
  track: string;
  fx: FxQuality;
  /** Voice chat: hear the others. */
  voiceSpeaker: boolean;
  voiceVolume: number;
}

type Saved = Omit<Settings, 'ownTheme' | 'themeLocked'>;

export const THEME_IDS: ThemeId[] = ['classic', 'naruto', 'mha', 'onepiece', 'aot', 'demonslayer', 'dbz'];

export const PACE_SCALE: Record<Pace, number> = { relaxed: 1.4, normal: 1, quick: 0.7 };

const KEY = 'nuno.settings';

const DEFAULTS: Saved = {
  theme: 'classic',
  pace: 'normal',
  muted: false,
  sfxVolume: 0.8,
  music: true,
  musicVolume: 0.45,
  track: 'auto',
  fx: 'auto',
  voiceSpeaker: true,
  voiceVolume: 1,
};

function load(): Saved {
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
  out.voiceVolume = clamp01(out.voiceVolume);
  out.voiceSpeaker = out.voiceSpeaker !== false;
  return out;
}

const clamp01 = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.6);

let saved = load();
/** The host's theme while you're in their room. */
let roomTheme: ThemeId | null = null;
/** The theme being browsed in the theme gallery. */
let previewTheme: ThemeId | null = null;
let current = compose();
setPaceScale(PACE_SCALE[saved.pace]);
const listeners = new Set<() => void>();

function compose(): Settings {
  return {
    ...saved,
    theme: previewTheme ?? roomTheme ?? saved.theme,
    ownTheme: saved.theme,
    themeLocked: roomTheme !== null,
  };
}

function changed() {
  current = compose();
  listeners.forEach((fn) => fn());
}

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Saved>) {
  // Your own theme can't be changed from inside someone else's room.
  if (patch.theme && roomTheme !== null) {
    const { theme: _ignored, ...rest } = patch;
    patch = rest;
  }
  saved = { ...saved, ...patch };
  if (patch.pace) setPaceScale(PACE_SCALE[saved.pace]);
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // ignore
  }
  changed();
}

/** Joining a room switches to its theme; leaving (null) gives you yours back. */
export function setRoomTheme(id: ThemeId | null) {
  const next = id && THEME_IDS.includes(id) ? id : null;
  if (next === roomTheme) return;
  roomTheme = next;
  changed();
}

/** Shows a theme without saving it (the theme gallery). Null ends the preview. */
export function setPreviewTheme(id: ThemeId | null) {
  if (id === previewTheme) return;
  previewTheme = id;
  changed();
}

export function isPreviewing(): boolean {
  return previewTheme !== null;
}

export function subscribeSettings(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribeSettings, getSettings, getSettings);
}
