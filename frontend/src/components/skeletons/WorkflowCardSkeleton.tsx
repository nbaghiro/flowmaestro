import { Skeleton } from "../common/Skeleton";

export function WorkflowCardSkeleton() {
    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-md flex flex-col h-full">
            {/* Canvas Preview */}
            <Skeleton className="h-32 rounded-none" />

            {/* Content */}
            <div className="flex-1 p-5">
                {/* Header: Icon + Badge */}
                <div className="flex items-center justify-between mb-3">
                    <Skeleton variant="circular" className="w-5 h-5" />
                    <Skeleton className="w-16 h-5 rounded-full" />
                </div>

                {/* Title */}
                <Skeleton className="w-3/4 h-5 mb-2" />

                {/* Description */}
                <Skeleton className="w-full h-4 mb-1" />
                <Skeleton className="w-2/3 h-4" />

                {/* Footer */}
                <div className="mt-auto pt-4">
                    {/* Provider icons */}
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
        </div>
    );
}
