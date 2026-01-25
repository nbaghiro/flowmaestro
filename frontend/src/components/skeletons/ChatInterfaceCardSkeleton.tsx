import { Skeleton } from "../common/Skeleton";

export function ChatInterfaceCardSkeleton() {
    return (
        <div className="bg-card border border-border rounded-lg relative">
            {/* Cover with icon overlay */}
            <div className="relative">
                <Skeleton className="h-32 w-full rounded-t-lg rounded-b-none" />
                {/* Icon overlay */}
                <div className="absolute -bottom-6 left-4">
                    <Skeleton className="w-12 h-12 rounded-lg border-2 border-background" />
                </div>
            </div>

            {/* Content */}
            <div className="p-4 pt-8">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        {/* Title */}
                        <Skeleton className="w-3/4 h-5 mb-2" />
                        {/* Description */}
                        <Skeleton className="w-full h-4 mb-1" />
                        <Skeleton className="w-2/3 h-4" />
                    </div>
                </div>

                {/* Status & Stats */}
                <div className="flex items-center gap-2 mt-3">
                    <Skeleton className="w-20 h-5 rounded-full" />
                    <Skeleton className="w-16 h-3" />
                    <Skeleton className="w-16 h-3" />
                </div>

                {/* Date */}
                <Skeleton className="w-28 h-3 mt-2" />
            </div>
        </div>
    );
}
