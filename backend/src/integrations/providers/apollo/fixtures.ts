/**
 * Apollo Provider Test Fixtures
 *
 * Apollo is a sales intelligence platform for contact/company enrichment,
 * search, and lead management.
 */

import type { TestFixture } from "../../sandbox";

export const apolloFixtures: TestFixture[] = [
    // ============================================
    // ENRICHMENT OPERATIONS
    // ============================================
    {
        operationId: "enrichPerson",
        provider: "apollo",
        validCases: [
            {
                name: "basic_enrichPerson",
                description: "Enrich a person's profile using email address",
                input: {
                    email: "sarah.chen@acme-corp.com"
                },
                expectedOutput: {
                    person: {
                        id: "per_abc123xyz",
                        first_name: "Sarah",
                        last_name: "Chen",
                        name: "Sarah Chen",
                        title: "VP of Engineering",
                        email: "sarah.chen@acme-corp.com",
                        phone_numbers: ["+1-415-555-0142"],
                        linkedin_url: "https://linkedin.com/in/sarahchen",
                        organization_id: "org_acme123",
                        organization_name: "Acme Corporation",
                        city: "San Francisco",
                        state: "California",
                        country: "United States",
                        seniority: "vp",
                        departments: ["engineering"],
                        employment_history: [
                            {
                                organization_name: "Acme Corporation",
                                title: "VP of Engineering",
                                start_date: "2021-03",
                                current: true
                            },
                            {
                                organization_name: "TechStart Inc",
                                title: "Senior Engineering Manager",
                                start_date: "2018-06",
                                end_date: "2021-02"
                            }
                        ]
                    },
                    credits_used: 1
                }
            }
        ],
        errorCases: [
            {
                name: "missing_required_fields",
                description: "Validation error when neither email nor name+domain provided",
                input: {
                    first_name: "John"
                },
                expectedError: {
                    type: "validation",
                    message: "Must provide either email or (first_name + last_name + domain)",
                    retryable: false
                }
            },
            {
                name: "person_not_found",
                description: "Person not found in Apollo database",
                input: {
                    email: "unknown.person@nonexistent-domain.com"
                },
                expectedError: {
                    type: "not_found",
                    message: "Person not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    email: "rate.limited@example.com"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            },
            {
                name: "insufficient_credits",
                description: "Insufficient credits for enrichment",
                input: {
                    email: "no.credits@example.com"
                },
                expectedError: {
                    type: "permission",
                    message: "Insufficient credits for enrichment operation",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "enrichOrganization",
        provider: "apollo",
        validCases: [
            {
                name: "basic_enrichOrganization",
                description: "Enrich an organization's profile using domain",
                input: {
                    domain: "acme-corp.com"
                },
                expectedOutput: {
                    organization: {
                        id: "org_acme123",
                        name: "Acme Corporation",
                        domain: "acme-corp.com",
                        website_url: "https://www.acme-corp.com",
                        linkedin_url: "https://linkedin.com/company/acme-corporation",
                        phone_number: "+1-415-555-0100",
                        industry: "Computer Software",
                        revenue: 50000000,
                        revenue_range: "$10M-$50M",
                        employee_count: 250,
                        employee_count_range: "201-500",
                        city: "San Francisco",
                        state: "California",
                        country: "United States",
                        founded_year: 2015,
                        description:
                            "Enterprise software company specializing in workflow automation and cloud solutions.",
                        technologies: ["AWS", "React", "Node.js", "PostgreSQL"],
                        keywords: ["SaaS", "B2B", "Enterprise", "Automation"]
                    },
                    credits_used: 1
                }
            }
        ],
        errorCases: [
            {
                name: "missing_required_fields",
                description: "Validation error when neither domain nor name provided",
                input: {},
                expectedError: {
                    type: "validation",
                    message: "Must provide either domain or name",
                    retryable: false
                }
            },
            {
                name: "organization_not_found",
                description: "Organization not found in Apollo database",
                input: {
                    domain: "nonexistent-company-xyz123.com"
                },
                expectedError: {
                    type: "not_found",
                    message: "Organization not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    domain: "rate-limited.com"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================
    // SEARCH OPERATIONS
    // ============================================
    {
        operationId: "searchPeople",
        provider: "apollo",
        validCases: [
            {
                name: "basic_searchPeople",
                description: "Search for people with filters",
                input: {
                    q_keywords: "software engineer",
                    person_titles: ["VP of Engineering", "CTO"],
                    person_seniorities: ["vp", "c_suite"],
                    page: 1,
                    per_page: 25
                },
                expectedOutput: {
                    people: [
                        {
                            id: "per_abc123xyz",
                            first_name: "Sarah",
                            last_name: "Chen",
                            name: "Sarah Chen",
                            title: "VP of Engineering",
                            email: "sarah.chen@acme-corp.com",
                            linkedin_url: "https://linkedin.com/in/sarahchen",
                            organization_id: "org_acme123",
                            organization_name: "Acme Corporation"
                        },
                        {
                            id: "per_def456uvw",
                            first_name: "Michael",
                            last_name: "Rodriguez",
                            name: "Michael Rodriguez",
                            title: "CTO",
                            email: "michael@techstart.io",
                            linkedin_url: "https://linkedin.com/in/mrodriguez",
                            organization_id: "org_techstart456",
                            organization_name: "TechStart Inc"
                        },
                        {
                            id: "per_ghi789rst",
                            first_name: "Emily",
                            last_name: "Watson",
                            name: "Emily Watson",
                            title: "VP of Engineering",
                            email: "emily.watson@dataflow.com",
                            linkedin_url: "https://linkedin.com/in/emilywatson",
                            organization_id: "org_dataflow789",
                            organization_name: "DataFlow Systems"
                        }
                    ],
                    pagination: {
                        total_entries: 1542,
                        total_pages: 62,
                        page: 1
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_pagination",
                description: "Invalid pagination parameters",
                input: {
                    per_page: 500
                },
                expectedError: {
                    type: "validation",
                    message: "per_page must be between 1 and 100",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    q_keywords: "rate limited search"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "searchOrganizations",
        provider: "apollo",
        validCases: [
            {
                name: "basic_searchOrganizations",
                description: "Search for organizations with filters",
                input: {
                    q_keywords: "software",
                    organization_locations: ["San Francisco, CA", "New York, NY"],
                    organization_num_employees_ranges: ["51-200", "201-500"],
                    page: 1,
                    per_page: 25
                },
                expectedOutput: {
                    organizations: [
                        {
                            id: "org_acme123",
                            name: "Acme Corporation",
                            domain: "acme-corp.com",
                            website_url: "https://www.acme-corp.com",
                            linkedin_url: "https://linkedin.com/company/acme-corporation",
                            industry: "Computer Software",
                            employee_count: 250,
                            city: "San Francisco",
                            state: "California",
                            country: "United States"
                        },
                        {
                            id: "org_techstart456",
                            name: "TechStart Inc",
                            domain: "techstart.io",
                            website_url: "https://www.techstart.io",
                            linkedin_url: "https://linkedin.com/company/techstart",
                            industry: "Information Technology",
                            employee_count: 85,
                            city: "New York",
                            state: "New York",
                            country: "United States"
                        },
                        {
                            id: "org_dataflow789",
                            name: "DataFlow Systems",
                            domain: "dataflow.com",
                            website_url: "https://www.dataflow.com",
                            linkedin_url: "https://linkedin.com/company/dataflow-systems",
                            industry: "Computer Software",
                            employee_count: 175,
                            city: "San Francisco",
                            state: "California",
                            country: "United States"
                        }
                    ],
                    pagination: {
                        total_entries: 892,
                        total_pages: 36,
                        page: 1
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_pagination",
                description: "Invalid pagination parameters",
                input: {
                    per_page: 200
                },
                expectedError: {
                    type: "validation",
                    message: "per_page must be between 1 and 100",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    q_keywords: "rate limited org search"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================
    // CONTACT MANAGEMENT OPERATIONS
    // ============================================
    {
        operationId: "createContact",
        provider: "apollo",
        validCases: [
            {
                name: "basic_createContact",
                description: "Create a new contact in Apollo",
                input: {
                    first_name: "John",
                    last_name: "Smith",
                    email: "john.smith@example.com",
                    title: "Senior Software Engineer",
                    organization_name: "Example Corp",
                    phone_numbers: ["+1-555-123-4567"],
                    linkedin_url: "https://linkedin.com/in/johnsmith"
                },
                expectedOutput: {
                    id: "cont_new123abc",
                    first_name: "John",
                    last_name: "Smith",
                    name: "John Smith",
                    email: "john.smith@example.com",
                    title: "Senior Software Engineer",
                    organization_name: "Example Corp",
                    phone_numbers: ["+1-555-123-4567"],
                    linkedin_url: "https://linkedin.com/in/johnsmith",
                    created_at: "2024-01-20T10:00:00.000Z",
                    updated_at: "2024-01-20T10:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_required_fields",
                description: "Validation error when required fields are missing",
                input: {
                    first_name: "John"
                },
                expectedError: {
                    type: "validation",
                    message: "last_name is required",
                    retryable: false
                }
            },
            {
                name: "invalid_email_format",
                description: "Validation error for invalid email format",
                input: {
                    first_name: "John",
                    last_name: "Smith",
                    email: "not-an-email"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email format",
                    retryable: false
                }
            },
            {
                name: "duplicate_contact",
                description: "Contact with email already exists",
                input: {
                    first_name: "John",
                    last_name: "Smith",
                    email: "existing.contact@example.com"
                },
                expectedError: {
                    type: "validation",
                    message: "Contact with this email already exists",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    first_name: "Rate",
                    last_name: "Limited"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getContact",
        provider: "apollo",
        validCases: [
            {
                name: "basic_getContact",
                description: "Retrieve a contact by ID",
                input: {
                    contact_id: "cont_abc123xyz"
                },
                expectedOutput: {
                    id: "cont_abc123xyz",
                    first_name: "Sarah",
                    last_name: "Chen",
                    name: "Sarah Chen",
                    email: "sarah.chen@acme-corp.com",
                    title: "VP of Engineering",
                    organization_name: "Acme Corporation",
                    phone_numbers: ["+1-415-555-0142"],
                    linkedin_url: "https://linkedin.com/in/sarahchen",
                    created_at: "2024-01-15T10:30:00.000Z",
                    updated_at: "2024-01-18T14:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact not found",
                input: {
                    contact_id: "cont_nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Contact not found",
                    retryable: false
                }
            },
            {
                name: "invalid_id_format",
                description: "Invalid contact ID format",
                input: {
                    contact_id: ""
                },
                expectedError: {
                    type: "validation",
                    message: "Contact ID is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    contact_id: "cont_rate_limited"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateContact",
        provider: "apollo",
        validCases: [
            {
                name: "basic_updateContact",
                description: "Update an existing contact",
                input: {
                    contact_id: "cont_abc123xyz",
                    title: "Chief Technology Officer",
                    email: "sarah.chen@acme-corp.com",
                    organization_name: "Acme Corporation International"
                },
                expectedOutput: {
                    id: "cont_abc123xyz",
                    first_name: "Sarah",
                    last_name: "Chen",
                    name: "Sarah Chen",
                    email: "sarah.chen@acme-corp.com",
                    title: "Chief Technology Officer",
                    organization_name: "Acme Corporation International",
                    phone_numbers: ["+1-415-555-0142"],
                    linkedin_url: "https://linkedin.com/in/sarahchen",
                    created_at: "2024-01-15T10:30:00.000Z",
                    updated_at: "2024-01-25T16:30:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact not found",
                input: {
                    contact_id: "cont_nonexistent123",
                    title: "New Title"
                },
                expectedError: {
                    type: "not_found",
                    message: "Contact not found",
                    retryable: false
                }
            },
            {
                name: "invalid_email_format",
                description: "Validation error for invalid email format",
                input: {
                    contact_id: "cont_abc123xyz",
                    email: "invalid-email-format"
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
                input: {
                    contact_id: "cont_rate_limited",
                    title: "Updated Title"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteContact",
        provider: "apollo",
        validCases: [
            {
                name: "basic_deleteContact",
                description: "Delete a contact from Apollo",
                input: {
                    contact_id: "cont_to_delete_456"
                },
                expectedOutput: {
                    message: "Contact deleted successfully",
                    contact_id: "cont_to_delete_456"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contact not found",
                input: {
                    contact_id: "cont_nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Contact not found",
                    retryable: false
                }
            },
            {
                name: "permission_denied",
                description: "Permission denied to delete contact",
                input: {
                    contact_id: "cont_protected_789"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to delete this contact",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    contact_id: "cont_rate_limited"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================
    // ACCOUNT MANAGEMENT OPERATIONS
    // ============================================
    {
        operationId: "createAccount",
        provider: "apollo",
        validCases: [
            {
                name: "basic_createAccount",
                description: "Create a new account (organization) in Apollo",
                input: {
                    name: "NewTech Solutions",
                    domain: "newtech-solutions.com",
                    phone_number: "+1-555-987-6543",
                    website_url: "https://www.newtech-solutions.com"
                },
                expectedOutput: {
                    id: "acc_new789def",
                    name: "NewTech Solutions",
                    domain: "newtech-solutions.com",
                    phone_number: "+1-555-987-6543",
                    website_url: "https://www.newtech-solutions.com",
                    created_at: "2024-01-20T11:00:00.000Z",
                    updated_at: "2024-01-20T11:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_required_fields",
                description: "Validation error when name is missing",
                input: {
                    domain: "example.com"
                },
                expectedError: {
                    type: "validation",
                    message: "Account name is required",
                    retryable: false
                }
            },
            {
                name: "duplicate_account",
                description: "Account with domain already exists",
                input: {
                    name: "Duplicate Corp",
                    domain: "existing-domain.com"
                },
                expectedError: {
                    type: "validation",
                    message: "Account with this domain already exists",
                    retryable: false
                }
            },
            {
                name: "invalid_url_format",
                description: "Validation error for invalid website URL",
                input: {
                    name: "Bad URL Corp",
                    website_url: "not-a-valid-url"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid website URL format",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "Rate Limited Corp"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getAccount",
        provider: "apollo",
        validCases: [
            {
                name: "basic_getAccount",
                description: "Retrieve an account by ID",
                input: {
                    account_id: "acc_acme123"
                },
                expectedOutput: {
                    id: "acc_acme123",
                    name: "Acme Corporation",
                    domain: "acme-corp.com",
                    phone_number: "+1-415-555-0100",
                    website_url: "https://www.acme-corp.com",
                    industry: "Computer Software",
                    employee_count: 250,
                    city: "San Francisco",
                    state: "California",
                    country: "United States",
                    created_at: "2024-01-10T09:00:00.000Z",
                    updated_at: "2024-01-20T14:30:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Account not found",
                input: {
                    account_id: "acc_nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Account not found",
                    retryable: false
                }
            },
            {
                name: "invalid_id_format",
                description: "Invalid account ID format",
                input: {
                    account_id: ""
                },
                expectedError: {
                    type: "validation",
                    message: "Account ID is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    account_id: "acc_rate_limited"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateAccount",
        provider: "apollo",
        validCases: [
            {
                name: "basic_updateAccount",
                description: "Update an existing account",
                input: {
                    account_id: "acc_acme123",
                    name: "Acme Corporation International",
                    phone_number: "+1-415-555-0200"
                },
                expectedOutput: {
                    id: "acc_acme123",
                    name: "Acme Corporation International",
                    domain: "acme-corp.com",
                    phone_number: "+1-415-555-0200",
                    website_url: "https://www.acme-corp.com",
                    industry: "Computer Software",
                    employee_count: 250,
                    city: "San Francisco",
                    state: "California",
                    country: "United States",
                    created_at: "2024-01-10T09:00:00.000Z",
                    updated_at: "2024-01-25T16:45:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Account not found",
                input: {
                    account_id: "acc_nonexistent123",
                    name: "Updated Name"
                },
                expectedError: {
                    type: "not_found",
                    message: "Account not found",
                    retryable: false
                }
            },
            {
                name: "duplicate_domain",
                description: "Domain already in use by another account",
                input: {
                    account_id: "acc_acme123",
                    domain: "existing-other-domain.com"
                },
                expectedError: {
                    type: "validation",
                    message: "Domain already in use by another account",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    account_id: "acc_rate_limited",
                    name: "Updated Name"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteAccount",
        provider: "apollo",
        validCases: [
            {
                name: "basic_deleteAccount",
                description: "Delete an account from Apollo",
                input: {
                    account_id: "acc_to_delete_789"
                },
                expectedOutput: {
                    message: "Account deleted successfully",
                    account_id: "acc_to_delete_789"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Account not found",
                input: {
                    account_id: "acc_nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Account not found",
                    retryable: false
                }
            },
            {
                name: "permission_denied",
                description: "Permission denied to delete account",
                input: {
                    account_id: "acc_protected_999"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to delete this account",
                    retryable: false
                }
            },
            {
                name: "has_associated_contacts",
                description: "Cannot delete account with associated contacts",
                input: {
                    account_id: "acc_with_contacts"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Cannot delete account with associated contacts. Remove contacts first.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    account_id: "acc_rate_limited"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    }
];
