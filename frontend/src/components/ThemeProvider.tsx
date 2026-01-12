import { useEffect } from "react";
import { useThemeStore } from "../stores/themeStore";
import { useUIPreferencesStore } from "../stores/uiPreferencesStore";

interface ThemeProviderProps {
    children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const initializeTheme = useThemeStore((state) => state.initializeTheme);
    const initializePreferences = useUIPreferencesStore((state) => state.initializePreferences);

    useEffect(() => {
        // Initialize theme on mount
        initializeTheme();
        // Initialize UI preferences on mount
        initializePreferences();
    }, [initializeTheme, initializePreferences]);

    return <>{children}</>;
}
