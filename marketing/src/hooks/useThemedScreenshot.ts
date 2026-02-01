import { useMemo } from "react";
import { useTheme } from "./useTheme";

/**
 * Returns the appropriate screenshot path based on current theme.
 * Screenshots should be named with -light or -dark suffix:
 * - hero-dashboard-light.png
 * - hero-dashboard-dark.png
 *
 * @param baseName - The base screenshot name without extension (e.g., "hero-dashboard")
 * @returns The full path to the themed screenshot
 */
export function useThemedScreenshot(baseName: string): string {
    const { theme } = useTheme();

    return useMemo(() => {
        return `/screenshots/${baseName}-${theme}.png`;
    }, [baseName, theme]);
}

/**
 * Returns both light and dark screenshot paths for preloading or fallback.
 */
export function useThemedScreenshots(baseName: string): {
    current: string;
    light: string;
    dark: string;
} {
    const { theme } = useTheme();

    return useMemo(
        () => ({
            current: `/screenshots/${baseName}-${theme}.png`,
            light: `/screenshots/${baseName}-light.png`,
            dark: `/screenshots/${baseName}-dark.png`
        }),
        [baseName, theme]
    );
}
