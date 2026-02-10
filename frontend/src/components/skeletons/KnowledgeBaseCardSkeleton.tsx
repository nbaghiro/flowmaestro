import { Skeleton } from "../common/Skeleton";

export function KnowledgeBaseCardSkeleton() {
    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden flex h-full">
            {/* Left color accent bar */}
            <Skeleton className="w-1 h-full rounded-none flex-shrink-0" />

            {/* Content */}
            <div className="p-4 flex flex-col flex-1">
                {/* Title */}
                <Skeleton className="w-3/4 h-5 mb-3" />

                {/* Description */}
                <Skeleton className="w-full h-4 mb-1" />
                <Skeleton className="w-2/3 h-4 mb-3" />

                {/* Spacer */}
                <div className="flex-1 min-h-2" />

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
        </div>
    );
}
