/**
 * Wise Provider Test Fixtures
 *
 * Based on official Wise API documentation:
 * https://docs.wise.com/api-reference
 */

import type { TestFixture } from "../../sandbox";

export const wiseFixtures: TestFixture[] = [
    // ==================== PROFILES ====================
    {
        operationId: "listProfiles",
        provider: "wise",
        validCases: [
            {
                name: "list_all_profiles",
                description: "List all profiles (personal and business)",
                input: {},
                expectedOutput: {
                    profiles: [
                        {
                            id: 12345678,
                            type: "personal",
                            details: {
                                firstName: "John",
                                lastName: "Doe",
                                dateOfBirth: "1990-01-15",
                                phoneNumber: "+1 555-123-4567"
                            }
                        },
                        {
                            id: 87654321,
                            type: "business",
                            details: {
                                name: "Acme Corp",
                                registrationNumber: "12345678",
                                companyType: "LIMITED",
                                companyRole: "OWNER"
                            }
                        }
                    ],
                    count: 2
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Invalid API token",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Invalid API token",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getProfile",
        provider: "wise",
        validCases: [
            {
                name: "get_profile_by_id",
                description: "Get a specific profile by ID",
                input: { id: 12345678 },
                expectedOutput: {
                    id: 12345678,
                    type: "personal",
                    details: {
                        firstName: "John",
                        lastName: "Doe",
                        dateOfBirth: "1990-01-15",
                        phoneNumber: "+1 555-123-4567"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "profile_not_found",
                description: "Profile does not exist",
                input: { id: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Profile not found",
                    retryable: false
                }
            }
        ]
    },

    // ==================== BALANCES ====================
    {
        operationId: "listBalances",
        provider: "wise",
        validCases: [
            {
                name: "list_all_balances",
                description: "List all multi-currency balances for a profile",
                input: { profileId: 12345678 },
                expectedOutput: {
                    balances: [
                        {
                            id: 100001,
                            currency: "USD",
                            amount: { value: 15000.5, currency: "USD" },
                            reservedAmount: { value: 0, currency: "USD" },
                            type: "STANDARD",
                            creationTime: "2024-01-15T10:00:00Z",
                            modificationTime: "2024-01-18T14:30:00Z"
                        },
                        {
                            id: 100002,
                            currency: "EUR",
                            amount: { value: 8500.25, currency: "EUR" },
                            reservedAmount: { value: 100.0, currency: "EUR" },
                            type: "STANDARD",
                            creationTime: "2024-01-15T10:00:00Z",
                            modificationTime: "2024-01-17T09:15:00Z"
                        },
                        {
                            id: 100003,
                            currency: "GBP",
                            amount: { value: 5000.0, currency: "GBP" },
                            reservedAmount: { value: 0, currency: "GBP" },
                            type: "STANDARD",
                            creationTime: "2024-01-16T11:00:00Z",
                            modificationTime: "2024-01-16T11:00:00Z"
                        }
                    ],
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { profileId: 12345678 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getBalance",
        provider: "wise",
        validCases: [
            {
                name: "get_balance_by_id",
                description: "Get a specific balance account",
                input: { profileId: 12345678, balanceId: 100001 },
                expectedOutput: {
                    id: 100001,
                    currency: "USD",
                    amount: { value: 15000.5, currency: "USD" },
                    reservedAmount: { value: 0, currency: "USD" },
                    type: "STANDARD",
                    bankDetails: {
                        id: 200001,
                        currency: "USD",
                        bankCode: "026073150",
                        accountNumber: "8310000000",
                        bankName: "Community Federal Savings Bank",
                        accountHolderName: "John Doe"
                    },
                    creationTime: "2024-01-15T10:00:00Z",
                    modificationTime: "2024-01-18T14:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "balance_not_found",
                description: "Balance does not exist",
                input: { profileId: 12345678, balanceId: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Balance not found",
                    retryable: false
                }
            }
        ]
    },

    // ==================== QUOTES ====================
    {
        operationId: "createQuote",
        provider: "wise",
        validCases: [
            {
                name: "create_usd_to_eur_quote",
                description: "Create a quote for USD to EUR transfer",
                input: {
                    profileId: 12345678,
                    sourceCurrency: "USD",
                    targetCurrency: "EUR",
                    sourceAmount: 1000
                },
                expectedOutput: {
                    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    sourceCurrency: "USD",
                    targetCurrency: "EUR",
                    sourceAmount: 1000,
                    targetAmount: 920.15,
                    payOut: "BANK_TRANSFER",
                    rate: 0.92015,
                    createdTime: "2024-01-18T15:30:00Z",
                    user: 12345678,
                    profile: 12345678,
                    rateType: "FIXED",
                    rateExpirationTime: "2024-01-18T15:45:00Z",
                    status: "PENDING",
                    expirationTime: "2024-01-18T16:30:00Z",
                    paymentOptions: [
                        {
                            disabled: false,
                            estimatedDelivery: "2024-01-19T12:00:00Z",
                            formattedEstimatedDelivery: "by Jan 19",
                            estimatedDeliveryDelays: [],
                            fee: {
                                transferWise: 7.89,
                                payIn: 0,
                                discount: 0,
                                total: 7.89,
                                priceSetId: 1,
                                partner: 0
                            },
                            sourceAmount: 1000,
                            targetAmount: 920.15,
                            sourceCurrency: "USD",
                            targetCurrency: "EUR",
                            payIn: "BALANCE",
                            payOut: "BANK_TRANSFER",
                            allowedProfileTypes: ["PERSONAL", "BUSINESS"],
                            payInProduct: "BALANCE",
                            feePercentage: 0.79
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_currency_pair",
                description: "Invalid currency pair",
                input: {
                    profileId: 12345678,
                    sourceCurrency: "XXX",
                    targetCurrency: "YYY",
                    sourceAmount: 1000
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid currency pair",
                    retryable: false
                }
            }
        ]
    },

    // ==================== RECIPIENTS ====================
    {
        operationId: "listRecipients",
        provider: "wise",
        validCases: [
            {
                name: "list_all_recipients",
                description: "List all recipient accounts",
                input: { profileId: 12345678 },
                expectedOutput: {
                    recipients: [
                        {
                            id: 300001,
                            profile: 12345678,
                            accountHolderName: "Jane Smith",
                            type: "iban",
                            country: "DE",
                            currency: "EUR",
                            details: { IBAN: "DE89370400440532013000" },
                            active: true,
                            ownedByCustomer: false
                        },
                        {
                            id: 300002,
                            profile: 12345678,
                            accountHolderName: "Bob Wilson",
                            type: "sort_code",
                            country: "GB",
                            currency: "GBP",
                            details: {
                                sortCode: "231470",
                                accountNumber: "28821822"
                            },
                            active: true,
                            ownedByCustomer: false
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
                input: { profileId: 12345678 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createRecipient",
        provider: "wise",
        validCases: [
            {
                name: "create_iban_recipient",
                description: "Create an IBAN recipient",
                input: {
                    profileId: 12345678,
                    currency: "EUR",
                    type: "iban",
                    accountHolderName: "Maria Garcia",
                    details: { IBAN: "ES9121000418450200051332" }
                },
                expectedOutput: {
                    id: 300003,
                    profile: 12345678,
                    accountHolderName: "Maria Garcia",
                    type: "iban",
                    country: "ES",
                    currency: "EUR",
                    details: { IBAN: "ES9121000418450200051332" },
                    active: true,
                    ownedByCustomer: false
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_iban",
                description: "Invalid IBAN format",
                input: {
                    profileId: 12345678,
                    currency: "EUR",
                    type: "iban",
                    accountHolderName: "Test User",
                    details: { IBAN: "INVALID" }
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid IBAN format",
                    retryable: false
                }
            }
        ]
    },

    // ==================== TRANSFERS ====================
    {
        operationId: "createTransfer",
        provider: "wise",
        validCases: [
            {
                name: "create_transfer",
                description: "Create a money transfer",
                input: {
                    targetAccount: 300001,
                    quoteUuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    reference: "Invoice #12345"
                },
                expectedOutput: {
                    id: 400001,
                    user: 12345678,
                    targetAccount: 300001,
                    quote: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    quoteUuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    status: "incoming_payment_waiting",
                    reference: "Invoice #12345",
                    rate: 0.92015,
                    created: "2024-01-18T15:35:00Z",
                    details: { reference: "Invoice #12345" },
                    hasActiveIssues: false,
                    sourceCurrency: "USD",
                    sourceValue: 1000,
                    targetCurrency: "EUR",
                    targetValue: 920.15
                }
            }
        ],
        errorCases: [
            {
                name: "quote_expired",
                description: "Quote has expired",
                input: {
                    targetAccount: 300001,
                    quoteUuid: "expired-quote-uuid"
                },
                expectedError: {
                    type: "validation",
                    message: "Quote has expired. Please create a new quote.",
                    retryable: false
                }
            },
            {
                name: "recipient_not_found",
                description: "Recipient account not found",
                input: {
                    targetAccount: 99999999,
                    quoteUuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                },
                expectedError: {
                    type: "not_found",
                    message: "Recipient account not found",
                    retryable: false
                }
            }
        ]
    }
];
