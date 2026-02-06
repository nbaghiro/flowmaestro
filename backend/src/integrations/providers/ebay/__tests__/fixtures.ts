/**
 * eBay Provider Test Fixtures
 *
 * Based on eBay APIs:
 * - Browse: GET /buy/browse/v1/item_summary/search, GET /buy/browse/v1/item/{item_id}
 * - Fulfillment: GET /sell/fulfillment/v1/order, POST shipping_fulfillment
 * - Inventory: GET/PUT /sell/inventory/v1/inventory_item/{sku}
 */

import type { TestFixture } from "../../../sandbox";

export const ebayFixtures: TestFixture[] = [
    {
        operationId: "searchItems",
        provider: "ebay",
        validCases: [
            {
                name: "search_electronics",
                description: "Search for electronics items",
                input: {
                    query: "wireless headphones",
                    limit: 3,
                    offset: 0
                },
                expectedOutput: {
                    items: [
                        {
                            itemId: "v1|225678901234|0",
                            title: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones - Black",
                            price: {
                                value: "278.00",
                                currency: "USD"
                            },
                            condition: "New",
                            image: "https://i.ebayimg.com/images/g/abc123/s-l500.jpg",
                            itemWebUrl: "https://www.ebay.com/itm/225678901234",
                            seller: {
                                username: "techdeals_usa",
                                feedbackPercentage: "99.2"
                            }
                        },
                        {
                            itemId: "v1|225678901235|0",
                            title: "Apple AirPods Pro (2nd Gen) with MagSafe Charging Case",
                            price: {
                                value: "189.99",
                                currency: "USD"
                            },
                            condition: "New",
                            image: "https://i.ebayimg.com/images/g/def456/s-l500.jpg",
                            itemWebUrl: "https://www.ebay.com/itm/225678901235",
                            seller: {
                                username: "apple_direct",
                                feedbackPercentage: "99.8"
                            }
                        },
                        {
                            itemId: "v1|225678901236|0",
                            title: "Bose QuietComfort 45 Bluetooth Wireless Headphones - White",
                            price: {
                                value: "229.00",
                                currency: "USD"
                            },
                            condition: "Refurbished",
                            image: "https://i.ebayimg.com/images/g/ghi789/s-l500.jpg",
                            itemWebUrl: "https://www.ebay.com/itm/225678901236",
                            seller: {
                                username: "bose_outlet",
                                feedbackPercentage: "98.7"
                            }
                        }
                    ],
                    count: 3,
                    total: 15420,
                    offset: 0,
                    limit: 3
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    query: "test"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests.",
                    retryable: true
                }
            },
            {
                name: "permission",
                description: "Not authorized to search items",
                input: {
                    query: "test"
                },
                expectedError: {
                    type: "permission",
                    message: "Authentication failed. Please reconnect your eBay account.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getItem",
        provider: "ebay",
        validCases: [
            {
                name: "electronics_item",
                description: "Get a consumer electronics item with full details",
                input: {
                    itemId: "v1|225678901234|0"
                },
                expectedOutput: {
                    itemId: "v1|225678901234|0",
                    title: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones - Black",
                    description:
                        "Industry-leading noise cancellation with Auto NC Optimizer. Crystal clear hands-free calling with 4 beamforming microphones.",
                    price: {
                        value: "278.00",
                        currency: "USD"
                    },
                    condition: "New",
                    categoryPath: "Consumer Electronics|Portable Audio & Headphones|Headphones",
                    images: [
                        "https://i.ebayimg.com/images/g/abc123/s-l1600.jpg",
                        "https://i.ebayimg.com/images/g/abc124/s-l1600.jpg"
                    ],
                    itemWebUrl: "https://www.ebay.com/itm/225678901234",
                    seller: {
                        username: "techdeals_usa",
                        feedbackPercentage: "99.2",
                        feedbackScore: 45230
                    },
                    brand: "Sony",
                    mpn: "WH1000XM5/B",
                    color: "Black",
                    itemLocation: {
                        city: "Los Angeles",
                        stateOrProvince: "California",
                        postalCode: "90001",
                        country: "US"
                    },
                    shippingOptions: [
                        {
                            shippingCostType: "FIXED",
                            shippingCost: {
                                value: "0.00",
                                currency: "USD"
                            }
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "item_not_found",
                description: "Item ID does not exist",
                input: {
                    itemId: "v1|000000000000|0"
                },
                expectedError: {
                    type: "not_found",
                    message: "Item with ID 'v1|000000000000|0' not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    itemId: "v1|225678901234|0"
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
        operationId: "listOrders",
        provider: "ebay",
        validCases: [
            {
                name: "default_list",
                description: "List orders with default pagination",
                input: {},
                expectedOutput: {
                    orders: [
                        {
                            orderId: "04-09876-12345",
                            orderStatus: "FULFILLED",
                            creationDate: "2024-01-20T14:30:00.000Z",
                            buyer: {
                                username: "craft_collector_99"
                            },
                            pricingSummary: {
                                total: {
                                    value: "299.95",
                                    currency: "USD"
                                },
                                subtotal: {
                                    value: "289.95",
                                    currency: "USD"
                                },
                                deliveryCost: {
                                    value: "10.00",
                                    currency: "USD"
                                }
                            },
                            lineItems: [
                                {
                                    lineItemId: "8001234567890",
                                    title: "Vintage Leather Messenger Bag - Brown",
                                    quantity: 1,
                                    lineItemCost: {
                                        value: "289.95",
                                        currency: "USD"
                                    },
                                    sku: "BAG-LTH-BRN-001"
                                }
                            ],
                            shippingAddress: {
                                addressLine1: "742 Evergreen Terrace",
                                city: "Springfield",
                                stateOrProvince: "IL",
                                postalCode: "62704",
                                countryCode: "US"
                            }
                        },
                        {
                            orderId: "04-09876-12346",
                            orderStatus: "NOT_STARTED",
                            creationDate: "2024-01-22T09:15:00.000Z",
                            buyer: {
                                username: "retro_gamer_42"
                            },
                            pricingSummary: {
                                total: {
                                    value: "54.99",
                                    currency: "USD"
                                },
                                subtotal: {
                                    value: "49.99",
                                    currency: "USD"
                                },
                                deliveryCost: {
                                    value: "5.00",
                                    currency: "USD"
                                }
                            },
                            lineItems: [
                                {
                                    lineItemId: "8001234567891",
                                    title: "Nintendo Game Boy Color - Teal",
                                    quantity: 1,
                                    lineItemCost: {
                                        value: "49.99",
                                        currency: "USD"
                                    },
                                    sku: "GBC-TEAL-001"
                                }
                            ],
                            shippingAddress: {
                                addressLine1: "123 Main Street",
                                addressLine2: "Apt 4B",
                                city: "Brooklyn",
                                stateOrProvince: "NY",
                                postalCode: "11201",
                                countryCode: "US"
                            }
                        }
                    ],
                    count: 2,
                    total: 2,
                    offset: 0,
                    limit: 50
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
                description: "Not authorized to list orders",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Authentication failed. Please reconnect your eBay account.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getOrder",
        provider: "ebay",
        validCases: [
            {
                name: "fulfilled_order",
                description: "Get a fulfilled order with shipping details",
                input: {
                    orderId: "04-09876-12345"
                },
                expectedOutput: {
                    orderId: "04-09876-12345",
                    orderStatus: "FULFILLED",
                    creationDate: "2024-01-20T14:30:00.000Z",
                    buyer: {
                        username: "craft_collector_99"
                    },
                    pricingSummary: {
                        total: {
                            value: "299.95",
                            currency: "USD"
                        },
                        subtotal: {
                            value: "289.95",
                            currency: "USD"
                        },
                        deliveryCost: {
                            value: "10.00",
                            currency: "USD"
                        }
                    },
                    lineItems: [
                        {
                            lineItemId: "8001234567890",
                            title: "Vintage Leather Messenger Bag - Brown",
                            quantity: 1,
                            lineItemCost: {
                                value: "289.95",
                                currency: "USD"
                            },
                            sku: "BAG-LTH-BRN-001"
                        }
                    ],
                    shippingAddress: {
                        addressLine1: "742 Evergreen Terrace",
                        city: "Springfield",
                        stateOrProvince: "IL",
                        postalCode: "62704",
                        countryCode: "US"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "order_not_found",
                description: "Order ID does not exist",
                input: {
                    orderId: "00-00000-00000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Order with ID '00-00000-00000' not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    orderId: "04-09876-12345"
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
        operationId: "getInventoryItem",
        provider: "ebay",
        validCases: [
            {
                name: "active_inventory_item",
                description: "Get an active inventory item by SKU",
                input: {
                    sku: "BAG-LTH-BRN-001"
                },
                expectedOutput: {
                    sku: "BAG-LTH-BRN-001",
                    title: "Vintage Leather Messenger Bag - Brown",
                    description:
                        "Handcrafted genuine leather messenger bag with brass hardware. Perfect for everyday carry.",
                    condition: "NEW",
                    quantity: 15,
                    images: [
                        "https://i.ebayimg.com/images/g/bag001/s-l1600.jpg",
                        "https://i.ebayimg.com/images/g/bag002/s-l1600.jpg"
                    ],
                    brand: "Artisan Leather Co.",
                    mpn: "ALMB-BRN-001"
                }
            }
        ],
        errorCases: [
            {
                name: "sku_not_found",
                description: "SKU does not exist",
                input: {
                    sku: "NONEXISTENT-SKU-000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Inventory item with SKU 'NONEXISTENT-SKU-000' not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    sku: "BAG-LTH-BRN-001"
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
        operationId: "createOrReplaceInventoryItem",
        provider: "ebay",
        validCases: [
            {
                name: "create_new_item",
                description: "Create a new inventory item",
                input: {
                    sku: "WATCH-SLV-002",
                    title: "Classic Silver Watch with Leather Strap",
                    description:
                        "Elegant silver-tone watch with genuine leather strap. Japanese quartz movement.",
                    brand: "Timeless Watches",
                    mpn: "TW-SLV-002",
                    imageUrls: ["https://i.ebayimg.com/images/g/watch001/s-l1600.jpg"],
                    condition: "NEW",
                    quantity: 25
                },
                expectedOutput: {
                    sku: "WATCH-SLV-002",
                    title: "Classic Silver Watch with Leather Strap",
                    description:
                        "Elegant silver-tone watch with genuine leather strap. Japanese quartz movement.",
                    condition: "NEW",
                    quantity: 25,
                    images: ["https://i.ebayimg.com/images/g/watch001/s-l1600.jpg"],
                    brand: "Timeless Watches",
                    mpn: "TW-SLV-002"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_condition",
                description: "Invalid item condition value",
                input: {
                    sku: "TEST-SKU-001",
                    title: "Test Item",
                    condition: "INVALID_CONDITION",
                    quantity: 1
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Invalid condition value. Must be one of: NEW, LIKE_NEW, NEW_OTHER, NEW_WITH_DEFECTS, MANUFACTURER_REFURBISHED, CERTIFIED_REFURBISHED, EXCELLENT_REFURBISHED, VERY_GOOD_REFURBISHED, GOOD_REFURBISHED, SELLER_REFURBISHED, USED_EXCELLENT, USED_VERY_GOOD, USED_GOOD, USED_ACCEPTABLE, FOR_PARTS_OR_NOT_WORKING",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    sku: "TEST-SKU-001",
                    title: "Test Item",
                    condition: "NEW",
                    quantity: 1
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
                    sku: "TEST-SKU-001",
                    title: "Test Item",
                    condition: "NEW",
                    quantity: 1
                },
                expectedError: {
                    type: "permission",
                    message: "Authentication failed. Please reconnect your eBay account.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createShippingFulfillment",
        provider: "ebay",
        validCases: [
            {
                name: "single_item_fulfillment",
                description: "Create shipping fulfillment for a single-item order",
                input: {
                    orderId: "04-09876-12346",
                    lineItems: [
                        {
                            lineItemId: "8001234567891",
                            quantity: 1
                        }
                    ],
                    shippedDate: "2024-01-23T10:00:00.000Z",
                    shippingCarrierCode: "USPS",
                    trackingNumber: "9400111899223100012345"
                },
                expectedOutput: {
                    fulfillmentId: "9876543210",
                    trackingNumber: "9400111899223100012345",
                    shippingCarrierCode: "USPS",
                    shippedDate: "2024-01-23T10:00:00.000Z",
                    lineItems: [
                        {
                            lineItemId: "8001234567891",
                            quantity: 1
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "order_not_found",
                description: "Order ID does not exist",
                input: {
                    orderId: "00-00000-00000",
                    lineItems: [
                        {
                            lineItemId: "0000000000000",
                            quantity: 1
                        }
                    ],
                    shippedDate: "2024-01-23T10:00:00.000Z",
                    shippingCarrierCode: "USPS",
                    trackingNumber: "0000000000000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Order with ID '00-00000-00000' not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    orderId: "04-09876-12346",
                    lineItems: [
                        {
                            lineItemId: "8001234567891",
                            quantity: 1
                        }
                    ],
                    shippedDate: "2024-01-23T10:00:00.000Z",
                    shippingCarrierCode: "USPS",
                    trackingNumber: "9400111899223100012345"
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
