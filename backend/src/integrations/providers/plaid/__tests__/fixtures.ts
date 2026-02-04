/**
 * Plaid Provider Test Fixtures
 *
 * Based on official Plaid API documentation:
 * - Accounts: https://plaid.com/docs/api/accounts/
 * - Transactions: https://plaid.com/docs/api/products/transactions/
 * - Institutions: https://plaid.com/docs/api/institutions/
 * - Identity: https://plaid.com/docs/api/products/identity/
 * - Link: https://plaid.com/docs/api/tokens/
 */

import type { TestFixture } from "../../../sandbox";

export const plaidFixtures: TestFixture[] = [
    {
        operationId: "getAccounts",
        provider: "plaid",
        validCases: [
            {
                name: "checking_and_savings",
                description: "Get checking and savings accounts",
                input: {
                    accessToken: "test-plaid-token-placeholder"
                },
                expectedOutput: {
                    accounts: [
                        {
                            accountId: "vzeNDwK7KQIm4yEog683uElbp9GRLEFXGK98D",
                            name: "Plaid Checking",
                            officialName: "Plaid Gold Standard 0% Interest Checking",
                            type: "depository",
                            subtype: "checking",
                            mask: "0000",
                            balances: {
                                available: 100.0,
                                current: 110.0,
                                isoCurrencyCode: "USD"
                            }
                        },
                        {
                            accountId: "6Myq63K1KDSe3lBwp7K1fnEbNGLV4zuSg7ycK",
                            name: "Plaid Saving",
                            officialName: "Plaid Silver Standard 0.1% Interest Saving",
                            type: "depository",
                            subtype: "savings",
                            mask: "1111",
                            balances: {
                                available: 200.0,
                                current: 210.0,
                                isoCurrencyCode: "USD"
                            }
                        },
                        {
                            accountId: "dVzbVMLjrxTnLjX4G66XUp5GLklm4oiZy88yK",
                            name: "Plaid Credit Card",
                            officialName: "Plaid Diamond 12.5% APR Interest Credit Card",
                            type: "credit",
                            subtype: "credit card",
                            mask: "3333",
                            balances: {
                                available: 2000.0,
                                current: 410.0,
                                limit: 2500.0,
                                isoCurrencyCode: "USD"
                            }
                        }
                    ],
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_access_token",
                description: "Access token is invalid or expired",
                input: {
                    accessToken: "test-plaid-invalid-token"
                },
                expectedError: {
                    type: "permission",
                    message:
                        "The access token is invalid or has been revoked. Please re-link your account.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    accessToken: "test-plaid-token-placeholder"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getBalances",
        provider: "plaid",
        validCases: [
            {
                name: "real_time_balances",
                description: "Get real-time balance information",
                input: {
                    accessToken: "test-plaid-token-placeholder"
                },
                expectedOutput: {
                    balances: [
                        {
                            accountId: "vzeNDwK7KQIm4yEog683uElbp9GRLEFXGK98D",
                            name: "Plaid Checking",
                            balances: {
                                available: 100.0,
                                current: 110.0,
                                isoCurrencyCode: "USD"
                            }
                        },
                        {
                            accountId: "6Myq63K1KDSe3lBwp7K1fnEbNGLV4zuSg7ycK",
                            name: "Plaid Saving",
                            balances: {
                                available: 200.0,
                                current: 210.0,
                                isoCurrencyCode: "USD"
                            }
                        }
                    ],
                    count: 2
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_access_token",
                description: "Access token is invalid",
                input: {
                    accessToken: "test-plaid-invalid-token"
                },
                expectedError: {
                    type: "permission",
                    message:
                        "The access token is invalid or has been revoked. Please re-link your account.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    accessToken: "test-plaid-token-placeholder"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getTransactions",
        provider: "plaid",
        validCases: [
            {
                name: "recent_transactions",
                description: "Get recent transactions for a date range",
                input: {
                    accessToken: "test-plaid-token-placeholder",
                    startDate: "2024-01-01",
                    endDate: "2024-01-31"
                },
                expectedOutput: {
                    transactions: [
                        {
                            transactionId: "lPNjeW1nR6CDn5okmGQ6hEpMo4lLNoSrzqDje",
                            accountId: "vzeNDwK7KQIm4yEog683uElbp9GRLEFXGK98D",
                            amount: 12.5,
                            isoCurrencyCode: "USD",
                            date: "2024-01-15",
                            name: "Starbucks",
                            merchantName: "Starbucks",
                            category: ["Food and Drink", "Restaurants", "Coffee Shop"],
                            pending: false,
                            paymentChannel: "in store",
                            location: {
                                city: "San Francisco",
                                region: "CA",
                                postalCode: "94105",
                                country: "US"
                            }
                        },
                        {
                            transactionId: "yhnUVvtcGGcCKU0bcz8PDQr5ZUxUXebUvbKC0",
                            accountId: "vzeNDwK7KQIm4yEog683uElbp9GRLEFXGK98D",
                            amount: 89.99,
                            isoCurrencyCode: "USD",
                            date: "2024-01-12",
                            name: "Amazon Prime",
                            merchantName: "Amazon",
                            category: ["Shops", "Digital Purchase"],
                            pending: false,
                            paymentChannel: "online"
                        },
                        {
                            transactionId: "Bpae23KN4Fgo8AH1jnZR6KGVn1LDxJCaam2dA",
                            accountId: "vzeNDwK7KQIm4yEog683uElbp9GRLEFXGK98D",
                            amount: 2500.0,
                            isoCurrencyCode: "USD",
                            date: "2024-01-10",
                            name: "Direct Deposit - Employer",
                            category: ["Transfer", "Payroll"],
                            pending: false,
                            paymentChannel: "other"
                        }
                    ],
                    count: 3,
                    totalTransactions: 3
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_date_range",
                description: "Start date is after end date",
                input: {
                    accessToken: "test-plaid-token-placeholder",
                    startDate: "2024-01-31",
                    endDate: "2024-01-01"
                },
                expectedError: {
                    type: "validation",
                    message: "Start date must be before end date",
                    retryable: false
                }
            },
            {
                name: "invalid_access_token",
                description: "Access token is invalid",
                input: {
                    accessToken: "test-plaid-invalid-token",
                    startDate: "2024-01-01",
                    endDate: "2024-01-31"
                },
                expectedError: {
                    type: "permission",
                    message:
                        "The access token is invalid or has been revoked. Please re-link your account.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    accessToken: "test-plaid-token-placeholder",
                    startDate: "2024-01-01",
                    endDate: "2024-01-31"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getInstitution",
        provider: "plaid",
        validCases: [
            {
                name: "chase_bank",
                description: "Get details about Chase bank",
                input: {
                    institutionId: "ins_3"
                },
                expectedOutput: {
                    institutionId: "ins_3",
                    name: "Chase",
                    products: ["assets", "auth", "balance", "transactions", "identity", "income"],
                    countryCodes: ["US"],
                    url: "https://www.chase.com",
                    primaryColor: "#0055A5"
                }
            }
        ],
        errorCases: [
            {
                name: "institution_not_found",
                description: "Institution ID does not exist",
                input: {
                    institutionId: "ins_999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Institution with ID 'ins_999999' not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    institutionId: "ins_3"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getIdentity",
        provider: "plaid",
        validCases: [
            {
                name: "account_holder_identity",
                description: "Get identity information for account holders",
                input: {
                    accessToken: "test-plaid-token-placeholder"
                },
                expectedOutput: {
                    identities: [
                        {
                            accountId: "vzeNDwK7KQIm4yEog683uElbp9GRLEFXGK98D",
                            owners: [
                                {
                                    names: ["Alberta Bobbeth Charleson"],
                                    emails: [
                                        {
                                            data: "alberta@example.com",
                                            primary: true,
                                            type: "primary"
                                        }
                                    ],
                                    phoneNumbers: [
                                        {
                                            data: "+1-415-555-0100",
                                            primary: true,
                                            type: "mobile"
                                        }
                                    ],
                                    addresses: [
                                        {
                                            data: {
                                                street: "2992 Cameron Road",
                                                city: "Malverne",
                                                region: "NY",
                                                postalCode: "11565",
                                                country: "US"
                                            },
                                            primary: true
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    count: 1
                }
            }
        ],
        errorCases: [
            {
                name: "product_not_enabled",
                description: "Identity product not enabled for this item",
                input: {
                    accessToken: "test-plaid-no-identity"
                },
                expectedError: {
                    type: "validation",
                    message: "The identity product is not enabled for this item",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    accessToken: "test-plaid-token-placeholder"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createLinkToken",
        provider: "plaid",
        validCases: [
            {
                name: "standard_link_token",
                description: "Create a link token for transactions",
                input: {
                    userId: "user-12345"
                },
                expectedOutput: {
                    linkToken: "link-sandbox-af1a0311-da53-4636-b754-dd15c7a2",
                    expiration: "2024-01-16T00:00:00Z",
                    requestId: "qcj74Ly10lB4NfH"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_products",
                description: "Invalid product specified",
                input: {
                    userId: "user-12345",
                    products: ["invalid_product"]
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Invalid product specified. Valid products: transactions, auth, identity, assets, investments, liabilities",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "Invalid client credentials",
                input: {
                    userId: "user-12345"
                },
                expectedError: {
                    type: "permission",
                    message: "Authentication failed. Please check your Plaid client ID and secret.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    userId: "user-12345"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests.",
                    retryable: true
                }
            }
        ]
    }
];
