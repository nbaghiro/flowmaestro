/**
 * LiveChat Provider Test Fixtures
 *
 * Based on LiveChat Agent Chat API v3.6:
 * https://developers.livechat.com/docs/messaging/agent-chat-api
 */

import type { TestFixture } from "../../../sandbox";

export const livechatFixtures: TestFixture[] = [
    // ============================================================================
    // CHATS
    // ============================================================================
    {
        operationId: "listChats",
        provider: "livechat",
        validCases: [
            {
                name: "list_active_chats",
                description: "List active chat summaries",
                input: { limit: 25 },
                expectedOutput: {
                    chats: [
                        {
                            id: "PJ0MRSHTDG",
                            lastThread: {
                                id: "K600PKZON8",
                                created_at: "2024-06-15T14:30:00Z",
                                active: true,
                                tags: ["support"]
                            },
                            users: [
                                {
                                    id: "agent1@company.com",
                                    type: "agent",
                                    name: "Jane Doe"
                                },
                                {
                                    id: "b7eff798-f8df-4364-8059-649c35c9ed0c",
                                    type: "customer",
                                    name: "John Smith"
                                }
                            ]
                        }
                    ],
                    foundChats: 1
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { limit: 25 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by LiveChat. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getChat",
        provider: "livechat",
        validCases: [
            {
                name: "get_active_chat",
                description: "Get an active chat with thread events",
                input: { chat_id: "PJ0MRSHTDG" },
                expectedOutput: {
                    id: "PJ0MRSHTDG",
                    thread: {
                        id: "K600PKZON8",
                        active: true,
                        createdAt: "2024-06-15T14:30:00Z",
                        events: [
                            {
                                id: "Q20N9CKRX2",
                                type: "message",
                                text: "Hello, I need help with my order",
                                authorId: "b7eff798-f8df-4364-8059-649c35c9ed0c",
                                createdAt: "2024-06-15T14:30:01Z"
                            }
                        ],
                        tags: ["support"]
                    },
                    users: [
                        { id: "agent1@company.com", type: "agent", name: "Jane Doe" },
                        {
                            id: "b7eff798-f8df-4364-8059-649c35c9ed0c",
                            type: "customer",
                            name: "John Smith"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Chat does not exist",
                input: { chat_id: "NONEXISTENT" },
                expectedError: {
                    type: "not_found",
                    message: "LiveChat API error: chat_not_found - Chat not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listArchives",
        provider: "livechat",
        validCases: [
            {
                name: "list_archived_chats",
                description: "List archived chats with date filter",
                input: {
                    limit: 10,
                    filters: {
                        from: "2024-06-01T00:00:00Z",
                        to: "2024-06-30T23:59:59Z"
                    }
                },
                expectedOutput: {
                    chats: [
                        {
                            id: "ARCHIVED001",
                            thread: {
                                id: "THR001",
                                active: false,
                                createdAt: "2024-06-10T09:15:00Z",
                                tags: ["resolved"]
                            },
                            users: [
                                { id: "agent1@company.com", type: "agent", name: "Jane Doe" },
                                {
                                    id: "cust-001",
                                    type: "customer",
                                    name: "Alice Johnson"
                                }
                            ]
                        }
                    ],
                    foundChats: 1
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { limit: 25 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by LiveChat. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "startChat",
        provider: "livechat",
        validCases: [
            {
                name: "start_chat_with_message",
                description: "Start a new chat with initial message",
                input: {
                    thread: {
                        events: [{ type: "message", text: "Welcome to support!" }]
                    }
                },
                expectedOutput: {
                    chatId: "PJ0MRSHTDG",
                    threadId: "K600PKZON8"
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
                    message: "Rate limited by LiveChat. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "sendEvent",
        provider: "livechat",
        validCases: [
            {
                name: "send_message",
                description: "Send a text message in a chat",
                input: {
                    chat_id: "PJ0MRSHTDG",
                    event: { type: "message", text: "Thanks for reaching out!" }
                },
                expectedOutput: {
                    chatId: "PJ0MRSHTDG",
                    eventId: "Q20N9CKRX3",
                    sent: true
                }
            }
        ],
        errorCases: [
            {
                name: "chat_inactive",
                description: "Cannot send to inactive chat",
                input: {
                    chat_id: "INACTIVE_CHAT",
                    event: { type: "message", text: "Hello" }
                },
                expectedError: {
                    type: "validation",
                    message: "LiveChat API error: chat_inactive - Chat is not active",
                    retryable: false
                }
            }
        ]
    },

    {
        operationId: "transferChat",
        provider: "livechat",
        validCases: [
            {
                name: "transfer_to_agent",
                description: "Transfer chat to another agent",
                input: {
                    id: "PJ0MRSHTDG",
                    target: { type: "agent", ids: ["agent2@company.com"] }
                },
                expectedOutput: {
                    chatId: "PJ0MRSHTDG",
                    transferred: true,
                    target: { type: "agent", ids: ["agent2@company.com"] }
                }
            }
        ],
        errorCases: [
            {
                name: "chat_not_found",
                description: "Chat does not exist",
                input: {
                    id: "NONEXISTENT",
                    target: { type: "agent", ids: ["agent2@company.com"] }
                },
                expectedError: {
                    type: "not_found",
                    message: "LiveChat API error: chat_not_found - Chat not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "deactivateChat",
        provider: "livechat",
        validCases: [
            {
                name: "close_active_chat",
                description: "Close an active chat thread",
                input: { id: "PJ0MRSHTDG" },
                expectedOutput: {
                    chatId: "PJ0MRSHTDG",
                    deactivated: true
                }
            }
        ],
        errorCases: [
            {
                name: "chat_not_found",
                description: "Chat does not exist",
                input: { id: "NONEXISTENT" },
                expectedError: {
                    type: "not_found",
                    message: "LiveChat API error: chat_not_found - Chat not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================================================
    // CUSTOMERS
    // ============================================================================
    {
        operationId: "getCustomer",
        provider: "livechat",
        validCases: [
            {
                name: "get_customer_details",
                description: "Get customer details",
                input: { id: "b7eff798-f8df-4364-8059-649c35c9ed0c" },
                expectedOutput: {
                    id: "b7eff798-f8df-4364-8059-649c35c9ed0c",
                    name: "John Smith",
                    email: "john@example.com",
                    statistics: {
                        chats_count: 5,
                        threads_count: 8,
                        visits_count: 12
                    },
                    createdAt: "2024-01-15T10:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Customer not found",
                input: { id: "nonexistent-id" },
                expectedError: {
                    type: "not_found",
                    message: "LiveChat API error: customer_not_found - Customer not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "banCustomer",
        provider: "livechat",
        validCases: [
            {
                name: "ban_for_one_day",
                description: "Ban a customer for one day",
                input: { id: "b7eff798-f8df-4364-8059-649c35c9ed0c", days: 1 },
                expectedOutput: {
                    customerId: "b7eff798-f8df-4364-8059-649c35c9ed0c",
                    banned: true,
                    days: 1
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Customer does not exist",
                input: { id: "00000000-0000-0000-0000-000000000000", days: 1 },
                expectedError: {
                    type: "not_found",
                    message: "LiveChat API error: customer_not_found - Customer not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================================================
    // AGENTS
    // ============================================================================
    {
        operationId: "listAgents",
        provider: "livechat",
        validCases: [
            {
                name: "list_all_agents",
                description: "List all agents",
                input: {},
                expectedOutput: {
                    agents: [
                        {
                            id: "agent1@company.com",
                            name: "Jane Doe",
                            login: "agent1@company.com",
                            role: "administrator",
                            maxChatsCount: 6,
                            groups: [{ id: 0, priority: "normal" }]
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
                    message: "Rate limited by LiveChat. Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    {
        operationId: "setRoutingStatus",
        provider: "livechat",
        validCases: [
            {
                name: "set_accepting_chats",
                description: "Set agent to accepting chats",
                input: {
                    status: "accepting_chats",
                    agent_id: "agent1@company.com"
                },
                expectedOutput: {
                    status: "accepting_chats",
                    agentId: "agent1@company.com",
                    updated: true
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { status: "accepting_chats" },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by LiveChat. Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // TAGS
    // ============================================================================
    {
        operationId: "tagThread",
        provider: "livechat",
        validCases: [
            {
                name: "add_support_tag",
                description: "Add a support tag to a thread",
                input: {
                    chat_id: "PJ0MRSHTDG",
                    thread_id: "K600PKZON8",
                    tag: "vip-customer"
                },
                expectedOutput: {
                    chatId: "PJ0MRSHTDG",
                    threadId: "K600PKZON8",
                    tag: "vip-customer",
                    tagged: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Chat does not exist",
                input: { chat_id: "NONEXISTENT", thread_id: "K600PKZON8", tag: "vip-customer" },
                expectedError: {
                    type: "not_found",
                    message: "LiveChat API error: chat_not_found - Chat not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "untagThread",
        provider: "livechat",
        validCases: [
            {
                name: "remove_tag",
                description: "Remove a tag from a thread",
                input: {
                    chat_id: "PJ0MRSHTDG",
                    thread_id: "K600PKZON8",
                    tag: "vip-customer"
                },
                expectedOutput: {
                    chatId: "PJ0MRSHTDG",
                    threadId: "K600PKZON8",
                    tag: "vip-customer",
                    untagged: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Chat does not exist",
                input: { chat_id: "NONEXISTENT", thread_id: "K600PKZON8", tag: "vip-customer" },
                expectedError: {
                    type: "not_found",
                    message: "LiveChat API error: chat_not_found - Chat not found",
                    retryable: false
                }
            }
        ]
    }
];
