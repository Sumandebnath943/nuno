// Plain-English rules for every mode: how a turn works, every special rule,
// every card in the deck (with how many there are and what they score), the
// questions people actually ask, and scoring. Written to match exactly what
// the game engine does.
import type { Card, CardValue, GameMode } from '../game/types';

export interface GuideCard {
  card: Pick<Card, 'color' | 'value'> & { spin?: boolean };
  name: string;
  text: string;
  /** How many are in the deck. */
  count: number;
  /** Points when left in someone's hand. */
  points: number | string;
  side?: 'light' | 'dark';
}

export interface GuideRule {
  icon: string;
  title: string;
  text: string;
}

export interface ModeGuide {
  /** One paragraph: what this mode is. */
  intro: string;
  /** What changes compared with Classic. Empty for Classic. */
  differences: string[];
  /** Your turn, step by step. */
  turn: string[];
  rules: GuideRule[];
  cards: GuideCard[];
  faq: { q: string; a: string }[];
  scoring: string[];
  tips: string[];
}

const NUNO_RULE = (penalty: string): GuideRule => ({
  icon: '📣',
  title: 'Shout NUNO!',
  text: `Tap NUNO! when you have 2 cards on your turn (before or right after playing). If you drop to 1 card without shouting, any other player can tap CATCH! on you until the next player makes a move — ${penalty} You can still shout late to save yourself if nobody has caught you yet.`,
});

const RESHUFFLE: GuideRule = {
  icon: '🔁',
  title: 'Deck runs out',
  text: 'The discard pile (all but the top card) is shuffled into a new draw pile.',
};

