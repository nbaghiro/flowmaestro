/**
 * Freshdesk Provider Test Fixtures
 *
 * Based on official Freshdesk API documentation:
 * - Tickets: https://developers.freshdesk.com/api/#tickets
 * - Contacts: https://developers.freshdesk.com/api/#contacts
 * - Companies: https://developers.freshdesk.com/api/#companies
 * - Agents: https://developers.freshdesk.com/api/#agents
 */

import type { TestFixture } from "../../../sandbox";

export const freshdeskFixtures: TestFixture[] = [
    // ============================================
    // Agents Operations
    // ============================================
    {
        operationId: "listAgents",
        provider: "freshdesk",
        validCases: [
            {
                name: "list_all_agents",
                description: "List all support agents in the helpdesk",
                input: {},
                expectedOutput: {
                    agents: [
                        {
                            id: 43000012345,
                            available: true,
                            occasional: false,
                            signature: "<p>Best regards,<br>Sarah Mitchell</p>",
                            ticket_scope: 1,
                            skill_ids: [1001, 1002],
                            group_ids: [43000001234],
                            role_ids: [43000000016],
                            type: "support_agent",
                            available_since: "2024-01-15T09:00:00Z",
                            created_at: "2023-06-01T10:30:00Z",
                            updated_at: "2024-01-20T14:15:00Z",
                            last_active_at: "2024-01-20T14:10:00Z",
                            contact: {
                                id: 43000054321,
                                name: "Sarah Mitchell",
                                email: "sarah.mitchell@acmesupport.com",
                                phone: "+1-555-0123",
                                mobile: "+1-555-0124",
                                active: true,
                                job_title: "Senior Support Engineer"
                            }
                        },
                        {
                            id: 43000012346,
                            available: false,
                            occasional: true,
                            signature: "<p>Thanks,<br>James Wilson</p>",
                            ticket_scope: 2,
                            skill_ids: [1003],
                            group_ids: [43000001234, 43000001235],
                            role_ids: [43000000017],
                            type: "support_agent",
                            available_since: null,
                            created_at: "2023-08-15T08:00:00Z",
                            updated_at: "2024-01-19T16:30:00Z",
                            last_active_at: "2024-01-19T16:25:00Z",
                            contact: {
                                id: 43000054322,
                                name: "James Wilson",
                                email: "james.wilson@acmesupport.com",
                                phone: "+1-555-0125",
                                active: true,
                                job_title: "Support Specialist"
                            }
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Invalid API key provided",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Authentication failed",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getAgent",
        provider: "freshdesk",
        validCases: [
            {
                name: "get_agent_by_id",
                description: "Retrieve a specific agent by ID",
                input: {
                    agentId: 43000012345
                },
                expectedOutput: {
                    id: 43000012345,
                    available: true,
                    occasional: false,
                    signature: "<p>Best regards,<br>Sarah Mitchell</p>",
                    ticket_scope: 1,
                    skill_ids: [1001, 1002],
                    group_ids: [43000001234],
                    role_ids: [43000000016],
                    type: "support_agent",
                    available_since: "2024-01-15T09:00:00Z",
                    created_at: "2023-06-01T10:30:00Z",
                    updated_at: "2024-01-20T14:15:00Z",
                    last_active_at: "2024-01-20T14:10:00Z",
                    contact: {
                        id: 43000054321,
                        name: "Sarah Mitchell",
                        email: "sarah.mitchell@acmesupport.com",
                        phone: "+1-555-0123",
                        mobile: "+1-555-0124",
                        active: true,
                        job_title: "Senior Support Engineer"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "agent_not_found",
                description: "Agent ID does not exist",
                input: {
                    agentId: 99999999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Agent not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    agentId: 43000012345
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
        operationId: "getCurrentAgent",
        provider: "freshdesk",
        validCases: [
            {
                name: "get_authenticated_agent",
                description: "Get the currently authenticated agent",
                input: {},
                expectedOutput: {
                    id: 43000012345,
                    available: true,
                    occasional: false,
                    signature: "<p>Best regards,<br>Sarah Mitchell</p>",
                    ticket_scope: 1,
                    skill_ids: [1001, 1002],
                    group_ids: [43000001234],
                    role_ids: [43000000016],
                    type: "support_agent",
                    available_since: "2024-01-15T09:00:00Z",
                    created_at: "2023-06-01T10:30:00Z",
                    updated_at: "2024-01-20T14:15:00Z",
                    last_active_at: "2024-01-20T14:10:00Z",
                    contact: {
                        id: 43000054321,
                        name: "Sarah Mitchell",
                        email: "sarah.mitchell@acmesupport.com",
                        phone: "+1-555-0123",
                        mobile: "+1-555-0124",
                        active: true,
                        job_title: "Senior Support Engineer"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Invalid API key provided",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Authentication failed",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // Companies Operations
    // ============================================
    {
        operationId: "createCompany",
        provider: "freshdesk",
        validCases: [
            {
                name: "create_company_with_details",
                description: "Create a company with full details",
                input: {
                    name: "Global Innovations Ltd",
                    description: "A leading technology company specializing in cloud solutions",
                    domains: ["globalinnovations.com", "gi-corp.io"],
                    custom_fields: {
                        account_manager: "John Smith",
                        contract_value: 50000
                    }
                },
                expectedOutput: {
                    id: 43000067891,
                    name: "Global Innovations Ltd",
                    description: "A leading technology company specializing in cloud solutions",
                    domains: ["globalinnovations.com", "gi-corp.io"],
                    note: null,
                    health_score: null,
                    account_tier: null,
                    renewal_date: null,
                    industry: null,
                    created_at: "{{iso}}",
                    updated_at: "{{iso}}",
                    custom_fields: {
                        account_manager: "John Smith",
                        contract_value: 50000
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_company",
                description: "Company with same name already exists",
                input: {
                    name: "TechCorp Industries"
                },
                expectedError: {
                    type: "validation",
                    message: "Company name already exists",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "New Company"
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
        operationId: "getCompany",
        provider: "freshdesk",
        validCases: [
            {
                name: "get_company_by_id",
                description: "Retrieve a specific company by ID",
                input: {
                    companyId: 43000067890
                },
                expectedOutput: {
                    id: 43000067890,
                    name: "TechCorp Industries",
                    description: "Enterprise software company providing CRM solutions",
                    domains: ["techcorp.com", "techcorp.io"],
                    note: "Premium customer since 2020",
                    health_score: "Happy",
                    account_tier: "Enterprise",
                    renewal_date: "2024-12-31",
                    industry: "Technology",
                    created_at: "2020-03-15T10:00:00Z",
                    updated_at: "2024-01-18T09:30:00Z",
                    custom_fields: {
                        account_manager: "Maria Garcia",
                        contract_value: 120000
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "company_not_found",
                description: "Company ID does not exist",
                input: {
                    companyId: 99999999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Company not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    companyId: 43000067890
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
        operationId: "updateCompany",
        provider: "freshdesk",
        validCases: [
            {
                name: "update_company_name",
                description: "Update company name",
                input: {
                    companyId: 43000067890,
                    name: "TechCorp Industries Inc."
                },
                expectedOutput: {
                    id: 43000067890,
                    name: "TechCorp Industries Inc.",
                    description: "Enterprise software company providing CRM solutions",
                    domains: ["techcorp.com", "techcorp.io"],
                    note: "Premium customer since 2020",
                    health_score: "Happy",
                    account_tier: "Enterprise",
                    renewal_date: "2024-12-31",
                    industry: "Technology",
                    created_at: "2020-03-15T10:00:00Z",
                    updated_at: "{{iso}}",
                    custom_fields: {
                        account_manager: "Maria Garcia",
                        contract_value: 120000
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "company_not_found",
                description: "Company ID does not exist",
                input: {
                    companyId: 99999999999,
                    name: "Updated Name"
                },
                expectedError: {
                    type: "not_found",
                    message: "Company not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    companyId: 43000067890,
                    name: "Updated Name"
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
        operationId: "listCompanies",
        provider: "freshdesk",
        validCases: [
            {
                name: "list_all_companies",
                description: "List all companies in the helpdesk",
                input: {},
                expectedOutput: {
                    companies: [
                        {
                            id: 43000067890,
                            name: "TechCorp Industries",
                            description: "Enterprise software company providing CRM solutions",
                            domains: ["techcorp.com", "techcorp.io"],
                            note: "Premium customer since 2020",
                            health_score: "Happy",
                            account_tier: "Enterprise",
                            renewal_date: "2024-12-31",
                            industry: "Technology",
                            created_at: "2020-03-15T10:00:00Z",
                            updated_at: "2024-01-18T09:30:00Z",
                            custom_fields: {}
                        },
                        {
                            id: 43000067891,
                            name: "Startup Labs",
                            description: "Innovative startup in the AI space",
                            domains: ["startuplabs.io"],
                            note: null,
                            health_score: "At Risk",
                            account_tier: "Starter",
                            renewal_date: "2024-06-30",
                            industry: "Artificial Intelligence",
                            created_at: "2023-07-01T14:00:00Z",
                            updated_at: "2024-01-15T11:20:00Z",
                            custom_fields: {}
                        },
                        {
                            id: 43000067892,
                            name: "RetailMax",
                            description: "National retail chain with 500+ stores",
                            domains: ["retailmax.com"],
                            note: "Key account - escalate all issues",
                            health_score: "Happy",
                            account_tier: "Premium",
                            renewal_date: "2025-03-15",
                            industry: "Retail",
                            created_at: "2019-11-20T09:00:00Z",
                            updated_at: "2024-01-10T16:45:00Z",
                            custom_fields: {}
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Invalid API key provided",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Authentication failed",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ============================================
    // Contacts Operations
    // ============================================
    {
        operationId: "createContact",
        provider: "freshdesk",
        validCases: [
            {
                name: "create_contact_full_details",
                description: "Create a contact with full details including company",
                input: {
                    name: "Emily Chen",
                    email: "emily.chen@globalinnovations.com",
                    phone: "+1-555-0150",
                    mobile: "+1-555-0151",
                    company_id: 43000067891,
                    custom_fields: {
                        department: "Engineering",
                        vip_customer: true
                    }
                },
                expectedOutput: {
                    id: 43000098766,
                    name: "Emily Chen",
                    email: "emily.chen@globalinnovations.com",
                    phone: "+1-555-0150",
                    mobile: "+1-555-0151",
                    twitter_id: null,
                    unique_external_id: null,
                    other_emails: [],
                    company_id: 43000067891,
                    view_all_tickets: false,
                    other_companies: [],
                    address: null,
                    avatar: null,
                    language: "en",
                    time_zone: "Eastern Time (US & Canada)",
                    description: null,
                    job_title: null,
                    tags: [],
                    active: true,
                    deleted: false,
                    created_at: "{{iso}}",
                    updated_at: "{{iso}}",
                    custom_fields: {
                        department: "Engineering",
                        vip_customer: true
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_email",
                description: "Contact with same email already exists",
                input: {
                    name: "John Doe",
                    email: "john.doe@techcorp.com"
                },
                expectedError: {
                    type: "validation",
                    message: "A contact with this email already exists",
                    retryable: false
                }
            },
            {
                name: "invalid_email",
                description: "Invalid email format provided",
                input: {
                    name: "John Doe",
                    email: "invalid-email"
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
                    name: "Test Contact",
                    email: "test@example.com"
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
        operationId: "getContact",
        provider: "freshdesk",
        validCases: [
            {
                name: "get_contact_by_id",
                description: "Retrieve a specific contact by ID",
                input: {
                    contactId: 43000098765
                },
                expectedOutput: {
                    id: 43000098765,
                    name: "John Doe",
                    email: "john.doe@techcorp.com",
                    phone: "+1-555-0200",
                    mobile: "+1-555-0201",
                    twitter_id: "@johndoe",
                    unique_external_id: "EXT-12345",
                    other_emails: ["j.doe@personal.com"],
                    company_id: 43000067890,
                    view_all_tickets: true,
                    other_companies: [
                        {
                            company_id: 43000067891,
                            view_all_tickets: false
                        }
                    ],
                    address: "123 Main Street, Suite 400, San Francisco, CA 94105",
                    avatar: {
                        id: 43000011111,
                        content_type: "image/jpeg",
                        size: 24576,
                        name: "john_avatar.jpg",
                        avatar_url: "https://s3.amazonaws.com/freshdesk/avatars/john_avatar.jpg",
                        created_at: "2023-06-15T10:00:00Z",
                        updated_at: "2023-06-15T10:00:00Z"
                    },
                    language: "en",
                    time_zone: "Pacific Time (US & Canada)",
                    description: "Primary IT contact for TechCorp",
                    job_title: "IT Director",
                    tags: ["vip", "technical"],
                    active: true,
                    deleted: false,
                    created_at: "2023-06-15T10:00:00Z",
                    updated_at: "2024-01-18T15:30:00Z",
                    custom_fields: {
                        department: "IT",
                        employee_id: "TC-1234"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "contact_not_found",
                description: "Contact ID does not exist",
                input: {
                    contactId: 99999999999
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
                    contactId: 43000098765
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
        operationId: "updateContact",
        provider: "freshdesk",
        validCases: [
            {
                name: "update_contact_phone",
                description: "Update contact phone number",
                input: {
                    contactId: 43000098765,
                    phone: "+1-555-0299"
                },
                expectedOutput: {
                    id: 43000098765,
                    name: "John Doe",
                    email: "john.doe@techcorp.com",
                    phone: "+1-555-0299",
                    mobile: "+1-555-0201",
                    company_id: 43000067890,
                    active: true,
                    deleted: false,
                    created_at: "2023-06-15T10:00:00Z",
                    updated_at: "{{iso}}",
                    custom_fields: {}
                }
            }
        ],
        errorCases: [
            {
                name: "contact_not_found",
                description: "Contact ID does not exist",
                input: {
                    contactId: 99999999999,
                    name: "Updated Name"
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
                    contactId: 43000098765,
                    name: "Updated Name"
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
        operationId: "listContacts",
        provider: "freshdesk",
        validCases: [
            {
                name: "list_all_contacts",
                description: "List all contacts in the helpdesk",
                input: {},
                expectedOutput: {
                    contacts: [
                        {
                            id: 43000098765,
                            name: "John Doe",
                            email: "john.doe@techcorp.com",
                            phone: "+1-555-0200",
                            mobile: "+1-555-0201",
                            company_id: 43000067890,
                            job_title: "IT Director",
                            active: true,
                            deleted: false,
                            created_at: "2023-06-15T10:00:00Z",
                            updated_at: "2024-01-18T15:30:00Z"
                        },
                        {
                            id: 43000098766,
                            name: "Emily Chen",
                            email: "emily.chen@globalinnovations.com",
                            phone: "+1-555-0150",
                            mobile: "+1-555-0151",
                            company_id: 43000067891,
                            job_title: "Software Engineer",
                            active: true,
                            deleted: false,
                            created_at: "2023-08-20T14:00:00Z",
                            updated_at: "2024-01-17T10:15:00Z"
                        },
                        {
                            id: 43000098767,
                            name: "Michael Brown",
                            email: "m.brown@retailmax.com",
                            phone: "+1-555-0300",
                            mobile: null,
                            company_id: 43000067892,
                            job_title: "Store Manager",
                            active: true,
                            deleted: false,
                            created_at: "2022-11-10T09:00:00Z",
                            updated_at: "2024-01-12T08:45:00Z"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Invalid API key provided",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Authentication failed",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "searchContacts",
        provider: "freshdesk",
        validCases: [
            {
                name: "search_contacts_by_name",
                description: "Search contacts by name query",
                input: {
                    query: "name:'John'"
                },
                expectedOutput: {
                    contacts: [
                        {
                            id: 43000098765,
                            name: "John Doe",
                            email: "john.doe@techcorp.com",
                            phone: "+1-555-0200",
                            company_id: 43000067890,
                            active: true,
                            created_at: "2023-06-15T10:00:00Z",
                            updated_at: "2024-01-18T15:30:00Z"
                        }
                    ],
                    total: 1
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_query",
                description: "Invalid search query syntax",
                input: {
                    query: "invalid:::query"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid search query syntax",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    query: "name:'Test'"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ============================================
    // Tickets Operations
    // ============================================
    {
        operationId: "createTicket",
        provider: "freshdesk",
        validCases: [
            {
                name: "create_urgent_ticket",
                description: "Create an urgent ticket with high priority",
                input: {
                    subject: "Production server down - CRITICAL",
                    description:
                        "<p><strong>URGENT:</strong> Our production server is completely down. All customers are affected. Need immediate assistance!</p>",
                    email: "emily.chen@globalinnovations.com",
                    priority: 4,
                    status: 2,
                    type: "Incident",
                    tags: ["critical", "production", "outage"]
                },
                expectedOutput: {
                    id: 43000123457,
                    subject: "Production server down - CRITICAL",
                    description:
                        "<p><strong>URGENT:</strong> Our production server is completely down. All customers are affected. Need immediate assistance!</p>",
                    description_text:
                        "URGENT: Our production server is completely down. All customers are affected. Need immediate assistance!",
                    status: 2,
                    priority: 4,
                    source: 1,
                    type: "Incident",
                    requester_id: 43000098766,
                    responder_id: null,
                    company_id: 43000067891,
                    group_id: null,
                    product_id: null,
                    fr_due_by: "2024-01-20T19:00:00Z",
                    fr_escalated: false,
                    due_by: "2024-01-21T09:00:00Z",
                    is_escalated: false,
                    tags: ["critical", "production", "outage"],
                    cc_emails: [],
                    spam: false,
                    created_at: "{{iso}}",
                    updated_at: "{{iso}}",
                    attachments: [],
                    custom_fields: {}
                }
            }
        ],
        errorCases: [
            {
                name: "missing_requester",
                description: "Neither email nor requester_id provided",
                input: {
                    subject: "Test ticket",
                    description: "Test description"
                },
                expectedError: {
                    type: "validation",
                    message: "Either email or requester_id is required",
                    retryable: false
                }
            },
            {
                name: "invalid_email",
                description: "Invalid email format provided",
                input: {
                    subject: "Test ticket",
                    description: "Test description",
                    email: "invalid-email"
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
                    subject: "Test ticket",
                    description: "Test description",
                    email: "test@example.com"
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
        operationId: "getTicket",
        provider: "freshdesk",
        validCases: [
            {
                name: "get_ticket_by_id",
                description: "Retrieve a specific ticket by ID",
                input: {
                    ticketId: 43000123456
                },
                expectedOutput: {
                    id: 43000123456,
                    subject: "Unable to login to dashboard",
                    description:
                        "<p>I am getting an error when trying to login to the dashboard. The error message says 'Invalid credentials' even though I am sure my password is correct.</p>",
                    description_text:
                        "I am getting an error when trying to login to the dashboard. The error message says 'Invalid credentials' even though I am sure my password is correct.",
                    status: 3,
                    priority: 2,
                    source: 1,
                    type: "Problem",
                    requester_id: 43000098765,
                    responder_id: 43000012345,
                    company_id: 43000067890,
                    group_id: 43000001234,
                    product_id: 43000005001,
                    fr_due_by: "2024-01-22T17:00:00Z",
                    fr_escalated: false,
                    due_by: "2024-01-25T17:00:00Z",
                    is_escalated: false,
                    tags: ["login", "permission"],
                    cc_emails: ["admin@techcorp.com"],
                    spam: false,
                    created_at: "2024-01-20T10:30:00Z",
                    updated_at: "2024-01-20T14:15:00Z",
                    attachments: [],
                    custom_fields: {
                        browser: "Chrome 120",
                        operating_system: "Windows 11"
                    },
                    stats: {
                        agent_responded_at: "2024-01-20T11:00:00Z",
                        requester_responded_at: "2024-01-20T14:00:00Z",
                        first_responded_at: "2024-01-20T11:00:00Z",
                        status_updated_at: "2024-01-20T14:15:00Z"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "ticket_not_found",
                description: "Ticket ID does not exist",
                input: {
                    ticketId: 99999999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Ticket not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    ticketId: 43000123456
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
        operationId: "updateTicket",
        provider: "freshdesk",
        validCases: [
            {
                name: "update_ticket_status",
                description: "Update ticket status to resolved",
                input: {
                    ticketId: 43000123456,
                    status: 4
                },
                expectedOutput: {
                    id: 43000123456,
                    subject: "Unable to login to dashboard",
                    description:
                        "<p>I am getting an error when trying to login to the dashboard.</p>",
                    status: 4,
                    priority: 2,
                    source: 1,
                    requester_id: 43000098765,
                    responder_id: 43000012345,
                    company_id: 43000067890,
                    created_at: "2024-01-20T10:30:00Z",
                    updated_at: "{{iso}}"
                }
            }
        ],
        errorCases: [
            {
                name: "ticket_not_found",
                description: "Ticket ID does not exist",
                input: {
                    ticketId: 99999999999,
                    status: 4
                },
                expectedError: {
                    type: "not_found",
                    message: "Ticket not found",
                    retryable: false
                }
            },
            {
                name: "invalid_status",
                description: "Invalid status value provided",
                input: {
                    ticketId: 43000123456,
                    status: 10
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid status value",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    ticketId: 43000123456,
                    status: 4
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
        operationId: "deleteTicket",
        provider: "freshdesk",
        validCases: [
            {
                name: "delete_ticket",
                description: "Delete a ticket (moves to trash)",
                input: {
                    ticketId: 43000123456
                },
                expectedOutput: {
                    deleted: true,
                    ticketId: 43000123456
                }
            }
        ],
        errorCases: [
            {
                name: "ticket_not_found",
                description: "Ticket ID does not exist",
                input: {
                    ticketId: 99999999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Ticket not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    ticketId: 43000123456
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
        operationId: "listTickets",
        provider: "freshdesk",
        validCases: [
            {
                name: "list_all_tickets",
                description: "List all tickets in the helpdesk",
                input: {},
                expectedOutput: {
                    tickets: [
                        {
                            id: 43000123456,
                            subject: "Unable to login to dashboard",
                            status: 3,
                            priority: 2,
                            source: 1,
                            type: "Problem",
                            requester_id: 43000098765,
                            responder_id: 43000012345,
                            company_id: 43000067890,
                            created_at: "2024-01-20T10:30:00Z",
                            updated_at: "2024-01-20T14:15:00Z"
                        },
                        {
                            id: 43000123457,
                            subject: "Production server down - CRITICAL",
                            status: 2,
                            priority: 4,
                            source: 1,
                            type: "Incident",
                            requester_id: 43000098766,
                            responder_id: 43000012346,
                            company_id: 43000067891,
                            created_at: "2024-01-20T15:00:00Z",
                            updated_at: "2024-01-20T15:30:00Z"
                        },
                        {
                            id: 43000123458,
                            subject: "Feature request: Export to CSV",
                            status: 2,
                            priority: 1,
                            source: 2,
                            type: "Feature Request",
                            requester_id: 43000098767,
                            responder_id: null,
                            company_id: 43000067892,
                            created_at: "2024-01-19T09:00:00Z",
                            updated_at: "2024-01-19T09:00:00Z"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Invalid API key provided",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Authentication failed",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "searchTickets",
        provider: "freshdesk",
        validCases: [
            {
                name: "search_open_urgent_tickets",
                description: "Search for open tickets with urgent priority",
                input: {
                    query: "status:2 AND priority:4"
                },
                expectedOutput: {
                    tickets: [
                        {
                            id: 43000123457,
                            subject: "Production server down - CRITICAL",
                            status: 2,
                            priority: 4,
                            source: 1,
                            type: "Incident",
                            requester_id: 43000098766,
                            responder_id: 43000012346,
                            company_id: 43000067891,
                            tags: ["critical", "production", "outage"],
                            created_at: "2024-01-20T15:00:00Z",
                            updated_at: "2024-01-20T15:30:00Z"
                        }
                    ],
                    total: 1
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_query",
                description: "Invalid search query syntax",
                input: {
                    query: "invalid:::query"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid search query syntax",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    query: "status:2"
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
        operationId: "addTicketReply",
        provider: "freshdesk",
        validCases: [
            {
                name: "add_agent_reply",
                description: "Add an agent reply to a ticket",
                input: {
                    ticketId: 43000123456,
                    body: "<p>Hi John,</p><p>Thank you for contacting us. I have reset your password. Please try logging in again with the temporary password sent to your email.</p><p>Best regards,<br>Sarah</p>"
                },
                expectedOutput: {
                    id: 43000456789,
                    body: "<p>Hi John,</p><p>Thank you for contacting us. I have reset your password. Please try logging in again with the temporary password sent to your email.</p><p>Best regards,<br>Sarah</p>",
                    body_text:
                        "Hi John,\n\nThank you for contacting us. I have reset your password. Please try logging in again with the temporary password sent to your email.\n\nBest regards,\nSarah",
                    incoming: false,
                    private: false,
                    user_id: 43000012345,
                    support_email: "support@acmesupport.freshdesk.com",
                    source: 0,
                    ticket_id: 43000123456,
                    to_emails: ["john.doe@techcorp.com"],
                    from_email: "support@acmesupport.freshdesk.com",
                    cc_emails: [],
                    bcc_emails: [],
                    created_at: "{{iso}}",
                    updated_at: "{{iso}}",
                    attachments: []
                }
            }
        ],
        errorCases: [
            {
                name: "ticket_not_found",
                description: "Ticket ID does not exist",
                input: {
                    ticketId: 99999999999,
                    body: "Test reply"
                },
                expectedError: {
                    type: "not_found",
                    message: "Ticket not found",
                    retryable: false
                }
            },
            {
                name: "ticket_closed",
                description: "Cannot reply to a closed ticket",
                input: {
                    ticketId: 43000123459,
                    body: "Test reply"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot reply to a closed ticket",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    ticketId: 43000123456,
                    body: "Test reply"
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
        operationId: "addTicketNote",
        provider: "freshdesk",
        validCases: [
            {
                name: "add_private_note",
                description: "Add a private internal note to a ticket",
                input: {
                    ticketId: 43000123456,
                    body: "<p>Customer has been having login issues for the past week. This might be related to the recent password policy changes. Check the audit logs for failed login attempts.</p>",
                    private: true
                },
                expectedOutput: {
                    id: 43000456791,
                    body: "<p>Customer has been having login issues for the past week. This might be related to the recent password policy changes. Check the audit logs for failed login attempts.</p>",
                    body_text:
                        "Customer has been having login issues for the past week. This might be related to the recent password policy changes. Check the audit logs for failed login attempts.",
                    incoming: false,
                    private: true,
                    user_id: 43000012345,
                    source: 2,
                    ticket_id: 43000123456,
                    created_at: "{{iso}}",
                    updated_at: "{{iso}}",
                    attachments: []
                }
            }
        ],
        errorCases: [
            {
                name: "ticket_not_found",
                description: "Ticket ID does not exist",
                input: {
                    ticketId: 99999999999,
                    body: "Test note"
                },
                expectedError: {
                    type: "not_found",
                    message: "Ticket not found",
                    retryable: false
                }
            },
            {
                name: "invalid_notify_email",
                description: "Invalid email in notify_emails array",
                input: {
                    ticketId: 43000123456,
                    body: "Test note",
                    notify_emails: ["invalid-email"]
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email format in notify_emails",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    ticketId: 43000123456,
                    body: "Test note"
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
