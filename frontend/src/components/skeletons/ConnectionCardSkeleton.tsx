import { Skeleton } from "../common/Skeleton";

export function ConnectionCardSkeleton() {
    return (
        <div className="bg-card border border-border rounded-xl p-5">
            {/* Header: Logo + Name + Status */}
            <div className="flex items-start gap-4">
                {/* Logo */}
                <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Name */}
                    <Skeleton className="w-2/3 h-4 mb-2" />
                    {/* Description */}
                    <Skeleton className="w-full h-3 mb-1" />
                    <Skeleton className="w-3/4 h-3" />
                </div>

                {/* Status badge */}
                <Skeleton className="w-16 h-6 rounded-md flex-shrink-0" />
            </div>
        </div>
    );
}
