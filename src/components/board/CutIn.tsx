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
 * A fighting-game style cut-in: the character's whole picture slides in over a
 * diagonal speed-line band behind the big splash text. Pictures keep their own
 * proportions: full figures stand large over the band, busts rise out of it.
 */
export const CutIn = memo(function CutIn({ cut, y, W, H, top }: Props) {
  if (!cut) return null;
  const left = cut.side === 'left';
  const band = Math.round(Math.max(84, Math.min(160, H * 0.17)));
  const bandBottom = y + band / 2;
  const bust = cut.cut.bottom;

  // As big as the screen allows, in the picture's own shape.
  const maxW = Math.min(W * 0.45, 620);
  const maxH = bust ? Math.min(H * 0.62, bandBottom - top - 6) : Math.min(H * 0.8, 680, H - top - 8);
  let s = Math.min(maxW / cut.w, maxH / cut.h);
  // Small source pictures get blurry past ~1.6x.
  s = Math.min(s, (cut.srcH * 1.6) / cut.h);
  const w = Math.round(cut.w * s);
  const h = Math.round(cut.h * s);
  // Busts rise out of the band; full figures stand centred on it, kept on screen.
  let imgTop = bust ? bandBottom - h : y - h * 0.52;
  imgTop = Math.max(top + 4, Math.min(imgTop, H - h - 4));
  const side = Math.round(W * 0.03);

  return (
    <div
      key={cut.id}
      className="pointer-events-none absolute inset-0 z-[47] overflow-hidden"
      style={{ ['--cut-ms' as string]: `${cut.ms}ms` }}
      aria-hidden="true"
    >
      <div className="absolute inset-x-[-5%]" style={{ top: y - band / 2, height: band, transform: 'skewY(-3deg)' }}>
        <div
          className={`cutin-band absolute inset-0 border-y-[4px] border-[var(--ink)] ${left ? 'origin-left' : 'origin-right'}`}
          style={{
            background:
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 3px, rgba(255,255,255,0) 3px 38px), linear-gradient(90deg, var(--accent-b), var(--accent-a) 50%, var(--accent-b))',
          }}
        />
      </div>
      <div
        className={`cutin-img absolute ${left ? 'from-left' : 'from-right'}`}
        style={{ top: imgTop, width: w, height: h, [left ? 'left' : 'right']: side }}
      >
        <img
          src={cut.url}
          alt=""
          draggable={false}
          decoding="async"
          className="h-full w-full object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,0.5)]"
          style={edgeMask(cut.cut)}
        />
        <span
          className="cutin-name font-display absolute left-1/2 whitespace-nowrap rounded-lg border-[3px] border-[var(--ink)] bg-[var(--surface)] px-2.5 text-lg leading-8 text-[var(--ink)] shadow-[0_3px_0_var(--ink)]"
          style={{ top: Math.min(h - 18, bandBottom - imgTop - 18), transform: 'translateX(-50%) rotate(-3deg)' }}
        >
          {cut.name}
        </span>
      </div>
    </div>
  );
});
