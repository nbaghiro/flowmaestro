import { useEffect } from "react";
import { useThemeStore } from "../stores/themeStore";

interface ThemeProviderProps {
    children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const initializeTheme = useThemeStore((state) => state.initializeTheme);

    useEffect(() => {
        // Initialize theme on mount
        initializeTheme();
    }, [initializeTheme]);

    return <>{children}</>;
}
