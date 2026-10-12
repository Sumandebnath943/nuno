/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        uno: {
          red: '#ea262d',
          blue: '#006cb7',
          green: '#009f4d',
          yellow: '#ffb703',
          dark: '#140e26',
        }
      }
    },
  },
  plugins: [],
}
