import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Card, Color, GameEvent, GameView, Intent } from '../game/types';
import type { ChatMessage } from '../net/protocol';
import { sortHand } from '../game/cards';
import { canPlayCard } from '../game/engine';
import { MODES, needsColor, needsTarget } from '../game/modes';
import { CARD_RATIO } from './CardView';
import { ColorPickerModal } from './ColorPickerModal';
import { Wild4ChallengeModal } from './Wild4ChallengeModal';
import { ChallengeResultModal } from './ChallengeResultModal';
import { RoundOverModal } from './RoundOverModal';
import { ModeBadge } from './ModePicker';
import { Logo, Modal } from './ui';
import { computeLayout } from './board/layout';
import { useTableFx, type Anchors } from './board/useTableFx';
import { FlightLayer } from './board/FlightLayer';
import { Table } from './board/Table';
import { Seat } from './board/Seat';
import { Deck, Discard } from './board/Piles';
import { Hand } from './board/Hand';
import { TargetPicker } from './board/TargetPicker';
import { SpinWheel } from './board/SpinWheel';
import { WheelPickModal } from './board/WheelPickModal';
import { RevealOverlay } from './board/RevealOverlay';
import { EMOTES, MyPlate, NunoButton, nunoState, SplashText, StatusBanner, eventLine, turnHint } from './board/Controls';
import { sfx, isMuted, setMuted } from '../lib/sound';
import { useIsTouch, useSafeArea } from '../lib/device';

interface Props {
  view: GameView;
  isHost: boolean;
  roomId?: string;
  chatMessages: ChatMessage[];
  onAction: (intent: Intent) => void;
  onSendChat: (text: string) => void;
  onLeave: () => void;
  onNextRound: () => void;
  onNewGame: () => void;
  onOpenRules: () => void;
}

type ChallengeEvent = Extract<GameEvent, { type: 'challenge' }>;

/** A card waiting for the player to name a colour or pick a player. */
type Pending = { card: Card; needs: 'color' | 'target' };

const TARGET_COPY: Record<string, [string, string]> = {
  '7': ['Swap hands with…', 'Your 7 makes you swap hands with a player you choose.'],
  tradeHands: ['Trade hands with…', 'Pick anyone — you take their cards and they take yours.'],
  wildSwap: ['Forced swap with…', 'Pick a player to exchange hands with.'],
  wildTargetDraw2: ['Who draws 2?', 'Pick any player. They draw 2 cards (and keep their turn).'],
};

