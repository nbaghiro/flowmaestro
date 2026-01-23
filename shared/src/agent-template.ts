import type { TemplateCategory } from "./template";

// LLM providers supported for agents
export type AgentProvider = "openai" | "anthropic" | "google" | "cohere";

// Tool types that can be configured for an agent template
export type AgentToolType =
    | "workflow"
    | "function"
    | "knowledge_base"
    | "agent"
    | "mcp"
    | "builtin";

// Simplified tool definition for templates
// Actual Tool objects are created when the user connects their own integrations
export interface AgentTemplateTool {
    name: string;
    description: string;
    type: AgentToolType;
    provider?: string; // For function type, which integration provider (e.g., "slack", "gmail")
}

// Main agent template interface
export interface AgentTemplate {
    id: string;
    name: string;
    description: string | null;
    system_prompt: string;
    model: string;
    provider: AgentProvider;
    temperature: number;
    max_tokens: number;
    available_tools: AgentTemplateTool[];
    category: TemplateCategory;
    tags: string[];
    icon: string | null;
    color: string | null;
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

// Query parameters for listing agent templates
export interface AgentTemplateListParams {
    category?: TemplateCategory;
    tags?: string[];
    featured?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
}

// Response for listing agent templates
export interface AgentTemplateListResponse {
    items: AgentTemplate[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

// Response when copying an agent template
export interface CopyAgentTemplateResponse {
    agentId: string;
    agent: {
        id: string;
        name: string;
    };
}
