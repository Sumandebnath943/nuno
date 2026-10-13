import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { GameView } from '../game/types';
import type { LobbyState } from './protocol';

// ── a browser just big enough for the sessions ───────────────
beforeAll(() => {
  const local = new Map<string, string>();
  const session = new Map<string, string>();
  const storage = (m: Map<string, string>) => ({
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => m.set(k, v),
    removeItem: (k: string) => m.delete(k),
  });
  const noop = () => {};
  Object.assign(globalThis, {
    window: { addEventListener: noop, removeEventListener: noop, matchMedia: () => ({ matches: false }) },
    document: { addEventListener: noop, removeEventListener: noop, hidden: false },
    localStorage: storage(local),
    sessionStorage: storage(session),
    // No relay here: sessions fall back to STUN.
    fetch: () => Promise.reject(new Error('offline')),
  });
});

// ── PeerJS, in memory ─────────────────────────────────────────
// Peers find each other by id through a pretend server, messages arrive async,
// and the server link can drop and come back like it does on a phone.
type Handler = (...args: unknown[]) => void;
class Emitter {
  private handlers = new Map<string, Handler[]>();
  on(ev: string, fn: Handler) {
    this.handlers.set(ev, [...(this.handlers.get(ev) ?? []), fn]);
    return this;
  }
  off(ev: string, fn: Handler) {
    this.handlers.set(
      ev,
      (this.handlers.get(ev) ?? []).filter((f) => f !== fn),
    );
    return this;
  }
  emit(ev: string, ...args: unknown[]) {
    for (const fn of this.handlers.get(ev) ?? []) fn(...args);
  }
}
/** Who the pretend server knows about. */
const server = new Map<string, FakePeer>();
/** Networks that let peers find each other but block the link itself. */
const network = { blocked: false };
let nextId = 0;
class FakeConn extends Emitter {
  open = false;
  other!: FakeConn;
  constructor(readonly peer: string) {
    super();
  }
  send(msg: unknown) {
    const copy = structuredClone(msg);
    queueMicrotask(() => this.other.open && this.other.emit('data', copy));
  }
  close() {
    if (!this.open) return;
    this.open = this.other.open = false;
    queueMicrotask(() => {
      this.emit('close');
      this.other.emit('close');
    });
  }
}
class FakePeer extends Emitter {
  readonly id: string;
  disconnected = false;
  destroyed = false;
  constructor(id?: string | object) {
    super();
    this.id = typeof id === 'string' ? id : `client-${++nextId}`;
    queueMicrotask(() => this.register(true));
  }
  private register(first: boolean) {
    if (this.destroyed) return;
    if (server.has(this.id) && server.get(this.id) !== this) {
      this.emit('error', { type: 'unavailable-id', message: `ID "${this.id}" is taken` });
      if (first) this.destroyed = true;
      else this.drop();
      return;
    }
    server.set(this.id, this);
    this.emit('open', this.id);
  }
  /** The phone cut the link to the server. */
  drop() {
    if (this.disconnected) return;
    this.disconnected = true;
    if (server.get(this.id) === this) server.delete(this.id);
    this.emit('disconnected', this.id);
  }
  disconnect() {
    this.drop();
  }
  reconnect() {
    if (!this.disconnected || this.destroyed) throw new Error('cannot reconnect');
    this.disconnected = false;
    queueMicrotask(() => this.register(false));
  }
  connect(target: string) {
    const mine = new FakeConn(target);
    const theirs = new FakeConn(this.id);
    mine.other = theirs;
    theirs.other = mine;
    queueMicrotask(() => {
      const remote = server.get(target);
      // Like PeerJS: an error on the peer, and the connection just never opens.
      if (!remote) return this.emit('error', { type: 'peer-unavailable', message: `Could not connect to peer ${target}` });
      // Like PeerJS when the link can't be made: the connection reports a failed negotiation.
      if (network.blocked) return mine.emit('error', { type: 'negotiation-failed', message: 'Negotiation of connection failed.' });
      remote.emit('connection', theirs);
      mine.open = theirs.open = true;
      theirs.emit('open');
      mine.emit('open');
    });
    return mine;
  }
  call() {
    return new Emitter();
  }
  destroy() {
    this.destroyed = true;
    if (server.get(this.id) === this) server.delete(this.id);
  }
}
vi.mock('peerjs', () => ({ Peer: FakePeer }));

const { HostSession, ClientSession, rememberedRoom } = await import('./network');
const { getSettings, setRoomTheme, updateSettings } = await import('../lib/settings');

const settle = (ms = 20) => new Promise((r) => setTimeout(r, ms));
const options = { playerCount: 4, targetScore: 0, mode: 'classic' as const, difficulty: 'normal' as const };

function events() {
  const log = {
    lobby: null as LobbyState | null,
    seat: -1,
    view: null as GameView | null,
    errors: [] as string[],
    status: [] as (string | null)[],
    chat: [] as string[],
  };
  return {
    log,
    on: {
      onView: (v: GameView) => (log.view = v),
      onLobby: (l: LobbyState, seat: number) => {
        log.lobby = structuredClone(l);
        log.seat = seat;
      },
      onChat: (m: { text: string }) => log.chat.push(m.text),
      onError: (e: string) => log.errors.push(e),
      onStatus: (s: string | null) => log.status.push(s),
    },
  };
}

