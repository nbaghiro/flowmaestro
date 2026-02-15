/**
 * NetSuite Provider Test Fixtures
 *
 * Realistic ERP sample data with NetSuite internal IDs (numeric),
 * customer names, and realistic invoice/SO data.
 */

import type { TestFixture } from "../../sandbox";

const sampleCustomers = [
    {
        id: "1042",
        companyName: "Acme Corporation",
        firstName: null,
        lastName: null,
        email: "accounts@acmecorp.com",
        phone: "+1-555-0101",
        entityId: "CUST-1042",
        entityStatus: { id: "13", refName: "Customer - Closed Won" },
        category: { id: "1", refName: "Corporate" },
        subsidiary: { id: "1", refName: "Parent Company" },
        currency: { id: "1", refName: "USD" },
        dateCreated: "2022-01-15T08:30:00Z",
        lastModifiedDate: "2024-06-20T14:22:00Z",
        _category: "Corporate",
        _status: "active"
    },
    {
        id: "1055",
        companyName: "Global Industries LLC",
        firstName: null,
        lastName: null,
        email: "ap@globalindustries.com",
        phone: "+1-555-0202",
        entityId: "CUST-1055",
        entityStatus: { id: "13", refName: "Customer - Closed Won" },
        category: { id: "1", refName: "Corporate" },
        subsidiary: { id: "1", refName: "Parent Company" },
        currency: { id: "1", refName: "USD" },
        dateCreated: "2022-03-22T10:00:00Z",
        lastModifiedDate: "2024-08-10T09:15:00Z",
        _category: "Corporate",
        _status: "active"
    },
    {
        id: "1078",
        companyName: null,
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah.johnson@email.com",
        phone: "+1-555-0303",
        entityId: "CUST-1078",
        entityStatus: { id: "6", refName: "Customer - Prospect" },
        category: { id: "2", refName: "Individual" },
        subsidiary: { id: "1", refName: "Parent Company" },
        currency: { id: "1", refName: "USD" },
        dateCreated: "2024-01-10T16:45:00Z",
        lastModifiedDate: "2024-09-05T11:30:00Z",
        _category: "Individual",
        _status: "active"
    }
];

