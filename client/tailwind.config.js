/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary — Sheettomate green (from logo)
        brand: {
          50: '#e9f9f0',
          100: '#c9f0d9',
          200: '#94e1b4',
          300: '#57cc89',
          400: '#26b868',
          500: '#00a651',
          600: '#008f45',
          700: '#00753a',
          800: '#055c30',
          900: '#064a28',
          950: '#042f1a',
        },
        // Accent — charcoal ink (from logo wordmark)
        accent: {
          50: '#f4f5f7',
          100: '#e5e7eb',
          200: '#c9ced6',
          300: '#9aa3b2',
          400: '#6b7585',
          500: '#4a5565',
          600: '#343d4c',
          700: '#252c38',
          800: '#1a2030',
          900: '#121722',
          950: '#0b0e14',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.75s ease both',
        'fade-in': 'fadeIn 0.6s ease both',
        float: 'float 7s ease-in-out infinite',
        shimmer: 'shimmer 8s linear infinite',
        'slide-in-left': 'slideInLeft 0.7s ease both',
      },
    },
  },
  plugins: [],
};
