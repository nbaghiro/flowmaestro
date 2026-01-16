/** @type {import('tailwindcss').Config} */
export default {
    content: ["./src/**/*.{js,ts,jsx,tsx,html}"],
    theme: {
        extend: {
            colors: {
                // Using slate palette to match FlowMaestro's GitHub Primer-inspired design
                primary: {
                    50: "#f8fafc",
                    100: "#f1f5f9",
                    200: "#e2e8f0",
                    300: "#cbd5e1",
                    400: "#94a3b8",
                    500: "#64748b",
                    600: "#475569",
                    700: "#334155",
                    800: "#1e293b",
                    900: "#0f172a",
                    950: "#020617"
                }
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"]
            }
        }
    },
    plugins: []
};
