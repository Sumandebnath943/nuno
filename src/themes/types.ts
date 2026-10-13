import type { FC } from 'react';
import type { CardColor, Color, Face } from '../game/types';
import type { ThemeId } from '../lib/settings';
import type { AmbientConfig, Pt } from '../fx/engine';
import type { fx } from '../fx/engine';
import type { Track } from '../lib/music';
import type { fxSounds, SfxOverrides } from '../lib/sound';

/** Something happened on the table that a theme can dress up. Points are screen coordinates. */
export type FxEvent =
  | { kind: 'deal'; at: Pt }
  | { kind: 'land'; at: Pt; card: Face; mine: boolean }
  | { kind: 'draw'; from: Pt; to: Pt; count: number }
  | { kind: 'hit'; from: Pt; to: Pt; amount: number }
  | { kind: 'skip'; from: Pt; to: Pt }
  | { kind: 'skipAll'; at: Pt }
  | { kind: 'reverse'; at: Pt }
  | { kind: 'color'; at: Pt; color: Color; hex: string }
  | { kind: 'uno'; at: Pt }
  | { kind: 'caught'; at: Pt; by: Pt }
  | { kind: 'swap'; a: Pt; b: Pt }
  | { kind: 'passHands'; at: Pt }
  | { kind: 'flip'; at: Pt; dark: boolean }
  | { kind: 'stack'; at: Pt; to: Pt; total: number }
  | { kind: 'knockout'; at: Pt }
  | { kind: 'launch'; at: Pt; to: Pt; count: number }
  | { kind: 'discardAll'; at: Pt; to: Pt; count: number }
  | { kind: 'challenge'; at: Pt; guilty: boolean }
  | { kind: 'win'; at: Pt; mine: boolean }
  | { kind: 'yourTurn'; at: Pt };

export interface FxKit {
  fx: typeof fx;
  snd: typeof fxSounds;
  /** Centre of the table. */
  center: Pt;
  /** The default (Classic) effect for this event. */
  base: (e: FxEvent) => void;
  /** Card colour as a hex string. */
  hex: (c: Color) => string;
}

export type MoveKey =
  | 'skip'
  | 'skipAll'
  | 'reverse'
  | 'draw'
  | 'bigDraw'
  | 'wild'
  | 'uno'
  | 'swap'
  | 'flip'
  | 'stack'
  | 'knockout'
  | 'caught'
  | 'discardAll'
  | 'launch';

export type SplashBackdrop = 'none' | 'burst' | 'brush' | 'scroll' | 'plate' | 'glow';

export interface Theme {
  id: ThemeId;
  /** The anime it's inspired by. */
  name: string;
  /** In-world name of the skin. */
  title: string;
  tagline: string;
  emoji: string;
  /** Google Fonts css2 `family=` query, loaded when the theme is picked. */
  fonts?: string;
  /** CSS custom properties for the whole UI. */
  vars: Record<string, string>;
  cardColors: Record<Color, { base: string; light: string; dark: string }>;
  felt: Record<Color, [string, string, string]>;
  neutralFelt: [string, string, string];
  card: {
    /** The outer rim of a card face. */
    edge: string;
    /** Fill of the centre oval on coloured cards. */
    oval?: string;
    /** `<pattern>` id laid over the coloured field. */
    pattern?: string;
    patternOpacity?: number;
    Back: FC;
    /** Extra drawing on top of every face (frames, corner marks). */
    Decor?: FC<{ color: CardColor; dark: boolean }>;
  };
  /** Gradients and patterns used by the theme's SVG art. */
  Defs?: FC;
  /** Full-screen scenery behind everything. `custom` is set when you've added your own scenery pictures. */
  Backdrop?: FC<{ custom?: boolean }>;
  table: {
    /** CSS background of the rim. */
    rim: string;
    /** Drawn over the felt, in a 1000×600 box. */
    Overlay?: FC;
    /** Watermark in the middle of the felt (viewBox −50 −50 100 100). */
    Emblem?: FC;
    chevron?: string;
  };
  ambient: AmbientConfig | null;
  /** Dress up table events. Call kit.base(e) to keep the default effect too. */
  onFx?: (e: FxEvent, kit: FxKit) => void;
  splash: { backdrop: SplashBackdrop; color?: string; ink?: string; kickerBg?: string; kickerInk?: string };
  /** Flavour text shown above big splashes ("Substitution Jutsu"). */
  moves?: Partial<Record<MoveKey, string>>;
  /** In-world names for the colours ("Water Breathing"). */
  colorAlias?: Partial<Record<Color, string>>;
  /** A title for each player based on how many cards they hold. */
  rank?: (cards: number, score: number) => string;
  /** CSS class on the avatar of the player whose move it is. */
  auraClass?: string;
  /** CSS class on the avatar of anyone down to one card. */
  hotClass?: string;
  sfx?: SfxOverrides;
  music: Track;
  /** Shown under the logo on the menu. */
  edition?: string;
}
