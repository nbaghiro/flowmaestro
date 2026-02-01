import { ArrowRight } from "lucide-react";
import { cn } from "../../lib/utils";
import type { ReactNode } from "react";

interface QuickCreateCardProps {
    icon: ReactNode;
    label: string;
    onClick: () => void;
    className?: string;
}

/**
 * Small card for quick creation of different entity types.
 * Used in the GetStartedPanel on the home page.
 */
export function QuickCreateCard({ icon, label, onClick, className }: QuickCreateCardProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center p-4 min-w-[120px]",
                "bg-card border border-border rounded-lg",
                "hover:border-primary/50 hover:bg-accent/50 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background",
                "group",
                className
            )}
        >
            {/* Icon */}
            <div className="mb-3">{icon}</div>

            {/* Label with arrow */}
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <span>{label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
        </button>
    );
}
