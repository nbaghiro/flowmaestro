/**
 * Stripe Provider Test Fixtures
 *
 * Based on official Stripe API documentation:
 * - Create PaymentIntent: https://docs.stripe.com/api/payment_intents/create
 * - PaymentIntent Object: https://docs.stripe.com/api/payment_intents/object
 */

import type { TestFixture } from "../../../sandbox";

export const stripeFixtures: TestFixture[] = [
    {
        operationId: "createPaymentIntent",
        provider: "stripe",
        validCases: [
            {
                name: "simple_payment",
                description: "Create a simple payment intent",
                input: {
                    amount: 2000,
                    currency: "usd"
                },
                // Normalized output matching executeCreatePaymentIntent return format
                expectedOutput: {
                    id: "pi_3MtwBwLkdIwHu7ix28a3tqPa",
                    amount: 2000,
                    currency: "usd",
                    status: "requires_payment_method",
                    clientSecret: "pi_3MtwBwLkdIwHu7ix28a3tqPa_secret_YrKJUKribcBjcG8HVhfZluoGH",
                    customer: null,
                    description: null,
                    metadata: {},
                    paymentMethod: null,
                    receiptEmail: null,
                    created: "{{timestamp}}",
                    livemode: false
                }
            },
            {
                name: "payment_with_customer",
                description: "Create payment intent with customer and metadata",
                input: {
                    amount: 5000,
                    currency: "eur",
                    customer: "cus_ABC123",
                    description: "Premium subscription",
                    metadata: {
                        orderId: "order-123",
                        productName: "Premium Plan"
                    }
                },
                // Normalized output matching executeCreatePaymentIntent return format
                expectedOutput: {
                    id: "pi_3MtwBwLkdIwHu7ix28a3tqPb",
                    amount: 5000,
                    currency: "eur",
                    status: "requires_payment_method",
                    clientSecret: "pi_3MtwBwLkdIwHu7ix28a3tqPb_secret_abc123def456",
                    customer: "cus_ABC123",
                    description: "Premium subscription",
                    metadata: {
                        orderId: "order-123",
                        productName: "Premium Plan"
                    },
                    paymentMethod: null,
                    receiptEmail: null,
                    created: "{{timestamp}}",
                    livemode: false
                }
            },
            {
                name: "payment_with_automatic_confirmation",
                description: "Create payment intent with automatic confirmation",
                input: {
                    amount: 1500,
                    currency: "gbp",
                    payment_method: "pm_card_visa",
                    confirm: true
                },
                // Normalized output matching executeCreatePaymentIntent return format
                expectedOutput: {
                    id: "pi_3MtwBwLkdIwHu7ix28a3tqPc",
                    amount: 1500,
                    currency: "gbp",
                    status: "succeeded",
                    clientSecret: "pi_3MtwBwLkdIwHu7ix28a3tqPc_secret_xyz789",
                    customer: null,
                    description: null,
                    metadata: {},
                    paymentMethod: "pm_card_visa",
                    receiptEmail: null,
                    created: "{{timestamp}}",
                    livemode: false
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_amount",
                description: "Amount below minimum",
                input: {
                    amount: 10,
                    currency: "usd"
                },
                expectedError: {
                    type: "validation",
                    message: "Amount must be at least $0.50 usd",
                    retryable: false
                }
            },
            {
                name: "invalid_currency",
                description: "Unsupported currency code",
                input: {
                    amount: 2000,
                    currency: "xyz"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Invalid currency: xyz. Stripe currently supports these currencies: usd, eur, gbp, ...",
                    retryable: false
                }
            },
            {
                name: "customer_not_found",
                description: "Customer does not exist",
                input: {
                    amount: 2000,
                    currency: "usd",
                    customer: "cus_nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "No such customer: 'cus_nonexistent'",
                    retryable: false
                }
            },
            {
                name: "api_key_invalid",
                description: "Invalid API key",
                input: {
                    amount: 2000,
                    currency: "usd"
                },
                expectedError: {
                    type: "permission",
                    message: "Invalid API Key provided: sk_test_****invalid",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Too many requests",
                input: {
                    amount: 2000,
                    currency: "usd"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after some time.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createCustomer",
        provider: "stripe",
        validCases: [
            {
                name: "simple_customer",
                description: "Create a customer with email",
                input: {
                    email: "jenny.rosen@example.com"
                },
                expectedOutput: {
                    id: "cus_NffrFeUfNV2Hib",
                    object: "customer",
                    address: null,
                    balance: 0,
                    created: "{{timestamp}}",
                    currency: null,
                    default_source: null,
                    delinquent: false,
                    description: null,
                    discount: null,
                    email: "jenny.rosen@example.com",
                    invoice_prefix: "7B51FAC",
                    invoice_settings: {
                        custom_fields: null,
                        default_payment_method: null,
                        footer: null,
                        rendering_options: null
                    },
                    livemode: false,
                    metadata: {},
                    name: null,
                    next_invoice_sequence: 1,
                    phone: null,
                    preferred_locales: [],
                    shipping: null,
                    tax_exempt: "none",
                    test_clock: null
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_email",
                description: "Invalid email format",
                input: {
                    email: "not-an-email"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email address: not-an-email",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Too many requests",
                input: {
                    email: "test@example.com"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after some time.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listCustomers",
        provider: "stripe",
        validCases: [
            {
                name: "list_all_customers",
                description: "List customers with pagination",
                input: {
                    limit: 10
                },
                expectedOutput: {
                    object: "list",
                    url: "/v1/customers",
                    has_more: true,
                    data: [
                        {
                            id: "cus_NffrFeUfNV2Hib",
                            object: "customer",
                            address: null,
                            balance: 0,
                            created: 1680893993,
                            currency: null,
                            default_source: null,
                            delinquent: false,
                            description: null,
                            discount: null,
                            email: "jenny.rosen@example.com",
                            invoice_prefix: "7B51FAC",
                            invoice_settings: {
                                custom_fields: null,
                                default_payment_method: null,
                                footer: null,
                                rendering_options: null
                            },
                            livemode: false,
                            metadata: {},
                            name: "Jenny Rosen",
                            phone: null,
                            preferred_locales: [],
                            shipping: null,
                            tax_exempt: "none",
                            test_clock: null
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_api_key",
                description: "Invalid API key",
                input: {
                    limit: 10
                },
                expectedError: {
                    type: "permission",
                    message: "Invalid API Key provided",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Too many requests",
                input: {
                    limit: 100
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after some time.",
                    retryable: true
                }
            }
        ]
    }
];
