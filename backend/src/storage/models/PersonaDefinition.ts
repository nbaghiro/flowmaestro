import type {
    JsonObject,
    AgentTemplateTool,
    PersonaInputField,
    PersonaDeliverableSpec,
    PersonaEstimatedDuration
} from "@flowmaestro/shared";
import type { PersonaConnectionRequirement } from "./PersonaInstanceConnection";

/**
 * Categories for organizing personas by domain
 */
export type PersonaCategory =
    | "research"
    | "content"
    | "development"
    | "data"
    | "operations"
    | "business"
    | "proposals";

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
    title: string; // Short title like "Competitive Intel Analyst"
    description: string;
    avatar_url: string | null;

    // Categorization
    category: PersonaCategory;
    tags: string[];

    // What they specialize in (one-line)
    specialty: string;

    // Expertise
    expertise_areas: string[];
    example_tasks: string[];
    typical_deliverables: string[]; // Legacy field for backwards compatibility

    // Structured Inputs (v2)
    input_fields: PersonaInputField[];

    // Guaranteed Outputs (v2)
    deliverables: PersonaDeliverableSpec[];

    // Standard Operating Procedure (v2)
    sop_steps: string[];

    // Estimates (v2)
    estimated_duration: PersonaEstimatedDuration;
    estimated_cost_credits: number;

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

    // Connection Requirements
    connection_requirements: PersonaConnectionRequirement[];

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
    title: string;
    description: string;
    avatar_url: string | null;
    category: PersonaCategory;
    tags: string[];
    specialty: string;
    expertise_areas: string[];
    example_tasks: string[];
    typical_deliverables: string[]; // Legacy
    input_fields: PersonaInputField[];
    deliverables: PersonaDeliverableSpec[];
    estimated_duration: PersonaEstimatedDuration;
    estimated_cost_credits: number;
    default_tools: AgentTemplateTool[];
    connection_requirements: PersonaConnectionRequirement[];
    featured: boolean;
    status: PersonaStatus;
}

/**
 * Input for creating a persona definition (used for seeding)
 */
export interface CreatePersonaDefinitionInput {
    name: string;
    slug: string;
    title: string;
    description: string;
    avatar_url?: string;
    category: PersonaCategory;
    tags?: string[];
    specialty: string;
    expertise_areas: string[];
    example_tasks: string[];
    typical_deliverables?: string[]; // Legacy, optional
    input_fields: PersonaInputField[];
    deliverables: PersonaDeliverableSpec[];
    sop_steps: string[];
    estimated_duration?: PersonaEstimatedDuration;
    estimated_cost_credits?: number;
    // Agent configuration
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
    connection_requirements?: PersonaConnectionRequirement[];
    featured?: boolean;
    sort_order?: number;
    status?: PersonaStatus;
}

/**
 * Input for updating a persona definition (used for maintenance)
 */
export interface UpdatePersonaDefinitionInput {
    name?: string;
    title?: string;
    description?: string;
    avatar_url?: string;
    category?: PersonaCategory;
    tags?: string[];
    specialty?: string;
    expertise_areas?: string[];
    example_tasks?: string[];
    typical_deliverables?: string[];
    input_fields?: PersonaInputField[];
    deliverables?: PersonaDeliverableSpec[];
    sop_steps?: string[];
    estimated_duration?: PersonaEstimatedDuration;
    estimated_cost_credits?: number;
    // Agent configuration
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
    connection_requirements?: PersonaConnectionRequirement[];
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
