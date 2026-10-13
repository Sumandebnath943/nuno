# 🎴 NUNO

**NUNO** is a fast-paced, high-energy, loud, and wildly fun online card game built faithfully upon the **official Mattel UNO rules** (108-card deck, official scoring, and full Wild Draw Four challenge/bluff mechanics).

Play solo against smart bots (with 3 difficulty levels) or host P2P multiplayer rooms directly in your browser with no game servers required!

---

## 🎮 Game modes

Pick a mode before playing, or when creating a room (the host can change it in the lobby). Each mode follows the official rules of the UNO game it's based on — decks, card effects and scoring included.

| Mode | Based on | What's different |
| --- | --- | --- |
| **Classic** | UNO | 108 cards, challenge a Wild Draw Four, first to 500. |
| **No Mercy** | UNO Show 'Em No Mercy | 168 cards. Stack +2/+4/+6/+10 with equal or higher draws, draw until you can play, 0 passes hands, 7 swaps, Skip Everyone, Discard All, Wild Color Roulette. 25 cards and you're knocked out (Mercy Rule). First to 1000. |
| **Flip** | UNO Flip | 112 two-sided cards. Flip cards turn the whole game to the Dark Side (Draw Five, Skip Everyone, Wild Draw Color) and back. You see the other side of everyone else's cards. Scored by the side the round ends on. |
| **Attack** | UNO Attack | No drawing: press the card launcher instead. Hit 2, Wild All Hit, Wild Hit-Fire, Trade Hands, Discard All. |
| **All Wild** | UNO All Wild | Every card is wild. Wild Skip, Skip Two, Reverse, Draw Two, Draw Four, Targeted Draw Two and Forced Swap. |
| **Spin** | UNO Spin | 20 Spin cards make the next player spin a wheel: Almost NUNO, Discard Number, Discard Color, Draw Red, Draw Blue, Trade Hands, Show Hand, War, and the NUNO Spin race. |

Where a physical game leaves something to chance or doesn't say, NUNO had to pick:

- **Attack launcher** — the real launcher is mechanical and random. NUNO fires nothing 60% of the time, 1–3 cards 25%, 4–6 cards 10% and 7–10 cards 5%.
- **Spin wheel** — all nine spaces are equally likely. In War, the winning card ends up on top of the pile.
- **Flip** — if a Flip card turns up a Wild on the discard pile, the player who flipped names the colour.

---

## 🎨 Themes

Tap **🎨 Themes** on the menu (or open Settings, even mid-game) to swipe through the theme gallery: big cards with each theme's scenery, hero and card back, and the characters you'll face. The whole sheet repaints in whichever theme is in the middle; nothing is saved until you tap **Select**, which plays that theme's entrance. A theme restyles the whole app — room scenery, table, card backs and faces, fonts, particles, effects, sounds, soundtrack, bot names and trash talk — and adds its own twist.

In an online room the **host's theme is the room's theme**: everyone who joins switches to it (and follows along if the host changes it, even mid-game), and gets their own theme back when they leave.

