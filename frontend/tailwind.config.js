/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "var(--void)",
        shell: "var(--shell)",
        surface: "var(--surface)",
        raised: "var(--raised)",
        line: "var(--line)",
        accent: "var(--accent)",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Cascadia Mono", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
