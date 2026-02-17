/**
 * HubSpot Marketing Provider Test Fixtures
 *
 * Comprehensive test fixtures for HubSpot Marketing operations
 * including lists, contacts, campaigns, forms, emails, and workflows.
 */

import type { TestFixture } from "../../sandbox";

export const hubspotMarketingFixtures: TestFixture[] = [
    // ============================================================
    // LIST OPERATIONS
    // ============================================================
    {
        operationId: "getLists",
        provider: "hubspot-marketing",
        validCases: [
            {
                name: "basic_getLists",
                description: "Get all marketing lists",
                input: {},
                expectedOutput: {
                    lists: [
                        {
                            id: 12345,
                            name: "Newsletter Subscribers",
                            listType: "static",
                            size: 15234,
                            createdAt: "2023-06-15T10:00:00Z",
                            updatedAt: "2024-01-15T14:30:00Z",
                            deletable: true
                        },
                        {
                            id: 12346,
                            name: "Active Users - Last 30 Days",
                            listType: "dynamic",
                            size: 8421,
                            createdAt: "2023-08-20T09:00:00Z",
                            updatedAt: "2024-01-15T08:00:00Z",
                            deletable: true
                        },
                        {
                            id: 12347,
                            name: "Enterprise Customers",
                            listType: "static",
                            size: 156,
                            createdAt: "2023-03-10T11:00:00Z",
                            updatedAt: "2024-01-10T16:00:00Z",
                            deletable: true
                        }
                    ],
                    totalItems: 3,
                    hasMore: false,
                    offset: 0
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
                    message: "HubSpot rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getList",
        provider: "hubspot-marketing",
        validCases: [
            {
                name: "basic_getList",
                description: "Get a single list by ID",
                input: {
                    listId: 12345
                },
                expectedOutput: {
                    id: 12345,
                    name: "Newsletter Subscribers",
                    listType: "static",
                    size: 15234,
                    createdAt: "2023-06-15T10:00:00Z",
                    updatedAt: "2024-01-15T14:30:00Z",
                    deletable: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "List does not exist",
                input: {
                    listId: 99999
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in HubSpot.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createList",
        provider: "hubspot-marketing",
        validCases: [
            {
                name: "basic_createList",
                description: "Create a new static list",
                input: {
                    name: "Product Launch 2024",
                    dynamic: false
                },
                expectedOutput: {
                    id: 12350,
                    name: "Product Launch 2024",
                    listType: "static",
                    size: 0,
                    createdAt: "2024-01-15T10:00:00Z",
                    updatedAt: "2024-01-15T10:00:00Z",
                    deletable: true
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "Test List"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "HubSpot rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "addToList",
        provider: "hubspot-marketing",
        validCases: [
            {
                name: "basic_addToList",
                description: "Add contacts to a list",
                input: {
                    listId: 12345,
                    contactIds: ["101", "102", "103"]
                },
                expectedOutput: {
                    added: true,
                    listId: 12345,
                    updatedContacts: ["101", "102", "103"],
                    discardedContacts: []
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "List does not exist",
                input: {
                    listId: 99999,
                    contactIds: ["101"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in HubSpot.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "removeFromList",
        provider: "hubspot-marketing",
        validCases: [
            {
                name: "basic_removeFromList",
                description: "Remove contacts from a list",
                input: {
                    listId: 12345,
                    contactIds: ["101", "102"]
                },
                expectedOutput: {
                    removed: true,
                    listId: 12345,
                    updatedContacts: ["101", "102"],
                    discardedContacts: []
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "List does not exist",
                input: {
                    listId: 99999,
                    contactIds: ["101"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in HubSpot.",
                    retryable: false
                }
            }
        ]
    },
    // ============================================================
    // CONTACT OPERATIONS
    // ============================================================
    {
        operationId: "getContacts",
        provider: "hubspot-marketing",
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
                            company: "Tech Startup Inc",
                            lifecycleStage: "customer",
                            properties: {
                                email: "john.smith@techstartup.io",
                                firstname: "John",
                                lastname: "Smith",
                                company: "Tech Startup Inc",
                                lifecyclestage: "customer"
                            },
                            createdAt: "2023-06-15T10:00:00Z",
                            updatedAt: "2024-01-10T14:30:00Z"
                        },
                        {
                            id: "102",
                            email: "sarah.jones@acmecorp.com",
                            firstName: "Sarah",
                            lastName: "Jones",
                            company: "ACME Corp",
                            lifecycleStage: "lead",
                            properties: {
                                email: "sarah.jones@acmecorp.com",
                                firstname: "Sarah",
                                lastname: "Jones",
                                company: "ACME Corp",
                                lifecyclestage: "lead"
                            },
                            createdAt: "2023-09-20T11:00:00Z",
                            updatedAt: "2024-01-12T09:00:00Z"
                        }
                    ],
                    hasMore: true,
                    nextCursor: "eyJhZnRlciI6MTAyfQ=="
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
                    message: "HubSpot rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getContact",
        provider: "hubspot-marketing",
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
                    company: "Tech Startup Inc",
                    phone: "+1-415-555-0100",
                    lifecycleStage: "customer",
                    properties: {
                        email: "john.smith@techstartup.io",
                        firstname: "John",
                        lastname: "Smith",
                        company: "Tech Startup Inc",
                        phone: "+1-415-555-0100",
                        lifecyclestage: "customer"
                    },
                    createdAt: "2023-06-15T10:00:00Z",
                    updatedAt: "2024-01-10T14:30:00Z"
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
                    message: "Resource not found in HubSpot.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createContact",
        provider: "hubspot-marketing",
        validCases: [
            {
                name: "basic_createContact",
                description: "Create a new contact",
                input: {
                    email: "new.user@example.com",
                    firstName: "New",
                    lastName: "User",
                    company: "Example Corp",
                    lifecycleStage: "subscriber"
                },
                expectedOutput: {
                    id: "105",
                    email: "new.user@example.com",
                    firstName: "New",
                    lastName: "User",
                    company: "Example Corp",
                    lifecycleStage: "subscriber",
                    properties: {
                        email: "new.user@example.com",
                        firstname: "New",
                        lastname: "User",
                        company: "Example Corp",
                        lifecyclestage: "subscriber"
                    },
                    createdAt: "2024-01-15T10:00:00Z",
                    updatedAt: "2024-01-15T10:00:00Z"
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
                    message: "Contact already exists with the email address 'existing@example.com'",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updateContact",
        provider: "hubspot-marketing",
        validCases: [
            {
                name: "basic_updateContact",
                description: "Update contact properties",
                input: {
                    contactId: "101",
                    firstName: "Jonathan",
                    lifecycleStage: "customer"
                },
                expectedOutput: {
                    id: "101",
                    email: "john.smith@techstartup.io",
                    firstName: "Jonathan",
                    lastName: "Smith",
                    company: "Tech Startup Inc",
                    lifecycleStage: "customer",
                    properties: {
                        email: "john.smith@techstartup.io",
                        firstname: "Jonathan",
                        lastname: "Smith",
                        company: "Tech Startup Inc",
                        lifecyclestage: "customer"
                    },
                    createdAt: "2023-06-15T10:00:00Z",
                    updatedAt: "2024-01-15T10:00:00Z"
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
                    message: "Resource not found in HubSpot.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "deleteContact",
        provider: "hubspot-marketing",
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
                    message: "Resource not found in HubSpot.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "searchContacts",
        provider: "hubspot-marketing",
        validCases: [
            {
                name: "basic_searchContacts",
                description: "Search contacts by query",
                input: {
                    query: "john"
                },
                expectedOutput: {
                    contacts: [
                        {
                            id: "101",
                            email: "john.smith@techstartup.io",
                            firstName: "John",
                            lastName: "Smith",
                            company: "Tech Startup Inc",
                            lifecycleStage: "customer",
                            properties: {
                                email: "john.smith@techstartup.io",
                                firstname: "John",
                                lastname: "Smith",
                                company: "Tech Startup Inc",
                                lifecyclestage: "customer"
                            },
                            createdAt: "2023-06-15T10:00:00Z",
                            updatedAt: "2024-01-10T14:30:00Z"
                        }
                    ],
                    total: 1,
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    query: "test"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "HubSpot rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    // ============================================================
    // CAMPAIGN OPERATIONS
    // ============================================================
    {
        operationId: "getCampaigns",
        provider: "hubspot-marketing",
        validCases: [
            {
                name: "basic_getCampaigns",
                description: "Get all email campaigns",
                input: {},
                expectedOutput: {
                    campaigns: [
                        {
                            id: "campaign_001",
                            name: "January 2024 Newsletter",
                            subject: "Happy New Year from Our Team!",
                            type: "BATCH_EMAIL",
                            appName: "Email",
                            numIncluded: 15234,
                            numQueued: 0,
                            lastUpdatedTime: "2024-01-02T14:00:00Z"
                        },
                        {
                            id: "campaign_002",
                            name: "Product Launch Announcement",
                            subject: "Introducing Our Biggest Update Yet",
                            type: "BATCH_EMAIL",
                            appName: "Email",
                            numIncluded: 8421,
                            lastUpdatedTime: "2024-01-10T11:00:00Z"
                        }
                    ],
                    hasMore: false,
                    offset: 0
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
                    message: "HubSpot rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getCampaign",
        provider: "hubspot-marketing",
        validCases: [
            {
                name: "basic_getCampaign",
                description: "Get a single campaign by ID",
                input: {
                    campaignId: "campaign_001"
                },
                expectedOutput: {
                    id: "campaign_001",
                    name: "January 2024 Newsletter",
                    subject: "Happy New Year from Our Team!",
                    type: "BATCH_EMAIL",
                    appName: "Email",
                    numIncluded: 15234,
                    numQueued: 0,
                    lastUpdatedTime: "2024-01-02T14:00:00Z"
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
                    message: "Resource not found in HubSpot.",
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
        provider: "hubspot-marketing",
        validCases: [
            {
                name: "basic_getForms",
                description: "Get all forms",
                input: {},
                expectedOutput: {
                    forms: [
                        {
                            id: "form_001",
                            name: "Newsletter Signup",
                            formType: "HUBSPOT",
                            submitText: "Subscribe",
                            createdAt: "2023-06-15T10:00:00Z",
                            updatedAt: "2024-01-10T14:00:00Z",
                            fields: [
                                {
                                    name: "email",
                                    label: "Email Address",
                                    type: "email",
                                    required: true
                                },
                                {
                                    name: "firstname",
                                    label: "First Name",
                                    type: "text",
                                    required: false
                                }
                            ]
                        },
                        {
                            id: "form_002",
                            name: "Contact Us",
                            formType: "HUBSPOT",
                            submitText: "Submit",
                            createdAt: "2023-08-20T09:00:00Z",
                            updatedAt: "2024-01-05T11:00:00Z",
                            fields: [
                                {
                                    name: "email",
                                    label: "Email",
                                    type: "email",
                                    required: true
                                },
                                {
                                    name: "message",
                                    label: "Message",
                                    type: "textarea",
                                    required: true
                                }
                            ]
                        }
                    ],
                    totalItems: 2
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
                    message: "HubSpot rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getFormSubmissions",
        provider: "hubspot-marketing",
        validCases: [
            {
                name: "basic_getFormSubmissions",
                description: "Get submissions for a form",
                input: {
                    formId: "form_001"
                },
                expectedOutput: {
                    submissions: [
                        {
                            submittedAt: "2024-01-15T10:30:00Z",
                            values: {
                                email: "subscriber1@example.com",
                                firstname: "John"
                            },
                            pageUrl: "https://example.com/signup",
                            pageName: "Newsletter Signup Page"
                        },
                        {
                            submittedAt: "2024-01-14T14:00:00Z",
                            values: {
                                email: "subscriber2@example.com",
                                firstname: "Jane"
                            },
                            pageUrl: "https://example.com/signup"
                        }
                    ],
                    hasMore: true,
                    nextCursor: "eyJhZnRlciI6Mn0="
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Form does not exist",
                input: {
                    formId: "nonexistent_form"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in HubSpot.",
                    retryable: false
                }
            }
        ]
    },
    // ============================================================
    // EMAIL OPERATIONS
    // ============================================================
    {
        operationId: "getMarketingEmails",
        provider: "hubspot-marketing",
        validCases: [
            {
                name: "basic_getMarketingEmails",
                description: "Get all marketing emails",
                input: {},
                expectedOutput: {
                    emails: [
                        {
                            id: 1001,
                            name: "January Newsletter",
                            subject: "Happy New Year!",
                            state: "PUBLISHED",
                            type: "BATCH_EMAIL",
                            campaignId: 2001,
                            createdAt: "2024-01-01T10:00:00Z",
                            updatedAt: "2024-01-02T14:00:00Z",
                            publishedAt: "2024-01-02T14:00:00Z",
                            stats: {
                                sent: 15234,
                                delivered: 14892,
                                bounced: 342,
                                opened: 5678,
                                clicked: 1234,
                                unsubscribed: 45,
                                openRate: 0.381,
                                clickRate: 0.083
                            }
                        },
                        {
                            id: 1002,
                            name: "Product Update Draft",
                            subject: "Exciting New Features",
                            state: "DRAFT",
                            type: "BATCH_EMAIL",
                            createdAt: "2024-01-10T11:00:00Z",
                            updatedAt: "2024-01-14T16:00:00Z"
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
                    message: "HubSpot rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getEmailStats",
        provider: "hubspot-marketing",
        validCases: [
            {
                name: "basic_getEmailStats",
                description: "Get stats for a marketing email",
                input: {
                    emailId: 1001
                },
                expectedOutput: {
                    emailId: 1001,
                    sent: 15234,
                    delivered: 14892,
                    bounced: 342,
                    opened: 5678,
                    clicked: 1234,
                    unsubscribed: 45,
                    openRate: 0.381,
                    clickRate: 0.083,
                    clickThroughRate: 0.218,
                    unsubscribeRate: 0.003
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Email does not exist",
                input: {
                    emailId: 99999
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in HubSpot.",
                    retryable: false
                }
            }
        ]
    },
    // ============================================================
    // WORKFLOW OPERATIONS
    // ============================================================
    {
        operationId: "getWorkflows",
        provider: "hubspot-marketing",
        validCases: [
            {
                name: "basic_getWorkflows",
                description: "Get all automation workflows",
                input: {},
                expectedOutput: {
                    workflows: [
                        {
                            id: 3001,
                            name: "New Lead Welcome Series",
                            type: "DRIP_DELAY",
                            enabled: true,
                            createdAt: "2023-06-01T10:00:00Z",
                            updatedAt: "2024-01-10T14:00:00Z",
                            enrolledCount: 5234,
                            activeCount: 1234,
                            completedCount: 4000
                        },
                        {
                            id: 3002,
                            name: "Re-engagement Campaign",
                            type: "DRIP_DELAY",
                            enabled: true,
                            createdAt: "2023-09-15T11:00:00Z",
                            updatedAt: "2024-01-12T09:00:00Z",
                            enrolledCount: 892,
                            activeCount: 456,
                            completedCount: 436
                        },
                        {
                            id: 3003,
                            name: "Customer Onboarding",
                            type: "DRIP_DELAY",
                            enabled: false,
                            createdAt: "2023-03-20T09:00:00Z",
                            updatedAt: "2023-12-01T16:00:00Z",
                            enrolledCount: 2341,
                            activeCount: 0,
                            completedCount: 2341
                        }
                    ],
                    totalItems: 3
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
                    message: "HubSpot rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    }
];
