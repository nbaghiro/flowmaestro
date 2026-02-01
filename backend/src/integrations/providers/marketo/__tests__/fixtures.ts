/**
 * Marketo Provider Test Fixtures
 *
 * Based on official Marketo REST API documentation:
 * - Lead API: https://developers.marketo.com/rest-api/lead-database/leads/
 * - List API: https://developers.marketo.com/rest-api/lead-database/static-lists/
 * - Campaign API: https://developers.marketo.com/rest-api/assets/smart-campaigns/
 */

import type { TestFixture } from "../../../sandbox";

export const marketoFixtures: TestFixture[] = [
    {
        operationId: "addToList",
        provider: "marketo",
        validCases: [
            {
                name: "add_leads_to_list",
                description: "Add leads to a static list",
                input: {
                    listId: 1024,
                    leadIds: [501234, 501235, 501236, 501237]
                },
                expectedOutput: {
                    listId: 1024,
                    results: [
                        {
                            id: 501234,
                            status: "added"
                        },
                        {
                            id: 501235,
                            status: "added"
                        },
                        {
                            id: 501236,
                            status: "membershipChanged"
                        },
                        {
                            id: 501237,
                            status: "added"
                        }
                    ],
                    summary: {
                        total: 4,
                        added: 3,
                        memberAlready: 1,
                        skipped: 0
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "list_not_found",
                description: "Static list does not exist",
                input: {
                    listId: 999999,
                    leadIds: [501234]
                },
                expectedError: {
                    type: "server_error",
                    message: "List not found",
                    retryable: false
                }
            },
            {
                name: "invalid_lead_ids",
                description: "One or more lead IDs do not exist",
                input: {
                    listId: 1024,
                    leadIds: [999999999]
                },
                expectedError: {
                    type: "server_error",
                    message: "Lead not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    listId: 1024,
                    leadIds: [501234]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a few seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createLead",
        provider: "marketo",
        validCases: [
            {
                name: "create_lead",
                description: "Create a new lead with contact and company details",
                input: {
                    email: "sarah.johnson@acmeinc.com",
                    firstName: "Sarah",
                    lastName: "Johnson",
                    company: "Acme Inc",
                    phone: "+1-555-123-4567",
                    title: "VP of Marketing"
                },
                expectedOutput: {
                    id: 501235,
                    status: "created",
                    email: "sarah.johnson@acmeinc.com"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_email",
                description: "Email format is invalid",
                input: {
                    email: "not-a-valid-email",
                    firstName: "Test",
                    lastName: "User"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid value for field 'email': not-a-valid-email",
                    retryable: false
                }
            },
            {
                name: "duplicate_in_partition",
                description:
                    "Lead with email already exists in partition and lookupField is set to create only",
                input: {
                    email: "duplicate@company.com",
                    firstName: "Duplicate",
                    lastName: "Lead"
                },
                expectedError: {
                    type: "validation",
                    message: "Duplicate lead found with email: duplicate@company.com",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    email: "test@example.com",
                    firstName: "Test",
                    lastName: "User"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a few seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getCampaigns",
        provider: "marketo",
        validCases: [
            {
                name: "get_campaigns",
                description: "Get all smart campaigns",
                input: {},
                expectedOutput: {
                    campaigns: [
                        {
                            id: 2001,
                            name: "Welcome Email Series",
                            description: "Automated welcome email flow for new leads",
                            type: "trigger",
                            programName: "Nurture - New Leads",
                            programId: 3001,
                            workspaceName: "Default",
                            createdAt: "2024-01-15T10:30:00Z",
                            updatedAt: "2024-01-20T14:45:00Z",
                            active: true
                        },
                        {
                            id: 2002,
                            name: "Product Demo Follow-up",
                            description: "Follow-up campaign after product demo requests",
                            type: "trigger",
                            programName: "Sales Enablement",
                            programId: 3002,
                            workspaceName: "Default",
                            createdAt: "2024-01-18T09:00:00Z",
                            updatedAt: "2024-01-25T11:30:00Z",
                            active: true
                        },
                        {
                            id: 2003,
                            name: "Re-engagement Campaign",
                            description: "Win-back campaign for inactive leads",
                            type: "batch",
                            programName: "Re-engagement",
                            programId: 3003,
                            workspaceName: "Default",
                            createdAt: "2024-01-10T08:00:00Z",
                            updatedAt: "2024-01-22T16:00:00Z",
                            active: false
                        },
                        {
                            id: 2004,
                            name: "Event Registration Confirmation",
                            description: "Sends confirmation after webinar registration",
                            type: "trigger",
                            programName: "Q1 Webinar Series",
                            programId: 3004,
                            workspaceName: "Events",
                            createdAt: "2024-02-01T12:00:00Z",
                            updatedAt: "2024-02-05T09:15:00Z",
                            active: true
                        }
                    ],
                    nextPageToken: null,
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_page_token",
                description: "Invalid pagination token provided",
                input: {
                    nextPageToken: "invalid-token-123"
                },
                expectedError: {
                    type: "server_error",
                    message: "Invalid page token",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a few seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getLead",
        provider: "marketo",
        validCases: [
            {
                name: "get_lead_by_id",
                description: "Get a single lead by ID",
                input: {
                    leadId: 501234
                },
                expectedOutput: {
                    id: 501234,
                    email: "john.doe@techcorp.com",
                    firstName: "John",
                    lastName: "Doe",
                    company: "TechCorp",
                    phone: "+1-555-123-4567",
                    createdAt: "2024-01-15T10:30:00Z",
                    updatedAt: "2024-01-28T14:45:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "lead_not_found",
                description: "Lead with specified ID does not exist",
                input: {
                    leadId: 999999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Lead with ID 999999999 not found",
                    retryable: false
                }
            },
            {
                name: "invalid_field_name",
                description: "One or more requested fields do not exist",
                input: {
                    leadId: 501234,
                    fields: ["email", "nonExistentField"]
                },
                expectedError: {
                    type: "server_error",
                    message: "Unknown field: nonExistentField",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    leadId: 501234
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a few seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getLeads",
        provider: "marketo",
        validCases: [
            {
                name: "get_leads_by_email",
                description: "Query leads by email addresses",
                input: {
                    filterType: "email",
                    filterValues: ["john.doe@techcorp.com", "sarah.johnson@acmeinc.com"]
                },
                expectedOutput: {
                    leads: [
                        {
                            id: 501234,
                            email: "john.doe@techcorp.com",
                            firstName: "John",
                            lastName: "Doe",
                            company: "TechCorp",
                            createdAt: "2024-01-15T10:30:00Z",
                            updatedAt: "2024-01-28T14:45:00Z"
                        },
                        {
                            id: 501235,
                            email: "sarah.johnson@acmeinc.com",
                            firstName: "Sarah",
                            lastName: "Johnson",
                            company: "Acme Inc",
                            createdAt: "2024-01-18T09:00:00Z",
                            updatedAt: "2024-01-30T11:30:00Z"
                        }
                    ],
                    nextPageToken: null,
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_filter_type",
                description: "Filter type is not a valid field",
                input: {
                    filterType: "invalidField",
                    filterValues: ["value"]
                },
                expectedError: {
                    type: "server_error",
                    message: "Unknown filter field: invalidField",
                    retryable: false
                }
            },
            {
                name: "too_many_filter_values",
                description: "More than 300 filter values provided",
                input: {
                    filterType: "email",
                    filterValues: Array(301).fill("email@example.com")
                },
                expectedError: {
                    type: "validation",
                    message: "Filter values cannot exceed 300 items",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    filterType: "email",
                    filterValues: ["test@example.com"]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a few seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getListMembers",
        provider: "marketo",
        validCases: [
            {
                name: "get_list_members",
                description: "Get all leads in a static list",
                input: {
                    listId: 1024
                },
                expectedOutput: {
                    leads: [
                        {
                            id: 501234,
                            email: "john.doe@techcorp.com",
                            firstName: "John",
                            lastName: "Doe",
                            createdAt: "2024-01-15T10:30:00Z",
                            updatedAt: "2024-01-28T14:45:00Z"
                        },
                        {
                            id: 501235,
                            email: "sarah.johnson@acmeinc.com",
                            firstName: "Sarah",
                            lastName: "Johnson",
                            createdAt: "2024-01-18T09:00:00Z",
                            updatedAt: "2024-01-30T11:30:00Z"
                        },
                        {
                            id: 501236,
                            email: "michael.chen@globaltech.io",
                            firstName: "Michael",
                            lastName: "Chen",
                            createdAt: "2024-01-20T14:00:00Z",
                            updatedAt: "2024-02-01T16:15:00Z"
                        }
                    ],
                    nextPageToken: null,
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "list_not_found",
                description: "Static list does not exist",
                input: {
                    listId: 999999
                },
                expectedError: {
                    type: "server_error",
                    message: "List not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    listId: 1024
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a few seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getLists",
        provider: "marketo",
        validCases: [
            {
                name: "get_lists",
                description: "Get all static lists",
                input: {},
                expectedOutput: {
                    lists: [
                        {
                            id: 1024,
                            name: "Newsletter Subscribers",
                            description: "Active subscribers to our monthly newsletter",
                            createdAt: "2024-01-10T09:00:00Z",
                            updatedAt: "2024-02-01T14:30:00Z",
                            folder: {
                                id: 100,
                                type: "Folder"
                            },
                            computedUrl: "https://app-abc.marketo.com/#SL1024A1"
                        },
                        {
                            id: 1025,
                            name: "Enterprise Leads - Hot",
                            description: "High-value enterprise leads ready for sales outreach",
                            createdAt: "2024-01-15T11:00:00Z",
                            updatedAt: "2024-02-05T10:15:00Z",
                            folder: {
                                id: 101,
                                type: "Folder"
                            },
                            computedUrl: "https://app-abc.marketo.com/#SL1025A1"
                        },
                        {
                            id: 1026,
                            name: "Webinar Attendees - Q1 2024",
                            description: "Attendees of Q1 2024 webinar series",
                            createdAt: "2024-01-20T14:00:00Z",
                            updatedAt: "2024-01-30T16:45:00Z",
                            folder: {
                                id: 102,
                                type: "Folder"
                            },
                            computedUrl: "https://app-abc.marketo.com/#SL1026A1"
                        },
                        {
                            id: 1027,
                            name: "Product Demo Requests",
                            description: "Leads who have requested a product demo",
                            createdAt: "2024-01-25T08:30:00Z",
                            updatedAt: "2024-02-08T11:00:00Z",
                            folder: {
                                id: 101,
                                type: "Folder"
                            },
                            computedUrl: "https://app-abc.marketo.com/#SL1027A1"
                        },
                        {
                            id: 1028,
                            name: "Tradeshow Leads - CES 2024",
                            description: "Leads collected at CES 2024 booth",
                            createdAt: "2024-01-08T10:00:00Z",
                            updatedAt: "2024-01-15T17:30:00Z",
                            folder: {
                                id: 103,
                                type: "Folder"
                            },
                            computedUrl: "https://app-abc.marketo.com/#SL1028A1"
                        }
                    ],
                    nextPageToken: null,
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_page_token",
                description: "Invalid pagination token provided",
                input: {
                    nextPageToken: "invalid-token"
                },
                expectedError: {
                    type: "server_error",
                    message: "Invalid page token",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a few seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "removeFromList",
        provider: "marketo",
        validCases: [
            {
                name: "remove_leads_from_list",
                description: "Remove leads from a static list",
                input: {
                    listId: 1025,
                    leadIds: [501234, 501235, 501236]
                },
                expectedOutput: {
                    listId: 1025,
                    results: [
                        {
                            id: 501234,
                            status: "removed"
                        },
                        {
                            id: 501235,
                            status: "removed"
                        },
                        {
                            id: 501236,
                            status: "notmemberof"
                        }
                    ],
                    summary: {
                        total: 3,
                        removed: 2,
                        notMember: 1,
                        skipped: 0
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "list_not_found",
                description: "Static list does not exist",
                input: {
                    listId: 999999,
                    leadIds: [501234]
                },
                expectedError: {
                    type: "server_error",
                    message: "List not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    listId: 1024,
                    leadIds: [501234]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a few seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "requestCampaign",
        provider: "marketo",
        validCases: [
            {
                name: "trigger_campaign",
                description: "Trigger a smart campaign for leads",
                input: {
                    campaignId: 2005,
                    leadIds: [501234, 501235]
                },
                expectedOutput: {
                    campaignId: 2005,
                    results: [
                        {
                            id: 501234,
                            status: "scheduled"
                        },
                        {
                            id: 501235,
                            status: "scheduled"
                        }
                    ],
                    summary: {
                        total: 2,
                        scheduled: 2,
                        skipped: 0
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "campaign_not_found",
                description: "Campaign does not exist",
                input: {
                    campaignId: 999999,
                    leadIds: [501234]
                },
                expectedError: {
                    type: "server_error",
                    message: "Campaign not found",
                    retryable: false
                }
            },
            {
                name: "campaign_not_triggerable",
                description: "Campaign does not have a 'Campaign is Requested' trigger",
                input: {
                    campaignId: 2003,
                    leadIds: [501234]
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "Campaign is not requestable via API. Ensure it has a 'Campaign is Requested' trigger.",
                    retryable: false
                }
            },
            {
                name: "campaign_inactive",
                description: "Campaign is deactivated",
                input: {
                    campaignId: 2010,
                    leadIds: [501234]
                },
                expectedError: {
                    type: "server_error",
                    message: "Campaign is not active",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    campaignId: 2005,
                    leadIds: [501234]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a few seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateLead",
        provider: "marketo",
        validCases: [
            {
                name: "update_lead",
                description: "Update lead fields",
                input: {
                    leadId: 501234,
                    firstName: "Jonathan",
                    lastName: "Doe-Smith",
                    company: "TechCorp International"
                },
                expectedOutput: {
                    id: 501234,
                    status: "updated"
                }
            }
        ],
        errorCases: [
            {
                name: "lead_not_found",
                description: "Lead with specified ID does not exist",
                input: {
                    leadId: 999999999,
                    firstName: "Test"
                },
                expectedError: {
                    type: "not_found",
                    message: "Lead with ID 999999999 not found",
                    retryable: false
                }
            },
            {
                name: "invalid_email_format",
                description: "Updated email has invalid format",
                input: {
                    leadId: 501234,
                    email: "not-valid-email"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid value for field 'email': not-valid-email",
                    retryable: false
                }
            },
            {
                name: "invalid_custom_field",
                description: "Custom field does not exist",
                input: {
                    leadId: 501234,
                    customFields: {
                        nonExistentField: "value"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "Unknown field: nonExistentField",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    leadId: 501234,
                    firstName: "Test"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a few seconds.",
                    retryable: true
                }
            }
        ]
    }
];
