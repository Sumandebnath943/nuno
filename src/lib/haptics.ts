// A little buzz on phones that support it (Android Chrome). Silently does nothing elsewhere.
import { isMuted } from './sound';

export function buzz(pattern: number | number[]) {
  if (isMuted()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // not supported
  }
}
