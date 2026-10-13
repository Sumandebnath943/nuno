import { BOT_PERSONAS, pickPersonas as pickFrom, type BotPersona } from '../game/bot';
import { createGame, toView } from '../game/engine';
import { GameHost, type BotMoment } from '../game/host';
import type { Action, GameView, Intent, SeatConfig } from '../game/types';
import { getSettings, setRoomTheme, subscribeSettings, type ThemeId } from '../lib/settings';
import { botTaunt, findTaunt, THEME_BOTS } from '../lib/taunts';
import { artFor, characterAvatar } from '../themes/characters';
import { getIceServers } from './ice';
import { clientToken, isTransientSignalError, keepSignalling } from './signal';
import { mixSeats } from './seating';
import { VoiceChat } from './voice';
import type { ChatMessage, ClientMessage, LobbySeat, LobbyState, RoomOptions, ServerMessage, VoiceState } from './protocol';

/**
 * Bots dress for the room's theme: that theme's characters come first, then
 * its own nicknames.
 */
function pickPersonas(theme: ThemeId, count: number, exclude: string[] = []): BotPersona[] {
  const chars = artFor(theme)
    .characters.map((c) => ({ name: c.name, avatar: characterAvatar(c) }))
    .filter((c) => !exclude.includes(c.avatar) && !exclude.includes(c.name));
  const fromArt = pickFrom(Math.min(count, chars.length), [], chars);
  const rest = pickFrom(count - fromArt.length, [...exclude, ...fromArt.map((p) => p.avatar)], THEME_BOTS[theme] ?? BOT_PERSONAS);
  return [...fromArt, ...rest];
}

const newId = () => Math.random().toString(36).slice(2);

/** Lets bots trash talk now and then, without flooding the table. Characters say their own lines. */
function botTalker(seatOf: () => { name: string; avatar: string }[], theme: () => ThemeId, say: (msg: ChatMessage) => void) {
  let lastAny = 0;
  const lastBy = new Map<number, number>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const talk = (seat: number, moment: BotMoment, delayMs: number) => {
    const chance = moment === 'win' ? 0.6 : moment === 'hit' || moment === 'attack' ? 0.35 : 0.22;
    const at = Date.now() + delayMs;
    if (Math.random() > chance || at - lastAny < 4500 || at - (lastBy.get(seat) ?? 0) < 12000) return;
    const taunt = botTaunt(moment, theme(), seatOf()[seat]?.avatar);
    if (!taunt) return;
    lastAny = at;
    lastBy.set(seat, at);
    const timer = setTimeout(() => {
      timers.delete(timer);
      const p = seatOf()[seat];
      if (p) say({ id: newId(), sender: p.name, avatar: p.avatar, text: taunt.text, time: Date.now(), seat, taunt: taunt.id });
    }, delayMs + 250);
    timers.add(timer);
  };
  return { talk, stop: () => timers.forEach(clearTimeout) };
}

type Peer = import('peerjs').Peer;
type DataConnection = import('peerjs').DataConnection;

export interface SessionEvents {
  onView: (view: GameView) => void;
  onLobby: (lobby: LobbyState, yourSeat: number) => void;
  onChat: (msg: ChatMessage) => void;
  onError: (err: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  /**
   * Connection trouble that sorts itself out: `reconnecting` (the link dropped,
   * usually because the game was in the background), `waiting` (the host can't
   * be reached yet), `reopening` (a reloaded page getting its room back), `blocked`
   * (the host is there but the networks won't link up). Null when fine.
   */
  onStatus?: (status: ConnStatus | null) => void;
}

export type ConnStatus = 'reconnecting' | 'waiting' | 'reopening' | 'blocked';

export interface Session {
  isHost: boolean;
  mySeat: number;
  sendAction: (intent: Intent) => void;
  sendChat: (text: string) => void;
  /** Fling a ready-made trash-talk line at the table. */
  sendTaunt: (id: string) => void;
  startGame?: () => void;
  updateSeat?: (index: number, kind: 'bot' | 'human') => void;
  updateOptions?: (opts: Partial<RoomOptions>) => void;
  /** Host only: start a brand-new game with the same seats and settings. */
  restart?: () => void;
  /** Online rooms only. */
  voice?: VoiceChat;
  destroy: () => void;
}

/** Everyone's peer id, so voice chat knows who to link with. */
function participants(lobby: LobbyState): string[] {
  return [lobby.hostPeerId, ...lobby.seats.filter((s) => s.kind === 'remote' && s.peerId).map((s) => s.peerId!)].filter(Boolean);
}

// ─────────────────────────────────────────────────────────────
// 1. LOCAL SESSION (Instant, 0 networking, offline capable)
// ─────────────────────────────────────────────────────────────
export class LocalSession implements Session {
  readonly isHost = true;
  readonly mySeat = 0;
  private host: GameHost | null = null;
  private unsub?: () => void;
  private readonly theme = getSettings().theme;
  private talker = botTalker(
    () => this.host?.state.players ?? [],
    () => this.theme,
    (msg) => this.events.onChat(msg),
  );

