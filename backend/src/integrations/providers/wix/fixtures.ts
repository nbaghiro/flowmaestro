/**
 * Wix Test Fixtures
 *
 * Provides sandbox test data for Wix integration operations.
 */

import type { WixProduct, WixOrder, WixInventoryItem, WixCollection } from "./operations/types";
import type { TestFixture } from "../../sandbox/types";

// ==========================================
// Sample Data
// ==========================================

const sampleProducts: WixProduct[] = [
    {
        id: "prod_abc123",
        name: "Handmade Ceramic Vase",
        slug: "handmade-ceramic-vase",
        visible: true,
        productType: "physical",
        description: "Beautiful handcrafted vase made from premium clay",
        sku: "VASE-001",
        weight: 2.5,
        priceData: {
            currency: "USD",
            price: 45.0,
            discountedPrice: 40.0,
            formatted: {
                price: "$45.00",
                discountedPrice: "$40.00"
            }
        },
        stock: {
            trackInventory: true,
            quantity: 15,
            inStock: true
        },
        variants: [
            {
                id: "var_def456",
                choices: { Color: "Blue" },
                sku: "VASE-BLUE-001",
                priceData: { currency: "USD", price: 45.0 },
                stock: { trackInventory: true, quantity: 5, inStock: true }
            },
            {
                id: "var_ghi789",
                choices: { Color: "White" },
                sku: "VASE-WHITE-001",
                priceData: { currency: "USD", price: 45.0 },
                stock: { trackInventory: true, quantity: 10, inStock: true }
            }
        ],
        media: {
            mainMedia: {
                image: {
                    url: "https://static.wixstatic.com/media/vase-blue.jpg",
                    altText: "Blue ceramic vase"
                }
            }
        },
        createdDate: "2024-01-15T10:30:00.000Z",
        lastUpdated: "2024-01-20T14:45:00.000Z"
    },
    {
        id: "prod_xyz789",
        name: "Organic Cotton T-Shirt",
        slug: "organic-cotton-t-shirt",
        visible: true,
        productType: "physical",
        description: "Soft and sustainable organic cotton t-shirt",
        sku: "TSHIRT-001",
        weight: 0.3,
        priceData: {
            currency: "USD",
            price: 29.99,
            formatted: { price: "$29.99" }
        },
        stock: {
            trackInventory: true,
            quantity: 100,
            inStock: true
        },
        createdDate: "2024-01-10T08:00:00.000Z",
        lastUpdated: "2024-01-18T12:00:00.000Z"
    },
    {
        id: "prod_mno456",
        name: "Digital Art Print",
        slug: "digital-art-print",
        visible: true,
        productType: "digital",
        description: "High-resolution digital art print for download",
        sku: "PRINT-001",
        priceData: {
            currency: "USD",
            price: 15.0,
            formatted: { price: "$15.00" }
        },
        stock: {
            trackInventory: false,
            inStock: true
        },
        createdDate: "2024-01-05T09:00:00.000Z",
        lastUpdated: "2024-01-05T09:00:00.000Z"
    },
    {
        id: "prod_pqr123",
        name: "Wooden Cutting Board",
        slug: "wooden-cutting-board",
        visible: false,
        productType: "physical",
        description: "Hand-carved wooden cutting board",
        sku: "BOARD-001",
        weight: 1.5,
        priceData: {
            currency: "USD",
            price: 55.0,
            formatted: { price: "$55.00" }
        },
        stock: {
            trackInventory: true,
            quantity: 0,
            inStock: false
        },
        createdDate: "2024-01-12T11:00:00.000Z",
        lastUpdated: "2024-01-19T16:30:00.000Z"
    },
    {
        id: "prod_stu456",
        name: "Scented Candle Set",
        slug: "scented-candle-set",
        visible: true,
        productType: "physical",
        description: "Set of 3 hand-poured scented candles",
        sku: "CANDLE-SET-001",
        weight: 0.8,
        priceData: {
            currency: "USD",
            price: 35.0,
            discountedPrice: 28.0,
            formatted: {
                price: "$35.00",
                discountedPrice: "$28.00"
            }
        },
        stock: {
            trackInventory: true,
            quantity: 25,
            inStock: true
        },
        createdDate: "2024-01-08T14:00:00.000Z",
        lastUpdated: "2024-01-21T10:00:00.000Z"
    }
];

