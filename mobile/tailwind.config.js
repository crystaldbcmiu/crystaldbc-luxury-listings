/** @type {import('tailwindcss').Config} */
// Mirrors the dark palette in client/src/index.css. The web app force-enables
// `.dark` on <html>, so mobile uses those dark values as its only theme.
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  // The app is dark-only (the web build force-adds `.dark`). Leaving this on the
  // default "media" makes NativeWind throw when the scheme is set explicitly.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "luxury-gold": "#D8A631",
        "luxury-gold-light": "#E2BE69",
        "luxury-gold-dark": "#AB8221",
        "luxury-dark": "#131720",
        "luxury-cream": "#F5F3F0",

        background: "#131720",
        foreground: "#F5F3F0",
        border: "#29303D",
        input: "#29303D",
        ring: "#D8A631",

        card: {
          DEFAULT: "#191E29",
          foreground: "#F5F3F0",
        },
        popover: {
          DEFAULT: "#191E29",
          foreground: "#F5F3F0",
        },
        primary: {
          DEFAULT: "#F5F3F0",
          foreground: "#131720",
        },
        secondary: {
          DEFAULT: "#29303D",
          foreground: "#F5F3F0",
        },
        muted: {
          DEFAULT: "#29303D",
          foreground: "#A89E8A",
        },
        accent: {
          DEFAULT: "#D8A631",
          foreground: "#131720",
        },
        destructive: {
          DEFAULT: "#CC3333",
          foreground: "#F5F3F0",
        },
      },
      borderRadius: {
        sm: 2,
        md: 3,
        lg: 4,
      },
      fontFamily: {
        display: ["DMSerifDisplay", "serif"],
        body: ["Manrope", "sans-serif"],
      },
    },
  },
  plugins: [],
};
