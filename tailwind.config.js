/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        graphite: {
          DEFAULT: '#14161A',
          light: '#1F222A',
          lighter: '#2A2E38',
        },
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--color-ink) / <alpha-value>)',
          soft: 'rgb(var(--color-ink-soft) / <alpha-value>)',
        },
        torque: {
          DEFAULT: '#F2600C',
          dark: '#D14E03',
          light: '#FFE3D1',
        },
        steel: {
          DEFAULT: '#2D6E8E',
          light: '#E4EFF4',
        },
        status: {
          orcamento: '#8B8F98',
          aprovado: '#2D6E8E',
          execucao: '#F2A93B',
          aguardando: '#9B6FD1',
          concluido: '#3FA35E',
          entregue: '#1F8A4C',
          cancelado: '#D14444',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgba(20, 22, 26, 0.04), 0 1px 3px 0 rgba(20, 22, 26, 0.06)',
        card: '0 1px 3px 0 rgba(20, 22, 26, 0.05), 0 4px 12px -2px rgba(20, 22, 26, 0.06)',
        popover: '0 8px 24px -4px rgba(20, 22, 26, 0.12), 0 2px 8px -2px rgba(20, 22, 26, 0.08)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96) translateY(4px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'scale-in': 'scale-in 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slide-in-right 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.6s infinite linear',
      },
    },
  },
  plugins: [],
}
