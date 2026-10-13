import { describe, expect, it } from 'vitest';
import { fromManifest, type Manifest } from './characters';

const cut = { top: false, bottom: false, left: false, right: false };

describe('character art', () => {
  it('turns the build manifest into characters and scenery with URLs', () => {
    const manifest: Manifest = {
      naruto: {
        characters: [
          { id: 'naruto/naruto', name: 'Naruto', full: 'Naruto Uzumaki', file: 'c-naruto.webp', face: 'f-naruto.webp', w: 312, h: 960, srcW: 900, srcH: 2768, cut },
          { id: 'naruto/missing', name: 'Ghost', full: 'Ghost', file: 'c-missing.webp', face: 'f-missing.webp', w: 1, h: 1, srcW: 1, srcH: 1, cut },
        ],
        hero: { file: 'hero.webp', w: 700, h: 1200 },
        backdrop: { file: 'bg.webp', w: 1672, h: 941 },
      },
      'not-a-theme': { characters: [] },
    };
    const files = new Set(['c-naruto.webp', 'f-naruto.webp', 'hero.webp', 'bg.webp']);
    const art = fromManifest(manifest, (theme, file) => (files.has(file) ? `/${theme}/${file}` : undefined));
    expect(Object.keys(art)).toEqual(['naruto']);
    expect(art.naruto?.characters.map((c) => c.name)).toEqual(['Naruto']);
    expect(art.naruto?.characters[0]).toMatchObject({ url: '/naruto/c-naruto.webp', face: '/naruto/f-naruto.webp', full: 'Naruto Uzumaki' });
    expect(art.naruto?.hero?.url).toBe('/naruto/hero.webp');
    expect(art.naruto?.left).toBeUndefined();
  });
});
