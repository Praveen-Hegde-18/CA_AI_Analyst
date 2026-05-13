import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        surface: "#111111",
        "surface-2": "#1a1a1a",
        foreground: "#ededed",
        muted: "#6b6b6b",
        brand: "#E8D600",
        "brand-hover": "#F5E930",
        "border-subtle": "rgba(255,255,255,0.07)",
      },
      fontFamily: {
        frama: ["PP Frama", "serif"],
        machina: ["PP Neue Machina", "sans-serif"],
        sans: ["Helvetica Neue", "Arial", "sans-serif"],
      },
      borderColor: {
        DEFAULT: "rgba(255,255,255,0.07)",
      },
    },
  },
  plugins: [],
};

export default config;
