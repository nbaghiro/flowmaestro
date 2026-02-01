/**
 * Klaviyo Provider Test Fixtures
 *
 * Based on official Klaviyo API documentation:
 * - Profiles API: https://developers.klaviyo.com/en/reference/profiles_api_overview
 * - Lists API: https://developers.klaviyo.com/en/reference/lists_api_overview
 * - Events API: https://developers.klaviyo.com/en/reference/events_api_overview
 * - Campaigns API: https://developers.klaviyo.com/en/reference/campaigns_api_overview
 */

import type { TestFixture } from "../../../sandbox";

export const klaviyoFixtures: TestFixture[] = [
    {
        operationId: "createProfile",
        provider: "klaviyo",
        validCases: [
            {
                name: "profile_with_custom_properties",
                description: "Create a profile with custom properties for segmentation",
                input: {
                    email: "david.lee@ecommerce.shop",
                    first_name: "David",
                    last_name: "Lee",
                    external_id: "cust_12345",
                    properties: {
                        customer_tier: "Gold",
                        lifetime_value: 2500.0,
                        preferred_category: "Electronics",
                        loyalty_points: 15000,
                        signup_source: "Facebook Ad",
                        accepts_marketing: true
                    }
                },
                expectedOutput: {
                    id: "01HXYZ456789012DEFGHIJKLM",
                    email: "david.lee@ecommerce.shop",
                    first_name: "David",
                    last_name: "Lee",
                    external_id: "cust_12345",
                    properties: {
                        customer_tier: "Gold",
                        lifetime_value: 2500.0,
                        preferred_category: "Electronics",
                        loyalty_points: 15000,
                        signup_source: "Facebook Ad",
                        accepts_marketing: true
                    },
                    created: "{{iso}}",
                    updated: "{{iso}}"
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_profile",
                description: "Profile with this email already exists",
                input: {
                    email: "existing.user@company.com",
                    first_name: "Existing",
                    last_name: "User"
                },
                expectedError: {
                    type: "validation",
                    message: "A profile with this email already exists",
                    retryable: false
                }
            },
            {
                name: "invalid_phone_format",
                description: "Phone number not in E.164 format",
                input: {
                    email: "test@example.com",
                    phone_number: "555-123-4567",
                    first_name: "Test",
                    last_name: "User"
                },
                expectedError: {
                    type: "validation",
                    message: "Phone number must be in E.164 format (e.g., +14155551234)",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    email: "rate.limit@test.com",
                    first_name: "Rate",
                    last_name: "Limited"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getProfile",
        provider: "klaviyo",
        validCases: [
            {
                name: "get_profile_by_id",
                description: "Retrieve a profile by its Klaviyo ID",
                input: {
                    profileId: "01HXYZ123456789ABCDEFGHIJ"
                },
                expectedOutput: {
                    id: "01HXYZ123456789ABCDEFGHIJ",
                    email: "sarah.johnson@example.com",
                    phone_number: "+14155559876",
                    first_name: "Sarah",
                    last_name: "Johnson",
                    organization: "Acme Corp",
                    title: "Product Manager",
                    location: {
                        city: "New York",
                        region: "NY",
                        country: "United States",
                        timezone: "America/New_York"
                    },
                    properties: {
                        customer_tier: "Platinum",
                        lifetime_value: 8750.5,
                        last_purchase_date: "2024-01-15",
                        total_orders: 47
                    },
                    created: "2023-06-15T10:30:00Z",
                    updated: "2024-01-20T14:45:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "profile_not_found",
                description: "Profile does not exist",
                input: {
                    profileId: "01HXYZ999999999NONEXISTENT"
                },
                expectedError: {
                    type: "not_found",
                    message: "Profile with ID 01HXYZ999999999NONEXISTENT not found",
                    retryable: false
                }
            },
            {
                name: "invalid_profile_id",
                description: "Invalid profile ID format",
                input: {
                    profileId: "invalid-id-format"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid profile ID format",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getProfiles",
        provider: "klaviyo",
        validCases: [
            {
                name: "list_all_profiles",
                description: "List profiles with default pagination",
                input: {},
                expectedOutput: {
                    profiles: [
                        {
                            id: "01HXYZ123456789ABCDEFGHIJ",
                            email: "sarah.johnson@example.com",
                            first_name: "Sarah",
                            last_name: "Johnson",
                            organization: "Acme Corp",
                            created: "2023-06-15T10:30:00Z",
                            updated: "2024-01-20T14:45:00Z"
                        },
                        {
                            id: "01HXYZ234567890BCDEFGHIJK",
                            email: "mike.chen@techstartup.io",
                            first_name: "Mike",
                            last_name: "Chen",
                            organization: "TechStartup Inc",
                            created: "2023-08-22T08:15:00Z",
                            updated: "2024-01-18T11:30:00Z"
                        },
                        {
                            id: "01HXYZ345678901CDEFGHIJKL",
                            email: "emma.wilson@retailbrand.com",
                            first_name: "Emma",
                            last_name: "Wilson",
                            organization: "RetailBrand Co",
                            created: "2023-11-05T16:20:00Z",
                            updated: "2024-01-22T09:00:00Z"
                        }
                    ],
                    hasMore: true,
                    nextCursor: "WzE3MDYwMDEyMDAwMDAsIjAxSFhZWjM0NTY3ODkwMUNERUZHSElKS0wiXQ=="
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_filter_syntax",
                description: "Filter query has invalid syntax",
                input: {
                    filter: "invalid filter syntax"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid filter syntax. Expected format: operator(field,value)",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    pageSize: 100
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateProfile",
        provider: "klaviyo",
        validCases: [
            {
                name: "update_basic_info",
                description: "Update profile name and organization",
                input: {
                    profileId: "01HXYZ123456789ABCDEFGHIJ",
                    first_name: "Sarah",
                    last_name: "Johnson-Smith",
                    organization: "Acme Corporation",
                    title: "Senior Product Manager"
                },
                expectedOutput: {
                    id: "01HXYZ123456789ABCDEFGHIJ",
                    email: "sarah.johnson@example.com",
                    first_name: "Sarah",
                    last_name: "Johnson-Smith",
                    organization: "Acme Corporation",
                    title: "Senior Product Manager",
                    created: "2023-06-15T10:30:00Z",
                    updated: "{{iso}}"
                }
            }
        ],
        errorCases: [
            {
                name: "profile_not_found",
                description: "Profile to update does not exist",
                input: {
                    profileId: "01HXYZ999999999NONEXISTENT",
                    first_name: "Updated",
                    last_name: "Name"
                },
                expectedError: {
                    type: "not_found",
                    message: "Profile with ID 01HXYZ999999999NONEXISTENT not found",
                    retryable: false
                }
            },
            {
                name: "invalid_email_format",
                description: "Updated email has invalid format",
                input: {
                    profileId: "01HXYZ123456789ABCDEFGHIJ",
                    email: "not-a-valid-email"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email format",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getLists",
        provider: "klaviyo",
        validCases: [
            {
                name: "list_all_lists",
                description: "Get all marketing lists",
                input: {},
                expectedOutput: {
                    lists: [
                        {
                            id: "Xvz9Qa",
                            name: "Newsletter Subscribers",
                            created: "2023-01-10T09:00:00Z",
                            updated: "2024-01-15T14:30:00Z"
                        },
                        {
                            id: "Ywb8Rb",
                            name: "VIP Customers",
                            created: "2023-03-22T11:45:00Z",
                            updated: "2024-01-20T10:15:00Z"
                        },
                        {
                            id: "Zxc7Sc",
                            name: "Abandoned Cart",
                            created: "2023-05-15T08:30:00Z",
                            updated: "2024-01-22T16:00:00Z"
                        },
                        {
                            id: "Avd6Td",
                            name: "Product Launch Waitlist",
                            created: "2023-09-01T12:00:00Z",
                            updated: "2024-01-18T09:45:00Z"
                        },
                        {
                            id: "Bwe5Ue",
                            name: "Holiday Promotions 2024",
                            created: "2023-11-20T15:30:00Z",
                            updated: "2024-01-21T11:20:00Z"
                        }
                    ],
                    hasMore: false
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
                    message: "Rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getListProfiles",
        provider: "klaviyo",
        validCases: [
            {
                name: "get_newsletter_subscribers",
                description: "Get all profiles in the newsletter list",
                input: {
                    listId: "Xvz9Qa"
                },
                expectedOutput: {
                    listId: "Xvz9Qa",
                    profiles: [
                        {
                            id: "01HXYZ123456789ABCDEFGHIJ",
                            email: "sarah.johnson@example.com",
                            first_name: "Sarah",
                            last_name: "Johnson",
                            created: "2023-06-15T10:30:00Z",
                            updated: "2024-01-20T14:45:00Z"
                        },
                        {
                            id: "01HXYZ234567890BCDEFGHIJK",
                            email: "mike.chen@techstartup.io",
                            first_name: "Mike",
                            last_name: "Chen",
                            created: "2023-08-22T08:15:00Z",
                            updated: "2024-01-18T11:30:00Z"
                        },
                        {
                            id: "01HXYZ345678901CDEFGHIJKL",
                            email: "emma.wilson@retailbrand.com",
                            first_name: "Emma",
                            last_name: "Wilson",
                            created: "2023-11-05T16:20:00Z",
                            updated: "2024-01-22T09:00:00Z"
                        }
                    ],
                    hasMore: true,
                    nextCursor: "WzE3MDYwMDEyMDAwMDAsIjAxSFhZWjM0NTY3ODkwMUNERUZHSElKS0wiXQ=="
                }
            }
        ],
        errorCases: [
            {
                name: "list_not_found",
                description: "List does not exist",
                input: {
                    listId: "NonexistentListId"
                },
                expectedError: {
                    type: "not_found",
                    message: "List not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "Xvz9Qa",
                    pageSize: 100
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "addProfilesToList",
        provider: "klaviyo",
        validCases: [
            {
                name: "add_multiple_profiles",
                description: "Add multiple profiles to a list in batch",
                input: {
                    listId: "Ywb8Rb",
                    profileIds: [
                        "01HXYZ123456789ABCDEFGHIJ",
                        "01HXYZ234567890BCDEFGHIJK",
                        "01HXYZ345678901CDEFGHIJKL",
                        "01HXYZ456789012DEFGHIJKLM"
                    ]
                },
                expectedOutput: {
                    listId: "Ywb8Rb",
                    profileIds: [
                        "01HXYZ123456789ABCDEFGHIJ",
                        "01HXYZ234567890BCDEFGHIJK",
                        "01HXYZ345678901CDEFGHIJKL",
                        "01HXYZ456789012DEFGHIJKLM"
                    ],
                    added: 4
                }
            }
        ],
        errorCases: [
            {
                name: "list_not_found",
                description: "Target list does not exist",
                input: {
                    listId: "NonexistentListId",
                    profileIds: ["01HXYZ123456789ABCDEFGHIJ"]
                },
                expectedError: {
                    type: "not_found",
                    message: "List not found",
                    retryable: false
                }
            },
            {
                name: "profile_not_found",
                description: "One or more profiles do not exist",
                input: {
                    listId: "Xvz9Qa",
                    profileIds: ["01HXYZ999999999NONEXISTENT"]
                },
                expectedError: {
                    type: "not_found",
                    message: "One or more profiles not found",
                    retryable: false
                }
            },
            {
                name: "too_many_profiles",
                description: "Exceeded maximum profiles per request",
                input: {
                    listId: "Xvz9Qa",
                    profileIds: Array(101)
                        .fill(null)
                        .map((_, i) => `01HXYZ${String(i).padStart(18, "0")}`)
                },
                expectedError: {
                    type: "validation",
                    message: "Maximum of 100 profiles per request",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "Xvz9Qa",
                    profileIds: ["01HXYZ123456789ABCDEFGHIJ"]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "removeProfilesFromList",
        provider: "klaviyo",
        validCases: [
            {
                name: "remove_multiple_profiles",
                description: "Remove multiple profiles from a list",
                input: {
                    listId: "Zxc7Sc",
                    profileIds: ["01HXYZ123456789ABCDEFGHIJ", "01HXYZ234567890BCDEFGHIJK"]
                },
                expectedOutput: {
                    listId: "Zxc7Sc",
                    profileIds: ["01HXYZ123456789ABCDEFGHIJ", "01HXYZ234567890BCDEFGHIJK"],
                    removed: 2
                }
            }
        ],
        errorCases: [
            {
                name: "list_not_found",
                description: "List does not exist",
                input: {
                    listId: "NonexistentListId",
                    profileIds: ["01HXYZ123456789ABCDEFGHIJ"]
                },
                expectedError: {
                    type: "not_found",
                    message: "List not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "Xvz9Qa",
                    profileIds: ["01HXYZ123456789ABCDEFGHIJ"]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "subscribeProfile",
        provider: "klaviyo",
        validCases: [
            {
                name: "subscribe_both_channels",
                description: "Subscribe profile to both email and SMS",
                input: {
                    listId: "Bwe5Ue",
                    email: "holiday.shopper@deals.com",
                    phone_number: "+14155559876",
                    custom_source: "Holiday Pop-up Form"
                },
                expectedOutput: {
                    listId: "Bwe5Ue",
                    email: "holiday.shopper@deals.com",
                    phone_number: "+14155559876",
                    subscribed: true
                }
            }
        ],
        errorCases: [
            {
                name: "no_contact_info",
                description: "Neither email nor phone number provided",
                input: {
                    listId: "Xvz9Qa"
                },
                expectedError: {
                    type: "validation",
                    message: "Either email or phone_number must be provided",
                    retryable: false
                }
            },
            {
                name: "invalid_email",
                description: "Invalid email format",
                input: {
                    listId: "Xvz9Qa",
                    email: "not-valid-email"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email format",
                    retryable: false
                }
            },
            {
                name: "invalid_phone",
                description: "Phone number not in E.164 format",
                input: {
                    listId: "Ywb8Rb",
                    phone_number: "555-1234"
                },
                expectedError: {
                    type: "validation",
                    message: "Phone number must be in E.164 format",
                    retryable: false
                }
            },
            {
                name: "list_not_found",
                description: "Target list does not exist",
                input: {
                    listId: "NonexistentListId",
                    email: "test@example.com"
                },
                expectedError: {
                    type: "not_found",
                    message: "List not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "Xvz9Qa",
                    email: "rate.limited@test.com"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createEvent",
        provider: "klaviyo",
        validCases: [
            {
                name: "track_placed_order",
                description: "Track a placed order event with full details",
                input: {
                    metricName: "Placed Order",
                    email: "customer@shop.com",
                    value: 149.99,
                    properties: {
                        order_id: "ORD-2024-001234",
                        items: [
                            {
                                product_id: "PROD-001",
                                name: "Wireless Bluetooth Headphones",
                                quantity: 1,
                                price: 79.99,
                                sku: "WBH-BLK-001"
                            },
                            {
                                product_id: "PROD-002",
                                name: "Phone Case",
                                quantity: 2,
                                price: 34.99,
                                sku: "PC-CLR-002"
                            }
                        ],
                        shipping_method: "Express",
                        coupon_code: "SAVE20",
                        discount_amount: 30.0,
                        subtotal: 149.97,
                        tax: 12.74,
                        total: 149.99
                    },
                    unique_id: "order-ORD-2024-001234"
                },
                expectedOutput: {
                    metricName: "Placed Order",
                    profile: {
                        email: "customer@shop.com"
                    },
                    tracked: true
                }
            }
        ],
        errorCases: [
            {
                name: "no_profile_identifier",
                description: "No email, phone, or profile ID provided",
                input: {
                    metricName: "Test Event",
                    properties: {
                        test: true
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "At least one of email, phone_number, or profileId must be provided",
                    retryable: false
                }
            },
            {
                name: "invalid_email",
                description: "Invalid email format",
                input: {
                    metricName: "Test Event",
                    email: "not-an-email"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email format",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    metricName: "Page View",
                    email: "user@site.com"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getCampaigns",
        provider: "klaviyo",
        validCases: [
            {
                name: "list_all_campaigns",
                description: "List all email campaigns",
                input: {},
                expectedOutput: {
                    campaigns: [
                        {
                            id: "01HCMP001234567890ABCDEF",
                            name: "January Newsletter",
                            status: "sent",
                            archived: false,
                            channel: "email",
                            send_time: "2024-01-15T10:00:00Z",
                            created_at: "2024-01-10T09:00:00Z",
                            updated_at: "2024-01-15T10:05:00Z"
                        },
                        {
                            id: "01HCMP234567890BCDEFGHIJ",
                            name: "Winter Sale Announcement",
                            status: "sent",
                            archived: false,
                            channel: "email",
                            send_time: "2024-01-08T14:00:00Z",
                            created_at: "2024-01-05T11:30:00Z",
                            updated_at: "2024-01-08T14:02:00Z"
                        },
                        {
                            id: "01HCMP345678901CDEFGHIJK",
                            name: "New Product Launch",
                            status: "scheduled",
                            archived: false,
                            channel: "email",
                            send_time: "2024-01-25T09:00:00Z",
                            created_at: "2024-01-18T16:00:00Z",
                            updated_at: "2024-01-20T10:30:00Z"
                        },
                        {
                            id: "01HCMP456789012DEFGHIJKL",
                            name: "VIP Early Access",
                            status: "draft",
                            archived: false,
                            channel: "email",
                            created_at: "2024-01-22T08:00:00Z",
                            updated_at: "2024-01-22T15:45:00Z"
                        }
                    ],
                    hasMore: true,
                    nextCursor: "WzE3MDYwMDEyMDAwMDAsIjAxSENNUDQ1Njc4OTAxMkRFRkdISUpLTCJd"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_filter_syntax",
                description: "Filter query has invalid syntax",
                input: {
                    filter: "invalid syntax here"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid filter syntax. Expected format: operator(field,value)",
                    retryable: false
                }
            },
            {
                name: "invalid_sort_field",
                description: "Sort by invalid field",
                input: {
                    sort: "invalid_field"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid sort field. Valid fields: created_at, updated_at, send_time",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    }
];
