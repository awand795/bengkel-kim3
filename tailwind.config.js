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
        // KIM 3 Workshop Design Tokens (Stage 8)
        ink: {
          DEFAULT: 'var(--color-ink)',
          muted: 'var(--color-ink-muted)',
          subtle: 'var(--color-ink-subtle)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          raised: 'var(--color-surface-raised)',
          dark: 'var(--color-surface-dark)',
        },
        accent: {
          DEFAULT: '#E85D04',
          hover: '#D05303',
          active: '#B84902',
          subtle: '#FFF7ED',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          dark: 'var(--color-border-dark)',
        },
        status: {
          amber: 'var(--color-status-amber)',
          'amber-bg': 'var(--color-status-amber-bg)',
          blue: 'var(--color-status-blue)',
          'blue-bg': 'var(--color-status-blue-bg)',
          green: 'var(--color-status-green)',
          'green-bg': 'var(--color-status-green-bg)',
          red: 'var(--color-status-red)',
          'red-bg': 'var(--color-status-red-bg)',
        },
        // Backward-compatible primary colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '6px',
        lg: '8px',
      },
      boxShadow: {
        hairline: '0 0 0 1px var(--color-border)',
        'hairline-dark': '0 0 0 1px var(--color-border-dark)',
      },
    },
  },
  plugins: [],
}
