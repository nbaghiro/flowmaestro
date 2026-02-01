/**
 * HubSpot Provider Test Fixtures
 *
 * Based on official HubSpot API documentation:
 * - Create Contact: https://developers.hubspot.com/docs/api/crm/contacts
 * - Get Contact: https://developers.hubspot.com/docs/api/crm/contacts
 * - Create Deal: https://developers.hubspot.com/docs/api/crm/deals
 * - List Companies: https://developers.hubspot.com/docs/api/crm/companies
 */

import type { TestFixture } from "../../../sandbox";

export const hubspotFixtures: TestFixture[] = [
    {
        operationId: "createContact",
        provider: "hubspot",
        validCases: [
            {
                name: "simple_contact",
                description: "Create a simple contact with basic info",
                input: {
                    email: "john.doe@example.com",
                    firstname: "John",
                    lastname: "Doe"
                },
                expectedOutput: {
                    id: "123456",
                    properties: {
                        email: "john.doe@example.com",
                        firstname: "John",
                        lastname: "Doe",
                        hs_object_id: "123456",
                        createdate: "{{iso}}",
                        lastmodifieddate: "{{iso}}",
                        hs_all_contact_vids: "123456",
                        hs_email_domain: "example.com",
                        hs_is_contact: "true",
                        hs_is_unworked: "true",
                        hs_lifecyclestage_lead_date: "{{iso}}",
                        hs_marketable_status: "false",
                        hs_marketable_until_renewal: "false",
                        hs_membership_has_accessed_private_content: "0",
                        hs_object_source: "INTEGRATION",
                        hs_object_source_id: "integration-id",
                        hs_object_source_label: "INTEGRATION",
                        hs_pipeline: "contacts-lifecycle-pipeline",
                        lifecyclestage: "lead"
                    },
                    createdAt: "{{iso}}",
                    updatedAt: "{{iso}}",
                    archived: false
                }
            },
            {
                name: "contact_with_company",
                description: "Create a contact with company association",
                input: {
                    email: "jane.smith@acme.com",
                    firstname: "Jane",
                    lastname: "Smith",
                    company: "Acme Corp",
                    phone: "+1-555-0123"
                },
                expectedOutput: {
                    id: "123457",
                    properties: {
                        email: "jane.smith@acme.com",
                        firstname: "Jane",
                        lastname: "Smith",
                        company: "Acme Corp",
                        phone: "+1-555-0123",
                        hs_object_id: "123457",
                        createdate: "{{iso}}",
                        lastmodifieddate: "{{iso}}",
                        hs_all_contact_vids: "123457",
                        hs_email_domain: "acme.com",
                        hs_is_contact: "true",
                        hs_is_unworked: "true",
                        hs_lifecyclestage_lead_date: "{{iso}}",
                        hs_marketable_status: "false",
                        hs_marketable_until_renewal: "false",
                        hs_membership_has_accessed_private_content: "0",
                        hs_object_source: "INTEGRATION",
                        hs_object_source_id: "integration-id",
                        hs_object_source_label: "INTEGRATION",
                        hs_pipeline: "contacts-lifecycle-pipeline",
                        lifecyclestage: "lead"
                    },
                    createdAt: "{{iso}}",
                    updatedAt: "{{iso}}",
                    archived: false
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_email",
                description: "Contact with email already exists",
                input: {
                    email: "existing@example.com",
                    firstname: "Duplicate",
                    lastname: "Contact"
                },
                expectedError: {
                    type: "validation",
                    message: "Contact already exists. Existing ID: 123456",
                    retryable: false
                }
            },
            {
                name: "invalid_email",
                description: "Invalid email format",
                input: {
                    email: "not-an-email",
                    firstname: "Invalid",
                    lastname: "Email"
                },
                expectedError: {
                    type: "validation",
                    message:
                        'Property values were not valid: [{"isValid":false,"message":"Email address not-an-email is invalid","error":"INVALID_EMAIL","name":"email"}]',
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "No permission to create contacts",
                input: {
                    email: "test@example.com",
                    firstname: "No",
                    lastname: "Permission"
                },
                expectedError: {
                    type: "permission",
                    message:
                        "The access token does not have the proper permissions to access this object",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    email: "test@example.com",
                    firstname: "Rate",
                    lastname: "Limited"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "You have reached your secondly limit",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getContact",
        provider: "hubspot",
        validCases: [
            {
                name: "get_contact_by_id",
                description: "Get a contact by its ID",
                input: {
                    contactId: "123456"
                },
                expectedOutput: {
                    id: "123456",
                    properties: {
                        email: "john.doe@example.com",
                        firstname: "John",
                        lastname: "Doe",
                        hs_object_id: "123456",
                        createdate: "2024-01-15T10:00:00.000Z",
                        lastmodifieddate: "2024-01-20T15:30:00.000Z",
                        hs_all_contact_vids: "123456",
                        hs_email_domain: "example.com",
                        hs_is_contact: "true",
                        hs_is_unworked: "false",
                        hs_lifecyclestage_lead_date: "2024-01-15T10:00:00.000Z",
                        hs_marketable_status: "false",
                        hs_marketable_until_renewal: "false",
                        hs_membership_has_accessed_private_content: "0",
                        hs_object_source: "INTEGRATION",
                        hs_object_source_id: "integration-id",
                        hs_object_source_label: "INTEGRATION",
                        hs_pipeline: "contacts-lifecycle-pipeline",
                        lifecyclestage: "lead"
                    },
                    createdAt: "2024-01-15T10:00:00.000Z",
                    updatedAt: "2024-01-20T15:30:00.000Z",
                    archived: false
                }
            }
        ],
        errorCases: [
            {
                name: "contact_not_found",
                description: "Contact does not exist",
                input: {
                    contactId: "nonexistent-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "resource not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createDeal",
        provider: "hubspot",
        validCases: [
            {
                name: "simple_deal",
                description: "Create a simple deal",
                input: {
                    dealname: "New Enterprise Deal",
                    amount: "50000",
                    dealstage: "appointmentscheduled",
                    pipeline: "default"
                },
                expectedOutput: {
                    id: "789012",
                    properties: {
                        dealname: "New Enterprise Deal",
                        amount: "50000",
                        dealstage: "appointmentscheduled",
                        pipeline: "default",
                        hs_object_id: "789012",
                        createdate: "{{iso}}",
                        hs_lastmodifieddate: "{{iso}}",
                        hs_deal_stage_probability: "0.20",
                        hs_is_closed: "false",
                        hs_is_closed_won: "false",
                        hs_is_deal_split: "false",
                        hs_object_source: "INTEGRATION",
                        hs_object_source_id: "integration-id",
                        hs_object_source_label: "INTEGRATION",
                        hs_projected_amount: "10000",
                        hs_projected_amount_in_home_currency: "10000"
                    },
                    createdAt: "{{iso}}",
                    updatedAt: "{{iso}}",
                    archived: false
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_stage",
                description: "Invalid deal stage",
                input: {
                    dealname: "Test Deal",
                    amount: "10000",
                    dealstage: "invalid-stage",
                    pipeline: "default"
                },
                expectedError: {
                    type: "validation",
                    message:
                        'Property values were not valid: [{"isValid":false,"message":"invalid-stage is not a valid option for dealstage","error":"INVALID_OPTION","name":"dealstage"}]',
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listCompanies",
        provider: "hubspot",
        validCases: [
            {
                name: "list_all_companies",
                description: "List all companies",
                input: {
                    limit: 10
                },
                expectedOutput: {
                    results: [
                        {
                            id: "456789",
                            properties: {
                                name: "Acme Corporation",
                                domain: "acme.com",
                                hs_object_id: "456789",
                                createdate: "2024-01-10T09:00:00.000Z",
                                hs_lastmodifieddate: "2024-01-18T14:00:00.000Z",
                                city: "San Francisco",
                                state: "California",
                                country: "United States",
                                industry: "Technology",
                                numberofemployees: "500",
                                annualrevenue: "10000000",
                                hs_num_blockers: "0",
                                hs_num_child_companies: "0",
                                hs_num_contacts_with_buying_roles: "0",
                                hs_num_decision_makers: "0",
                                hs_num_open_deals: "2",
                                hs_object_source: "INTEGRATION",
                                hs_object_source_id: "integration-id",
                                hs_object_source_label: "INTEGRATION",
                                lifecyclestage: "opportunity"
                            },
                            createdAt: "2024-01-10T09:00:00.000Z",
                            updatedAt: "2024-01-18T14:00:00.000Z",
                            archived: false
                        },
                        {
                            id: "456790",
                            properties: {
                                name: "Globex Inc",
                                domain: "globex.com",
                                hs_object_id: "456790",
                                createdate: "2024-01-12T11:00:00.000Z",
                                hs_lastmodifieddate: "2024-01-19T16:00:00.000Z",
                                city: "New York",
                                state: "New York",
                                country: "United States",
                                industry: "Finance",
                                numberofemployees: "1000",
                                annualrevenue: "50000000",
                                hs_num_blockers: "0",
                                hs_num_child_companies: "0",
                                hs_num_contacts_with_buying_roles: "0",
                                hs_num_decision_makers: "0",
                                hs_num_open_deals: "1",
                                hs_object_source: "INTEGRATION",
                                hs_object_source_id: "integration-id",
                                hs_object_source_label: "INTEGRATION",
                                lifecyclestage: "customer"
                            },
                            createdAt: "2024-01-12T11:00:00.000Z",
                            updatedAt: "2024-01-19T16:00:00.000Z",
                            archived: false
                        }
                    ],
                    paging: {
                        next: {
                            after: "456790",
                            link: "https://api.hubapi.com/crm/v3/objects/companies?after=456790"
                        }
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "permission_denied",
                description: "Insufficient permissions to list companies",
                input: {
                    limit: 10
                },
                expectedError: {
                    type: "permission",
                    message:
                        "The access token does not have the proper permissions to access this object",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    limit: 100
                },
                expectedError: {
                    type: "rate_limit",
                    message: "You have reached your secondly limit",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "searchContacts",
        provider: "hubspot",
        // Filterable data for dynamic HubSpot filtering
        filterableData: {
            recordsField: "results",
            defaultPageSize: 100,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                type: "hubspot"
            },
            // Base dataset of contacts to filter
            records: [
                {
                    id: "123456",
                    properties: {
                        email: "john@acme.com",
                        firstname: "John",
                        lastname: "Smith",
                        company: "Acme Corp",
                        hs_object_id: "123456",
                        createdate: "2024-01-15T10:00:00.000Z",
                        lastmodifieddate: "2024-01-20T15:30:00.000Z"
                    },
                    createdAt: "2024-01-15T10:00:00.000Z",
                    updatedAt: "2024-01-20T15:30:00.000Z",
                    archived: false
                },
                {
                    id: "123457",
                    properties: {
                        email: "jane@acme.com",
                        firstname: "Jane",
                        lastname: "Doe",
                        company: "Acme Corp",
                        hs_object_id: "123457",
                        createdate: "2024-01-16T09:00:00.000Z",
                        lastmodifieddate: "2024-01-19T12:00:00.000Z"
                    },
                    createdAt: "2024-01-16T09:00:00.000Z",
                    updatedAt: "2024-01-19T12:00:00.000Z",
                    archived: false
                },
                {
                    id: "123458",
                    properties: {
                        email: "bob@globex.com",
                        firstname: "Bob",
                        lastname: "Wilson",
                        company: "Globex Inc",
                        hs_object_id: "123458",
                        createdate: "2024-01-17T08:00:00.000Z",
                        lastmodifieddate: "2024-01-21T10:00:00.000Z"
                    },
                    createdAt: "2024-01-17T08:00:00.000Z",
                    updatedAt: "2024-01-21T10:00:00.000Z",
                    archived: false
                },
                {
                    id: "123459",
                    properties: {
                        email: "alice@techcorp.com",
                        firstname: "Alice",
                        lastname: "Johnson",
                        company: "TechCorp",
                        hs_object_id: "123459",
                        createdate: "2024-01-18T14:00:00.000Z",
                        lastmodifieddate: "2024-01-22T16:00:00.000Z"
                    },
                    createdAt: "2024-01-18T14:00:00.000Z",
                    updatedAt: "2024-01-22T16:00:00.000Z",
                    archived: false
                }
            ]
        },
        validCases: [
            {
                name: "search_by_email",
                description: "Search contacts by email domain",
                input: {
                    filterGroups: [
                        {
                            filters: [
                                {
                                    propertyName: "email",
                                    operator: "CONTAINS_TOKEN",
                                    value: "@acme.com"
                                }
                            ]
                        }
                    ]
                },
                // Note: With filterableData, actual results are dynamically filtered
                expectedOutput: {
                    total: 2,
                    results: [
                        {
                            id: "123456",
                            properties: {
                                email: "john@acme.com",
                                firstname: "John",
                                lastname: "Smith",
                                hs_object_id: "123456",
                                createdate: "2024-01-15T10:00:00.000Z",
                                lastmodifieddate: "2024-01-20T15:30:00.000Z"
                            },
                            createdAt: "2024-01-15T10:00:00.000Z",
                            updatedAt: "2024-01-20T15:30:00.000Z",
                            archived: false
                        },
                        {
                            id: "123457",
                            properties: {
                                email: "jane@acme.com",
                                firstname: "Jane",
                                lastname: "Doe",
                                hs_object_id: "123457",
                                createdate: "2024-01-16T09:00:00.000Z",
                                lastmodifieddate: "2024-01-19T12:00:00.000Z"
                            },
                            createdAt: "2024-01-16T09:00:00.000Z",
                            updatedAt: "2024-01-19T12:00:00.000Z",
                            archived: false
                        }
                    ]
                }
            },
            {
                name: "search_by_company",
                description: "Search contacts by company name",
                input: {
                    filterGroups: [
                        {
                            filters: [
                                {
                                    propertyName: "company",
                                    operator: "EQ",
                                    value: "Globex Inc"
                                }
                            ]
                        }
                    ]
                },
                expectedOutput: {
                    results: [
                        {
                            id: "123458",
                            properties: {
                                email: "bob@globex.com",
                                firstname: "Bob",
                                lastname: "Wilson"
                            }
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_filter",
                description: "Invalid filter property",
                input: {
                    filterGroups: [
                        {
                            filters: [
                                {
                                    propertyName: "invalid_property",
                                    operator: "EQ",
                                    value: "test"
                                }
                            ]
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "Property 'invalid_property' does not exist on the contact object",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    filterGroups: []
                },
                expectedError: {
                    type: "rate_limit",
                    message: "You have reached your secondly limit",
                    retryable: true
                }
            }
        ]
    }
];
