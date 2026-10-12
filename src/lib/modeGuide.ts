// Plain-English rules and card explanations for every mode, taken from the
// official instruction sheets of the UNO game each mode is based on.
import type { Card, GameMode } from '../game/types';

export interface GuideCard {
  card: Pick<Card, 'color' | 'value'> & { spin?: boolean };
  name: string;
  text: string;
  side?: 'light' | 'dark';
}

export interface ModeGuide {
  rules: { icon: string; title: string; text: string }[];
  cards: GuideCard[];
  scoring: string;
}

const NUNO = {
  icon: '📣',
  title: 'Shout NUNO!',
  text: 'Hit the NUNO! button when you’re about to play your second-to-last card. Forget, and anyone can catch you before the next player moves.',
};

export const GUIDES: Record<GameMode, ModeGuide> = {
  classic: {
    rules: [
      {
        icon: '🎯',
        title: 'Goal',
        text: 'Be the first to get rid of all your cards. You score what’s left in everyone else’s hands.',
      },
      {
        icon: '🃏',
        title: 'Your turn',
        text: 'Match the top card by colour, number or symbol, or play a Wild. Can’t (or don’t want to)? Draw one card — if it matches you may play it straight away.',
      },
      {
        icon: '⚖️',
        title: 'Challenging a +4',
        text: 'Wild Draw Four is only allowed when you hold no card of the current colour. Think it was a bluff? Challenge: if they bluffed they draw 4, if not you draw 6.',
      },
      { ...NUNO, text: `${NUNO.text} Caught? Draw 2.` },
      {
        icon: '🏁',
        title: 'First card',
        text: 'A Wild Draw Four goes back in the deck. A Wild lets the first player pick the colour. Skip, Reverse and Draw Two hit the first player.',
      },
    ],
    cards: [
      { card: { color: 'red', value: '7' }, name: 'Number', text: 'Match by colour or number.' },
      { card: { color: 'blue', value: 'skip' }, name: 'Skip', text: 'Next player loses their turn.' },
      {
        card: { color: 'green', value: 'reverse' },
        name: 'Reverse',
        text: 'Changes direction. With 2 players it works like a Skip.',
      },
      { card: { color: 'yellow', value: 'draw2' }, name: 'Draw Two', text: 'Next player draws 2 and loses their turn.' },
      { card: { color: 'wild', value: 'wild' }, name: 'Wild', text: 'Play on anything and name the colour.' },
      {
        card: { color: 'wild', value: 'wild4' },
        name: 'Wild Draw Four',
        text: 'Name the colour; next player draws 4 and loses their turn.',
      },
    ],
    scoring: 'Numbers: face value · Skip, Reverse, Draw Two: 20 · Wilds: 50 · First to 500 wins.',
  },

  nomercy: {
    rules: [
      {
        icon: '🃏',
        title: 'Draw until you can play',
        text: 'No match? Keep drawing until you get a card you can play — then you must play it.',
      },
      {
        icon: '🥞',
        title: 'Stacking',
        text: 'Hit by +2, +4, +6 or +10? Pass it on with a draw card of equal or higher value (any colour). Whoever can’t stack draws the whole pile and loses their turn.',
      },
      {
        icon: '🔄',
        title: '0 and 7',
        text: 'Play a 0 and everyone passes their hand along in the direction of play. Play a 7 and you must swap hands with a player you choose.',
      },
      {
        icon: '💀',
        title: 'Mercy Rule',
        text: 'Reach 25 cards and you’re knocked out of the round. Win by playing your last card — or by knocking everyone else out.',
      },
      { ...NUNO, text: `${NUNO.text} Caught? Draw 2.` },
      { icon: '🏁', title: 'First card', text: 'Action cards are ignored: cards are flipped until a number shows up.' },
    ],
    cards: [
      { card: { color: 'red', value: '0' }, name: '0 — Pass', text: 'Everyone passes their hand to the next player.' },
      { card: { color: 'blue', value: '7' }, name: '7 — Swap', text: 'Swap hands with any player you choose.' },
      { card: { color: 'green', value: 'skip' }, name: 'Skip', text: 'Next player loses their turn.' },
      {
        card: { color: 'yellow', value: 'reverse' },
        name: 'Reverse',
        text: 'Changes direction. With 2 players it works like a Skip.',
      },
      { card: { color: 'red', value: 'draw2' }, name: 'Draw Two', text: 'Next player draws 2 (stackable).' },
      {
        card: { color: 'blue', value: 'draw4' },
        name: 'Draw Four',
        text: 'Next player draws 4 (stackable). A coloured card — no colour to name.',
      },
      {
        card: { color: 'green', value: 'discardAll' },
        name: 'Discard All',
        text: 'Discard every card in your hand of this colour.',
      },
      { card: { color: 'yellow', value: 'skipAll' }, name: 'Skip Everyone', text: 'Everyone else is skipped — you go again.' },
      {
        card: { color: 'wild', value: 'wildReverse4' },
        name: 'Wild Reverse Draw Four',
        text: 'Reverse, then the next player draws 4. With 2 players YOU face the +4 unless you stack it back.',
      },
      {
        card: { color: 'wild', value: 'wild6' },
        name: 'Wild Draw Six',
        text: 'Name the colour; next player draws 6 (stackable).',
      },
      {
        card: { color: 'wild', value: 'wild10' },
        name: 'Wild Draw Ten',
        text: 'Name the colour; next player draws 10 (stackable).',
      },
      {
        card: { color: 'wild', value: 'wildRoulette' },
        name: 'Wild Color Roulette',
        text: 'Next player names a colour and flips cards until it appears (Wilds don’t count), keeps them all and loses their turn.',
      },
    ],
    scoring: 'Numbers: face value · Coloured actions: 20 · Wilds: 50 · Each player knocked out: 250 · First to 1000 wins.',
  },

  flip: {
    rules: [
      {
        icon: '🌗',
        title: 'Two sides',
        text: 'Every card has a Light Side and a Dark Side. Play a Flip card and the discard pile, the draw pile and every hand flip over.',
      },
      {
        icon: '👀',
        title: 'See their backs',
        text: 'You hold your cards facing you, so everyone else sees the other side of them — and you can see theirs. The top of the draw pile shows its other side too.',
      },
      {
        icon: '🃏',
        title: 'Your turn',
        text: 'Match by colour, number or symbol, or play a Wild. Can’t? Draw one card — if it matches you may play it.',
      },
      {
        icon: '⚖️',
        title: 'Challenges',
        text: 'Wild Draw Two and Wild Draw Color are only allowed with no card of the current colour. Challenge a bluff and they take the penalty; challenge a legal card and you take it plus 2 more.',
      },
      { icon: '🎨', title: 'Flipped onto a Wild?', text: 'If a Flip turns up a Wild, the player who flipped names the colour.' },
      { ...NUNO, text: `${NUNO.text} Caught? Draw 2.` },
    ],
    cards: [
      {
        card: { color: 'red', value: 'draw1' },
        name: 'Draw One',
        side: 'light',
        text: 'Next player draws 1 and loses their turn.',
      },
      { card: { color: 'blue', value: 'skip' }, name: 'Skip', side: 'light', text: 'Next player loses their turn.' },
      { card: { color: 'green', value: 'reverse' }, name: 'Reverse', side: 'light', text: 'Changes direction.' },
      { card: { color: 'yellow', value: 'flip' }, name: 'Flip', side: 'light', text: 'Flip everything to the Dark Side.' },
      {
        card: { color: 'wild', value: 'wildDraw2' },
        name: 'Wild Draw Two',
        side: 'light',
        text: 'Name the colour; next player draws 2 and loses their turn.',
      },
      {
        card: { color: 'pink', value: 'draw5' },
        name: 'Draw Five',
        side: 'dark',
        text: 'Next player draws 5 and loses their turn.',
      },
      {
        card: { color: 'teal', value: 'skipAll' },
        name: 'Skip Everyone',
        side: 'dark',
        text: 'Everyone is skipped and you play again.',
      },
      { card: { color: 'orange', value: 'reverse' }, name: 'Reverse', side: 'dark', text: 'Changes direction.' },
      { card: { color: 'purple', value: 'flip' }, name: 'Flip', side: 'dark', text: 'Flip everything back to the Light Side.' },
      {
        card: { color: 'wild', value: 'wildDrawColor' },
        name: 'Wild Draw Color',
        side: 'dark',
        text: 'Name a colour; next player draws until they get it and loses their turn.',
      },
    ],
    scoring:
      'Scored on the side the round ends on. Light: numbers face value, Draw One 10, Reverse/Skip/Flip 20, Wild 40, Wild Draw Two 50. Dark: Draw Five 20, Reverse/Flip 20, Skip Everyone 30, Wild 40, Wild Draw Color 60.',
  },

  attack: {
    rules: [
      {
        icon: '🚀',
        title: 'The launcher',
        text: 'There’s no drawing. If you can’t (or won’t) play, press the launcher. It might fire nothing — or a whole burst of cards. Either way your turn is over.',
      },
      {
        icon: '🎲',
        title: 'It’s random',
        text: 'Like the real launcher you never know what comes out: usually nothing, sometimes one or two, now and then a big burst.',
      },
      { icon: '🙅', title: 'No going out on a trade', text: 'You can’t play a Trade Hands as your last card.' },
      { icon: '👥', title: 'Two players', text: 'Reverse and Skip let you play again. After a Hit 2, it’s back to you.' },
      { ...NUNO, text: `${NUNO.text} Caught? Press the launcher twice.` },
    ],
    cards: [
      {
        card: { color: 'red', value: 'hit2' },
        name: 'Hit 2',
        text: 'Next player presses the launcher twice. Their turn is over.',
      },
      { card: { color: 'blue', value: 'skip' }, name: 'Skip', text: 'Next player loses their turn.' },
      { card: { color: 'green', value: 'reverse' }, name: 'Reverse', text: 'Changes direction.' },
      {
        card: { color: 'yellow', value: 'discardAll' },
        name: 'Discard All',
        text: 'Discard every card in your hand of this colour.',
      },
      { card: { color: 'red', value: 'tradeHands' }, name: 'Trade Hands', text: 'Trade your hand with any player you choose.' },
      { card: { color: 'wild', value: 'wild' }, name: 'Wild', text: 'Play on anything and name the colour.' },
      {
        card: { color: 'wild', value: 'wildAllHit' },
        name: 'Wild All Hit',
        text: 'Name the colour; every other player presses the launcher once.',
      },
      {
        card: { color: 'wild', value: 'wildHitFire' },
        name: 'Wild Hit-Fire',
        text: 'Name the colour; next player presses until it fires, keeps the cards and loses their turn.',
      },
    ],
    scoring: 'Numbers: face value · Reverse, Skip, Hit 2: 20 · Discard All, Trade Hands: 30 · Wilds: 50 · First to 500 wins.',
  },

  allwild: {
    rules: [
      { icon: '🌈', title: 'Every card is wild', text: 'No colours, no numbers, no matching — play any card on anything.' },
      {
        icon: '🃏',
        title: 'Draw instead?',
        text: 'You may draw a card instead of playing. Then play the card you drew, or pass.',
      },
      { icon: '🏁', title: 'First card', text: 'The action on the first card is ignored.' },
      { ...NUNO, text: `${NUNO.text} Caught? Draw 2.` },
    ],
    cards: [
      { card: { color: 'wild', value: 'wild' }, name: 'Wild', text: 'No action — just one card fewer.' },
      { card: { color: 'wild', value: 'wildSkip' }, name: 'Wild Skip', text: 'Next player loses their turn.' },
      { card: { color: 'wild', value: 'wildSkip2' }, name: 'Wild Skip Two', text: 'The next two players lose their turns.' },
      {
        card: { color: 'wild', value: 'wildReverse' },
        name: 'Wild Reverse',
        text: 'Changes direction. With 2 players it works like a Skip.',
      },
      { card: { color: 'wild', value: 'wildDraw2' }, name: 'Wild Draw Two', text: 'Next player draws 2 and loses their turn.' },
      { card: { color: 'wild', value: 'wildDraw4' }, name: 'Wild Draw Four', text: 'Next player draws 4 and loses their turn.' },
      {
        card: { color: 'wild', value: 'wildTargetDraw2' },
        name: 'Wild Targeted Draw Two',
        text: 'Pick any player: they draw 2 (and keep their turn).',
      },
      { card: { color: 'wild', value: 'wildSwap' }, name: 'Wild Forced Swap', text: 'Swap hands with a player you choose.' },
    ],
    scoring: 'Wild: 20 · Every other card: 50 · First to 500 wins.',
  },

  spin: {
    rules: [
      {
        icon: '🎡',
        title: 'Spin cards',
        text: 'Twenty number cards (1–5 in each colour) have a swirl. Play one and the next player spins the wheel instead of taking their turn.',
      },
      {
        icon: '🏁',
        title: 'Going out on a Spin',
        text: 'If your last card is a Spin card, the next player still spins and that is resolved before the points are counted.',
      },
      { icon: '🃏', title: 'Wild Draw Four', text: 'Only allowed when you hold no card of the current colour.' },
      {
        icon: '🔝',
        title: 'Wheel discards',
        text: 'When the wheel makes you discard several cards, you choose which one ends up on top.',
      },
      { ...NUNO, text: `${NUNO.text} Caught? Draw 2.` },
    ],
    cards: [
      {
        card: { color: 'red', value: '3', spin: true },
        name: 'Spin card',
        text: 'Plays like a number — then the next player spins.',
      },
      { card: { color: 'blue', value: 'skip' }, name: 'Skip', text: 'Next player loses their turn.' },
      {
        card: { color: 'green', value: 'reverse' },
        name: 'Reverse',
        text: 'Changes direction. With 2 players it works like a Skip.',
      },
      { card: { color: 'yellow', value: 'draw2' }, name: 'Draw Two', text: 'Next player draws 2 and loses their turn.' },
      { card: { color: 'wild', value: 'wild' }, name: 'Wild', text: 'Play on anything and name the colour.' },
      {
        card: { color: 'wild', value: 'wild4' },
        name: 'Wild Draw Four',
        text: 'Name the colour; next player draws 4 and loses their turn.',
      },
    ],
    scoring: 'Numbers: face value · Skip, Reverse, Draw Two: 20 · Wilds: 50 · First to 500 wins.',
  },
};

