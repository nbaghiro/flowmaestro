/**
 * SAP S/4HANA Cloud Provider Test Fixtures
 *
 * Realistic ERP sample data with German-style business partner IDs,
 * SAP material numbers, and SAP document numbers.
 */

import type { TestFixture } from "../../../sandbox";

const sampleBusinessPartners = [
    {
        BusinessPartner: "0010000001",
        BusinessPartnerFullName: "Müller GmbH & Co. KG",
        BusinessPartnerName: "Müller GmbH",
        BusinessPartnerCategory: "2",
        BusinessPartnerGrouping: "BP01",
        FirstName: null,
        LastName: null,
        OrganizationBPName1: "Müller GmbH & Co. KG",
        Industry: "MACH",
        Language: "DE",
        CreationDate: "2023-01-15",
        LastChangeDate: "2024-06-20",
        SearchTerm1: "MUELLER",
        SearchTerm2: null,
        _category: "Organization",
        _industry: "MACH"
    },
    {
        BusinessPartner: "0010000002",
        BusinessPartnerFullName: "Schmidt Automotive AG",
        BusinessPartnerName: "Schmidt Auto",
        BusinessPartnerCategory: "2",
        BusinessPartnerGrouping: "BP01",
        FirstName: null,
        LastName: null,
        OrganizationBPName1: "Schmidt Automotive AG",
        Industry: "AUTO",
        Language: "DE",
        CreationDate: "2022-06-01",
        LastChangeDate: "2024-08-10",
        SearchTerm1: "SCHMIDT",
        SearchTerm2: "AUTO",
        _category: "Organization",
        _industry: "AUTO"
    },
    {
        BusinessPartner: "0020000001",
        BusinessPartnerFullName: "Hans Weber",
        BusinessPartnerName: "Weber, Hans",
        BusinessPartnerCategory: "1",
        BusinessPartnerGrouping: "BP02",
        FirstName: "Hans",
        LastName: "Weber",
        OrganizationBPName1: null,
        Industry: null,
        Language: "DE",
        CreationDate: "2023-03-20",
        LastChangeDate: "2024-05-15",
        SearchTerm1: "WEBER",
        SearchTerm2: null,
        _category: "Person",
        _industry: ""
    }
];

