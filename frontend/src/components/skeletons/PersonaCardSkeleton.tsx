import { Skeleton } from "../common/Skeleton";

export function PersonaCardSkeleton() {
    return (
        <div className="bg-card border border-border rounded-lg p-5 flex flex-col h-full">
            {/* Header: Avatar + Name + Category */}
            <div className="flex items-start gap-3 mb-3">
                <Skeleton variant="circular" className="w-11 h-11 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <Skeleton className="w-2/3 h-5 mb-2" />
                    <Skeleton className="w-16 h-5 rounded-full" />
                </div>
            </div>

            {/* Description */}
            <Skeleton className="w-full h-4 mb-1" />
            <Skeleton className="w-3/4 h-4 mb-4" />

            {/* Deliverables section */}
            <div className="mb-4">
                <Skeleton className="w-16 h-3 mb-2" />
                <div className="flex flex-wrap gap-2">
                    <Skeleton className="w-20 h-6 rounded" />
                    <Skeleton className="w-24 h-6 rounded" />
                    <Skeleton className="w-18 h-6 rounded" />
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                <Skeleton className="w-20 h-3" />
                <Skeleton className="w-16 h-5" />
            </div>
        </div>
    );
}
