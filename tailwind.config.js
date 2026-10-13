/**
 * Text sizes scale with `--fs`, which is set per font: theme fonts that run wide
 * (Bungee, Shojumaru) render a little smaller and narrow ones (Bangers) a
 * little larger, so every theme fits the same space. See game.css.
 */
const fs = (rem, lineHeight) => [
  `calc(${rem}rem * var(--fs, 1))`,
  { lineHeight: typeof lineHeight === 'number' ? String(lineHeight) : `calc(${lineHeight} * var(--fs, 1))` },
];

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        // Any screen with little height: tighten the setup panel. Declared first so `land` wins where both match.
        short: { raw: '(max-height: 700px)' },
        // Narrow AND short (phones like the iPhone SE): also shrink the logo. Laptops keep the big logo.
        phone: { raw: '(max-width: 1023px) and (max-height: 700px)' },
        // Short landscape screens below desktop width (phones held sideways, small windows).
        // Wider screens use the regular desktop row layout.
        land: { raw: '(min-width: 640px) and (max-width: 1023px) and (max-height: 720px)' },
        // Desktop-wide but short windows (a laptop browser that isn't full screen).
        lowdesk: { raw: '(min-width: 1024px) and (max-height: 700px)' },
      },
      fontFamily: {
        display: ['"Lilita One"', 'system-ui', 'sans-serif'],
        body: ['Fredoka', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': fs(0.625, '0.875rem'),
        xs: fs(0.75, '1rem'),
        sm: fs(0.875, '1.25rem'),
        base: fs(1, '1.5rem'),
        lg: fs(1.125, '1.75rem'),
        xl: fs(1.25, '1.75rem'),
        '2xl': fs(1.5, '2rem'),
        '3xl': fs(1.875, '2.25rem'),
        '4xl': fs(2.25, '2.5rem'),
        '5xl': fs(3, 1),
        '6xl': fs(3.75, 1),
      },
      colors: {
        ink: '#1b1530',
        cream: '#fff8ea',
      },
    },
  },
  plugins: [],
};
