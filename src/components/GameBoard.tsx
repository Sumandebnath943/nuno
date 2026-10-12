import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Card, Color, GameEvent, GameView, Intent } from '../game/types';
import type { ChatMessage } from '../net/protocol';
import { isPlayable, sortHand } from '../game/cards';
import { CARD_RATIO } from './CardView';
import { ColorPickerModal } from './ColorPickerModal';
import { Wild4ChallengeModal } from './Wild4ChallengeModal';
import { ChallengeResultModal } from './ChallengeResultModal';
import { RoundOverModal } from './RoundOverModal';
import { Logo, Modal } from './ui';
import { computeLayout } from './board/layout';
import { useTableFx, type Anchors } from './board/useTableFx';
import { FlightLayer } from './board/FlightLayer';
import { Table } from './board/Table';
import { Seat } from './board/Seat';
import { Deck, Discard } from './board/Piles';
import { Hand } from './board/Hand';
import { EMOTES, MyPlate, NunoButton, nunoState, SplashText, StatusBanner, eventLine, turnHint } from './board/Controls';
import { sfx, isMuted, setMuted } from '../lib/sound';

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
  const n = view.players.length;
  const me = view.players[view.me];
  const myTurn = view.current === view.me;
  const L = computeLayout(size.w, size.h, n - 1);
  const pileH = L.pileW * CARD_RATIO;

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
  const [pendingWild, setPendingWild] = useState<Card | null>(null);
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
    if (view.phase !== 'play') return set;
    for (const c of view.myHand) if (isPlayable(c, topDiscard, view.currentColor)) set.add(c.id);
    return set;
  }, [myTurn, topDiscard, view.phase, view.drawnCardId, view.myHand, view.currentColor]);

  // Cards still flying in don't count as playable yet.
  const playableVisible = useMemo(() => new Set([...playable].filter((id) => !fx.hiddenHand.has(id))), [playable, fx.hiddenHand]);

  const nuno = nunoState(view);
  const nextSeat = (((view.current + view.direction) % n) + n) % n;

  // Show the result of a Wild Draw Four challenge to the two people involved (once).
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
  const roundEnded = view.phase === 'roundOver' || view.phase === 'gameOver';
  useEffect(() => {
    if (!roundEnded) return;
    clearTimeout(challengeTimer.current);
    setChallengeResult(null);
  }, [roundEnded]);

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
  const playCard = (card: Card, color?: Color) => {
    const el = anchors.current.handCards.get(card.id);
    if (el) fx.rememberPlay(card.id, el.getBoundingClientRect());
    onAction({ type: 'play', cardId: card.id, color });
  };

  const handleCardClick = (card: Card) => {
    if (!myTurn || fx.hiddenHand.has(card.id)) return;
    if (!playable.has(card.id)) {
      sfx.error();
      return;
    }
    if (card.color === 'wild') {
      sfx.click();
      setPendingWild(card);
      return;
    }
    playCard(card);
  };

  const handleColor = (color: Color) => {
    if (pendingWild) {
      playCard(pendingWild, color);
      setPendingWild(null);
    } else if (view.phase === 'chooseColor') {
      onAction({ type: 'chooseColor', color });
    }
  };

  const canDraw = myTurn && view.phase === 'play';
  const draw = () => {
    if (canDraw) onAction({ type: 'draw' });
  };
  const keep = () => {
    if (myTurn && view.phase === 'drawn') {
      sfx.click();
      onAction({ type: 'pass' });
    }
  };
  const playDrawn = () => {
    const card = view.myHand.find((c) => c.id === view.drawnCardId);
    if (card) handleCardClick(card);
  };
  const shout = () => {
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
  const showColorPicker = pendingWild !== null || (view.phase === 'chooseColor' && myTurn && fx.settled);
  const showChallenge = view.phase === 'challenge' && view.challenge?.target === view.me && fx.settled;
  const roundDone = roundEnded;
  const anyModal = showColorPicker || showChallenge || (roundDone && fx.settled) || confirmLeave || !!challengeResult;

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
  const hint = myTurn || view.phase === 'challenge' ? turnHint(view, playable.size) : '';
  const ticker = L.roomForTicker ? eventLine(view) : null;
  const nunoSize = L.mobile ? 58 : L.short ? 64 : 92;
  const dimOthers = myTurn && (view.phase === 'play' || view.phase === 'drawn') && !anyModal;

  const actionButtons = myTurn && !roundDone && (
    <>
      {view.phase === 'play' && (
        <button onClick={draw} className={`btn btn-blue ${L.mobile ? 'h-11 px-4 text-base' : 'h-12 px-5 text-lg'}`}>
          Draw
          {!L.mobile && <kbd className="ml-2 rounded-md bg-white/25 px-1.5 text-xs">D</kbd>}
        </button>
      )}
      {view.phase === 'drawn' && (
        <>
          <button onClick={playDrawn} className={`btn btn-green ${L.mobile ? 'h-11 px-3 text-base' : 'h-12 px-5 text-lg'}`}>
            Play it
          </button>
          <button onClick={keep} className={`btn btn-white ${L.mobile ? 'h-11 px-3 text-base' : 'h-12 px-5 text-lg'}`}>
            Keep
            {!L.mobile && <kbd className="ml-2 rounded-md bg-black/10 px-1.5 text-xs">K</kbd>}
          </button>
        </>
      )}
    </>
  );

  return (
    <div ref={rootRef} className="bg-room relative h-[100dvh] w-full select-none overflow-hidden">
      <Table cx={cx} cy={cy} rx={L.table.rx} ry={L.table.ry} color={fx.fxColor} direction={view.direction} />

      {/* ── top bar ── */}
      <header
        className="absolute inset-x-0 top-0 z-40 flex items-center justify-between gap-2 px-2 sm:px-4"
        style={{ height: L.topBar }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Logo animated={false} className="hidden w-[86px] shrink-0 sm:block" />
          <span className="font-display whitespace-nowrap rounded-full border-2 border-[var(--ink)] bg-white px-2.5 text-sm leading-7 text-[var(--ink)] shadow-[0_2px_0_var(--ink)]">
            Round {view.round}
            <span className="hidden text-[#6b6385] md:inline">
              {' '}
              · {view.targetScore ? `first to ${view.targetScore}` : 'single round'}
            </span>
          </span>
          {roomId && (
            <button
              onClick={copyInvite}
              className="font-display whitespace-nowrap rounded-full border-2 border-[var(--ink)] bg-[#e9e2ff] px-2.5 text-sm leading-7 text-[var(--ink)] shadow-[0_2px_0_var(--ink)]"
              title="Copy invite link"
            >
              {copied ? 'Link copied!' : `Room ${roomId}`}
            </button>
          )}
        </div>

        {!L.roomForBanner && !roundDone && (
          <div
            className="font-display absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border-2 border-[var(--ink)] px-3 text-sm leading-7 shadow-[0_2px_0_var(--ink)] sm:block"
            style={{ background: myTurn ? 'var(--yellow)' : '#fff', color: 'var(--ink)' }}
          >
            {myTurn
              ? `Your turn!${L.W >= 1000 ? ` ${hint}` : ''}`
              : `${view.players[view.current]?.avatar} ${view.players[view.current]?.name}’s turn`}
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
            isTurn={!roundDone && (view.phase === 'challenge' ? view.challenge?.target === seat : view.current === seat)}
            isNext={!roundDone && nextSeat === seat && view.phase !== 'challenge'}
            catchable={view.unoVulnerable === seat && !roundDone}
            showScore={view.targetScore > 0}
            bubble={fx.bubbles[seat]}
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
        />
        <Discard
          ref={discardRef}
          width={L.pileW}
          cards={view.discardTop}
          hidden={fx.hiddenDiscard}
          color={fx.fxColor}
          label={!L.short}
        />
      </div>

      {ticker && (
        <div className="pointer-events-none absolute z-20 -translate-x-1/2" style={{ left: cx, top: cy + pileH / 2 + 48 }}>
          <span
            key={ticker}
            className="font-display block whitespace-nowrap rounded-full bg-[rgba(27,21,48,0.55)] px-3 py-0.5 text-sm text-white/90 animate-fadeIn"
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
        registerCard={registerCard}
        onPlay={handleCardClick}
      />

      {/* ── your controls ── */}
      {L.mobile ? (
        <div
          className="absolute inset-x-0 z-[35] flex items-end justify-between gap-2 px-2"
          style={{ bottom: L.handBottom + L.cw * CARD_RATIO + 10 }}
        >
          <MyPlate
            me={me}
            count={myCount}
            myTurn={myTurn}
            showScore={false}
            compact
            bubble={fx.bubbles[view.me]}
            onEmote={emote}
          />
          <div className="flex gap-1.5">{actionButtons}</div>
          <NunoButton state={nuno} size={nunoSize} onPress={shout} />
        </div>
      ) : (
        <>
          <div className="absolute z-[35]" style={{ left: 16, bottom: 18 }}>
            <MyPlate
              me={me}
              count={myCount}
              myTurn={myTurn}
              showScore={view.targetScore > 0}
              compact={L.short}
              bubble={fx.bubbles[view.me]}
              onEmote={emote}
            />
          </div>
          <div className="absolute z-[35] flex items-end gap-3" style={{ right: 16, bottom: 14 }}>
            <div className="flex flex-col items-end gap-2 pb-6">{actionButtons}</div>
            <NunoButton state={nuno} size={nunoSize} onPress={shout} />
          </div>
        </>
      )}

      <SplashText splash={fx.splash} x={cx} y={cy - pileH * 0.15} scale={L.mobile ? 0.62 : L.short ? 0.7 : 1} />
      <FlightLayer flights={fx.flights} onLand={fx.land} />

      {/* ── modals ── */}
      <ColorPickerModal
        open={showColorPicker}
        hand={view.myHand}
        exclude={pendingWild?.id}
        title={
          pendingWild
            ? pendingWild.value === 'wild4'
              ? 'Wild +4: pick a colour'
              : 'Wild: pick a colour'
            : 'Pick the starting colour'
        }
        onSelect={handleColor}
        onCancel={pendingWild ? () => setPendingWild(null) : undefined}
      />

      <Wild4ChallengeModal
        open={showChallenge}
        context={view.challenge}
        offender={view.players[view.challenge?.offender ?? 0]}
        onChoice={(challenge) => onAction({ type: 'challenge', challenge })}
      />

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
