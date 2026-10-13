import { useEffect, useRef, useState } from 'react';
import type { Color } from '../game/types';
import { INK } from '../lib/theme';
import { audio, fxSounds, tone } from '../lib/sound';
import { useTheme } from '../themes';
import { artFor } from '../themes/characters';
import { CardView } from './CardView';

const TILES: { letter: string; color: Color }[] = [
  { letter: 'N', color: 'red' },
  { letter: 'U', color: 'yellow' },
  { letter: 'N', color: 'green' },
  { letter: 'O', color: 'blue' },
];

/** When each letter lands (ms). The O is late and comes in spinning. */
const LANDS = [180, 380, 580, 980];
const READY_AT = 1650;

/**
 * The opening: N, U, N slam onto the table one after another, the O spins in
 * late and knocks the others wobbling, the deck fans out behind them, the
 * theme's hero rises up, and a big button waits for a tap. That tap is what
 * lets the browser play sound, so the stinger and music start with it; on
 * Android it also goes full screen.
 */
export function Intro({ joining, onDone }: { joining?: string | null; onDone: () => void }) {
  const theme = useTheme();
  const art = artFor(theme.id);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const t = setTimeout(() => setReady(true), reduced ? 0 : READY_AT);
    return () => clearTimeout(t);
  }, [reduced]);

  const go = () => {
    if (done.current) return;
    done.current = true;
    // This tap is the browser's go-ahead for sound.
    audio();
    stinger();
    goFullscreen();
    setLeaving(true);
    setTimeout(onDone, reduced ? 0 : 560);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') go();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`intro fixed inset-0 z-[100] flex cursor-pointer select-none flex-col items-center justify-center overflow-hidden ${leaving ? 'is-leaving' : ''} ${reduced ? 'is-still' : ''}`}
      style={{ background: 'var(--night)' }}
      onClick={go}
      role="button"
      aria-label={joining ? `Tap to join room ${joining}` : 'Tap to play'}
    >
      {/* light rays in the four card colours */}
      <div className="intro-rays pointer-events-none absolute left-1/2 top-[44%] aspect-square w-[max(170vw,170vh)]" aria-hidden="true">
        <div
          className="h-full w-full rounded-full"
          style={{
            background: `repeating-conic-gradient(from 0deg, ${theme.cardColors.red.base}55 0deg 10deg, transparent 10deg 22.5deg, ${theme.cardColors.yellow.base}55 22.5deg 32.5deg, transparent 32.5deg 45deg, ${theme.cardColors.green.base}55 45deg 55deg, transparent 55deg 67.5deg, ${theme.cardColors.blue.base}55 67.5deg 77.5deg, transparent 77.5deg 90deg)`,
            WebkitMaskImage: 'radial-gradient(circle, #000 0%, rgba(0,0,0,0.6) 30%, transparent 62%)',
            maskImage: 'radial-gradient(circle, #000 0%, rgba(0,0,0,0.6) 30%, transparent 62%)',
          }}
        />
      </div>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 44%, rgba(255,255,255,0.16), rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)' }} />

      {/* the theme's hero rises behind the logo */}
      {art.hero && (
        <div className="intro-hero pointer-events-none absolute bottom-0 left-1/2 h-[min(54dvh,520px)]" style={{ aspectRatio: `${art.hero.w} / ${art.hero.h}` }}>
          <img src={art.hero.url} alt="" className="idle-breathe h-full w-full object-contain object-bottom drop-shadow-[0_0_30px_rgba(0,0,0,0.6)]" draggable={false} />
          {/* fade the feet into the dark so the button reads */}
          <div className="absolute inset-x-[-20%] bottom-0 h-1/2" style={{ background: 'linear-gradient(0deg, var(--night), rgba(0,0,0,0))' }} />
        </div>
      )}

      <div className="intro-stage relative flex flex-col items-center">
        {/* the deck fans out behind the letters */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0" aria-hidden="true">
          {[-36, -18, 0, 18, 36].map((deg, i) => (
            <div key={deg} className="intro-fan absolute" style={{ ['--deg' as string]: `${deg}deg`, animationDelay: `${1.05 + i * 0.04}s` }}>
              <CardView faceDown width={78} />
            </div>
          ))}
        </div>

        <div className="relative flex items-end" aria-label="NUNO">
          {TILES.map((t, i) => (
            <div
              key={i}
              className={`intro-tile ${i === 3 ? 'is-late' : ''} ${i < 3 ? 'is-knocked' : ''}`}
              style={{ animationDelay: `${LANDS[i] - 260}ms, ${LANDS[3] + 40 + i * 30}ms`, ['--tilt' as string]: `${[-9, 6, -5, 8][i]}deg` }}
            >
              <svg viewBox="-52 -64 108 136" className="block w-[min(20vw,104px)] overflow-visible">
                <rect x="-46" y="-58" width="92" height="122" rx="14" fill={INK} transform="translate(4 7)" />
                <rect x="-46" y="-58" width="92" height="122" rx="14" fill="#fff" stroke={INK} strokeWidth="4" />
                <rect x="-39" y="-51" width="78" height="108" rx="9" fill={`url(#nf-${t.color})`} />
                <ellipse rx="30" ry="48" transform="rotate(30)" fill="rgba(255,255,255,0.22)" />
                <g style={{ fontFamily: "'Lilita One', system-ui, sans-serif" }} textAnchor="middle" fontSize="82">
                  <text x="3" y="34" fill={INK}>
                    {t.letter}
                  </text>
                  <text x="0" y="30" fill="#fff" stroke={INK} strokeWidth="9" strokeLinejoin="round" paintOrder="stroke">
                    {t.letter}
                  </text>
                </g>
              </svg>
              {/* a puff of colour where it lands */}
              <span className="intro-puff" style={{ animationDelay: `${LANDS[i]}ms`, ['--c' as string]: theme.cardColors[t.color].base }} aria-hidden="true">
                {Array.from({ length: 8 }).map((_, k) => (
                  <i key={k} style={{ ['--a' as string]: `${k * 45 + 10}deg` }} />
                ))}
              </span>
            </div>
          ))}
        </div>

        {theme.edition && (
          <span className="intro-badge font-display mt-3 rounded-full border-[3px] border-[var(--ink)] bg-[var(--accent-a)] px-4 text-lg leading-8 text-[var(--ink)] shadow-[0_4px_0_var(--ink)]">
            {theme.emoji} {theme.edition}
          </span>
        )}
        <p className="intro-tag font-display mt-3 text-center text-[clamp(17px,4.6vw,26px)] text-white" style={{ textShadow: '0 3px 0 rgba(0,0,0,0.6)' }}>
          <span>Match it.</span> <span>Slam it.</span> <span className="text-[var(--yellow)]">Shout NUNO!</span>
        </p>
      </div>

      <div className={`intro-cta relative mt-[7dvh] flex flex-col items-center ${ready ? 'is-ready' : ''}`}>
        <span className="btn btn-yellow animate-buzz flex h-16 items-center px-9 text-[clamp(22px,6vw,30px)]">{joining ? 'TAP TO JOIN!' : 'TAP TO PLAY!'}</span>
        <span className="font-ui mt-3 rounded-full bg-black/40 px-3 py-0.5 text-sm text-white/90">
          {joining ? `Room ${joining} is waiting` : '🔊 Sound on for the full show'}
        </span>
      </div>
    </div>
  );
}

/** "NU-NO!": four quick rising notes for the letters, then a slam and a blast. */
function stinger() {
  try {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, { type: 'square', vol: 0.07, delay: i * 0.07, filter: 2400 }));
    tone(1568, 0.5, { type: 'triangle', vol: 0.09, delay: 0.3, vibrato: [7, 12] });
    fxSounds.slap();
    setTimeout(() => fxSounds.airhorn(0, 1), 260);
  } catch {
    // sound is a bonus
  }
}

/** Phones (Android) play best full screen: no address bar eating the table. */
function goFullscreen() {
  const touch = window.matchMedia?.('(hover: none)').matches;
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  if (!touch || document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
}
