/**
 * Front Provider Test Fixtures
 *
 * Based on Front API documentation for shared inbox operations
 */

import type { TestFixture } from "../../sandbox";

/**
 * Sample conversations for filterableData
 */
const sampleConversations = [
    {
        id: "cnv_123abc",
        subject: "Question about pricing",
        status: "open",
        assignee: {
            id: "tea_456def",
            email: "support@company.com",
            name: "Sarah Support"
        },
        tags: [{ id: "tag_urgent", name: "urgent" }],
        createdAt: "2024-01-15T10:30:00Z",
        isPrivate: false,
        lastMessageBlurb: "Hi, I wanted to ask about your enterprise pricing..."
    },
    {
        id: "cnv_456def",
        subject: "Bug report: Login issue",
        status: "assigned",
        assignee: {
            id: "tea_789ghi",
            email: "engineering@company.com",
            name: "Dave Developer"
        },
        tags: [
            { id: "tag_bug", name: "bug" },
            { id: "tag_priority", name: "priority" }
        ],
        createdAt: "2024-01-16T09:00:00Z",
        isPrivate: false,
        lastMessageBlurb: "I can't seem to log into my account..."
    },
    {
        id: "cnv_789ghi",
        subject: "Feature request",
        status: "archived",
        assignee: null,
        tags: [{ id: "tag_feature", name: "feature-request" }],
        createdAt: "2024-01-10T14:00:00Z",
        isPrivate: false,
        lastMessageBlurb: "It would be great if you could add..."
    }
];

/**
 * Sample inboxes for filterableData
 */
const sampleInboxes = [
    {
        id: "inb_support",
        name: "Support",
        isPrivate: false,
        isPublic: true
    },
    {
        id: "inb_sales",
        name: "Sales",
        isPrivate: false,
        isPublic: true
    },
    {
        id: "inb_engineering",
        name: "Engineering",
        isPrivate: true,
        isPublic: false
    }
];

/**
 * Sample contacts for filterableData
 */
const sampleContacts = [
    {
        id: "crd_abc123",
        name: "John Customer",
        description: "Enterprise customer since 2023",
        avatarUrl: null,
        isSpammer: false,
        handles: [
            { handle: "john@bigcorp.com", source: "email" },
            { handle: "+1-555-123-4567", source: "phone" }
        ],
        links: ["https://bigcorp.com"],
        groups: [{ id: "grp_enterprise", name: "Enterprise" }],
        updatedAt: "2024-01-15T10:30:00Z"
    },
    {
        id: "crd_def456",
        name: "Jane Prospect",
        description: "Interested in Pro plan",
        avatarUrl: null,
        isSpammer: false,
        handles: [{ handle: "jane@startup.io", source: "email" }],
        links: [],
        groups: [{ id: "grp_prospects", name: "Prospects" }],
        updatedAt: "2024-01-16T14:00:00Z"
    },
    {
        id: "crd_ghi789",
        name: null,
        description: null,
        avatarUrl: null,
        isSpammer: true,
        handles: [{ handle: "spam@suspicious.com", source: "email" }],
        links: [],
        groups: [],
        updatedAt: "2024-01-10T09:00:00Z"
    }
];

