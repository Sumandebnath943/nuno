// Attack on Titan — "Beyond the Walls": a colossal wall on the horizon with a
// giant peeking over it, winged-crest card backs, signal flares for colours
// and titan footsteps that shake the table.
import type { Theme } from "./types";
import { BackBase, BackClip, byCards, ridgePath, Scene } from "./art";
import { fxSounds } from "../lib/sound";

const INK = "#1c1a16";
const WING =
  "M 0 30 C -6 12 -18 -8 -40 -38 C -31 -31 -22 -28 -13 -27 C -24 -21 -31 -12 -35 -1 C -27 -6 -18 -8 -9 -8 C -18 -1 -22 8 -24 18 C -16 11 -8 11 0 13 Z";

/** The winged crest: a white wing and a blue wing, overlapping. */
function Wings({
  s = 1,
  x = 0,
  y = 0,
  outline = INK,
}: {
  s?: number;
  x?: number;
  y?: number;
  outline?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeLinejoin="round">
      <path
        d={WING}
        transform="translate(4 0)"
        fill="#f4f1ea"
        stroke={outline}
        strokeWidth="2.5"
      />
      <path
        d={WING}
        transform="translate(-4 0) scale(-1 1)"
        fill="#2f5d8a"
        stroke={outline}
        strokeWidth="2.5"
      />
    </g>
  );
}

function Back() {
  return (
    <>
      <BackBase edge="#efe8d8" fill="url(#t-aot-cloak)" />
      <BackClip>
        <path
          d="M 60 30 L 98 44 L 98 92 C 98 124 80 140 60 152 C 40 140 22 124 22 92 L 22 44 Z"
          fill="#e8dfc9"
          stroke={INK}
          strokeWidth="3"
        />
        <path
          d="M 60 38 L 91 50 L 91 92 C 91 119 76 133 60 143 C 44 133 29 119 29 92 L 29 50 Z"
          fill="none"
          stroke="#8a7a5c"
          strokeWidth="1.5"
        />
        <Wings s={1.05} x={60} y={88} />
        <text
          x="60"
          y="172"
          textAnchor="middle"
          fontSize="18"
          style={{ fontFamily: "var(--font-card)" }}
          fill="#e8dfc9"
        >
          NUNO
        </text>
      </BackClip>
      <rect
        x="5"
        y="5"
        width="110"
        height="176"
        rx="8.5"
        fill="none"
        stroke="#9aa1a8"
        strokeWidth="2.5"
      />
    </>
  );
}

function Decor() {
  return (
    <g
      stroke="#6b6f74"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
      opacity="0.8"
    >
      <path d="M 10 22 L 10 10 L 22 10" />
      <path d="M 98 10 L 110 10 L 110 22" />
      <path d="M 10 164 L 10 176 L 22 176" />
      <path d="M 98 176 L 110 176 L 110 164" />
    </g>
  );
}

function Defs() {
  return (
    <>
      <linearGradient id="t-aot-cloak" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3b5a35" />
        <stop offset="1" stopColor="#172615" />
      </linearGradient>
      <pattern
        id="t-aot-blocks"
        width="120"
        height="60"
        patternUnits="userSpaceOnUse"
      >
        <rect width="120" height="60" fill="none" />
        <path
          d="M 0 30 L 120 30 M 0 60 L 120 60 M 60 0 L 60 30 M 0 30 L 0 60 M 120 30 L 120 60"
          stroke="#5f594f"
          strokeWidth="4"
        />
      </pattern>
    </>
  );
}

