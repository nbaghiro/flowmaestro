/**
 * Intercom Provider Test Fixtures
 *
 * Comprehensive test fixtures for Intercom customer messaging platform operations.
 * Includes contacts, companies, conversations, tags, and notes with realistic data.
 */

import type { TestFixture } from "../../sandbox";

// ============================================
// Shared Test Data
// ============================================

const currentTimestamp = Math.floor(Date.now() / 1000);
const oneHourAgo = currentTimestamp - 3600;
const oneDayAgo = currentTimestamp - 86400;
const oneWeekAgo = currentTimestamp - 604800;
const oneMonthAgo = currentTimestamp - 2592000;

// ============================================
// Contacts Fixtures
// ============================================

const contactsFixtures: TestFixture[] = [
    {
        operationId: "listContacts",
        provider: "intercom",
        validCases: [
            {
                name: "list_all_contacts",
                description: "List all contacts without filters",
                input: {},
                expectedOutput: {
                    contacts: [
                        {
                            type: "contact",
                            id: "6478a8f5e1b2c3d4e5f67890",
                            workspace_id: "ws_abc123",
                            external_id: "user_12345",
                            role: "user",
                            email: "sarah.johnson@techstartup.io",
                            phone: "+1-555-234-5678",
                            name: "Sarah Johnson",
                            avatar: "https://avatar.intercom.io/users/6478a8f5e1b2c3d4e5f67890",
                            owner_id: 98765,
                            has_hard_bounced: false,
                            marked_email_as_spam: false,
                            unsubscribed_from_emails: false,
                            created_at: oneMonthAgo,
                            updated_at: oneDayAgo,
                            signed_up_at: oneMonthAgo,
                            last_seen_at: oneHourAgo,
                            last_replied_at: oneDayAgo,
                            last_contacted_at: oneDayAgo,
                            browser: "Chrome",
                            browser_version: "120.0.0",
                            browser_language: "en-US",
                            os: "macOS",
                            location: {
                                type: "location",
                                country: "United States",
                                region: "California",
                                city: "San Francisco"
                            },
                            custom_attributes: {
                                plan: "pro",
                                monthly_active: true,
                                feature_requests: 3
                            },
                            tags: {
                                type: "list",
                                data: [
                                    { type: "tag", id: "tag_001", name: "VIP Customer" },
                                    { type: "tag", id: "tag_002", name: "Product Feedback" }
                                ]
                            },
                            companies: {
                                type: "list",
                                data: [{ type: "company", id: "comp_001" }]
                            }
                        },
                        {
                            type: "contact",
                            id: "6478a8f5e1b2c3d4e5f67891",
                            workspace_id: "ws_abc123",
                            external_id: "user_12346",
                            role: "user",
                            email: "mike.chen@enterprise.com",
                            phone: "+1-555-345-6789",
                            name: "Mike Chen",
                            avatar: "https://avatar.intercom.io/users/6478a8f5e1b2c3d4e5f67891",
                            owner_id: 98766,
                            has_hard_bounced: false,
                            marked_email_as_spam: false,
                            unsubscribed_from_emails: false,
                            created_at: oneWeekAgo,
                            updated_at: oneHourAgo,
                            signed_up_at: oneWeekAgo,
                            last_seen_at: oneHourAgo,
                            browser: "Firefox",
                            browser_version: "121.0",
                            browser_language: "en-US",
                            os: "Windows",
                            location: {
                                type: "location",
                                country: "United States",
                                region: "New York",
                                city: "New York City"
                            },
                            custom_attributes: {
                                plan: "enterprise",
                                team_size: 150,
                                integration_count: 12
                            },
                            tags: {
                                type: "list",
                                data: [{ type: "tag", id: "tag_003", name: "Enterprise" }]
                            },
                            companies: {
                                type: "list",
                                data: [{ type: "company", id: "comp_002" }]
                            }
                        },
                        {
                            type: "contact",
                            id: "6478a8f5e1b2c3d4e5f67892",
                            workspace_id: "ws_abc123",
                            role: "lead",
                            email: "prospect@newclient.com",
                            name: "Alex Thompson",
                            has_hard_bounced: false,
                            marked_email_as_spam: false,
                            unsubscribed_from_emails: false,
                            created_at: oneDayAgo,
                            updated_at: oneDayAgo,
                            browser: "Safari",
                            browser_version: "17.2",
                            os: "iOS",
                            location: {
                                type: "location",
                                country: "Canada",
                                region: "Ontario",
                                city: "Toronto"
                            },
                            custom_attributes: {
                                lead_source: "webinar",
                                interest_level: "high"
                            },
                            tags: {
                                type: "list",
                                data: [{ type: "tag", id: "tag_004", name: "Hot Lead" }]
                            }
                        }
                    ],
                    total_count: 3,
                    pages: {
                        type: "pages",
                        page: 1,
                        per_page: 50,
                        total_pages: 1
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_pagination_cursor",
                description: "Invalid pagination cursor",
                input: {
                    starting_after: "invalid_cursor_xyz"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid pagination cursor",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded on list contacts",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a few seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getContact",
        provider: "intercom",
        validCases: [
            {
                name: "get_user_contact",
                description: "Retrieve a user contact by ID",
                input: {
                    contactId: "6478a8f5e1b2c3d4e5f67890"
                },
                expectedOutput: {
                    type: "contact",
                    id: "6478a8f5e1b2c3d4e5f67890",
                    workspace_id: "ws_abc123",
                    external_id: "user_12345",
                    role: "user",
                    email: "sarah.johnson@techstartup.io",
                    phone: "+1-555-234-5678",
                    name: "Sarah Johnson",
                    avatar: "https://avatar.intercom.io/users/6478a8f5e1b2c3d4e5f67890",
                    owner_id: 98765,
                    social_profiles: {
                        type: "list",
                        data: [
                            {
                                type: "social_profile",
                                name: "LinkedIn",
                                url: "https://linkedin.com/in/sarahjohnson"
                            },
                            {
                                type: "social_profile",
                                name: "Twitter",
                                url: "https://twitter.com/sarahjdev"
                            }
                        ]
                    },
                    has_hard_bounced: false,
                    marked_email_as_spam: false,
                    unsubscribed_from_emails: false,
                    created_at: oneMonthAgo,
                    updated_at: oneDayAgo,
                    signed_up_at: oneMonthAgo,
                    last_seen_at: oneHourAgo,
                    last_replied_at: oneDayAgo,
                    last_contacted_at: oneDayAgo,
                    last_email_opened_at: oneDayAgo,
                    last_email_clicked_at: oneDayAgo,
                    browser: "Chrome",
                    browser_version: "120.0.0",
                    browser_language: "en-US",
                    os: "macOS",
                    location: {
                        type: "location",
                        country: "United States",
                        region: "California",
                        city: "San Francisco"
                    },
                    custom_attributes: {
                        plan: "pro",
                        monthly_active: true,
                        feature_requests: 3,
                        nps_score: 9
                    },
                    tags: {
                        type: "list",
                        data: [
                            { type: "tag", id: "tag_001", name: "VIP Customer" },
                            { type: "tag", id: "tag_002", name: "Product Feedback" }
                        ]
                    },
                    notes: {
                        type: "list",
                        data: [
                            { type: "note", id: "note_001" },
                            { type: "note", id: "note_002" }
                        ]
                    },
                    companies: {
                        type: "list",
                        data: [{ type: "company", id: "comp_001" }]
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "contact_not_found",
                description: "Contact does not exist",
                input: {
                    contactId: "nonexistent_contact_id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Contact not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    contactId: "6478a8f5e1b2c3d4e5f67890"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a few seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createContact",
        provider: "intercom",
        validCases: [
            {
                name: "create_user_contact",
                description: "Create a new user contact with all fields",
                input: {
                    role: "user",
                    email: "new.customer@business.com",
                    name: "Jordan Williams",
                    phone: "+1-555-987-6543",
                    external_id: "customer_98765",
                    custom_attributes: {
                        plan: "starter",
                        signup_source: "product_hunt",
                        trial_ends_at: currentTimestamp + 1209600
                    }
                },
                expectedOutput: {
                    type: "contact",
                    id: "6478a8f5e1b2c3d4e5f67893",
                    workspace_id: "ws_abc123",
                    external_id: "customer_98765",
                    role: "user",
                    email: "new.customer@business.com",
                    phone: "+1-555-987-6543",
                    name: "Jordan Williams",
                    has_hard_bounced: false,
                    marked_email_as_spam: false,
                    unsubscribed_from_emails: false,
                    created_at: currentTimestamp,
                    updated_at: currentTimestamp,
                    custom_attributes: {
                        plan: "starter",
                        signup_source: "product_hunt",
                        trial_ends_at: currentTimestamp + 1209600
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_email",
                description: "Contact with email already exists",
                input: {
                    role: "user",
                    email: "sarah.johnson@techstartup.io",
                    name: "Sarah Johnson Duplicate"
                },
                expectedError: {
                    type: "validation",
                    message: "A contact with this email already exists",
                    retryable: false
                }
            },
            {
                name: "invalid_email_format",
                description: "Invalid email format provided",
                input: {
                    role: "user",
                    email: "not-a-valid-email",
                    name: "Test User"
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
        operationId: "updateContact",
        provider: "intercom",
        validCases: [
            {
                name: "update_contact_details",
                description: "Update contact name and phone",
                input: {
                    contactId: "6478a8f5e1b2c3d4e5f67890",
                    name: "Sarah J. Williams",
                    phone: "+1-555-234-9999"
                },
                expectedOutput: {
                    type: "contact",
                    id: "6478a8f5e1b2c3d4e5f67890",
                    workspace_id: "ws_abc123",
                    external_id: "user_12345",
                    role: "user",
                    email: "sarah.johnson@techstartup.io",
                    phone: "+1-555-234-9999",
                    name: "Sarah J. Williams",
                    created_at: oneMonthAgo,
                    updated_at: currentTimestamp
                }
            }
        ],
        errorCases: [
            {
                name: "contact_not_found",
                description: "Contact to update does not exist",
                input: {
                    contactId: "nonexistent_contact_id",
                    name: "Updated Name"
                },
                expectedError: {
                    type: "not_found",
                    message: "Contact not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "searchContacts",
        provider: "intercom",
        validCases: [
            {
                name: "search_by_email",
                description: "Search contacts by email address",
                input: {
                    query: {
                        field: "email",
                        operator: "=",
                        value: "sarah.johnson@techstartup.io"
                    }
                },
                expectedOutput: {
                    contacts: [
                        {
                            type: "contact",
                            id: "6478a8f5e1b2c3d4e5f67890",
                            workspace_id: "ws_abc123",
                            role: "user",
                            email: "sarah.johnson@techstartup.io",
                            name: "Sarah Johnson"
                        }
                    ],
                    total_count: 1,
                    pages: {
                        type: "pages",
                        page: 1,
                        per_page: 50,
                        total_pages: 1
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_search_field",
                description: "Search on invalid field",
                input: {
                    query: {
                        field: "invalid_field",
                        operator: "=",
                        value: "test"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid search field: invalid_field",
                    retryable: false
                }
            },
            {
                name: "invalid_operator",
                description: "Invalid search operator",
                input: {
                    query: {
                        field: "email",
                        operator: "INVALID",
                        value: "test@example.com"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid search operator: INVALID",
                    retryable: false
                }
            }
        ]
    }
];

// ============================================
// Companies Fixtures
// ============================================

const companiesFixtures: TestFixture[] = [
    {
        operationId: "listCompanies",
        provider: "intercom",
        validCases: [
            {
                name: "list_all_companies",
                description: "List all companies",
                input: {},
                expectedOutput: {
                    companies: [
                        {
                            type: "company",
                            id: "comp_001",
                            company_id: "techstartup_io",
                            name: "TechStartup Inc.",
                            created_at: oneMonthAgo,
                            updated_at: oneDayAgo,
                            last_request_at: oneHourAgo,
                            monthly_spend: 299,
                            session_count: 1542,
                            user_count: 12,
                            size: 50,
                            website: "https://techstartup.io",
                            industry: "Technology",
                            plan: {
                                type: "plan",
                                id: "plan_pro",
                                name: "Pro"
                            },
                            custom_attributes: {
                                arr: 35880,
                                contract_renewal: "2025-03-15",
                                csm_assigned: "Emily Davis"
                            },
                            tags: {
                                type: "list",
                                data: [{ type: "tag", id: "tag_005", name: "Strategic Account" }]
                            },
                            segments: {
                                type: "list",
                                data: [{ type: "segment", id: "seg_active_companies" }]
                            }
                        },
                        {
                            type: "company",
                            id: "comp_002",
                            company_id: "enterprise_com",
                            name: "Enterprise Solutions Corp",
                            created_at: oneMonthAgo,
                            updated_at: oneHourAgo,
                            last_request_at: oneHourAgo,
                            monthly_spend: 2499,
                            session_count: 8934,
                            user_count: 150,
                            size: 500,
                            website: "https://enterprise.com",
                            industry: "Financial Services",
                            plan: {
                                type: "plan",
                                id: "plan_enterprise",
                                name: "Enterprise"
                            },
                            custom_attributes: {
                                arr: 299880,
                                dedicated_support: true,
                                white_glove_onboarding: true
                            },
                            tags: {
                                type: "list",
                                data: [
                                    { type: "tag", id: "tag_003", name: "Enterprise" },
                                    { type: "tag", id: "tag_006", name: "Top 10 Revenue" }
                                ]
                            }
                        },
                        {
                            type: "company",
                            id: "comp_003",
                            company_id: "startup_xyz",
                            name: "Startup XYZ",
                            created_at: oneWeekAgo,
                            updated_at: oneDayAgo,
                            monthly_spend: 49,
                            session_count: 234,
                            user_count: 3,
                            size: 10,
                            website: "https://startupxyz.com",
                            industry: "E-commerce",
                            plan: {
                                type: "plan",
                                id: "plan_starter",
                                name: "Starter"
                            },
                            custom_attributes: {
                                trial_started: oneWeekAgo,
                                referred_by: "Product Hunt"
                            }
                        }
                    ],
                    total_count: 3,
                    pages: {
                        type: "pages",
                        page: 1,
                        per_page: 50,
                        total_pages: 1
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded on list companies",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a few seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getCompany",
        provider: "intercom",
        validCases: [
            {
                name: "get_enterprise_company",
                description: "Retrieve an enterprise company by ID",
                input: {
                    companyId: "comp_002"
                },
                expectedOutput: {
                    type: "company",
                    id: "comp_002",
                    company_id: "enterprise_com",
                    name: "Enterprise Solutions Corp",
                    created_at: oneMonthAgo,
                    updated_at: oneHourAgo,
                    last_request_at: oneHourAgo,
                    monthly_spend: 2499,
                    session_count: 8934,
                    user_count: 150,
                    size: 500,
                    website: "https://enterprise.com",
                    industry: "Financial Services",
                    plan: {
                        type: "plan",
                        id: "plan_enterprise",
                        name: "Enterprise"
                    },
                    custom_attributes: {
                        arr: 299880,
                        dedicated_support: true,
                        white_glove_onboarding: true,
                        primary_contact: "mike.chen@enterprise.com",
                        integration_status: "fully_integrated"
                    },
                    tags: {
                        type: "list",
                        data: [
                            { type: "tag", id: "tag_003", name: "Enterprise" },
                            { type: "tag", id: "tag_006", name: "Top 10 Revenue" }
                        ]
                    },
                    segments: {
                        type: "list",
                        data: [
                            { type: "segment", id: "seg_enterprise" },
                            { type: "segment", id: "seg_active_companies" }
                        ]
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "company_not_found",
                description: "Company does not exist",
                input: {
                    companyId: "nonexistent_company_id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Company not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createOrUpdateCompany",
        provider: "intercom",
        validCases: [
            {
                name: "create_new_company",
                description: "Create a new company",
                input: {
                    company_id: "newcompany_ltd",
                    name: "New Company Ltd",
                    plan: "starter",
                    monthly_spend: 99,
                    size: 25,
                    website: "https://newcompany.com",
                    industry: "Healthcare",
                    custom_attributes: {
                        signup_source: "sales_outreach",
                        salesperson: "David Wilson"
                    }
                },
                expectedOutput: {
                    type: "company",
                    id: "comp_004",
                    company_id: "newcompany_ltd",
                    name: "New Company Ltd",
                    created_at: currentTimestamp,
                    updated_at: currentTimestamp,
                    monthly_spend: 99,
                    session_count: 0,
                    user_count: 0,
                    size: 25,
                    website: "https://newcompany.com",
                    industry: "Healthcare",
                    plan: {
                        type: "plan",
                        id: "plan_starter",
                        name: "starter"
                    },
                    custom_attributes: {
                        signup_source: "sales_outreach",
                        salesperson: "David Wilson"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_website_url",
                description: "Invalid website URL format",
                input: {
                    company_id: "test_company",
                    name: "Test Company",
                    website: "not-a-valid-url"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid URL format for website",
                    retryable: false
                }
            }
        ]
    }
];

// ============================================
// Conversations Fixtures
// ============================================

const conversationsFixtures: TestFixture[] = [
    {
        operationId: "listConversations",
        provider: "intercom",
        validCases: [
            {
                name: "list_all_conversations",
                description: "List all conversations",
                input: {},
                expectedOutput: {
                    conversations: [
                        {
                            type: "conversation",
                            id: "conv_001",
                            created_at: oneDayAgo,
                            updated_at: oneHourAgo,
                            waiting_since: oneHourAgo,
                            source: {
                                type: "conversation",
                                id: "src_001",
                                delivered_as: "customer_initiated",
                                subject: "Integration not working",
                                body: "<p>Hi, I'm having trouble connecting my Salesforce integration. The OAuth flow keeps timing out after I authorize.</p>",
                                author: {
                                    type: "user",
                                    id: "6478a8f5e1b2c3d4e5f67890",
                                    name: "Sarah Johnson",
                                    email: "sarah.johnson@techstartup.io"
                                }
                            },
                            contacts: {
                                type: "contact.list",
                                contacts: [
                                    {
                                        type: "contact",
                                        id: "6478a8f5e1b2c3d4e5f67890"
                                    }
                                ]
                            },
                            admin_assignee_id: 98765,
                            open: true,
                            state: "open",
                            read: true,
                            tags: {
                                type: "tag.list",
                                tags: [
                                    { type: "tag", id: "tag_007", name: "Integration Issue" },
                                    { type: "tag", id: "tag_008", name: "Priority" }
                                ]
                            },
                            priority: "priority",
                            statistics: {
                                type: "conversation_statistics",
                                time_to_assignment: 120,
                                time_to_admin_reply: 300,
                                count_conversation_parts: 5
                            }
                        },
                        {
                            type: "conversation",
                            id: "conv_002",
                            created_at: oneWeekAgo,
                            updated_at: oneDayAgo,
                            source: {
                                type: "conversation",
                                id: "src_002",
                                delivered_as: "customer_initiated",
                                subject: "Billing question",
                                body: "<p>Can you help me understand the charges on my latest invoice? I see a line item I don't recognize.</p>",
                                author: {
                                    type: "user",
                                    id: "6478a8f5e1b2c3d4e5f67891",
                                    name: "Mike Chen",
                                    email: "mike.chen@enterprise.com"
                                }
                            },
                            contacts: {
                                type: "contact.list",
                                contacts: [
                                    {
                                        type: "contact",
                                        id: "6478a8f5e1b2c3d4e5f67891"
                                    }
                                ]
                            },
                            admin_assignee_id: 98766,
                            open: false,
                            state: "closed",
                            read: true,
                            tags: {
                                type: "tag.list",
                                tags: [{ type: "tag", id: "tag_009", name: "Billing" }]
                            },
                            priority: "not_priority",
                            statistics: {
                                type: "conversation_statistics",
                                time_to_assignment: 60,
                                time_to_admin_reply: 180,
                                time_to_first_close: 3600,
                                count_conversation_parts: 8
                            }
                        },
                        {
                            type: "conversation",
                            id: "conv_003",
                            created_at: oneHourAgo,
                            updated_at: oneHourAgo,
                            source: {
                                type: "conversation",
                                id: "src_003",
                                delivered_as: "customer_initiated",
                                body: "<p>Just wanted to say thanks for the quick resolution yesterday! Your support team is amazing.</p>",
                                author: {
                                    type: "lead",
                                    id: "6478a8f5e1b2c3d4e5f67892",
                                    name: "Alex Thompson",
                                    email: "prospect@newclient.com"
                                }
                            },
                            contacts: {
                                type: "contact.list",
                                contacts: [
                                    {
                                        type: "contact",
                                        id: "6478a8f5e1b2c3d4e5f67892"
                                    }
                                ]
                            },
                            open: true,
                            state: "open",
                            read: false,
                            priority: "not_priority"
                        }
                    ],
                    pages: {
                        type: "pages",
                        page: 1,
                        per_page: 50,
                        total_pages: 1
                    }
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
                    message: "Rate limit exceeded. Please retry after a few seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getConversation",
        provider: "intercom",
        validCases: [
            {
                name: "get_conversation_with_parts",
                description: "Retrieve conversation with all conversation parts",
                input: {
                    conversationId: "conv_001"
                },
                expectedOutput: {
                    type: "conversation",
                    id: "conv_001",
                    created_at: oneDayAgo,
                    updated_at: oneHourAgo,
                    waiting_since: oneHourAgo,
                    source: {
                        type: "conversation",
                        id: "src_001",
                        delivered_as: "customer_initiated",
                        subject: "Integration not working",
                        body: "<p>Hi, I'm having trouble connecting my Salesforce integration. The OAuth flow keeps timing out after I authorize.</p>",
                        author: {
                            type: "user",
                            id: "6478a8f5e1b2c3d4e5f67890",
                            name: "Sarah Johnson",
                            email: "sarah.johnson@techstartup.io"
                        },
                        attachments: [
                            {
                                type: "upload",
                                name: "error_screenshot.png",
                                url: "https://intercom-attachments.com/error_screenshot.png",
                                content_type: "image/png",
                                filesize: 245678,
                                width: 1920,
                                height: 1080
                            }
                        ]
                    },
                    contacts: {
                        type: "contact.list",
                        contacts: [
                            {
                                type: "contact",
                                id: "6478a8f5e1b2c3d4e5f67890"
                            }
                        ]
                    },
                    first_contact_reply: {
                        created_at: oneDayAgo,
                        type: "conversation"
                    },
                    admin_assignee_id: 98765,
                    open: true,
                    state: "open",
                    read: true,
                    tags: {
                        type: "tag.list",
                        tags: [
                            { type: "tag", id: "tag_007", name: "Integration Issue" },
                            { type: "tag", id: "tag_008", name: "Priority" }
                        ]
                    },
                    priority: "priority",
                    sla_applied: {
                        type: "conversation_sla_summary",
                        sla_name: "VIP Response SLA",
                        sla_status: "hit"
                    },
                    statistics: {
                        type: "conversation_statistics",
                        time_to_assignment: 120,
                        time_to_admin_reply: 300,
                        first_contact_reply_at: oneDayAgo,
                        first_assignment_at: oneDayAgo,
                        first_admin_reply_at: oneDayAgo,
                        count_reopens: 0,
                        count_assignments: 1,
                        count_conversation_parts: 5
                    },
                    conversation_parts: {
                        type: "conversation_part.list",
                        conversation_parts: [
                            {
                                type: "conversation_part",
                                id: "part_001",
                                part_type: "assignment",
                                created_at: oneDayAgo,
                                updated_at: oneDayAgo,
                                notified_at: oneDayAgo,
                                assigned_to: {
                                    type: "admin",
                                    id: "98765"
                                },
                                author: {
                                    type: "bot",
                                    id: "bot_assignment",
                                    name: "Assignment Bot"
                                }
                            },
                            {
                                type: "conversation_part",
                                id: "part_002",
                                part_type: "comment",
                                body: "<p>Hi Sarah! Thanks for reaching out. I'm sorry to hear you're having trouble with the Salesforce integration.</p><p>Can you tell me which browser you're using and if you see any error messages?</p>",
                                created_at: oneDayAgo,
                                updated_at: oneDayAgo,
                                notified_at: oneDayAgo,
                                author: {
                                    type: "admin",
                                    id: "98765",
                                    name: "Emily Support",
                                    email: "emily@company.com"
                                }
                            },
                            {
                                type: "conversation_part",
                                id: "part_003",
                                part_type: "comment",
                                body: "<p>I'm using Chrome 120 on macOS. The error says 'OAuth timeout - please try again' after about 30 seconds.</p>",
                                created_at: oneDayAgo + 600,
                                updated_at: oneDayAgo + 600,
                                notified_at: oneDayAgo + 600,
                                author: {
                                    type: "user",
                                    id: "6478a8f5e1b2c3d4e5f67890",
                                    name: "Sarah Johnson",
                                    email: "sarah.johnson@techstartup.io"
                                }
                            },
                            {
                                type: "conversation_part",
                                id: "part_004",
                                part_type: "note",
                                body: "<p>Internal note: Checked with engineering - this is a known issue with Salesforce OAuth on certain corporate networks. Workaround is to use incognito mode.</p>",
                                created_at: oneDayAgo + 900,
                                updated_at: oneDayAgo + 900,
                                notified_at: oneDayAgo + 900,
                                author: {
                                    type: "admin",
                                    id: "98765",
                                    name: "Emily Support",
                                    email: "emily@company.com"
                                }
                            },
                            {
                                type: "conversation_part",
                                id: "part_005",
                                part_type: "comment",
                                body: "<p>Thanks for the info! This is a known issue with some corporate network configurations. Could you try the following:</p><ol><li>Open Chrome in incognito mode</li><li>Navigate to Settings > Integrations > Salesforce</li><li>Try the OAuth flow again</li></ol><p>Let me know if that works!</p>",
                                created_at: oneHourAgo,
                                updated_at: oneHourAgo,
                                notified_at: oneHourAgo,
                                author: {
                                    type: "admin",
                                    id: "98765",
                                    name: "Emily Support",
                                    email: "emily@company.com"
                                }
                            }
                        ],
                        total_count: 5
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "conversation_not_found",
                description: "Conversation does not exist",
                input: {
                    conversationId: "nonexistent_conv_id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Conversation not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "replyToConversation",
        provider: "intercom",
        validCases: [
            {
                name: "reply_with_comment",
                description: "Reply to conversation with visible comment",
                input: {
                    conversationId: "conv_001",
                    message_type: "comment",
                    body: "<p>Great news! Our engineering team has deployed a fix for this issue. Could you try connecting again and let me know if it works?</p>",
                    admin_id: "98765"
                },
                expectedOutput: {
                    type: "conversation",
                    id: "conv_001",
                    created_at: oneDayAgo,
                    updated_at: currentTimestamp,
                    state: "open",
                    conversation_parts: {
                        type: "conversation_part.list",
                        conversation_parts: [
                            {
                                type: "conversation_part",
                                id: "part_006",
                                part_type: "comment",
                                body: "<p>Great news! Our engineering team has deployed a fix for this issue. Could you try connecting again and let me know if it works?</p>",
                                created_at: currentTimestamp,
                                updated_at: currentTimestamp,
                                notified_at: currentTimestamp,
                                author: {
                                    type: "admin",
                                    id: "98765",
                                    name: "Emily Support",
                                    email: "emily@company.com"
                                }
                            }
                        ],
                        total_count: 6
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "conversation_not_found",
                description: "Conversation to reply to does not exist",
                input: {
                    conversationId: "nonexistent_conv_id",
                    message_type: "comment",
                    body: "<p>Test reply</p>"
                },
                expectedError: {
                    type: "not_found",
                    message: "Conversation not found",
                    retryable: false
                }
            },
            {
                name: "empty_body",
                description: "Reply body is empty",
                input: {
                    conversationId: "conv_001",
                    message_type: "comment",
                    body: ""
                },
                expectedError: {
                    type: "validation",
                    message: "Reply body cannot be empty",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "closeConversation",
        provider: "intercom",
        validCases: [
            {
                name: "close_with_message",
                description: "Close conversation with closing message",
                input: {
                    conversationId: "conv_001",
                    admin_id: "98765",
                    body: "<p>Glad we could help! Feel free to reach out if you have any other questions. Have a great day!</p>"
                },
                expectedOutput: {
                    type: "conversation",
                    id: "conv_001",
                    created_at: oneDayAgo,
                    updated_at: currentTimestamp,
                    open: false,
                    state: "closed",
                    statistics: {
                        type: "conversation_statistics",
                        time_to_first_close: 86400,
                        last_close_at: currentTimestamp
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "conversation_already_closed",
                description: "Conversation is already closed",
                input: {
                    conversationId: "conv_002",
                    admin_id: "98765"
                },
                expectedError: {
                    type: "validation",
                    message: "Conversation is already closed",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "assignConversation",
        provider: "intercom",
        validCases: [
            {
                name: "assign_to_admin",
                description: "Assign conversation to a specific admin",
                input: {
                    conversationId: "conv_003",
                    admin_id: "98765",
                    assignee_id: "98766"
                },
                expectedOutput: {
                    type: "conversation",
                    id: "conv_003",
                    created_at: oneHourAgo,
                    updated_at: currentTimestamp,
                    admin_assignee_id: 98766,
                    state: "open"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_assignee",
                description: "Assignee admin does not exist",
                input: {
                    conversationId: "conv_001",
                    admin_id: "98765",
                    assignee_id: "nonexistent_admin"
                },
                expectedError: {
                    type: "not_found",
                    message: "Assignee not found",
                    retryable: false
                }
            }
        ]
    }
];

// ============================================
// Notes Fixtures
// ============================================

const notesFixtures: TestFixture[] = [
    {
        operationId: "createNote",
        provider: "intercom",
        validCases: [
            {
                name: "create_note_with_admin",
                description: "Create a note on a contact with admin attribution",
                input: {
                    contactId: "6478a8f5e1b2c3d4e5f67890",
                    body: "<p>Spoke with Sarah on a call today. She's interested in upgrading to Enterprise plan. Key concerns:</p><ul><li>SSO integration timeline</li><li>Dedicated support SLA</li><li>Custom reporting capabilities</li></ul><p>Follow up scheduled for next Tuesday.</p>",
                    admin_id: "98765"
                },
                expectedOutput: {
                    type: "note",
                    id: "note_003",
                    created_at: currentTimestamp,
                    contact: {
                        type: "contact",
                        id: "6478a8f5e1b2c3d4e5f67890"
                    },
                    author: {
                        type: "admin",
                        id: "98765",
                        name: "Emily Support",
                        email: "emily@company.com"
                    },
                    body: "<p>Spoke with Sarah on a call today. She's interested in upgrading to Enterprise plan. Key concerns:</p><ul><li>SSO integration timeline</li><li>Dedicated support SLA</li><li>Custom reporting capabilities</li></ul><p>Follow up scheduled for next Tuesday.</p>"
                }
            }
        ],
        errorCases: [
            {
                name: "contact_not_found",
                description: "Contact to add note to does not exist",
                input: {
                    contactId: "nonexistent_contact_id",
                    body: "<p>Test note</p>"
                },
                expectedError: {
                    type: "not_found",
                    message: "Contact not found",
                    retryable: false
                }
            },
            {
                name: "empty_body",
                description: "Note body is empty",
                input: {
                    contactId: "6478a8f5e1b2c3d4e5f67890",
                    body: ""
                },
                expectedError: {
                    type: "validation",
                    message: "Note body cannot be empty",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listNotes",
        provider: "intercom",
        validCases: [
            {
                name: "list_contact_notes",
                description: "List all notes for a contact",
                input: {
                    contactId: "6478a8f5e1b2c3d4e5f67890"
                },
                expectedOutput: {
                    notes: [
                        {
                            type: "note",
                            id: "note_001",
                            created_at: oneWeekAgo,
                            contact: {
                                type: "contact",
                                id: "6478a8f5e1b2c3d4e5f67890"
                            },
                            author: {
                                type: "admin",
                                id: "98766",
                                name: "David Sales",
                                email: "david@company.com"
                            },
                            body: "<p>Initial discovery call completed. Sarah is the primary decision maker for their team. Budget approved for Q1.</p>"
                        },
                        {
                            type: "note",
                            id: "note_002",
                            created_at: oneDayAgo,
                            contact: {
                                type: "contact",
                                id: "6478a8f5e1b2c3d4e5f67890"
                            },
                            author: {
                                type: "admin",
                                id: "98765",
                                name: "Emily Support",
                                email: "emily@company.com"
                            },
                            body: "<p>Helped resolve Salesforce integration issue. Customer was very satisfied with the quick turnaround. Good candidate for case study.</p>"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "contact_not_found",
                description: "Contact does not exist",
                input: {
                    contactId: "nonexistent_contact_id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Contact not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    contactId: "6478a8f5e1b2c3d4e5f67890"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a few seconds.",
                    retryable: true
                }
            }
        ]
    }
];

// ============================================
// Tags Fixtures
// ============================================

const tagsFixtures: TestFixture[] = [
    {
        operationId: "listTags",
        provider: "intercom",
        validCases: [
            {
                name: "list_all_tags",
                description: "List all tags in workspace",
                input: {},
                expectedOutput: {
                    tags: [
                        {
                            type: "tag",
                            id: "tag_001",
                            name: "VIP Customer"
                        },
                        {
                            type: "tag",
                            id: "tag_002",
                            name: "Product Feedback"
                        },
                        {
                            type: "tag",
                            id: "tag_003",
                            name: "Enterprise"
                        },
                        {
                            type: "tag",
                            id: "tag_004",
                            name: "Hot Lead"
                        },
                        {
                            type: "tag",
                            id: "tag_005",
                            name: "Strategic Account"
                        },
                        {
                            type: "tag",
                            id: "tag_006",
                            name: "Top 10 Revenue"
                        },
                        {
                            type: "tag",
                            id: "tag_007",
                            name: "Integration Issue"
                        },
                        {
                            type: "tag",
                            id: "tag_008",
                            name: "Priority"
                        },
                        {
                            type: "tag",
                            id: "tag_009",
                            name: "Billing"
                        },
                        {
                            type: "tag",
                            id: "tag_010",
                            name: "Churn Risk"
                        },
                        {
                            type: "tag",
                            id: "tag_011",
                            name: "Upsell Opportunity"
                        },
                        {
                            type: "tag",
                            id: "tag_012",
                            name: "Feature Request"
                        }
                    ]
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
                    message: "Rate limit exceeded. Please retry after a few seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "tagContact",
        provider: "intercom",
        validCases: [
            {
                name: "tag_contact_vip",
                description: "Add VIP tag to a contact",
                input: {
                    contactId: "6478a8f5e1b2c3d4e5f67891",
                    tagId: "tag_001"
                },
                expectedOutput: {
                    type: "tag",
                    id: "tag_001",
                    name: "VIP Customer",
                    applied_at: currentTimestamp,
                    applied_by: {
                        type: "admin",
                        id: "98765"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "contact_not_found",
                description: "Contact does not exist",
                input: {
                    contactId: "nonexistent_contact_id",
                    tagId: "tag_001"
                },
                expectedError: {
                    type: "not_found",
                    message: "Contact not found",
                    retryable: false
                }
            },
            {
                name: "tag_not_found",
                description: "Tag does not exist",
                input: {
                    contactId: "6478a8f5e1b2c3d4e5f67890",
                    tagId: "nonexistent_tag_id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Tag not found",
                    retryable: false
                }
            },
            {
                name: "tag_already_applied",
                description: "Tag is already applied to contact",
                input: {
                    contactId: "6478a8f5e1b2c3d4e5f67890",
                    tagId: "tag_001"
                },
                expectedError: {
                    type: "validation",
                    message: "Tag is already applied to this contact",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "tagConversation",
        provider: "intercom",
        validCases: [
            {
                name: "tag_conversation_priority",
                description: "Add priority tag to conversation",
                input: {
                    conversationId: "conv_003",
                    tagId: "tag_008",
                    admin_id: "98765"
                },
                expectedOutput: {
                    type: "tag",
                    id: "tag_008",
                    name: "Priority",
                    applied_at: currentTimestamp,
                    applied_by: {
                        type: "admin",
                        id: "98765"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "conversation_not_found",
                description: "Conversation does not exist",
                input: {
                    conversationId: "nonexistent_conv_id",
                    tagId: "tag_008",
                    admin_id: "98765"
                },
                expectedError: {
                    type: "not_found",
                    message: "Conversation not found",
                    retryable: false
                }
            },
            {
                name: "tag_not_found",
                description: "Tag does not exist",
                input: {
                    conversationId: "conv_001",
                    tagId: "nonexistent_tag_id",
                    admin_id: "98765"
                },
                expectedError: {
                    type: "not_found",
                    message: "Tag not found",
                    retryable: false
                }
            },
            {
                name: "invalid_admin",
                description: "Admin ID is invalid",
                input: {
                    conversationId: "conv_001",
                    tagId: "tag_008",
                    admin_id: "invalid_admin_id"
                },
                expectedError: {
                    type: "permission",
                    message: "Invalid admin ID",
                    retryable: false
                }
            }
        ]
    }
];

// ============================================
// Export All Fixtures
// ============================================

export const intercomFixtures: TestFixture[] = [
    ...contactsFixtures,
    ...companiesFixtures,
    ...conversationsFixtures,
    ...notesFixtures,
    ...tagsFixtures
];