  constructor(
    private playerName: string,
    private playerAvatar: string,
    private options: RoomOptions,
    private events: SessionEvents,
  ) {
    this.initGame();
  }

  private initGame() {
    const botsNeeded = this.options.playerCount - 1;
    const personas = pickPersonas(this.theme, botsNeeded, [this.playerAvatar]);
    const seats: SeatConfig[] = [
      { name: this.playerName || 'You', avatar: this.playerAvatar || '😎', kind: 'human' },
      ...personas.map((p) => ({ name: p.name, avatar: p.avatar, kind: 'bot' as const })),
    ];

    const state = createGame(seats, this.options.targetScore, this.options.mode);
    this.host = new GameHost(state, this.options.difficulty);
    this.host.onBotMoment = this.talker.talk;
    this.unsub = this.host.subscribe((s) => {
      this.events.onView(toView(s, 0));
    });
  }

  sendAction(intent: Intent) {
    if (!this.host) return;
    this.host.dispatch({ ...intent, player: 0 } as Action);
  }

  restart() {
    if (!this.host) return;
    const seats: SeatConfig[] = this.host.state.players.map((p) => ({ name: p.name, avatar: p.avatar, kind: p.kind }));
    this.host.replace(createGame(seats, this.options.targetScore, this.options.mode));
  }

  sendChat(text: string) {
    const msg: ChatMessage = {
      id: newId(),
      sender: this.playerName,
      avatar: this.playerAvatar,
      text,
      time: Date.now(),
      seat: 0,
    };
    this.events.onChat(msg);
  }

  sendTaunt(id: string) {
    const taunt = findTaunt(id);
    if (!taunt) return;
    this.events.onChat({ id: newId(), sender: this.playerName, avatar: this.playerAvatar, text: taunt.text, time: Date.now(), seat: 0, taunt: id });
  }

  destroy() {
    this.talker.stop();
    this.unsub?.();
    this.host?.destroy();
  }
}

// ─────────────────────────────────────────────────────────────
// 2. HOST SESSION (Authoritative server using WebRTC PeerJS)
// ─────────────────────────────────────────────────────────────

/** How long a lobby seat is held for someone who dropped out (switched apps, lost signal). */
const LOBBY_HOLD_MS = 2 * 60 * 1000;
/** How long a hosted room is remembered, so a reloaded page reopens it. */
const HOSTING_KEY = 'nuno.hosting';

export interface HostedRoom {
  roomId: string;
  options: RoomOptions;
}

/** The room this tab was hosting, if the page was reloaded (phones discard background tabs). */
export function rememberedRoom(): HostedRoom | null {
  try {
    const raw = sessionStorage.getItem(HOSTING_KEY);
    const room = raw ? (JSON.parse(raw) as HostedRoom) : null;
    return room && typeof room.roomId === 'string' && room.options ? room : null;
  } catch {
    return null;
  }
}

function rememberRoom(room: HostedRoom | null) {
  try {
    if (room) sessionStorage.setItem(HOSTING_KEY, JSON.stringify(room));
    else sessionStorage.removeItem(HOSTING_KEY);
  } catch {
    // private mode: no reopening after a reload
  }
}

export class HostSession implements Session {
  readonly isHost = true;
  private peer: Peer | null = null;
  private connections = new Map<number, DataConnection>();
  private host: GameHost | null = null;
  private unsub?: () => void;
  private unsubSettings: () => void;
  private stopSignal?: () => void;
  private lobby: LobbyState;
  private destroyed = false;
  private everOpen = false;
  /** Which player (by their tab's ID) sits where, so someone who drops out gets their seat back. */
  private owners = new Map<string, number>();
  private connOwner = new Map<DataConnection, string>();
  private holdTimers = new Map<number, ReturnType<typeof setTimeout>>();
  /** When each seat last trash talked (simple flood control). */
  private lastTaunt = new Map<number, number>();
  /** Everyone's voice chat state, by peer id. */
  private voiceStates: Record<string, VoiceState> = {};
  private talker = botTalker(
    () => this.host?.state.players ?? [],
    () => this.lobby.theme,
    (msg) => this.broadcastChat(msg),
  );
  readonly voice = new VoiceChat((state) => this.setVoice(this.lobby.hostPeerId, state));

