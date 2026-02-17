/**
 * ConvertKit Provider Test Fixtures
 *
 * Comprehensive test fixtures for ConvertKit operations
 * including subscribers, tags, sequences, forms, and broadcasts.
 */

import type { TestFixture } from "../../sandbox";

export const convertkitFixtures: TestFixture[] = [
    // ============================================================
    // SUBSCRIBER OPERATIONS
    // ============================================================
    {
        operationId: "getSubscribers",
        provider: "convertkit",
        validCases: [
            {
                name: "basic_getSubscribers",
                description: "Get all subscribers",
                input: {},
                expectedOutput: {
                    subscribers: [
                        {
                            id: "12345",
                            email: "john@creator.co",
                            firstName: "John",
                            state: "active",
                            createdAt: "2023-06-15T10:00:00Z",
                            fields: { company: "Creator Co" }
                        },
                        {
                            id: "12346",
                            email: "sarah@blog.com",
                            firstName: "Sarah",
                            state: "active",
                            createdAt: "2023-09-20T11:00:00Z",
                            fields: {}
                        }
                    ],
                    total: 5234,
                    page: 1,
                    totalPages: 52,
                    hasMore: true
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
                    message: "ConvertKit rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getSubscriber",
        provider: "convertkit",
        validCases: [
            {
                name: "basic_getSubscriber",
                description: "Get a single subscriber by ID",
                input: {
                    subscriberId: "12345"
                },
                expectedOutput: {
                    id: "12345",
                    email: "john@creator.co",
                    firstName: "John",
                    state: "active",
                    createdAt: "2023-06-15T10:00:00Z",
                    fields: { company: "Creator Co" }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Subscriber does not exist",
                input: {
                    subscriberId: "99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in ConvertKit.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createSubscriber",
        provider: "convertkit",
        validCases: [
            {
                name: "basic_createSubscriber",
                description: "Create a new subscriber",
                input: {
                    email: "new@subscriber.com",
                    firstName: "New"
                },
                expectedOutput: {
                    id: "12350",
                    email: "new@subscriber.com",
                    firstName: "New",
                    state: "active",
                    createdAt: "2024-01-15T10:00:00Z",
                    fields: {}
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_email",
                description: "Invalid email format",
                input: {
                    email: "invalid-email",
                    firstName: "Test"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email address",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updateSubscriber",
        provider: "convertkit",
        validCases: [
            {
                name: "basic_updateSubscriber",
                description: "Update subscriber first name",
                input: {
                    subscriberId: "12345",
                    firstName: "Jonathan"
                },
                expectedOutput: {
                    id: "12345",
                    email: "john@creator.co",
                    firstName: "Jonathan",
                    state: "active",
                    createdAt: "2023-06-15T10:00:00Z",
                    fields: { company: "Creator Co" }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Subscriber does not exist",
                input: {
                    subscriberId: "99999",
                    firstName: "Test"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in ConvertKit.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "unsubscribeSubscriber",
        provider: "convertkit",
        validCases: [
            {
                name: "basic_unsubscribeSubscriber",
                description: "Unsubscribe a subscriber",
                input: {
                    email: "john@creator.co"
                },
                expectedOutput: {
                    unsubscribed: true,
                    subscriber: {
                        id: "12345",
                        email: "john@creator.co",
                        firstName: "John",
                        state: "cancelled",
                        createdAt: "2023-06-15T10:00:00Z",
                        fields: { company: "Creator Co" }
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Subscriber does not exist",
                input: {
                    email: "notfound@example.com"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in ConvertKit.",
                    retryable: false
                }
            }
        ]
    },
    // ============================================================
    // TAG OPERATIONS
    // ============================================================
    {
        operationId: "getTags",
        provider: "convertkit",
        validCases: [
            {
                name: "basic_getTags",
                description: "Get all tags",
                input: {},
                expectedOutput: {
                    tags: [
                        {
                            id: "100",
                            name: "Newsletter Subscriber",
                            createdAt: "2023-01-10T09:00:00Z"
                        },
                        {
                            id: "101",
                            name: "Purchased Product",
                            createdAt: "2023-02-15T11:00:00Z"
                        },
                        {
                            id: "102",
                            name: "VIP",
                            createdAt: "2023-03-20T14:00:00Z"
                        }
                    ],
                    total: 3
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
                    message: "ConvertKit rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createTag",
        provider: "convertkit",
        validCases: [
            {
                name: "basic_createTag",
                description: "Create a new tag",
                input: {
                    name: "New Course Students"
                },
                expectedOutput: {
                    id: "105",
                    name: "New Course Students",
                    createdAt: "2024-01-15T10:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "Test"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "ConvertKit rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "addTagToSubscriber",
        provider: "convertkit",
        validCases: [
            {
                name: "basic_addTagToSubscriber",
                description: "Add a tag to a subscriber",
                input: {
                    tagId: "100",
                    email: "john@creator.co"
                },
                expectedOutput: {
                    added: true,
                    tagId: "100",
                    subscriber: {
                        id: "12345",
                        email: "john@creator.co",
                        firstName: "John",
                        state: "active",
                        createdAt: "2023-06-15T10:00:00Z",
                        fields: { company: "Creator Co" }
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Tag does not exist",
                input: {
                    tagId: "99999",
                    email: "john@creator.co"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in ConvertKit.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "removeTagFromSubscriber",
        provider: "convertkit",
        validCases: [
            {
                name: "basic_removeTagFromSubscriber",
                description: "Remove a tag from a subscriber",
                input: {
                    tagId: "100",
                    subscriberId: "12345"
                },
                expectedOutput: {
                    removed: true,
                    tagId: "100",
                    subscriberId: "12345"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Tag or subscriber does not exist",
                input: {
                    tagId: "99999",
                    subscriberId: "12345"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in ConvertKit.",
                    retryable: false
                }
            }
        ]
    },
    // ============================================================
    // SEQUENCE OPERATIONS
    // ============================================================
    {
        operationId: "getSequences",
        provider: "convertkit",
        validCases: [
            {
                name: "basic_getSequences",
                description: "Get all sequences",
                input: {},
                expectedOutput: {
                    sequences: [
                        {
                            id: "200",
                            name: "Welcome Series",
                            createdAt: "2023-01-15T10:00:00Z"
                        },
                        {
                            id: "201",
                            name: "Product Launch",
                            createdAt: "2023-06-20T09:00:00Z"
                        }
                    ],
                    total: 2
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
                    message: "ConvertKit rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "addSubscriberToSequence",
        provider: "convertkit",
        validCases: [
            {
                name: "basic_addSubscriberToSequence",
                description: "Add a subscriber to a sequence",
                input: {
                    sequenceId: "200",
                    email: "john@creator.co"
                },
                expectedOutput: {
                    added: true,
                    sequenceId: "200",
                    subscriber: {
                        id: "12345",
                        email: "john@creator.co",
                        firstName: "John",
                        state: "active",
                        createdAt: "2023-06-15T10:00:00Z",
                        fields: { company: "Creator Co" }
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Sequence does not exist",
                input: {
                    sequenceId: "99999",
                    email: "john@creator.co"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in ConvertKit.",
                    retryable: false
                }
            }
        ]
    },
    // ============================================================
    // FORM OPERATIONS
    // ============================================================
    {
        operationId: "getForms",
        provider: "convertkit",
        validCases: [
            {
                name: "basic_getForms",
                description: "Get all forms",
                input: {},
                expectedOutput: {
                    forms: [
                        {
                            id: "300",
                            name: "Newsletter Signup",
                            type: "embed",
                            format: "inline",
                            archived: false,
                            uid: "abc123"
                        },
                        {
                            id: "301",
                            name: "Free Course Signup",
                            type: "landing_page",
                            format: "full",
                            archived: false,
                            uid: "def456"
                        }
                    ],
                    total: 2
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
                    message: "ConvertKit rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "addSubscriberToForm",
        provider: "convertkit",
        validCases: [
            {
                name: "basic_addSubscriberToForm",
                description: "Subscribe via a form",
                input: {
                    formId: "300",
                    email: "new@subscriber.com",
                    firstName: "New"
                },
                expectedOutput: {
                    added: true,
                    formId: "300",
                    subscriber: {
                        id: "12350",
                        email: "new@subscriber.com",
                        firstName: "New",
                        state: "active",
                        createdAt: "2024-01-15T10:00:00Z",
                        fields: {}
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Form does not exist",
                input: {
                    formId: "99999",
                    email: "test@example.com"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in ConvertKit.",
                    retryable: false
                }
            }
        ]
    },
    // ============================================================
    // BROADCAST OPERATIONS
    // ============================================================
    {
        operationId: "getBroadcasts",
        provider: "convertkit",
        validCases: [
            {
                name: "basic_getBroadcasts",
                description: "Get all broadcasts",
                input: {},
                expectedOutput: {
                    broadcasts: [
                        {
                            id: "400",
                            subject: "Weekly Newsletter - January",
                            description: "Our weekly roundup",
                            public: true,
                            publishedAt: "2024-01-10T14:00:00Z",
                            createdAt: "2024-01-10T10:00:00Z"
                        },
                        {
                            id: "401",
                            subject: "Product Launch Announcement",
                            description: "Big news!",
                            public: true,
                            publishedAt: "2024-01-05T09:00:00Z",
                            createdAt: "2024-01-04T16:00:00Z"
                        }
                    ],
                    total: 2
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
                    message: "ConvertKit rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getBroadcast",
        provider: "convertkit",
        validCases: [
            {
                name: "basic_getBroadcast",
                description: "Get a single broadcast by ID",
                input: {
                    broadcastId: "400"
                },
                expectedOutput: {
                    id: "400",
                    subject: "Weekly Newsletter - January",
                    description: "Our weekly roundup",
                    content: "<h1>Weekly Newsletter</h1><p>Content here...</p>",
                    public: true,
                    publishedAt: "2024-01-10T14:00:00Z",
                    createdAt: "2024-01-10T10:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Broadcast does not exist",
                input: {
                    broadcastId: "99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in ConvertKit.",
                    retryable: false
                }
            }
        ]
    }
];
