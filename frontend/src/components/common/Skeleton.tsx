import { cn } from "../../lib/utils";

export interface SkeletonProps {
    variant?: "rectangular" | "circular" | "text";
    width?: string;
    height?: string;
    className?: string;
}

export function Skeleton({ variant = "rectangular", width, height, className }: SkeletonProps) {
    const variantClasses = {
        rectangular: "rounded-md",
        circular: "rounded-full",
        text: "rounded h-4"
    };

    return (
        <div
            className={cn("skeleton-shimmer", variantClasses[variant], className)}
            style={{
                width: width,
                height: height
            }}
            aria-hidden="true"
        />
    );
}
