import type { PersonaInputField } from "@flowmaestro/shared";

/**
 * Status of a task template
 */
export type TaskTemplateStatus = "active" | "beta" | "deprecated";

/**
 * Task template model (database representation)
 */
export interface PersonaTaskTemplateModel {
    id: string;
    persona_definition_id: string;

    // Template Identity
    name: string;
    description: string;
    icon: string | null;

    // Template Content
    task_template: string;
    variables: PersonaInputField[];

    // Suggested defaults
    suggested_duration_hours: number;
    suggested_max_cost: number;

    // Metadata
    sort_order: number;
    usage_count: number;
    status: TaskTemplateStatus;

    // Timestamps
    created_at: Date;
    updated_at: Date;
}

/**
 * Summary of a task template for list views
 */
export interface PersonaTaskTemplateSummary {
    id: string;
    name: string;
    description: string;
    icon: string | null;
    variables: PersonaInputField[];
    suggested_duration_hours: number;
    suggested_max_cost: number;
    usage_count: number;
}

/**
 * Input for creating a new task template
 */
export interface CreatePersonaTaskTemplateInput {
    persona_definition_id: string;
    name: string;
    description: string;
    icon?: string | null;
    task_template: string;
    variables: PersonaInputField[];
    suggested_duration_hours?: number;
    suggested_max_cost?: number;
    sort_order?: number;
    status?: TaskTemplateStatus;
}

/**
 * Input for updating a task template
 */
export interface UpdatePersonaTaskTemplateInput {
    name?: string;
    description?: string;
    icon?: string | null;
    task_template?: string;
    variables?: PersonaInputField[];
    suggested_duration_hours?: number;
    suggested_max_cost?: number;
    sort_order?: number;
    status?: TaskTemplateStatus;
}

/**
 * Query options for listing templates
 */
export interface PersonaTaskTemplateQueryOptions {
    persona_definition_id?: string;
    persona_slug?: string;
    status?: TaskTemplateStatus;
    limit?: number;
    offset?: number;
}
