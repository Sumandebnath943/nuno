import { pickPersonas } from '../game/bot';
import { createGame, toView } from '../game/engine';
import { GameHost } from '../game/host';
import type { Action, GameView, Intent, SeatConfig } from '../game/types';
import type { ChatMessage, ClientMessage, LobbySeat, LobbyState, RoomOptions, ServerMessage } from './protocol';

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
  startGame?: () => void;
  updateSeat?: (index: number, kind: 'bot' | 'human') => void;
  updateOptions?: (opts: Partial<RoomOptions>) => void;
  destroy: () => void;
}

// ─────────────────────────────────────────────────────────────
// 1. LOCAL SESSION (Instant, 0 networking, offline capable)
// ─────────────────────────────────────────────────────────────
export class LocalSession implements Session {
  readonly isHost = true;
  readonly mySeat = 0;
  private host: GameHost | null = null;
  private unsub?: () => void;

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
    const personas = pickPersonas(botsNeeded, [this.playerAvatar]);
    const seats: SeatConfig[] = [
      { name: this.playerName || 'You', avatar: this.playerAvatar || '😎', kind: 'human' },
      ...personas.map((p) => ({ name: p.name, avatar: p.avatar, kind: 'bot' as const })),
    ];

    const state = createGame(seats, this.options.targetScore);
    this.host = new GameHost(state, this.options.difficulty);
    this.unsub = this.host.subscribe((s) => {
      this.events.onView(toView(s, 0));
    });
  }

  sendAction(intent: Intent) {
    if (!this.host) return;
    this.host.dispatch({ ...intent, player: 0 } as Action);
  }

  sendChat(text: string) {
    const msg: ChatMessage = {
      id: Math.random().toString(36).slice(2),
      sender: this.playerName,
      avatar: this.playerAvatar,
      text,
      time: Date.now(),
    };
    this.events.onChat(msg);
  }

  destroy() {
    this.unsub?.();
    this.host?.destroy();
  }
}

// ─────────────────────────────────────────────────────────────
// 2. HOST SESSION (Authoritative server using WebRTC PeerJS)
// ─────────────────────────────────────────────────────────────
export class HostSession implements Session {
  readonly isHost = true;
  readonly mySeat = 0;
  private peer: Peer | null = null;
  private connections = new Map<number, DataConnection>();
  private host: GameHost | null = null;
  private unsub?: () => void;
  private lobby: LobbyState;

  constructor(
    public roomId: string,
    private playerName: string,
    private playerAvatar: string,
    private options: RoomOptions,
    private events: SessionEvents,
  ) {
    this.lobby = {
      roomId,
      hostPeerId: '',
      seats: this.buildSeats(),
      options: { ...options },
      inGame: false,
    };
    this.initPeer();
  }

  private buildSeats(): LobbySeat[] {
    const seats: LobbySeat[] = [
      { name: this.playerName, avatar: this.playerAvatar, kind: 'human' },
    ];
    const bots = pickPersonas(this.options.playerCount - 1, [this.playerAvatar]);
    for (let i = 1; i < this.options.playerCount; i++) {
      seats.push({
        name: bots[i - 1].name,
        avatar: bots[i - 1].avatar,
        kind: 'bot',
      });
    }
    return seats;
  }

  private async initPeer() {
    try {
      const { Peer } = await import('peerjs');
      const peerId = `nuno-${this.roomId.toLowerCase()}-host`;
      this.peer = new Peer(peerId, { debug: 1 });

      this.peer.on('open', (id) => {
        this.lobby.hostPeerId = id;
        this.broadcastLobby();
        this.events.onConnected?.();
      });

      this.peer.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.warn('PeerJS Host error:', err);
        // If host ID is taken, notify user
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
      // Find open seat
      let assignedSeat = -1;
      for (let i = 1; i < this.lobby.seats.length; i++) {
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
        id: Math.random().toString(36).slice(2),
        sender: 'NUNO',
        avatar: '📢',
        text: `${msg.name} joined the room!`,
        time: Date.now(),
        isSystem: true,
      });

      this.broadcastLobby();

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
    } else if (msg.type === 'chat') {
      const seat = this.getSeatForConnection(conn);
      if (seat !== -1) {
        const p = this.lobby.seats[seat];
        this.broadcastChat({
          id: Math.random().toString(36).slice(2),
          sender: p.name,
          avatar: p.avatar,
          text: msg.text,
          time: Date.now(),
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
      const bot = pickPersonas(1)[0];
      this.lobby.seats[seat] = {
        name: `${bot.name} (sub)`,
        avatar: bot.avatar,
        kind: 'bot',
      };

      this.broadcastChat({
        id: Math.random().toString(36).slice(2),
        sender: 'NUNO',
        avatar: '🤖',
        text: `${prevName} disconnected — ${bot.name} took over their seat.`,
        time: Date.now(),
        isSystem: true,
      });

      if (this.host) {
        this.host.setSeatKind(seat, 'bot', 'Replaced disconnected player');
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
    this.events.onLobby({ ...this.lobby }, 0);
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

  startGame() {
    if (this.lobby.inGame) return;
    this.lobby.inGame = true;

    const seats: SeatConfig[] = this.lobby.seats.map((s) => ({
      name: s.name,
      avatar: s.avatar,
      kind: s.kind,
    }));

    const state = createGame(seats, this.lobby.options.targetScore);
    this.host = new GameHost(state, this.lobby.options.difficulty);

    this.unsub = this.host.subscribe((s) => {
      // Local view
      this.events.onView(toView(s, 0));
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

  updateSeat(index: number, kind: 'bot' | 'human') {
    if (this.lobby.inGame || index <= 0 || index >= this.lobby.seats.length) return;
    if (kind === 'bot') {
      const persona = pickPersonas(1)[0];
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
        const bot = pickPersonas(1)[0];
        this.lobby.seats.push({ name: bot.name, avatar: bot.avatar, kind: 'bot' });
      }
      while (this.lobby.seats.length > target) {
        const lastIndex = this.lobby.seats.length - 1;
        this.connections.get(lastIndex)?.close();
        this.connections.delete(lastIndex);
        this.lobby.seats.pop();
      }
      this.lobby.options.playerCount = target;
    }
    this.broadcastLobby();
  }

  sendAction(intent: Intent) {
    if (!this.host) return;
    this.host.dispatch({ ...intent, player: 0 } as Action);
  }

  sendChat(text: string) {
    this.broadcastChat({
      id: Math.random().toString(36).slice(2),
      sender: this.playerName,
      avatar: this.playerAvatar,
      text,
      time: Date.now(),
    });
  }

  destroy() {
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
      this.peer = new Peer({ debug: 1 });

      this.peer.on('open', () => {
        const hostPeerId = `nuno-${this.roomId.toLowerCase()}-host`;
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
          this.events.onDisconnected?.();
          this.events.onError('Disconnected from host.');
        });

        this.conn.on('error', (err) => {
          console.warn('Connection error:', err);
          this.events.onError(err.message || 'Connection lost');
        });
      });

      this.peer.on('error', (err) => {
        console.warn('Client peer error:', err);
        if (err.type === 'peer-unavailable') {
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
        this.events.onLobby(msg.state, msg.yourSeat);
        break;
      case 'view':
        this.events.onView(msg.view);
        break;
      case 'chat':
        this.events.onChat(msg.message);
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

  destroy() {
    this.conn?.close();
    this.peer?.destroy();
  }
}
