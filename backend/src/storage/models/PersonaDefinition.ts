import type { JsonObject, AgentTemplateTool } from "@flowmaestro/shared";

/**
 * Categories for organizing personas by domain
 */
export type PersonaCategory =
    | "research"
    | "content"
    | "development"
    | "data"
    | "operations"
    | "business";

/**
 * Status of a persona definition
 */
export type PersonaStatus = "active" | "beta" | "deprecated";

/**
 * Autonomy level for persona execution
 */
export type PersonaAutonomyLevel = "full_auto" | "approve_high_risk" | "approve_all";

/**
 * LLM provider types (matches Agent model)
 */
export type LLMProvider = "openai" | "anthropic" | "google" | "cohere" | "huggingface";

/**
 * Pre-built persona definition model
 */
export interface PersonaDefinitionModel {
    id: string;

    // Identity
    name: string;
    slug: string;
    description: string;
    avatar_url: string | null;

    // Categorization
    category: PersonaCategory;
    tags: string[];

    // Expertise
    expertise_areas: string[];
    example_tasks: string[];
    typical_deliverables: string[];

    // Agent Configuration
    system_prompt: string;
    model: string;
    provider: LLMProvider;
    temperature: number;
    max_tokens: number;

    // Default Tools
    default_tools: AgentTemplateTool[];

    // Long-Running Config Defaults
    default_max_duration_hours: number;
    default_max_cost_credits: number;
    autonomy_level: PersonaAutonomyLevel;
    tool_risk_overrides: JsonObject;

    // Metadata
    featured: boolean;
    sort_order: number;
    status: PersonaStatus;

    // Timestamps
    created_at: Date;
    updated_at: Date;
}

/**
 * Summary of a persona definition for list views
 */
export interface PersonaDefinitionSummary {
    id: string;
    name: string;
    slug: string;
    description: string;
    avatar_url: string | null;
    category: PersonaCategory;
    tags: string[];
    expertise_areas: string[];
    example_tasks: string[];
    typical_deliverables: string[];
    default_tools: AgentTemplateTool[];
    featured: boolean;
    status: PersonaStatus;
}

/**
 * Input for creating a persona definition (used for seeding)
 */
export interface CreatePersonaDefinitionInput {
    name: string;
    slug: string;
    description: string;
    avatar_url?: string;
    category: PersonaCategory;
    tags?: string[];
    expertise_areas: string[];
    example_tasks: string[];
    typical_deliverables: string[];
    system_prompt: string;
    model?: string;
    provider?: LLMProvider;
    temperature?: number;
    max_tokens?: number;
    default_tools?: AgentTemplateTool[];
    default_max_duration_hours?: number;
    default_max_cost_credits?: number;
    autonomy_level?: PersonaAutonomyLevel;
    tool_risk_overrides?: JsonObject;
    featured?: boolean;
    sort_order?: number;
    status?: PersonaStatus;
}

/**
 * Input for updating a persona definition (used for maintenance)
 */
export interface UpdatePersonaDefinitionInput {
    name?: string;
    description?: string;
    avatar_url?: string;
    category?: PersonaCategory;
    tags?: string[];
    expertise_areas?: string[];
    example_tasks?: string[];
    typical_deliverables?: string[];
    system_prompt?: string;
    model?: string;
    provider?: LLMProvider;
    temperature?: number;
    max_tokens?: number;
    default_tools?: AgentTemplateTool[];
    default_max_duration_hours?: number;
    default_max_cost_credits?: number;
    autonomy_level?: PersonaAutonomyLevel;
    tool_risk_overrides?: JsonObject;
    featured?: boolean;
    sort_order?: number;
    status?: PersonaStatus;
}

/**
 * Query options for listing persona definitions
 */
export interface PersonaDefinitionQueryOptions {
    category?: PersonaCategory;
    featured?: boolean;
    status?: PersonaStatus;
    search?: string;
    limit?: number;
    offset?: number;
}
