// How peers find a route to each other. STUN is enough on most home Wi-Fi.
// Phones on mobile data often sit behind carrier NAT, where only a TURN relay
// gets through: set VITE_TURN_URLS / VITE_TURN_USERNAME / VITE_TURN_CREDENTIAL
// (for example in Vercel's environment variables) to add one.

export function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
  ];
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
