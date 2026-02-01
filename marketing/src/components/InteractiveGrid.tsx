import React, { useState, useEffect } from "react";

export const InteractiveGrid: React.FC = () => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener("mousemove", handleMouseMove);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden">
            {/* Mouse spotlight effect */}
            <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                style={{
                    background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(139, 92, 246, 0.15), transparent 40%)`
                }}
            ></div>

            {/* Brightened grid overlay that follows mouse */}
            <div
                className="absolute inset-0 grid-pattern pointer-events-none"
                style={{
                    maskImage: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, black, transparent 70%)`,
                    WebkitMaskImage: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, black, transparent 70%)`,
                    opacity: 0.5
                }}
            ></div>
        </div>
    );
};
