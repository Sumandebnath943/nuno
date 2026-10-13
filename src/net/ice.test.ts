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
