/**
 * Shopify Provider Test Fixtures
 */

import type { TestFixture } from "../../../sandbox";

// Sample data for reuse across fixtures
const sampleOrders = [
    {
        id: 5847392847,
        admin_graphql_api_id: "gid://shopify/Order/5847392847",
        order_number: 1042,
        name: "#1042",
        email: "john.smith@example.com",
        phone: "+1-555-123-4567",
        created_at: "2024-01-15T10:30:00-05:00",
        updated_at: "2024-01-15T14:45:00-05:00",
        closed_at: null,
        cancelled_at: null,
        cancel_reason: null,
        note: "Please gift wrap",
        tags: "VIP, repeat-customer",
        currency: "USD",
        total_price: "249.99",
        subtotal_price: "229.99",
        total_tax: "20.00",
        total_discounts: "10.00",
        total_line_items_price: "239.99",
        financial_status: "paid",
        fulfillment_status: "unfulfilled",
        processing_method: "direct",
        gateway: "shopify_payments",
        test: false,
        confirmed: true,
        buyer_accepts_marketing: true,
        line_items: [
            {
                id: 12847392847,
                variant_id: 44829384756,
                product_id: 8847392847,
                title: "Premium Wireless Headphones",
                variant_title: "Black / Large",
                sku: "WH-PRO-BLK-L",
                vendor: "TechAudio",
                quantity: 1,
                price: "199.99",
                total_discount: "10.00",
                fulfillment_status: null,
                gift_card: false,
                taxable: true,
                name: "Premium Wireless Headphones - Black / Large"
            },
            {
                id: 12847392848,
                variant_id: 44829384757,
                product_id: 8847392848,
                title: "USB-C Charging Cable",
                variant_title: "2m",
                sku: "CBL-USB-C-2M",
                vendor: "TechAudio",
                quantity: 2,
                price: "14.99",
                total_discount: "0.00",
                fulfillment_status: null,
                gift_card: false,
                taxable: true,
                name: "USB-C Charging Cable - 2m"
            }
        ],
        shipping_address: {
            id: 7584739284,
            first_name: "John",
            last_name: "Smith",
            company: "Tech Corp",
            address1: "123 Main Street",
            address2: "Suite 456",
            city: "San Francisco",
            province: "California",
            province_code: "CA",
            country: "United States",
            country_code: "US",
            zip: "94102",
            phone: "+1-555-123-4567",
            name: "John Smith",
            latitude: 37.7749,
            longitude: -122.4194
        },
        billing_address: {
            id: 7584739285,
            first_name: "John",
            last_name: "Smith",
            company: "Tech Corp",
            address1: "123 Main Street",
            address2: "Suite 456",
            city: "San Francisco",
            province: "California",
            province_code: "CA",
            country: "United States",
            country_code: "US",
            zip: "94102",
            phone: "+1-555-123-4567",
            name: "John Smith"
        },
        customer: {
            id: 7482938475,
            admin_graphql_api_id: "gid://shopify/Customer/7482938475",
            email: "john.smith@example.com",
            first_name: "John",
            last_name: "Smith",
            phone: "+1-555-123-4567",
            created_at: "2023-06-15T09:00:00-05:00",
            updated_at: "2024-01-15T10:30:00-05:00",
            orders_count: 12,
            total_spent: "1842.50",
            verified_email: true,
            tax_exempt: false,
            accepts_marketing: true,
            accepts_marketing_updated_at: "2023-06-15T09:00:00-05:00",
            marketing_opt_in_level: "single_opt_in",
            tags: "VIP, repeat-customer",
            currency: "USD",
            last_order_id: 5847392847,
            last_order_name: "#1042",
            state: "enabled"
        }
    },
    {
        id: 5847392848,
        admin_graphql_api_id: "gid://shopify/Order/5847392848",
        order_number: 1043,
        name: "#1043",
        email: "sarah.johnson@example.com",
        phone: "+1-555-987-6543",
        created_at: "2024-01-15T11:00:00-05:00",
        updated_at: "2024-01-15T11:00:00-05:00",
        closed_at: null,
        cancelled_at: null,
        cancel_reason: null,
        note: null,
        tags: "",
        currency: "USD",
        total_price: "89.99",
        subtotal_price: "79.99",
        total_tax: "10.00",
        total_discounts: "0.00",
        total_line_items_price: "79.99",
        financial_status: "pending",
        fulfillment_status: null,
        processing_method: "direct",
        gateway: "paypal",
        test: false,
        confirmed: true,
        buyer_accepts_marketing: false,
        line_items: [
            {
                id: 12847392849,
                variant_id: 44829384758,
                product_id: 8847392849,
                title: "Ergonomic Mouse Pad",
                variant_title: "Default",
                sku: "MP-ERG-001",
                vendor: "ErgoTech",
                quantity: 1,
                price: "39.99",
                total_discount: "0.00",
                fulfillment_status: null,
                gift_card: false,
                taxable: true,
                name: "Ergonomic Mouse Pad"
            },
            {
                id: 12847392850,
                variant_id: 44829384759,
                product_id: 8847392850,
                title: "Wireless Mouse",
                variant_title: "Gray",
                sku: "WM-001-GRY",
                vendor: "ErgoTech",
                quantity: 1,
                price: "39.99",
                total_discount: "0.00",
                fulfillment_status: null,
                gift_card: false,
                taxable: true,
                name: "Wireless Mouse - Gray"
            }
        ],
        shipping_address: {
            first_name: "Sarah",
            last_name: "Johnson",
            address1: "456 Oak Avenue",
            city: "Austin",
            province: "Texas",
            province_code: "TX",
            country: "United States",
            country_code: "US",
            zip: "78701",
            phone: "+1-555-987-6543",
            name: "Sarah Johnson"
        },
        customer: {
            id: 7482938476,
            admin_graphql_api_id: "gid://shopify/Customer/7482938476",
            email: "sarah.johnson@example.com",
            first_name: "Sarah",
            last_name: "Johnson",
            phone: "+1-555-987-6543",
            created_at: "2024-01-15T11:00:00-05:00",
            updated_at: "2024-01-15T11:00:00-05:00",
            orders_count: 1,
            total_spent: "89.99",
            verified_email: true,
            tax_exempt: false,
            accepts_marketing: false,
            state: "enabled"
        }
    },
    {
        id: 5847392849,
        admin_graphql_api_id: "gid://shopify/Order/5847392849",
        order_number: 1044,
        name: "#1044",
        email: "mike.wilson@example.com",
        created_at: "2024-01-15T12:30:00-05:00",
        updated_at: "2024-01-16T09:00:00-05:00",
        closed_at: "2024-01-16T09:00:00-05:00",
        cancelled_at: null,
        currency: "USD",
        total_price: "599.99",
        subtotal_price: "549.99",
        total_tax: "50.00",
        total_discounts: "0.00",
        total_line_items_price: "549.99",
        financial_status: "paid",
        fulfillment_status: "fulfilled",
        processing_method: "direct",
        gateway: "shopify_payments",
        test: false,
        confirmed: true,
        buyer_accepts_marketing: true,
        line_items: [
            {
                id: 12847392851,
                variant_id: 44829384760,
                product_id: 8847392851,
                title: "4K Monitor 27-inch",
                variant_title: "Default",
                sku: "MON-4K-27",
                vendor: "DisplayPro",
                quantity: 1,
                price: "549.99",
                total_discount: "0.00",
                fulfillment_status: "fulfilled",
                gift_card: false,
                taxable: true,
                name: "4K Monitor 27-inch"
            }
        ]
    }
];

