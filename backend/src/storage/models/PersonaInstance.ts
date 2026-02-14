import type {
    PersonaCategory,
    PersonaStructuredInputs,
    PersonaInstanceProgress
} from "@flowmaestro/shared";

/**
 * Status of a persona instance
 */
export type PersonaInstanceStatus =
    | "initializing"
    | "clarifying"
    | "running"
    | "waiting_approval"
    | "completed"
    | "cancelled"
    | "failed"
    | "timeout";

/**
 * Reason for instance completion
 */
export type PersonaInstanceCompletionReason =
    | "success"
    | "max_duration"
    | "max_cost"
    | "cancelled"
    | "failed"
    | "user_completed";

/**
 * E2B Sandbox state
 */
export type SandboxState = "creating" | "running" | "paused" | "killed";

/**
 * Notification configuration for a persona instance
 */
export interface PersonaNotificationConfig {
    on_approval_needed: boolean;
    on_completion: boolean;
    slack_channel_id: string | null;
}

/**
 * Additional context that can be provided when launching a persona task
 */
export interface PersonaAdditionalContext {
    files?: string[];
    knowledge_bases?: string[];
    [key: string]: string[] | string | number | boolean | undefined;
}

/**
 * User-initiated persona task instance model
 */
export interface PersonaInstanceModel {
    id: string;

    // Relationships
    persona_definition_id: string;
    user_id: string;
    workspace_id: string;

    // Task Definition
    task_title: string | null;
    task_description: string | null; // Now optional with structured_inputs
    additional_context: PersonaAdditionalContext;

    // Structured Inputs (v2)
    structured_inputs: PersonaStructuredInputs;

    // Execution Tracking
    thread_id: string | null;
    execution_id: string | null;

    // Status
    status: PersonaInstanceStatus;

    // Configuration
    max_duration_hours: number | null;
    max_cost_credits: number | null;

    // Progress Tracking (v2)
    progress: PersonaInstanceProgress | null;
    started_at: Date | null;
    completed_at: Date | null;
    duration_seconds: number | null;
    accumulated_cost_credits: number;
    iteration_count: number;

    // Completion
    completion_reason: PersonaInstanceCompletionReason | null;

    // Notifications
    notification_config: PersonaNotificationConfig;

    // Sandbox Tracking
    sandbox_id: string | null;
    sandbox_state: SandboxState | null;

    // Template Tracking
    template_id: string | null;
    template_variables: Record<string, string | number | boolean | string[]>;

    // Continuation Tracking
    parent_instance_id: string | null;
    continuation_count: number;

    // Clarification Tracking
    clarification_complete: boolean;
    clarification_exchange_count: number;
    clarification_max_exchanges: number;
    clarification_skipped: boolean;

    // Approval Tracking
    pending_approval_id: string | null;

    // Timestamps
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

/**
 * Summary of a persona instance for list/dashboard views
 */
export interface PersonaInstanceSummary {
    id: string;
    persona_definition_id: string;
    task_title: string | null;
    task_description: string | null;
    status: PersonaInstanceStatus;
    // Progress tracking (v2)
    progress: PersonaInstanceProgress | null;
    started_at: Date | null;
    completed_at: Date | null;
    duration_seconds: number | null;
    accumulated_cost_credits: number;
    iteration_count: number;
    updated_at: Date;
    // Persona info for display
    persona: {
        name: string;
        slug: string;
        title: string;
        avatar_url: string | null;
        category: PersonaCategory;
    } | null;
    // For dashboard - include pending approval info if applicable
    pending_approval?: PersonaPendingApproval | null;
    // For completed - deliverable count
    deliverable_count?: number;
}

/**
 * Pending approval information for dashboard display
 */
export interface PersonaPendingApproval {
    approval_id: string;
    action_description: string;
    estimated_cost: number | null;
    requested_at: Date;
}

/**
 * Input for creating a new persona instance
 */
export interface CreatePersonaInstanceInput {
    persona_definition_id: string;
    user_id: string;
    workspace_id: string;
    structured_inputs?: PersonaStructuredInputs;
    task_description?: string; // Now optional with structured_inputs
    task_title?: string;
    additional_context?: PersonaAdditionalContext;
    max_duration_hours?: number;
    max_cost_credits?: number;
    notification_config?: Partial<PersonaNotificationConfig>;
    // Template tracking
    template_id?: string;
    template_variables?: Record<string, string | number | boolean | string[]>;
    // Continuation tracking
    parent_instance_id?: string;
    continuation_count?: number;
    // Clarification tracking
    clarification_max_exchanges?: number;
    skip_clarification?: boolean;
}

/**
 * Input for updating a persona instance
 */
export interface UpdatePersonaInstanceInput {
    task_title?: string;
    task_description?: string;
    additional_context?: PersonaAdditionalContext;
    structured_inputs?: PersonaStructuredInputs;
    thread_id?: string;
    execution_id?: string;
    status?: PersonaInstanceStatus;
    max_duration_hours?: number;
    max_cost_credits?: number;
    // Progress tracking (v2)
    progress?: PersonaInstanceProgress;
    started_at?: Date;
    completed_at?: Date;
    duration_seconds?: number;
    accumulated_cost_credits?: number;
    iteration_count?: number;
    completion_reason?: PersonaInstanceCompletionReason;
    notification_config?: PersonaNotificationConfig;
    sandbox_id?: string;
    sandbox_state?: SandboxState;
    // Clarification tracking
    clarification_complete?: boolean;
    clarification_exchange_count?: number;
    clarification_max_exchanges?: number;
    clarification_skipped?: boolean;
    // Approval tracking
    pending_approval_id?: string | null;
}

/**
 * Query options for listing persona instances
 */
export interface PersonaInstanceQueryOptions {
    status?: PersonaInstanceStatus | PersonaInstanceStatus[];
    persona_definition_id?: string;
    limit?: number;
    offset?: number;
}

/**
 * Dashboard response structure
 */
export interface PersonaInstanceDashboard {
    needs_attention: PersonaInstanceSummary[];
    running: PersonaInstanceSummary[];
    recent_completed: PersonaInstanceSummary[];
}
