/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#111111", // Deep charcoal for main text/buttons
        cream: {
          50: "#FFFFFF",
          100: "#FCFCF9",
          200: "#F5F5F0", // The main background color
          300: "#EAEAE3",
          400: "#D3D3C8",
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Keep it clean
      }
    },
  },
  plugins: [],
}
