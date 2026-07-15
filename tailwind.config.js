/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#D4AF37",
          light: "#E8C766",
          dark: "#B8952C",
        },
        buy: {
          DEFAULT: "#26A17B",
          light: "#2FBF93",
          dark: "#1E8163",
        },
        sell: {
          DEFAULT: "#C62828",
          light: "#E53935",
          dark: "#9E1F1F",
        },
        surface: {
          DEFAULT: "#16213E",
          deep: "#0F3460",
        },
      },
      borderRadius: {
        card: "18px",
        "card-lg": "22px",
      },
      fontFamily: {
        sans: ["Tajawal", "Cairo", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
