/**
 * Sage Provider Test Fixtures
 *
 * Based on Sage Business Cloud Accounting API v3.1:
 * - Business: GET /business
 * - Contacts: GET/POST /contacts
 * - Sales Invoices: GET/POST /sales_invoices
 */

import type { TestFixture } from "../../../sandbox";

export const sageFixtures: TestFixture[] = [
    {
        operationId: "getBusinessInfo",
        provider: "sage",
        validCases: [
            {
                name: "standard_business",
                description: "Get business information for a standard company",
                input: {},
                expectedOutput: {
                    name: "Riverside Consulting Ltd",
                    countryCode: "GB",
                    defaultCurrency: "GBP",
                    industryType: "Consulting",
                    telephone: "+44 20 7946 0958",
                    email: "accounts@riversideconsulting.co.uk",
                    addressLine1: "15 Victoria Street",
                    city: "London",
                    region: "Greater London",
                    postalCode: "SW1H 0EX",
                    country: "GB",
                    createdAt: "2023-06-01T09:00:00Z",
                    updatedAt: "2024-01-10T14:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Not authorized to access business info",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Authentication failed. Please reconnect your Sage account.",
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
        operationId: "listContacts",
        provider: "sage",
        validCases: [
            {
                name: "default_list",
                description: "List contacts with default pagination",
                input: {},
                expectedOutput: {
                    contacts: [
                        {
                            id: "a1b2c3d4e5f6a7b8c9d0e1f2",
                            name: "Kensington Digital Agency",
                            contactTypeName: "Customer",
                            reference: "KDA-001",
                            email: "billing@kensingtondigital.co.uk",
                            telephone: "+44 20 7123 4567",
                            mainAddress: {
                                addressLine1: "28 Kensington High Street",
                                city: "London",
                                region: "Greater London",
                                postalCode: "W8 4PT",
                                country: "GB"
                            },
                            creditDays: 30,
                            currency: "GBP",
                            createdAt: "2023-09-15T10:00:00Z",
                            updatedAt: "2024-01-08T11:20:00Z"
                        },
                        {
                            id: "b2c3d4e5f6a7b8c9d0e1f2a3",
                            name: "Manchester Parts Supply",
                            contactTypeName: "Vendor",
                            reference: "MPS-002",
                            email: "orders@manchesterparts.co.uk",
                            telephone: "+44 161 555 8901",
                            mainAddress: {
                                addressLine1: "7 Deansgate",
                                city: "Manchester",
                                postalCode: "M3 1AZ",
                                country: "GB"
                            },
                            creditDays: 14,
                            currency: "GBP",
                            createdAt: "2023-10-01T08:45:00Z",
                            updatedAt: "2024-01-12T09:15:00Z"
                        },
                        {
                            id: "c3d4e5f6a7b8c9d0e1f2a3b4",
                            name: "Edinburgh Creative Studio",
                            contactTypeName: "Customer",
                            email: "hello@edinburghcreative.com",
                            telephone: "+44 131 555 2345",
                            currency: "GBP",
                            createdAt: "2023-11-20T15:30:00Z",
                            updatedAt: "2024-01-05T16:00:00Z"
                        }
                    ],
                    count: 3,
                    total: 3,
                    page: 1
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
                    message: "Rate limit exceeded. Please wait before making more requests.",
                    retryable: true
                }
            },
            {
                name: "permission",
                description: "Not authorized to list contacts",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Authentication failed. Please reconnect your Sage account.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getContact",
        provider: "sage",
        validCases: [
            {
                name: "customer_contact",
                description: "Get a customer contact with full details",
                input: {
                    contactId: "a1b2c3d4e5f6a7b8c9d0e1f2"
                },
                expectedOutput: {
                    id: "a1b2c3d4e5f6a7b8c9d0e1f2",
                    name: "Kensington Digital Agency",
                    contactTypeName: "Customer",
                    reference: "KDA-001",
                    email: "billing@kensingtondigital.co.uk",
                    telephone: "+44 20 7123 4567",
                    mainAddress: {
                        addressLine1: "28 Kensington High Street",
                        city: "London",
                        region: "Greater London",
                        postalCode: "W8 4PT",
                        country: "GB"
                    },
                    creditLimit: 50000,
                    creditDays: 30,
                    currency: "GBP",
                    createdAt: "2023-09-15T10:00:00Z",
                    updatedAt: "2024-01-08T11:20:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "contact_not_found",
                description: "Contact ID does not exist",
                input: {
                    contactId: "000000000000000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Contact with ID '000000000000000000000000' not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    contactId: "a1b2c3d4e5f6a7b8c9d0e1f2"
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
        operationId: "createContact",
        provider: "sage",
        validCases: [
            {
                name: "contact_with_full_details",
                description: "Create a customer contact with full information",
                input: {
                    name: "Brighton Web Services",
                    contactTypeId: "CUSTOMER",
                    reference: "BWS-003",
                    email: "info@brightonweb.co.uk",
                    telephone: "+44 1273 555 6789",
                    addressLine1: "12 The Lanes",
                    city: "Brighton",
                    region: "East Sussex",
                    postalCode: "BN1 1HB",
                    country: "GB"
                },
                expectedOutput: {
                    id: "d4e5f6a7b8c9d0e1f2a3b4c5",
                    name: "Brighton Web Services",
                    contactTypeName: "Customer",
                    reference: "BWS-003",
                    email: "info@brightonweb.co.uk",
                    telephone: "+44 1273 555 6789",
                    mainAddress: {
                        addressLine1: "12 The Lanes",
                        city: "Brighton",
                        region: "East Sussex",
                        postalCode: "BN1 1HB",
                        country: "GB"
                    },
                    currency: "GBP",
                    createdAt: "2024-01-15T11:00:00Z",
                    updatedAt: "2024-01-15T11:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_reference",
                description: "Contact with same reference already exists",
                input: {
                    name: "Duplicate Contact",
                    contactTypeId: "CUSTOMER",
                    reference: "KDA-001"
                },
                expectedError: {
                    type: "validation",
                    message: "A contact with this reference already exists in Sage",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "Rate Limited Contact",
                    contactTypeId: "CUSTOMER"
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
                    name: "New Contact",
                    contactTypeId: "CUSTOMER"
                },
                expectedError: {
                    type: "permission",
                    message: "Authentication failed. Please reconnect your Sage account.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listInvoices",
        provider: "sage",
        validCases: [
            {
                name: "default_list",
                description: "List sales invoices with default pagination",
                input: {},
                expectedOutput: {
                    invoices: [
                        {
                            id: "e5f6a7b8c9d0e1f2a3b4c5d6",
                            displayedAs: "SI-0042",
                            invoiceNumber: "SI-0042",
                            status: "Unpaid",
                            contact: {
                                id: "a1b2c3d4e5f6a7b8c9d0e1f2",
                                displayedAs: "Kensington Digital Agency"
                            },
                            date: "2024-01-15",
                            dueDate: "2024-02-14",
                            lineItems: [
                                {
                                    id: "li-001",
                                    description: "Web Development Services - January",
                                    quantity: 40,
                                    unitPrice: 95.0,
                                    totalAmount: 3800.0,
                                    ledgerAccount: "Sales",
                                    taxRateId: "GB_STANDARD"
                                }
                            ],
                            netAmount: 3800.0,
                            taxAmount: 760.0,
                            totalAmount: 4560.0,
                            outstandingAmount: 4560.0,
                            currency: "GBP",
                            createdAt: "2024-01-15T09:00:00Z",
                            updatedAt: "2024-01-15T09:00:00Z"
                        },
                        {
                            id: "f6a7b8c9d0e1f2a3b4c5d6e7",
                            displayedAs: "SI-0041",
                            invoiceNumber: "SI-0041",
                            status: "Paid",
                            contact: {
                                id: "c3d4e5f6a7b8c9d0e1f2a3b4",
                                displayedAs: "Edinburgh Creative Studio"
                            },
                            date: "2024-01-10",
                            dueDate: "2024-01-24",
                            lineItems: [
                                {
                                    id: "li-002",
                                    description: "Brand Strategy Consultation",
                                    quantity: 8,
                                    unitPrice: 150.0,
                                    totalAmount: 1200.0,
                                    ledgerAccount: "Sales",
                                    taxRateId: "GB_STANDARD"
                                }
                            ],
                            netAmount: 1200.0,
                            taxAmount: 240.0,
                            totalAmount: 1440.0,
                            outstandingAmount: 0,
                            currency: "GBP",
                            createdAt: "2024-01-10T14:30:00Z",
                            updatedAt: "2024-01-20T16:00:00Z"
                        }
                    ],
                    count: 2,
                    total: 2,
                    page: 1
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
                    message: "Authentication failed. Please reconnect your Sage account.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getInvoice",
        provider: "sage",
        validCases: [
            {
                name: "unpaid_invoice",
                description: "Get an unpaid sales invoice",
                input: {
                    invoiceId: "e5f6a7b8c9d0e1f2a3b4c5d6"
                },
                expectedOutput: {
                    id: "e5f6a7b8c9d0e1f2a3b4c5d6",
                    displayedAs: "SI-0042",
                    invoiceNumber: "SI-0042",
                    status: "Unpaid",
                    contact: {
                        id: "a1b2c3d4e5f6a7b8c9d0e1f2",
                        displayedAs: "Kensington Digital Agency"
                    },
                    date: "2024-01-15",
                    dueDate: "2024-02-14",
                    lineItems: [
                        {
                            id: "li-001",
                            description: "Web Development Services - January",
                            quantity: 40,
                            unitPrice: 95.0,
                            totalAmount: 3800.0,
                            ledgerAccount: "Sales",
                            taxRateId: "GB_STANDARD"
                        }
                    ],
                    netAmount: 3800.0,
                    taxAmount: 760.0,
                    totalAmount: 4560.0,
                    outstandingAmount: 4560.0,
                    currency: "GBP",
                    createdAt: "2024-01-15T09:00:00Z",
                    updatedAt: "2024-01-15T09:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "invoice_not_found",
                description: "Invoice ID does not exist",
                input: {
                    invoiceId: "000000000000000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Invoice with ID '000000000000000000000000' not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    invoiceId: "e5f6a7b8c9d0e1f2a3b4c5d6"
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
        operationId: "createInvoice",
        provider: "sage",
        validCases: [
            {
                name: "invoice_with_multiple_items",
                description: "Create a sales invoice with multiple line items",
                input: {
                    contactId: "a1b2c3d4e5f6a7b8c9d0e1f2",
                    date: "2024-02-01",
                    dueDate: "2024-03-01",
                    reference: "PO-2024-015",
                    lineItems: [
                        {
                            description: "Consulting Services - February",
                            quantity: 20,
                            unitPrice: 120.0
                        },
                        {
                            description: "Software License",
                            quantity: 1,
                            unitPrice: 500.0
                        }
                    ]
                },
                expectedOutput: {
                    id: "g7h8i9j0k1l2m3n4o5p6q7r8",
                    displayedAs: "SI-0043",
                    invoiceNumber: "SI-0043",
                    status: "Draft",
                    contact: {
                        id: "a1b2c3d4e5f6a7b8c9d0e1f2",
                        displayedAs: "Kensington Digital Agency"
                    },
                    date: "2024-02-01",
                    dueDate: "2024-03-01",
                    lineItems: [
                        {
                            id: "li-003",
                            description: "Consulting Services - February",
                            quantity: 20,
                            unitPrice: 120.0,
                            totalAmount: 2400.0,
                            ledgerAccount: "Sales",
                            taxRateId: "GB_STANDARD"
                        },
                        {
                            id: "li-004",
                            description: "Software License",
                            quantity: 1,
                            unitPrice: 500.0,
                            totalAmount: 500.0,
                            ledgerAccount: "Sales",
                            taxRateId: "GB_STANDARD"
                        }
                    ],
                    netAmount: 2900.0,
                    taxAmount: 580.0,
                    totalAmount: 3480.0,
                    outstandingAmount: 3480.0,
                    currency: "GBP",
                    reference: "PO-2024-015",
                    createdAt: "2024-02-01T10:00:00Z",
                    updatedAt: "2024-02-01T10:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "contact_not_found",
                description: "Contact ID does not exist",
                input: {
                    contactId: "000000000000000000000000",
                    date: "2024-02-01",
                    lineItems: [
                        {
                            description: "Test Service",
                            quantity: 1,
                            unitPrice: 100.0
                        }
                    ]
                },
                expectedError: {
                    type: "not_found",
                    message: "Contact with ID '000000000000000000000000' not found",
                    retryable: false
                }
            },
            {
                name: "invalid_ledger_account",
                description: "Ledger account does not exist",
                input: {
                    contactId: "a1b2c3d4e5f6a7b8c9d0e1f2",
                    date: "2024-02-01",
                    lineItems: [
                        {
                            description: "Test Service",
                            quantity: 1,
                            unitPrice: 100.0,
                            ledgerAccountId: "invalid-id"
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "Ledger account 'invalid-id' is not valid",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    contactId: "a1b2c3d4e5f6a7b8c9d0e1f2",
                    date: "2024-02-01",
                    lineItems: [
                        {
                            description: "Test Service",
                            quantity: 1,
                            unitPrice: 100.0
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
    }
];