export const GUIDES: Record<GameMode, ModeGuide> = {
  // ── Classic ─────────────────────────────────────────────
  classic: {
    intro:
      'The original. Get rid of all your cards by matching the top card of the discard pile. The first player to empty their hand wins the round and scores the cards left in everyone else’s hands.',
    differences: [],
    turn: [
      'Match the top card by colour, number or symbol — or play any Wild. The table felt shows the colour to play.',
      'Can’t (or don’t want to)? Tap the deck to draw one card. If it matches you may Play it straight away, or Keep it. Either way your turn ends.',
      'Down to 2 cards on your turn? Tap NUNO! before (or right after) you play.',
      'Play passes on in the direction of the arrows printed on the table rim.',
    ],
    rules: [
      {
        icon: '🃏',
        title: 'Setup',
        text: 'Everyone gets 7 cards. The player to the dealer’s left starts, and the dealer moves one seat each round.',
      },
      {
        icon: '⚖️',
        title: 'Challenging a Wild Draw Four',
        text: 'A Wild Draw Four is only legal if the player holds no card of the current colour (matching numbers and other Wilds are fine). If one is played on you, choose: Take it (draw 4, lose your turn) or Challenge. If they bluffed, THEY draw the 4 and you play normally. If it was legal, you draw 6 and lose your turn. Only the challenger gets to see the other player’s hand.',
      },
      NUNO_RULE('if caught you draw 2.'),
      {
        icon: '🏁',
        title: 'The first card',
        text: 'A Wild Draw Four goes back in the deck and another card is turned. A Wild: the first player names the colour. Draw Two: the first player draws 2 and is skipped. Skip: the first player is skipped. Reverse: the dealer plays first and play goes the other way.',
      },
      { icon: '👥', title: 'Two players', text: 'Reverse works like a Skip — you play again.' },
      {
        icon: '🏆',
        title: 'Going out',
        text: 'If your last card is a Draw Two or Wild Draw Four, the next player still draws those cards — and they count towards your points.',
      },
      RESHUFFLE,
    ],
    cards: [
      { card: { color: 'red', value: '7' }, name: 'Number cards 0–9', count: 76, points: 'face value', text: 'Match by colour or number. Each colour has one 0 and two of every 1–9.' },
      { card: { color: 'blue', value: 'skip' }, name: 'Skip', count: 8, points: 20, text: 'The next player loses their turn.' },
      { card: { color: 'green', value: 'reverse' }, name: 'Reverse', count: 8, points: 20, text: 'Play changes direction. With 2 players it works like a Skip.' },
      { card: { color: 'yellow', value: 'draw2' }, name: 'Draw Two', count: 8, points: 20, text: 'The next player draws 2 and loses their turn. (No stacking in Classic.)' },
      { card: { color: 'wild', value: 'wild' }, name: 'Wild', count: 4, points: 50, text: 'Play it on anything and name the colour to play next.' },
      {
        card: { color: 'wild', value: 'wild4' },
        name: 'Wild Draw Four',
        count: 4,
        points: 50,
        text: 'Name the colour; the next player draws 4 and loses their turn. Only legal when you hold no card of the current colour — it can be challenged.',
      },
    ],
    faq: [
      { q: 'Can I play a Wild Draw Four while holding a matching number?', a: 'Yes. Only cards of the current colour make it a bluff.' },
      { q: 'Can I draw even if I have a card I could play?', a: 'Yes. You draw one card, and you may play it if it matches.' },
      { q: 'Can I put a Draw Two on a Draw Two to pass it on?', a: 'Not in Classic: the next player just draws 2 and loses their turn. Stacking is a No Mercy rule.' },
      { q: 'What if I forget to shout NUNO?', a: 'Nothing happens unless someone taps CATCH! on you before the next player acts. Then you draw 2.' },
    ],
    scoring: [
      'The winner scores every card left in the other players’ hands.',
      'Numbers: face value · Skip, Reverse, Draw Two: 20 · Wild, Wild Draw Four: 50.',
      'First to 500 wins (or pick a single round, or 250).',
    ],
    tips: [
      'Hold on to a Wild for when you’re stuck.',
      'Watch the card counts: hit the player on 1–2 cards with your Skips and Draw Twos.',
    ],
  },

  // ── No Mercy ────────────────────────────────────────────
  nomercy: {
    intro:
      'UNO Show ’Em No Mercy: a 168-card deck packed with draw cards that stack, hand swaps, and a knock-out rule. Matching works like Classic — the mercy doesn’t.',
    differences: [
      '168 cards with many more draw cards — and no plain Wilds: every Wild does something.',
      'No match? You keep drawing until you can play — and then you must play it.',
      'Draw cards stack: pass the penalty on with an equal or bigger draw card.',
      'Playing a 0 passes every hand along; a 7 swaps hands with a player you choose.',
      'Hold 25 cards and you’re knocked out of the round.',
      'First to 1000 points.',
    ],
    turn: [
      'Match the top card by colour, number or symbol, or play a Wild.',
      'No match (or you’d rather draw)? Draw one card at a time until you get one you can play. You must then play it — no keeping.',
      'A red +N badge on the pile means a draw stack is aimed at you. You may only play a draw card worth the same or more (any colour) to pass it on — or tap “Take +N” to draw the whole pile and lose your turn.',
      'Down to 2 cards? Shout NUNO!',
    ],
    rules: [
      {
        icon: '🥞',
        title: 'Stacking, in detail',
        text: 'Draw values: Draw Two = 2, Draw Four and Wild Reverse Draw Four = 4, Wild Draw Six = 6, Wild Draw Ten = 10. Each card stacked must be worth at least as much as the last one (+2 on +2 is fine, +4 on +2 is fine, +2 on +4 is not). Colour doesn’t matter while stacking. The total keeps growing until someone can’t or won’t stack: they draw it all and lose their turn.',
      },
      {
        icon: '🔄',
        title: '0 and 7',
        text: 'Play a 0 and everyone passes their whole hand to the next player in the direction of play. Play a 7 and you must swap hands with a player you choose.',
      },
      {
        icon: '💀',
        title: 'Mercy Rule',
        text: 'The moment you hold 25 or more cards you’re out of the round, and your cards go under the discard pile. The round ends when someone plays their last card — or when everyone else has been knocked out.',
      },
      NUNO_RULE('if caught you draw 2 (which can push you over 25!).'),
      { icon: '🏁', title: 'The first card', text: 'Only a number can start: action cards are turned over until a number shows up.' },
      {
        icon: '👥',
        title: 'Two players',
        text: 'Reverse works like a Skip. A Wild Reverse Draw Four turns the +4 back on YOU — stack it or take it.',
      },
      {
        icon: '🏆',
        title: 'Going out',
        text: 'Playing your last card wins straight away — even a draw card. The next player doesn’t draw.',
      },
      RESHUFFLE,
    ],
    cards: [
      { card: { color: 'yellow', value: '5' }, name: 'Number cards', count: 64, points: 'face value', text: 'Two of each 1–6, 8 and 9 in every colour. Match by colour or number.' },
      { card: { color: 'red', value: '0' }, name: '0 — Pass Hands', count: 8, points: 0, text: 'Everyone passes their whole hand to the next player in the direction of play.' },
      { card: { color: 'blue', value: '7' }, name: '7 — Swap', count: 8, points: 7, text: 'Swap hands with any player you choose.' },
      { card: { color: 'green', value: 'skip' }, name: 'Skip', count: 12, points: 20, text: 'The next player loses their turn.' },
      { card: { color: 'yellow', value: 'reverse' }, name: 'Reverse', count: 12, points: 20, text: 'Play changes direction. With 2 players it works like a Skip.' },
      { card: { color: 'red', value: 'draw2' }, name: 'Draw Two', count: 12, points: 20, text: 'Starts (or adds to) a stack of +2. The next player stacks or draws.' },
      { card: { color: 'blue', value: 'draw4' }, name: 'Draw Four', count: 8, points: 20, text: 'A coloured +4: play it on its colour, on another Draw Four, or on a +2/+4 stack. No colour to name.' },
      { card: { color: 'green', value: 'discardAll' }, name: 'Discard All', count: 12, points: 20, text: 'Every other card of this colour in your hand goes onto the pile with it.' },
      { card: { color: 'yellow', value: 'skipAll' }, name: 'Skip Everyone', count: 8, points: 20, text: 'Everyone else is skipped — you play again right away.' },
      {
        card: { color: 'wild', value: 'wildReverse4' },
        name: 'Wild Reverse Draw Four',
        count: 8,
        points: 50,
        text: 'Name a colour, reverse the direction, then the next player in the new direction faces +4 (stackable).',
      },
      { card: { color: 'wild', value: 'wild6' }, name: 'Wild Draw Six', count: 4, points: 50, text: 'Name a colour; the next player faces +6 (stackable).' },
      { card: { color: 'wild', value: 'wild10' }, name: 'Wild Draw Ten', count: 4, points: 50, text: 'Name a colour; the next player faces +10 (stackable).' },
      {
        card: { color: 'wild', value: 'wildRoulette' },
        name: 'Wild Color Roulette',
        count: 8,
        points: 50,
        text: 'The next player names a colour and draws until that colour turns up (Wilds don’t count). They keep every card and lose their turn. It can’t be stacked.',
      },
    ],
    faq: [
      { q: 'Do I have to stack if I can?', a: 'No. Tap “Take +N” to draw the whole stack instead.' },
      { q: 'Can I stack a Wild Draw Six on a Draw Two?', a: 'Yes — bigger is always allowed. A Draw Two can’t go on a +4, though.' },
      { q: 'Can I play anything else while a stack is aimed at me?', a: 'No. Only a big enough draw card — or take the stack.' },
      { q: 'Does stacking change the colour?', a: 'Yes. The last card played sets the colour (the player of a Wild names it).' },
      { q: 'What happens to a knocked-out player’s cards?', a: 'They go under the discard pile. Each knockout is worth 250 points to the round’s winner.' },
    ],
    scoring: [
      'The winner scores every card left in the other players’ hands, plus 250 for each player knocked out.',
      'Numbers: face value · Coloured action cards: 20 · Wilds: 50.',
      'First to 1000 wins (or a single round, or 500).',
    ],
    tips: [
      'Save your +6 and +10 to bounce a stack back.',
      'A 0 or 7 can rescue a huge hand — dump it on whoever is about to win.',
      'Watch the “/25” counters: one big stack can knock someone out.',
    ],
  },

  // ── Flip ────────────────────────────────────────────────
  flip: {
    intro:
      'UNO Flip: every card has a Light Side and a Dark Side. A Flip card turns the whole game over — the pile, the deck and every hand — and the Dark Side is far nastier.',
    differences: [
      '112 two-sided cards and no zeros.',
      'Flip cards switch every card in the game to its other side.',
      'Light Side: Draw One and Wild Draw Two. Dark Side: Draw Five, Skip Everyone, Wild Draw Color — and four new colours (pink, teal, orange, purple).',
      'You see the other side of everyone else’s cards, and of the top of the deck.',
      'Wild Draw Two and Wild Draw Color can be challenged, like a Wild Draw Four.',
    ],
    turn: [
      'Match the top card by colour, number or symbol, or play a Wild.',
      'Can’t? Draw one card — if it matches you may play it, or keep it.',
      'The ☀️ / 🌑 badge at the top shows which side is in play.',
      'Down to 2 cards? Shout NUNO!',
    ],
    rules: [
      {
        icon: '🌗',
        title: 'Flipping',
        text: 'Play a Flip card and the discard pile is turned over (the Flip card ends up at the bottom), the draw pile is turned over, and everyone’s hand flips. The new top card sets the colour — if it’s a Wild, the player who flipped names the colour. Then it’s the next player’s turn.',
      },
      {
        icon: '👀',
        title: 'Seeing the other side',
        text: 'You hold your cards facing you, so everyone else sees their other side — and you see theirs. If someone’s hand is full of Dark Side Draw Fives, think twice before flipping!',
      },
      {
        icon: '⚖️',
        title: 'Challenges',
        text: 'Wild Draw Two (Light) and Wild Draw Color (Dark) are only legal with no card of the current colour. Take it: draw (2, or until the colour) and lose your turn. Challenge a bluff: they take the penalty and you play on. Challenge a legal card: you take the penalty plus 2 more and lose your turn.',
      },
      NUNO_RULE('if caught you draw 2.'),
      {
        icon: '🏁',
        title: 'The first card',
        text: 'Wild Draw Two goes back in the deck. A Wild: the first player names the colour. Draw One: the first player draws 1 and is skipped. Skip and Reverse work like Classic. A Flip card has no effect at the start.',
      },
      { icon: '👥', title: 'Two players', text: 'Reverse works like a Skip, and Skip Everyone simply lets you play again.' },
      { icon: '🏆', title: 'Going out', text: 'If your last card makes someone draw, they still draw — and those cards count for your points.' },
      RESHUFFLE,
    ],
    cards: [
      { card: { color: 'red', value: '7' }, side: 'light', name: 'Number cards 1–9', count: 72, points: 'face value', text: 'Two of each in every Light colour.' },
      { card: { color: 'red', value: 'draw1' }, side: 'light', name: 'Draw One', count: 8, points: 10, text: 'The next player draws 1 and loses their turn.' },
      { card: { color: 'blue', value: 'skip' }, side: 'light', name: 'Skip', count: 8, points: 20, text: 'The next player loses their turn.' },
      { card: { color: 'green', value: 'reverse' }, side: 'light', name: 'Reverse', count: 8, points: 20, text: 'Play changes direction.' },
      { card: { color: 'yellow', value: 'flip' }, side: 'light', name: 'Flip', count: 8, points: 20, text: 'Flip everything to the Dark Side.' },
      { card: { color: 'wild', value: 'wild' }, side: 'light', name: 'Wild', count: 4, points: 40, text: 'Play on anything and name the colour.' },
      {
        card: { color: 'wild', value: 'wildDraw2' },
        side: 'light',
        name: 'Wild Draw Two',
        count: 4,
        points: 50,
        text: 'Name the colour; the next player draws 2 and loses their turn. Can be challenged.',
      },
      { card: { color: 'pink', value: '7' }, side: 'dark', name: 'Number cards 1–9', count: 72, points: 'face value', text: 'Two of each in every Dark colour.' },
      { card: { color: 'pink', value: 'draw5' }, side: 'dark', name: 'Draw Five', count: 8, points: 20, text: 'The next player draws 5 and loses their turn.' },
      { card: { color: 'teal', value: 'skipAll' }, side: 'dark', name: 'Skip Everyone', count: 8, points: 30, text: 'Everyone else is skipped — you play again.' },
      { card: { color: 'orange', value: 'reverse' }, side: 'dark', name: 'Reverse', count: 8, points: 20, text: 'Play changes direction.' },
      { card: { color: 'purple', value: 'flip' }, side: 'dark', name: 'Flip', count: 8, points: 20, text: 'Flip everything back to the Light Side.' },
      { card: { color: 'wild', value: 'wild' }, side: 'dark', name: 'Wild', count: 4, points: 40, text: 'Play on anything and name a Dark colour.' },
      {
        card: { color: 'wild', value: 'wildDrawColor' },
        side: 'dark',
        name: 'Wild Draw Color',
        count: 4,
        points: 60,
        text: 'Name a colour; the next player draws until they get that colour (Wilds don’t stop it) and loses their turn. Can be challenged.',
      },
    ],
    faq: [
      { q: 'Which side do the points use?', a: 'Whichever side is in play when the round ends.' },
      { q: 'Can I play a Flip on a Flip?', a: 'Yes — it matches by symbol, so you flip straight back.' },
      { q: 'Is there a Wild Draw Four?', a: 'No. Light has Wild Draw Two, Dark has Wild Draw Color.' },
    ],
    scoring: [
      'Scored on the side in play when the round ends.',
      'Light: numbers face value · Draw One 10 · Reverse, Skip, Flip 20 · Wild 40 · Wild Draw Two 50.',
      'Dark: numbers face value · Draw Five, Reverse, Flip 20 · Skip Everyone 30 · Wild 40 · Wild Draw Color 60.',
      'First to 500 wins.',
    ],
    tips: ['Flip when the next player’s backs show a hand of weak Light cards… or a mean Dark one for you.', 'Wild Draw Color can bury someone — use it on whoever is close to winning.'],
  },

  // ── Attack ──────────────────────────────────────────────
  attack: {
    intro:
      'UNO Attack: there’s no pile to draw from — there’s a card launcher. Hit it and pray: usually nothing comes out, sometimes a whole spray of cards.',
    differences: [
      'No drawing: you hit the launcher instead.',
      'Hitting the launcher always ends your turn — even if nothing fires, and you can’t play what does.',
      'New cards: Hit 2, Discard All, Trade Hands, Wild All Hit and Wild Hit-Fire.',
      '112 cards and no zeros.',
      'Forgetting NUNO costs two launcher hits instead of two cards.',
    ],
    turn: [
      'Match the top card by colour, number or symbol, or play a Wild.',
      'Can’t (or won’t)? Hit the launcher once. Whatever fires goes into your hand, and your turn is over.',
      'When a card makes you hit the launcher, the button turns red: “Hit! (2)” or “Hit until it fires!”.',
      'Down to 2 cards? Shout NUNO!',
    ],
    rules: [
      {
        icon: '🎲',
        title: 'The launcher',
        text: 'Random, like the real toy: nothing 60% of the time, 1–3 cards 25%, 4–6 cards 10%, 7–10 cards 5%.',
      },
      { icon: '💥', title: 'Hit 2', text: 'The next player hits the launcher twice, then loses their turn.' },
      {
        icon: '🌊',
        title: 'Wild All Hit',
        text: 'Name a colour. Every other player, starting with the next one, hits the launcher once. Then the next player takes their turn as normal.',
      },
      {
        icon: '🔥',
        title: 'Wild Hit-Fire',
        text: 'Name a colour. The next player keeps hitting until at least one card fires, keeps them all, and loses their turn.',
      },
      { icon: '🔄', title: 'Trade Hands', text: 'Swap hands with any player you choose. You can’t play it as your last card.' },
      NUNO_RULE('if caught you hit the launcher twice.'),
      {
        icon: '🏁',
        title: 'The first card',
        text: 'Trade Hands goes back in the deck. Hit 2: the first player hits twice and is skipped. Wild All Hit: the first player names the colour, everyone except the dealer hits once, then the first player plays. Wild Hit-Fire: the first player names the colour, hits until it fires and is skipped. Skip and Reverse work like Classic.',
      },
      { icon: '👥', title: 'Two players', text: 'Reverse and Skip let you play again. After you play a Hit 2, it’s your turn again.' },
      { icon: '🏆', title: 'Going out', text: 'If your last card is Wild All Hit or Wild Hit-Fire, the hits still happen before the points are counted.' },
      RESHUFFLE,
    ],
    cards: [
      { card: { color: 'red', value: '7' }, name: 'Number cards 1–9', count: 72, points: 'face value', text: 'Two of each in every colour. Match by colour or number.' },
      { card: { color: 'red', value: 'hit2' }, name: 'Hit 2', count: 8, points: 20, text: 'The next player hits the launcher twice and loses their turn.' },
      { card: { color: 'blue', value: 'skip' }, name: 'Skip', count: 8, points: 20, text: 'The next player loses their turn.' },
      { card: { color: 'green', value: 'reverse' }, name: 'Reverse', count: 8, points: 20, text: 'Play changes direction.' },
      { card: { color: 'yellow', value: 'discardAll' }, name: 'Discard All', count: 4, points: 30, text: 'Every other card of this colour in your hand goes onto the pile with it.' },
      { card: { color: 'red', value: 'tradeHands' }, name: 'Trade Hands', count: 4, points: 30, text: 'Swap hands with any player. Not allowed as your last card.' },
      { card: { color: 'wild', value: 'wild' }, name: 'Wild', count: 4, points: 50, text: 'Play on anything and name the colour.' },
      { card: { color: 'wild', value: 'wildAllHit' }, name: 'Wild All Hit', count: 2, points: 50, text: 'Name the colour; every other player hits the launcher once.' },
      { card: { color: 'wild', value: 'wildHitFire' }, name: 'Wild Hit-Fire', count: 2, points: 50, text: 'Name the colour; the next player hits until cards fire and loses their turn.' },
    ],
    faq: [
      { q: 'The launcher fired a card I could play. Can I play it?', a: 'No — hitting the launcher ends your turn.' },
      { q: 'Can I hit the launcher even if I have a playable card?', a: 'Yes. It’s a gamble, but it’s allowed.' },
      { q: 'What if the launcher runs dry during Hit-Fire?', a: 'The discard pile is reshuffled in. If there’s truly nothing left, your hitting stops.' },
    ],
    scoring: [
      'The winner scores every card left in the other players’ hands.',
      'Numbers: face value · Reverse, Skip, Hit 2: 20 · Discard All, Trade Hands: 30 · Wilds: 50.',
      'First to 500 wins.',
    ],
    tips: ['Trade Hands is brutal on whoever has the fewest cards.', 'Discard All can empty half your hand in one go.'],
  },

  // ── All Wild ────────────────────────────────────────────
  allwild: {
    intro: 'UNO All Wild: every single card is a Wild. There’s no matching at all — any card can always be played. It’s all about the actions.',
    differences: [
      '112 cards, all Wild: no colours and no numbers.',
      'Any card goes on any card — you never have to draw.',
      'You may still draw instead of playing, then play the card you drew or keep it.',
      'No colour to name and no challenges.',
    ],
    turn: [
      'Play any card from your hand — everything matches.',
      'Or draw one card: play it right away, or keep it (your turn ends).',
      'Down to 2 cards? Shout NUNO!',
    ],
    rules: [
      { icon: '🎯', title: 'Targeted Draw Two', text: 'Pick any player: they draw 2 but do NOT lose their turn. Then play carries on to the next player.' },
      { icon: '🔀', title: 'Forced Swap', text: 'Swap hands with a player you choose.' },
      { icon: '⏭️', title: 'Skip Two', text: 'The next two players both lose their turns.' },
      NUNO_RULE('if caught you draw 2.'),
      { icon: '🏁', title: 'The first card', text: 'Whatever it is, its action is ignored.' },
      { icon: '👥', title: 'Two players', text: 'Reverse works like a Skip, and Skip Two lets you play again.' },
      { icon: '🏆', title: 'Going out', text: 'Your last card’s action doesn’t happen — you simply win.' },
      RESHUFFLE,
    ],
    cards: [
      { card: { color: 'wild', value: 'wild' }, name: 'Wild', count: 54, points: 20, text: 'No action — just one card fewer.' },
      { card: { color: 'wild', value: 'wildSkip' }, name: 'Wild Skip', count: 14, points: 50, text: 'The next player loses their turn.' },
      { card: { color: 'wild', value: 'wildReverse' }, name: 'Wild Reverse', count: 14, points: 50, text: 'Play changes direction. With 2 players it works like a Skip.' },
      { card: { color: 'wild', value: 'wildDraw2' }, name: 'Wild Draw Two', count: 10, points: 50, text: 'The next player draws 2 and loses their turn.' },
      { card: { color: 'wild', value: 'wildSkip2' }, name: 'Wild Skip Two', count: 6, points: 50, text: 'The next two players lose their turns.' },
      { card: { color: 'wild', value: 'wildDraw4' }, name: 'Wild Draw Four', count: 6, points: 50, text: 'The next player draws 4 and loses their turn. It can’t be challenged here.' },
      { card: { color: 'wild', value: 'wildTargetDraw2' }, name: 'Wild Targeted Draw Two', count: 4, points: 50, text: 'Pick any player: they draw 2 and keep their turn.' },
      { card: { color: 'wild', value: 'wildSwap' }, name: 'Wild Forced Swap', count: 4, points: 50, text: 'Swap hands with a player you choose.' },
    ],
    faq: [
      { q: 'Why would I ever draw?', a: 'To save a nasty card for later — or when every card you hold would help the next player.' },
      { q: 'Can a Forced Swap be my last card?', a: 'Yes, and then you just win — the swap doesn’t happen.' },
    ],
    scoring: ['The winner scores every card left in the other players’ hands.', 'Wild: 20 · every other card: 50.', 'First to 500 wins.'],
    tips: ['Save Skip Two and Draw Four for when the next player is on one card.', 'Forced Swap someone holding fewer cards than you.'],
  },

  // ── Spin ────────────────────────────────────────────────
  spin: {
    intro: 'UNO Spin: Classic UNO with a prize wheel. Play a Spin card and the next player has to spin — and the wheel can be a gift or a disaster.',
    differences: [
      '20 of the number cards (1–5 in every colour) are Spin cards with a swirl.',
      'Play one and the next player spins the wheel instead of taking their turn.',
      'Wild Draw Four can’t be challenged — you simply can’t play it while you hold the current colour.',
      'Nine wheel spaces, from “Almost NUNO” to War.',
    ],
    turn: [
      'Match the top card by colour, number or symbol, or play a Wild.',
      'Can’t? Draw one card — if it matches you may play it, or keep it.',
      'Someone played a Spin card on you? Tap SPIN! instead. After the wheel’s effect, play moves on to the player after you.',
      'Down to 2 cards? Shout NUNO!',
    ],
    rules: [
      { icon: '🎡', title: 'Spin cards', text: 'They play like normal numbers (match colour or number). Then the next player spins.' },
      {
        icon: '⚔️',
        title: 'War',
        text: 'Everyone shows their highest number card. The highest one is discarded onto the pile and becomes the top card. Tied players compare their next-highest, and so on; if still tied, nobody discards. Play continues after the War winner.',
      },
      {
        icon: '⚡',
        title: 'NUNO Spin race',
        text: 'Everyone with cards races to tap NUNO SPIN. The first one discards any card they like, and play continues after them.',
      },
      {
        icon: '🔝',
        title: 'Wheel discards',
        text: 'When the wheel makes you discard several cards you choose which one lands on top — it sets the colour (name one if it’s a Wild). Emptying your hand this way wins the round.',
      },
      {
        icon: '🏆',
        title: 'Going out on a Spin card',
        text: 'The next player still spins, and that is resolved before the points are counted.',
      },
      NUNO_RULE('if caught you draw 2.'),
      {
        icon: '🏁',
        title: 'The first card',
        text: 'Like Classic: a Wild Draw Four goes back in the deck. A Spin card as the first card doesn’t trigger the wheel.',
      },
      { icon: '👥', title: 'Two players', text: 'Reverse works like a Skip.' },
      RESHUFFLE,
    ],
    cards: [
      { card: { color: 'red', value: '3', spin: true }, name: 'Spin card (1–5)', count: 20, points: 'face value', text: 'Plays like a number — then the next player spins the wheel.' },
      { card: { color: 'green', value: '8' }, name: 'Number cards 0–9', count: 56, points: 'face value', text: 'Match by colour or number.' },
      { card: { color: 'blue', value: 'skip' }, name: 'Skip', count: 8, points: 20, text: 'The next player loses their turn.' },
      { card: { color: 'green', value: 'reverse' }, name: 'Reverse', count: 8, points: 20, text: 'Play changes direction. With 2 players it works like a Skip.' },
      { card: { color: 'yellow', value: 'draw2' }, name: 'Draw Two', count: 8, points: 20, text: 'The next player draws 2 and loses their turn.' },
      { card: { color: 'wild', value: 'wild' }, name: 'Wild', count: 4, points: 50, text: 'Play on anything and name the colour.' },
      {
        card: { color: 'wild', value: 'wild4' },
        name: 'Wild Draw Four',
        count: 4,
        points: 50,
        text: 'Name the colour; the next player draws 4 and loses their turn. Only playable when you hold no card of the current colour.',
      },
    ],
    faq: [
      { q: 'Who plays after the wheel?', a: 'The player after the one who spun — except War and the NUNO Spin race, where play continues after the winner.' },
      { q: 'What does Trade Hands do on the wheel?', a: 'Everyone passes their hand one seat clockwise, whichever way play is going.' },
      { q: 'Can I keep all my cards on Discard Number or Discard Color?', a: 'Yes — you may discard any or all of them, including none.' },
    ],
    scoring: [
      'The winner scores every card left in the other players’ hands.',
      'Numbers (and Spin cards): face value · Skip, Reverse, Draw Two: 20 · Wilds: 50.',
      'First to 500 wins.',
    ],
    tips: ['Play a Spin card on whoever is about to win — the wheel might give them Draw Red.', 'Keep high numbers for War.'],
  },
};

