/**
 * Segment Provider Test Fixtures
 *
 * Comprehensive test fixtures for Segment Customer Data Platform (CDP) operations
 * including tracking events, identifying users, page/screen views, grouping,
 * aliasing, and batch operations.
 */

import type { TestFixture } from "../../sandbox";

export const segmentFixtures: TestFixture[] = [
    {
        operationId: "aliasUser",
        provider: "segment",
        validCases: [
            {
                name: "alias_anonymous_to_user",
                description: "Link an anonymous visitor to a known user after signup",
                input: {
                    userId: "usr_847291",
                    previousId: "anon_f4a3b2c1-8d7e-4a5b-9c6d-1e2f3a4b5c6d",
                    context: {
                        ip: "192.168.1.100",
                        userAgent:
                            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                        locale: "en-US",
                        timezone: "America/New_York",
                        page: {
                            path: "/signup/complete",
                            referrer: "https://www.google.com/",
                            title: "Welcome - Account Created",
                            url: "https://app.example.com/signup/complete"
                        }
                    },
                    timestamp: "2025-03-15T14:32:18.000Z",
                    messageId: "msg_alias_001"
                },
                expectedOutput: {
                    success: true,
                    userId: "usr_847291",
                    anonymousId: undefined,
                    previousId: "anon_f4a3b2c1-8d7e-4a5b-9c6d-1e2f3a4b5c6d"
                }
            },
            {
                name: "alias_old_user_id_to_new",
                description: "Merge old user ID with new user ID after account migration",
                input: {
                    userId: "new_usr_12345",
                    previousId: "legacy_user_98765",
                    context: {
                        app: {
                            name: "MyApp",
                            version: "3.2.1",
                            build: "1847"
                        }
                    },
                    integrations: {
                        Mixpanel: true,
                        Amplitude: true,
                        "Google Analytics": false
                    }
                },
                expectedOutput: {
                    success: true,
                    userId: "new_usr_12345",
                    anonymousId: undefined,
                    previousId: "legacy_user_98765"
                }
            },
            {
                name: "alias_with_anonymous_id",
                description: "Alias using anonymousId instead of userId",
                input: {
                    anonymousId: "anon_current_session",
                    previousId: "anon_previous_device"
                },
                expectedOutput: {
                    success: true,
                    userId: undefined,
                    anonymousId: "anon_current_session",
                    previousId: "anon_previous_device"
                }
            },
            {
                name: "alias_with_full_context",
                description: "Alias with comprehensive device and location context",
                input: {
                    userId: "usr_premium_001",
                    previousId: "trial_user_xyz",
                    context: {
                        active: true,
                        device: {
                            id: "device_abc123",
                            manufacturer: "Apple",
                            model: "iPhone 15 Pro",
                            name: "John's iPhone",
                            type: "ios"
                        },
                        location: {
                            city: "San Francisco",
                            country: "United States",
                            latitude: 37.7749,
                            longitude: -122.4194,
                            region: "California"
                        },
                        network: {
                            wifi: true,
                            cellular: false,
                            carrier: "Verizon"
                        },
                        os: {
                            name: "iOS",
                            version: "17.4.1"
                        }
                    },
                    timestamp: "2025-03-20T10:15:00.000Z"
                },
                expectedOutput: {
                    success: true,
                    userId: "usr_premium_001",
                    anonymousId: undefined,
                    previousId: "trial_user_xyz"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_user_identifier",
                description: "Neither userId nor anonymousId provided",
                input: {
                    previousId: "old_user_123"
                },
                expectedError: {
                    type: "validation",
                    message: "Either userId or anonymousId is required",
                    retryable: false
                }
            },
            {
                name: "invalid_api_key",
                description: "Request with invalid write key",
                input: {
                    userId: "usr_test",
                    previousId: "old_id"
                },
                expectedError: {
                    type: "permission",
                    message: "Invalid write key",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    userId: "usr_rate_limit",
                    previousId: "old_rate_limit"
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
        operationId: "batchEvents",
        provider: "segment",
        validCases: [
            {
                name: "batch_mixed_events",
                description: "Send a batch of mixed event types (track, identify, page)",
                input: {
                    batch: [
                        {
                            type: "identify" as const,
                            userId: "usr_batch_001",
                            traits: {
                                email: "sarah.chen@techcorp.io",
                                name: "Sarah Chen",
                                plan: "enterprise",
                                company: "TechCorp Industries",
                                createdAt: "2025-01-15T08:30:00.000Z"
                            }
                        },
                        {
                            type: "track" as const,
                            userId: "usr_batch_001",
                            event: "Subscription Upgraded",
                            properties: {
                                previousPlan: "professional",
                                newPlan: "enterprise",
                                mrr: 499.0,
                                currency: "USD",
                                billingCycle: "annual"
                            }
                        },
                        {
                            type: "page" as const,
                            userId: "usr_batch_001",
                            name: "Dashboard",
                            category: "App",
                            properties: {
                                title: "Analytics Dashboard",
                                path: "/dashboard",
                                url: "https://app.techcorp.io/dashboard"
                            }
                        }
                    ]
                },
                expectedOutput: {
                    success: true,
                    eventsCount: 3,
                    eventsByType: {
                        identify: 1,
                        track: 1,
                        page: 1
                    }
                }
            },
            {
                name: "batch_track_events_ecommerce",
                description: "Batch of ecommerce tracking events for a purchase flow",
                input: {
                    batch: [
                        {
                            type: "track" as const,
                            userId: "usr_shopper_42",
                            event: "Product Viewed",
                            properties: {
                                productId: "SKU-12345",
                                productName: "Wireless Headphones Pro",
                                category: "Electronics/Audio",
                                price: 199.99,
                                currency: "USD",
                                brand: "AudioMax"
                            },
                            timestamp: "2025-03-18T15:30:00.000Z"
                        },
                        {
                            type: "track" as const,
                            userId: "usr_shopper_42",
                            event: "Product Added",
                            properties: {
                                productId: "SKU-12345",
                                productName: "Wireless Headphones Pro",
                                quantity: 1,
                                price: 199.99,
                                cartId: "cart_abc123"
                            },
                            timestamp: "2025-03-18T15:31:15.000Z"
                        },
                        {
                            type: "track" as const,
                            userId: "usr_shopper_42",
                            event: "Checkout Started",
                            properties: {
                                cartId: "cart_abc123",
                                cartTotal: 199.99,
                                itemCount: 1,
                                currency: "USD"
                            },
                            timestamp: "2025-03-18T15:32:00.000Z"
                        },
                        {
                            type: "track" as const,
                            userId: "usr_shopper_42",
                            event: "Order Completed",
                            properties: {
                                orderId: "ORD-2025-78901",
                                revenue: 199.99,
                                tax: 16.5,
                                shipping: 0,
                                total: 216.49,
                                currency: "USD",
                                paymentMethod: "credit_card",
                                products: [
                                    {
                                        productId: "SKU-12345",
                                        name: "Wireless Headphones Pro",
                                        quantity: 1,
                                        price: 199.99
                                    }
                                ]
                            },
                            timestamp: "2025-03-18T15:35:00.000Z"
                        }
                    ],
                    context: {
                        campaign: {
                            name: "Spring Sale 2025",
                            source: "google",
                            medium: "cpc",
                            term: "wireless headphones"
                        }
                    }
                },
                expectedOutput: {
                    success: true,
                    eventsCount: 4,
                    eventsByType: {
                        track: 4
                    }
                }
            },
            {
                name: "batch_mobile_app_events",
                description: "Batch of mobile app screen views and interactions",
                input: {
                    batch: [
                        {
                            type: "screen" as const,
                            userId: "usr_mobile_123",
                            name: "Home Feed",
                            category: "Main",
                            properties: {
                                feedType: "personalized",
                                itemsLoaded: 20
                            }
                        },
                        {
                            type: "track" as const,
                            userId: "usr_mobile_123",
                            event: "Content Liked",
                            properties: {
                                contentId: "post_456",
                                contentType: "image",
                                authorId: "usr_creator_789"
                            }
                        },
                        {
                            type: "track" as const,
                            userId: "usr_mobile_123",
                            event: "Content Shared",
                            properties: {
                                contentId: "post_456",
                                shareMethod: "direct_message",
                                recipientCount: 3
                            }
                        },
                        {
                            type: "screen" as const,
                            userId: "usr_mobile_123",
                            name: "Profile",
                            category: "User",
                            properties: {
                                profileUserId: "usr_creator_789",
                                isOwnProfile: false
                            }
                        }
                    ],
                    context: {
                        app: {
                            name: "SocialApp",
                            version: "4.5.2",
                            build: "1234"
                        },
                        device: {
                            manufacturer: "Samsung",
                            model: "Galaxy S24",
                            type: "android"
                        },
                        os: {
                            name: "Android",
                            version: "14"
                        }
                    }
                },
                expectedOutput: {
                    success: true,
                    eventsCount: 4,
                    eventsByType: {
                        screen: 2,
                        track: 2
                    }
                }
            },
            {
                name: "batch_group_and_alias_events",
                description: "Batch containing group and alias events for B2B use case",
                input: {
                    batch: [
                        {
                            type: "identify" as const,
                            userId: "usr_employee_001",
                            traits: {
                                email: "alex.johnson@megacorp.com",
                                name: "Alex Johnson",
                                title: "Product Manager",
                                department: "Product"
                            }
                        },
                        {
                            type: "group" as const,
                            userId: "usr_employee_001",
                            groupId: "grp_megacorp_123",
                            traits: {
                                name: "MegaCorp Inc.",
                                industry: "Technology",
                                employees: 5000,
                                plan: "enterprise",
                                website: "https://megacorp.com",
                                createdAt: "2024-06-01T00:00:00.000Z"
                            }
                        },
                        {
                            type: "alias" as const,
                            userId: "usr_employee_001",
                            previousId: "sso_megacorp_alex.johnson"
                        },
                        {
                            type: "track" as const,
                            userId: "usr_employee_001",
                            event: "Workspace Joined",
                            properties: {
                                workspaceId: "ws_megacorp_main",
                                role: "admin",
                                invitedBy: "usr_employee_000"
                            }
                        }
                    ]
                },
                expectedOutput: {
                    success: true,
                    eventsCount: 4,
                    eventsByType: {
                        identify: 1,
                        group: 1,
                        alias: 1,
                        track: 1
                    }
                }
            },
            {
                name: "batch_with_integrations_control",
                description: "Batch with selective integration routing",
                input: {
                    batch: [
                        {
                            type: "track" as const,
                            userId: "usr_analytics_test",
                            event: "Feature Flag Evaluated",
                            properties: {
                                flagName: "new_checkout_flow",
                                flagValue: true,
                                source: "server"
                            }
                        }
                    ],
                    integrations: {
                        All: true,
                        Mixpanel: false,
                        "Google Analytics 4": {
                            enabled: true,
                            clientId: "GA4-12345"
                        }
                    }
                },
                expectedOutput: {
                    success: true,
                    eventsCount: 1,
                    eventsByType: {
                        track: 1
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "empty_batch",
                description: "Batch with no events",
                input: {
                    batch: []
                },
                expectedError: {
                    type: "validation",
                    message: "Batch must contain at least one event",
                    retryable: false
                }
            },
            {
                name: "batch_exceeds_limit",
                description: "Batch with more than 2500 events",
                input: {
                    batch: Array(2501).fill({
                        type: "track" as const,
                        userId: "usr_test",
                        event: "Test Event"
                    })
                },
                expectedError: {
                    type: "validation",
                    message: "Batch size 2501 exceeds maximum of 2500 events",
                    retryable: false
                }
            },
            {
                name: "invalid_event_type",
                description: "Batch containing event with invalid type",
                input: {
                    batch: [
                        {
                            type: "invalid_type" as never,
                            userId: "usr_test",
                            event: "Test"
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid event type",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for batch endpoint",
                input: {
                    batch: [
                        {
                            type: "track" as const,
                            userId: "usr_rate_limit",
                            event: "Test Event"
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
        operationId: "groupUser",
        provider: "segment",
        validCases: [
            {
                name: "group_user_with_company",
                description: "Associate a user with their company/organization",
                input: {
                    userId: "usr_b2b_001",
                    groupId: "company_acme_corp",
                    traits: {
                        name: "Acme Corporation",
                        industry: "Manufacturing",
                        employees: 2500,
                        plan: "enterprise",
                        website: "https://acmecorp.com",
                        address: {
                            street: "100 Industrial Way",
                            city: "Detroit",
                            state: "Michigan",
                            postalCode: "48201",
                            country: "United States"
                        },
                        createdAt: "2024-01-15T00:00:00.000Z",
                        monthlySpend: 15000,
                        contractEndDate: "2026-01-15T00:00:00.000Z"
                    },
                    timestamp: "2025-03-18T09:45:00.000Z"
                },
                expectedOutput: {
                    success: true,
                    groupId: "company_acme_corp",
                    userId: "usr_b2b_001",
                    anonymousId: undefined,
                    traits: {
                        name: "Acme Corporation",
                        industry: "Manufacturing",
                        employees: 2500,
                        plan: "enterprise",
                        website: "https://acmecorp.com",
                        address: {
                            street: "100 Industrial Way",
                            city: "Detroit",
                            state: "Michigan",
                            postalCode: "48201",
                            country: "United States"
                        },
                        createdAt: "2024-01-15T00:00:00.000Z",
                        monthlySpend: 15000,
                        contractEndDate: "2026-01-15T00:00:00.000Z"
                    }
                }
            },
            {
                name: "group_user_with_team",
                description: "Associate a user with a team within their organization",
                input: {
                    userId: "usr_team_member_42",
                    groupId: "team_engineering_frontend",
                    traits: {
                        name: "Frontend Engineering",
                        teamType: "engineering",
                        parentTeam: "team_engineering",
                        memberCount: 12,
                        lead: "usr_tech_lead_01",
                        projects: ["project_alpha", "project_beta"],
                        techStack: ["React", "TypeScript", "GraphQL"]
                    }
                },
                expectedOutput: {
                    success: true,
                    groupId: "team_engineering_frontend",
                    userId: "usr_team_member_42",
                    anonymousId: undefined,
                    traits: {
                        name: "Frontend Engineering",
                        teamType: "engineering",
                        parentTeam: "team_engineering",
                        memberCount: 12,
                        lead: "usr_tech_lead_01",
                        projects: ["project_alpha", "project_beta"],
                        techStack: ["React", "TypeScript", "GraphQL"]
                    }
                }
            },
            {
                name: "group_anonymous_user",
                description: "Associate an anonymous user with a group (pre-signup)",
                input: {
                    anonymousId: "anon_visitor_xyz789",
                    groupId: "company_visitor_domain_techstartup",
                    traits: {
                        domain: "techstartup.io",
                        inferredCompany: "Tech Startup Inc",
                        inferredIndustry: "Software",
                        inferredSize: "51-200"
                    },
                    context: {
                        ip: "203.0.113.42",
                        page: {
                            url: "https://app.example.com/pricing",
                            referrer: "https://techstartup.io"
                        }
                    }
                },
                expectedOutput: {
                    success: true,
                    groupId: "company_visitor_domain_techstartup",
                    userId: undefined,
                    anonymousId: "anon_visitor_xyz789",
                    traits: {
                        domain: "techstartup.io",
                        inferredCompany: "Tech Startup Inc",
                        inferredIndustry: "Software",
                        inferredSize: "51-200"
                    }
                }
            },
            {
                name: "group_user_workspace",
                description: "Associate user with a workspace/project",
                input: {
                    userId: "usr_pm_sarah",
                    groupId: "workspace_project_phoenix",
                    traits: {
                        name: "Project Phoenix",
                        workspaceType: "project",
                        status: "active",
                        visibility: "private",
                        memberCount: 8,
                        createdAt: "2025-02-01T00:00:00.000Z",
                        settings: {
                            slackIntegration: true,
                            githubIntegration: true,
                            weeklyDigest: true
                        }
                    },
                    integrations: {
                        Salesforce: true,
                        HubSpot: true
                    }
                },
                expectedOutput: {
                    success: true,
                    groupId: "workspace_project_phoenix",
                    userId: "usr_pm_sarah",
                    anonymousId: undefined,
                    traits: {
                        name: "Project Phoenix",
                        workspaceType: "project",
                        status: "active",
                        visibility: "private",
                        memberCount: 8,
                        createdAt: "2025-02-01T00:00:00.000Z",
                        settings: {
                            slackIntegration: true,
                            githubIntegration: true,
                            weeklyDigest: true
                        }
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "missing_group_id",
                description: "Group call without groupId",
                input: {
                    userId: "usr_test",
                    traits: {
                        name: "Test Group"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "groupId is required",
                    retryable: false
                }
            },
            {
                name: "missing_user_identifier",
                description: "Neither userId nor anonymousId provided",
                input: {
                    groupId: "grp_test"
                },
                expectedError: {
                    type: "validation",
                    message: "Either userId or anonymousId is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    userId: "usr_rate_limit",
                    groupId: "grp_test"
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
        provider: "segment",
        validCases: [
            {
                name: "identify_new_user_signup",
                description: "Identify a new user upon signup with core traits",
                input: {
                    userId: "usr_new_12345",
                    traits: {
                        email: "marcus.wilson@gmail.com",
                        firstName: "Marcus",
                        lastName: "Wilson",
                        name: "Marcus Wilson",
                        username: "mwilson",
                        phone: "+1-555-123-4567",
                        createdAt: "2025-03-18T14:22:00.000Z",
                        signupSource: "organic",
                        referralCode: "FRIEND2025"
                    },
                    context: {
                        ip: "98.45.12.178",
                        locale: "en-US",
                        timezone: "America/Los_Angeles",
                        userAgent:
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0",
                        page: {
                            path: "/signup/complete",
                            title: "Welcome to AppName",
                            url: "https://app.example.com/signup/complete"
                        },
                        campaign: {
                            source: "google",
                            medium: "cpc",
                            name: "spring_2025_signup",
                            term: "productivity app"
                        }
                    },
                    timestamp: "2025-03-18T14:22:00.000Z"
                },
                expectedOutput: {
                    success: true,
                    userId: "usr_new_12345",
                    anonymousId: undefined,
                    traits: {
                        email: "marcus.wilson@gmail.com",
                        firstName: "Marcus",
                        lastName: "Wilson",
                        name: "Marcus Wilson",
                        username: "mwilson",
                        phone: "+1-555-123-4567",
                        createdAt: "2025-03-18T14:22:00.000Z",
                        signupSource: "organic",
                        referralCode: "FRIEND2025"
                    }
                }
            },
            {
                name: "identify_user_subscription_update",
                description: "Update user traits when subscription changes",
                input: {
                    userId: "usr_subscriber_789",
                    traits: {
                        plan: "professional",
                        planTier: "annual",
                        mrr: 29.0,
                        subscriptionStartDate: "2025-03-01T00:00:00.000Z",
                        subscriptionEndDate: "2026-03-01T00:00:00.000Z",
                        paymentMethod: "credit_card",
                        cardBrand: "visa",
                        cardLast4: "4242",
                        billingEmail: "billing@company.com",
                        features: {
                            advancedAnalytics: true,
                            apiAccess: true,
                            prioritySupport: true,
                            customBranding: false
                        }
                    }
                },
                expectedOutput: {
                    success: true,
                    userId: "usr_subscriber_789",
                    anonymousId: undefined,
                    traits: {
                        plan: "professional",
                        planTier: "annual",
                        mrr: 29.0,
                        subscriptionStartDate: "2025-03-01T00:00:00.000Z",
                        subscriptionEndDate: "2026-03-01T00:00:00.000Z",
                        paymentMethod: "credit_card",
                        cardBrand: "visa",
                        cardLast4: "4242",
                        billingEmail: "billing@company.com",
                        features: {
                            advancedAnalytics: true,
                            apiAccess: true,
                            prioritySupport: true,
                            customBranding: false
                        }
                    }
                }
            },
            {
                name: "identify_anonymous_user",
                description: "Identify an anonymous user with inferred traits",
                input: {
                    anonymousId: "anon_visitor_abc123",
                    traits: {
                        inferredCompany: "TechCorp Industries",
                        inferredIndustry: "Technology",
                        inferredEmployeeCount: "1000-5000",
                        inferredDomain: "techcorp.com",
                        firstSeen: "2025-03-15T10:30:00.000Z",
                        lastSeen: "2025-03-18T16:45:00.000Z",
                        sessionCount: 5,
                        pageviewCount: 23
                    },
                    context: {
                        ip: "203.0.113.100",
                        referrer: {
                            type: "search",
                            name: "Google",
                            url: "https://www.google.com/"
                        }
                    }
                },
                expectedOutput: {
                    success: true,
                    userId: undefined,
                    anonymousId: "anon_visitor_abc123",
                    traits: {
                        inferredCompany: "TechCorp Industries",
                        inferredIndustry: "Technology",
                        inferredEmployeeCount: "1000-5000",
                        inferredDomain: "techcorp.com",
                        firstSeen: "2025-03-15T10:30:00.000Z",
                        lastSeen: "2025-03-18T16:45:00.000Z",
                        sessionCount: 5,
                        pageviewCount: 23
                    }
                }
            },
            {
                name: "identify_mobile_user",
                description: "Identify a mobile app user with device context",
                input: {
                    userId: "usr_mobile_456",
                    traits: {
                        email: "jennifer.lee@example.com",
                        name: "Jennifer Lee",
                        avatar: "https://cdn.example.com/avatars/jlee.jpg",
                        pushNotificationsEnabled: true,
                        notificationPreferences: {
                            marketing: false,
                            transactional: true,
                            social: true
                        },
                        appVersion: "2.4.1",
                        lastAppOpen: "2025-03-18T08:15:00.000Z",
                        totalAppOpens: 147
                    },
                    context: {
                        app: {
                            name: "MyMobileApp",
                            version: "2.4.1",
                            build: "2041",
                            namespace: "com.example.mymobileapp"
                        },
                        device: {
                            id: "device_jlee_iphone",
                            advertisingId: "AEBE52E7-03EE-455A-B3C4-E57283966239",
                            adTrackingEnabled: true,
                            manufacturer: "Apple",
                            model: "iPhone 14 Pro",
                            name: "Jennifer's iPhone",
                            type: "ios",
                            token: "apns_token_abc123..."
                        },
                        os: {
                            name: "iOS",
                            version: "17.4"
                        },
                        screen: {
                            density: 3,
                            height: 2556,
                            width: 1179
                        }
                    }
                },
                expectedOutput: {
                    success: true,
                    userId: "usr_mobile_456",
                    anonymousId: undefined,
                    traits: {
                        email: "jennifer.lee@example.com",
                        name: "Jennifer Lee",
                        avatar: "https://cdn.example.com/avatars/jlee.jpg",
                        pushNotificationsEnabled: true,
                        notificationPreferences: {
                            marketing: false,
                            transactional: true,
                            social: true
                        },
                        appVersion: "2.4.1",
                        lastAppOpen: "2025-03-18T08:15:00.000Z",
                        totalAppOpens: 147
                    }
                }
            },
            {
                name: "identify_with_selective_integrations",
                description: "Identify user with selective integration routing",
                input: {
                    userId: "usr_gdpr_compliant",
                    traits: {
                        email: "hans.mueller@example.de",
                        name: "Hans Mueller",
                        country: "Germany",
                        gdprConsent: true,
                        gdprConsentDate: "2025-03-01T12:00:00.000Z",
                        marketingConsent: false
                    },
                    integrations: {
                        All: false,
                        Amplitude: true,
                        "Customer.io": true,
                        Mixpanel: false,
                        "Google Analytics": false,
                        "Facebook Pixel": false
                    }
                },
                expectedOutput: {
                    success: true,
                    userId: "usr_gdpr_compliant",
                    anonymousId: undefined,
                    traits: {
                        email: "hans.mueller@example.de",
                        name: "Hans Mueller",
                        country: "Germany",
                        gdprConsent: true,
                        gdprConsentDate: "2025-03-01T12:00:00.000Z",
                        marketingConsent: false
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "missing_user_identifier",
                description: "Neither userId nor anonymousId provided",
                input: {
                    traits: {
                        email: "test@example.com"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "Either userId or anonymousId is required",
                    retryable: false
                }
            },
            {
                name: "invalid_traits_format",
                description: "Traits is not an object",
                input: {
                    userId: "usr_test",
                    traits: "invalid_string" as never
                },
                expectedError: {
                    type: "validation",
                    message: "Traits must be an object",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    userId: "usr_rate_limit",
                    traits: {
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
    },
    {
        operationId: "trackEvent",
        provider: "segment",
        validCases: [
            {
                name: "track_order_completed",
                description: "Track an ecommerce order completion event",
                input: {
                    userId: "usr_shopper_001",
                    event: "Order Completed",
                    properties: {
                        orderId: "ORD-2025-00456",
                        revenue: 289.97,
                        tax: 24.15,
                        shipping: 9.99,
                        total: 324.11,
                        discount: 25.0,
                        coupon: "SPRING25",
                        currency: "USD",
                        paymentMethod: "credit_card",
                        products: [
                            {
                                productId: "SKU-SHOES-001",
                                name: "Running Shoes Pro",
                                category: "Footwear/Athletic",
                                brand: "SportMax",
                                variant: "Blue/Size 10",
                                price: 159.99,
                                quantity: 1
                            },
                            {
                                productId: "SKU-SOCKS-003",
                                name: "Athletic Socks 3-Pack",
                                category: "Accessories/Socks",
                                brand: "SportMax",
                                variant: "White/Large",
                                price: 24.99,
                                quantity: 2
                            }
                        ],
                        shippingMethod: "standard",
                        estimatedDelivery: "2025-03-25"
                    },
                    context: {
                        ip: "192.168.50.1",
                        locale: "en-US",
                        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                        page: {
                            path: "/checkout/success",
                            title: "Order Confirmed",
                            url: "https://store.example.com/checkout/success?order=ORD-2025-00456"
                        },
                        campaign: {
                            source: "email",
                            medium: "newsletter",
                            name: "spring_sale_2025"
                        }
                    },
                    timestamp: "2025-03-18T11:45:32.000Z"
                },
                expectedOutput: {
                    success: true,
                    event: "Order Completed",
                    userId: "usr_shopper_001",
                    anonymousId: undefined
                }
            },
            {
                name: "track_button_clicked",
                description: "Track a UI interaction event",
                input: {
                    userId: "usr_dashboard_user",
                    event: "Button Clicked",
                    properties: {
                        buttonId: "btn_export_csv",
                        buttonText: "Export to CSV",
                        buttonLocation: "reports_header",
                        page: "/dashboard/reports",
                        reportType: "monthly_summary",
                        dateRange: {
                            start: "2025-02-01",
                            end: "2025-02-28"
                        }
                    }
                },
                expectedOutput: {
                    success: true,
                    event: "Button Clicked",
                    userId: "usr_dashboard_user",
                    anonymousId: undefined
                }
            },
            {
                name: "track_feature_used",
                description: "Track feature adoption/usage event",
                input: {
                    userId: "usr_power_user_77",
                    event: "Feature Used",
                    properties: {
                        featureName: "Advanced Filters",
                        featureCategory: "data_exploration",
                        isFirstUse: false,
                        usageCount: 47,
                        sessionDuration: 1845,
                        filtersApplied: ["date_range", "category", "status", "assignee"],
                        resultCount: 234
                    },
                    context: {
                        groupId: "company_enterprise_123"
                    }
                },
                expectedOutput: {
                    success: true,
                    event: "Feature Used",
                    userId: "usr_power_user_77",
                    anonymousId: undefined
                }
            },
            {
                name: "track_signup_completed",
                description: "Track user signup completion event",
                input: {
                    userId: "usr_new_signup_456",
                    event: "Signup Completed",
                    properties: {
                        signupMethod: "google_oauth",
                        plan: "free",
                        referralSource: "friend_referral",
                        referralCode: "REFER123",
                        utmSource: "twitter",
                        utmMedium: "social",
                        utmCampaign: "launch_2025",
                        abTestVariant: "onboarding_v2",
                        timeToSignup: 145,
                        stepsCompleted: ["email_verified", "profile_created", "preferences_set"]
                    },
                    context: {
                        page: {
                            path: "/onboarding/complete",
                            referrer: "https://twitter.com/"
                        }
                    },
                    timestamp: "2025-03-18T09:30:00.000Z"
                },
                expectedOutput: {
                    success: true,
                    event: "Signup Completed",
                    userId: "usr_new_signup_456",
                    anonymousId: undefined
                }
            },
            {
                name: "track_anonymous_event",
                description: "Track event for anonymous user",
                input: {
                    anonymousId: "anon_visitor_def456",
                    event: "Product Viewed",
                    properties: {
                        productId: "PROD-789",
                        productName: "Premium Widget",
                        category: "Widgets/Premium",
                        price: 99.99,
                        currency: "USD",
                        inStock: true,
                        rating: 4.7,
                        reviewCount: 234,
                        imageUrl: "https://cdn.example.com/products/widget-premium.jpg"
                    },
                    context: {
                        ip: "10.0.0.1",
                        page: {
                            path: "/products/premium-widget",
                            title: "Premium Widget - Best Seller",
                            url: "https://store.example.com/products/premium-widget"
                        },
                        referrer: {
                            type: "search",
                            name: "Google",
                            url: "https://www.google.com/search?q=premium+widget"
                        }
                    }
                },
                expectedOutput: {
                    success: true,
                    event: "Product Viewed",
                    userId: undefined,
                    anonymousId: "anon_visitor_def456"
                }
            },
            {
                name: "track_experiment_viewed",
                description: "Track A/B test experiment exposure",
                input: {
                    userId: "usr_experiment_subject",
                    event: "Experiment Viewed",
                    properties: {
                        experimentId: "exp_checkout_redesign_2025",
                        experimentName: "Checkout Flow Redesign",
                        variationId: "var_b",
                        variationName: "Simplified Checkout",
                        isControl: false,
                        exposureSource: "server_side"
                    },
                    integrations: {
                        Optimizely: true,
                        LaunchDarkly: true,
                        Amplitude: {
                            sessionId: "session_abc123"
                        }
                    }
                },
                expectedOutput: {
                    success: true,
                    event: "Experiment Viewed",
                    userId: "usr_experiment_subject",
                    anonymousId: undefined
                }
            },
            {
                name: "track_video_played",
                description: "Track video playback event with progress",
                input: {
                    userId: "usr_video_viewer",
                    event: "Video Playback Started",
                    properties: {
                        videoId: "vid_tutorial_001",
                        videoTitle: "Getting Started with Our Platform",
                        videoDuration: 345,
                        videoCategory: "tutorials",
                        videoQuality: "1080p",
                        autoplay: false,
                        fullScreen: false,
                        soundEnabled: true,
                        playbackRate: 1.0,
                        startPosition: 0,
                        contentType: "tutorial",
                        provider: "vimeo"
                    }
                },
                expectedOutput: {
                    success: true,
                    event: "Video Playback Started",
                    userId: "usr_video_viewer",
                    anonymousId: undefined
                }
            }
        ],
        errorCases: [
            {
                name: "missing_event_name",
                description: "Track call without event name",
                input: {
                    userId: "usr_test",
                    properties: {
                        test: true
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "Event name is required",
                    retryable: false
                }
            },
            {
                name: "empty_event_name",
                description: "Track call with empty event name",
                input: {
                    userId: "usr_test",
                    event: ""
                },
                expectedError: {
                    type: "validation",
                    message: "Event name cannot be empty",
                    retryable: false
                }
            },
            {
                name: "missing_user_identifier",
                description: "Neither userId nor anonymousId provided",
                input: {
                    event: "Test Event"
                },
                expectedError: {
                    type: "validation",
                    message: "Either userId or anonymousId is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    userId: "usr_rate_limit",
                    event: "Test Event"
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
        operationId: "trackPage",
        provider: "segment",
        validCases: [
            {
                name: "track_homepage_view",
                description: "Track a homepage page view",
                input: {
                    userId: "usr_web_visitor_001",
                    name: "Home",
                    category: "Marketing",
                    properties: {
                        title: "Welcome to Our Platform",
                        path: "/",
                        url: "https://www.example.com/",
                        search: "",
                        referrer: "https://www.google.com/search?q=example+platform",
                        keywords: ["productivity", "collaboration", "teams"]
                    },
                    context: {
                        ip: "72.21.206.80",
                        locale: "en-US",
                        timezone: "America/New_York",
                        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0",
                        campaign: {
                            source: "google",
                            medium: "organic"
                        },
                        page: {
                            path: "/",
                            referrer: "https://www.google.com/search?q=example+platform",
                            title: "Welcome to Our Platform",
                            url: "https://www.example.com/"
                        }
                    },
                    timestamp: "2025-03-18T10:15:00.000Z"
                },
                expectedOutput: {
                    success: true,
                    name: "Home",
                    category: "Marketing",
                    userId: "usr_web_visitor_001",
                    anonymousId: undefined
                }
            },
            {
                name: "track_product_page",
                description: "Track an ecommerce product page view",
                input: {
                    userId: "usr_shopper_browse",
                    name: "Product Detail",
                    category: "Ecommerce",
                    properties: {
                        title: "Wireless Bluetooth Headphones - Premium Edition",
                        path: "/products/wireless-headphones-premium",
                        url: "https://store.example.com/products/wireless-headphones-premium",
                        productId: "PROD-WH-001",
                        productName: "Wireless Bluetooth Headphones",
                        productCategory: "Electronics/Audio",
                        productPrice: 249.99,
                        productBrand: "AudioMax",
                        inStock: true,
                        variant: "Black",
                        position: 3,
                        listId: "homepage_featured"
                    },
                    context: {
                        campaign: {
                            source: "facebook",
                            medium: "cpc",
                            name: "electronics_sale_march",
                            content: "headphones_ad_v2"
                        }
                    }
                },
                expectedOutput: {
                    success: true,
                    name: "Product Detail",
                    category: "Ecommerce",
                    userId: "usr_shopper_browse",
                    anonymousId: undefined
                }
            },
            {
                name: "track_dashboard_page",
                description: "Track an app dashboard page view",
                input: {
                    userId: "usr_app_user_42",
                    name: "Analytics Dashboard",
                    category: "App",
                    properties: {
                        title: "Analytics Dashboard - March 2025",
                        path: "/dashboard/analytics",
                        url: "https://app.example.com/dashboard/analytics?period=30d",
                        search: "?period=30d",
                        dashboardType: "analytics",
                        timeRange: "30d",
                        widgetsLoaded: [
                            "revenue_chart",
                            "user_growth",
                            "conversion_funnel",
                            "top_pages"
                        ],
                        loadTime: 1245,
                        dataFreshness: "2025-03-18T10:00:00.000Z"
                    }
                },
                expectedOutput: {
                    success: true,
                    name: "Analytics Dashboard",
                    category: "App",
                    userId: "usr_app_user_42",
                    anonymousId: undefined
                }
            },
            {
                name: "track_blog_article",
                description: "Track a blog article page view",
                input: {
                    userId: "usr_reader_123",
                    name: "Blog Article",
                    category: "Content",
                    properties: {
                        title: "10 Tips for Better Productivity in 2025",
                        path: "/blog/10-tips-better-productivity-2025",
                        url: "https://www.example.com/blog/10-tips-better-productivity-2025",
                        author: "Jane Smith",
                        publishDate: "2025-03-15T08:00:00.000Z",
                        category: "Productivity",
                        tags: ["productivity", "tips", "2025", "work-life-balance"],
                        wordCount: 2450,
                        readingTime: 10,
                        hasVideo: false,
                        hasPodcast: true
                    },
                    context: {
                        referrer: {
                            type: "social",
                            name: "LinkedIn",
                            url: "https://www.linkedin.com/"
                        }
                    }
                },
                expectedOutput: {
                    success: true,
                    name: "Blog Article",
                    category: "Content",
                    userId: "usr_reader_123",
                    anonymousId: undefined
                }
            },
            {
                name: "track_anonymous_page_view",
                description: "Track page view for anonymous visitor",
                input: {
                    anonymousId: "anon_first_visit_xyz",
                    name: "Pricing",
                    category: "Marketing",
                    properties: {
                        title: "Pricing Plans - Choose Your Plan",
                        path: "/pricing",
                        url: "https://www.example.com/pricing",
                        referrer: "https://www.example.com/features",
                        pricingTiers: ["free", "professional", "enterprise"],
                        showAnnualPricing: true,
                        currency: "USD"
                    },
                    context: {
                        ip: "198.51.100.42",
                        locale: "de-DE",
                        timezone: "Europe/Berlin"
                    }
                },
                expectedOutput: {
                    success: true,
                    name: "Pricing",
                    category: "Marketing",
                    userId: undefined,
                    anonymousId: "anon_first_visit_xyz"
                }
            },
            {
                name: "track_checkout_page",
                description: "Track checkout funnel page view",
                input: {
                    userId: "usr_checkout_789",
                    name: "Checkout - Payment",
                    category: "Ecommerce",
                    properties: {
                        title: "Secure Checkout - Payment Details",
                        path: "/checkout/payment",
                        url: "https://store.example.com/checkout/payment",
                        checkoutStep: 2,
                        checkoutStepName: "payment",
                        cartValue: 189.99,
                        itemCount: 3,
                        paymentOptionsShown: ["credit_card", "paypal", "apple_pay", "google_pay"]
                    },
                    integrations: {
                        "Google Analytics 4": {
                            clientId: "GA4-ECOMM-001"
                        },
                        "Facebook Pixel": true
                    }
                },
                expectedOutput: {
                    success: true,
                    name: "Checkout - Payment",
                    category: "Ecommerce",
                    userId: "usr_checkout_789",
                    anonymousId: undefined
                }
            }
        ],
        errorCases: [
            {
                name: "missing_user_identifier",
                description: "Neither userId nor anonymousId provided",
                input: {
                    name: "Test Page",
                    properties: {
                        path: "/test"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "Either userId or anonymousId is required",
                    retryable: false
                }
            },
            {
                name: "invalid_properties_format",
                description: "Properties is not an object",
                input: {
                    userId: "usr_test",
                    name: "Test Page",
                    properties: "invalid" as never
                },
                expectedError: {
                    type: "validation",
                    message: "Properties must be an object",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    userId: "usr_rate_limit",
                    name: "Test Page"
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
        operationId: "trackScreen",
        provider: "segment",
        validCases: [
            {
                name: "track_home_feed_screen",
                description: "Track mobile app home feed screen view",
                input: {
                    userId: "usr_mobile_user_001",
                    name: "Home Feed",
                    category: "Main",
                    properties: {
                        feedType: "personalized",
                        itemsLoaded: 20,
                        hasNewContent: true,
                        lastRefresh: "2025-03-18T08:30:00.000Z",
                        algorithmVersion: "v3.2",
                        contentMix: {
                            posts: 12,
                            stories: 5,
                            ads: 3
                        }
                    },
                    context: {
                        app: {
                            name: "SocialApp",
                            version: "5.2.1",
                            build: "5210",
                            namespace: "com.example.socialapp"
                        },
                        device: {
                            id: "device_ios_abc123",
                            manufacturer: "Apple",
                            model: "iPhone 15 Pro Max",
                            name: "User's iPhone",
                            type: "ios"
                        },
                        os: {
                            name: "iOS",
                            version: "17.4.1"
                        },
                        screen: {
                            density: 3,
                            height: 2796,
                            width: 1290
                        },
                        network: {
                            wifi: true,
                            cellular: false
                        },
                        timezone: "America/Los_Angeles"
                    },
                    timestamp: "2025-03-18T08:30:15.000Z"
                },
                expectedOutput: {
                    success: true,
                    name: "Home Feed",
                    category: "Main",
                    userId: "usr_mobile_user_001",
                    anonymousId: undefined
                }
            },
            {
                name: "track_profile_screen",
                description: "Track user profile screen view",
                input: {
                    userId: "usr_mobile_viewer",
                    name: "Profile",
                    category: "User",
                    properties: {
                        profileUserId: "usr_profile_owner",
                        isOwnProfile: false,
                        followersCount: 15420,
                        followingCount: 892,
                        postsCount: 234,
                        isVerified: true,
                        isFollowing: true,
                        profileCompleteness: 95
                    },
                    context: {
                        app: {
                            name: "SocialApp",
                            version: "5.2.1"
                        },
                        device: {
                            manufacturer: "Samsung",
                            model: "Galaxy S24 Ultra",
                            type: "android"
                        },
                        os: {
                            name: "Android",
                            version: "14"
                        }
                    }
                },
                expectedOutput: {
                    success: true,
                    name: "Profile",
                    category: "User",
                    userId: "usr_mobile_viewer",
                    anonymousId: undefined
                }
            },
            {
                name: "track_settings_screen",
                description: "Track app settings screen view",
                input: {
                    userId: "usr_settings_user",
                    name: "Settings",
                    category: "App",
                    properties: {
                        settingsSection: "notifications",
                        currentSettings: {
                            pushEnabled: true,
                            emailEnabled: false,
                            smsEnabled: true
                        },
                        previousScreen: "Profile"
                    }
                },
                expectedOutput: {
                    success: true,
                    name: "Settings",
                    category: "App",
                    userId: "usr_settings_user",
                    anonymousId: undefined
                }
            },
            {
                name: "track_checkout_screen",
                description: "Track mobile checkout screen view",
                input: {
                    userId: "usr_mobile_shopper",
                    name: "Checkout",
                    category: "Ecommerce",
                    properties: {
                        cartId: "cart_mobile_456",
                        cartValue: 159.97,
                        itemCount: 2,
                        checkoutStep: 1,
                        checkoutStepName: "cart_review",
                        paymentMethodsAvailable: ["apple_pay", "credit_card", "paypal"],
                        shippingOptionsCount: 3,
                        hasPromoCode: false
                    },
                    context: {
                        app: {
                            name: "ShoppingApp",
                            version: "3.1.0"
                        },
                        device: {
                            type: "ios",
                            model: "iPad Pro 12.9"
                        }
                    }
                },
                expectedOutput: {
                    success: true,
                    name: "Checkout",
                    category: "Ecommerce",
                    userId: "usr_mobile_shopper",
                    anonymousId: undefined
                }
            },
            {
                name: "track_onboarding_screen",
                description: "Track onboarding flow screen view",
                input: {
                    userId: "usr_new_mobile_user",
                    name: "Onboarding Step 2",
                    category: "Onboarding",
                    properties: {
                        stepNumber: 2,
                        totalSteps: 5,
                        stepName: "interests_selection",
                        timeOnPreviousStep: 45,
                        skippable: true,
                        wasSkipped: false,
                        selectedInterests: ["technology", "sports", "travel"]
                    },
                    context: {
                        app: {
                            name: "NewsApp",
                            version: "2.0.0"
                        }
                    }
                },
                expectedOutput: {
                    success: true,
                    name: "Onboarding Step 2",
                    category: "Onboarding",
                    userId: "usr_new_mobile_user",
                    anonymousId: undefined
                }
            },
            {
                name: "track_anonymous_screen",
                description: "Track screen view for anonymous mobile user",
                input: {
                    anonymousId: "anon_mobile_visitor_789",
                    name: "Product Catalog",
                    category: "Shopping",
                    properties: {
                        catalogType: "featured",
                        categoryId: "cat_electronics",
                        productsDisplayed: 24,
                        sortOrder: "popularity",
                        filterApplied: {
                            priceRange: [0, 500],
                            brand: ["Apple", "Samsung"]
                        }
                    },
                    context: {
                        app: {
                            name: "ShoppingApp",
                            version: "3.1.0"
                        },
                        device: {
                            type: "android",
                            model: "Pixel 8 Pro"
                        }
                    }
                },
                expectedOutput: {
                    success: true,
                    name: "Product Catalog",
                    category: "Shopping",
                    userId: undefined,
                    anonymousId: "anon_mobile_visitor_789"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_user_identifier",
                description: "Neither userId nor anonymousId provided",
                input: {
                    name: "Test Screen",
                    category: "Test"
                },
                expectedError: {
                    type: "validation",
                    message: "Either userId or anonymousId is required",
                    retryable: false
                }
            },
            {
                name: "invalid_context_format",
                description: "Context is not an object",
                input: {
                    userId: "usr_test",
                    name: "Test Screen",
                    context: "invalid" as never
                },
                expectedError: {
                    type: "validation",
                    message: "Context must be an object",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    userId: "usr_rate_limit",
                    name: "Test Screen"
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
