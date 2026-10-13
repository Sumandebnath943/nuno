import { memo, useLayoutEffect, useRef } from 'react';
import { CARD_RATIO, CardView } from '../CardView';
import type { Flight } from './useTableFx';

/** Cards in the air: dealt, drawn and played cards travel here between anchors. */
export function FlightLayer({ flights, onLand }: { flights: Flight[]; onLand: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[45]" aria-hidden="true">
      {flights.map((f) => (
        <FlyingCard key={f.id} flight={f} onLand={onLand} />
      ))}
    </div>
  );
}

/** Points along a gentle arc, so the card hops instead of sliding in a straight line. */
const STEPS = 8;

/**
 * One card in flight. It's driven by the Web Animations API, which runs on the
 * compositor: the flight stays smooth even while the page is busy re-rendering.
 */
const FlyingCard = memo(function FlyingCard({ flight, onLand }: { flight: Flight; onLand: (id: string) => void }) {
  const { from, to, card, flip, duration } = flight;
  const ref = useRef<HTMLDivElement>(null);
  const flipRef = useRef<HTMLDivElement>(null);
  // Render at the larger of the two sizes and scale, so the card stays crisp.
  const base = Math.max(from.w, to.w);
  const h = base * CARD_RATIO;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const ctrl = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - Math.min(90, dist * 0.16) };
    const spin = to.x > from.x ? 10 : -10;
    const frames: Keyframe[] = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const u = 1 - t;
      const x = u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x - base / 2;
      const y = u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y - h / 2;
      // Grows a touch at the top of the hop, and twists on the way.
      const s = (from.w + (to.w - from.w) * t) / base + Math.sin(Math.PI * t) * 0.08;
      const r = from.rot + (to.rot - from.rot) * t + Math.sin(Math.PI * t) * spin;
      frames.push({ transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(3)})`, offset: t });
    }
    const anim = el.animate(frames, { duration, easing: 'cubic-bezier(0.3, 0.7, 0.35, 1)', fill: 'forwards' });
    anim.onfinish = () => onLand(flight.id);
    let turn: Animation | undefined;
    if (flip && flipRef.current) {
      turn = flipRef.current.animate([{ transform: 'perspective(700px) rotateY(180deg)' }, { transform: 'perspective(700px) rotateY(0deg)' }], {
        duration: duration * 0.8,
        delay: duration * 0.1,
        easing: 'ease-in-out',
        fill: 'both',
      });
    }
    return () => {
      anim.onfinish = null;
      anim.cancel();
      turn?.cancel();
    };
    // A flight never changes once it's in the air.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: base,
        height: h,
        transform: `translate3d(${from.x - base / 2}px, ${from.y - h / 2}px, 0) rotate(${from.rot}deg) scale(${from.w / base})`,
        willChange: 'transform',
      }}
    >
      {flip ? (
        <div ref={flipRef} style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d', transform: 'perspective(700px) rotateY(180deg)' }}>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
            {card ? <CardView card={card} width={base} /> : <CardView faceDown width={base} />}
          </div>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <CardView faceDown width={base} />
          </div>
        </div>
      ) : (
        <CardView card={card} faceDown={!card} width={base} />
      )}
    </div>
  );
});
