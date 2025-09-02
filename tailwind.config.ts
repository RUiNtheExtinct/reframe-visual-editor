import type { Config } from "tailwindcss";

// Tailwind v4 optional config. This keeps our dark mode class-based to
// integrate with next-themes, and scopes content to our app/src folders.
export default {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
