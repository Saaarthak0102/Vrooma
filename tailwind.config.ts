import type { Config } from "tailwindcss";

/**
 * Colours live in CSS variables (globals.css). Tailwind 3 cannot add opacity to a bare var(), so a shade such as
 * bg-accent/10 or border-danger/30 used to generate no CSS at all and the element silently lost its tint. Mixing
 * with transparent at <alpha-value> lets every shade work, and leaves a plain class (bg-accent) exactly as before.
 */
export const themeColor = (variable: string) => `color-mix(in srgb, var(${variable}) calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: themeColor("--bg"),
        surface: themeColor("--surface"),
        "surface-glass": themeColor("--surface-glass"),
        border: themeColor("--border"),
        ink: {
          DEFAULT: themeColor("--ink"),
          soft: themeColor("--ink-soft"),
          mute: themeColor("--ink-mute"),
        },
        dark: themeColor("--dark"),
        accent: {
          DEFAULT: themeColor("--accent"),
          ink: themeColor("--accent-ink"),
          soft: themeColor("--accent-soft"),
        },
        danger: themeColor("--danger"),
        warn: themeColor("--warn"),
        ok: themeColor("--ok"),
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
      },
      fontFamily: {
        sans: ["var(--font-urbanist)", "sans-serif"],
        serif: ["var(--font-instrument)", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;

