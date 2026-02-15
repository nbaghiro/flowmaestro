/**
 * Bill.com Provider Test Fixtures
 *
 * Based on official Bill.com API documentation:
 * https://developer.bill.com/docs/home
 */

import type { TestFixture } from "../../sandbox";

export const billComFixtures: TestFixture[] = [
    // ==================== VENDORS ====================
    {
        operationId: "listVendors",
        provider: "bill-com",
        validCases: [
            {
                name: "list_all_vendors",
                description: "List all vendors with default pagination",
                input: {},
                expectedOutput: {
                    vendors: [
                        {
                            id: "00n01VEND1234567890",
                            entity: "Vendor",
                            name: "Acme Supplies Inc",
                            shortName: "Acme",
                            companyName: "Acme Supplies Inc",
                            isActive: "1",
                            is1099: "2",
                            address1: "123 Business Park",
                            addressCity: "San Francisco",
                            addressState: "CA",
                            addressZip: "94102",
                            addressCountry: "USA",
                            email: "ap@acmesupplies.com",
                            phone: "+1-555-123-4567",
                            payBy: "ACH",
                            createdTime: "2024-01-15T10:00:00Z",
                            updatedTime: "2024-01-18T14:30:00Z"
                        },
                        {
                            id: "00n01VEND2345678901",
                            entity: "Vendor",
                            name: "Cloud Services LLC",
                            shortName: "CloudSvc",
                            companyName: "Cloud Services LLC",
                            isActive: "1",
                            is1099: "1",
                            address1: "456 Tech Center",
                            addressCity: "Seattle",
                            addressState: "WA",
                            addressZip: "98101",
                            addressCountry: "USA",
                            email: "billing@cloudservices.io",
                            payBy: "Check",
                            createdTime: "2024-01-10T09:00:00Z",
                            updatedTime: "2024-01-16T11:00:00Z"
                        }
                    ],
                    count: 2,
                    start: 0,
                    max: 100
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
        operationId: "getVendor",
        provider: "bill-com",
        validCases: [
            {
                name: "get_vendor_by_id",
                description: "Get a specific vendor by ID",
                input: { id: "00n01VEND1234567890" },
                expectedOutput: {
                    id: "00n01VEND1234567890",
                    entity: "Vendor",
                    name: "Acme Supplies Inc",
                    shortName: "Acme",
                    companyName: "Acme Supplies Inc",
                    isActive: "1",
                    is1099: "2",
                    address1: "123 Business Park",
                    addressCity: "San Francisco",
                    addressState: "CA",
                    addressZip: "94102",
                    addressCountry: "USA",
                    email: "ap@acmesupplies.com",
                    phone: "+1-555-123-4567",
                    payBy: "ACH",
                    createdTime: "2024-01-15T10:00:00Z",
                    updatedTime: "2024-01-18T14:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "vendor_not_found",
                description: "Vendor does not exist",
                input: { id: "00n01VENDnonexistent" },
                expectedError: {
                    type: "not_found",
                    message: "Vendor not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createVendor",
        provider: "bill-com",
        validCases: [
            {
                name: "create_basic_vendor",
                description: "Create a vendor with basic information",
                input: {
                    name: "New Vendor Corp",
                    email: "contact@newvendor.com",
                    phone: "+1-555-987-6543",
                    payBy: "ACH"
                },
                expectedOutput: {
                    id: "00n01VEND3456789012",
                    entity: "Vendor",
                    name: "New Vendor Corp",
                    isActive: "1",
                    is1099: "2",
                    email: "contact@newvendor.com",
                    phone: "+1-555-987-6543",
                    payBy: "ACH",
                    createdTime: "2024-01-18T15:00:00Z",
                    updatedTime: "2024-01-18T15:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_vendor",
                description: "Vendor with same name already exists",
                input: { name: "Acme Supplies Inc" },
                expectedError: {
                    type: "validation",
                    message: "Vendor with this name already exists",
                    retryable: false
                }
            }
        ]
    },

    // ==================== BILLS ====================
    {
        operationId: "listBills",
        provider: "bill-com",
        validCases: [
            {
                name: "list_all_bills",
                description: "List all bills with default pagination",
                input: {},
                expectedOutput: {
                    bills: [
                        {
                            id: "00n01BILL1234567890",
                            entity: "Bill",
                            vendorId: "00n01VEND1234567890",
                            invoiceNumber: "INV-2024-001",
                            invoiceDate: "2024-01-15",
                            dueDate: "2024-02-15",
                            amount: "15000.00",
                            amountDue: "15000.00",
                            paymentStatus: "4",
                            approvalStatus: "3",
                            description: "Office supplies order",
                            isActive: "1",
                            createdTime: "2024-01-15T10:30:00Z",
                            updatedTime: "2024-01-15T10:30:00Z"
                        },
                        {
                            id: "00n01BILL2345678901",
                            entity: "Bill",
                            vendorId: "00n01VEND2345678901",
                            invoiceNumber: "CS-2024-0042",
                            invoiceDate: "2024-01-10",
                            dueDate: "2024-02-10",
                            amount: "5000.00",
                            amountDue: "0.00",
                            paymentStatus: "1",
                            approvalStatus: "3",
                            description: "Cloud hosting services",
                            isActive: "1",
                            createdTime: "2024-01-10T09:00:00Z",
                            updatedTime: "2024-01-18T14:00:00Z"
                        }
                    ],
                    count: 2,
                    start: 0,
                    max: 100
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
        operationId: "getBill",
        provider: "bill-com",
        validCases: [
            {
                name: "get_bill_by_id",
                description: "Get a specific bill by ID",
                input: { id: "00n01BILL1234567890" },
                expectedOutput: {
                    id: "00n01BILL1234567890",
                    entity: "Bill",
                    vendorId: "00n01VEND1234567890",
                    invoiceNumber: "INV-2024-001",
                    invoiceDate: "2024-01-15",
                    dueDate: "2024-02-15",
                    amount: "15000.00",
                    amountDue: "15000.00",
                    paymentStatus: "4",
                    approvalStatus: "3",
                    description: "Office supplies order",
                    isActive: "1",
                    createdTime: "2024-01-15T10:30:00Z",
                    updatedTime: "2024-01-15T10:30:00Z",
                    billLineItems: [
                        {
                            entity: "BillLineItem",
                            id: "00n01BLI1234567890",
                            billId: "00n01BILL1234567890",
                            amount: "15000.00",
                            description: "Office supplies",
                            lineType: "1"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "bill_not_found",
                description: "Bill does not exist",
                input: { id: "00n01BILLnonexistent" },
                expectedError: {
                    type: "not_found",
                    message: "Bill not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createBill",
        provider: "bill-com",
        validCases: [
            {
                name: "create_basic_bill",
                description: "Create a bill with line items",
                input: {
                    vendorId: "00n01VEND1234567890",
                    invoiceNumber: "INV-2024-002",
                    invoiceDate: "2024-01-18",
                    dueDate: "2024-02-18",
                    description: "Monthly supplies",
                    billLineItems: [
                        {
                            amount: "5000.00",
                            description: "Paper supplies"
                        },
                        {
                            amount: "2500.00",
                            description: "Ink cartridges"
                        }
                    ]
                },
                expectedOutput: {
                    id: "00n01BILL3456789012",
                    entity: "Bill",
                    vendorId: "00n01VEND1234567890",
                    invoiceNumber: "INV-2024-002",
                    invoiceDate: "2024-01-18",
                    dueDate: "2024-02-18",
                    amount: "7500.00",
                    amountDue: "7500.00",
                    paymentStatus: "4",
                    approvalStatus: "0",
                    description: "Monthly supplies",
                    isActive: "1",
                    createdTime: "2024-01-18T16:00:00Z",
                    updatedTime: "2024-01-18T16:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "vendor_not_found",
                description: "Vendor does not exist",
                input: {
                    vendorId: "00n01VENDnonexistent",
                    invoiceDate: "2024-01-18",
                    dueDate: "2024-02-18",
                    billLineItems: [{ amount: "1000.00" }]
                },
                expectedError: {
                    type: "validation",
                    message: "Vendor not found",
                    retryable: false
                }
            }
        ]
    },

    // ==================== PAYMENTS ====================
    {
        operationId: "createPayment",
        provider: "bill-com",
        validCases: [
            {
                name: "create_payment",
                description: "Create a payment for vendor bills",
                input: {
                    vendorId: "00n01VEND1234567890",
                    processDate: "2024-01-25",
                    billPays: [
                        {
                            billId: "00n01BILL1234567890",
                            amount: "15000.00"
                        }
                    ]
                },
                expectedOutput: {
                    id: "00n01SPAY1234567890",
                    entity: "SentPay",
                    vendorId: "00n01VEND1234567890",
                    processDate: "2024-01-25",
                    amount: "15000.00",
                    status: "0",
                    billPays: [
                        {
                            entity: "BillPay",
                            billId: "00n01BILL1234567890",
                            amount: "15000.00"
                        }
                    ],
                    createdTime: "2024-01-18T17:00:00Z",
                    updatedTime: "2024-01-18T17:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "vendor_not_found",
                description: "Vendor does not exist",
                input: {
                    vendorId: "00n01VENDnonexistent",
                    processDate: "2024-01-25",
                    billPays: [{ billId: "00n01BILL1234567890", amount: "1000.00" }]
                },
                expectedError: {
                    type: "not_found",
                    message: "Vendor or bill not found",
                    retryable: false
                }
            },
            {
                name: "bill_not_found",
                description: "Bill does not exist",
                input: {
                    vendorId: "00n01VEND1234567890",
                    processDate: "2024-01-25",
                    billPays: [{ billId: "00n01BILLnonexistent", amount: "1000.00" }]
                },
                expectedError: {
                    type: "not_found",
                    message: "Vendor or bill not found",
                    retryable: false
                }
            }
        ]
    }
];
