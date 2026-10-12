/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        // Short landscape screens (phones held sideways, small laptop windows).
        land: { raw: '(min-width: 640px) and (max-height: 600px)' },
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
