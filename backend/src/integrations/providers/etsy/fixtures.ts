/**
 * Etsy Provider Test Fixtures
 */

import type { TestFixture } from "../../sandbox";

// Sample Etsy listings (handmade items)
const sampleListings = [
    {
        listing_id: 1234567890,
        user_id: 12345678,
        shop_id: 87654321,
        title: "Handmade Ceramic Mug - Speckled Blue Glaze",
        description:
            "Beautiful handcrafted ceramic mug with a unique speckled blue glaze. Each piece is one-of-a-kind, made with love in my studio. Perfect for your morning coffee or tea.\n\nDimensions:\n- Height: 4 inches\n- Diameter: 3.5 inches\n- Capacity: 12 oz\n\nCare instructions: Dishwasher and microwave safe.",
        state: "active" as const,
        creation_timestamp: 1704067200,
        created_timestamp: 1704067200,
        ending_timestamp: 1735689600,
        original_creation_timestamp: 1704067200,
        last_modified_timestamp: 1704326400,
        updated_timestamp: 1704326400,
        state_timestamp: 1704067200,
        quantity: 15,
        shop_section_id: 12345,
        featured_rank: 1,
        url: "https://www.etsy.com/listing/1234567890/handmade-ceramic-mug-speckled-blue-glaze",
        num_favorers: 245,
        non_taxable: false,
        is_taxable: true,
        is_customizable: false,
        is_personalizable: true,
        personalization_is_required: false,
        personalization_char_count_max: 20,
        personalization_instructions: "Add your name or initials (up to 20 characters)",
        listing_type: "physical",
        tags: [
            "ceramic mug",
            "handmade pottery",
            "blue glaze",
            "coffee mug",
            "tea cup",
            "artisan ceramic",
            "gift for her",
            "housewarming gift"
        ],
        materials: ["stoneware clay", "food-safe glaze"],
        shipping_profile_id: 98765432,
        return_policy_id: 11111111,
        processing_min: 3,
        processing_max: 5,
        who_made: "i_did" as const,
        when_made: "2020_2024",
        is_supply: false,
        item_weight: 14,
        item_weight_unit: "oz",
        item_length: 4,
        item_width: 3.5,
        item_height: 4,
        item_dimensions_unit: "in",
        is_private: false,
        style: ["minimalist", "bohemian"],
        file_data: "",
        has_variations: true,
        should_auto_renew: true,
        language: "en",
        price: {
            amount: 3500,
            divisor: 100,
            currency_code: "USD"
        },
        taxonomy_id: 1017
    },
    {
        listing_id: 1234567891,
        user_id: 12345678,
        shop_id: 87654321,
        title: "Hand-Knitted Wool Scarf - Forest Green",
        description:
            "Luxuriously soft hand-knitted scarf made from 100% merino wool. The forest green color is perfect for fall and winter. This scarf features a classic cable knit pattern that adds texture and visual interest.\n\nDimensions:\n- Length: 72 inches\n- Width: 8 inches\n\nCare: Hand wash cold, lay flat to dry.",
        state: "active" as const,
        creation_timestamp: 1701388800,
        created_timestamp: 1701388800,
        ending_timestamp: 1733011200,
        original_creation_timestamp: 1701388800,
        last_modified_timestamp: 1704153600,
        updated_timestamp: 1704153600,
        state_timestamp: 1701388800,
        quantity: 8,
        shop_section_id: 12346,
        featured_rank: 2,
        url: "https://www.etsy.com/listing/1234567891/hand-knitted-wool-scarf-forest-green",
        num_favorers: 189,
        non_taxable: false,
        is_taxable: true,
        is_customizable: true,
        is_personalizable: false,
        personalization_is_required: false,
        personalization_char_count_max: null,
        personalization_instructions: null,
        listing_type: "physical",
        tags: [
            "wool scarf",
            "hand knitted",
            "cable knit",
            "winter scarf",
            "merino wool",
            "forest green",
            "gift for him"
        ],
        materials: ["100% merino wool"],
        shipping_profile_id: 98765432,
        return_policy_id: 11111111,
        processing_min: 5,
        processing_max: 7,
        who_made: "i_did" as const,
        when_made: "2020_2024",
        is_supply: false,
        item_weight: 8,
        item_weight_unit: "oz",
        item_length: 72,
        item_width: 8,
        item_height: 1,
        item_dimensions_unit: "in",
        is_private: false,
        style: ["classic", "cozy"],
        file_data: "",
        has_variations: true,
        should_auto_renew: true,
        language: "en",
        price: {
            amount: 7500,
            divisor: 100,
            currency_code: "USD"
        },
        taxonomy_id: 1
    },
    {
        listing_id: 1234567892,
        user_id: 12345678,
        shop_id: 87654321,
        title: "Custom Pet Portrait - Watercolor Style Digital Art",
        description:
            "Turn your beloved pet into a beautiful watercolor-style digital portrait! Send me a clear photo of your pet, and I'll create a stunning custom artwork that captures their unique personality.\n\nWhat you'll receive:\n- High-resolution digital file (300 DPI)\n- Perfect for printing at home or at a print shop\n- Multiple sizes included (8x10, 11x14, 16x20)\n\nTurnaround time: 5-7 business days",
        state: "active" as const,
        creation_timestamp: 1698796800,
        created_timestamp: 1698796800,
        ending_timestamp: 1730419200,
        original_creation_timestamp: 1698796800,
        last_modified_timestamp: 1704240000,
        updated_timestamp: 1704240000,
        state_timestamp: 1698796800,
        quantity: 999,
        shop_section_id: 12347,
        featured_rank: 3,
        url: "https://www.etsy.com/listing/1234567892/custom-pet-portrait-watercolor-style",
        num_favorers: 512,
        non_taxable: false,
        is_taxable: true,
        is_customizable: true,
        is_personalizable: true,
        personalization_is_required: true,
        personalization_char_count_max: 500,
        personalization_instructions:
            "Please provide: 1) Pet's name, 2) Any special details about your pet, 3) Preferred background color",
        listing_type: "download",
        tags: [
            "pet portrait",
            "custom portrait",
            "dog portrait",
            "cat portrait",
            "watercolor art",
            "digital download",
            "pet memorial",
            "pet lover gift"
        ],
        materials: [],
        shipping_profile_id: null,
        return_policy_id: 22222222,
        processing_min: 5,
        processing_max: 7,
        who_made: "i_did" as const,
        when_made: "made_to_order",
        is_supply: false,
        item_weight: null,
        item_weight_unit: null,
        item_length: null,
        item_width: null,
        item_height: null,
        item_dimensions_unit: null,
        is_private: false,
        style: ["watercolor", "artistic"],
        file_data: "",
        has_variations: true,
        should_auto_renew: true,
        language: "en",
        price: {
            amount: 4500,
            divisor: 100,
            currency_code: "USD"
        },
        taxonomy_id: 2078
    }
];

