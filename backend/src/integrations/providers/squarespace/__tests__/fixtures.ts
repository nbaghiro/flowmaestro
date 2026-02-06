/**
 * Squarespace Provider Test Fixtures
 */

import type { TestFixture } from "../../../sandbox";

// Sample products data
const sampleProducts = [
    {
        id: "prod_abc123",
        type: "PHYSICAL" as const,
        storePageId: "page_xyz",
        name: "Handmade Ceramic Vase",
        description:
            "<p>Beautiful handcrafted ceramic vase, perfect for any home. Each piece is unique.</p>",
        url: "/store/handmade-ceramic-vase",
        urlSlug: "handmade-ceramic-vase",
        tags: ["ceramics", "home-decor", "handmade"],
        isVisible: true,
        createdOn: "2024-01-15T10:30:00Z",
        modifiedOn: "2024-01-20T14:45:00Z",
        variants: [
            {
                id: "var_def456",
                sku: "VASE-BLUE-001",
                pricing: {
                    basePrice: { currency: "USD", value: "45.00" },
                    salePrice: null,
                    onSale: false
                },
                stock: { quantity: 15, unlimited: false },
                attributes: { Color: "Blue" },
                shippingMeasurements: {
                    weight: { unit: "POUND", value: 2.5 },
                    dimensions: { unit: "INCH", length: 8, width: 8, height: 12 }
                }
            },
            {
                id: "var_def457",
                sku: "VASE-GREEN-001",
                pricing: {
                    basePrice: { currency: "USD", value: "45.00" },
                    salePrice: { currency: "USD", value: "39.99" },
                    onSale: true
                },
                stock: { quantity: 8, unlimited: false },
                attributes: { Color: "Green" }
            }
        ],
        images: [
            {
                id: "img_ghi789",
                url: "https://images.squarespace-cdn.com/content/v1/vase-blue.jpg",
                altText: "Blue ceramic vase"
            },
            {
                id: "img_ghi790",
                url: "https://images.squarespace-cdn.com/content/v1/vase-green.jpg",
                altText: "Green ceramic vase"
            }
        ]
    },
    {
        id: "prod_abc124",
        type: "PHYSICAL" as const,
        storePageId: "page_xyz",
        name: "Artisan Coffee Mug Set",
        description: "<p>Set of 4 hand-thrown coffee mugs. Dishwasher safe.</p>",
        url: "/store/artisan-coffee-mug-set",
        urlSlug: "artisan-coffee-mug-set",
        tags: ["ceramics", "kitchen", "coffee"],
        isVisible: true,
        createdOn: "2024-01-10T09:00:00Z",
        modifiedOn: "2024-01-18T11:30:00Z",
        variants: [
            {
                id: "var_mug001",
                sku: "MUG-SET-4",
                pricing: {
                    basePrice: { currency: "USD", value: "65.00" },
                    salePrice: null,
                    onSale: false
                },
                stock: { quantity: 25, unlimited: false },
                attributes: {}
            }
        ],
        images: [
            {
                id: "img_mug001",
                url: "https://images.squarespace-cdn.com/content/v1/mugs.jpg",
                altText: "Artisan coffee mug set"
            }
        ]
    },
    {
        id: "prod_abc125",
        type: "SERVICE" as const,
        storePageId: "page_services",
        name: "Pottery Workshop - Beginner",
        description:
            "<p>2-hour hands-on pottery workshop for beginners. All materials included.</p>",
        url: "/store/pottery-workshop-beginner",
        urlSlug: "pottery-workshop-beginner",
        tags: ["workshop", "class", "pottery"],
        isVisible: true,
        createdOn: "2024-01-05T08:00:00Z",
        modifiedOn: "2024-01-12T10:00:00Z",
        variants: [
            {
                id: "var_work001",
                sku: "WORKSHOP-BEG",
                pricing: {
                    basePrice: { currency: "USD", value: "85.00" },
                    salePrice: null,
                    onSale: false
                },
                stock: { quantity: 0, unlimited: true },
                attributes: {}
            }
        ],
        images: []
    }
];

