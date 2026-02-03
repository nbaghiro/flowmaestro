/**
 * PayPal API response types
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface PaypalMoney {
    currency_code: string;
    value: string; // PayPal uses string amounts (e.g., "10.00")
}

export interface PaypalLink {
    href: string;
    rel: string;
    method: string;
}

// ============================================================================
// ORDERS
// ============================================================================

export interface PaypalOrder {
    id: string;
    status: "CREATED" | "SAVED" | "APPROVED" | "VOIDED" | "COMPLETED" | "PAYER_ACTION_REQUIRED";
    intent: "CAPTURE" | "AUTHORIZE";
    purchase_units: PaypalPurchaseUnit[];
    payer?: PaypalPayer;
    create_time: string;
    update_time?: string;
    links: PaypalLink[];
}

export interface PaypalPurchaseUnit {
    reference_id?: string;
    amount: {
        currency_code: string;
        value: string;
        breakdown?: {
            item_total?: PaypalMoney;
            shipping?: PaypalMoney;
            tax_total?: PaypalMoney;
            discount?: PaypalMoney;
        };
    };
    description?: string;
    payments?: {
        captures?: PaypalCapture[];
    };
}

export interface PaypalPayer {
    email_address?: string;
    payer_id?: string;
    name?: {
        given_name?: string;
        surname?: string;
    };
}

export type PaypalOrderResponse = PaypalOrder;

// ============================================================================
// CAPTURES / PAYMENTS
// ============================================================================

export interface PaypalCapture {
    id: string;
    status: "COMPLETED" | "DECLINED" | "PARTIALLY_REFUNDED" | "PENDING" | "REFUNDED" | "FAILED";
    amount: PaypalMoney;
    seller_protection?: {
        status: string;
    };
    create_time: string;
    update_time: string;
}

// ============================================================================
// REFUNDS
// ============================================================================

export interface PaypalRefund {
    id: string;
    status: "CANCELLED" | "FAILED" | "PENDING" | "COMPLETED";
    amount?: PaypalMoney;
    note_to_payer?: string;
    create_time: string;
    update_time: string;
    links: PaypalLink[];
}

// ============================================================================
// TRANSACTIONS (Reporting)
// ============================================================================

export interface PaypalTransactionDetail {
    transaction_info: {
        transaction_id: string;
        transaction_event_code: string;
        transaction_initiation_date: string;
        transaction_updated_date: string;
        transaction_amount: PaypalMoney;
        fee_amount?: PaypalMoney;
        transaction_status: string;
        transaction_subject?: string;
        transaction_note?: string;
        payer_name?: {
            given_name?: string;
            surname?: string;
        };
    };
    payer_info?: {
        email_address?: string;
        payer_name?: {
            given_name?: string;
            surname?: string;
        };
    };
}

export interface PaypalTransactionsResponse {
    transaction_details: PaypalTransactionDetail[];
    total_items: number;
    total_pages: number;
    page: number;
    links: PaypalLink[];
}

// ============================================================================
// INVOICES
// ============================================================================

export interface PaypalInvoice {
    id: string;
    status:
        | "DRAFT"
        | "SENT"
        | "SCHEDULED"
        | "PAYMENT_PENDING"
        | "PAID"
        | "MARKED_AS_PAID"
        | "CANCELLED"
        | "REFUNDED"
        | "PARTIALLY_PAID"
        | "PARTIALLY_REFUNDED"
        | "MARKED_AS_REFUNDED";
    detail: {
        invoice_number?: string;
        invoice_date?: string;
        currency_code: string;
        note?: string;
        memo?: string;
        payment_term?: {
            due_date?: string;
        };
    };
    invoicer?: {
        name?: {
            given_name?: string;
            surname?: string;
        };
        email_address?: string;
    };
    primary_recipients?: Array<{
        billing_info?: {
            name?: {
                given_name?: string;
                surname?: string;
            };
            email_address?: string;
        };
    }>;
    items?: Array<{
        name: string;
        description?: string;
        quantity: string;
        unit_amount: PaypalMoney;
    }>;
    amount?: {
        currency_code: string;
        value: string;
        breakdown?: {
            item_total?: PaypalMoney;
            tax_total?: PaypalMoney;
            discount?: PaypalMoney;
        };
    };
    due_amount?: PaypalMoney;
    links: PaypalLink[];
}

export interface PaypalInvoiceCreateResponse {
    rel: string;
    href: string;
    method: string;
}

// ============================================================================
// PAYOUTS
// ============================================================================

export interface PaypalPayoutBatch {
    batch_header: {
        payout_batch_id: string;
        batch_status: "DENIED" | "PENDING" | "PROCESSING" | "SUCCESS" | "CANCELED";
        sender_batch_header: {
            sender_batch_id?: string;
            email_subject?: string;
            email_message?: string;
        };
        time_created: string;
        time_completed?: string;
        amount?: PaypalMoney;
        fees?: PaypalMoney;
    };
    items?: PaypalPayoutItem[];
    links: PaypalLink[];
}

export interface PaypalPayoutItem {
    payout_item_id: string;
    transaction_id?: string;
    transaction_status:
        | "SUCCESS"
        | "FAILED"
        | "PENDING"
        | "UNCLAIMED"
        | "RETURNED"
        | "ONHOLD"
        | "BLOCKED"
        | "REFUNDED"
        | "REVERSED";
    payout_item_fee?: PaypalMoney;
    payout_batch_id: string;
    payout_item: {
        recipient_type: "EMAIL" | "PHONE" | "PAYPAL_ID";
        amount: PaypalMoney;
        receiver: string;
        note?: string;
        sender_item_id?: string;
    };
    links: PaypalLink[];
}

export interface PaypalPayoutCreateResponse {
    batch_header: {
        payout_batch_id: string;
        batch_status: string;
        sender_batch_header: {
            sender_batch_id?: string;
            email_subject?: string;
        };
    };
    links: PaypalLink[];
}

// ============================================================================
// ERRORS
// ============================================================================

export interface PaypalError {
    name: string;
    message: string;
    debug_id?: string;
    details?: Array<{
        field?: string;
        value?: string;
        location?: string;
        issue: string;
        description?: string;
    }>;
}