// Sample receipts (orders)
const sampleReceipts = [
    {
        receipt_id: 2847593847,
        receipt_type: 0,
        seller_user_id: 12345678,
        seller_email: "artisan@example.com",
        buyer_user_id: 98765432,
        buyer_email: "buyer@example.com",
        name: "Jane Doe",
        first_line: "123 Main Street",
        second_line: "Apt 4B",
        city: "Portland",
        state: "OR",
        zip: "97201",
        status: "Paid",
        formatted_address: "Jane Doe\n123 Main Street\nApt 4B\nPortland, OR 97201\nUnited States",
        country_iso: "US",
        payment_method: "cc",
        payment_email: "",
        message_from_seller: null,
        message_from_buyer: "Love your work! Can't wait to receive this.",
        message_from_payment: null,
        is_paid: true,
        is_shipped: false,
        create_timestamp: 1704240000,
        created_timestamp: 1704240000,
        update_timestamp: 1704240000,
        updated_timestamp: 1704240000,
        is_gift: false,
        gift_message: "",
        grandtotal: {
            amount: 4299,
            divisor: 100,
            currency_code: "USD"
        },
        subtotal: {
            amount: 3500,
            divisor: 100,
            currency_code: "USD"
        },
        total_price: {
            amount: 3500,
            divisor: 100,
            currency_code: "USD"
        },
        total_shipping_cost: {
            amount: 599,
            divisor: 100,
            currency_code: "USD"
        },
        total_tax_cost: {
            amount: 200,
            divisor: 100,
            currency_code: "USD"
        },
        total_vat_cost: {
            amount: 0,
            divisor: 100,
            currency_code: "USD"
        },
        discount_amt: {
            amount: 0,
            divisor: 100,
            currency_code: "USD"
        },
        gift_wrap_price: {
            amount: 0,
            divisor: 100,
            currency_code: "USD"
        },
        shipments: [],
        transactions: [
            {
                transaction_id: 3948573948,
                title: "Handmade Ceramic Mug - Speckled Blue Glaze",
                description: "Beautiful handcrafted ceramic mug...",
                seller_user_id: 12345678,
                buyer_user_id: 98765432,
                create_timestamp: 1704240000,
                created_timestamp: 1704240000,
                paid_timestamp: 1704240000,
                shipped_timestamp: null,
                quantity: 1,
                listing_image_id: 5847392847,
                receipt_id: 2847593847,
                is_digital: false,
                file_data: "",
                listing_id: 1234567890,
                transaction_type: "listing",
                product_id: 11111111,
                sku: "MUG-BLUE-001",
                price: {
                    amount: 3500,
                    divisor: 100,
                    currency_code: "USD"
                },
                shipping_cost: {
                    amount: 599,
                    divisor: 100,
                    currency_code: "USD"
                },
                variations: [],
                product_data: [],
                shipping_profile_id: 98765432,
                min_processing_days: 3,
                max_processing_days: 5,
                shipping_method: "USPS Priority Mail",
                shipping_upgrade: null,
                expected_ship_date: 1704672000,
                buyer_coupon: 0,
                shop_coupon: 0
            }
        ],
        refunds: []
    },
    {
        receipt_id: 2847593848,
        receipt_type: 0,
        seller_user_id: 12345678,
        seller_email: "artisan@example.com",
        buyer_user_id: 87654321,
        buyer_email: "happybuyer@example.com",
        name: "John Smith",
        first_line: "456 Oak Avenue",
        second_line: null,
        city: "Seattle",
        state: "WA",
        zip: "98101",
        status: "Completed",
        formatted_address: "John Smith\n456 Oak Avenue\nSeattle, WA 98101\nUnited States",
        country_iso: "US",
        payment_method: "cc",
        payment_email: "",
        message_from_seller: "Thank you for your order! Your scarf has been shipped.",
        message_from_buyer: null,
        message_from_payment: null,
        is_paid: true,
        is_shipped: true,
        create_timestamp: 1703635200,
        created_timestamp: 1703635200,
        update_timestamp: 1704067200,
        updated_timestamp: 1704067200,
        is_gift: true,
        gift_message: "Happy Birthday! Enjoy this cozy scarf.",
        grandtotal: {
            amount: 8399,
            divisor: 100,
            currency_code: "USD"
        },
        subtotal: {
            amount: 7500,
            divisor: 100,
            currency_code: "USD"
        },
        total_price: {
            amount: 7500,
            divisor: 100,
            currency_code: "USD"
        },
        total_shipping_cost: {
            amount: 699,
            divisor: 100,
            currency_code: "USD"
        },
        total_tax_cost: {
            amount: 200,
            divisor: 100,
            currency_code: "USD"
        },
        total_vat_cost: {
            amount: 0,
            divisor: 100,
            currency_code: "USD"
        },
        discount_amt: {
            amount: 0,
            divisor: 100,
            currency_code: "USD"
        },
        gift_wrap_price: {
            amount: 0,
            divisor: 100,
            currency_code: "USD"
        },
        shipments: [
            {
                receipt_shipping_id: 48573948,
                shipment_notification_timestamp: 1704067200,
                carrier_name: "USPS",
                tracking_code: "9400111899223847583920"
            }
        ],
        transactions: [
            {
                transaction_id: 3948573949,
                title: "Hand-Knitted Wool Scarf - Forest Green",
                description: "Luxuriously soft hand-knitted scarf...",
                seller_user_id: 12345678,
                buyer_user_id: 87654321,
                create_timestamp: 1703635200,
                created_timestamp: 1703635200,
                paid_timestamp: 1703635200,
                shipped_timestamp: 1704067200,
                quantity: 1,
                listing_image_id: 5847392848,
                receipt_id: 2847593848,
                is_digital: false,
                file_data: "",
                listing_id: 1234567891,
                transaction_type: "listing",
                product_id: 22222222,
                sku: "SCARF-GREEN-001",
                price: {
                    amount: 7500,
                    divisor: 100,
                    currency_code: "USD"
                },
                shipping_cost: {
                    amount: 699,
                    divisor: 100,
                    currency_code: "USD"
                },
                variations: [
                    {
                        property_id: 200,
                        property_name: "Primary color",
                        scale_id: null,
                        scale_name: null,
                        value_ids: [1],
                        values: ["Forest Green"]
                    }
                ],
                product_data: [],
                shipping_profile_id: 98765432,
                min_processing_days: 5,
                max_processing_days: 7,
                shipping_method: "USPS Priority Mail",
                shipping_upgrade: null,
                expected_ship_date: 1704240000,
                buyer_coupon: 0,
                shop_coupon: 0
            }
        ],
        refunds: []
    }
];

