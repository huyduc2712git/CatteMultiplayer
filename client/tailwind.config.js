/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gaming: {
          green: {
            deep: '#062F1E',  // Outer edge of board
            felt: '#0A4A32',  // Poker board felt color
            light: '#1B6A4C'  // Bright highlights
          },
          gold: {
            DEFAULT: '#D4AF37',
            light: '#F3E5AB',
            dark: '#AA7C11'
          },
          slate: {
            deep: '#0B0F19',
            card: '#161F30'
          }
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'board': 'inset 0 0 100px rgba(0, 0, 0, 0.8), 0 10px 30px rgba(0, 0, 0, 0.5)',
        'gold-glow': '0 0 15px rgba(212, 175, 55, 0.4)',
        'active-glow': '0 0 20px rgba(16, 185, 129, 0.6)'
      }
    },
  },
  plugins: [],
}