// Sample orders data
const sampleOrders = [
    {
        id: "order_abc123",
        orderNumber: "1042",
        createdOn: "2024-01-15T10:30:00Z",
        modifiedOn: "2024-01-15T14:45:00Z",
        customerEmail: "customer@example.com",
        fulfillmentStatus: "PENDING" as const,
        subtotal: { currency: "USD", value: "89.00" },
        shippingTotal: { currency: "USD", value: "9.95" },
        taxTotal: { currency: "USD", value: "7.82" },
        grandTotal: { currency: "USD", value: "106.77" },
        lineItems: [
            {
                id: "li_xyz789",
                productId: "prod_abc123",
                productName: "Handmade Ceramic Vase",
                variantId: "var_def456",
                sku: "VASE-BLUE-001",
                quantity: 2,
                unitPricePaid: { currency: "USD", value: "44.50" }
            }
        ],
        shippingAddress: {
            firstName: "Jane",
            lastName: "Doe",
            address1: "123 Main Street",
            address2: "Apt 4B",
            city: "Portland",
            state: "OR",
            postalCode: "97201",
            countryCode: "US",
            phone: "+1-555-123-4567"
        },
        billingAddress: {
            firstName: "Jane",
            lastName: "Doe",
            address1: "123 Main Street",
            address2: "Apt 4B",
            city: "Portland",
            state: "OR",
            postalCode: "97201",
            countryCode: "US"
        }
    },
    {
        id: "order_abc124",
        orderNumber: "1043",
        createdOn: "2024-01-16T09:15:00Z",
        modifiedOn: "2024-01-17T16:30:00Z",
        customerEmail: "john.smith@example.com",
        fulfillmentStatus: "FULFILLED" as const,
        subtotal: { currency: "USD", value: "65.00" },
        shippingTotal: { currency: "USD", value: "7.95" },
        taxTotal: { currency: "USD", value: "5.72" },
        grandTotal: { currency: "USD", value: "78.67" },
        lineItems: [
            {
                id: "li_xyz790",
                productId: "prod_abc124",
                productName: "Artisan Coffee Mug Set",
                variantId: "var_mug001",
                sku: "MUG-SET-4",
                quantity: 1,
                unitPricePaid: { currency: "USD", value: "65.00" }
            }
        ],
        shippingAddress: {
            firstName: "John",
            lastName: "Smith",
            address1: "456 Oak Avenue",
            city: "Seattle",
            state: "WA",
            postalCode: "98101",
            countryCode: "US"
        },
        fulfillments: [
            {
                shipDate: "2024-01-17T14:00:00Z",
                carrierName: "USPS",
                service: "Priority Mail",
                trackingNumber: "9400111899223847563892",
                trackingUrl:
                    "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223847563892"
            }
        ]
    },
    {
        id: "order_abc125",
        orderNumber: "1044",
        createdOn: "2024-01-17T11:00:00Z",
        modifiedOn: "2024-01-17T11:05:00Z",
        customerEmail: "workshop.attendee@example.com",
        fulfillmentStatus: "PENDING" as const,
        subtotal: { currency: "USD", value: "85.00" },
        shippingTotal: { currency: "USD", value: "0.00" },
        taxTotal: { currency: "USD", value: "0.00" },
        grandTotal: { currency: "USD", value: "85.00" },
        lineItems: [
            {
                id: "li_xyz791",
                productId: "prod_abc125",
                productName: "Pottery Workshop - Beginner",
                variantId: "var_work001",
                sku: "WORKSHOP-BEG",
                quantity: 1,
                unitPricePaid: { currency: "USD", value: "85.00" }
            }
        ]
    }
];

// Sample inventory data
const sampleInventory = [
    {
        variantId: "var_def456",
        sku: "VASE-BLUE-001",
        descriptor: "Handmade Ceramic Vase - Blue",
        isUnlimited: false,
        quantity: 15
    },
    {
        variantId: "var_def457",
        sku: "VASE-GREEN-001",
        descriptor: "Handmade Ceramic Vase - Green",
        isUnlimited: false,
        quantity: 8
    },
    {
        variantId: "var_mug001",
        sku: "MUG-SET-4",
        descriptor: "Artisan Coffee Mug Set",
        isUnlimited: false,
        quantity: 25
    },
    {
        variantId: "var_work001",
        sku: "WORKSHOP-BEG",
        descriptor: "Pottery Workshop - Beginner",
        isUnlimited: true,
        quantity: 0
    }
];

// Sample transactions data
const sampleTransactions = [
    {
        id: "txn_001",
        createdOn: "2024-01-15T10:32:00Z",
        documentNumber: "TXN-1042",
        salesOrderId: "order_abc123",
        total: { currency: "USD", value: "106.77" },
        customerEmail: "customer@example.com",
        voided: false
    },
    {
        id: "txn_002",
        createdOn: "2024-01-16T09:17:00Z",
        documentNumber: "TXN-1043",
        salesOrderId: "order_abc124",
        total: { currency: "USD", value: "78.67" },
        customerEmail: "john.smith@example.com",
        voided: false
    },
    {
        id: "txn_003",
        createdOn: "2024-01-17T11:02:00Z",
        documentNumber: "TXN-1044",
        salesOrderId: "order_abc125",
        total: { currency: "USD", value: "85.00" },
        customerEmail: "workshop.attendee@example.com",
        voided: false
    }
];

