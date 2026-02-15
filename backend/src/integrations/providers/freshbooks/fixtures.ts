/**
 * FreshBooks Provider Test Fixtures
 *
 * Based on official FreshBooks API documentation:
 * - API Reference: https://www.freshbooks.com/api
 * - Authentication: OAuth 2.0
 * - Base URL: https://api.freshbooks.com
 *
 * FreshBooks is a cloud-based accounting platform designed for small businesses
 * and freelancers, offering invoicing, expense tracking, time tracking, and
 * financial reporting.
 */

import type { TestFixture } from "../../sandbox";

export const freshbooksFixtures: TestFixture[] = [
    // ===========================================
    // User Operations
    // ===========================================
    {
        operationId: "getMe",
        provider: "freshbooks",
        validCases: [
            {
                name: "user_with_multiple_businesses",
                description: "Get user with multiple business memberships (freelancer + agency)",
                input: {},
                expectedOutput: {
                    id: 2345678,
                    firstName: "Marcus",
                    lastName: "Chen",
                    email: "marcus@chendesigns.io",
                    confirmedAt: "2021-06-20T14:00:00Z",
                    createdAt: "2021-06-20T13:45:00Z",
                    setupComplete: true,
                    businesses: [
                        {
                            id: 8765432,
                            accountId: "Ym3pQ7",
                            name: "Chen Designs",
                            role: "owner"
                        },
                        {
                            id: 7654321,
                            accountId: "Zn4rS8",
                            name: "Creative Collective Agency",
                            role: "manager"
                        },
                        {
                            id: 6543210,
                            accountId: "Ao5tU9",
                            name: "TechStart Ventures",
                            role: "employee"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Invalid or expired OAuth token",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Unauthorized: Invalid or expired access token",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            }
        ]
    },

    // ===========================================
    // Client Operations
    // ===========================================
    {
        operationId: "createClient",
        provider: "freshbooks",
        validCases: [
            {
                name: "business_client",
                description: "Create a business client with organization name",
                input: {
                    email: "ap@globalretail.com",
                    firstName: "Jennifer",
                    lastName: "Walsh",
                    organization: "Global Retail Corporation",
                    phone: "212-555-9876"
                },
                expectedOutput: {
                    id: 1003,
                    email: "ap@globalretail.com",
                    firstName: "Jennifer",
                    lastName: "Walsh",
                    organization: "Global Retail Corporation",
                    phone: "212-555-9876",
                    currencyCode: "USD",
                    updatedAt: "2024-01-15T15:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_email",
                description: "Email format is invalid",
                input: {
                    email: "not-a-valid-email"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email format",
                    retryable: false
                }
            },
            {
                name: "duplicate_email",
                description: "Client with this email already exists",
                input: {
                    email: "existing@client.com",
                    firstName: "Duplicate",
                    lastName: "Client"
                },
                expectedError: {
                    type: "validation",
                    message: "A client with this email already exists",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    email: "newclient@example.com"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listClients",
        provider: "freshbooks",
        validCases: [
            {
                name: "list_all_clients",
                description: "List clients with default pagination",
                input: {},
                expectedOutput: {
                    clients: [
                        {
                            id: 1001,
                            email: "accounting@techstartup.io",
                            firstName: "Michael",
                            lastName: "Torres",
                            organization: "TechStartup Inc",
                            phone: "650-555-1111",
                            address: {
                                street: "100 Innovation Way",
                                city: "Palo Alto",
                                province: "CA",
                                postalCode: "94301",
                                country: "United States"
                            },
                            currencyCode: "USD",
                            updatedAt: "2024-01-10T10:00:00Z"
                        },
                        {
                            id: 1002,
                            email: "billing@creativestudio.co",
                            firstName: "Amanda",
                            lastName: "Park",
                            organization: "Creative Studio Co",
                            phone: "323-555-2222",
                            address: {
                                street: "456 Design District",
                                city: "Los Angeles",
                                province: "CA",
                                postalCode: "90028",
                                country: "United States"
                            },
                            currencyCode: "USD",
                            updatedAt: "2024-01-08T14:30:00Z"
                        },
                        {
                            id: 1003,
                            email: "finance@lawfirmllp.com",
                            firstName: "Robert",
                            lastName: "Harrison",
                            organization: "Harrison & Associates LLP",
                            phone: "617-555-3333",
                            address: {
                                street: "789 Legal Plaza, Suite 1500",
                                city: "Boston",
                                province: "MA",
                                postalCode: "02110",
                                country: "United States"
                            },
                            currencyCode: "USD",
                            updatedAt: "2024-01-05T09:15:00Z"
                        },
                        {
                            id: 1004,
                            email: "ap@healthclinic.org",
                            firstName: "Dr. Lisa",
                            lastName: "Nguyen",
                            organization: "Westside Health Clinic",
                            phone: "503-555-4444",
                            address: {
                                street: "321 Medical Center Dr",
                                city: "Portland",
                                province: "OR",
                                postalCode: "97201",
                                country: "United States"
                            },
                            currencyCode: "USD",
                            updatedAt: "2024-01-03T11:45:00Z"
                        },
                        {
                            id: 1005,
                            email: "payments@restaurantgroup.com",
                            firstName: "Carlos",
                            lastName: "Mendez",
                            organization: "Mendez Restaurant Group",
                            phone: "305-555-5555",
                            address: {
                                street: "555 Culinary Ave",
                                city: "Miami",
                                province: "FL",
                                postalCode: "33130",
                                country: "United States"
                            },
                            currencyCode: "USD",
                            updatedAt: "2023-12-28T16:20:00Z"
                        }
                    ],
                    count: 5,
                    page: 1,
                    pages: 1,
                    perPage: 25,
                    total: 5
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Invalid or expired OAuth token",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Unauthorized: Invalid or expired access token",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            }
        ]
    },

    // ===========================================
    // Invoice Operations
    // ===========================================
    {
        operationId: "createInvoice",
        provider: "freshbooks",
        validCases: [
            {
                name: "detailed_invoice",
                description: "Create an invoice with multiple line items and notes",
                input: {
                    clientId: "1002",
                    lines: [
                        {
                            name: "UI/UX Design - Homepage",
                            amount: 1500.0,
                            quantity: 1
                        },
                        {
                            name: "UI/UX Design - Product Pages",
                            amount: 800.0,
                            quantity: 3
                        },
                        {
                            name: "Design System Documentation",
                            amount: 500.0,
                            quantity: 1
                        }
                    ],
                    notes: "Thank you for choosing Creative Studio Co for your design needs. Payment is due within 30 days.",
                    dueOffsetDays: 30
                },
                expectedOutput: {
                    id: 5002,
                    invoiceNumber: "0000002",
                    customerId: 1002,
                    createDate: "2024-01-15",
                    dueDate: "2024-02-14",
                    status: "draft",
                    displayStatus: "draft",
                    currencyCode: "USD",
                    amount: 4400.0,
                    outstanding: 4400.0,
                    paid: 0.0,
                    notes: "Thank you for choosing Creative Studio Co for your design needs. Payment is due within 30 days.",
                    updatedAt: "2024-01-15T14:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "client_not_found",
                description: "Client ID does not exist",
                input: {
                    clientId: "99999",
                    lines: [
                        {
                            name: "Test Service",
                            amount: 100.0,
                            quantity: 1
                        }
                    ]
                },
                expectedError: {
                    type: "not_found",
                    message: "Client not found",
                    retryable: false
                }
            },
            {
                name: "empty_lines",
                description: "Invoice must have at least one line item",
                input: {
                    clientId: "1001",
                    lines: []
                },
                expectedError: {
                    type: "validation",
                    message: "Invoice must have at least one line item",
                    retryable: false
                }
            },
            {
                name: "invalid_amount",
                description: "Line item amount must be positive",
                input: {
                    clientId: "1001",
                    lines: [
                        {
                            name: "Invalid Service",
                            amount: -100.0,
                            quantity: 1
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "Line item amount must be a positive number",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    clientId: "1001",
                    lines: [
                        {
                            name: "Test Service",
                            amount: 100.0,
                            quantity: 1
                        }
                    ]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getInvoice",
        provider: "freshbooks",
        validCases: [
            {
                name: "get_sent_invoice",
                description: "Get an invoice that has been sent to client",
                input: {
                    invoiceId: "5002"
                },
                expectedOutput: {
                    id: 5002,
                    invoiceNumber: "0000002",
                    customerId: 1002,
                    createDate: "2024-01-10",
                    dueDate: "2024-02-09",
                    status: "sent",
                    displayStatus: "sent",
                    currencyCode: "USD",
                    amount: 4400.0,
                    outstanding: 4400.0,
                    paid: 0.0,
                    notes: "Thank you for your business!",
                    terms: "Net 30",
                    lineItems: [
                        {
                            id: 10002,
                            name: "UI/UX Design - Homepage",
                            description: "Complete homepage redesign with responsive layouts",
                            quantity: 1,
                            unitCost: 1500.0,
                            amount: 1500.0
                        },
                        {
                            id: 10003,
                            name: "UI/UX Design - Product Pages",
                            description: "Product page templates (3 variations)",
                            quantity: 3,
                            unitCost: 800.0,
                            amount: 2400.0
                        },
                        {
                            id: 10004,
                            name: "Design System Documentation",
                            description: "Comprehensive design system guide",
                            quantity: 1,
                            unitCost: 500.0,
                            amount: 500.0
                        }
                    ],
                    updatedAt: "2024-01-10T16:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "invoice_not_found",
                description: "Invoice does not exist",
                input: {
                    invoiceId: "99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Invoice not found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "No permission to view this invoice",
                input: {
                    invoiceId: "5001"
                },
                expectedError: {
                    type: "permission",
                    message: "Unauthorized: You do not have permission to view this invoice",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    invoiceId: "5001"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listInvoices",
        provider: "freshbooks",
        validCases: [
            {
                name: "list_all_invoices",
                description: "List all invoices with default pagination",
                input: {},
                expectedOutput: {
                    invoices: [
                        {
                            id: 5001,
                            invoiceNumber: "0000001",
                            customerId: 1001,
                            createDate: "2024-01-15",
                            dueDate: "2024-02-14",
                            status: "draft",
                            displayStatus: "draft",
                            currencyCode: "USD",
                            amount: 2500.0,
                            outstanding: 2500.0,
                            paid: 0.0,
                            updatedAt: "2024-01-15T14:00:00Z"
                        },
                        {
                            id: 5002,
                            invoiceNumber: "0000002",
                            customerId: 1002,
                            createDate: "2024-01-10",
                            dueDate: "2024-02-09",
                            status: "sent",
                            displayStatus: "sent",
                            currencyCode: "USD",
                            amount: 4400.0,
                            outstanding: 4400.0,
                            paid: 0.0,
                            updatedAt: "2024-01-10T16:30:00Z"
                        },
                        {
                            id: 5003,
                            invoiceNumber: "0000003",
                            customerId: 1003,
                            createDate: "2023-12-15",
                            dueDate: "2024-01-14",
                            status: "partial",
                            displayStatus: "partial",
                            currencyCode: "USD",
                            amount: 8500.0,
                            outstanding: 4250.0,
                            paid: 4250.0,
                            updatedAt: "2024-01-02T10:15:00Z"
                        },
                        {
                            id: 5004,
                            invoiceNumber: "0000004",
                            customerId: 1004,
                            createDate: "2023-11-01",
                            dueDate: "2023-11-30",
                            status: "paid",
                            displayStatus: "paid",
                            currencyCode: "USD",
                            amount: 1200.0,
                            outstanding: 0.0,
                            paid: 1200.0,
                            updatedAt: "2023-11-28T14:45:00Z"
                        },
                        {
                            id: 5005,
                            invoiceNumber: "0000005",
                            customerId: 1005,
                            createDate: "2023-10-15",
                            dueDate: "2023-11-14",
                            status: "overdue",
                            displayStatus: "overdue",
                            currencyCode: "USD",
                            amount: 3750.0,
                            outstanding: 3750.0,
                            paid: 0.0,
                            updatedAt: "2023-11-20T09:00:00Z"
                        }
                    ],
                    count: 5,
                    page: 1,
                    pages: 1,
                    perPage: 25,
                    total: 5
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_status",
                description: "Invalid status filter value",
                input: {
                    status: "invalid_status"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Invalid status filter. Valid values are: draft, sent, viewed, paid, autopaid, retry, failed, partial",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            }
        ]
    },

    // ===========================================
    // Expense Operations
    // ===========================================
    {
        operationId: "listExpenses",
        provider: "freshbooks",
        validCases: [
            {
                name: "list_all_expenses",
                description: "List all expenses with default pagination",
                input: {},
                expectedOutput: {
                    expenses: [
                        {
                            id: 8001,
                            staffId: 1,
                            categoryId: 101,
                            clientId: 1001,
                            projectId: 2001,
                            vendor: "Adobe Creative Cloud",
                            date: "2024-01-15",
                            notes: "Annual Creative Cloud subscription for client project",
                            amount: 659.88,
                            currencyCode: "USD",
                            status: 1,
                            updatedAt: "2024-01-15T10:00:00Z"
                        },
                        {
                            id: 8002,
                            staffId: 1,
                            categoryId: 102,
                            vendor: "WeWork",
                            date: "2024-01-01",
                            notes: "January coworking space membership",
                            amount: 450.0,
                            currencyCode: "USD",
                            status: 1,
                            updatedAt: "2024-01-01T09:00:00Z"
                        },
                        {
                            id: 8003,
                            staffId: 1,
                            categoryId: 103,
                            vendor: "Delta Airlines",
                            date: "2024-01-08",
                            notes: "Flight to NYC for client meeting - TechStartup Inc",
                            amount: 387.5,
                            currencyCode: "USD",
                            status: 1,
                            updatedAt: "2024-01-08T14:30:00Z"
                        },
                        {
                            id: 8004,
                            staffId: 1,
                            categoryId: 104,
                            clientId: 1001,
                            vendor: "The Standard Hotel",
                            date: "2024-01-08",
                            notes: "2-night stay in NYC for TechStartup project kickoff",
                            amount: 578.0,
                            currencyCode: "USD",
                            status: 1,
                            updatedAt: "2024-01-10T08:00:00Z"
                        },
                        {
                            id: 8005,
                            staffId: 1,
                            categoryId: 105,
                            vendor: "Best Buy",
                            date: "2024-01-12",
                            notes: "External monitor for home office",
                            amount: 349.99,
                            currencyCode: "USD",
                            status: 1,
                            updatedAt: "2024-01-12T16:45:00Z"
                        },
                        {
                            id: 8006,
                            staffId: 1,
                            categoryId: 106,
                            vendor: "Figma",
                            date: "2024-01-01",
                            notes: "Monthly Figma Professional subscription",
                            amount: 15.0,
                            currencyCode: "USD",
                            status: 1,
                            updatedAt: "2024-01-01T00:00:00Z"
                        },
                        {
                            id: 8007,
                            staffId: 1,
                            categoryId: 107,
                            vendor: "Uber",
                            date: "2024-01-09",
                            notes: "Transportation to/from client meeting in NYC",
                            amount: 67.4,
                            currencyCode: "USD",
                            status: 1,
                            updatedAt: "2024-01-09T18:00:00Z"
                        },
                        {
                            id: 8008,
                            staffId: 1,
                            categoryId: 108,
                            vendor: "Le Bernardin",
                            date: "2024-01-09",
                            notes: "Client dinner with TechStartup CEO",
                            amount: 285.5,
                            currencyCode: "USD",
                            status: 1,
                            updatedAt: "2024-01-09T22:30:00Z"
                        }
                    ],
                    count: 8,
                    page: 1,
                    pages: 1,
                    perPage: 25,
                    total: 8
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Invalid or expired OAuth token",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Unauthorized: Invalid or expired access token",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            },
            {
                name: "invalid_page",
                description: "Invalid page number",
                input: {
                    page: 0
                },
                expectedError: {
                    type: "validation",
                    message: "Page number must be a positive integer",
                    retryable: false
                }
            }
        ]
    }
];
