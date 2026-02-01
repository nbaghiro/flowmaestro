/**
 * Square API response types
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface SquareMoney {
    amount: number;
    currency: string;
}

// ============================================================================
// PAYMENTS
// ============================================================================

export interface SquarePayment {
    id: string;
    created_at: string;
    updated_at: string;
    amount_money: SquareMoney;
    total_money?: SquareMoney;
    status: "APPROVED" | "PENDING" | "COMPLETED" | "CANCELED" | "FAILED";
    source_type: "CARD" | "CASH" | "WALLET" | "BANK_ACCOUNT" | "EXTERNAL";
    location_id: string;
    customer_id?: string;
    reference_id?: string;
    note?: string;
    receipt_number?: string;
    receipt_url?: string;
}

export interface SquarePaymentsResponse {
    payments?: SquarePayment[];
    cursor?: string;
    errors?: SquareError[];
}

export interface SquarePaymentResponse {
    payment?: SquarePayment;
    errors?: SquareError[];
}

// ============================================================================
// REFUNDS
// ============================================================================

export interface SquareRefund {
    id: string;
    payment_id: string;
    amount_money: SquareMoney;
    status: "PENDING" | "APPROVED" | "REJECTED" | "FAILED";
    location_id: string;
    created_at: string;
    updated_at: string;
    reason?: string;
}

export interface SquareRefundsResponse {
    refunds?: SquareRefund[];
    cursor?: string;
    errors?: SquareError[];
}

export interface SquareRefundResponse {
    refund?: SquareRefund;
    errors?: SquareError[];
}

// ============================================================================
// CUSTOMERS
// ============================================================================

export interface SquareCustomer {
    id: string;
    created_at: string;
    updated_at: string;
    given_name?: string;
    family_name?: string;
    company_name?: string;
    email_address?: string;
    phone_number?: string;
    reference_id?: string;
    note?: string;
}

export interface SquareCustomersResponse {
    customers?: SquareCustomer[];
    cursor?: string;
    errors?: SquareError[];
}

export interface SquareCustomerResponse {
    customer?: SquareCustomer;
    errors?: SquareError[];
}

// ============================================================================
// ORDERS
// ============================================================================

export interface SquareOrder {
    id: string;
    location_id: string;
    reference_id?: string;
    state: "OPEN" | "COMPLETED" | "CANCELED" | "DRAFT";
    created_at: string;
    updated_at: string;
    total_money?: SquareMoney;
    total_tax_money?: SquareMoney;
    total_discount_money?: SquareMoney;
    total_service_charge_money?: SquareMoney;
}

export interface SquareOrderResponse {
    order?: SquareOrder;
    errors?: SquareError[];
}

// ============================================================================
// ERRORS
// ============================================================================

export interface SquareError {
    category: string;
    code: string;
    detail?: string;
    field?: string;
}
