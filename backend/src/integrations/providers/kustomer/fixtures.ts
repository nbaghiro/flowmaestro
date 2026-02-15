/**
 * Kustomer Provider Test Fixtures
 *
 * Based on official Kustomer API documentation:
 * - Customers: https://developer.kustomer.com/docs/api/customers
 * - Conversations: https://developer.kustomer.com/docs/api/conversations
 * - Messages: https://developer.kustomer.com/docs/api/messages
 */

import type { TestFixture } from "../../sandbox";

export const kustomerFixtures: TestFixture[] = [
    // ============================================
    // Customer Operations
    // ============================================
    {
        operationId: "listCustomers",
        provider: "kustomer",
        validCases: [
            {
                name: "list_all_customers",
                description: "List all customers with default pagination",
                input: {},
                expectedOutput: {
                    customers: [
                        {
                            type: "customer",
                            id: "5f8d3c2a1b9e8f7a6c5d4e3b",
                            attributes: {
                                name: "John Smith",
                                displayName: "John Smith",
                                emails: [
                                    {
                                        email: "john.smith@acmecorp.com",
                                        type: "work",
                                        verified: true
                                    }
                                ],
                                phones: [{ phone: "+1-555-0123", type: "mobile", verified: false }],
                                company: "Acme Corp",
                                locale: "en_US",
                                timeZone: "America/New_York",
                                tags: ["enterprise", "priority"],
                                createdAt: "2024-01-15T10:30:00.000Z",
                                updatedAt: "2024-01-20T14:15:00.000Z"
                            }
                        },
                        {
                            type: "customer",
                            id: "5f8d3c2a1b9e8f7a6c5d4e3c",
                            attributes: {
                                name: "Emily Johnson",
                                displayName: "Emily Johnson",
                                emails: [
                                    { email: "emily.j@startupxyz.io", type: "work", verified: true }
                                ],
                                phones: [{ phone: "+1-555-0456", type: "work", verified: false }],
                                company: "Startup XYZ",
                                locale: "en_US",
                                timeZone: "America/Los_Angeles",
                                tags: ["startup"],
                                createdAt: "2024-01-10T08:00:00.000Z",
                                updatedAt: "2024-01-18T11:30:00.000Z"
                            }
                        }
                    ],
                    meta: {
                        total: 2
                    }
                }
            },
            {
                name: "list_with_pagination",
                description: "List customers with specific page and pageSize",
                input: { page: 2, pageSize: 10 },
                expectedOutput: {
                    customers: [],
                    meta: {
                        total: 15
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
        operationId: "getCustomer",
        provider: "kustomer",
        validCases: [
            {
                name: "get_customer_by_id",
                description: "Retrieve a specific customer by ID",
                input: {
                    customerId: "5f8d3c2a1b9e8f7a6c5d4e3b"
                },
                expectedOutput: {
                    type: "customer",
                    id: "5f8d3c2a1b9e8f7a6c5d4e3b",
                    attributes: {
                        name: "John Smith",
                        displayName: "John Smith",
                        externalId: "CRM-12345",
                        emails: [
                            { email: "john.smith@acmecorp.com", type: "work", verified: true }
                        ],
                        phones: [{ phone: "+1-555-0123", type: "mobile", verified: false }],
                        company: "Acme Corp",
                        locale: "en_US",
                        timeZone: "America/New_York",
                        tags: ["enterprise", "priority"],
                        lastActivityAt: "2024-01-20T14:00:00.000Z",
                        createdAt: "2024-01-15T10:30:00.000Z",
                        updatedAt: "2024-01-20T14:15:00.000Z"
                    },
                    relationships: {
                        conversations: {
                            data: [
                                { type: "conversation", id: "5f8d3c2a1b9e8f7a6c5d4e4a" },
                                { type: "conversation", id: "5f8d3c2a1b9e8f7a6c5d4e4b" }
                            ]
                        }
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Customer ID does not exist",
                input: {
                    customerId: "nonexistent123456789012"
                },
                expectedError: {
                    type: "not_found",
                    message: "Customer not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    customerId: "5f8d3c2a1b9e8f7a6c5d4e3b"
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
        operationId: "createCustomer",
        provider: "kustomer",
        validCases: [
            {
                name: "create_customer_basic",
                description: "Create a customer with basic information",
                input: {
                    name: "Jane Doe",
                    email: "jane.doe@example.com"
                },
                expectedOutput: {
                    type: "customer",
                    id: "5f8d3c2a1b9e8f7a6c5d4e3d",
                    attributes: {
                        name: "Jane Doe",
                        displayName: "Jane Doe",
                        emails: [{ email: "jane.doe@example.com", type: "home", verified: false }],
                        createdAt: "{{iso}}",
                        updatedAt: "{{iso}}"
                    }
                }
            },
            {
                name: "create_customer_full",
                description: "Create a customer with all details",
                input: {
                    name: "Michael Brown",
                    email: "m.brown@enterprise.com",
                    phone: "+1-555-0789",
                    company: "Enterprise Solutions",
                    locale: "en_US",
                    timeZone: "America/Chicago",
                    tags: ["vip", "enterprise"]
                },
                expectedOutput: {
                    type: "customer",
                    id: "5f8d3c2a1b9e8f7a6c5d4e3e",
                    attributes: {
                        name: "Michael Brown",
                        displayName: "Michael Brown",
                        emails: [
                            { email: "m.brown@enterprise.com", type: "home", verified: false }
                        ],
                        phones: [{ phone: "+1-555-0789", type: "home", verified: false }],
                        company: "Enterprise Solutions",
                        locale: "en_US",
                        timeZone: "America/Chicago",
                        tags: ["vip", "enterprise"],
                        createdAt: "{{iso}}",
                        updatedAt: "{{iso}}"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "validation",
                description: "Invalid email format",
                input: {
                    name: "Test User",
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
        operationId: "updateCustomer",
        provider: "kustomer",
        validCases: [
            {
                name: "update_customer_name",
                description: "Update customer name",
                input: {
                    customerId: "5f8d3c2a1b9e8f7a6c5d4e3b",
                    name: "John A. Smith"
                },
                expectedOutput: {
                    type: "customer",
                    id: "5f8d3c2a1b9e8f7a6c5d4e3b",
                    attributes: {
                        name: "John A. Smith",
                        displayName: "John A. Smith",
                        emails: [
                            { email: "john.smith@acmecorp.com", type: "work", verified: true }
                        ],
                        updatedAt: "{{iso}}"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Customer ID does not exist",
                input: {
                    customerId: "nonexistent123456789012",
                    name: "Updated Name"
                },
                expectedError: {
                    type: "not_found",
                    message: "Customer not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    customerId: "5f8d3c2a1b9e8f7a6c5d4e3b",
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
        operationId: "deleteCustomer",
        provider: "kustomer",
        validCases: [
            {
                name: "delete_customer",
                description: "Delete a customer",
                input: {
                    customerId: "5f8d3c2a1b9e8f7a6c5d4e3b"
                },
                expectedOutput: {
                    deleted: true,
                    customerId: "5f8d3c2a1b9e8f7a6c5d4e3b"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Customer ID does not exist",
                input: {
                    customerId: "nonexistent123456789012"
                },
                expectedError: {
                    type: "not_found",
                    message: "Customer not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    customerId: "5f8d3c2a1b9e8f7a6c5d4e3b"
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
        operationId: "searchCustomers",
        provider: "kustomer",
        validCases: [
            {
                name: "search_by_email",
                description: "Search customers by email domain",
                input: {
                    query: {
                        and: [{ "emails.email": { $contains: "@acmecorp.com" } }]
                    }
                },
                expectedOutput: {
                    customers: [
                        {
                            type: "customer",
                            id: "5f8d3c2a1b9e8f7a6c5d4e3b",
                            attributes: {
                                name: "John Smith",
                                emails: [
                                    {
                                        email: "john.smith@acmecorp.com",
                                        type: "work",
                                        verified: true
                                    }
                                ],
                                company: "Acme Corp"
                            }
                        }
                    ],
                    meta: { total: 1 }
                }
            }
        ],
        errorCases: [
            {
                name: "validation",
                description: "Invalid search query",
                input: {
                    query: { invalid: "query" }
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
                    query: { and: [] }
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
    // Conversation Operations
    // ============================================
    {
        operationId: "listConversations",
        provider: "kustomer",
        validCases: [
            {
                name: "list_all_conversations",
                description: "List all conversations",
                input: {},
                expectedOutput: {
                    conversations: [
                        {
                            type: "conversation",
                            id: "5f8d3c2a1b9e8f7a6c5d4e4a",
                            attributes: {
                                name: "Billing inquiry",
                                preview: "I have a question about my invoice...",
                                status: "open",
                                priority: 3,
                                channel: "email",
                                direction: "in",
                                messageCount: 5,
                                tags: ["billing", "urgent"],
                                createdAt: "2024-01-18T09:00:00.000Z",
                                updatedAt: "2024-01-20T15:30:00.000Z"
                            },
                            relationships: {
                                customer: {
                                    data: { type: "customer", id: "5f8d3c2a1b9e8f7a6c5d4e3b" }
                                }
                            }
                        },
                        {
                            type: "conversation",
                            id: "5f8d3c2a1b9e8f7a6c5d4e4b",
                            attributes: {
                                name: "Technical support",
                                preview: "My integration is not working...",
                                status: "snoozed",
                                priority: 4,
                                channel: "chat",
                                direction: "in",
                                messageCount: 12,
                                tags: ["technical", "integration"],
                                createdAt: "2024-01-15T14:00:00.000Z",
                                updatedAt: "2024-01-19T10:00:00.000Z"
                            },
                            relationships: {
                                customer: {
                                    data: { type: "customer", id: "5f8d3c2a1b9e8f7a6c5d4e3c" }
                                }
                            }
                        }
                    ],
                    meta: { total: 2 }
                }
            },
            {
                name: "list_open_conversations",
                description: "List only open conversations",
                input: { status: "open" },
                expectedOutput: {
                    conversations: [
                        {
                            type: "conversation",
                            id: "5f8d3c2a1b9e8f7a6c5d4e4a",
                            attributes: {
                                name: "Billing inquiry",
                                status: "open",
                                priority: 3
                            }
                        }
                    ],
                    meta: { total: 1 }
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
        operationId: "getConversation",
        provider: "kustomer",
        validCases: [
            {
                name: "get_conversation_by_id",
                description: "Retrieve a specific conversation by ID",
                input: {
                    conversationId: "5f8d3c2a1b9e8f7a6c5d4e4a"
                },
                expectedOutput: {
                    type: "conversation",
                    id: "5f8d3c2a1b9e8f7a6c5d4e4a",
                    attributes: {
                        name: "Billing inquiry",
                        preview: "I have a question about my invoice...",
                        status: "open",
                        priority: 3,
                        channel: "email",
                        direction: "in",
                        messageCount: 5,
                        noteCount: 2,
                        tags: ["billing", "urgent"],
                        assignedUsers: ["agent123"],
                        firstResponse: {
                            respondedAt: "2024-01-18T09:30:00.000Z",
                            responseTime: 1800
                        },
                        createdAt: "2024-01-18T09:00:00.000Z",
                        updatedAt: "2024-01-20T15:30:00.000Z"
                    },
                    relationships: {
                        customer: {
                            data: { type: "customer", id: "5f8d3c2a1b9e8f7a6c5d4e3b" }
                        },
                        messages: {
                            data: [
                                { type: "message", id: "5f8d3c2a1b9e8f7a6c5d4e5a" },
                                { type: "message", id: "5f8d3c2a1b9e8f7a6c5d4e5b" }
                            ]
                        }
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Conversation ID does not exist",
                input: {
                    conversationId: "nonexistent123456789012"
                },
                expectedError: {
                    type: "not_found",
                    message: "Conversation not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    conversationId: "5f8d3c2a1b9e8f7a6c5d4e4a"
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
        operationId: "createConversation",
        provider: "kustomer",
        validCases: [
            {
                name: "create_conversation_basic",
                description: "Create a conversation with basic information",
                input: {
                    customerId: "5f8d3c2a1b9e8f7a6c5d4e3b",
                    name: "New support request"
                },
                expectedOutput: {
                    type: "conversation",
                    id: "5f8d3c2a1b9e8f7a6c5d4e4c",
                    attributes: {
                        name: "New support request",
                        status: "open",
                        messageCount: 0,
                        createdAt: "{{iso}}",
                        updatedAt: "{{iso}}"
                    },
                    relationships: {
                        customer: {
                            data: { type: "customer", id: "5f8d3c2a1b9e8f7a6c5d4e3b" }
                        }
                    }
                }
            },
            {
                name: "create_conversation_full",
                description: "Create a conversation with all options",
                input: {
                    customerId: "5f8d3c2a1b9e8f7a6c5d4e3b",
                    name: "Urgent billing issue",
                    channel: "email",
                    direction: "in",
                    status: "open",
                    priority: 5,
                    tags: ["billing", "urgent", "escalated"]
                },
                expectedOutput: {
                    type: "conversation",
                    id: "5f8d3c2a1b9e8f7a6c5d4e4d",
                    attributes: {
                        name: "Urgent billing issue",
                        status: "open",
                        priority: 5,
                        channel: "email",
                        direction: "in",
                        tags: ["billing", "urgent", "escalated"],
                        createdAt: "{{iso}}",
                        updatedAt: "{{iso}}"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Customer ID does not exist",
                input: {
                    customerId: "nonexistent123456789012",
                    name: "Test conversation"
                },
                expectedError: {
                    type: "not_found",
                    message: "Customer not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    customerId: "5f8d3c2a1b9e8f7a6c5d4e3b",
                    name: "Test"
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
        operationId: "updateConversation",
        provider: "kustomer",
        validCases: [
            {
                name: "update_conversation_status",
                description: "Update conversation status to done",
                input: {
                    conversationId: "5f8d3c2a1b9e8f7a6c5d4e4a",
                    status: "done"
                },
                expectedOutput: {
                    type: "conversation",
                    id: "5f8d3c2a1b9e8f7a6c5d4e4a",
                    attributes: {
                        name: "Billing inquiry",
                        status: "done",
                        updatedAt: "{{iso}}",
                        closedAt: "{{iso}}"
                    }
                }
            },
            {
                name: "update_conversation_priority",
                description: "Update conversation priority",
                input: {
                    conversationId: "5f8d3c2a1b9e8f7a6c5d4e4a",
                    priority: 5
                },
                expectedOutput: {
                    type: "conversation",
                    id: "5f8d3c2a1b9e8f7a6c5d4e4a",
                    attributes: {
                        name: "Billing inquiry",
                        priority: 5,
                        updatedAt: "{{iso}}"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Conversation ID does not exist",
                input: {
                    conversationId: "nonexistent123456789012",
                    status: "done"
                },
                expectedError: {
                    type: "not_found",
                    message: "Conversation not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    conversationId: "5f8d3c2a1b9e8f7a6c5d4e4a",
                    status: "done"
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
        operationId: "addConversationTags",
        provider: "kustomer",
        validCases: [
            {
                name: "add_tags",
                description: "Add tags to a conversation",
                input: {
                    conversationId: "5f8d3c2a1b9e8f7a6c5d4e4a",
                    tags: ["escalated", "needs-review"]
                },
                expectedOutput: {
                    type: "conversation",
                    id: "5f8d3c2a1b9e8f7a6c5d4e4a",
                    attributes: {
                        tags: ["billing", "urgent", "escalated", "needs-review"],
                        updatedAt: "{{iso}}"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Conversation ID does not exist",
                input: {
                    conversationId: "nonexistent123456789012",
                    tags: ["test"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Conversation not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    conversationId: "5f8d3c2a1b9e8f7a6c5d4e4a",
                    tags: ["test"]
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
        operationId: "removeConversationTags",
        provider: "kustomer",
        validCases: [
            {
                name: "remove_tags",
                description: "Remove tags from a conversation",
                input: {
                    conversationId: "5f8d3c2a1b9e8f7a6c5d4e4a",
                    tags: ["urgent"]
                },
                expectedOutput: {
                    conversationId: "5f8d3c2a1b9e8f7a6c5d4e4a",
                    removedTags: ["urgent"]
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Conversation ID does not exist",
                input: {
                    conversationId: "nonexistent123456789012",
                    tags: ["test"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Conversation not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    conversationId: "5f8d3c2a1b9e8f7a6c5d4e4a",
                    tags: ["test"]
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
    // Message Operations
    // ============================================
    {
        operationId: "listMessages",
        provider: "kustomer",
        validCases: [
            {
                name: "list_conversation_messages",
                description: "List all messages in a conversation",
                input: {
                    conversationId: "5f8d3c2a1b9e8f7a6c5d4e4a"
                },
                expectedOutput: {
                    messages: [
                        {
                            type: "message",
                            id: "5f8d3c2a1b9e8f7a6c5d4e5a",
                            attributes: {
                                channel: "email",
                                direction: "in",
                                preview: "I have a question about my invoice...",
                                body: "I have a question about my invoice. The amount seems incorrect.",
                                subject: "Invoice Question",
                                sentAt: "2024-01-18T09:00:00.000Z",
                                createdAt: "2024-01-18T09:00:00.000Z"
                            },
                            relationships: {
                                conversation: {
                                    data: { type: "conversation", id: "5f8d3c2a1b9e8f7a6c5d4e4a" }
                                },
                                customer: {
                                    data: { type: "customer", id: "5f8d3c2a1b9e8f7a6c5d4e3b" }
                                }
                            }
                        },
                        {
                            type: "message",
                            id: "5f8d3c2a1b9e8f7a6c5d4e5b",
                            attributes: {
                                channel: "email",
                                direction: "out",
                                preview: "Thank you for reaching out...",
                                body: "Thank you for reaching out. Let me check your invoice.",
                                subject: "Re: Invoice Question",
                                sentAt: "2024-01-18T09:30:00.000Z",
                                createdAt: "2024-01-18T09:30:00.000Z"
                            },
                            relationships: {
                                conversation: {
                                    data: { type: "conversation", id: "5f8d3c2a1b9e8f7a6c5d4e4a" }
                                },
                                createdBy: {
                                    data: { type: "user", id: "agent123" }
                                }
                            }
                        }
                    ],
                    meta: { total: 2 }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Conversation ID does not exist",
                input: {
                    conversationId: "nonexistent123456789012"
                },
                expectedError: {
                    type: "not_found",
                    message: "Conversation not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    conversationId: "5f8d3c2a1b9e8f7a6c5d4e4a"
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
        operationId: "createMessage",
        provider: "kustomer",
        validCases: [
            {
                name: "create_message_basic",
                description: "Create a basic message in a conversation",
                input: {
                    conversationId: "5f8d3c2a1b9e8f7a6c5d4e4a",
                    body: "Thank you for your patience. Your issue has been resolved."
                },
                expectedOutput: {
                    type: "message",
                    id: "5f8d3c2a1b9e8f7a6c5d4e5c",
                    attributes: {
                        body: "Thank you for your patience. Your issue has been resolved.",
                        direction: "out",
                        createdAt: "{{iso}}",
                        sentAt: "{{iso}}"
                    },
                    relationships: {
                        conversation: {
                            data: { type: "conversation", id: "5f8d3c2a1b9e8f7a6c5d4e4a" }
                        }
                    }
                }
            },
            {
                name: "create_message_with_options",
                description: "Create a message with channel and subject",
                input: {
                    conversationId: "5f8d3c2a1b9e8f7a6c5d4e4a",
                    channel: "email",
                    direction: "out",
                    subject: "Re: Your Support Request",
                    body: "We have processed your refund.",
                    bodyHtml: "<p>We have processed your <strong>refund</strong>.</p>"
                },
                expectedOutput: {
                    type: "message",
                    id: "5f8d3c2a1b9e8f7a6c5d4e5d",
                    attributes: {
                        channel: "email",
                        direction: "out",
                        subject: "Re: Your Support Request",
                        body: "We have processed your refund.",
                        bodyHtml: "<p>We have processed your <strong>refund</strong>.</p>",
                        createdAt: "{{iso}}",
                        sentAt: "{{iso}}"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Conversation ID does not exist",
                input: {
                    conversationId: "nonexistent123456789012",
                    body: "Test message"
                },
                expectedError: {
                    type: "not_found",
                    message: "Conversation not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    conversationId: "5f8d3c2a1b9e8f7a6c5d4e4a",
                    body: "Test"
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
        operationId: "createMessageByCustomer",
        provider: "kustomer",
        validCases: [
            {
                name: "create_message_for_customer",
                description: "Create a message for a customer (creates new conversation if needed)",
                input: {
                    customerId: "5f8d3c2a1b9e8f7a6c5d4e3b",
                    body: "Hello, I need help with my account."
                },
                expectedOutput: {
                    type: "message",
                    id: "5f8d3c2a1b9e8f7a6c5d4e5e",
                    attributes: {
                        body: "Hello, I need help with my account.",
                        direction: "in",
                        createdAt: "{{iso}}"
                    },
                    relationships: {
                        customer: {
                            data: { type: "customer", id: "5f8d3c2a1b9e8f7a6c5d4e3b" }
                        },
                        conversation: {
                            data: { type: "conversation", id: "5f8d3c2a1b9e8f7a6c5d4e4e" }
                        }
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Customer ID does not exist",
                input: {
                    customerId: "nonexistent123456789012",
                    body: "Test message"
                },
                expectedError: {
                    type: "not_found",
                    message: "Customer not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    customerId: "5f8d3c2a1b9e8f7a6c5d4e3b",
                    body: "Test"
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
