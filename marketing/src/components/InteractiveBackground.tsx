import React, { useState, useEffect } from "react";

export const InteractiveBackground: React.FC = () => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent): void => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener("mousemove", handleMouseMove);

        return (): void => {
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Base grid pattern */}
            <div className="absolute inset-0 grid-pattern opacity-20"></div>

            {/* Mouse spotlight effect - cool steel glow */}
            <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                    background: `radial-gradient(700px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(161, 161, 170, 0.18), transparent 45%)`
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
