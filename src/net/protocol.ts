import type { Difficulty, GameMode, GameView, Intent } from '../game/types';
import type { ThemeId } from '../lib/settings';

export interface RoomOptions {
  playerCount: number; // 2 to 10
  targetScore: number; // 0 for quick single round, otherwise points to win
  mode: GameMode;
  difficulty: Difficulty;
}

export interface LobbySeat {
  name: string;
  avatar: string;
  kind: 'human' | 'bot' | 'remote';
  peerId?: string;
  ready?: boolean;
  /** Lost their connection; the seat is held for them for a while. */
  away?: boolean;
}

export interface LobbyState {
  roomId: string;
  hostPeerId: string;
  /** The host's seat. Seats are shuffled when a game starts, so it isn't always 0. */
  hostSeat: number;
  seats: LobbySeat[];
  options: RoomOptions;
  inGame: boolean;
  /** The host's theme: everyone in the room plays in it. */
  theme: ThemeId;
}

/** Someone's voice chat: is their mic on, and are they talking right now. */
export interface VoiceState {
  mic: boolean;
  speaking: boolean;
}

export interface ChatMessage {
  id: string;
  sender: string;
  avatar: string;
  text: string;
  time: number;
  isSystem?: boolean;
  /** Seat of the sender, so the table can show it as a speech bubble. */
  seat?: number;
  /** Trash talk: id of a ready-made line (see lib/taunts.ts). */
  taunt?: string;
}

// Host -> Client messages
export type ServerMessage =
  | { type: 'lobby'; state: LobbyState; yourSeat: number }
  | { type: 'view'; view: GameView }
  | { type: 'chat'; message: ChatMessage }
  | { type: 'error'; message: string }
  /** Everyone's voice state, by peer id. */
  | { type: 'voice'; states: Record<string, VoiceState> };

// Client -> Host messages
export type ClientMessage =
  /** `clientId` stays the same when a player reconnects, so they get their seat back. */
  | { type: 'join'; name: string; avatar: string; clientId?: string }
  | { type: 'action'; intent: Intent }
  | { type: 'chat'; text: string }
  | { type: 'taunt'; id: string }
  | { type: 'voice'; mic: boolean; speaking: boolean }
  | { type: 'updateSeat'; index: number; kind: 'bot' | 'human' }
  | { type: 'updateOptions'; options: Partial<RoomOptions> }
  | { type: 'startGame' };
