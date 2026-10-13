import React, { memo } from 'react';
import type { CutEdges } from '../../themes/characters';

export interface CutInData {
  id: number;
  url: string;
  name: string;
  /** Size of the processed picture and of its source. */
  w: number;
  h: number;
  srcW: number;
  srcH: number;
  cut: CutEdges;
  /** Your own cut-ins come in from the left, opponents' from the right. */
  side: 'left' | 'right';
  ms: number;
}

/** Where a cut-in sits on screen. The splash text uses it to stay clear of the character. */
export interface CutInBox {
  band: number;
  bandTop: number;
  /** The picture. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** The free stretch of the band beside the character, for the splash text. */
  freeX: number;
  freeW: number;
}

/**
 * Lays a cut-in out. Phones get a fighting-game composition: the character on
 * one side, the band across the screen and the words in the space beside it.
 * Bigger screens keep the words centred and keep the character at the edge.
 */
export function cutInBox(cut: Pick<CutInData, 'w' | 'h' | 'srcH' | 'cut' | 'side'>, y: number, W: number, H: number, top: number): CutInBox {
  const phone = W < 640;
  const band = Math.round(phone ? Math.max(78, Math.min(104, H * 0.12)) : Math.max(96, Math.min(150, H * 0.16)));
  const bandTop = y - band / 2;
  const bandBottom = bandTop + band;
  const bust = cut.cut.bottom;
  const maxW = phone ? W * 0.44 : Math.min(W * 0.3, 440);
  const maxH = bust
    ? Math.min(H * (phone ? 0.34 : 0.5), bandBottom - top - 6)
    : Math.min(H * (phone ? 0.42 : 0.66), 620, H - top - 8);
  let s = Math.min(maxW / cut.w, maxH / cut.h);
  // Small source pictures get blurry past ~1.6x.
  s = Math.min(s, (cut.srcH * 1.6) / cut.h);
  const w = Math.round(cut.w * s);
  const h = Math.round(cut.h * s);
  // Busts rise out of the band; full figures stand on it, kept on screen.
  let imgTop = bust ? bandBottom - h : bandBottom + band * 0.18 - h;
  imgTop = Math.max(top + 4, Math.min(imgTop, H - h - 4));
  const margin = Math.round(phone ? 2 : W * 0.03);
  const x = cut.side === 'left' ? margin : W - margin - w;
  const freeX = cut.side === 'left' ? x + w * 0.88 : 8;
  const freeW = cut.side === 'left' ? W - 8 - freeX : x + w * 0.12 - 8;
  return { band, bandTop, x, y: imgTop, w, h, freeX, freeW };
}

interface Props {
  cut: CutInData | null;
  /** Centre line of the band. */
  y: number;
  W: number;
  H: number;
  /** Don't draw above this (the top bar). */
  top: number;
}

/** Soft fades on the edges where the picture itself is cut off (not the bottom: that sits on the band). */
function edgeMask(cut: CutEdges): React.CSSProperties {
  const layers: string[] = [];
  if (cut.top) layers.push('linear-gradient(180deg, transparent 0, #000 12%)');
  if (cut.left) layers.push('linear-gradient(90deg, transparent 0, #000 14%)');
  if (cut.right) layers.push('linear-gradient(270deg, transparent 0, #000 14%)');
  if (!layers.length) return {};
  const image = layers.join(', ');
  return {
    WebkitMaskImage: image,
    maskImage: image,
    WebkitMaskComposite: layers.length > 1 ? 'source-in' : undefined,
    maskComposite: layers.length > 1 ? 'intersect' : undefined,
  } as React.CSSProperties;
}

/**
 * A fighting-game style cut-in: a slanted band of speed lines whips across the
 * screen, the character slams in from their side and drifts while the move
 * plays out, then everything snaps away. Everything animates on the compositor.
 */
export const CutIn = memo(function CutIn({ cut, y, W, H, top }: Props) {
  if (!cut) return null;
  const left = cut.side === 'left';
  const box = cutInBox(cut, y, W, H, top);
  const phone = W < 640;

  return (
    <div
      key={cut.id}
      className={`cutin pointer-events-none absolute inset-0 z-[47] overflow-hidden ${left ? 'is-left' : 'is-right'}`}
      style={{ ['--cut-ms' as string]: `${cut.ms}ms` }}
      aria-hidden="true"
    >
      <div className="absolute inset-x-[-6%]" style={{ top: box.bandTop, height: box.band, transform: 'skewY(-4deg)' }}>
        <div className="cutin-band absolute inset-0 overflow-hidden border-y-[4px] border-[var(--ink)]">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, var(--accent-b), var(--accent-a) 50%, var(--accent-b))' }} />
          {/* Speed lines racing past (a wide strip sliding by exactly one repeat, forever). */}
          <div
            className="cutin-lines absolute inset-y-0"
            style={{
              left: 0,
              width: 'calc(100% + 120px)',
              background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.32) 0 4px, rgba(255,255,255,0) 4px 60px), repeating-linear-gradient(90deg, rgba(0,0,0,0.12) 0 2px, rgba(0,0,0,0) 2px 30px)',
            }}
          />
          {/* A bright stripe along the edges. */}
          <div className="absolute inset-x-0 top-0 h-[6px] bg-white/70" />
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/25" />
        </div>
      </div>
      <div className="cutin-img absolute" style={{ top: box.y, left: box.x, width: box.w, height: box.h }}>
        <div className="cutin-drift absolute inset-0">
          <img
            src={cut.url}
            alt=""
            draggable={false}
            decoding="async"
            className="h-full w-full object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,0.5)]"
            style={edgeMask(cut.cut)}
          />
        </div>
        <span
          className={`cutin-name font-ui absolute whitespace-nowrap rounded-lg border-[3px] border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)] shadow-[0_3px_0_var(--ink)] ${
            phone ? 'px-2 text-xs leading-6' : 'px-2.5 text-lg leading-8'
          }`}
          style={{
            top: Math.min(box.h - (phone ? 14 : 18), box.bandTop + box.band - box.y - (phone ? 12 : 18)),
            [left ? 'left' : 'right']: phone ? 4 : '50%',
            transform: phone ? 'rotate(-4deg)' : `translateX(${left ? '-50%' : '50%'}) rotate(-4deg)`,
            maxWidth: Math.max(box.w, 120),
          }}
        >
          {cut.name}
        </span>
      </div>
    </div>
  );
});
