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
    "healthcare",
    "multimodal-ai",
    "knowledge-research",
    "document-processing",
    "data-analytics",
    "voice-audio",
    "advanced-logic"
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

// Category metadata for display - using CSS classes defined in App.css
// The color classes (template-badge-*) handle both light and dark mode automatically
export const TEMPLATE_CATEGORY_META: Record<
    TemplateCategory,
    { label: string; icon: string; color: string; bgColor: string }
> = {
    marketing: {
        label: "Marketing",
        icon: "Megaphone",
        color: "template-badge-marketing",
        bgColor: "bg-violet-500"
    },
    sales: {
        label: "Sales",
        icon: "TrendingUp",
        color: "template-badge-sales",
        bgColor: "bg-emerald-500"
    },
    operations: {
        label: "Operations",
        icon: "Settings",
        color: "template-badge-operations",
        bgColor: "bg-amber-500"
    },
    engineering: {
        label: "Engineering",
        icon: "Code",
        color: "template-badge-engineering",
        bgColor: "bg-blue-500"
    },
    support: {
        label: "Support",
        icon: "Headphones",
        color: "template-badge-support",
        bgColor: "bg-rose-500"
    },
    ecommerce: {
        label: "E-commerce",
        icon: "ShoppingCart",
        color: "template-badge-ecommerce",
        bgColor: "bg-orange-500"
    },
    hr: {
        label: "HR & People",
        icon: "Users",
        color: "template-badge-hr",
        bgColor: "bg-indigo-500"
    },
    finance: {
        label: "Finance & Legal",
        icon: "DollarSign",
        color: "template-badge-finance",
        bgColor: "bg-teal-500"
    },
    saas: {
        label: "SaaS",
        icon: "Cloud",
        color: "template-badge-saas",
        bgColor: "bg-cyan-500"
    },
    healthcare: {
        label: "Healthcare",
        icon: "Heart",
        color: "template-badge-healthcare",
        bgColor: "bg-pink-500"
    },
    "multimodal-ai": {
        label: "Multimodal AI",
        icon: "Sparkles",
        color: "template-badge-multimodal-ai",
        bgColor: "bg-purple-500"
    },
    "knowledge-research": {
        label: "Knowledge & Research",
        icon: "BookOpen",
        color: "template-badge-knowledge-research",
        bgColor: "bg-sky-500"
    },
    "document-processing": {
        label: "Document Processing",
        icon: "FileText",
        color: "template-badge-document-processing",
        bgColor: "bg-slate-500"
    },
    "data-analytics": {
        label: "Data & Analytics",
        icon: "BarChart3",
        color: "template-badge-data-analytics",
        bgColor: "bg-lime-500"
    },
    "voice-audio": {
        label: "Voice & Audio",
        icon: "Mic",
        color: "template-badge-voice-audio",
        bgColor: "bg-fuchsia-500"
    },
    "advanced-logic": {
        label: "Advanced Logic",
        icon: "GitBranch",
        color: "template-badge-advanced-logic",
        bgColor: "bg-stone-500"
    }
};
