/**
 * SendGrid Provider Test Fixtures
 *
 * Based on SendGrid API documentation for email and marketing operations
 */

import type { TestFixture } from "../../sandbox";

/**
 * Sample contacts for filterableData
 */
const sampleContacts = [
    {
        id: "d9c12a3b-4567-890e-f123-456789abcdef",
        email: "john.doe@example.com",
        firstName: "John",
        lastName: "Doe",
        alternateEmails: ["johnd@work.com"],
        address: {
            line1: "123 Main Street",
            line2: "Apt 4B",
            city: "San Francisco",
            state: "CA",
            postalCode: "94102",
            country: "USA"
        },
        phone: "+1-555-123-4567",
        customFields: { company: "Acme Corp", role: "Developer" },
        createdAt: "2024-01-15T10:30:00Z",
        updatedAt: "2024-01-20T14:00:00Z",
        _listId: "list_123"
    },
    {
        id: "e8b23c4d-5678-901f-a234-567890bcdef0",
        email: "jane.smith@company.com",
        firstName: "Jane",
        lastName: "Smith",
        alternateEmails: [],
        address: {
            line1: "456 Oak Avenue",
            city: "New York",
            state: "NY",
            postalCode: "10001",
            country: "USA"
        },
        phone: "+1-555-234-5678",
        customFields: { company: "Tech Inc", role: "Manager" },
        createdAt: "2024-01-10T09:00:00Z",
        updatedAt: "2024-02-01T11:30:00Z",
        _listId: "list_123"
    },
    {
        id: "f7a34d5e-6789-012a-b345-678901cdef12",
        email: "bob.wilson@startup.io",
        firstName: "Bob",
        lastName: "Wilson",
        alternateEmails: ["bwilson@personal.com"],
        address: {
            line1: "789 Pine Road",
            city: "Austin",
            state: "TX",
            postalCode: "78701",
            country: "USA"
        },
        phone: null,
        customFields: { company: "Startup.io", role: "CEO" },
        createdAt: "2024-02-01T15:00:00Z",
        updatedAt: null,
        _listId: "list_456"
    }
];

/**
 * Sample lists for filterableData
 */
const sampleLists = [
    {
        id: "list_123",
        name: "Newsletter Subscribers",
        contactCount: 1250
    },
    {
        id: "list_456",
        name: "Product Updates",
        contactCount: 850
    },
    {
        id: "list_789",
        name: "VIP Customers",
        contactCount: 125
    }
];

/**
 * Sample templates for filterableData
 */
const sampleTemplates = [
    {
        id: "d-abc123def456789012345678",
        name: "Welcome Email",
        generation: "dynamic",
        updatedAt: "2024-01-15T10:00:00Z",
        versions: [
            {
                id: "ver_001",
                name: "Version 1",
                active: true,
                updatedAt: "2024-01-15T10:00:00Z"
            }
        ]
    },
    {
        id: "d-def456abc789012345678901",
        name: "Order Confirmation",
        generation: "dynamic",
        updatedAt: "2024-02-01T14:30:00Z",
        versions: [
            {
                id: "ver_002",
                name: "Version 2",
                active: true,
                updatedAt: "2024-02-01T14:30:00Z"
            },
            {
                id: "ver_001",
                name: "Version 1",
                active: false,
                updatedAt: "2024-01-20T09:00:00Z"
            }
        ]
    },
    {
        id: "d-ghi789jkl012345678901234",
        name: "Password Reset",
        generation: "dynamic",
        updatedAt: "2024-01-25T16:00:00Z",
        versions: [
            {
                id: "ver_001",
                name: "Version 1",
                active: true,
                updatedAt: "2024-01-25T16:00:00Z"
            }
        ]
    }
];

