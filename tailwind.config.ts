import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        "surface-hover": "hsl(var(--surface-hover))",
        muted: "hsl(var(--muted))",
        border: "hsl(var(--border))",
        accent: "hsl(var(--accent))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))",
      },
      borderRadius: {
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "999px",
      },
      boxShadow: {
        soft: "0 18px 44px rgba(17,17,17,0.06)",
        card: "0 4px 12px rgba(17,17,17,0.04), 0 16px 34px rgba(17,17,17,0.06)",
        lift: "0 8px 24px rgba(17,17,17,0.07), 0 28px 56px rgba(17,17,17,0.10)",
      },
    },
  },
  plugins: [],
} satisfies Config;