  constructor(
    public roomId: string,
    private playerName: string,
    private playerAvatar: string,
    private options: RoomOptions,
    private events: SessionEvents,
    /** Reopening a room after the page reloaded: wait for the old room code to free up. */
    private reopening = false,
  ) {
    const theme = getSettings().ownTheme;
    this.lobby = {
      roomId,
      hostPeerId: '',
      hostSeat: 0,
      seats: [],
      options: { ...options },
      inGame: false,
      theme,
    };
    this.lobby.seats = this.buildSeats();
    // The host's theme is the room's: follow it when they change it.
    this.unsubSettings = subscribeSettings(() => this.followTheme());
    rememberRoom({ roomId, options: this.lobby.options });
    this.initPeer();
  }

  get mySeat() {
    return this.lobby.hostSeat;
  }

  private buildSeats(): LobbySeat[] {
    const seats: LobbySeat[] = [{ name: this.playerName, avatar: this.playerAvatar, kind: 'human' }];
    const bots = pickPersonas(this.lobby.theme, this.options.playerCount - 1, [this.playerAvatar]);
    for (let i = 1; i < this.options.playerCount; i++) {
      seats.push({
        name: bots[i - 1].name,
        avatar: bots[i - 1].avatar,
        kind: 'bot',
      });
    }
    return seats;
  }

  private followTheme() {
    const theme = getSettings().ownTheme;
    if (theme === this.lobby.theme || this.destroyed) return;
    this.lobby.theme = theme;
    // Before the game, the bots change outfits too.
    if (!this.lobby.inGame) {
      const keep = this.lobby.seats.filter((s) => s.kind !== 'bot').map((s) => s.avatar);
      const bots = pickPersonas(theme, this.lobby.seats.filter((s) => s.kind === 'bot').length, keep);
      let b = 0;
      this.lobby.seats = this.lobby.seats.map((s) => (s.kind === 'bot' ? { name: bots[b].name, avatar: bots[b++].avatar, kind: 'bot' } : s));
    }
    this.broadcastLobby();
  }

  private async initPeer(attempt = 0) {
    try {
      const [{ Peer }, iceServers] = await Promise.all([import('peerjs'), getIceServers()]);
      if (this.destroyed) return;
      const peerId = `nuno-${this.roomId.toLowerCase()}-host`;
      const peer = new Peer(peerId, {
        debug: 1,
        config: { iceServers },
      });
      this.peer = peer;

      peer.on('open', (id) => {
        if (this.peer !== peer || this.destroyed) return;
        this.lobby.hostPeerId = id;
        this.events.onStatus?.(null);
        if (!this.everOpen) {
          this.everOpen = true;
          this.voice.attach(peer);
          // Phones drop the link to PeerJS's server whenever the game goes to the
          // background (sharing the invite is enough). Reconnect with the same
          // room code so the link keeps working.
          this.stopSignal = keepSignalling(peer, (state) => this.events.onStatus?.(state === 'reconnecting' ? 'reconnecting' : null));
          this.events.onConnected?.();
        }
        this.broadcastLobby();
      });

      peer.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });

