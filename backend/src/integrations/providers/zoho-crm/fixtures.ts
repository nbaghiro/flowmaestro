/**
 * Zoho CRM Provider Test Fixtures
 *
 * Based on official Zoho CRM API V8 documentation:
 * https://www.zoho.com/crm/developer/docs/api/v8/
 */

import type { TestFixture } from "../../sandbox";

export const zohoCrmFixtures: TestFixture[] = [
    {
        operationId: "createLead",
        provider: "zoho-crm",
        validCases: [
            {
                name: "simple_lead",
                description: "Create a simple lead with basic info",
                input: {
                    Last_Name: "Doe",
                    First_Name: "John",
                    Email: "john.doe@example.com",
                    Company: "Acme Corp"
                },
                expectedOutput: {
                    id: "5768430000000123456",
                    Last_Name: "Doe",
                    First_Name: "John",
                    Email: "john.doe@example.com",
                    Company: "Acme Corp",
                    Created_Time: "{{iso}}",
                    Modified_Time: "{{iso}}"
                }
            },
            {
                name: "lead_with_address",
                description: "Create a lead with full address",
                input: {
                    Last_Name: "Smith",
                    First_Name: "Jane",
                    Email: "jane.smith@techcorp.com",
                    Company: "TechCorp Inc",
                    Street: "123 Main St",
                    City: "San Francisco",
                    State: "California",
                    Zip_Code: "94102",
                    Country: "United States"
                },
                expectedOutput: {
                    id: "5768430000000123457",
                    Last_Name: "Smith",
                    First_Name: "Jane",
                    Email: "jane.smith@techcorp.com",
                    Company: "TechCorp Inc",
                    Street: "123 Main St",
                    City: "San Francisco",
                    State: "California",
                    Zip_Code: "94102",
                    Country: "United States",
                    Created_Time: "{{iso}}",
                    Modified_Time: "{{iso}}"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_last_name",
                description: "Lead without required Last_Name field",
                input: {
                    First_Name: "John",
                    Email: "john@example.com"
                },
                expectedError: {
                    type: "validation",
                    message: "Last name is required",
                    retryable: false
                }
            },
            {
                name: "duplicate_email",
                description: "Lead with duplicate email",
                input: {
                    Last_Name: "Duplicate",
                    Email: "existing@example.com"
                },
                expectedError: {
                    type: "validation",
                    message: "duplicate data",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    Last_Name: "Rate",
                    Email: "rate@example.com"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "API call limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getLead",
        provider: "zoho-crm",
        validCases: [
            {
                name: "get_lead_by_id",
                description: "Get a lead by its ID",
                input: {
                    id: "5768430000000123456"
                },
                expectedOutput: {
                    id: "5768430000000123456",
                    Last_Name: "Doe",
                    First_Name: "John",
                    Email: "john.doe@example.com",
                    Company: "Acme Corp",
                    Lead_Status: "Not Contacted",
                    Created_Time: "2024-01-15T10:00:00.000Z",
                    Modified_Time: "2024-01-20T15:30:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "lead_not_found",
                description: "Lead does not exist",
                input: {
                    id: "nonexistent-id"
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
        operationId: "createContact",
        provider: "zoho-crm",
        validCases: [
            {
                name: "simple_contact",
                description: "Create a simple contact",
                input: {
                    Last_Name: "Wilson",
                    First_Name: "Bob",
                    Email: "bob.wilson@example.com"
                },
                expectedOutput: {
                    id: "5768430000000234567",
                    Last_Name: "Wilson",
                    First_Name: "Bob",
                    Email: "bob.wilson@example.com",
                    Created_Time: "{{iso}}",
                    Modified_Time: "{{iso}}"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_email",
                description: "Contact with invalid email format",
                input: {
                    Last_Name: "Invalid",
                    Email: "not-an-email"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email format",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createDeal",
        provider: "zoho-crm",
        validCases: [
            {
                name: "simple_deal",
                description: "Create a simple deal",
                input: {
                    Deal_Name: "Enterprise Software License",
                    Stage: "Qualification",
                    Amount: 50000
                },
                expectedOutput: {
                    id: "5768430000000345678",
                    Deal_Name: "Enterprise Software License",
                    Stage: "Qualification",
                    Amount: 50000,
                    Created_Time: "{{iso}}",
                    Modified_Time: "{{iso}}"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_stage",
                description: "Deal with invalid stage",
                input: {
                    Deal_Name: "Test Deal",
                    Stage: "invalid-stage"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid stage value",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listLeads",
        provider: "zoho-crm",
        validCases: [
            {
                name: "list_all_leads",
                description: "List all leads with pagination",
                input: {
                    page: 1,
                    per_page: 10
                },
                expectedOutput: {
                    data: [
                        {
                            id: "5768430000000123456",
                            Last_Name: "Doe",
                            First_Name: "John",
                            Email: "john.doe@example.com",
                            Company: "Acme Corp"
                        },
                        {
                            id: "5768430000000123457",
                            Last_Name: "Smith",
                            First_Name: "Jane",
                            Email: "jane.smith@techcorp.com",
                            Company: "TechCorp Inc"
                        }
                    ],
                    info: {
                        per_page: 10,
                        count: 2,
                        page: 1,
                        more_records: true
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "permission_denied",
                description: "Insufficient permissions to list leads",
                input: {
                    page: 1,
                    per_page: 10
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to access this module",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "convertLead",
        provider: "zoho-crm",
        validCases: [
            {
                name: "convert_lead_to_contact_account",
                description: "Convert lead to contact and account",
                input: {
                    id: "5768430000000123456",
                    overwrite: false,
                    notify_lead_owner: true
                },
                expectedOutput: {
                    converted: true,
                    leadId: "5768430000000123456",
                    contactId: "5768430000000456789",
                    accountId: "5768430000000567890",
                    dealId: undefined
                }
            },
            {
                name: "convert_lead_with_deal",
                description: "Convert lead to contact, account, and deal",
                input: {
                    id: "5768430000000123457",
                    overwrite: false,
                    Deal: {
                        Deal_Name: "New Enterprise Deal",
                        Amount: 100000,
                        Stage: "Qualification"
                    }
                },
                expectedOutput: {
                    converted: true,
                    leadId: "5768430000000123457",
                    contactId: "5768430000000456790",
                    accountId: "5768430000000567891",
                    dealId: "5768430000000678901"
                }
            }
        ],
        errorCases: [
            {
                name: "already_converted",
                description: "Lead has already been converted",
                input: {
                    id: "5768430000000123458"
                },
                expectedError: {
                    type: "validation",
                    message: "Lead has already been converted",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "queryRecords",
        provider: "zoho-crm",
        validCases: [
            {
                name: "simple_coql_query",
                description: "Execute a simple COQL query",
                input: {
                    select_query:
                        "SELECT First_Name, Last_Name, Email FROM Contacts WHERE Email like '%@example.com' LIMIT 10"
                },
                expectedOutput: {
                    data: [
                        {
                            id: "5768430000000234567",
                            First_Name: "Bob",
                            Last_Name: "Wilson",
                            Email: "bob.wilson@example.com"
                        }
                    ],
                    info: {
                        count: 1,
                        more_records: false
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_query_syntax",
                description: "COQL query with invalid syntax",
                input: {
                    select_query: "INVALID QUERY SYNTAX"
                },
                expectedError: {
                    type: "validation",
                    message: "Query must start with SELECT",
                    retryable: false
                }
            }
        ]
    }
];
