// How peers find a route to each other. STUN is enough on most home Wi-Fi.
// Phones on mobile data often sit behind carrier NAT, where only a TURN relay
// gets through. Relay credentials come from our own /api/ice function
// (Cloudflare Realtime TURN, see api/ice.ts), or from fixed VITE_TURN_URLS /
// VITE_TURN_USERNAME / VITE_TURN_CREDENTIAL settings if you'd rather use
// another provider.

const STUN: RTCIceServer = { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] };

/** STUN plus any relay fixed at build time. */
function staticServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [STUN];
  const turn = import.meta.env.VITE_TURN_URLS;
  if (turn) {
    servers.push({
      urls: turn
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean),
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL,
    });
  }
  return servers;
}

const isServer = (s: unknown): s is RTCIceServer =>
  !!s && typeof s === 'object' && (typeof (s as RTCIceServer).urls === 'string' || Array.isArray((s as RTCIceServer).urls));

/** Short-lived relay credentials from /api/ice, or nothing (local dev, not set up, offline). */
async function fetchRelay(): Promise<{ servers: RTCIceServer[]; ttl: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch('/api/ice', { cache: 'no-store', signal: ctrl.signal });
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return { servers: [], ttl: 0 };
    const data = (await res.json()) as { iceServers?: unknown[]; ttl?: number };
    return { servers: (data.iceServers ?? []).filter(isServer), ttl: Number(data.ttl) || 0 };
  } catch {
    return { servers: [], ttl: 0 };
  } finally {
    clearTimeout(timer);
  }
}

let cached: { servers: RTCIceServer[]; until: number } | null = null;
let pending: Promise<RTCIceServer[]> | null = null;

/** Every route to try: STUN, then the relay. Credentials are reused until shortly before they expire. */
export function getIceServers(): Promise<RTCIceServer[]> {
  if (cached && cached.until > Date.now()) return Promise.resolve(cached.servers);
  pending ??= fetchRelay().then(({ servers: relay, ttl }) => {
    const servers = [...staticServers(), ...relay];
    // Keep good credentials until an hour before they run out; retry a failed fetch soon.
    const keep = relay.length && ttl > 3600 ? (ttl - 3600) * 1000 : 60_000;
    cached = { servers, until: Date.now() + keep };
    pending = null;
    return servers;
  });
  return pending;
}

/** Fetches the relay credentials ahead of time, so creating or joining a room doesn't wait. */
export function prefetchIceServers() {
  void getIceServers();
}

export type RelayStatus = 'working' | 'unreachable' | 'off';

const urlsOf = (s: RTCIceServer) => (Array.isArray(s.urls) ? s.urls : [s.urls]);
let relayCheck: Promise<RelayStatus> | null = null;

/**
 * Is a relay set up, and does it answer from this network? Asks it for a
 * relayed address (what a call would use when a direct link fails). Checked
 * once per visit; `fresh` checks again.
 */
export function checkRelay(fresh = false, timeoutMs = 7000): Promise<RelayStatus> {
  if (relayCheck && !fresh) return relayCheck;
  relayCheck = (async (): Promise<RelayStatus> => {
    const relays = (await getIceServers()).filter((s) => urlsOf(s).some((u) => /^turns?:/.test(u)));
    if (!relays.length) return 'off';
    if (typeof RTCPeerConnection === 'undefined') return 'unreachable';
    let pc: RTCPeerConnection;
    try {
      pc = new RTCPeerConnection({ iceServers: relays, iceTransportPolicy: 'relay' });
    } catch {
      return 'unreachable';
    }
    return new Promise<RelayStatus>((resolve) => {
      let done = false;
      const finish = (status: RelayStatus) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try {
          pc.close();
        } catch {
          // already closed
        }
        resolve(status);
      };
      const timer = setTimeout(() => finish('unreachable'), timeoutMs);
      pc.onicecandidate = (e) => {
        // A relayed address means the relay let us in; the end of the list without one means it didn't.
        if (e.candidate) {
          if (e.candidate.type === 'relay' || / typ relay /.test(e.candidate.candidate)) finish('working');
        } else finish('unreachable');
      };
      pc.createDataChannel('relay-check');
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => finish('unreachable'));
    });
  })();
  return relayCheck;
}
