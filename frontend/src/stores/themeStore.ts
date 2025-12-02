import { create } from "zustand";

type Theme = "light" | "dark" | "system";
type EffectiveTheme = "light" | "dark";

interface ThemeStore {
    theme: Theme;
    effectiveTheme: EffectiveTheme;
    setTheme: (theme: Theme) => void;
    initializeTheme: () => void;
}

// Helper to get system preference
const getSystemTheme = (): EffectiveTheme => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

// Helper to calculate effective theme
const calculateEffectiveTheme = (theme: Theme): EffectiveTheme => {
    if (theme === "system") {
        return getSystemTheme();
    }
    return theme;
};

// Helper to apply theme to DOM
const applyThemeToDOM = (effectiveTheme: EffectiveTheme): void => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    if (effectiveTheme === "dark") {
        root.classList.add("dark");
    } else {
        root.classList.remove("dark");
    }
};

export const useThemeStore = create<ThemeStore>((set, get) => ({
    theme: "light",
    effectiveTheme: "light",

    setTheme: (theme: Theme) => {
        // Save to localStorage
        localStorage.setItem("theme", theme);

        // Calculate effective theme
        const effectiveTheme = calculateEffectiveTheme(theme);

        // Update state
        set({ theme, effectiveTheme });

        // Apply to DOM
        applyThemeToDOM(effectiveTheme);
    },

    initializeTheme: () => {
        // Load from localStorage or default to light
        const savedTheme = (localStorage.getItem("theme") as Theme) || "light";
        const effectiveTheme = calculateEffectiveTheme(savedTheme);

        // Update state
        set({ theme: savedTheme, effectiveTheme });

        // Apply to DOM immediately to prevent flash
        applyThemeToDOM(effectiveTheme);

        // Listen for system theme changes if theme is "system"
        if (typeof window !== "undefined") {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

            const handleChange = () => {
                const currentTheme = get().theme;
                if (currentTheme === "system") {
                    const newEffectiveTheme = getSystemTheme();
                    set({ effectiveTheme: newEffectiveTheme });
                    applyThemeToDOM(newEffectiveTheme);
                }
            };

            mediaQuery.addEventListener("change", handleChange);
        }
    }
}));
