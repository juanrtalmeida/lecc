/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#f8fafc',
          subtle: '#f1f5f9',
          panel: '#ffffff',
          elevated: '#ffffff',
        },
        line: '#e2e8f0',
        brand: {
          DEFAULT: '#6366f1',
          soft: '#818cf8',
          deep: '#4f46e5',
          bg: 'rgba(99,102,241,0.08)',
        },
        semantic: {
          response: '#6366f1',
          reinforcement: '#10b981',
          stimulus: '#f59e0b',
          state: '#0ea5e9',
          other: '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px -8px rgba(99,102,241,0.25)',
        card: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        full: '9999px',
      },
      spacing: {
        safe: 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
};
