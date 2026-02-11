import React from "react";
import { ThemeToggle } from "./ThemeToggle";

interface AbstractBackgroundProps {
    variant?: "auth" | "app";
    children: React.ReactNode;
    className?: string;
}

export const AbstractBackground: React.FC<AbstractBackgroundProps> = ({
    variant = "app",
    children,
    className = ""
}) => {
    return (
        <div className={`abstract-bg abstract-bg--${variant} ${className}`}>
            {variant === "auth" && (
                <div className="absolute top-4 right-4 z-10">
                    <ThemeToggle
                        tooltipPosition="left"
                        className="text-muted-foreground/60 hover:text-foreground hover:bg-white/10 dark:hover:bg-white/10"
                    />
                </div>
            )}
            <div className="abstract-content">{children}</div>
        </div>
    );
};
