/**
 * QuickBooks Provider Test Fixtures
 *
 * Based on official QuickBooks API documentation:
 * - Customer: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer
 * - Invoice: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice
 * - CompanyInfo: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/companyinfo
 */

import type { TestFixture } from "../../../sandbox";

export const quickbooksFixtures: TestFixture[] = [
    {
        operationId: "createCustomer",
        provider: "quickbooks",
        validCases: [
            {
                name: "customer_with_full_details",
                description: "Create a customer with full contact information",
                input: {
                    displayName: "Johnson & Associates LLC",
                    givenName: "Robert",
                    familyName: "Johnson",
                    email: "robert.johnson@johnsonllc.com",
                    phone: "(415) 555-0123",
                    companyName: "Johnson & Associates LLC"
                },
                expectedOutput: {
                    id: "146",
                    displayName: "Johnson & Associates LLC",
                    givenName: "Robert",
                    familyName: "Johnson",
                    companyName: "Johnson & Associates LLC",
                    email: "robert.johnson@johnsonllc.com",
                    phone: "(415) 555-0123",
                    balance: 0,
                    active: true,
                    createdAt: "2024-01-15T10:15:00-08:00",
                    updatedAt: "2024-01-15T10:15:00-08:00"
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_display_name",
                description: "Customer with same display name already exists",
                input: {
                    displayName: "Acme Corporation"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "A customer with this display name already exists. Display name must be unique.",
                    retryable: false
                }
            },
            {
                name: "invalid_email",
                description: "Invalid email format provided",
                input: {
                    displayName: "Test Customer",
                    email: "not-an-email"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email address format",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    displayName: "Rate Limited Customer"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests.",
                    retryable: true
                }
            },
            {
                name: "permission",
                description: "OAuth token expired or invalid",
                input: {
                    displayName: "New Customer"
                },
                expectedError: {
                    type: "permission",
                    message: "Authentication failed. Please reconnect your QuickBooks account.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createInvoice",
        provider: "quickbooks",
        validCases: [
            {
                name: "invoice_with_multiple_items",
                description: "Create an invoice with multiple line items and due date",
                input: {
                    customerId: "146",
                    lineItems: [
                        {
                            amount: 2500.0,
                            description: "Consulting Services - January 2024"
                        },
                        {
                            amount: 750.0,
                            description: "Software License Fee"
                        },
                        {
                            amount: 150.0,
                            description: "Travel Expenses Reimbursement"
                        }
                    ],
                    dueDate: "2024-02-15",
                    docNumber: "INV-2024-001"
                },
                expectedOutput: {
                    id: "1099",
                    docNumber: "INV-2024-001",
                    txnDate: "2024-01-15",
                    dueDate: "2024-02-15",
                    customer: {
                        id: "146",
                        name: "Johnson & Associates LLC"
                    },
                    lineItems: [
                        {
                            id: "1",
                            lineNum: 1,
                            description: "Consulting Services - January 2024",
                            amount: 2500.0,
                            quantity: 1,
                            unitPrice: 2500.0
                        },
                        {
                            id: "2",
                            lineNum: 2,
                            description: "Software License Fee",
                            amount: 750.0,
                            quantity: 1,
                            unitPrice: 750.0
                        },
                        {
                            id: "3",
                            lineNum: 3,
                            description: "Travel Expenses Reimbursement",
                            amount: 150.0,
                            quantity: 1,
                            unitPrice: 150.0
                        }
                    ],
                    totalAmount: 3400.0,
                    balance: 3400.0,
                    emailStatus: "NotSet",
                    createdAt: "2024-01-15T15:30:00-08:00",
                    updatedAt: "2024-01-15T15:30:00-08:00"
                }
            }
        ],
        errorCases: [
            {
                name: "customer_not_found",
                description: "Customer ID does not exist",
                input: {
                    customerId: "99999",
                    lineItems: [
                        {
                            amount: 100.0,
                            description: "Test Service"
                        }
                    ]
                },
                expectedError: {
                    type: "not_found",
                    message: "Customer with ID '99999' not found",
                    retryable: false
                }
            },
            {
                name: "empty_line_items",
                description: "Invoice created without any line items",
                input: {
                    customerId: "145",
                    lineItems: []
                },
                expectedError: {
                    type: "validation",
                    message: "At least one line item is required",
                    retryable: false
                }
            },
            {
                name: "invalid_due_date",
                description: "Due date in invalid format",
                input: {
                    customerId: "145",
                    lineItems: [
                        {
                            amount: 500.0,
                            description: "Test Service"
                        }
                    ],
                    dueDate: "January 15, 2024"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid date format. Use YYYY-MM-DD",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    customerId: "145",
                    lineItems: [
                        {
                            amount: 500.0,
                            description: "Test Service"
                        }
                    ]
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
        operationId: "getCompanyInfo",
        provider: "quickbooks",
        validCases: [
            {
                name: "standard_company",
                description: "Get company information for a standard US business",
                input: {},
                expectedOutput: {
                    id: "1",
                    companyName: "TechStart Solutions Inc",
                    legalName: "TechStart Solutions Incorporated",
                    address: {
                        line1: "123 Innovation Drive",
                        city: "San Francisco",
                        state: "CA",
                        postalCode: "94105",
                        country: "US"
                    },
                    phone: "(415) 555-1234",
                    email: "accounting@techstartsolutions.com",
                    website: "https://www.techstartsolutions.com",
                    fiscalYearStartMonth: "January",
                    country: "US"
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Not authorized to access company info",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Authentication failed. Please reconnect your QuickBooks account.",
                    retryable: false
                }
            },
            {
                name: "company_not_found",
                description: "Company realm not found",
                input: {},
                expectedError: {
                    type: "not_found",
                    message:
                        "QuickBooks company not found. The company may have been deleted or the connection is invalid.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getCustomer",
        provider: "quickbooks",
        validCases: [
            {
                name: "business_customer",
                description: "Get a business customer with full details",
                input: {
                    customerId: "145"
                },
                expectedOutput: {
                    id: "145",
                    displayName: "Acme Corporation",
                    companyName: "Acme Corporation",
                    email: "accounts@acmecorp.com",
                    phone: "(555) 123-4567",
                    billingAddress: {
                        line1: "456 Business Park Blvd",
                        city: "Los Angeles",
                        state: "CA",
                        postalCode: "90001"
                    },
                    balance: 2500.0,
                    active: true,
                    createdAt: "2023-06-15T10:00:00-07:00",
                    updatedAt: "2024-01-10T14:30:00-08:00"
                }
            }
        ],
        errorCases: [
            {
                name: "customer_not_found",
                description: "Customer ID does not exist",
                input: {
                    customerId: "99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Customer with ID '99999' not found",
                    retryable: false
                }
            },
            {
                name: "deleted_customer",
                description: "Customer has been deleted",
                input: {
                    customerId: "50"
                },
                expectedError: {
                    type: "not_found",
                    message: "Customer with ID '50' has been deleted",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    customerId: "145"
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
        operationId: "getInvoice",
        provider: "quickbooks",
        validCases: [
            {
                name: "unpaid_invoice",
                description: "Get an unpaid invoice",
                input: {
                    invoiceId: "1098"
                },
                expectedOutput: {
                    id: "1098",
                    docNumber: "INV-2024-001",
                    txnDate: "2024-01-15",
                    dueDate: "2024-02-15",
                    customer: {
                        id: "145",
                        name: "Acme Corporation"
                    },
                    lineItems: [
                        {
                            id: "1",
                            lineNum: 1,
                            description: "Website Development - Initial Deposit",
                            amount: 500.0,
                            quantity: 1,
                            unitPrice: 500.0
                        }
                    ],
                    totalAmount: 500.0,
                    balance: 500.0,
                    billEmail: "accounts@acmecorp.com",
                    emailStatus: "EmailSent",
                    createdAt: "2024-01-15T14:00:00-08:00",
                    updatedAt: "2024-01-15T14:30:00-08:00"
                }
            }
        ],
        errorCases: [
            {
                name: "invoice_not_found",
                description: "Invoice ID does not exist",
                input: {
                    invoiceId: "99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Invoice with ID '99999' not found",
                    retryable: false
                }
            },
            {
                name: "deleted_invoice",
                description: "Invoice has been voided/deleted",
                input: {
                    invoiceId: "500"
                },
                expectedError: {
                    type: "not_found",
                    message: "Invoice with ID '500' has been voided or deleted",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    invoiceId: "1098"
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
        operationId: "listCustomers",
        provider: "quickbooks",
        validCases: [
            {
                name: "default_list",
                description: "List customers with default pagination",
                input: {},
                expectedOutput: {
                    customers: [
                        {
                            id: "145",
                            displayName: "Acme Corporation",
                            companyName: "Acme Corporation",
                            email: "accounts@acmecorp.com",
                            phone: "(555) 123-4567",
                            billingAddress: {
                                line1: "456 Business Park Blvd",
                                city: "Los Angeles",
                                state: "CA",
                                postalCode: "90001"
                            },
                            balance: 2500.0,
                            active: true,
                            createdAt: "2023-06-15T10:00:00-07:00",
                            updatedAt: "2024-01-10T14:30:00-08:00"
                        },
                        {
                            id: "146",
                            displayName: "Johnson & Associates LLC",
                            givenName: "Robert",
                            familyName: "Johnson",
                            companyName: "Johnson & Associates LLC",
                            email: "robert.johnson@johnsonllc.com",
                            phone: "(415) 555-0123",
                            billingAddress: {
                                line1: "100 Market Street, Floor 12",
                                city: "San Francisco",
                                state: "CA",
                                postalCode: "94102"
                            },
                            balance: 0,
                            active: true,
                            createdAt: "2023-04-20T09:00:00-07:00",
                            updatedAt: "2024-01-08T11:00:00-08:00"
                        },
                        {
                            id: "147",
                            displayName: "Sarah Mitchell",
                            givenName: "Sarah",
                            familyName: "Mitchell",
                            email: "sarah.mitchell@email.com",
                            phone: "(650) 555-0198",
                            billingAddress: {
                                line1: "789 Oak Street, Apt 4B",
                                city: "Palo Alto",
                                state: "CA",
                                postalCode: "94301"
                            },
                            balance: 0,
                            active: true,
                            createdAt: "2023-09-20T09:15:00-07:00",
                            updatedAt: "2024-01-05T11:45:00-08:00"
                        },
                        {
                            id: "148",
                            displayName: "Global Logistics Partners",
                            companyName: "Global Logistics Partners Ltd",
                            givenName: "David",
                            familyName: "Chen",
                            email: "david.chen@globallogistics.com",
                            phone: "(408) 555-9876",
                            billingAddress: {
                                line1: "1000 Enterprise Way, Suite 500",
                                city: "San Jose",
                                state: "CA",
                                postalCode: "95134"
                            },
                            balance: 15750.5,
                            active: true,
                            createdAt: "2022-03-10T08:00:00-08:00",
                            updatedAt: "2024-01-14T16:20:00-08:00"
                        },
                        {
                            id: "149",
                            displayName: "Bay Area Marketing Group",
                            companyName: "Bay Area Marketing Group Inc",
                            email: "billing@bayareamarketing.com",
                            phone: "(510) 555-7890",
                            billingAddress: {
                                line1: "2500 Broadway",
                                city: "Oakland",
                                state: "CA",
                                postalCode: "94612"
                            },
                            balance: 4200.0,
                            active: true,
                            createdAt: "2023-01-05T14:00:00-08:00",
                            updatedAt: "2024-01-12T09:30:00-08:00"
                        }
                    ],
                    count: 5,
                    startPosition: 1,
                    maxResults: 100
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_max_results",
                description: "maxResults exceeds limit",
                input: {
                    maxResults: 2000
                },
                expectedError: {
                    type: "validation",
                    message: "maxResults cannot exceed 1000",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests.",
                    retryable: true
                }
            },
            {
                name: "permission",
                description: "Not authorized to list customers",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Authentication failed. Please reconnect your QuickBooks account.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listInvoices",
        provider: "quickbooks",
        validCases: [
            {
                name: "default_list",
                description: "List invoices with default pagination",
                input: {},
                expectedOutput: {
                    invoices: [
                        {
                            id: "1098",
                            docNumber: "INV-2024-001",
                            txnDate: "2024-01-15",
                            dueDate: "2024-02-15",
                            customer: {
                                id: "145",
                                name: "Acme Corporation"
                            },
                            lineItems: [
                                {
                                    id: "1",
                                    lineNum: 1,
                                    description: "Website Development - Initial Deposit",
                                    amount: 500.0,
                                    quantity: 1,
                                    unitPrice: 500.0
                                }
                            ],
                            totalAmount: 500.0,
                            balance: 500.0,
                            billEmail: "accounts@acmecorp.com",
                            emailStatus: "EmailSent",
                            createdAt: "2024-01-15T14:00:00-08:00",
                            updatedAt: "2024-01-15T14:30:00-08:00"
                        },
                        {
                            id: "1099",
                            docNumber: "INV-2024-002",
                            txnDate: "2024-01-15",
                            dueDate: "2024-02-15",
                            customer: {
                                id: "146",
                                name: "Johnson & Associates LLC"
                            },
                            lineItems: [
                                {
                                    id: "1",
                                    lineNum: 1,
                                    description: "Consulting Services - January 2024",
                                    amount: 2500.0,
                                    quantity: 1,
                                    unitPrice: 2500.0
                                },
                                {
                                    id: "2",
                                    lineNum: 2,
                                    description: "Software License Fee",
                                    amount: 750.0,
                                    quantity: 1,
                                    unitPrice: 750.0
                                }
                            ],
                            totalAmount: 3250.0,
                            balance: 3250.0,
                            billEmail: "robert.johnson@johnsonllc.com",
                            emailStatus: "NotSet",
                            createdAt: "2024-01-15T15:30:00-08:00",
                            updatedAt: "2024-01-15T15:30:00-08:00"
                        },
                        {
                            id: "1075",
                            docNumber: "INV-2023-112",
                            txnDate: "2023-12-15",
                            dueDate: "2024-01-15",
                            customer: {
                                id: "148",
                                name: "Global Logistics Partners"
                            },
                            lineItems: [
                                {
                                    id: "1",
                                    lineNum: 1,
                                    description: "Supply Chain Optimization Project - Phase 1",
                                    amount: 25000.0,
                                    quantity: 1,
                                    unitPrice: 25000.0
                                },
                                {
                                    id: "2",
                                    lineNum: 2,
                                    description: "Data Integration Services",
                                    amount: 8500.0,
                                    quantity: 1,
                                    unitPrice: 8500.0
                                },
                                {
                                    id: "3",
                                    lineNum: 3,
                                    description: "Training and Documentation",
                                    amount: 3000.0,
                                    quantity: 1,
                                    unitPrice: 3000.0
                                }
                            ],
                            totalAmount: 36500.0,
                            balance: 15750.5,
                            billEmail: "david.chen@globallogistics.com",
                            emailStatus: "EmailSent",
                            createdAt: "2023-12-15T11:30:00-08:00",
                            updatedAt: "2024-01-10T14:00:00-08:00"
                        },
                        {
                            id: "1050",
                            docNumber: "INV-2023-089",
                            txnDate: "2023-12-01",
                            dueDate: "2023-12-31",
                            customer: {
                                id: "146",
                                name: "Johnson & Associates LLC"
                            },
                            lineItems: [
                                {
                                    id: "1",
                                    lineNum: 1,
                                    description: "Consulting Services - Q4 2023",
                                    amount: 7500.0,
                                    quantity: 1,
                                    unitPrice: 7500.0
                                }
                            ],
                            totalAmount: 7500.0,
                            balance: 0,
                            billEmail: "robert.johnson@johnsonllc.com",
                            emailStatus: "EmailSent",
                            createdAt: "2023-12-01T10:00:00-08:00",
                            updatedAt: "2023-12-28T09:15:00-08:00"
                        }
                    ],
                    count: 4,
                    startPosition: 1,
                    maxResults: 100
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_max_results",
                description: "maxResults exceeds limit",
                input: {
                    maxResults: 5000
                },
                expectedError: {
                    type: "validation",
                    message: "maxResults cannot exceed 1000",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests.",
                    retryable: true
                }
            },
            {
                name: "permission",
                description: "Not authorized to list invoices",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Authentication failed. Please reconnect your QuickBooks account.",
                    retryable: false
                }
            }
        ]
    }
];