const sessions: { destroy: () => void }[] = [];
afterEach(() => {
  sessions.splice(0).forEach((s) => s.destroy());
  setRoomTheme(null);
  server.clear();
  network.blocked = false;
});

async function room(code: string) {
  const h = events();
  const host = new HostSession(code, 'Hosty', '😎', { ...options }, h.on);
  sessions.push(host);
  await settle();
  const c = events();
  const client = new ClientSession(code, 'Friend', '🦊', c.on);
  sessions.push(client);
  await settle();
  return { host, client, h: h.log, c: c.log };
}

/** The guest's connection to the host (to cut it, or to send what their voice chat would). */
const connOf = (client: unknown) => (client as { conn: FakeConn | null }).conn;
/** The host's (or guest's) peer, to cut its link to the server. */
const peerOf = (session: unknown) => (session as { peer: FakePeer }).peer;

describe('online rooms', () => {
  it('everyone in the room plays in the host’s theme, and follows when it changes', async () => {
    updateSettings({ theme: 'naruto' });
    const { c, h } = await room('THEME1');
    expect(c.lobby?.theme).toBe('naruto');
    expect(getSettings().theme).toBe('naruto');
    expect(getSettings().themeLocked).toBe(true);
    // The host's bots dress for their theme.
    expect(h.lobby?.seats.filter((s) => s.kind === 'bot').length).toBe(2);

    // (One process plays both parts here: lift the guest's lock so the host can change theirs.)
    setRoomTheme(null);
    updateSettings({ theme: 'dbz' });
    await settle();
    expect(c.lobby?.theme).toBe('dbz');
    expect(getSettings().theme).toBe('dbz');
  });

  it('a guest can’t change the theme while in the room, and gets theirs back on leaving', async () => {
    updateSettings({ theme: 'mha' });
    const { client } = await room('THEME2');
    updateSettings({ theme: 'aot' }); // the guest tries
    expect(getSettings().theme).toBe('mha');
    client.destroy();
    expect(getSettings().themeLocked).toBe(false);
  });

  it('shuffles the seats when the game starts, keeping friends apart, and tells everyone their seat', async () => {
    const { host, client, h, c } = await room('SEATS1');
    expect(h.lobby?.seats.map((s) => s.kind)).toEqual(['human', 'remote', 'bot', 'bot']);
    host.startGame();
    await settle();
    const seats = c.lobby!.seats;
    const hostSeat = c.lobby!.hostSeat;
    expect(seats[hostSeat].name).toBe('Hosty');
    expect(seats[c.seat].name).toBe('Friend');
    // Two humans at a table of four sit opposite each other.
    expect(Math.abs(hostSeat - c.seat)).toBe(2);
    expect(host.mySeat).toBe(hostSeat);
    expect(client.mySeat).toBe(c.seat);
    // Each side's view is from their own seat.
    expect(h.view?.me).toBe(hostSeat);
    expect(c.view?.me).toBe(c.seat);
    expect(c.view?.players[c.seat].name).toBe('Friend');
  });

  it('shares who has their mic on and who is talking', async () => {
    const { host, client } = await room('VOICE1');
    const guestId = client.voice.getSnapshot().me;
    expect(guestId).toMatch(/^client-/);
    // What the guest's voice chat reports when they start talking.
    connOf(client)!.send({ type: 'voice', mic: true, speaking: true });
    await settle();
    expect(host.voice.getSnapshot().states[guestId]).toEqual({ mic: true, speaking: true });
    expect(client.voice.getSnapshot().states[guestId]).toEqual({ mic: true, speaking: true });
  });

  it('a guest who leaves has their voice state cleared and their seat held for a while', async () => {
    const { host, client, h } = await room('DROP01');
    const guestId = client.voice.getSnapshot().me;
    connOf(client)!.send({ type: 'voice', mic: true, speaking: false });
    await settle();
    client.destroy();
    await settle();
    expect(h.lobby?.seats[1]).toMatchObject({ name: 'Friend', kind: 'remote', away: true });
    expect(host.voice.getSnapshot().states[guestId]).toBeUndefined();
  });
});

