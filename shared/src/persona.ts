import type { AgentProvider, AgentTemplateTool } from "./agent-template";
import type { JsonObject } from "./types";

// ============================================================================
// PERSONA DEFINITION TYPES
// ============================================================================

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

// ============================================================================
// STRUCTURED INPUT/OUTPUT TYPES
// ============================================================================

/**
 * Types of input fields for structured task briefs
 */
export type InputFieldType =
    | "text"
    | "textarea"
    | "select"
    | "multiselect"
    | "tags"
    | "number"
    | "checkbox";

/**
 * Option for select/multiselect fields
 */
export interface InputFieldOption {
    value: string;
    label: string;
}

/**
 * Structured input field for task configuration
 */
export interface PersonaInputField {
    name: string;
    label: string;
    type: InputFieldType;
    required: boolean;
    placeholder?: string;
    default_value?: string | number | boolean | string[];
    options?: InputFieldOption[];
    help_text?: string;
    validation?: {
        min?: number;
        max?: number;
        min_length?: number;
        max_length?: number;
        pattern?: string;
    };
}

/**
 * Types of deliverables a persona can produce
 */
export type DeliverableType = "markdown" | "csv" | "json" | "pdf" | "code" | "image" | "html";

/**
 * Specification for a deliverable the persona guarantees to produce
 */
export interface PersonaDeliverableSpec {
    name: string;
    description: string;
    type: DeliverableType;
    guaranteed: boolean;
    file_extension?: string;
}

/**
 * Estimated duration range for task completion
 */
export interface PersonaEstimatedDuration {
    min_minutes: number;
    max_minutes: number;
}

/**
 * Connection requirement for a persona definition
 */
export interface PersonaConnectionRequirement {
    provider: string; // 'github', 'slack', 'google', etc.
    required: boolean; // Must be connected to launch
    reason: string; // Shown to user: "For creating PRs"
    suggested_scopes: string[]; // Recommended permission scopes
}

/**
 * Pre-built persona definition
 */
export interface PersonaDefinition {
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

    // Structured Inputs
    input_fields: PersonaInputField[];

    // Guaranteed Outputs
    deliverables: PersonaDeliverableSpec[];

    // Standard Operating Procedure
    sop_steps: string[];

    // Estimates
    estimated_duration: PersonaEstimatedDuration;
    estimated_cost_credits: number;

    // Legacy field
    typical_deliverables: string[];

    // Agent Configuration
    system_prompt: string;
    model: string;
    provider: AgentProvider;
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
    created_at: string;
    updated_at: string;
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
    input_fields: PersonaInputField[];
    deliverables: PersonaDeliverableSpec[];
    estimated_duration: PersonaEstimatedDuration;
    estimated_cost_credits: number;
    // Legacy
    typical_deliverables: string[];
    default_tools: AgentTemplateTool[];
    connection_requirements: PersonaConnectionRequirement[];
    featured: boolean;
    status: PersonaStatus;
}

/**
 * Query parameters for listing persona definitions
 */
export interface PersonaDefinitionListParams {
    category?: PersonaCategory;
    featured?: boolean;
    status?: PersonaStatus;
    search?: string;
    limit?: number;
    offset?: number;
}

/**
 * Response for listing persona definitions
 */
export interface PersonaDefinitionListResponse {
    personas: PersonaDefinitionSummary[];
    total: number;
}

// ============================================================================
// PERSONA INSTANCE CONNECTION TYPES
// ============================================================================

/**
 * Connection granted to a persona instance
 */
export interface PersonaInstanceConnection {
    id: string;
    instance_id: string;
    connection_id: string;
    granted_scopes: string[];
    created_at: string;
    connection?: {
        id: string;
        name: string;
        provider: string;
        connection_method: string;
    };
}

// ============================================================================
// PERSONA INSTANCE TYPES
// ============================================================================

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
 * Message in a persona instance conversation
 */
export interface PersonaInstanceMessage {
    id?: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp?: string;
    metadata?: {
        step_index?: number;
        tool_used?: string;
        type?: "info" | "progress" | "finding" | "warning" | "error";
    };
}

/**
 * Status of an individual SOP step
 */
export type ProgressStepStatus = "pending" | "in_progress" | "completed" | "skipped";

/**
 * Individual step progress within an SOP
 */
export interface PersonaProgressStep {
    index: number;
    title: string;
    status: ProgressStepStatus;
    started_at: string | null;
    completed_at: string | null;
}

/**
 * Progress tracking for a running persona instance
 */
