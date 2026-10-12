import React, { useEffect, useRef, useState } from 'react';
import type { GameMode } from '../game/types';
import { MODE_ORDER, MODES } from '../game/modes';
import { GUIDES, WHEEL_INFO } from '../lib/modeGuide';
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

export const RulesModal: React.FC<Props> = ({ open, onClose, mode = 'classic', focus = 'rules' }) => {
  const [tab, setTab] = useState<GameMode>(mode);
  const body = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setTab(mode);
    requestAnimationFrame(() => {
      if (focus === 'cards') cardsRef.current?.scrollIntoView({ block: 'start' });
      else body.current?.scrollTo({ top: 0 });
    });
  }, [open, mode, focus]);

  const close = () => {
    sfx.click();
    onClose();
  };
  const guide = GUIDES[tab];
  const info = MODES[tab];

  return (
    <Modal open={open} onClose={close} className="max-w-3xl">
      <div className="flex items-center justify-between gap-3 border-b-[3px] border-[var(--ink)] px-4 pb-2 pt-3 sm:px-5 sm:pt-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl sm:text-3xl">How to play</h2>
          <p className="truncate text-sm font-medium text-[#6b6385]">Official rules of each UNO game. Nothing made up.</p>
        </div>
        <CloseButton onClick={close} />
      </div>

      {/* mode tabs */}
      <div
        className="nice-scroll flex shrink-0 gap-1.5 overflow-x-auto border-b-2 border-[#e3d9c3] px-4 py-2 sm:px-5"
        role="tablist"
      >
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

      <div ref={body} className="nice-scroll min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-2">
          <h3 className="font-display text-2xl">
            {info.icon} NUNO {info.name}
          </h3>
          <span className="text-sm font-semibold text-[#6b6385]">
            based on {info.basedOn} · {info.deckSize} cards
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {guide.rules.map((r) => (
            <section key={r.title} className="rounded-2xl border-[2.5px] border-[var(--ink)] bg-white p-3.5">
              <h4 className="font-display mb-0.5 flex items-center gap-2 text-lg">
                <span aria-hidden>{r.icon}</span> {r.title}
              </h4>
              <p className="text-sm leading-relaxed text-[#4d4566]">{r.text}</p>
            </section>
          ))}
        </div>

        <div ref={cardsRef} className="scroll-mt-2 pt-5">
          <h4 className="font-display mb-2 text-xl">The cards</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {guide.cards.map((c) => (
              <div key={c.name + (c.side ?? '')} className="flex items-center gap-3 rounded-2xl bg-white/60 p-2">
                <CardView card={c.card} side={c.side} width={50} />
                <div className="min-w-0 text-sm leading-snug text-[#4d4566]">
                  <div className="font-display text-base text-[var(--ink)]">
                    {c.name}
                    {c.side && (
                      <span
                        className={`ml-1.5 rounded px-1 text-[10px] uppercase ${c.side === 'dark' ? 'bg-[#141019] text-white' : 'bg-[#efe6d2]'}`}
                      >
                        {c.side}
                      </span>
                    )}
                  </div>
                  {c.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        {tab === 'spin' && (
          <div className="pt-5">
            <h4 className="font-display mb-2 text-xl">The wheel</h4>
            <div className="grid gap-2 sm:grid-cols-3">
              {Object.values(WHEEL_INFO).map((w) => (
                <div key={w.name} className="rounded-2xl border-2 border-[var(--ink)] bg-white p-2.5 text-sm">
                  <div className="font-display flex items-center gap-1.5 text-base">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-sm"
                      style={{ background: w.color }}
                    >
                      {w.icon}
                    </span>
                    {w.name}
                  </div>
                  <p className="mt-0.5 text-[#4d4566]">{w.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 rounded-2xl border-[2.5px] border-[var(--ink)] bg-[#fff1a8] p-3.5 text-sm">
          <span className="font-display text-base">🏆 Scoring · </span>
          <span className="text-[#4d4566]">{guide.scoring}</span>
        </div>

        <div className="mt-3 hidden rounded-2xl border-[2.5px] border-dashed border-[#c9bfa8] p-3.5 text-sm text-[#4d4566] sm:block">
          <span className="font-display text-[var(--ink)]">Keyboard:</span> <Kbd>D</Kbd> draw / launch · <Kbd>K</Kbd> keep drawn
          card · <Kbd>U</Kbd> or <Kbd>Space</Kbd> shout NUNO · <Kbd>S</Kbd> sort your cards
        </div>
      </div>
    </Modal>
  );
};

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="font-display rounded-md border-2 border-[var(--ink)] bg-white px-1.5 text-xs">{children}</kbd>;
}
