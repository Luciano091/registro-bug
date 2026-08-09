/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        heading: ['Bebas Neue', 'sans-serif'],
        price: ['Montserrat', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fff3e5',
          100: '#ffe4cc',
          200: '#ffca99',
          300: '#ffaa66',
          400: '#ff8a33',
          500: '#F58220', // Laranja principal
          600: '#cc6111',
          700: '#99440a',
          800: '#662b05',
          900: '#331301',
        },
        dark: {
          900: '#0a0a0b',
          800: '#121214',
          700: '#1c1c1f',
        }
      }
    },
  },
  plugins: [],
}
