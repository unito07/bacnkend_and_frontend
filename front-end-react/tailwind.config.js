/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-space-black': '#0A0A0F',
        'neon-purple': '#A259FF',
        'electric-blue': '#00FFFF',
        'cyber-lime': '#B8FF00',
        'light-gray': '#E5E5E5',
        'slate-gray': '#9CA3AF',
        'hot-pink-glow': '#FF2E88',
        'dark-indigo': '#1E1B2E',
        'soft-violet': '#6E40C9',
      }
    },
  },
  plugins: [],
}
