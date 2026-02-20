import { Skeleton } from "../common/Skeleton";

/**
 * Skeleton for the folder contents page.
 * Shows breadcrumb, header, and content sections.
 */
export function FolderContentsSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
            {/* Breadcrumb skeleton */}
            <nav className="flex items-center gap-1.5 mb-6">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="w-12 h-4" />
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="w-24 h-4" />
            </nav>

            {/* Header skeleton */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-1 h-8 rounded-full" />
                        <Skeleton className="w-40 h-8" />
                        <Skeleton className="w-20 h-4" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="w-8 h-8 rounded-md" />
                        <Skeleton className="w-16 h-8 rounded-md" />
                        <Skeleton className="w-16 h-8 rounded-md" />
                    </div>
                </div>
            </div>

            {/* Content sections skeleton */}
            <div className="space-y-8">
                {/* Section header */}
                <div>
                    <Skeleton className="w-24 h-4 mb-4" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <div
                                key={i}
                                className="bg-card border border-border rounded-lg overflow-hidden"
                            >
                                <Skeleton className="h-32 rounded-none" />
                                <div className="p-4">
                                    <Skeleton className="w-3/4 h-5 mb-2" />
                                    <Skeleton className="w-full h-4 mb-1" />
                                    <Skeleton className="w-1/2 h-4" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
