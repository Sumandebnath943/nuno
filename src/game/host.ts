// ─────────────────────────────────────────────────────────────
//  GameHost — owns the authoritative GameState, runs the bots,
//  and notifies listeners (local UI and/or network peers).
// ─────────────────────────────────────────────────────────────
import { decideBot, rand, TUNING } from './bot';
import { actor, changeSeatKind, reduce } from './engine';
import { dealPause, WHEEL_SPIN_MS } from './timing';
import type { Action, Difficulty, GameState, PlayerKind } from './types';

type Listener = (s: GameState) => void;

export class GameHost {
  state: GameState;
  readonly difficulty: Difficulty;
  private listeners = new Set<Listener>();
  private turnTimer: ReturnType<typeof setTimeout> | undefined;
  private sideTimers: ReturnType<typeof setTimeout>[] = [];
  private raceTimers: ReturnType<typeof setTimeout>[] = [];
  private lastVulnerable: number | null = null;
  private lastRace = -1;
  private lastSpin = -1;
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
    this.lastVulnerable = null;
    this.lastRace = -1;
    this.dealtRound = 0;
    this.setState(state);
  }

  destroy() {
    this.destroyed = true;
    clearTimeout(this.turnTimer);
    this.sideTimers.forEach(clearTimeout);
    this.raceTimers.forEach(clearTimeout);
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

    // ── Spin: let everyone watch the wheel stop before anyone reacts.
    for (let i = s.events.length - 1; i >= 0; i--) {
      const e = s.events[i];
      if (e.type !== 'spin') continue;
      if (e.seq !== this.lastSpin) {
        this.lastSpin = e.seq;
        this.holdUntil = Math.max(this.holdUntil, Date.now() + WHEEL_SPIN_MS + 900);
      }
      break;
    }

    // ── UNO catch window: let bots (try to) catch, and let forgetful bots remember late.
    if (s.unoVulnerable !== null) {
      if (s.unoVulnerable !== this.lastVulnerable) {
        this.lastVulnerable = s.unoVulnerable;
        this.scheduleUnoReactions(s.unoVulnerable);
      }
    } else {
      this.lastVulnerable = null;
    }

    // ── Spin: everyone races to yell "UNO Spin".
    if (s.phase === 'unoSpinRace') {
      if (this.lastRace !== s.seq) {
        this.lastRace = s.seq;
        this.scheduleRace();
      }
      return;
    }

    // ── Whose move is it?
    const who = actor(s);
    if (who === null || s.players[who].kind !== 'bot') return;
    let delay = s.phase === 'launch' ? rand(450, 850) : s.phase === 'spin' ? rand(700, 1200) : rand(...t.thinkMs);
    // Give humans a fair chance to hit CATCH before the next bot moves on.
    if (s.unoVulnerable !== null && s.unoVulnerable !== who) delay += 1500;
    if (s.phase === 'challenge') delay += 500;
    delay = Math.max(delay, this.holdUntil - Date.now());
    this.turnTimer = setTimeout(() => {
      const a = decideBot(this.state, who, this.difficulty);
      if (a) this.dispatch(a);
    }, delay);
  }

  private scheduleRace() {
    this.raceTimers.forEach(clearTimeout);
    this.raceTimers = [];
    const t = TUNING[this.difficulty];
    this.state.players.forEach((p, i) => {
      if (p.kind !== 'bot' || p.out || p.hand.length === 0) return;
      this.raceTimers.push(
        setTimeout(
          () => {
            if (this.state.phase === 'unoSpinRace') this.dispatch({ type: 'unoSpin', player: i });
          },
          Math.max(0, this.holdUntil - Date.now()) + rand(...t.raceDelay),
        ),
      );
    });
  }

  private scheduleUnoReactions(target: number) {
    this.sideTimers.forEach(clearTimeout);
    this.sideTimers = [];
    const s = this.state;
    const t = TUNING[this.difficulty];

    s.players.forEach((p, i) => {
      if (i === target || p.kind !== 'bot' || p.out) return;
      if (Math.random() < t.catchChance) {
        this.sideTimers.push(
          setTimeout(
            () => {
              if (this.state.unoVulnerable === target) this.dispatch({ type: 'catch', player: i, target });
            },
            rand(...t.catchDelay),
          ),
        );
      }
    });

    if (s.players[target].kind === 'bot' && Math.random() < t.lateUnoChance) {
      this.sideTimers.push(
        setTimeout(
          () => {
            if (this.state.unoVulnerable === target) this.dispatch({ type: 'uno', player: target });
          },
          rand(800, 2400),
        ),
      );
    }
  }
}

export type { Action };
