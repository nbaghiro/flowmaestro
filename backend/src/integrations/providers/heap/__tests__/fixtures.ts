/**
 * Heap Provider Test Fixtures
 *
 * Heap is a digital insights platform for tracking user behavior and analytics.
 * These fixtures cover tracking events, setting user properties, and setting account properties.
 */

import type { TestFixture } from "../../../sandbox";

export const heapFixtures: TestFixture[] = [
    {
        operationId: "trackEvent",
        provider: "heap",
        validCases: [
            {
                name: "track_button_click_event",
                description: "Track a button click event with properties",
                input: {
                    identity: "user_abc123",
                    event: "Button Clicked",
                    properties: {
                        button_name: "signup_cta",
                        page: "/pricing",
                        variant: "A"
                    }
                },
                expectedOutput: {
                    tracked: true,
                    event: "Button Clicked",
                    identity: "user_abc123"
                }
            },
            {
                name: "track_purchase_completed_event",
                description: "Track a purchase event with order details",
                input: {
                    identity: "user_def456",
                    event: "Purchase Completed",
                    properties: {
                        order_id: "ord_98765",
                        total_amount: 149.99,
                        currency: "USD",
                        item_count: 3,
                        payment_method: "credit_card",
                        is_first_purchase: true
                    },
                    timestamp: 1706745600,
                    idempotency_key: "purchase_ord_98765_v1"
                },
                expectedOutput: {
                    tracked: true,
                    event: "Purchase Completed",
                    identity: "user_def456"
                }
            },
            {
                name: "track_feature_usage_event",
                description: "Track feature usage in a SaaS application",
                input: {
                    identity: "user_ghi789",
                    event: "Feature Used",
                    properties: {
                        feature_name: "bulk_export",
                        feature_category: "data_management",
                        records_exported: 1500,
                        export_format: "csv",
                        duration_seconds: 45
                    }
                },
                expectedOutput: {
                    tracked: true,
                    event: "Feature Used",
                    identity: "user_ghi789"
                }
            },
            {
                name: "track_signup_completed_event",
                description: "Track user signup completion",
                input: {
                    identity: "user_jkl012",
                    event: "Signup Completed",
                    properties: {
                        signup_method: "google_oauth",
                        referral_source: "organic_search",
                        landing_page: "/features",
                        utm_campaign: "spring_2024",
                        utm_medium: "cpc"
                    },
                    timestamp: 1706832000
                },
                expectedOutput: {
                    tracked: true,
                    event: "Signup Completed",
                    identity: "user_jkl012"
                }
            },
            {
                name: "track_minimal_event",
                description: "Track a simple event with only required fields",
                input: {
                    identity: "user_mno345",
                    event: "Dashboard Viewed"
                },
                expectedOutput: {
                    tracked: true,
                    event: "Dashboard Viewed",
                    identity: "user_mno345"
                }
            },
            {
                name: "track_subscription_event",
                description: "Track subscription upgrade event",
                input: {
                    identity: "user_pqr678",
                    event: "Subscription Upgraded",
                    properties: {
                        previous_plan: "starter",
                        new_plan: "professional",
                        monthly_value: 79,
                        annual_value: 948,
                        upgrade_reason: "team_growth",
                        seats_added: 5
                    },
                    idempotency_key: "sub_upgrade_pqr678_1706918400"
                },
                expectedOutput: {
                    tracked: true,
                    event: "Subscription Upgraded",
                    identity: "user_pqr678"
                }
            },
            {
                name: "track_onboarding_step_event",
                description: "Track user onboarding progress",
                input: {
                    identity: "user_stu901",
                    event: "Onboarding Step Completed",
                    properties: {
                        step_number: 3,
                        step_name: "invite_team_members",
                        total_steps: 5,
                        time_to_complete_seconds: 120,
                        skipped: false
                    }
                },
                expectedOutput: {
                    tracked: true,
                    event: "Onboarding Step Completed",
                    identity: "user_stu901"
                }
            },
            {
                name: "track_search_performed_event",
                description: "Track search activity with results",
                input: {
                    identity: "user_vwx234",
                    event: "Search Performed",
                    properties: {
                        search_query: "integration docs",
                        results_count: 24,
                        filters_applied: true,
                        search_category: "documentation",
                        page_number: 1
                    }
                },
                expectedOutput: {
                    tracked: true,
                    event: "Search Performed",
                    identity: "user_vwx234"
                }
            }
        ],
        errorCases: [
            {
                name: "reserved_event_name",
                description: "Cannot use reserved Heap event names",
                input: {
                    identity: "user_abc123",
                    event: "click"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Event name cannot be a reserved Heap event (click, change, pageview, submit)",
                    retryable: false
                }
            },
            {
                name: "empty_identity",
                description: "User identity cannot be empty",
                input: {
                    identity: "",
                    event: "Test Event"
                },
                expectedError: {
                    type: "validation",
                    message: "Identity is required",
                    retryable: false
                }
            },
            {
                name: "event_name_too_long",
                description: "Event name exceeds 255 character limit",
                input: {
                    identity: "user_abc123",
                    event: "A".repeat(256)
                },
                expectedError: {
                    type: "validation",
                    message: "Event name must be 255 characters or less",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for track API",
                input: {
                    identity: "user_abc123",
                    event: "Button Clicked"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "invalid_api_key",
                description: "Invalid or expired API key",
                input: {
                    identity: "user_abc123",
                    event: "Button Clicked"
                },
                expectedError: {
                    type: "permission",
                    message: "Invalid API key",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "setUserProperties",
        provider: "heap",
        validCases: [
            {
                name: "set_basic_user_profile",
                description: "Set basic user profile properties",
                input: {
                    identity: "user_abc123",
                    properties: {
                        email: "john.doe@example.com",
                        name: "John Doe",
                        company: "Acme Corp"
                    }
                },
                expectedOutput: {
                    updated: true,
                    identity: "user_abc123",
                    propertyCount: 3
                }
            },
            {
                name: "set_saas_user_properties",
                description: "Set SaaS-specific user properties",
                input: {
                    identity: "user_def456",
                    properties: {
                        plan_type: "enterprise",
                        subscription_status: "active",
                        mrr: 299,
                        seats_used: 12,
                        trial_converted: true,
                        signup_date: "2024-01-15",
                        last_active_date: "2024-02-01"
                    }
                },
                expectedOutput: {
                    updated: true,
                    identity: "user_def456",
                    propertyCount: 7
                }
            },
            {
                name: "set_user_engagement_properties",
                description: "Set user engagement and activity properties",
                input: {
                    identity: "user_ghi789",
                    properties: {
                        total_logins: 156,
                        features_used_count: 8,
                        avg_session_duration_minutes: 23,
                        nps_score: 9,
                        is_power_user: true,
                        preferred_language: "en-US"
                    }
                },
                expectedOutput: {
                    updated: true,
                    identity: "user_ghi789",
                    propertyCount: 6
                }
            },
            {
                name: "set_user_role_properties",
                description: "Set user role and permission properties",
                input: {
                    identity: "user_jkl012",
                    properties: {
                        role: "admin",
                        department: "Engineering",
                        is_billing_admin: true,
                        can_invite_users: true,
                        access_level: 5
                    }
                },
                expectedOutput: {
                    updated: true,
                    identity: "user_jkl012",
                    propertyCount: 5
                }
            },
            {
                name: "set_user_attribution_properties",
                description: "Set marketing attribution properties",
                input: {
                    identity: "user_mno345",
                    properties: {
                        utm_source: "google",
                        utm_medium: "cpc",
                        utm_campaign: "brand_awareness_q1",
                        referrer_domain: "google.com",
                        first_touch_channel: "paid_search",
                        acquisition_date: "2024-01-20"
                    }
                },
                expectedOutput: {
                    updated: true,
                    identity: "user_mno345",
                    propertyCount: 6
                }
            },
            {
                name: "set_ecommerce_user_properties",
                description: "Set e-commerce customer properties",
                input: {
                    identity: "user_pqr678",
                    properties: {
                        customer_type: "returning",
                        lifetime_value: 1249.5,
                        total_orders: 8,
                        average_order_value: 156.19,
                        favorite_category: "electronics",
                        has_wishlist: true,
                        loyalty_tier: "gold"
                    }
                },
                expectedOutput: {
                    updated: true,
                    identity: "user_pqr678",
                    propertyCount: 7
                }
            },
            {
                name: "set_single_property",
                description: "Update a single user property",
                input: {
                    identity: "user_stu901",
                    properties: {
                        last_login_date: "2024-02-01"
                    }
                },
                expectedOutput: {
                    updated: true,
                    identity: "user_stu901",
                    propertyCount: 1
                }
            }
        ],
        errorCases: [
            {
                name: "empty_identity",
                description: "User identity cannot be empty",
                input: {
                    identity: "",
                    properties: {
                        name: "Test User"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "Identity is required",
                    retryable: false
                }
            },
            {
                name: "empty_properties",
                description: "Properties object cannot be empty",
                input: {
                    identity: "user_abc123",
                    properties: {}
                },
                expectedError: {
                    type: "validation",
                    message: "At least one property is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for user properties API",
                input: {
                    identity: "user_abc123",
                    properties: {
                        name: "John Doe"
                    }
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "server_error",
                description: "Heap server error",
                input: {
                    identity: "user_abc123",
                    properties: {
                        name: "John Doe"
                    }
                },
                expectedError: {
                    type: "server_error",
                    message: "Internal server error",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "setAccountProperties",
        provider: "heap",
        validCases: [
            {
                name: "set_basic_account_properties",
                description: "Set basic B2B account properties",
                input: {
                    account_id: "acct_acme_corp",
                    properties: {
                        company_name: "Acme Corporation",
                        industry: "Technology",
                        company_size: "500-1000"
                    }
                },
                expectedOutput: {
                    updated: true,
                    account_id: "acct_acme_corp",
                    propertyCount: 3
                }
            },
            {
                name: "set_saas_account_properties",
                description: "Set SaaS subscription and usage properties for an account",
                input: {
                    account_id: "acct_tech_startup",
                    properties: {
                        plan: "enterprise",
                        mrr: 2499,
                        arr: 29988,
                        seats_purchased: 50,
                        seats_active: 42,
                        contract_start_date: "2023-06-01",
                        contract_end_date: "2024-05-31",
                        is_annual_contract: true
                    }
                },
                expectedOutput: {
                    updated: true,
                    account_id: "acct_tech_startup",
                    propertyCount: 8
                }
            },
            {
                name: "set_account_health_properties",
                description: "Set customer health and engagement metrics",
                input: {
                    account_id: "acct_global_retail",
                    properties: {
                        health_score: 85,
                        nps_score: 8,
                        active_users_30d: 127,
                        feature_adoption_rate: 0.72,
                        support_tickets_open: 2,
                        last_csm_touchpoint: "2024-01-28",
                        churn_risk: "low"
                    }
                },
                expectedOutput: {
                    updated: true,
                    account_id: "acct_global_retail",
                    propertyCount: 7
                }
            },
            {
                name: "set_account_firmographic_properties",
                description: "Set firmographic data for an account",
                input: {
                    account_id: "acct_enterprise_co",
                    properties: {
                        company_name: "Enterprise Co",
                        industry: "Financial Services",
                        sub_industry: "Banking",
                        employee_count: 5000,
                        annual_revenue: 500000000,
                        headquarters_country: "United States",
                        headquarters_city: "New York",
                        founded_year: 1985,
                        is_public_company: true
                    }
                },
                expectedOutput: {
                    updated: true,
                    account_id: "acct_enterprise_co",
                    propertyCount: 9
                }
            },
            {
                name: "set_account_usage_properties",
                description: "Set product usage metrics for an account",
                input: {
                    account_id: "acct_growth_co",
                    properties: {
                        total_api_calls_30d: 1250000,
                        storage_used_gb: 45.7,
                        integrations_enabled: 8,
                        workflows_created: 156,
                        automations_active: 42,
                        data_exports_30d: 23
                    }
                },
                expectedOutput: {
                    updated: true,
                    account_id: "acct_growth_co",
                    propertyCount: 6
                }
            },
            {
                name: "set_account_sales_properties",
                description: "Set sales and expansion properties",
                input: {
                    account_id: "acct_expansion_target",
                    properties: {
                        account_owner: "sarah.johnson@company.com",
                        sales_region: "EMEA",
                        account_tier: "strategic",
                        expansion_opportunity: true,
                        upsell_potential_arr: 50000,
                        last_renewal_date: "2024-01-01",
                        next_renewal_date: "2025-01-01"
                    }
                },
                expectedOutput: {
                    updated: true,
                    account_id: "acct_expansion_target",
                    propertyCount: 7
                }
            },
            {
                name: "set_single_account_property",
                description: "Update a single account property",
                input: {
                    account_id: "acct_quick_update",
                    properties: {
                        renewal_status: "confirmed"
                    }
                },
                expectedOutput: {
                    updated: true,
                    account_id: "acct_quick_update",
                    propertyCount: 1
                }
            },
            {
                name: "set_account_onboarding_properties",
                description: "Track account onboarding progress",
                input: {
                    account_id: "acct_new_customer",
                    properties: {
                        onboarding_status: "in_progress",
                        onboarding_step: 3,
                        onboarding_total_steps: 7,
                        kickoff_call_completed: true,
                        data_migration_status: "pending",
                        go_live_target_date: "2024-03-01",
                        implementation_manager: "mike.chen@company.com"
                    }
                },
                expectedOutput: {
                    updated: true,
                    account_id: "acct_new_customer",
                    propertyCount: 7
                }
            }
        ],
        errorCases: [
            {
                name: "empty_account_id",
                description: "Account ID cannot be empty",
                input: {
                    account_id: "",
                    properties: {
                        company_name: "Test Company"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "Account ID is required",
                    retryable: false
                }
            },
            {
                name: "empty_properties",
                description: "Properties object cannot be empty",
                input: {
                    account_id: "acct_test",
                    properties: {}
                },
                expectedError: {
                    type: "validation",
                    message: "At least one property is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for account properties API",
                input: {
                    account_id: "acct_test",
                    properties: {
                        company_name: "Test Company"
                    }
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "server_error",
                description: "Heap server error",
                input: {
                    account_id: "acct_test",
                    properties: {
                        company_name: "Test Company"
                    }
                },
                expectedError: {
                    type: "server_error",
                    message: "Internal server error",
                    retryable: true
                }
            },
            {
                name: "invalid_api_key",
                description: "Invalid or expired API key",
                input: {
                    account_id: "acct_test",
                    properties: {
                        company_name: "Test Company"
                    }
                },
                expectedError: {
                    type: "permission",
                    message: "Invalid API key",
                    retryable: false
                }
            }
        ]
    }
];
