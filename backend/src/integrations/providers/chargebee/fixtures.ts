/**
 * Chargebee Provider Test Fixtures
 *
 * Based on official Chargebee API documentation:
 * https://apidocs.chargebee.com/docs/api
 */

import type { TestFixture } from "../../sandbox";

export const chargebeeFixtures: TestFixture[] = [
    // ==================== CUSTOMERS ====================
    {
        operationId: "listCustomers",
        provider: "chargebee",
        validCases: [
            {
                name: "list_all_customers",
                description: "List all customers with default pagination",
                input: {},
                expectedOutput: {
                    customers: [
                        {
                            id: "cust_HTy0l9Q5bSM9",
                            first_name: "John",
                            last_name: "Doe",
                            email: "john.doe@example.com",
                            phone: "+1-555-123-4567",
                            company: "Acme Corp",
                            auto_collection: "on",
                            net_term_days: 0,
                            allow_direct_debit: false,
                            created_at: 1705320000,
                            updated_at: 1705406400,
                            object: "customer",
                            deleted: false,
                            promotional_credits: 0,
                            refundable_credits: 0,
                            excess_payments: 0,
                            unbilled_charges: 0
                        },
                        {
                            id: "cust_KPm2n8R7wXa3",
                            first_name: "Jane",
                            last_name: "Smith",
                            email: "jane.smith@techstartup.io",
                            phone: "+1-555-987-6543",
                            company: "Tech Startup Inc",
                            auto_collection: "on",
                            net_term_days: 30,
                            allow_direct_debit: true,
                            created_at: 1705233600,
                            updated_at: 1705320000,
                            object: "customer",
                            deleted: false,
                            promotional_credits: 5000,
                            refundable_credits: 0,
                            excess_payments: 0,
                            unbilled_charges: 15000
                        }
                    ],
                    count: 2
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after some time.",
                    retryable: true
                }
            },
            {
                name: "unauthorized",
                description: "Invalid API credentials",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Invalid API key",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getCustomer",
        provider: "chargebee",
        validCases: [
            {
                name: "get_customer_by_id",
                description: "Get a specific customer by ID",
                input: { id: "cust_HTy0l9Q5bSM9" },
                expectedOutput: {
                    id: "cust_HTy0l9Q5bSM9",
                    first_name: "John",
                    last_name: "Doe",
                    email: "john.doe@example.com",
                    phone: "+1-555-123-4567",
                    company: "Acme Corp",
                    auto_collection: "on",
                    net_term_days: 0,
                    allow_direct_debit: false,
                    created_at: 1705320000,
                    updated_at: 1705406400,
                    billing_address: {
                        first_name: "John",
                        last_name: "Doe",
                        line1: "123 Main St",
                        city: "San Francisco",
                        state: "CA",
                        country: "US",
                        zip: "94102"
                    },
                    object: "customer",
                    deleted: false,
                    promotional_credits: 0,
                    refundable_credits: 0,
                    excess_payments: 0,
                    unbilled_charges: 0
                }
            }
        ],
        errorCases: [
            {
                name: "customer_not_found",
                description: "Customer does not exist",
                input: { id: "cust_nonexistent" },
                expectedError: {
                    type: "not_found",
                    message: "Customer not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createCustomer",
        provider: "chargebee",
        validCases: [
            {
                name: "create_basic_customer",
                description: "Create a customer with basic information",
                input: {
                    first_name: "Alice",
                    last_name: "Johnson",
                    email: "alice.johnson@newcompany.com",
                    company: "New Company LLC"
                },
                expectedOutput: {
                    id: "cust_LQr5p2T8yZc4",
                    first_name: "Alice",
                    last_name: "Johnson",
                    email: "alice.johnson@newcompany.com",
                    company: "New Company LLC",
                    auto_collection: "on",
                    net_term_days: 0,
                    allow_direct_debit: false,
                    created_at: 1705492800,
                    object: "customer",
                    deleted: false,
                    promotional_credits: 0,
                    refundable_credits: 0,
                    excess_payments: 0,
                    unbilled_charges: 0
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_email",
                description: "Customer with email already exists",
                input: {
                    email: "john.doe@example.com"
                },
                expectedError: {
                    type: "validation",
                    message: "Customer with this email already exists",
                    retryable: false
                }
            }
        ]
    },

    // ==================== SUBSCRIPTIONS ====================
    {
        operationId: "listSubscriptions",
        provider: "chargebee",
        validCases: [
            {
                name: "list_all_subscriptions",
                description: "List all subscriptions with default pagination",
                input: {},
                expectedOutput: {
                    subscriptions: [
                        {
                            id: "sub_16KD8Q5bSM9gj",
                            customer_id: "cust_HTy0l9Q5bSM9",
                            plan_id: "enterprise-monthly",
                            plan_quantity: 10,
                            plan_unit_price: 9900,
                            billing_period: 1,
                            billing_period_unit: "month",
                            status: "active",
                            current_term_start: 1705320000,
                            current_term_end: 1708003200,
                            next_billing_at: 1708003200,
                            created_at: 1702728000,
                            started_at: 1702728000,
                            activated_at: 1702728000,
                            mrr: 99000,
                            deleted: false,
                            object: "subscription",
                            has_scheduled_changes: false,
                            currency_code: "USD"
                        },
                        {
                            id: "sub_17LE9R6cTN0hk",
                            customer_id: "cust_KPm2n8R7wXa3",
                            plan_id: "startup-annual",
                            plan_quantity: 1,
                            billing_period: 1,
                            billing_period_unit: "year",
                            status: "in_trial",
                            trial_start: 1705320000,
                            trial_end: 1706529600,
                            created_at: 1705320000,
                            deleted: false,
                            object: "subscription",
                            has_scheduled_changes: false,
                            currency_code: "USD"
                        }
                    ],
                    count: 2
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getSubscription",
        provider: "chargebee",
        validCases: [
            {
                name: "get_subscription_by_id",
                description: "Get a specific subscription by ID",
                input: { id: "sub_16KD8Q5bSM9gj" },
                expectedOutput: {
                    id: "sub_16KD8Q5bSM9gj",
                    customer_id: "cust_HTy0l9Q5bSM9",
                    plan_id: "enterprise-monthly",
                    plan_quantity: 10,
                    plan_unit_price: 9900,
                    billing_period: 1,
                    billing_period_unit: "month",
                    status: "active",
                    current_term_start: 1705320000,
                    current_term_end: 1708003200,
                    next_billing_at: 1708003200,
                    created_at: 1702728000,
                    started_at: 1702728000,
                    activated_at: 1702728000,
                    mrr: 99000,
                    deleted: false,
                    object: "subscription",
                    has_scheduled_changes: false,
                    currency_code: "USD"
                }
            }
        ],
        errorCases: [
            {
                name: "subscription_not_found",
                description: "Subscription does not exist",
                input: { id: "sub_nonexistent" },
                expectedError: {
                    type: "not_found",
                    message: "Subscription not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createSubscription",
        provider: "chargebee",
        validCases: [
            {
                name: "create_basic_subscription",
                description: "Create a subscription for a customer",
                input: {
                    customer_id: "cust_HTy0l9Q5bSM9",
                    plan_id: "pro-monthly",
                    plan_quantity: 5
                },
                expectedOutput: {
                    id: "sub_18MF0S7dUO1il",
                    customer_id: "cust_HTy0l9Q5bSM9",
                    plan_id: "pro-monthly",
                    plan_quantity: 5,
                    billing_period: 1,
                    billing_period_unit: "month",
                    status: "active",
                    current_term_start: 1705492800,
                    current_term_end: 1708171200,
                    next_billing_at: 1708171200,
                    created_at: 1705492800,
                    started_at: 1705492800,
                    activated_at: 1705492800,
                    deleted: false,
                    object: "subscription",
                    has_scheduled_changes: false,
                    currency_code: "USD"
                }
            }
        ],
        errorCases: [
            {
                name: "customer_not_found",
                description: "Customer does not exist",
                input: {
                    customer_id: "cust_nonexistent",
                    plan_id: "pro-monthly"
                },
                expectedError: {
                    type: "not_found",
                    message: "Customer not found",
                    retryable: false
                }
            },
            {
                name: "plan_not_found",
                description: "Plan does not exist",
                input: {
                    customer_id: "cust_HTy0l9Q5bSM9",
                    plan_id: "nonexistent-plan"
                },
                expectedError: {
                    type: "not_found",
                    message: "Plan not found",
                    retryable: false
                }
            }
        ]
    },

    // ==================== INVOICES ====================
    {
        operationId: "listInvoices",
        provider: "chargebee",
        validCases: [
            {
                name: "list_all_invoices",
                description: "List all invoices with default pagination",
                input: {},
                expectedOutput: {
                    invoices: [
                        {
                            id: "inv_19NG1T8eVP2jm",
                            customer_id: "cust_HTy0l9Q5bSM9",
                            subscription_id: "sub_16KD8Q5bSM9gj",
                            recurring: true,
                            status: "paid",
                            price_type: "tax_exclusive",
                            date: 1705320000,
                            due_date: 1705320000,
                            currency_code: "USD",
                            total: 99000,
                            amount_paid: 99000,
                            amount_adjusted: 0,
                            write_off_amount: 0,
                            credits_applied: 0,
                            amount_due: 0,
                            paid_at: 1705320100,
                            deleted: false,
                            object: "invoice",
                            term_finalized: true,
                            is_gifted: false,
                            sub_total: 99000,
                            tax: 0
                        },
                        {
                            id: "inv_20OH2U9fWQ3kn",
                            customer_id: "cust_KPm2n8R7wXa3",
                            subscription_id: "sub_17LE9R6cTN0hk",
                            recurring: true,
                            status: "payment_due",
                            price_type: "tax_exclusive",
                            date: 1705406400,
                            due_date: 1708084800,
                            currency_code: "USD",
                            total: 119900,
                            amount_paid: 0,
                            amount_adjusted: 0,
                            write_off_amount: 0,
                            credits_applied: 0,
                            amount_due: 119900,
                            deleted: false,
                            object: "invoice",
                            term_finalized: true,
                            is_gifted: false,
                            sub_total: 119900,
                            tax: 0
                        }
                    ],
                    count: 2
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getInvoice",
        provider: "chargebee",
        validCases: [
            {
                name: "get_invoice_by_id",
                description: "Get a specific invoice by ID",
                input: { id: "inv_19NG1T8eVP2jm" },
                expectedOutput: {
                    id: "inv_19NG1T8eVP2jm",
                    customer_id: "cust_HTy0l9Q5bSM9",
                    subscription_id: "sub_16KD8Q5bSM9gj",
                    recurring: true,
                    status: "paid",
                    price_type: "tax_exclusive",
                    date: 1705320000,
                    due_date: 1705320000,
                    currency_code: "USD",
                    total: 99000,
                    amount_paid: 99000,
                    amount_adjusted: 0,
                    write_off_amount: 0,
                    credits_applied: 0,
                    amount_due: 0,
                    paid_at: 1705320100,
                    deleted: false,
                    object: "invoice",
                    term_finalized: true,
                    is_gifted: false,
                    sub_total: 99000,
                    tax: 0,
                    line_items: [
                        {
                            date_from: 1705320000,
                            date_to: 1708003200,
                            unit_amount: 9900,
                            quantity: 10,
                            amount: 99000,
                            is_taxed: false,
                            description: "Enterprise Monthly - 10 users",
                            entity_type: "plan",
                            entity_id: "enterprise-monthly",
                            object: "line_item"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "invoice_not_found",
                description: "Invoice does not exist",
                input: { id: "inv_nonexistent" },
                expectedError: {
                    type: "not_found",
                    message: "Invoice not found",
                    retryable: false
                }
            }
        ]
    }
];
