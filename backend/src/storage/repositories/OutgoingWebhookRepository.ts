import * as crypto from "crypto";
import type { JsonValue } from "@flowmaestro/shared";
import { db } from "../database";
import type {
    OutgoingWebhookModel,
    CreateOutgoingWebhookInput,
    UpdateOutgoingWebhookInput,
    OutgoingWebhookListItem,
    WebhookDeliveryModel,
    CreateWebhookDeliveryInput,
    WebhookEventType,
    WebhookDeliveryStatus
} from "../models/OutgoingWebhook";

interface OutgoingWebhookRow {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    url: string;
    secret: string;
    events: string[];
    headers: Record<string, string> | null;
    is_active: boolean;
    created_at: string | Date;
    updated_at: string | Date;
    deleted_at: string | Date | null;
}

interface WebhookDeliveryRow {
    id: string;
    webhook_id: string;
    event_type: string;
    payload: Record<string, JsonValue>;
    status: string;
    attempts: number;
    max_attempts: number;
    last_attempt_at: string | Date | null;
    next_retry_at: string | Date | null;
    response_status: number | null;
    response_body: string | null;
    error_message: string | null;
    created_at: string | Date;
}

export class OutgoingWebhookRepository {
    /**
     * Generate a secure webhook signing secret.
     */
    private generateSecret(): string {
        return `whsec_${crypto.randomBytes(32).toString("hex")}`;
    }

