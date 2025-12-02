import { cn } from "../../lib/utils";

interface ProgressBarProps {
    value: number; // 0-100
    max?: number;
    className?: string;
    showLabel?: boolean;
    size?: "sm" | "md" | "lg";
    variant?: "primary" | "success" | "warning" | "error";
}

const sizeConfig = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3"
};

const variantConfig = {
    primary: "bg-blue-600 dark:bg-blue-500",
    success: "bg-green-600 dark:bg-green-500",
    warning: "bg-amber-600 dark:bg-amber-500",
    error: "bg-red-600 dark:bg-red-500"
};

export function ProgressBar({
    value,
    max = 100,
    className,
    showLabel = false,
    size = "md",
    variant = "primary"
}: ProgressBarProps) {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
        <div className={cn("w-full", className)}>
            {showLabel && (
                <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">
                        {Math.round(percentage)}%
                    </span>
                </div>
            )}
            <div className={cn("w-full rounded-full overflow-hidden bg-muted", sizeConfig[size])}>
                <div
                    className={cn(
                        "h-full transition-all duration-300 ease-out rounded-full",
                        variantConfig[variant]
                    )}
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={value}
                    aria-valuemin={0}
                    aria-valuemax={max}
                />
            </div>
        </div>
    );
}
