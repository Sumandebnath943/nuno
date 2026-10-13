// Trash talk: ready-made lines you can fling at the table. They float up from
// your seat for everyone to see. Every theme adds its own lines.
import type { BotMoment } from '../game/host';
import type { BotPersona } from '../game/bot';
import type { ThemeId } from './settings';
import { CHARACTER_TAUNTS, linesFor } from './characterTaunts';

/** A sound from the effects library (see fxSounds in sound.ts). */
export type TauntSound =
  | 'laugh'
  | 'airhorn'
  | 'sadTrombone'
  | 'boing'
  | 'neener'
  | 'quack'
  | 'rimshot'
  | 'crickets'
  | 'applause'
  | 'wolfWhistle'
  | 'dunDun'
  | 'drumroll'
  | 'chaChing'
  | 'scratch'
  | 'tada'
  | 'gong'
  | 'shing'
  | 'poof'
  | 'kiCharge'
  | 'cannon'
  | 'stomp'
  | 'boom';

export interface Taunt {
  id: string;
  text: string;
  sound: TauntSound;
  /** Mood, so bots pick fitting lines. */
  mood: 'brag' | 'mock' | 'ouch' | 'nice' | 'hurry';
}

const t = (id: string, text: string, sound: TauntSound, mood: Taunt['mood']): Taunt => ({ id, text, sound, mood });

export const GENERAL_TAUNTS: Taunt[] = [
  t('g:easy', 'Too easy 😎', 'laugh', 'brag'),
  t('g:weep', 'Read ’em and weep 🃏', 'airhorn', 'brag'),
  t('g:calc', 'Calculated. 🧠', 'tada', 'brag'),
  t('g:fire', 'I’m ON FIRE 🔥', 'airhorn', 'brag'),
  t('g:neener', 'Nyah nyah! 😜', 'neener', 'mock'),
  t('g:skill', 'Skill issue 🤷', 'rimshot', 'mock'),
  t('g:allgot', 'Is that all you got?', 'laugh', 'mock'),
  t('g:draw', 'Draw, draw, draw! 🃏', 'quack', 'mock'),
  t('g:sorry', 'Sorry, not sorry 🙃', 'wolfWhistle', 'mock'),
  t('g:crickets', '…awkward 🦗', 'crickets', 'mock'),
  t('g:ouch', 'That hurt 😭', 'sadTrombone', 'ouch'),
  t('g:revenge', 'Revenge is coming 😤', 'dunDun', 'ouch'),
  t('g:why', 'Why me?! 😩', 'sadTrombone', 'ouch'),
  t('g:wait', 'Wait for it… 🍿', 'drumroll', 'hurry'),
  t('g:hurry', 'Any day now ⏰', 'boing', 'hurry'),
  t('g:gg', 'GG, well played 🤝', 'applause', 'nice'),
  t('g:nice', 'Nice one 👏', 'applause', 'nice'),
  t('g:lucky', 'Lucky draw 🍀', 'chaChing', 'nice'),
];

