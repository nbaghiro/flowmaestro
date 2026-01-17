import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { applyTheme, getTheme, setTheme, type Theme } from "../storage";

interface ThemeToggleProps {
    className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
    const [theme, setThemeState] = useState<Theme>("system");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        getTheme().then((t) => {
            setThemeState(t);
            applyTheme(t);
            setMounted(true);
        });

        // Listen for system theme changes
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
            getTheme().then((t) => {
                if (t === "system") {
                    applyTheme(t);
                }
            });
        };
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    const toggleTheme = async () => {
        // Cycle through: light -> dark -> system -> light
        const nextTheme: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
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

    const resolvedTheme =
        theme === "system"
            ? window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light"
            : theme;

    return (
        <button
            onClick={toggleTheme}
            className={`p-1.5 hover:bg-accent rounded-md transition-colors ${className}`}
            title={`Theme: ${theme} (click to change)`}
        >
            {resolvedTheme === "dark" ? (
                <Moon className="w-4 h-4 text-muted-foreground" />
            ) : (
                <Sun className="w-4 h-4 text-muted-foreground" />
            )}
        </button>
    );
}
