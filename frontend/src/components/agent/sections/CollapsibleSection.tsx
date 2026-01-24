import { ChevronDown } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useAgentBuilderLayoutStore } from "../../../stores/agentBuilderLayoutStore";

import type { SectionStates } from "../../../stores/agentBuilderLayoutStore";
import type { LucideIcon } from "lucide-react";

export interface CollapsibleSectionProps {
    /** Section ID for state management */
    id: keyof SectionStates;
    /** Section title */
    title: string;
    /** Optional icon */
    icon?: LucideIcon;
    /** Badge content (e.g., "3 connected") shown next to title */
    badge?: string | number;
    /** Content to show when section is collapsed (summary view) */
    summaryContent?: React.ReactNode;
    /** Main content */
    children: React.ReactNode;
    /** Additional class names */
    className?: string;
}

export function CollapsibleSection({
    id,
    title,
    icon: Icon,
    badge,
    summaryContent,
    children,
    className
}: CollapsibleSectionProps) {
    const { sections, toggleSection } = useAgentBuilderLayoutStore();
    const isExpanded = sections[id];

    return (
        <div className={cn("border-b border-border", className)}>
            {/* Header - Always visible */}
            <button
                type="button"
                onClick={() => toggleSection(id)}
                className="w-full px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-2 min-w-0">
                    {Icon && <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {title}
                    </h3>
                    {badge !== undefined && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-normal normal-case">
                            {badge}
                        </span>
                    )}
                </div>
                <ChevronDown
                    className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform duration-200",
                        !isExpanded && "-rotate-90"
                    )}
                />
            </button>

            {/* Summary content - Shown when collapsed */}
            {!isExpanded && summaryContent && (
                <div className="px-4 pb-3 pt-0">
                    <div className="text-sm text-muted-foreground">{summaryContent}</div>
                </div>
            )}

            {/* Main content - Animated expand/collapse */}
            <div
                className={cn(
                    "transition-all duration-200",
                    isExpanded
                        ? "max-h-[2000px] opacity-100 overflow-visible"
                        : "max-h-0 opacity-0 overflow-hidden"
                )}
            >
                <div className="px-4 pt-2 pb-4 space-y-4">{children}</div>
            </div>
        </div>
    );
}
