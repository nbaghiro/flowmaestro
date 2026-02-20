import { Skeleton } from "../common/Skeleton";

/**
 * Skeleton for interface editor pages (Form Interface Editor and Chat Interface Editor).
 * Shows a header bar and a centered card preview area.
 */
export function InterfaceEditorSkeleton() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header skeleton */}
            <header className="h-16 border-b border-border bg-card px-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-9 h-9 rounded-lg" />
                    <div>
                        <Skeleton className="w-32 h-5 mb-1" />
                        <Skeleton className="w-20 h-3" />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Skeleton className="w-20 h-8 rounded-md" />
                    <Skeleton className="w-20 h-8 rounded-md" />
                    <Skeleton className="w-16 h-8 rounded-md" />
                    <Skeleton className="w-20 h-8 rounded-md" />
                </div>
            </header>

            {/* Main content - Card preview skeleton */}
            <div className="max-w-2xl mx-auto px-6 py-8">
                <div className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-sm">
                    {/* Cover skeleton */}
                    <Skeleton className="h-40 w-full rounded-none" />

                    {/* Icon skeleton (overlapping cover) */}
                    <div className="relative">
                        <div className="absolute -top-8 left-6">
                            <Skeleton className="w-16 h-16 rounded-xl border-4 border-background" />
                        </div>
                    </div>

                    {/* Form content skeleton */}
                    <div className="p-6 pt-12">
                        {/* Title */}
                        <Skeleton className="w-64 h-7 mb-3" />

                        {/* Description */}
                        <Skeleton className="w-full h-4 mb-1" />
                        <Skeleton className="w-3/4 h-4 mb-6" />

                        {/* Input fields skeleton */}
                        <div className="space-y-4">
                            <Skeleton className="w-24 h-4 mb-2" />
                            <Skeleton className="w-full h-12 rounded-lg" />

                            <Skeleton className="w-32 h-4 mb-2" />
                            <Skeleton className="w-full h-12 rounded-lg" />

                            {/* Submit button */}
                            <Skeleton className="w-full h-12 rounded-lg mt-4" />
                        </div>

                        {/* URL section */}
                        <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
                            <Skeleton className="w-16 h-3" />
                            <Skeleton className="w-48 h-3" />
                        </div>
                    </div>
                </div>

                {/* Hint text */}
                <div className="flex justify-center mt-4">
                    <Skeleton className="w-80 h-3" />
                </div>
            </div>
        </div>
    );
}
