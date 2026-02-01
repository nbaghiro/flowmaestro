/**
 * Stripe API response types
 */

// ============================================================================
// PAYMENT INTENTS
// ============================================================================

export interface StripePaymentIntent {
    id: string;
    object: "payment_intent";
    amount: number;
    amount_received: number;
    currency: string;
    status:
        | "requires_payment_method"
        | "requires_confirmation"
        | "requires_action"
        | "processing"
        | "requires_capture"
        | "canceled"
        | "succeeded";
    customer: string | null;
    description: string | null;
    metadata: Record<string, string>;
    created: number;
    payment_method: string | null;
    receipt_email: string | null;
    client_secret: string;
    livemode: boolean;
}

// ============================================================================
// CHARGES
// ============================================================================

export interface StripeCharge {
    id: string;
    object: "charge";
    amount: number;
    amount_refunded: number;
    currency: string;
    status: "succeeded" | "pending" | "failed";
    customer: string | null;
    description: string | null;
    metadata: Record<string, string>;
    created: number;
    refunded: boolean;
    receipt_email: string | null;
    receipt_url: string | null;
    payment_intent: string | null;
    livemode: boolean;
}

// ============================================================================
// REFUNDS
// ============================================================================

export interface StripeRefund {
    id: string;
    object: "refund";
    amount: number;
    currency: string;
    status: "pending" | "succeeded" | "failed" | "canceled";
    charge: string | null;
    payment_intent: string | null;
    reason: string | null;
    created: number;
    metadata: Record<string, string>;
}

// ============================================================================
// CUSTOMERS
// ============================================================================

export interface StripeCustomer {
    id: string;
    object: "customer";
    email: string | null;
    name: string | null;
    phone: string | null;
    description: string | null;
    metadata: Record<string, string>;
    created: number;
    default_source: string | null;
    livemode: boolean;
}

// ============================================================================
// LIST RESPONSE
// ============================================================================

export interface StripeList<T> {
    object: "list";
    data: T[];
    has_more: boolean;
    url: string;
}
