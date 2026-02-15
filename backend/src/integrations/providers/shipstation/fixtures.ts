import type {
    ListOrdersParams,
    GetOrderParams,
    CreateOrderParams,
    UpdateOrderStatusParams,
    CreateShipmentParams,
    GetRatesParams,
    CreateLabelParams,
    VoidLabelParams,
    ListCarriersParams,
    ListServicesParams,
    ListWarehousesParams,
    ListStoresParams
} from "./schemas";
import type { TestFixture } from "../../sandbox/types";

// ==========================================
// Order Fixtures
// ==========================================

export const listOrdersFixture: TestFixture<ListOrdersParams, unknown> = {
    provider: "shipstation",
    operationId: "listOrders",
    validCases: [
        {
            name: "List all orders",
            input: { page: 1, pageSize: 100, sortDir: "DESC" },
            expectedOutput: {
                orders: [],
                total: 0,
                page: 1,
                pages: 0
            }
        },
        {
            name: "List awaiting shipment orders",
            input: { orderStatus: "awaiting_shipment", page: 1, pageSize: 50, sortDir: "DESC" },
            expectedOutput: {
                orders: [],
                total: 0,
                page: 1,
                pages: 0
            }
        }
    ],
    errorCases: [
        {
            name: "Invalid API credentials",
            input: { page: 1, pageSize: 100, sortDir: "DESC" },
            expectedError: {
                type: "permission",
                message: "Invalid API Key or Secret",
                retryable: false
            }
        },
        {
            name: "Rate limit exceeded",
            input: { page: 1, pageSize: 100, sortDir: "DESC" },
            expectedError: {
                type: "rate_limit",
                message: "Too many requests. ShipStation allows 40 requests per minute.",
                retryable: true
            }
        }
    ]
};

export const getOrderFixture: TestFixture<GetOrderParams, unknown> = {
    provider: "shipstation",
    operationId: "getOrder",
    validCases: [
        {
            name: "Get order by ID",
            input: { orderId: 12345 },
            expectedOutput: {
                order: {
                    orderId: 12345,
                    orderNumber: "ORD-001",
                    orderStatus: "awaiting_shipment"
                }
            }
        }
    ],
    errorCases: [
        {
            name: "Order not found",
            input: { orderId: 999999 },
            expectedError: {
                type: "not_found",
                message: "Order not found",
                retryable: false
            }
        }
    ]
};

