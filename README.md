# 🎴 NUNO

**NUNO** is a fast-paced, high-energy, loud, and wildly fun online card game built faithfully upon the **official Mattel UNO rules** (108-card deck, official scoring, and full Wild Draw Four challenge/bluff mechanics).

Play solo against smart bots (with 3 difficulty levels) or host P2P multiplayer rooms directly in your browser with no game servers required!

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
  - A big NUNO buzzer that lights up when it's time to shout, CATCH buttons when someone forgets, and emoji reactions.
- **Card art**: every card is a crisp SVG in the classic style (tilted oval, outlined numbers, Skip/Reverse/+2 icons, quartered Wild, fanned Wild Draw Four).
- **Works on any screen**: desktop, phones in portrait or landscape, 2 to 10 players. The menu fits without scrolling.
- Procedural WebAudio sound effects (no audio files to load) and confetti.
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
- **Audio**: WebAudio API (Zero-asset procedural sound synthesis)
- **Visuals**: SVG card art, Framer Motion card flights, Canvas Confetti
- **Testing**: Vitest (100% test coverage for official rules)
