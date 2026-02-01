/**
 * Zendesk Provider Test Fixtures
 *
 * Based on official Zendesk API documentation:
 * - Tickets API: https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/
 * - Users API: https://developer.zendesk.com/api-reference/ticketing/users/users/
 * - Help Center API: https://developer.zendesk.com/api-reference/help_center/help-center-api/
 */

import type { TestFixture } from "../../../sandbox";

/**
 * Sample ticket for test data
 */
const sampleTicket = {
    id: 35436,
    url: "https://flowmaestro.zendesk.com/api/v2/tickets/35436.json",
    external_id: null,
    type: "incident" as const,
    subject: "Unable to login to dashboard",
    raw_subject: "Unable to login to dashboard",
    description: "I am unable to login to the dashboard. Getting a 403 error.",
    priority: "high" as const,
    status: "open" as const,
    recipient: null,
    requester_id: 20978392,
    submitter_id: 20978392,
    assignee_id: 15284729,
    organization_id: 57542,
    group_id: 22117439,
    collaborator_ids: [],
    follower_ids: [],
    email_cc_ids: [],
    forum_topic_id: null,
    problem_id: null,
    has_incidents: false,
    is_public: true,
    due_at: null,
    tags: ["login", "dashboard", "urgent"],
    custom_fields: [],
    satisfaction_rating: null,
    sharing_agreement_ids: [],
    fields: [],
    followup_ids: [],
    brand_id: 360001234567,
    allow_channelback: false,
    allow_attachments: true,
    via: {
        channel: "web",
        source: {
            from: {},
            to: {},
            rel: null
        }
    },
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T14:45:00Z"
};

/**
 * Sample user for test data
 */
const sampleUser = {
    id: 20978392,
    url: "https://flowmaestro.zendesk.com/api/v2/users/20978392.json",
    name: "John Smith",
    email: "john.smith@acmecorp.com",
    created_at: "2023-06-15T08:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
    time_zone: "America/New_York",
    iana_time_zone: "America/New_York",
    phone: "+1-555-123-4567",
    shared_phone_number: null,
    photo: null,
    locale_id: 1,
    locale: "en-US",
    organization_id: 57542,
    role: "end-user" as const,
    verified: true,
    external_id: "ACME-USR-001",
    tags: ["vip", "enterprise"],
    alias: null,
    active: true,
    shared: false,
    shared_agent: false,
    last_login_at: "2024-01-15T10:25:00Z",
    two_factor_auth_enabled: true,
    signature: null,
    details: "Enterprise customer since 2023",
    notes: null,
    role_type: null,
    custom_role_id: null,
    moderator: false,
    ticket_restriction: null,
    only_private_comments: false,
    restricted_agent: false,
    suspended: false,
    default_group_id: null,
    report_csv: false,
    user_fields: {
        company_size: "500-1000",
        industry: "Technology"
    }
};

/**
 * Sample article for test data
 */
const sampleArticle = {
    id: 360012345678,
    url: "https://flowmaestro.zendesk.com/api/v2/help_center/articles/360012345678.json",
    html_url: "https://flowmaestro.zendesk.com/hc/en-us/articles/360012345678",
    author_id: 15284729,
    comments_disabled: false,
    draft: false,
    promoted: true,
    position: 0,
    vote_sum: 42,
    vote_count: 48,
    section_id: 360001234567,
    created_at: "2023-03-10T14:00:00Z",
    updated_at: "2024-01-10T16:30:00Z",
    name: "Getting Started with FlowMaestro",
    title: "Getting Started with FlowMaestro",
    source_locale: "en-us",
    locale: "en-us",
    outdated: false,
    outdated_locales: [],
    edited_at: "2024-01-10T16:30:00Z",
    user_segment_id: null,
    permission_group_id: 7654321,
    content_tag_ids: [],
    label_names: ["getting-started", "beginner", "tutorial"],
    body: "<h1>Welcome to FlowMaestro</h1><p>This guide will help you get started with creating your first workflow.</p>"
};

