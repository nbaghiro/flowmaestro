/**
 * Xero Provider Test Fixtures
 *
 * Based on official Xero API documentation:
 * - Organisation: https://developer.xero.com/documentation/api/accounting/organisation
 * - Contacts: https://developer.xero.com/documentation/api/accounting/contacts
 * - Invoices: https://developer.xero.com/documentation/api/accounting/invoices
 */

import type { TestFixture } from "../../sandbox";

export const xeroFixtures: TestFixture[] = [
    {
        operationId: "getOrganisation",
        provider: "xero",
        validCases: [
            {
                name: "standard_organisation",
                description: "Get organisation information for a standard business",
                input: {},
                expectedOutput: {
                    organisationId: "b2c885a0-4e84-4c9c-a9ce-af3b7c7b8a3a",
                    name: "Northwind Traders Ltd",
                    legalName: "Northwind Traders Limited",
                    shortCode: "NWT",
                    version: "AU",
                    organisationType: "COMPANY",
                    baseCurrency: "AUD",
                    countryCode: "AU",
                    isDemoCompany: false,
                    taxNumber: "12345678901",
                    financialYearEndDay: 30,
                    financialYearEndMonth: 6,
                    lineOfBusiness: "Wholesale Trade",
                    registrationNumber: "ACN 123 456 789",
                    createdDateUTC: "2022-03-15T00:00:00"
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Not authorized to access organisation info",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Authentication failed. Please reconnect your Xero account.",
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
        provider: "xero",
        validCases: [
            {
                name: "default_list",
                description: "List contacts with default pagination",
                input: {},
                expectedOutput: {
                    contacts: [
                        {
                            contactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                            name: "Melbourne Coffee Roasters",
                            firstName: "James",
                            lastName: "Wilson",
                            emailAddress: "james@melbcoffee.com.au",
                            contactStatus: "ACTIVE",
                            phones: [
                                {
                                    phoneType: "DEFAULT",
                                    phoneNumber: "9876 5432",
                                    phoneAreaCode: "03",
                                    phoneCountryCode: "61"
                                }
                            ],
                            addresses: [
                                {
                                    addressType: "STREET",
                                    addressLine1: "42 Collins Street",
                                    city: "Melbourne",
                                    region: "VIC",
                                    postalCode: "3000",
                                    country: "Australia"
                                }
                            ],
                            isSupplier: true,
                            isCustomer: false,
                            updatedDateUTC: "2024-01-10T08:30:00"
                        },
                        {
                            contactId: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                            name: "Sydney Design Co",
                            emailAddress: "accounts@sydneydesign.com.au",
                            contactStatus: "ACTIVE",
                            isSupplier: false,
                            isCustomer: true,
                            updatedDateUTC: "2024-01-08T14:15:00"
                        },
                        {
                            contactId: "c3d4e5f6-a7b8-9012-cdef-345678901234",
                            name: "Pacific Shipping Ltd",
                            firstName: "Sarah",
                            lastName: "Chen",
                            emailAddress: "sarah.chen@pacificshipping.com",
                            contactStatus: "ACTIVE",
                            phones: [
                                {
                                    phoneType: "DEFAULT",
                                    phoneNumber: "5555 1234",
                                    phoneAreaCode: "02",
                                    phoneCountryCode: "61"
                                }
                            ],
                            isSupplier: true,
                            isCustomer: true,
                            updatedDateUTC: "2024-01-12T10:00:00"
                        }
                    ],
                    count: 3,
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
                    message: "Authentication failed. Please reconnect your Xero account.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getContact",
        provider: "xero",
        validCases: [
            {
                name: "supplier_contact",
                description: "Get a supplier contact with full details",
                input: {
                    contactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                },
                expectedOutput: {
                    contactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    name: "Melbourne Coffee Roasters",
                    firstName: "James",
                    lastName: "Wilson",
                    emailAddress: "james@melbcoffee.com.au",
                    contactStatus: "ACTIVE",
                    phones: [
                        {
                            phoneType: "DEFAULT",
                            phoneNumber: "9876 5432",
                            phoneAreaCode: "03",
                            phoneCountryCode: "61"
                        }
                    ],
                    addresses: [
                        {
                            addressType: "STREET",
                            addressLine1: "42 Collins Street",
                            city: "Melbourne",
                            region: "VIC",
                            postalCode: "3000",
                            country: "Australia"
                        }
                    ],
                    isSupplier: true,
                    isCustomer: false,
                    updatedDateUTC: "2024-01-10T08:30:00"
                }
            }
        ],
        errorCases: [
            {
                name: "contact_not_found",
                description: "Contact ID does not exist",
                input: {
                    contactId: "00000000-0000-0000-0000-000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Contact with ID '00000000-0000-0000-0000-000000000000' not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    contactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
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
        provider: "xero",
        validCases: [
            {
                name: "contact_with_full_details",
                description: "Create a contact with full information",
                input: {
                    name: "Brisbane Tech Solutions",
                    firstName: "Emma",
                    lastName: "Taylor",
                    emailAddress: "emma@brisbanetech.com.au",
                    phone: "3456 7890"
                },
                expectedOutput: {
                    contactId: "d4e5f6a7-b8c9-0123-defg-456789012345",
                    name: "Brisbane Tech Solutions",
                    firstName: "Emma",
                    lastName: "Taylor",
                    emailAddress: "emma@brisbanetech.com.au",
                    contactStatus: "ACTIVE",
                    phones: [
                        {
                            phoneType: "DEFAULT",
                            phoneNumber: "3456 7890"
                        }
                    ],
                    isSupplier: false,
                    isCustomer: false,
                    updatedDateUTC: "2024-01-15T11:00:00"
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_name",
                description: "Contact with same name already exists",
                input: {
                    name: "Melbourne Coffee Roasters"
                },
                expectedError: {
                    type: "validation",
                    message: "A contact with this name already exists in Xero",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "Rate Limited Contact"
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
                    name: "New Contact"
                },
                expectedError: {
                    type: "permission",
                    message: "Authentication failed. Please reconnect your Xero account.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listInvoices",
        provider: "xero",
        validCases: [
            {
                name: "default_list",
                description: "List invoices with default pagination",
                input: {},
                expectedOutput: {
                    invoices: [
                        {
                            invoiceId: "e5f6a7b8-c9d0-1234-efgh-567890123456",
                            invoiceNumber: "INV-0042",
                            type: "ACCREC",
                            status: "AUTHORISED",
                            contact: {
                                contactId: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                                name: "Sydney Design Co"
                            },
                            date: "2024-01-15",
                            dueDate: "2024-02-15",
                            lineItems: [
                                {
                                    lineItemId: "li-001",
                                    description: "Web Design Services - January",
                                    quantity: 40,
                                    unitAmount: 150.0,
                                    lineAmount: 6000.0,
                                    accountCode: "200",
                                    taxType: "OUTPUT"
                                }
                            ],
                            subTotal: 6000.0,
                            totalTax: 600.0,
                            total: 6600.0,
                            amountDue: 6600.0,
                            amountPaid: 0,
                            currencyCode: "AUD",
                            updatedDateUTC: "2024-01-15T09:00:00"
                        },
                        {
                            invoiceId: "f6a7b8c9-d0e1-2345-fghi-678901234567",
                            invoiceNumber: "INV-0041",
                            type: "ACCPAY",
                            status: "PAID",
                            contact: {
                                contactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                name: "Melbourne Coffee Roasters"
                            },
                            date: "2024-01-10",
                            dueDate: "2024-01-25",
                            lineItems: [
                                {
                                    lineItemId: "li-002",
                                    description: "Office Coffee Supplies - Monthly",
                                    quantity: 10,
                                    unitAmount: 45.0,
                                    lineAmount: 450.0,
                                    accountCode: "400",
                                    taxType: "INPUT"
                                }
                            ],
                            subTotal: 450.0,
                            totalTax: 45.0,
                            total: 495.0,
                            amountDue: 0,
                            amountPaid: 495.0,
                            currencyCode: "AUD",
                            updatedDateUTC: "2024-01-20T16:30:00"
                        }
                    ],
                    count: 2,
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
                    message: "Authentication failed. Please reconnect your Xero account.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getInvoice",
        provider: "xero",
        validCases: [
            {
                name: "authorised_invoice",
                description: "Get an authorised sales invoice",
                input: {
                    invoiceId: "e5f6a7b8-c9d0-1234-efgh-567890123456"
                },
                expectedOutput: {
                    invoiceId: "e5f6a7b8-c9d0-1234-efgh-567890123456",
                    invoiceNumber: "INV-0042",
                    type: "ACCREC",
                    status: "AUTHORISED",
                    contact: {
                        contactId: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                        name: "Sydney Design Co"
                    },
                    date: "2024-01-15",
                    dueDate: "2024-02-15",
                    lineItems: [
                        {
                            lineItemId: "li-001",
                            description: "Web Design Services - January",
                            quantity: 40,
                            unitAmount: 150.0,
                            lineAmount: 6000.0,
                            accountCode: "200",
                            taxType: "OUTPUT"
                        }
                    ],
                    subTotal: 6000.0,
                    totalTax: 600.0,
                    total: 6600.0,
                    amountDue: 6600.0,
                    amountPaid: 0,
                    currencyCode: "AUD",
                    updatedDateUTC: "2024-01-15T09:00:00"
                }
            }
        ],
        errorCases: [
            {
                name: "invoice_not_found",
                description: "Invoice ID does not exist",
                input: {
                    invoiceId: "00000000-0000-0000-0000-000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Invoice with ID '00000000-0000-0000-0000-000000000000' not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    invoiceId: "e5f6a7b8-c9d0-1234-efgh-567890123456"
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
        provider: "xero",
        validCases: [
            {
                name: "sales_invoice_with_multiple_items",
                description: "Create a sales invoice with multiple line items",
                input: {
                    type: "ACCREC",
                    contactId: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                    lineItems: [
                        {
                            description: "Consulting Services - February",
                            quantity: 20,
                            unitAmount: 200.0,
                            accountCode: "200"
                        },
                        {
                            description: "Software License",
                            quantity: 1,
                            unitAmount: 500.0,
                            accountCode: "200"
                        }
                    ],
                    dueDate: "2024-03-15",
                    reference: "PO-2024-015"
                },
                expectedOutput: {
                    invoiceId: "g7h8i9j0-k1l2-3456-mnop-789012345678",
                    invoiceNumber: "INV-0043",
                    type: "ACCREC",
                    status: "DRAFT",
                    contact: {
                        contactId: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                        name: "Sydney Design Co"
                    },
                    dueDate: "2024-03-15",
                    lineItems: [
                        {
                            lineItemId: "li-003",
                            description: "Consulting Services - February",
                            quantity: 20,
                            unitAmount: 200.0,
                            lineAmount: 4000.0,
                            accountCode: "200",
                            taxType: "OUTPUT"
                        },
                        {
                            lineItemId: "li-004",
                            description: "Software License",
                            quantity: 1,
                            unitAmount: 500.0,
                            lineAmount: 500.0,
                            accountCode: "200",
                            taxType: "OUTPUT"
                        }
                    ],
                    subTotal: 4500.0,
                    totalTax: 450.0,
                    total: 4950.0,
                    amountDue: 4950.0,
                    amountPaid: 0,
                    currencyCode: "AUD",
                    reference: "PO-2024-015",
                    updatedDateUTC: "2024-02-01T10:00:00"
                }
            }
        ],
        errorCases: [
            {
                name: "contact_not_found",
                description: "Contact ID does not exist",
                input: {
                    type: "ACCREC",
                    contactId: "00000000-0000-0000-0000-000000000000",
                    lineItems: [
                        {
                            description: "Test Service",
                            quantity: 1,
                            unitAmount: 100.0
                        }
                    ]
                },
                expectedError: {
                    type: "not_found",
                    message: "Contact with ID '00000000-0000-0000-0000-000000000000' not found",
                    retryable: false
                }
            },
            {
                name: "invalid_account_code",
                description: "Account code does not exist",
                input: {
                    type: "ACCREC",
                    contactId: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                    lineItems: [
                        {
                            description: "Test Service",
                            quantity: 1,
                            unitAmount: 100.0,
                            accountCode: "99999"
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "Account code '99999' is not valid",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    type: "ACCREC",
                    contactId: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                    lineItems: [
                        {
                            description: "Test Service",
                            quantity: 1,
                            unitAmount: 100.0
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