During a game the scenery drops into soft focus (pre-blurred copies made by `npm run art`, so phones don't blur anything live), and the characters in the corners breathe and sway a little.

| Theme | Look | Its twist |
| --- | --- | --- |
| **Classic** | The original toy-box look | — |
| **Hidden Leaf** (Naruto) | Sunset over a ninja village, falling leaves, swirl-and-headband backs | Shuriken and kunai fly at whoever gets hit, smoke-poof draws, ninja ranks from Academy to Hokage as your hand shrinks |
| **Hero Academy** (My Hero Academia) | Comic halftones, hero city skyline, hazard-stripe table | SMASH-style comic impacts and speed lines, a live hero ranking |
| **Grand Line** (One Piece) | Sunset at sea, WANTED-poster backs, ship-plank table and treasure-map felt | Cannonballs for draw cards, gold coin bursts, your bounty grows as you shed cards |
| **Beyond the Walls** (Attack on Titan) | A colossal wall with a giant peeking over, winged-crest backs | Colour changes fire a signal flare in that colour, titan footsteps shake the table |
| **Wisteria Night** (Demon Slayer) | Full moon and wisteria, checkered-haori backs and felt | Every colour is a Breathing Style (Water, Flame, Thunder, Wind…) with its own sword form; Slayer Corps ranks |
| **Power Level** (Dragon Ball Z) | Rocky wasteland, star-orb backs, tournament-tile table | Ki blasts, beams for big draws, power levels, a golden aura at one card |

### Adding character art

Each theme can use your own pictures: a background, title art for the menu, two corner scenery sprites and any number of characters. Put the originals in `src/assets/characters/<theme>/` (characters go in a `characters/` subfolder) and run `npm run art` (Python 3 + Pillow). It trims, compresses and crops them into `src/generated/art/`, which is what the game loads — commit that folder. Characters become bot opponents named after them, pickable avatars (showing their face), and anime-style cut-ins of the whole figure when they play an action card or shout NUNO. Names and face crops are tuned in `src/assets/characters/art.json`; see [the folder's README](src/assets/characters/README.md). Only add art you have the right to use.

## 💬 Trash talk

Tap **Talk** on your name plate to fling a ready-made line at the table — it floats up from your seat with a sound for everyone to see. Every theme adds its own lines, and bots talk back now and then. Bots playing as a character speak in that character's own voice: every one of them has lines only they would say (`src/lib/characterTaunts.ts`).

## 🎙️ Voice chat

In online rooms everyone can talk while they play. Tap 🎙️ to turn your mic on (it's off until you do) and 🎧 to stop hearing the others. Whoever is talking gets a green ring around their picture; tap the mic badge on someone's seat to mute just them. Voice links run straight between players (WebRTC), like the game itself.

### Playing on mobile data (TURN relay)

Players connect straight to each other. On Wi-Fi that almost always works, but phones on mobile data usually share one public address with thousands of other phones (carrier NAT), and those direct links often can't be made: joining hangs on "Finding the room…" or voice stays silent. A **TURN server** fixes this by relaying the traffic for the players who can't connect directly; everyone else still connects directly.

NUNO gets relay credentials from Cloudflare Realtime TURN (free for the first 1,000 GB a month, which a group of friends will never get near: a whole evening of voice chat is a few hundred MB). The API token stays on the server: `api/ice.ts` is a Vercel function that hands each player credentials that expire after 6 hours.

1. Sign in to the [Cloudflare dashboard](https://dash.cloudflare.com/) (a free account is fine), open **Realtime → TURN Server** and create a TURN key. Copy its **Turn Token ID** and **API Token** (the token is only shown once).
2. In Vercel, open the project's **Settings → Environment Variables** and add `CLOUDFLARE_TURN_KEY_ID` and `CLOUDFLARE_TURN_API_TOKEN` (for Production and Preview).
3. Redeploy. `https://<your-site>/api/ice` should now list `turn.cloudflare.com` servers.

Until those are set, the game simply uses STUN as before. If you'd rather use another provider's fixed credentials, set `VITE_TURN_URLS` (comma-separated `turn:` URLs), `VITE_TURN_USERNAME` and `VITE_TURN_CREDENTIAL` instead; note those end up inside the app's JavaScript where anyone can read them.

## 🪑 Seating

When an online game starts, the table is shuffled: friends are spread out with bots between them, so humans don't all sit in a row and bots don't all play one after another. Every new game reshuffles.

## 🎬 The opening

Every time the game opens, the NUNO letters slam onto the table (the O always arrives late), the deck fans out and the theme's hero rises behind them. The **TAP TO PLAY** button that ends it is what lets the browser play sound, so the stinger and music start right away; on Android it also goes full screen. Invite links connect to the room while it plays.

## 🐢 Pace

Bots wait until the table has finished showing the last move, then think. Big plays get a splash that says what happened in plain words ("Rex draws 2", "You miss a turn"), the 📜 log lists the last moves, and Settings has a Relaxed / Normal / Quick pace.

---

## ✨ Features

- **Strict Official Rules (No made-up rules)**:
  - Full **108-card deck** (19 Red, 19 Blue, 19 Green, 19 Yellow, 8 Skips, 8 Reverses, 8 Draw Twos, 4 Wilds, 4 Wild Draw Fours).
  - **Reverse in 2-Player games**: Correctly acts like a Skip!
  - **Wild Draw 4 Challenge & Bluffing**: You may only legally play a Wild Draw 4 if you have *no card matching the current color*. If the victim challenges:
    - **Guilty (Bluffer)**: The player who played the Wild Draw 4 must draw the 4 cards instead!
    - **Innocent**: The challenger draws 6 cards (4 + 2 penalty) and forfeits their turn!
  - **Shout "NUNO" & Catch Mechanic**:
    - Shout NUNO when playing your second-to-last card.
    - If you forget, opponents have a window to smash the **"CATCH NUNO!"** button to penalize you +2 cards!
  - **Official Scoring**: First to 500 points (or quick 1-round matches). Action cards = 20 pts, Wilds = 50 pts, Numbers = face value.
- **2 to 10 Players**:
  - Minimum 2 players, scaleable up to 10 players!
- **Play with Bots or Friends Online**:
  - **Solo Quick Play**: Instant offline-capable bot games.
  - **P2P Multiplayer (WebRTC via PeerJS)**: Instant room codes & 1-click invite links (`?room=CODE`). In-lobby chat, bot substitution for disconnected players.
  - **3 Bot Difficulties**: Chill (casual & forgiving), Normal (balanced), and Savage (ruthless bluff catcher).
- **A table that shows everything**:
  - Opponents sit around an oval table in real turn order, each with a fanned hand, a big card count, and a "next" tag.
  - Every card moves: a real deal at the start of each round, draws fly from the deck to the player (face-up when they land in your hand), and plays fly onto the pile.
  - The table felt takes on the colour in play, and arrows printed on the rim show the direction of play.
  - Speech bubbles ("+4 😱", "Skipped!", "NUNO!") and big splashes for Skip, Reverse, +2, +4 and Wild.
  - A big NUNO buzzer that lights up when it's time to shout, CATCH buttons when someone forgets, and trash talk.
  - Hover a card (or tap it once on a phone) to read what it does; tap the discard pile to explain the top card.
- **Card art**: every card is a crisp SVG in the classic style (tilted oval, outlined numbers, Skip/Reverse/+2 icons, quartered Wild, fanned Wild Draw Four).
- **Works on any screen**: desktop, phones in portrait or landscape, 2 to 10 players. The menu fits without scrolling.
  - On phones: bigger cards, tap once to pick a card up and again to play it, big hands become a swipeable strip, menus open as bottom sheets, and the layout avoids the notch and home bar.
- Procedural WebAudio sound effects and soundtracks (no audio files to load): airhorns, sad trombones, slide whistles and more, plus a soundtrack per theme that picks up when someone is one card from winning. Separate effects and music volumes in Settings.
- **How to play** covers every mode in full: your turn step by step, every special rule, every card in the deck with how many there are and what they score, the questions people ask, and scoring.
- Built to stay smooth on phones: card flights run on the Web Animations API and your hand glides with CSS transitions (both on the compositor, so a busy phone doesn't stutter), splashes and cut-ins are pure CSS, the canvas effects engine sleeps when idle, draws the ambient layer at 1x and 20fps on phones and lowers its particle count if frames drop, and no audio buffers are allocated per sound.
- Text is sized per theme font: wide fonts (Bungee, Shojumaru) render smaller and narrow ones (Bangers) larger, names shrink or wrap to two lines instead of being cut off, and big splash words always fit the screen.
- Keyboard shortcuts: `D` draw, `K` keep the drawn card, `U`/`Space` shout NUNO, `S` sort your hand.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (tested with v24)
- npm 9+

### Installation & Run Locally
```bash
# Install dependencies
npm install

# Start local dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Run Tests
```bash
# Run unit tests and 300-game stress simulation
npm test
```

### Production Build
```bash
npm run build
```

---

## 🌐 Deploying to Vercel

NUNO is configured as a client-side Single Page Application (SPA) powered by Vite and WebRTC. It requires **zero backend server maintenance** and deploys to Vercel in seconds:

1. Push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of NUNO"
   git remote add origin https://github.com/<your-username>/nuno.git
   git push -u origin main
   ```
2. In [Vercel](https://vercel.com):
   - Click **Add New Project** → Import your GitHub repository.
   - Framework Preset: **Vite**.
   - Build Command: `npm run build`.
   - Output Directory: `dist`.
   - Click **Deploy**!

---

## 🛠️ Tech Stack

- **Framework**: React 18, TypeScript (Strict ES2022)
- **Styling**: Tailwind CSS + Custom Animations
- **Multiplayer**: WebRTC P2P Data Channels via PeerJS
- **Audio**: WebAudio API (zero-asset procedural sound synthesis and a small step sequencer for music)
- **Effects**: a small canvas particle engine (`src/fx/engine.ts`) driven by the themes (`src/themes/`)
- **Visuals**: SVG card art, Framer Motion card flights, Canvas Confetti
- **Testing**: Vitest (100% test coverage for official rules)
