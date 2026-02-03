/**
 * PayPal Provider Test Fixtures
 *
 * Based on PayPal API documentation:
 * - Orders API: https://developer.paypal.com/docs/api/orders/v2/
 * - Payments API: https://developer.paypal.com/docs/api/payments/v2/
 * - Invoicing API: https://developer.paypal.com/docs/api/invoicing/v2/
 * - Payouts API: https://developer.paypal.com/docs/api/payments.payouts-batch/v1/
 * - Transaction Search: https://developer.paypal.com/docs/api/transaction-search/v1/
 */

import type { TestFixture } from "../../../sandbox";

/**
 * Sample transactions for filterableData
 */
const sampleTransactions = [
    {
        transactionId: "TXN_5YK12345678901234",
        eventCode: "T0006",
        initiationDate: "2024-06-15T14:30:00Z",
        updatedDate: "2024-06-15T14:30:05Z",
        amount: { currency_code: "USD", value: "150.00" },
        fee: { currency_code: "USD", value: "-4.65" },
        status: "S",
        subject: "Payment for Widget Pro",
        payerEmail: "buyer@example.com",
        _status: "S",
        _eventCode: "T0006"
    },
    {
        transactionId: "TXN_9AB98765432109876",
        eventCode: "T0006",
        initiationDate: "2024-06-14T11:20:00Z",
        updatedDate: "2024-06-14T11:20:03Z",
        amount: { currency_code: "USD", value: "75.50" },
        fee: { currency_code: "USD", value: "-2.49" },
        status: "S",
        subject: "Monthly subscription",
        payerEmail: "subscriber@example.com",
        _status: "S",
        _eventCode: "T0006"
    },
    {
        transactionId: "TXN_3CD45678901234567",
        eventCode: "T1107",
        initiationDate: "2024-06-13T09:15:00Z",
        updatedDate: "2024-06-13T09:15:02Z",
        amount: { currency_code: "USD", value: "-50.00" },
        status: "S",
        subject: "Refund for order #12345",
        payerEmail: "buyer@example.com",
        _status: "S",
        _eventCode: "T1107"
    }
];

