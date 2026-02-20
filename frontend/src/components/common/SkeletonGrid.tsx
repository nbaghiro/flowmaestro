import React from "react";
import { cn } from "../../lib/utils";

export interface SkeletonGridProps {
    count?: number;
    CardSkeleton: React.ComponentType;
    className?: string;
}

export function SkeletonGrid({ count = 9, CardSkeleton, className }: SkeletonGridProps) {
    return (
        <div
            className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}
            aria-busy="true"
            aria-label="Loading content"
        >
            <span className="sr-only">Loading...</span>
            {Array.from({ length: count }).map((_, index) => (
                <CardSkeleton key={index} />
            ))}
        </div>
    );
}