const sampleOrders: WixOrder[] = [
    {
        id: "order_xyz789",
        number: "10042",
        createdDate: "2024-01-15T10:30:00.000Z",
        updatedDate: "2024-01-15T14:45:00.000Z",
        buyerInfo: {
            contactId: "contact_abc",
            email: "customer@example.com",
            firstName: "Jane",
            lastName: "Doe"
        },
        status: "APPROVED",
        fulfillmentStatus: "NOT_FULFILLED",
        paymentStatus: "PAID",
        lineItems: [
            {
                id: "li_123",
                productId: "prod_abc123",
                name: "Handmade Ceramic Vase",
                quantity: 2,
                sku: "VASE-BLUE-001",
                price: { amount: "44.50", currency: "USD" },
                totalPrice: { amount: "89.00", currency: "USD" }
            }
        ],
        totals: {
            subtotal: { amount: "89.00", currency: "USD" },
            shipping: { amount: "9.95", currency: "USD" },
            tax: { amount: "7.82", currency: "USD" },
            total: { amount: "106.77", currency: "USD" }
        },
        shippingInfo: {
            shipmentDetails: {
                address: {
                    addressLine1: "123 Main Street",
                    city: "Portland",
                    subdivision: "OR",
                    postalCode: "97201",
                    country: "US"
                }
            }
        }
    },
    {
        id: "order_abc456",
        number: "10041",
        createdDate: "2024-01-14T16:00:00.000Z",
        updatedDate: "2024-01-16T09:00:00.000Z",
        buyerInfo: {
            contactId: "contact_def",
            email: "john@example.com",
            firstName: "John",
            lastName: "Smith"
        },
        status: "APPROVED",
        fulfillmentStatus: "FULFILLED",
        paymentStatus: "PAID",
        lineItems: [
            {
                id: "li_456",
                productId: "prod_xyz789",
                name: "Organic Cotton T-Shirt",
                quantity: 3,
                sku: "TSHIRT-001",
                price: { amount: "29.99", currency: "USD" },
                totalPrice: { amount: "89.97", currency: "USD" }
            }
        ],
        totals: {
            subtotal: { amount: "89.97", currency: "USD" },
            shipping: { amount: "5.99", currency: "USD" },
            tax: { amount: "7.68", currency: "USD" },
            total: { amount: "103.64", currency: "USD" }
        }
    },
    {
        id: "order_def789",
        number: "10040",
        createdDate: "2024-01-13T11:00:00.000Z",
        updatedDate: "2024-01-13T11:30:00.000Z",
        buyerInfo: {
            contactId: "contact_ghi",
            email: "alice@example.com",
            firstName: "Alice",
            lastName: "Brown"
        },
        status: "CANCELED",
        fulfillmentStatus: "NOT_FULFILLED",
        paymentStatus: "FULLY_REFUNDED",
        lineItems: [
            {
                id: "li_789",
                productId: "prod_mno456",
                name: "Digital Art Print",
                quantity: 1,
                price: { amount: "15.00", currency: "USD" },
                totalPrice: { amount: "15.00", currency: "USD" }
            }
        ],
        totals: {
            subtotal: { amount: "15.00", currency: "USD" },
            total: { amount: "15.00", currency: "USD" }
        }
    },
    {
        id: "order_ghi123",
        number: "10039",
        createdDate: "2024-01-12T08:30:00.000Z",
        buyerInfo: {
            contactId: "contact_jkl",
            email: "bob@example.com",
            firstName: "Bob",
            lastName: "Wilson"
        },
        status: "APPROVED",
        fulfillmentStatus: "PARTIALLY_FULFILLED",
        paymentStatus: "PAID",
        lineItems: [
            {
                id: "li_abc",
                productId: "prod_stu456",
                name: "Scented Candle Set",
                quantity: 2,
                price: { amount: "28.00", currency: "USD" },
                totalPrice: { amount: "56.00", currency: "USD" }
            },
            {
                id: "li_def",
                productId: "prod_abc123",
                name: "Handmade Ceramic Vase",
                quantity: 1,
                price: { amount: "40.00", currency: "USD" },
                totalPrice: { amount: "40.00", currency: "USD" }
            }
        ],
        totals: {
            subtotal: { amount: "96.00", currency: "USD" },
            shipping: { amount: "12.00", currency: "USD" },
            tax: { amount: "8.64", currency: "USD" },
            total: { amount: "116.64", currency: "USD" }
        }
    }
];