/** The nine wheel spaces, as written on the UNO Spin reference cards. */
export const WHEEL_INFO: Record<string, { name: string; text: string; icon: string; color: string }> = {
  almostUno: { name: 'Almost NUNO', text: 'Discard all but 2 cards.', icon: '✌️', color: '#e8333a' },
  discardNumber: {
    name: 'Discard Number',
    text: 'Pick a number and discard any or all cards of it.',
    icon: '#️⃣',
    color: '#2f72e0',
  },
  discardColor: {
    name: 'Discard Color',
    text: 'Pick a colour and discard any or all cards of it.',
    icon: '🎨',
    color: '#2eb34f',
  },
  drawRed: { name: 'Draw Red', text: 'Draw until you get a red card (or a Wild).', icon: '🟥', color: '#ad1820' },
  drawBlue: { name: 'Draw Blue', text: 'Draw until you get a blue card (or a Wild).', icon: '🟦', color: '#1a47aa' },
  tradeHands: { name: 'Trade Hands', text: 'Everyone passes their hand to the left.', icon: '🔄', color: '#7a4cdb' },
  showHand: { name: 'Show Hand', text: 'Show your hand to everyone.', icon: '👀', color: '#17aeab' },
  war: { name: 'War', text: 'Everyone shows their highest number. Highest discards it.', icon: '⚔️', color: '#f27a1f' },
  unoSpin: { name: 'NUNO Spin', text: 'Race! First to call it discards any one card.', icon: '⚡', color: '#ffc21a' },
};
