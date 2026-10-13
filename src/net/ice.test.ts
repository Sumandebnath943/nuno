import { afterEach, describe, expect, it, vi } from 'vitest';

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 201, headers: { 'Content-Type': 'application/json' } });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('the /api/ice function', () => {
  it('answers with an empty list until it is set up', async () => {
    vi.stubEnv('CLOUDFLARE_TURN_KEY_ID', '');
    vi.stubEnv('CLOUDFLARE_TURN_API_TOKEN', '');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { GET } = await import('../../api/ice');
    const res = await GET();
    expect(await res.json()).toEqual({ iceServers: [], configured: false });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('asks Cloudflare for short-lived credentials and drops the port browsers block', async () => {
    vi.stubEnv('CLOUDFLARE_TURN_KEY_ID', 'key123');
    vi.stubEnv('CLOUDFLARE_TURN_API_TOKEN', 'secret');
    const fetch = vi.fn().mockResolvedValue(
      ok({
        iceServers: [
          { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] },
          {
            urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turn:turn.cloudflare.com:53?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'],
            username: 'u',
            credential: 'c',
          },
          { urls: ['turn:turn.cloudflare.com:53'] },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetch);
    const { GET } = await import('../../api/ice');
    const res = await GET();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://rtc.live.cloudflare.com/v1/turn/keys/key123/credentials/generate-ice-servers');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer secret');
    expect(JSON.parse(init.body).ttl).toBeGreaterThanOrEqual(3600);
    const body = await res.json();
    expect(body.iceServers).toEqual([
      { urls: ['stun:stun.cloudflare.com:3478'] },
      { urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'u', credential: 'c' },
    ]);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('reports a Cloudflare failure without leaking anything', async () => {
    vi.stubEnv('CLOUDFLARE_TURN_KEY_ID', 'key123');
    vi.stubEnv('CLOUDFLARE_TURN_API_TOKEN', 'secret');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 401 })));
    const { GET } = await import('../../api/ice');
    const res = await GET();
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('secret');
  });
});

describe('the game’s ICE servers', () => {
  it('adds the relay from /api/ice after STUN, and reuses it', async () => {
    const relay = { urls: ['turns:turn.cloudflare.com:443?transport=tcp'], username: 'u', credential: 'c' };
    const fetch = vi.fn().mockResolvedValue(ok({ iceServers: [relay], ttl: 21600 }));
    vi.stubGlobal('fetch', fetch);
    const { getIceServers } = await import('./ice');
    const servers = await getIceServers();
    expect(servers[0].urls).toContain('stun:stun.l.google.com:19302');
    expect(servers).toContainEqual(relay);
    await getIceServers();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to STUN when the relay isn’t available (local dev, offline)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { getIceServers } = await import('./ice');
    const servers = await getIceServers();
    expect(servers).toHaveLength(1);
    expect(servers[0].urls).toContain('stun:stun.l.google.com:19302');
  });

  it('ignores a page that isn’t JSON (the dev server answers /api/ice with the app)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<!doctype html>', { status: 200, headers: { 'Content-Type': 'text/html' } })));
    const { getIceServers } = await import('./ice');
    expect(await getIceServers()).toHaveLength(1);
  });
});

describe('the relay check in Settings', () => {
  /** A stand-in for the browser's RTCPeerConnection that reports the candidates we hand it. */
  function fakePeerConnection(candidates: { type: string; candidate: string }[], configs: RTCConfiguration[]) {
    return class {
      onicecandidate: ((e: { candidate: unknown }) => void) | null = null;
      constructor(config: RTCConfiguration) {
        configs.push(config);
      }
      createDataChannel() {}
      async createOffer() {
        return {};
      }
      async setLocalDescription() {
        for (const c of candidates) this.onicecandidate?.({ candidate: c });
        this.onicecandidate?.({ candidate: null });
      }
      close() {}
    };
  }

  it('says off when no relay is set up', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { checkRelay } = await import('./ice');
    expect(await checkRelay()).toBe('off');
  });

  it('says working when the relay hands out an address', async () => {
    vi.stubEnv('VITE_TURN_URLS', 'turn:relay.example:3478');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const configs: RTCConfiguration[] = [];
    vi.stubGlobal('RTCPeerConnection', fakePeerConnection([{ type: 'relay', candidate: 'candidate:1 1 udp 1 1.2.3.4 5000 typ relay raddr 0.0.0.0 rport 0' }], configs));
    const { checkRelay } = await import('./ice');
    expect(await checkRelay()).toBe('working');
    // Only the relay is asked (not STUN, not a direct link).
    expect(configs[0].iceTransportPolicy).toBe('relay');
    expect(JSON.stringify(configs[0].iceServers)).not.toContain('stun:');
  });

  it('says not answering when the relay gives nothing back (wrong password, blocked port)', async () => {
    vi.stubEnv('VITE_TURN_URLS', 'turn:relay.example:3478');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    vi.stubGlobal('RTCPeerConnection', fakePeerConnection([], []));
    const { checkRelay } = await import('./ice');
    expect(await checkRelay()).toBe('unreachable');
  });
});
