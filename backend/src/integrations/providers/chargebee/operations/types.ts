/**
 * Chargebee API types and interfaces
 *
 * Based on official Chargebee API documentation:
 * https://apidocs.chargebee.com/docs/api
 */

// ============================================
// Base Types
// ============================================

export interface ChargebeeAddress {
    first_name?: string;
    last_name?: string;
    email?: string;
    company?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    line3?: string;
    city?: string;
    state?: string;
    state_code?: string;
    country?: string;
    zip?: string;
    validation_status?: "not_validated" | "valid" | "partially_valid" | "invalid";
}

// ============================================
// Customer Types
// ============================================

export interface ChargebeeCustomer {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    company?: string;
    auto_collection: "on" | "off";
    net_term_days: number;
    allow_direct_debit: boolean;
    created_at: number;
    updated_at?: number;
    billing_address?: ChargebeeAddress;
    preferred_currency_code?: string;
    taxability?: "taxable" | "exempt";
    object: "customer";
    deleted: boolean;
    promotional_credits: number;
    refundable_credits: number;
    excess_payments: number;
    unbilled_charges: number;
    channel?: string;
    resource_version?: number;
}

export interface ChargebeeCustomerInput {
    id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    company?: string;
    auto_collection?: "on" | "off";
    net_term_days?: number;
    allow_direct_debit?: boolean;
    billing_address?: ChargebeeAddress;
    preferred_currency_code?: string;
    taxability?: "taxable" | "exempt";
}

// ============================================
// Subscription Types
// ============================================

export interface ChargebeeSubscription {
    id: string;
    customer_id: string;
    plan_id: string;
    plan_quantity: number;
    plan_unit_price?: number;
    billing_period: number;
    billing_period_unit: "day" | "week" | "month" | "year";
    status:
        | "future"
        | "in_trial"
        | "active"
        | "non_renewing"
        | "paused"
        | "cancelled"
        | "transferred";
    trial_start?: number;
    trial_end?: number;
    current_term_start?: number;
    current_term_end?: number;
    next_billing_at?: number;
    created_at: number;
    started_at?: number;
    activated_at?: number;
    cancelled_at?: number;
    cancel_reason?:
        | "not_paid"
        | "no_card"
        | "fraud_review_failed"
        | "non_compliant_eu_customer"
        | "tax_calculation_failed"
        | "currency_incompatible_with_gateway"
        | "non_compliant_customer";
    updated_at?: number;
    remaining_billing_cycles?: number;
    po_number?: string;
    auto_collection?: "on" | "off";
    due_invoices_count?: number;
    mrr?: number;
    deleted: boolean;
    object: "subscription";
    has_scheduled_changes: boolean;
    resource_version?: number;
    currency_code: string;
}

export interface ChargebeeSubscriptionInput {
    plan_id: string;
    plan_quantity?: number;
    plan_unit_price?: number;
    trial_end?: number;
    billing_cycles?: number;
    auto_collection?: "on" | "off";
    po_number?: string;
    start_date?: number;
}

// ============================================
// Invoice Types
// ============================================

export interface ChargebeeInvoice {
    id: string;
    po_number?: string;
    customer_id: string;
    subscription_id?: string;
    recurring: boolean;
    status: "paid" | "posted" | "payment_due" | "not_paid" | "voided" | "pending";
    price_type: "tax_exclusive" | "tax_inclusive";
    date?: number;
    due_date?: number;
    net_term_days?: number;
    currency_code: string;
    total: number;
    amount_paid: number;
    amount_adjusted: number;
    write_off_amount: number;
    credits_applied: number;
    amount_due: number;
    paid_at?: number;
    dunning_status?: "in_progress" | "exhausted" | "stopped" | "success";
    updated_at?: number;
    resource_version?: number;
    deleted: boolean;
    object: "invoice";
    first_invoice?: boolean;
    has_advance_charges?: boolean;
    term_finalized: boolean;
    is_gifted: boolean;
    generated_at?: number;
    round_off_amount?: number;
    sub_total: number;
    tax: number;
    line_items?: ChargebeeLineItem[];
}

export interface ChargebeeLineItem {
    id?: string;
    subscription_id?: string;
    date_from: number;
    date_to: number;
    unit_amount: number;
    quantity?: number;
    amount?: number;
    pricing_model?: "flat_fee" | "per_unit" | "tiered" | "volume" | "stairstep";
    is_taxed: boolean;
    tax_amount?: number;
    tax_rate?: number;
    discount_amount?: number;
    item_level_discount_amount?: number;
    description: string;
    entity_type:
        | "plan_setup"
        | "plan"
        | "addon"
        | "adhoc"
        | "plan_item_price"
        | "addon_item_price"
        | "charge_item_price";
    entity_id?: string;
    object: "line_item";
}

// ============================================
// API Response Types
// ============================================

export interface ChargebeeListResponse<T> {
    list: Array<{ customer?: T; subscription?: T; invoice?: T }>;
    next_offset?: string;
}

export interface ChargebeeSingleResponse<T> {
    customer?: T;
    subscription?: T;
    invoice?: T;
}