/** What everything on the table means — the same in every mode. */
export const TABLE_GUIDE: GuideRule[] = [
  { icon: '🟢', title: 'The felt', text: 'The table turns the colour you have to play.' },
  { icon: '↻', title: 'The arrows', text: 'The arrows on the rim show which way play is going.' },
  { icon: '✨', title: 'Glowing cards', text: 'Cards you can play right now glow and rise up.' },
  { icon: '👆', title: 'What does it do?', text: 'Hover a card (or tap it once on a phone) to read what it does. Tap the discard pile to explain the top card.' },
  { icon: '📜', title: 'The log', text: 'The scroll button at the top lists the last moves, so you never miss what a bot just did.' },
  { icon: '👉', title: 'CATCH!', text: 'Appears over anyone who forgot to shout NUNO. Tap it fast!' },
  { icon: '💬', title: 'Trash talk', text: 'Tap Talk on your name plate to fling a line at the table.' },
  { icon: '⚙️', title: 'Settings', text: 'Pick a theme, slow the game down, and set the sound and music.' },
];

/** The nine wheel spaces, as written on the UNO Spin reference cards. */
export const WHEEL_INFO: Record<string, { name: string; text: string; icon: string; color: string }> = {
  almostUno: { name: 'Almost NUNO', text: 'Keep the 2 cards you choose and discard all the rest.', icon: '✌️', color: '#e8333a' },
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
  tradeHands: { name: 'Trade Hands', text: 'Everyone passes their hand one seat clockwise.', icon: '🔄', color: '#7a4cdb' },
  showHand: { name: 'Show Hand', text: 'Show your hand to everyone.', icon: '👀', color: '#17aeab' },
  war: { name: 'War', text: 'Everyone shows their highest number. Highest discards it.', icon: '⚔️', color: '#f27a1f' },
  unoSpin: { name: 'NUNO Spin', text: 'Race! First to call it discards any one card.', icon: '⚡', color: '#ffc21a' },
};

const DARK = new Set(['pink', 'teal', 'orange', 'purple']);

/** A short "what does this card do" for in-game help. Plain numbers return null. */
export function cardHelp(mode: GameMode, card: Pick<Card, 'color' | 'value'> & { spin?: boolean }): { name: string; text: string } | null {
  const guide = GUIDES[mode];
  const isNum = /^\d$/.test(card.value);
  if (card.spin) {
    const hit = guide.cards.find((c) => c.card.spin);
    return hit ? { name: 'Spin card', text: hit.text } : null;
  }
  if (isNum) {
    if (mode === 'nomercy' && (card.value === '0' || card.value === '7')) {
      const hit = guide.cards.find((c) => c.card.value === card.value);
      return hit ? { name: hit.name, text: hit.text } : null;
    }
    return null;
  }
  const side = DARK.has(card.color) || card.value === 'wildDrawColor' ? 'dark' : 'light';
  const hit =
    guide.cards.find((c) => c.card.value === (card.value as CardValue) && (!c.side || c.side === side)) ??
    guide.cards.find((c) => c.card.value === card.value);
  return hit ? { name: hit.name, text: hit.text } : null;
}
