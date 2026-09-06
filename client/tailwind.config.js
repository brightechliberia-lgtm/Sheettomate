/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e8eef8',
          100: '#c5d3eb',
          200: '#8fa8d4',
          500: '#1a3f8f',
          600: '#002868',
          700: '#002050',
          800: '#001a42',
          900: '#001433',
          950: '#000c22',
        },
        accent: {
          50: '#ecfdf8',
          100: '#d1faf0',
          200: '#a7f3e0',
          300: '#6ee7c8',
          400: '#34d3a8',
          500: '#0d9488',
          600: '#0f766e',
          700: '#115e59',
          800: '#134e4a',
          900: '#042f2e',
        },
        gold: '#BF0A30',
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
