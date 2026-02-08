import { cn } from "../../lib/utils";

interface SectionDividerProps {
    label?: string;
    className?: string;
}

/**
 * Simple horizontal divider with optional centered label.
 * Used to separate sections on the home page.
 */
export function SectionDivider({ label, className }: SectionDividerProps) {
    if (!label) {
        return <hr className={cn("border-t border-border my-8", className)} />;
    }

    return (
        <div className={cn("flex items-center gap-4 my-8", className)}>
            <div className="flex-1 border-t border-border" />
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
            <div className="flex-1 border-t border-border" />
        </div>
    );
}
