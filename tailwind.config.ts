import heropatterns from "tailwind-heropatterns";
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
  plugins: [
    heropatterns({
      patterns: ["topography", "circuit-board", "endless-clouds", "graph-paper", "dot-grid"],
      // Keep colors subtle; we set explicit utilities in components
      // but define defaults so utility classes exist.
      colors: {
        default: "currentColor",
      },
      opacity: {
        default: "0.08",
        10: "0.10",
        15: "0.15",
      },
      sizes: {
        default: "16",
        lg: "24",
      },
    }),
  ],
} satisfies Config;
