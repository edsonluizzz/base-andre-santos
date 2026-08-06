import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        // Semantic tokens
        cta: {
          DEFAULT: "var(--cta)",
          foreground: "var(--cta-foreground)",
          muted: "var(--cta-muted)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        gold: {
          DEFAULT: "#ff6b04",
          light: "#ffb37a",
          muted: "rgba(255,107,4,0.35)",
        },
        // Sidebar tokens
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 4px rgba(212,175,55,0.15), 0 0 0 1px rgba(212,175,55,0.10)" },
          "50%":       { boxShadow: "0 0 20px rgba(212,175,55,0.50), 0 0 0 1px rgba(212,175,55,0.25)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "spin-slow": {
          "to": { transform: "rotate(360deg)" },
        },
        "spin-slow-rev": {
          "to": { transform: "rotate(-360deg)" },
        },
      },
      animation: {
        "glow-pulse":    "glow-pulse 2.5s ease-in-out infinite",
        "fade-up":       "fade-up 0.5s ease-out forwards",
        "float":         "float 5s ease-in-out infinite",
        "spin-slow":     "spin-slow 12s linear infinite",
        "spin-slow-rev": "spin-slow-rev 8s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
