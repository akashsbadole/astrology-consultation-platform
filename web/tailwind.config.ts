import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#12132B',
        'midnight-deep': '#0A0B1D',
        parchment: '#F6F1E7',
        'parchment-dim': '#EAE3D3',
        brass: '#C6A15B',
        'brass-dim': '#8C7239',
        ink: '#1B1C2E',
        mist: 'rgba(246, 241, 231, 0.64)',
        'mist-faint': 'rgba(246, 241, 231, 0.28)',
        error: '#C1584B',
      },
      fontFamily: {
        display: ['var(--font-fraunces)'],
        sans: ['var(--font-manrope)'],
      },
      borderRadius: {
        panel: '20px',
      },
    },
  },
  plugins: [],
} satisfies Config;
