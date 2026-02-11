import type { PaymentHistoryItem } from "@flowmaestro/shared";
import { db } from "../database";
import type { PaymentHistoryModel, CreatePaymentHistoryInput } from "../models/PaymentHistory";

interface PaymentHistoryRow {
    id: string;
    workspace_id: string;
    user_id: string | null;
    stripe_payment_intent_id: string | null;
    stripe_invoice_id: string | null;
    stripe_checkout_session_id: string | null;
    stripe_subscription_id: string | null;
    amount_cents: number;
    currency: string;
    status: "pending" | "succeeded" | "failed" | "refunded";
    payment_type: "subscription" | "credit_pack" | "one_time";
    description: string | null;
    metadata: Record<string, unknown>;
    created_at: Date | string;
}

export class PaymentHistoryRepository {
    async create(input: CreatePaymentHistoryInput): Promise<PaymentHistoryModel> {
        const query = `
            INSERT INTO flowmaestro.payment_history (
                workspace_id,
                user_id,
                stripe_payment_intent_id,
                stripe_invoice_id,
                stripe_checkout_session_id,
                stripe_subscription_id,
                amount_cents,
                currency,
                status,
                payment_type,
                description,
                metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;

        const values = [
            input.workspace_id,
            input.user_id || null,
            input.stripe_payment_intent_id || null,
            input.stripe_invoice_id || null,
            input.stripe_checkout_session_id || null,
            input.stripe_subscription_id || null,
            input.amount_cents,
            input.currency || "usd",
            input.status,
            input.payment_type,
            input.description || null,
            JSON.stringify(input.metadata || {})
        ];

        const result = await db.query<PaymentHistoryRow>(query, values);
        return this.mapRow(result.rows[0]);
    }

    async findById(id: string): Promise<PaymentHistoryModel | null> {
        const query = `
            SELECT * FROM flowmaestro.payment_history
            WHERE id = $1
        `;

        const result = await db.query<PaymentHistoryRow>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByWorkspaceId(
        workspaceId: string,
        options?: { limit?: number; offset?: number }
    ): Promise<PaymentHistoryModel[]> {
        const limit = options?.limit || 50;
        const offset = options?.offset || 0;

        const query = `
            SELECT * FROM flowmaestro.payment_history
            WHERE workspace_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query<PaymentHistoryRow>(query, [workspaceId, limit, offset]);
        return result.rows.map((row) => this.mapRow(row));
    }

    async findByStripeCheckoutSessionId(sessionId: string): Promise<PaymentHistoryModel | null> {
        const query = `
            SELECT * FROM flowmaestro.payment_history
            WHERE stripe_checkout_session_id = $1
        `;

        const result = await db.query<PaymentHistoryRow>(query, [sessionId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByStripeInvoiceId(invoiceId: string): Promise<PaymentHistoryModel | null> {
        const query = `
            SELECT * FROM flowmaestro.payment_history
            WHERE stripe_invoice_id = $1
        `;

        const result = await db.query<PaymentHistoryRow>(query, [invoiceId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async updateStatus(id: string, status: PaymentHistoryModel["status"]): Promise<void> {
        const query = `
            UPDATE flowmaestro.payment_history
            SET status = $2
            WHERE id = $1
        `;

        await db.query(query, [id, status]);
    }

    private mapRow(row: PaymentHistoryRow): PaymentHistoryModel {
        return {
            id: row.id,
            workspace_id: row.workspace_id,
            user_id: row.user_id,
            stripe_payment_intent_id: row.stripe_payment_intent_id,
            stripe_invoice_id: row.stripe_invoice_id,
            stripe_checkout_session_id: row.stripe_checkout_session_id,
            stripe_subscription_id: row.stripe_subscription_id,
            amount_cents: row.amount_cents,
            currency: row.currency,
            status: row.status,
            payment_type: row.payment_type,
            description: row.description,
            metadata: row.metadata || {},
            created_at: new Date(row.created_at)
        };
    }

    toShared(model: PaymentHistoryModel): PaymentHistoryItem {
        return {
            id: model.id,
            amountCents: model.amount_cents,
            currency: model.currency,
            status: model.status,
            paymentType: model.payment_type,
            description: model.description,
            createdAt: model.created_at.toISOString()
        };
    }
}
