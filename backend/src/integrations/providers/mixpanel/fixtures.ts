/**
 * Mixpanel Provider Test Fixtures
 */

import type { TestFixture } from "../../sandbox";

export const mixpanelFixtures: TestFixture[] = [
    {
        operationId: "trackEvent",
        provider: "mixpanel",
        validCases: [
            {
                name: "track_page_view",
                description: "Track a page view event with distinct_id",
                input: {
                    event: "Page Viewed",
                    distinct_id: "user_8f4d2e91-3c7a-4b12-9e5f",
                    properties: {
                        page_name: "Pricing",
                        page_url: "/pricing",
                        referrer: "https://google.com",
                        utm_source: "google",
                        utm_medium: "cpc",
                        utm_campaign: "brand_2024"
                    },
                    time: 1706745600,
                    insert_id: "evt_a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                },
                expectedOutput: {
                    tracked: true,
                    event: "Page Viewed"
                }
            },
            {
                name: "track_signup_completed",
                description: "Track signup completion with user properties",
                input: {
                    event: "Signup Completed",
                    distinct_id: "user_new_signup_12345",
                    properties: {
                        signup_method: "email",
                        plan_selected: "free",
                        referral_code: "FRIEND2024",
                        browser: "Chrome",
                        os: "macOS",
                        device_type: "desktop"
                    },
                    time: 1706832000
                },
                expectedOutput: {
                    tracked: true,
                    event: "Signup Completed"
                }
            },
            {
                name: "track_purchase_event",
                description: "Track e-commerce purchase event",
                input: {
                    event: "Purchase Completed",
                    distinct_id: "user_e7c3a91d-8b2f-4e16",
                    properties: {
                        product_id: "prod_abc123",
                        product_name: "Pro Subscription",
                        price: 29.99,
                        currency: "USD",
                        payment_method: "credit_card",
                        discount_applied: true,
                        coupon_code: "SAVE20",
                        original_price: 39.99
                    },
                    time: 1706918400,
                    insert_id: "purchase_d4e5f6a7-b8c9-0123-def4"
                },
                expectedOutput: {
                    tracked: true,
                    event: "Purchase Completed"
                }
            },
            {
                name: "track_feature_used",
                description: "Track feature usage event",
                input: {
                    event: "Feature Used",
                    distinct_id: "user_feature_test_789",
                    properties: {
                        feature_name: "Export Report",
                        feature_category: "Analytics",
                        export_format: "csv",
                        row_count: 1500,
                        processing_time_ms: 2340
                    }
                },
                expectedOutput: {
                    tracked: true,
                    event: "Feature Used"
                }
            },
            {
                name: "track_anonymous_event",
                description: "Track event without distinct_id for anonymous user",
                input: {
                    event: "Landing Page Visited",
                    properties: {
                        landing_variant: "A",
                        campaign_id: "summer_promo_2024",
                        country: "US",
                        language: "en"
                    },
                    insert_id: "anon_visit_1234567890"
                },
                expectedOutput: {
                    tracked: true,
                    event: "Landing Page Visited"
                }
            }
        ],
        errorCases: [
            {
                name: "empty_event_name",
                description: "Event name cannot be empty",
                input: {
                    event: "",
                    distinct_id: "user_123",
                    properties: {}
                },
                expectedError: {
                    type: "validation",
                    message: "Event name is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when tracking event",
                input: {
                    event: "Test Event",
                    distinct_id: "user_rate_limited",
                    properties: {}
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "invalid_token",
                description: "Invalid project token",
                input: {
                    event: "Test Event",
                    distinct_id: "user_invalid_token",
                    properties: {}
                },
                expectedError: {
                    type: "permission",
                    message: "Invalid project token",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "importEvents",
        provider: "mixpanel",
        validCases: [
            {
                name: "import_historical_events",
                description: "Import multiple historical events in batch",
                input: {
                    events: [
                        {
                            event: "User Onboarded",
                            distinct_id: "user_hist_001",
                            time: 1704067200,
                            insert_id: "hist_onboard_001",
                            properties: {
                                onboarding_source: "web",
                                completed_steps: 5,
                                time_to_complete_seconds: 180
                            }
                        },
                        {
                            event: "First Action Taken",
                            distinct_id: "user_hist_001",
                            time: 1704153600,
                            insert_id: "hist_action_001",
                            properties: {
                                action_type: "create_project",
                                project_name: "My First Project"
                            }
                        },
                        {
                            event: "Subscription Started",
                            distinct_id: "user_hist_001",
                            time: 1704240000,
                            insert_id: "hist_sub_001",
                            properties: {
                                plan: "starter",
                                billing_cycle: "monthly",
                                mrr: 19.99
                            }
                        }
                    ]
                },
                expectedOutput: {
                    imported: true,
                    num_records_imported: 3,
                    status: "OK"
                }
            },
            {
                name: "import_analytics_backfill",
                description: "Import analytics events for data backfill",
                input: {
                    events: [
                        {
                            event: "Session Started",
                            distinct_id: "user_backfill_100",
                            time: 1701388800,
                            properties: {
                                session_id: "sess_abc123",
                                platform: "ios",
                                app_version: "2.3.1",
                                device_model: "iPhone 14"
                            }
                        },
                        {
                            event: "Content Viewed",
                            distinct_id: "user_backfill_100",
                            time: 1701392400,
                            properties: {
                                content_id: "article_789",
                                content_type: "blog_post",
                                read_time_seconds: 240,
                                scroll_depth_percent: 85
                            }
                        }
                    ]
                },
                expectedOutput: {
                    imported: true,
                    num_records_imported: 2,
                    status: "OK"
                }
            },
            {
                name: "import_conversion_funnel_events",
                description: "Import events for conversion funnel analysis",
                input: {
                    events: [
                        {
                            event: "Trial Started",
                            distinct_id: "user_funnel_xyz",
                            time: 1705536000,
                            insert_id: "trial_start_xyz",
                            properties: {
                                trial_duration_days: 14,
                                source: "product_hunt",
                                industry: "saas"
                            }
                        },
                        {
                            event: "Feature Activated",
                            distinct_id: "user_funnel_xyz",
                            time: 1705622400,
                            insert_id: "feature_act_xyz",
                            properties: {
                                feature: "integrations",
                                activation_day: 2
                            }
                        },
                        {
                            event: "Aha Moment Reached",
                            distinct_id: "user_funnel_xyz",
                            time: 1705708800,
                            insert_id: "aha_moment_xyz",
                            properties: {
                                milestone: "first_workflow_created",
                                days_since_signup: 3
                            }
                        },
                        {
                            event: "Trial Converted",
                            distinct_id: "user_funnel_xyz",
                            time: 1706313600,
                            insert_id: "trial_conv_xyz",
                            properties: {
                                converted_plan: "pro",
                                trial_day_converted: 9,
                                discount_used: false
                            }
                        }
                    ]
                },
                expectedOutput: {
                    imported: true,
                    num_records_imported: 4,
                    status: "OK"
                }
            }
        ],
        errorCases: [
            {
                name: "empty_events_array",
                description: "Events array cannot be empty",
                input: {
                    events: []
                },
                expectedError: {
                    type: "validation",
                    message: "Events array cannot be empty",
                    retryable: false
                }
            },
            {
                name: "missing_distinct_id",
                description: "distinct_id is required for import",
                input: {
                    events: [
                        {
                            event: "Test Event",
                            distinct_id: "",
                            time: 1706745600
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "distinct_id is required for import events",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded during batch import",
                input: {
                    events: [
                        {
                            event: "Rate Limited Event",
                            distinct_id: "user_rate_limit",
                            time: 1706745600
                        }
                    ]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "too_many_events",
                description: "Exceeds maximum batch size of 2000",
                input: {
                    events: Array(2001)
                        .fill(null)
                        .map((_, i) => ({
                            event: "Bulk Event",
                            distinct_id: `user_bulk_${i}`,
                            time: 1706745600 + i
                        }))
                },
                expectedError: {
                    type: "validation",
                    message: "Maximum of 2000 events allowed per batch",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "setUserProfile",
        provider: "mixpanel",
        validCases: [
            {
                name: "set_basic_user_profile",
                description: "Create or update basic user profile properties",
                input: {
                    distinct_id: "user_profile_abc123",
                    operations: {
                        $set: {
                            $name: "Sarah Johnson",
                            $email: "sarah.johnson@example.com",
                            $phone: "+1-555-0123",
                            $city: "San Francisco",
                            $region: "California",
                            $country_code: "US",
                            company: "Acme Corp",
                            title: "Product Manager",
                            department: "Product"
                        }
                    }
                },
                expectedOutput: {
                    updated: true,
                    distinct_id: "user_profile_abc123"
                }
            },
            {
                name: "set_user_profile_with_set_once",
                description: "Set properties only if not already set",
                input: {
                    distinct_id: "user_profile_def456",
                    operations: {
                        $set: {
                            last_login: "2024-02-01T10:30:00Z",
                            login_count: 15
                        },
                        $set_once: {
                            $created: "2023-06-15T09:00:00Z",
                            first_utm_source: "google",
                            first_utm_campaign: "brand_awareness",
                            signup_source: "organic"
                        }
                    }
                },
                expectedOutput: {
                    updated: true,
                    distinct_id: "user_profile_def456"
                }
            },
            {
                name: "increment_numeric_properties",
                description: "Increment numeric properties on user profile",
                input: {
                    distinct_id: "user_profile_ghi789",
                    operations: {
                        $add: {
                            login_count: 1,
                            feature_uses: 5,
                            total_purchases: 1,
                            lifetime_value: 49.99
                        }
                    }
                },
                expectedOutput: {
                    updated: true,
                    distinct_id: "user_profile_ghi789"
                }
            },
            {
                name: "append_to_list_properties",
                description: "Append values to list properties",
                input: {
                    distinct_id: "user_profile_jkl012",
                    operations: {
                        $append: {
                            viewed_products: "prod_xyz789",
                            search_queries: "analytics dashboard",
                            visited_pages: "/features/reporting"
                        }
                    }
                },
                expectedOutput: {
                    updated: true,
                    distinct_id: "user_profile_jkl012"
                }
            },
            {
                name: "union_list_properties",
                description: "Union values with list properties (no duplicates)",
                input: {
                    distinct_id: "user_profile_mno345",
                    operations: {
                        $union: {
                            interests: ["analytics", "automation", "ai"],
                            enabled_features: ["export", "api_access", "sso"],
                            completed_onboarding_steps: ["profile", "integrations", "invite_team"]
                        }
                    }
                },
                expectedOutput: {
                    updated: true,
                    distinct_id: "user_profile_mno345"
                }
            },
            {
                name: "remove_and_unset_properties",
                description: "Remove values from lists and unset properties",
                input: {
                    distinct_id: "user_profile_pqr678",
                    operations: {
                        $remove: {
                            tags: "trial_user"
                        },
                        $unset: ["temporary_flag", "legacy_field", "deprecated_setting"]
                    }
                },
                expectedOutput: {
                    updated: true,
                    distinct_id: "user_profile_pqr678"
                }
            },
            {
                name: "set_user_profile_with_ip",
                description: "Set user profile with IP for geo-location",
                input: {
                    distinct_id: "user_profile_geo123",
                    operations: {
                        $set: {
                            last_active: "2024-02-01T15:45:00Z"
                        }
                    },
                    ip: "203.0.113.45"
                },
                expectedOutput: {
                    updated: true,
                    distinct_id: "user_profile_geo123"
                }
            },
            {
                name: "set_user_profile_ignore_time",
                description: "Set user profile without updating last_seen",
                input: {
                    distinct_id: "user_profile_hist123",
                    operations: {
                        $set: {
                            historical_import: true,
                            original_signup_date: "2022-03-15"
                        }
                    },
                    ignore_time: true
                },
                expectedOutput: {
                    updated: true,
                    distinct_id: "user_profile_hist123"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_distinct_id",
                description: "distinct_id is required",
                input: {
                    distinct_id: "",
                    operations: {
                        $set: { name: "Test" }
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "distinct_id is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when updating profile",
                input: {
                    distinct_id: "user_rate_limited",
                    operations: {
                        $set: { test: true }
                    }
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "invalid_add_value",
                description: "$add requires numeric values",
                input: {
                    distinct_id: "user_invalid_add",
                    operations: {
                        $add: {
                            count: "not_a_number"
                        }
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "$add values must be numeric",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "setGroupProfile",
        provider: "mixpanel",
        validCases: [
            {
                name: "set_company_profile",
                description: "Create or update company group profile",
                input: {
                    group_key: "company",
                    group_id: "acme_corp_12345",
                    operations: {
                        $set: {
                            name: "Acme Corporation",
                            industry: "Technology",
                            employee_count: 250,
                            founded_year: 2015,
                            headquarters: "San Francisco, CA",
                            website: "https://acme-corp.example.com",
                            plan: "enterprise",
                            mrr: 2500.0,
                            account_manager: "John Smith"
                        }
                    }
                },
                expectedOutput: {
                    updated: true,
                    group_key: "company",
                    group_id: "acme_corp_12345"
                }
            },
            {
                name: "set_team_profile",
                description: "Create or update team group profile",
                input: {
                    group_key: "team",
                    group_id: "team_engineering_alpha",
                    operations: {
                        $set: {
                            team_name: "Engineering Alpha",
                            team_lead: "Alice Chen",
                            member_count: 8,
                            department: "Engineering",
                            focus_area: "Backend Infrastructure",
                            created_date: "2023-08-01"
                        }
                    }
                },
                expectedOutput: {
                    updated: true,
                    group_key: "team",
                    group_id: "team_engineering_alpha"
                }
            },
            {
                name: "set_workspace_profile",
                description: "Create or update workspace group profile",
                input: {
                    group_key: "workspace",
                    group_id: "ws_production_main",
                    operations: {
                        $set: {
                            workspace_name: "Production Main",
                            environment: "production",
                            region: "us-west-2",
                            active_users: 45,
                            total_workflows: 120,
                            last_deployment: "2024-01-30T08:00:00Z"
                        }
                    }
                },
                expectedOutput: {
                    updated: true,
                    group_key: "workspace",
                    group_id: "ws_production_main"
                }
            },
            {
                name: "set_group_profile_set_once",
                description: "Set group properties only if not already set",
                input: {
                    group_key: "company",
                    group_id: "startup_xyz",
                    operations: {
                        $set: {
                            last_activity: "2024-02-01",
                            health_score: 85
                        },
                        $set_once: {
                            first_contract_date: "2023-11-15",
                            original_plan: "starter",
                            sales_rep: "Jane Doe",
                            lead_source: "product_hunt"
                        }
                    }
                },
                expectedOutput: {
                    updated: true,
                    group_key: "company",
                    group_id: "startup_xyz"
                }
            },
            {
                name: "unset_group_properties",
                description: "Remove properties from group profile",
                input: {
                    group_key: "company",
                    group_id: "legacy_account_001",
                    operations: {
                        $unset: ["legacy_field", "deprecated_metric", "old_integration_id"]
                    }
                },
                expectedOutput: {
                    updated: true,
                    group_key: "company",
                    group_id: "legacy_account_001"
                }
            },
            {
                name: "set_project_profile",
                description: "Create or update project group profile",
                input: {
                    group_key: "project",
                    group_id: "proj_mobile_app_2024",
                    operations: {
                        $set: {
                            project_name: "Mobile App 2024",
                            status: "active",
                            owner_team: "mobile_team",
                            budget: 150000,
                            start_date: "2024-01-01",
                            target_launch: "2024-06-30",
                            priority: "high",
                            stakeholders: ["product", "engineering", "design"]
                        }
                    }
                },
                expectedOutput: {
                    updated: true,
                    group_key: "project",
                    group_id: "proj_mobile_app_2024"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_group_key",
                description: "group_key is required",
                input: {
                    group_key: "",
                    group_id: "test_group",
                    operations: {
                        $set: { name: "Test" }
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "group_key is required",
                    retryable: false
                }
            },
            {
                name: "missing_group_id",
                description: "group_id is required",
                input: {
                    group_key: "company",
                    group_id: "",
                    operations: {
                        $set: { name: "Test" }
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "group_id is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when updating group profile",
                input: {
                    group_key: "company",
                    group_id: "rate_limited_company",
                    operations: {
                        $set: { test: true }
                    }
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "invalid_group_key_format",
                description: "Invalid group key format",
                input: {
                    group_key: "invalid key with spaces",
                    group_id: "test_group",
                    operations: {
                        $set: { name: "Test" }
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid group key format",
                    retryable: false
                }
            }
        ]
    }
];
