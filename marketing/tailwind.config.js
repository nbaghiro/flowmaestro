/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                // Cool Steel - Industrial Precision palette
                background: {
                    DEFAULT: "#09090b",
                    surface: "#18181b",
                    elevated: "#27272a",
                },
                // Zinc scale for grays (cool-toned)
                gray: {
                    50: "#fafafa",
                    100: "#f4f4f5",
                    200: "#e4e4e7",
                    300: "#d4d4d8",
                    400: "#a1a1aa",
                    500: "#71717a",
                    600: "#52525b",
                    700: "#3f3f46",
                    800: "#27272a",
                    900: "#18181b",
                    950: "#09090b",
                },
                // Primary blue (Electric Blue)
                primary: {
                    300: "#93c5fd",
                    400: "#60a5fa",
                    500: "#3b82f6",
                    600: "#2563eb",
                    700: "#1d4ed8",
                },
                // Cyan accent
                accent: {
                    400: "#22d3ee",
                    500: "#06b6d4",
                    600: "#0891b2",
                },
            },
            // Border colors
            borderColor: {
                stroke: {
                    DEFAULT: "#3f3f46",
                    hover: "#52525b",
                },
            },
            animation: {
                "fade-in": "fadeIn 0.6s ease-out",
                "slide-up": "slideUp 0.6s ease-out",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { transform: "translateY(50px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
            },
        },
    },
    plugins: [],
};