// Sample site info
const sampleSite = {
    id: "site_12345",
    title: "Artisan Ceramics Studio",
    domain: "artisan-ceramics.squarespace.com",
    siteUrl: "https://artisan-ceramics.squarespace.com",
    sslSetting: "SECURE",
    created: "2023-06-01T00:00:00Z",
    modified: "2024-01-20T10:00:00Z"
};

export const squarespaceFixtures: TestFixture[] = [
    // ==========================================
    // Product Operations
    // ==========================================
    {
        operationId: "getProduct",
        provider: "squarespace",
        validCases: [
            {
                name: "get_physical_product",
                description: "Retrieve a physical product with variants and images",
                input: {
                    product_id: "prod_abc123"
                },
                expectedOutput: {
                    product: sampleProducts[0]
                }
            },
            {
                name: "get_service_product",
                description: "Retrieve a service product (workshop)",
                input: {
                    product_id: "prod_abc125"
                },
                expectedOutput: {
                    product: sampleProducts[2]
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Product ID does not exist",
                input: {
                    product_id: "prod_invalid"
                },
                expectedError: {
                    type: "not_found",
                    message: "Product not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    product_id: "prod_abc123"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited. Retry after 2 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listProducts",
        provider: "squarespace",
        validCases: [
            {
                name: "list_all_products",
                description: "List all products with default pagination",
                input: {}
            },
            {
                name: "list_physical_products",
                description: "List only physical products",
                input: {
                    type: "PHYSICAL"
                }
            },
            {
                name: "list_with_cursor",
                description: "List products with pagination cursor",
                input: {
                    cursor: "next_page_cursor_abc123"
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
                    message: "Rate limited. Retry after 2 seconds.",
                    retryable: true
                }
            },
            {
                name: "server_error",
                description: "Internal server error",
                input: {},
                expectedError: {
                    type: "server_error",
                    message: "Squarespace API error: Internal server error",
                    retryable: true
                }
            }
        ],
        filterableData: {
            records: sampleProducts,
            recordsField: "products",
            offsetField: "cursor",
            defaultPageSize: 50,
            maxPageSize: 50,
            pageSizeParam: "limit",
            filterConfig: {
                type: {
                    type: "enum" as const,
                    field: "type"
                }
            }
        }
    },
    {
        operationId: "createProduct",
        provider: "squarespace",
        validCases: [
            {
                name: "create_simple_product",
                description: "Create a basic physical product",
                input: {
                    type: "PHYSICAL",
                    storePageId: "page_xyz",
                    name: "New Ceramic Bowl",
                    description: "<p>Handmade ceramic bowl.</p>",
                    tags: ["ceramics", "bowl"],
                    isVisible: true,
                    variants: [
                        {
                            sku: "BOWL-001",
                            pricing: {
                                basePrice: { currency: "USD", value: "35.00" }
                            },
                            stock: { quantity: 20, unlimited: false }
                        }
                    ]
                },
                expectedOutput: {
                    product: {
                        id: "prod_new123",
                        type: "PHYSICAL",
                        storePageId: "page_xyz",
                        name: "New Ceramic Bowl",
                        isVisible: true
                    },
                    productId: "prod_new123",
                    message: "Product created successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_store_page",
                description: "Store page ID is required",
                input: {
                    name: "Product Without Page",
                    type: "PHYSICAL"
                },
                expectedError: {
                    type: "validation",
                    message: "Validation error: storePageId is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    storePageId: "page_xyz",
                    name: "Test Product"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited. Retry after 2 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateProduct",
        provider: "squarespace",
        validCases: [
            {
                name: "update_product_name",
                description: "Update product name and description",
                input: {
                    product_id: "prod_abc123",
                    name: "Premium Handmade Ceramic Vase",
                    description: "<p>Premium handcrafted ceramic vase. Limited edition.</p>"
                },
                expectedOutput: {
                    product: {
                        ...sampleProducts[0],
                        name: "Premium Handmade Ceramic Vase",
                        description: "<p>Premium handcrafted ceramic vase. Limited edition.</p>"
                    }
                }
            },
            {
                name: "update_product_visibility",
                description: "Hide a product from the store",
                input: {
                    product_id: "prod_abc124",
                    isVisible: false
                },
                expectedOutput: {
                    product: {
                        ...sampleProducts[1],
                        isVisible: false
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Product ID does not exist",
                input: {
                    product_id: "prod_invalid",
                    name: "Updated Name"
                },
                expectedError: {
                    type: "not_found",
                    message: "Product not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "deleteProduct",
        provider: "squarespace",
        validCases: [
            {
                name: "delete_product",
                description: "Delete a product from the store",
                input: {
                    product_id: "prod_abc123"
                },
                expectedOutput: {
                    productId: "prod_abc123",
                    message: "Product deleted successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Product ID does not exist",
                input: {
                    product_id: "prod_invalid"
                },
                expectedError: {
                    type: "not_found",
                    message: "Product not found",
                    retryable: false
                }
            }
        ]
    },

    // ==========================================
    // Order Operations
    // ==========================================
    {
        operationId: "getOrder",
        provider: "squarespace",
        validCases: [
            {
                name: "get_pending_order",
                description: "Retrieve a pending order with line items",
                input: {
                    order_id: "order_abc123"
                },
                expectedOutput: {
                    order: sampleOrders[0]
                }
            },
            {
                name: "get_fulfilled_order",
                description: "Retrieve a fulfilled order with tracking info",
                input: {
                    order_id: "order_abc124"
                },
                expectedOutput: {
                    order: sampleOrders[1]
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Order ID does not exist",
                input: {
                    order_id: "order_invalid"
                },
                expectedError: {
                    type: "not_found",
                    message: "Order not found",
                    retryable: false
                }
            },
            {
                name: "permission_denied",
                description: "Insufficient permissions to view order",
                input: {
                    order_id: "order_abc123"
                },
                expectedError: {
                    type: "permission",
                    message: "Insufficient permissions. Please check your app's access scopes.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listOrders",
        provider: "squarespace",
        validCases: [
            {
                name: "list_all_orders",
                description: "List all orders",
                input: {}
            },
            {
                name: "list_pending_orders",
                description: "List only pending orders",
                input: {
                    fulfillmentStatus: "PENDING"
                }
            },
            {
                name: "list_orders_by_date",
                description: "List orders modified after a date",
                input: {
                    modifiedAfter: "2024-01-16T00:00:00Z"
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
                    message: "Rate limited. Retry after 2 seconds.",
                    retryable: true
                }
            }
        ],
        filterableData: {
            records: sampleOrders,
            recordsField: "result",
            offsetField: "cursor",
            defaultPageSize: 50,
            maxPageSize: 50,
            pageSizeParam: "limit",
            filterConfig: {
                fulfillmentStatus: {
                    type: "enum" as const,
                    field: "fulfillmentStatus"
                }
            }
        }
    },
    {
        operationId: "fulfillOrder",
        provider: "squarespace",
        validCases: [
            {
                name: "fulfill_order_with_tracking",
                description: "Mark order as fulfilled with tracking information",
                input: {
                    order_id: "order_abc123",
                    shipments: [
                        {
                            shipDate: "2024-01-18T10:00:00Z",
                            carrierName: "USPS",
                            service: "Priority Mail",
                            trackingNumber: "9400111899223847563893",
                            trackingUrl:
                                "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223847563893"
                        }
                    ],
                    sendNotification: true
                },
                expectedOutput: {
                    order: {
                        ...sampleOrders[0],
                        fulfillmentStatus: "FULFILLED",
                        fulfillments: [
                            {
                                shipDate: "2024-01-18T10:00:00Z",
                                carrierName: "USPS",
                                service: "Priority Mail",
                                trackingNumber: "9400111899223847563893"
                            }
                        ]
                    },
                    message: "Order fulfilled successfully"
                }
            },
            {
                name: "fulfill_order_without_notification",
                description: "Mark order as fulfilled without customer notification",
                input: {
                    order_id: "order_abc125",
                    shipments: [
                        {
                            shipDate: "2024-01-18T12:00:00Z"
                        }
                    ],
                    sendNotification: false
                },
                expectedOutput: {
                    order: {
                        ...sampleOrders[2],
                        fulfillmentStatus: "FULFILLED"
                    },
                    message: "Order fulfilled successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Order ID does not exist",
                input: {
                    order_id: "order_invalid",
                    shipments: [{ shipDate: "2024-01-18T10:00:00Z" }]
                },
                expectedError: {
                    type: "not_found",
                    message: "Order not found",
                    retryable: false
                }
            },
            {
                name: "already_fulfilled",
                description: "Order is already fulfilled",
                input: {
                    order_id: "order_abc124",
                    shipments: [{ shipDate: "2024-01-18T10:00:00Z" }]
                },
                expectedError: {
                    type: "validation",
                    message: "Order is already fulfilled",
                    retryable: false
                }
            }
        ]
    },

    // ==========================================
    // Inventory Operations
    // ==========================================
    {
        operationId: "listInventory",
        provider: "squarespace",
        validCases: [
            {
                name: "list_all_inventory",
                description: "List inventory for all variants",
                input: {}
            },
            {
                name: "list_inventory_with_cursor",
                description: "List inventory with pagination",
                input: {
                    cursor: "next_page_cursor"
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
                    message: "Rate limited. Retry after 2 seconds.",
                    retryable: true
                }
            }
        ],
        filterableData: {
            records: sampleInventory,
            recordsField: "inventory",
            offsetField: "cursor",
            defaultPageSize: 50,
            maxPageSize: 50,
            pageSizeParam: "limit",
            filterConfig: {}
        }
    },
    {
        operationId: "getInventoryItem",
        provider: "squarespace",
        validCases: [
            {
                name: "get_inventory_item",
                description: "Get inventory for a specific variant",
                input: {
                    variant_id: "var_def456"
                },
                expectedOutput: {
                    inventory: sampleInventory[0]
                }
            },
            {
                name: "get_unlimited_inventory",
                description: "Get inventory for an unlimited stock item",
                input: {
                    variant_id: "var_work001"
                },
                expectedOutput: {
                    inventory: sampleInventory[3]
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Variant ID does not exist",
                input: {
                    variant_id: "var_invalid"
                },
                expectedError: {
                    type: "not_found",
                    message: "Inventory item not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "adjustInventory",
        provider: "squarespace",
        validCases: [
            {
                name: "add_inventory",
                description: "Add stock to a variant",
                input: {
                    variant_id: "var_def456",
                    quantity: 10
                },
                expectedOutput: {
                    inventory: {
                        ...sampleInventory[0],
                        quantity: 25 // 15 + 10
                    },
                    adjustment: 10,
                    message: "Inventory adjusted by 10"
                }
            },
            {
                name: "subtract_inventory",
                description: "Remove stock from a variant",
                input: {
                    variant_id: "var_mug001",
                    quantity: -5
                },
                expectedOutput: {
                    inventory: {
                        ...sampleInventory[2],
                        quantity: 20 // 25 - 5
                    },
                    adjustment: -5,
                    message: "Inventory adjusted by -5"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Variant ID does not exist",
                input: {
                    variant_id: "var_invalid",
                    quantity: 10
                },
                expectedError: {
                    type: "not_found",
                    message: "Inventory item not found",
                    retryable: false
                }
            },
            {
                name: "insufficient_stock",
                description: "Cannot subtract more than available",
                input: {
                    variant_id: "var_def457",
                    quantity: -100
                },
                expectedError: {
                    type: "validation",
                    message: "Validation error: insufficient stock",
                    retryable: false
                }
            }
        ]
    },

    // ==========================================
    // Transaction Operations
    // ==========================================
    {
        operationId: "listTransactions",
        provider: "squarespace",
        validCases: [
            {
                name: "list_all_transactions",
                description: "List all financial transactions",
                input: {}
            },
            {
                name: "list_transactions_by_date",
                description: "List transactions within date range",
                input: {
                    modifiedAfter: "2024-01-15T00:00:00Z",
                    modifiedBefore: "2024-01-18T00:00:00Z"
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
                    message: "Rate limited. Retry after 2 seconds.",
                    retryable: true
                }
            },
            {
                name: "permission_denied",
                description: "Insufficient permissions",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Insufficient permissions. Please check your app's access scopes.",
                    retryable: false
                }
            }
        ],
        filterableData: {
            records: sampleTransactions,
            recordsField: "documents",
            offsetField: "cursor",
            defaultPageSize: 50,
            maxPageSize: 50,
            pageSizeParam: "limit",
            filterConfig: {}
        }
    },

    // ==========================================
    // Site Operations
    // ==========================================
    {
        operationId: "getSiteInfo",
        provider: "squarespace",
        validCases: [
            {
                name: "get_site_info",
                description: "Retrieve site/store information",
                input: {},
                expectedOutput: {
                    site: sampleSite
                }
            }
        ],
        errorCases: [
            {
                name: "authentication_failed",
                description: "Invalid or expired access token",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Authentication failed. Please reconnect your Squarespace account.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited. Retry after 2 seconds.",
                    retryable: true
                }
            }
        ]
    }
];