// Sample shop
const sampleShop = {
    shop_id: 87654321,
    user_id: 12345678,
    shop_name: "ArtisanCraftsStudio",
    create_date: 1577836800,
    created_timestamp: 1577836800,
    title: "Handcrafted Ceramics & Knitwear",
    announcement:
        "Welcome to Artisan Crafts Studio! Every item in my shop is handmade with love. Currently shipping within 3-5 business days.",
    currency_code: "USD",
    is_vacation: false,
    vacation_message: null,
    sale_message: "Thank you for supporting handmade! Your order is being prepared with care.",
    digital_sale_message:
        "Thank you for your purchase! Your files are ready for download. Please don't hesitate to reach out if you have any questions.",
    update_date: 1704326400,
    updated_timestamp: 1704326400,
    listing_active_count: 47,
    digital_listing_count: 12,
    login_name: "artisancrafter",
    accepts_custom_requests: true,
    vacation_autoreply: null,
    url: "https://www.etsy.com/shop/ArtisanCraftsStudio",
    image_url_760x100: "https://i.etsystatic.com/isla/shop/87654321/banner.jpg",
    num_favorers: 1892,
    languages: ["en"],
    icon_url_fullxfull: "https://i.etsystatic.com/isla/shop/87654321/icon.jpg",
    is_using_structured_policies: true,
    has_onboarded_structured_policies: true,
    include_dispute_form_link: true,
    is_direct_checkout_onboarded: true,
    is_etsy_payments_onboarded: true,
    is_calculated_eligible: true,
    is_opted_in_to_buyer_promise: true,
    is_shop_us_based: true,
    transaction_sold_count: 3421,
    shipping_from_country_iso: "US",
    shop_location_country_iso: "US",
    policy_welcome: "Thank you for visiting my shop!",
    policy_payment: "I accept all major credit cards through Etsy Payments.",
    policy_shipping: "Orders ship within 3-5 business days. Tracking is provided for all orders.",
    policy_refunds: "I accept returns within 14 days of delivery for items in original condition.",
    policy_additional: null,
    policy_seller_info: null,
    policy_update_date: 1704067200,
    policy_has_private_receipt_info: false,
    has_unstructured_policies: false,
    policy_privacy: null,
    review_average: 4.9,
    review_count: 2156
};

