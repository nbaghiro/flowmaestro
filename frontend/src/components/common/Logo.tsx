import { cn } from "../../lib/utils";

interface LogoProps {
    size?: "sm" | "md" | "lg";
    className?: string;
}

const sizeConfig = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-16 h-16 text-2xl"
};

export function Logo({ size = "md", className }: LogoProps) {
    return (
        <div
            className={cn(
                "flex items-center justify-center rounded-lg font-bold",
                "bg-gray-900 dark:bg-white",
                "text-white dark:text-gray-900",
                sizeConfig[size],
                className
            )}
        >
            FM
        </div>
    );
}
