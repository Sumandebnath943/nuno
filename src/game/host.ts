// ─────────────────────────────────────────────────────────────
//  GameHost — owns the authoritative GameState, runs the bots,
//  and notifies listeners (local UI and/or network peers).
// ─────────────────────────────────────────────────────────────
import { decideBot, rand, TUNING } from './bot';
import { actor, changeSeatKind, reduce } from './engine';
import { dealPause } from './timing';
import type { Action, Difficulty, GameState, PlayerKind } from './types';

type Listener = (s: GameState) => void;

export class GameHost {
  state: GameState;
  readonly difficulty: Difficulty;
  private listeners = new Set<Listener>();
  private turnTimer: ReturnType<typeof setTimeout> | undefined;
  private sideTimers: ReturnType<typeof setTimeout>[] = [];
  private lastWindow = -1;
  private destroyed = false;
  private dealtRound = 0;
  private holdUntil = 0;

  constructor(state: GameState, difficulty: Difficulty) {
    this.state = state;
    this.difficulty = difficulty;
    setTimeout(() => this.tick(), 0);
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  /** Applies an action. If `fromSeat` is given, the action must belong to that seat. */
  dispatch(action: Action, fromSeat?: number): boolean {
    if (this.destroyed) return false;
    if (fromSeat !== undefined && action.player !== fromSeat) return false;
    const next = reduce(this.state, action);
    if (next === this.state) return false;
    this.setState(next);
    return true;
  }

  setSeatKind(seat: number, kind: PlayerKind, note: string) {
    this.setState(changeSeatKind(this.state, seat, kind, note));
  }

  /** Swap in a brand-new game (e.g. "play again"). */
  replace(state: GameState) {
    this.lastWindow = -1;
    this.dealtRound = 0;
    this.setState(state);
  }

  destroy() {
    this.destroyed = true;
    clearTimeout(this.turnTimer);
    this.sideTimers.forEach(clearTimeout);
    this.listeners.clear();
  }

  private setState(s: GameState) {
    this.state = s;
    this.listeners.forEach((fn) => fn(s));
    this.tick();
  }

  private tick() {
    if (this.destroyed) return;
    clearTimeout(this.turnTimer);
    const s = this.state;
    const t = TUNING[this.difficulty];

    // ── A fresh round: let the deal animation finish before anyone moves.
    if (s.round !== this.dealtRound) {
      this.dealtRound = s.round;
      this.holdUntil = Date.now() + dealPause(s.players.length);
    }

    // ── UNO catch window: let bots (try to) catch, and let forgetful bots remember late.
    if (s.unoVulnerable !== null) {
      const windowId = this.vulnerableSince(s);
      if (windowId !== this.lastWindow) {
        this.lastWindow = windowId;
        this.scheduleUnoReactions(s.unoVulnerable);
      }
    } else {
      this.lastWindow = -1;
    }

    // ── Whose move is it?
    const who = actor(s);
    if (who === null || s.players[who].kind !== 'bot') return;
    let delay = rand(...t.thinkMs);
    // Give humans a fair chance to hit CATCH before the next bot moves on.
    if (s.unoVulnerable !== null && s.unoVulnerable !== who) delay += 1500;
    if (s.phase === 'challenge') delay += 500;
    delay = Math.max(delay, this.holdUntil - Date.now());
    this.turnTimer = setTimeout(() => {
      const a = decideBot(this.state, who, this.difficulty);
      if (a) this.dispatch(a);
    }, delay);
  }

  /** The seq of the play event that made the current player vulnerable (identifies the window). */
  private vulnerableSince(s: GameState): number {
    for (let i = s.events.length - 1; i >= 0; i--) {
      const e = s.events[i];
      if (e.type === 'play' && e.player === s.unoVulnerable) return e.seq;
    }
    return s.seq;
  }

  private scheduleUnoReactions(target: number) {
    this.sideTimers.forEach(clearTimeout);
    this.sideTimers = [];
    const s = this.state;
    const t = TUNING[this.difficulty];

    s.players.forEach((p, i) => {
      if (i === target || p.kind !== 'bot') return;
      if (Math.random() < t.catchChance) {
        this.sideTimers.push(
          setTimeout(() => {
            if (this.state.unoVulnerable === target) this.dispatch({ type: 'catch', player: i, target });
          }, rand(...t.catchDelay)),
        );
      }
    });

    if (s.players[target].kind === 'bot' && Math.random() < t.lateUnoChance) {
      this.sideTimers.push(
        setTimeout(() => {
          if (this.state.unoVulnerable === target) this.dispatch({ type: 'uno', player: target });
        }, rand(800, 2400)),
      );
    }
  }
}

export type { Action };
