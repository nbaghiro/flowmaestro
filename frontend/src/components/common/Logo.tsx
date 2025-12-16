interface LogoProps {
    size?: "sm" | "md" | "lg";
    className?: string;
}

const sizeConfig = {
    sm: 24,
    md: 32,
    lg: 64
};

export function Logo({ size = "md", className }: LogoProps) {
    const dimension = sizeConfig[size];
    const fontSize = size === "sm" ? 10 : size === "md" ? 13 : 26;
    const textY = size === "sm" ? 16 : size === "md" ? 21 : 42;
    const radius = size === "sm" ? 4 : size === "md" ? 6 : 12;

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={dimension}
            height={dimension}
            viewBox={`0 0 ${dimension} ${dimension}`}
            className={className}
        >
            {/* Light mode: dark background, white text */}
            <g className="dark:hidden">
                <rect width={dimension} height={dimension} rx={radius} fill="#111827" />
                <text
                    x={dimension / 2}
                    y={textY}
                    fontFamily="Arial, sans-serif"
                    fontSize={fontSize}
                    fontWeight="bold"
                    fill="white"
                    textAnchor="middle"
                >
                    FM
                </text>
            </g>
            {/* Dark mode: white background, dark text */}
            <g className="hidden dark:block">
                <rect width={dimension} height={dimension} rx={radius} fill="white" />
                <text
                    x={dimension / 2}
                    y={textY}
                    fontFamily="Arial, sans-serif"
                    fontSize={fontSize}
                    fontWeight="bold"
                    fill="#111827"
                    textAnchor="middle"
                >
                    FM
                </text>
            </g>
        </svg>
    );
}
