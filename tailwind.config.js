module.exports = {
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        alt: "var(--alt)",
        "app-primary": "var(--app-primary)",
        "app-secondary": "var(--app-secondary)",
        dark: "var(--dark)",
        "dark-alt": "var(--dark-alt)",
        light: "var(--light)",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        "bold-10px": "var(--bold-10px-font-family)",
        "bold-12px": "var(--bold-12px-font-family)",
        "bold-14px": "var(--bold-14px-font-family)",
        "bold-17px": "var(--bold-17px-font-family)",
        "bold-20px": "var(--bold-20px-font-family)",
        "bold-24px": "var(--bold-24px-font-family)",
        "bold-29px": "var(--bold-29px-font-family)",
        "bold-35px": "var(--bold-35px-font-family)",
        "regular-10px": "var(--regular-10px-font-family)",
        "regular-12px": "var(--regular-12px-font-family)",
        "regular-14px": "var(--regular-14px-font-family)",
        "regular-17px": "var(--regular-17px-font-family)",
        "regular-20px": "var(--regular-20px-font-family)",
        "regular-24px": "var(--regular-24px-font-family)",
        "regular-29px": "var(--regular-29px-font-family)",
        "regular-35px": "var(--regular-35px-font-family)",
        sans: [
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
      },
      boxShadow: { "navicon-active-shadow": "var(--navicon-active-shadow)" },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
  },
  plugins: [],
  darkMode: ["class"],
};
