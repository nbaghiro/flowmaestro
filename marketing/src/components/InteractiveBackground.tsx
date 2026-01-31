import React, { useEffect, useState } from "react";
import { useTheme } from "../hooks/useTheme";

export const InteractiveBackground: React.FC = () => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const { theme } = useTheme();

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent): void => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener("mousemove", handleMouseMove);

        return (): void => {
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    // Theme-aware spotlight color
    const spotlightColor = theme === "dark" ? "rgba(161, 161, 170, 0.18)" : "rgba(0, 0, 0, 0.06)";

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Base grid pattern */}
            <div className="absolute inset-0 grid-pattern opacity-40"></div>

            {/* Mouse spotlight effect - theme-aware glow */}
            <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                    background: `radial-gradient(700px circle at ${mousePosition.x}px ${mousePosition.y}px, ${spotlightColor}, transparent 45%)`
                }}
            ></div>

            {/* Brightened grid overlay that follows mouse */}
            <div
                className="absolute inset-0 grid-pattern"
                style={{
                    maskImage: `radial-gradient(450px circle at ${mousePosition.x}px ${mousePosition.y}px, black, transparent 65%)`,
                    WebkitMaskImage: `radial-gradient(450px circle at ${mousePosition.x}px ${mousePosition.y}px, black, transparent 65%)`,
                    opacity: 0.5
                }}
            ></div>
        </div>
    );
};
