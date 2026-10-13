// Table geometry. Opponents sit on the rim of an oval table in turn order:
// the next player (to your left) is on the left, then over the top to the right.
// That's the same clockwise order as a real table seen from your chair.

export interface SeatSpot {
  x: number;
  y: number;
}

export interface BoardLayout {
  W: number;
  H: number;
  mobile: boolean;
  short: boolean;
  compactSeats: boolean;
  topBar: number;
  /** Card width in your hand. */
  cw: number;
  /** Card width on the draw/discard piles. */
  pileW: number;
  table: { cx: number; cy: number; rx: number; ry: number };
  seats: SeatSpot[];
  seatW: number;
  seatH: number;
  /** Widest a seat's name plate may be. */
  nameMax: number;
  /** Max width the hand may spread to. */
  handMaxW: number;
  /** Distance from the bottom edge to the bottom of the hand. */
  handBottom: number;
  /** Is there room for the status banner between the top seats and the piles? */
  roomForBanner: boolean;
  /** Is there room for the event ticker under the piles? */
  roomForTicker: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** How an opponent's face-down hand fans out: card width, how many show, and their spread. */
export function fanShape(compact: boolean, flip = false) {
  const miniW = compact ? (flip ? 22 : 19) : flip ? 32 : 30;
  const max = compact ? 4 : 7;
  /** Sideways step between cards and their tilt, at the outer edge. */
  const offset = compact ? 15 : 34;
  const tilt = compact ? 14 : 22;
  return { miniW, max, offset, tilt };
}

/** Half the width a fan can take up (the outer cards tilt outwards). */
function fanHalf(compact: boolean): number {
  const f = fanShape(compact);
  const h = f.miniW * 1.55;
  return f.offset + h * 1.4 * Math.sin((f.tilt * Math.PI) / 180) + f.miniW / 2;
}

export function computeLayout(W: number, H: number, opponents: number, safe = { top: 0, bottom: 0 }): BoardLayout {
  const mobile = W < 640;
  const short = H < 560;
  const topBar = (mobile ? 50 : short ? 50 : 60) + safe.top;

  // Phones get bigger cards: they're tapped with thumbs.
  const cw = mobile
    ? clamp(Math.min(W * 0.165, (H - safe.top - safe.bottom) * 0.085), 56, 72)
    : clamp(Math.min(W * 0.072, H * 0.125), 54, 108);
  const ch = cw * 1.55;
  const compactSeats = mobile || short || (opponents >= 6 && W < 1100) || opponents >= 8;
  const seatW = compactSeats ? 78 : 124;
  const seatH = compactSeats ? 86 : 120;
  const nameMax = mobile ? (opponents >= 7 ? 74 : 86) : compactSeats ? 112 : 132;

  const controlsRow = mobile ? 62 : 0;
  const handBottom = (mobile ? 8 : 14) + safe.bottom;
  const handTop = H - handBottom - ch - controlsRow;

  const tableTop = topBar + seatH / 2 + 6;
  const tableBottom = handTop + ch * 0.55;
  const cy = (tableTop + tableBottom) / 2;
  const ry = Math.max(60, (tableBottom - tableTop) / 2);
  const rx = W / 2 - seatW / 2 - (mobile ? 4 : 22);

  const pileW = mobile ? clamp(rx * 0.4, 54, 74) : cw;
  const pileH = pileW * 1.55;

  // Keep every seat (its fan and its name plate) inside the screen.
  const half = Math.max(fanHalf(compactSeats), nameMax / 2, seatW / 2) + (mobile ? 3 : 8);
  const seats = seatAngles(opponents, rx, ry).map((deg) => {
    const a = (deg * Math.PI) / 180;
    return { x: clamp(W / 2 + rx * Math.cos(a), half, W - half), y: cy - ry * Math.sin(a) };
  });

  // Room for your name plate (left) and the NUNO buzzer + action buttons (right).
  const side = mobile ? 0 : clamp(W * 0.19, 190, 260);
  const handMaxW = mobile ? W - 16 : Math.min(W - side * 2, 1100);

  const bannerGap = cy - pileH / 2 - (tableTop + seatH / 2);
  const tickerGap = handTop - (cy + pileH / 2);

  return {
    W,
    H,
    mobile,
    short,
    compactSeats,
    topBar,
    cw,
    pileW,
    table: { cx: W / 2, cy, rx, ry },
    seats,
    seatW,
    seatH,
    nameMax,
    handMaxW,
    handBottom,
    roomForBanner: bannerGap > (mobile ? 64 : 74),
    roomForTicker: tickerGap > (mobile ? 84 : 96),
  };
}

/** Angles (degrees, maths convention) for each opponent seat, in turn order. */
function seatAngles(m: number, rx: number, ry: number): number[] {
  if (m <= 0) return [];
  if (m === 1) return [90];
  if (m === 2) return [148, 32];
  if (m === 3) return [180, 90, 0];
  return evenlyAlongArc(205, -25, m, rx, ry);
}

/** Spreads `count` points from angle a0 to a1 at equal distances along the ellipse. */
function evenlyAlongArc(a0: number, a1: number, count: number, rx: number, ry: number): number[] {
  const steps = 360;
  const lengths = [0];
  let prev = point(a0, rx, ry);
  for (let i = 1; i <= steps; i++) {
    const p = point(a0 + ((a1 - a0) * i) / steps, rx, ry);
    lengths.push(lengths[i - 1] + Math.hypot(p.x - prev.x, p.y - prev.y));
    prev = p;
  }
  const total = lengths[steps];
  const out: number[] = [];
  let j = 0;
  for (let k = 0; k < count; k++) {
    const target = (total * k) / (count - 1);
    while (j < steps && lengths[j + 1] < target) j++;
    const span = lengths[j + 1] - lengths[j] || 1;
    const f = Math.min(1, (target - lengths[j]) / span);
    out.push(a0 + ((a1 - a0) * (j + f)) / steps);
  }
  return out;
}

function point(deg: number, rx: number, ry: number) {
  const a = (deg * Math.PI) / 180;
  return { x: rx * Math.cos(a), y: ry * Math.sin(a) };
}

/** Deterministic little tilt/offset for a card on the discard pile. */
export function pileJitter(id: string): { dx: number; dy: number; rot: number } {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r = (n: number) => ((h >>> n) & 0xff) / 255;
  return { dx: (r(0) - 0.5) * 14, dy: (r(8) - 0.5) * 12, rot: (r(16) - 0.5) * 40 };
}
