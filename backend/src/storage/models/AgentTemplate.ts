import type { AgentTemplateTool } from "@flowmaestro/shared";

export const AGENT_TEMPLATE_CATEGORIES = [
    "marketing",
    "sales",
    "operations",
    "engineering",
    "support",
    "ecommerce",
    "hr",
    "finance"
] as const;

export type AgentTemplateCategory = (typeof AGENT_TEMPLATE_CATEGORIES)[number];

export const AGENT_TEMPLATE_STATUSES = ["active", "draft", "deprecated"] as const;

export type AgentTemplateStatus = (typeof AGENT_TEMPLATE_STATUSES)[number];

export const AGENT_TEMPLATE_PROVIDERS = ["openai", "anthropic", "google", "cohere"] as const;

export type AgentTemplateProvider = (typeof AGENT_TEMPLATE_PROVIDERS)[number];

export interface AgentTemplateModel {
    id: string;
    name: string;
    description: string | null;
    system_prompt: string;
    model: string;
    provider: AgentTemplateProvider;
    temperature: number;
    max_tokens: number;
    available_tools: AgentTemplateTool[];
    category: AgentTemplateCategory;
    tags: string[];
    icon: string | null;
    color: string | null;
    author_name: string | null;
    author_avatar_url: string | null;
    view_count: number;
    use_count: number;
    featured: boolean;
    sort_order: number;
    required_integrations: string[];
    version: string;
    status: AgentTemplateStatus;
    created_at: Date;
    updated_at: Date;
    published_at: Date | null;
}

export interface AgentTemplateListOptions {
    category?: AgentTemplateCategory;
    tags?: string[];
    featured?: boolean;
    search?: string;
    status?: AgentTemplateStatus;
    limit?: number;
    offset?: number;
}

export interface AgentTemplateListResult {
    templates: AgentTemplateModel[];
    total: number;
}

export interface AgentTemplateCategoryCount {
    category: AgentTemplateCategory;
    count: number;
}

export interface CreateAgentTemplateInput {
    name: string;
    description?: string;
    system_prompt: string;
    model: string;
    provider: AgentTemplateProvider;
    temperature?: number;
    max_tokens?: number;
    available_tools?: AgentTemplateTool[];
    category: AgentTemplateCategory;
    tags?: string[];
    icon?: string;
    color?: string;
    author_name?: string;
    author_avatar_url?: string;
    featured?: boolean;
    sort_order?: number;
    required_integrations?: string[];
    version?: string;
    status?: AgentTemplateStatus;
}