export const paypalFixtures: TestFixture[] = [
    // ============================================================================
    // ORDERS
    // ============================================================================
    {
        operationId: "createOrder",
        provider: "paypal",
        validCases: [
            {
                name: "simple_capture_order",
                description: "Create a simple capture order",
                input: {
                    intent: "CAPTURE",
                    purchase_units: [
                        {
                            reference_id: "order-ref-001",
                            amount: {
                                currency_code: "USD",
                                value: "100.00"
                            },
                            description: "Widget Pro purchase"
                        }
                    ]
                },
                expectedOutput: {
                    id: "5O190127TN364715T",
                    status: "CREATED",
                    intent: "CAPTURE",
                    purchaseUnits: [
                        {
                            referenceId: "order-ref-001",
                            amount: { currency_code: "USD", value: "100.00" },
                            description: "Widget Pro purchase"
                        }
                    ],
                    createTime: "2024-06-15T14:30:00Z",
                    links: [
                        {
                            href: "https://api-m.paypal.com/v2/checkout/orders/5O190127TN364715T",
                            rel: "self",
                            method: "GET"
                        },
                        {
                            href: "https://www.paypal.com/checkoutnow?token=5O190127TN364715T",
                            rel: "approve",
                            method: "GET"
                        }
                    ]
                }
            },
            {
                name: "order_with_context",
                description: "Create an order with application context for redirect URLs",
                input: {
                    intent: "CAPTURE",
                    purchase_units: [
                        {
                            amount: {
                                currency_code: "EUR",
                                value: "250.00"
                            },
                            description: "Premium Plan"
                        }
                    ],
                    application_context: {
                        brand_name: "My Store",
                        return_url: "https://example.com/success",
                        cancel_url: "https://example.com/cancel"
                    }
                },
                expectedOutput: {
                    id: "8RH41234AB567890C",
                    status: "CREATED",
                    intent: "CAPTURE",
                    purchaseUnits: [
                        {
                            amount: { currency_code: "EUR", value: "250.00" },
                            description: "Premium Plan"
                        }
                    ],
                    createTime: "2024-06-15T15:00:00Z",
                    links: [
                        {
                            href: "https://api-m.paypal.com/v2/checkout/orders/8RH41234AB567890C",
                            rel: "self",
                            method: "GET"
                        },
                        {
                            href: "https://www.paypal.com/checkoutnow?token=8RH41234AB567890C",
                            rel: "approve",
                            method: "GET"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_currency",
                description: "Invalid currency code",
                input: {
                    intent: "CAPTURE",
                    purchase_units: [
                        {
                            amount: {
                                currency_code: "INVALID",
                                value: "100.00"
                            }
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "INVALID_CURRENCY_CODE: Currency code is invalid or not supported",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    intent: "CAPTURE",
                    purchase_units: [
                        {
                            amount: { currency_code: "USD", value: "10.00" }
                        }
                    ]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by PayPal. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getOrder",
        provider: "paypal",
        validCases: [
            {
                name: "created_order",
                description: "Get details of a created order",
                input: {
                    order_id: "5O190127TN364715T"
                },
                expectedOutput: {
                    id: "5O190127TN364715T",
                    status: "CREATED",
                    intent: "CAPTURE",
                    purchaseUnits: [
                        {
                            referenceId: "order-ref-001",
                            amount: { currency_code: "USD", value: "100.00" },
                            description: "Widget Pro purchase"
                        }
                    ],
                    createTime: "2024-06-15T14:30:00Z",
                    links: [
                        {
                            href: "https://api-m.paypal.com/v2/checkout/orders/5O190127TN364715T",
                            rel: "self",
                            method: "GET"
                        }
                    ]
                }
            },
            {
                name: "completed_order",
                description: "Get details of a completed order with capture info",
                input: {
                    order_id: "2GK89012CD345678E"
                },
                expectedOutput: {
                    id: "2GK89012CD345678E",
                    status: "COMPLETED",
                    intent: "CAPTURE",
                    purchaseUnits: [
                        {
                            amount: { currency_code: "USD", value: "75.50" },
                            captures: [
                                {
                                    id: "CAP_1AB23456CD789012E",
                                    status: "COMPLETED",
                                    amount: { currency_code: "USD", value: "75.50" },
                                    createTime: "2024-06-14T11:25:00Z"
                                }
                            ]
                        }
                    ],
                    payer: {
                        email: "buyer@example.com",
                        payerId: "PAYER_ABC123",
                        name: { given_name: "John", surname: "Smith" }
                    },
                    createTime: "2024-06-14T11:20:00Z",
                    updateTime: "2024-06-14T11:25:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Order does not exist",
                input: {
                    order_id: "NONEXISTENT123"
                },
                expectedError: {
                    type: "not_found",
                    message: "RESOURCE_NOT_FOUND: Order NONEXISTENT123 was not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    order_id: "5O190127TN364715T"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by PayPal. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "captureOrder",
        provider: "paypal",
        validCases: [
            {
                name: "capture_approved_order",
                description: "Capture payment for an approved order",
                input: {
                    order_id: "5O190127TN364715T"
                },
                expectedOutput: {
                    id: "5O190127TN364715T",
                    status: "COMPLETED",
                    payer: {
                        email: "buyer@example.com",
                        payerId: "PAYER_ABC123",
                        name: { given_name: "John", surname: "Smith" }
                    },
                    captures: [
                        {
                            id: "CAP_2AB34567EF890123G",
                            status: "COMPLETED",
                            amount: { currency_code: "USD", value: "100.00" },
                            createTime: "2024-06-15T14:35:00Z"
                        }
                    ],
                    createTime: "2024-06-15T14:30:00Z",
                    updateTime: "2024-06-15T14:35:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_approved",
                description: "Order has not been approved by buyer",
                input: {
                    order_id: "UNAPPROVED123"
                },
                expectedError: {
                    type: "validation",
                    message: "ORDER_NOT_APPROVED: Payer has not yet approved the order",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    order_id: "5O190127TN364715T"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by PayPal. Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // REFUNDS
    // ============================================================================
    {
        operationId: "refundPayment",
        provider: "paypal",
        validCases: [
            {
                name: "full_refund",
                description: "Full refund of a captured payment",
                input: {
                    capture_id: "CAP_2AB34567EF890123G"
                },
                expectedOutput: {
                    id: "REF_1XY23456AB789012C",
                    status: "COMPLETED",
                    amount: { currency_code: "USD", value: "100.00" },
                    createTime: "2024-06-16T10:00:00Z",
                    updateTime: "2024-06-16T10:00:05Z",
                    links: [
                        {
                            href: "https://api-m.paypal.com/v2/payments/refunds/REF_1XY23456AB789012C",
                            rel: "self",
                            method: "GET"
                        }
                    ]
                }
            },
            {
                name: "partial_refund",
                description: "Partial refund with note to payer",
                input: {
                    capture_id: "CAP_1AB23456CD789012E",
                    amount: {
                        currency_code: "USD",
                        value: "25.00"
                    },
                    note_to_payer: "Partial refund for returned item"
                },
                expectedOutput: {
                    id: "REF_3CD45678EF012345G",
                    status: "COMPLETED",
                    amount: { currency_code: "USD", value: "25.00" },
                    noteToPayer: "Partial refund for returned item",
                    createTime: "2024-06-16T11:30:00Z",
                    updateTime: "2024-06-16T11:30:03Z",
                    links: [
                        {
                            href: "https://api-m.paypal.com/v2/payments/refunds/REF_3CD45678EF012345G",
                            rel: "self",
                            method: "GET"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "already_refunded",
                description: "Capture has already been fully refunded",
                input: {
                    capture_id: "CAP_ALREADY_REFUNDED"
                },
                expectedError: {
                    type: "validation",
                    message: "CAPTURE_FULLY_REFUNDED: The capture has already been fully refunded",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    capture_id: "CAP_2AB34567EF890123G"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by PayPal. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getRefund",
        provider: "paypal",
        validCases: [
            {
                name: "completed_refund",
                description: "Get details of a completed refund",
                input: {
                    refund_id: "REF_1XY23456AB789012C"
                },
                expectedOutput: {
                    id: "REF_1XY23456AB789012C",
                    status: "COMPLETED",
                    amount: { currency_code: "USD", value: "100.00" },
                    createTime: "2024-06-16T10:00:00Z",
                    updateTime: "2024-06-16T10:00:05Z",
                    links: [
                        {
                            href: "https://api-m.paypal.com/v2/payments/refunds/REF_1XY23456AB789012C",
                            rel: "self",
                            method: "GET"
                        }
                    ]
                }
            },
            {
                name: "pending_refund",
                description: "Get details of a pending refund",
                input: {
                    refund_id: "REF_PENDING456"
                },
                expectedOutput: {
                    id: "REF_PENDING456",
                    status: "PENDING",
                    amount: { currency_code: "USD", value: "50.00" },
                    noteToPayer: "Processing your refund",
                    createTime: "2024-06-16T12:00:00Z",
                    updateTime: "2024-06-16T12:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Refund does not exist",
                input: {
                    refund_id: "REF_NONEXISTENT"
                },
                expectedError: {
                    type: "not_found",
                    message: "RESOURCE_NOT_FOUND: Refund REF_NONEXISTENT was not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    refund_id: "REF_1XY23456AB789012C"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by PayPal. Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // TRANSACTIONS
    // ============================================================================
    {
        operationId: "searchTransactions",
        provider: "paypal",
        filterableData: {
            records: sampleTransactions,
            recordsField: "transactions",
            offsetField: "page",
            defaultPageSize: 100,
            maxPageSize: 500,
            pageSizeParam: "page_size",
            filterConfig: {
                type: "generic",
                filterableFields: ["_status", "_eventCode"]
            }
        },
        validCases: [
            {
                name: "search_by_date_range",
                description: "Search transactions within a date range",
                input: {
                    start_date: "2024-06-01T00:00:00Z",
                    end_date: "2024-06-30T23:59:59Z",
                    page_size: 100,
                    page: 1
                }
            },
            {
                name: "search_successful_only",
                description: "Search for successful transactions only",
                input: {
                    start_date: "2024-06-01T00:00:00Z",
                    end_date: "2024-06-30T23:59:59Z",
                    transaction_status: "S",
                    page_size: 50
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_date_range",
                description: "Date range exceeds 31 days",
                input: {
                    start_date: "2024-01-01T00:00:00Z",
                    end_date: "2024-12-31T23:59:59Z"
                },
                expectedError: {
                    type: "validation",
                    message: "INVALID_REQUEST: Date range cannot exceed 31 days",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    start_date: "2024-06-01T00:00:00Z",
                    end_date: "2024-06-30T23:59:59Z"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by PayPal. Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // INVOICING
    // ============================================================================
    {
        operationId: "createInvoice",
        provider: "paypal",
        validCases: [
            {
                name: "simple_invoice",
                description: "Create a simple invoice with one item",
                input: {
                    detail: {
                        currency_code: "USD",
                        invoice_number: "INV-2024-001",
                        invoice_date: "2024-06-15",
                        note: "Thank you for your business",
                        payment_term: {
                            due_date: "2024-07-15"
                        }
                    },
                    primary_recipients: [
                        {
                            billing_info: {
                                email_address: "customer@example.com",
                                name: {
                                    given_name: "John",
                                    surname: "Smith"
                                }
                            }
                        }
                    ],
                    items: [
                        {
                            name: "Consulting Services",
                            description: "June 2024 consulting",
                            quantity: "10",
                            unit_amount: {
                                currency_code: "USD",
                                value: "150.00"
                            }
                        }
                    ]
                },
                expectedOutput: {
                    id: "INV2-ABCD-1234-EFGH-5678",
                    status: "DRAFT",
                    detail: {
                        invoice_number: "INV-2024-001",
                        invoice_date: "2024-06-15",
                        currency_code: "USD",
                        note: "Thank you for your business",
                        payment_term: { due_date: "2024-07-15" }
                    },
                    amount: {
                        currency_code: "USD",
                        value: "1500.00"
                    }
                }
            },
            {
                name: "multi_item_invoice",
                description: "Create an invoice with multiple line items",
                input: {
                    detail: {
                        currency_code: "USD",
                        invoice_number: "INV-2024-002"
                    },
                    primary_recipients: [
                        {
                            billing_info: {
                                email_address: "client@company.com"
                            }
                        }
                    ],
                    items: [
                        {
                            name: "Design Work",
                            quantity: "5",
                            unit_amount: { currency_code: "USD", value: "200.00" }
                        },
                        {
                            name: "Development Work",
                            quantity: "20",
                            unit_amount: { currency_code: "USD", value: "175.00" }
                        }
                    ]
                },
                expectedOutput: {
                    id: "INV2-WXYZ-5678-ABCD-9012",
                    status: "DRAFT",
                    detail: {
                        invoice_number: "INV-2024-002",
                        currency_code: "USD"
                    },
                    amount: {
                        currency_code: "USD",
                        value: "4500.00"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_invoice_number",
                description: "Invoice number already exists",
                input: {
                    detail: {
                        currency_code: "USD",
                        invoice_number: "INV-DUPLICATE"
                    },
                    primary_recipients: [
                        {
                            billing_info: {
                                email_address: "test@example.com"
                            }
                        }
                    ],
                    items: [
                        {
                            name: "Item",
                            quantity: "1",
                            unit_amount: { currency_code: "USD", value: "10.00" }
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message:
                        "DUPLICATE_INVOICE_NUMBER: Invoice number INV-DUPLICATE already exists",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    detail: { currency_code: "USD" },
                    primary_recipients: [{ billing_info: { email_address: "t@t.com" } }],
                    items: [
                        {
                            name: "Item",
                            quantity: "1",
                            unit_amount: { currency_code: "USD", value: "10.00" }
                        }
                    ]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by PayPal. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "sendInvoice",
        provider: "paypal",
        validCases: [
            {
                name: "send_basic",
                description: "Send an invoice with default settings",
                input: {
                    invoice_id: "INV2-ABCD-1234-EFGH-5678"
                },
                expectedOutput: {
                    invoiceId: "INV2-ABCD-1234-EFGH-5678",
                    sent: true
                }
            },
            {
                name: "send_with_custom_message",
                description: "Send an invoice with custom subject and note",
                input: {
                    invoice_id: "INV2-WXYZ-5678-ABCD-9012",
                    subject: "Invoice for June Services",
                    note: "Payment due within 30 days",
                    send_to_invoicer: true
                },
                expectedOutput: {
                    invoiceId: "INV2-WXYZ-5678-ABCD-9012",
                    sent: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Invoice does not exist",
                input: {
                    invoice_id: "INV2-NONEXISTENT"
                },
                expectedError: {
                    type: "not_found",
                    message: "RESOURCE_NOT_FOUND: Invoice INV2-NONEXISTENT was not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    invoice_id: "INV2-ABCD-1234-EFGH-5678"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by PayPal. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getInvoice",
        provider: "paypal",
        validCases: [
            {
                name: "draft_invoice",
                description: "Get details of a draft invoice",
                input: {
                    invoice_id: "INV2-ABCD-1234-EFGH-5678"
                },
                expectedOutput: {
                    id: "INV2-ABCD-1234-EFGH-5678",
                    status: "DRAFT",
                    detail: {
                        invoice_number: "INV-2024-001",
                        invoice_date: "2024-06-15",
                        currency_code: "USD",
                        note: "Thank you for your business",
                        payment_term: { due_date: "2024-07-15" }
                    },
                    amount: {
                        currency_code: "USD",
                        value: "1500.00"
                    }
                }
            },
            {
                name: "paid_invoice",
                description: "Get details of a paid invoice",
                input: {
                    invoice_id: "INV2-PAID-1234-5678-ABCD"
                },
                expectedOutput: {
                    id: "INV2-PAID-1234-5678-ABCD",
                    status: "PAID",
                    detail: {
                        invoice_number: "INV-2024-003",
                        currency_code: "USD"
                    },
                    amount: {
                        currency_code: "USD",
                        value: "500.00"
                    },
                    dueAmount: {
                        currency_code: "USD",
                        value: "0.00"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Invoice does not exist",
                input: {
                    invoice_id: "INV2-NONEXISTENT"
                },
                expectedError: {
                    type: "not_found",
                    message: "RESOURCE_NOT_FOUND: Invoice INV2-NONEXISTENT was not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    invoice_id: "INV2-ABCD-1234-EFGH-5678"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by PayPal. Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // PAYOUTS
    // ============================================================================
    {
        operationId: "createPayout",
        provider: "paypal",
        validCases: [
            {
                name: "single_payout",
                description: "Send a payout to a single recipient",
                input: {
                    sender_batch_header: {
                        sender_batch_id: "batch-2024-06-001",
                        email_subject: "You have a payment!",
                        email_message: "You received a payment from My Store"
                    },
                    items: [
                        {
                            recipient_type: "EMAIL",
                            amount: {
                                currency: "USD",
                                value: "50.00"
                            },
                            receiver: "freelancer@example.com",
                            note: "Payment for June work",
                            sender_item_id: "item-001"
                        }
                    ]
                },
                expectedOutput: {
                    payoutBatchId: "PAYOUT_BATCH_ABC123",
                    batchStatus: "PENDING",
                    senderBatchId: "batch-2024-06-001",
                    links: [
                        {
                            href: "https://api-m.paypal.com/v1/payments/payouts/PAYOUT_BATCH_ABC123",
                            rel: "self",
                            method: "GET"
                        }
                    ]
                }
            },
            {
                name: "multi_recipient_payout",
                description: "Send payouts to multiple recipients",
                input: {
                    sender_batch_header: {
                        sender_batch_id: "batch-2024-06-002",
                        email_subject: "Monthly payment"
                    },
                    items: [
                        {
                            recipient_type: "EMAIL",
                            amount: { currency: "USD", value: "100.00" },
                            receiver: "contractor1@example.com",
                            sender_item_id: "item-001"
                        },
                        {
                            recipient_type: "EMAIL",
                            amount: { currency: "USD", value: "75.00" },
                            receiver: "contractor2@example.com",
                            sender_item_id: "item-002"
                        }
                    ]
                },
                expectedOutput: {
                    payoutBatchId: "PAYOUT_BATCH_DEF456",
                    batchStatus: "PENDING",
                    senderBatchId: "batch-2024-06-002",
                    links: [
                        {
                            href: "https://api-m.paypal.com/v1/payments/payouts/PAYOUT_BATCH_DEF456",
                            rel: "self",
                            method: "GET"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "insufficient_funds",
                description: "Insufficient funds for payout",
                input: {
                    sender_batch_header: {
                        sender_batch_id: "batch-fail-001"
                    },
                    items: [
                        {
                            recipient_type: "EMAIL",
                            amount: { currency: "USD", value: "999999.00" },
                            receiver: "test@example.com"
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "INSUFFICIENT_FUNDS: Sender does not have sufficient funds",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    sender_batch_header: {},
                    items: [
                        {
                            recipient_type: "EMAIL",
                            amount: { currency: "USD", value: "10.00" },
                            receiver: "test@example.com"
                        }
                    ]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by PayPal. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getPayoutDetails",
        provider: "paypal",
        validCases: [
            {
                name: "completed_payout",
                description: "Get details of a completed payout batch",
                input: {
                    payout_batch_id: "PAYOUT_BATCH_ABC123"
                },
                expectedOutput: {
                    payoutBatchId: "PAYOUT_BATCH_ABC123",
                    batchStatus: "SUCCESS",
                    senderBatchId: "batch-2024-06-001",
                    timeCreated: "2024-06-15T14:30:00Z",
                    timeCompleted: "2024-06-15T14:35:00Z",
                    totalAmount: { currency_code: "USD", value: "50.00" },
                    totalFees: { currency_code: "USD", value: "0.25" },
                    items: [
                        {
                            payoutItemId: "ITEM_1ABC234DEF",
                            transactionId: "TXN_PAYOUT_001",
                            transactionStatus: "SUCCESS",
                            fee: { currency_code: "USD", value: "0.25" },
                            recipient: "freelancer@example.com",
                            recipientType: "EMAIL",
                            amount: { currency: "USD", value: "50.00" },
                            note: "Payment for June work",
                            senderItemId: "item-001"
                        }
                    ]
                }
            },
            {
                name: "pending_payout",
                description: "Get details of a pending payout batch",
                input: {
                    payout_batch_id: "PAYOUT_BATCH_DEF456"
                },
                expectedOutput: {
                    payoutBatchId: "PAYOUT_BATCH_DEF456",
                    batchStatus: "PROCESSING",
                    senderBatchId: "batch-2024-06-002",
                    timeCreated: "2024-06-15T15:00:00Z",
                    items: [
                        {
                            payoutItemId: "ITEM_2DEF567GHI",
                            transactionStatus: "PENDING",
                            recipient: "contractor1@example.com",
                            recipientType: "EMAIL",
                            amount: { currency: "USD", value: "100.00" },
                            senderItemId: "item-001"
                        },
                        {
                            payoutItemId: "ITEM_3GHI890JKL",
                            transactionStatus: "PENDING",
                            recipient: "contractor2@example.com",
                            recipientType: "EMAIL",
                            amount: { currency: "USD", value: "75.00" },
                            senderItemId: "item-002"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Payout batch does not exist",
                input: {
                    payout_batch_id: "PAYOUT_NONEXISTENT"
                },
                expectedError: {
                    type: "not_found",
                    message: "RESOURCE_NOT_FOUND: Payout batch PAYOUT_NONEXISTENT was not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    payout_batch_id: "PAYOUT_BATCH_ABC123"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by PayPal. Please try again later.",
                    retryable: true
                }
            }
        ]
    }
];