      peer.on('error', (err) => {
        if (this.destroyed || this.peer !== peer) return;
        console.warn('PeerJS Host error:', err);
        // A voice link to someone who just left: nothing to tell the player.
        if (err.type === 'peer-unavailable') return;
        // The room was open and the server link dropped: keepSignalling is on it.
        if (this.everOpen && isTransientSignalError(err.type)) return;
        // Reopening after a reload: the server may still hold our old room code for up to a minute.
        if (err.type === 'unavailable-id' && this.reopening && attempt < 20) {
          this.events.onStatus?.('reopening');
          setTimeout(() => this.initPeer(attempt + 1), 4000);
          return;
        }
        // Couldn't reach the server at all yet: try again a few times.
        if (!this.everOpen && attempt < 4 && ['network', 'socket-error', 'socket-closed', 'server-error'].includes(err.type)) {
          this.events.onStatus?.('reconnecting');
          setTimeout(() => this.initPeer(attempt + 1), 2000 * (attempt + 1));
          return;
        }
        if (err.type === 'unavailable-id') {
          this.events.onError('Room code already in use. Please choose another code.');
        } else {
          this.events.onError(err.message || 'Network error');
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize peer network';
      this.events.onError(msg);
    }
  }

  private handleIncomingConnection(conn: DataConnection) {
    conn.on('open', () => {
      conn.on('data', (raw) => {
        const data = raw as ClientMessage;
        this.handleClientMessage(conn, data);
      });
    });

    conn.on('close', () => {
      this.handleClientDisconnect(conn);
    });

    conn.on('error', (err) => {
      console.warn('Connection error with peer:', err);
      this.handleClientDisconnect(conn);
    });
  }

  /** The seat this exact connection is using (not an older one from the same player). */
  private seatOf(conn: DataConnection): number {
    for (const [seat, c] of this.connections) if (c === conn) return seat;
    return -1;
  }

  /** Seats someone else is entitled to come back to. */
  private ownedByOther(seat: number, clientId: string): boolean {
    for (const [id, s] of this.owners) if (s === seat && id !== clientId) return true;
    return false;
  }

  private claim(seat: number, clientId: string) {
    for (const [id, s] of this.owners) if (s === seat && id !== clientId) this.owners.delete(id);
    this.owners.set(clientId, seat);
  }

  private release(seat: number) {
    for (const [id, s] of this.owners) if (s === seat) this.owners.delete(id);
    clearTimeout(this.holdTimers.get(seat));
    this.holdTimers.delete(seat);
  }

  /** A free seat for a newcomer: a bot nobody is coming back to, then any bot, then a new seat. */
  private openSeat(clientId: string): number {
    const seats = this.lobby.seats;
    const free = (i: number) => i !== this.lobby.hostSeat && (seats[i].kind === 'bot' || (!this.connections.has(i) && !seats[i].away));
    for (let i = 0; i < seats.length; i++) if (free(i) && !this.ownedByOther(i, clientId)) return i;
    for (let i = 0; i < seats.length; i++) if (free(i)) return i;
    if (seats.length < 10 && !this.lobby.inGame) {
      seats.push({ name: '', avatar: '', kind: 'bot' });
      this.lobby.options.playerCount = seats.length;
      return seats.length - 1;
    }
    return -1;
  }

  private handleJoin(conn: DataConnection, msg: Extract<ClientMessage, { type: 'join' }>) {
    const clientId = typeof msg.clientId === 'string' && msg.clientId ? msg.clientId.slice(0, 64) : `peer:${conn.peer}`;
    const name = String(msg.name || '').slice(0, 20);
    const avatar = String(msg.avatar || '🎲').slice(0, 64);
    this.connOwner.set(conn, clientId);

    // Back after dropping out: the same seat, whether it was held or a bot covered it.
    const known = this.owners.get(clientId);
    const seats = this.lobby.seats;
    const back = known !== undefined && known !== this.lobby.hostSeat && known < seats.length;
    const seat = back ? known : this.openSeat(clientId);
    if (seat === -1) {
      conn.send({ type: 'error', message: 'Room is full' } as ServerMessage);
      setTimeout(() => conn.close(), 300);
      return;
    }

    // The same player on a newer connection: retire the old one.
    const old = this.connections.get(seat);
    this.connections.set(seat, conn);
    if (old && old !== conn) {
      this.connOwner.delete(old);
      old.close();
    }
    this.claim(seat, clientId);
    clearTimeout(this.holdTimers.get(seat));
    this.holdTimers.delete(seat);
    const shownName = name || `Player ${seat + 1}`;
    seats[seat] = { name: shownName, avatar, kind: 'remote', peerId: conn.peer };

    this.broadcastChat({
      id: newId(),
      sender: 'NUNO',
      avatar: '📢',
      text: back ? `${shownName} is back!` : `${shownName} joined the room!`,
      time: Date.now(),
      isSystem: true,
    });
    this.broadcastLobby();
    conn.send({ type: 'voice', states: this.voiceStates } as ServerMessage);

    if (this.lobby.inGame && this.host) {
      if (this.host.state.players[seat]?.kind !== 'remote') this.host.setSeatKind(seat, 'remote', 'Reconnected');
      conn.send({ type: 'view', view: toView(this.host.state, seat) } as ServerMessage);
    }
  }

  private handleClientMessage(conn: DataConnection, msg: ClientMessage) {
    if (msg.type === 'join') {
      this.handleJoin(conn, msg);
      return;
    }
    const seat = this.seatOf(conn);
    if (seat === -1) return;
    if (msg.type === 'action') {
      this.host?.dispatch({ ...msg.intent, player: seat } as Action);
    } else if (msg.type === 'taunt') {
      this.taunt(seat, msg.id);
    } else if (msg.type === 'voice') {
      this.setVoice(conn.peer, { mic: !!msg.mic, speaking: !!msg.speaking });
    } else if (msg.type === 'chat') {
      const p = this.lobby.seats[seat];
      this.broadcastChat({
        id: newId(),
        sender: p.name,
        avatar: p.avatar,
        text: String(msg.text).slice(0, 100),
        time: Date.now(),
        seat,
      });
    }
  }

  private handleClientDisconnect(conn: DataConnection) {
    const seat = this.seatOf(conn);
    // Only the connection currently in a seat counts (a replaced one closing doesn't).
    if (seat === -1) return;
    this.connections.delete(seat);
    this.connOwner.delete(conn);
    const prev = this.lobby.seats[seat];
    if (this.voiceStates[conn.peer]) {
      const { [conn.peer]: _gone, ...rest } = this.voiceStates;
      this.voiceStates = rest;
      this.broadcastVoice();
    }

    if (!this.lobby.inGame) {
      // In the lobby, hold the seat: phones drop out whenever someone switches apps.
      this.lobby.seats[seat] = { ...prev, away: true };
      this.broadcastChat({ id: newId(), sender: 'NUNO', avatar: '📶', text: `${prev.name} lost connection — keeping their seat.`, time: Date.now(), isSystem: true });
      clearTimeout(this.holdTimers.get(seat));
      this.holdTimers.set(
        seat,
        setTimeout(() => {
          this.holdTimers.delete(seat);
          const now = this.lobby.seats[seat];
          if (this.destroyed || this.lobby.inGame || !now?.away || this.connections.has(seat)) return;
          this.benchSeat(seat, `${now.name} didn’t come back — a bot took their seat.`);
        }, LOBBY_HOLD_MS),
      );
      this.broadcastLobby();
      return;
    }

    // In a game the table can't wait: a bot plays for them until they're back.
    this.benchSeat(seat, `${prev.name} dropped out — a bot plays for them until they’re back.`);
    this.host?.setSeatKind(seat, 'bot', 'Replaced disconnected player');
  }

  /** Hands a seat to a bot (its owner can still come back to it). */
  private benchSeat(seat: number, note: string) {
    const bot = pickPersonas(this.lobby.theme, 1, this.lobby.seats.map((x) => x.avatar))[0];
    this.lobby.seats[seat] = { name: `${bot.name} (sub)`, avatar: bot.avatar, kind: 'bot' };
    this.broadcastChat({ id: newId(), sender: 'NUNO', avatar: '🤖', text: note, time: Date.now(), isSystem: true });
    this.broadcastLobby();
  }

  private broadcastLobby() {
    this.events.onLobby({ ...this.lobby }, this.lobby.hostSeat);
    this.voice.setParticipants(participants(this.lobby));
    for (const [seat, conn] of this.connections.entries()) {
      conn.send({
        type: 'lobby',
        state: this.lobby,
        yourSeat: seat,
      } as ServerMessage);
    }
  }

  private broadcastChat(msg: ChatMessage) {
    this.events.onChat(msg);
    for (const conn of this.connections.values()) {
      conn.send({ type: 'chat', message: msg } as ServerMessage);
    }
  }

  private setVoice(peerId: string, state: VoiceState) {
    if (!peerId) return;
    const prev = this.voiceStates[peerId];
    if (prev && prev.mic === state.mic && prev.speaking === state.speaking) return;
    this.voiceStates = { ...this.voiceStates, [peerId]: state };
    this.broadcastVoice();
  }

  private broadcastVoice() {
    this.voice.setStates(this.voiceStates);
    for (const conn of this.connections.values()) conn.send({ type: 'voice', states: this.voiceStates } as ServerMessage);
  }

  /**
   * Shuffles the table for a new game: friends spread out with bots between
   * them, in a random order. Connections (and seat claims) follow their players.
   */
  private reseat() {
    // Anyone still away when the game starts is covered by a bot until they're back.
    this.lobby.seats.forEach((s, i) => {
      if (s.kind === 'remote' && !this.connections.has(i)) {
        clearTimeout(this.holdTimers.get(i));
        this.holdTimers.delete(i);
        const bot = pickPersonas(this.lobby.theme, 1, this.lobby.seats.map((x) => x.avatar))[0];
        this.lobby.seats[i] = { name: `${bot.name} (sub)`, avatar: bot.avatar, kind: 'bot' };
      }
    });
    const order = mixSeats(this.lobby.seats.map((s) => s.kind !== 'bot'));
    const moved = (old: number) => order.indexOf(old);
    const connections = new Map<number, DataConnection>();
    for (const [old, conn] of this.connections) connections.set(moved(old), conn);
    for (const [id, old] of this.owners) this.owners.set(id, moved(old));
    this.lobby.seats = order.map((old) => this.lobby.seats[old]);
    this.lobby.hostSeat = moved(this.lobby.hostSeat);
    this.connections = connections;
    this.lastTaunt.clear();
  }

  private seatConfigs(): SeatConfig[] {
    return this.lobby.seats.map((s) => ({ name: s.name, avatar: s.avatar, kind: s.kind }));
  }

  startGame() {
    if (this.lobby.inGame) return;
    this.lobby.inGame = true;
    this.reseat();

    const state = createGame(this.seatConfigs(), this.lobby.options.targetScore, this.lobby.options.mode);
    this.host = new GameHost(state, this.lobby.options.difficulty);
    this.host.onBotMoment = this.talker.talk;

    this.unsub = this.host.subscribe((s) => {
      // Local view
      this.events.onView(toView(s, this.lobby.hostSeat));
      // Send individual redacted views to each connected client
      for (const [seat, conn] of this.connections.entries()) {
        conn.send({
          type: 'view',
          view: toView(s, seat),
        } as ServerMessage);
      }
    });

    this.broadcastLobby();
  }

  restart() {
    if (!this.host) return;
    // A new game, a new seating plan. Tell everyone their seat before the first view.
    this.reseat();
    this.broadcastLobby();
    this.host.replace(createGame(this.seatConfigs(), this.lobby.options.targetScore, this.lobby.options.mode));
  }

  updateSeat(index: number, kind: 'bot' | 'human') {
    if (this.lobby.inGame || index === this.lobby.hostSeat || index < 0 || index >= this.lobby.seats.length) return;
    if (kind === 'bot') {
      const persona = pickPersonas(this.lobby.theme, 1, this.lobby.seats.map((x) => x.avatar))[0];
      this.lobby.seats[index] = {
        name: persona.name,
        avatar: persona.avatar,
        kind: 'bot',
      };
      // Removed by the host: no seat to come back to.
      this.release(index);
      const conn = this.connections.get(index);
      this.connections.delete(index);
      conn?.close();
    }
    this.broadcastLobby();
  }

  updateOptions(opts: Partial<RoomOptions>) {
    if (this.lobby.inGame) return;
    Object.assign(this.lobby.options, opts);
    // Adjust seats count if playerCount changed
    if (opts.playerCount && opts.playerCount !== this.lobby.seats.length) {
      const target = Math.max(2, Math.min(10, opts.playerCount));
      while (this.lobby.seats.length < target) {
        const bot = pickPersonas(this.lobby.theme, 1, this.lobby.seats.map((x) => x.avatar))[0];
        this.lobby.seats.push({ name: bot.name, avatar: bot.avatar, kind: 'bot' });
      }
      while (this.lobby.seats.length > target) {
        const lastIndex = this.lobby.seats.length - 1;
        if (lastIndex === this.lobby.hostSeat) break;
        this.release(lastIndex);
        const conn = this.connections.get(lastIndex);
        this.connections.delete(lastIndex);
        conn?.close();
        this.lobby.seats.pop();
      }
      this.lobby.options.playerCount = this.lobby.seats.length;
    }
    rememberRoom({ roomId: this.roomId, options: this.lobby.options });
    this.broadcastLobby();
  }

  sendAction(intent: Intent) {
    if (!this.host) return;
    this.host.dispatch({ ...intent, player: this.lobby.hostSeat } as Action);
  }

  sendChat(text: string) {
    this.broadcastChat({
      id: newId(),
      sender: this.playerName,
      avatar: this.playerAvatar,
      text,
      time: Date.now(),
      seat: this.lobby.hostSeat,
    });
  }

  sendTaunt(id: string) {
    this.taunt(this.lobby.hostSeat, id);
  }

  /** Trash talk from a seat: only known lines, and not too often. */
  private taunt(seat: number, id: string) {
    const taunt = findTaunt(id);
    const now = Date.now();
    if (!taunt || now - (this.lastTaunt.get(seat) ?? 0) < 1500) return;
    this.lastTaunt.set(seat, now);
    const p = this.lobby.seats[seat];
    this.broadcastChat({ id: newId(), sender: p.name, avatar: p.avatar, text: taunt.text, time: now, seat, taunt: taunt.id });
  }

  destroy() {
    this.destroyed = true;
    rememberRoom(null);
    this.stopSignal?.();
    this.holdTimers.forEach(clearTimeout);
    this.unsubSettings();
    this.talker.stop();
    this.voice.destroy();
    this.unsub?.();
    this.host?.destroy();
    for (const c of this.connections.values()) c.close();
    this.peer?.destroy();
  }
}

// ─────────────────────────────────────────────────────────────
// 3. CLIENT SESSION (Joins a remote Host)
// ─────────────────────────────────────────────────────────────

/** How long to keep trying to reach the host before giving up. Their phone may just be in the background. */
const GIVE_UP_MS = 150 * 1000;
/** A connection that hasn't opened by now isn't going to. */
const CONNECT_TIMEOUT_MS = 12 * 1000;

export class ClientSession implements Session {
  readonly isHost = false;
  mySeat = -1;
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private destroyed = false;
  /** Got into the room at least once. */
  private joined = false;
  /** When the current spell of not reaching the host began. */
  private troubleSince = 0;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private stopSignal?: () => void;
  private readonly clientId = clientToken();
  readonly voice = new VoiceChat((state) => this.conn?.open && this.conn.send({ type: 'voice', ...state } as ClientMessage));

