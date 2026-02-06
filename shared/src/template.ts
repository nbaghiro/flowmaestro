import type { WorkflowDefinition } from "./types";

export const TEMPLATE_CATEGORIES = [
    "marketing",
    "sales",
    "operations",
    "engineering",
    "support",
    "ecommerce",
    "hr",
    "finance",
    "saas",
    "healthcare"
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const TEMPLATE_SORT_OPTIONS = ["default", "complexity", "popularity", "newest"] as const;
export type TemplateSortBy = (typeof TEMPLATE_SORT_OPTIONS)[number];

export interface Template {
    id: string;
    name: string;
    description: string | null;
    definition: WorkflowDefinition;
    category: TemplateCategory;
    tags: string[];
    icon: string | null;
    color: string | null;
    preview_image_url: string | null;
    author_name: string | null;
    author_avatar_url: string | null;
    view_count: number;
    use_count: number;
    featured: boolean;
    required_integrations: string[];
    version: string;
    created_at: string;
    updated_at: string;
}

export interface TemplateListParams {
    category?: TemplateCategory;
    tags?: string[];
    featured?: boolean;
    search?: string;
    sortBy?: TemplateSortBy;
    limit?: number;
    offset?: number;
}

export interface TemplateListResponse {
    items: Template[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

export interface CategoryInfo {
    category: TemplateCategory;
    count: number;
    label: string;
    icon: string;
    color: string;
}

export interface CopyTemplateResponse {
    workflowId: string;
    workflow: {
        id: string;
        name: string;
    };
}

// Category metadata for display - modern vibrant colors
export const TEMPLATE_CATEGORY_META: Record<
    TemplateCategory,
    { label: string; icon: string; color: string; bgColor: string }
> = {
    marketing: {
        label: "Marketing",
        icon: "Megaphone",
        color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
        bgColor: "bg-violet-500"
    },
    sales: {
        label: "Sales",
        icon: "TrendingUp",
        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
        bgColor: "bg-emerald-500"
    },
    operations: {
        label: "Operations",
        icon: "Settings",
        color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
        bgColor: "bg-amber-500"
    },
    engineering: {
        label: "Engineering",
        icon: "Code",
        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        bgColor: "bg-blue-500"
    },
    support: {
        label: "Support",
        icon: "Headphones",
        color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
        bgColor: "bg-rose-500"
    },
    ecommerce: {
        label: "E-commerce",
        icon: "ShoppingCart",
        color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
        bgColor: "bg-orange-500"
    },
    hr: {
        label: "HR & People",
        icon: "Users",
        color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
        bgColor: "bg-indigo-500"
    },
    finance: {
        label: "Finance & Legal",
        icon: "DollarSign",
        color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
        bgColor: "bg-teal-500"
    },
    saas: {
        label: "SaaS",
        icon: "Cloud",
        color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
        bgColor: "bg-cyan-500"
    },
    healthcare: {
        label: "Healthcare",
        icon: "Heart",
        color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
        bgColor: "bg-pink-500"
    }
};
