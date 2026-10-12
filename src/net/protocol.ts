import type { Difficulty, GameView, Intent } from '../game/types';

export interface RoomOptions {
  playerCount: number; // 2 to 10
  targetScore: number; // 0 for quick single round, 250, 500
  difficulty: Difficulty;
}

export interface LobbySeat {
  name: string;
  avatar: string;
  kind: 'human' | 'bot' | 'remote';
  peerId?: string;
  ready?: boolean;
}

export interface LobbyState {
  roomId: string;
  hostPeerId: string;
  seats: LobbySeat[];
  options: RoomOptions;
  inGame: boolean;
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
}

// Host -> Client messages
export type ServerMessage =
  | { type: 'lobby'; state: LobbyState; yourSeat: number }
  | { type: 'view'; view: GameView }
  | { type: 'chat'; message: ChatMessage }
  | { type: 'error'; message: string };

// Client -> Host messages
export type ClientMessage =
  | { type: 'join'; name: string; avatar: string }
  | { type: 'action'; intent: Intent }
  | { type: 'chat'; text: string }
  | { type: 'updateSeat'; index: number; kind: 'bot' | 'human' }
  | { type: 'updateOptions'; options: Partial<RoomOptions> }
  | { type: 'startGame' };
