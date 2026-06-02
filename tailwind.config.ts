import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette derived from Supreme Packages logo
        brand: {
          navy:   "#1F2940", // deep navy from logo background
          darker: "#151D30",
          gold:   "#E8A93C", // gold from logo letterforms
          goldLt: "#F4C97C",
          paper:  "#F8F6F1",
          ink:    "#0B1220",
        },
        // shadcn tokens (HSL friendly)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card:       "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        primary:    "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary:  "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted:      "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent:     "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive:"hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
