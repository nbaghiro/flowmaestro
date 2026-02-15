/**
 * Gorgias Integration Fixtures
 *
 * Test fixtures for all Gorgias operations
 */

import type { TestFixture } from "../../sandbox";

export const gorgiasFixtures: TestFixture[] = [
    // ============================================
    // List Tickets
    // ============================================
    {
        operationId: "listTickets",
        provider: "gorgias",
        validCases: [
            {
                name: "list_basic",
                input: {},
                expectedOutput: {
                    tickets: [
                        {
                            id: 12345,
                            status: "open",
                            priority: "normal",
                            channel: "email",
                            subject: "Order not received",
                            customer: { id: 67890, email: "john@example.com" }
                        }
                    ],
                    pagination: { next_cursor: "abc123", prev_cursor: null }
                }
            },
            {
                name: "list_with_filters",
                input: { status: "open", limit: 50 },
                expectedOutput: {
                    tickets: [],
                    pagination: { next_cursor: null, prev_cursor: null }
                }
            },
            {
                name: "list_with_pagination",
                input: { cursor: "abc123", limit: 25 },
                expectedOutput: {
                    tickets: [
                        {
                            id: 12346,
                            status: "closed",
                            priority: "high",
                            channel: "chat"
                        }
                    ],
                    pagination: { next_cursor: "def456", prev_cursor: "abc123" }
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limit",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Gorgias rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================
    // Get Ticket
    // ============================================
    {
        operationId: "getTicket",
        provider: "gorgias",
        validCases: [
            {
                name: "get_basic",
                input: { ticketId: 12345 },
                expectedOutput: {
                    id: 12345,
                    uri: "/api/tickets/12345",
                    status: "open",
                    priority: "normal",
                    channel: "email",
                    subject: "Order not received",
                    customer: { id: 67890, email: "john@example.com", name: "John Doe" },
                    assignee_user: { id: 111, email: "agent@company.com" },
                    tags: [{ id: 1, name: "shipping" }],
                    messages_count: 3,
                    created_datetime: "2024-01-15T10:00:00Z",
                    updated_datetime: "2024-01-15T14:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                input: { ticketId: 99999 },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Gorgias.",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // Create Ticket
    // ============================================
    {
        operationId: "createTicket",
        provider: "gorgias",
        validCases: [
            {
                name: "create_basic",
                input: {
                    customer: { email: "jane@example.com" },
                    subject: "Product inquiry",
                    channel: "email",
                    messages: [{ body_text: "I have a question about your product..." }]
                },
                expectedOutput: {
                    id: 12347,
                    status: "open",
                    priority: "normal",
                    channel: "email",
                    subject: "Product inquiry",
                    customer: { id: 67891, email: "jane@example.com" }
                }
            },
            {
                name: "create_with_assignment",
                input: {
                    customer: { id: 67890 },
                    subject: "Urgent: Missing item",
                    channel: "api",
                    priority: "high",
                    assignee_user_id: 111,
                    tags: [{ id: 1 }]
                },
                expectedOutput: {
                    id: 12348,
                    status: "open",
                    priority: "high",
                    channel: "api",
                    assignee_user: { id: 111 }
                }
            }
        ],
        errorCases: [
            {
                name: "validation_missing_customer",
                input: { subject: "No customer" },
                expectedError: {
                    type: "validation",
                    message: "Customer is required",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // Update Ticket
    // ============================================
    {
        operationId: "updateTicket",
        provider: "gorgias",
        validCases: [
            {
                name: "update_status",
                input: { ticketId: 12345, status: "closed" },
                expectedOutput: {
                    id: 12345,
                    status: "closed"
                }
            },
            {
                name: "update_assignment",
                input: { ticketId: 12345, assignee_user_id: 222, priority: "urgent" },
                expectedOutput: {
                    id: 12345,
                    priority: "urgent",
                    assignee_user: { id: 222 }
                }
            },
            {
                name: "unassign_ticket",
                input: { ticketId: 12345, assignee_user_id: null },
                expectedOutput: {
                    id: 12345,
                    assignee_user: null
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                input: { ticketId: 99999, status: "closed" },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Gorgias.",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // Search Tickets
    // ============================================
    {
        operationId: "searchTickets",
        provider: "gorgias",
        validCases: [
            {
                name: "search_by_status_and_channel",
                input: { status: "open", channel: "email", limit: 50 },
                expectedOutput: {
                    tickets: [{ id: 12345, status: "open", channel: "email" }],
                    pagination: { next_cursor: null, prev_cursor: null }
                }
            },
            {
                name: "search_by_date_range",
                input: {
                    created_after: "2024-01-01T00:00:00Z",
                    created_before: "2024-01-31T23:59:59Z"
                },
                expectedOutput: {
                    tickets: [],
                    pagination: { next_cursor: null, prev_cursor: null }
                }
            },
            {
                name: "search_by_assignee",
                input: { assignee_user_id: 111 },
                expectedOutput: {
                    tickets: [{ id: 12345, assignee_user: { id: 111 } }],
                    pagination: null
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limit",
                input: { status: "open" },
                expectedError: {
                    type: "rate_limit",
                    message: "Gorgias rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================
    // List Customers
    // ============================================
    {
        operationId: "listCustomers",
        provider: "gorgias",
        validCases: [
            {
                name: "list_basic",
                input: {},
                expectedOutput: {
                    customers: [
                        {
                            id: 67890,
                            email: "john@example.com",
                            name: "John Doe",
                            channels: [{ type: "email", address: "john@example.com" }]
                        }
                    ],
                    pagination: { next_cursor: "cust_abc", prev_cursor: null }
                }
            },
            {
                name: "list_with_pagination",
                input: { limit: 25, cursor: "cust_abc" },
                expectedOutput: {
                    customers: [],
                    pagination: { next_cursor: null, prev_cursor: "cust_abc" }
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limit",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Gorgias rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================
    // Get Customer
    // ============================================
    {
        operationId: "getCustomer",
        provider: "gorgias",
        validCases: [
            {
                name: "get_basic",
                input: { customerId: 67890 },
                expectedOutput: {
                    id: 67890,
                    email: "john@example.com",
                    name: "John Doe",
                    firstname: "John",
                    lastname: "Doe",
                    language: "en",
                    timezone: "America/New_York",
                    channels: [
                        { type: "email", address: "john@example.com" },
                        { type: "phone", address: "+1234567890" }
                    ],
                    data: { shopify_customer_id: "12345" },
                    created_datetime: "2023-06-15T08:00:00Z",
                    updated_datetime: "2024-01-15T10:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                input: { customerId: 99999 },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Gorgias.",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // Create Customer
    // ============================================
    {
        operationId: "createCustomer",
        provider: "gorgias",
        validCases: [
            {
                name: "create_basic",
                input: {
                    email: "newcustomer@example.com",
                    name: "New Customer"
                },
                expectedOutput: {
                    id: 67891,
                    email: "newcustomer@example.com",
                    name: "New Customer",
                    channels: [{ type: "email", address: "newcustomer@example.com" }]
                }
            },
            {
                name: "create_with_channels",
                input: {
                    email: "multi@example.com",
                    firstname: "Multi",
                    lastname: "Channel",
                    channels: [
                        { type: "email", address: "multi@example.com" },
                        { type: "phone", address: "+9876543210" }
                    ],
                    external_id: "ext_12345"
                },
                expectedOutput: {
                    id: 67892,
                    email: "multi@example.com",
                    firstname: "Multi",
                    lastname: "Channel",
                    external_id: "ext_12345"
                }
            }
        ],
        errorCases: [
            {
                name: "validation_invalid_email",
                input: { email: "not-an-email" },
                expectedError: {
                    type: "validation",
                    message: "Invalid email format",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // Update Customer
    // ============================================
    {
        operationId: "updateCustomer",
        provider: "gorgias",
        validCases: [
            {
                name: "update_basic",
                input: { customerId: 67890, name: "John Smith" },
                expectedOutput: {
                    id: 67890,
                    name: "John Smith"
                }
            },
            {
                name: "update_multiple_fields",
                input: {
                    customerId: 67890,
                    language: "es",
                    timezone: "Europe/Madrid",
                    note: "VIP customer"
                },
                expectedOutput: {
                    id: 67890,
                    language: "es",
                    timezone: "Europe/Madrid",
                    note: "VIP customer"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                input: { customerId: 99999, name: "Unknown" },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Gorgias.",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // List Messages
    // ============================================
    {
        operationId: "listMessages",
        provider: "gorgias",
        validCases: [
            {
                name: "list_basic",
                input: { ticketId: 12345 },
                expectedOutput: {
                    messages: [
                        {
                            id: 1001,
                            ticket_id: 12345,
                            channel: "email",
                            from_agent: false,
                            body_text: "I have a question...",
                            sender: { email: "john@example.com" },
                            created_datetime: "2024-01-15T10:00:00Z"
                        },
                        {
                            id: 1002,
                            ticket_id: 12345,
                            channel: "email",
                            from_agent: true,
                            body_text: "Thank you for contacting us...",
                            sender: { email: "agent@company.com" },
                            created_datetime: "2024-01-15T10:30:00Z"
                        }
                    ],
                    ticketId: 12345,
                    pagination: { next_cursor: null, prev_cursor: null }
                }
            },
            {
                name: "list_with_pagination",
                input: { ticketId: 12345, limit: 10, cursor: "msg_abc" },
                expectedOutput: {
                    messages: [],
                    ticketId: 12345,
                    pagination: { next_cursor: null, prev_cursor: "msg_abc" }
                }
            }
        ],
        errorCases: [
            {
                name: "ticket_not_found",
                input: { ticketId: 99999 },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Gorgias.",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // Create Message
    // ============================================
    {
        operationId: "createMessage",
        provider: "gorgias",
        validCases: [
            {
                name: "create_reply",
                input: {
                    ticketId: 12345,
                    channel: "email",
                    body_text: "Thank you for your message. Let me look into this.",
                    from_agent: true
                },
                expectedOutput: {
                    id: 1003,
                    ticket_id: 12345,
                    channel: "email",
                    from_agent: true,
                    body_text: "Thank you for your message. Let me look into this.",
                    created_datetime: "2024-01-15T11:00:00Z"
                }
            },
            {
                name: "create_html_message",
                input: {
                    ticketId: 12345,
                    channel: "email",
                    body_html: "<p>Hello,</p><p>Here is your order status...</p>",
                    from_agent: true,
                    subject: "Re: Order Status"
                },
                expectedOutput: {
                    id: 1004,
                    ticket_id: 12345,
                    channel: "email",
                    from_agent: true,
                    subject: "Re: Order Status"
                }
            }
        ],
        errorCases: [
            {
                name: "ticket_not_found",
                input: { ticketId: 99999, body_text: "Reply to unknown ticket" },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Gorgias.",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // Create Internal Note
    // ============================================
    {
        operationId: "createInternalNote",
        provider: "gorgias",
        validCases: [
            {
                name: "create_note",
                input: {
                    ticketId: 12345,
                    body_text: "Customer called and confirmed shipping address."
                },
                expectedOutput: {
                    id: 1005,
                    ticket_id: 12345,
                    channel: "internal-note",
                    from_agent: true,
                    body_text: "Customer called and confirmed shipping address.",
                    public: false
                }
            },
            {
                name: "create_html_note",
                input: {
                    ticketId: 12345,
                    body_text: "Escalated to manager",
                    body_html: "<p><strong>Escalated to manager</strong></p>"
                },
                expectedOutput: {
                    id: 1006,
                    ticket_id: 12345,
                    channel: "internal-note",
                    from_agent: true
                }
            }
        ],
        errorCases: [
            {
                name: "ticket_not_found",
                input: { ticketId: 99999, body_text: "Note for unknown ticket" },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Gorgias.",
                    retryable: false
                }
            },
            {
                name: "validation_empty_body",
                input: { ticketId: 12345, body_text: "" },
                expectedError: {
                    type: "validation",
                    message: "Note content is required",
                    retryable: false
                }
            }
        ]
    }
];
