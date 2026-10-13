/**
 * Shares a room's invite link. Phones get the system share sheet (straight into
 * WhatsApp, Messages…); elsewhere the link is copied.
 */
export async function shareInvite(roomId: string): Promise<'shared' | 'copied' | 'failed'> {
  const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
  const touch = window.matchMedia?.('(hover: none)').matches;
  if (touch && navigator.share) {
    try {
      await navigator.share({ title: 'NUNO', text: `Come play NUNO with me! Room ${roomId}`, url });
      return 'shared';
    } catch (err) {
      // Closing the share sheet isn't a failure; anything else falls back to copying.
      if (err instanceof DOMException && err.name === 'AbortError') return 'failed';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
