/**
 * Close Provider Test Fixtures
 */

import type { TestFixture } from "../../../sandbox";

export const closeFixtures: TestFixture[] = [
    // ============================================
    // LEADS OPERATIONS
    // ============================================
    {
        operationId: "createLead",
        provider: "close",
        validCases: [
            {
                name: "basic_createLead",
                description: "Create a new lead (company) with optional contacts",
                input: {
                    name: "Acme Corporation",
                    description: "Enterprise software company specializing in cloud solutions",
                    url: "https://acme-corp.com",
                    status_id: "stat_QFNKkr7ZKrKzYqYPsKXYPZ",
                    addresses: [
                        {
                            label: "headquarters",
                            address_1: "123 Innovation Drive",
                            address_2: "Suite 500",
                            city: "San Francisco",
                            state: "CA",
                            zipcode: "94105",
                            country: "US"
                        }
                    ],
                    contacts: [
                        {
                            name: "Sarah Chen",
                            title: "VP of Engineering",
                            emails: [{ email: "sarah.chen@acme-corp.com", type: "office" }],
                            phones: [{ phone: "+1-415-555-0142", type: "direct" }]
                        }
                    ]
                },
                expectedOutput: {
                    id: "lead_8dj29fh3kd92jd8f",
                    display_name: "Acme Corporation",
                    name: "Acme Corporation",
                    description: "Enterprise software company specializing in cloud solutions",
                    url: "https://acme-corp.com",
                    status_id: "stat_QFNKkr7ZKrKzYqYPsKXYPZ",
                    status_label: "Potential",
                    created_by: "user_abc123",
                    created_by_name: "John Smith",
                    updated_by: "user_abc123",
                    updated_by_name: "John Smith",
                    date_created: "2024-01-15T10:30:00.000Z",
                    date_updated: "2024-01-15T10:30:00.000Z",
                    addresses: [
                        {
                            label: "headquarters",
                            address_1: "123 Innovation Drive",
                            address_2: "Suite 500",
                            city: "San Francisco",
                            state: "CA",
                            zipcode: "94105",
                            country: "US"
                        }
                    ],
                    contacts: [
                        {
                            id: "cont_7jd82hf9dk2j",
                            lead_id: "lead_8dj29fh3kd92jd8f",
                            name: "Sarah Chen",
                            title: "VP of Engineering",
                            emails: [{ email: "sarah.chen@acme-corp.com", type: "office" }],
                            phones: [{ phone: "+1-415-555-0142", type: "direct" }],
                            date_created: "2024-01-15T10:30:00.000Z",
                            date_updated: "2024-01-15T10:30:00.000Z",
                            created_by: "user_abc123",
                            updated_by: "user_abc123"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "missing_name",
                description: "Validation error when name is missing",
                input: {
                    description: "A company without a name"
                },
                expectedError: {
                    type: "validation",
                    message: "Lead name is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "Rate Limited Company"
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
        operationId: "getLead",
        provider: "close",
        validCases: [
            {
                name: "basic_getLead",
                description: "Get a specific lead by ID",
                input: {
                    id: "lead_8dj29fh3kd92jd8f"
                },
                expectedOutput: {
                    id: "lead_8dj29fh3kd92jd8f",
                    display_name: "Acme Corporation",
                    name: "Acme Corporation",
                    description: "Enterprise software company specializing in cloud solutions",
                    url: "https://acme-corp.com",
                    status_id: "stat_QFNKkr7ZKrKzYqYPsKXYPZ",
                    status_label: "Qualified",
                    created_by: "user_abc123",
                    created_by_name: "John Smith",
                    updated_by: "user_def456",
                    updated_by_name: "Jane Doe",
                    date_created: "2024-01-15T10:30:00.000Z",
                    date_updated: "2024-01-20T14:45:00.000Z",
                    addresses: [
                        {
                            label: "headquarters",
                            address_1: "123 Innovation Drive",
                            city: "San Francisco",
                            state: "CA",
                            zipcode: "94105",
                            country: "US"
                        }
                    ],
                    contacts: [
                        {
                            id: "cont_7jd82hf9dk2j",
                            lead_id: "lead_8dj29fh3kd92jd8f",
                            name: "Sarah Chen",
                            title: "VP of Engineering"
                        }
                    ],
                    opportunities: [
                        {
                            id: "oppo_k3j2d8f9s",
                            lead_id: "lead_8dj29fh3kd92jd8f",
                            status_label: "Active",
                            value: 7500000,
                            value_formatted: "$75,000.00"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Lead not found",
                input: {
                    id: "lead_nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Lead not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listLeads",
        provider: "close",
        validCases: [
            {
                name: "basic_listLeads",
                description: "Get all leads with default pagination",
                input: {},
                expectedOutput: {
                    leads: [
                        {
                            id: "lead_8dj29fh3kd92jd8f",
                            display_name: "Acme Corporation",
                            name: "Acme Corporation",
                            status_id: "stat_QFNKkr7ZKrKzYqYPsKXYPZ",
                            status_label: "Qualified",
                            date_created: "2024-01-15T10:30:00.000Z"
                        },
                        {
                            id: "lead_9ek38fg4le03ke9g",
                            display_name: "TechStart Inc",
                            name: "TechStart Inc",
                            status_id: "stat_default",
                            status_label: "Potential",
                            date_created: "2024-01-15T11:00:00.000Z"
                        },
                        {
                            id: "lead_bk49gh5mf14lf0h",
                            display_name: "DataFlow Systems",
                            name: "DataFlow Systems",
                            status_id: "stat_contacted",
                            status_label: "Contacted",
                            date_created: "2024-01-14T09:15:00.000Z"
                        }
                    ],
                    has_more: true,
                    total_results: 156
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_pagination",
                description: "Invalid pagination parameters",
                input: {
                    _limit: 500
                },
                expectedError: {
                    type: "validation",
                    message: "Limit must be between 1 and 100",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "searchLeads",
        provider: "close",
        validCases: [
            {
                name: "basic_searchLeads",
                description: "Search leads using Close query language",
                input: {
                    query: 'status:"Qualified" AND company:"tech"'
                },
                expectedOutput: {
                    leads: [
                        {
                            id: "lead_8dj29fh3kd92jd8f",
                            display_name: "Acme Corporation",
                            name: "Acme Corporation",
                            status_label: "Qualified"
                        },
                        {
                            id: "lead_tech456",
                            display_name: "TechVentures LLC",
                            name: "TechVentures LLC",
                            status_label: "Qualified"
                        }
                    ],
                    has_more: false,
                    total_results: 2
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_query_syntax",
                description: "Invalid search query syntax",
                input: {
                    query: 'status:"Qualified" AND AND company:'
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid query syntax",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updateLead",
        provider: "close",
        validCases: [
            {
                name: "basic_updateLead",
                description: "Update lead details",
                input: {
                    id: "lead_8dj29fh3kd92jd8f",
                    name: "Acme Corporation International",
                    description: "Global enterprise software company",
                    status_id: "stat_negotiation"
                },
                expectedOutput: {
                    id: "lead_8dj29fh3kd92jd8f",
                    display_name: "Acme Corporation International",
                    name: "Acme Corporation International",
                    description: "Global enterprise software company",
                    status_id: "stat_negotiation",
                    status_label: "Negotiation",
                    date_updated: "2024-01-25T16:30:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Lead not found",
                input: {
                    id: "lead_nonexistent123",
                    name: "Updated Name"
                },
                expectedError: {
                    type: "not_found",
                    message: "Lead not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "deleteLead",
        provider: "close",
        validCases: [
            {
                name: "basic_deleteLead",
                description: "Delete a lead and all associated data",
                input: {
                    id: "lead_to_delete_123"
                },
                expectedOutput: {
                    deleted: true,
                    id: "lead_to_delete_123"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Lead not found",
                input: {
                    id: "lead_nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Lead not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // CONTACTS OPERATIONS
    // ============================================
    {
        operationId: "createContact",
        provider: "close",
        validCases: [
            {
                name: "basic_createContact",
                description: "Create a new contact with full details",
                input: {
                    lead_id: "lead_8dj29fh3kd92jd8f",
                    name: "Michael Rodriguez",
                    title: "Chief Technology Officer",
                    emails: [
                        { email: "michael.rodriguez@acme-corp.com", type: "office" },
                        { email: "m.rodriguez@gmail.com", type: "home" }
                    ],
                    phones: [
                        { phone: "+1-415-555-0198", type: "direct" },
                        { phone: "+1-415-555-0100", type: "office" }
                    ],
                    urls: [{ url: "https://linkedin.com/in/mrodriguez", type: "linkedin" }]
                },
                expectedOutput: {
                    id: "cont_newcontact123",
                    lead_id: "lead_8dj29fh3kd92jd8f",
                    name: "Michael Rodriguez",
                    title: "Chief Technology Officer",
                    emails: [
                        { email: "michael.rodriguez@acme-corp.com", type: "office" },
                        { email: "m.rodriguez@gmail.com", type: "home" }
                    ],
                    phones: [
                        {
                            phone: "+1-415-555-0198",
                            phone_formatted: "+1 415-555-0198",
                            type: "direct"
                        },
                        {
                            phone: "+1-415-555-0100",
                            phone_formatted: "+1 415-555-0100",
                            type: "office"
                        }
                    ],
                    urls: [{ url: "https://linkedin.com/in/mrodriguez", type: "linkedin" }],
                    date_created: "2024-01-20T09:00:00.000Z",
                    date_updated: "2024-01-20T09:00:00.000Z",
                    created_by: "user_abc123",
                    updated_by: "user_abc123"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_lead_id",
                description: "Lead not found for contact",
                input: {
                    lead_id: "lead_nonexistent",
                    name: "Test Contact"
                },
                expectedError: {
                    type: "not_found",
                    message: "Lead not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getContact",
        provider: "close",
        validCases: [
            {
                name: "basic_getContact",
                description: "Get a specific contact by ID",
                input: {
                    id: "cont_7jd82hf9dk2j"
                },
                expectedOutput: {
                    id: "cont_7jd82hf9dk2j",
                    lead_id: "lead_8dj29fh3kd92jd8f",
                    name: "Sarah Chen",
                    title: "VP of Engineering",
                    emails: [{ email: "sarah.chen@acme-corp.com", type: "office" }],
                    phones: [
                        {
                            phone: "+1-415-555-0142",
                            phone_formatted: "+1 415-555-0142",
                            type: "direct"
                        }
                    ],
                    urls: [{ url: "https://linkedin.com/in/sarahchen", type: "linkedin" }],
                    date_created: "2024-01-15T10:30:00.000Z",
                    date_updated: "2024-01-18T14:00:00.000Z",
                    created_by: "user_abc123",
                    updated_by: "user_abc123"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact not found",
                input: {
                    id: "cont_nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Contact not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listContacts",
        provider: "close",
        validCases: [
            {
                name: "basic_listContacts",
                description: "Get all contacts with default pagination",
                input: {},
                expectedOutput: {
                    contacts: [
                        {
                            id: "cont_7jd82hf9dk2j",
                            lead_id: "lead_8dj29fh3kd92jd8f",
                            name: "Sarah Chen",
                            title: "VP of Engineering",
                            emails: [{ email: "sarah.chen@acme-corp.com", type: "office" }]
                        },
                        {
                            id: "cont_newcontact123",
                            lead_id: "lead_8dj29fh3kd92jd8f",
                            name: "Michael Rodriguez",
                            title: "Chief Technology Officer",
                            emails: [{ email: "michael.rodriguez@acme-corp.com", type: "office" }]
                        },
                        {
                            id: "cont_sales789",
                            lead_id: "lead_9ek38fg4le03ke9g",
                            name: "Emily Watson",
                            title: "Sales Director",
                            emails: [{ email: "emily.watson@techstart.com", type: "office" }]
                        }
                    ],
                    has_more: true,
                    total_results: 342
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_lead_filter",
                description: "Invalid lead ID in filter",
                input: {
                    lead_id: "invalid_id"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid lead ID format",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updateContact",
        provider: "close",
        validCases: [
            {
                name: "basic_updateContact",
                description: "Update contact details",
                input: {
                    id: "cont_7jd82hf9dk2j",
                    title: "Chief Technology Officer",
                    emails: [
                        { email: "sarah.chen@acme-corp.com", type: "office" },
                        { email: "sarah@personal.com", type: "home" }
                    ]
                },
                expectedOutput: {
                    id: "cont_7jd82hf9dk2j",
                    lead_id: "lead_8dj29fh3kd92jd8f",
                    name: "Sarah Chen",
                    title: "Chief Technology Officer",
                    emails: [
                        { email: "sarah.chen@acme-corp.com", type: "office" },
                        { email: "sarah@personal.com", type: "home" }
                    ],
                    phones: [{ phone: "+1-415-555-0142", type: "direct" }],
                    date_updated: "2024-01-25T11:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact not found",
                input: {
                    id: "cont_nonexistent123",
                    title: "New Title"
                },
                expectedError: {
                    type: "not_found",
                    message: "Contact not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "deleteContact",
        provider: "close",
        validCases: [
            {
                name: "basic_deleteContact",
                description: "Delete a contact",
                input: {
                    id: "cont_to_delete_456"
                },
                expectedOutput: {
                    deleted: true,
                    id: "cont_to_delete_456"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact not found",
                input: {
                    id: "cont_nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Contact not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // OPPORTUNITIES OPERATIONS
    // ============================================
    {
        operationId: "createOpportunity",
        provider: "close",
        validCases: [
            {
                name: "basic_createOpportunity",
                description: "Create a new opportunity with full details",
                input: {
                    lead_id: "lead_8dj29fh3kd92jd8f",
                    status_id: "stat_opp_active",
                    contact_id: "cont_7jd82hf9dk2j",
                    value: 7500000,
                    value_currency: "USD",
                    value_period: "annual",
                    confidence: 75,
                    note: "Enterprise license deal for 500 seats. Decision expected by end of Q1."
                },
                expectedOutput: {
                    id: "oppo_new789abc",
                    lead_id: "lead_8dj29fh3kd92jd8f",
                    lead_name: "Acme Corporation",
                    contact_id: "cont_7jd82hf9dk2j",
                    contact_name: "Sarah Chen",
                    user_id: "user_abc123",
                    user_name: "John Smith",
                    status_id: "stat_opp_active",
                    status_label: "Active",
                    status_type: "active",
                    value: 7500000,
                    value_currency: "USD",
                    value_formatted: "$75,000.00",
                    value_period: "annual",
                    confidence: 75,
                    expected_value: 5625000,
                    note: "Enterprise license deal for 500 seats. Decision expected by end of Q1.",
                    date_created: "2024-01-20T10:00:00.000Z",
                    date_updated: "2024-01-20T10:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_lead",
                description: "Lead not found",
                input: {
                    lead_id: "lead_nonexistent",
                    status_id: "stat_opp_active"
                },
                expectedError: {
                    type: "not_found",
                    message: "Lead not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getOpportunity",
        provider: "close",
        validCases: [
            {
                name: "basic_getOpportunity",
                description: "Get a specific opportunity by ID",
                input: {
                    id: "oppo_k3j2d8f9s"
                },
                expectedOutput: {
                    id: "oppo_k3j2d8f9s",
                    lead_id: "lead_8dj29fh3kd92jd8f",
                    lead_name: "Acme Corporation",
                    contact_id: "cont_7jd82hf9dk2j",
                    contact_name: "Sarah Chen",
                    user_id: "user_abc123",
                    user_name: "John Smith",
                    status_id: "stat_opp_negotiation",
                    status_label: "Negotiation",
                    status_type: "active",
                    value: 7500000,
                    value_currency: "USD",
                    value_formatted: "$75,000.00",
                    value_period: "annual",
                    confidence: 85,
                    expected_value: 6375000,
                    note: "Final contract review in progress. Legal approval pending.",
                    date_created: "2024-01-15T10:30:00.000Z",
                    date_updated: "2024-01-25T09:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Opportunity not found",
                input: {
                    id: "oppo_nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Opportunity not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listOpportunities",
        provider: "close",
        validCases: [
            {
                name: "basic_listOpportunities",
                description: "Get all opportunities with default pagination",
                input: {},
                expectedOutput: {
                    opportunities: [
                        {
                            id: "oppo_k3j2d8f9s",
                            lead_id: "lead_8dj29fh3kd92jd8f",
                            lead_name: "Acme Corporation",
                            status_label: "Negotiation",
                            value: 7500000,
                            value_formatted: "$75,000.00",
                            confidence: 85
                        },
                        {
                            id: "oppo_onetime123",
                            lead_id: "lead_9ek38fg4le03ke9g",
                            lead_name: "TechStart Inc",
                            status_label: "Active",
                            value: 2500000,
                            value_formatted: "$25,000.00",
                            confidence: 50
                        },
                        {
                            id: "oppo_monthly456",
                            lead_id: "lead_bk49gh5mf14lf0h",
                            lead_name: "DataFlow Systems",
                            status_label: "Proposal",
                            value: 500000,
                            value_formatted: "$5,000.00",
                            confidence: 60
                        }
                    ],
                    has_more: true,
                    total_results: 89
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_status_filter",
                description: "Invalid status ID in filter",
                input: {
                    status_id: "invalid_status"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid status ID",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updateOpportunity",
        provider: "close",
        validCases: [
            {
                name: "basic_updateOpportunity",
                description: "Update opportunity details",
                input: {
                    id: "oppo_k3j2d8f9s",
                    confidence: 90,
                    note: "Verbal agreement received. Awaiting signed contract."
                },
                expectedOutput: {
                    id: "oppo_k3j2d8f9s",
                    lead_id: "lead_8dj29fh3kd92jd8f",
                    status_label: "Negotiation",
                    value: 7500000,
                    confidence: 90,
                    expected_value: 6750000,
                    note: "Verbal agreement received. Awaiting signed contract.",
                    date_updated: "2024-01-26T10:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Opportunity not found",
                input: {
                    id: "oppo_nonexistent123",
                    confidence: 80
                },
                expectedError: {
                    type: "not_found",
                    message: "Opportunity not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "deleteOpportunity",
        provider: "close",
        validCases: [
            {
                name: "basic_deleteOpportunity",
                description: "Delete an opportunity",
                input: {
                    id: "oppo_to_delete_789"
                },
                expectedOutput: {
                    deleted: true,
                    id: "oppo_to_delete_789"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Opportunity not found",
                input: {
                    id: "oppo_nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Opportunity not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // ACTIVITIES OPERATIONS
    // ============================================
    {
        operationId: "createNote",
        provider: "close",
        validCases: [
            {
                name: "basic_createNote",
                description: "Add a note to a lead",
                input: {
                    lead_id: "lead_8dj29fh3kd92jd8f",
                    note: "Had a great discovery call with Sarah Chen. Key pain points: 1) Manual data entry taking 20+ hours/week, 2) No visibility into pipeline metrics, 3) Integration with existing Salesforce instance required. Next step: Schedule demo with technical team."
                },
                expectedOutput: {
                    id: "note_abc123xyz",
                    lead_id: "lead_8dj29fh3kd92jd8f",
                    user_id: "user_abc123",
                    user_name: "John Smith",
                    _type: "Note",
                    note: "Had a great discovery call with Sarah Chen. Key pain points: 1) Manual data entry taking 20+ hours/week, 2) No visibility into pipeline metrics, 3) Integration with existing Salesforce instance required. Next step: Schedule demo with technical team.",
                    date_created: "2024-01-20T14:30:00.000Z",
                    date_updated: "2024-01-20T14:30:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_lead",
                description: "Lead not found",
                input: {
                    lead_id: "lead_nonexistent",
                    note: "Test note"
                },
                expectedError: {
                    type: "not_found",
                    message: "Lead not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createTask",
        provider: "close",
        validCases: [
            {
                name: "basic_createTask",
                description: "Create a task with due date",
                input: {
                    lead_id: "lead_8dj29fh3kd92jd8f",
                    text: "Send proposal to Sarah Chen for enterprise license deal",
                    assigned_to: "user_abc123",
                    due_date: "2024-01-25"
                },
                expectedOutput: {
                    id: "task_proposal789",
                    lead_id: "lead_8dj29fh3kd92jd8f",
                    assigned_to: "user_abc123",
                    assigned_to_name: "John Smith",
                    text: "Send proposal to Sarah Chen for enterprise license deal",
                    due_date: "2024-01-25",
                    is_complete: false,
                    is_dateless: false,
                    _type: "Task",
                    date_created: "2024-01-20T09:00:00.000Z",
                    date_updated: "2024-01-20T09:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_lead",
                description: "Lead not found",
                input: {
                    lead_id: "lead_nonexistent",
                    text: "Test task"
                },
                expectedError: {
                    type: "not_found",
                    message: "Lead not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "completeTask",
        provider: "close",
        validCases: [
            {
                name: "basic_completeTask",
                description: "Mark a task as completed",
                input: {
                    id: "task_proposal789"
                },
                expectedOutput: {
                    id: "task_proposal789",
                    lead_id: "lead_8dj29fh3kd92jd8f",
                    assigned_to: "user_abc123",
                    assigned_to_name: "John Smith",
                    text: "Send proposal to Sarah Chen for enterprise license deal",
                    due_date: "2024-01-25",
                    is_complete: true,
                    completed_date: "2024-01-24T15:30:00.000Z",
                    _type: "Task",
                    date_created: "2024-01-20T09:00:00.000Z",
                    date_updated: "2024-01-24T15:30:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Task not found",
                input: {
                    id: "task_nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listActivities",
        provider: "close",
        validCases: [
            {
                name: "basic_listActivities",
                description: "Get all activities with default pagination",
                input: {},
                expectedOutput: {
                    activities: [
                        {
                            id: "acti_call123",
                            lead_id: "lead_8dj29fh3kd92jd8f",
                            user_id: "user_abc123",
                            user_name: "John Smith",
                            _type: "Call",
                            date_created: "2024-01-24T14:00:00.000Z"
                        },
                        {
                            id: "acti_email456",
                            lead_id: "lead_9ek38fg4le03ke9g",
                            user_id: "user_abc123",
                            user_name: "John Smith",
                            _type: "Email",
                            date_created: "2024-01-24T10:30:00.000Z"
                        },
                        {
                            id: "note_abc123xyz",
                            lead_id: "lead_8dj29fh3kd92jd8f",
                            user_id: "user_abc123",
                            user_name: "John Smith",
                            _type: "Note",
                            date_created: "2024-01-20T14:30:00.000Z"
                        }
                    ],
                    has_more: true,
                    total_results: 1247
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_type_filter",
                description: "Invalid activity type",
                input: {
                    _type: "InvalidType"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid activity type",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // COMMUNICATION OPERATIONS
    // ============================================
    {
        operationId: "logCall",
        provider: "close",
        validCases: [
            {
                name: "basic_logCall_outbound",
                description: "Log an outbound call with notes",
                input: {
                    lead_id: "lead_8dj29fh3kd92jd8f",
                    contact_id: "cont_7jd82hf9dk2j",
                    direction: "outbound",
                    phone: "+1-415-555-0142",
                    duration: 1845,
                    status: "completed",
                    disposition: "Interested",
                    note: "Discussed Q1 rollout timeline. Sarah confirmed budget approval from CFO. Needs technical architecture review before final sign-off. Scheduling call with their IT team for next week."
                },
                expectedOutput: {
                    id: "call_outbound123",
                    lead_id: "lead_8dj29fh3kd92jd8f",
                    user_id: "user_abc123",
                    user_name: "John Smith",
                    _type: "Call",
                    direction: "outbound",
                    phone: "+1-415-555-0142",
                    contact_id: "cont_7jd82hf9dk2j",
                    duration: 1845,
                    status: "completed",
                    disposition: "Interested",
                    note: "Discussed Q1 rollout timeline. Sarah confirmed budget approval from CFO. Needs technical architecture review before final sign-off. Scheduling call with their IT team for next week.",
                    date_created: "2024-01-24T14:00:00.000Z",
                    date_updated: "2024-01-24T14:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_lead",
                description: "Lead not found",
                input: {
                    lead_id: "lead_nonexistent",
                    direction: "outbound"
                },
                expectedError: {
                    type: "not_found",
                    message: "Lead not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "sendEmail",
        provider: "close",
        validCases: [
            {
                name: "basic_sendEmail",
                description: "Send an email to a contact",
                input: {
                    lead_id: "lead_8dj29fh3kd92jd8f",
                    contact_id: "cont_7jd82hf9dk2j",
                    to: ["sarah.chen@acme-corp.com"],
                    subject: "Acme Corporation - Enterprise License Proposal",
                    body_text:
                        "Hi Sarah,\n\nThank you for taking the time to discuss your workflow automation needs today. As promised, I've attached our enterprise license proposal for 500 seats.\n\nKey highlights:\n- Annual subscription: $75,000\n- Includes premium support and dedicated success manager\n- 99.9% uptime SLA\n- Custom integrations with your existing Salesforce instance\n\nI'd love to schedule a call with your technical team to address any questions about the implementation timeline.\n\nBest regards,\nJohn Smith\nSenior Account Executive",
                    body_html:
                        "<p>Hi Sarah,</p><p>Thank you for taking the time to discuss your workflow automation needs today.</p>",
                    status: "outbox"
                },
                expectedOutput: {
                    id: "emai_proposal123",
                    lead_id: "lead_8dj29fh3kd92jd8f",
                    user_id: "user_abc123",
                    user_name: "John Smith",
                    _type: "Email",
                    direction: "outgoing",
                    subject: "Acme Corporation - Enterprise License Proposal",
                    body_text:
                        "Hi Sarah,\n\nThank you for taking the time to discuss your workflow automation needs today. As promised, I've attached our enterprise license proposal for 500 seats.\n\nKey highlights:\n- Annual subscription: $75,000\n- Includes premium support and dedicated success manager\n- 99.9% uptime SLA\n- Custom integrations with your existing Salesforce instance\n\nI'd love to schedule a call with your technical team to address any questions about the implementation timeline.\n\nBest regards,\nJohn Smith\nSenior Account Executive",
                    to: ["sarah.chen@acme-corp.com"],
                    status: "outbox",
                    date_created: "2024-01-24T16:00:00.000Z",
                    date_updated: "2024-01-24T16:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_lead",
                description: "Lead not found",
                input: {
                    lead_id: "lead_nonexistent",
                    to: ["test@example.com"],
                    subject: "Test"
                },
                expectedError: {
                    type: "not_found",
                    message: "Lead not found",
                    retryable: false
                }
            },
            {
                name: "invalid_email_address",
                description: "Invalid recipient email address",
                input: {
                    lead_id: "lead_8dj29fh3kd92jd8f",
                    to: ["invalid-email"],
                    subject: "Test"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email address format",
                    retryable: false
                }
            }
        ]
    }
];