function Backdrop({ custom = false }: { custom?: boolean }) {
  return (
    <Scene>
      {/* smoke plumes */}
      {[
        [260, 0.9],
        [520, 0.7],
        [1450, 0.8],
      ].map(([x, s], i) => (
        <g
          key={i}
          fill="#d7d2c8"
          opacity="0.18"
          transform={`translate(${x} 0) scale(${s})`}
        >
          <ellipse cx="0" cy="560" rx="60" ry="80" />
          <ellipse cx="30" cy="430" rx="80" ry="90" />
          <ellipse cx="-20" cy="300" rx="110" ry="100" />
          <ellipse cx="40" cy="160" rx="150" ry="110" />
        </g>
      ))}
      {/* the giant behind the wall (left out when you've added your own titan picture) */}
      {!custom && (
        <g transform="translate(-930 30) scale(1.08)">
          <g fill="#4a1f1a">
            <path d="M 1010 520 C 1040 470 1090 450 1130 440 L 1150 400 L 1210 400 L 1230 440 C 1270 450 1320 470 1350 520 Z" />
            <ellipse cx="1180" cy="352" rx="64" ry="80" />
            <path d="M 1130 380 Q 1180 446 1230 380" fill="#3a1714" />
          </g>
          <g stroke="#7a3a2f" strokeWidth="5" opacity="0.6">
            <path d="M 1150 300 L 1150 420 M 1170 290 L 1170 430 M 1190 290 L 1190 430 M 1210 300 L 1210 420" />
          </g>
          <ellipse
            cx="1158"
            cy="345"
            rx="10"
            ry="6"
            fill="#ffcc80"
            opacity="0.85"
          />
          <ellipse
            cx="1202"
            cy="345"
            rx="10"
            ry="6"
            fill="#ffcc80"
            opacity="0.85"
          />
          <g fill="#f1ede6" opacity="0.28">
            <ellipse cx="1110" cy="300" rx="60" ry="40" />
            <ellipse cx="1260" cy="280" rx="70" ry="44" />
            <ellipse cx="1190" cy="230" rx="80" ry="40" />
          </g>
        </g>
      )}
      {/* the wall */}
      <rect x="0" y="500" width="1600" height="400" fill="#8a8478" />
      <rect x="0" y="500" width="1600" height="400" fill="url(#t-aot-blocks)" />
      <rect x="0" y="488" width="1600" height="18" fill="#6f6a60" />
      <rect x="0" y="500" width="1600" height="60" fill="#000" opacity="0.12" />
      {/* the town in front */}
      <path d={ridgePath(1600, 800, 900, 70, 14, 31, true)} fill="#2a2621" />
      <path d={ridgePath(1600, 850, 900, 50, 20, 37, true)} fill="#1a1713" />
    </Scene>
  );
}

function Overlay() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1000 600"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g fill="none" stroke="#fff" opacity="0.13">
        <ellipse cx="500" cy="300" rx="460" ry="270" strokeWidth="6" />
        <ellipse cx="500" cy="300" rx="330" ry="190" strokeWidth="5" />
        <ellipse cx="500" cy="300" rx="200" ry="115" strokeWidth="4" />
      </g>
    </svg>
  );
}

function Emblem() {
  return <Wings s={1.1} outline="rgba(255,255,255,0.9)" />;
}

const ASH = ["#bdb8ae", "#8f8a80", "#ff8a3d", "#ffb26b"];

