import { Skeleton } from "../common/Skeleton";

/**
 * Full-page skeleton that mimics the AppLayout with sidebar.
 * Used during initial auth/workspace loading in ProtectedRoute.
 */
export function AppLayoutSkeleton() {
    return (
        <div className="h-screen flex bg-background">
            {/* Sidebar skeleton */}
            <aside className="w-64 h-full bg-card border-r border-border flex flex-col">
                {/* Logo area */}
                <div className="h-16 px-4 flex items-center border-b border-border">
                    <Skeleton className="w-8 h-8 rounded-lg mr-3" />
                    <Skeleton className="w-24 h-5" />
                </div>

                {/* Navigation items */}
                <div className="flex-1 p-4 space-y-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 py-2 px-3">
                            <Skeleton className="w-5 h-5 rounded" />
                            <Skeleton className="w-20 h-4" />
                        </div>
                    ))}
                </div>

                {/* Workspace switcher skeleton */}
                <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-3 p-2">
                        <Skeleton variant="circular" className="w-8 h-8" />
                        <div className="flex-1">
                            <Skeleton className="w-24 h-4 mb-1" />
                            <Skeleton className="w-16 h-3" />
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content skeleton */}
            <main className="flex-1 overflow-auto">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    {/* Page header skeleton */}
                    <div className="mb-8">
                        <Skeleton className="w-48 h-8 mb-2" />
                        <Skeleton className="w-72 h-4" />
                    </div>

                    {/* Content grid skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="bg-card border border-border rounded-lg overflow-hidden"
                            >
                                <Skeleton className="h-32 rounded-none" />
                                <div className="p-5">
                                    <Skeleton className="w-3/4 h-5 mb-2" />
                                    <Skeleton className="w-full h-4 mb-1" />
                                    <Skeleton className="w-2/3 h-4" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
