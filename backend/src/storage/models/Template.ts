import {
    WorkflowDefinition,
    TEMPLATE_CATEGORIES,
    type TemplateCategory
} from "@flowmaestro/shared";

// Re-export for use in schemas
export { TEMPLATE_CATEGORIES };
export type { TemplateCategory };

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

// Category metadata is available from @flowmaestro/shared as TEMPLATE_CATEGORY_META
