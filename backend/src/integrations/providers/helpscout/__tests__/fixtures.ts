/**
 * Help Scout Provider Test Fixtures
 *
 * Based on Help Scout Mailbox API v2:
 * https://developer.helpscout.com/mailbox-api/
 */

import type { TestFixture } from "../../../sandbox";

export const helpscoutFixtures: TestFixture[] = [
    // ============================================================================
    // CONVERSATIONS
    // ============================================================================
    {
        operationId: "listConversations",
        provider: "helpscout",
        validCases: [
            {
                name: "list_active_conversations",
                description: "List active conversations in a mailbox",
                input: {
                    status: "active",
                    page: 1
                },
                expectedOutput: {
                    conversations: [
                        {
                            id: 12345,
                            number: 100,
                            type: "email",
                            status: "active",
                            subject: "Cannot login to account",
                            preview: "I'm having trouble logging into my account...",
                            mailboxId: 1,
                            assignee: {
                                id: 10,
                                first: "Jane",
                                last: "Doe",
                                email: "jane@company.com"
                            },
                            primaryCustomer: {
                                id: 200,
                                first: "John",
                                last: "Smith",
                                email: "john@example.com"
                            },
                            tags: [{ id: 1, tag: "billing" }],
                            createdAt: "2024-06-15T14:30:00Z"
                        }
                    ],
                    page: {
                        size: 50,
                        totalElements: 1,
                        totalPages: 1,
                        number: 1
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { page: 1 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by Help Scout. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getConversation",
        provider: "helpscout",
        validCases: [
            {
                name: "get_conversation_with_threads",
                description: "Get conversation with embedded threads",
                input: { conversation_id: 12345 },
                expectedOutput: {
                    id: 12345,
                    number: 100,
                    type: "email",
                    status: "active",
                    subject: "Cannot login to account",
                    mailboxId: 1,
                    assignee: {
                        id: 10,
                        first: "Jane",
                        last: "Doe",
                        email: "jane@company.com"
                    },
                    primaryCustomer: {
                        id: 200,
                        first: "John",
                        last: "Smith",
                        email: "john@example.com"
                    },
                    threads: [
                        {
                            id: 5001,
                            type: "customer",
                            status: "active",
                            body: "I'm having trouble logging into my account.",
                            createdBy: { id: 200, type: "customer", email: "john@example.com" },
                            createdAt: "2024-06-15T14:30:00Z"
                        }
                    ],
                    createdAt: "2024-06-15T14:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Conversation does not exist",
                input: { conversation_id: 99999 },
                expectedError: {
                    type: "not_found",
                    message: "Help Scout API error: Resource not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createConversation",
        provider: "helpscout",
        validCases: [
            {
                name: "create_email_conversation",
                description: "Create a new email conversation",
                input: {
                    subject: "New support request",
                    type: "email",
                    mailboxId: 1,
                    customer: { email: "customer@example.com" },
                    threads: [{ type: "customer", text: "I need help with my order" }]
                },
                expectedOutput: {
                    created: true
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_mailbox",
                description: "Mailbox does not exist",
                input: {
                    subject: "Test",
                    type: "email",
                    mailboxId: 99999,
                    customer: { email: "test@example.com" },
                    threads: [{ type: "customer", text: "Test" }]
                },
                expectedError: {
                    type: "validation",
                    message: "Help Scout API error: Mailbox not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updateConversation",
        provider: "helpscout",
        validCases: [
            {
                name: "update_conversation_status",
                description: "Update conversation status to closed",
                input: {
                    conversation_id: 12345,
                    op: "replace",
                    path: "/status",
                    value: "closed"
                },
                expectedOutput: {
                    conversationId: 12345,
                    updated: true,
                    field: "/status",
                    value: "closed"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Conversation does not exist",
                input: {
                    conversation_id: 99999,
                    op: "replace",
                    path: "/status",
                    value: "closed"
                },
                expectedError: {
                    type: "not_found",
                    message: "Help Scout API error: Resource not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "deleteConversation",
        provider: "helpscout",
        validCases: [
            {
                name: "delete_conversation",
                description: "Delete a conversation (move to trash)",
                input: { conversation_id: 12345 },
                expectedOutput: {
                    conversationId: 12345,
                    deleted: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Conversation does not exist",
                input: { conversation_id: 99999 },
                expectedError: {
                    type: "not_found",
                    message: "Help Scout API error: Resource not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "replyToConversation",
        provider: "helpscout",
        validCases: [
            {
                name: "reply_to_customer",
                description: "Send a reply to a conversation",
                input: {
                    conversation_id: 12345,
                    text: "Thank you for reaching out. Let me help you.",
                    customer: { email: "john@example.com" }
                },
                expectedOutput: {
                    conversationId: 12345,
                    replied: true,
                    draft: false
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    conversation_id: 12345,
                    text: "Reply",
                    customer: { email: "test@example.com" }
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by Help Scout. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "addNoteToConversation",
        provider: "helpscout",
        validCases: [
            {
                name: "add_internal_note",
                description: "Add an internal note to a conversation",
                input: {
                    conversation_id: 12345,
                    text: "Customer has been contacted via phone."
                },
                expectedOutput: {
                    conversationId: 12345,
                    noteAdded: true
                }
            }
        ],
        errorCases: []
    },

    {
        operationId: "updateConversationTags",
        provider: "helpscout",
        validCases: [
            {
                name: "set_tags_on_conversation",
                description: "Replace all tags on a conversation",
                input: {
                    conversation_id: 12345,
                    tags: ["billing", "urgent", "vip"]
                },
                expectedOutput: {
                    conversationId: 12345,
                    tags: ["billing", "urgent", "vip"],
                    updated: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Conversation does not exist",
                input: {
                    conversation_id: 99999,
                    tags: ["test"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Help Scout API error: Resource not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================================================
    // CUSTOMERS
    // ============================================================================
    {
        operationId: "listCustomers",
        provider: "helpscout",
        validCases: [
            {
                name: "list_all_customers",
                description: "List all customers",
                input: { page: 1 },
                expectedOutput: {
                    customers: [
                        {
                            id: 200,
                            firstName: "John",
                            lastName: "Smith",
                            organization: "Acme Corp",
                            emails: [{ id: 1, value: "john@example.com", type: "work" }],
                            createdAt: "2024-01-15T10:00:00Z",
                            updatedAt: "2024-06-15T14:30:00Z"
                        }
                    ],
                    page: {
                        size: 50,
                        totalElements: 1,
                        totalPages: 1,
                        number: 1
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { page: 1 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by Help Scout. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getCustomer",
        provider: "helpscout",
        validCases: [
            {
                name: "get_customer_details",
                description: "Get full customer details",
                input: { customer_id: 200 },
                expectedOutput: {
                    id: 200,
                    firstName: "John",
                    lastName: "Smith",
                    organization: "Acme Corp",
                    jobTitle: "CTO",
                    location: "San Francisco, CA",
                    emails: [{ id: 1, value: "john@example.com", type: "work" }],
                    phones: [{ id: 1, value: "+14155551234", type: "work" }],
                    createdAt: "2024-01-15T10:00:00Z",
                    updatedAt: "2024-06-15T14:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Customer does not exist",
                input: { customer_id: 99999 },
                expectedError: {
                    type: "not_found",
                    message: "Help Scout API error: Resource not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createCustomer",
        provider: "helpscout",
        validCases: [
            {
                name: "create_customer_with_email",
                description: "Create a new customer with email",
                input: {
                    firstName: "Alice",
                    lastName: "Johnson",
                    emails: [{ type: "work", value: "alice@example.com" }],
                    organization: "Tech Corp"
                },
                expectedOutput: {
                    created: true
                }
            }
        ],
        errorCases: []
    },

    {
        operationId: "updateCustomer",
        provider: "helpscout",
        validCases: [
            {
                name: "update_customer_details",
                description: "Update customer name and organization",
                input: {
                    customer_id: 200,
                    firstName: "John",
                    lastName: "Smith-Jones",
                    organization: "Acme Corp International"
                },
                expectedOutput: {
                    customerId: 200,
                    updated: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Customer does not exist",
                input: {
                    customer_id: 99999,
                    firstName: "Test"
                },
                expectedError: {
                    type: "not_found",
                    message: "Help Scout API error: Resource not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "searchCustomers",
        provider: "helpscout",
        validCases: [
            {
                name: "search_by_email",
                description: "Search customers by email address",
                input: {
                    query: "email:john@example.com",
                    page: 1
                },
                expectedOutput: {
                    customers: [
                        {
                            id: 200,
                            firstName: "John",
                            lastName: "Smith",
                            organization: "Acme Corp",
                            emails: [{ id: 1, value: "john@example.com", type: "work" }],
                            createdAt: "2024-01-15T10:00:00Z",
                            updatedAt: "2024-06-15T14:30:00Z"
                        }
                    ],
                    page: {
                        size: 50,
                        totalElements: 1,
                        totalPages: 1,
                        number: 1
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { query: "email:test@example.com" },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by Help Scout. Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // MAILBOXES
    // ============================================================================
    {
        operationId: "listMailboxes",
        provider: "helpscout",
        validCases: [
            {
                name: "list_all_mailboxes",
                description: "List all mailboxes",
                input: { page: 1 },
                expectedOutput: {
                    mailboxes: [
                        {
                            id: 1,
                            name: "Support",
                            slug: "support",
                            email: "support@company.com",
                            createdAt: "2024-01-01T00:00:00Z",
                            updatedAt: "2024-06-01T00:00:00Z"
                        }
                    ],
                    page: {
                        size: 50,
                        totalElements: 1,
                        totalPages: 1,
                        number: 1
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { page: 1 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by Help Scout. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getMailbox",
        provider: "helpscout",
        validCases: [
            {
                name: "get_mailbox_details",
                description: "Get mailbox details",
                input: { mailbox_id: 1 },
                expectedOutput: {
                    id: 1,
                    name: "Support",
                    slug: "support",
                    email: "support@company.com",
                    createdAt: "2024-01-01T00:00:00Z",
                    updatedAt: "2024-06-01T00:00:00Z"
                }
            }
        ],
        errorCases: []
    },

    // ============================================================================
    // USERS
    // ============================================================================
    {
        operationId: "listUsers",
        provider: "helpscout",
        validCases: [
            {
                name: "list_all_users",
                description: "List all Help Scout users",
                input: { page: 1 },
                expectedOutput: {
                    users: [
                        {
                            id: 10,
                            firstName: "Jane",
                            lastName: "Doe",
                            email: "jane@company.com",
                            role: "admin",
                            timezone: "America/New_York",
                            createdAt: "2024-01-01T00:00:00Z",
                            updatedAt: "2024-06-01T00:00:00Z"
                        }
                    ],
                    page: {
                        size: 50,
                        totalElements: 1,
                        totalPages: 1,
                        number: 1
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { page: 1 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by Help Scout. Please try again later.",
                    retryable: true
                }
            }
        ]
    }
];
