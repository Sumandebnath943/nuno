import React from 'react';
import type { Card, CardColor, CardValue } from '../game/types';

export interface CardViewProps {
  card?: Card;
  faceDown?: boolean;
  playable?: boolean;
  selected?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  rotation?: number;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const COLOR_MAP: Record<CardColor, { bg: string; dark: string; glow: string }> = {
  red: { bg: '#ea262d', dark: '#ad0f14', glow: 'rgba(234, 38, 45, 0.7)' },
  blue: { bg: '#006cb7', dark: '#00477a', glow: 'rgba(0, 108, 183, 0.7)' },
  green: { bg: '#009f4d', dark: '#006b34', glow: 'rgba(0, 159, 77, 0.7)' },
  yellow: { bg: '#ffb703', dark: '#b88200', glow: 'rgba(255, 183, 3, 0.7)' },
  wild: { bg: '#1c172e', dark: '#100c1c', glow: 'rgba(255, 255, 255, 0.8)' },
};

const SIZE_STYLES = {
  xs: { width: 44, height: 68, radius: 6, borderWidth: 2.5, fontSize: 13, cornerSize: 9 },
  sm: { width: 62, height: 96, radius: 8, borderWidth: 3, fontSize: 18, cornerSize: 11 },
  md: { width: 84, height: 130, radius: 10, borderWidth: 4, fontSize: 26, cornerSize: 14 },
  lg: { width: 106, height: 164, radius: 12, borderWidth: 4.5, fontSize: 34, cornerSize: 18 },
  xl: { width: 130, height: 200, radius: 14, borderWidth: 5, fontSize: 42, cornerSize: 22 },
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  faceDown = false,
  playable = false,
  selected = false,
  size = 'md',
  rotation = 0,
  onClick,
  className = '',
  style = {},
}) => {
  const dim = SIZE_STYLES[size];

  if (faceDown || !card) {
    return (
      <div
        onClick={onClick}
        className={`relative select-none transition-transform duration-200 cursor-pointer ${className}`}
        style={{
          width: dim.width,
          height: dim.height,
          borderRadius: dim.radius,
          border: `${dim.borderWidth}px solid #ffffff`,
          background: 'linear-gradient(145deg, #241c3a, #110e1d)',
          boxShadow: '0 6px 14px rgba(0,0,0,0.45)',
          transform: `rotate(${rotation}deg)`,
          ...style,
        }}
      >
        {/* Card Back Graphic */}
        <div className="absolute inset-1 rounded-sm flex items-center justify-center overflow-hidden border border-black/40 bg-[#161224]">
          <div
            className="absolute w-[110%] h-[68%] rounded-full bg-[#ea262d] flex items-center justify-center shadow-inner"
            style={{ transform: 'rotate(-28deg)' }}
          >
            <span
              className="text-white font-extrabold tracking-wider"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: dim.fontSize * 0.9,
                textShadow: '0 2px 4px rgba(0,0,0,0.8), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                letterSpacing: '1px',
              }}
            >
              NUNO
            </span>
          </div>
          {/* Subtle sheen highlight */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 60%)',
            }}
          />
        </div>
      </div>
    );
  }

  const colorConf = COLOR_MAP[card.color];

  return (
    <div
      onClick={playable || onClick ? onClick : undefined}
      className={`relative select-none transition-all duration-200 ${
        playable ? 'card-playable' : ''
      } ${selected ? 'ring-4 ring-yellow-300 -translate-y-4' : ''} ${className}`}
      style={{
        width: dim.width,
        height: dim.height,
        borderRadius: dim.radius,
        border: `${dim.borderWidth}px solid #ffffff`,
        background: `linear-gradient(145deg, ${colorConf.bg}, ${colorConf.dark})`,
        boxShadow: playable
          ? `0 8px 24px rgba(0,0,0,0.5), 0 0 16px ${colorConf.glow}`
          : '0 6px 14px rgba(0,0,0,0.4)',
        transform: `rotate(${rotation}deg)`,
        ['--glow-color' as string]: colorConf.glow,
        cursor: playable ? 'pointer' : 'default',
        ...style,
      }}
    >
      {/* Inner card surface */}
      <div className="absolute inset-0 rounded-[inherit] overflow-hidden flex items-center justify-center">
        {/* Center Oval */}
        <div
          className="absolute w-[86%] h-[68%] rounded-full bg-white flex items-center justify-center shadow-md overflow-hidden"
          style={{ transform: 'rotate(-26deg)' }}
        >
          {/* If Wild or Wild4, show 4-quadrant background inside oval */}
          {card.color === 'wild' && (
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              <div className="bg-[#ea262d]" />
              <div className="bg-[#006cb7]" />
              <div className="bg-[#ffb703]" />
              <div className="bg-[#009f4d]" />
            </div>
          )}

          {/* Center Glyph */}
          <div style={{ transform: 'rotate(26deg)' }} className="z-10 flex items-center justify-center">
            {renderCenterGlyph(card.value, card.color, dim.fontSize)}
          </div>
        </div>

        {/* Top-Left Corner Glyph */}
        <div
          className="absolute top-1 left-1.5 flex flex-col items-center justify-center leading-none"
          style={{ fontSize: dim.cornerSize }}
        >
          {renderCornerGlyph(card.value, card.color, dim.cornerSize)}
        </div>

        {/* Bottom-Right Corner Glyph (Flipped 180deg) */}
        <div
          className="absolute bottom-1 right-1.5 flex flex-col items-center justify-center leading-none rotate-180"
          style={{ fontSize: dim.cornerSize }}
        >
          {renderCornerGlyph(card.value, card.color, dim.cornerSize)}
        </div>

        {/* Gloss sheen overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 55%)',
          }}
        />
      </div>
    </div>
  );
};

// ── GLYPH RENDERERS ──────────────────────────────────────────

function renderCenterGlyph(value: CardValue, color: CardColor, fontSize: number) {
  const textColor = color === 'wild' ? '#ffffff' : COLOR_MAP[color].bg;

  switch (value) {
    case 'skip':
      return (
        <svg
          viewBox="0 0 40 40"
          width={fontSize * 1.5}
          height={fontSize * 1.5}
          className="drop-shadow-md"
        >
          <circle cx="20" cy="20" r="16" fill="none" stroke={textColor} strokeWidth="5" />
          <line x1="9" y1="9" x2="31" y2="31" stroke={textColor} strokeWidth="5" strokeLinecap="round" />
        </svg>
      );

    case 'reverse':
      return (
        <svg
          viewBox="0 0 40 40"
          width={fontSize * 1.5}
          height={fontSize * 1.5}
          className="drop-shadow-md"
        >
          {/* Top arrow pointing right-down */}
          <path
            d="M 10 16 A 10 10 0 0 1 30 16 L 33 11 L 34 22 L 23 21 L 27 17 A 7 7 0 0 0 13 17 Z"
            fill={textColor}
          />
          {/* Bottom arrow pointing left-up */}
          <path
            d="M 30 24 A 10 10 0 0 1 10 24 L 7 29 L 6 18 L 17 19 L 13 23 A 7 7 0 0 0 27 23 Z"
            fill={textColor}
          />
        </svg>
      );

    case 'draw2':
      return (
        <div
          className="font-extrabold flex items-center justify-center"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: fontSize * 1.25,
            color: textColor,
            textShadow: '0 2px 4px rgba(0,0,0,0.25), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
          }}
        >
          +2
        </div>
      );

    case 'wild':
      return (
        <div
          className="font-extrabold text-white tracking-wider px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-xs border border-white/40"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: fontSize * 0.65,
            textShadow: '0 2px 4px rgba(0,0,0,0.8), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
          }}
        >
          WILD
        </div>
      );

    case 'wild4':
      return (
        <div
          className="font-extrabold flex items-center justify-center text-white"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: fontSize * 1.4,
            textShadow: '0 3px 6px rgba(0,0,0,0.9), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
          }}
        >
          +4
        </div>
      );

    default:
      // Number 0-9
      return (
        <span
          className="font-extrabold leading-none"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: fontSize * 1.5,
            color: textColor,
            textShadow: '0 2px 4px rgba(0,0,0,0.25), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
            textDecoration: value === '6' || value === '9' ? 'underline' : 'none',
          }}
        >
          {value}
        </span>
      );
  }
}

function renderCornerGlyph(value: CardValue, _color: CardColor, size: number) {
  const commonStyle = {
    fontFamily: 'var(--font-display)',
    fontSize: size,
    color: '#ffffff',
    textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 1px 2px rgba(0,0,0,0.7)',
  };

  switch (value) {
    case 'skip':
      return (
        <svg viewBox="0 0 20 20" width={size * 1.1} height={size * 1.1}>
          <circle cx="10" cy="10" r="8" fill="none" stroke="#fff" strokeWidth="2.5" />
          <line x1="4.5" y1="4.5" x2="15.5" y2="15.5" stroke="#fff" strokeWidth="2.5" />
        </svg>
      );
    case 'reverse':
      return <span style={commonStyle}>⇄</span>;
    case 'draw2':
      return <span style={commonStyle}>+2</span>;
    case 'wild':
      return <span style={{ ...commonStyle, fontSize: size * 0.75 }}>★</span>;
    case 'wild4':
      return <span style={commonStyle}>+4</span>;
    default:
      return (
        <span
          style={{
            ...commonStyle,
            textDecoration: value === '6' || value === '9' ? 'underline' : 'none',
          }}
        >
          {value}
        </span>
      );
  }
}
