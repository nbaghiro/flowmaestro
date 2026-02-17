/**
 * ActiveCampaign Provider Test Fixtures
 *
 * Comprehensive test fixtures for ActiveCampaign operations
 * including contacts, lists, tags, automations, and campaigns.
 */

import type { TestFixture } from "../../sandbox";

export const activecampaignFixtures: TestFixture[] = [
    // ============================================================
    // CONTACT OPERATIONS
    // ============================================================
    {
        operationId: "getContacts",
        provider: "activecampaign",
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
                            id: "101",
                            email: "john.smith@techstartup.io",
                            firstName: "John",
                            lastName: "Smith",
                            phone: "+1-415-555-0100",
                            createdAt: "2023-06-15T10:00:00-05:00",
                            updatedAt: "2024-01-10T14:30:00-05:00"
                        },
                        {
                            id: "102",
                            email: "sarah.jones@acmecorp.com",
                            firstName: "Sarah",
                            lastName: "Jones",
                            createdAt: "2023-09-20T11:00:00-05:00",
                            updatedAt: "2024-01-12T09:00:00-05:00"
                        }
                    ],
                    total: 2543,
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
                    message: "ActiveCampaign rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getContact",
        provider: "activecampaign",
        validCases: [
            {
                name: "basic_getContact",
                description: "Get a single contact by ID",
                input: {
                    contactId: "101"
                },
                expectedOutput: {
                    id: "101",
                    email: "john.smith@techstartup.io",
                    firstName: "John",
                    lastName: "Smith",
                    phone: "+1-415-555-0100",
                    createdAt: "2023-06-15T10:00:00-05:00",
                    updatedAt: "2024-01-10T14:30:00-05:00"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact does not exist",
                input: {
                    contactId: "99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in ActiveCampaign.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createContact",
        provider: "activecampaign",
        validCases: [
            {
                name: "basic_createContact",
                description: "Create a new contact",
                input: {
                    email: "new.user@example.com",
                    firstName: "New",
                    lastName: "User"
                },
                expectedOutput: {
                    id: "105",
                    email: "new.user@example.com",
                    firstName: "New",
                    lastName: "User",
                    createdAt: "2024-01-15T10:00:00-05:00",
                    updatedAt: "2024-01-15T10:00:00-05:00"
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
        provider: "activecampaign",
        validCases: [
            {
                name: "basic_updateContact",
                description: "Update contact name",
                input: {
                    contactId: "101",
                    firstName: "Jonathan"
                },
                expectedOutput: {
                    id: "101",
                    email: "john.smith@techstartup.io",
                    firstName: "Jonathan",
                    lastName: "Smith",
                    phone: "+1-415-555-0100",
                    createdAt: "2023-06-15T10:00:00-05:00",
                    updatedAt: "2024-01-15T10:00:00-05:00"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact does not exist",
                input: {
                    contactId: "99999",
                    firstName: "Test"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in ActiveCampaign.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "deleteContact",
        provider: "activecampaign",
        validCases: [
            {
                name: "basic_deleteContact",
                description: "Delete a contact",
                input: {
                    contactId: "101"
                },
                expectedOutput: {
                    deleted: true,
                    contactId: "101"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact does not exist",
                input: {
                    contactId: "99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in ActiveCampaign.",
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
        provider: "activecampaign",
        validCases: [
            {
                name: "basic_getLists",
                description: "Get all lists",
                input: {},
                expectedOutput: {
                    lists: [
                        {
                            id: "1",
                            name: "Newsletter Subscribers",
                            stringId: "newsletter-subscribers",
                            senderName: "Marketing Team",
                            senderEmail: "marketing@example.com",
                            senderUrl: "https://example.com",
                            senderReminder: "You signed up on our website",
                            subscriberCount: 15234,
                            createdAt: "2023-01-15T10:00:00-05:00",
                            updatedAt: "2024-01-15T14:30:00-05:00"
                        },
                        {
                            id: "2",
                            name: "Product Updates",
                            stringId: "product-updates",
                            senderName: "Product Team",
                            senderEmail: "product@example.com",
                            senderUrl: "https://example.com",
                            senderReminder: "You opted in for product updates",
                            subscriberCount: 8421,
                            createdAt: "2023-03-20T09:00:00-05:00",
                            updatedAt: "2024-01-10T11:00:00-05:00"
                        }
                    ],
                    total: 5,
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
                    message: "ActiveCampaign rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getList",
        provider: "activecampaign",
        validCases: [
            {
                name: "basic_getList",
                description: "Get a single list by ID",
                input: {
                    listId: "1"
                },
                expectedOutput: {
                    id: "1",
                    name: "Newsletter Subscribers",
                    stringId: "newsletter-subscribers",
                    senderName: "Marketing Team",
                    senderEmail: "marketing@example.com",
                    senderUrl: "https://example.com",
                    senderReminder: "You signed up on our website",
                    subscriberCount: 15234,
                    createdAt: "2023-01-15T10:00:00-05:00",
                    updatedAt: "2024-01-15T14:30:00-05:00"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "List does not exist",
                input: {
                    listId: "99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in ActiveCampaign.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createList",
        provider: "activecampaign",
        validCases: [
            {
                name: "basic_createList",
                description: "Create a new list",
                input: {
                    name: "Beta Testers",
                    stringId: "beta-testers",
                    senderUrl: "https://example.com",
                    senderReminder: "You signed up for our beta program"
                },
                expectedOutput: {
                    id: "10",
                    name: "Beta Testers",
                    stringId: "beta-testers",
                    senderName: "",
                    senderEmail: "",
                    senderUrl: "https://example.com",
                    senderReminder: "You signed up for our beta program",
                    subscriberCount: 0,
                    createdAt: "2024-01-15T10:00:00-05:00",
                    updatedAt: "2024-01-15T10:00:00-05:00"
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "Test",
                    stringId: "test",
                    senderUrl: "https://example.com",
                    senderReminder: "Test"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "ActiveCampaign rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "addToList",
        provider: "activecampaign",
        validCases: [
            {
                name: "basic_addToList",
                description: "Add a contact to a list",
                input: {
                    contactId: "101",
                    listId: "1"
                },
                expectedOutput: {
                    added: true,
                    contactId: "101",
                    listId: "1",
                    status: "1"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact or list does not exist",
                input: {
                    contactId: "99999",
                    listId: "1"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in ActiveCampaign.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "removeFromList",
        provider: "activecampaign",
        validCases: [
            {
                name: "basic_removeFromList",
                description: "Remove a contact from a list",
                input: {
                    contactId: "101",
                    listId: "1"
                },
                expectedOutput: {
                    removed: true,
                    contactId: "101",
                    listId: "1"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact or list does not exist",
                input: {
                    contactId: "99999",
                    listId: "1"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in ActiveCampaign.",
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
        provider: "activecampaign",
        validCases: [
            {
                name: "basic_getTags",
                description: "Get all tags",
                input: {},
                expectedOutput: {
                    tags: [
                        {
                            id: "1",
                            name: "VIP",
                            type: "contact",
                            description: "High-value customers",
                            subscriberCount: 156,
                            createdAt: "2023-01-10T09:00:00-05:00"
                        },
                        {
                            id: "2",
                            name: "Lead",
                            type: "contact",
                            description: "Potential customers",
                            subscriberCount: 2341,
                            createdAt: "2023-02-15T11:00:00-05:00"
                        },
                        {
                            id: "3",
                            name: "Enterprise",
                            type: "contact",
                            subscriberCount: 89,
                            createdAt: "2023-03-20T14:00:00-05:00"
                        }
                    ],
                    total: 25,
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
                    message: "ActiveCampaign rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "addTag",
        provider: "activecampaign",
        validCases: [
            {
                name: "basic_addTag",
                description: "Add a tag to a contact",
                input: {
                    contactId: "101",
                    tagId: "1"
                },
                expectedOutput: {
                    added: true,
                    contactId: "101",
                    tagId: "1",
                    contactTagId: "5001",
                    createdAt: "2024-01-15T10:00:00-05:00"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact or tag does not exist",
                input: {
                    contactId: "99999",
                    tagId: "1"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in ActiveCampaign.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "removeTag",
        provider: "activecampaign",
        validCases: [
            {
                name: "basic_removeTag",
                description: "Remove a tag from a contact",
                input: {
                    contactTagId: "5001"
                },
                expectedOutput: {
                    removed: true,
                    contactTagId: "5001"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact-tag association does not exist",
                input: {
                    contactTagId: "99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in ActiveCampaign.",
                    retryable: false
                }
            }
        ]
    },
    // ============================================================
    // AUTOMATION OPERATIONS
    // ============================================================
    {
        operationId: "getAutomations",
        provider: "activecampaign",
        validCases: [
            {
                name: "basic_getAutomations",
                description: "Get all automations",
                input: {},
                expectedOutput: {
                    automations: [
                        {
                            id: "1",
                            name: "Welcome Series",
                            status: "active",
                            enteredCount: 5234,
                            exitedCount: 4000,
                            createdAt: "2023-01-15T10:00:00-05:00",
                            updatedAt: "2024-01-10T14:00:00-05:00"
                        },
                        {
                            id: "2",
                            name: "Re-engagement Campaign",
                            status: "active",
                            enteredCount: 892,
                            exitedCount: 456,
                            createdAt: "2023-06-20T09:00:00-05:00",
                            updatedAt: "2024-01-12T11:00:00-05:00"
                        },
                        {
                            id: "3",
                            name: "Lead Nurturing",
                            status: "inactive",
                            enteredCount: 2341,
                            exitedCount: 2341,
                            createdAt: "2023-03-10T11:00:00-05:00",
                            updatedAt: "2023-12-01T16:00:00-05:00"
                        }
                    ],
                    total: 12,
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
                    message: "ActiveCampaign rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "addContactToAutomation",
        provider: "activecampaign",
        validCases: [
            {
                name: "basic_addContactToAutomation",
                description: "Add a contact to an automation",
                input: {
                    contactId: "101",
                    automationId: "1"
                },
                expectedOutput: {
                    added: true,
                    contactId: "101",
                    automationId: "1"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact or automation does not exist",
                input: {
                    contactId: "99999",
                    automationId: "1"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in ActiveCampaign.",
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
        provider: "activecampaign",
        validCases: [
            {
                name: "basic_getCampaigns",
                description: "Get all campaigns",
                input: {},
                expectedOutput: {
                    campaigns: [
                        {
                            id: "1",
                            name: "January Newsletter",
                            type: "single",
                            status: "sent",
                            sentDate: "2024-01-02T14:00:00-05:00",
                            lastSentDate: "2024-01-02T14:30:00-05:00",
                            stats: {
                                sent: 15234,
                                opens: 5678,
                                uniqueOpens: 4234,
                                clicks: 1234,
                                uniqueClicks: 892,
                                unsubscribes: 45,
                                bounceSoft: 23,
                                bounceHard: 12
                            }
                        },
                        {
                            id: "2",
                            name: "Product Launch",
                            type: "single",
                            status: "draft",
                            stats: {
                                sent: 0,
                                opens: 0,
                                uniqueOpens: 0,
                                clicks: 0,
                                uniqueClicks: 0,
                                unsubscribes: 0,
                                bounceSoft: 0,
                                bounceHard: 0
                            }
                        }
                    ],
                    total: 45,
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
                    message: "ActiveCampaign rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getCampaignStats",
        provider: "activecampaign",
        validCases: [
            {
                name: "basic_getCampaignStats",
                description: "Get stats for a campaign",
                input: {
                    campaignId: "1"
                },
                expectedOutput: {
                    id: "1",
                    name: "January Newsletter",
                    type: "single",
                    status: "sent",
                    sentDate: "2024-01-02T14:00:00-05:00",
                    lastSentDate: "2024-01-02T14:30:00-05:00",
                    stats: {
                        sent: 15234,
                        opens: 5678,
                        uniqueOpens: 4234,
                        clicks: 1234,
                        uniqueClicks: 892,
                        unsubscribes: 45,
                        bounceSoft: 23,
                        bounceHard: 12
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Campaign does not exist",
                input: {
                    campaignId: "99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in ActiveCampaign.",
                    retryable: false
                }
            }
        ]
    },
    // ============================================================
    // CUSTOM FIELD OPERATIONS
    // ============================================================
    {
        operationId: "getCustomFields",
        provider: "activecampaign",
        validCases: [
            {
                name: "basic_getCustomFields",
                description: "Get all custom fields",
                input: {},
                expectedOutput: {
                    fields: [
                        {
                            id: "1",
                            title: "Company Size",
                            description: "Number of employees",
                            type: "dropdown",
                            personalizationTag: "%COMPANY_SIZE%",
                            createdAt: "2023-01-10T09:00:00-05:00",
                            updatedAt: "2024-01-05T14:00:00-05:00"
                        },
                        {
                            id: "2",
                            title: "Industry",
                            description: "Company industry",
                            type: "dropdown",
                            personalizationTag: "%INDUSTRY%",
                            createdAt: "2023-01-10T09:30:00-05:00",
                            updatedAt: "2024-01-05T14:00:00-05:00"
                        },
                        {
                            id: "3",
                            title: "Lead Source",
                            type: "text",
                            personalizationTag: "%LEAD_SOURCE%",
                            createdAt: "2023-02-15T11:00:00-05:00",
                            updatedAt: "2023-02-15T11:00:00-05:00"
                        }
                    ],
                    total: 15,
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
                    message: "ActiveCampaign rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    }
];
