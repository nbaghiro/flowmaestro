import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { applyTheme, getTheme, setTheme, type Theme } from "../storage";

interface ThemeToggleProps {
    className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
    const [theme, setThemeState] = useState<Theme>("light");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        getTheme().then((t) => {
            // If stored theme is "system", resolve it to actual preference
            const resolvedTheme =
                t === "system"
                    ? window.matchMedia("(prefers-color-scheme: dark)").matches
                        ? "dark"
                        : "light"
                    : t;
            setThemeState(resolvedTheme);
            applyTheme(resolvedTheme);
            setMounted(true);
        });
    }, []);

    const toggleTheme = async () => {
        // Toggle between light and dark only
        const nextTheme: Theme = theme === "light" ? "dark" : "light";
        setThemeState(nextTheme);
        await setTheme(nextTheme);
        applyTheme(nextTheme);
    };

    // Don't render until mounted to avoid hydration mismatch
    if (!mounted) {
        return (
            <button className={`p-1.5 rounded-md ${className}`} disabled>
                <Sun className="w-4 h-4 text-muted-foreground" />
            </button>
        );
    }

    return (
        <button
            onClick={toggleTheme}
            className={`p-1.5 hover:bg-accent rounded-md transition-colors ${className}`}
            title={`Theme: ${theme} (click to change)`}
        >
            {theme === "dark" ? (
                <Moon className="w-4 h-4 text-muted-foreground" />
            ) : (
                <Sun className="w-4 h-4 text-muted-foreground" />
            )}
        </button>
    );
}
