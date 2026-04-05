import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const colorVar = (name: string) => `hsl(var(${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // Intentionally restricted scales to match BEESPO_DESIGN_SYSTEM.md
    spacing: {
      0: "0px",
      px: "1px",
      1: "0.25rem",
      2: "0.5rem",
      3: "0.75rem",
      4: "1rem",
      5: "1.25rem",
      6: "1.5rem",
      8: "2rem",
      10: "2.5rem",
      12: "3rem",
      16: "4rem",
    },
    fontFamily: {
      sans: ["var(--font-sans)"],
    },
    fontSize: {
      xs: ["var(--text-xs)", { lineHeight: "var(--leading-normal)" }],
      sm: ["var(--text-sm)", { lineHeight: "var(--leading-normal)" }],
      base: ["var(--text-base)", { lineHeight: "var(--leading-normal)" }],
      lg: ["var(--text-lg)", { lineHeight: "var(--leading-tight)" }],
      xl: ["var(--text-xl)", { lineHeight: "var(--leading-tight)" }],
      "2xl": ["var(--text-2xl)", { lineHeight: "var(--leading-tight)" }],
    },
    fontWeight: {
      normal: "var(--font-normal)",
      medium: "var(--font-medium)",
      semibold: "var(--font-semibold)",
      // Compatibility alias to avoid hard breaks while enforcing 3 effective weights.
      bold: "var(--font-semibold)",
    },
    lineHeight: {
      tight: "var(--leading-tight)",
      normal: "var(--leading-normal)",
      relaxed: "var(--leading-relaxed)",
    },
    borderRadius: {
      none: "0px",
      sm: "var(--radius-sm)",
      md: "var(--radius-md)",
      lg: "var(--radius-lg)",
      cta: "var(--radius-cta)",
      full: "var(--radius-full)",
    },
    borderWidth: {
      0: "0px",
      DEFAULT: "1px",
    },
    boxShadow: {
      none: "none",
      sm: "var(--shadow-sm)",
      md: "var(--shadow-md)",
      lg: "var(--shadow-lg)",
    },
    colors: {
      transparent: "transparent",
      current: "currentColor",
      inherit: "inherit",
      white: "#ffffff",
      black: "#000000",

      primary: {
        DEFAULT: colorVar("--color-primary"),
        hover: colorVar("--color-primary-hover"),
        light: colorVar("--color-primary-light"),
        foreground: colorVar("--color-bg-card"),
      },

      gray: {
        50: colorVar("--color-gray-50"),
        100: colorVar("--color-gray-100"),
        200: colorVar("--color-gray-200"),
        300: colorVar("--color-gray-300"),
        400: colorVar("--color-gray-400"),
        500: colorVar("--color-gray-500"),
        600: colorVar("--color-gray-600"),
        700: colorVar("--color-gray-700"),
        900: colorVar("--color-gray-900"),
      },

      success: colorVar("--color-success"),
      warning: colorVar("--color-warning"),
      error: colorVar("--color-error"),
      info: colorVar("--color-info"),

      "bg-page": colorVar("--color-bg-page"),
      "bg-card": colorVar("--color-bg-card"),
      "bg-sidebar": colorVar("--color-bg-sidebar"),
      "bg-hover": colorVar("--color-bg-hover"),
      "bg-selected": colorVar("--color-bg-selected"),

      // Legacy shadcn/beespo aliases mapped to canonical tokens.
      background: colorVar("--background"),
      foreground: colorVar("--foreground"),
      card: {
        DEFAULT: colorVar("--card"),
        foreground: colorVar("--card-foreground"),
      },
      popover: {
        DEFAULT: colorVar("--popover"),
        foreground: colorVar("--popover-foreground"),
      },
      secondary: {
        DEFAULT: colorVar("--secondary"),
        foreground: colorVar("--secondary-foreground"),
      },
      muted: {
        DEFAULT: colorVar("--muted"),
        foreground: colorVar("--muted-foreground"),
      },
      accent: {
        DEFAULT: colorVar("--accent"),
        foreground: colorVar("--accent-foreground"),
      },
      destructive: {
        DEFAULT: colorVar("--destructive"),
        foreground: colorVar("--destructive-foreground"),
      },
      border: colorVar("--border"),
      input: colorVar("--input"),
      ring: colorVar("--ring"),
    },
    extend: {
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "collapsible-down": {
          from: { height: "0" },
          to: { height: "var(--radix-collapsible-content-height)" },
        },
        "collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "collapsible-down": "collapsible-down 0.2s ease-out",
        "collapsible-up": "collapsible-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
