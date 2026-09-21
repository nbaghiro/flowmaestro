import type { PersonaCategory } from "../../lib/api";

/**
 * Single definition of how each persona category is presented: its display order,
 * label, badge colours and icon. Every component that shows a category reads from
 * here, so adding a category is one entry rather than a map in each component.
 */
export interface PersonaCategoryConfig {
    label: string;
    /** Tailwind classes for the category badge, light and dark. */
    badgeClass: string;
    icon: string;
}

export const PERSONA_CATEGORY_ORDER: PersonaCategory[] = [
    "research",
    "content",
    "development",
    "data",
    "operations",
    "business",
    "proposals",
    "healthcare"
];

export const PERSONA_CATEGORIES: Record<PersonaCategory, PersonaCategoryConfig> = {
    research: {
        label: "Research & Analysis",
        badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        icon: "🔍"
    },
    content: {
        label: "Content Creation",
        badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
        icon: "✍️"
    },
    development: {
        label: "Software Development",
        badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
        icon: "💻"
    },
    data: {
        label: "Data & Analytics",
        badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
        icon: "📊"
    },
    operations: {
        label: "Operations & Support",
        badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
        icon: "⚙️"
    },
    business: {
        label: "Business Intelligence",
        badgeClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
        icon: "📈"
    },
    proposals: {
        label: "Proposals & Bids",
        badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
        icon: "📝"
    },
    healthcare: {
        label: "Healthcare & Life Sciences",
        badgeClass: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
        icon: "🩺"
    }
};
