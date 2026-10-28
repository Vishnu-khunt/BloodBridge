/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0B0F19',
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
        },
        crimson: {
          900: '#881337',
          800: '#9F1239',
          700: '#BE123C',
          600: '#E11D48',
          500: '#F43F5E',
          100: '#FFE4E6',
          50: '#FFF1F2',
        },
      },
    },
  },
  plugins: [],
};
