/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#FAF8F5',
        surface: '#FFFFFF',
        primary: '#1B2A4A',
        secondary: '#3D5A80',
        accent: '#C9A227',
        muted: '#8A8A8A',
        success: '#2D6A4F',
        border: '#E8E4DE',
        text: '#1B2A4A',
      },
    },
  },
  plugins: [],
};