/** Lines that only make sense with a theme on. */
export const THEME_TAUNTS: Record<ThemeId, Taunt[]> = {
  classic: [],
  naruto: [
    t('n:way', 'My ninja way: never draw! 🍥', 'poof', 'brag'),
    t('n:clone', 'Shadow clone… of a +4! 👥', 'poof', 'brag'),
    t('n:ramen', 'Loser buys the ramen 🍜', 'neener', 'mock'),
    t('n:eyes', 'My eyes saw that coming 👁️', 'shing', 'brag'),
    t('n:academy', 'Back to the Academy, rookie', 'laugh', 'mock'),
    t('n:chakra', 'Out of chakra already? 😮‍💨', 'crickets', 'mock'),
    t('n:believe', 'Believe it! I’m winning!', 'airhorn', 'brag'),
    t('n:ouch', 'That jutsu hurt 😵', 'sadTrombone', 'ouch'),
  ],
  mha: [
    t('m:beyond', 'Go beyond… your hand size! 💪', 'airhorn', 'brag'),
    t('m:here', 'Fear not! I am HERE! 😁', 'tada', 'brag'),
    t('m:smash', 'SMAAASH!! 💥', 'boom', 'brag'),
    t('m:quirk', 'Your quirk? Losing.', 'rimshot', 'mock'),
    t('m:extra', 'Total extra 🙄', 'laugh', 'mock'),
    t('m:rank', 'Hero ranking: you’re last', 'neener', 'mock'),
    t('m:villain', 'Villain behaviour 😤', 'dunDun', 'ouch'),
    t('m:license', 'Revoke their hero license!', 'boing', 'ouch'),
  ],
  onepiece: [
    t('o:king', 'I’m gonna be NUNO King! 👒', 'airhorn', 'brag'),
    t('o:bounty', 'Your bounty just crashed ฿', 'chaChing', 'mock'),
    t('o:meat', 'Winner gets the meat 🍖', 'tada', 'brag'),
    t('o:lost', 'Lost? Ask the swordsman for directions', 'laugh', 'mock'),
    t('o:plank', 'Walk the plank! 🏴‍☠️', 'cannon', 'mock'),
    t('o:treasure', 'Treasure’s mine 💰', 'chaChing', 'brag'),
    t('o:sink', 'My ship is sinking 😱', 'sadTrombone', 'ouch'),
    t('o:nakama', 'Respect, nakama 🤝', 'applause', 'nice'),
  ],
  aot: [
    t('a:fight', 'Tatakae! Keep drawing! ⚔️', 'shing', 'brag'),
    t('a:titan', 'Titan-sized +4 incoming 🦶', 'stomp', 'brag'),
    t('a:wall', 'The wall has fallen… so have you', 'dunDun', 'mock'),
    t('a:wipe', 'I’ll wipe out every last card!', 'airhorn', 'brag'),
    t('a:potato', 'Want a potato? You’ll need it 🥔', 'laugh', 'mock'),
    t('a:scout', 'Survey says: you lose 📋', 'rimshot', 'mock'),
    t('a:devour', 'I just got devoured 😱', 'sadTrombone', 'ouch'),
    t('a:salute', 'Salute! Good game 🫡', 'applause', 'nice'),
  ],
  demonslayer: [
    t('d:focus', 'Total Concentration… 🌬️', 'shing', 'brag'),
    t('d:ablaze', 'Set your heart ablaze! 🔥', 'airhorn', 'brag'),
    t('d:water', 'Water Breathing: +2 🌊', 'shing', 'brag'),
    t('d:smell', 'I can smell your fear 👃', 'laugh', 'mock'),
    t('d:boar', 'PIG ASSAULT! 🐗', 'boom', 'mock'),
    t('d:weak', 'Your hand is weak, demon', 'dunDun', 'mock'),
    t('d:cry', 'I’m gonna die here 😭', 'sadTrombone', 'ouch'),
    t('d:bow', 'Honourable game 🙇', 'gong', 'nice'),
  ],
  dbz: [
    t('z:9000', 'Power level: OVER 9000! 💥', 'kiCharge', 'brag'),
    t('z:beam', 'Kame-hame… +4!!', 'kiCharge', 'brag'),
    t('z:prince', 'Bow to the Prince of NUNO 👑', 'airhorn', 'brag'),
    t('z:weak', 'Pathetic power level', 'laugh', 'mock'),
    t('z:senzu', 'Someone throw me a senzu 🫘', 'sadTrombone', 'ouch'),
    t('z:wish', 'I wish for… your cards 🐉', 'gong', 'mock'),
    t('z:fusion', 'Even fused you’d lose', 'rimshot', 'mock'),
    t('z:respect', 'You’ve grown stronger 🤝', 'applause', 'nice'),
  ],
};

const ALL = new Map<string, Taunt>(
  [...GENERAL_TAUNTS, ...Object.values(THEME_TAUNTS).flat(), ...Object.values(CHARACTER_TAUNTS).flat()].map((x) => [x.id, x]),
);

/** Looks a taunt up by id, whatever theme the sender was using. */
export function findTaunt(id: string | undefined): Taunt | undefined {
  return id ? ALL.get(id) : undefined;
}

const MOMENT_MOODS: Record<BotMoment, Taunt['mood'][]> = {
  attack: ['brag', 'mock'],
  skip: ['mock'],
  swap: ['brag', 'mock'],
  caught: ['mock', 'brag'],
  knockout: ['brag', 'mock'],
  uno: ['brag', 'hurry'],
  win: ['brag', 'nice'],
  hit: ['ouch'],
  busted: ['ouch'],
};

const pick = <T>(list: T[]): T | undefined => list[Math.floor(Math.random() * list.length)];

/**
 * A fitting line for a bot. A character speaks in their own voice nearly every
 * time; everyone else mixes the theme's lines with the general ones.
 */
export function botTaunt(moment: BotMoment, theme: ThemeId, avatar?: string): Taunt | undefined {
  const moods = MOMENT_MOODS[moment];
  const own = linesFor(avatar)?.filter((x) => moods.includes(x.mood)) ?? [];
  if (own.length && Math.random() < 0.85) return pick(own);
  const pool = [...THEME_TAUNTS[theme], ...THEME_TAUNTS[theme], ...GENERAL_TAUNTS].filter((x) => moods.includes(x.mood));
  return pick(pool);
}