export const sapFixtures: TestFixture[] = [
    {
        operationId: "listBusinessPartners",
        provider: "sap",
        filterableData: {
            records: sampleBusinessPartners,
            recordsField: "businessPartners",
            offsetField: "nextOffset",
            defaultPageSize: 50,
            maxPageSize: 100,
            pageSizeParam: "top",
            offsetParam: "skip",
            filterConfig: {
                type: "generic",
                filterableFields: ["_category", "_industry"]
            }
        },
        validCases: [
            {
                name: "list_all_business_partners",
                description: "List all business partners",
                input: {}
            },
            {
                name: "list_with_pagination",
                description: "List with custom page size",
                input: { top: 10, skip: 0 }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "SAP rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getBusinessPartner",
        provider: "sap",
        validCases: [
            {
                name: "get_organization",
                description: "Get an organization business partner",
                input: { businessPartnerId: "0010000001" },
                expectedOutput: {
                    BusinessPartner: "0010000001",
                    BusinessPartnerFullName: "Müller GmbH & Co. KG",
                    BusinessPartnerCategory: "2",
                    OrganizationBPName1: "Müller GmbH & Co. KG",
                    Industry: "MACH",
                    Language: "DE"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Business partner does not exist",
                input: { businessPartnerId: "9999999999" },
                expectedError: {
                    type: "not_found",
                    message: "The requested SAP resource was not found.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createBusinessPartner",
        provider: "sap",
        validCases: [
            {
                name: "create_organization",
                description: "Create a new organization business partner",
                input: {
                    BusinessPartnerCategory: "2",
                    OrganizationBPName1: "Neue Firma GmbH",
                    Language: "DE",
                    Industry: "ELEC",
                    SearchTerm1: "NEUEFIRMA"
                },
                expectedOutput: {
                    BusinessPartner: "0010000003",
                    BusinessPartnerCategory: "2",
                    OrganizationBPName1: "Neue Firma GmbH",
                    Language: "DE",
                    Industry: "ELEC"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_category",
                description: "Missing required category",
                input: { OrganizationBPName1: "Test" },
                expectedError: {
                    type: "validation",
                    message: "BusinessPartnerCategory is required",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updateBusinessPartner",
        provider: "sap",
        validCases: [
            {
                name: "update_search_term",
                description: "Update business partner search term",
                input: {
                    businessPartnerId: "0010000001",
                    SearchTerm1: "MUELLER-NEW"
                },
                expectedOutput: {
                    BusinessPartner: "0010000001",
                    SearchTerm1: "MUELLER-NEW"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Business partner does not exist",
                input: { businessPartnerId: "9999999999", SearchTerm1: "TEST" },
                expectedError: {
                    type: "not_found",
                    message: "The requested SAP resource was not found.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listSalesOrders",
        provider: "sap",
        validCases: [
            {
                name: "list_all_sales_orders",
                description: "List all sales orders",
                input: {},
                expectedOutput: {
                    salesOrders: [
                        {
                            SalesOrder: "0000000100",
                            SalesOrderType: "OR",
                            SalesOrganization: "1010",
                            DistributionChannel: "10",
                            SoldToParty: "0010000001",
                            TotalNetAmount: "15000.00",
                            TransactionCurrency: "EUR",
                            OverallSDProcessStatus: "C"
                        }
                    ],
                    count: 1,
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Token expired or invalid",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "SAP authentication failed. Please check your credentials.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getSalesOrder",
        provider: "sap",
        validCases: [
            {
                name: "get_sales_order",
                description: "Get sales order details",
                input: { salesOrderId: "0000000100" },
                expectedOutput: {
                    SalesOrder: "0000000100",
                    SalesOrderType: "OR",
                    SalesOrganization: "1010",
                    SoldToParty: "0010000001",
                    TotalNetAmount: "15000.00",
                    TransactionCurrency: "EUR"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Sales order does not exist",
                input: { salesOrderId: "9999999999" },
                expectedError: {
                    type: "not_found",
                    message: "The requested SAP resource was not found.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createSalesOrder",
        provider: "sap",
        validCases: [
            {
                name: "create_standard_order",
                description: "Create a standard sales order",
                input: {
                    SalesOrderType: "OR",
                    SalesOrganization: "1010",
                    DistributionChannel: "10",
                    OrganizationDivision: "00",
                    SoldToParty: "0010000001"
                },
                expectedOutput: {
                    SalesOrder: "0000000101",
                    SalesOrderType: "OR",
                    SalesOrganization: "1010",
                    SoldToParty: "0010000001"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_sold_to_party",
                description: "Sold-to party does not exist",
                input: {
                    SalesOrderType: "OR",
                    SalesOrganization: "1010",
                    DistributionChannel: "10",
                    OrganizationDivision: "00",
                    SoldToParty: "9999999999"
                },
                expectedError: {
                    type: "server_error",
                    message: "SAP API error: Business partner 9999999999 does not exist",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listPurchaseOrders",
        provider: "sap",
        validCases: [
            {
                name: "list_all_purchase_orders",
                description: "List all purchase orders",
                input: {},
                expectedOutput: {
                    purchaseOrders: [
                        {
                            PurchaseOrder: "4500000001",
                            PurchaseOrderType: "NB",
                            PurchasingOrganization: "1010",
                            Supplier: "0010000002",
                            DocumentCurrency: "EUR",
                            PurchasingProcessingStatus: "02"
                        }
                    ],
                    count: 1,
                    hasMore: false
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "getPurchaseOrder",
        provider: "sap",
        validCases: [
            {
                name: "get_purchase_order",
                description: "Get purchase order details",
                input: { purchaseOrderId: "4500000001" },
                expectedOutput: {
                    PurchaseOrder: "4500000001",
                    PurchaseOrderType: "NB",
                    PurchasingOrganization: "1010",
                    Supplier: "0010000002"
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "createPurchaseOrder",
        provider: "sap",
        validCases: [
            {
                name: "create_standard_po",
                description: "Create a standard purchase order",
                input: {
                    PurchaseOrderType: "NB",
                    PurchasingOrganization: "1010",
                    PurchasingGroup: "001",
                    Supplier: "0010000002"
                },
                expectedOutput: {
                    PurchaseOrder: "4500000002",
                    PurchaseOrderType: "NB",
                    Supplier: "0010000002"
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "listMaterials",
        provider: "sap",
        validCases: [
            {
                name: "list_all_materials",
                description: "List all materials/products",
                input: {},
                expectedOutput: {
                    materials: [
                        {
                            Material: "MZ-FG-R100",
                            MaterialType: "FERT",
                            MaterialGroup: "L001",
                            BaseUnit: "EA",
                            MaterialDescription: "Finished Good R100",
                            GrossWeight: "2.500",
                            WeightUnit: "KG"
                        }
                    ],
                    count: 1,
                    hasMore: false
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "getMaterial",
        provider: "sap",
        validCases: [
            {
                name: "get_material",
                description: "Get material details",
                input: { materialId: "MZ-FG-R100" },
                expectedOutput: {
                    Material: "MZ-FG-R100",
                    MaterialType: "FERT",
                    MaterialGroup: "L001",
                    BaseUnit: "EA",
                    MaterialDescription: "Finished Good R100"
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "listInvoices",
        provider: "sap",
        validCases: [
            {
                name: "list_all_invoices",
                description: "List all billing documents/invoices",
                input: {},
                expectedOutput: {
                    invoices: [
                        {
                            BillingDocument: "9000000001",
                            BillingDocumentType: "F2",
                            SalesOrganization: "1010",
                            BillingDocumentDate: "2024-03-15",
                            TotalNetAmount: "15000.00",
                            TransactionCurrency: "EUR",
                            PayerParty: "0010000001",
                            SoldToParty: "0010000001"
                        }
                    ],
                    count: 1,
                    hasMore: false
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "getInvoice",
        provider: "sap",
        validCases: [
            {
                name: "get_invoice",
                description: "Get billing document details",
                input: { invoiceId: "9000000001" },
                expectedOutput: {
                    BillingDocument: "9000000001",
                    BillingDocumentType: "F2",
                    TotalNetAmount: "15000.00",
                    TransactionCurrency: "EUR"
                }
            }
        ],
        errorCases: []
    }
];
