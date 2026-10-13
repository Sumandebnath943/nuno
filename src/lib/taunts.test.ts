import { describe, expect, it } from 'vitest';
import { botTaunt, findTaunt, GENERAL_TAUNTS, THEME_BOTS, THEME_TAUNTS } from './taunts';
import { fxSounds } from './sound';
import { THEME_IDS } from './settings';
import type { BotMoment } from '../game/host';

const ALL = [...GENERAL_TAUNTS, ...Object.values(THEME_TAUNTS).flat()];

describe('trash talk', () => {
  it('every line has a unique id and a real sound', () => {
    expect(new Set(ALL.map((t) => t.id)).size).toBe(ALL.length);
    for (const t of ALL) {
      expect(fxSounds[t.sound], t.id).toBeTypeOf('function');
      expect(t.text.length).toBeLessThanOrEqual(40);
    }
  });

  it('looks lines up by id whatever the theme', () => {
    expect(findTaunt('g:easy')?.text).toContain('Too easy');
    expect(findTaunt('z:9000')).toBeDefined();
    expect(findTaunt('nope')).toBeUndefined();
    expect(findTaunt(undefined)).toBeUndefined();
  });

  it('bots always find something fitting to say, in every theme', () => {
    const moments: BotMoment[] = ['attack', 'hit', 'win', 'caught', 'busted', 'uno', 'skip', 'swap', 'knockout'];
    for (const theme of THEME_IDS) for (const m of moments) expect(botTaunt(m, theme), `${theme}/${m}`).toBeDefined();
  });

  it('every anime theme has its own lines and its own bots', () => {
    for (const theme of THEME_IDS.filter((t) => t !== 'classic')) {
      expect(THEME_TAUNTS[theme].length).toBeGreaterThanOrEqual(6);
      expect((THEME_BOTS[theme] ?? []).length).toBeGreaterThanOrEqual(9);
    }
  });
});
