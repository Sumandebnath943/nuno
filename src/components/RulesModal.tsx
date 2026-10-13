import React, { useEffect, useRef, useState } from 'react';
import type { GameMode } from '../game/types';
import { MODE_ORDER, MODES } from '../game/modes';
import { GUIDES, TABLE_GUIDE, WHEEL_INFO } from '../lib/modeGuide';
import { CardView } from './CardView';
import { CloseButton, Modal } from './ui';
import { sfx } from '../lib/sound';

interface Props {
  open: boolean;
  onClose: () => void;
  mode?: GameMode;
  /** Jump straight to the card list. */
  focus?: 'rules' | 'cards';
}

type Section = 'turn' | 'rules' | 'cards' | 'extra' | 'faq' | 'score' | 'table';

export const RulesModal: React.FC<Props> = ({ open, onClose, mode = 'classic', focus = 'rules' }) => {
  const [tab, setTab] = useState<GameMode>(mode);
  const body = useRef<HTMLDivElement>(null);
  const refs = useRef<Partial<Record<Section, HTMLElement | null>>>({});

  useEffect(() => {
    if (!open) return;
    setTab(mode);
    requestAnimationFrame(() => {
      if (focus === 'cards') refs.current.cards?.scrollIntoView({ block: 'start' });
      else body.current?.scrollTo({ top: 0 });
    });
  }, [open, mode, focus]);

  const close = () => {
    sfx.click();
    onClose();
  };
  const guide = GUIDES[tab];
  const info = MODES[tab];
  const extra = tab === 'spin' ? 'The wheel' : tab === 'attack' ? 'The launcher' : tab === 'nomercy' ? 'Stacking chart' : null;

  const sections: [Section, string][] = [
    ['turn', 'Your turn'],
    ['rules', 'Rules'],
    ['cards', `Cards (${info.deckSize})`],
    ...(extra ? ([['extra', extra]] as [Section, string][]) : []),
    ['faq', 'FAQ'],
    ['score', 'Scoring'],
    ['table', 'On screen'],
  ];
  const jump = (s: Section) => {
    sfx.click();
    refs.current[s]?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  const anchor = (s: Section) => (el: HTMLElement | null) => {
    refs.current[s] = el;
  };

  const cardsBySide = tab === 'flip' ? (['light', 'dark'] as const) : ([undefined] as const);

  return (
    <Modal open={open} onClose={close} className="max-w-3xl">
      <div className="flex items-center justify-between gap-3 border-b-[3px] border-[var(--ink)] px-4 pb-2 pt-3 sm:px-5 sm:pt-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl sm:text-3xl">How to play</h2>
          <p className="truncate text-sm font-medium text-[var(--muted)]">Every mode, every card — the official rules of each UNO game.</p>
        </div>
        <CloseButton onClick={close} />
      </div>

      {/* mode tabs */}
      <div className="nice-scroll flex shrink-0 gap-1.5 overflow-x-auto border-b-2 border-[var(--line)] px-4 py-2 sm:px-5" role="tablist">
        {MODE_ORDER.map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={tab === m}
            onClick={() => {
              sfx.click();
              setTab(m);
              body.current?.scrollTo({ top: 0 });
            }}
            className={`chip shrink-0 whitespace-nowrap px-3 py-1.5 text-sm ${tab === m ? 'is-on' : ''}`}
          >
            {MODES[m].icon} {MODES[m].name}
          </button>
        ))}
      </div>

      <div ref={body} className="nice-scroll min-h-0 flex-1 overflow-y-auto">
        {/* section jump bar */}
        <nav className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b-2 border-[var(--line)] bg-[var(--cream)] px-4 py-1.5 sm:px-5" aria-label="Sections">
          {sections.map(([id, label]) => (
            <button
              key={id}
              onClick={() => jump(id)}
              className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold text-[var(--link)] hover:bg-[var(--panel-2)]"
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="p-4 sm:p-5">
          <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
            <h3 className="font-display text-2xl">
              {info.icon} NUNO {info.name}
            </h3>
            <span className="text-sm font-semibold text-[var(--muted)]">
              based on {info.basedOn} · {info.deckSize} cards · 2–10 players
            </span>
          </div>
          <p className="text-[15px] leading-relaxed text-[var(--soft)]">{guide.intro}</p>

          {guide.differences.length > 0 && (
            <div className="mt-3 rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--highlight)] p-3.5">
              <div className="font-display mb-1 text-lg">What’s different from Classic</div>
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-[var(--soft)]">
                {guide.differences.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          )}

          <Heading id="turn" anchor={anchor}>
            Your turn, step by step
          </Heading>
          <ol className="space-y-2">
            {guide.turn.map((step, i) => (
              <li key={step} className="flex gap-3 rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--surface)] p-3 text-sm leading-relaxed text-[var(--soft)]">
                <span className="font-display flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--accent-a)] text-[var(--ink)]">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <Heading id="rules" anchor={anchor}>
            The rules
          </Heading>
          <div className="grid gap-3 sm:grid-cols-2">
            {guide.rules.map((r) => (
              <section key={r.title} className="rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--surface)] p-3.5">
                <h4 className="font-display mb-0.5 flex items-center gap-2 text-lg">
                  <span aria-hidden>{r.icon}</span> {r.title}
                </h4>
                <p className="text-sm leading-relaxed text-[var(--soft)]">{r.text}</p>
              </section>
            ))}
          </div>

          <Heading id="cards" anchor={anchor}>
            Every card in the deck
          </Heading>
          {cardsBySide.map((side) => (
            <div key={side ?? 'all'} className="mb-3">
              {side && (
                <div
                  className={`font-display mb-2 inline-block rounded-lg px-2 py-0.5 text-sm uppercase ${side === 'dark' ? 'bg-[#141019] text-white' : 'bg-[var(--panel-2)]'}`}
                >
                  {side === 'dark' ? '🌑 Dark Side' : '☀️ Light Side'}
                </div>
              )}
              <div className="grid gap-2.5 sm:grid-cols-2">
                {guide.cards
                  .filter((c) => !side || c.side === side)
                  .map((c) => (
                    <div key={c.name + (c.side ?? '')} className="flex items-center gap-3 rounded-2xl bg-[var(--surface)] p-2 ring-1 ring-[var(--line)]">
                      <CardView card={c.card} side={c.side} width={54} />
                      <div className="min-w-0 text-sm leading-snug text-[var(--soft)]">
                        <div className="font-display flex flex-wrap items-baseline gap-x-2 text-base text-[var(--ink)]">
                          {c.name}
                        </div>
                        <div className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--faint)]">
                          ×{c.count} · {typeof c.points === 'number' ? `${c.points} pts` : c.points}
                        </div>
                        {c.text}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}

          {tab === 'spin' && (
            <>
              <Heading id="extra" anchor={anchor}>
                The wheel — nine equal spaces
              </Heading>
              <div className="grid gap-2 sm:grid-cols-3">
                {Object.values(WHEEL_INFO).map((w) => (
                  <div key={w.name} className="rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface)] p-2.5 text-sm">
                    <div className="font-display flex items-center gap-1.5 text-base">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full text-sm" style={{ background: w.color }}>
                        {w.icon}
                      </span>
                      {w.name}
                    </div>
                    <p className="mt-0.5 text-[var(--soft)]">{w.text}</p>
                  </div>
                ))}
              </div>
            </>
          )}
          {tab === 'attack' && (
            <>
              <Heading id="extra" anchor={anchor}>
                What the launcher fires
              </Heading>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  ['Nothing', '60%', '😅'],
                  ['1–3 cards', '25%', '😬'],
                  ['4–6 cards', '10%', '😱'],
                  ['7–10 cards', '5%', '💀'],
                ].map(([what, odds, face]) => (
                  <div key={what} className="rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface)] p-2">
                    <div className="text-2xl">{face}</div>
                    <div className="font-display text-lg">{odds}</div>
                    <div className="text-xs font-semibold text-[var(--muted)]">{what}</div>
                  </div>
                ))}
              </div>
            </>
          )}
          {tab === 'nomercy' && (
            <>
              <Heading id="extra" anchor={anchor}>
                What can go on a stack?
              </Heading>
              <div className="overflow-x-auto rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--surface)]">
                <table className="w-full text-center text-sm">
                  <thead>
                    <tr className="bg-[var(--panel-2)]">
                      <th className="p-2 text-left font-display">Last card on the stack</th>
                      {['+2', '+4', '+6', '+10'].map((h) => (
                        <th key={h} className="font-display p-2">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['+2 (Draw Two)', [1, 1, 1, 1]],
                      ['+4 (Draw Four, Wild Reverse +4)', [0, 1, 1, 1]],
                      ['+6 (Wild Draw Six)', [0, 0, 1, 1]],
                      ['+10 (Wild Draw Ten)', [0, 0, 0, 1]],
                    ].map(([label, ok]) => (
                      <tr key={label as string} className="border-t border-[var(--line)]">
                        <td className="p-2 text-left font-semibold text-[var(--soft)]">{label as string}</td>
                        {(ok as number[]).map((v, i) => (
                          <td key={i} className="p-2 text-base">
                            {v ? '✅' : '❌'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="border-t border-[var(--line)] p-2 text-xs font-semibold text-[var(--muted)]">
                  Columns: the card you want to play on top. Colour never matters while stacking.
                </p>
              </div>
            </>
          )}

          <Heading id="faq" anchor={anchor}>
            Questions people ask
          </Heading>
          <div className="space-y-2">
            {guide.faq.map((f) => (
              <details key={f.q} className="group rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--surface)] p-3 text-sm">
                <summary className="font-display cursor-pointer list-none text-base">
                  <span className="mr-1 inline-block transition-transform group-open:rotate-90">▸</span> {f.q}
                </summary>
                <p className="mt-1 leading-relaxed text-[var(--soft)]">{f.a}</p>
              </details>
            ))}
          </div>

          <Heading id="score" anchor={anchor}>
            🏆 Scoring
          </Heading>
          <ul className="space-y-1 rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--highlight)] p-3.5 text-sm text-[var(--soft)]">
            {guide.scoring.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
          {guide.tips.length > 0 && (
            <div className="mt-3 rounded-2xl border-[2.5px] border-dashed border-[var(--line)] p-3 text-sm text-[var(--soft)]">
              <span className="font-display text-[var(--ink)]">💡 Tips: </span>
              {guide.tips.join(' ')}
            </div>
          )}

          <Heading id="table" anchor={anchor}>
            Reading the table
          </Heading>
          <div className="grid gap-2 sm:grid-cols-2">
            {TABLE_GUIDE.map((r) => (
              <div key={r.title} className="flex gap-2.5 rounded-2xl bg-[var(--surface)] p-2.5 text-sm ring-1 ring-[var(--line)]">
                <span className="text-xl leading-6">{r.icon}</span>
                <span className="text-[var(--soft)]">
                  <b className="font-display text-[var(--ink)]">{r.title}. </b>
                  {r.text}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 hidden rounded-2xl border-[2.5px] border-dashed border-[var(--line)] p-3.5 text-sm text-[var(--soft)] sm:block">
            <span className="font-display text-[var(--ink)]">Keyboard:</span> <Kbd>D</Kbd> draw / launch · <Kbd>K</Kbd> keep drawn
            card · <Kbd>U</Kbd> or <Kbd>Space</Kbd> shout NUNO · <Kbd>S</Kbd> sort your cards
          </div>
        </div>
      </div>
    </Modal>
  );
};

function Heading({ id, anchor, children }: { id: Section; anchor: (s: Section) => (el: HTMLElement | null) => void; children: React.ReactNode }) {
  return (
    <h4 ref={anchor(id)} className="font-display mb-2 mt-6 scroll-mt-12 text-xl">
      {children}
    </h4>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="font-display rounded-md border-2 border-[var(--ink)] bg-[var(--surface)] px-1.5 text-xs">{children}</kbd>;
}
