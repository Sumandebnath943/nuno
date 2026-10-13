// Theme registry: applies a theme's colours, fonts, sounds, music and
// particles to the whole app, and dresses up table events with its effects.
import { createContext, useContext } from 'react';
import type { Color } from '../game/types';
import { fx } from '../fx/engine';
import { music, CLASSIC_TRACKS, type Track } from '../lib/music';
import { fxSounds, setSfxOverrides } from '../lib/sound';
import { getSettings, type ThemeId } from '../lib/settings';
import type { FxEvent, FxKit, Theme } from './types';
import { classic } from './classic';
import { naruto } from './naruto';
import { mha } from './mha';
import { onepiece } from './onepiece';
import { aot } from './aot';
import { demonslayer } from './demonslayer';
import { dbz } from './dbz';

export type { Theme, FxEvent } from './types';

export const THEMES: Record<ThemeId, Theme> = { classic, naruto, mha, onepiece, aot, demonslayer, dbz };
export const THEME_ORDER: ThemeId[] = ['classic', 'naruto', 'mha', 'onepiece', 'aot', 'demonslayer', 'dbz'];

/** Every soundtrack: the two classic ones plus each theme's. */
export const ALL_TRACKS: Track[] = [
  ...CLASSIC_TRACKS,
  ...THEME_ORDER.filter((id) => id !== 'classic').map((id) => THEMES[id].music),
];

/** The Classic values of every CSS variable; themes override some of them. */
const BASE_VARS: Record<string, string> = {
  '--ink': '#1b1530',
  '--cream': '#fff8ea',
  '--night': '#17143d',
  '--red': '#e8333a',
  '--yellow': '#ffc21a',
  '--green': '#2eb34f',
  '--blue': '#2f72e0',
  '--muted': '#6b6385',
  '--soft': '#4d4566',
  '--faint': '#9a93ad',
  '--panel-2': '#efe6d2',
  '--panel-3': '#f1ebdd',
  '--line': '#e3d9c3',
  '--highlight': '#fff1a8',
  '--chip-hover': '#fff6d6',
  '--link': '#6d4ce6',
  '--accent-a': '#ffe066',
  '--accent-b': '#ffb703',
  '--surface': '#ffffff',
  '--turn-bg': '#fff1a8',
  '--font-display': "'Lilita One', system-ui, sans-serif",
  '--font-card': "'Lilita One', system-ui, sans-serif",
  '--font-body': "'Fredoka', system-ui, sans-serif",
  /** Buttons and panel text; themes with very wide display fonts use a narrower one here. */
  '--font-ui': 'var(--font-display)',
  '--panel-bg': 'var(--cream)',
  '--room-bg':
    'radial-gradient(ellipse at 50% 45%, rgba(120, 90, 255, 0.28) 0%, rgba(0, 0, 0, 0) 60%), repeating-conic-gradient(from 0deg at 50% 45%, rgba(255, 255, 255, 0.035) 0deg 9deg, rgba(255, 255, 255, 0) 9deg 18deg), linear-gradient(180deg, #241d63 0%, #17143d 60%, #100d2b 100%)',
  '--ring': 'rgba(255, 224, 102, 0.95)',
};

export const ThemeContext = createContext<Theme>(classic);

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

let current: Theme = classic;

export function currentTheme(): Theme {
  return current;
}

function loadFonts(query: string | undefined) {
  if (!query) return;
  const id = `theme-font-${query.replace(/[^a-z0-9]/gi, '')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${query}&display=swap`;
  document.head.appendChild(link);
}

/** Loads every theme's font (for the theme picker previews). */
export function preloadThemeFonts() {
  THEME_ORDER.forEach((id) => loadFonts(THEMES[id].fonts));
}

/** Paints the whole app in a theme. */
export function applyTheme(id: ThemeId) {
  const t = THEMES[id] ?? classic;
  current = t;
  const root = document.documentElement;
  const vars = { ...BASE_VARS, ...t.vars };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.dataset.theme = t.id;
  loadFonts(t.fonts);
  setSfxOverrides(t.sfx ?? {});
  fx.setAmbient(t.ambient);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', vars['--night']);
  syncMusic();
}

/** Plays the soundtrack the settings ask for. */
export function syncMusic() {
  const pick = getSettings().track;
  const track = pick === 'auto' ? current.music : (ALL_TRACKS.find((x) => x.id === pick) ?? current.music);
  music.play(track);
}

// ── table effects ───────────────────────────────────────────

const hex = (c: Color) => current.cardColors[c]?.base ?? '#fff';

