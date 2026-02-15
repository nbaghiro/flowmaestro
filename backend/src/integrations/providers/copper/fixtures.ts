/**
 * Copper CRM Provider Test Fixtures
 *
 * Based on official Copper API documentation:
 * - Leads: https://developer.copper.com/leads/
 * - People: https://developer.copper.com/people/
 * - Companies: https://developer.copper.com/companies/
 * - Opportunities: https://developer.copper.com/opportunities/
 * - Tasks: https://developer.copper.com/tasks/
 */

import type { TestFixture } from "../../sandbox";

export const copperFixtures: TestFixture[] = [
    // ==================== LEADS ====================
    {
        operationId: "listLeads",
        provider: "copper",
        validCases: [
            {
                name: "list_all_leads",
                description: "List all leads with default pagination",
                input: {},
                expectedOutput: {
                    leads: [
                        {
                            id: 12345678,
                            name: "New Tech Startup",
                            prefix: null,
                            first_name: "Alex",
                            middle_name: null,
                            last_name: "Johnson",
                            suffix: null,
                            address: {
                                street: "500 Startup Lane",
                                city: "San Francisco",
                                state: "CA",
                                postal_code: "94107",
                                country: "US"
                            },
                            assignee_id: 987654,
                            company_name: "New Tech Startup",
                            customer_source_id: 111222,
                            details: "Inbound lead from website",
                            email: { email: "alex@newtechstartup.com", category: "work" },
                            phone_numbers: [{ number: "+1-415-555-0101", category: "work" }],
                            monetary_value: 50000,
                            status: "New",
                            status_id: 1,
                            tags: ["hot-lead", "enterprise"],
                            date_created: 1705320000,
                            date_modified: 1705406400
                        },
                        {
                            id: 12345679,
                            name: "DataFlow Analytics",
                            prefix: null,
                            first_name: "Morgan",
                            middle_name: null,
                            last_name: "Lee",
                            suffix: null,
                            address: null,
                            assignee_id: 987654,
                            company_name: "DataFlow Analytics",
                            customer_source_id: 111223,
                            details: "Trade show contact",
                            email: { email: "morgan@dataflow.io", category: "work" },
                            phone_numbers: [],
                            monetary_value: 25000,
                            status: "Contacted",
                            status_id: 2,
                            tags: ["mid-market"],
                            date_created: 1705233600,
                            date_modified: 1705320000
                        }
                    ],
                    count: 2
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
                    message: "Rate limit exceeded. Please retry after some time.",
                    retryable: true
                }
            },
            {
                name: "unauthorized",
                description: "Invalid API credentials",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Invalid API key or email",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getLead",
        provider: "copper",
        validCases: [
            {
                name: "get_lead_by_id",
                description: "Get a specific lead by ID",
                input: { id: 12345678 },
                expectedOutput: {
                    id: 12345678,
                    name: "New Tech Startup",
                    prefix: null,
                    first_name: "Alex",
                    middle_name: null,
                    last_name: "Johnson",
                    suffix: null,
                    address: {
                        street: "500 Startup Lane",
                        city: "San Francisco",
                        state: "CA",
                        postal_code: "94107",
                        country: "US"
                    },
                    assignee_id: 987654,
                    company_name: "New Tech Startup",
                    customer_source_id: 111222,
                    details: "Inbound lead from website. Interested in enterprise plan.",
                    email: { email: "alex@newtechstartup.com", category: "work" },
                    phone_numbers: [{ number: "+1-415-555-0101", category: "work" }],
                    monetary_value: 50000,
                    status: "New",
                    status_id: 1,
                    tags: ["hot-lead", "enterprise"],
                    date_created: 1705320000,
                    date_modified: 1705406400,
                    custom_fields: []
                }
            }
        ],
        errorCases: [
            {
                name: "lead_not_found",
                description: "Lead does not exist",
                input: { id: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Lead not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { id: 12345678 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createLead",
        provider: "copper",
        validCases: [
            {
                name: "create_basic_lead",
                description: "Create a lead with basic information",
                input: {
                    name: "Acme Corporation",
                    email: { email: "contact@acme.com", category: "work" },
                    phone_numbers: [{ number: "+1-555-123-4567", category: "work" }],
                    monetary_value: 75000,
                    details: "Interested in annual subscription"
                },
                expectedOutput: {
                    id: 12345680,
                    name: "Acme Corporation",
                    prefix: null,
                    first_name: null,
                    middle_name: null,
                    last_name: null,
                    suffix: null,
                    address: null,
                    assignee_id: 987654,
                    company_name: null,
                    customer_source_id: null,
                    details: "Interested in annual subscription",
                    email: { email: "contact@acme.com", category: "work" },
                    phone_numbers: [{ number: "+1-555-123-4567", category: "work" }],
                    monetary_value: 75000,
                    status: "New",
                    status_id: 1,
                    tags: [],
                    date_created: 1705492800,
                    date_modified: 1705492800
                }
            }
        ],
        errorCases: [
            {
                name: "missing_name",
                description: "Lead created without required name",
                input: {
                    email: { email: "test@example.com", category: "work" }
                },
                expectedError: {
                    type: "validation",
                    message: "Name is required",
                    retryable: false
                }
            },
            {
                name: "invalid_email",
                description: "Lead with invalid email format",
                input: {
                    name: "Test Lead",
                    email: { email: "not-valid-email", category: "work" }
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email format",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { name: "Test Lead" },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateLead",
        provider: "copper",
        validCases: [
            {
                name: "update_lead_status",
                description: "Update lead status and monetary value",
                input: {
                    id: 12345678,
                    status_id: 3,
                    monetary_value: 75000,
                    details: "Follow-up scheduled for next week"
                },
                expectedOutput: {
                    id: 12345678,
                    name: "New Tech Startup",
                    prefix: null,
                    first_name: "Alex",
                    middle_name: null,
                    last_name: "Johnson",
                    suffix: null,
                    address: {
                        street: "500 Startup Lane",
                        city: "San Francisco",
                        state: "CA",
                        postal_code: "94107",
                        country: "US"
                    },
                    assignee_id: 987654,
                    company_name: "New Tech Startup",
                    customer_source_id: 111222,
                    details: "Follow-up scheduled for next week",
                    email: { email: "alex@newtechstartup.com", category: "work" },
                    phone_numbers: [{ number: "+1-415-555-0101", category: "work" }],
                    monetary_value: 75000,
                    status: "Qualified",
                    status_id: 3,
                    tags: ["hot-lead", "enterprise"],
                    date_created: 1705320000,
                    date_modified: 1705579200
                }
            }
        ],
        errorCases: [
            {
                name: "lead_not_found",
                description: "Lead does not exist",
                input: { id: 99999999, status_id: 2 },
                expectedError: {
                    type: "not_found",
                    message: "Lead not found",
                    retryable: false
                }
            },
            {
                name: "invalid_status_id",
                description: "Invalid status ID",
                input: { id: 12345678, status_id: 999 },
                expectedError: {
                    type: "validation",
                    message: "Invalid status ID",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { id: 12345678, status_id: 2 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteLead",
        provider: "copper",
        validCases: [
            {
                name: "delete_existing_lead",
                description: "Delete an existing lead",
                input: { id: 12345678 },
                expectedOutput: {
                    deleted: true,
                    id: 12345678
                }
            }
        ],
        errorCases: [
            {
                name: "lead_not_found",
                description: "Lead does not exist",
                input: { id: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Lead not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { id: 12345678 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "searchLeads",
        provider: "copper",
        validCases: [
            {
                name: "search_leads_by_name",
                description: "Search leads by company name",
                input: {
                    name: "Tech"
                },
                expectedOutput: {
                    leads: [
                        {
                            id: 12345678,
                            name: "New Tech Startup",
                            email: { email: "alex@newtechstartup.com", category: "work" },
                            status: "New",
                            monetary_value: 50000,
                            date_created: 1705320000
                        }
                    ],
                    count: 1
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { name: "Test" },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== PEOPLE ====================
    {
        operationId: "listPeople",
        provider: "copper",
        validCases: [
            {
                name: "list_all_people",
                description: "List all people with default pagination",
                input: {},
                expectedOutput: {
                    people: [
                        {
                            id: 23456789,
                            name: "Sarah Chen",
                            prefix: null,
                            first_name: "Sarah",
                            middle_name: null,
                            last_name: "Chen",
                            suffix: null,
                            address: {
                                street: "100 Enterprise Blvd",
                                city: "San Francisco",
                                state: "CA",
                                postal_code: "94105",
                                country: "US"
                            },
                            assignee_id: 987654,
                            company_id: 34567890,
                            company_name: "Acme Corporation",
                            contact_type_id: 1,
                            details: "VP of Engineering",
                            emails: [{ email: "sarah.chen@acme.com", category: "work" }],
                            phone_numbers: [{ number: "+1-415-555-0200", category: "work" }],
                            socials: [
                                { url: "https://linkedin.com/in/sarahchen", category: "linkedin" }
                            ],
                            tags: ["decision-maker", "technical"],
                            title: "VP of Engineering",
                            websites: [{ url: "https://acme.com", category: "work" }],
                            date_created: 1704628800,
                            date_modified: 1705320000
                        },
                        {
                            id: 23456790,
                            name: "Michael Rodriguez",
                            prefix: null,
                            first_name: "Michael",
                            middle_name: null,
                            last_name: "Rodriguez",
                            suffix: null,
                            address: null,
                            assignee_id: 987655,
                            company_id: 34567891,
                            company_name: "TechCorp International",
                            contact_type_id: 1,
                            details: "CTO - Key contact for technical decisions",
                            emails: [{ email: "m.rodriguez@techcorp.com", category: "work" }],
                            phone_numbers: [{ number: "+1-212-555-0300", category: "work" }],
                            socials: [],
                            tags: ["c-level"],
                            title: "Chief Technology Officer",
                            websites: [],
                            date_created: 1704542400,
                            date_modified: 1705233600
                        }
                    ],
                    count: 2
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
        operationId: "getPerson",
        provider: "copper",
        validCases: [
            {
                name: "get_person_by_id",
                description: "Get a specific person by ID",
                input: { id: 23456789 },
                expectedOutput: {
                    id: 23456789,
                    name: "Sarah Chen",
                    prefix: null,
                    first_name: "Sarah",
                    middle_name: null,
                    last_name: "Chen",
                    suffix: null,
                    address: {
                        street: "100 Enterprise Blvd",
                        city: "San Francisco",
                        state: "CA",
                        postal_code: "94105",
                        country: "US"
                    },
                    assignee_id: 987654,
                    company_id: 34567890,
                    company_name: "Acme Corporation",
                    contact_type_id: 1,
                    details: "VP of Engineering - Primary contact for enterprise deal",
                    emails: [{ email: "sarah.chen@acme.com", category: "work" }],
                    phone_numbers: [{ number: "+1-415-555-0200", category: "work" }],
                    socials: [{ url: "https://linkedin.com/in/sarahchen", category: "linkedin" }],
                    tags: ["decision-maker", "technical"],
                    title: "VP of Engineering",
                    websites: [{ url: "https://acme.com", category: "work" }],
                    custom_fields: [],
                    date_created: 1704628800,
                    date_modified: 1705320000
                }
            }
        ],
        errorCases: [
            {
                name: "person_not_found",
                description: "Person does not exist",
                input: { id: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Person not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { id: 23456789 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createPerson",
        provider: "copper",
        validCases: [
            {
                name: "create_basic_person",
                description: "Create a person with basic information",
                input: {
                    name: "Emily Watson",
                    emails: [{ email: "emily.watson@example.com", category: "work" }],
                    phone_numbers: [{ number: "+1-555-987-6543", category: "work" }],
                    title: "Sales Director",
                    company_id: 34567890
                },
                expectedOutput: {
                    id: 23456791,
                    name: "Emily Watson",
                    prefix: null,
                    first_name: "Emily",
                    middle_name: null,
                    last_name: "Watson",
                    suffix: null,
                    address: null,
                    assignee_id: 987654,
                    company_id: 34567890,
                    company_name: "Acme Corporation",
                    contact_type_id: 1,
                    details: null,
                    emails: [{ email: "emily.watson@example.com", category: "work" }],
                    phone_numbers: [{ number: "+1-555-987-6543", category: "work" }],
                    socials: [],
                    tags: [],
                    title: "Sales Director",
                    websites: [],
                    date_created: 1705579200,
                    date_modified: 1705579200
                }
            }
        ],
        errorCases: [
            {
                name: "missing_name",
                description: "Person created without required name",
                input: {
                    emails: [{ email: "test@example.com", category: "work" }]
                },
                expectedError: {
                    type: "validation",
                    message: "Name is required",
                    retryable: false
                }
            },
            {
                name: "invalid_company_id",
                description: "Person linked to non-existent company",
                input: {
                    name: "Test Person",
                    company_id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Company not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { name: "Test Person" },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updatePerson",
        provider: "copper",
        validCases: [
            {
                name: "update_person_title",
                description: "Update person title and details",
                input: {
                    id: 23456789,
                    title: "SVP of Engineering",
                    details: "Promoted from VP to SVP"
                },
                expectedOutput: {
                    id: 23456789,
                    name: "Sarah Chen",
                    prefix: null,
                    first_name: "Sarah",
                    middle_name: null,
                    last_name: "Chen",
                    suffix: null,
                    address: {
                        street: "100 Enterprise Blvd",
                        city: "San Francisco",
                        state: "CA",
                        postal_code: "94105",
                        country: "US"
                    },
                    assignee_id: 987654,
                    company_id: 34567890,
                    company_name: "Acme Corporation",
                    contact_type_id: 1,
                    details: "Promoted from VP to SVP",
                    emails: [{ email: "sarah.chen@acme.com", category: "work" }],
                    phone_numbers: [{ number: "+1-415-555-0200", category: "work" }],
                    socials: [{ url: "https://linkedin.com/in/sarahchen", category: "linkedin" }],
                    tags: ["decision-maker", "technical"],
                    title: "SVP of Engineering",
                    websites: [{ url: "https://acme.com", category: "work" }],
                    date_created: 1704628800,
                    date_modified: 1705665600
                }
            }
        ],
        errorCases: [
            {
                name: "person_not_found",
                description: "Person does not exist",
                input: { id: 99999999, title: "New Title" },
                expectedError: {
                    type: "not_found",
                    message: "Person not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { id: 23456789, title: "New Title" },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deletePerson",
        provider: "copper",
        validCases: [
            {
                name: "delete_existing_person",
                description: "Delete an existing person",
                input: { id: 23456789 },
                expectedOutput: {
                    deleted: true,
                    id: 23456789
                }
            }
        ],
        errorCases: [
            {
                name: "person_not_found",
                description: "Person does not exist",
                input: { id: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Person not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { id: 23456789 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== COMPANIES ====================
    {
        operationId: "listCompanies",
        provider: "copper",
        validCases: [
            {
                name: "list_all_companies",
                description: "List all companies with default pagination",
                input: {},
                expectedOutput: {
                    companies: [
                        {
                            id: 34567890,
                            name: "Acme Corporation",
                            address: {
                                street: "100 Enterprise Blvd",
                                city: "San Francisco",
                                state: "CA",
                                postal_code: "94105",
                                country: "US"
                            },
                            assignee_id: 987654,
                            contact_type_id: 5,
                            details: "Fortune 500 company in the tech sector",
                            email_domain: "acme.com",
                            phone_numbers: [{ number: "+1-800-ACME-123", category: "work" }],
                            socials: [
                                { url: "https://linkedin.com/company/acme", category: "linkedin" }
                            ],
                            tags: ["enterprise", "fortune-500"],
                            websites: [{ url: "https://acme.com", category: "work" }],
                            date_created: 1704456000,
                            date_modified: 1705320000
                        },
                        {
                            id: 34567891,
                            name: "TechCorp International",
                            address: {
                                street: "200 Innovation Way",
                                city: "New York",
                                state: "NY",
                                postal_code: "10001",
                                country: "US"
                            },
                            assignee_id: 987655,
                            contact_type_id: 5,
                            details: "Global technology services provider",
                            email_domain: "techcorp.com",
                            phone_numbers: [{ number: "+1-212-555-1000", category: "work" }],
                            socials: [],
                            tags: ["enterprise"],
                            websites: [{ url: "https://techcorp.com", category: "work" }],
                            date_created: 1704369600,
                            date_modified: 1705233600
                        }
                    ],
                    count: 2
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
        operationId: "getCompany",
        provider: "copper",
        validCases: [
            {
                name: "get_company_by_id",
                description: "Get a specific company by ID",
                input: { id: 34567890 },
                expectedOutput: {
                    id: 34567890,
                    name: "Acme Corporation",
                    address: {
                        street: "100 Enterprise Blvd",
                        city: "San Francisco",
                        state: "CA",
                        postal_code: "94105",
                        country: "US"
                    },
                    assignee_id: 987654,
                    contact_type_id: 5,
                    details:
                        "Fortune 500 company in the tech sector. Primary focus on automation software.",
                    email_domain: "acme.com",
                    phone_numbers: [{ number: "+1-800-ACME-123", category: "work" }],
                    socials: [{ url: "https://linkedin.com/company/acme", category: "linkedin" }],
                    tags: ["enterprise", "fortune-500"],
                    websites: [{ url: "https://acme.com", category: "work" }],
                    custom_fields: [],
                    date_created: 1704456000,
                    date_modified: 1705320000
                }
            }
        ],
        errorCases: [
            {
                name: "company_not_found",
                description: "Company does not exist",
                input: { id: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Company not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { id: 34567890 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createCompany",
        provider: "copper",
        validCases: [
            {
                name: "create_basic_company",
                description: "Create a company with basic information",
                input: {
                    name: "Globex Industries",
                    email_domain: "globex.com",
                    phone_numbers: [{ number: "+1-555-GLOBEX", category: "work" }],
                    websites: [{ url: "https://globex.com", category: "work" }],
                    details: "Multinational conglomerate"
                },
                expectedOutput: {
                    id: 34567892,
                    name: "Globex Industries",
                    address: null,
                    assignee_id: 987654,
                    contact_type_id: 5,
                    details: "Multinational conglomerate",
                    email_domain: "globex.com",
                    phone_numbers: [{ number: "+1-555-GLOBEX", category: "work" }],
                    socials: [],
                    tags: [],
                    websites: [{ url: "https://globex.com", category: "work" }],
                    date_created: 1705579200,
                    date_modified: 1705579200
                }
            }
        ],
        errorCases: [
            {
                name: "missing_name",
                description: "Company created without required name",
                input: {
                    email_domain: "test.com"
                },
                expectedError: {
                    type: "validation",
                    message: "Name is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { name: "Test Company" },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateCompany",
        provider: "copper",
        validCases: [
            {
                name: "update_company_details",
                description: "Update company details and address",
                input: {
                    id: 34567890,
                    details: "Updated: Now a Fortune 100 company",
                    address: {
                        street: "500 New HQ Drive",
                        city: "San Francisco",
                        state: "CA",
                        postal_code: "94106",
                        country: "US"
                    }
                },
                expectedOutput: {
                    id: 34567890,
                    name: "Acme Corporation",
                    address: {
                        street: "500 New HQ Drive",
                        city: "San Francisco",
                        state: "CA",
                        postal_code: "94106",
                        country: "US"
                    },
                    assignee_id: 987654,
                    contact_type_id: 5,
                    details: "Updated: Now a Fortune 100 company",
                    email_domain: "acme.com",
                    phone_numbers: [{ number: "+1-800-ACME-123", category: "work" }],
                    socials: [{ url: "https://linkedin.com/company/acme", category: "linkedin" }],
                    tags: ["enterprise", "fortune-500"],
                    websites: [{ url: "https://acme.com", category: "work" }],
                    date_created: 1704456000,
                    date_modified: 1705665600
                }
            }
        ],
        errorCases: [
            {
                name: "company_not_found",
                description: "Company does not exist",
                input: { id: 99999999, details: "New details" },
                expectedError: {
                    type: "not_found",
                    message: "Company not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { id: 34567890, details: "New details" },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteCompany",
        provider: "copper",
        validCases: [
            {
                name: "delete_existing_company",
                description: "Delete an existing company",
                input: { id: 34567890 },
                expectedOutput: {
                    deleted: true,
                    id: 34567890
                }
            }
        ],
        errorCases: [
            {
                name: "company_not_found",
                description: "Company does not exist",
                input: { id: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Company not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { id: 34567890 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== OPPORTUNITIES ====================
    {
        operationId: "listOpportunities",
        provider: "copper",
        validCases: [
            {
                name: "list_all_opportunities",
                description: "List all opportunities with default pagination",
                input: {},
                expectedOutput: {
                    opportunities: [
                        {
                            id: 45678901,
                            name: "Acme Corp Enterprise License",
                            assignee_id: 987654,
                            close_date: "2024-03-15",
                            company_id: 34567890,
                            company_name: "Acme Corporation",
                            customer_source_id: 111222,
                            details: "Enterprise license deal for 500 seats",
                            loss_reason_id: null,
                            monetary_unit: "USD",
                            monetary_value: 7500000,
                            pipeline_id: 555001,
                            pipeline_stage_id: 666003,
                            primary_contact_id: 23456789,
                            priority: "High",
                            status: "Open",
                            tags: ["enterprise", "q1-target"],
                            win_probability: 75,
                            date_stage_changed: 1705233600,
                            date_last_contacted: 1705320000,
                            date_created: 1704628800,
                            date_modified: 1705406400
                        },
                        {
                            id: 45678902,
                            name: "TechCorp Annual Subscription",
                            assignee_id: 987655,
                            close_date: "2024-04-30",
                            company_id: 34567891,
                            company_name: "TechCorp International",
                            customer_source_id: 111223,
                            details: "Annual subscription renewal with upsell",
                            loss_reason_id: null,
                            monetary_unit: "USD",
                            monetary_value: 2500000,
                            pipeline_id: 555001,
                            pipeline_stage_id: 666002,
                            primary_contact_id: 23456790,
                            priority: "Medium",
                            status: "Open",
                            tags: ["renewal"],
                            win_probability: 60,
                            date_stage_changed: 1705147200,
                            date_last_contacted: 1705233600,
                            date_created: 1704542400,
                            date_modified: 1705320000
                        }
                    ],
                    count: 2
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
        operationId: "getOpportunity",
        provider: "copper",
        validCases: [
            {
                name: "get_opportunity_by_id",
                description: "Get a specific opportunity by ID",
                input: { id: 45678901 },
                expectedOutput: {
                    id: 45678901,
                    name: "Acme Corp Enterprise License",
                    assignee_id: 987654,
                    close_date: "2024-03-15",
                    company_id: 34567890,
                    company_name: "Acme Corporation",
                    customer_source_id: 111222,
                    details: "Enterprise license deal for 500 seats. Champion: Sarah Chen.",
                    loss_reason_id: null,
                    monetary_unit: "USD",
                    monetary_value: 7500000,
                    pipeline_id: 555001,
                    pipeline_stage_id: 666003,
                    primary_contact_id: 23456789,
                    priority: "High",
                    status: "Open",
                    tags: ["enterprise", "q1-target"],
                    win_probability: 75,
                    custom_fields: [],
                    date_stage_changed: 1705233600,
                    date_last_contacted: 1705320000,
                    date_created: 1704628800,
                    date_modified: 1705406400
                }
            }
        ],
        errorCases: [
            {
                name: "opportunity_not_found",
                description: "Opportunity does not exist",
                input: { id: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Opportunity not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { id: 45678901 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createOpportunity",
        provider: "copper",
        validCases: [
            {
                name: "create_basic_opportunity",
                description: "Create an opportunity with basic information",
                input: {
                    name: "Globex Enterprise Deal",
                    company_id: 34567892,
                    monetary_value: 5000000,
                    pipeline_id: 555001,
                    pipeline_stage_id: 666001,
                    close_date: "2024-06-30",
                    priority: "High"
                },
                expectedOutput: {
                    id: 45678903,
                    name: "Globex Enterprise Deal",
                    assignee_id: 987654,
                    close_date: "2024-06-30",
                    company_id: 34567892,
                    company_name: "Globex Industries",
                    customer_source_id: null,
                    details: null,
                    loss_reason_id: null,
                    monetary_unit: "USD",
                    monetary_value: 5000000,
                    pipeline_id: 555001,
                    pipeline_stage_id: 666001,
                    primary_contact_id: null,
                    priority: "High",
                    status: "Open",
                    tags: [],
                    win_probability: 0,
                    date_stage_changed: 1705579200,
                    date_last_contacted: null,
                    date_created: 1705579200,
                    date_modified: 1705579200
                }
            }
        ],
        errorCases: [
            {
                name: "missing_name",
                description: "Opportunity created without required name",
                input: {
                    company_id: 34567890,
                    monetary_value: 1000000
                },
                expectedError: {
                    type: "validation",
                    message: "Name is required",
                    retryable: false
                }
            },
            {
                name: "invalid_pipeline_stage",
                description: "Invalid pipeline stage ID",
                input: {
                    name: "Test Opportunity",
                    pipeline_id: 555001,
                    pipeline_stage_id: 999999
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid pipeline stage ID",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { name: "Test Opportunity" },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateOpportunity",
        provider: "copper",
        validCases: [
            {
                name: "update_opportunity_stage",
                description: "Move opportunity to next pipeline stage",
                input: {
                    id: 45678901,
                    pipeline_stage_id: 666004,
                    win_probability: 90,
                    details: "Contract review in progress"
                },
                expectedOutput: {
                    id: 45678901,
                    name: "Acme Corp Enterprise License",
                    assignee_id: 987654,
                    close_date: "2024-03-15",
                    company_id: 34567890,
                    company_name: "Acme Corporation",
                    customer_source_id: 111222,
                    details: "Contract review in progress",
                    loss_reason_id: null,
                    monetary_unit: "USD",
                    monetary_value: 7500000,
                    pipeline_id: 555001,
                    pipeline_stage_id: 666004,
                    primary_contact_id: 23456789,
                    priority: "High",
                    status: "Open",
                    tags: ["enterprise", "q1-target"],
                    win_probability: 90,
                    date_stage_changed: 1705665600,
                    date_last_contacted: 1705320000,
                    date_created: 1704628800,
                    date_modified: 1705665600
                }
            }
        ],
        errorCases: [
            {
                name: "opportunity_not_found",
                description: "Opportunity does not exist",
                input: { id: 99999999, win_probability: 80 },
                expectedError: {
                    type: "not_found",
                    message: "Opportunity not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { id: 45678901, win_probability: 80 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteOpportunity",
        provider: "copper",
        validCases: [
            {
                name: "delete_existing_opportunity",
                description: "Delete an existing opportunity",
                input: { id: 45678901 },
                expectedOutput: {
                    deleted: true,
                    id: 45678901
                }
            }
        ],
        errorCases: [
            {
                name: "opportunity_not_found",
                description: "Opportunity does not exist",
                input: { id: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Opportunity not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { id: 45678901 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== TASKS ====================
    {
        operationId: "listTasks",
        provider: "copper",
        validCases: [
            {
                name: "list_all_tasks",
                description: "List all tasks with default pagination",
                input: {},
                expectedOutput: {
                    tasks: [
                        {
                            id: 56789012,
                            name: "Follow up with Sarah Chen",
                            assignee_id: 987654,
                            due_date: 1705579200,
                            reminder_date: 1705492800,
                            completed_date: null,
                            priority: "High",
                            status: "Open",
                            details: "Send updated proposal with revised pricing",
                            related_resource: {
                                id: 45678901,
                                type: "opportunity"
                            },
                            tags: ["follow-up"],
                            date_created: 1705320000,
                            date_modified: 1705406400
                        },
                        {
                            id: 56789013,
                            name: "Schedule demo with TechCorp team",
                            assignee_id: 987655,
                            due_date: 1705665600,
                            reminder_date: 1705579200,
                            completed_date: null,
                            priority: "Medium",
                            status: "Open",
                            details: "Product demo for technical evaluation",
                            related_resource: {
                                id: 45678902,
                                type: "opportunity"
                            },
                            tags: ["demo"],
                            date_created: 1705233600,
                            date_modified: 1705320000
                        }
                    ],
                    count: 2
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
        operationId: "getTask",
        provider: "copper",
        validCases: [
            {
                name: "get_task_by_id",
                description: "Get a specific task by ID",
                input: { id: 56789012 },
                expectedOutput: {
                    id: 56789012,
                    name: "Follow up with Sarah Chen",
                    assignee_id: 987654,
                    due_date: 1705579200,
                    reminder_date: 1705492800,
                    completed_date: null,
                    priority: "High",
                    status: "Open",
                    details:
                        "Send updated proposal with revised pricing. Include volume discounts.",
                    related_resource: {
                        id: 45678901,
                        type: "opportunity"
                    },
                    tags: ["follow-up"],
                    custom_fields: [],
                    date_created: 1705320000,
                    date_modified: 1705406400
                }
            }
        ],
        errorCases: [
            {
                name: "task_not_found",
                description: "Task does not exist",
                input: { id: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { id: 56789012 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createTask",
        provider: "copper",
        validCases: [
            {
                name: "create_basic_task",
                description: "Create a task with basic information",
                input: {
                    name: "Prepare Q1 contract",
                    due_date: 1705752000,
                    priority: "High",
                    details: "Finalize contract terms with legal",
                    related_resource: {
                        id: 45678901,
                        type: "opportunity"
                    }
                },
                expectedOutput: {
                    id: 56789014,
                    name: "Prepare Q1 contract",
                    assignee_id: 987654,
                    due_date: 1705752000,
                    reminder_date: null,
                    completed_date: null,
                    priority: "High",
                    status: "Open",
                    details: "Finalize contract terms with legal",
                    related_resource: {
                        id: 45678901,
                        type: "opportunity"
                    },
                    tags: [],
                    date_created: 1705579200,
                    date_modified: 1705579200
                }
            }
        ],
        errorCases: [
            {
                name: "missing_name",
                description: "Task created without required name",
                input: {
                    due_date: 1705752000,
                    priority: "High"
                },
                expectedError: {
                    type: "validation",
                    message: "Name is required",
                    retryable: false
                }
            },
            {
                name: "invalid_related_resource",
                description: "Task linked to non-existent resource",
                input: {
                    name: "Test Task",
                    related_resource: {
                        id: 99999999,
                        type: "opportunity"
                    }
                },
                expectedError: {
                    type: "not_found",
                    message: "Related resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { name: "Test Task" },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateTask",
        provider: "copper",
        validCases: [
            {
                name: "mark_task_completed",
                description: "Mark a task as completed",
                input: {
                    id: 56789012,
                    status: "Completed",
                    completed_date: 1705665600
                },
                expectedOutput: {
                    id: 56789012,
                    name: "Follow up with Sarah Chen",
                    assignee_id: 987654,
                    due_date: 1705579200,
                    reminder_date: 1705492800,
                    completed_date: 1705665600,
                    priority: "High",
                    status: "Completed",
                    details:
                        "Send updated proposal with revised pricing. Include volume discounts.",
                    related_resource: {
                        id: 45678901,
                        type: "opportunity"
                    },
                    tags: ["follow-up"],
                    date_created: 1705320000,
                    date_modified: 1705665600
                }
            }
        ],
        errorCases: [
            {
                name: "task_not_found",
                description: "Task does not exist",
                input: { id: 99999999, status: "Completed" },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { id: 56789012, status: "Completed" },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    }
];