export interface PersonaInstanceProgress {
    current_step: number;
    total_steps: number;
    current_step_name: string;
    percentage: number;
    message?: string;
    // Detailed step tracking (maps to persona's sop_steps)
    steps?: PersonaProgressStep[];
}

/**
 * Activity log entry for a persona instance
 */
export interface PersonaActivityEntry {
    id: string;
    timestamp: string;
    type: "info" | "progress" | "finding" | "warning" | "error";
    message: string;
    step_index?: number;
}

/**
 * Deliverable produced by a persona instance
 */
export interface PersonaInstanceDeliverable {
    id: string;
    instance_id: string;
    name: string;
    description: string | null;
    type: DeliverableType;
    content: string | null;
    file_url: string | null;
    file_size_bytes: number | null;
    file_extension: string | null;
    preview: string | null;
    created_at: string;
}

/**
 * Summary of a deliverable (without full content)
 */
export interface PersonaInstanceDeliverableSummary {
    id: string;
    name: string;
    description: string | null;
    type: DeliverableType;
    file_size_bytes: number | null;
    file_extension: string | null;
    preview: string | null;
    created_at: string;
}

/**
 * Structured inputs provided when launching a persona task
 */
export interface PersonaStructuredInputs {
    [key: string]: string | number | boolean | string[] | undefined;
}

/**
 * User-initiated persona task instance
 */
export interface PersonaInstance {
    id: string;

    // Relationships
    persona_definition_id: string;
    user_id: string;
    workspace_id: string;

    // Task Definition
    task_title: string | null;
    task_description: string;
    additional_context: PersonaAdditionalContext;

    // Structured Inputs
    structured_inputs: PersonaStructuredInputs;

    // Execution Tracking
    thread_id: string | null;
    execution_id: string | null;

    // Status
    status: PersonaInstanceStatus;

    // Configuration
    max_duration_hours: number | null;
    max_cost_credits: number | null;

    // Progress Tracking
    progress: PersonaInstanceProgress | null;
    started_at: string | null;
    completed_at: string | null;
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

    // Continuation Tracking
    parent_instance_id: string | null;
    continuation_count: number;

    // Clarification Tracking
    clarification_complete: boolean;
    clarification_exchange_count: number;
    clarification_max_exchanges: number;
    clarification_skipped: boolean;

    // Timestamps
    created_at: string;
    updated_at: string;
    deleted_at: string | null;

    // Conversation (included in detail view)
    messages?: PersonaInstanceMessage[];

    // Deliverables (included in detail view)
    deliverables?: PersonaInstanceDeliverable[];

    // Activity log (included in detail view)
    activity?: PersonaActivityEntry[];
}

/**
 * Summary of a persona instance for list/dashboard views
 */
export interface PersonaInstanceSummary {
    id: string;
    persona_definition_id: string;
    task_title: string | null;
    task_description: string;
    status: PersonaInstanceStatus;
    // Progress tracking
    progress: PersonaInstanceProgress | null;
    started_at: string | null;
    completed_at: string | null;
    duration_seconds: number | null;
    accumulated_cost_credits: number;
    iteration_count: number;
    updated_at: string;
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
    requested_at: string;
}

/**
 * Request to create a new persona instance
 */
export interface CreatePersonaInstanceRequest {
    persona_slug: string;
    // Structured inputs based on persona's input_fields
    structured_inputs?: PersonaStructuredInputs;
    // Free-form description
    task_description?: string;
    task_title?: string;
    additional_context?: PersonaAdditionalContext;
    max_duration_hours?: number;
    max_cost_credits?: number;
    notification_config?: Partial<PersonaNotificationConfig>;
    // Template support
    template_id?: string;
    template_variables?: Record<string, string | number | boolean | string[]>;
    // Clarification control
    skip_clarification?: boolean;
}

/**
 * Request to send a message to a running persona instance
 */
export interface SendPersonaInstanceMessageRequest {
    content: string;
}

/**
 * Query parameters for listing persona instances
 */
export interface PersonaInstanceListParams {
    status?: PersonaInstanceStatus | PersonaInstanceStatus[];
    persona_definition_id?: string;
    limit?: number;
    offset?: number;
}

/**
 * Response for listing persona instances
 */
export interface PersonaInstanceListResponse {
    instances: PersonaInstanceSummary[];
    total: number;
}

/**
 * Dashboard-optimized response
 */
export interface PersonaInstanceDashboardResponse {
    needs_attention: PersonaInstanceSummary[];
    running: PersonaInstanceSummary[];
    recent_completed: PersonaInstanceSummary[];
}

