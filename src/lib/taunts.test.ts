import { describe, expect, it } from 'vitest';
import { botTaunt, findTaunt, GENERAL_TAUNTS, THEME_BOTS, THEME_TAUNTS } from './taunts';
import { CHARACTER_TAUNTS, linesFor } from './characterTaunts';
import { fxSounds } from './sound';
import { THEME_IDS } from './settings';
import type { BotMoment } from '../game/host';
import manifest from '../generated/art/manifest.json';

const CHARACTER_LINES = Object.values(CHARACTER_TAUNTS).flat();
const ALL = [...GENERAL_TAUNTS, ...Object.values(THEME_TAUNTS).flat(), ...CHARACTER_LINES];
const MOMENTS: BotMoment[] = ['attack', 'hit', 'win', 'caught', 'busted', 'uno', 'skip', 'swap', 'knockout'];
const CHARACTER_IDS = Object.values(manifest as Record<string, { characters: { id: string }[] }>).flatMap((t) => t.characters.map((c) => c.id));

describe('trash talk', () => {
  it('every line has a unique id and a real sound', () => {
    expect(new Set(ALL.map((t) => t.id)).size).toBe(ALL.length);
    for (const t of ALL) {
      expect(fxSounds[t.sound], t.id).toBeTypeOf('function');
      expect(t.text.length, t.text).toBeLessThanOrEqual(40);
    }
  });

  it('looks lines up by id whatever the theme', () => {
    expect(findTaunt('g:easy')?.text).toContain('Too easy');
    expect(findTaunt('z:9000')).toBeDefined();
    expect(findTaunt('dbz/vegeta:2')?.text).toContain('Prince');
    expect(findTaunt('nope')).toBeUndefined();
    expect(findTaunt(undefined)).toBeUndefined();
  });

  it('bots always find something fitting to say, in every theme', () => {
    for (const theme of THEME_IDS) for (const m of MOMENTS) expect(botTaunt(m, theme), `${theme}/${m}`).toBeDefined();
  });

  it('every anime theme has its own lines and its own bots', () => {
    for (const theme of THEME_IDS.filter((t) => t !== 'classic')) {
      expect(THEME_TAUNTS[theme].length).toBeGreaterThanOrEqual(6);
      expect((THEME_BOTS[theme] ?? []).length).toBeGreaterThanOrEqual(9);
    }
  });

  it('every character has lines of their own for every moment', () => {
    for (const id of CHARACTER_IDS) {
      const lines = linesFor(`img:${id}`);
      expect(lines, id).toBeDefined();
      for (const mood of ['brag', 'mock', 'ouch'] as const) expect(lines!.some((l) => l.mood === mood), `${id} ${mood}`).toBe(true);
    }
    // No lines for characters that don't exist.
    for (const id of Object.keys(CHARACTER_TAUNTS)) expect(CHARACTER_IDS, id).toContain(id);
  });

  it('characters mostly speak in their own voice', () => {
    const own = new Set(CHARACTER_TAUNTS['dbz/vegeta'].map((t) => t.id));
    let theirs = 0;
    for (let i = 0; i < 400; i++) if (own.has(botTaunt('attack', 'dbz', 'img:dbz/vegeta')!.id)) theirs++;
    expect(theirs).toBeGreaterThan(300);
  });
});
