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
        gemini: {
          dark: '#131314',
          sidebar: '#1e1f20',
          card: '#1e1f20',
          hover: '#282a2c',
          input: '#1e1f20',
          accent: '#7cacf8',
          sparkle: '#9b72cf',
          border: '#333537',
        }
      },
      fontFamily: {
        sans: ['Google Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
