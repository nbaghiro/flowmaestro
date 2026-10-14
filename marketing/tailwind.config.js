/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
                serif: ["Inter", "system-ui", "sans-serif"],
                mono: ['"IBM Plex Mono"', "ui-monospace", "Menlo", "monospace"]
            },
            colors: {
                // CSS variable-based colors matching frontend app
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))"
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))"
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))"
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))"
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))"
                },
                // Black language steps that have no HSL token
                sunken: "#0e0e12",
                raised: "#161619",
                line: "#1f1f25",
                edge: "#4a4a52",
                body: "#c6c6cc",
                dim: "#6f6f78",
                ok: "#34d399",
                warn: "#fbbf24",
                danger: "#f87171"
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)"
            },
            animation: {
                "fade-in": "fadeIn 0.6s ease-out",
                "slide-up": "slideUp 0.6s ease-out"
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" }
                },
                slideUp: {
                    "0%": { transform: "translateY(50px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" }
                }
            }
        }
    },
    plugins: [require("@tailwindcss/typography")]
};