const sampleProducts = [
    {
        id: 8847392847,
        admin_graphql_api_id: "gid://shopify/Product/8847392847",
        title: "Premium Wireless Headphones",
        body_html:
            "<p>Experience crystal-clear audio with our premium wireless headphones. Features active noise cancellation, 30-hour battery life, and comfortable over-ear design.</p>",
        vendor: "TechAudio",
        product_type: "Electronics",
        created_at: "2023-09-01T10:00:00-05:00",
        updated_at: "2024-01-10T14:30:00-05:00",
        published_at: "2023-09-01T12:00:00-05:00",
        template_suffix: null,
        status: "active" as const,
        published_scope: "web",
        tags: "wireless, audio, premium, headphones, noise-canceling",
        handle: "premium-wireless-headphones",
        variants: [
            {
                id: 44829384756,
                product_id: 8847392847,
                title: "Black / Large",
                price: "199.99",
                compare_at_price: "249.99",
                sku: "WH-PRO-BLK-L",
                position: 1,
                inventory_item_id: 47382947583,
                inventory_quantity: 150,
                option1: "Black",
                option2: "Large",
                created_at: "2023-09-01T10:00:00-05:00",
                updated_at: "2024-01-10T14:30:00-05:00",
                taxable: true,
                barcode: "123456789012",
                grams: 350,
                weight: 0.77,
                weight_unit: "lb",
                requires_shipping: true
            },
            {
                id: 44829384761,
                product_id: 8847392847,
                title: "Silver / Large",
                price: "209.99",
                compare_at_price: "259.99",
                sku: "WH-PRO-SLV-L",
                position: 2,
                inventory_item_id: 47382947584,
                inventory_quantity: 75,
                option1: "Silver",
                option2: "Large",
                created_at: "2023-09-01T10:00:00-05:00",
                updated_at: "2024-01-10T14:30:00-05:00",
                taxable: true,
                barcode: "123456789013",
                grams: 350,
                weight: 0.77,
                weight_unit: "lb",
                requires_shipping: true
            }
        ],
        options: [
            {
                id: 11847392847,
                product_id: 8847392847,
                name: "Color",
                position: 1,
                values: ["Black", "Silver", "Rose Gold"]
            },
            {
                id: 11847392848,
                product_id: 8847392847,
                name: "Size",
                position: 2,
                values: ["Standard", "Large"]
            }
        ],
        images: [
            {
                id: 38472947583,
                product_id: 8847392847,
                position: 1,
                created_at: "2023-09-01T10:00:00-05:00",
                updated_at: "2023-09-01T10:00:00-05:00",
                alt: "Premium Wireless Headphones - Front View",
                width: 1200,
                height: 1200,
                src: "https://cdn.shopify.com/s/files/1/0001/0001/products/headphones-front.jpg"
            },
            {
                id: 38472947584,
                product_id: 8847392847,
                position: 2,
                created_at: "2023-09-01T10:00:00-05:00",
                updated_at: "2023-09-01T10:00:00-05:00",
                alt: "Premium Wireless Headphones - Side View",
                width: 1200,
                height: 1200,
                src: "https://cdn.shopify.com/s/files/1/0001/0001/products/headphones-side.jpg"
            }
        ],
        image: {
            id: 38472947583,
            product_id: 8847392847,
            position: 1,
            created_at: "2023-09-01T10:00:00-05:00",
            updated_at: "2023-09-01T10:00:00-05:00",
            alt: "Premium Wireless Headphones - Front View",
            width: 1200,
            height: 1200,
            src: "https://cdn.shopify.com/s/files/1/0001/0001/products/headphones-front.jpg"
        }
    },
    {
        id: 8847392848,
        admin_graphql_api_id: "gid://shopify/Product/8847392848",
        title: "USB-C Charging Cable",
        body_html:
            "<p>High-quality braided USB-C cable with fast charging support. Durable construction, supports up to 100W power delivery.</p>",
        vendor: "TechAudio",
        product_type: "Accessories",
        created_at: "2023-10-15T09:00:00-05:00",
        updated_at: "2024-01-05T16:00:00-05:00",
        published_at: "2023-10-15T10:00:00-05:00",
        status: "active" as const,
        published_scope: "web",
        tags: "cable, usb-c, charging, accessories",
        handle: "usb-c-charging-cable",
        variants: [
            {
                id: 44829384757,
                product_id: 8847392848,
                title: "1m",
                price: "9.99",
                sku: "CBL-USB-C-1M",
                position: 1,
                inventory_item_id: 47382947585,
                inventory_quantity: 500,
                option1: "1m",
                created_at: "2023-10-15T09:00:00-05:00",
                updated_at: "2024-01-05T16:00:00-05:00",
                taxable: true,
                grams: 50,
                weight: 0.11,
                weight_unit: "lb",
                requires_shipping: true
            },
            {
                id: 44829384762,
                product_id: 8847392848,
                title: "2m",
                price: "14.99",
                sku: "CBL-USB-C-2M",
                position: 2,
                inventory_item_id: 47382947586,
                inventory_quantity: 350,
                option1: "2m",
                created_at: "2023-10-15T09:00:00-05:00",
                updated_at: "2024-01-05T16:00:00-05:00",
                taxable: true,
                grams: 75,
                weight: 0.16,
                weight_unit: "lb",
                requires_shipping: true
            }
        ],
        options: [
            {
                id: 11847392849,
                product_id: 8847392848,
                name: "Length",
                position: 1,
                values: ["1m", "2m", "3m"]
            }
        ],
        images: [
            {
                id: 38472947585,
                product_id: 8847392848,
                position: 1,
                created_at: "2023-10-15T09:00:00-05:00",
                updated_at: "2023-10-15T09:00:00-05:00",
                alt: "USB-C Charging Cable",
                width: 800,
                height: 800,
                src: "https://cdn.shopify.com/s/files/1/0001/0001/products/usb-c-cable.jpg"
            }
        ]
    },
    {
        id: 8847392849,
        admin_graphql_api_id: "gid://shopify/Product/8847392849",
        title: "Ergonomic Mouse Pad",
        body_html: "<p>Gel wrist rest mouse pad for all-day comfort. Non-slip base.</p>",
        vendor: "ErgoTech",
        product_type: "Accessories",
        created_at: "2023-11-01T08:00:00-05:00",
        updated_at: "2024-01-08T11:00:00-05:00",
        published_at: "2023-11-01T09:00:00-05:00",
        status: "active" as const,
        published_scope: "web",
        tags: "mouse pad, ergonomic, office, accessories",
        handle: "ergonomic-mouse-pad",
        variants: [
            {
                id: 44829384758,
                product_id: 8847392849,
                title: "Default",
                price: "39.99",
                sku: "MP-ERG-001",
                position: 1,
                inventory_item_id: 47382947587,
                inventory_quantity: 200,
                created_at: "2023-11-01T08:00:00-05:00",
                updated_at: "2024-01-08T11:00:00-05:00",
                taxable: true,
                grams: 300,
                weight: 0.66,
                weight_unit: "lb",
                requires_shipping: true
            }
        ],
        options: [
            {
                id: 11847392850,
                product_id: 8847392849,
                name: "Title",
                position: 1,
                values: ["Default"]
            }
        ],
        images: []
    }
];