/** Opponents that fit the theme. */
export const THEME_BOTS: Partial<Record<ThemeId, BotPersona[]>> = {
  naruto: [
    { name: 'Ramen Rookie', avatar: '🍜' },
    { name: 'Lazy Strategist', avatar: '☁️' },
    { name: 'Book-Reading Sensei', avatar: '📕' },
    { name: 'Shadow Clone #7', avatar: '👥' },
    { name: 'Bug Whisperer', avatar: '🐞' },
    { name: 'Toad Sage', avatar: '🐸' },
    { name: 'Sand Sibling', avatar: '⏳' },
    { name: 'Puppy Ninja', avatar: '🐶' },
    { name: 'Youthful Spandex', avatar: '💚' },
    { name: 'Snake Sannin', avatar: '🐍' },
    { name: 'Avenger Kid', avatar: '⚡' },
  ],
  mha: [
    { name: 'Explosive Temper', avatar: '💥' },
    { name: 'Hot & Cold', avatar: '🧊' },
    { name: 'Zero-Gravity Gal', avatar: '🪐' },
    { name: 'Frog Hero', avatar: '🐸' },
    { name: 'Engine Legs', avatar: '🏎️' },
    { name: 'Electric Goof', avatar: '⚡' },
    { name: 'Number One Hero', avatar: '💪' },
    { name: 'Sleepy Eraser', avatar: '🧣' },
    { name: 'Invisible Girl', avatar: '👻' },
    { name: 'Hardening Bro', avatar: '🪨' },
    { name: 'Hand Villain', avatar: '🖐️' },
  ],
  onepiece: [
    { name: 'Rubber Captain', avatar: '👒' },
    { name: 'Three-Sword Zed', avatar: '⚔️' },
    { name: 'Tangerine Navigator', avatar: '🍊' },
    { name: 'Long-Nose Liar', avatar: '🎯' },
    { name: 'Kick Chef', avatar: '🍳' },
    { name: 'Reindeer Doc', avatar: '🦌' },
    { name: 'Skeleton Violinist', avatar: '💀' },
    { name: 'Cola Cyborg', avatar: '🤖' },
    { name: 'Flower Archaeologist', avatar: '🌸' },
    { name: 'Fishman Helmsman', avatar: '🐟' },
    { name: 'Red-Haired Emperor', avatar: '🍶' },
  ],
  aot: [
    { name: 'Titan Hater', avatar: '🗡️' },
    { name: 'Scarf Ace', avatar: '🧣' },
    { name: 'Potato Girl', avatar: '🥔' },
    { name: 'Humanity’s Strongest', avatar: '🧹' },
    { name: 'Mad Titan Scientist', avatar: '🧪' },
    { name: 'Armored Guy', avatar: '🛡️' },
    { name: 'Horse Face', avatar: '🐴' },
    { name: 'Bald Strategist', avatar: '🧠' },
    { name: 'Beast Pitcher', avatar: '⚾' },
    { name: 'Commander Eyebrows', avatar: '🦅' },
    { name: 'Colossal Problem', avatar: '🧱' },
  ],
  demonslayer: [
    { name: 'Water Breather', avatar: '🌊' },
    { name: 'Bamboo Muzzle', avatar: '🎋' },
    { name: 'Sleepy Thunder', avatar: '⚡' },
    { name: 'Boar Head', avatar: '🐗' },
    { name: 'Flame Pillar', avatar: '🍱' },
    { name: 'Butterfly Doc', avatar: '🦋' },
    { name: 'Flashy Sound Pillar', avatar: '💎' },
    { name: 'Mist Prodigy', avatar: '🌫️' },
    { name: 'Love Pillar', avatar: '💗' },
    { name: 'Crow Messenger', avatar: '🐦‍⬛' },
    { name: 'Upper Moon', avatar: '🌙' },
  ],
  dbz: [
    { name: 'Spiky Saiyan', avatar: '🥋' },
    { name: 'Prince of Pride', avatar: '👑' },
    { name: 'Green Namekian', avatar: '🌱' },
    { name: 'Bald Monk', avatar: '🔴' },
    { name: 'Capsule Genius', avatar: '💊' },
    { name: 'Turtle Hermit', avatar: '🐢' },
    { name: 'Frost Tyrant', avatar: '❄️' },
    { name: 'Pink Blob', avatar: '🍬' },
    { name: 'Cell Phone', avatar: '🦗' },
    { name: 'Fusion Dancer', avatar: '🕺' },
    { name: 'Desert Bandit', avatar: '🐺' },
  ],
};