/** The Classic effects, also used by themes for anything they don't restyle. */
function baseFx(e: FxEvent, k: FxKit) {
  const confetti = ['#e8333a', '#ffc21a', '#2eb34f', '#2f72e0', '#ffffff'];
  switch (e.kind) {
    case 'land':
      if (/^\d$/.test(e.card.value)) return;
      k.fx.burst(e.at.x, e.at.y, {
        shapes: ['star', 'spark'],
        colors: e.card.color === 'wild' ? confetti : [hex(e.card.color as Color), '#fff'],
        count: 16,
        speed: [140, 360],
        size: [8, 16],
      });
      return;
    case 'hit':
      k.fx.projectile(e.from, e.to, {
        shape: 'star',
        color: '#ffd21f',
        size: 26,
        spin: 10,
        dur: 0.4,
        trail: { shape: 'spark', colors: ['#ffd21f', '#fff'], glow: true },
        onHit: () => {
          k.fx.burst(e.to.x, e.to.y, { shapes: ['star', 'square'], colors: ['#e8333a', '#ffd21f', '#fff'], count: 10 + e.amount * 3 });
          if (e.amount >= 4) k.fx.shake(e.amount >= 6 ? 12 : 8);
        },
      });
      return;
    case 'skip':
      k.fx.ring(e.to.x, e.to.y, { color: '#ff5a5f', r0: 20, r1: 70, width: 6, dur: 0.45 });
      k.fx.burst(e.to.x, e.to.y, { shapes: ['star'], colors: ['#ff5a5f', '#fff'], count: 10, speed: [80, 220] });
      return;
    case 'reverse':
      k.fx.ring(e.at.x, e.at.y, { color: '#ffffff', r0: 40, r1: 220, width: 5, squash: 0.6, dur: 0.6 });
      return;
    case 'color':
      k.fx.ring(e.at.x, e.at.y, { color: e.hex, r0: 30, r1: 200, width: 10, dur: 0.65, glow: true });
      k.fx.burst(e.at.x, e.at.y, { shapes: ['spark', 'star'], colors: [e.hex, '#fff'], count: 18, glow: true });
      return;
    case 'uno':
      k.fx.burst(e.at.x, e.at.y, { shapes: ['star'], colors: ['#ffd21f', '#fff'], count: 22, speed: [160, 380] });
      k.fx.ring(e.at.x, e.at.y, { color: '#ffd21f', r0: 20, r1: 110, width: 7 });
      return;
    case 'caught':
      k.fx.burst(e.at.x, e.at.y, { shapes: ['star', 'square'], colors: ['#e8333a', '#fff'], count: 16 });
      return;
    case 'swap':
      k.fx.projectile(e.a, e.b, { shape: 'star', color: '#fff', size: 22, spin: 8, dur: 0.5 });
      k.fx.projectile(e.b, e.a, { shape: 'star', color: '#ffd21f', size: 22, spin: -8, dur: 0.5 });
      return;
    case 'passHands':
      k.fx.ring(e.at.x, e.at.y, { color: '#ffffff', r0: 60, r1: 260, width: 4, squash: 0.6, dur: 0.8 });
      return;
    case 'flip':
      k.fx.flash(e.dark ? '#000' : '#fff', 0.5, 380);
      return;
    case 'stack':
      k.fx.shake(6 + Math.min(10, e.total / 2));
      k.fx.burst(e.to.x, e.to.y, { shapes: ['square', 'star'], colors: ['#e8333a', '#ffd21f'], count: 14 });
      return;
    case 'knockout':
      k.fx.shake(14, 600);
      k.fx.burst(e.at.x, e.at.y, { shapes: ['rock', 'square'], colors: ['#8a8a99', '#3a3550'], count: 26, speed: [160, 420] });
      return;
    case 'launch':
      if (e.count > 0) k.fx.burst(e.to.x, e.to.y, { shapes: ['square'], colors: ['#fff', '#e8333a'], count: 6 + e.count * 3 });
      return;
    case 'discardAll':
      k.fx.burst(e.to.x, e.to.y, { shapes: ['square'], colors: confetti, count: 10 + e.count * 3 });
      return;
    case 'challenge':
      k.fx.flash(e.guilty ? '#ff3b3b' : '#5be07d', 0.35, 420);
      return;
    case 'win':
      if (e.mine) k.fx.rain({ shapes: ['square', 'star'], colors: confetti, count: 50, flutter: true });
      return;
    default:
      return;
  }
}

/** Plays the current theme's take on a table event. */
export function playFx(e: FxEvent) {
  const t = current;
  const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const kit: FxKit = { fx, snd: fxSounds, center, base: (ev) => baseFx(ev, kit), hex };
  try {
    if (t.onFx) t.onFx(e, kit);
    else baseFx(e, kit);
  } catch {
    // effects are decoration only
  }
}
