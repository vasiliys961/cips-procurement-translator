/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f7f2f8',
          100: '#eadff0',
          200: '#d4c0e0',
          300: '#b794c8',
          400: '#9663ab',
          500: '#7a3e96',
          600: '#6b2d86',
          700: '#5a2470',
          800: '#4a1d5c',
          900: '#2d1238',
        },
      },
    },
  },
  plugins: [],
}