// Sample inventory
const sampleInventory = {
    products: [
        {
            product_id: 11111111,
            sku: "MUG-BLUE-001",
            is_deleted: false,
            offerings: [
                {
                    offering_id: 33333333,
                    price: {
                        amount: 3500,
                        divisor: 100,
                        currency_code: "USD"
                    },
                    quantity: 15,
                    is_enabled: true,
                    is_deleted: false
                }
            ],
            property_values: []
        },
        {
            product_id: 11111112,
            sku: "MUG-WHITE-001",
            is_deleted: false,
            offerings: [
                {
                    offering_id: 33333334,
                    price: {
                        amount: 3500,
                        divisor: 100,
                        currency_code: "USD"
                    },
                    quantity: 8,
                    is_enabled: true,
                    is_deleted: false
                }
            ],
            property_values: [
                {
                    property_id: 200,
                    property_name: "Primary color",
                    scale_id: null,
                    scale_name: null,
                    value_ids: [1],
                    values: ["White"]
                }
            ]
        }
    ],
    price_on_property: [],
    quantity_on_property: [],
    sku_on_property: []
};

export const etsyFixtures: TestFixture[] = [
    // ==========================================
    // Listing Operations
    // ==========================================
    {
        operationId: "getListing",
        provider: "etsy",
        validCases: [
            {
                name: "get_listing_full_details",
                description: "Retrieve a single listing with all details",
                input: {
                    listing_id: "1234567890"
                },
                expectedOutput: {
                    listing: sampleListings[0]
                }
            },
            {
                name: "get_listing_with_includes",
                description: "Retrieve listing with images and shop data",
                input: {
                    listing_id: "1234567891",
                    includes: ["Images", "Shop"]
                },
                expectedOutput: {
                    listing: {
                        ...sampleListings[1],
                        images: [],
                        shop: sampleShop
                    }
                }
            },
            {
                name: "get_digital_listing",
                description: "Retrieve a digital download listing",
                input: {
                    listing_id: "1234567892"
                },
                expectedOutput: {
                    listing: sampleListings[2]
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Listing ID does not exist",
                input: {
                    listing_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Listing not found",
                    retryable: false
                }
            },
            {
                name: "unauthorized",
                description: "Access token has insufficient scope",
                input: {
                    listing_id: "1234567890"
                },
                expectedError: {
                    type: "permission",
                    message: "Access token does not have required scope: listings_r",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listing_id: "1234567890"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited. Retry after 2.0 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listListings",
        provider: "etsy",
        validCases: [
            {
                name: "list_all_active_listings",
                description: "List all active listings for a shop",
                input: {
                    shop_id: "87654321"
                }
            },
            {
                name: "list_listings_with_pagination",
                description: "List listings with pagination",
                input: {
                    shop_id: "87654321",
                    limit: 10,
                    offset: 0
                }
            },
            {
                name: "list_draft_listings",
                description: "List draft listings for editing",
                input: {
                    shop_id: "87654321",
                    state: "draft"
                }
            }
        ],
        errorCases: [
            {
                name: "shop_not_found",
                description: "Shop ID does not exist",
                input: {
                    shop_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Shop not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    shop_id: "87654321"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited. Retry after 2.0 seconds.",
                    retryable: true
                }
            }
        ],
        filterableData: {
            records: sampleListings,
            recordsField: "results",
            defaultPageSize: 25,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                state: {
                    type: "enum" as const,
                    field: "state"
                }
            }
        }
    },
    {
        operationId: "createListing",
        provider: "etsy",
        validCases: [
            {
                name: "create_physical_listing",
                description: "Create a new physical product listing",
                input: {
                    shop_id: "87654321",
                    quantity: 10,
                    title: "Handmade Leather Wallet - Minimalist Design",
                    description:
                        "Beautiful handcrafted leather wallet made from full-grain leather.",
                    price: 45.0,
                    who_made: "i_did",
                    when_made: "2020_2024",
                    taxonomy_id: 1,
                    shipping_profile_id: 98765432,
                    tags: ["leather wallet", "handmade", "minimalist"],
                    materials: ["full-grain leather"]
                },
                expectedOutput: {
                    listing: {
                        listing_id: 1234567893,
                        title: "Handmade Leather Wallet - Minimalist Design",
                        state: "draft",
                        quantity: 10,
                        price: {
                            amount: 4500,
                            divisor: 100,
                            currency_code: "USD"
                        }
                    },
                    listingId: "1234567893",
                    message: "Listing created successfully"
                }
            },
            {
                name: "create_personalizable_listing",
                description: "Create a listing with personalization options",
                input: {
                    shop_id: "87654321",
                    quantity: 50,
                    title: "Custom Engraved Wooden Cutting Board",
                    description:
                        "Personalized cutting board, perfect for weddings and housewarmings.",
                    price: 65.0,
                    who_made: "i_did",
                    when_made: "made_to_order",
                    taxonomy_id: 1,
                    is_personalizable: true,
                    personalization_is_required: true,
                    personalization_char_count_max: 50,
                    personalization_instructions:
                        "Enter the text you want engraved (up to 50 characters)"
                },
                expectedOutput: {
                    listing: {
                        listing_id: 1234567894,
                        title: "Custom Engraved Wooden Cutting Board",
                        state: "draft",
                        is_personalizable: true,
                        personalization_is_required: true
                    },
                    listingId: "1234567894",
                    message: "Listing created successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_required_field",
                description: "Title is required",
                input: {
                    shop_id: "87654321",
                    quantity: 10,
                    description: "Test description",
                    price: 25.0,
                    who_made: "i_did",
                    when_made: "2020_2024",
                    taxonomy_id: 1
                },
                expectedError: {
                    type: "validation",
                    message: "Title is required",
                    retryable: false
                }
            },
            {
                name: "invalid_taxonomy",
                description: "Invalid taxonomy ID",
                input: {
                    shop_id: "87654321",
                    quantity: 10,
                    title: "Test Product",
                    description: "Test description",
                    price: 25.0,
                    who_made: "i_did",
                    when_made: "2020_2024",
                    taxonomy_id: 999999999
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid taxonomy_id",
                    retryable: false
                }
            },
            {
                name: "unauthorized",
                description: "Access token has insufficient scope for write operations",
                input: {
                    shop_id: "87654321",
                    quantity: 10,
                    title: "Test Product",
                    description: "Test description",
                    price: 25.0,
                    who_made: "i_did",
                    when_made: "2020_2024",
                    taxonomy_id: 1
                },
                expectedError: {
                    type: "permission",
                    message: "Access token does not have required scope: listings_w",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    shop_id: "87654321",
                    quantity: 10,
                    title: "Test Product",
                    description: "Test description",
                    price: 25.0,
                    who_made: "i_did",
                    when_made: "2020_2024",
                    taxonomy_id: 1
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited. Retry after 2.0 seconds.",
                    retryable: true
                }
            },
            {
                name: "server_error",
                description: "Etsy API server error",
                input: {
                    shop_id: "87654321",
                    quantity: 10,
                    title: "Test Product",
                    description: "Test description",
                    price: 25.0,
                    who_made: "i_did",
                    when_made: "2020_2024",
                    taxonomy_id: 1
                },
                expectedError: {
                    type: "server_error",
                    message: "Etsy API is temporarily unavailable. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateListing",
        provider: "etsy",
        validCases: [
            {
                name: "update_listing_price",
                description: "Update listing price and quantity",
                input: {
                    shop_id: "87654321",
                    listing_id: "1234567890",
                    price: 39.99,
                    quantity: 20
                },
                expectedOutput: {
                    listing: {
                        ...sampleListings[0],
                        price: {
                            amount: 3999,
                            divisor: 100,
                            currency_code: "USD"
                        },
                        quantity: 20
                    },
                    message: "Listing updated successfully"
                }
            },
            {
                name: "update_listing_title",
                description: "Update listing title and description",
                input: {
                    shop_id: "87654321",
                    listing_id: "1234567890",
                    title: "Handmade Ceramic Mug - Ocean Blue Glaze (Updated)"
                },
                expectedOutput: {
                    listing: {
                        ...sampleListings[0],
                        title: "Handmade Ceramic Mug - Ocean Blue Glaze (Updated)"
                    },
                    message: "Listing updated successfully"
                }
            },
            {
                name: "activate_listing",
                description: "Change listing state from draft to active",
                input: {
                    shop_id: "87654321",
                    listing_id: "1234567890",
                    state: "active"
                },
                expectedOutput: {
                    listing: {
                        ...sampleListings[0],
                        state: "active"
                    },
                    message: "Listing updated successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Listing ID does not exist",
                input: {
                    shop_id: "87654321",
                    listing_id: "9999999999",
                    title: "Updated Title"
                },
                expectedError: {
                    type: "not_found",
                    message: "Listing not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    shop_id: "87654321",
                    listing_id: "1234567890",
                    title: "Updated Title"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited. Retry after 2.0 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteListing",
        provider: "etsy",
        validCases: [
            {
                name: "delete_listing",
                description: "Delete a listing",
                input: {
                    shop_id: "87654321",
                    listing_id: "1234567890"
                },
                expectedOutput: {
                    listingId: "1234567890",
                    message: "Listing deleted successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Listing ID does not exist",
                input: {
                    shop_id: "87654321",
                    listing_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Listing not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    shop_id: "87654321",
                    listing_id: "1234567890"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited. Retry after 2.0 seconds.",
                    retryable: true
                }
            }
        ]
    },

    // ==========================================
    // Inventory Operations
    // ==========================================
    {
        operationId: "getListingInventory",
        provider: "etsy",
        validCases: [
            {
                name: "get_inventory_with_variations",
                description: "Get inventory for a listing with variations",
                input: {
                    listing_id: "1234567890"
                },
                expectedOutput: {
                    inventory: sampleInventory
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Listing ID does not exist",
                input: {
                    listing_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Listing not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listing_id: "1234567890"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited. Retry after 2.0 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateListingInventory",
        provider: "etsy",
        validCases: [
            {
                name: "update_inventory_quantity",
                description: "Update inventory quantities",
                input: {
                    listing_id: "1234567890",
                    products: [
                        {
                            sku: "MUG-BLUE-001",
                            offerings: [
                                {
                                    price: 35.0,
                                    quantity: 25,
                                    is_enabled: true
                                }
                            ]
                        }
                    ]
                },
                expectedOutput: {
                    inventory: {
                        ...sampleInventory,
                        products: [
                            {
                                ...sampleInventory.products[0],
                                offerings: [
                                    {
                                        ...sampleInventory.products[0].offerings[0],
                                        quantity: 25
                                    }
                                ]
                            }
                        ]
                    },
                    message: "Listing inventory updated successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Listing ID does not exist",
                input: {
                    listing_id: "9999999999",
                    products: [
                        {
                            offerings: [
                                {
                                    price: 35.0,
                                    quantity: 10,
                                    is_enabled: true
                                }
                            ]
                        }
                    ]
                },
                expectedError: {
                    type: "not_found",
                    message: "Listing not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listing_id: "1234567890",
                    products: []
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited. Retry after 2.0 seconds.",
                    retryable: true
                }
            }
        ]
    },

    // ==========================================
    // Receipt (Order) Operations
    // ==========================================
    {
        operationId: "getReceipt",
        provider: "etsy",
        validCases: [
            {
                name: "get_receipt_unpaid",
                description: "Get a receipt that needs to be shipped",
                input: {
                    shop_id: "87654321",
                    receipt_id: "2847593847"
                },
                expectedOutput: {
                    receipt: sampleReceipts[0]
                }
            },
            {
                name: "get_receipt_shipped",
                description: "Get a receipt with shipping information",
                input: {
                    shop_id: "87654321",
                    receipt_id: "2847593848"
                },
                expectedOutput: {
                    receipt: sampleReceipts[1]
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Receipt ID does not exist",
                input: {
                    shop_id: "87654321",
                    receipt_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Receipt not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    shop_id: "87654321",
                    receipt_id: "2847593847"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited. Retry after 2.0 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listReceipts",
        provider: "etsy",
        validCases: [
            {
                name: "list_all_receipts",
                description: "List all receipts for a shop",
                input: {
                    shop_id: "87654321"
                }
            },
            {
                name: "list_paid_receipts",
                description: "List only paid receipts",
                input: {
                    shop_id: "87654321",
                    was_paid: true
                }
            },
            {
                name: "list_unshipped_receipts",
                description: "List receipts that need shipping",
                input: {
                    shop_id: "87654321",
                    was_paid: true,
                    was_shipped: false
                }
            }
        ],
        errorCases: [
            {
                name: "shop_not_found",
                description: "Shop ID does not exist",
                input: {
                    shop_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Shop not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    shop_id: "87654321"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited. Retry after 2.0 seconds.",
                    retryable: true
                }
            }
        ],
        filterableData: {
            records: sampleReceipts,
            recordsField: "results",
            defaultPageSize: 25,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                was_paid: {
                    type: "boolean" as const,
                    field: "is_paid"
                },
                was_shipped: {
                    type: "boolean" as const,
                    field: "is_shipped"
                }
            }
        }
    },
    {
        operationId: "createReceiptShipment",
        provider: "etsy",
        validCases: [
            {
                name: "create_shipment_with_tracking",
                description: "Add tracking information to a receipt",
                input: {
                    shop_id: "87654321",
                    receipt_id: "2847593847",
                    tracking_code: "9400111899223847583921",
                    carrier_name: "USPS"
                },
                expectedOutput: {
                    receipt: {
                        ...sampleReceipts[0],
                        is_shipped: true,
                        shipments: [
                            {
                                receipt_shipping_id: 48573949,
                                shipment_notification_timestamp: 1704326400,
                                carrier_name: "USPS",
                                tracking_code: "9400111899223847583921"
                            }
                        ]
                    },
                    message: "Shipment tracking added successfully"
                }
            },
            {
                name: "create_shipment_with_note",
                description: "Add shipment with a note to the buyer",
                input: {
                    shop_id: "87654321",
                    receipt_id: "2847593847",
                    tracking_code: "1Z999AA10123456784",
                    carrier_name: "UPS",
                    note_to_buyer: "Your order has been shipped! Handle with care.",
                    send_bcc: true
                },
                expectedOutput: {
                    receipt: {
                        ...sampleReceipts[0],
                        is_shipped: true,
                        message_from_seller: "Your order has been shipped! Handle with care."
                    },
                    message: "Shipment tracking added successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Receipt ID does not exist",
                input: {
                    shop_id: "87654321",
                    receipt_id: "9999999999",
                    carrier_name: "USPS"
                },
                expectedError: {
                    type: "not_found",
                    message: "Receipt not found",
                    retryable: false
                }
            },
            {
                name: "unauthorized",
                description: "Access token has insufficient scope for transactions",
                input: {
                    shop_id: "87654321",
                    receipt_id: "2847593847",
                    carrier_name: "USPS"
                },
                expectedError: {
                    type: "permission",
                    message: "Access token does not have required scope: transactions_w",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    shop_id: "87654321",
                    receipt_id: "2847593847",
                    carrier_name: "USPS"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited. Retry after 2.0 seconds.",
                    retryable: true
                }
            }
        ]
    },

    // ==========================================
    // Shop Operations
    // ==========================================
    {
        operationId: "getShop",
        provider: "etsy",
        validCases: [
            {
                name: "get_shop_details",
                description: "Get full shop details including policies and statistics",
                input: {
                    shop_id: "87654321"
                },
                expectedOutput: {
                    shop: sampleShop
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Shop ID does not exist",
                input: {
                    shop_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Shop not found",
                    retryable: false
                }
            },
            {
                name: "unauthorized",
                description: "Access token has insufficient scope for shop data",
                input: {
                    shop_id: "87654321"
                },
                expectedError: {
                    type: "permission",
                    message: "Access token does not have required scope: shops_r",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    shop_id: "87654321"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited. Retry after 2.0 seconds.",
                    retryable: true
                }
            },
            {
                name: "server_error",
                description: "Etsy API server error",
                input: {
                    shop_id: "87654321"
                },
                expectedError: {
                    type: "server_error",
                    message: "Etsy API is temporarily unavailable. Please try again later.",
                    retryable: true
                }
            }
        ]
    }
];
