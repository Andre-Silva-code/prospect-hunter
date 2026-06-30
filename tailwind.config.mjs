/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#a04b2c",
        "primary-dark": "#7a3420",
        surface: "#fffaf5",
        ink: "#231815",
        muted: "#655248",
        success: "#1f7a45",
        danger: "#c0432a",
      },
    },
  },
  plugins: [],
};