describe('dropping out and coming back', () => {
  it('the host switching apps doesn’t kill the room: it reconnects under the same code', async () => {
    const he = events();
    const h = he.log;
    const host = new HostSession('BACK01', 'Hosty', '😎', { ...options }, he.on);
    sessions.push(host);
    await settle();
    // Off to the chat app to share the link: the phone cuts the server link.
    peerOf(host).drop();
    await settle();
    expect(h.status).toContain('reconnecting');
    // …and it comes back by itself, with the same room code.
    await settle(500);
    expect(server.get('nuno-back01-host')).toBe(peerOf(host));
    expect(h.status.at(-1)).toBeNull();
    expect(h.errors).toEqual([]);
    // Friends can join again.
    const ce = events();
    const c = ce.log;
    sessions.push(new ClientSession('BACK01', 'Friend', '🦊', ce.on));
    await settle();
    expect(c.lobby?.seats[c.seat].name).toBe('Friend');
  });

  it('a friend who opens the link while the host is away waits for them instead of failing', async () => {
    const he = events();
    const host = new HostSession('WAIT01', 'Hosty', '😎', { ...options }, he.on);
    sessions.push(host);
    await settle();
    peerOf(host).drop();
    // Keep the host away for a moment (as if still in the chat app).
    const reconnect = peerOf(host).reconnect.bind(peerOf(host));
    peerOf(host).reconnect = () => {};
    const ce = events();
    const c = ce.log;
    sessions.push(new ClientSession('WAIT01', 'Friend', '🦊', ce.on));
    await settle(60);
    expect(c.status).toContain('waiting');
    expect(c.errors).toEqual([]);
    // The host comes back: the friend gets in on the next try.
    peerOf(host).reconnect = reconnect;
    reconnect();
    await settle(1500);
    expect(c.lobby?.seats[c.seat].name).toBe('Friend');
    expect(c.status.at(-1)).toBeNull();
    expect(c.errors).toEqual([]);
  });

  it('a friend who drops out of the lobby gets their seat back', async () => {
    const { client, h, c } = await room('LOBBY1');
    const seat = c.seat;
    connOf(client)!.close(); // they switched apps and the link died
    await settle();
    expect(h.lobby?.seats[seat]).toMatchObject({ kind: 'remote', away: true });
    expect(c.status).toContain('reconnecting');
    await settle(1500);
    expect(c.seat).toBe(seat);
    expect(h.lobby?.seats[seat]).toMatchObject({ name: 'Friend', kind: 'remote' });
    expect(h.lobby?.seats[seat].away).toBeFalsy();
    expect(h.chat.at(-1)).toContain('Friend is back');
    expect(c.errors).toEqual([]);
  });

  it('a friend who drops out mid-game is covered by a bot, then takes their own seat back', async () => {
    const { host, client, h, c } = await room('GAME01');
    host.startGame();
    await settle();
    const seat = c.seat;
    connOf(client)!.close();
    await settle();
    // A bot keeps the game going meanwhile.
    expect(h.lobby?.seats[seat].kind).toBe('bot');
    expect(h.view?.players[seat].kind).toBe('bot');
    await settle(1500);
    expect(c.seat).toBe(seat);
    expect(c.view?.me).toBe(seat);
    expect(h.view?.players[seat].kind).toBe('remote');
    expect(h.lobby?.seats[seat].name).toBe('Friend');
  });

  it('an old connection closing after the player reconnected doesn’t kick them out', async () => {
    const { client, h, c } = await room('DUPE01');
    const first = connOf(client)!;
    // The player reconnects on a fresh connection before the old one is noticed as dead.
    (client as unknown as { conn: FakeConn | null }).conn = null;
    (client as unknown as { connectToHost: () => void }).connectToHost();
    await settle();
    first.close();
    await settle();
    expect(h.lobby?.seats[c.seat]).toMatchObject({ name: 'Friend', kind: 'remote' });
    expect(h.lobby?.seats[c.seat].away).toBeFalsy();
  });

  it('remembers the hosted room so a reloaded page can reopen it, and forgets it on leaving', async () => {
    const he = events();
    const host = new HostSession('KEEP01', 'Hosty', '😎', { ...options }, he.on);
    await settle();
    expect(rememberedRoom()).toMatchObject({ roomId: 'KEEP01', options: { playerCount: 4 } });
    host.updateOptions({ playerCount: 6 });
    expect(rememberedRoom()?.options.playerCount).toBe(6);
    host.destroy();
    expect(rememberedRoom()).toBeNull();
  });

  it('a reopened room waits for its old code to free up instead of giving up', async () => {
    // The old page's registration is still on the server.
    const ghost = new FakePeer('nuno-reop01-host');
    await settle();
    const he = events();
    const h = he.log;
    const host = new HostSession('REOP01', 'Hosty', '😎', { ...options }, he.on, true);
    sessions.push(host);
    await settle();
    expect(h.status).toContain('reopening');
    expect(h.errors).toEqual([]);
    ghost.destroy(); // the server lets the old one go
    await settle(4200);
    expect(server.get('nuno-reop01-host')).toBe(peerOf(host));
    expect(h.errors).toEqual([]);
  });
});

describe('networks that block the link', () => {
  it('a friend whose network blocks the link is told so, not that the host is away', async () => {
    const he = events();
    sessions.push(new HostSession('BLOCK1', 'Hosty', '😎', { ...options }, he.on));
    await settle();
    network.blocked = true;
    const ce = events();
    sessions.push(new ClientSession('BLOCK1', 'Friend', '🦊', ce.on));
    await settle(60);
    expect(ce.log.status).toContain('blocked');
    expect(ce.log.status).not.toContain('waiting');
    expect(ce.log.errors).toEqual([]);
    // Once the networks let them through (say the relay kicks in), they get in.
    network.blocked = false;
    await settle(1500);
    expect(ce.log.lobby?.seats[ce.log.seat].name).toBe('Friend');
  });
});
