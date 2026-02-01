import { cn } from "../../lib/utils";
import type { ReactNode } from "react";

interface ActionCardProps {
    illustration: ReactNode;
    title: string;
    subtitle: string;
    primaryAction: ReactNode;
    secondaryAction?: ReactNode;
    className?: string;
}

/**
 * Center action card for empty states.
 * Contains an illustration, title, subtitle, and call-to-action buttons.
 */
export function ActionCard({
    illustration,
    title,
    subtitle,
    primaryAction,
    secondaryAction,
    className
}: ActionCardProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center p-8 bg-card border border-border rounded-lg",
                className
            )}
        >
            {/* Illustration */}
            <div className="mb-6">{illustration}</div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-foreground mb-2 text-center">{title}</h3>

            {/* Subtitle */}
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-xs">{subtitle}</p>

            {/* Actions */}
            <div className="flex flex-col gap-3 w-full max-w-xs">
                {primaryAction}
                {secondaryAction}
            </div>
        </div>
    );
}
