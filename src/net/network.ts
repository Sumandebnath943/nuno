import { BOT_PERSONAS, pickPersonas as pickFrom, type BotPersona } from '../game/bot';
import { createGame, toView } from '../game/engine';
import { GameHost, type BotMoment } from '../game/host';
import type { Action, GameView, Intent, SeatConfig } from '../game/types';
import { getSettings, setRoomTheme, subscribeSettings, type ThemeId } from '../lib/settings';
import { botTaunt, findTaunt, THEME_BOTS } from '../lib/taunts';
import { artFor, characterAvatar } from '../themes/characters';
import { iceServers } from './ice';
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
}

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
export class HostSession implements Session {
  readonly isHost = true;
  private peer: Peer | null = null;
  private connections = new Map<number, DataConnection>();
  private host: GameHost | null = null;
  private unsub?: () => void;
  private unsubSettings: () => void;
  private lobby: LobbyState;
  private destroyed = false;
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

  private async initPeer() {
    try {
      const { Peer } = await import('peerjs');
      if (this.destroyed) return;
      const peerId = `nuno-${this.roomId.toLowerCase()}-host`;
      this.peer = new Peer(peerId, {
        debug: 1,
        config: { iceServers: iceServers() },
      });

      this.peer.on('open', (id) => {
        this.lobby.hostPeerId = id;
        this.voice.attach(this.peer!);
        this.broadcastLobby();
        this.events.onConnected?.();
      });

      this.peer.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });

