/**
 * Square Provider Test Fixtures
 *
 * Based on Square API documentation:
 * - Payments API: https://developer.squareup.com/reference/square/payments-api
 * - Customers API: https://developer.squareup.com/reference/square/customers-api
 * - Refunds API: https://developer.squareup.com/reference/square/refunds-api
 * - Orders API: https://developer.squareup.com/reference/square/orders-api
 */

import type { TestFixture } from "../../../sandbox";

/**
 * Sample customers for filterableData
 */
const sampleCustomers = [
    {
        id: "CUST_ABC123DEF456",
        givenName: "John",
        familyName: "Smith",
        companyName: null,
        emailAddress: "john.smith@example.com",
        phoneNumber: "+1-555-123-4567",
        referenceId: "ext-cust-001",
        createdAt: "2024-01-15T10:30:00Z",
        _hasEmail: true,
        _hasPhone: true
    },
    {
        id: "CUST_GHI789JKL012",
        givenName: "Jane",
        familyName: "Doe",
        companyName: "Acme Corp",
        emailAddress: "jane.doe@acme.com",
        phoneNumber: "+1-555-987-6543",
        referenceId: "ext-cust-002",
        createdAt: "2024-02-20T14:45:00Z",
        _hasEmail: true,
        _hasPhone: true
    },
    {
        id: "CUST_MNO345PQR678",
        givenName: "Bob",
        familyName: "Wilson",
        companyName: null,
        emailAddress: "bob.wilson@example.com",
        phoneNumber: null,
        referenceId: null,
        createdAt: "2024-03-10T09:15:00Z",
        _hasEmail: true,
        _hasPhone: false
    }
];

/**
 * Sample payments for filterableData
 */
const samplePayments = [
    {
        id: "PAY_sq1a2b3c4d5e6f",
        amountMoney: { amount: 2500, currency: "USD" },
        status: "COMPLETED",
        sourceType: "CARD",
        locationId: "LOC_MAIN_STORE",
        customerId: "CUST_ABC123DEF456",
        createdAt: "2024-06-15T14:30:00Z",
        _status: "COMPLETED",
        _sourceType: "CARD"
    },
    {
        id: "PAY_gh7i8j9k0l1m2n",
        amountMoney: { amount: 7500, currency: "USD" },
        status: "COMPLETED",
        sourceType: "CARD",
        locationId: "LOC_MAIN_STORE",
        customerId: "CUST_GHI789JKL012",
        createdAt: "2024-06-14T11:20:00Z",
        _status: "COMPLETED",
        _sourceType: "CARD"
    },
    {
        id: "PAY_op3q4r5s6t7u8v",
        amountMoney: { amount: 1200, currency: "USD" },
        status: "PENDING",
        sourceType: "CASH",
        locationId: "LOC_DOWNTOWN",
        customerId: null,
        createdAt: "2024-06-15T16:45:00Z",
        _status: "PENDING",
        _sourceType: "CASH"
    }
];

