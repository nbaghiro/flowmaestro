import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768; // Tailwind 'md' breakpoint

/**
 * Hook to detect if the current viewport is mobile-sized (< 768px).
 * SSR-safe with proper hydration handling.
 */
export function useMobile(): boolean {
    // Default to false for SSR safety and to prevent hydration mismatch
    const [isMobile, setIsMobile] = useState<boolean>(false);

    useEffect(() => {
        // Check if window is available (client-side)
        if (typeof window === "undefined") return;

        const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

        // Set initial value
        setIsMobile(mediaQuery.matches);

        // Handler for media query changes
        const handleChange = (event: MediaQueryListEvent) => {
            setIsMobile(event.matches);
        };

        // Use modern addEventListener
        mediaQuery.addEventListener("change", handleChange);

        return () => {
            mediaQuery.removeEventListener("change", handleChange);
        };
    }, []);

    return isMobile;
}
