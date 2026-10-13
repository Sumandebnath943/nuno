// Sizes text to fit a width: long names shrink a little before they're cut
// off, and big splash words never run off a phone screen. Text is measured
// once per string and font with a canvas, so it costs nothing per frame.
import { useEffect, useState } from 'react';

let ctx: CanvasRenderingContext2D | null = null;
const widths = new Map<string, number>();
const families = new Map<string, string>();

/** The font stack a CSS variable (`--font-ui`) currently resolves to. */
export function fontOf(cssVar: string): string {
  let f = families.get(cssVar);
  if (f === undefined) {
    const root = document.documentElement;
    f = getComputedStyle(root).getPropertyValue(cssVar).trim();
    // Variables that point at other variables (`var(--font-display)`).
    const inner = /^var\((--[\w-]+)\)$/.exec(f);
    if (inner) f = getComputedStyle(root).getPropertyValue(inner[1]).trim();
    f ||= 'system-ui, sans-serif';
    families.set(cssVar, f);
  }
  return f;
}

/** A number from a CSS variable (`--dfs`), or 1. */
export function scaleOf(cssVar: string): number {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(cssVar));
  return Number.isFinite(v) && v > 0 ? v : 1;
}

/** Width of `text` at 100px in a font stack. */
export function textWidth(text: string, family: string, weight = 400): number {
  const key = `${weight}|${family}|${text}`;
  let w = widths.get(key);
  if (w === undefined) {
    ctx ??= document.createElement('canvas').getContext('2d');
    if (!ctx) return text.length * 60;
    ctx.font = `${weight} 100px ${family}`;
    w = ctx.measureText(text).width;
    widths.set(key, w);
  }
  return w;
}

/**
 * The largest font size (px, between min and max) at which `text` fits in
 * `maxWidth`. `extra` is width that doesn't scale with the text (outlines).
 */
export function fitFontSize(
  text: string,
  maxWidth: number,
  { max, min, font = '--font-ui', extra = 0, spacing = 0.02, weight = 400 }: { max: number; min: number; font?: string; extra?: number; spacing?: number; weight?: number },
): number {
  const per100 = textWidth(text, fontOf(font), weight) + spacing * 100 * text.length;
  if (per100 <= 0) return max;
  const px = ((maxWidth - extra) / per100) * 100;
  return Math.max(min, Math.min(max, px));
}

let version = 0;
const subscribers = new Set<(v: number) => void>();

function invalidate() {
  widths.clear();
  families.clear();
  version++;
  subscribers.forEach((fn) => fn(version));
}

if (typeof document !== 'undefined') {
  // Web fonts arrive after the first paint, and themes swap fonts: measure again.
  document.fonts?.addEventListener?.('loadingdone', invalidate);
  new MutationObserver(invalidate).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

/** Re-renders the caller when fonts load or the theme changes, so fitted sizes stay right. */
export function useFontMetrics(): number {
  const [v, setV] = useState(version);
  useEffect(() => {
    subscribers.add(setV);
    return () => {
      subscribers.delete(setV);
    };
  }, []);
  return v;
}
