/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        graphite: {
          DEFAULT: '#14161A',
          light: '#1F222A',
          lighter: '#2A2E38',
        },
        canvas: '#EEF0F2',
        surface: '#FFFFFF',
        border: '#DDE1E6',
        ink: {
          DEFAULT: '#1A1D23',
          soft: '#5B6270',
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
    },
  },
  plugins: [],
}