      this.peer.on('error', (err) => {
        if (this.destroyed) return;
        console.warn('PeerJS Host error:', err);
        // A voice link to someone who just left: nothing to tell the player.
        if (err.type === 'peer-unavailable') return;
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

  private handleClientMessage(conn: DataConnection, msg: ClientMessage) {
    if (msg.type === 'join') {
      // Already seated (e.g. a repeated join message): just resend the lobby.
      if (this.getSeatForConnection(conn) !== -1) {
        this.broadcastLobby();
        return;
      }
      // Find open seat
      let assignedSeat = -1;
      for (let i = 0; i < this.lobby.seats.length; i++) {
        if (i === this.lobby.hostSeat) continue;
        if (this.lobby.seats[i].kind === 'bot' || !this.connections.has(i)) {
          assignedSeat = i;
          break;
        }
      }

      if (assignedSeat === -1) {
        // Can we expand player count up to 10?
        if (this.lobby.seats.length < 10 && !this.lobby.inGame) {
          assignedSeat = this.lobby.seats.length;
          this.lobby.seats.push({
            name: msg.name || `Player ${assignedSeat + 1}`,
            avatar: msg.avatar || '🎲',
            kind: 'remote',
            peerId: conn.peer,
          });
          this.lobby.options.playerCount = this.lobby.seats.length;
        } else {
          conn.send({ type: 'error', message: 'Room is full' } as ServerMessage);
          conn.close();
          return;
        }
      }

      this.connections.set(assignedSeat, conn);
      this.lobby.seats[assignedSeat] = {
        name: msg.name || `Player ${assignedSeat + 1}`,
        avatar: msg.avatar || '🎲',
        kind: 'remote',
        peerId: conn.peer,
      };

      // Broadcast system chat
      this.broadcastChat({
        id: newId(),
        sender: 'NUNO',
        avatar: '📢',
        text: `${msg.name} joined the room!`,
        time: Date.now(),
        isSystem: true,
      });

      this.broadcastLobby();
      conn.send({ type: 'voice', states: this.voiceStates } as ServerMessage);

      if (this.lobby.inGame && this.host) {
        // Reconnected during game! Reassign seat in game host
        this.host.setSeatKind(assignedSeat, 'remote', 'Reconnected');
        conn.send({
          type: 'view',
          view: toView(this.host.state, assignedSeat),
        } as ServerMessage);
      }
    } else if (msg.type === 'action') {
      const seat = this.getSeatForConnection(conn);
      if (seat !== -1 && this.host) {
        this.host.dispatch({ ...msg.intent, player: seat } as Action);
      }
    } else if (msg.type === 'taunt') {
      const seat = this.getSeatForConnection(conn);
      if (seat !== -1) this.taunt(seat, msg.id);
    } else if (msg.type === 'voice') {
      if (this.getSeatForConnection(conn) !== -1) this.setVoice(conn.peer, { mic: !!msg.mic, speaking: !!msg.speaking });
    } else if (msg.type === 'chat') {
      const seat = this.getSeatForConnection(conn);
      if (seat !== -1) {
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
  }

  private handleClientDisconnect(conn: DataConnection) {
    const seat = this.getSeatForConnection(conn);
    if (seat !== -1) {
      this.connections.delete(seat);
      const prevName = this.lobby.seats[seat].name;
      // Convert seat to Bot so game doesn't stall
      const bot = pickPersonas(this.lobby.theme, 1, this.lobby.seats.map((x) => x.avatar))[0];
      this.lobby.seats[seat] = {
        name: `${bot.name} (sub)`,
        avatar: bot.avatar,
        kind: 'bot',
      };

      this.broadcastChat({
        id: newId(),
        sender: 'NUNO',
        avatar: '🤖',
        text: `${prevName} disconnected — ${bot.name} took over their seat.`,
        time: Date.now(),
        isSystem: true,
      });

      if (this.host) {
        this.host.setSeatKind(seat, 'bot', 'Replaced disconnected player');
      }
      if (this.voiceStates[conn.peer]) {
        const { [conn.peer]: _gone, ...rest } = this.voiceStates;
        this.voiceStates = rest;
        this.broadcastVoice();
      }
      this.broadcastLobby();
    }
  }

  private getSeatForConnection(conn: DataConnection): number {
    for (const [seat, c] of this.connections.entries()) {
      if (c === conn || c.peer === conn.peer) return seat;
    }
    return -1;
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
   * them, in a random order. Connections follow their players to the new seats.
   */
  private reseat() {
    const order = mixSeats(this.lobby.seats.map((s) => s.kind !== 'bot'));
    const connections = new Map<number, DataConnection>();
    order.forEach((old, seat) => {
      const conn = this.connections.get(old);
      if (conn) connections.set(seat, conn);
    });
    this.lobby.seats = order.map((old) => this.lobby.seats[old]);
    this.lobby.hostSeat = order.indexOf(this.lobby.hostSeat);
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
      if (this.connections.has(index)) {
        this.connections.get(index)?.close();
        this.connections.delete(index);
      }
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
        this.connections.get(lastIndex)?.close();
        this.connections.delete(lastIndex);
        this.lobby.seats.pop();
      }
      this.lobby.options.playerCount = this.lobby.seats.length;
    }
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
export class ClientSession implements Session {
  readonly isHost = false;
  mySeat = -1;
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private destroyed = false;
  readonly voice = new VoiceChat((state) => this.conn?.open && this.conn.send({ type: 'voice', ...state } as ClientMessage));

  constructor(
    public roomId: string,
    private playerName: string,
    private playerAvatar: string,
    private events: SessionEvents,
  ) {
    this.initPeer();
  }

  private async initPeer() {
    try {
      const { Peer } = await import('peerjs');
      // The player may have left while PeerJS was loading.
      if (this.destroyed) return;
      this.peer = new Peer({
        debug: 1,
        config: { iceServers: iceServers() },
      });

      this.peer.on('open', () => {
        const hostPeerId = `nuno-${this.roomId.toLowerCase()}-host`;
        this.voice.attach(this.peer!);
        this.conn = this.peer!.connect(hostPeerId, { reliable: true });

        this.conn.on('open', () => {
          this.events.onConnected?.();
          this.conn!.send({
            type: 'join',
            name: this.playerName,
            avatar: this.playerAvatar,
          } as ClientMessage);
        });

        this.conn.on('data', (raw) => {
          const msg = raw as ServerMessage;
          this.handleServerMessage(msg);
        });

        this.conn.on('close', () => {
          if (this.destroyed) return;
          this.events.onDisconnected?.();
          this.events.onError('Disconnected from host.');
        });

        this.conn.on('error', (err) => {
          if (this.destroyed) return;
          console.warn('Connection error:', err);
          this.events.onError(err.message || 'Connection lost');
        });
      });

      this.peer.on('error', (err) => {
        if (this.destroyed) return;
        console.warn('Client peer error:', err);
        if (err.type === 'peer-unavailable') {
          // Once we're in, this is a voice link to someone who just left.
          if (this.conn?.open) return;
          this.events.onError(`Room "${this.roomId}" not found. Check the room code or ask the host.`);
        } else {
          this.events.onError(err.message || 'Could not connect to multiplayer server');
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Multiplayer init error';
      this.events.onError(msg);
    }
  }

  private handleServerMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'lobby':
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
    this.voice.destroy();
    setRoomTheme(null);
    this.conn?.close();
    this.peer?.destroy();
  }
}