export const netsuiteFixtures: TestFixture[] = [
    {
        operationId: "listCustomers",
        provider: "netsuite",
        filterableData: {
            records: sampleCustomers,
            recordsField: "customers",
            offsetField: "nextOffset",
            defaultPageSize: 50,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["_category", "_status"]
            }
        },
        validCases: [
            {
                name: "list_all_customers",
                description: "List all customers",
                input: {}
            },
            {
                name: "list_with_pagination",
                description: "List customers with pagination",
                input: { limit: 10, offset: 0 }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "NetSuite rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getCustomer",
        provider: "netsuite",
        validCases: [
            {
                name: "get_company_customer",
                description: "Get a company customer by ID",
                input: { customerId: "1042" },
                expectedOutput: {
                    id: "1042",
                    companyName: "Acme Corporation",
                    email: "accounts@acmecorp.com",
                    entityId: "CUST-1042",
                    entityStatus: { id: "13", refName: "Customer - Closed Won" }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Customer does not exist",
                input: { customerId: "999999" },
                expectedError: {
                    type: "not_found",
                    message: "The requested NetSuite resource was not found.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createCustomer",
        provider: "netsuite",
        validCases: [
            {
                name: "create_company_customer",
                description: "Create a new company customer",
                input: {
                    companyName: "New Ventures Inc",
                    email: "info@newventures.com",
                    phone: "+1-555-0404",
                    subsidiary: { id: "1" }
                },
                expectedOutput: {
                    id: "1100",
                    companyName: "New Ventures Inc",
                    email: "info@newventures.com",
                    entityId: "CUST-1100"
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_email",
                description: "Email already exists",
                input: {
                    companyName: "Duplicate Corp",
                    email: "accounts@acmecorp.com"
                },
                expectedError: {
                    type: "server_error",
                    message: "NetSuite API error: A customer with this email already exists",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updateCustomer",
        provider: "netsuite",
        validCases: [
            {
                name: "update_customer_email",
                description: "Update a customer email address",
                input: {
                    customerId: "1042",
                    email: "new-accounts@acmecorp.com"
                },
                expectedOutput: {
                    id: "1042",
                    companyName: "Acme Corporation",
                    email: "new-accounts@acmecorp.com"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Customer does not exist",
                input: { customerId: "999999", email: "test@test.com" },
                expectedError: {
                    type: "not_found",
                    message: "The requested NetSuite resource was not found.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listSalesOrders",
        provider: "netsuite",
        validCases: [
            {
                name: "list_all_sales_orders",
                description: "List all sales orders",
                input: {},
                expectedOutput: {
                    salesOrders: [
                        {
                            id: "5001",
                            tranId: "SO-5001",
                            entity: { id: "1042", refName: "Acme Corporation" },
                            tranDate: "2024-03-15",
                            status: { id: "B", refName: "Pending Fulfillment" },
                            total: 24500.0,
                            currency: { id: "1", refName: "USD" }
                        }
                    ],
                    totalResults: 1,
                    hasMore: false
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "getSalesOrder",
        provider: "netsuite",
        validCases: [
            {
                name: "get_sales_order",
                description: "Get sales order details",
                input: { salesOrderId: "5001" },
                expectedOutput: {
                    id: "5001",
                    tranId: "SO-5001",
                    entity: { id: "1042", refName: "Acme Corporation" },
                    total: 24500.0
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "createSalesOrder",
        provider: "netsuite",
        validCases: [
            {
                name: "create_sales_order",
                description: "Create a new sales order",
                input: {
                    entity: { id: "1042" },
                    memo: "Q1 bulk order"
                },
                expectedOutput: {
                    id: "5002",
                    tranId: "SO-5002",
                    entity: { id: "1042", refName: "Acme Corporation" }
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "listPurchaseOrders",
        provider: "netsuite",
        validCases: [
            {
                name: "list_all_purchase_orders",
                description: "List all purchase orders",
                input: {},
                expectedOutput: {
                    purchaseOrders: [
                        {
                            id: "7001",
                            tranId: "PO-7001",
                            entity: { id: "2001", refName: "Supply Co" },
                            tranDate: "2024-04-01",
                            status: { id: "B", refName: "Pending Receipt" },
                            total: 8750.0
                        }
                    ],
                    totalResults: 1,
                    hasMore: false
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "getPurchaseOrder",
        provider: "netsuite",
        validCases: [
            {
                name: "get_purchase_order",
                description: "Get purchase order details",
                input: { purchaseOrderId: "7001" },
                expectedOutput: {
                    id: "7001",
                    tranId: "PO-7001",
                    entity: { id: "2001", refName: "Supply Co" },
                    total: 8750.0
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "createPurchaseOrder",
        provider: "netsuite",
        validCases: [
            {
                name: "create_purchase_order",
                description: "Create a new purchase order",
                input: {
                    entity: { id: "2001" },
                    memo: "Monthly supplies"
                },
                expectedOutput: {
                    id: "7002",
                    tranId: "PO-7002",
                    entity: { id: "2001", refName: "Supply Co" }
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "listInvoices",
        provider: "netsuite",
        validCases: [
            {
                name: "list_all_invoices",
                description: "List all invoices",
                input: {},
                expectedOutput: {
                    invoices: [
                        {
                            id: "9001",
                            tranId: "INV-9001",
                            entity: { id: "1042", refName: "Acme Corporation" },
                            tranDate: "2024-03-20",
                            status: { id: "A", refName: "Open" },
                            total: 24500.0,
                            amountRemaining: 24500.0,
                            dueDate: "2024-04-19"
                        }
                    ],
                    totalResults: 1,
                    hasMore: false
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "getInvoice",
        provider: "netsuite",
        validCases: [
            {
                name: "get_invoice",
                description: "Get invoice details",
                input: { invoiceId: "9001" },
                expectedOutput: {
                    id: "9001",
                    tranId: "INV-9001",
                    total: 24500.0,
                    amountRemaining: 24500.0
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "createInvoice",
        provider: "netsuite",
        validCases: [
            {
                name: "create_invoice",
                description: "Create a new invoice",
                input: {
                    entity: { id: "1042" },
                    memo: "Services rendered Q1"
                },
                expectedOutput: {
                    id: "9002",
                    tranId: "INV-9002",
                    entity: { id: "1042", refName: "Acme Corporation" }
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "listItems",
        provider: "netsuite",
        validCases: [
            {
                name: "list_all_items",
                description: "List all inventory items",
                input: {},
                expectedOutput: {
                    items: [
                        {
                            id: "3001",
                            itemId: "WIDGET-A100",
                            displayName: "Widget A-100",
                            type: "inventoryItem",
                            baseUnit: { id: "1", refName: "Each" },
                            cost: 12.5,
                            salesPrice: 29.99,
                            isInactive: false
                        }
                    ],
                    totalResults: 1,
                    hasMore: false
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "getItem",
        provider: "netsuite",
        validCases: [
            {
                name: "get_item",
                description: "Get item details",
                input: { itemId: "3001" },
                expectedOutput: {
                    id: "3001",
                    itemId: "WIDGET-A100",
                    displayName: "Widget A-100",
                    type: "inventoryItem",
                    cost: 12.5,
                    salesPrice: 29.99
                }
            }
        ],
        errorCases: []
    }
];
