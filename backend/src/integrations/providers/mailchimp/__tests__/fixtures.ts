/**
 * Mailchimp Provider Test Fixtures
 *
 * Comprehensive test fixtures for Mailchimp email marketing operations
 * including audiences, members, campaigns, templates, segments, and tags.
 */

import type { TestFixture } from "../../../sandbox";

export const mailchimpFixtures: TestFixture[] = [
    // ============================================================
    // MEMBER OPERATIONS
    // ============================================================
    {
        operationId: "addMember",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_subscribed_member",
                description: "Add a new subscribed member to an audience",
                input: {
                    listId: "a1b2c3d4e5",
                    email: "john.smith@techstartup.io",
                    status: "subscribed",
                    firstName: "John",
                    lastName: "Smith"
                },
                expectedOutput: {
                    id: "f8e7d6c5b4a3f8e7d6c5b4a3f8e7d6c5",
                    email: "john.smith@techstartup.io",
                    status: "subscribed",
                    firstName: "John",
                    lastName: "Smith",
                    fullName: "John Smith",
                    vip: false,
                    memberRating: 2,
                    lastChanged: "2024-01-15T10:30:00Z",
                    source: "API - Generic",
                    tagsCount: 0,
                    tags: []
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_member",
                description: "Attempt to add a member that already exists",
                input: {
                    listId: "a1b2c3d4e5",
                    email: "existing.member@company.com",
                    status: "subscribed"
                },
                expectedError: {
                    type: "validation",
                    message: "existing.member@company.com is already a list member",
                    retryable: false
                }
            },
            {
                name: "invalid_list_id",
                description: "Add member to non-existent list",
                input: {
                    listId: "nonexistent123",
                    email: "newuser@example.com",
                    status: "subscribed"
                },
                expectedError: {
                    type: "not_found",
                    message: "The requested resource could not be found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "a1b2c3d4e5",
                    email: "ratelimit.test@example.com",
                    status: "subscribed"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "You have exceeded the rate limit. Please retry after 60 seconds.",
                    retryable: true
                }
            },
            {
                name: "compliance_blocked",
                description: "Email blocked due to compliance reasons",
                input: {
                    listId: "a1b2c3d4e5",
                    email: "blocked.user@spam-domain.xyz",
                    status: "subscribed"
                },
                expectedError: {
                    type: "validation",
                    message: "This email address has been blocked from being added to this list",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getMember",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_getMember",
                description: "Get a subscribed member by email",
                input: {
                    listId: "a1b2c3d4e5",
                    email: "john.smith@techstartup.io"
                },
                expectedOutput: {
                    id: "f8e7d6c5b4a3f8e7d6c5b4a3f8e7d6c5",
                    email: "john.smith@techstartup.io",
                    status: "subscribed",
                    firstName: "John",
                    lastName: "Smith",
                    fullName: "John Smith",
                    language: "en",
                    vip: false,
                    memberRating: 4,
                    lastChanged: "2024-01-10T14:22:00Z",
                    source: "Import",
                    tagsCount: 2,
                    tags: [
                        { id: 10001, name: "Newsletter" },
                        { id: 10002, name: "Product Updates" }
                    ],
                    mergeFields: {
                        FNAME: "John",
                        LNAME: "Smith",
                        COMPANY: "Tech Startup Inc"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Member does not exist in the list",
                input: {
                    listId: "a1b2c3d4e5",
                    email: "nonexistent@example.com"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "a1b2c3d4e5",
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
        operationId: "getMembers",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_getMembers",
                description: "Get all members from an audience",
                input: {
                    listId: "a1b2c3d4e5",
                    count: 10
                },
                expectedOutput: {
                    members: [
                        {
                            id: "f8e7d6c5b4a3f8e7d6c5b4a3f8e7d6c5",
                            email: "john.smith@techstartup.io",
                            status: "subscribed",
                            firstName: "John",
                            lastName: "Smith",
                            fullName: "John Smith",
                            vip: false,
                            memberRating: 4,
                            tagsCount: 2
                        },
                        {
                            id: "a9b8c7d6e5f4a9b8c7d6e5f4a9b8c7d6",
                            email: "sarah.jones@acmecorp.com",
                            status: "subscribed",
                            firstName: "Sarah",
                            lastName: "Jones",
                            fullName: "Sarah Jones",
                            vip: false,
                            memberRating: 3,
                            tagsCount: 1
                        },
                        {
                            id: "b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4",
                            email: "enterprise.buyer@fortune500.com",
                            status: "subscribed",
                            firstName: "Michael",
                            lastName: "Thompson",
                            fullName: "Michael Thompson",
                            vip: true,
                            memberRating: 5,
                            tagsCount: 5
                        }
                    ],
                    totalItems: 15847,
                    hasMore: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "List does not exist",
                input: {
                    listId: "nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "a1b2c3d4e5"
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
        operationId: "updateMember",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_updateMember",
                description: "Update member name and merge fields",
                input: {
                    listId: "a1b2c3d4e5",
                    email: "john.smith@techstartup.io",
                    firstName: "Jonathan",
                    lastName: "Smith-Williams",
                    mergeFields: {
                        COMPANY: "Tech Startup Holdings",
                        JOBTITLE: "VP Engineering"
                    }
                },
                expectedOutput: {
                    id: "f8e7d6c5b4a3f8e7d6c5b4a3f8e7d6c5",
                    email: "john.smith@techstartup.io",
                    status: "subscribed",
                    firstName: "Jonathan",
                    lastName: "Smith-Williams",
                    fullName: "Jonathan Smith-Williams",
                    vip: false,
                    memberRating: 4,
                    lastChanged: "2024-01-15T15:00:00Z",
                    mergeFields: {
                        FNAME: "Jonathan",
                        LNAME: "Smith-Williams",
                        COMPANY: "Tech Startup Holdings",
                        JOBTITLE: "VP Engineering"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Member does not exist",
                input: {
                    listId: "a1b2c3d4e5",
                    email: "nonexistent@example.com",
                    firstName: "Test"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "a1b2c3d4e5",
                    email: "test@example.com",
                    firstName: "Test"
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
        operationId: "archiveMember",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_archiveMember",
                description: "Archive a member from an audience",
                input: {
                    listId: "a1b2c3d4e5",
                    email: "old.subscriber@defunct-company.com"
                },
                expectedOutput: {
                    archived: true,
                    email: "old.subscriber@defunct-company.com",
                    listId: "a1b2c3d4e5"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Member does not exist",
                input: {
                    listId: "a1b2c3d4e5",
                    email: "nonexistent@example.com"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "a1b2c3d4e5",
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
        operationId: "deleteMemberPermanently",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_deleteMemberPermanently",
                description: "Permanently delete a member (GDPR compliance)",
                input: {
                    listId: "a1b2c3d4e5",
                    email: "gdpr.request@european-user.eu"
                },
                expectedOutput: {
                    deleted: true,
                    email: "gdpr.request@european-user.eu",
                    listId: "a1b2c3d4e5"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Member does not exist",
                input: {
                    listId: "a1b2c3d4e5",
                    email: "nonexistent@example.com"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "a1b2c3d4e5",
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
    // ============================================================
    // TAG OPERATIONS
    // ============================================================
    {
        operationId: "addTagsToMember",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_addTagsToMember",
                description: "Add marketing tags to a member",
                input: {
                    listId: "a1b2c3d4e5",
                    email: "john.smith@techstartup.io",
                    tags: ["Newsletter", "Product Updates", "Beta Tester"]
                },
                expectedOutput: {
                    added: true,
                    email: "john.smith@techstartup.io",
                    tags: ["Newsletter", "Product Updates", "Beta Tester"]
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Member does not exist",
                input: {
                    listId: "a1b2c3d4e5",
                    email: "nonexistent@example.com",
                    tags: ["Test Tag"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "a1b2c3d4e5",
                    email: "test@example.com",
                    tags: ["Test"]
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
        operationId: "removeTagsFromMember",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_removeTagsFromMember",
                description: "Remove specific tags from a member",
                input: {
                    listId: "a1b2c3d4e5",
                    email: "john.smith@techstartup.io",
                    tags: ["Beta Tester", "2023-Campaign"]
                },
                expectedOutput: {
                    removed: true,
                    email: "john.smith@techstartup.io",
                    tags: ["Beta Tester", "2023-Campaign"]
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Member does not exist",
                input: {
                    listId: "a1b2c3d4e5",
                    email: "nonexistent@example.com",
                    tags: ["Test Tag"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "a1b2c3d4e5",
                    email: "test@example.com",
                    tags: ["Test"]
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
        operationId: "getTags",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_getTags",
                description: "Get all tags from an audience",
                input: {
                    listId: "a1b2c3d4e5"
                },
                expectedOutput: {
                    tags: [
                        { id: 10001, name: "Newsletter", memberCount: 12453 },
                        { id: 10002, name: "Product Updates", memberCount: 8932 },
                        { id: 10003, name: "Beta Tester", memberCount: 847 },
                        { id: 10004, name: "VIP", memberCount: 156 },
                        { id: 10005, name: "Enterprise", memberCount: 89 },
                        { id: 10006, name: "Webinar Attendee", memberCount: 2341 },
                        { id: 10007, name: "Free Trial", memberCount: 5678 },
                        { id: 10008, name: "Paid Customer", memberCount: 3421 },
                        { id: 10009, name: "Churned", memberCount: 892 },
                        { id: 10010, name: "Re-engaged", memberCount: 234 }
                    ],
                    totalItems: 47,
                    hasMore: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "List does not exist",
                input: {
                    listId: "nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "a1b2c3d4e5"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    // ============================================================
    // LIST/AUDIENCE OPERATIONS
    // ============================================================
    {
        operationId: "createList",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_createList",
                description: "Create a new email marketing audience",
                input: {
                    name: "Product Launch Newsletter",
                    company: "Acme Software Inc",
                    address1: "123 Tech Boulevard",
                    address2: "Suite 400",
                    city: "San Francisco",
                    state: "CA",
                    zip: "94105",
                    country: "US",
                    phone: "+1-415-555-0100",
                    permissionReminder:
                        "You signed up for updates about our product launch on our website.",
                    fromName: "Acme Software Team",
                    fromEmail: "hello@acmesoftware.com",
                    subject: "Updates from Acme Software",
                    language: "en",
                    doubleOptin: true
                },
                expectedOutput: {
                    id: "abc123def4",
                    name: "Product Launch Newsletter",
                    memberCount: 0,
                    unsubscribeCount: 0,
                    cleanedCount: 0,
                    campaignCount: 0,
                    dateCreated: "2024-01-15T10:00:00Z",
                    visibility: "pub",
                    doubleOptin: true
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_email",
                description: "Invalid from email domain",
                input: {
                    name: "Test List",
                    company: "Test Co",
                    address1: "123 Test St",
                    city: "Test City",
                    state: "TS",
                    zip: "12345",
                    country: "US",
                    permissionReminder: "Test reminder",
                    fromName: "Test",
                    fromEmail: "invalid@unverified-domain.fake",
                    subject: "Test"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "The email domain must be verified. Please verify your domain or use a different email address.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "Test List",
                    company: "Test Co",
                    address1: "123 Test St",
                    city: "Test City",
                    state: "TS",
                    zip: "12345",
                    country: "US",
                    permissionReminder: "Test",
                    fromName: "Test",
                    fromEmail: "test@verified.com",
                    subject: "Test"
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
        operationId: "getList",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_getList",
                description: "Get a single audience by ID",
                input: {
                    listId: "a1b2c3d4e5"
                },
                expectedOutput: {
                    id: "a1b2c3d4e5",
                    name: "Main Newsletter Subscribers",
                    memberCount: 15847,
                    unsubscribeCount: 892,
                    cleanedCount: 234,
                    campaignCount: 156,
                    dateCreated: "2022-03-15T08:00:00Z",
                    visibility: "pub",
                    doubleOptin: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "List does not exist",
                input: {
                    listId: "nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "a1b2c3d4e5"
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
        operationId: "getLists",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_getLists",
                description: "Get all audiences",
                input: {},
                expectedOutput: {
                    lists: [
                        {
                            id: "a1b2c3d4e5",
                            name: "Main Newsletter Subscribers",
                            memberCount: 15847,
                            unsubscribeCount: 892,
                            cleanedCount: 234,
                            campaignCount: 156,
                            dateCreated: "2022-03-15T08:00:00Z",
                            visibility: "pub",
                            doubleOptin: true
                        },
                        {
                            id: "f6g7h8i9j0",
                            name: "Product Announcements",
                            memberCount: 8234,
                            unsubscribeCount: 421,
                            cleanedCount: 89,
                            campaignCount: 42,
                            dateCreated: "2023-01-10T14:30:00Z",
                            visibility: "pub",
                            doubleOptin: true
                        },
                        {
                            id: "k1l2m3n4o5",
                            name: "Enterprise Customers",
                            memberCount: 156,
                            unsubscribeCount: 12,
                            cleanedCount: 3,
                            campaignCount: 28,
                            dateCreated: "2023-06-20T09:00:00Z",
                            visibility: "prv",
                            doubleOptin: false
                        }
                    ],
                    totalItems: 3,
                    hasMore: false
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
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateList",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_updateList",
                description: "Update audience name and settings",
                input: {
                    listId: "a1b2c3d4e5",
                    name: "Main Newsletter Subscribers 2024",
                    permissionReminder:
                        "You signed up for our newsletter on acmesoftware.com or at one of our events.",
                    fromName: "Acme Software Marketing"
                },
                expectedOutput: {
                    id: "a1b2c3d4e5",
                    name: "Main Newsletter Subscribers 2024",
                    memberCount: 15847,
                    unsubscribeCount: 892,
                    cleanedCount: 234,
                    campaignCount: 156,
                    dateCreated: "2022-03-15T08:00:00Z",
                    visibility: "pub",
                    doubleOptin: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "List does not exist",
                input: {
                    listId: "nonexistent123",
                    name: "Updated Name"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "a1b2c3d4e5",
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
    // ============================================================
    // SEGMENT OPERATIONS
    // ============================================================
    {
        operationId: "getSegments",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_getSegments",
                description: "Get all segments from an audience",
                input: {
                    listId: "a1b2c3d4e5"
                },
                expectedOutput: {
                    segments: [
                        {
                            id: 501,
                            name: "Highly Engaged (5-star)",
                            memberCount: 3421,
                            type: "saved",
                            createdAt: "2023-02-15T10:00:00Z",
                            updatedAt: "2024-01-15T08:00:00Z"
                        },
                        {
                            id: 502,
                            name: "Opened Last 30 Days",
                            memberCount: 8934,
                            type: "saved",
                            createdAt: "2023-03-20T14:00:00Z",
                            updatedAt: "2024-01-15T08:00:00Z"
                        },
                        {
                            id: 503,
                            name: "VIP Customers",
                            memberCount: 156,
                            type: "static",
                            createdAt: "2023-01-10T09:00:00Z",
                            updatedAt: "2024-01-10T16:30:00Z"
                        },
                        {
                            id: 504,
                            name: "Free Trial Users",
                            memberCount: 2341,
                            type: "saved",
                            createdAt: "2023-06-01T11:00:00Z",
                            updatedAt: "2024-01-15T08:00:00Z"
                        },
                        {
                            id: 505,
                            name: "Churned - Re-engagement",
                            memberCount: 892,
                            type: "saved",
                            createdAt: "2023-08-15T13:00:00Z",
                            updatedAt: "2024-01-15T08:00:00Z"
                        }
                    ],
                    totalItems: 12,
                    hasMore: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "List does not exist",
                input: {
                    listId: "nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "a1b2c3d4e5"
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
        operationId: "getSegmentMembers",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_getSegmentMembers",
                description: "Get members in a VIP segment",
                input: {
                    listId: "a1b2c3d4e5",
                    segmentId: 503
                },
                expectedOutput: {
                    members: [
                        {
                            id: "b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4",
                            email: "enterprise.buyer@fortune500.com",
                            status: "subscribed",
                            firstName: "Michael",
                            lastName: "Thompson",
                            fullName: "Michael Thompson",
                            vip: true,
                            memberRating: 5,
                            tagsCount: 5
                        },
                        {
                            id: "i9j0k1l2m3n4i9j0k1l2m3n4i9j0k1l2",
                            email: "important.customer@bigclient.com",
                            status: "subscribed",
                            firstName: "Patricia",
                            lastName: "Anderson",
                            fullName: "Patricia Anderson",
                            vip: true,
                            memberRating: 5,
                            tagsCount: 4
                        }
                    ],
                    totalItems: 156,
                    hasMore: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Segment does not exist",
                input: {
                    listId: "a1b2c3d4e5",
                    segmentId: 99999
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "a1b2c3d4e5",
                    segmentId: 501
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    // ============================================================
    // CAMPAIGN OPERATIONS
    // ============================================================
    {
        operationId: "createCampaign",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_regular_campaign",
                description: "Create a regular email campaign",
                input: {
                    type: "regular",
                    listId: "a1b2c3d4e5",
                    subjectLine: "Introducing Our Biggest Update Yet!",
                    previewText: "New features that will transform your workflow...",
                    title: "January 2024 Product Launch",
                    fromName: "Acme Software Team",
                    replyTo: "hello@acmesoftware.com",
                    trackOpens: true,
                    trackClicks: true
                },
                expectedOutput: {
                    id: "campaign_abc123",
                    type: "regular",
                    status: "save",
                    createTime: "2024-01-15T10:00:00Z",
                    subjectLine: "Introducing Our Biggest Update Yet!",
                    title: "January 2024 Product Launch",
                    fromName: "Acme Software Team",
                    replyTo: "hello@acmesoftware.com",
                    listId: "a1b2c3d4e5",
                    listName: "Main Newsletter Subscribers",
                    recipientCount: 15847
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "List does not exist",
                input: {
                    type: "regular",
                    listId: "nonexistent123",
                    subjectLine: "Test Subject",
                    title: "Test Campaign"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    type: "regular",
                    listId: "a1b2c3d4e5",
                    subjectLine: "Test",
                    title: "Test"
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
        operationId: "getCampaign",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_getCampaign",
                description: "Get a sent campaign with stats",
                input: {
                    campaignId: "campaign_sent123"
                },
                expectedOutput: {
                    id: "campaign_sent123",
                    type: "regular",
                    status: "sent",
                    createTime: "2024-01-01T10:00:00Z",
                    sendTime: "2024-01-02T14:00:00Z",
                    emailsSent: 15234,
                    subjectLine: "Happy New Year! Here is What is Coming in 2024",
                    title: "New Year 2024 Newsletter",
                    fromName: "Acme Software Team",
                    replyTo: "hello@acmesoftware.com",
                    listId: "a1b2c3d4e5",
                    listName: "Main Newsletter Subscribers",
                    recipientCount: 15234,
                    openRate: 0.342,
                    clickRate: 0.089
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Campaign does not exist",
                input: {
                    campaignId: "nonexistent_campaign"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    campaignId: "campaign_abc123"
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
        operationId: "getCampaigns",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_getCampaigns",
                description: "Get all campaigns",
                input: {},
                expectedOutput: {
                    campaigns: [
                        {
                            id: "campaign_sent123",
                            type: "regular",
                            status: "sent",
                            createTime: "2024-01-01T10:00:00Z",
                            sendTime: "2024-01-02T14:00:00Z",
                            emailsSent: 15234,
                            subjectLine: "Happy New Year! Here is What is Coming in 2024",
                            title: "New Year 2024 Newsletter",
                            openRate: 0.342,
                            clickRate: 0.089
                        },
                        {
                            id: "campaign_sched789",
                            type: "regular",
                            status: "schedule",
                            createTime: "2024-01-10T11:00:00Z",
                            sendTime: "2024-01-20T15:00:00Z",
                            subjectLine: "Webinar Reminder: Tomorrow at 2 PM EST",
                            title: "Webinar Reminder Campaign"
                        },
                        {
                            id: "campaign_draft456",
                            type: "regular",
                            status: "save",
                            createTime: "2024-01-14T09:00:00Z",
                            subjectLine: "February Newsletter Draft",
                            title: "February 2024 Newsletter"
                        }
                    ],
                    totalItems: 156,
                    hasMore: true
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_list",
                description: "Filter by non-existent list",
                input: {
                    listId: "nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
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
        operationId: "updateCampaign",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_updateCampaign",
                description: "Update campaign subject line and preview text",
                input: {
                    campaignId: "campaign_draft456",
                    subjectLine: "February Newsletter: New Features Inside!",
                    previewText: "Discover the latest updates and improvements..."
                },
                expectedOutput: {
                    id: "campaign_draft456",
                    type: "regular",
                    status: "save",
                    createTime: "2024-01-14T09:00:00Z",
                    subjectLine: "February Newsletter: New Features Inside!",
                    title: "February 2024 Newsletter",
                    fromName: "Acme Software Team",
                    replyTo: "hello@acmesoftware.com",
                    listId: "a1b2c3d4e5",
                    listName: "Main Newsletter Subscribers",
                    recipientCount: 15847
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Campaign does not exist",
                input: {
                    campaignId: "nonexistent_campaign",
                    subjectLine: "Test"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "cannot_modify_sent",
                description: "Cannot modify a sent campaign",
                input: {
                    campaignId: "campaign_sent123",
                    subjectLine: "Updated Subject"
                },
                expectedError: {
                    type: "validation",
                    message: "This campaign has already been sent and cannot be modified",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    campaignId: "campaign_draft456",
                    subjectLine: "Test"
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
        operationId: "sendCampaign",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_sendCampaign",
                description: "Send a campaign immediately",
                input: {
                    campaignId: "campaign_ready_to_send"
                },
                expectedOutput: {
                    sent: true,
                    campaignId: "campaign_ready_to_send"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Campaign does not exist",
                input: {
                    campaignId: "nonexistent_campaign"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "campaign_not_ready",
                description: "Campaign is missing required content",
                input: {
                    campaignId: "campaign_incomplete"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Campaign cannot be sent. Please ensure all required fields are complete.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    campaignId: "campaign_abc123"
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
        operationId: "scheduleCampaign",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_scheduleCampaign",
                description: "Schedule a campaign for future delivery",
                input: {
                    campaignId: "campaign_draft456",
                    scheduleTime: "2024-02-01T15:00:00Z"
                },
                expectedOutput: {
                    scheduled: true,
                    campaignId: "campaign_draft456",
                    scheduleTime: "2024-02-01T15:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Campaign does not exist",
                input: {
                    campaignId: "nonexistent_campaign",
                    scheduleTime: "2024-02-01T15:00:00Z"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "past_schedule_time",
                description: "Schedule time is in the past",
                input: {
                    campaignId: "campaign_draft456",
                    scheduleTime: "2020-01-01T10:00:00Z"
                },
                expectedError: {
                    type: "validation",
                    message: "Schedule time must be in the future",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    campaignId: "campaign_abc123",
                    scheduleTime: "2024-02-01T15:00:00Z"
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
        operationId: "unscheduleCampaign",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_unscheduleCampaign",
                description: "Unschedule a previously scheduled campaign",
                input: {
                    campaignId: "campaign_sched789"
                },
                expectedOutput: {
                    unscheduled: true,
                    campaignId: "campaign_sched789"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Campaign does not exist",
                input: {
                    campaignId: "nonexistent_campaign"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "not_scheduled",
                description: "Campaign is not currently scheduled",
                input: {
                    campaignId: "campaign_draft456"
                },
                expectedError: {
                    type: "validation",
                    message: "Campaign is not currently scheduled",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    campaignId: "campaign_sched789"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    // ============================================================
    // TEMPLATE OPERATIONS
    // ============================================================
    {
        operationId: "getTemplate",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_getTemplate",
                description: "Get a single email template",
                input: {
                    templateId: 12345
                },
                expectedOutput: {
                    id: 12345,
                    name: "Modern Newsletter - Blue Theme",
                    type: "user",
                    category: "Newsletter",
                    active: true,
                    dragAndDrop: true,
                    responsive: true,
                    dateCreated: "2023-06-15T10:00:00Z",
                    dateEdited: "2024-01-10T14:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Template does not exist",
                input: {
                    templateId: 99999
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    templateId: 12345
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
        operationId: "getTemplates",
        provider: "mailchimp",
        validCases: [
            {
                name: "basic_getTemplates",
                description: "Get all email templates",
                input: {},
                expectedOutput: {
                    templates: [
                        {
                            id: 12345,
                            name: "Modern Newsletter - Blue Theme",
                            type: "user",
                            category: "Newsletter",
                            active: true,
                            dragAndDrop: true,
                            responsive: true,
                            dateCreated: "2023-06-15T10:00:00Z",
                            dateEdited: "2024-01-10T14:30:00Z"
                        },
                        {
                            id: 12346,
                            name: "Modern Newsletter - Green Theme",
                            type: "user",
                            category: "Newsletter",
                            active: true,
                            dragAndDrop: true,
                            responsive: true,
                            dateCreated: "2023-06-15T10:30:00Z",
                            dateEdited: "2024-01-10T14:35:00Z"
                        },
                        {
                            id: 67890,
                            name: "Custom Transactional - Order Confirmation",
                            type: "user",
                            category: "Transactional",
                            active: true,
                            dragAndDrop: false,
                            responsive: true,
                            dateCreated: "2023-08-20T11:00:00Z",
                            dateEdited: "2023-12-05T09:15:00Z"
                        },
                        {
                            id: 11111,
                            name: "Product Announcement",
                            type: "user",
                            category: "Product",
                            active: true,
                            dragAndDrop: true,
                            responsive: true,
                            dateCreated: "2023-09-01T09:00:00Z",
                            dateEdited: "2023-11-20T16:00:00Z"
                        },
                        {
                            id: 22222,
                            name: "Event Invitation",
                            type: "user",
                            category: "Events",
                            active: true,
                            dragAndDrop: true,
                            responsive: true,
                            dateCreated: "2023-10-15T13:00:00Z",
                            dateEdited: "2024-01-05T11:00:00Z"
                        }
                    ],
                    totalItems: 23,
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
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    }
];
