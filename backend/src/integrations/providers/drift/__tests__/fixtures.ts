/**
 * Drift Provider Test Fixtures
 *
 * Based on Drift API documentation:
 * https://devdocs.drift.com/docs
 */

import type { TestFixture } from "../../../sandbox";

export const driftFixtures: TestFixture[] = [
    // ============================================================================
    // CONTACTS
    // ============================================================================
    {
        operationId: "listContacts",
        provider: "drift",
        validCases: [
            {
                name: "list_contacts",
                description: "List contacts with pagination",
                input: { limit: 50 },
                expectedOutput: {
                    contacts: [
                        {
                            id: 100001,
                            email: "john@example.com",
                            name: "John Smith",
                            company: "Acme Corp",
                            title: "CTO",
                            createdAt: 1718460600000
                        }
                    ],
                    pagination: { more: false }
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { limit: 50 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by Drift. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getContact",
        provider: "drift",
        validCases: [
            {
                name: "get_contact_details",
                description: "Get a contact by ID",
                input: { contact_id: 100001 },
                expectedOutput: {
                    id: 100001,
                    email: "john@example.com",
                    name: "John Smith",
                    company: "Acme Corp",
                    title: "CTO",
                    tags: ["enterprise", "trial"],
                    createdAt: 1718460600000
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact does not exist",
                input: { contact_id: 99999 },
                expectedError: {
                    type: "not_found",
                    message: "Drift API error: not_found - Contact not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createContact",
        provider: "drift",
        validCases: [
            {
                name: "create_contact_with_email",
                description: "Create a new contact",
                input: {
                    attributes: {
                        email: "alice@example.com",
                        name: "Alice Johnson",
                        company: "Tech Corp"
                    }
                },
                expectedOutput: {
                    id: 100002,
                    email: "alice@example.com",
                    name: "Alice Johnson",
                    createdAt: 1718461200000
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_email",
                description: "Contact with email already exists",
                input: {
                    attributes: { email: "john@example.com" }
                },
                expectedError: {
                    type: "validation",
                    message: "Drift API error: conflict - Contact already exists with this email",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updateContact",
        provider: "drift",
        validCases: [
            {
                name: "update_contact_attributes",
                description: "Update contact name and company",
                input: {
                    contact_id: 100001,
                    attributes: {
                        name: "John Smith-Jones",
                        company: "Acme Corp International",
                        title: "VP Engineering"
                    }
                },
                expectedOutput: {
                    id: 100001,
                    email: "john@example.com",
                    name: "John Smith-Jones",
                    updated: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact does not exist",
                input: {
                    contact_id: 99999,
                    attributes: { name: "Test" }
                },
                expectedError: {
                    type: "not_found",
                    message: "Drift API error: not_found - Contact not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "deleteContact",
        provider: "drift",
        validCases: [
            {
                name: "delete_contact",
                description: "Delete a contact",
                input: { contact_id: 100002 },
                expectedOutput: {
                    contactId: 100002,
                    deleted: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact does not exist",
                input: { contact_id: 99999 },
                expectedError: {
                    type: "not_found",
                    message: "Drift API error: not_found - Contact not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================================================
    // CONVERSATIONS
    // ============================================================================
    {
        operationId: "listConversations",
        provider: "drift",
        validCases: [
            {
                name: "list_open_conversations",
                description: "List open conversations",
                input: { limit: 50, statusId: 1 },
                expectedOutput: {
                    conversations: [
                        {
                            id: 200001,
                            status: "open",
                            contactId: 100001,
                            inboxId: 1,
                            createdAt: 1718460600000,
                            updatedAt: 1718461200000
                        }
                    ],
                    pagination: { more: false }
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { limit: 50 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by Drift. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getConversation",
        provider: "drift",
        validCases: [
            {
                name: "get_conversation_details",
                description: "Get conversation by ID",
                input: { conversation_id: 200001 },
                expectedOutput: {
                    id: 200001,
                    status: "open",
                    contactId: 100001,
                    inboxId: 1,
                    createdAt: 1718460600000,
                    updatedAt: 1718461200000
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
                    message: "Drift API error: not_found - Conversation not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createConversation",
        provider: "drift",
        validCases: [
            {
                name: "create_conversation_with_message",
                description: "Create a new conversation with initial message",
                input: {
                    email: "john@example.com",
                    message: { body: "Hi, I'd like to learn more about your product." }
                },
                expectedOutput: {
                    id: 200002,
                    status: "open",
                    contactId: 100001,
                    createdAt: 1718461200000
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_email",
                description: "Contact email does not exist",
                input: {
                    email: "nonexistent@example.com",
                    message: { body: "Hello" }
                },
                expectedError: {
                    type: "validation",
                    message: "Drift API error: bad_request - Contact not found for email",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getConversationMessages",
        provider: "drift",
        validCases: [
            {
                name: "get_messages",
                description: "Get messages in a conversation",
                input: { conversation_id: 200001 },
                expectedOutput: {
                    messages: [
                        {
                            id: "msg-001",
                            conversationId: 200001,
                            body: "Hi, I'm interested in your product",
                            type: "chat",
                            author: { id: 100001, type: "contact", bot: false },
                            createdAt: 1718460600000
                        },
                        {
                            id: "msg-002",
                            conversationId: 200001,
                            body: "Welcome! I'd love to help. What are you looking for?",
                            type: "chat",
                            author: { id: 50001, type: "user", bot: false },
                            createdAt: 1718460660000
                        }
                    ],
                    pagination: { more: false }
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
                    message: "Drift API error: not_found - Conversation not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "sendMessage",
        provider: "drift",
        validCases: [
            {
                name: "send_chat_message",
                description: "Send a chat message",
                input: {
                    conversation_id: 200001,
                    body: "Thanks for your interest! Let me schedule a demo.",
                    type: "chat"
                },
                expectedOutput: {
                    messageId: "msg-003",
                    conversationId: 200001,
                    sent: true
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    conversation_id: 200001,
                    body: "Test",
                    type: "chat"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by Drift. Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // USERS
    // ============================================================================
    {
        operationId: "listUsers",
        provider: "drift",
        validCases: [
            {
                name: "list_all_users",
                description: "List Drift users",
                input: {},
                expectedOutput: {
                    users: [
                        {
                            id: 50001,
                            name: "Jane Doe",
                            email: "jane@company.com",
                            role: "admin",
                            availability: "ONLINE",
                            bot: false,
                            createdAt: 1704067200000
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
                    message: "Rate limited by Drift. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getUser",
        provider: "drift",
        validCases: [
            {
                name: "get_user_details",
                description: "Get a specific user",
                input: { user_id: 50001 },
                expectedOutput: {
                    id: 50001,
                    name: "Jane Doe",
                    email: "jane@company.com",
                    role: "admin",
                    availability: "ONLINE",
                    bot: false,
                    createdAt: 1704067200000
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "User does not exist",
                input: { user_id: 99999 },
                expectedError: {
                    type: "not_found",
                    message: "Drift API error: not_found - User not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================================================
    // ACCOUNTS
    // ============================================================================
    {
        operationId: "listAccounts",
        provider: "drift",
        validCases: [
            {
                name: "list_accounts",
                description: "List accounts",
                input: { limit: 50 },
                expectedOutput: {
                    accounts: [
                        {
                            accountId: "acc-001",
                            name: "Acme Corp",
                            domain: "acme.com",
                            ownerId: 50001,
                            targeted: true,
                            createDateTime: 1704067200000
                        }
                    ],
                    pagination: { more: false }
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { limit: 50 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by Drift. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getAccount",
        provider: "drift",
        validCases: [
            {
                name: "get_account_details",
                description: "Get an account by ID",
                input: { account_id: "acc-001" },
                expectedOutput: {
                    accountId: "acc-001",
                    name: "Acme Corp",
                    domain: "acme.com",
                    ownerId: 50001,
                    targeted: true,
                    createDateTime: 1704067200000
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Account does not exist",
                input: { account_id: "nonexistent" },
                expectedError: {
                    type: "not_found",
                    message: "Drift API error: not_found - Account not found",
                    retryable: false
                }
            }
        ]
    }
];
