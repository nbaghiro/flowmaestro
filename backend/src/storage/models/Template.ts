import { WorkflowDefinition } from "@flowmaestro/shared";

export const TEMPLATE_CATEGORIES = [
    "marketing",
    "sales",
    "operations",
    "engineering",
    "support",
    "ecommerce",
    "saas",
    "healthcare"
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const TEMPLATE_STATUSES = ["active", "draft", "deprecated"] as const;

export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

export interface TemplateModel {
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
    sort_order: number;
    required_integrations: string[];
    version: string;
    status: TemplateStatus;
    created_at: Date;
    updated_at: Date;
    published_at: Date | null;
}

export type TemplateSortBy = "default" | "complexity" | "popularity" | "newest";

export interface TemplateListOptions {
    category?: TemplateCategory;
    tags?: string[];
    featured?: boolean;
    search?: string;
    status?: TemplateStatus;
    sortBy?: TemplateSortBy;
    limit?: number;
    offset?: number;
}

export interface TemplateListResult {
    templates: TemplateModel[];
    total: number;
}

export interface CategoryCount {
    category: TemplateCategory;
    count: number;
}

export interface CreateTemplateInput {
    name: string;
    description?: string;
    definition: WorkflowDefinition;
    category: TemplateCategory;
    tags?: string[];
    icon?: string;
    color?: string;
    preview_image_url?: string;
    author_name?: string;
    author_avatar_url?: string;
    featured?: boolean;
    sort_order?: number;
    required_integrations?: string[];
    version?: string;
    status?: TemplateStatus;
}

export interface UpdateTemplateInput {
    name?: string;
    description?: string;
    definition?: WorkflowDefinition;
    category?: TemplateCategory;
    tags?: string[];
    icon?: string;
    color?: string;
    preview_image_url?: string;
    author_name?: string;
    author_avatar_url?: string;
    featured?: boolean;
    sort_order?: number;
    required_integrations?: string[];
    version?: string;
    status?: TemplateStatus;
}

// Category metadata for display
export const TEMPLATE_CATEGORY_META: Record<
    TemplateCategory,
    { label: string; icon: string; color: string }
> = {
    marketing: {
        label: "Marketing",
        icon: "Megaphone",
        color: "bg-pink-100 text-pink-800"
    },
    sales: {
        label: "Sales",
        icon: "TrendingUp",
        color: "bg-green-100 text-green-800"
    },
    operations: {
        label: "Operations",
        icon: "Settings",
        color: "bg-orange-100 text-orange-800"
    },
    engineering: {
        label: "Engineering",
        icon: "Code",
        color: "bg-blue-100 text-blue-800"
    },
    support: {
        label: "Support",
        icon: "Headphones",
        color: "bg-purple-100 text-purple-800"
    },
    ecommerce: {
        label: "E-commerce",
        icon: "ShoppingCart",
        color: "bg-amber-100 text-amber-800"
    },
    saas: {
        label: "SaaS",
        icon: "Cloud",
        color: "bg-cyan-100 text-cyan-800"
    },
    healthcare: {
        label: "Healthcare",
        icon: "Heart",
        color: "bg-red-100 text-red-800"
    }
};
