/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        shinobi: {
          bg: '#0a0c12',
          card: '#121624',
          cardHover: '#181e30',
          border: '#232b45',
          gold: '#eab308',
          goldHover: '#facc15',
          crimson: '#e11d48',
          crimsonGlow: '#f43f5e',
          jade: '#10b981',
          chakra: '#06b6d4',
          violet: '#8b5cf6',
          scroll: '#1e2538',
          scrollAccent: '#d97706',
          textMuted: '#94a3b8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Cinzel', 'Trajan Pro', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-crimson': '0 0 20px -3px rgba(225, 29, 72, 0.45)',
        'glow-gold': '0 0 20px -3px rgba(234, 179, 8, 0.45)',
        'glow-chakra': '0 0 20px -3px rgba(6, 182, 212, 0.45)',
        'glow-jade': '0 0 20px -3px rgba(16, 185, 129, 0.45)',
        'glow-violet': '0 0 20px -3px rgba(139, 92, 246, 0.45)',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.03)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
      }
    },
  },
  plugins: [],
}
