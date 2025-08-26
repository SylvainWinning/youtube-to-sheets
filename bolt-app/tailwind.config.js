/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        'neu-base': '#f0f2f5',
        'neu-dark': '#d1d9e6',
        'neu-light': '#ffffff',
        'youtube': {
          'red': '#FF0000',
          'red-hover': '#CC0000',
          'black': '#0F0F0F',
          'gray-dark': '#606060',
          'gray-light': '#909090',
          'bg-light': '#F9F9F9',
          'button': '#F2F2F2',
          'button-hover': '#E5E5E5',
          'border': '#E5E5E5',
          'blue': '#065FD4'
        }
      },
      boxShadow: {
        'neu-flat': '4px 4px 8px #d1d9e6, -4px -4px 8px #ffffff',
        'neu-pressed': 'inset 2px 2px 5px #d1d9e6, inset -2px -2px 5px #ffffff',
        'neu-concave': '4px 4px 8px #d1d9e6, -4px -4px 8px #ffffff, inset 1px 1px 3px #d1d9e6, inset -1px -1px 3px #ffffff',
        'neu-flat-dark': '4px 4px 8px rgba(0,0,0,0.2), -4px -4px 8px rgba(255,255,255,0.05)',
        'neu-pressed-dark': 'inset 2px 2px 5px rgba(0,0,0,0.2), inset -2px -2px 5px rgba(255,255,255,0.05)',
        'neu-concave-dark': '4px 4px 8px rgba(0,0,0,0.2), -4px -4px 8px rgba(255,255,255,0.05), inset 1px 1px 3px rgba(0,0,0,0.2), inset -1px -1px 3px rgba(255,255,255,0.05)',
        'youtube': '0 1px 2px rgba(0, 0, 0, 0.1)'
      },
    },
  },
  plugins: [],
};