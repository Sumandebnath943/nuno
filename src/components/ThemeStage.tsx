import React, { memo, useCallback } from 'react';
import { fx } from '../fx/engine';
import { useTheme } from '../themes';
import { artFor } from '../themes/characters';

/**
 * The theme's scenery, drawn behind every screen. Pictures you add for the theme
 * (src/assets/characters/<theme>/_backdrop, _left, _right) are layered in here.
 */
export const ThemeBackdrop = memo(function ThemeBackdrop() {
  const theme = useTheme();
  const art = artFor(theme.id);
  const Backdrop = theme.Backdrop;
  const sprites = !!(art.left || art.right);
  if (!Backdrop && !art.backdrop && !sprites) return null;
  // Corner scenery keeps its own shape: as big as it can be within these bounds.
  const corner = (s: { w: number; h: number }): React.CSSProperties => ({
    width: `min(46vw, calc(62dvh * ${(s.w / s.h).toFixed(3)}))`,
    aspectRatio: `${s.w} / ${s.h}`,
  });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ contain: 'strict' }} aria-hidden="true">
      {art.backdrop ? (
        <>
          <img src={art.backdrop.url} alt="" className="absolute inset-0 h-full w-full object-cover object-center" draggable={false} />
          {/* A soft vignette so white text and buttons stay readable over bright skies. */}
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.38) 100%), linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0) 22%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.3))' }}
          />
        </>
      ) : (
        Backdrop && <Backdrop custom={sprites} />
      )}
      {art.left && <img src={art.left.url} alt="" draggable={false} className="absolute bottom-0 left-0" style={corner(art.left)} />}
      {art.right && <img src={art.right.url} alt="" draggable={false} className="absolute bottom-0 right-0" style={corner(art.right)} />}
    </div>
  );
});

/** Canvas for drifting ambient particles (leaves, petals, embers…). */
export function AmbientCanvas({ className = '' }: { className?: string }) {
  const ref = useCallback((el: HTMLCanvasElement | null) => fx.attach('back', el), []);
  return <canvas ref={ref} className={`pointer-events-none fixed inset-0 ${className}`} aria-hidden="true" />;
}

/** Canvas for bursts, beams and slashes on top of the table. */
export function FxCanvas({ className = '' }: { className?: string }) {
  const ref = useCallback((el: HTMLCanvasElement | null) => fx.attach('front', el), []);
  return <canvas ref={ref} className={`pointer-events-none fixed inset-0 ${className}`} aria-hidden="true" />;
}
