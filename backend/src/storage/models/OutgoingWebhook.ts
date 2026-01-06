import type { JsonValue } from "@flowmaestro/shared";

/**
 * Webhook event types that users can subscribe to.
 */
export type WebhookEventType =
    | "execution.started"
    | "execution.completed"
    | "execution.failed"
    | "execution.cancelled"
    | "thread.message.created"
    | "thread.message.completed"
    | "thread.message.failed"
    | "agent.execution.started"
    | "agent.execution.completed"
    | "agent.execution.failed";

/**
 * All available webhook event types.
 */
export const WEBHOOK_EVENT_TYPES: WebhookEventType[] = [
    "execution.started",
    "execution.completed",
    "execution.failed",
    "execution.cancelled",
    "thread.message.created",
    "thread.message.completed",
    "thread.message.failed",
    "agent.execution.started",
    "agent.execution.completed",
    "agent.execution.failed"
];

/**
 * Outgoing webhook model as stored in the database.
 */
export interface OutgoingWebhookModel {
    id: string;
    user_id: string;
    name: string;
    url: string;
    secret: string;
    events: WebhookEventType[];
    headers: Record<string, string> | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

/**
 * Input for creating a new outgoing webhook.
 */
export interface CreateOutgoingWebhookInput {
    user_id: string;
    name: string;
    url: string;
    events: WebhookEventType[];
    headers?: Record<string, string>;
}

/**
 * Input for updating an existing outgoing webhook.
 */
export interface UpdateOutgoingWebhookInput {
    name?: string;
    url?: string;
    events?: WebhookEventType[];
    headers?: Record<string, string> | null;
    is_active?: boolean;
}

/**
 * Webhook delivery status.
 */
export type WebhookDeliveryStatus = "pending" | "success" | "failed" | "retrying";

/**
 * Webhook delivery model as stored in the database.
 */
export interface WebhookDeliveryModel {
    id: string;
    webhook_id: string;
    event_type: WebhookEventType;
    payload: Record<string, JsonValue>;
    status: WebhookDeliveryStatus;
    attempts: number;
    max_attempts: number;
    last_attempt_at: Date | null;
    next_retry_at: Date | null;
    response_status: number | null;
    response_body: string | null;
    error_message: string | null;
    created_at: Date;
}

/**
 * Input for creating a new webhook delivery.
 */
export interface CreateWebhookDeliveryInput {
    webhook_id: string;
    event_type: WebhookEventType;
    payload: Record<string, JsonValue>;
}

/**
 * Webhook payload structure sent to customer endpoints.
 */
export interface WebhookPayload<T = Record<string, JsonValue>> {
    id: string;
    event: WebhookEventType;
    created_at: string;
    data: T;
}

/**
 * Webhook list item for API responses.
 */
export interface OutgoingWebhookListItem {
    id: string;
    name: string;
    url: string;
    events: WebhookEventType[];
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
