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
          dark: '#0b0f17',
          sidebar: '#0e131f',
          card: '#131826',
          hover: '#1a2236',
          input: '#101624',
          accent: '#38bdf8',
          sparkle: '#a855f7',
          border: 'rgba(255, 255, 255, 0.08)',
        }
      },
      fontFamily: {
        sans: ['IBM Plex Sans Arabic', 'Cairo', 'Google Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
