import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0f0a",
        foreground: "#00ff41",
        accent: "#00d4ff",
        muted: "#1a2e1a",
        card: "#0d120d",
        border: "#00ff4130",
        error: "#ff3333",
        warning: "#ffaa00",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glow: "0 0 10px #00ff41, 0 0 20px #00ff41",
        "glow-cyan": "0 0 10px #00d4ff, 0 0 20px #00d4ff",
        "glow-sm": "0 0 5px #00ff41",
      },
      animation: {
        blink: "blink 1s step-end infinite",
        typing: "typing 2s steps(30, end)",
        "fade-in": "fadeIn 0.5s ease forwards",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
      keyframes: {
        blink: {
          "0%, 50%": { opacity: "1" },
          "51%, 100%": { opacity: "0" },
        },
        typing: {
          from: { width: "0" },
          to: { width: "100%" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px #00ff41" },
          "50%": { boxShadow: "0 0 20px #00ff41, 0 0 30px #00ff41" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
