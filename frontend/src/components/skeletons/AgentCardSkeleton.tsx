import { Skeleton } from "../common/Skeleton";

export function AgentCardSkeleton() {
    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col h-full">
            {/* DNA Preview */}
            <Skeleton className="h-32 rounded-none" />

            {/* Main Content */}
            <div className="flex-1 px-5 pt-5">
                {/* Header: Icon + Badges (provider, model) */}
                <div className="flex items-center justify-between mb-3">
                    <Skeleton variant="circular" className="w-5 h-5" />
                    <div className="flex items-center gap-1">
                        <Skeleton className="w-16 h-5 rounded-full" />
                        <Skeleton className="w-20 h-5 rounded-full" />
                    </div>
                </div>

                {/* Title */}
                <Skeleton className="w-3/4 h-5 mb-2" />

                {/* Description */}
                <Skeleton className="w-full h-4 mb-1" />
                <Skeleton className="w-2/3 h-4" />
            </div>

            {/* Footer */}
            <div className="mt-auto px-5 pb-5">
                {/* Tool icons */}
                <div className="flex gap-1 mb-3">
                    <Skeleton variant="circular" className="w-5 h-5" />
                    <Skeleton variant="circular" className="w-5 h-5" />
                    <Skeleton variant="circular" className="w-5 h-5" />
                </div>

                {/* Date */}
                <div className="pt-3 border-t border-border">
                    <Skeleton className="w-32 h-3" />
                </div>
            </div>
        </div>
    );
}
