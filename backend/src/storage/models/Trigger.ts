/**
 * Workflow Trigger Models
 * Represents different trigger types that can initiate workflow execution
 */

import type { JsonValue, JsonSchema } from "@flowmaestro/shared";

export type TriggerType = "schedule" | "webhook" | "event" | "manual";

/**
 * Schedule trigger configuration (cron-based)
 */
export interface ScheduleTriggerConfig {
    cronExpression: string;
    timezone?: string;
    enabled?: boolean;
    description?: string;
}

/**
 * Webhook trigger configuration
 */
export interface WebhookTriggerConfig {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "ANY";
    authType?: "none" | "api_key" | "hmac" | "bearer";
    requireSignature?: boolean;
    allowedOrigins?: string[];
    responseFormat?: "json" | "text";
    customHeaders?: Record<string, string>;
}

/**
 * Event trigger configuration
 */
export interface EventTriggerConfig {
    eventType: string;
    filters?: Record<string, JsonValue>;
    source?: string;
}

/**
 * Manual trigger configuration
 */
export interface ManualTriggerConfig {
    requireInputs?: boolean;
    inputSchema?: JsonSchema;
    inputs?: Record<string, JsonValue>; // Actual input values for the trigger
    description?: string;
}

/**
 * Union type for all trigger configurations
 */
export type TriggerConfig =
    | ScheduleTriggerConfig
    | WebhookTriggerConfig
    | EventTriggerConfig
    | ManualTriggerConfig;

/**
 * Workflow Trigger Model
 */
export interface WorkflowTrigger {
    id: string;
    workflow_id: string;
    name: string;
    trigger_type: TriggerType;
    config: TriggerConfig;
    enabled: boolean;

    // Scheduling metadata
    last_triggered_at: Date | null;
    next_scheduled_at: Date | null;
    trigger_count: number;

    // Temporal workflow ID for scheduled triggers
    temporal_schedule_id: string | null;

    // Webhook authentication
    webhook_secret: string | null;

    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

/**
 * Create Trigger Input
 */
export interface CreateTriggerInput {
    workflow_id: string;
    name: string;
    trigger_type: TriggerType;
    config: TriggerConfig;
    enabled?: boolean;
}

/**
 * Update Trigger Input
 */
export interface UpdateTriggerInput {
    name?: string;
    config?: TriggerConfig;
    enabled?: boolean;
    last_triggered_at?: Date;
    next_scheduled_at?: Date;
    temporal_schedule_id?: string;
}

/**
 * Trigger Execution Model
 */
export interface TriggerExecution {
    id: string;
    trigger_id: string;
    execution_id: string;
    trigger_payload: Record<string, JsonValue> | null;
    created_at: Date;
}

/**
 * Create Trigger Execution Input
 */
export interface CreateTriggerExecutionInput {
    trigger_id: string;
    execution_id: string;
    trigger_payload?: Record<string, JsonValue>;
}

/**
 * Webhook Log Model
 */
export interface WebhookLog {
    id: string;
    trigger_id: string | null;
    workflow_id: string | null;

    // Request details
    request_method: string;
    request_path: string | null;
    request_headers: Record<string, JsonValue> | null;
    request_body: Record<string, JsonValue> | null;
    request_query: Record<string, JsonValue> | null;

    // Response details
    response_status: number | null;
    response_body: Record<string, JsonValue> | null;
    error: string | null;

    // Execution tracking
    execution_id: string | null;

    // Metadata
    ip_address: string | null;
    user_agent: string | null;
    processing_time_ms: number | null;

    created_at: Date;
}

/**
 * Create Webhook Log Input
 */
export interface CreateWebhookLogInput {
    trigger_id?: string;
    workflow_id?: string;
    request_method: string;
    request_path?: string;
    request_headers?: Record<string, JsonValue>;
    request_body?: Record<string, JsonValue>;
    request_query?: Record<string, JsonValue>;
    response_status?: number;
    response_body?: Record<string, JsonValue>;
    error?: string;
    execution_id?: string;
    ip_address?: string;
    user_agent?: string;
    processing_time_ms?: number;
}
