// Keeps a peer reachable. Players find each other through PeerJS's server (a
// directory of room codes). Phones drop that link whenever the game goes to
// the background — switching to a chat app to share the invite is enough — and
// PeerJS doesn't come back by itself. This reconnects with the same ID, so the
// room code keeps working, and retries until it gets through.

type Peer = import('peerjs').Peer;

export type SignalState = 'online' | 'reconnecting';

/** After this long in the background, the link may be dead without anyone noticing: renew it. */
const STALE_AFTER_MS = 8000;

export function keepSignalling(peer: Peer, onState: (state: SignalState) => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let attempts = 0;
  let hiddenAt = 0;
  let stopped = false;

  const attempt = () => {
    clearTimeout(timer);
    if (stopped || peer.destroyed || !peer.disconnected) return;
    onState('reconnecting');
    try {
      peer.reconnect();
    } catch {
      // not in a state to reconnect yet; the next check tries again
    }
    attempts++;
    // Check back with growing gaps (1s, 2s, 4s… up to 15s). If the server
    // still holds our old ID, it lets go within a minute.
    timer = setTimeout(attempt, Math.min(15000, 1000 * 2 ** Math.min(attempts, 4)));
  };

  const soon = (ms = 300) => {
    clearTimeout(timer);
    timer = setTimeout(attempt, ms);
  };

  const onDisconnected = () => {
    if (stopped) return;
    onState('reconnecting');
    soon();
  };
  const onOpen = () => {
    attempts = 0;
    clearTimeout(timer);
    if (!stopped) onState('online');
  };
  const onVisibility = () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      return;
    }
    const away = hiddenAt ? Date.now() - hiddenAt : 0;
    hiddenAt = 0;
    if (stopped || peer.destroyed) return;
    attempts = 0;
    if (peer.disconnected) soon(50);
    // Back after a while: the phone may have cut the link without telling the
    // page. Start a fresh one (connections to other players stay up).
    else if (away > STALE_AFTER_MS) peer.disconnect();
  };
  const onOnline = () => {
    attempts = 0;
    if (peer.disconnected) soon(50);
  };

  peer.on('disconnected', onDisconnected);
  peer.on('open', onOpen);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('online', onOnline);

  return () => {
    stopped = true;
    clearTimeout(timer);
    peer.off('disconnected', onDisconnected);
    peer.off('open', onOpen);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('online', onOnline);
  };
}

/** Errors that only mean the link to PeerJS's server dropped for a moment. */
export function isTransientSignalError(type: string): boolean {
  return ['network', 'socket-error', 'socket-closed', 'server-error', 'disconnected', 'unavailable-id'].includes(type);
}

/** One ID per browser tab, so a player who drops out gets their own seat back. */
export function clientToken(): string {
  const KEY = 'nuno.clientId';
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}
