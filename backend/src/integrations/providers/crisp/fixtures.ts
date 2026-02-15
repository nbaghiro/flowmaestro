/**
 * Crisp Provider Test Fixtures
 *
 * Based on official Crisp API documentation:
 * https://docs.crisp.chat/references/rest-api/v1/
 */

import type { TestFixture } from "../../sandbox";

export const crispFixtures: TestFixture[] = [
    // ============================================
    // Conversations Operations
    // ============================================
    {
        operationId: "listConversations",
        provider: "crisp",
        validCases: [
            {
                name: "list_all_conversations",
                description: "List all conversations for a website",
                input: { pageNumber: 1 },
                expectedOutput: {
                    conversations: [
                        {
                            session_id: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1",
                            website_id: "8c842203-7ed8-4e29-a608-7cf78a7d2fcc",
                            state: "unresolved",
                            is_verified: true,
                            is_blocked: false,
                            availability: "online",
                            active: {
                                now: true,
                                last: "2024-01-20T15:30:00Z"
                            },
                            last_message: "Hi, I need help with my order",
                            unread: {
                                operator: 1,
                                visitor: 0
                            },
                            meta: {
                                nickname: "John Doe",
                                email: "john.doe@example.com",
                                avatar: "https://example.com/avatar.jpg",
                                segments: ["premium", "returning"]
                            },
                            created_at: 1705761600000,
                            updated_at: 1705762200000
                        },
                        {
                            session_id: "session_4a87c3b1-e248-4f56-9c67-cf23d8e5a9b2",
                            website_id: "8c842203-7ed8-4e29-a608-7cf78a7d2fcc",
                            state: "pending",
                            is_verified: false,
                            is_blocked: false,
                            availability: "away",
                            active: {
                                now: false,
                                last: "2024-01-20T14:00:00Z"
                            },
                            last_message: "When will my package arrive?",
                            unread: {
                                operator: 2,
                                visitor: 0
                            },
                            meta: {
                                nickname: "Jane Smith",
                                email: "jane.smith@example.com"
                            },
                            created_at: 1705755000000,
                            updated_at: 1705759200000
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Invalid API credentials",
                input: { pageNumber: 1 },
                expectedError: {
                    type: "permission",
                    message: "Authentication failed",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { pageNumber: 1 },
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
        provider: "crisp",
        validCases: [
            {
                name: "get_conversation_by_session_id",
                description: "Retrieve a specific conversation by session ID",
                input: {
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1"
                },
                expectedOutput: {
                    session_id: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1",
                    website_id: "8c842203-7ed8-4e29-a608-7cf78a7d2fcc",
                    people_id: "people_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    state: "unresolved",
                    is_verified: true,
                    is_blocked: false,
                    availability: "online",
                    active: {
                        now: true,
                        last: "2024-01-20T15:30:00Z"
                    },
                    last_message: "Hi, I need help with my order",
                    unread: {
                        operator: 1,
                        visitor: 0
                    },
                    assigned: {
                        user_id: "operator_123abc"
                    },
                    meta: {
                        nickname: "John Doe",
                        email: "john.doe@example.com",
                        phone: "+1-555-0123",
                        avatar: "https://example.com/avatar.jpg",
                        ip: "192.168.1.1",
                        segments: ["premium", "returning"],
                        data: {
                            order_id: "ORD-12345",
                            plan: "enterprise"
                        }
                    },
                    created_at: 1705761600000,
                    updated_at: 1705762200000
                }
            }
        ],
        errorCases: [
            {
                name: "conversation_not_found",
                description: "Conversation session ID does not exist",
                input: {
                    sessionId: "session_nonexistent-id"
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
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1"
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
        provider: "crisp",
        validCases: [
            {
                name: "create_new_conversation",
                description: "Create a new conversation",
                input: {},
                expectedOutput: {
                    session_id: "session_new-12345678-1234-1234-1234-123456789abc"
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Insufficient permissions to create conversations",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Permission denied",
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
        operationId: "changeConversationState",
        provider: "crisp",
        validCases: [
            {
                name: "resolve_conversation",
                description: "Mark a conversation as resolved",
                input: {
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1",
                    state: "resolved"
                },
                expectedOutput: {
                    updated: true,
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1",
                    state: "resolved"
                }
            },
            {
                name: "set_pending",
                description: "Set conversation state to pending",
                input: {
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1",
                    state: "pending"
                },
                expectedOutput: {
                    updated: true,
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1",
                    state: "pending"
                }
            }
        ],
        errorCases: [
            {
                name: "conversation_not_found",
                description: "Conversation does not exist",
                input: {
                    sessionId: "session_nonexistent",
                    state: "resolved"
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
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1",
                    state: "resolved"
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
        operationId: "getMessages",
        provider: "crisp",
        validCases: [
            {
                name: "get_conversation_messages",
                description: "Retrieve all messages in a conversation",
                input: {
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1"
                },
                expectedOutput: {
                    messages: [
                        {
                            fingerprint: 170576160001,
                            session_id: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1",
                            website_id: "8c842203-7ed8-4e29-a608-7cf78a7d2fcc",
                            type: "text",
                            from: "user",
                            origin: "chat",
                            content: "Hi, I need help with my order",
                            stamped: true,
                            timestamp: 1705761600000
                        },
                        {
                            fingerprint: 170576180002,
                            session_id: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1",
                            website_id: "8c842203-7ed8-4e29-a608-7cf78a7d2fcc",
                            type: "text",
                            from: "operator",
                            origin: "chat",
                            content:
                                "Hello! I'd be happy to help. Could you please provide your order number?",
                            stamped: true,
                            timestamp: 1705761800000,
                            user: {
                                user_id: "operator_123abc",
                                nickname: "Sarah from Support"
                            }
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "conversation_not_found",
                description: "Conversation does not exist",
                input: {
                    sessionId: "session_nonexistent"
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
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1"
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
        operationId: "sendMessage",
        provider: "crisp",
        validCases: [
            {
                name: "send_text_message",
                description: "Send a text message in a conversation",
                input: {
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1",
                    content: "Thank you for contacting us! Your order #12345 will arrive tomorrow.",
                    type: "text"
                },
                expectedOutput: {
                    fingerprint: 170576220003,
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1"
                }
            },
            {
                name: "send_message_with_operator_info",
                description: "Send a message with operator nickname",
                input: {
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1",
                    content: "I'll look into this for you right away!",
                    type: "text",
                    nickname: "Sarah Support"
                },
                expectedOutput: {
                    fingerprint: 170576220004,
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1"
                }
            }
        ],
        errorCases: [
            {
                name: "conversation_not_found",
                description: "Conversation does not exist",
                input: {
                    sessionId: "session_nonexistent",
                    content: "Test message"
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
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1",
                    content: "Test message"
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
        operationId: "searchConversations",
        provider: "crisp",
        validCases: [
            {
                name: "search_by_email",
                description: "Search conversations by visitor email",
                input: {
                    query: "john.doe@example.com",
                    pageNumber: 1
                },
                expectedOutput: {
                    conversations: [
                        {
                            session_id: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1",
                            website_id: "8c842203-7ed8-4e29-a608-7cf78a7d2fcc",
                            state: "unresolved",
                            is_verified: true,
                            is_blocked: false,
                            availability: "online",
                            active: {
                                now: true,
                                last: "2024-01-20T15:30:00Z"
                            },
                            meta: {
                                nickname: "John Doe",
                                email: "john.doe@example.com"
                            },
                            created_at: 1705761600000,
                            updated_at: 1705762200000
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_query",
                description: "Invalid search query",
                input: {
                    query: "",
                    pageNumber: 1
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
                    query: "test@example.com",
                    pageNumber: 1
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
        operationId: "addNote",
        provider: "crisp",
        validCases: [
            {
                name: "add_internal_note",
                description: "Add an internal note to a conversation",
                input: {
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1",
                    content:
                        "Customer is a VIP - prioritize this request. Follow up with shipping team."
                },
                expectedOutput: {
                    fingerprint: 170576230005,
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1"
                }
            }
        ],
        errorCases: [
            {
                name: "conversation_not_found",
                description: "Conversation does not exist",
                input: {
                    sessionId: "session_nonexistent",
                    content: "Test note"
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
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1",
                    content: "Test note"
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
    // People Operations
    // ============================================
    {
        operationId: "listPeople",
        provider: "crisp",
        validCases: [
            {
                name: "list_all_people",
                description: "List all people profiles",
                input: { pageNumber: 1 },
                expectedOutput: {
                    people: [
                        {
                            people_id: "people_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                            email: "john.doe@example.com",
                            phone: "+1-555-0123",
                            nickname: "John Doe",
                            avatar: "https://example.com/avatar.jpg",
                            segments: ["premium", "returning"],
                            active: 1705762200000,
                            created_at: 1705500000000,
                            updated_at: 1705762200000
                        },
                        {
                            people_id: "people_b2c3d4e5-f6a7-8901-bcde-f12345678901",
                            email: "jane.smith@example.com",
                            nickname: "Jane Smith",
                            segments: ["new"],
                            active: 1705759200000,
                            created_at: 1705600000000,
                            updated_at: 1705759200000
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Invalid API credentials",
                input: { pageNumber: 1 },
                expectedError: {
                    type: "permission",
                    message: "Authentication failed",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { pageNumber: 1 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getPerson",
        provider: "crisp",
        validCases: [
            {
                name: "get_person_by_id",
                description: "Retrieve a specific person profile",
                input: {
                    peopleId: "people_a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                },
                expectedOutput: {
                    people_id: "people_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    email: "john.doe@example.com",
                    phone: "+1-555-0123",
                    nickname: "John Doe",
                    avatar: "https://example.com/avatar.jpg",
                    gender: "male",
                    address: "123 Main St, San Francisco, CA 94105",
                    company: {
                        name: "Acme Corp",
                        url: "https://acme.com",
                        domain: "acme.com",
                        industry: "Technology",
                        employees: {
                            min: 50,
                            max: 200
                        }
                    },
                    employment: {
                        title: "Software Engineer",
                        role: "developer",
                        seniority: "senior"
                    },
                    geolocation: {
                        country: "US",
                        city: "San Francisco",
                        region: "California",
                        timezone: "America/Los_Angeles"
                    },
                    locales: ["en-US"],
                    segments: ["premium", "returning"],
                    notepad: "VIP customer - enterprise plan",
                    active: 1705762200000,
                    created_at: 1705500000000,
                    updated_at: 1705762200000
                }
            }
        ],
        errorCases: [
            {
                name: "person_not_found",
                description: "Person ID does not exist",
                input: {
                    peopleId: "people_nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Person not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    peopleId: "people_a1b2c3d4-e5f6-7890-abcd-ef1234567890"
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
        operationId: "createPerson",
        provider: "crisp",
        validCases: [
            {
                name: "create_person_full_details",
                description: "Create a person profile with full details",
                input: {
                    email: "newuser@example.com",
                    phone: "+1-555-0200",
                    nickname: "New User",
                    segments: ["prospect"]
                },
                expectedOutput: {
                    people_id: "people_new-12345678-1234-1234-1234-123456789abc"
                }
            },
            {
                name: "create_person_minimal",
                description: "Create a person with email only",
                input: {
                    email: "minimal@example.com"
                },
                expectedOutput: {
                    people_id: "people_min-12345678-1234-1234-1234-123456789abc"
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_email",
                description: "Person with same email already exists",
                input: {
                    email: "john.doe@example.com"
                },
                expectedError: {
                    type: "validation",
                    message: "Person with this email already exists",
                    retryable: false
                }
            },
            {
                name: "invalid_email",
                description: "Invalid email format",
                input: {
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
        operationId: "updatePerson",
        provider: "crisp",
        validCases: [
            {
                name: "update_person_phone",
                description: "Update person's phone number",
                input: {
                    peopleId: "people_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    phone: "+1-555-9999"
                },
                expectedOutput: {
                    people_id: "people_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    email: "john.doe@example.com",
                    phone: "+1-555-9999",
                    nickname: "John Doe",
                    segments: ["premium", "returning"],
                    updated_at: "{{timestamp}}"
                }
            },
            {
                name: "update_person_segments",
                description: "Update person's segments",
                input: {
                    peopleId: "people_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    segments: ["premium", "vip", "enterprise"]
                },
                expectedOutput: {
                    people_id: "people_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    email: "john.doe@example.com",
                    segments: ["premium", "vip", "enterprise"],
                    updated_at: "{{timestamp}}"
                }
            }
        ],
        errorCases: [
            {
                name: "person_not_found",
                description: "Person ID does not exist",
                input: {
                    peopleId: "people_nonexistent",
                    nickname: "Updated Name"
                },
                expectedError: {
                    type: "not_found",
                    message: "Person not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    peopleId: "people_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    nickname: "Updated Name"
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
    // Operators Operations
    // ============================================
    {
        operationId: "listOperators",
        provider: "crisp",
        validCases: [
            {
                name: "list_all_operators",
                description: "List all operators for the website",
                input: {},
                expectedOutput: {
                    operators: [
                        {
                            user_id: "operator_123abc",
                            type: "admin",
                            role: "Support Manager",
                            email: "sarah@company.com",
                            first_name: "Sarah",
                            last_name: "Johnson",
                            avatar: "https://example.com/sarah.jpg",
                            availability: "online",
                            timestamp: 1705762200000
                        },
                        {
                            user_id: "operator_456def",
                            type: "member",
                            role: "Support Agent",
                            email: "mike@company.com",
                            first_name: "Mike",
                            last_name: "Wilson",
                            avatar: "https://example.com/mike.jpg",
                            availability: "away",
                            timestamp: 1705760400000
                        },
                        {
                            user_id: "operator_789ghi",
                            type: "owner",
                            role: "CEO",
                            email: "ceo@company.com",
                            first_name: "Alex",
                            last_name: "Smith",
                            availability: "offline",
                            timestamp: 1705700000000
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Invalid API credentials",
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
        operationId: "getOperatorAvailability",
        provider: "crisp",
        validCases: [
            {
                name: "get_online_operator",
                description: "Get availability for an online operator",
                input: {
                    operatorId: "operator_123abc"
                },
                expectedOutput: {
                    operatorId: "operator_123abc",
                    availability: "online"
                }
            },
            {
                name: "get_away_operator",
                description: "Get availability for an away operator",
                input: {
                    operatorId: "operator_456def"
                },
                expectedOutput: {
                    operatorId: "operator_456def",
                    availability: "away"
                }
            }
        ],
        errorCases: [
            {
                name: "operator_not_found",
                description: "Operator ID does not exist",
                input: {
                    operatorId: "operator_nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Operator not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    operatorId: "operator_123abc"
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
        operationId: "assignConversation",
        provider: "crisp",
        validCases: [
            {
                name: "assign_to_operator",
                description: "Assign a conversation to an operator",
                input: {
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1",
                    operatorId: "operator_123abc"
                },
                expectedOutput: {
                    assigned: true,
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1",
                    operatorId: "operator_123abc"
                }
            }
        ],
        errorCases: [
            {
                name: "conversation_not_found",
                description: "Conversation does not exist",
                input: {
                    sessionId: "session_nonexistent",
                    operatorId: "operator_123abc"
                },
                expectedError: {
                    type: "not_found",
                    message: "Conversation not found",
                    retryable: false
                }
            },
            {
                name: "operator_not_found",
                description: "Operator does not exist",
                input: {
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1",
                    operatorId: "operator_nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Operator not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1",
                    operatorId: "operator_123abc"
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
        operationId: "unassignConversation",
        provider: "crisp",
        validCases: [
            {
                name: "unassign_from_operator",
                description: "Unassign a conversation from its current operator",
                input: {
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1"
                },
                expectedOutput: {
                    unassigned: true,
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1"
                }
            }
        ],
        errorCases: [
            {
                name: "conversation_not_found",
                description: "Conversation does not exist",
                input: {
                    sessionId: "session_nonexistent"
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
                    sessionId: "session_9df2a21e-f113-41d4-8ed2-bad8b49cafd1"
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
