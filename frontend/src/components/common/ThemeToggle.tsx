import { Sun, Moon } from "lucide-react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../stores/themeStore";
import { Tooltip } from "./Tooltip";

interface ThemeToggleProps {
    size?: "sm" | "md";
    className?: string;
    tooltipPosition?: "top" | "bottom" | "left" | "right";
}

export function ThemeToggle({
    size = "sm",
    className,
    tooltipPosition = "bottom"
}: ThemeToggleProps) {
    const { theme, setTheme } = useThemeStore();

    const toggleTheme = () => {
        setTheme(theme === "light" ? "dark" : "light");
    };

    const getThemeTooltip = () => {
        return theme === "light" ? "Switch to dark mode" : "Switch to light mode";
    };

    const Icon = theme === "light" ? Sun : Moon;
    const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

    return (
        <Tooltip content={getThemeTooltip()} position={tooltipPosition} delay={200}>
            <button
                onClick={toggleTheme}
                className={cn(
                    "p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                    className
                )}
                aria-label={getThemeTooltip()}
            >
                <Icon className={iconSize} />
            </button>
        </Tooltip>
    );
}
