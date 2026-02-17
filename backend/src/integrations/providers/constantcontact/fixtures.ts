/**
 * Constant Contact Provider Test Fixtures
 *
 * Comprehensive test fixtures for Constant Contact operations
 * including contacts, lists, campaigns, and tags.
 */

import type { TestFixture } from "../../sandbox";

export const constantcontactFixtures: TestFixture[] = [
    // ============================================================
    // CONTACT OPERATIONS
    // ============================================================
    {
        operationId: "getContacts",
        provider: "constantcontact",
        validCases: [
            {
                name: "basic_getContacts",
                description: "Get all contacts",
                input: {
                    limit: 10
                },
                expectedOutput: {
                    contacts: [
                        {
                            id: "cc-101",
                            email: "john.smith@techstartup.io",
                            firstName: "John",
                            lastName: "Smith",
                            phone: "+1-415-555-0100",
                            jobTitle: "CTO",
                            companyName: "Tech Startup Inc",
                            createdAt: "2023-06-15T10:00:00Z",
                            updatedAt: "2024-01-10T14:30:00Z",
                            emailConsent: "explicit"
                        },
                        {
                            id: "cc-102",
                            email: "sarah.jones@acmecorp.com",
                            firstName: "Sarah",
                            lastName: "Jones",
                            createdAt: "2023-09-20T11:00:00Z",
                            updatedAt: "2024-01-12T09:00:00Z",
                            emailConsent: "implicit"
                        }
                    ],
                    total: 2,
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
                    message: "Constant Contact rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getContact",
        provider: "constantcontact",
        validCases: [
            {
                name: "basic_getContact",
                description: "Get a single contact by ID",
                input: {
                    contactId: "cc-101"
                },
                expectedOutput: {
                    id: "cc-101",
                    email: "john.smith@techstartup.io",
                    firstName: "John",
                    lastName: "Smith",
                    phone: "+1-415-555-0100",
                    jobTitle: "CTO",
                    companyName: "Tech Startup Inc",
                    createdAt: "2023-06-15T10:00:00Z",
                    updatedAt: "2024-01-10T14:30:00Z",
                    emailConsent: "explicit"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact does not exist",
                input: {
                    contactId: "cc-99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Constant Contact.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createContact",
        provider: "constantcontact",
        validCases: [
            {
                name: "basic_createContact",
                description: "Create a new contact",
                input: {
                    email: "new.user@example.com",
                    firstName: "New",
                    lastName: "User",
                    permissionToSend: "explicit"
                },
                expectedOutput: {
                    id: "cc-105",
                    email: "new.user@example.com",
                    firstName: "New",
                    lastName: "User",
                    createdAt: "2024-01-15T10:00:00Z",
                    updatedAt: "2024-01-15T10:00:00Z",
                    emailConsent: "explicit"
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_email",
                description: "Contact with this email already exists",
                input: {
                    email: "existing@example.com",
                    firstName: "Duplicate"
                },
                expectedError: {
                    type: "validation",
                    message: "Contact with this email already exists",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updateContact",
        provider: "constantcontact",
        validCases: [
            {
                name: "basic_updateContact",
                description: "Update contact name",
                input: {
                    contactId: "cc-101",
                    firstName: "Jonathan"
                },
                expectedOutput: {
                    id: "cc-101",
                    email: "john.smith@techstartup.io",
                    firstName: "Jonathan",
                    lastName: "Smith",
                    phone: "+1-415-555-0100",
                    jobTitle: "CTO",
                    companyName: "Tech Startup Inc",
                    createdAt: "2023-06-15T10:00:00Z",
                    updatedAt: "2024-01-15T10:00:00Z",
                    emailConsent: "explicit"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact does not exist",
                input: {
                    contactId: "cc-99999",
                    firstName: "Test"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Constant Contact.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "deleteContact",
        provider: "constantcontact",
        validCases: [
            {
                name: "basic_deleteContact",
                description: "Delete a contact",
                input: {
                    contactId: "cc-101"
                },
                expectedOutput: {
                    deleted: true,
                    contactId: "cc-101"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact does not exist",
                input: {
                    contactId: "cc-99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Constant Contact.",
                    retryable: false
                }
            }
        ]
    },
    // ============================================================
    // LIST OPERATIONS
    // ============================================================
    {
        operationId: "getLists",
        provider: "constantcontact",
        validCases: [
            {
                name: "basic_getLists",
                description: "Get all lists",
                input: {},
                expectedOutput: {
                    lists: [
                        {
                            id: "list-1",
                            name: "Newsletter Subscribers",
                            description: "Our main newsletter list",
                            membershipCount: 15234,
                            favorite: true,
                            createdAt: "2023-01-15T10:00:00Z",
                            updatedAt: "2024-01-15T14:30:00Z"
                        },
                        {
                            id: "list-2",
                            name: "Product Updates",
                            description: "Product announcement subscribers",
                            membershipCount: 8421,
                            favorite: false,
                            createdAt: "2023-03-20T09:00:00Z",
                            updatedAt: "2024-01-10T11:00:00Z"
                        }
                    ],
                    total: 2,
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
                    message: "Constant Contact rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getList",
        provider: "constantcontact",
        validCases: [
            {
                name: "basic_getList",
                description: "Get a single list by ID",
                input: {
                    listId: "list-1"
                },
                expectedOutput: {
                    id: "list-1",
                    name: "Newsletter Subscribers",
                    description: "Our main newsletter list",
                    membershipCount: 15234,
                    favorite: true,
                    createdAt: "2023-01-15T10:00:00Z",
                    updatedAt: "2024-01-15T14:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "List does not exist",
                input: {
                    listId: "list-99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Constant Contact.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createList",
        provider: "constantcontact",
        validCases: [
            {
                name: "basic_createList",
                description: "Create a new list",
                input: {
                    name: "Beta Testers",
                    description: "Beta program participants"
                },
                expectedOutput: {
                    id: "list-10",
                    name: "Beta Testers",
                    description: "Beta program participants",
                    membershipCount: 0,
                    favorite: false,
                    createdAt: "2024-01-15T10:00:00Z",
                    updatedAt: "2024-01-15T10:00:00Z"
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
                    message: "Constant Contact rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "addToList",
        provider: "constantcontact",
        validCases: [
            {
                name: "basic_addToList",
                description: "Add contacts to a list",
                input: {
                    listId: "list-1",
                    contactIds: ["cc-101", "cc-102"]
                },
                expectedOutput: {
                    added: true,
                    listId: "list-1",
                    contactIds: ["cc-101", "cc-102"],
                    activityId: "activity-123"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "List does not exist",
                input: {
                    listId: "list-99999",
                    contactIds: ["cc-101"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Constant Contact.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "removeFromList",
        provider: "constantcontact",
        validCases: [
            {
                name: "basic_removeFromList",
                description: "Remove contacts from a list",
                input: {
                    listId: "list-1",
                    contactIds: ["cc-101"]
                },
                expectedOutput: {
                    removed: true,
                    listId: "list-1",
                    contactIds: ["cc-101"],
                    activityId: "activity-124"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "List does not exist",
                input: {
                    listId: "list-99999",
                    contactIds: ["cc-101"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Constant Contact.",
                    retryable: false
                }
            }
        ]
    },
    // ============================================================
    // CAMPAIGN OPERATIONS
    // ============================================================
    {
        operationId: "getCampaigns",
        provider: "constantcontact",
        validCases: [
            {
                name: "basic_getCampaigns",
                description: "Get all campaigns",
                input: {},
                expectedOutput: {
                    campaigns: [
                        {
                            id: "campaign-1",
                            name: "January Newsletter",
                            type: "NEWSLETTER",
                            status: "SENT",
                            currentStatus: "SENT",
                            createdAt: "2024-01-02T10:00:00Z",
                            updatedAt: "2024-01-02T14:30:00Z",
                            sentDate: "2024-01-02T14:00:00Z"
                        },
                        {
                            id: "campaign-2",
                            name: "Product Launch",
                            type: "NEWSLETTER",
                            status: "DRAFT",
                            currentStatus: "DRAFT",
                            createdAt: "2024-01-10T09:00:00Z"
                        }
                    ],
                    total: 2,
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
                    message: "Constant Contact rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getCampaign",
        provider: "constantcontact",
        validCases: [
            {
                name: "basic_getCampaign",
                description: "Get a single campaign by ID",
                input: {
                    campaignId: "campaign-1"
                },
                expectedOutput: {
                    id: "campaign-1",
                    name: "January Newsletter",
                    type: "NEWSLETTER",
                    status: "SENT",
                    currentStatus: "SENT",
                    createdAt: "2024-01-02T10:00:00Z",
                    updatedAt: "2024-01-02T14:30:00Z",
                    sentDate: "2024-01-02T14:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Campaign does not exist",
                input: {
                    campaignId: "campaign-99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Constant Contact.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "scheduleCampaign",
        provider: "constantcontact",
        validCases: [
            {
                name: "basic_scheduleCampaign",
                description: "Schedule a campaign for sending",
                input: {
                    campaignId: "campaign-2",
                    scheduledDate: "2024-01-20T10:00:00Z"
                },
                expectedOutput: {
                    scheduled: true,
                    campaignId: "campaign-2",
                    scheduledDate: "2024-01-20T10:00:00Z",
                    activityId: "activity-125"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Campaign does not exist",
                input: {
                    campaignId: "campaign-99999",
                    scheduledDate: "2024-01-20T10:00:00Z"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Constant Contact.",
                    retryable: false
                }
            }
        ]
    },
    // ============================================================
    // TAG OPERATIONS
    // ============================================================
    {
        operationId: "addTagsToContacts",
        provider: "constantcontact",
        validCases: [
            {
                name: "basic_addTagsToContacts",
                description: "Add tags to contacts",
                input: {
                    tagIds: ["tag-1", "tag-2"],
                    contactIds: ["cc-101", "cc-102"]
                },
                expectedOutput: {
                    added: true,
                    tagIds: ["tag-1", "tag-2"],
                    contactIds: ["cc-101", "cc-102"],
                    activityId: "activity-126"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Tag or contact does not exist",
                input: {
                    tagIds: ["tag-99999"],
                    contactIds: ["cc-101"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Constant Contact.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "removeTagsFromContacts",
        provider: "constantcontact",
        validCases: [
            {
                name: "basic_removeTagsFromContacts",
                description: "Remove tags from contacts",
                input: {
                    tagIds: ["tag-1"],
                    contactIds: ["cc-101"]
                },
                expectedOutput: {
                    removed: true,
                    tagIds: ["tag-1"],
                    contactIds: ["cc-101"],
                    activityId: "activity-127"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Tag or contact does not exist",
                input: {
                    tagIds: ["tag-99999"],
                    contactIds: ["cc-101"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Constant Contact.",
                    retryable: false
                }
            }
        ]
    }
];