export const zendeskFixtures: TestFixture[] = [
    {
        operationId: "createTicket",
        provider: "zendesk",
        validCases: [
            {
                name: "create_basic_ticket",
                description: "Create a basic support ticket",
                input: {
                    subject: "Need help with API integration",
                    description:
                        "I am trying to integrate your API but getting authentication errors.",
                    priority: "normal"
                },
                expectedOutput: {
                    id: 35437,
                    url: "https://flowmaestro.zendesk.com/api/v2/tickets/35437.json",
                    external_id: null,
                    type: null,
                    subject: "Need help with API integration",
                    raw_subject: "Need help with API integration",
                    description:
                        "I am trying to integrate your API but getting authentication errors.",
                    priority: "normal",
                    status: "new",
                    recipient: null,
                    requester_id: 20978392,
                    submitter_id: 20978392,
                    assignee_id: null,
                    organization_id: 57542,
                    group_id: null,
                    collaborator_ids: [],
                    follower_ids: [],
                    email_cc_ids: [],
                    forum_topic_id: null,
                    problem_id: null,
                    has_incidents: false,
                    is_public: true,
                    due_at: null,
                    tags: [],
                    custom_fields: [],
                    satisfaction_rating: null,
                    sharing_agreement_ids: [],
                    fields: [],
                    followup_ids: [],
                    brand_id: 360001234567,
                    allow_channelback: false,
                    allow_attachments: true,
                    via: {
                        channel: "api",
                        source: {
                            from: {},
                            to: {},
                            rel: null
                        }
                    },
                    created_at: "2024-01-20T15:00:00Z",
                    updated_at: "2024-01-20T15:00:00Z"
                }
            },
            {
                name: "create_urgent_ticket",
                description: "Create an urgent ticket with tags and assignee",
                input: {
                    subject: "Production system down",
                    description:
                        "Our production system is completely down. Immediate assistance needed.",
                    priority: "urgent",
                    type: "incident",
                    tags: ["production", "outage", "critical"],
                    assignee_id: 15284729,
                    group_id: 22117439
                },
                expectedOutput: {
                    id: 35438,
                    url: "https://flowmaestro.zendesk.com/api/v2/tickets/35438.json",
                    external_id: null,
                    type: "incident",
                    subject: "Production system down",
                    raw_subject: "Production system down",
                    description:
                        "Our production system is completely down. Immediate assistance needed.",
                    priority: "urgent",
                    status: "new",
                    recipient: null,
                    requester_id: 20978392,
                    submitter_id: 20978392,
                    assignee_id: 15284729,
                    organization_id: 57542,
                    group_id: 22117439,
                    collaborator_ids: [],
                    follower_ids: [],
                    email_cc_ids: [],
                    forum_topic_id: null,
                    problem_id: null,
                    has_incidents: false,
                    is_public: true,
                    due_at: null,
                    tags: ["production", "outage", "critical"],
                    custom_fields: [],
                    satisfaction_rating: null,
                    sharing_agreement_ids: [],
                    fields: [],
                    followup_ids: [],
                    brand_id: 360001234567,
                    allow_channelback: false,
                    allow_attachments: true,
                    via: {
                        channel: "api",
                        source: {
                            from: {},
                            to: {},
                            rel: null
                        }
                    },
                    created_at: "2024-01-20T15:05:00Z",
                    updated_at: "2024-01-20T15:05:00Z"
                }
            },
            {
                name: "create_ticket_with_requester_email",
                description: "Create a ticket on behalf of a customer by email",
                input: {
                    subject: "Feature request: Dark mode",
                    description: "Please add dark mode support to the application.",
                    priority: "low",
                    type: "question",
                    requester_email: "customer@example.com"
                },
                expectedOutput: {
                    id: 35439,
                    url: "https://flowmaestro.zendesk.com/api/v2/tickets/35439.json",
                    external_id: null,
                    type: "question",
                    subject: "Feature request: Dark mode",
                    raw_subject: "Feature request: Dark mode",
                    description: "Please add dark mode support to the application.",
                    priority: "low",
                    status: "new",
                    recipient: null,
                    requester_id: 20978393,
                    submitter_id: 15284729,
                    assignee_id: null,
                    organization_id: null,
                    group_id: null,
                    collaborator_ids: [],
                    follower_ids: [],
                    email_cc_ids: [],
                    forum_topic_id: null,
                    problem_id: null,
                    has_incidents: false,
                    is_public: true,
                    due_at: null,
                    tags: [],
                    custom_fields: [],
                    satisfaction_rating: null,
                    sharing_agreement_ids: [],
                    fields: [],
                    followup_ids: [],
                    brand_id: 360001234567,
                    allow_channelback: false,
                    allow_attachments: true,
                    via: {
                        channel: "api",
                        source: {
                            from: {},
                            to: {},
                            rel: null
                        }
                    },
                    created_at: "2024-01-20T15:10:00Z",
                    updated_at: "2024-01-20T15:10:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "assignee_not_found",
                description: "Assignee ID does not exist",
                input: {
                    subject: "Test ticket",
                    description: "Test description",
                    assignee_id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Assignee not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    subject: "Test ticket",
                    description: "Test description"
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
        provider: "zendesk",
        validCases: [
            {
                name: "get_ticket_by_id",
                description: "Get a ticket by its ID",
                input: {
                    ticket_id: 35436
                },
                expectedOutput: sampleTicket
            },
            {
                name: "get_solved_ticket",
                description: "Get a solved ticket",
                input: {
                    ticket_id: 35430
                },
                expectedOutput: {
                    ...sampleTicket,
                    id: 35430,
                    url: "https://flowmaestro.zendesk.com/api/v2/tickets/35430.json",
                    status: "solved",
                    satisfaction_rating: {
                        score: "good",
                        comment: "Very helpful support!"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "ticket_not_found",
                description: "Ticket does not exist",
                input: {
                    ticket_id: 99999999
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
                    ticket_id: 35436
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
        provider: "zendesk",
        validCases: [
            {
                name: "update_ticket_status",
                description: "Update ticket status to pending",
                input: {
                    ticket_id: 35436,
                    status: "pending"
                },
                expectedOutput: {
                    ...sampleTicket,
                    status: "pending",
                    updated_at: "2024-01-20T16:00:00Z"
                }
            },
            {
                name: "update_ticket_with_comment",
                description: "Add a comment and update priority",
                input: {
                    ticket_id: 35436,
                    priority: "urgent",
                    comment: {
                        body: "Escalating this issue to engineering team.",
                        public: false
                    }
                },
                expectedOutput: {
                    ...sampleTicket,
                    priority: "urgent",
                    updated_at: "2024-01-20T16:15:00Z"
                }
            },
            {
                name: "reassign_ticket",
                description: "Reassign ticket to different agent and group",
                input: {
                    ticket_id: 35436,
                    assignee_id: 15284730,
                    group_id: 22117440,
                    comment: {
                        body: "Reassigning to the API team for further investigation.",
                        public: true
                    }
                },
                expectedOutput: {
                    ...sampleTicket,
                    assignee_id: 15284730,
                    group_id: 22117440,
                    updated_at: "2024-01-20T16:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "ticket_not_found",
                description: "Ticket to update does not exist",
                input: {
                    ticket_id: 99999999,
                    status: "pending"
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
                    ticket_id: 35436,
                    status: "pending"
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
        provider: "zendesk",
        validCases: [
            {
                name: "list_all_tickets",
                description: "List all tickets with default pagination",
                input: {
                    per_page: 25
                },
                expectedOutput: {
                    tickets: [sampleTicket],
                    count: 156,
                    next_page: "https://flowmaestro.zendesk.com/api/v2/tickets.json?page=2",
                    previous_page: null
                }
            },
            {
                name: "list_tickets_sorted",
                description: "List tickets sorted by updated date descending",
                input: {
                    per_page: 10,
                    sort_by: "updated_at",
                    sort_order: "desc"
                },
                expectedOutput: {
                    tickets: [sampleTicket],
                    count: 156,
                    next_page: "https://flowmaestro.zendesk.com/api/v2/tickets.json?page=2",
                    previous_page: null
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_page",
                description: "Invalid page number",
                input: {
                    page: -1
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid page number",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    per_page: 25
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
        operationId: "searchTickets",
        provider: "zendesk",
        validCases: [
            {
                name: "search_open_tickets",
                description: "Search for open tickets",
                input: {
                    query: "status:open"
                },
                expectedOutput: {
                    results: [sampleTicket],
                    count: 45,
                    next_page:
                        "https://flowmaestro.zendesk.com/api/v2/search.json?query=status:open&page=2",
                    previous_page: null
                }
            },
            {
                name: "search_by_requester",
                description: "Search tickets by requester email",
                input: {
                    query: "requester:john.smith@acmecorp.com"
                },
                expectedOutput: {
                    results: [sampleTicket],
                    count: 12,
                    next_page: null,
                    previous_page: null
                }
            },
            {
                name: "search_urgent_incidents",
                description: "Search for urgent incident tickets",
                input: {
                    query: "type:incident priority:urgent status:open"
                },
                expectedOutput: {
                    results: [sampleTicket],
                    count: 3,
                    next_page: null,
                    previous_page: null
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_query",
                description: "Invalid search query syntax",
                input: {
                    query: "status:"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid search query",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    query: "status:open"
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
        provider: "zendesk",
        validCases: [
            {
                name: "delete_ticket",
                description: "Permanently delete a ticket",
                input: {
                    ticket_id: 35440
                },
                expectedOutput: {
                    deleted: true
                }
            },
            {
                name: "delete_spam_ticket",
                description: "Delete a spam ticket",
                input: {
                    ticket_id: 35441
                },
                expectedOutput: {
                    deleted: true
                }
            }
        ],
        errorCases: [
            {
                name: "ticket_not_found",
                description: "Ticket to delete does not exist",
                input: {
                    ticket_id: 99999999
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
                    ticket_id: 35440
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
        operationId: "addTicketComment",
        provider: "zendesk",
        validCases: [
            {
                name: "add_public_comment",
                description: "Add a public comment to a ticket",
                input: {
                    ticket_id: 35436,
                    body: "Thank you for reaching out. We are investigating this issue.",
                    public: true
                },
                expectedOutput: {
                    ...sampleTicket,
                    updated_at: "2024-01-20T17:00:00Z"
                }
            },
            {
                name: "add_internal_note",
                description: "Add an internal note (private comment)",
                input: {
                    ticket_id: 35436,
                    body: "Customer is a VIP. Handle with priority.",
                    public: false
                },
                expectedOutput: {
                    ...sampleTicket,
                    updated_at: "2024-01-20T17:05:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "ticket_not_found",
                description: "Ticket to comment on does not exist",
                input: {
                    ticket_id: 99999999,
                    body: "Test comment"
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
                    ticket_id: 35436,
                    body: "Test comment"
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
        operationId: "createUser",
        provider: "zendesk",
        validCases: [
            {
                name: "create_end_user",
                description: "Create a new end-user",
                input: {
                    name: "Jane Doe",
                    email: "jane.doe@example.com"
                },
                expectedOutput: {
                    ...sampleUser,
                    id: 20978394,
                    url: "https://flowmaestro.zendesk.com/api/v2/users/20978394.json",
                    name: "Jane Doe",
                    email: "jane.doe@example.com",
                    organization_id: null,
                    external_id: null,
                    tags: [],
                    user_fields: {}
                }
            },
            {
                name: "create_user_with_details",
                description: "Create a user with organization and custom fields",
                input: {
                    name: "Bob Wilson",
                    email: "bob.wilson@bigcorp.com",
                    role: "end-user",
                    organization_id: 57543,
                    phone: "+1-555-987-6543",
                    time_zone: "America/Los_Angeles",
                    tags: ["enterprise", "premium"],
                    user_fields: {
                        company_size: "1000+",
                        industry: "Finance"
                    }
                },
                expectedOutput: {
                    ...sampleUser,
                    id: 20978395,
                    url: "https://flowmaestro.zendesk.com/api/v2/users/20978395.json",
                    name: "Bob Wilson",
                    email: "bob.wilson@bigcorp.com",
                    organization_id: 57543,
                    phone: "+1-555-987-6543",
                    time_zone: "America/Los_Angeles",
                    iana_time_zone: "America/Los_Angeles",
                    tags: ["enterprise", "premium"],
                    user_fields: {
                        company_size: "1000+",
                        industry: "Finance"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_email",
                description: "User with email already exists",
                input: {
                    name: "John Smith Duplicate",
                    email: "john.smith@acmecorp.com"
                },
                expectedError: {
                    type: "validation",
                    message: "Email already exists",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "Test User",
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
        operationId: "getUser",
        provider: "zendesk",
        validCases: [
            {
                name: "get_user_by_id",
                description: "Get a user by their ID",
                input: {
                    user_id: 20978392
                },
                expectedOutput: sampleUser
            },
            {
                name: "get_agent_user",
                description: "Get an agent user",
                input: {
                    user_id: 15284729
                },
                expectedOutput: {
                    ...sampleUser,
                    id: 15284729,
                    url: "https://flowmaestro.zendesk.com/api/v2/users/15284729.json",
                    name: "Support Agent",
                    email: "support.agent@flowmaestro.com",
                    role: "agent",
                    default_group_id: 22117439,
                    signature: "Best regards,\nSupport Team"
                }
            }
        ],
        errorCases: [
            {
                name: "user_not_found",
                description: "User does not exist",
                input: {
                    user_id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "User not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    user_id: 20978392
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
        operationId: "updateUser",
        provider: "zendesk",
        validCases: [
            {
                name: "update_user_phone",
                description: "Update user phone number",
                input: {
                    user_id: 20978392,
                    phone: "+1-555-999-8888"
                },
                expectedOutput: {
                    ...sampleUser,
                    phone: "+1-555-999-8888",
                    updated_at: "2024-01-20T18:00:00Z"
                }
            },
            {
                name: "update_user_organization",
                description: "Update user organization and tags",
                input: {
                    user_id: 20978392,
                    organization_id: 57544,
                    tags: ["vip", "enterprise", "priority"]
                },
                expectedOutput: {
                    ...sampleUser,
                    organization_id: 57544,
                    tags: ["vip", "enterprise", "priority"],
                    updated_at: "2024-01-20T18:05:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "user_not_found",
                description: "User to update does not exist",
                input: {
                    user_id: 99999999,
                    phone: "+1-555-000-0000"
                },
                expectedError: {
                    type: "not_found",
                    message: "User not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    user_id: 20978392,
                    phone: "+1-555-000-0000"
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
        operationId: "listUsers",
        provider: "zendesk",
        validCases: [
            {
                name: "list_all_users",
                description: "List all users with pagination",
                input: {
                    per_page: 25
                },
                expectedOutput: {
                    users: [sampleUser],
                    count: 1250,
                    next_page: "https://flowmaestro.zendesk.com/api/v2/users.json?page=2",
                    previous_page: null
                }
            },
            {
                name: "list_users_small_page",
                description: "List users with small page size",
                input: {
                    per_page: 5,
                    page: 1
                },
                expectedOutput: {
                    users: [sampleUser],
                    count: 1250,
                    next_page: "https://flowmaestro.zendesk.com/api/v2/users.json?page=2",
                    previous_page: null
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_page",
                description: "Invalid page number",
                input: {
                    page: -1
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid page number",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    per_page: 25
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
        operationId: "searchUsers",
        provider: "zendesk",
        validCases: [
            {
                name: "search_by_email",
                description: "Search users by email domain",
                input: {
                    query: "email:*@acmecorp.com"
                },
                expectedOutput: {
                    results: [sampleUser],
                    count: 15,
                    next_page: null,
                    previous_page: null
                }
            },
            {
                name: "search_agents",
                description: "Search for agent users",
                input: {
                    query: "role:agent"
                },
                expectedOutput: {
                    results: [
                        {
                            ...sampleUser,
                            id: 15284729,
                            name: "Support Agent",
                            role: "agent"
                        }
                    ],
                    count: 8,
                    next_page: null,
                    previous_page: null
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_query",
                description: "Invalid search query",
                input: {
                    query: "role:"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid search query",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    query: "role:agent"
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
        operationId: "getCurrentUser",
        provider: "zendesk",
        validCases: [
            {
                name: "get_current_user",
                description: "Get the authenticated user",
                input: {},
                expectedOutput: {
                    ...sampleUser,
                    id: 15284729,
                    name: "Support Agent",
                    email: "support.agent@flowmaestro.com",
                    role: "agent"
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Authentication token is invalid",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Unauthorized",
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
        operationId: "getArticle",
        provider: "zendesk",
        validCases: [
            {
                name: "get_article_by_id",
                description: "Get a Help Center article by ID",
                input: {
                    article_id: 360012345678
                },
                expectedOutput: sampleArticle
            },
            {
                name: "get_article_with_locale",
                description: "Get an article in a specific locale",
                input: {
                    article_id: 360012345678,
                    locale: "en-us"
                },
                expectedOutput: sampleArticle
            }
        ],
        errorCases: [
            {
                name: "article_not_found",
                description: "Article does not exist",
                input: {
                    article_id: 999999999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Article not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    article_id: 360012345678
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
        operationId: "listArticles",
        provider: "zendesk",
        validCases: [
            {
                name: "list_all_articles",
                description: "List all Help Center articles",
                input: {
                    per_page: 25
                },
                expectedOutput: {
                    articles: [sampleArticle],
                    count: 85,
                    next_page:
                        "https://flowmaestro.zendesk.com/api/v2/help_center/articles.json?page=2",
                    previous_page: null
                }
            },
            {
                name: "list_section_articles",
                description: "List articles in a specific section",
                input: {
                    section_id: 360001234567,
                    per_page: 10
                },
                expectedOutput: {
                    articles: [sampleArticle],
                    count: 12,
                    next_page: null,
                    previous_page: null
                }
            }
        ],
        errorCases: [
            {
                name: "section_not_found",
                description: "Section does not exist",
                input: {
                    section_id: 999999999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Section not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    per_page: 25
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
        operationId: "createArticle",
        provider: "zendesk",
        validCases: [
            {
                name: "create_article",
                description: "Create a new Help Center article",
                input: {
                    section_id: 360001234567,
                    title: "How to Reset Your Password",
                    body: "<p>Follow these steps to reset your password:</p><ol><li>Click on Forgot Password</li><li>Enter your email</li><li>Check your inbox</li></ol>"
                },
                expectedOutput: {
                    ...sampleArticle,
                    id: 360012345679,
                    url: "https://flowmaestro.zendesk.com/api/v2/help_center/articles/360012345679.json",
                    html_url: "https://flowmaestro.zendesk.com/hc/en-us/articles/360012345679",
                    name: "How to Reset Your Password",
                    title: "How to Reset Your Password",
                    body: "<p>Follow these steps to reset your password:</p><ol><li>Click on Forgot Password</li><li>Enter your email</li><li>Check your inbox</li></ol>",
                    draft: true,
                    promoted: false,
                    vote_sum: 0,
                    vote_count: 0,
                    label_names: []
                }
            },
            {
                name: "create_draft_article",
                description: "Create a draft article with labels",
                input: {
                    section_id: 360001234567,
                    title: "Advanced API Usage",
                    body: "<h1>Advanced API Guide</h1><p>This guide covers advanced API usage patterns.</p>",
                    draft: true,
                    label_names: ["api", "advanced", "developer"]
                },
                expectedOutput: {
                    ...sampleArticle,
                    id: 360012345680,
                    url: "https://flowmaestro.zendesk.com/api/v2/help_center/articles/360012345680.json",
                    html_url: "https://flowmaestro.zendesk.com/hc/en-us/articles/360012345680",
                    name: "Advanced API Usage",
                    title: "Advanced API Usage",
                    body: "<h1>Advanced API Guide</h1><p>This guide covers advanced API usage patterns.</p>",
                    draft: true,
                    promoted: false,
                    vote_sum: 0,
                    vote_count: 0,
                    label_names: ["api", "advanced", "developer"]
                }
            }
        ],
        errorCases: [
            {
                name: "section_not_found",
                description: "Section to create article in does not exist",
                input: {
                    section_id: 999999999999,
                    title: "Test Article",
                    body: "<p>Test content</p>"
                },
                expectedError: {
                    type: "not_found",
                    message: "Section not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    section_id: 360001234567,
                    title: "Test Article",
                    body: "<p>Test content</p>"
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
        operationId: "updateArticle",
        provider: "zendesk",
        validCases: [
            {
                name: "update_article_content",
                description: "Update article title and body",
                input: {
                    article_id: 360012345678,
                    title: "Getting Started with FlowMaestro - Updated",
                    body: "<h1>Welcome to FlowMaestro</h1><p>This updated guide will help you get started.</p>"
                },
                expectedOutput: {
                    ...sampleArticle,
                    title: "Getting Started with FlowMaestro - Updated",
                    name: "Getting Started with FlowMaestro - Updated",
                    body: "<h1>Welcome to FlowMaestro</h1><p>This updated guide will help you get started.</p>",
                    updated_at: "2024-01-20T19:00:00Z",
                    edited_at: "2024-01-20T19:00:00Z"
                }
            },
            {
                name: "publish_article",
                description: "Publish a draft article",
                input: {
                    article_id: 360012345680,
                    draft: false,
                    promoted: true
                },
                expectedOutput: {
                    ...sampleArticle,
                    id: 360012345680,
                    draft: false,
                    promoted: true,
                    updated_at: "2024-01-20T19:05:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "article_not_found",
                description: "Article to update does not exist",
                input: {
                    article_id: 999999999999,
                    title: "Updated Title"
                },
                expectedError: {
                    type: "not_found",
                    message: "Article not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    article_id: 360012345678,
                    title: "Updated Title"
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
        operationId: "searchArticles",
        provider: "zendesk",
        validCases: [
            {
                name: "search_by_keyword",
                description: "Search articles by keyword",
                input: {
                    query: "getting started"
                },
                expectedOutput: {
                    results: [sampleArticle],
                    count: 5,
                    next_page: null,
                    previous_page: null
                }
            },
            {
                name: "search_by_label",
                description: "Search articles with specific label",
                input: {
                    query: "tutorial",
                    label_names: "beginner"
                },
                expectedOutput: {
                    results: [sampleArticle],
                    count: 3,
                    next_page: null,
                    previous_page: null
                }
            }
        ],
        errorCases: [
            {
                name: "empty_query",
                description: "Empty search query",
                input: {
                    query: ""
                },
                expectedError: {
                    type: "validation",
                    message: "Query cannot be empty",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    query: "getting started"
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
        operationId: "listSections",
        provider: "zendesk",
        validCases: [
            {
                name: "list_all_sections",
                description: "List all Help Center sections",
                input: {
                    per_page: 25
                },
                expectedOutput: {
                    sections: [
                        {
                            id: 360001234567,
                            url: "https://flowmaestro.zendesk.com/api/v2/help_center/sections/360001234567.json",
                            html_url:
                                "https://flowmaestro.zendesk.com/hc/en-us/sections/360001234567",
                            category_id: 360000123456,
                            position: 0,
                            sorting: "manual",
                            created_at: "2023-01-15T10:00:00Z",
                            updated_at: "2024-01-10T14:00:00Z",
                            name: "Getting Started",
                            description: "Learn the basics of FlowMaestro",
                            locale: "en-us",
                            source_locale: "en-us",
                            outdated: false,
                            parent_section_id: null,
                            theme_template: "section_page"
                        }
                    ],
                    count: 12,
                    next_page: null,
                    previous_page: null
                }
            },
            {
                name: "list_category_sections",
                description: "List sections in a specific category",
                input: {
                    category_id: 360000123456
                },
                expectedOutput: {
                    sections: [
                        {
                            id: 360001234567,
                            url: "https://flowmaestro.zendesk.com/api/v2/help_center/sections/360001234567.json",
                            html_url:
                                "https://flowmaestro.zendesk.com/hc/en-us/sections/360001234567",
                            category_id: 360000123456,
                            position: 0,
                            sorting: "manual",
                            created_at: "2023-01-15T10:00:00Z",
                            updated_at: "2024-01-10T14:00:00Z",
                            name: "Getting Started",
                            description: "Learn the basics of FlowMaestro",
                            locale: "en-us",
                            source_locale: "en-us",
                            outdated: false,
                            parent_section_id: null,
                            theme_template: "section_page"
                        }
                    ],
                    count: 4,
                    next_page: null,
                    previous_page: null
                }
            }
        ],
        errorCases: [
            {
                name: "category_not_found",
                description: "Category does not exist",
                input: {
                    category_id: 999999999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Category not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    per_page: 25
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
        operationId: "listCategories",
        provider: "zendesk",
        validCases: [
            {
                name: "list_all_categories",
                description: "List all Help Center categories",
                input: {
                    per_page: 25
                },
                expectedOutput: {
                    categories: [
                        {
                            id: 360000123456,
                            url: "https://flowmaestro.zendesk.com/api/v2/help_center/categories/360000123456.json",
                            html_url:
                                "https://flowmaestro.zendesk.com/hc/en-us/categories/360000123456",
                            position: 0,
                            created_at: "2023-01-10T09:00:00Z",
                            updated_at: "2024-01-05T11:00:00Z",
                            name: "Documentation",
                            description: "Product documentation and guides",
                            locale: "en-us",
                            source_locale: "en-us",
                            outdated: false
                        },
                        {
                            id: 360000123457,
                            url: "https://flowmaestro.zendesk.com/api/v2/help_center/categories/360000123457.json",
                            html_url:
                                "https://flowmaestro.zendesk.com/hc/en-us/categories/360000123457",
                            position: 1,
                            created_at: "2023-01-10T09:05:00Z",
                            updated_at: "2024-01-05T11:05:00Z",
                            name: "FAQs",
                            description: "Frequently asked questions",
                            locale: "en-us",
                            source_locale: "en-us",
                            outdated: false
                        }
                    ],
                    count: 5,
                    next_page: null,
                    previous_page: null
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_locale",
                description: "Invalid locale specified",
                input: {
                    locale: "invalid-locale"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid locale",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    per_page: 25
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
