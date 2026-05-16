/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  plugins: [],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        background: "hsl(var(--background))",
        border: "hsl(var(--border))",
        "border-control": "hsl(var(--border-control))",
        "border-divider": "hsl(var(--border-divider))",
        "border-panel": "hsl(var(--border-panel))",
        "border-subtle": "hsl(var(--border-subtle))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        foreground: "hsl(var(--foreground))",
        input: "hsl(var(--input))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        ring: "hsl(var(--ring))",
        "search-border": "hsl(var(--search-border))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
      },
      fontFamily: {
        sans: ['"SF Pro Text"', '"Segoe UI"', "ui-sans-serif", "sans-serif"],
      },
    },
  },
};