export const frontFixtures: TestFixture[] = [
    {
        operationId: "listConversations",
        provider: "front",
        filterableData: {
            records: sampleConversations,
            recordsField: "conversations",
            offsetField: "nextToken",
            defaultPageSize: 50,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["status", "isPrivate"]
            }
        },
        validCases: [
            {
                name: "list_all_conversations",
                description: "List all conversations",
                input: {}
            },
            {
                name: "list_open_conversations",
                description: "List only open conversations",
                input: {
                    status: "open"
                }
            },
            {
                name: "search_conversations",
                description: "Search conversations by query",
                input: {
                    query: "pricing"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_status",
                description: "Invalid status filter",
                input: {
                    status: "invalid_status"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid enum value",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getConversation",
        provider: "front",
        validCases: [
            {
                name: "get_conversation",
                description: "Get a specific conversation",
                input: {
                    conversationId: "cnv_123abc"
                },
                expectedOutput: {
                    id: "cnv_123abc",
                    subject: "Question about pricing",
                    status: "open",
                    assignee: {
                        id: "tea_456def",
                        email: "support@company.com",
                        name: "Sarah Support"
                    },
                    tags: [{ id: "tag_urgent", name: "urgent" }],
                    createdAt: "2024-01-15T10:30:00Z",
                    isPrivate: false
                }
            }
        ],
        errorCases: [
            {
                name: "conversation_not_found",
                description: "Conversation does not exist",
                input: {
                    conversationId: "cnv_nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Front",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updateConversation",
        provider: "front",
        validCases: [
            {
                name: "archive_conversation",
                description: "Archive a conversation",
                input: {
                    conversationId: "cnv_123abc",
                    status: "archived"
                },
                expectedOutput: {
                    updated: true,
                    conversationId: "cnv_123abc",
                    changes: { status: "archived" }
                }
            },
            {
                name: "assign_conversation",
                description: "Assign conversation to a teammate",
                input: {
                    conversationId: "cnv_456def",
                    assigneeId: "tea_456def"
                },
                expectedOutput: {
                    updated: true,
                    conversationId: "cnv_456def",
                    changes: { assigneeId: "tea_456def" }
                }
            }
        ],
        errorCases: [
            {
                name: "no_updates_specified",
                description: "No update fields provided",
                input: {
                    conversationId: "cnv_123abc"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "At least one update field (status, assigneeId, or inboxId) is required",
                    retryable: false
                }
            },
            {
                name: "conversation_not_found",
                description: "Conversation does not exist",
                input: {
                    conversationId: "cnv_nonexistent",
                    status: "archived"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Front",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "sendReply",
        provider: "front",
        validCases: [
            {
                name: "send_simple_reply",
                description: "Send a simple reply to a conversation",
                input: {
                    conversationId: "cnv_123abc",
                    body: "Thank you for reaching out! Our enterprise pricing starts at $99/month."
                },
                expectedOutput: {
                    messageId: "msg_reply_001",
                    type: "email",
                    isInbound: false,
                    createdAt: "2024-01-15T11:00:00Z",
                    blurb: "Thank you for reaching out!"
                }
            },
            {
                name: "send_reply_with_cc",
                description: "Send a reply with CC recipients",
                input: {
                    conversationId: "cnv_456def",
                    body: "I'm looping in our engineering team to help with this issue.",
                    cc: ["engineering@company.com"]
                },
                expectedOutput: {
                    messageId: "msg_reply_002",
                    type: "email",
                    isInbound: false
                }
            },
            {
                name: "send_reply_and_archive",
                description: "Send a reply and archive the conversation",
                input: {
                    conversationId: "cnv_123abc",
                    body: "This issue has been resolved. Closing this ticket.",
                    archive: true
                },
                expectedOutput: {
                    messageId: "msg_reply_003",
                    type: "email",
                    isInbound: false
                }
            }
        ],
        errorCases: [
            {
                name: "conversation_not_found",
                description: "Conversation does not exist",
                input: {
                    conversationId: "cnv_nonexistent",
                    body: "Test reply"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Front",
                    retryable: false
                }
            },
            {
                name: "empty_body",
                description: "Empty message body",
                input: {
                    conversationId: "cnv_123abc",
                    body: ""
                },
                expectedError: {
                    type: "validation",
                    message: "String must contain at least 1 character(s)",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "addComment",
        provider: "front",
        validCases: [
            {
                name: "add_internal_comment",
                description: "Add an internal comment to a conversation",
                input: {
                    conversationId: "cnv_123abc",
                    body: "Customer is a VIP - please prioritize!"
                },
                expectedOutput: {
                    commentId: "com_001",
                    body: "Customer is a VIP - please prioritize!",
                    postedAt: "2024-01-15T11:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "conversation_not_found",
                description: "Conversation does not exist",
                input: {
                    conversationId: "cnv_nonexistent",
                    body: "Test comment"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Front",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listComments",
        provider: "front",
        validCases: [
            {
                name: "list_comments",
                description: "List all comments on a conversation",
                input: {
                    conversationId: "cnv_123abc"
                },
                expectedOutput: {
                    comments: [
                        {
                            id: "com_001",
                            body: "Customer is a VIP - please prioritize!",
                            postedAt: "2024-01-15T11:30:00Z",
                            author: {
                                id: "tea_456def",
                                email: "support@company.com",
                                name: "Sarah Support"
                            }
                        }
                    ],
                    pagination: {}
                }
            }
        ],
        errorCases: [
            {
                name: "conversation_not_found",
                description: "Conversation does not exist",
                input: {
                    conversationId: "cnv_nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Front",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "addTag",
        provider: "front",
        validCases: [
            {
                name: "add_tag",
                description: "Add a tag to a conversation",
                input: {
                    conversationId: "cnv_123abc",
                    tagId: "tag_priority"
                },
                expectedOutput: {
                    tagged: true,
                    conversationId: "cnv_123abc",
                    tagId: "tag_priority"
                }
            }
        ],
        errorCases: [
            {
                name: "conversation_not_found",
                description: "Conversation does not exist",
                input: {
                    conversationId: "cnv_nonexistent",
                    tagId: "tag_priority"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Front",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "removeTag",
        provider: "front",
        validCases: [
            {
                name: "remove_tag",
                description: "Remove a tag from a conversation",
                input: {
                    conversationId: "cnv_123abc",
                    tagId: "tag_urgent"
                },
                expectedOutput: {
                    untagged: true,
                    conversationId: "cnv_123abc",
                    tagId: "tag_urgent"
                }
            }
        ],
        errorCases: [
            {
                name: "conversation_not_found",
                description: "Conversation does not exist",
                input: {
                    conversationId: "cnv_nonexistent",
                    tagId: "tag_urgent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Front",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listInboxes",
        provider: "front",
        filterableData: {
            records: sampleInboxes,
            recordsField: "inboxes",
            offsetField: "nextToken",
            defaultPageSize: 50,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["isPrivate", "isPublic"]
            }
        },
        validCases: [
            {
                name: "list_all_inboxes",
                description: "List all inboxes",
                input: {}
            }
        ],
        errorCases: []
    },
    {
        operationId: "listContacts",
        provider: "front",
        filterableData: {
            records: sampleContacts,
            recordsField: "contacts",
            offsetField: "nextToken",
            defaultPageSize: 50,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["isSpammer"]
            }
        },
        validCases: [
            {
                name: "list_all_contacts",
                description: "List all contacts",
                input: {}
            },
            {
                name: "search_contacts",
                description: "Search contacts by query",
                input: {
                    query: "bigcorp"
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "getContact",
        provider: "front",
        validCases: [
            {
                name: "get_contact",
                description: "Get a specific contact",
                input: {
                    contactId: "crd_abc123"
                },
                expectedOutput: {
                    id: "crd_abc123",
                    name: "John Customer",
                    description: "Enterprise customer since 2023",
                    isSpammer: false,
                    handles: [
                        { handle: "john@bigcorp.com", source: "email" },
                        { handle: "+1-555-123-4567", source: "phone" }
                    ],
                    groups: [{ id: "grp_enterprise", name: "Enterprise" }]
                }
            }
        ],
        errorCases: [
            {
                name: "contact_not_found",
                description: "Contact does not exist",
                input: {
                    contactId: "crd_nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Front",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createContact",
        provider: "front",
        validCases: [
            {
                name: "create_contact_minimal",
                description: "Create a contact with minimal info",
                input: {
                    handles: [{ handle: "newcontact@example.com", source: "email" }]
                },
                expectedOutput: {
                    id: "crd_new001",
                    handles: [{ handle: "newcontact@example.com", source: "email" }],
                    groups: []
                }
            },
            {
                name: "create_contact_full",
                description: "Create a contact with all fields",
                input: {
                    name: "New Customer",
                    description: "New enterprise prospect",
                    handles: [
                        { handle: "new@enterprise.com", source: "email" },
                        { handle: "+1-555-999-8888", source: "phone" }
                    ],
                    groupNames: ["Enterprise", "Prospects"]
                },
                expectedOutput: {
                    id: "crd_new002",
                    name: "New Customer",
                    description: "New enterprise prospect",
                    handles: [
                        { handle: "new@enterprise.com", source: "email" },
                        { handle: "+1-555-999-8888", source: "phone" }
                    ],
                    groups: [
                        { id: "grp_enterprise", name: "Enterprise" },
                        { id: "grp_prospects", name: "Prospects" }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "missing_handles",
                description: "No handles provided",
                input: {
                    name: "No Handles Contact",
                    handles: []
                },
                expectedError: {
                    type: "validation",
                    message: "Array must contain at least 1 element(s)",
                    retryable: false
                }
            }
        ]
    }
];