const sampleWebhooks = [
    {
        id: 98473829475,
        address: "https://api.myapp.com/webhooks/shopify/orders",
        topic: "orders/create",
        created_at: "2024-01-01T00:00:00-05:00",
        updated_at: "2024-01-01T00:00:00-05:00",
        format: "json" as const,
        fields: [],
        metafield_namespaces: [],
        api_version: "2024-01"
    },
    {
        id: 98473829476,
        address: "https://api.myapp.com/webhooks/shopify/products",
        topic: "products/update",
        created_at: "2024-01-01T00:00:00-05:00",
        updated_at: "2024-01-01T00:00:00-05:00",
        format: "json" as const,
        fields: [],
        metafield_namespaces: [],
        api_version: "2024-01"
    },
    {
        id: 98473829477,
        address: "https://api.myapp.com/webhooks/shopify/inventory",
        topic: "inventory_levels/update",
        created_at: "2024-01-02T00:00:00-05:00",
        updated_at: "2024-01-02T00:00:00-05:00",
        format: "json" as const,
        fields: [],
        metafield_namespaces: [],
        api_version: "2024-01"
    }
];

const sampleInventoryLevels = [
    {
        inventory_item_id: 47382947583,
        location_id: 78493847584,
        available: 150,
        updated_at: "2024-01-15T10:00:00-05:00"
    },
    {
        inventory_item_id: 47382947584,
        location_id: 78493847584,
        available: 75,
        updated_at: "2024-01-15T10:00:00-05:00"
    },
    {
        inventory_item_id: 47382947585,
        location_id: 78493847584,
        available: 500,
        updated_at: "2024-01-14T15:30:00-05:00"
    },
    {
        inventory_item_id: 47382947586,
        location_id: 78493847584,
        available: 350,
        updated_at: "2024-01-14T15:30:00-05:00"
    },
    {
        inventory_item_id: 47382947587,
        location_id: 78493847584,
        available: 200,
        updated_at: "2024-01-13T09:00:00-05:00"
    }
];

