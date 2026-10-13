// ─────────────────────────────────────────────────────────────
//  GameHost — owns the authoritative GameState, runs the bots,
//  and notifies listeners (local UI and/or network peers).
// ─────────────────────────────────────────────────────────────
import { decideBot, rand, TUNING } from './bot';
import { actor, changeSeatKind, reduce } from './engine';
import { eventsDuration, paceScale } from './timing';
import type { Action, Difficulty, GameEvent, GameState, PlayerKind } from './types';

type Listener = (s: GameState) => void;

/** Moments a bot might want to trash talk about. */
export type BotMoment = 'attack' | 'hit' | 'win' | 'caught' | 'busted' | 'uno' | 'skip' | 'swap' | 'knockout';

const DRAW_ATTACKS = new Set(['draw2', 'wild4', 'stack', 'card', 'challenge', 'roulette']);

export class GameHost {
  state: GameState;
  readonly difficulty: Difficulty;
  /** Called when a bot has something to say about what just happened. */
  onBotMoment?: (seat: number, moment: BotMoment, delayMs: number) => void;
  private listeners = new Set<Listener>();
  private turnTimer: ReturnType<typeof setTimeout> | undefined;
  private sideTimers: ReturnType<typeof setTimeout>[] = [];
  private raceTimers: ReturnType<typeof setTimeout>[] = [];
  private lastVulnerable: number | null = null;
  private lastRace = -1;
  private destroyed = false;
  /** Newest event already accounted for in the animation hold. */
  private seenSeq = 0;
  /** The table is busy showing moves until this time (ms since epoch). */
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
    this.seenSeq = 0;
    this.holdUntil = 0;
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

  /** Time left until the table has shown everything that happened so far. */
  private busyFor(): number {
    return Math.max(0, this.holdUntil - Date.now());
  }

  /** Adds the animation time of any new events to the hold, like the table's own timeline. */
  private absorbEvents(s: GameState) {
    const newest = s.events.length ? s.events[s.events.length - 1].seq : 0;
    if (newest < this.seenSeq) this.seenSeq = 0; // a new game restarted the counter
    const fresh = s.events.filter((e) => e.seq > this.seenSeq);
    this.seenSeq = newest;
    if (!fresh.length) return;
    const start = Math.max(Date.now(), this.holdUntil);
    this.holdUntil = start + eventsDuration(fresh, s.players.length);
    this.botMoments(s, fresh);
  }

  private tick() {
    if (this.destroyed) return;
    clearTimeout(this.turnTimer);
    const s = this.state;
    const t = TUNING[this.difficulty];
    const pace = paceScale();
    this.absorbEvents(s);

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

    // ── Whose move is it? Bots only start "thinking" once the table has caught up.
    const who = actor(s);
    if (who === null || s.players[who].kind !== 'bot') return;
    let think = s.phase === 'launch' ? rand(500, 900) : s.phase === 'spin' ? rand(700, 1200) : rand(...t.thinkMs);
    // Give humans a fair chance to hit CATCH before the next bot moves on.
    if (s.unoVulnerable !== null && s.unoVulnerable !== who) think += 1600;
    if (s.phase === 'challenge') think += 600;
    const delay = this.busyFor() + think * pace;
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
          this.busyFor() + rand(...t.raceDelay) * paceScale(),
        ),
      );
    });
  }

  private scheduleUnoReactions(target: number) {
    this.sideTimers.forEach(clearTimeout);
    this.sideTimers = [];
    const s = this.state;
    const t = TUNING[this.difficulty];
    // Nobody can react to a card that is still flying to the pile.
    const wait = this.busyFor();

    s.players.forEach((p, i) => {
      if (i === target || p.kind !== 'bot' || p.out) return;
      if (Math.random() < t.catchChance) {
        this.sideTimers.push(
          setTimeout(
            () => {
              if (this.state.unoVulnerable === target) this.dispatch({ type: 'catch', player: i, target });
            },
            wait + rand(...t.catchDelay),
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
          wait + rand(700, 2000),
        ),
      );
    }
  }

  /** Spots things bots like to brag (or moan) about. The session decides what they say. */
  private botMoments(s: GameState, fresh: GameEvent[]) {
    if (!this.onBotMoment) return;
    const isBot = (i: number | undefined) => i !== undefined && s.players[i]?.kind === 'bot';
    const after = this.busyFor();
    let lastPlayer: number | undefined;
    for (const e of fresh) {
      switch (e.type) {
        case 'play':
          lastPlayer = e.player;
          break;
        case 'draw':
          if (DRAW_ATTACKS.has(e.reason) && e.count >= 2) {
            if (isBot(lastPlayer) && lastPlayer !== e.player) this.onBotMoment(lastPlayer!, 'attack', after);
            else if (isBot(e.player) && e.count >= 4) this.onBotMoment(e.player, 'hit', after);
          }
          break;
        case 'skip':
          if (isBot(lastPlayer) && lastPlayer !== e.player) this.onBotMoment(lastPlayer!, 'skip', after);
          break;
        case 'swap':
          if (isBot(e.a)) this.onBotMoment(e.a, 'swap', after);
          break;
        case 'caught':
          if (isBot(e.by)) this.onBotMoment(e.by, 'caught', after);
          else if (isBot(e.player)) this.onBotMoment(e.player, 'busted', after);
          break;
        case 'uno':
          if (isBot(e.player)) this.onBotMoment(e.player, 'uno', after);
          break;
        case 'eliminated':
          if (isBot(lastPlayer) && lastPlayer !== e.player) this.onBotMoment(lastPlayer!, 'knockout', after);
          break;
        case 'roundOver':
          if (isBot(e.winner)) this.onBotMoment(e.winner, 'win', after);
          break;
        default:
          break;
      }
    }
  }
}

export type { Action };
