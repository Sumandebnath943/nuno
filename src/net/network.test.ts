import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { GameView } from '../game/types';
import type { LobbyState } from './protocol';

// ── a browser just big enough for the sessions ───────────────
beforeAll(() => {
  const store = new Map<string, string>();
  const noop = () => {};
  Object.assign(globalThis, {
    window: { addEventListener: noop, removeEventListener: noop, matchMedia: () => ({ matches: false }) },
    document: { addEventListener: noop, hidden: false },
    localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) },
  });
});

// ── PeerJS, in memory: peers find each other by id and messages are delivered async ──
type Handler = (...args: unknown[]) => void;
class Emitter {
  private handlers = new Map<string, Handler[]>();
  on(ev: string, fn: Handler) {
    this.handlers.set(ev, [...(this.handlers.get(ev) ?? []), fn]);
    return this;
  }
  emit(ev: string, ...args: unknown[]) {
    for (const fn of this.handlers.get(ev) ?? []) fn(...args);
  }
}
const peers = new Map<string, FakePeer>();
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
  constructor(id?: string | object) {
    super();
    this.id = typeof id === 'string' ? id : `client-${++nextId}`;
    peers.set(this.id, this);
    queueMicrotask(() => this.emit('open', this.id));
  }
  connect(target: string) {
    const mine = new FakeConn(target);
    const theirs = new FakeConn(this.id);
    mine.other = theirs;
    theirs.other = mine;
    queueMicrotask(() => {
      const remote = peers.get(target);
      if (!remote) return this.emit('error', { type: 'peer-unavailable', message: 'nope' });
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
    peers.delete(this.id);
  }
}
vi.mock('peerjs', () => ({ Peer: FakePeer }));

const { HostSession, ClientSession } = await import('./network');
const { getSettings, setRoomTheme, updateSettings } = await import('../lib/settings');

const settle = () => new Promise((r) => setTimeout(r, 20));
const options = { playerCount: 4, targetScore: 0, mode: 'classic' as const, difficulty: 'normal' as const };

function events() {
  const log = { lobby: null as LobbyState | null, seat: -1, view: null as GameView | null, errors: [] as string[] };
  return {
    log,
    on: {
      onView: (v: GameView) => (log.view = v),
      onLobby: (l: LobbyState, seat: number) => {
        log.lobby = structuredClone(l);
        log.seat = seat;
      },
      onChat: () => {},
      onError: (e: string) => log.errors.push(e),
    },
  };
}

const sessions: { destroy: () => void }[] = [];
afterEach(() => {
  sessions.splice(0).forEach((s) => s.destroy());
  setRoomTheme(null);
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
    (client as unknown as { conn: { send: (m: unknown) => void } }).conn.send({ type: 'voice', mic: true, speaking: true });
    await settle();
    expect(host.voice.getSnapshot().states[guestId]).toEqual({ mic: true, speaking: true });
    expect(client.voice.getSnapshot().states[guestId]).toEqual({ mic: true, speaking: true });
  });

  it('a guest who drops out is replaced by a bot and their voice state is cleared', async () => {
    const { host, client, h } = await room('DROP01');
    const guestId = client.voice.getSnapshot().me;
    (client as unknown as { conn: { send: (m: unknown) => void } }).conn.send({ type: 'voice', mic: true, speaking: false });
    await settle();
    client.destroy();
    await settle();
    expect(h.lobby?.seats.filter((s) => s.kind === 'remote')).toHaveLength(0);
    expect(host.voice.getSnapshot().states[guestId]).toBeUndefined();
  });
});
