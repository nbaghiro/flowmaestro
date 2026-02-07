/**
 * Ramp Provider Test Fixtures
 *
 * Based on official Ramp Developer API documentation:
 * https://docs.ramp.com/developer-api/v1
 */

import type { TestFixture } from "../../../sandbox";

export const rampFixtures: TestFixture[] = [
    // ==================== TRANSACTIONS ====================
    {
        operationId: "listTransactions",
        provider: "ramp",
        validCases: [
            {
                name: "list_all_transactions",
                description: "List all transactions with default pagination",
                input: {},
                expectedOutput: {
                    transactions: [
                        {
                            id: "txn_001abc",
                            card_id: "card_123xyz",
                            user_id: "user_456def",
                            user_transaction_time: "2024-01-18T14:30:00Z",
                            merchant_id: "merch_789",
                            merchant_name: "Amazon Web Services",
                            merchant_category_code: "5734",
                            merchant_category_code_description: "Computer Software Stores",
                            amount: 15000,
                            currency_code: "USD",
                            state: "CLEARED",
                            sk_category_name: "Software",
                            memo: "Cloud infrastructure"
                        },
                        {
                            id: "txn_002def",
                            card_id: "card_123xyz",
                            user_id: "user_456def",
                            user_transaction_time: "2024-01-17T10:15:00Z",
                            merchant_id: "merch_456",
                            merchant_name: "Uber",
                            merchant_category_code: "4121",
                            merchant_category_code_description: "Taxicabs/Limousines",
                            amount: 3500,
                            currency_code: "USD",
                            state: "CLEARED",
                            sk_category_name: "Travel"
                        }
                    ],
                    count: 2
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Invalid or expired access token",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Access token is invalid or expired",
                    retryable: false
                }
            },
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
        operationId: "getTransaction",
        provider: "ramp",
        validCases: [
            {
                name: "get_transaction_by_id",
                description: "Get a specific transaction by ID",
                input: { id: "txn_001abc" },
                expectedOutput: {
                    id: "txn_001abc",
                    card_id: "card_123xyz",
                    user_id: "user_456def",
                    user_transaction_time: "2024-01-18T14:30:00Z",
                    merchant_id: "merch_789",
                    merchant_name: "Amazon Web Services",
                    merchant_category_code: "5734",
                    merchant_category_code_description: "Computer Software Stores",
                    amount: 15000,
                    currency_code: "USD",
                    state: "CLEARED",
                    sk_category_name: "Software",
                    memo: "Cloud infrastructure",
                    receipts: [
                        {
                            id: "rcpt_001",
                            created_at: "2024-01-18T14:35:00Z",
                            receipt_url: "https://ramp.com/receipts/rcpt_001"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "transaction_not_found",
                description: "Transaction does not exist",
                input: { id: "txn_nonexistent" },
                expectedError: {
                    type: "not_found",
                    message: "Transaction not found",
                    retryable: false
                }
            }
        ]
    },

    // ==================== CARDS ====================
    {
        operationId: "listCards",
        provider: "ramp",
        validCases: [
            {
                name: "list_all_cards",
                description: "List all corporate cards",
                input: {},
                expectedOutput: {
                    cards: [
                        {
                            id: "card_123xyz",
                            is_physical: false,
                            display_name: "Engineering Card",
                            last_four: "4242",
                            cardholder_id: "user_456def",
                            cardholder_name: "John Doe",
                            spending_restrictions: {
                                amount: 500000,
                                interval: "MONTHLY",
                                transaction_amount_limit: 100000
                            },
                            state: "ACTIVE"
                        },
                        {
                            id: "card_456abc",
                            is_physical: true,
                            display_name: "Travel Card",
                            last_four: "5353",
                            cardholder_id: "user_789ghi",
                            cardholder_name: "Jane Smith",
                            spending_restrictions: {
                                amount: 1000000,
                                interval: "MONTHLY"
                            },
                            state: "ACTIVE"
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
        operationId: "getCard",
        provider: "ramp",
        validCases: [
            {
                name: "get_card_by_id",
                description: "Get a specific card by ID",
                input: { id: "card_123xyz" },
                expectedOutput: {
                    id: "card_123xyz",
                    is_physical: false,
                    display_name: "Engineering Card",
                    last_four: "4242",
                    cardholder_id: "user_456def",
                    cardholder_name: "John Doe",
                    spending_restrictions: {
                        amount: 500000,
                        interval: "MONTHLY",
                        transaction_amount_limit: 100000,
                        categories: [5734, 7372]
                    },
                    state: "ACTIVE"
                }
            }
        ],
        errorCases: [
            {
                name: "card_not_found",
                description: "Card does not exist",
                input: { id: "card_nonexistent" },
                expectedError: {
                    type: "not_found",
                    message: "Card not found",
                    retryable: false
                }
            }
        ]
    },

    // ==================== USERS ====================
    {
        operationId: "listUsers",
        provider: "ramp",
        validCases: [
            {
                name: "list_all_users",
                description: "List all Ramp users",
                input: {},
                expectedOutput: {
                    users: [
                        {
                            id: "user_456def",
                            email: "john.doe@company.com",
                            first_name: "John",
                            last_name: "Doe",
                            phone: "+1-555-123-4567",
                            role: "BUSINESS_USER",
                            department_name: "Engineering",
                            status: "USER_ACTIVE"
                        },
                        {
                            id: "user_789ghi",
                            email: "jane.smith@company.com",
                            first_name: "Jane",
                            last_name: "Smith",
                            role: "BUSINESS_ADMIN",
                            department_name: "Finance",
                            status: "USER_ACTIVE"
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

    // ==================== REIMBURSEMENTS ====================
    {
        operationId: "listReimbursements",
        provider: "ramp",
        validCases: [
            {
                name: "list_all_reimbursements",
                description: "List all reimbursement requests",
                input: {},
                expectedOutput: {
                    reimbursements: [
                        {
                            id: "reimb_001",
                            created_at: "2024-01-15T10:00:00Z",
                            user_id: "user_456def",
                            amount: 12500,
                            currency: "USD",
                            direction: "BUSINESS_TO_USER",
                            original_transaction_amount: 12500,
                            original_reimbursement_amount: 12500,
                            merchant: "Office Depot",
                            transaction_date: "2024-01-12"
                        }
                    ],
                    count: 1
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

    // ==================== STATEMENTS ====================
    {
        operationId: "listStatements",
        provider: "ramp",
        validCases: [
            {
                name: "list_all_statements",
                description: "List all billing statements",
                input: {},
                expectedOutput: {
                    statements: [
                        {
                            id: "stmt_001",
                            effective_date: "2024-01-31",
                            period: {
                                start: "2024-01-01",
                                end: "2024-01-31"
                            },
                            created_at: "2024-02-01T00:00:00Z",
                            status: "CLOSED"
                        },
                        {
                            id: "stmt_002",
                            effective_date: "2024-02-29",
                            period: {
                                start: "2024-02-01",
                                end: "2024-02-29"
                            },
                            created_at: "2024-02-01T00:00:00Z",
                            status: "OPEN"
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
    }
];
