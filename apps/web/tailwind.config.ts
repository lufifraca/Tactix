import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Body / UI text — Inter (loaded via next/font in layout.tsx)
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans],
        // Display / headings / wordmark — Chakra Petch (brand font)
        display: ["var(--font-display)", ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // Tactix "Steel Star" brand palette (navy → silver). Used as the app accent.
        steel: {
          50: "#EEF2F8",
          100: "#C9D6EA", // Light
          200: "#A6BAD8", // Accent
          300: "#9BAFCE", // Silver-blue
          400: "#7991B5", // Mid
          500: "#54719B",
          600: "#3A567C", // Steel
          700: "#2A4060",
          800: "#1A2E4D", // Navy
          900: "#12203A",
        },
      },
    },
  },
  plugins: [],
};
export default config;
