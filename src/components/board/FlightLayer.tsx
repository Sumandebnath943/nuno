import { motion } from 'framer-motion';
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

function FlyingCard({ flight, onLand }: { flight: Flight; onLand: (id: string) => void }) {
  const { from, to, card, flip, duration } = flight;
  // Render at the larger of the two sizes and scale, so the card stays crisp.
  const base = Math.max(from.w, to.w);
  const h = base * CARD_RATIO;
  const sec = duration / 1000;
  // A little hop: cards arc upwards a touch as they fly.
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2 - Math.min(80, Math.hypot(to.x - from.x, to.y - from.y) * 0.12);

  return (
    <motion.div
      style={{ position: 'absolute', left: 0, top: 0, width: base, height: h }}
      initial={{ x: from.x - base / 2, y: from.y - h / 2, scale: from.w / base, rotate: from.rot }}
      animate={{
        x: [from.x - base / 2, midX - base / 2, to.x - base / 2],
        y: [from.y - h / 2, midY - h / 2, to.y - h / 2],
        scale: [from.w / base, (Math.max(from.w, to.w) / base) * 1.08, to.w / base],
        rotate: [from.rot, (from.rot + to.rot) / 2 + (to.x > from.x ? 8 : -8), to.rot],
      }}
      transition={{ duration: sec, ease: [0.3, 0.7, 0.35, 1], times: [0, 0.5, 1] }}
      onAnimationComplete={() => onLand(flight.id)}
    >
      {flip ? (
        <motion.div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
            transformPerspective: 700,
          }}
          initial={{ rotateY: 180 }}
          animate={{ rotateY: 0 }}
          transition={{ duration: sec * 0.8, delay: sec * 0.1, ease: 'easeInOut' }}
        >
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
            {card ? <CardView card={card} width={base} /> : <CardView faceDown width={base} />}
          </div>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <CardView faceDown width={base} />
          </div>
        </motion.div>
      ) : (
        <CardView card={card} faceDown={!card} width={base} />
      )}
    </motion.div>
  );
}
