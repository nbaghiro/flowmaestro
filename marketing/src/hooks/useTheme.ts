import React, { createContext, useContext, useEffect } from "react";

/**
 * The marketing site is dark only. The provider keeps the old context shape so pages that
 * read `theme` keep compiling, but the value never changes and the toggles are no-ops.
 */
type Theme = "light" | "dark";

interface ThemeContextValue {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const DARK_ONLY: ThemeContextValue = {
    theme: "dark",
    setTheme: () => undefined,
    toggleTheme: () => undefined
};

const ThemeContext = createContext<ThemeContextValue>(DARK_ONLY);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        document.documentElement.classList.add("dark");
    }, []);

    return React.createElement(ThemeContext.Provider, { value: DARK_ONLY }, children);
}

export function useTheme(): ThemeContextValue {
    return useContext(ThemeContext);
}
