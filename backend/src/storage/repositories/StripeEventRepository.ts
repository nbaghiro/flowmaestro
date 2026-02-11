import { db } from "../database";
import type { StripeEventModel, CreateStripeEventInput } from "../models/StripeEvent";

interface StripeEventRow {
    id: string;
    stripe_event_id: string;
    event_type: string;
    workspace_id: string | null;
    user_id: string | null;
    processed_at: Date | string;
    raw_payload: Record<string, unknown>;
}

export class StripeEventRepository {
    /**
     * Check if an event has already been processed (idempotency check).
     */
    async hasProcessed(stripeEventId: string): Promise<boolean> {
        const query = `
            SELECT 1 FROM flowmaestro.stripe_events
            WHERE stripe_event_id = $1
            LIMIT 1
        `;

        const result = await db.query(query, [stripeEventId]);
        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Record a processed event.
     */
    async create(input: CreateStripeEventInput): Promise<StripeEventModel> {
        const query = `
            INSERT INTO flowmaestro.stripe_events (
                stripe_event_id,
                event_type,
                workspace_id,
                user_id,
                raw_payload
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const values = [
            input.stripe_event_id,
            input.event_type,
            input.workspace_id || null,
            input.user_id || null,
            JSON.stringify(input.raw_payload || {})
        ];

        const result = await db.query<StripeEventRow>(query, values);
        return this.mapRow(result.rows[0]);
    }

    /**
     * Find an event by Stripe event ID.
     */
    async findByStripeEventId(stripeEventId: string): Promise<StripeEventModel | null> {
        const query = `
            SELECT * FROM flowmaestro.stripe_events
            WHERE stripe_event_id = $1
        `;

        const result = await db.query<StripeEventRow>(query, [stripeEventId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * Get recent events for debugging/monitoring.
     */
    async getRecent(limit: number = 50): Promise<StripeEventModel[]> {
        const query = `
            SELECT * FROM flowmaestro.stripe_events
            ORDER BY processed_at DESC
            LIMIT $1
        `;

        const result = await db.query<StripeEventRow>(query, [limit]);
        return result.rows.map((row) => this.mapRow(row));
    }

    private mapRow(row: StripeEventRow): StripeEventModel {
        return {
            id: row.id,
            stripe_event_id: row.stripe_event_id,
            event_type: row.event_type,
            workspace_id: row.workspace_id,
            user_id: row.user_id,
            processed_at: new Date(row.processed_at),
            raw_payload: row.raw_payload || {}
        };
    }
}
