// Character and scenery art, prepared by `npm run art` (scripts/build-art.py)
// from the originals in src/assets/characters/. The game only ever loads the
// small processed copies in src/generated/art/, and only for the active theme.
import type { ThemeId } from '../lib/settings';
import { THEME_IDS } from '../lib/settings';

/** Which edges of a picture are cut off (the figure runs into the edge). */
export interface CutEdges {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

export interface Character {
  /** `<theme>/<slug>` */
  id: string;
  theme: ThemeId;
  /** Short name for seats and bots ("Luffy"). */
  name: string;
  /** Full name for the cut-in ("Monkey D. Luffy"). */
  full: string;
  /** The whole figure, for cut-ins. */
  url: string;
  /** A square crop of the face, for profile pictures. */
  face: string;
  w: number;
  h: number;
  /** Size of the source picture, so small ones aren't blown up. */
  srcW: number;
  srcH: number;
  cut: CutEdges;
}

export interface Scenery {
  url: string;
  w: number;
  h: number;
  /** A small, pre-blurred copy for behind the table during a game. */
  soft?: string;
}

export interface ThemeArt {
  characters: Character[];
  hero?: Scenery;
  backdrop?: Scenery;
  left?: Scenery;
  right?: Scenery;
}

interface ManifestFile {
  file: string;
  w: number;
  h: number;
  soft?: string;
}
interface ManifestCharacter extends ManifestFile {
  id: string;
  name: string;
  full: string;
  face: string;
  srcW: number;
  srcH: number;
  cut: CutEdges;
}
type ManifestTheme = {
  characters: ManifestCharacter[];
  hero?: ManifestFile;
  backdrop?: ManifestFile;
  left?: ManifestFile;
  right?: ManifestFile;
};
export type Manifest = Partial<Record<string, ManifestTheme>>;

/** Turns the build manifest into art with real URLs (exported for tests). */
export function fromManifest(manifest: Manifest, urlOf: (theme: string, file: string) => string | undefined) {
  const out: Partial<Record<ThemeId, ThemeArt>> = {};
  for (const [theme, entry] of Object.entries(manifest)) {
    if (!entry || !THEME_IDS.includes(theme as ThemeId)) continue;
    const scene = (f?: ManifestFile): Scenery | undefined => {
      const url = f && urlOf(theme, f.file);
      if (!url) return undefined;
      const soft = f.soft ? urlOf(theme, f.soft) : undefined;
      return { url, w: f.w, h: f.h, ...(soft ? { soft } : {}) };
    };
    const characters: Character[] = [];
    for (const c of entry.characters ?? []) {
      const url = urlOf(theme, c.file);
      const face = urlOf(theme, c.face);
      if (!url || !face) continue;
      characters.push({ ...c, theme: theme as ThemeId, url, face });
    }
    out[theme as ThemeId] = {
      characters,
      hero: scene(entry.hero),
      backdrop: scene(entry.backdrop),
      left: scene(entry.left),
      right: scene(entry.right),
    };
  }
  return out;
}

// Optional imports: a fresh checkout without generated art still builds.
const MANIFESTS = import.meta.glob('../generated/art/manifest.json', { eager: true, import: 'default' }) as Record<string, Manifest>;
const URLS = import.meta.glob('../generated/art/*/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const ART = fromManifest(Object.values(MANIFESTS)[0] ?? {}, (theme, file) => URLS[`../generated/art/${theme}/${file}`]);
const BY_ID = new Map(Object.values(ART).flatMap((a) => a!.characters.map((c) => [c.id, c] as const)));

export function artFor(theme: ThemeId): ThemeArt {
  return ART[theme] ?? { characters: [] };
}

/** Every character, from every theme. */
export function allCharacters(): Character[] {
  return [...BY_ID.values()];
}

/** Avatars are emoji, or `img:<character id>` for a character. */
export function avatarImage(avatar: string | undefined): Character | null {
  if (!avatar?.startsWith('img:')) return null;
  return BY_ID.get(avatar.slice(4)) ?? null;
}

export const characterAvatar = (c: Character) => `img:${c.id}`;

/** Starts downloading pictures before they're needed (cut-ins). */
const warmed = new Set<string>();
export function preload(urls: string[]) {
  for (const u of urls) {
    if (warmed.has(u)) continue;
    warmed.add(u);
    const img = new Image();
    img.decoding = 'async';
    img.src = u;
  }
}
