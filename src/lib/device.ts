import { useEffect, useState } from 'react';

function media(query: string): boolean {
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

/** True on touch screens without a hovering pointer (phones, tablets). */
export function useIsTouch(): boolean {
  const [touch, setTouch] = useState(() => media('(hover: none)'));
  useEffect(() => {
    const mq = window.matchMedia?.('(hover: none)');
    if (!mq) return;
    const update = () => setTouch(mq.matches);
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return touch;
}

/** The notch / home-indicator insets (iPhone and friends), in px. */
export function useSafeArea(): { top: number; bottom: number } {
  const [insets, setInsets] = useState({ top: 0, bottom: 0 });
  useEffect(() => {
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);';
    document.body.appendChild(probe);
    const read = () => {
      const cs = getComputedStyle(probe);
      setInsets({ top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 });
    };
    read();
    window.addEventListener('resize', read);
    return () => {
      window.removeEventListener('resize', read);
      probe.remove();
    };
  }, []);
  return insets;
}

/**
 * Keeps the screen awake while `active` (online play). A phone that dims and
 * locks while you wait for your turn drops out of the room. Browsers release
 * the lock whenever the page is hidden, so it's taken again on return.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } };
    if (!active || !nav.wakeLock) return;
    let lock: { release: () => Promise<void> } | null = null;
    let stopped = false;
    const take = () => {
      if (stopped || document.hidden) return;
      nav.wakeLock!.request('screen').then(
        (l) => {
          if (stopped) void l.release().catch(() => {});
          else lock = l;
        },
        () => {}, // not allowed (battery saver, no permission): carry on without it
      );
    };
    take();
    document.addEventListener('visibilitychange', take);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', take);
      void lock?.release().catch(() => {});
    };
  }, [active]);
}
