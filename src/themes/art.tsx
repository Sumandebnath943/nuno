// Small drawing helpers shared by the theme artwork.
import type { ReactNode } from 'react';

/** Deterministic random numbers, so scenery looks the same every time. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A spiral made of growing half circles. */
export function spiralPath(cx: number, cy: number, turns: number, step: number): string {
  let d = `M ${cx} ${cy}`;
  let x = cx;
  for (let i = 1; i <= turns * 2; i++) {
    const rad = step * i;
    const dir = i % 2 ? 1 : -1;
    x += dir * rad * 2;
    d += ` A ${rad} ${rad} 0 0 1 ${x} ${cy}`;
  }
  return d;
}

/** Points for a spiky star / comic burst. */
export function burstPoints(n: number, outer: number, inner: number, cx = 0, cy = 0, jitter = 0, seed = 7): string {
  const rnd = seeded(seed);
  return Array.from({ length: n * 2 }, (_, i) => {
    const rad = (i % 2 ? inner : outer) * (1 + (rnd() - 0.5) * jitter);
    const a = (i * Math.PI) / n - Math.PI / 2;
    return `${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`;
  }).join(' ');
}

/** A rolling line of hills or waves, filled down to `bottom`. */
export function ridgePath(width: number, baseY: number, bottom: number, amp: number, waves: number, seed: number, sharp = false): string {
  const rnd = seeded(seed);
  const n = waves * 2;
  let d = `M 0 ${bottom} L 0 ${baseY}`;
  let px = 0;
  let py = baseY;
  for (let i = 1; i <= n; i++) {
    const x = (width * i) / n;
    const y = baseY - (i % 2 ? amp * (0.55 + rnd() * 0.45) : amp * rnd() * 0.25);
    if (sharp) d += ` L ${x.toFixed(0)} ${y.toFixed(0)}`;
    else d += ` Q ${((px + x) / 2).toFixed(0)} ${(i % 2 ? y : py).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)}`;
    px = x;
    py = y;
  }
  return `${d} L ${width} ${bottom} Z`;
}

/** Full-screen scenery box: 1600×900, anchored to the bottom so the ground stays on screen. */
export function Scene({ children, align = 'xMidYMax' }: { children: ReactNode; align?: string }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1600 900"
      preserveAspectRatio={`${align} slice`}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** The coloured field of a card face sits inside this box. */
export const FIELD = { x: 6, y: 6, w: 108, h: 174, rx: 8 };

/** The rounded rectangle of a card back. */
export function BackBase({ edge, fill }: { edge: string; fill: string }) {
  return (
    <>
      <rect width="120" height="186" rx="12" fill={edge} />
      <rect x="5" y="5" width="110" height="176" rx="8.5" fill={fill} />
    </>
  );
}

/** Clip everything to the inside of a card back (the clip path lives in CardDefs). */
export function BackClip({ children }: { children: ReactNode }) {
  return <g clipPath="url(#n-backclip)">{children}</g>;
}

/** Rank helper: picks a title by how many cards are left. */
export function byCards(cards: number, ladder: [number, string][]): string {
  for (const [max, name] of ladder) if (cards <= max) return name;
  return ladder[ladder.length - 1][1];
}