const sampleInventoryItems: WixInventoryItem[] = [
    {
        id: "inv_abc123",
        productId: "prod_abc123",
        variantId: "var_def456",
        trackQuantity: true,
        quantity: 5,
        preorderInfo: { enabled: false },
        lastUpdated: "2024-01-20T14:45:00.000Z"
    },
    {
        id: "inv_def456",
        productId: "prod_abc123",
        variantId: "var_ghi789",
        trackQuantity: true,
        quantity: 10,
        preorderInfo: { enabled: false },
        lastUpdated: "2024-01-20T14:45:00.000Z"
    },
    {
        id: "inv_ghi789",
        productId: "prod_xyz789",
        trackQuantity: true,
        quantity: 100,
        preorderInfo: { enabled: false },
        lastUpdated: "2024-01-18T12:00:00.000Z"
    },
    {
        id: "inv_jkl012",
        productId: "prod_pqr123",
        trackQuantity: true,
        quantity: 0,
        preorderInfo: { enabled: true, message: "Available in 2 weeks", limit: 10 },
        lastUpdated: "2024-01-19T16:30:00.000Z"
    },
    {
        id: "inv_mno345",
        productId: "prod_stu456",
        trackQuantity: true,
        quantity: 25,
        preorderInfo: { enabled: false },
        lastUpdated: "2024-01-21T10:00:00.000Z"
    }
];

const sampleCollections: WixCollection[] = [
    {
        id: "coll_abc123",
        name: "Home Decor",
        slug: "home-decor",
        description: "Beautiful handmade items for your home",
        numberOfProducts: 12,
        visible: true,
        media: {
            mainMedia: {
                image: {
                    url: "https://static.wixstatic.com/media/home-decor.jpg",
                    altText: "Home Decor Collection"
                }
            }
        }
    },
    {
        id: "coll_def456",
        name: "Apparel",
        slug: "apparel",
        description: "Sustainable and comfortable clothing",
        numberOfProducts: 8,
        visible: true
    },
    {
        id: "coll_ghi789",
        name: "Digital Downloads",
        slug: "digital-downloads",
        description: "Instant download products",
        numberOfProducts: 5,
        visible: true
    },
    {
        id: "coll_jkl012",
        name: "Sale Items",
        slug: "sale-items",
        description: "Products currently on sale",
        numberOfProducts: 3,
        visible: true
    }
];

// ==========================================
// Fixtures
// ==========================================

export const listProductsFixture: TestFixture = {
    operationId: "listProducts",
    provider: "wix",
    validCases: [
        {
            name: "List all products",
            input: {},
            expectedOutput: { products: sampleProducts, count: 5 }
        },
        {
            name: "List products with search query",
            input: { query: "ceramic" }
        },
        {
            name: "List products with pagination",
            input: { limit: 2, offset: 0 }
        }
    ],
    errorCases: [
        {
            name: "Rate limit error",
            input: {},
            expectedError: {
                type: "rate_limit",
                message: "Rate limited. Retry after 60 seconds",
                retryable: true
            }
        },
        {
            name: "Server error",
            input: {},
            expectedError: {
                type: "server_error",
                message: "Internal server error",
                retryable: true
            }
        }
    ],
    filterableData: {
        records: sampleProducts as unknown as Record<string, unknown>[],
        recordsField: "products",
        defaultPageSize: 50,
        maxPageSize: 100,
        pageSizeParam: "limit",
        offsetParam: "offset",
        filterConfig: {
            visible: { type: "boolean", field: "visible" },
            productType: { type: "enum", field: "productType" }
        }
    }
};

export const getProductFixture: TestFixture = {
    operationId: "getProduct",
    provider: "wix",
    validCases: [
        {
            name: "Get product by ID",
            input: { productId: "prod_abc123" },
            expectedOutput: { product: sampleProducts[0] }
        }
    ],
    errorCases: [
        {
            name: "Product not found",
            input: { productId: "prod_nonexistent" },
            expectedError: { type: "not_found", message: "Product not found", retryable: false }
        }
    ]
};

