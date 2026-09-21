import { cn } from "../../lib/utils";
import { PERSONA_CATEGORIES } from "./personaCategories";
import type { PersonaCategory } from "../../lib/api";

interface PersonaCategoryBadgeProps {
    category: PersonaCategory;
    className?: string;
}

/** The category pill shown on persona cards, detail views and instance views. */
export function PersonaCategoryBadge({ category, className }: PersonaCategoryBadgeProps) {
    const config = PERSONA_CATEGORIES[category];
    return (
        <span
            className={cn(
                "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full",
                config.badgeClass,
                className
            )}
        >
            {config.label}
        </span>
    );
}