export const createOrderFixture: TestFixture<CreateOrderParams, unknown> = {
    provider: "shipstation",
    operationId: "createOrder",
    validCases: [
        {
            name: "Create new order",
            input: {
                orderNumber: "TEST-001",
                orderDate: "2025-01-15T00:00:00Z",
                orderStatus: "awaiting_shipment",
                billTo: {
                    name: "John Doe",
                    street1: "123 Main St",
                    city: "New York",
                    state: "NY",
                    postalCode: "10001",
                    country: "US"
                },
                shipTo: {
                    name: "John Doe",
                    street1: "123 Main St",
                    city: "New York",
                    state: "NY",
                    postalCode: "10001",
                    country: "US"
                },
                items: [
                    {
                        sku: "SKU-001",
                        name: "Test Product",
                        quantity: 1,
                        unitPrice: 29.99
                    }
                ]
            },
            expectedOutput: {
                orderId: 12345,
                orderNumber: "TEST-001",
                message: "Order created successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Duplicate order number",
            input: {
                orderNumber: "EXISTING-001",
                orderDate: "2025-01-15T00:00:00Z",
                orderStatus: "awaiting_shipment",
                billTo: {
                    name: "John Doe",
                    street1: "123 Main St",
                    city: "New York",
                    state: "NY",
                    postalCode: "10001",
                    country: "US"
                },
                shipTo: {
                    name: "John Doe",
                    street1: "123 Main St",
                    city: "New York",
                    state: "NY",
                    postalCode: "10001",
                    country: "US"
                },
                items: [
                    {
                        name: "Test Product",
                        quantity: 1,
                        unitPrice: 29.99
                    }
                ]
            },
            expectedError: {
                type: "validation",
                message: "An order with this order number already exists",
                retryable: false
            }
        },
        {
            name: "Invalid address",
            input: {
                orderNumber: "TEST-002",
                orderDate: "2025-01-15T00:00:00Z",
                orderStatus: "awaiting_shipment",
                billTo: {
                    name: "John Doe",
                    street1: "123 Main St",
                    city: "New York",
                    state: "NY",
                    postalCode: "10001",
                    country: "US"
                },
                shipTo: {
                    name: "",
                    street1: "",
                    city: "",
                    state: "",
                    postalCode: "",
                    country: "XX"
                },
                items: [
                    {
                        name: "Test Product",
                        quantity: 1,
                        unitPrice: 29.99
                    }
                ]
            },
            expectedError: {
                type: "validation",
                message: "Invalid shipping address",
                retryable: false
            }
        }
    ]
};

export const updateOrderStatusFixture: TestFixture<UpdateOrderStatusParams, unknown> = {
    provider: "shipstation",
    operationId: "updateOrderStatus",
    validCases: [
        {
            name: "Mark order as shipped",
            input: {
                orderId: 12345,
                carrierCode: "ups",
                shipDate: "2025-01-15T00:00:00Z",
                trackingNumber: "1Z999AA10123456784",
                notifyCustomer: true,
                notifySalesChannel: true
            },
            expectedOutput: {
                orderId: 12345,
                status: "shipped",
                carrierCode: "ups",
                trackingNumber: "1Z999AA10123456784",
                message: "Order marked as shipped"
            }
        }
    ],
    errorCases: [
        {
            name: "Order not found",
            input: {
                orderId: 999999,
                carrierCode: "ups",
                shipDate: "2025-01-15T00:00:00Z",
                notifyCustomer: true,
                notifySalesChannel: true
            },
            expectedError: {
                type: "not_found",
                message: "Order not found",
                retryable: false
            }
        },
        {
            name: "Invalid carrier code",
            input: {
                orderId: 12345,
                carrierCode: "invalid_carrier",
                shipDate: "2025-01-15T00:00:00Z",
                notifyCustomer: true,
                notifySalesChannel: true
            },
            expectedError: {
                type: "validation",
                message: "Invalid carrier code",
                retryable: false
            }
        },
        {
            name: "Order already shipped",
            input: {
                orderId: 12345,
                carrierCode: "ups",
                shipDate: "2025-01-15T00:00:00Z",
                notifyCustomer: true,
                notifySalesChannel: true
            },
            expectedError: {
                type: "validation",
                message: "Order has already been shipped",
                retryable: false
            }
        }
    ]
};

// ==========================================
// Shipment Fixtures
// ==========================================

export const createShipmentFixture: TestFixture<CreateShipmentParams, unknown> = {
    provider: "shipstation",
    operationId: "createShipment",
    validCases: [
        {
            name: "Create shipment with label",
            input: {
                orderId: 12345,
                carrierCode: "ups",
                serviceCode: "ups_ground",
                shipDate: "2025-01-15T00:00:00Z",
                weight: { value: 2, units: "pounds" },
                confirmation: "none",
                testLabel: false
            },
            expectedOutput: {
                shipmentId: 67890,
                shipmentCost: 12.5,
                trackingNumber: "1Z999AA10123456784",
                message: "Shipment created successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Order not found",
            input: {
                orderId: 999999,
                carrierCode: "ups",
                serviceCode: "ups_ground",
                shipDate: "2025-01-15T00:00:00Z",
                weight: { value: 2, units: "pounds" },
                confirmation: "none",
                testLabel: false
            },
            expectedError: {
                type: "not_found",
                message: "Order not found",
                retryable: false
            }
        },
        {
            name: "Invalid service code",
            input: {
                orderId: 12345,
                carrierCode: "ups",
                serviceCode: "invalid_service",
                shipDate: "2025-01-15T00:00:00Z",
                weight: { value: 2, units: "pounds" },
                confirmation: "none",
                testLabel: false
            },
            expectedError: {
                type: "validation",
                message: "Invalid service code for carrier",
                retryable: false
            }
        },
        {
            name: "Carrier not connected",
            input: {
                orderId: 12345,
                carrierCode: "fedex",
                serviceCode: "fedex_ground",
                shipDate: "2025-01-15T00:00:00Z",
                weight: { value: 2, units: "pounds" },
                confirmation: "none",
                testLabel: false
            },
            expectedError: {
                type: "validation",
                message: "Carrier account not connected",
                retryable: false
            }
        }
    ]
};

// ==========================================
// Rate Fixtures
// ==========================================

export const getRatesFixture: TestFixture<GetRatesParams, unknown> = {
    provider: "shipstation",
    operationId: "getRates",
    validCases: [
        {
            name: "Get shipping rates",
            input: {
                fromPostalCode: "94107",
                toPostalCode: "10001",
                toCountry: "US",
                weight: { value: 2, units: "pounds" },
                residential: false
            },
            expectedOutput: {
                rates: [],
                rate_count: 0
            }
        }
    ],
    errorCases: [
        {
            name: "Invalid postal code",
            input: {
                fromPostalCode: "00000",
                toPostalCode: "10001",
                toCountry: "US",
                weight: { value: 2, units: "pounds" },
                residential: false
            },
            expectedError: {
                type: "validation",
                message: "Invalid origin postal code",
                retryable: false
            }
        },
        {
            name: "No carriers available",
            input: {
                fromPostalCode: "94107",
                toPostalCode: "99999",
                toCountry: "US",
                weight: { value: 2, units: "pounds" },
                residential: false
            },
            expectedError: {
                type: "validation",
                message: "No carriers available for this route",
                retryable: false
            }
        }
    ]
};

// ==========================================
// Label Fixtures
// ==========================================

export const createLabelFixture: TestFixture<CreateLabelParams, unknown> = {
    provider: "shipstation",
    operationId: "createLabel",
    validCases: [
        {
            name: "Create shipping label",
            input: {
                orderId: 12345,
                carrierCode: "usps",
                serviceCode: "usps_priority_mail",
                shipDate: "2025-01-15T00:00:00Z",
                weight: { value: 1, units: "pounds" },
                confirmation: "none",
                testLabel: false
            },
            expectedOutput: {
                shipmentId: 67890,
                trackingNumber: "9400111899223456789012",
                message: "Label created successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Order not found",
            input: {
                orderId: 999999,
                carrierCode: "usps",
                serviceCode: "usps_priority_mail",
                shipDate: "2025-01-15T00:00:00Z",
                weight: { value: 1, units: "pounds" },
                confirmation: "none",
                testLabel: false
            },
            expectedError: {
                type: "not_found",
                message: "Order not found",
                retryable: false
            }
        },
        {
            name: "Insufficient postage balance",
            input: {
                orderId: 12345,
                carrierCode: "usps",
                serviceCode: "usps_priority_mail",
                shipDate: "2025-01-15T00:00:00Z",
                weight: { value: 1, units: "pounds" },
                confirmation: "none",
                testLabel: false
            },
            expectedError: {
                type: "validation",
                message: "Insufficient postage balance. Please add funds.",
                retryable: false
            }
        }
    ]
};

export const voidLabelFixture: TestFixture<VoidLabelParams, unknown> = {
    provider: "shipstation",
    operationId: "voidLabel",
    validCases: [
        {
            name: "Void shipping label",
            input: { shipmentId: 67890 },
            expectedOutput: {
                shipmentId: 67890,
                voided: true,
                message: "Label voided successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Shipment not found",
            input: { shipmentId: 999999 },
            expectedError: {
                type: "not_found",
                message: "Shipment not found",
                retryable: false
            }
        },
        {
            name: "Label already voided",
            input: { shipmentId: 67890 },
            expectedError: {
                type: "validation",
                message: "Label has already been voided",
                retryable: false
            }
        },
        {
            name: "Cannot void - shipment in transit",
            input: { shipmentId: 67890 },
            expectedError: {
                type: "validation",
                message: "Cannot void label - shipment is already in transit",
                retryable: false
            }
        }
    ]
};

// ==========================================
// Carrier Fixtures
// ==========================================

export const listCarriersFixture: TestFixture<ListCarriersParams, unknown> = {
    provider: "shipstation",
    operationId: "listCarriers",
    validCases: [
        {
            name: "List carriers",
            input: {},
            expectedOutput: {
                carriers: [],
                carrier_count: 0
            }
        }
    ],
    errorCases: [
        {
            name: "Server error",
            input: {},
            expectedError: {
                type: "server_error",
                message: "Internal server error",
                retryable: true
            }
        }
    ]
};

export const listServicesFixture: TestFixture<ListServicesParams, unknown> = {
    provider: "shipstation",
    operationId: "listServices",
    validCases: [
        {
            name: "List UPS services",
            input: { carrierCode: "ups" },
            expectedOutput: {
                services: [],
                service_count: 0,
                carrierCode: "ups"
            }
        }
    ],
    errorCases: [
        {
            name: "Invalid carrier code",
            input: { carrierCode: "invalid_carrier" },
            expectedError: {
                type: "validation",
                message: "Invalid carrier code",
                retryable: false
            }
        },
        {
            name: "Carrier not connected",
            input: { carrierCode: "fedex" },
            expectedError: {
                type: "validation",
                message: "Carrier not connected to account",
                retryable: false
            }
        }
    ]
};

// ==========================================
// Warehouse Fixtures
// ==========================================

export const listWarehousesFixture: TestFixture<ListWarehousesParams, unknown> = {
    provider: "shipstation",
    operationId: "listWarehouses",
    validCases: [
        {
            name: "List warehouses",
            input: {},
            expectedOutput: {
                warehouses: [],
                warehouse_count: 0
            }
        }
    ],
    errorCases: [
        {
            name: "Permission denied",
            input: {},
            expectedError: {
                type: "permission",
                message: "Access denied to warehouse management",
                retryable: false
            }
        }
    ]
};

// ==========================================
// Store Fixtures
// ==========================================

export const listStoresFixture: TestFixture<ListStoresParams, unknown> = {
    provider: "shipstation",
    operationId: "listStores",
    validCases: [
        {
            name: "List stores",
            input: { showInactive: false },
            expectedOutput: {
                stores: [],
                store_count: 0
            }
        }
    ],
    errorCases: [
        {
            name: "Rate limit exceeded",
            input: { showInactive: false },
            expectedError: {
                type: "rate_limit",
                message: "Too many requests. ShipStation allows 40 requests per minute.",
                retryable: true
            }
        }
    ]
};

// ==========================================
// Export all fixtures
// ==========================================

export const shipstationFixtures = [
    listOrdersFixture,
    getOrderFixture,
    createOrderFixture,
    updateOrderStatusFixture,
    createShipmentFixture,
    getRatesFixture,
    createLabelFixture,
    voidLabelFixture,
    listCarriersFixture,
    listServicesFixture,
    listWarehousesFixture,
    listStoresFixture
];