export const sendgridFixtures: TestFixture[] = [
    {
        operationId: "sendEmail",
        provider: "sendgrid",
        validCases: [
            {
                name: "send_simple_text_email",
                description: "Send a simple text email to a single recipient",
                input: {
                    to: [{ email: "recipient@example.com", name: "John Doe" }],
                    fromEmail: "sender@company.com",
                    fromName: "Company Support",
                    subject: "Welcome to our service!",
                    textContent: "Thank you for signing up. We're excited to have you on board."
                },
                expectedOutput: {
                    sent: true,
                    recipientCount: 1
                }
            },
            {
                name: "send_html_email_with_tracking",
                description: "Send an HTML email with open and click tracking enabled",
                input: {
                    to: [{ email: "customer@example.com", name: "Jane Smith" }],
                    cc: [{ email: "manager@company.com" }],
                    fromEmail: "notifications@company.com",
                    fromName: "Company Notifications",
                    replyTo: "support@company.com",
                    subject: "Your Order Has Shipped!",
                    htmlContent:
                        "<h1>Order Shipped</h1><p>Your order #12345 has been shipped. <a href='https://tracking.example.com/12345'>Track your package</a></p>",
                    textContent: "Your order #12345 has been shipped.",
                    categories: ["transactional", "orders", "shipping"],
                    trackOpens: true,
                    trackClicks: true
                },
                expectedOutput: {
                    sent: true,
                    recipientCount: 2
                }
            },
            {
                name: "send_scheduled_email",
                description: "Schedule an email to be sent at a specific time",
                input: {
                    to: [
                        { email: "user1@example.com" },
                        { email: "user2@example.com" },
                        { email: "user3@example.com" }
                    ],
                    bcc: [{ email: "archive@company.com" }],
                    fromEmail: "marketing@company.com",
                    fromName: "Marketing Team",
                    subject: "Special Offer - 50% Off!",
                    htmlContent:
                        "<h1>Limited Time Offer</h1><p>Get 50% off your next purchase.</p>",
                    sendAt: 1706832000,
                    categories: ["marketing", "promotions"]
                },
                expectedOutput: {
                    sent: true,
                    recipientCount: 4
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_from_email",
                description: "Sender email not verified",
                input: {
                    to: [{ email: "recipient@example.com" }],
                    fromEmail: "unverified@notadomain.com",
                    subject: "Test",
                    textContent: "Test email"
                },
                expectedError: {
                    type: "validation",
                    message: "The from address does not match a verified Sender Identity",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    to: [{ email: "recipient@example.com" }],
                    fromEmail: "sender@company.com",
                    subject: "Test",
                    textContent: "Test email"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Too many requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "sendTemplateEmail",
        provider: "sendgrid",
        validCases: [
            {
                name: "send_template_email_basic",
                description: "Send an email using a dynamic template",
                input: {
                    to: [{ email: "customer@example.com", name: "John Doe" }],
                    fromEmail: "noreply@company.com",
                    fromName: "Company",
                    templateId: "d-abc123def456789012345678",
                    dynamicTemplateData: {
                        firstName: "John",
                        orderNumber: "ORD-12345",
                        orderTotal: "$99.99"
                    }
                },
                expectedOutput: {
                    sent: true,
                    recipientCount: 1
                }
            },
            {
                name: "send_template_email_personalized",
                description: "Send personalized template email to multiple recipients",
                input: {
                    to: [{ email: "user1@example.com" }, { email: "user2@example.com" }],
                    fromEmail: "welcome@company.com",
                    fromName: "Welcome Team",
                    templateId: "d-def456abc789012345678901",
                    dynamicTemplateData: {
                        subject: "Welcome to the team!",
                        companyName: "Acme Corp"
                    },
                    categories: ["welcome", "onboarding"]
                },
                expectedOutput: {
                    sent: true,
                    recipientCount: 2
                }
            }
        ],
        errorCases: [
            {
                name: "template_not_found",
                description: "Template ID does not exist",
                input: {
                    to: [{ email: "recipient@example.com" }],
                    fromEmail: "sender@company.com",
                    templateId: "d-nonexistent123456789",
                    dynamicTemplateData: {}
                },
                expectedError: {
                    type: "not_found",
                    message: "Template not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    to: [{ email: "recipient@example.com" }],
                    fromEmail: "sender@company.com",
                    templateId: "d-abc123def456789012345678",
                    dynamicTemplateData: {}
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Too many requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "addContacts",
        provider: "sendgrid",
        validCases: [
            {
                name: "add_single_contact",
                description: "Add a single contact to SendGrid Marketing",
                input: {
                    contacts: [
                        {
                            email: "newuser@example.com",
                            firstName: "New",
                            lastName: "User",
                            city: "Los Angeles",
                            state: "CA",
                            country: "USA"
                        }
                    ]
                },
                expectedOutput: {
                    jobId: "job_abc123def456",
                    contactCount: 1,
                    listIds: undefined
                }
            },
            {
                name: "add_multiple_contacts_to_list",
                description: "Add multiple contacts to a specific list",
                input: {
                    contacts: [
                        {
                            email: "contact1@example.com",
                            firstName: "Contact",
                            lastName: "One"
                        },
                        {
                            email: "contact2@example.com",
                            firstName: "Contact",
                            lastName: "Two"
                        },
                        {
                            email: "contact3@example.com",
                            firstName: "Contact",
                            lastName: "Three"
                        }
                    ],
                    listIds: ["list_123", "list_456"]
                },
                expectedOutput: {
                    jobId: "job_def456ghi789",
                    contactCount: 3,
                    listIds: ["list_123", "list_456"]
                }
            },
            {
                name: "add_contact_with_custom_fields",
                description: "Add contact with custom field values",
                input: {
                    contacts: [
                        {
                            email: "enterprise@bigcorp.com",
                            firstName: "Enterprise",
                            lastName: "Customer",
                            customFields: {
                                company_name: "Big Corp",
                                plan_tier: "enterprise",
                                account_manager: "John Smith"
                            }
                        }
                    ],
                    listIds: ["list_789"]
                },
                expectedOutput: {
                    jobId: "job_ghi789jkl012",
                    contactCount: 1,
                    listIds: ["list_789"]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_email",
                description: "One or more contacts have invalid email addresses",
                input: {
                    contacts: [
                        {
                            email: "not-an-email",
                            firstName: "Invalid"
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email address format",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    contacts: [
                        {
                            email: "test@example.com",
                            firstName: "Test"
                        }
                    ]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Too many requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getContact",
        provider: "sendgrid",
        validCases: [
            {
                name: "get_contact_full_details",
                description: "Get a contact with all fields populated",
                input: {
                    contactId: "d9c12a3b-4567-890e-f123-456789abcdef"
                },
                expectedOutput: {
                    id: "d9c12a3b-4567-890e-f123-456789abcdef",
                    email: "john.doe@example.com",
                    firstName: "John",
                    lastName: "Doe",
                    alternateEmails: ["johnd@work.com"],
                    address: {
                        line1: "123 Main Street",
                        line2: "Apt 4B",
                        city: "San Francisco",
                        state: "CA",
                        postalCode: "94102",
                        country: "USA"
                    },
                    phone: "+1-555-123-4567",
                    customFields: { company: "Acme Corp", role: "Developer" },
                    createdAt: "2024-01-15T10:30:00Z",
                    updatedAt: "2024-01-20T14:00:00Z"
                }
            },
            {
                name: "get_contact_minimal_fields",
                description: "Get a contact with minimal fields",
                input: {
                    contactId: "f7a34d5e-6789-012a-b345-678901cdef12"
                },
                expectedOutput: {
                    id: "f7a34d5e-6789-012a-b345-678901cdef12",
                    email: "bob.wilson@startup.io",
                    firstName: "Bob",
                    lastName: "Wilson",
                    alternateEmails: ["bwilson@personal.com"],
                    address: {
                        line1: "789 Pine Road",
                        city: "Austin",
                        state: "TX",
                        postalCode: "78701",
                        country: "USA"
                    },
                    phone: undefined,
                    customFields: { company: "Startup.io", role: "CEO" },
                    createdAt: "2024-02-01T15:00:00Z",
                    updatedAt: undefined
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact does not exist",
                input: {
                    contactId: "nonexistent-contact-id-12345"
                },
                expectedError: {
                    type: "not_found",
                    message: "Contact not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    contactId: "d9c12a3b-4567-890e-f123-456789abcdef"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Too many requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getContacts",
        provider: "sendgrid",
        filterableData: {
            records: sampleContacts,
            recordsField: "contacts",
            offsetField: "nextCursor",
            defaultPageSize: 50,
            maxPageSize: 1000,
            pageSizeParam: "pageSize",
            filterConfig: {
                type: "generic",
                filterableFields: ["_listId", "firstName", "lastName"]
            }
        },
        validCases: [
            {
                name: "get_all_contacts",
                description: "Get all contacts from SendGrid Marketing",
                input: {}
            },
            {
                name: "get_contacts_paginated",
                description: "Get contacts with pagination",
                input: {
                    pageSize: 2
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_page_size",
                description: "Page size exceeds maximum",
                input: {
                    pageSize: 2000
                },
                expectedError: {
                    type: "validation",
                    message: "Page size cannot exceed 1000",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Too many requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "searchContacts",
        provider: "sendgrid",
        validCases: [
            {
                name: "search_by_email",
                description: "Search contacts by email address",
                input: {
                    query: "email LIKE '%@example.com'"
                },
                expectedOutput: {
                    contacts: [
                        {
                            id: "d9c12a3b-4567-890e-f123-456789abcdef",
                            email: "john.doe@example.com",
                            firstName: "John",
                            lastName: "Doe"
                        }
                    ],
                    contactCount: 1
                }
            },
            {
                name: "search_by_custom_field",
                description: "Search contacts by custom field value",
                input: {
                    query: "company='Acme Corp'"
                },
                expectedOutput: {
                    contacts: [
                        {
                            id: "d9c12a3b-4567-890e-f123-456789abcdef",
                            email: "john.doe@example.com",
                            firstName: "John",
                            lastName: "Doe"
                        }
                    ],
                    contactCount: 1
                }
            },
            {
                name: "search_with_complex_query",
                description: "Search with multiple conditions",
                input: {
                    query: "state='CA' AND created_at > '2024-01-01'"
                },
                expectedOutput: {
                    contacts: [
                        {
                            id: "d9c12a3b-4567-890e-f123-456789abcdef",
                            email: "john.doe@example.com",
                            firstName: "John",
                            lastName: "Doe"
                        }
                    ],
                    contactCount: 1
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_query_syntax",
                description: "SGQL query has invalid syntax",
                input: {
                    query: "INVALID QUERY SYNTAX HERE"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid SGQL query syntax",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    query: "email LIKE '%@example.com'"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Too many requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createList",
        provider: "sendgrid",
        validCases: [
            {
                name: "create_new_list",
                description: "Create a new contact list",
                input: {
                    name: "Q1 2024 Campaign"
                },
                expectedOutput: {
                    id: "list_new_abc123",
                    name: "Q1 2024 Campaign",
                    contactCount: 0
                }
            },
            {
                name: "create_list_with_special_chars",
                description: "Create a list with special characters in name",
                input: {
                    name: "VIP Customers (2024) - Premium"
                },
                expectedOutput: {
                    id: "list_new_def456",
                    name: "VIP Customers (2024) - Premium",
                    contactCount: 0
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_name",
                description: "List with same name already exists",
                input: {
                    name: "Newsletter Subscribers"
                },
                expectedError: {
                    type: "validation",
                    message: "A list with this name already exists",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "New List"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Too many requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getList",
        provider: "sendgrid",
        validCases: [
            {
                name: "get_list_by_id",
                description: "Get a contact list by ID",
                input: {
                    listId: "list_123"
                },
                expectedOutput: {
                    id: "list_123",
                    name: "Newsletter Subscribers",
                    contactCount: 1250
                }
            },
            {
                name: "get_empty_list",
                description: "Get a list with no contacts",
                input: {
                    listId: "list_empty_001"
                },
                expectedOutput: {
                    id: "list_empty_001",
                    name: "New Campaign List",
                    contactCount: 0
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "List does not exist",
                input: {
                    listId: "list_nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "List not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "list_123"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Too many requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getLists",
        provider: "sendgrid",
        filterableData: {
            records: sampleLists,
            recordsField: "lists",
            offsetField: "nextCursor",
            defaultPageSize: 50,
            maxPageSize: 200,
            pageSizeParam: "pageSize",
            filterConfig: {
                type: "generic",
                filterableFields: ["name"]
            }
        },
        validCases: [
            {
                name: "get_all_lists",
                description: "Get all contact lists",
                input: {}
            },
            {
                name: "get_lists_paginated",
                description: "Get lists with pagination",
                input: {
                    pageSize: 2
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_page_size",
                description: "Page size exceeds maximum",
                input: {
                    pageSize: 500
                },
                expectedError: {
                    type: "validation",
                    message: "Page size cannot exceed 200",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Too many requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getStats",
        provider: "sendgrid",
        validCases: [
            {
                name: "get_daily_stats",
                description: "Get daily email statistics",
                input: {
                    startDate: "2024-01-01",
                    endDate: "2024-01-07",
                    aggregatedBy: "day"
                },
                expectedOutput: {
                    stats: [
                        {
                            date: "2024-01-01",
                            requests: 1500,
                            delivered: 1485,
                            opens: 450,
                            uniqueOpens: 380,
                            clicks: 125,
                            uniqueClicks: 98,
                            bounces: 12,
                            spamReports: 2,
                            unsubscribes: 5,
                            blocked: 3,
                            deferred: 0
                        },
                        {
                            date: "2024-01-02",
                            requests: 2100,
                            delivered: 2080,
                            opens: 620,
                            uniqueOpens: 510,
                            clicks: 180,
                            uniqueClicks: 145,
                            bounces: 15,
                            spamReports: 3,
                            unsubscribes: 8,
                            blocked: 5,
                            deferred: 0
                        }
                    ],
                    startDate: "2024-01-01",
                    endDate: "2024-01-07"
                }
            },
            {
                name: "get_monthly_stats",
                description: "Get monthly aggregated statistics",
                input: {
                    startDate: "2024-01-01",
                    aggregatedBy: "month"
                },
                expectedOutput: {
                    stats: [
                        {
                            date: "2024-01-01",
                            requests: 45000,
                            delivered: 44500,
                            opens: 13500,
                            uniqueOpens: 11200,
                            clicks: 4200,
                            uniqueClicks: 3100,
                            bounces: 350,
                            spamReports: 45,
                            unsubscribes: 125,
                            blocked: 150,
                            deferred: 0
                        }
                    ],
                    startDate: "2024-01-01",
                    endDate: "2024-02-01"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_date_format",
                description: "Invalid date format provided",
                input: {
                    startDate: "01-01-2024"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid date format. Use YYYY-MM-DD",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    startDate: "2024-01-01"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Too many requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getTemplate",
        provider: "sendgrid",
        validCases: [
            {
                name: "get_template_with_versions",
                description: "Get a template with multiple versions",
                input: {
                    templateId: "d-def456abc789012345678901"
                },
                expectedOutput: {
                    id: "d-def456abc789012345678901",
                    name: "Order Confirmation",
                    generation: "dynamic",
                    updatedAt: "2024-02-01T14:30:00Z",
                    versions: [
                        {
                            id: "ver_002",
                            name: "Version 2",
                            active: true,
                            updatedAt: "2024-02-01T14:30:00Z"
                        },
                        {
                            id: "ver_001",
                            name: "Version 1",
                            active: false,
                            updatedAt: "2024-01-20T09:00:00Z"
                        }
                    ]
                }
            },
            {
                name: "get_template_single_version",
                description: "Get a template with single active version",
                input: {
                    templateId: "d-abc123def456789012345678"
                },
                expectedOutput: {
                    id: "d-abc123def456789012345678",
                    name: "Welcome Email",
                    generation: "dynamic",
                    updatedAt: "2024-01-15T10:00:00Z",
                    versions: [
                        {
                            id: "ver_001",
                            name: "Version 1",
                            active: true,
                            updatedAt: "2024-01-15T10:00:00Z"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Template does not exist",
                input: {
                    templateId: "d-nonexistent123456789"
                },
                expectedError: {
                    type: "not_found",
                    message: "Template not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    templateId: "d-abc123def456789012345678"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Too many requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getTemplates",
        provider: "sendgrid",
        filterableData: {
            records: sampleTemplates,
            recordsField: "templates",
            offsetField: "nextCursor",
            defaultPageSize: 50,
            maxPageSize: 200,
            pageSizeParam: "pageSize",
            filterConfig: {
                type: "generic",
                filterableFields: ["name", "generation"]
            }
        },
        validCases: [
            {
                name: "get_all_templates",
                description: "Get all email templates",
                input: {}
            },
            {
                name: "get_dynamic_templates",
                description: "Get only dynamic templates",
                input: {
                    generations: "dynamic"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_generation",
                description: "Invalid generation filter",
                input: {
                    generations: "invalid"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid generation type. Must be 'legacy' or 'dynamic'",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Too many requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "validateEmail",
        provider: "sendgrid",
        validCases: [
            {
                name: "validate_valid_email",
                description: "Validate a valid email address",
                input: {
                    email: "john.doe@gmail.com"
                },
                expectedOutput: {
                    email: "john.doe@gmail.com",
                    verdict: "Valid",
                    score: 0.95,
                    local: "john.doe",
                    host: "gmail.com",
                    suggestion: undefined,
                    hasValidSyntax: true,
                    hasMxRecord: true,
                    isDisposable: false,
                    isRoleAddress: false,
                    hasKnownBounces: false
                }
            },
            {
                name: "validate_risky_email",
                description: "Validate an email with some risk factors",
                input: {
                    email: "info@company.com",
                    source: "signup_form"
                },
                expectedOutput: {
                    email: "info@company.com",
                    verdict: "Risky",
                    score: 0.65,
                    local: "info",
                    host: "company.com",
                    suggestion: undefined,
                    hasValidSyntax: true,
                    hasMxRecord: true,
                    isDisposable: false,
                    isRoleAddress: true,
                    hasKnownBounces: false
                }
            },
            {
                name: "validate_disposable_email",
                description: "Validate a disposable email address",
                input: {
                    email: "user123@tempmail.com"
                },
                expectedOutput: {
                    email: "user123@tempmail.com",
                    verdict: "Risky",
                    score: 0.35,
                    local: "user123",
                    host: "tempmail.com",
                    suggestion: undefined,
                    hasValidSyntax: true,
                    hasMxRecord: true,
                    isDisposable: true,
                    isRoleAddress: false,
                    hasKnownBounces: false
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_email_format",
                description: "Email address has invalid format",
                input: {
                    email: "not-a-valid-email"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email address format",
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
                    message: "Rate limit exceeded. Too many requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteContacts",
        provider: "sendgrid",
        validCases: [
            {
                name: "delete_single_contact",
                description: "Delete a single contact",
                input: {
                    ids: ["d9c12a3b-4567-890e-f123-456789abcdef"]
                },
                expectedOutput: {
                    jobId: "job_delete_abc123",
                    deletedCount: 1
                }
            },
            {
                name: "delete_multiple_contacts",
                description: "Delete multiple contacts at once",
                input: {
                    ids: [
                        "d9c12a3b-4567-890e-f123-456789abcdef",
                        "e8b23c4d-5678-901f-a234-567890bcdef0",
                        "f7a34d5e-6789-012a-b345-678901cdef12"
                    ]
                },
                expectedOutput: {
                    jobId: "job_delete_def456",
                    deletedCount: 3
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "One or more contacts not found",
                input: {
                    ids: ["nonexistent-id-123"]
                },
                expectedError: {
                    type: "not_found",
                    message: "One or more contacts not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    ids: ["d9c12a3b-4567-890e-f123-456789abcdef"]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Too many requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteList",
        provider: "sendgrid",
        validCases: [
            {
                name: "delete_list",
                description: "Delete a contact list",
                input: {
                    listId: "list_123"
                },
                expectedOutput: {
                    deleted: true,
                    listId: "list_123"
                }
            },
            {
                name: "delete_empty_list",
                description: "Delete an empty list",
                input: {
                    listId: "list_empty_001"
                },
                expectedOutput: {
                    deleted: true,
                    listId: "list_empty_001"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "List does not exist",
                input: {
                    listId: "list_nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "List not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "list_123"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Too many requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateList",
        provider: "sendgrid",
        validCases: [
            {
                name: "update_list_name",
                description: "Update a list name",
                input: {
                    listId: "list_123",
                    name: "Newsletter Subscribers - 2024"
                },
                expectedOutput: {
                    id: "list_123",
                    name: "Newsletter Subscribers - 2024",
                    contactCount: 1250
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "List does not exist",
                input: {
                    listId: "list_nonexistent",
                    name: "New Name"
                },
                expectedError: {
                    type: "not_found",
                    message: "List not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "list_123",
                    name: "New Name"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Too many requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "addContactsToList",
        provider: "sendgrid",
        validCases: [
            {
                name: "add_contacts_to_list",
                description: "Add existing contacts to a list",
                input: {
                    listId: "list_123",
                    contactIds: [
                        "d9c12a3b-4567-890e-f123-456789abcdef",
                        "e8b23c4d-5678-901f-a234-567890bcdef0"
                    ]
                },
                expectedOutput: {
                    jobId: "job_add_list_abc123",
                    listId: "list_123",
                    contactCount: 2
                }
            }
        ],
        errorCases: [
            {
                name: "list_not_found",
                description: "List does not exist",
                input: {
                    listId: "list_nonexistent",
                    contactIds: ["d9c12a3b-4567-890e-f123-456789abcdef"]
                },
                expectedError: {
                    type: "not_found",
                    message: "List not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "list_123",
                    contactIds: ["d9c12a3b-4567-890e-f123-456789abcdef"]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Too many requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "removeContactsFromList",
        provider: "sendgrid",
        validCases: [
            {
                name: "remove_contacts_from_list",
                description: "Remove contacts from a list",
                input: {
                    listId: "list_123",
                    contactIds: ["d9c12a3b-4567-890e-f123-456789abcdef"]
                },
                expectedOutput: {
                    jobId: "job_remove_list_abc123",
                    listId: "list_123",
                    removedCount: 1
                }
            }
        ],
        errorCases: [
            {
                name: "list_not_found",
                description: "List does not exist",
                input: {
                    listId: "list_nonexistent",
                    contactIds: ["d9c12a3b-4567-890e-f123-456789abcdef"]
                },
                expectedError: {
                    type: "not_found",
                    message: "List not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "list_123",
                    contactIds: ["d9c12a3b-4567-890e-f123-456789abcdef"]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Too many requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateContact",
        provider: "sendgrid",
        validCases: [
            {
                name: "update_contact_name",
                description: "Update a contact's name",
                input: {
                    email: "john.doe@example.com",
                    firstName: "Jonathan",
                    lastName: "Doe"
                },
                expectedOutput: {
                    jobId: "job_update_abc123",
                    email: "john.doe@example.com"
                }
            },
            {
                name: "update_contact_custom_fields",
                description: "Update a contact's custom fields",
                input: {
                    email: "john.doe@example.com",
                    customFields: {
                        company: "New Company Inc",
                        role: "Senior Developer"
                    }
                },
                expectedOutput: {
                    jobId: "job_update_def456",
                    email: "john.doe@example.com"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact does not exist",
                input: {
                    email: "nonexistent@example.com",
                    firstName: "Test"
                },
                expectedError: {
                    type: "not_found",
                    message: "Contact not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    email: "john.doe@example.com",
                    firstName: "John"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Too many requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "sendBatchEmail",
        provider: "sendgrid",
        validCases: [
            {
                name: "send_batch_email",
                description: "Send personalized emails to multiple recipients using a template",
                input: {
                    templateId: "d-abc123def456789012345678",
                    fromEmail: "marketing@company.com",
                    fromName: "Company Marketing",
                    personalizations: [
                        {
                            to: [{ email: "user1@example.com", name: "User One" }],
                            dynamicTemplateData: {
                                firstName: "User",
                                offerCode: "SAVE10"
                            }
                        },
                        {
                            to: [{ email: "user2@example.com", name: "User Two" }],
                            dynamicTemplateData: {
                                firstName: "User",
                                offerCode: "SAVE20"
                            }
                        }
                    ]
                },
                expectedOutput: {
                    sent: true,
                    recipientCount: 2
                }
            }
        ],
        errorCases: [
            {
                name: "template_not_found",
                description: "Template does not exist",
                input: {
                    templateId: "d-nonexistent",
                    fromEmail: "sender@company.com",
                    personalizations: [
                        {
                            to: [{ email: "user@example.com" }],
                            dynamicTemplateData: {}
                        }
                    ]
                },
                expectedError: {
                    type: "not_found",
                    message: "Template not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    templateId: "d-abc123def456789012345678",
                    fromEmail: "sender@company.com",
                    personalizations: [
                        {
                            to: [{ email: "user@example.com" }],
                            dynamicTemplateData: {}
                        }
                    ]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Too many requests.",
                    retryable: true
                }
            }
        ]
    }
];
