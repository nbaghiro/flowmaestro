import { Plus } from "lucide-react";
import { cn } from "../../lib/utils";
import type { ReactNode } from "react";

interface CreateCardProps {
    icon: ReactNode;
    label: string;
    onClick: () => void;
    className?: string;
}

/**
 * Clickable ghost-like card with centered "+" icon for quick creation.
 * Used in the QuickCreateRow on the home page.
 */
export function CreateCard({ icon, label, onClick, className }: CreateCardProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center gap-3",
                "h-[120px] min-w-0",
                "bg-card/50 border border-dashed border-border rounded-lg",
                "hover:border-primary hover:bg-card hover:shadow-md transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background",
                "group cursor-pointer",
                className
            )}
        >
            {/* Plus icon in circle */}
            <div
                className={cn(
                    "flex items-center justify-center",
                    "w-10 h-10 rounded-full",
                    "bg-muted dark:bg-muted/50 group-hover:bg-primary/10 transition-colors"
                )}
            >
                <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>

            {/* Type icon with label */}
            <div className="flex items-center gap-2">
                <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                    {icon}
                </div>
                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {label}
                </span>
            </div>
        </button>
    );
}
