import type { PaymentStatus, PaymentType } from "@flowmaestro/shared";

export interface PaymentHistoryModel {
    id: string;
    workspace_id: string;
    user_id: string | null;
    stripe_payment_intent_id: string | null;
    stripe_invoice_id: string | null;
    stripe_checkout_session_id: string | null;
    stripe_subscription_id: string | null;
    amount_cents: number;
    currency: string;
    status: PaymentStatus;
    payment_type: PaymentType;
    description: string | null;
    metadata: Record<string, unknown>;
    created_at: Date;
}

export interface CreatePaymentHistoryInput {
    workspace_id: string;
    user_id?: string;
    stripe_payment_intent_id?: string;
    stripe_invoice_id?: string;
    stripe_checkout_session_id?: string;
    stripe_subscription_id?: string;
    amount_cents: number;
    currency?: string;
    status: PaymentStatus;
    payment_type: PaymentType;
    description?: string;
    metadata?: Record<string, unknown>;
}
