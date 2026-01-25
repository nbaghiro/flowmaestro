import React from "react";

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
            <div className="abstract-content">{children}</div>
        </div>
    );
};
