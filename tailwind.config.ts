import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design system from spec
        background: {
          base: '#09090b',      // zinc-950
          elevated: '#18181b',   // zinc-900
          glass: 'rgba(24, 24, 27, 0.5)', // zinc-900/50
        },
        border: {
          DEFAULT: '#27272a',   // zinc-800
          hover: '#3f3f46',     // zinc-700
        },
        text: {
          primary: '#fafafa',   // zinc-50
          secondary: '#a1a1aa', // zinc-400
          muted: '#71717a',     // zinc-500
        },
        accent: {
          DEFAULT: '#8b5cf6',   // violet-500
          purple: '#a855f7',    // purple-500
          glow: 'rgba(139, 92, 246, 0.2)', // violet-500/20
        },
        success: '#00B894',
        warning: '#FDCB6E',
        error: '#E17055',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(to right, #8b5cf6, #a855f7)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