export const shopifyFixtures: TestFixture[] = [
    // ==========================================
    // Order Operations
    // ==========================================
    {
        operationId: "getOrder",
        provider: "shopify",
        validCases: [
            {
                name: "get_order_with_full_details",
                description:
                    "Retrieve a single order with all details including line items and customer",
                input: {
                    order_id: "5847392847"
                },
                expectedOutput: {
                    order: sampleOrders[0]
                }
            },
            {
                name: "get_order_with_specific_fields",
                description: "Retrieve order with only specific fields",
                input: {
                    order_id: "5847392848",
                    fields: "id,name,total_price,financial_status"
                },
                expectedOutput: {
                    order: {
                        id: 5847392848,
                        name: "#1043",
                        total_price: "89.99",
                        financial_status: "pending"
                    }
                }
            },
            {
                name: "get_fulfilled_order",
                description: "Retrieve a completed and fulfilled order",
                input: {
                    order_id: "5847392849"
                },
                expectedOutput: {
                    order: sampleOrders[2]
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Order ID does not exist",
                input: {
                    order_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Order not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    order_id: "5847392847"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Exceeded API rate limit. Retry after 2.0 seconds",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listOrders",
        provider: "shopify",
        validCases: [
            {
                name: "list_all_orders",
                description: "List all orders with default pagination",
                input: {}
            },
            {
                name: "list_paid_orders",
                description: "List only paid orders",
                input: {
                    financial_status: "paid",
                    limit: 50
                }
            },
            {
                name: "list_unfulfilled_orders",
                description: "List orders that need fulfillment",
                input: {
                    status: "open",
                    fulfillment_status: "unfulfilled",
                    limit: 25
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
                    message: "Invalid status value. Must be one of: open, closed, cancelled, any",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Exceeded API rate limit. Retry after 2.0 seconds",
                    retryable: true
                }
            }
        ],
        filterableData: {
            records: sampleOrders,
            recordsField: "orders",
            offsetField: "since_id",
            defaultPageSize: 50,
            maxPageSize: 250,
            pageSizeParam: "limit",
            filterConfig: {
                financial_status: {
                    type: "enum" as const,
                    field: "financial_status"
                },
                fulfillment_status: {
                    type: "enum" as const,
                    field: "fulfillment_status"
                },
                status: {
                    type: "enum" as const,
                    field: (record: (typeof sampleOrders)[0]) => {
                        if (record.cancelled_at) return "cancelled";
                        if (record.closed_at) return "closed";
                        return "open";
                    }
                }
            }
        }
    },
    {
        operationId: "updateOrder",
        provider: "shopify",
        validCases: [
            {
                name: "update_order_note",
                description: "Update the staff note on an order",
                input: {
                    order_id: "5847392847",
                    note: "Customer requested express shipping upgrade"
                },
                expectedOutput: {
                    order: {
                        ...sampleOrders[0],
                        note: "Customer requested express shipping upgrade"
                    }
                }
            },
            {
                name: "update_order_tags",
                description: "Update order tags",
                input: {
                    order_id: "5847392848",
                    tags: "priority, expedited"
                },
                expectedOutput: {
                    order: {
                        ...sampleOrders[1],
                        tags: "priority, expedited"
                    }
                }
            },
            {
                name: "update_order_email",
                description: "Update customer email on order",
                input: {
                    order_id: "5847392847",
                    email: "john.smith.new@example.com",
                    buyer_accepts_marketing: false
                },
                expectedOutput: {
                    order: {
                        ...sampleOrders[0],
                        email: "john.smith.new@example.com",
                        buyer_accepts_marketing: false
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Order ID does not exist",
                input: {
                    order_id: "9999999999",
                    note: "Test note"
                },
                expectedError: {
                    type: "not_found",
                    message: "Order not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    order_id: "5847392847",
                    note: "Test note"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Exceeded API rate limit. Retry after 2.0 seconds",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "closeOrder",
        provider: "shopify",
        validCases: [
            {
                name: "close_fulfilled_order",
                description: "Close an order that has been fully fulfilled",
                input: {
                    order_id: "5847392847"
                },
                expectedOutput: {
                    order: {
                        ...sampleOrders[0],
                        closed_at: "2024-01-16T10:00:00-05:00"
                    },
                    message: "Order closed successfully"
                }
            },
            {
                name: "close_partially_fulfilled_order",
                description: "Close an order with partial fulfillment",
                input: {
                    order_id: "5847392848"
                },
                expectedOutput: {
                    order: {
                        ...sampleOrders[1],
                        closed_at: "2024-01-16T11:00:00-05:00"
                    },
                    message: "Order closed successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Order ID does not exist",
                input: {
                    order_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Order not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    order_id: "5847392847"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Exceeded API rate limit. Retry after 2.0 seconds",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "cancelOrder",
        provider: "shopify",
        validCases: [
            {
                name: "cancel_order_customer_request",
                description: "Cancel an order due to customer request with restock",
                input: {
                    order_id: "5847392848",
                    reason: "customer",
                    email: true,
                    restock: true
                },
                expectedOutput: {
                    order: {
                        ...sampleOrders[1],
                        cancelled_at: "2024-01-16T12:00:00-05:00",
                        cancel_reason: "customer"
                    },
                    message: "Order cancelled successfully"
                }
            },
            {
                name: "cancel_order_inventory_issue",
                description: "Cancel an order due to inventory issue without email notification",
                input: {
                    order_id: "5847392847",
                    reason: "inventory",
                    email: false,
                    restock: false
                },
                expectedOutput: {
                    order: {
                        ...sampleOrders[0],
                        cancelled_at: "2024-01-16T12:30:00-05:00",
                        cancel_reason: "inventory"
                    },
                    message: "Order cancelled successfully"
                }
            },
            {
                name: "cancel_order_fraud",
                description: "Cancel an order due to suspected fraud",
                input: {
                    order_id: "5847392847",
                    reason: "fraud",
                    email: false,
                    restock: true
                },
                expectedOutput: {
                    order: {
                        ...sampleOrders[0],
                        cancelled_at: "2024-01-16T13:00:00-05:00",
                        cancel_reason: "fraud"
                    },
                    message: "Order cancelled successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Order ID does not exist",
                input: {
                    order_id: "9999999999",
                    reason: "customer"
                },
                expectedError: {
                    type: "not_found",
                    message: "Order not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    order_id: "5847392847",
                    reason: "customer"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Exceeded API rate limit. Retry after 2.0 seconds",
                    retryable: true
                }
            }
        ]
    },

    // ==========================================
    // Product Operations
    // ==========================================
    {
        operationId: "getProduct",
        provider: "shopify",
        validCases: [
            {
                name: "get_product_full_details",
                description: "Retrieve a product with all variants and images",
                input: {
                    product_id: "8847392847"
                },
                expectedOutput: {
                    product: sampleProducts[0]
                }
            },
            {
                name: "get_product_specific_fields",
                description: "Retrieve product with only specific fields",
                input: {
                    product_id: "8847392848",
                    fields: "id,title,handle,variants"
                },
                expectedOutput: {
                    product: {
                        id: 8847392848,
                        title: "USB-C Charging Cable",
                        handle: "usb-c-charging-cable",
                        variants: sampleProducts[1].variants
                    }
                }
            },
            {
                name: "get_simple_product",
                description: "Retrieve a product with a single variant",
                input: {
                    product_id: "8847392849"
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
                    product_id: "9999999999"
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
                    product_id: "8847392847"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Exceeded API rate limit. Retry after 2.0 seconds",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listProducts",
        provider: "shopify",
        validCases: [
            {
                name: "list_all_products",
                description: "List all products with default pagination",
                input: {}
            },
            {
                name: "list_products_by_vendor",
                description: "List products from a specific vendor",
                input: {
                    vendor: "TechAudio",
                    limit: 25
                }
            },
            {
                name: "list_active_products",
                description: "List only active products",
                input: {
                    status: "active",
                    limit: 50
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_status",
                description: "Invalid status filter value",
                input: {
                    status: "invalid"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid status value. Must be one of: active, archived, draft",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Exceeded API rate limit. Retry after 2.0 seconds",
                    retryable: true
                }
            }
        ],
        filterableData: {
            records: sampleProducts,
            recordsField: "products",
            offsetField: "since_id",
            defaultPageSize: 50,
            maxPageSize: 250,
            pageSizeParam: "limit",
            filterConfig: {
                vendor: {
                    type: "text" as const,
                    field: "vendor"
                },
                product_type: {
                    type: "text" as const,
                    field: "product_type"
                },
                status: {
                    type: "enum" as const,
                    field: "status"
                },
                title: {
                    type: "text" as const,
                    field: "title"
                }
            }
        }
    },
    {
        operationId: "createProduct",
        provider: "shopify",
        validCases: [
            {
                name: "create_simple_product",
                description: "Create a basic product with title and description",
                input: {
                    title: "Bluetooth Keyboard",
                    body_html:
                        "<p>Compact wireless Bluetooth keyboard with rechargeable battery.</p>",
                    vendor: "TechGear",
                    product_type: "Electronics",
                    status: "draft"
                },
                expectedOutput: {
                    product: {
                        id: 8847392852,
                        admin_graphql_api_id: "gid://shopify/Product/8847392852",
                        title: "Bluetooth Keyboard",
                        body_html:
                            "<p>Compact wireless Bluetooth keyboard with rechargeable battery.</p>",
                        vendor: "TechGear",
                        product_type: "Electronics",
                        status: "draft",
                        handle: "bluetooth-keyboard",
                        tags: "",
                        variants: [
                            {
                                id: 44829384770,
                                product_id: 8847392852,
                                title: "Default Title",
                                price: "0.00",
                                position: 1,
                                taxable: true,
                                grams: 0,
                                weight: 0,
                                weight_unit: "lb",
                                requires_shipping: true
                            }
                        ],
                        options: [
                            {
                                id: 11847392860,
                                product_id: 8847392852,
                                name: "Title",
                                position: 1,
                                values: ["Default Title"]
                            }
                        ],
                        images: []
                    },
                    productId: "8847392852",
                    message: "Product created successfully"
                }
            },
            {
                name: "create_product_with_variants",
                description: "Create a product with multiple variants",
                input: {
                    title: "Cotton T-Shirt",
                    body_html: "<p>100% organic cotton t-shirt. Pre-shrunk and comfortable.</p>",
                    vendor: "EcoWear",
                    product_type: "Apparel",
                    tags: "cotton, organic, t-shirt, clothing",
                    status: "active",
                    variants: [
                        {
                            option1: "Small",
                            price: "24.99",
                            sku: "TSHIRT-SM",
                            inventory_quantity: 100
                        },
                        {
                            option1: "Medium",
                            price: "24.99",
                            sku: "TSHIRT-MD",
                            inventory_quantity: 150
                        },
                        {
                            option1: "Large",
                            price: "24.99",
                            sku: "TSHIRT-LG",
                            inventory_quantity: 120
                        }
                    ]
                },
                expectedOutput: {
                    product: {
                        id: 8847392853,
                        admin_graphql_api_id: "gid://shopify/Product/8847392853",
                        title: "Cotton T-Shirt",
                        body_html:
                            "<p>100% organic cotton t-shirt. Pre-shrunk and comfortable.</p>",
                        vendor: "EcoWear",
                        product_type: "Apparel",
                        tags: "cotton, organic, t-shirt, clothing",
                        status: "active",
                        handle: "cotton-t-shirt",
                        variants: [
                            {
                                id: 44829384771,
                                product_id: 8847392853,
                                title: "Small",
                                price: "24.99",
                                sku: "TSHIRT-SM",
                                position: 1,
                                inventory_quantity: 100,
                                option1: "Small",
                                taxable: true,
                                requires_shipping: true
                            },
                            {
                                id: 44829384772,
                                product_id: 8847392853,
                                title: "Medium",
                                price: "24.99",
                                sku: "TSHIRT-MD",
                                position: 2,
                                inventory_quantity: 150,
                                option1: "Medium",
                                taxable: true,
                                requires_shipping: true
                            },
                            {
                                id: 44829384773,
                                product_id: 8847392853,
                                title: "Large",
                                price: "24.99",
                                sku: "TSHIRT-LG",
                                position: 3,
                                inventory_quantity: 120,
                                option1: "Large",
                                taxable: true,
                                requires_shipping: true
                            }
                        ],
                        options: [
                            {
                                id: 11847392861,
                                product_id: 8847392853,
                                name: "Size",
                                position: 1,
                                values: ["Small", "Medium", "Large"]
                            }
                        ],
                        images: []
                    },
                    productId: "8847392853",
                    message: "Product created successfully"
                }
            },
            {
                name: "create_product_with_images",
                description: "Create a product with images",
                input: {
                    title: "Canvas Tote Bag",
                    body_html: "<p>Durable canvas tote bag. Perfect for everyday use.</p>",
                    vendor: "EcoWear",
                    product_type: "Accessories",
                    status: "active",
                    images: [
                        {
                            src: "https://cdn.example.com/images/tote-bag-front.jpg",
                            alt: "Canvas Tote Bag - Front View"
                        },
                        {
                            src: "https://cdn.example.com/images/tote-bag-side.jpg",
                            alt: "Canvas Tote Bag - Side View"
                        }
                    ]
                },
                expectedOutput: {
                    product: {
                        id: 8847392854,
                        title: "Canvas Tote Bag",
                        status: "active",
                        images: [
                            {
                                id: 38472947590,
                                product_id: 8847392854,
                                position: 1,
                                alt: "Canvas Tote Bag - Front View",
                                src: "https://cdn.shopify.com/s/files/tote-bag-front.jpg"
                            },
                            {
                                id: 38472947591,
                                product_id: 8847392854,
                                position: 2,
                                alt: "Canvas Tote Bag - Side View",
                                src: "https://cdn.shopify.com/s/files/tote-bag-side.jpg"
                            }
                        ]
                    },
                    productId: "8847392854",
                    message: "Product created successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_title",
                description: "Product title is required",
                input: {
                    body_html: "<p>Description without title</p>",
                    vendor: "TestVendor"
                },
                expectedError: {
                    type: "validation",
                    message: "Title is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    title: "Test Product"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Exceeded API rate limit. Retry after 2.0 seconds",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateProduct",
        provider: "shopify",
        validCases: [
            {
                name: "update_product_title",
                description: "Update a product title",
                input: {
                    product_id: "8847392847",
                    title: "Premium Wireless Headphones Pro"
                },
                expectedOutput: {
                    product: {
                        ...sampleProducts[0],
                        title: "Premium Wireless Headphones Pro"
                    }
                }
            },
            {
                name: "update_product_status",
                description: "Archive a product",
                input: {
                    product_id: "8847392849",
                    status: "archived"
                },
                expectedOutput: {
                    product: {
                        ...sampleProducts[2],
                        status: "archived"
                    }
                }
            },
            {
                name: "update_product_details",
                description: "Update multiple product fields",
                input: {
                    product_id: "8847392848",
                    title: "Premium USB-C Cable",
                    body_html:
                        "<p>Premium braided USB-C cable with fast charging. Now with reinforced connectors.</p>",
                    tags: "cable, usb-c, charging, premium, fast-charging"
                },
                expectedOutput: {
                    product: {
                        ...sampleProducts[1],
                        title: "Premium USB-C Cable",
                        body_html:
                            "<p>Premium braided USB-C cable with fast charging. Now with reinforced connectors.</p>",
                        tags: "cable, usb-c, charging, premium, fast-charging"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Product ID does not exist",
                input: {
                    product_id: "9999999999",
                    title: "Updated Title"
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
                    product_id: "8847392847",
                    title: "Updated Title"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Exceeded API rate limit. Retry after 2.0 seconds",
                    retryable: true
                }
            }
        ]
    },

    // ==========================================
    // Inventory Operations
    // ==========================================
    {
        operationId: "listInventoryLevels",
        provider: "shopify",
        validCases: [
            {
                name: "list_inventory_by_item",
                description: "List inventory levels for specific inventory items",
                input: {
                    inventory_item_ids: "47382947583,47382947584"
                }
            },
            {
                name: "list_inventory_by_location",
                description: "List inventory levels at a specific location",
                input: {
                    location_ids: "78493847584",
                    limit: 50
                }
            },
            {
                name: "list_recently_updated_inventory",
                description: "List inventory levels updated after a certain date",
                input: {
                    updated_at_min: "2024-01-14T00:00:00-05:00",
                    limit: 100
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_item_ids",
                description: "Invalid inventory item IDs format",
                input: {
                    inventory_item_ids: "invalid,ids"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid inventory_item_ids format",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    location_ids: "78493847584"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Exceeded API rate limit. Retry after 2.0 seconds",
                    retryable: true
                }
            }
        ],
        filterableData: {
            records: sampleInventoryLevels,
            recordsField: "inventory_levels",
            defaultPageSize: 50,
            maxPageSize: 250,
            pageSizeParam: "limit",
            filterConfig: {
                location_ids: {
                    type: "text" as const,
                    field: (record: (typeof sampleInventoryLevels)[0], value: string) => {
                        const locationIds = value.split(",").map((id) => parseInt(id, 10));
                        return locationIds.includes(record.location_id);
                    }
                },
                inventory_item_ids: {
                    type: "text" as const,
                    field: (record: (typeof sampleInventoryLevels)[0], value: string) => {
                        const itemIds = value.split(",").map((id) => parseInt(id, 10));
                        return itemIds.includes(record.inventory_item_id);
                    }
                }
            }
        }
    },
    {
        operationId: "adjustInventory",
        provider: "shopify",
        validCases: [
            {
                name: "add_inventory",
                description: "Add inventory to an item at a location",
                input: {
                    inventory_item_id: "47382947583",
                    location_id: "78493847584",
                    available_adjustment: 50
                },
                expectedOutput: {
                    inventory_level: {
                        inventory_item_id: 47382947583,
                        location_id: 78493847584,
                        available: 200, // 150 + 50
                        updated_at: "2024-01-16T10:00:00-05:00"
                    },
                    adjustment: 50,
                    message: "Inventory adjusted by 50"
                }
            },
            {
                name: "subtract_inventory",
                description: "Subtract inventory from an item at a location",
                input: {
                    inventory_item_id: "47382947585",
                    location_id: "78493847584",
                    available_adjustment: -25
                },
                expectedOutput: {
                    inventory_level: {
                        inventory_item_id: 47382947585,
                        location_id: 78493847584,
                        available: 475, // 500 - 25
                        updated_at: "2024-01-16T10:00:00-05:00"
                    },
                    adjustment: -25,
                    message: "Inventory adjusted by -25"
                }
            },
            {
                name: "large_inventory_adjustment",
                description: "Make a large inventory adjustment",
                input: {
                    inventory_item_id: "47382947586",
                    location_id: "78493847584",
                    available_adjustment: 1000
                },
                expectedOutput: {
                    inventory_level: {
                        inventory_item_id: 47382947586,
                        location_id: 78493847584,
                        available: 1350, // 350 + 1000
                        updated_at: "2024-01-16T10:00:00-05:00"
                    },
                    adjustment: 1000,
                    message: "Inventory adjusted by 1000"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Inventory item or location not found",
                input: {
                    inventory_item_id: "9999999999",
                    location_id: "78493847584",
                    available_adjustment: 10
                },
                expectedError: {
                    type: "not_found",
                    message: "Inventory item not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    inventory_item_id: "47382947583",
                    location_id: "78493847584",
                    available_adjustment: 10
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Exceeded API rate limit. Retry after 2.0 seconds",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "setInventory",
        provider: "shopify",
        validCases: [
            {
                name: "set_inventory_level",
                description: "Set inventory to an absolute value",
                input: {
                    inventory_item_id: "47382947583",
                    location_id: "78493847584",
                    available: 100
                },
                expectedOutput: {
                    inventory_level: {
                        inventory_item_id: 47382947583,
                        location_id: 78493847584,
                        available: 100,
                        updated_at: "2024-01-16T10:00:00-05:00"
                    },
                    message: "Inventory set to 100"
                }
            },
            {
                name: "set_inventory_to_zero",
                description: "Set inventory to zero (out of stock)",
                input: {
                    inventory_item_id: "47382947584",
                    location_id: "78493847584",
                    available: 0
                },
                expectedOutput: {
                    inventory_level: {
                        inventory_item_id: 47382947584,
                        location_id: 78493847584,
                        available: 0,
                        updated_at: "2024-01-16T10:00:00-05:00"
                    },
                    message: "Inventory set to 0"
                }
            },
            {
                name: "set_high_inventory",
                description: "Set inventory to a high value for restock",
                input: {
                    inventory_item_id: "47382947587",
                    location_id: "78493847584",
                    available: 500
                },
                expectedOutput: {
                    inventory_level: {
                        inventory_item_id: 47382947587,
                        location_id: 78493847584,
                        available: 500,
                        updated_at: "2024-01-16T10:00:00-05:00"
                    },
                    message: "Inventory set to 500"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Inventory item or location not found",
                input: {
                    inventory_item_id: "9999999999",
                    location_id: "78493847584",
                    available: 100
                },
                expectedError: {
                    type: "not_found",
                    message: "Inventory item not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    inventory_item_id: "47382947583",
                    location_id: "78493847584",
                    available: 100
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Exceeded API rate limit. Retry after 2.0 seconds",
                    retryable: true
                }
            }
        ]
    },

    // ==========================================
    // Webhook Operations
    // ==========================================
    {
        operationId: "listWebhooks",
        provider: "shopify",
        validCases: [
            {
                name: "list_all_webhooks",
                description: "List all registered webhooks",
                input: {}
            },
            {
                name: "list_webhooks_by_topic",
                description: "List webhooks for a specific topic",
                input: {
                    topic: "orders/create"
                }
            },
            {
                name: "list_webhooks_by_address",
                description: "List webhooks for a specific address",
                input: {
                    address: "https://api.myapp.com/webhooks/shopify/orders",
                    limit: 10
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_topic",
                description: "Invalid webhook topic",
                input: {
                    topic: "invalid/topic"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid webhook topic. See Shopify documentation for valid topics.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Exceeded API rate limit. Retry after 2.0 seconds",
                    retryable: true
                }
            }
        ],
        filterableData: {
            records: sampleWebhooks,
            recordsField: "webhooks",
            offsetField: "since_id",
            defaultPageSize: 50,
            maxPageSize: 250,
            pageSizeParam: "limit",
            filterConfig: {
                topic: {
                    type: "text" as const,
                    field: "topic"
                },
                address: {
                    type: "text" as const,
                    field: "address"
                }
            }
        }
    },
    {
        operationId: "createWebhook",
        provider: "shopify",
        validCases: [
            {
                name: "create_orders_webhook",
                description: "Create webhook for new orders",
                input: {
                    topic: "orders/create",
                    address: "https://api.myapp.com/webhooks/shopify/new-orders",
                    format: "json"
                },
                expectedOutput: {
                    webhook: {
                        id: 98473829478,
                        address: "https://api.myapp.com/webhooks/shopify/new-orders",
                        topic: "orders/create",
                        created_at: "2024-01-16T10:00:00-05:00",
                        updated_at: "2024-01-16T10:00:00-05:00",
                        format: "json",
                        fields: [],
                        metafield_namespaces: [],
                        api_version: "2024-01"
                    },
                    webhookId: "98473829478",
                    message: "Webhook created for topic: orders/create"
                }
            },
            {
                name: "create_products_webhook",
                description: "Create webhook for product updates",
                input: {
                    topic: "products/update",
                    address: "https://api.myapp.com/webhooks/shopify/product-updates"
                },
                expectedOutput: {
                    webhook: {
                        id: 98473829479,
                        address: "https://api.myapp.com/webhooks/shopify/product-updates",
                        topic: "products/update",
                        created_at: "2024-01-16T10:00:00-05:00",
                        updated_at: "2024-01-16T10:00:00-05:00",
                        format: "json",
                        fields: [],
                        metafield_namespaces: [],
                        api_version: "2024-01"
                    },
                    webhookId: "98473829479",
                    message: "Webhook created for topic: products/update"
                }
            },
            {
                name: "create_inventory_webhook",
                description: "Create webhook for inventory level changes",
                input: {
                    topic: "inventory_levels/update",
                    address: "https://api.myapp.com/webhooks/shopify/inventory-updates",
                    format: "json"
                },
                expectedOutput: {
                    webhook: {
                        id: 98473829480,
                        address: "https://api.myapp.com/webhooks/shopify/inventory-updates",
                        topic: "inventory_levels/update",
                        created_at: "2024-01-16T10:00:00-05:00",
                        updated_at: "2024-01-16T10:00:00-05:00",
                        format: "json",
                        fields: [],
                        metafield_namespaces: [],
                        api_version: "2024-01"
                    },
                    webhookId: "98473829480",
                    message: "Webhook created for topic: inventory_levels/update"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_topic",
                description: "Invalid webhook topic",
                input: {
                    topic: "invalid/topic",
                    address: "https://api.myapp.com/webhooks/test"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid webhook topic. See Shopify documentation for valid topics.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    topic: "orders/create",
                    address: "https://api.myapp.com/webhooks/orders"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Exceeded API rate limit. Retry after 2.0 seconds",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteWebhook",
        provider: "shopify",
        validCases: [
            {
                name: "delete_webhook",
                description: "Delete a webhook subscription",
                input: {
                    webhook_id: "98473829475"
                },
                expectedOutput: {
                    webhookId: "98473829475",
                    message: "Webhook deleted successfully"
                }
            },
            {
                name: "delete_another_webhook",
                description: "Delete another webhook subscription",
                input: {
                    webhook_id: "98473829476"
                },
                expectedOutput: {
                    webhookId: "98473829476",
                    message: "Webhook deleted successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Webhook ID does not exist",
                input: {
                    webhook_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Webhook not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    webhook_id: "98473829475"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Exceeded API rate limit. Retry after 2.0 seconds",
                    retryable: true
                }
            }
        ]
    }
];