export const aot: Theme = {
  id: "aot",
  name: "Attack on Titan",
  title: "Beyond the Walls",
  tagline: "Signal flares, titan footsteps and the winged crest.",
  emoji: "🗡️",
  edition: "Survey Corps Edition",
  fonts: "family=Germania+One",
  vars: {
    "--ink": INK,
    "--cream": "#ece4d3",
    "--night": "#14130f",
    "--yellow": "#e0bd5c",
    "--red": "#8b1a1a",
    "--muted": "#5e5546",
    "--soft": "#3f382c",
    "--faint": "#8f8574",
    "--panel-2": "#d9cdb4",
    "--panel-3": "#e2d8c3",
    "--line": "#cbbd9f",
    "--highlight": "#e8d9a8",
    "--chip-hover": "#f2e9d2",
    "--link": "#7a1f1f",
    "--accent-a": "#e9d08a",
    "--accent-b": "#b8913a",
    "--surface": "#f6f1e6",
    "--turn-bg": "#e8d9a8",
    "--ring": "rgba(224, 189, 92, 0.95)",
    "--font-display": "'Germania One', 'Lilita One', system-ui, serif",
    "--font-card": "'Germania One', 'Lilita One', system-ui, serif",
    "--panel-bg":
      "linear-gradient(180deg, rgba(255,255,255,0.25), rgba(0,0,0,0.03)), var(--cream)",
    "--room-bg":
      "linear-gradient(180deg, #3d4248 0%, #5f615d 32%, #8a7a60 60%, #3a342b 100%)",
  },
  cardColors: {
    red: { base: "#b3261e", light: "#e0574c", dark: "#7a120c" },
    yellow: { base: "#d9a21b", light: "#f2c654", dark: "#9c7106" },
    green: { base: "#4a7c3a", light: "#79ab66", dark: "#2a5020" },
    blue: { base: "#2f5d8a", light: "#5d8bba", dark: "#173a5e" },
    pink: { base: "#b23a6e", light: "#dd6c9b", dark: "#7a1846" },
    teal: { base: "#2e7d74", light: "#5fada3", dark: "#12524a" },
    orange: { base: "#c2611f", light: "#e8904f", dark: "#863a07" },
    purple: { base: "#5b3f8a", light: "#8a6cba", dark: "#35215e" },
  },
  felt: {
    red: ["#9c3a32", "#62201a", "#33100c"],
    yellow: ["#b8913a", "#7a5d1c", "#3f2f0a"],
    green: ["#5b7f4a", "#38552c", "#1b2c14"],
    blue: ["#4a6f94", "#2b4661", "#152333"],
    pink: ["#9c4a6e", "#622a44", "#331421"],
    teal: ["#3f7f77", "#24524c", "#112a27"],
    orange: ["#a8683a", "#6b3d1c", "#371e0b"],
    purple: ["#6a5590", "#40325c", "#20182f"],
  },
  neutralFelt: ["#6f6a5f", "#45413a", "#22201c"],
  card: { edge: "#efe8d8", Back, Decor },
  Defs,
  Backdrop,
  table: {
    rim: "repeating-linear-gradient(0deg, #7f796d 0 20px, #5b564c 20px 23px), linear-gradient(90deg, #7f796d, #6d675c)",
    Overlay,
    Emblem,
    chevron: "#e8dfc9",
  },
  ambient: {
    shapes: ["ash", "ember"],
    colors: ASH,
    count: 26,
    size: [5, 12],
    fall: [-45, -12],
    drift: [-20, 30],
    spin: 2,
    sway: 16,
    glow: false,
    alpha: [0.45, 0.9],
  },
  onFx: (e, k) => {
    const { fx } = k;
    switch (e.kind) {
      case "color":
        // Signal flare in the new colour.
        fx.flare(e.at.x, e.at.y, { color: e.hex });
        return;
      case "hit":
        fx.beam(e.from, e.to, {
          color: "#c9d1d9",
          width: 3,
          dur: 0.3,
          core: "#ffffff",
        });
        setTimeout(() => {
          fx.shake(e.amount >= 4 ? 16 : 8, e.amount >= 4 ? 650 : 400);
          fx.burst(e.to.x, e.to.y, {
            shapes: ["rock", "ash"],
            colors: ["#8a8478", "#6f6a60", "#bdb8ae"],
            count: 14 + e.amount * 3,
            gravity: 700,
            speed: [200, 460],
          });
          fx.smoke(e.to.x, e.to.y, { color: "#c8bfae", count: 8 });
        }, 220);
        return;
      case "skip":
        fx.beam(e.from, e.to, {
          color: "#c9d1d9",
          width: 2.5,
          dur: 0.35,
          core: "#ffffff",
        });
        fx.slash(
          { x: e.to.x - 60, y: e.to.y + 30 },
          { x: e.to.x + 60, y: e.to.y - 30 },
          { color: "#e9eef3", width: 9, dur: 0.4 },
        );
        return;
      case "reverse":
      case "passHands":
        fx.slash(
          { x: e.at.x - 160, y: e.at.y - 70 },
          { x: e.at.x + 160, y: e.at.y + 70 },
          { color: "#e9eef3", width: 12 },
        );
        fx.slash(
          { x: e.at.x + 160, y: e.at.y - 70 },
          { x: e.at.x - 160, y: e.at.y + 70 },
          { color: "#e9eef3", width: 12, dur: 0.6 },
        );
        return;
      case "uno":
        fx.smoke(e.at.x, e.at.y, { color: "#f1ede6", count: 12, rise: 120 });
        fx.ring(e.at.x, e.at.y, {
          color: "#e0bd5c",
          r0: 20,
          r1: 120,
          width: 6,
        });
        return;
      case "caught":
        fx.slash(
          { x: e.at.x - 70, y: e.at.y - 40 },
          { x: e.at.x + 70, y: e.at.y + 40 },
          { color: "#b3261e", width: 10 },
        );
        return;
      case "knockout":
        fx.shake(20, 800);
        fx.smoke(e.at.x, e.at.y, {
          color: "#c8bfae",
          count: 18,
          size: [70, 140],
        });
        fx.burst(e.at.x, e.at.y, {
          shapes: ["rock"],
          colors: ["#8a8478", "#6f6a60"],
          count: 24,
          gravity: 700,
        });
        return;
      case "stack":
        fx.shake(10 + Math.min(10, e.total / 2), 600);
        fx.burst(e.to.x, e.to.y, {
          shapes: ["rock", "ash"],
          colors: ["#8a8478", "#bdb8ae"],
          count: 18,
          gravity: 700,
        });
        return;
      case "swap":
        fx.beam(e.a, e.b, { color: "#c9d1d9", width: 2.5, dur: 0.4 });
        return;
      case "win":
        ["#2eb34f", "#e8333a", "#ffc21a", "#2f72e0"].forEach((c, i) =>
          setTimeout(
            () =>
              fx.flare(
                window.innerWidth * (0.2 + i * 0.2),
                window.innerHeight * 0.85,
                { color: c },
              ),
            i * 200,
          ),
        );
        fx.rain({
          shapes: ["feather"],
          colors: ["#f4f1ea", "#dfe8f2", "#2f5d8a"],
          count: 40,
          flutter: true,
        });
        return;
      case "flip":
        fx.flash(e.dark ? "#000" : "#fff", 0.5, 400);
        fx.smoke(e.at.x, e.at.y, {
          color: "#f1ede6",
          count: 16,
          size: [80, 140],
        });
        return;
      default:
        k.base(e);
    }
  },
  splash: {
    backdrop: "plate",
    color: "#8a9199",
    ink: INK,
    kickerBg: "#7a1f1f",
    kickerInk: "#f6f1e6",
  },
  moves: {
    skip: "Grappled!",
    skipAll: "Retreat! Everyone!",
    reverse: "About face!",
    draw: "Titan footsteps…",
    bigDraw: "TITAN STOMP",
    wild: "Signal flare!",
    uno: "For humanity!",
    swap: "Titan shift",
    flip: "Beyond the walls",
    stack: "Breach!",
    knockout: "Devoured…",
    caught: "Spotted by the Garrison",
    discardAll: "Supply drop",
    launch: "Cannon volley",
  },
  rank: (cards) =>
    byCards(cards, [
      [1, "Commander"],
      [2, "Captain"],
      [4, "Squad Leader"],
      [7, "Scout"],
      [11, "Garrison"],
      [999, "Trainee"],
    ]),
  auraClass: "aura-steam",
  hotClass: "aura-steam",
  sfx: {
    plus: (n: number) => {
      fxSounds.zip();
      fxSounds.stomp(0.2);
      if (n >= 4) fxSounds.stomp(0.75);
    },
    skip: () => {
      fxSounds.zip();
      fxSounds.shing(0.15);
    },
    reverse: () => fxSounds.slash(),
    wild: () => {
      fxSounds.whoosh();
      fxSounds.pew(0.1);
    },
    uno: () => {
      fxSounds.dunDun();
      noiseHiss();
    },
    yourTurn: () => fxSounds.clank(),
    lose: () => fxSounds.dunDun(),
  },
  music: {
    id: "walls",
    name: "Beyond the Wall",
    bpm: 112,
    root: 48,
    scale: [0, 2, 3, 5, 7, 8, 10],
    chords: [0, 5, 2, 6],
    drums: {
      kick: "x.......x.......",
      snare: "....x.......x.xx",
      taiko: "x.....x.x.......",
      hatTense: "x.x.x.x.x.x.x.x.",
    },
    bass: {
      pattern: "0000000000000000",
      wave: "sawtooth",
      vol: 0.09,
      cut: 520,
    },
    pad: {
      pattern: "x...............",
      wave: "sine",
      vol: 0.09,
      len: 15,
      voicing: [0, 2, 4, 7],
    },
    lead: {
      bars: [
        "e---d---c---b---",
        "c-------........",
        "e---f---g---f-e-",
        "d-------........",
      ],
      wave: "sawtooth",
      vol: 0.05,
      octave: 1,
      vibrato: [5, 4],
      cut: 1500,
    },
  },
};

function noiseHiss() {
  fxSounds.poof(0.1);
}
