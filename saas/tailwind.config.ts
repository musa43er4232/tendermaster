import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f0a1c',
        bg2: '#140d23',
        bg3: '#1a1030',
        panel: '#1d1338',
        panel2: '#241640',
        line: '#33235c',
        lineSoft: '#2a1c4d',
        purple: {
          DEFAULT: '#8b5cf6',
          bright: '#a78bfa',
          soft: '#c4b5fd',
        },
        accent: '#e879f9',
        good: '#34d399',
        warn: '#f5c451',
        bad: '#fb7185',
        ink: '#ece8f7',
        muted: '#a99fc7',
        muted2: '#8579a8',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1rem',
      },
      boxShadow: {
        glow: '0 18px 50px -12px rgba(139,92,246,0.55)',
      },
    },
  },
  plugins: [],
};

export default config;
