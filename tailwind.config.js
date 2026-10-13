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
      colors: {
        ink: '#1b1530',
        cream: '#fff8ea',
      },
    },
  },
  plugins: [],
};
