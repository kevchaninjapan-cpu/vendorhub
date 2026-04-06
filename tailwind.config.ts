import type { Config } from "tailwindcss";

export default {
  // ✅ Tailwind v4 expects a string, not a single-item array
  darkMode: "class",

  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      colors: {
        vh: {
          ink: "rgb(var(--vh-ink) / <alpha-value>)",
          blue: "rgb(var(--vh-blue) / <alpha-value>)",
          slate: "rgb(var(--vh-slate) / <alpha-value>)",
          white: "rgb(var(--vh-white) / <alpha-value>)",
          muted: "rgb(var(--vh-muted) / <alpha-value>)",
          border: "rgb(var(--vh-border) / <alpha-value>)",
        },

        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        "primary-foreground": "rgb(var(--primary-foreground) / <alpha-value>)",
      },

      borderRadius: {
        xl: "16px",
        "2xl": "20px",
      },
    },
  },

  plugins: [],
} satisfies Config;