export const squareFixtures: TestFixture[] = [
    // ============================================================================
    // PAYMENTS
    // ============================================================================
    {
        operationId: "createPayment",
        provider: "square",
        validCases: [
            {
                name: "card_payment",
                description: "Create a card payment for a purchase",
                input: {
                    source_id: "cnon:card-nonce-ok",
                    amount_money: {
                        amount: 2500,
                        currency: "USD"
                    },
                    idempotency_key: "a29f8f9d-3b7c-4e5a-8c3d-1234567890ab",
                    location_id: "LOC_MAIN_STORE",
                    customer_id: "CUST_ABC123DEF456",
                    reference_id: "order-12345",
                    note: "Online purchase - Widget Pro"
                },
                expectedOutput: {
                    id: "PAY_sq1a2b3c4d5e6f",
                    amountMoney: { amount: 2500, currency: "USD" },
                    totalMoney: { amount: 2500, currency: "USD" },
                    status: "COMPLETED",
                    sourceType: "CARD",
                    locationId: "LOC_MAIN_STORE",
                    customerId: "CUST_ABC123DEF456",
                    referenceId: "order-12345",
                    note: "Online purchase - Widget Pro",
                    receiptNumber: "RCPT-1234",
                    receiptUrl: "https://squareup.com/receipt/preview/PAY_sq1a2b3c4d5e6f",
                    createdAt: "2024-06-15T14:30:00Z",
                    updatedAt: "2024-06-15T14:30:05Z"
                }
            },
            {
                name: "cash_payment",
                description: "Create a cash payment",
                input: {
                    source_id: "CASH",
                    amount_money: {
                        amount: 1500,
                        currency: "USD"
                    },
                    location_id: "LOC_DOWNTOWN",
                    note: "Walk-in purchase"
                },
                expectedOutput: {
                    id: "PAY_cash123456789",
                    amountMoney: { amount: 1500, currency: "USD" },
                    totalMoney: { amount: 1500, currency: "USD" },
                    status: "COMPLETED",
                    sourceType: "CASH",
                    locationId: "LOC_DOWNTOWN",
                    note: "Walk-in purchase",
                    createdAt: "2024-06-15T15:00:00Z",
                    updatedAt: "2024-06-15T15:00:00Z"
                }
            },
            {
                name: "payment_with_saved_card",
                description: "Create a payment using a saved card on file",
                input: {
                    source_id: "ccof:card-on-file-abc123",
                    amount_money: {
                        amount: 5000,
                        currency: "USD"
                    },
                    idempotency_key: "b30g9g0e-4c8d-5f6b-9d4e-2345678901bc",
                    location_id: "LOC_MAIN_STORE",
                    customer_id: "CUST_GHI789JKL012"
                },
                expectedOutput: {
                    id: "PAY_cof789012345",
                    amountMoney: { amount: 5000, currency: "USD" },
                    totalMoney: { amount: 5000, currency: "USD" },
                    status: "COMPLETED",
                    sourceType: "CARD",
                    locationId: "LOC_MAIN_STORE",
                    customerId: "CUST_GHI789JKL012",
                    receiptNumber: "RCPT-5678",
                    receiptUrl: "https://squareup.com/receipt/preview/PAY_cof789012345",
                    createdAt: "2024-06-15T16:00:00Z",
                    updatedAt: "2024-06-15T16:00:03Z"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_source",
                description: "Payment source is invalid or expired",
                input: {
                    source_id: "cnon:invalid-nonce",
                    amount_money: { amount: 2500, currency: "USD" },
                    location_id: "LOC_MAIN_STORE"
                },
                expectedError: {
                    type: "validation",
                    message: "INVALID_CARD: The card nonce is invalid or expired",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    source_id: "cnon:card-nonce-ok",
                    amount_money: { amount: 2500, currency: "USD" },
                    location_id: "LOC_MAIN_STORE"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getPayment",
        provider: "square",
        validCases: [
            {
                name: "completed_payment",
                description: "Get details of a completed payment",
                input: {
                    payment_id: "PAY_sq1a2b3c4d5e6f"
                },
                expectedOutput: {
                    id: "PAY_sq1a2b3c4d5e6f",
                    amountMoney: { amount: 2500, currency: "USD" },
                    totalMoney: { amount: 2500, currency: "USD" },
                    status: "COMPLETED",
                    sourceType: "CARD",
                    locationId: "LOC_MAIN_STORE",
                    customerId: "CUST_ABC123DEF456",
                    referenceId: "order-12345",
                    note: "Online purchase - Widget Pro",
                    receiptNumber: "RCPT-1234",
                    receiptUrl: "https://squareup.com/receipt/preview/PAY_sq1a2b3c4d5e6f",
                    createdAt: "2024-06-15T14:30:00Z",
                    updatedAt: "2024-06-15T14:30:05Z"
                }
            },
            {
                name: "pending_payment",
                description: "Get details of a pending payment",
                input: {
                    payment_id: "PAY_pending123456"
                },
                expectedOutput: {
                    id: "PAY_pending123456",
                    amountMoney: { amount: 10000, currency: "USD" },
                    status: "PENDING",
                    sourceType: "BANK_ACCOUNT",
                    locationId: "LOC_MAIN_STORE",
                    createdAt: "2024-06-15T10:00:00Z",
                    updatedAt: "2024-06-15T10:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Payment does not exist",
                input: {
                    payment_id: "PAY_nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "NOT_FOUND: Payment with ID PAY_nonexistent123 was not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    payment_id: "PAY_sq1a2b3c4d5e6f"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listPayments",
        provider: "square",
        filterableData: {
            records: samplePayments,
            recordsField: "payments",
            offsetField: "cursor",
            defaultPageSize: 10,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["_status", "_sourceType", "locationId"]
            }
        },
        validCases: [
            {
                name: "list_all_payments",
                description: "List recent payments",
                input: {
                    limit: 10,
                    sort_order: "DESC"
                }
            },
            {
                name: "list_by_location",
                description: "List payments for a specific location",
                input: {
                    location_id: "LOC_MAIN_STORE",
                    limit: 10
                }
            },
            {
                name: "list_by_date_range",
                description: "List payments within a date range",
                input: {
                    begin_time: "2024-06-01T00:00:00Z",
                    end_time: "2024-06-30T23:59:59Z",
                    limit: 25
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_limit",
                description: "Limit exceeds maximum allowed value",
                input: {
                    limit: 200
                },
                expectedError: {
                    type: "validation",
                    message: "BAD_REQUEST: limit must be between 1 and 100",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    limit: 10
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "completePayment",
        provider: "square",
        validCases: [
            {
                name: "complete_delayed_payment",
                description: "Complete a payment that was created with delayed capture",
                input: {
                    payment_id: "PAY_approved123456"
                },
                expectedOutput: {
                    id: "PAY_approved123456",
                    amountMoney: { amount: 7500, currency: "USD" },
                    status: "COMPLETED",
                    locationId: "LOC_MAIN_STORE",
                    createdAt: "2024-06-15T12:00:00Z",
                    updatedAt: "2024-06-15T14:00:00Z"
                }
            },
            {
                name: "complete_tip_payment",
                description: "Complete a payment after tip adjustment",
                input: {
                    payment_id: "PAY_withtip789012"
                },
                expectedOutput: {
                    id: "PAY_withtip789012",
                    amountMoney: { amount: 3250, currency: "USD" },
                    status: "COMPLETED",
                    locationId: "LOC_DOWNTOWN",
                    createdAt: "2024-06-15T18:30:00Z",
                    updatedAt: "2024-06-15T19:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Payment does not exist",
                input: {
                    payment_id: "PAY_nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "NOT_FOUND: Payment with ID PAY_nonexistent123 was not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    payment_id: "PAY_approved123456"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // CUSTOMERS
    // ============================================================================
    {
        operationId: "createCustomer",
        provider: "square",
        validCases: [
            {
                name: "full_customer",
                description: "Create a customer with all details",
                input: {
                    given_name: "John",
                    family_name: "Smith",
                    email_address: "john.smith@example.com",
                    phone_number: "+1-555-123-4567",
                    reference_id: "ext-cust-001",
                    note: "VIP customer - priority support"
                },
                expectedOutput: {
                    id: "CUST_ABC123DEF456",
                    givenName: "John",
                    familyName: "Smith",
                    emailAddress: "john.smith@example.com",
                    phoneNumber: "+1-555-123-4567",
                    referenceId: "ext-cust-001",
                    note: "VIP customer - priority support",
                    createdAt: "2024-01-15T10:30:00Z",
                    updatedAt: "2024-01-15T10:30:00Z"
                }
            },
            {
                name: "business_customer",
                description: "Create a business customer",
                input: {
                    company_name: "Acme Corp",
                    given_name: "Jane",
                    family_name: "Doe",
                    email_address: "jane.doe@acme.com",
                    phone_number: "+1-555-987-6543"
                },
                expectedOutput: {
                    id: "CUST_GHI789JKL012",
                    givenName: "Jane",
                    familyName: "Doe",
                    companyName: "Acme Corp",
                    emailAddress: "jane.doe@acme.com",
                    phoneNumber: "+1-555-987-6543",
                    createdAt: "2024-02-20T14:45:00Z",
                    updatedAt: "2024-02-20T14:45:00Z"
                }
            },
            {
                name: "minimal_customer",
                description: "Create a customer with minimal information",
                input: {
                    given_name: "Bob",
                    email_address: "bob@example.com"
                },
                expectedOutput: {
                    id: "CUST_MNO345PQR678",
                    givenName: "Bob",
                    emailAddress: "bob@example.com",
                    createdAt: "2024-03-10T09:15:00Z",
                    updatedAt: "2024-03-10T09:15:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_email",
                description: "Email address is invalid",
                input: {
                    given_name: "Test",
                    email_address: "invalid-email"
                },
                expectedError: {
                    type: "validation",
                    message: "BAD_REQUEST: email_address is not a valid email address",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    given_name: "Test",
                    email_address: "test@example.com"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getCustomer",
        provider: "square",
        validCases: [
            {
                name: "existing_customer",
                description: "Get details of an existing customer",
                input: {
                    customer_id: "CUST_ABC123DEF456"
                },
                expectedOutput: {
                    id: "CUST_ABC123DEF456",
                    givenName: "John",
                    familyName: "Smith",
                    emailAddress: "john.smith@example.com",
                    phoneNumber: "+1-555-123-4567",
                    referenceId: "ext-cust-001",
                    note: "VIP customer - priority support",
                    createdAt: "2024-01-15T10:30:00Z",
                    updatedAt: "2024-01-15T10:30:00Z"
                }
            },
            {
                name: "business_customer",
                description: "Get details of a business customer",
                input: {
                    customer_id: "CUST_GHI789JKL012"
                },
                expectedOutput: {
                    id: "CUST_GHI789JKL012",
                    givenName: "Jane",
                    familyName: "Doe",
                    companyName: "Acme Corp",
                    emailAddress: "jane.doe@acme.com",
                    phoneNumber: "+1-555-987-6543",
                    referenceId: "ext-cust-002",
                    createdAt: "2024-02-20T14:45:00Z",
                    updatedAt: "2024-02-20T14:45:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Customer does not exist",
                input: {
                    customer_id: "CUST_nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "NOT_FOUND: Customer with ID CUST_nonexistent123 was not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    customer_id: "CUST_ABC123DEF456"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listCustomers",
        provider: "square",
        filterableData: {
            records: sampleCustomers,
            recordsField: "customers",
            offsetField: "cursor",
            defaultPageSize: 10,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["_hasEmail", "_hasPhone"]
            }
        },
        validCases: [
            {
                name: "list_all_customers",
                description: "List all customers",
                input: {
                    limit: 10,
                    sort_order: "ASC"
                }
            },
            {
                name: "list_by_creation_date",
                description: "List customers sorted by creation date",
                input: {
                    sort_field: "CREATED_AT",
                    sort_order: "DESC",
                    limit: 25
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_limit",
                description: "Limit exceeds maximum allowed value",
                input: {
                    limit: 200
                },
                expectedError: {
                    type: "validation",
                    message: "BAD_REQUEST: limit must be between 1 and 100",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    limit: 10
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateCustomer",
        provider: "square",
        validCases: [
            {
                name: "update_contact_info",
                description: "Update customer contact information",
                input: {
                    customer_id: "CUST_ABC123DEF456",
                    email_address: "john.smith.new@example.com",
                    phone_number: "+1-555-999-8888"
                },
                expectedOutput: {
                    id: "CUST_ABC123DEF456",
                    givenName: "John",
                    familyName: "Smith",
                    emailAddress: "john.smith.new@example.com",
                    phoneNumber: "+1-555-999-8888",
                    referenceId: "ext-cust-001",
                    note: "VIP customer - priority support",
                    createdAt: "2024-01-15T10:30:00Z",
                    updatedAt: "2024-06-15T12:00:00Z"
                }
            },
            {
                name: "update_name",
                description: "Update customer name",
                input: {
                    customer_id: "CUST_GHI789JKL012",
                    given_name: "Janet",
                    family_name: "Smith-Doe"
                },
                expectedOutput: {
                    id: "CUST_GHI789JKL012",
                    givenName: "Janet",
                    familyName: "Smith-Doe",
                    companyName: "Acme Corp",
                    emailAddress: "jane.doe@acme.com",
                    phoneNumber: "+1-555-987-6543",
                    createdAt: "2024-02-20T14:45:00Z",
                    updatedAt: "2024-06-15T14:30:00Z"
                }
            },
            {
                name: "add_note",
                description: "Add a note to customer profile",
                input: {
                    customer_id: "CUST_MNO345PQR678",
                    note: "Prefers email contact only"
                },
                expectedOutput: {
                    id: "CUST_MNO345PQR678",
                    givenName: "Bob",
                    familyName: "Wilson",
                    emailAddress: "bob.wilson@example.com",
                    note: "Prefers email contact only",
                    createdAt: "2024-03-10T09:15:00Z",
                    updatedAt: "2024-06-15T16:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Customer does not exist",
                input: {
                    customer_id: "CUST_nonexistent123",
                    given_name: "Test"
                },
                expectedError: {
                    type: "not_found",
                    message: "NOT_FOUND: Customer with ID CUST_nonexistent123 was not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    customer_id: "CUST_ABC123DEF456",
                    note: "Updated note"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // REFUNDS
    // ============================================================================
    {
        operationId: "createRefund",
        provider: "square",
        validCases: [
            {
                name: "full_refund",
                description: "Create a full refund for a payment",
                input: {
                    payment_id: "PAY_sq1a2b3c4d5e6f",
                    idempotency_key: "refund-001-abc123",
                    amount_money: {
                        amount: 2500,
                        currency: "USD"
                    },
                    reason: "Customer returned item"
                },
                expectedOutput: {
                    id: "REF_xyz789abc012",
                    paymentId: "PAY_sq1a2b3c4d5e6f",
                    amountMoney: { amount: 2500, currency: "USD" },
                    status: "PENDING",
                    locationId: "LOC_MAIN_STORE",
                    reason: "Customer returned item",
                    createdAt: "2024-06-16T10:00:00Z",
                    updatedAt: "2024-06-16T10:00:00Z"
                }
            },
            {
                name: "partial_refund",
                description: "Create a partial refund",
                input: {
                    payment_id: "PAY_gh7i8j9k0l1m2n",
                    idempotency_key: "refund-002-def456",
                    amount_money: {
                        amount: 3000,
                        currency: "USD"
                    },
                    reason: "Partial return - damaged item"
                },
                expectedOutput: {
                    id: "REF_def456ghi789",
                    paymentId: "PAY_gh7i8j9k0l1m2n",
                    amountMoney: { amount: 3000, currency: "USD" },
                    status: "PENDING",
                    locationId: "LOC_MAIN_STORE",
                    reason: "Partial return - damaged item",
                    createdAt: "2024-06-16T11:30:00Z",
                    updatedAt: "2024-06-16T11:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Payment to refund does not exist",
                input: {
                    payment_id: "PAY_nonexistent123",
                    idempotency_key: "refund-003-ghi789",
                    amount_money: { amount: 1000, currency: "USD" }
                },
                expectedError: {
                    type: "not_found",
                    message: "NOT_FOUND: Payment with ID PAY_nonexistent123 was not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    payment_id: "PAY_sq1a2b3c4d5e6f",
                    idempotency_key: "refund-004-jkl012",
                    amount_money: { amount: 1000, currency: "USD" }
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getRefund",
        provider: "square",
        validCases: [
            {
                name: "pending_refund",
                description: "Get details of a pending refund",
                input: {
                    refund_id: "REF_xyz789abc012"
                },
                expectedOutput: {
                    id: "REF_xyz789abc012",
                    paymentId: "PAY_sq1a2b3c4d5e6f",
                    amountMoney: { amount: 2500, currency: "USD" },
                    status: "PENDING",
                    locationId: "LOC_MAIN_STORE",
                    reason: "Customer returned item",
                    createdAt: "2024-06-16T10:00:00Z",
                    updatedAt: "2024-06-16T10:00:00Z"
                }
            },
            {
                name: "approved_refund",
                description: "Get details of an approved refund",
                input: {
                    refund_id: "REF_approved456"
                },
                expectedOutput: {
                    id: "REF_approved456",
                    paymentId: "PAY_gh7i8j9k0l1m2n",
                    amountMoney: { amount: 3000, currency: "USD" },
                    status: "APPROVED",
                    locationId: "LOC_MAIN_STORE",
                    reason: "Partial return",
                    createdAt: "2024-06-15T14:00:00Z",
                    updatedAt: "2024-06-15T16:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Refund does not exist",
                input: {
                    refund_id: "REF_nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "NOT_FOUND: Refund with ID REF_nonexistent123 was not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    refund_id: "REF_xyz789abc012"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listRefunds",
        provider: "square",
        validCases: [
            {
                name: "list_all_refunds",
                description: "List recent refunds",
                input: {
                    limit: 10,
                    sort_order: "DESC"
                },
                expectedOutput: {
                    refunds: [
                        {
                            id: "REF_xyz789abc012",
                            paymentId: "PAY_sq1a2b3c4d5e6f",
                            amountMoney: { amount: 2500, currency: "USD" },
                            status: "PENDING",
                            locationId: "LOC_MAIN_STORE",
                            reason: "Customer returned item",
                            createdAt: "2024-06-16T10:00:00Z"
                        },
                        {
                            id: "REF_def456ghi789",
                            paymentId: "PAY_gh7i8j9k0l1m2n",
                            amountMoney: { amount: 3000, currency: "USD" },
                            status: "APPROVED",
                            locationId: "LOC_MAIN_STORE",
                            reason: "Partial return - damaged item",
                            createdAt: "2024-06-15T14:00:00Z"
                        }
                    ]
                }
            },
            {
                name: "list_by_location",
                description: "List refunds for a specific location",
                input: {
                    location_id: "LOC_DOWNTOWN",
                    limit: 10
                },
                expectedOutput: {
                    refunds: [
                        {
                            id: "REF_downtown001",
                            paymentId: "PAY_downtown789",
                            amountMoney: { amount: 1500, currency: "USD" },
                            status: "APPROVED",
                            locationId: "LOC_DOWNTOWN",
                            reason: "Wrong size",
                            createdAt: "2024-06-14T09:00:00Z"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_limit",
                description: "Limit exceeds maximum allowed value",
                input: {
                    limit: 200
                },
                expectedError: {
                    type: "validation",
                    message: "BAD_REQUEST: limit must be between 1 and 100",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    limit: 10
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // ORDERS
    // ============================================================================
    {
        operationId: "getOrder",
        provider: "square",
        validCases: [
            {
                name: "completed_order",
                description: "Get details of a completed order",
                input: {
                    order_id: "ORD_abc123def456"
                },
                expectedOutput: {
                    id: "ORD_abc123def456",
                    locationId: "LOC_MAIN_STORE",
                    referenceId: "web-order-789",
                    state: "COMPLETED",
                    totalMoney: { amount: 5750, currency: "USD" },
                    totalTaxMoney: { amount: 475, currency: "USD" },
                    totalDiscountMoney: { amount: 500, currency: "USD" },
                    createdAt: "2024-06-15T09:00:00Z",
                    updatedAt: "2024-06-15T10:30:00Z"
                }
            },
            {
                name: "open_order",
                description: "Get details of an open order",
                input: {
                    order_id: "ORD_open789012"
                },
                expectedOutput: {
                    id: "ORD_open789012",
                    locationId: "LOC_DOWNTOWN",
                    state: "OPEN",
                    totalMoney: { amount: 3250, currency: "USD" },
                    totalTaxMoney: { amount: 250, currency: "USD" },
                    createdAt: "2024-06-16T11:00:00Z",
                    updatedAt: "2024-06-16T11:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Order does not exist",
                input: {
                    order_id: "ORD_nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "NOT_FOUND: Order with ID ORD_nonexistent123 was not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    order_id: "ORD_abc123def456"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    }
];
