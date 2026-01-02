/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // 必須加這一行！
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
