import { Skeleton } from "../common/Skeleton";

export function KnowledgeBaseCardSkeleton() {
    return (
        <div className="bg-card border border-border rounded-lg p-5 flex flex-col h-full">
            {/* Header: Icon + Badges */}
            <div className="flex items-center justify-between mb-3">
                <Skeleton variant="circular" className="w-5 h-5" />
                <div className="flex items-center gap-1">
                    <Skeleton className="w-20 h-5 rounded-full" />
                    <Skeleton className="w-24 h-5 rounded-full" />
                </div>
            </div>

            {/* Title */}
            <Skeleton className="w-3/4 h-5 mb-2" />

            {/* Description */}
            <Skeleton className="w-full h-4 mb-1" />
            <Skeleton className="w-2/3 h-4" />

            {/* Spacer */}
            <div className="flex-1 min-h-4" />

            {/* Stats row */}
            <div className="flex items-center gap-4 mb-3">
                <Skeleton className="w-16 h-3" />
                <Skeleton className="w-20 h-3" />
                <Skeleton className="w-14 h-3" />
            </div>

            {/* Date */}
            <div className="pt-3 border-t border-border">
                <Skeleton className="w-32 h-3" />
            </div>
        </div>
    );
}
