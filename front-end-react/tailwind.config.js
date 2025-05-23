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
        'brand-primary': '#da7756', // Terra Cotta
        'cta': '#bd5d3a',
        'background-main': '#eeece2',
        'text-main': '#3d3929',
        'surface': '#f8ece7', // Lightest Shade
        'border-main': '#edcdbf', // Light Shade
        'accent': '#d88e6f', // Medium shade for icons/accents

        // Extended Shades
        'brand-shade-lightest': '#f8ece7',
        'brand-shade-light': '#edcdbf',
        'brand-shade-medium-light': '#e2ae97',
        'brand-shade-medium': '#d88e6f',
        'brand-shade-medium-dark': '#cd6f47',
        'brand-shade-dark': '#b05730',
        'brand-shade-darker': '#884325',
        'brand-shade-deep-dark': '#602f1a',
        'brand-shade-deepest': '#381c0f',
        'brand-shade-near-black': '#100804',
      }
    },
  },
  plugins: [],
}
