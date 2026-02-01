import { cn } from "../../lib/utils";

export type GhostCardVariant = "workflow" | "agent" | "chat" | "form" | "knowledge-base";

interface GhostCardProps {
    variant: GhostCardVariant;
    opacity?: number;
    className?: string;
}

/**
 * A static "ghost" card that mimics the structure of real cards
 * but without content - used to show what cards will look like.
 * No shimmer animation - this is for empty state decoration.
 */
export function GhostCard({ variant, opacity = 0.5, className }: GhostCardProps) {
    // Common skeleton bar component (no shimmer)
    const SkeletonBar = ({
        width = "w-full",
        height = "h-4",
        rounded = "rounded-md"
    }: {
        width?: string;
        height?: string;
        rounded?: string;
    }) => <div className={cn("bg-muted-foreground/40", width, height, rounded)} />;

    // Common skeleton circle component
    const SkeletonCircle = ({ size = "w-5 h-5" }: { size?: string }) => (
        <div className={cn("bg-muted-foreground/40 rounded-full", size)} />
    );

    // Shared header section with icon and badge
    const CardHeader = () => (
        <div className="flex items-center justify-between mb-3">
            <SkeletonCircle />
            <SkeletonBar width="w-16" height="h-5" rounded="rounded-full" />
        </div>
    );

    // Shared title and description
    const CardTitleDescription = () => (
        <>
            <SkeletonBar width="w-3/4" height="h-5" />
            <div className="mt-2 space-y-1">
                <SkeletonBar height="h-4" />
                <SkeletonBar width="w-2/3" height="h-4" />
            </div>
        </>
    );

    // Shared footer with icons and date
    const CardFooter = () => (
        <div className="mt-auto pt-4">
            <div className="flex gap-1 mb-3">
                <SkeletonCircle />
                <SkeletonCircle />
                <SkeletonCircle />
            </div>
            <div className="pt-3 border-t border-border">
                <SkeletonBar width="w-32" height="h-3" />
            </div>
        </div>
    );

    // Apply opacity to the container
    const containerStyle = { opacity };

    // Workflow card structure
    if (variant === "workflow") {
        return (
            <div
                className={cn(
                    "bg-card border border-border rounded-lg overflow-hidden shadow-md flex flex-col h-full",
                    className
                )}
                style={containerStyle}
            >
                {/* Canvas preview placeholder */}
                <div className="h-32 bg-muted-foreground/20" />

                <div className="flex-1 p-5">
                    <CardHeader />
                    <CardTitleDescription />
                    <CardFooter />
                </div>
            </div>
        );
    }

    // Agent card structure
    if (variant === "agent") {
        return (
            <div
                className={cn(
                    "bg-card border border-border rounded-lg overflow-hidden flex flex-col h-full",
                    className
                )}
                style={containerStyle}
            >
                {/* DNA preview placeholder */}
                <div className="h-32 bg-muted-foreground/20" />

                <div className="flex-1 px-5 pt-5">
                    <div className="flex items-center justify-between mb-3">
                        <SkeletonCircle />
                        <div className="flex items-center gap-1">
                            <SkeletonBar width="w-16" height="h-5" rounded="rounded-full" />
                            <SkeletonBar width="w-20" height="h-5" rounded="rounded-full" />
                        </div>
                    </div>
                    <CardTitleDescription />
                </div>

                <div className="mt-auto px-5 pb-5">
                    <div className="flex gap-1 mb-3">
                        <SkeletonCircle />
                        <SkeletonCircle />
                        <SkeletonCircle />
                    </div>
                    <div className="pt-3 border-t border-border">
                        <SkeletonBar width="w-32" height="h-3" />
                    </div>
                </div>
            </div>
        );
    }

    // Chat interface card structure
    if (variant === "chat") {
        return (
            <div
                className={cn(
                    "bg-card border border-border rounded-lg overflow-hidden flex flex-col h-full",
                    className
                )}
                style={containerStyle}
            >
                {/* Preview placeholder */}
                <div className="h-32 bg-muted-foreground/20" />

                <div className="flex-1 p-5">
                    <CardHeader />
                    <CardTitleDescription />
                    <CardFooter />
                </div>
            </div>
        );
    }

    // Form interface card structure
    if (variant === "form") {
        return (
            <div
                className={cn(
                    "bg-card border border-border rounded-lg overflow-hidden flex flex-col h-full",
                    className
                )}
                style={containerStyle}
            >
                {/* Preview placeholder */}
                <div className="h-32 bg-muted-foreground/20" />

                <div className="flex-1 p-5">
                    <CardHeader />
                    <CardTitleDescription />
                    <CardFooter />
                </div>
            </div>
        );
    }

    // Knowledge base card structure
    if (variant === "knowledge-base") {
        return (
            <div
                className={cn(
                    "bg-card border border-border rounded-lg overflow-hidden flex flex-col h-full",
                    className
                )}
                style={containerStyle}
            >
                {/* Header with icon */}
                <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                        <SkeletonCircle size="w-8 h-8" />
                        <SkeletonBar width="w-16" height="h-5" rounded="rounded-full" />
                    </div>
                    <CardTitleDescription />
                </div>

                {/* Stats row */}
                <div className="mt-auto px-5 pb-5">
                    <div className="flex gap-4 mb-3">
                        <SkeletonBar width="w-16" height="h-4" />
                        <SkeletonBar width="w-16" height="h-4" />
                    </div>
                    <div className="pt-3 border-t border-border">
                        <SkeletonBar width="w-32" height="h-3" />
                    </div>
                </div>
            </div>
        );
    }

    // Default fallback
    return (
        <div
            className={cn(
                "bg-card border border-border rounded-lg overflow-hidden flex flex-col h-full p-5",
                className
            )}
            style={containerStyle}
        >
            <CardHeader />
            <CardTitleDescription />
            <CardFooter />
        </div>
    );
}
