import { Skeleton } from "../common/Skeleton";

/**
 * Skeleton for the form interface submissions list page.
 * Shows a header with title and a list of submission cards.
 */
export function SubmissionsListSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
            {/* Back button skeleton */}
            <div className="flex items-center gap-2 mb-4">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="w-36 h-4" />
            </div>

            {/* Page header skeleton */}
            <div className="mb-6">
                <Skeleton className="w-64 h-8 mb-2" />
                <Skeleton className="w-32 h-4" />
            </div>

            {/* Submissions list skeleton */}
            <div className="space-y-4 mt-6">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className="bg-card border border-border rounded-lg overflow-hidden"
                    >
                        <div className="p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    {/* Message preview */}
                                    <Skeleton className="w-full h-4 mb-2" />
                                    <Skeleton className="w-3/4 h-4 mb-3" />

                                    {/* Meta info */}
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="w-32 h-3" />
                                        <Skeleton className="w-20 h-3" />
                                    </div>
                                </div>
                                <Skeleton className="w-20 h-5 rounded-full" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
