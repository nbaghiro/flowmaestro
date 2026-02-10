/**
 * Insightly CRM Provider Test Fixtures
 *
 * Based on official Insightly API v3.1 documentation:
 * - Contacts: https://api.insightly.com/v3.1/Help#!/Contacts
 * - Organisations: https://api.insightly.com/v3.1/Help#!/Organisations
 * - Leads: https://api.insightly.com/v3.1/Help#!/Leads
 * - Opportunities: https://api.insightly.com/v3.1/Help#!/Opportunities
 * - Tasks: https://api.insightly.com/v3.1/Help#!/Tasks
 */

import type { TestFixture } from "../../../sandbox";

export const insightlyFixtures: TestFixture[] = [
    // ==================== CONTACTS ====================
    {
        operationId: "listContacts",
        provider: "insightly",
        validCases: [
            {
                name: "list_all_contacts",
                description: "List all contacts with default pagination",
                input: {},
                expectedOutput: {
                    contacts: [
                        {
                            CONTACT_ID: 12345678,
                            SALUTATION: "Ms.",
                            FIRST_NAME: "Sarah",
                            LAST_NAME: "Chen",
                            TITLE: "VP of Engineering",
                            ORGANISATION_ID: 23456789,
                            ORGANISATION_NAME: "Acme Corporation",
                            EMAIL_ADDRESS: "sarah.chen@acme.com",
                            PHONE: "+1-415-555-0200",
                            PHONE_HOME: null,
                            PHONE_MOBILE: "+1-415-555-0201",
                            PHONE_FAX: null,
                            ASSISTANT_NAME: null,
                            ASSISTANT_PHONE: null,
                            ADDRESS_MAIL_STREET: "100 Enterprise Blvd",
                            ADDRESS_MAIL_CITY: "San Francisco",
                            ADDRESS_MAIL_STATE: "CA",
                            ADDRESS_MAIL_POSTCODE: "94105",
                            ADDRESS_MAIL_COUNTRY: "United States",
                            BACKGROUND: "Key technical decision maker",
                            OWNER_USER_ID: 987654,
                            VISIBLE_TO: "EVERYONE",
                            DATE_CREATED_UTC: "2024-01-05T09:00:00Z",
                            DATE_UPDATED_UTC: "2024-01-15T14:30:00Z"
                        },
                        {
                            CONTACT_ID: 12345679,
                            SALUTATION: "Mr.",
                            FIRST_NAME: "Michael",
                            LAST_NAME: "Rodriguez",
                            TITLE: "Chief Technology Officer",
                            ORGANISATION_ID: 23456790,
                            ORGANISATION_NAME: "TechCorp International",
                            EMAIL_ADDRESS: "m.rodriguez@techcorp.com",
                            PHONE: "+1-212-555-0300",
                            PHONE_HOME: null,
                            PHONE_MOBILE: null,
                            PHONE_FAX: null,
                            ASSISTANT_NAME: "Jane Doe",
                            ASSISTANT_PHONE: "+1-212-555-0301",
                            ADDRESS_MAIL_STREET: "200 Innovation Way",
                            ADDRESS_MAIL_CITY: "New York",
                            ADDRESS_MAIL_STATE: "NY",
                            ADDRESS_MAIL_POSTCODE: "10001",
                            ADDRESS_MAIL_COUNTRY: "United States",
                            BACKGROUND: "C-level executive, reports to CEO",
                            OWNER_USER_ID: 987655,
                            VISIBLE_TO: "EVERYONE",
                            DATE_CREATED_UTC: "2024-01-03T11:00:00Z",
                            DATE_UPDATED_UTC: "2024-01-14T10:00:00Z"
                        }
                    ],
                    count: 2,
                    skip: 0,
                    top: 50
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded (10 req/sec)",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Maximum 10 requests per second.",
                    retryable: true
                }
            },
            {
                name: "unauthorized",
                description: "Invalid API key",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Invalid API key or unauthorized access",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getContact",
        provider: "insightly",
        validCases: [
            {
                name: "get_contact_by_id",
                description: "Get a specific contact by ID",
                input: { contact_id: 12345678 },
                expectedOutput: {
                    CONTACT_ID: 12345678,
                    SALUTATION: "Ms.",
                    FIRST_NAME: "Sarah",
                    LAST_NAME: "Chen",
                    TITLE: "VP of Engineering",
                    ORGANISATION_ID: 23456789,
                    ORGANISATION_NAME: "Acme Corporation",
                    EMAIL_ADDRESS: "sarah.chen@acme.com",
                    PHONE: "+1-415-555-0200",
                    PHONE_HOME: null,
                    PHONE_MOBILE: "+1-415-555-0201",
                    PHONE_FAX: null,
                    ASSISTANT_NAME: null,
                    ASSISTANT_PHONE: null,
                    ADDRESS_MAIL_STREET: "100 Enterprise Blvd",
                    ADDRESS_MAIL_CITY: "San Francisco",
                    ADDRESS_MAIL_STATE: "CA",
                    ADDRESS_MAIL_POSTCODE: "94105",
                    ADDRESS_MAIL_COUNTRY: "United States",
                    BACKGROUND: "Key technical decision maker for enterprise deals",
                    OWNER_USER_ID: 987654,
                    VISIBLE_TO: "EVERYONE",
                    TAGS: [{ TAG_NAME: "decision-maker" }, { TAG_NAME: "technical" }],
                    CUSTOMFIELDS: [],
                    LINKS: [],
                    DATE_CREATED_UTC: "2024-01-05T09:00:00Z",
                    DATE_UPDATED_UTC: "2024-01-15T14:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "contact_not_found",
                description: "Contact does not exist",
                input: { contact_id: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Contact not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { contact_id: 12345678 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createContact",
        provider: "insightly",
        validCases: [
            {
                name: "create_basic_contact",
                description: "Create a contact with basic information",
                input: {
                    FIRST_NAME: "Emily",
                    LAST_NAME: "Watson",
                    EMAIL_ADDRESS: "emily.watson@example.com",
                    PHONE: "+1-555-987-6543",
                    TITLE: "Sales Director",
                    ORGANISATION_ID: 23456789
                },
                expectedOutput: {
                    CONTACT_ID: 12345680,
                    SALUTATION: null,
                    FIRST_NAME: "Emily",
                    LAST_NAME: "Watson",
                    TITLE: "Sales Director",
                    ORGANISATION_ID: 23456789,
                    ORGANISATION_NAME: "Acme Corporation",
                    EMAIL_ADDRESS: "emily.watson@example.com",
                    PHONE: "+1-555-987-6543",
                    PHONE_HOME: null,
                    PHONE_MOBILE: null,
                    PHONE_FAX: null,
                    ASSISTANT_NAME: null,
                    ASSISTANT_PHONE: null,
                    ADDRESS_MAIL_STREET: null,
                    ADDRESS_MAIL_CITY: null,
                    ADDRESS_MAIL_STATE: null,
                    ADDRESS_MAIL_POSTCODE: null,
                    ADDRESS_MAIL_COUNTRY: null,
                    BACKGROUND: null,
                    OWNER_USER_ID: 987654,
                    VISIBLE_TO: "EVERYONE",
                    TAGS: [],
                    CUSTOMFIELDS: [],
                    LINKS: [],
                    DATE_CREATED_UTC: "2024-01-18T10:00:00Z",
                    DATE_UPDATED_UTC: "2024-01-18T10:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_name",
                description: "Contact created without required name",
                input: {
                    EMAIL_ADDRESS: "test@example.com"
                },
                expectedError: {
                    type: "validation",
                    message: "FIRST_NAME or LAST_NAME is required",
                    retryable: false
                }
            },
            {
                name: "invalid_organisation",
                description: "Contact linked to non-existent organisation",
                input: {
                    FIRST_NAME: "Test",
                    LAST_NAME: "Person",
                    ORGANISATION_ID: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Organisation not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { FIRST_NAME: "Test", LAST_NAME: "Person" },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateContact",
        provider: "insightly",
        validCases: [
            {
                name: "update_contact_title",
                description: "Update contact title and background",
                input: {
                    contact_id: 12345678,
                    TITLE: "SVP of Engineering",
                    BACKGROUND: "Promoted from VP to SVP in Q1 2024"
                },
                expectedOutput: {
                    CONTACT_ID: 12345678,
                    SALUTATION: "Ms.",
                    FIRST_NAME: "Sarah",
                    LAST_NAME: "Chen",
                    TITLE: "SVP of Engineering",
                    ORGANISATION_ID: 23456789,
                    ORGANISATION_NAME: "Acme Corporation",
                    EMAIL_ADDRESS: "sarah.chen@acme.com",
                    PHONE: "+1-415-555-0200",
                    PHONE_HOME: null,
                    PHONE_MOBILE: "+1-415-555-0201",
                    PHONE_FAX: null,
                    BACKGROUND: "Promoted from VP to SVP in Q1 2024",
                    OWNER_USER_ID: 987654,
                    VISIBLE_TO: "EVERYONE",
                    DATE_CREATED_UTC: "2024-01-05T09:00:00Z",
                    DATE_UPDATED_UTC: "2024-01-20T16:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "contact_not_found",
                description: "Contact does not exist",
                input: { contact_id: 99999999, TITLE: "New Title" },
                expectedError: {
                    type: "not_found",
                    message: "Contact not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { contact_id: 12345678, TITLE: "New Title" },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteContact",
        provider: "insightly",
        validCases: [
            {
                name: "delete_existing_contact",
                description: "Delete an existing contact",
                input: { contact_id: 12345678 },
                expectedOutput: {
                    deleted: true,
                    id: 12345678
                }
            }
        ],
        errorCases: [
            {
                name: "contact_not_found",
                description: "Contact does not exist",
                input: { contact_id: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Contact not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { contact_id: 12345678 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== ORGANISATIONS ====================
    {
        operationId: "listOrganisations",
        provider: "insightly",
        validCases: [
            {
                name: "list_all_organisations",
                description: "List all organisations with default pagination",
                input: {},
                expectedOutput: {
                    organisations: [
                        {
                            ORGANISATION_ID: 23456789,
                            ORGANISATION_NAME: "Acme Corporation",
                            BACKGROUND: "Fortune 500 technology company",
                            PHONE: "+1-800-ACME-123",
                            PHONE_FAX: null,
                            WEBSITE: "https://acme.com",
                            ADDRESS_BILLING_STREET: "100 Enterprise Blvd",
                            ADDRESS_BILLING_CITY: "San Francisco",
                            ADDRESS_BILLING_STATE: "CA",
                            ADDRESS_BILLING_POSTCODE: "94105",
                            ADDRESS_BILLING_COUNTRY: "United States",
                            ADDRESS_SHIP_STREET: "100 Enterprise Blvd",
                            ADDRESS_SHIP_CITY: "San Francisco",
                            ADDRESS_SHIP_STATE: "CA",
                            ADDRESS_SHIP_POSTCODE: "94105",
                            ADDRESS_SHIP_COUNTRY: "United States",
                            OWNER_USER_ID: 987654,
                            VISIBLE_TO: "EVERYONE",
                            DATE_CREATED_UTC: "2024-01-02T08:00:00Z",
                            DATE_UPDATED_UTC: "2024-01-15T12:00:00Z"
                        },
                        {
                            ORGANISATION_ID: 23456790,
                            ORGANISATION_NAME: "TechCorp International",
                            BACKGROUND: "Global technology services provider",
                            PHONE: "+1-212-555-1000",
                            PHONE_FAX: "+1-212-555-1001",
                            WEBSITE: "https://techcorp.com",
                            ADDRESS_BILLING_STREET: "200 Innovation Way",
                            ADDRESS_BILLING_CITY: "New York",
                            ADDRESS_BILLING_STATE: "NY",
                            ADDRESS_BILLING_POSTCODE: "10001",
                            ADDRESS_BILLING_COUNTRY: "United States",
                            ADDRESS_SHIP_STREET: null,
                            ADDRESS_SHIP_CITY: null,
                            ADDRESS_SHIP_STATE: null,
                            ADDRESS_SHIP_POSTCODE: null,
                            ADDRESS_SHIP_COUNTRY: null,
                            OWNER_USER_ID: 987655,
                            VISIBLE_TO: "EVERYONE",
                            DATE_CREATED_UTC: "2024-01-01T10:00:00Z",
                            DATE_UPDATED_UTC: "2024-01-14T08:00:00Z"
                        }
                    ],
                    count: 2,
                    skip: 0,
                    top: 50
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
        operationId: "getOrganisation",
        provider: "insightly",
        validCases: [
            {
                name: "get_organisation_by_id",
                description: "Get a specific organisation by ID",
                input: { organisation_id: 23456789 },
                expectedOutput: {
                    ORGANISATION_ID: 23456789,
                    ORGANISATION_NAME: "Acme Corporation",
                    BACKGROUND:
                        "Fortune 500 technology company specializing in automation software",
                    PHONE: "+1-800-ACME-123",
                    PHONE_FAX: null,
                    WEBSITE: "https://acme.com",
                    ADDRESS_BILLING_STREET: "100 Enterprise Blvd",
                    ADDRESS_BILLING_CITY: "San Francisco",
                    ADDRESS_BILLING_STATE: "CA",
                    ADDRESS_BILLING_POSTCODE: "94105",
                    ADDRESS_BILLING_COUNTRY: "United States",
                    ADDRESS_SHIP_STREET: "100 Enterprise Blvd",
                    ADDRESS_SHIP_CITY: "San Francisco",
                    ADDRESS_SHIP_STATE: "CA",
                    ADDRESS_SHIP_POSTCODE: "94105",
                    ADDRESS_SHIP_COUNTRY: "United States",
                    OWNER_USER_ID: 987654,
                    VISIBLE_TO: "EVERYONE",
                    TAGS: [{ TAG_NAME: "enterprise" }, { TAG_NAME: "fortune-500" }],
                    CUSTOMFIELDS: [],
                    LINKS: [],
                    DATE_CREATED_UTC: "2024-01-02T08:00:00Z",
                    DATE_UPDATED_UTC: "2024-01-15T12:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "organisation_not_found",
                description: "Organisation does not exist",
                input: { organisation_id: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Organisation not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { organisation_id: 23456789 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createOrganisation",
        provider: "insightly",
        validCases: [
            {
                name: "create_basic_organisation",
                description: "Create an organisation with basic information",
                input: {
                    ORGANISATION_NAME: "Globex Industries",
                    PHONE: "+1-555-GLOBEX",
                    WEBSITE: "https://globex.com",
                    BACKGROUND: "Multinational conglomerate"
                },
                expectedOutput: {
                    ORGANISATION_ID: 23456791,
                    ORGANISATION_NAME: "Globex Industries",
                    BACKGROUND: "Multinational conglomerate",
                    PHONE: "+1-555-GLOBEX",
                    PHONE_FAX: null,
                    WEBSITE: "https://globex.com",
                    ADDRESS_BILLING_STREET: null,
                    ADDRESS_BILLING_CITY: null,
                    ADDRESS_BILLING_STATE: null,
                    ADDRESS_BILLING_POSTCODE: null,
                    ADDRESS_BILLING_COUNTRY: null,
                    ADDRESS_SHIP_STREET: null,
                    ADDRESS_SHIP_CITY: null,
                    ADDRESS_SHIP_STATE: null,
                    ADDRESS_SHIP_POSTCODE: null,
                    ADDRESS_SHIP_COUNTRY: null,
                    OWNER_USER_ID: 987654,
                    VISIBLE_TO: "EVERYONE",
                    TAGS: [],
                    CUSTOMFIELDS: [],
                    LINKS: [],
                    DATE_CREATED_UTC: "2024-01-18T11:00:00Z",
                    DATE_UPDATED_UTC: "2024-01-18T11:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_name",
                description: "Organisation created without required name",
                input: {
                    WEBSITE: "https://test.com"
                },
                expectedError: {
                    type: "validation",
                    message: "ORGANISATION_NAME is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { ORGANISATION_NAME: "Test Org" },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateOrganisation",
        provider: "insightly",
        validCases: [
            {
                name: "update_organisation_details",
                description: "Update organisation details and address",
                input: {
                    organisation_id: 23456789,
                    BACKGROUND: "Now a Fortune 100 company",
                    ADDRESS_BILLING_STREET: "500 New HQ Drive"
                },
                expectedOutput: {
                    ORGANISATION_ID: 23456789,
                    ORGANISATION_NAME: "Acme Corporation",
                    BACKGROUND: "Now a Fortune 100 company",
                    PHONE: "+1-800-ACME-123",
                    PHONE_FAX: null,
                    WEBSITE: "https://acme.com",
                    ADDRESS_BILLING_STREET: "500 New HQ Drive",
                    ADDRESS_BILLING_CITY: "San Francisco",
                    ADDRESS_BILLING_STATE: "CA",
                    ADDRESS_BILLING_POSTCODE: "94105",
                    ADDRESS_BILLING_COUNTRY: "United States",
                    OWNER_USER_ID: 987654,
                    VISIBLE_TO: "EVERYONE",
                    DATE_CREATED_UTC: "2024-01-02T08:00:00Z",
                    DATE_UPDATED_UTC: "2024-01-20T14:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "organisation_not_found",
                description: "Organisation does not exist",
                input: { organisation_id: 99999999, BACKGROUND: "New background" },
                expectedError: {
                    type: "not_found",
                    message: "Organisation not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { organisation_id: 23456789, BACKGROUND: "New background" },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteOrganisation",
        provider: "insightly",
        validCases: [
            {
                name: "delete_existing_organisation",
                description: "Delete an existing organisation",
                input: { organisation_id: 23456789 },
                expectedOutput: {
                    deleted: true,
                    id: 23456789
                }
            }
        ],
        errorCases: [
            {
                name: "organisation_not_found",
                description: "Organisation does not exist",
                input: { organisation_id: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Organisation not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { organisation_id: 23456789 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== LEADS ====================
    {
        operationId: "listLeads",
        provider: "insightly",
        validCases: [
            {
                name: "list_all_leads",
                description: "List all leads with default pagination",
                input: {},
                expectedOutput: {
                    leads: [
                        {
                            LEAD_ID: 34567890,
                            SALUTATION: "Mr.",
                            FIRST_NAME: "Alex",
                            LAST_NAME: "Johnson",
                            TITLE: "CEO",
                            ORGANISATION_NAME: "New Tech Startup",
                            EMAIL: "alex@newtechstartup.com",
                            PHONE: "+1-415-555-0101",
                            MOBILE: "+1-415-555-0102",
                            FAX: null,
                            WEBSITE: "https://newtechstartup.com",
                            ADDRESS_STREET: "500 Startup Lane",
                            ADDRESS_CITY: "San Francisco",
                            ADDRESS_STATE: "CA",
                            ADDRESS_POSTCODE: "94107",
                            ADDRESS_COUNTRY: "United States",
                            LEAD_DESCRIPTION:
                                "Inbound from website. Interested in enterprise plan.",
                            LEAD_RATING: 5,
                            LEAD_SOURCE_ID: 111001,
                            LEAD_STATUS_ID: 222001,
                            OWNER_USER_ID: 987654,
                            RESPONSIBLE_USER_ID: 987654,
                            CONVERTED: false,
                            CONVERTED_DATE_UTC: null,
                            VISIBLE_TO: "EVERYONE",
                            DATE_CREATED_UTC: "2024-01-15T10:00:00Z",
                            DATE_UPDATED_UTC: "2024-01-17T14:00:00Z"
                        },
                        {
                            LEAD_ID: 34567891,
                            SALUTATION: null,
                            FIRST_NAME: "Morgan",
                            LAST_NAME: "Lee",
                            TITLE: "CTO",
                            ORGANISATION_NAME: "DataFlow Analytics",
                            EMAIL: "morgan@dataflow.io",
                            PHONE: "+1-510-555-0200",
                            MOBILE: null,
                            FAX: null,
                            WEBSITE: "https://dataflow.io",
                            ADDRESS_STREET: null,
                            ADDRESS_CITY: "Oakland",
                            ADDRESS_STATE: "CA",
                            ADDRESS_POSTCODE: null,
                            ADDRESS_COUNTRY: "United States",
                            LEAD_DESCRIPTION: "Trade show contact. Looking for data integration.",
                            LEAD_RATING: 3,
                            LEAD_SOURCE_ID: 111002,
                            LEAD_STATUS_ID: 222002,
                            OWNER_USER_ID: 987655,
                            RESPONSIBLE_USER_ID: 987655,
                            CONVERTED: false,
                            CONVERTED_DATE_UTC: null,
                            VISIBLE_TO: "EVERYONE",
                            DATE_CREATED_UTC: "2024-01-14T08:00:00Z",
                            DATE_UPDATED_UTC: "2024-01-16T11:00:00Z"
                        }
                    ],
                    count: 2,
                    skip: 0,
                    top: 50
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
        operationId: "getLead",
        provider: "insightly",
        validCases: [
            {
                name: "get_lead_by_id",
                description: "Get a specific lead by ID",
                input: { lead_id: 34567890 },
                expectedOutput: {
                    LEAD_ID: 34567890,
                    SALUTATION: "Mr.",
                    FIRST_NAME: "Alex",
                    LAST_NAME: "Johnson",
                    TITLE: "CEO",
                    ORGANISATION_NAME: "New Tech Startup",
                    EMAIL: "alex@newtechstartup.com",
                    PHONE: "+1-415-555-0101",
                    MOBILE: "+1-415-555-0102",
                    FAX: null,
                    WEBSITE: "https://newtechstartup.com",
                    ADDRESS_STREET: "500 Startup Lane",
                    ADDRESS_CITY: "San Francisco",
                    ADDRESS_STATE: "CA",
                    ADDRESS_POSTCODE: "94107",
                    ADDRESS_COUNTRY: "United States",
                    LEAD_DESCRIPTION:
                        "Inbound from website. Interested in enterprise plan. Budget confirmed.",
                    LEAD_RATING: 5,
                    LEAD_SOURCE_ID: 111001,
                    LEAD_STATUS_ID: 222001,
                    OWNER_USER_ID: 987654,
                    RESPONSIBLE_USER_ID: 987654,
                    CONVERTED: false,
                    CONVERTED_DATE_UTC: null,
                    VISIBLE_TO: "EVERYONE",
                    TAGS: [{ TAG_NAME: "hot-lead" }, { TAG_NAME: "enterprise" }],
                    CUSTOMFIELDS: [],
                    LINKS: [],
                    DATE_CREATED_UTC: "2024-01-15T10:00:00Z",
                    DATE_UPDATED_UTC: "2024-01-17T14:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "lead_not_found",
                description: "Lead does not exist",
                input: { lead_id: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Lead not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { lead_id: 34567890 },
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
        provider: "insightly",
        validCases: [
            {
                name: "create_basic_lead",
                description: "Create a lead with basic information",
                input: {
                    FIRST_NAME: "Jamie",
                    LAST_NAME: "Wilson",
                    EMAIL: "jamie@example.com",
                    PHONE: "+1-555-123-4567",
                    ORGANISATION_NAME: "Acme Widgets",
                    TITLE: "Procurement Manager",
                    LEAD_DESCRIPTION: "Interested in bulk orders"
                },
                expectedOutput: {
                    LEAD_ID: 34567892,
                    SALUTATION: null,
                    FIRST_NAME: "Jamie",
                    LAST_NAME: "Wilson",
                    TITLE: "Procurement Manager",
                    ORGANISATION_NAME: "Acme Widgets",
                    EMAIL: "jamie@example.com",
                    PHONE: "+1-555-123-4567",
                    MOBILE: null,
                    FAX: null,
                    WEBSITE: null,
                    ADDRESS_STREET: null,
                    ADDRESS_CITY: null,
                    ADDRESS_STATE: null,
                    ADDRESS_POSTCODE: null,
                    ADDRESS_COUNTRY: null,
                    LEAD_DESCRIPTION: "Interested in bulk orders",
                    LEAD_RATING: 0,
                    LEAD_SOURCE_ID: null,
                    LEAD_STATUS_ID: 222001,
                    OWNER_USER_ID: 987654,
                    RESPONSIBLE_USER_ID: 987654,
                    CONVERTED: false,
                    CONVERTED_DATE_UTC: null,
                    VISIBLE_TO: "EVERYONE",
                    TAGS: [],
                    CUSTOMFIELDS: [],
                    LINKS: [],
                    DATE_CREATED_UTC: "2024-01-18T12:00:00Z",
                    DATE_UPDATED_UTC: "2024-01-18T12:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_name",
                description: "Lead created without required name",
                input: {
                    EMAIL: "test@example.com"
                },
                expectedError: {
                    type: "validation",
                    message: "FIRST_NAME or LAST_NAME is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { FIRST_NAME: "Test", LAST_NAME: "Lead" },
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
        provider: "insightly",
        validCases: [
            {
                name: "update_lead_status",
                description: "Update lead status and rating",
                input: {
                    lead_id: 34567890,
                    LEAD_STATUS_ID: 222003,
                    LEAD_RATING: 5,
                    LEAD_DESCRIPTION: "Qualified lead. Ready for opportunity conversion."
                },
                expectedOutput: {
                    LEAD_ID: 34567890,
                    SALUTATION: "Mr.",
                    FIRST_NAME: "Alex",
                    LAST_NAME: "Johnson",
                    TITLE: "CEO",
                    ORGANISATION_NAME: "New Tech Startup",
                    EMAIL: "alex@newtechstartup.com",
                    PHONE: "+1-415-555-0101",
                    MOBILE: "+1-415-555-0102",
                    LEAD_DESCRIPTION: "Qualified lead. Ready for opportunity conversion.",
                    LEAD_RATING: 5,
                    LEAD_SOURCE_ID: 111001,
                    LEAD_STATUS_ID: 222003,
                    OWNER_USER_ID: 987654,
                    RESPONSIBLE_USER_ID: 987654,
                    CONVERTED: false,
                    VISIBLE_TO: "EVERYONE",
                    DATE_CREATED_UTC: "2024-01-15T10:00:00Z",
                    DATE_UPDATED_UTC: "2024-01-20T15:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "lead_not_found",
                description: "Lead does not exist",
                input: { lead_id: 99999999, LEAD_RATING: 5 },
                expectedError: {
                    type: "not_found",
                    message: "Lead not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { lead_id: 34567890, LEAD_RATING: 5 },
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
        provider: "insightly",
        validCases: [
            {
                name: "delete_existing_lead",
                description: "Delete an existing lead",
                input: { lead_id: 34567890 },
                expectedOutput: {
                    deleted: true,
                    id: 34567890
                }
            }
        ],
        errorCases: [
            {
                name: "lead_not_found",
                description: "Lead does not exist",
                input: { lead_id: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Lead not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { lead_id: 34567890 },
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
        provider: "insightly",
        validCases: [
            {
                name: "list_all_opportunities",
                description: "List all opportunities with default pagination",
                input: {},
                expectedOutput: {
                    opportunities: [
                        {
                            OPPORTUNITY_ID: 45678901,
                            OPPORTUNITY_NAME: "Acme Corp Enterprise License",
                            OPPORTUNITY_DETAILS: "Enterprise license for 500 seats",
                            PROBABILITY: 75,
                            BID_CURRENCY: "USD",
                            BID_AMOUNT: 75000,
                            BID_TYPE: "Fixed Bid",
                            BID_DURATION: null,
                            FORECAST_CLOSE_DATE: "2024-03-15T00:00:00Z",
                            ACTUAL_CLOSE_DATE: null,
                            CATEGORY_ID: 333001,
                            PIPELINE_ID: 444001,
                            STAGE_ID: 555003,
                            OPPORTUNITY_STATE: "Open",
                            ORGANISATION_ID: 23456789,
                            OWNER_USER_ID: 987654,
                            RESPONSIBLE_USER_ID: 987654,
                            VISIBLE_TO: "EVERYONE",
                            DATE_CREATED_UTC: "2024-01-06T09:00:00Z",
                            DATE_UPDATED_UTC: "2024-01-17T16:00:00Z"
                        },
                        {
                            OPPORTUNITY_ID: 45678902,
                            OPPORTUNITY_NAME: "TechCorp Annual Renewal",
                            OPPORTUNITY_DETAILS: "Annual subscription renewal with upsell",
                            PROBABILITY: 60,
                            BID_CURRENCY: "USD",
                            BID_AMOUNT: 25000,
                            BID_TYPE: "Fixed Bid",
                            BID_DURATION: null,
                            FORECAST_CLOSE_DATE: "2024-04-30T00:00:00Z",
                            ACTUAL_CLOSE_DATE: null,
                            CATEGORY_ID: 333002,
                            PIPELINE_ID: 444001,
                            STAGE_ID: 555002,
                            OPPORTUNITY_STATE: "Open",
                            ORGANISATION_ID: 23456790,
                            OWNER_USER_ID: 987655,
                            RESPONSIBLE_USER_ID: 987655,
                            VISIBLE_TO: "EVERYONE",
                            DATE_CREATED_UTC: "2024-01-04T11:00:00Z",
                            DATE_UPDATED_UTC: "2024-01-16T10:00:00Z"
                        }
                    ],
                    count: 2,
                    skip: 0,
                    top: 50
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
        provider: "insightly",
        validCases: [
            {
                name: "get_opportunity_by_id",
                description: "Get a specific opportunity by ID",
                input: { opportunity_id: 45678901 },
                expectedOutput: {
                    OPPORTUNITY_ID: 45678901,
                    OPPORTUNITY_NAME: "Acme Corp Enterprise License",
                    OPPORTUNITY_DETAILS:
                        "Enterprise license for 500 seats. Champion: Sarah Chen. Decision by end of Q1.",
                    PROBABILITY: 75,
                    BID_CURRENCY: "USD",
                    BID_AMOUNT: 75000,
                    BID_TYPE: "Fixed Bid",
                    BID_DURATION: null,
                    FORECAST_CLOSE_DATE: "2024-03-15T00:00:00Z",
                    ACTUAL_CLOSE_DATE: null,
                    CATEGORY_ID: 333001,
                    PIPELINE_ID: 444001,
                    STAGE_ID: 555003,
                    OPPORTUNITY_STATE: "Open",
                    ORGANISATION_ID: 23456789,
                    OWNER_USER_ID: 987654,
                    RESPONSIBLE_USER_ID: 987654,
                    VISIBLE_TO: "EVERYONE",
                    TAGS: [{ TAG_NAME: "enterprise" }, { TAG_NAME: "q1-target" }],
                    CUSTOMFIELDS: [],
                    LINKS: [],
                    DATE_CREATED_UTC: "2024-01-06T09:00:00Z",
                    DATE_UPDATED_UTC: "2024-01-17T16:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "opportunity_not_found",
                description: "Opportunity does not exist",
                input: { opportunity_id: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Opportunity not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { opportunity_id: 45678901 },
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
        provider: "insightly",
        validCases: [
            {
                name: "create_basic_opportunity",
                description: "Create an opportunity with basic information",
                input: {
                    OPPORTUNITY_NAME: "Globex Enterprise Deal",
                    BID_AMOUNT: 50000,
                    BID_CURRENCY: "USD",
                    PIPELINE_ID: 444001,
                    STAGE_ID: 555001,
                    FORECAST_CLOSE_DATE: "2024-06-30T00:00:00Z",
                    PROBABILITY: 25
                },
                expectedOutput: {
                    OPPORTUNITY_ID: 45678903,
                    OPPORTUNITY_NAME: "Globex Enterprise Deal",
                    OPPORTUNITY_DETAILS: null,
                    PROBABILITY: 25,
                    BID_CURRENCY: "USD",
                    BID_AMOUNT: 50000,
                    BID_TYPE: "Fixed Bid",
                    BID_DURATION: null,
                    FORECAST_CLOSE_DATE: "2024-06-30T00:00:00Z",
                    ACTUAL_CLOSE_DATE: null,
                    CATEGORY_ID: null,
                    PIPELINE_ID: 444001,
                    STAGE_ID: 555001,
                    OPPORTUNITY_STATE: "Open",
                    ORGANISATION_ID: null,
                    OWNER_USER_ID: 987654,
                    RESPONSIBLE_USER_ID: 987654,
                    VISIBLE_TO: "EVERYONE",
                    TAGS: [],
                    CUSTOMFIELDS: [],
                    LINKS: [],
                    DATE_CREATED_UTC: "2024-01-18T13:00:00Z",
                    DATE_UPDATED_UTC: "2024-01-18T13:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_name",
                description: "Opportunity created without required name",
                input: {
                    BID_AMOUNT: 10000,
                    PIPELINE_ID: 444001
                },
                expectedError: {
                    type: "validation",
                    message: "OPPORTUNITY_NAME is required",
                    retryable: false
                }
            },
            {
                name: "invalid_pipeline",
                description: "Invalid pipeline ID",
                input: {
                    OPPORTUNITY_NAME: "Test Opportunity",
                    PIPELINE_ID: 999999
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid pipeline ID",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { OPPORTUNITY_NAME: "Test Opportunity" },
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
        provider: "insightly",
        validCases: [
            {
                name: "update_opportunity_stage",
                description: "Move opportunity to next stage",
                input: {
                    opportunity_id: 45678901,
                    STAGE_ID: 555004,
                    PROBABILITY: 90,
                    OPPORTUNITY_DETAILS: "Contract review in progress. Legal approval pending."
                },
                expectedOutput: {
                    OPPORTUNITY_ID: 45678901,
                    OPPORTUNITY_NAME: "Acme Corp Enterprise License",
                    OPPORTUNITY_DETAILS: "Contract review in progress. Legal approval pending.",
                    PROBABILITY: 90,
                    BID_CURRENCY: "USD",
                    BID_AMOUNT: 75000,
                    BID_TYPE: "Fixed Bid",
                    BID_DURATION: null,
                    FORECAST_CLOSE_DATE: "2024-03-15T00:00:00Z",
                    ACTUAL_CLOSE_DATE: null,
                    CATEGORY_ID: 333001,
                    PIPELINE_ID: 444001,
                    STAGE_ID: 555004,
                    OPPORTUNITY_STATE: "Open",
                    ORGANISATION_ID: 23456789,
                    OWNER_USER_ID: 987654,
                    RESPONSIBLE_USER_ID: 987654,
                    VISIBLE_TO: "EVERYONE",
                    DATE_CREATED_UTC: "2024-01-06T09:00:00Z",
                    DATE_UPDATED_UTC: "2024-01-20T17:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "opportunity_not_found",
                description: "Opportunity does not exist",
                input: { opportunity_id: 99999999, PROBABILITY: 80 },
                expectedError: {
                    type: "not_found",
                    message: "Opportunity not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { opportunity_id: 45678901, PROBABILITY: 80 },
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
        provider: "insightly",
        validCases: [
            {
                name: "delete_existing_opportunity",
                description: "Delete an existing opportunity",
                input: { opportunity_id: 45678901 },
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
                input: { opportunity_id: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Opportunity not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { opportunity_id: 45678901 },
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
        provider: "insightly",
        validCases: [
            {
                name: "list_all_tasks",
                description: "List all tasks with default pagination",
                input: {},
                expectedOutput: {
                    tasks: [
                        {
                            TASK_ID: 56789012,
                            TITLE: "Follow up with Sarah Chen",
                            CATEGORY_ID: 666001,
                            DUE_DATE: "2024-01-20T00:00:00Z",
                            COMPLETED_DATE_UTC: null,
                            COMPLETED: false,
                            DETAILS: "Send updated proposal with revised pricing",
                            STATUS: "NOT STARTED",
                            PRIORITY: 1,
                            PERCENT_COMPLETE: 0,
                            START_DATE: "2024-01-17T00:00:00Z",
                            ASSIGNED_BY_USER_ID: 987654,
                            OWNER_USER_ID: 987654,
                            RESPONSIBLE_USER_ID: 987654,
                            PARENT_TASK_ID: null,
                            RECURRENCE: null,
                            VISIBLE_TO: "EVERYONE",
                            DATE_CREATED_UTC: "2024-01-16T10:00:00Z",
                            DATE_UPDATED_UTC: "2024-01-17T14:00:00Z"
                        },
                        {
                            TASK_ID: 56789013,
                            TITLE: "Schedule demo with TechCorp team",
                            CATEGORY_ID: 666002,
                            DUE_DATE: "2024-01-22T00:00:00Z",
                            COMPLETED_DATE_UTC: null,
                            COMPLETED: false,
                            DETAILS: "Product demo for technical evaluation",
                            STATUS: "IN PROGRESS",
                            PRIORITY: 2,
                            PERCENT_COMPLETE: 25,
                            START_DATE: "2024-01-15T00:00:00Z",
                            ASSIGNED_BY_USER_ID: 987655,
                            OWNER_USER_ID: 987655,
                            RESPONSIBLE_USER_ID: 987655,
                            PARENT_TASK_ID: null,
                            RECURRENCE: null,
                            VISIBLE_TO: "EVERYONE",
                            DATE_CREATED_UTC: "2024-01-14T08:00:00Z",
                            DATE_UPDATED_UTC: "2024-01-16T12:00:00Z"
                        }
                    ],
                    count: 2,
                    skip: 0,
                    top: 50
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
        provider: "insightly",
        validCases: [
            {
                name: "get_task_by_id",
                description: "Get a specific task by ID",
                input: { task_id: 56789012 },
                expectedOutput: {
                    TASK_ID: 56789012,
                    TITLE: "Follow up with Sarah Chen",
                    CATEGORY_ID: 666001,
                    DUE_DATE: "2024-01-20T00:00:00Z",
                    COMPLETED_DATE_UTC: null,
                    COMPLETED: false,
                    DETAILS:
                        "Send updated proposal with revised pricing. Include volume discounts.",
                    STATUS: "NOT STARTED",
                    PRIORITY: 1,
                    PERCENT_COMPLETE: 0,
                    START_DATE: "2024-01-17T00:00:00Z",
                    ASSIGNED_BY_USER_ID: 987654,
                    OWNER_USER_ID: 987654,
                    RESPONSIBLE_USER_ID: 987654,
                    PARENT_TASK_ID: null,
                    RECURRENCE: null,
                    VISIBLE_TO: "EVERYONE",
                    TAGS: [{ TAG_NAME: "follow-up" }],
                    CUSTOMFIELDS: [],
                    LINKS: [],
                    DATE_CREATED_UTC: "2024-01-16T10:00:00Z",
                    DATE_UPDATED_UTC: "2024-01-17T14:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "task_not_found",
                description: "Task does not exist",
                input: { task_id: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { task_id: 56789012 },
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
        provider: "insightly",
        validCases: [
            {
                name: "create_basic_task",
                description: "Create a task with basic information",
                input: {
                    TITLE: "Prepare Q1 contract",
                    DUE_DATE: "2024-01-25T00:00:00Z",
                    PRIORITY: 1,
                    DETAILS: "Finalize contract terms with legal",
                    CATEGORY_ID: 666001
                },
                expectedOutput: {
                    TASK_ID: 56789014,
                    TITLE: "Prepare Q1 contract",
                    CATEGORY_ID: 666001,
                    DUE_DATE: "2024-01-25T00:00:00Z",
                    COMPLETED_DATE_UTC: null,
                    COMPLETED: false,
                    DETAILS: "Finalize contract terms with legal",
                    STATUS: "NOT STARTED",
                    PRIORITY: 1,
                    PERCENT_COMPLETE: 0,
                    START_DATE: null,
                    ASSIGNED_BY_USER_ID: 987654,
                    OWNER_USER_ID: 987654,
                    RESPONSIBLE_USER_ID: 987654,
                    PARENT_TASK_ID: null,
                    RECURRENCE: null,
                    VISIBLE_TO: "EVERYONE",
                    TAGS: [],
                    CUSTOMFIELDS: [],
                    LINKS: [],
                    DATE_CREATED_UTC: "2024-01-18T14:00:00Z",
                    DATE_UPDATED_UTC: "2024-01-18T14:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_title",
                description: "Task created without required title",
                input: {
                    DUE_DATE: "2024-01-25T00:00:00Z",
                    PRIORITY: 1
                },
                expectedError: {
                    type: "validation",
                    message: "TITLE is required",
                    retryable: false
                }
            },
            {
                name: "invalid_category",
                description: "Task with invalid category ID",
                input: {
                    TITLE: "Test Task",
                    CATEGORY_ID: 999999
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid category ID",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { TITLE: "Test Task" },
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
        provider: "insightly",
        validCases: [
            {
                name: "mark_task_completed",
                description: "Mark a task as completed",
                input: {
                    task_id: 56789012,
                    COMPLETED: true,
                    STATUS: "COMPLETED",
                    PERCENT_COMPLETE: 100
                },
                expectedOutput: {
                    TASK_ID: 56789012,
                    TITLE: "Follow up with Sarah Chen",
                    CATEGORY_ID: 666001,
                    DUE_DATE: "2024-01-20T00:00:00Z",
                    COMPLETED_DATE_UTC: "2024-01-20T16:00:00Z",
                    COMPLETED: true,
                    DETAILS:
                        "Send updated proposal with revised pricing. Include volume discounts.",
                    STATUS: "COMPLETED",
                    PRIORITY: 1,
                    PERCENT_COMPLETE: 100,
                    START_DATE: "2024-01-17T00:00:00Z",
                    ASSIGNED_BY_USER_ID: 987654,
                    OWNER_USER_ID: 987654,
                    RESPONSIBLE_USER_ID: 987654,
                    PARENT_TASK_ID: null,
                    RECURRENCE: null,
                    VISIBLE_TO: "EVERYONE",
                    DATE_CREATED_UTC: "2024-01-16T10:00:00Z",
                    DATE_UPDATED_UTC: "2024-01-20T16:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "task_not_found",
                description: "Task does not exist",
                input: { task_id: 99999999, COMPLETED: true },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { task_id: 56789012, COMPLETED: true },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteTask",
        provider: "insightly",
        validCases: [
            {
                name: "delete_existing_task",
                description: "Delete an existing task",
                input: { task_id: 56789012 },
                expectedOutput: {
                    deleted: true,
                    id: 56789012
                }
            }
        ],
        errorCases: [
            {
                name: "task_not_found",
                description: "Task does not exist",
                input: { task_id: 99999999 },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { task_id: 56789012 },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    }
];