export const GameBoard: React.FC<Props> = ({
  view,
  isHost,
  roomId,
  chatMessages,
  onAction,
  onSendChat,
  onLeave,
  onNextRound,
  onNewGame,
  onOpenRules,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useViewportSize(rootRef);
  const safe = useSafeArea();
  const touch = useIsTouch();
  const n = view.players.length;
  const me = view.players[view.me];
  const L = computeLayout(size.w, size.h, n - 1, safe);
  const pileH = L.pileW * CARD_RATIO;
  const mode = view.mode;
  const info = MODES[mode];

  const myTurn = view.current === view.me && (view.phase === 'play' || view.phase === 'drawn');
  const myMove = view.actor === view.me;

  // ── animation anchors & effects ──────────────────────────
  const anchors = useRef<Anchors>({ deck: null, discard: null, seats: {}, handCards: new Map(), hand: null });
  const fx = useTableFx(view, anchors);

  const registerFan = useCallback((seat: number, el: HTMLElement | null) => {
    anchors.current.seats[seat] = el;
  }, []);
  const registerCard = useCallback((id: string, el: HTMLElement | null) => {
    if (el) anchors.current.handCards.set(id, el);
    else anchors.current.handCards.delete(id);
  }, []);
  const deckRef = useCallback((el: HTMLDivElement | null) => {
    anchors.current.deck = el;
  }, []);
  const discardRef = useCallback((el: HTMLDivElement | null) => {
    anchors.current.discard = el;
  }, []);
  const handRef = useCallback((el: HTMLDivElement | null) => {
    anchors.current.hand = el;
  }, []);

  // ── local UI state ───────────────────────────────────────
  const [pending, setPending] = useState<Pending | null>(null);
  const [sorted, setSorted] = useState(() => localStorage.getItem('nuno.sort') !== '0');
  const [muted, setMutedState] = useState(isMuted());
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [challengeResult, setChallengeResult] = useState<ChallengeEvent | null>(null);
  const [copied, setCopied] = useState(false);

  const topDiscard = view.discardTop[view.discardTop.length - 1];
  const hand = useMemo(() => (sorted ? sortHand(view.myHand) : view.myHand), [view.myHand, sorted]);

  const playable = useMemo(() => {
    const set = new Set<string>();
    if (!myTurn || !topDiscard) return set;
    if (view.phase === 'drawn') {
      if (view.drawnCardId) set.add(view.drawnCardId);
      return set;
    }
    for (const c of view.myHand) if (canPlayCard(view, topDiscard, view.myHand, c)) set.add(c.id);
    return set;
  }, [myTurn, topDiscard, view]);

  // Cards still flying in don't count as playable yet.
  const playableVisible = useMemo(() => new Set([...playable].filter((id) => !fx.hiddenHand.has(id))), [playable, fx.hiddenHand]);

  const nuno = nunoState(view);
  const nextSeat = useMemo(() => {
    let i = view.current;
    for (let k = 0; k < n; k++) {
      i = (((i + view.direction) % n) + n) % n;
      if (!view.players[i].out) return i;
    }
    return view.current;
  }, [view.current, view.direction, view.players, n]);

  // Show the result of a challenge to the two people involved (once).
  const lastChallengeSeq = useRef<number | null>(null);
  const challengeTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(challengeTimer.current), []);
  useEffect(() => {
    const last = [...view.events].reverse().find((e) => e.type === 'challenge') as ChallengeEvent | undefined;
    const newest = view.events[view.events.length - 1]?.seq ?? 0;
    if (lastChallengeSeq.current !== null && newest < lastChallengeSeq.current) lastChallengeSeq.current = 0; // new game
    if (lastChallengeSeq.current === null) {
      // Don't replay a challenge that happened before this board mounted.
      lastChallengeSeq.current = last?.seq ?? 0;
      return;
    }
    if (!last || last.seq <= lastChallengeSeq.current) return;
    lastChallengeSeq.current = last.seq;
    if (last.challenger !== view.me && last.offender !== view.me) return;
    // Let the BLUFF!/LEGIT! splash play first.
    clearTimeout(challengeTimer.current);
    challengeTimer.current = setTimeout(() => setChallengeResult(last), 1100);
  }, [view.events, view.me]);

  // A round that ends first makes a pending challenge result moot.
  const roundDone = view.phase === 'roundOver' || view.phase === 'gameOver';
  useEffect(() => {
    if (!roundDone) return;
    clearTimeout(challengeTimer.current);
    setChallengeResult(null);
    setPending(null);
  }, [roundDone]);

  // Drop a half-made play if the turn moved on underneath it.
  useEffect(() => {
    if (pending && (!myTurn || !view.myHand.some((c) => c.id === pending.card.id))) setPending(null);
  }, [myTurn, view.myHand, pending]);

  // Chat / emotes become speech bubbles over the sender's seat.
  const seenChat = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!seenChat.current) {
      seenChat.current = new Set(chatMessages.map((m) => m.id));
      return;
    }
    for (const m of chatMessages) {
      if (seenChat.current.has(m.id)) continue;
      seenChat.current.add(m.id);
      if (m.isSystem || m.seat === undefined) continue;
      const isEmote = EMOTES.includes(m.text);
      fx.showBubble(m.seat, isEmote ? m.text : m.text.slice(0, 40), isEmote ? 'emote' : 'info', 2600);
    }
  }, [chatMessages, fx.showBubble]);

  // ── actions ──────────────────────────────────────────────
  const playCard = (card: Card, extra: { color?: Color; target?: number } = {}) => {
    const el = anchors.current.handCards.get(card.id);
    if (el) fx.rememberPlay(card.id, el.getBoundingClientRect());
    onAction({ type: 'play', cardId: card.id, ...extra });
  };

  const handleCardClick = (card: Card) => {
    if (!myTurn || fx.hiddenHand.has(card.id)) return;
    if (!playable.has(card.id)) {
      sfx.error();
      return;
    }
    if (needsColor(mode, card)) {
      sfx.click();
      setPending({ card, needs: 'color' });
      return;
    }
    if (needsTarget(mode, card.value) && view.myHand.length > 1) {
      sfx.click();
      setPending({ card, needs: 'target' });
      return;
    }
    playCard(card);
  };

  const handleColor = (color: Color) => {
    if (pending?.needs === 'color') {
      playCard(pending.card, { color });
      setPending(null);
    } else if (view.phase === 'chooseColor' || view.phase === 'roulette') {
      onAction({ type: 'chooseColor', color });
    }
  };

  const launching = view.phase === 'launch' && view.launch?.player === view.me;
  const canDraw = (view.current === view.me && view.phase === 'play') || launching;
  const draw = () => {
    if (canDraw) onAction({ type: 'draw' });
  };
  const keep = () => {
    if (myTurn && view.phase === 'drawn' && !view.drawnMustPlay) {
      sfx.click();
      onAction({ type: 'pass' });
    }
  };
  const playDrawn = () => {
    const card = view.myHand.find((c) => c.id === view.drawnCardId);
    if (card) handleCardClick(card);
  };
  const racing = view.phase === 'unoSpinRace' && view.myHand.length > 0 && !me.out && fx.settled;
  const shout = () => {
    if (racing) {
      onAction({ type: 'unoSpin' });
      return;
    }
    if (nuno === 'idle' || nuno === 'done') {
      sfx.error();
      fx.showBubble(view.me, nuno === 'done' ? 'Already shouted! ✅' : 'Shout it at 2 cards 🤫', 'info', 1500);
      return;
    }
    onAction({ type: 'uno' });
  };
  const catchPlayer = useCallback((seat: number) => onAction({ type: 'catch', target: seat }), [onAction]);
  const emote = (e: string) => onSendChat(e);

  const toggleSort = () => {
    sfx.click();
    setSorted((s) => {
      localStorage.setItem('nuno.sort', s ? '0' : '1');
      return !s;
    });
  };
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) sfx.click();
  };
  const copyInvite = () => {
    if (!roomId) return;
    navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}?room=${roomId}`);
    sfx.pop();
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // ── modals ───────────────────────────────────────────────
  const choosingColor =
    (view.phase === 'chooseColor' && view.chooser === view.me) ||
    (view.phase === 'roulette' && view.roulette?.victim === view.me);
  const showColorPicker = pending?.needs === 'color' || (choosingColor && fx.settled);
  const showTarget = pending?.needs === 'target';
  const showChallenge = view.phase === 'challenge' && view.challenge?.target === view.me && fx.settled;
  const showPick = (view.phase === 'wheelPick' || view.phase === 'unoSpinPick') && view.pick?.player === view.me && fx.settled;
  const anyModal =
    showColorPicker || showTarget || showChallenge || showPick || (roundDone && fx.settled) || confirmLeave || !!challengeResult;

  // ── keyboard ─────────────────────────────────────────────
  const keys = useRef({ draw, keep, shout, toggleSort, anyModal });
  keys.current = { draw, keep, shout, toggleSort, anyModal };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (keys.current.anyModal || e.target instanceof HTMLInputElement || e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === 'd') keys.current.draw();
      else if (k === 'k' || k === 'p') keys.current.keep();
      else if (k === 'u' || k === ' ') {
        e.preventDefault();
        keys.current.shout();
      } else if (k === 's') keys.current.toggleSort();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── layout bits ──────────────────────────────────────────
  const { cx, cy } = L.table;
  const opponents = Array.from({ length: n - 1 }, (_, k) => (view.me + k + 1) % n);
  const myCount = view.myHand.length;
  const hint = myMove ? turnHint(view, playable.size) : '';
  const ticker = L.roomForTicker ? eventLine(view) : null;
  const nunoSize = L.mobile ? 60 : L.short ? 64 : 92;
  const dimOthers = myTurn && !anyModal;
  const btn = L.mobile ? 'h-11 px-3.5 text-base' : 'h-12 px-5 text-lg';
  const dark = view.side === 'dark';

  const drawLabel = launching
    ? view.launch?.untilFire
      ? 'Hit until it fires!'
      : `Hit! (${view.launch?.presses ?? 1})`
    : mode === 'attack'
      ? 'Hit launcher'
      : view.stack
        ? `Take +${view.stack.total}`
        : 'Draw';

  const actionButtons = !roundDone && (
    <>
      {canDraw && (
        <button
          onClick={draw}
          className={`btn ${launching || view.stack ? 'btn-red' : 'btn-blue'} ${btn} ${launching ? 'animate-buzz' : ''}`}
        >
          {drawLabel}
          {!L.mobile && <kbd className="ml-2 rounded-md bg-white/25 px-1.5 text-xs">D</kbd>}
        </button>
      )}
      {myTurn && view.phase === 'drawn' && (
        <>
          <button onClick={playDrawn} className={`btn btn-green ${btn}`}>
            Play it
          </button>
          {!view.drawnMustPlay && (
            <button onClick={keep} className={`btn btn-white ${btn}`}>
              Keep
              {!L.mobile && <kbd className="ml-2 rounded-md bg-black/10 px-1.5 text-xs">K</kbd>}
            </button>
          )}
        </>
      )}
    </>
  );

  const colorTitle =
    pending?.needs === 'color'
      ? `${pending.card.value === 'wild' ? 'Wild' : 'Wild card'}: pick a colour`
      : view.phase === 'roulette'
        ? 'Color Roulette!'
        : 'Pick the colour';
  const colorSubtitle =
    view.phase === 'roulette' && !pending
      ? 'Name a colour. You’ll flip cards until it shows up — and keep them all.'
      : 'The next player has to match it. Numbers show how many you hold.';

  return (
    <div
      ref={rootRef}
      className="bg-room relative h-[100dvh] w-full select-none overflow-hidden"
      style={
        dark ? { filter: 'saturate(0.85)', background: 'radial-gradient(ellipse at 50% 45%, #2a2142, #0d0b16 75%)' } : undefined
      }
    >
      <Table
        cx={cx}
        cy={cy}
        rx={L.table.rx}
        ry={L.table.ry}
        color={fx.fxColor}
        direction={view.direction}
        rainbow={mode === 'allwild'}
        dark={dark}
      />

      {/* ── top bar ── */}
      <header
        className="absolute inset-x-0 top-0 z-40 flex items-end justify-between gap-2 px-2 pb-1.5 sm:px-4"
        style={{ height: L.topBar }}
      >
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <Logo animated={false} className="hidden w-[86px] shrink-0 lg:block" />
          <button onClick={onOpenRules} className="flex shrink-0 items-center gap-1.5" title={`NUNO ${info.name} — how to play`}>
            <ModeBadge mode={mode} size={L.mobile ? 30 : 34} />
            <span className="font-display hidden whitespace-nowrap text-base text-white drop-shadow md:inline">{info.name}</span>
          </button>
          <span className="font-display whitespace-nowrap rounded-full border-2 border-[var(--ink)] bg-white px-2.5 text-sm leading-7 text-[var(--ink)] shadow-[0_2px_0_var(--ink)]">
            R{view.round}
            <span className="hidden text-[#6b6385] sm:inline"> · {view.targetScore ? `to ${view.targetScore}` : '1 round'}</span>
          </span>
          {mode === 'flip' && (
            <span
              className={`font-display whitespace-nowrap rounded-full border-2 border-[var(--ink)] px-2.5 text-sm leading-7 shadow-[0_2px_0_var(--ink)] transition-colors ${
                dark ? 'bg-[#141019] text-white' : 'bg-white text-[var(--ink)]'
              }`}
            >
              {dark ? '🌑' : '☀️'}
              <span className="hidden sm:inline"> {dark ? 'Dark' : 'Light'}</span>
            </span>
          )}
          {roomId && (
            <button
              onClick={copyInvite}
              className="font-display hidden whitespace-nowrap rounded-full border-2 border-[var(--ink)] bg-[#e9e2ff] px-2.5 text-sm leading-7 text-[var(--ink)] shadow-[0_2px_0_var(--ink)] sm:block"
              title="Copy invite link"
            >
              {copied ? 'Link copied!' : `Room ${roomId}`}
            </button>
          )}
        </div>

        {!L.roomForBanner && !roundDone && (
          <div
            className="font-display absolute bottom-1.5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-[var(--ink)] px-3 text-sm leading-7 shadow-[0_2px_0_var(--ink)] sm:block"
            style={{ background: myMove ? 'var(--yellow)' : '#fff', color: 'var(--ink)' }}
          >
            {myMove
              ? `Your ${myTurn ? 'turn' : 'move'}!${L.W >= 1000 ? ` ${hint}` : ''}`
              : `${view.players[view.actor ?? view.current]?.avatar} ${view.players[view.actor ?? view.current]?.name}…`}
          </div>
        )}

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            onClick={toggleSort}
            className={`icon-btn ${sorted ? 'is-on' : ''}`}
            title="Sort my cards by colour (S)"
            aria-pressed={sorted}
          >
            <span aria-hidden>🗂️</span>
            <span className="hidden md:inline">Sort</span>
          </button>
          <button onClick={toggleMute} className="icon-btn" aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? '🔇' : '🔊'}
          </button>
          <button onClick={onOpenRules} className="icon-btn" aria-label="How to play" title="How to play">
            ?
          </button>
          <button onClick={() => setConfirmLeave(true)} className="icon-btn" aria-label="Leave game" title="Leave game">
            <span aria-hidden>🚪</span>
            <span className="hidden md:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* ── opponents around the table ── */}
      {opponents.map((seat, k) => {
        const p = view.players[seat];
        const spot = L.seats[k];
        if (!spot) return null;
        return (
          <Seat
            key={p.id}
            seat={seat}
            player={p}
            count={Math.max(0, p.handCount + (fx.countDelta[seat] ?? 0))}
            x={spot.x}
            y={spot.y}
            compact={L.compactSeats}
            nameMax={L.mobile ? 80 : L.compactSeats ? 118 : 132}
            isTurn={!roundDone && view.actor === seat}
            isNext={!roundDone && nextSeat === seat && view.phase === 'play' && view.actor !== seat}
            catchable={view.unoVulnerable === seat && !roundDone}
            showScore={view.targetScore > 0}
            bubble={fx.bubbles[seat]}
            mercy={mode === 'nomercy'}
            side={view.side}
            bubbleAlign={spot.x < 90 ? 'left' : spot.x > L.W - 90 ? 'right' : 'center'}
            registerFan={registerFan}
            onCatch={catchPlayer}
          />
        );
      })}

      {/* ── status above the piles ── */}
      {L.roomForBanner && (
        <StatusBanner view={view} hint={hint} x={cx} y={cy - pileH / 2 - (L.mobile ? 78 : 92)} compact={L.mobile} />
      )}

      {/* ── draw & discard piles ── */}
      <div
        className="absolute z-20 flex items-start"
        style={{ left: cx, top: cy - pileH / 2, transform: 'translateX(-50%)', gap: L.pileW * 0.5 }}
      >
        <Deck
          ref={deckRef}
          width={L.pileW}
          count={view.deckCount}
          canDraw={canDraw && !anyModal}
          onDraw={draw}
          label={!L.short}
          drawLabel={mode === 'attack' ? 'Hit it!' : view.stack ? `Take +${view.stack.total}` : 'Tap to draw'}
          topAlt={view.deckTopAlt}
          side={view.side}
          launcher={mode === 'attack'}
          shots={fx.launcherShots}
        />
        <div className="relative">
          <Discard
            ref={discardRef}
            width={L.pileW}
            cards={view.discardTop}
            hidden={fx.hiddenDiscard}
            color={fx.fxColor}
            label={!L.short}
            side={view.side}
            colorless={mode === 'allwild'}
          />
          {view.stack && (
            <span
              key={view.stack.total}
              className="font-display absolute -right-5 -top-5 z-10 flex h-12 min-w-12 items-center justify-center rounded-full border-[3px] border-[var(--ink)] bg-[var(--red)] px-2 text-xl text-white shadow-[0_3px_0_var(--ink)] animate-popIn"
              title="Cards stacked so far"
            >
              +{view.stack.total}
            </span>
          )}
        </div>
      </div>

      {ticker && (
        <div className="pointer-events-none absolute z-20 -translate-x-1/2" style={{ left: cx, top: cy + pileH / 2 + 48 }}>
          <span
            key={ticker}
            className="font-display block max-w-[90vw] truncate whitespace-nowrap rounded-full bg-[rgba(27,21,48,0.55)] px-3 py-0.5 text-sm text-white/90 animate-fadeIn"
          >
            {ticker}
          </span>
        </div>
      )}

      {/* ── your hand ── */}
      <Hand
        ref={handRef}
        cards={hand}
        cw={L.cw}
        maxWidth={L.handMaxW}
        bottom={L.handBottom}
        hidden={fx.hiddenHand}
        playable={playableVisible}
        myTurn={myTurn && !anyModal}
        dimOthers={dimOthers}
        highlightId={view.phase === 'drawn' ? view.drawnCardId : null}
        side={view.side}
        touch={touch}
        registerCard={registerCard}
        onPlay={handleCardClick}
      />

      {me.out && !roundDone && (
        <div className="pointer-events-none absolute inset-x-0 z-[36] flex justify-center" style={{ bottom: L.handBottom + 20 }}>
          <span className="font-display rounded-2xl border-[3px] border-[var(--ink)] bg-[#ffe1e1] px-4 py-2 text-lg text-[#b3141c] shadow-[0_4px_0_var(--ink)]">
            💀 You’re out this round — watch the carnage
          </span>
        </div>
      )}

      {/* ── NUNO Spin race ── */}
      {racing && (
        <div className="absolute inset-x-0 z-[46] flex justify-center" style={{ top: cy + pileH / 2 + (L.mobile ? 20 : 34) }}>
          <button onClick={() => onAction({ type: 'unoSpin' })} className="btn btn-yellow animate-buzz h-16 px-8 text-2xl">
            ⚡ NUNO SPIN!
          </button>
        </div>
      )}

      {/* ── your controls ── */}
      {L.mobile ? (
        <div
          className="absolute inset-x-0 z-[35] flex items-end justify-between gap-2 px-2"
          style={{ bottom: L.handBottom + L.cw * CARD_RATIO + 10 }}
        >
          <MyPlate
            me={me}
            count={myCount}
            myTurn={myMove}
            showScore={false}
            compact
            bubble={fx.bubbles[view.me]}
            onEmote={emote}
            mercy={mode === 'nomercy'}
          />
          <div className="flex gap-1.5">{actionButtons}</div>
          <NunoButton state={nuno} size={nunoSize} onPress={shout} compact />
        </div>
      ) : (
        <>
          <div className="absolute z-[35]" style={{ left: 16, bottom: 18 + safe.bottom }}>
            <MyPlate
              me={me}
              count={myCount}
              myTurn={myMove}
              showScore={view.targetScore > 0}
              compact={L.short}
              bubble={fx.bubbles[view.me]}
              onEmote={emote}
              mercy={mode === 'nomercy'}
            />
          </div>
          {/* Short screens stack the buttons above the buzzer so they don't run into the hand. */}
          <div
            className={`absolute z-[35] flex ${L.short ? 'flex-col items-end gap-2' : 'items-end gap-3'}`}
            style={{ right: 16, bottom: 14 + safe.bottom }}
          >
            <div className={`flex items-end gap-2 ${L.short ? '' : 'flex-col pb-6'}`}>{actionButtons}</div>
            <NunoButton state={nuno} size={nunoSize} onPress={shout} compact={L.short} />
          </div>
        </>
      )}

      <SpinWheel
        waitingFor={view.phase === 'spin' && view.wheel?.segment === null && fx.settled ? view.wheel.spinner : null}
        spin={fx.wheelSpin}
        players={view.players}
        me={view.me}
        size={Math.min(L.W * 0.7, L.table.ry * 1.5, 320)}
        x={cx}
        y={cy}
        onSpin={() => onAction({ type: 'spin' })}
      />
      <RevealOverlay reveal={fx.reveal} players={view.players} me={view.me} x={cx} y={cy} />
      <SplashText splash={fx.splash} x={cx} y={cy - pileH * 0.15} scale={L.mobile ? 0.62 : L.short ? 0.7 : 1} />
      <FlightLayer flights={fx.flights} onLand={fx.land} />

      {/* ── modals ── */}
      <ColorPickerModal
        open={showColorPicker}
        hand={view.myHand}
        exclude={pending?.card.id}
        side={view.side}
        title={colorTitle}
        subtitle={colorSubtitle}
        onSelect={handleColor}
        onCancel={pending ? () => setPending(null) : undefined}
      />

      <TargetPicker
        open={showTarget}
        title={TARGET_COPY[pending?.card.value ?? '']?.[0] ?? 'Pick a player'}
        subtitle={TARGET_COPY[pending?.card.value ?? '']?.[1] ?? ''}
        players={view.players}
        me={view.me}
        myCount={myCount - 1}
        onPick={(target) => {
          if (pending) playCard(pending.card, { target });
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />

      <Wild4ChallengeModal
        open={showChallenge}
        context={view.challenge}
        offender={view.players[view.challenge?.offender ?? 0]}
        chosen={view.currentColor}
        onChoice={(challenge) => onAction({ type: 'challenge', challenge })}
      />

      {showPick && view.pick && (
        <WheelPickModal
          open
          kind={view.pick.kind}
          hand={view.myHand}
          side={view.side}
          onDone={(cardIds, topId, color) => onAction({ type: 'pickCards', cardIds, topId, color })}
        />
      )}

      {challengeResult && !roundDone && (
        <ChallengeResultModal
          open
          result={challengeResult}
          me={view.me}
          players={view.players}
          onClose={() => setChallengeResult(null)}
        />
      )}

      {fx.settled && (
        <RoundOverModal view={view} isHost={isHost} onNextRound={onNextRound} onNewGame={onNewGame} onLeave={onLeave} />
      )}

      <Modal open={confirmLeave} onClose={() => setConfirmLeave(false)} className="max-w-sm">
        <div className="p-6 text-center">
          <div className="text-5xl">🚪</div>
          <h2 className="font-display mt-2 text-3xl">Leave the game?</h2>
          <p className="mt-1 font-medium text-[#6b6385]">
            {roomId && isHost ? 'You are the host — the room closes for everyone.' : 'Your progress in this game will be lost.'}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button className="btn btn-white h-12 text-lg" onClick={() => setConfirmLeave(false)}>
              Stay
            </button>
            <button className="btn btn-red h-12 text-lg" onClick={onLeave}>
              Leave
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

function useViewportSize(ref: React.RefObject<HTMLElement>) {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize((s) => (s.w === r.width && s.h === r.height ? s : { w: r.width, h: r.height }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}
