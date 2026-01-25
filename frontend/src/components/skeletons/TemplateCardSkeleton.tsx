import { Skeleton } from "../common/Skeleton";

export function TemplateCardSkeleton() {
    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Preview area with category badge */}
            <div className="relative h-40">
                <Skeleton className="h-full w-full rounded-none" />
                {/* Category badge overlay */}
                <div className="absolute top-3 left-3">
                    <Skeleton className="w-20 h-6 rounded-full" />
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Header with integrations and stats */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Skeleton variant="circular" className="w-5 h-5" />
                        <Skeleton variant="circular" className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-3" />
                        <Skeleton className="w-8 h-3" />
                    </div>
                </div>

                {/* Title */}
                <Skeleton className="w-3/4 h-5 mb-2" />

                {/* Description */}
                <Skeleton className="w-full h-4 mb-1" />
                <Skeleton className="w-2/3 h-4" />
            </div>
        </div>
    );
}
