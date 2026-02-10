import { Skeleton } from "../common/Skeleton";

function HorizontalRowSkeleton({ cardCount = 5 }: { cardCount?: number }) {
    return (
        <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-5 w-20" />
            </div>
            <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: cardCount }).map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-[380px]">
                        <div className="bg-card border border-border rounded-lg overflow-hidden">
                            <Skeleton className="h-32 rounded-none" />
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <Skeleton variant="circular" className="w-5 h-5" />
                                    <Skeleton className="w-16 h-5 rounded-full" />
                                </div>
                                <Skeleton className="w-3/4 h-5 mb-2" />
                                <Skeleton className="w-full h-4 mb-1" />
                                <Skeleton className="w-2/3 h-4" />
                                <div className="mt-4 pt-3 border-t border-border">
                                    <Skeleton className="w-32 h-3" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

export function HomePageSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
            {/* Page Header Skeleton */}
            <div className="mb-8">
                <Skeleton className="h-8 w-40 mb-2" />
                <Skeleton className="h-5 w-80" />
            </div>

            {/* Recent Workflows Skeleton */}
            <HorizontalRowSkeleton />

            {/* Recent Agents Skeleton */}
            <HorizontalRowSkeleton />

            {/* Personas Skeleton */}
            <HorizontalRowSkeleton />

            {/* Templates Skeleton */}
            <HorizontalRowSkeleton cardCount={4} />

            {/* Recent Interfaces Skeleton */}
            <HorizontalRowSkeleton />
        </div>
    );
}