    /**
     * Create a new outgoing webhook.
     */
    async create(input: CreateOutgoingWebhookInput): Promise<OutgoingWebhookModel> {
        const secret = this.generateSecret();

        const query = `
            INSERT INTO flowmaestro.outgoing_webhooks (
                user_id, workspace_id, name, url, secret, events, headers
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const values = [
            input.user_id,
            input.workspace_id,
            input.name,
            input.url,
            secret,
            input.events,
            input.headers ? JSON.stringify(input.headers) : null
        ];

        const result = await db.query<OutgoingWebhookRow>(query, values);
        return this.mapRow(result.rows[0]);
    }

    /**
     * Find a webhook by ID.
     */
    async findById(id: string): Promise<OutgoingWebhookModel | null> {
        const query = `
            SELECT * FROM flowmaestro.outgoing_webhooks
            WHERE id = $1 AND deleted_at IS NULL
        `;

        const result = await db.query<OutgoingWebhookRow>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * Find a webhook by ID and workspace ID (for ownership verification).
     */
    async findByIdAndWorkspaceId(
        id: string,
        workspaceId: string
    ): Promise<OutgoingWebhookModel | null> {
        const query = `
            SELECT * FROM flowmaestro.outgoing_webhooks
            WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
        `;

        const result = await db.query<OutgoingWebhookRow>(query, [id, workspaceId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * @deprecated Use findByIdAndWorkspaceId instead. Kept for backward compatibility.
     */
    async findByIdAndUserId(id: string, userId: string): Promise<OutgoingWebhookModel | null> {
        const query = `
            SELECT * FROM flowmaestro.outgoing_webhooks
            WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
        `;

        const result = await db.query<OutgoingWebhookRow>(query, [id, userId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * List all webhooks for a workspace.
     */
    async findByWorkspaceId(
        workspaceId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{ webhooks: OutgoingWebhookListItem[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.outgoing_webhooks
            WHERE workspace_id = $1 AND deleted_at IS NULL
        `;

        const query = `
            SELECT * FROM flowmaestro.outgoing_webhooks
            WHERE workspace_id = $1 AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, webhooksResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, [workspaceId]),
            db.query<OutgoingWebhookRow>(query, [workspaceId, limit, offset])
        ]);

        return {
            webhooks: webhooksResult.rows.map((row) => this.mapToListItem(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * @deprecated Use findByWorkspaceId instead. Kept for backward compatibility.
     */
    async findByUserId(
        userId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{ webhooks: OutgoingWebhookListItem[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.outgoing_webhooks
            WHERE user_id = $1 AND deleted_at IS NULL
        `;

        const query = `
            SELECT * FROM flowmaestro.outgoing_webhooks
            WHERE user_id = $1 AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, webhooksResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, [userId]),
            db.query<OutgoingWebhookRow>(query, [userId, limit, offset])
        ]);

        return {
            webhooks: webhooksResult.rows.map((row) => this.mapToListItem(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * Find all active webhooks for a workspace subscribed to a specific event.
     */
    async findByWorkspaceAndEvent(
        workspaceId: string,
        event: WebhookEventType
    ): Promise<OutgoingWebhookModel[]> {
        const query = `
            SELECT * FROM flowmaestro.outgoing_webhooks
            WHERE workspace_id = $1
              AND is_active = true
              AND deleted_at IS NULL
              AND $2 = ANY(events)
        `;

        const result = await db.query<OutgoingWebhookRow>(query, [workspaceId, event]);
        return result.rows.map((row) => this.mapRow(row));
    }

    /**
     * @deprecated Use findByWorkspaceAndEvent instead. Kept for backward compatibility.
     */
    async findByUserAndEvent(
        userId: string,
        event: WebhookEventType
    ): Promise<OutgoingWebhookModel[]> {
        const query = `
            SELECT * FROM flowmaestro.outgoing_webhooks
            WHERE user_id = $1
              AND is_active = true
              AND deleted_at IS NULL
              AND $2 = ANY(events)
        `;

        const result = await db.query<OutgoingWebhookRow>(query, [userId, event]);
        return result.rows.map((row) => this.mapRow(row));
    }

    /**
     * Update a webhook by workspace.
     */
    async updateByWorkspace(
        id: string,
        workspaceId: string,
        input: UpdateOutgoingWebhookInput
    ): Promise<OutgoingWebhookModel | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }

        if (input.url !== undefined) {
            updates.push(`url = $${paramIndex++}`);
            values.push(input.url);
        }

        if (input.events !== undefined) {
            updates.push(`events = $${paramIndex++}`);
            values.push(input.events);
        }

        if (input.headers !== undefined) {
            updates.push(`headers = $${paramIndex++}`);
            values.push(input.headers ? JSON.stringify(input.headers) : null);
        }

        if (input.is_active !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            values.push(input.is_active);
        }

        if (updates.length === 0) {
            return this.findByIdAndWorkspaceId(id, workspaceId);
        }

        values.push(id, workspaceId);
        const query = `
            UPDATE flowmaestro.outgoing_webhooks
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex++} AND workspace_id = $${paramIndex} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query<OutgoingWebhookRow>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * @deprecated Use updateByWorkspace instead. Kept for backward compatibility.
     */
    async update(
        id: string,
        userId: string,
        input: UpdateOutgoingWebhookInput
    ): Promise<OutgoingWebhookModel | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }

        if (input.url !== undefined) {
            updates.push(`url = $${paramIndex++}`);
            values.push(input.url);
        }

        if (input.events !== undefined) {
            updates.push(`events = $${paramIndex++}`);
            values.push(input.events);
        }

        if (input.headers !== undefined) {
            updates.push(`headers = $${paramIndex++}`);
            values.push(input.headers ? JSON.stringify(input.headers) : null);
        }

        if (input.is_active !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            values.push(input.is_active);
        }

        if (updates.length === 0) {
            return this.findByIdAndUserId(id, userId);
        }

        values.push(id, userId);
        const query = `
            UPDATE flowmaestro.outgoing_webhooks
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex++} AND user_id = $${paramIndex} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query<OutgoingWebhookRow>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * Regenerate the webhook secret by workspace.
     */
    async regenerateSecretByWorkspace(id: string, workspaceId: string): Promise<string | null> {
        const newSecret = this.generateSecret();

        const query = `
            UPDATE flowmaestro.outgoing_webhooks
            SET secret = $3
            WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
            RETURNING secret
        `;

        const result = await db.query<{ secret: string }>(query, [id, workspaceId, newSecret]);
        return result.rows.length > 0 ? result.rows[0].secret : null;
    }

    /**
     * @deprecated Use regenerateSecretByWorkspace instead. Kept for backward compatibility.
     */
    async regenerateSecret(id: string, userId: string): Promise<string | null> {
        const newSecret = this.generateSecret();

        const query = `
            UPDATE flowmaestro.outgoing_webhooks
            SET secret = $3
            WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
            RETURNING secret
        `;

        const result = await db.query<{ secret: string }>(query, [id, userId, newSecret]);
        return result.rows.length > 0 ? result.rows[0].secret : null;
    }

    /**
     * Soft delete a webhook by workspace.
     */
    async deleteByWorkspace(id: string, workspaceId: string): Promise<boolean> {
        const query = `
            UPDATE flowmaestro.outgoing_webhooks
            SET deleted_at = CURRENT_TIMESTAMP, is_active = false
            WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id, workspaceId]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * @deprecated Use deleteByWorkspace instead. Kept for backward compatibility.
     */
    async delete(id: string, userId: string): Promise<boolean> {
        const query = `
            UPDATE flowmaestro.outgoing_webhooks
            SET deleted_at = CURRENT_TIMESTAMP, is_active = false
            WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id, userId]);
        return (result.rowCount || 0) > 0;
    }

    private mapRow(row: OutgoingWebhookRow): OutgoingWebhookModel {
        return {
            id: row.id,
            user_id: row.user_id,
            workspace_id: row.workspace_id,
            name: row.name,
            url: row.url,
            secret: row.secret,
            events: row.events as WebhookEventType[],
            headers: row.headers,
            is_active: row.is_active,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            deleted_at: row.deleted_at ? new Date(row.deleted_at) : null
        };
    }

    private mapToListItem(row: OutgoingWebhookRow): OutgoingWebhookListItem {
        return {
            id: row.id,
            name: row.name,
            url: row.url,
            events: row.events as WebhookEventType[],
            is_active: row.is_active,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        };
    }
}

export class WebhookDeliveryRepository {
    /**
     * Create a new webhook delivery record.
     */
    async create(input: CreateWebhookDeliveryInput): Promise<WebhookDeliveryModel> {
        const query = `
            INSERT INTO flowmaestro.webhook_deliveries (
                webhook_id, event_type, payload
            )
            VALUES ($1, $2, $3)
            RETURNING *
        `;

        const values = [input.webhook_id, input.event_type, JSON.stringify(input.payload)];

        const result = await db.query<WebhookDeliveryRow>(query, values);
        return this.mapRow(result.rows[0]);
    }

    /**
     * Find a delivery by ID.
     */
    async findById(id: string): Promise<WebhookDeliveryModel | null> {
        const query = `
            SELECT * FROM flowmaestro.webhook_deliveries
            WHERE id = $1
        `;

        const result = await db.query<WebhookDeliveryRow>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * List deliveries for a webhook.
     */
    async findByWebhookId(
        webhookId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{ deliveries: WebhookDeliveryModel[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.webhook_deliveries
            WHERE webhook_id = $1
        `;

        const query = `
            SELECT * FROM flowmaestro.webhook_deliveries
            WHERE webhook_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, deliveriesResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, [webhookId]),
            db.query<WebhookDeliveryRow>(query, [webhookId, limit, offset])
        ]);

        return {
            deliveries: deliveriesResult.rows.map((row) => this.mapRow(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * Find pending deliveries that need to be retried.
     */
    async findPendingRetries(limit: number = 100): Promise<WebhookDeliveryModel[]> {
        const query = `
            SELECT * FROM flowmaestro.webhook_deliveries
            WHERE status = 'retrying'
              AND next_retry_at <= CURRENT_TIMESTAMP
            ORDER BY next_retry_at ASC
            LIMIT $1
        `;

        const result = await db.query<WebhookDeliveryRow>(query, [limit]);
        return result.rows.map((row) => this.mapRow(row));
    }

    /**
     * Mark a delivery as successful.
     */
    async markSuccess(
        id: string,
        responseStatus: number,
        responseBody: string | null
    ): Promise<void> {
        const query = `
            UPDATE flowmaestro.webhook_deliveries
            SET status = 'success',
                attempts = attempts + 1,
                last_attempt_at = CURRENT_TIMESTAMP,
                response_status = $2,
                response_body = $3,
                next_retry_at = NULL
            WHERE id = $1
        `;

        await db.query(query, [id, responseStatus, responseBody?.slice(0, 10000)]);
    }

    /**
     * Increment attempt count and schedule retry.
     */
    async incrementAttempt(
        id: string,
        responseStatus: number | null,
        responseBody: string | null,
        errorMessage?: string
    ): Promise<WebhookDeliveryModel | null> {
        const query = `
            UPDATE flowmaestro.webhook_deliveries
            SET attempts = attempts + 1,
                last_attempt_at = CURRENT_TIMESTAMP,
                response_status = $2,
                response_body = $3,
                error_message = $4,
                status = CASE
                    WHEN attempts + 1 >= max_attempts THEN 'failed'
                    ELSE 'retrying'
                END
            WHERE id = $1
            RETURNING *
        `;

        const result = await db.query<WebhookDeliveryRow>(query, [
            id,
            responseStatus,
            responseBody?.slice(0, 10000),
            errorMessage?.slice(0, 1000)
        ]);

        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * Schedule the next retry attempt.
     */
    async scheduleRetry(id: string, nextRetryAt: Date): Promise<void> {
        const query = `
            UPDATE flowmaestro.webhook_deliveries
            SET next_retry_at = $2
            WHERE id = $1
        `;

        await db.query(query, [id, nextRetryAt]);
    }

    /**
     * Mark a delivery as permanently failed.
     */
    async markFailed(id: string): Promise<void> {
        const query = `
            UPDATE flowmaestro.webhook_deliveries
            SET status = 'failed', next_retry_at = NULL
            WHERE id = $1
        `;

        await db.query(query, [id]);
    }

    /**
     * Clean up old delivery records (for maintenance).
     */
    async cleanupOldDeliveries(olderThanDays: number = 30): Promise<number> {
        const query = `
            DELETE FROM flowmaestro.webhook_deliveries
            WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${olderThanDays} days'
              AND status IN ('success', 'failed')
        `;

        const result = await db.query(query);
        return result.rowCount || 0;
    }

    private mapRow(row: WebhookDeliveryRow): WebhookDeliveryModel {
        return {
            id: row.id,
            webhook_id: row.webhook_id,
            event_type: row.event_type as WebhookEventType,
            payload: typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload,
            status: row.status as WebhookDeliveryStatus,
            attempts: row.attempts,
            max_attempts: row.max_attempts,
            last_attempt_at: row.last_attempt_at ? new Date(row.last_attempt_at) : null,
            next_retry_at: row.next_retry_at ? new Date(row.next_retry_at) : null,
            response_status: row.response_status,
            response_body: row.response_body,
            error_message: row.error_message,
            created_at: new Date(row.created_at)
        };
    }
}
