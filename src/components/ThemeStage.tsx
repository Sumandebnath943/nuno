import React, { memo, useCallback } from 'react';
import { fx } from '../fx/engine';
import { useTheme } from '../themes';
import { artFor, type Scenery } from '../themes/characters';

/**
 * The theme's scenery, drawn behind every screen. Pictures you add for the theme
 * (src/assets/characters/<theme>/_backdrop, _left, _right) are layered in here.
 *
 * During a game (`focus`) the scenery drops into soft focus: pre-blurred copies
 * fade in and the room dims a little, so the table, cards and players stand out.
 */
export const ThemeBackdrop = memo(function ThemeBackdrop({ focus = false }: { focus?: boolean }) {
  const theme = useTheme();
  const art = artFor(theme.id);
  const Backdrop = theme.Backdrop;
  const sprites = !!(art.left || art.right);
  if (!Backdrop && !art.backdrop && !sprites) return <FocusDim focus={focus} />;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ contain: 'strict' }} aria-hidden="true">
      {art.backdrop ? (
        <>
          <img src={art.backdrop.url} alt="" className="absolute inset-0 h-full w-full object-cover object-center" draggable={false} />
          {art.backdrop.soft && (
            <img
              src={art.backdrop.soft}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ease-out"
              style={{ opacity: focus ? 1 : 0 }}
              draggable={false}
            />
          )}
        </>
      ) : (
        Backdrop && <Backdrop custom={sprites} />
      )}
      {art.left && <Sprite scene={art.left} side="left" focus={focus} />}
      {art.right && <Sprite scene={art.right} side="right" focus={focus} />}
      {/* A soft vignette so white text and buttons stay readable over bright skies. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.38) 100%), linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0) 22%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.3))',
        }}
      />
      <FocusDim focus={focus} />
    </div>
  );
});

/** Dims the room while a game is on (a fade of one flat layer: free to animate). */
function FocusDim({ focus }: { focus: boolean }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 transition-opacity duration-700 ease-out"
      style={{
        opacity: focus ? 1 : 0,
        background: 'radial-gradient(ellipse at 50% 50%, rgba(8,6,22,0.18) 0%, rgba(8,6,22,0.42) 70%, rgba(8,6,22,0.58) 100%)',
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Corner scenery that keeps its own shape and "breathes": a slow, tiny sway
 * and rise anchored at its feet, so the characters feel alive without moving
 * enough to look fake. Each side has its own rhythm so they never sync up.
 */
function Sprite({ scene, side, focus }: { scene: Scenery; side: 'left' | 'right'; focus: boolean }) {
  const ratio = (scene.w / scene.h).toFixed(3);
  // Smaller during a game, where the table needs the room.
  const size: React.CSSProperties = {
    width: focus ? `min(24vw, calc(34dvh * ${ratio}), 380px)` : `min(34vw, calc(46dvh * ${ratio}), 520px)`,
    aspectRatio: `${scene.w} / ${scene.h}`,
    [side]: 0,
    transition: 'width 0.7s cubic-bezier(0.2, 0.8, 0.2, 1)',
  };
  return (
    <div className="absolute bottom-0" style={size}>
      <div className={`idle-breathe absolute inset-0 ${side === 'right' ? 'idle-breathe-b' : ''}`}>
        <img src={scene.url} alt="" draggable={false} className="absolute inset-0 h-full w-full transition-opacity duration-700" style={{ opacity: focus && scene.soft ? 0 : 1 }} />
        {scene.soft && (
          <img src={scene.soft} alt="" draggable={false} className="absolute inset-0 h-full w-full transition-opacity duration-700" style={{ opacity: focus ? 0.9 : 0 }} />
        )}
      </div>
    </div>
  );
}

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
