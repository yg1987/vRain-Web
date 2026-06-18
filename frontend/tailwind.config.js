/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        ancient: ["Noto Serif SC", "STSong", "SimSun", "serif"],
      },
      colors: {
        // 古风配色
        parchment: "#f2ead9",
        ink: "#2c2c2c",
        vermilion: "#c23a2e",
        indigo: "#3a4a6b",
        jade: "#5b8c6f",
        gold: "#c4a35a",
      },
    },
  },
  plugins: [],
};