  constructor(
    public roomId: string,
    private playerName: string,
    private playerAvatar: string,
    private events: SessionEvents,
  ) {
    this.initPeer();
  }

  private get hostId() {
    return `nuno-${this.roomId.toLowerCase()}-host`;
  }

  private async initPeer(attempt = 0) {
    try {
      const [{ Peer }, iceServers] = await Promise.all([import('peerjs'), getIceServers()]);
      // The player may have left while PeerJS was loading.
      if (this.destroyed) return;
      const peer = new Peer({
        debug: 1,
        config: { iceServers },
      });
      this.peer = peer;
      let opened = false;

      peer.on('open', () => {
        if (this.peer !== peer || this.destroyed) return;
        if (!opened) {
          opened = true;
          this.voice.attach(peer);
          this.stopSignal = keepSignalling(peer, () => {});
        }
        // (Re)connected to the server: reach the host if we aren't talking to them.
        if (!this.conn) this.connectToHost();
      });

      peer.on('error', (err) => {
        if (this.destroyed || this.peer !== peer) return;
        console.warn('Client peer error:', err);
        if (err.type === 'peer-unavailable') {
          // The host isn't on the server right now (their game may be in the background): try again shortly.
          if (err.message?.includes(this.hostId) && this.conn && !this.conn.open) {
            const c = this.conn;
            this.conn = null;
            c.close();
            this.retry('away');
          }
          return; // otherwise a voice link to someone who just left
        }
        if (opened && isTransientSignalError(err.type)) return;
        if (!opened && attempt < 4 && ['network', 'socket-error', 'socket-closed', 'server-error'].includes(err.type)) {
          setTimeout(() => this.initPeer(attempt + 1), 2000 * (attempt + 1));
          return;
        }
        this.events.onError(err.message || 'Could not connect to multiplayer server');
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Multiplayer init error';
      this.events.onError(msg);
    }
  }

  private connectToHost() {
    clearTimeout(this.retryTimer);
    const peer = this.peer;
    if (this.destroyed || !peer || peer.destroyed || peer.disconnected) return;
    const conn = peer.connect(this.hostId, { reliable: true });
    this.conn = conn;
    let opened = false;

    conn.on('open', () => {
      if (this.conn !== conn || this.destroyed) return;
      opened = true;
      this.troubleSince = 0;
      this.events.onStatus?.(null);
      this.events.onConnected?.();
      conn.send({ type: 'join', name: this.playerName, avatar: this.playerAvatar, clientId: this.clientId } as ClientMessage);
    });

    conn.on('data', (raw) => {
      if (this.conn === conn) this.handleServerMessage(raw as ServerMessage);
    });

    // The host is on the server but the link itself didn't come up: something
    // between the two networks is blocking it (not the host being away).
    const lost = () => {
      if (this.conn !== conn || this.destroyed) return;
      this.conn = null;
      this.retry(opened ? 'dropped' : 'blocked');
    };
    conn.on('close', lost);
    conn.on('error', (err) => {
      console.warn('Connection error:', err);
      lost();
    });
    setTimeout(() => {
      if (this.conn === conn && !opened) {
        this.conn = null;
        conn.close();
        this.retry('blocked');
      }
    }, CONNECT_TIMEOUT_MS);
  }

  /**
   * Lost the host, or haven't reached them yet: keep trying for a while before
   * giving up. `away`: the host isn't on the server (their game is probably in
   * the background). `blocked`: they are, but the networks won't let us link up.
   */
  private retry(why: 'away' | 'blocked' | 'dropped') {
    clearTimeout(this.retryTimer);
    if (this.destroyed) return;
    const now = Date.now();
    if (!this.troubleSince) this.troubleSince = now;
    if (now - this.troubleSince > GIVE_UP_MS) {
      this.events.onStatus?.(null);
      this.events.onDisconnected?.();
      this.events.onError(
        why === 'blocked'
          ? 'Couldn’t connect to the host’s phone: a network between you is blocking it. Try switching one of you to mobile data or another Wi-Fi.'
          : this.joined
            ? 'Lost the connection to the host.'
            : `Room "${this.roomId}" not found. Check the room code or ask the host.`,
      );
      return;
    }
    this.events.onStatus?.(why === 'blocked' ? 'blocked' : why === 'away' || !this.joined ? 'waiting' : 'reconnecting');
    // Quick at first, then every few seconds.
    const delay = Math.min(5000, 800 + (now - this.troubleSince) / 15);
    this.retryTimer = setTimeout(() => this.connectToHost(), delay);
  }

  private handleServerMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'lobby':
        this.joined = true;
        this.mySeat = msg.yourSeat;
        // The host picks the theme for everyone in the room.
        setRoomTheme(msg.state.theme ?? null);
        this.voice.setParticipants(participants(msg.state));
        this.events.onLobby(msg.state, msg.yourSeat);
        break;
      case 'view':
        this.events.onView(msg.view);
        break;
      case 'chat':
        this.events.onChat(msg.message);
        break;
      case 'voice':
        this.voice.setStates(msg.states);
        break;
      case 'error':
        this.events.onError(msg.message);
        break;
    }
  }

  sendAction(intent: Intent) {
    this.conn?.send({ type: 'action', intent } as ClientMessage);
  }

  sendChat(text: string) {
    this.conn?.send({ type: 'chat', text } as ClientMessage);
  }

  sendTaunt(id: string) {
    this.conn?.send({ type: 'taunt', id } as ClientMessage);
  }

  destroy() {
    this.destroyed = true;
    clearTimeout(this.retryTimer);
    this.stopSignal?.();
    this.voice.destroy();
    setRoomTheme(null);
    this.conn?.close();
    this.peer?.destroy();
  }
}
