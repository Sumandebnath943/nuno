// Vercel function: GET /api/ice
//
// Hands out short-lived TURN relay credentials from Cloudflare Realtime, so
// phones on mobile data (behind carrier NAT) can still reach each other. The
// API token never leaves the server; each player gets credentials that expire.
//
// Needs two environment variables in Vercel (Settings → Environment Variables):
//   CLOUDFLARE_TURN_KEY_ID     the TURN key's ID
//   CLOUDFLARE_TURN_API_TOKEN  the TURN key's API token
// Without them it answers with an empty list and the game uses STUN only.

declare const process: { env: Record<string, string | undefined> };

interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/** How long the credentials work, in seconds: a long game night. */
const TTL = 6 * 60 * 60;

/** Drops relay addresses browsers can't use (port 53 is blocked by browsers) and empty entries. */
function cleanIceServers(servers: IceServer[]): IceServer[] {
  return servers
    .map((s) => ({ ...s, urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => typeof u === 'string' && !/:53(\?|$)/.test(u)) }))
    .filter((s) => s.urls.length > 0);
}

function json(body: unknown, status = 200, cache = 'no-store'): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache } });
}

export async function GET(): Promise<Response> {
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
  const token = process.env.CLOUDFLARE_TURN_API_TOKEN;
  if (!keyId || !token) return json({ iceServers: [], configured: false });
  try {
    const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: TTL }),
    });
    if (!res.ok) return json({ iceServers: [], error: `Cloudflare answered ${res.status}` }, 502);
    const data = (await res.json()) as { iceServers?: IceServer[] };
    return json({ iceServers: cleanIceServers(data.iceServers ?? []), ttl: TTL });
  } catch {
    return json({ iceServers: [], error: 'Could not reach Cloudflare' }, 502);
  }
}
