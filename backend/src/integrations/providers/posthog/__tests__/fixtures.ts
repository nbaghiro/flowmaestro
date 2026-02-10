/**
 * PostHog Provider Test Fixtures
 *
 * Based on PostHog API documentation:
 * - Capture: https://posthog.com/docs/api/capture
 * - Identify: https://posthog.com/docs/api/identify
 * - Groups: https://posthog.com/docs/api/groups
 */

import type { TestFixture } from "../../../sandbox";

export const posthogFixtures: TestFixture[] = [
    {
        operationId: "captureEvent",
        provider: "posthog",
        validCases: [
            {
                name: "capture_page_view",
                description: "Capture a page view event",
                input: {
                    event: "$pageview",
                    distinct_id: "user_12345",
                    properties: {
                        $current_url: "https://app.example.com/dashboard",
                        $pathname: "/dashboard",
                        $browser: "Chrome",
                        $browser_version: "120.0.0",
                        $os: "macOS",
                        $device_type: "Desktop"
                    }
                },
                expectedOutput: {
                    captured: true,
                    event: "$pageview",
                    distinct_id: "user_12345"
                }
            },
            {
                name: "capture_custom_event",
                description: "Capture a custom business event",
                input: {
                    event: "subscription_upgraded",
                    distinct_id: "user_67890",
                    properties: {
                        plan_from: "basic",
                        plan_to: "pro",
                        monthly_price: 49.99,
                        billing_cycle: "monthly",
                        upgrade_source: "pricing_page"
                    },
                    timestamp: "2024-12-19T15:30:00Z"
                },
                expectedOutput: {
                    captured: true,
                    event: "subscription_upgraded",
                    distinct_id: "user_67890"
                }
            },
            {
                name: "capture_feature_usage",
                description: "Capture feature usage event with UUID",
                input: {
                    event: "feature_used",
                    distinct_id: "user_24680",
                    properties: {
                        feature_name: "workflow_builder",
                        action: "node_added",
                        node_type: "email_sender",
                        workflow_id: "wf_abc123"
                    },
                    uuid: "550e8400-e29b-41d4-a716-446655440000"
                },
                expectedOutput: {
                    captured: true,
                    event: "feature_used",
                    distinct_id: "user_24680"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_api_key",
                description: "Invalid or expired API key",
                input: {
                    event: "test_event",
                    distinct_id: "user_12345"
                },
                expectedError: {
                    type: "permission",
                    message: "Invalid API key",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    event: "test_event",
                    distinct_id: "user_12345"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please reduce request frequency.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "captureEvents",
        provider: "posthog",
        validCases: [
            {
                name: "batch_page_views",
                description: "Capture multiple page view events in batch",
                input: {
                    events: [
                        {
                            event: "$pageview",
                            distinct_id: "user_12345",
                            properties: {
                                $current_url: "https://app.example.com/login",
                                $pathname: "/login"
                            },
                            timestamp: "2024-12-19T10:00:00Z"
                        },
                        {
                            event: "$pageview",
                            distinct_id: "user_12345",
                            properties: {
                                $current_url: "https://app.example.com/dashboard",
                                $pathname: "/dashboard"
                            },
                            timestamp: "2024-12-19T10:00:30Z"
                        },
                        {
                            event: "$pageview",
                            distinct_id: "user_12345",
                            properties: {
                                $current_url: "https://app.example.com/settings",
                                $pathname: "/settings"
                            },
                            timestamp: "2024-12-19T10:01:00Z"
                        }
                    ]
                },
                expectedOutput: {
                    captured: true,
                    event_count: 3
                }
            },
            {
                name: "batch_mixed_events",
                description: "Capture mixed event types in batch",
                input: {
                    events: [
                        {
                            event: "user_signup",
                            distinct_id: "user_new_001",
                            properties: {
                                signup_source: "google_oauth",
                                referrer: "producthunt.com"
                            }
                        },
                        {
                            event: "onboarding_started",
                            distinct_id: "user_new_001",
                            properties: {
                                step: 1,
                                flow_version: "v2"
                            }
                        },
                        {
                            event: "onboarding_completed",
                            distinct_id: "user_new_001",
                            properties: {
                                step: 5,
                                duration_seconds: 180,
                                completed: true
                            }
                        }
                    ]
                },
                expectedOutput: {
                    captured: true,
                    event_count: 3
                }
            },
            {
                name: "batch_with_uuids",
                description: "Capture batch events with UUIDs for deduplication",
                input: {
                    events: [
                        {
                            event: "purchase_completed",
                            distinct_id: "user_buyer_001",
                            properties: {
                                order_id: "ORD-2024-001",
                                total: 99.99,
                                currency: "USD"
                            },
                            uuid: "550e8400-e29b-41d4-a716-446655440001"
                        },
                        {
                            event: "purchase_completed",
                            distinct_id: "user_buyer_002",
                            properties: {
                                order_id: "ORD-2024-002",
                                total: 149.99,
                                currency: "USD"
                            },
                            uuid: "550e8400-e29b-41d4-a716-446655440002"
                        }
                    ]
                },
                expectedOutput: {
                    captured: true,
                    event_count: 2
                }
            }
        ],
        errorCases: [
            {
                name: "batch_too_large",
                description: "Batch exceeds maximum size",
                input: {
                    events: [
                        {
                            event: "test_event",
                            distinct_id: "user_1"
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "Batch size exceeds maximum of 1000 events",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for batch",
                input: {
                    events: [
                        {
                            event: "test_event",
                            distinct_id: "user_12345"
                        }
                    ]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "identifyGroup",
        provider: "posthog",
        validCases: [
            {
                name: "identify_company",
                description: "Identify a company group with properties",
                input: {
                    distinct_id: "user_admin_001",
                    group_type: "company",
                    group_key: "company_acme_inc",
                    properties: {
                        name: "Acme Inc",
                        industry: "Technology",
                        employee_count: 250,
                        plan: "enterprise",
                        created_at: "2020-01-15",
                        website: "https://acme-inc.com"
                    }
                },
                expectedOutput: {
                    identified: true,
                    group_type: "company",
                    group_key: "company_acme_inc",
                    property_count: 6
                }
            },
            {
                name: "identify_workspace",
                description: "Identify a workspace group",
                input: {
                    distinct_id: "user_owner_001",
                    group_type: "workspace",
                    group_key: "ws_engineering",
                    properties: {
                        name: "Engineering Workspace",
                        team_size: 15,
                        created_by: "user_owner_001",
                        features_enabled: ["workflows", "integrations", "analytics"]
                    }
                },
                expectedOutput: {
                    identified: true,
                    group_type: "workspace",
                    group_key: "ws_engineering",
                    property_count: 4
                }
            },
            {
                name: "identify_project",
                description: "Identify a project group with timestamp",
                input: {
                    distinct_id: "user_pm_001",
                    group_type: "project",
                    group_key: "proj_alpha_2024",
                    properties: {
                        name: "Project Alpha",
                        status: "active",
                        budget: 50000,
                        deadline: "2024-06-30"
                    },
                    timestamp: "2024-12-19T12:00:00Z"
                },
                expectedOutput: {
                    identified: true,
                    group_type: "project",
                    group_key: "proj_alpha_2024",
                    property_count: 4
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_group_type",
                description: "Invalid group type format",
                input: {
                    distinct_id: "user_12345",
                    group_type: "",
                    group_key: "test_group",
                    properties: {}
                },
                expectedError: {
                    type: "validation",
                    message: "group_type cannot be empty",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    distinct_id: "user_12345",
                    group_type: "company",
                    group_key: "test_company",
                    properties: { name: "Test" }
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "identifyUser",
        provider: "posthog",
        validCases: [
            {
                name: "identify_new_user",
                description: "Identify a new user with initial properties",
                input: {
                    distinct_id: "user_new_12345",
                    properties: {
                        email: "john.doe@example.com",
                        name: "John Doe",
                        plan: "free"
                    },
                    properties_set_once: {
                        signup_date: "2024-12-19",
                        signup_source: "google_ads",
                        initial_utm_campaign: "q4_launch"
                    }
                },
                expectedOutput: {
                    identified: true,
                    distinct_id: "user_new_12345",
                    property_count: 6
                }
            },
            {
                name: "update_existing_user",
                description: "Update properties for an existing user",
                input: {
                    distinct_id: "user_existing_67890",
                    properties: {
                        email: "jane.smith@example.com",
                        name: "Jane Smith",
                        plan: "pro",
                        company: "Tech Corp",
                        role: "Engineering Manager",
                        last_active: "2024-12-19T16:00:00Z"
                    }
                },
                expectedOutput: {
                    identified: true,
                    distinct_id: "user_existing_67890",
                    property_count: 6
                }
            },
            {
                name: "identify_with_timestamp",
                description: "Identify user with specific timestamp",
                input: {
                    distinct_id: "user_historical_001",
                    properties: {
                        email: "historical@example.com",
                        name: "Historical User"
                    },
                    properties_set_once: {
                        first_seen: "2023-01-01"
                    },
                    timestamp: "2023-01-01T00:00:00Z"
                },
                expectedOutput: {
                    identified: true,
                    distinct_id: "user_historical_001",
                    property_count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "empty_distinct_id",
                description: "Empty distinct_id provided",
                input: {
                    distinct_id: "",
                    properties: {
                        email: "test@example.com"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "distinct_id cannot be empty",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    distinct_id: "user_12345",
                    properties: {
                        email: "test@example.com"
                    }
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    }
];
