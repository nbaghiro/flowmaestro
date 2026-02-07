/**
 * Ramp API types and interfaces
 *
 * Based on official Ramp Developer API documentation:
 * https://docs.ramp.com/developer-api/v1
 */

// ============================================
// Transaction Types
// ============================================

export interface RampTransaction {
    id: string;
    card_id: string;
    user_id: string;
    user_transaction_time: string;
    merchant_id: string;
    merchant_name: string;
    merchant_category_code: string;
    merchant_category_code_description: string;
    amount: number;
    currency_code: string;
    state: "PENDING" | "CLEARED" | "DECLINED";
    sk_category_id?: number;
    sk_category_name?: string;
    memo?: string;
    receipts?: RampReceipt[];
    disputes?: RampDispute[];
}

export interface RampReceipt {
    id: string;
    created_at: string;
    receipt_url?: string;
}

export interface RampDispute {
    id: string;
    type: string;
    created_at: string;
}

// ============================================
// Card Types
// ============================================

export interface RampCard {
    id: string;
    is_physical: boolean;
    display_name: string;
    last_four: string;
    cardholder_id: string;
    cardholder_name: string;
    fulfillment: {
        shipping?: {
            return_address?: RampAddress;
            recipient_address?: RampAddress;
        };
    };
    spending_restrictions: {
        amount?: number;
        interval?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "TOTAL";
        lock_date?: string;
        categories?: number[];
        blocked_categories?: number[];
        transaction_amount_limit?: number;
    };
    state: "ACTIVE" | "SUSPENDED" | "TERMINATED";
}

export interface RampAddress {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
}

// ============================================
// User Types
// ============================================

export interface RampUser {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role: "BUSINESS_ADMIN" | "BUSINESS_OWNER" | "BUSINESS_USER" | "BUSINESS_BOOKKEEPER";
    department_id?: string;
    department_name?: string;
    location_id?: string;
    location_name?: string;
    manager_id?: string;
    direct_manager_id?: string;
    status: "INVITE_PENDING" | "USER_ACTIVE" | "USER_SUSPENDED";
}

// ============================================
// Reimbursement Types
// ============================================

export interface RampReimbursement {
    id: string;
    created_at: string;
    user_id: string;
    amount: number;
    currency: string;
    direction: "BUSINESS_TO_USER" | "USER_TO_BUSINESS";
    original_transaction_amount: number;
    original_reimbursement_amount: number;
    merchant: string;
    transaction_date: string;
    receipts?: RampReceipt[];
}

// ============================================
// Statement Types
// ============================================

export interface RampStatement {
    id: string;
    effective_date: string;
    period: {
        start: string;
        end: string;
    };
    created_at: string;
    status: "OPEN" | "CLOSED";
}

// ============================================
// API Response Types
// ============================================

export interface RampListResponse<T> {
    data: T[];
    page: {
        next?: string;
    };
}