// ============================================================================
// WEBSOCKET EVENT TYPES FOR PERSONAS
// ============================================================================

/**
 * Persona-specific WebSocket event types
 */
export type PersonaWebSocketEventType =
    | "persona:instance:started"
    | "persona:instance:status_changed"
    | "persona:instance:progress"
    | "persona:instance:approval_needed"
    | "persona:instance:completed"
    | "persona:instance:failed"
    | "persona:instance:message";

/**
 * Base persona WebSocket event
 */
export interface PersonaWebSocketEventBase {
    type: PersonaWebSocketEventType;
    timestamp: number;
    instance_id: string;
}

/**
 * Persona instance started event
 */
export interface PersonaInstanceStartedEvent extends PersonaWebSocketEventBase {
    type: "persona:instance:started";
    persona_name: string;
    task_title: string | null;
}

/**
 * Persona instance status changed event
 */
export interface PersonaInstanceStatusChangedEvent extends PersonaWebSocketEventBase {
    type: "persona:instance:status_changed";
    old_status: PersonaInstanceStatus;
    new_status: PersonaInstanceStatus;
}

/**
 * Persona instance progress event
 */
export interface PersonaInstanceProgressEvent extends PersonaWebSocketEventBase {
    type: "persona:instance:progress";
    progress_message: string;
    iteration_count: number;
    accumulated_cost: number;
}

/**
 * Persona instance approval needed event
 */
export interface PersonaInstanceApprovalNeededEvent extends PersonaWebSocketEventBase {
    type: "persona:instance:approval_needed";
    approval: PersonaPendingApproval;
}

/**
 * Persona instance completed event
 */
export interface PersonaInstanceCompletedEvent extends PersonaWebSocketEventBase {
    type: "persona:instance:completed";
    completion_reason: PersonaInstanceCompletionReason;
    deliverable_count: number;
    duration_seconds: number;
    total_cost: number;
}

/**
 * Persona instance failed event
 */
export interface PersonaInstanceFailedEvent extends PersonaWebSocketEventBase {
    type: "persona:instance:failed";
    error: string;
}

/**
 * Persona instance message event
 */
export interface PersonaInstanceMessageEvent extends PersonaWebSocketEventBase {
    type: "persona:instance:message";
    message: {
        role: "user" | "assistant";
        content: string;
    };
}

/**
 * Union type of all persona WebSocket events
 */
export type PersonaWebSocketEvent =
    | PersonaInstanceStartedEvent
    | PersonaInstanceStatusChangedEvent
    | PersonaInstanceProgressEvent
    | PersonaInstanceApprovalNeededEvent
    | PersonaInstanceCompletedEvent
    | PersonaInstanceFailedEvent
    | PersonaInstanceMessageEvent;

// ============================================================================
// PERSONA TASK TEMPLATE TYPES
// ============================================================================

/**
 * Variable definition for task templates
 * Reuses the same structure as PersonaInputField for consistency
 */
export type TemplateVariable = PersonaInputField;

/**
 * Status of a task template
 */
export type TaskTemplateStatus = "active" | "beta" | "deprecated";

/**
 * Task template for a persona
 */
export interface PersonaTaskTemplate {
    id: string;
    persona_definition_id: string;

    // Template Identity
    name: string;
    description: string;
    icon: string | null;

    // Template Content
    task_template: string;
    variables: TemplateVariable[];

    // Suggested defaults
    suggested_duration_hours: number;
    suggested_max_cost: number;

    // Metadata
    sort_order: number;
    usage_count: number;
    status: TaskTemplateStatus;

    // Timestamps
    created_at: string;
    updated_at: string;
}

/**
 * Summary of a task template for list views
 */
export interface PersonaTaskTemplateSummary {
    id: string;
    name: string;
    description: string;
    icon: string | null;
    variables: TemplateVariable[];
    suggested_duration_hours: number;
    suggested_max_cost: number;
    usage_count: number;
}

/**
 * Request to generate task description from template
 */
export interface GenerateFromTemplateRequest {
    variables: Record<string, string | number | boolean | string[]>;
}

/**
 * Response from generating task description
 */
export interface GenerateFromTemplateResponse {
    task_description: string;
    suggested_duration_hours: number;
    suggested_max_cost: number;
}

/**
 * Response for listing templates
 */
export interface PersonaTaskTemplateListResponse {
    templates: PersonaTaskTemplateSummary[];
}