export const createProductFixture: TestFixture = {
    operationId: "createProduct",
    provider: "wix",
    validCases: [
        {
            name: "Create simple product",
            input: {
                name: "New Product",
                price: 19.99,
                currency: "USD"
            },
            expectedOutput: {
                product: { ...sampleProducts[0], id: "prod_new123", name: "New Product" },
                productId: "prod_new123",
                message: "Product created successfully"
            }
        },
        {
            name: "Create product with variants",
            input: {
                name: "Multi-Color Shirt",
                price: 29.99,
                currency: "USD",
                productType: "physical",
                manageVariants: true,
                variants: [
                    { choices: { Color: "Red" }, sku: "SHIRT-RED" },
                    { choices: { Color: "Blue" }, sku: "SHIRT-BLUE" }
                ]
            },
            expectedOutput: {
                product: { ...sampleProducts[0], id: "prod_new456", name: "Multi-Color Shirt" },
                productId: "prod_new456",
                message: "Product created successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Missing required field",
            input: { price: 19.99 },
            expectedError: { type: "validation", message: "Name is required", retryable: false }
        },
        {
            name: "Invalid price value",
            input: { name: "Test Product", price: -10 },
            expectedError: {
                type: "validation",
                message: "Price must be a positive number",
                retryable: false
            }
        },
        {
            name: "Rate limit exceeded",
            input: { name: "Test Product", price: 10 },
            expectedError: {
                type: "rate_limit",
                message: "Rate limited. Retry after 60 seconds",
                retryable: true
            }
        }
    ]
};

export const updateProductFixture: TestFixture = {
    operationId: "updateProduct",
    provider: "wix",
    validCases: [
        {
            name: "Update product price",
            input: { productId: "prod_abc123", price: 50.0 },
            expectedOutput: {
                product: {
                    ...sampleProducts[0],
                    priceData: { ...sampleProducts[0].priceData, price: 50.0 }
                },
                message: "Product updated successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Product not found",
            input: { productId: "prod_nonexistent", name: "Updated" },
            expectedError: { type: "not_found", message: "Product not found", retryable: false }
        },
        {
            name: "Rate limit exceeded",
            input: { productId: "prod_abc123", price: 50.0 },
            expectedError: {
                type: "rate_limit",
                message: "Rate limited. Retry after 60 seconds",
                retryable: true
            }
        }
    ]
};

export const deleteProductFixture: TestFixture = {
    operationId: "deleteProduct",
    provider: "wix",
    validCases: [
        {
            name: "Delete product",
            input: { productId: "prod_abc123" },
            expectedOutput: { productId: "prod_abc123", message: "Product deleted successfully" }
        }
    ],
    errorCases: [
        {
            name: "Product not found",
            input: { productId: "prod_nonexistent" },
            expectedError: { type: "not_found", message: "Product not found", retryable: false }
        },
        {
            name: "Permission denied",
            input: { productId: "prod_abc123" },
            expectedError: {
                type: "permission",
                message: "Insufficient permissions to delete products",
                retryable: false
            }
        }
    ]
};

export const listOrdersFixture: TestFixture = {
    operationId: "listOrders",
    provider: "wix",
    validCases: [
        {
            name: "List all orders",
            input: {},
            expectedOutput: { orders: sampleOrders, count: 4 }
        },
        {
            name: "List fulfilled orders",
            input: { fulfillmentStatus: "FULFILLED" }
        },
        {
            name: "List orders with date range",
            input: { dateCreatedFrom: "2024-01-14T00:00:00.000Z" }
        }
    ],
    errorCases: [
        {
            name: "Invalid fulfillment status",
            input: { fulfillmentStatus: "INVALID_STATUS" },
            expectedError: {
                type: "validation",
                message: "Invalid fulfillment status value",
                retryable: false
            }
        },
        {
            name: "Rate limit exceeded",
            input: {},
            expectedError: {
                type: "rate_limit",
                message: "Rate limited. Retry after 60 seconds",
                retryable: true
            }
        },
        {
            name: "Permission denied",
            input: {},
            expectedError: {
                type: "permission",
                message: "Insufficient permissions to access orders",
                retryable: false
            }
        }
    ],
    filterableData: {
        records: sampleOrders as unknown as Record<string, unknown>[],
        recordsField: "orders",
        defaultPageSize: 50,
        maxPageSize: 100,
        pageSizeParam: "limit",
        offsetParam: "offset",
        filterConfig: {
            fulfillmentStatus: { type: "enum", field: "fulfillmentStatus" },
            paymentStatus: { type: "enum", field: "paymentStatus" }
        }
    }
};

export const getOrderFixture: TestFixture = {
    operationId: "getOrder",
    provider: "wix",
    validCases: [
        {
            name: "Get order by ID",
            input: { orderId: "order_xyz789" },
            expectedOutput: { order: sampleOrders[0] }
        }
    ],
    errorCases: [
        {
            name: "Order not found",
            input: { orderId: "order_nonexistent" },
            expectedError: { type: "not_found", message: "Order not found", retryable: false }
        }
    ]
};

export const updateOrderFixture: TestFixture = {
    operationId: "updateOrder",
    provider: "wix",
    validCases: [
        {
            name: "Update order note",
            input: { orderId: "order_xyz789", buyerNote: "Gift wrapping requested" },
            expectedOutput: {
                order: { ...sampleOrders[0], buyerNote: "Gift wrapping requested" },
                message: "Order updated successfully"
            }
        },
        {
            name: "Mark order as fulfilled",
            input: { orderId: "order_xyz789", fulfilled: true },
            expectedOutput: {
                order: { ...sampleOrders[0], fulfillmentStatus: "FULFILLED" },
                message: "Order updated successfully"
            }
        }
    ],
    errorCases: [
        {
            name: "Order not found",
            input: { orderId: "order_nonexistent", buyerNote: "Test" },
            expectedError: { type: "not_found", message: "Order not found", retryable: false }
        },
        {
            name: "Rate limit exceeded",
            input: { orderId: "order_xyz789", buyerNote: "Test" },
            expectedError: {
                type: "rate_limit",
                message: "Rate limited. Retry after 60 seconds",
                retryable: true
            }
        }
    ]
};

export const cancelOrderFixture: TestFixture = {
    operationId: "cancelOrder",
    provider: "wix",
    validCases: [
        {
            name: "Cancel order with notification",
            input: { orderId: "order_xyz789", sendNotification: true },
            expectedOutput: { orderId: "order_xyz789", message: "Order cancelled successfully" }
        },
        {
            name: "Cancel order without notification",
            input: { orderId: "order_xyz789", sendNotification: false },
            expectedOutput: { orderId: "order_xyz789", message: "Order cancelled successfully" }
        }
    ],
    errorCases: [
        {
            name: "Order not found",
            input: { orderId: "order_nonexistent" },
            expectedError: { type: "not_found", message: "Order not found", retryable: false }
        },
        {
            name: "Already cancelled",
            input: { orderId: "order_def789" },
            expectedError: {
                type: "validation",
                message: "Order has already been cancelled",
                retryable: false
            }
        },
        {
            name: "Cannot cancel fulfilled order",
            input: { orderId: "order_abc456" },
            expectedError: {
                type: "validation",
                message: "Cannot cancel a fulfilled order",
                retryable: false
            }
        }
    ]
};

export const listInventoryFixture: TestFixture = {
    operationId: "listInventory",
    provider: "wix",
    validCases: [
        {
            name: "List all inventory",
            input: {},
            expectedOutput: { inventoryItems: sampleInventoryItems, count: 5 }
        },
        {
            name: "List inventory by product IDs",
            input: { productIds: ["prod_abc123"] }
        }
    ],
    errorCases: [
        {
            name: "Rate limit exceeded",
            input: {},
            expectedError: {
                type: "rate_limit",
                message: "Rate limited. Retry after 60 seconds",
                retryable: true
            }
        },
        {
            name: "Server error",
            input: {},
            expectedError: {
                type: "server_error",
                message: "Internal server error",
                retryable: true
            }
        }
    ],
    filterableData: {
        records: sampleInventoryItems as unknown as Record<string, unknown>[],
        recordsField: "inventoryItems",
        defaultPageSize: 50,
        maxPageSize: 100,
        pageSizeParam: "limit",
        offsetParam: "offset",
        filterConfig: {
            trackQuantity: { type: "boolean", field: "trackQuantity" }
        }
    }
};

export const getInventoryFixture: TestFixture = {
    operationId: "getInventory",
    provider: "wix",
    validCases: [
        {
            name: "Get inventory by ID",
            input: { inventoryId: "inv_abc123" },
            expectedOutput: { inventoryItem: sampleInventoryItems[0] }
        }
    ],
    errorCases: [
        {
            name: "Inventory not found",
            input: { inventoryId: "inv_nonexistent" },
            expectedError: { type: "not_found", message: "Inventory not found", retryable: false }
        }
    ]
};

export const updateInventoryFixture: TestFixture = {
    operationId: "updateInventory",
    provider: "wix",
    validCases: [
        {
            name: "Update stock quantity",
            input: { inventoryId: "inv_abc123", quantity: 20 },
            expectedOutput: {
                inventoryItem: { ...sampleInventoryItems[0], quantity: 20 },
                message: "Inventory updated to 20"
            }
        }
    ],
    errorCases: [
        {
            name: "Inventory not found",
            input: { inventoryId: "inv_nonexistent", quantity: 10 },
            expectedError: { type: "not_found", message: "Inventory not found", retryable: false }
        },
        {
            name: "Rate limit exceeded",
            input: { inventoryId: "inv_abc123", quantity: 10 },
            expectedError: {
                type: "rate_limit",
                message: "Rate limited. Retry after 60 seconds",
                retryable: true
            }
        }
    ]
};

export const incrementInventoryFixture: TestFixture = {
    operationId: "incrementInventory",
    provider: "wix",
    validCases: [
        {
            name: "Increment inventory",
            input: { inventoryId: "inv_abc123", incrementBy: 5 },
            expectedOutput: {
                inventoryItem: { ...sampleInventoryItems[0], quantity: 10 },
                message: "Inventory increased by 5"
            }
        }
    ],
    errorCases: [
        {
            name: "Inventory not found",
            input: { inventoryId: "inv_nonexistent", incrementBy: 5 },
            expectedError: { type: "not_found", message: "Inventory not found", retryable: false }
        },
        {
            name: "Server error",
            input: { inventoryId: "inv_abc123", incrementBy: 5 },
            expectedError: {
                type: "server_error",
                message: "Internal server error",
                retryable: true
            }
        }
    ]
};

export const decrementInventoryFixture: TestFixture = {
    operationId: "decrementInventory",
    provider: "wix",
    validCases: [
        {
            name: "Decrement inventory",
            input: { inventoryId: "inv_abc123", decrementBy: 2 },
            expectedOutput: {
                inventoryItem: { ...sampleInventoryItems[0], quantity: 3 },
                message: "Inventory decreased by 2"
            }
        }
    ],
    errorCases: [
        {
            name: "Inventory not found",
            input: { inventoryId: "inv_nonexistent", decrementBy: 2 },
            expectedError: { type: "not_found", message: "Inventory not found", retryable: false }
        },
        {
            name: "Insufficient inventory",
            input: { inventoryId: "inv_jkl012", decrementBy: 10 },
            expectedError: {
                type: "validation",
                message: "Cannot decrement inventory below zero",
                retryable: false
            }
        }
    ]
};

export const listCollectionsFixture: TestFixture = {
    operationId: "listCollections",
    provider: "wix",
    validCases: [
        {
            name: "List all collections",
            input: {},
            expectedOutput: { collections: sampleCollections, count: 4 }
        },
        {
            name: "List collections with search query",
            input: { query: "home" }
        }
    ],
    errorCases: [
        {
            name: "Rate limit exceeded",
            input: {},
            expectedError: {
                type: "rate_limit",
                message: "Rate limited. Retry after 60 seconds",
                retryable: true
            }
        },
        {
            name: "Permission denied",
            input: {},
            expectedError: {
                type: "permission",
                message: "Insufficient permissions to access collections",
                retryable: false
            }
        }
    ],
    filterableData: {
        records: sampleCollections as unknown as Record<string, unknown>[],
        recordsField: "collections",
        defaultPageSize: 50,
        maxPageSize: 100,
        pageSizeParam: "limit",
        offsetParam: "offset",
        filterConfig: {
            visible: { type: "boolean", field: "visible" }
        }
    }
};

export const getCollectionFixture: TestFixture = {
    operationId: "getCollection",
    provider: "wix",
    validCases: [
        {
            name: "Get collection by ID",
            input: { collectionId: "coll_abc123" },
            expectedOutput: { collection: sampleCollections[0] }
        }
    ],
    errorCases: [
        {
            name: "Collection not found",
            input: { collectionId: "coll_nonexistent" },
            expectedError: { type: "not_found", message: "Collection not found", retryable: false }
        }
    ]
};

// Export all fixtures
export const wixFixtures: TestFixture[] = [
    listProductsFixture,
    getProductFixture,
    createProductFixture,
    updateProductFixture,
    deleteProductFixture,
    listOrdersFixture,
    getOrderFixture,
    updateOrderFixture,
    cancelOrderFixture,
    listInventoryFixture,
    getInventoryFixture,
    updateInventoryFixture,
    incrementInventoryFixture,
    decrementInventoryFixture,
    listCollectionsFixture,
    getCollectionFixture
];
