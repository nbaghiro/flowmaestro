/**
 * Salesforce Provider Test Fixtures
 *
 * Comprehensive test fixtures for Salesforce CRM operations including
 * accounts, contacts, leads, opportunities, and custom objects.
 */

import type { TestFixture } from "../../sandbox";

export const salesforceFixtures: TestFixture[] = [
    // ========================================
    // CREATE RECORD OPERATION
    // ========================================
    {
        operationId: "createRecord",
        provider: "salesforce",
        validCases: [
            {
                name: "create_account",
                description: "Create a new Account record with full company details",
                input: {
                    objectType: "Account",
                    data: {
                        Name: "Acme Corporation",
                        Industry: "Technology",
                        Type: "Customer - Direct",
                        Website: "https://www.acmecorp.com",
                        Phone: "(415) 555-1234",
                        BillingStreet: "123 Market Street",
                        BillingCity: "San Francisco",
                        BillingState: "CA",
                        BillingPostalCode: "94105",
                        BillingCountry: "United States",
                        NumberOfEmployees: 500,
                        AnnualRevenue: 50000000,
                        Description: "Leading provider of enterprise software solutions"
                    }
                },
                expectedOutput: {
                    id: "001Hn00001ABCDEFGH",
                    success: true
                }
            }
        ],
        errorCases: [
            {
                name: "missing_required_field",
                description: "Create Account without required Name field",
                input: {
                    objectType: "Account",
                    data: {
                        Industry: "Technology",
                        Website: "https://www.example.com"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "REQUIRED_FIELD_MISSING: Required fields are missing: [Name]",
                    retryable: false
                }
            },
            {
                name: "invalid_reference",
                description: "Create Contact with invalid AccountId reference",
                input: {
                    objectType: "Contact",
                    data: {
                        FirstName: "John",
                        LastName: "Doe",
                        AccountId: "001000000INVALID00"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "INVALID_CROSS_REFERENCE_KEY: invalid cross reference id",
                    retryable: false
                }
            },
            {
                name: "invalid_picklist_value",
                description: "Create Lead with invalid Status picklist value",
                input: {
                    objectType: "Lead",
                    data: {
                        FirstName: "Test",
                        LastName: "Lead",
                        Company: "Test Co",
                        Status: "InvalidStatus"
                    }
                },
                expectedError: {
                    type: "validation",
                    message:
                        "INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST: bad value for restricted picklist field: Status",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded during record creation",
                input: {
                    objectType: "Account",
                    data: {
                        Name: "Rate Limit Test Company"
                    }
                },
                expectedError: {
                    type: "rate_limit",
                    message: "REQUEST_LIMIT_EXCEEDED: TotalRequests Limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ========================================
    // DELETE RECORD OPERATION
    // ========================================
    {
        operationId: "deleteRecord",
        provider: "salesforce",
        validCases: [
            {
                name: "delete_account",
                description: "Delete an Account record (moves to Recycle Bin)",
                input: {
                    objectType: "Account",
                    recordId: "001Hn00001DELETEABC"
                },
                expectedOutput: {
                    id: "001Hn00001DELETEABC",
                    deleted: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Delete record that does not exist",
                input: {
                    objectType: "Account",
                    recordId: "001Hn00001NOTFOUND0"
                },
                expectedError: {
                    type: "not_found",
                    message: "Record 001Hn00001NOTFOUND0 not found in Account",
                    retryable: false
                }
            },
            {
                name: "insufficient_access",
                description: "Delete record without permission",
                input: {
                    objectType: "Account",
                    recordId: "001Hn00001NOACCESS0"
                },
                expectedError: {
                    type: "permission",
                    message: "INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY",
                    retryable: false
                }
            },
            {
                name: "delete_locked_record",
                description: "Delete a record that is locked by approval process",
                input: {
                    objectType: "Opportunity",
                    recordId: "006Hn00001LOCKEDOPP"
                },
                expectedError: {
                    type: "permission",
                    message: "ENTITY_IS_LOCKED: This record is locked by an approval process",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded during deletion",
                input: {
                    objectType: "Contact",
                    recordId: "003Hn00001RATELIMIT"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "REQUEST_LIMIT_EXCEEDED: TotalRequests Limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ========================================
    // DESCRIBE OBJECT OPERATION
    // ========================================
    {
        operationId: "describeObject",
        provider: "salesforce",
        validCases: [
            {
                name: "describe_account",
                description: "Get metadata for Account object",
                input: {
                    objectType: "Account"
                },
                expectedOutput: {
                    name: "Account",
                    label: "Account",
                    labelPlural: "Accounts",
                    keyPrefix: "001",
                    queryable: true,
                    createable: true,
                    updateable: true,
                    deletable: true,
                    searchable: true,
                    fields: [
                        {
                            name: "Id",
                            label: "Account ID",
                            type: "id",
                            length: 18,
                            nillable: false,
                            createable: false,
                            updateable: false,
                            unique: true
                        },
                        {
                            name: "Name",
                            label: "Account Name",
                            type: "string",
                            length: 255,
                            nillable: false,
                            createable: true,
                            updateable: true
                        },
                        {
                            name: "Industry",
                            label: "Industry",
                            type: "picklist",
                            nillable: true,
                            createable: true,
                            updateable: true,
                            picklistValues: [
                                { value: "Agriculture", label: "Agriculture", active: true },
                                { value: "Banking", label: "Banking", active: true },
                                { value: "Technology", label: "Technology", active: true },
                                { value: "Healthcare", label: "Healthcare", active: true }
                            ]
                        },
                        {
                            name: "AnnualRevenue",
                            label: "Annual Revenue",
                            type: "currency",
                            precision: 18,
                            scale: 0,
                            nillable: true,
                            createable: true,
                            updateable: true
                        },
                        {
                            name: "OwnerId",
                            label: "Owner ID",
                            type: "reference",
                            nillable: false,
                            createable: true,
                            updateable: true,
                            referenceTo: ["User"],
                            relationshipName: "Owner"
                        }
                    ],
                    childRelationships: [
                        {
                            childSObject: "Contact",
                            field: "AccountId",
                            relationshipName: "Contacts"
                        },
                        {
                            childSObject: "Opportunity",
                            field: "AccountId",
                            relationshipName: "Opportunities"
                        },
                        {
                            childSObject: "Case",
                            field: "AccountId",
                            relationshipName: "Cases"
                        }
                    ],
                    recordTypeInfos: [
                        {
                            recordTypeId: "012000000000000AAA",
                            name: "Master",
                            developerName: "Master",
                            defaultRecordTypeMapping: true,
                            active: true
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_object_type",
                description: "Describe an object that does not exist",
                input: {
                    objectType: "InvalidObject__c"
                },
                expectedError: {
                    type: "not_found",
                    message: "Object type 'InvalidObject__c' does not exist or is not accessible",
                    retryable: false
                }
            },
            {
                name: "no_access_to_object",
                description: "Describe an object without permission",
                input: {
                    objectType: "RestrictedObject__c"
                },
                expectedError: {
                    type: "not_found",
                    message:
                        "Object type 'RestrictedObject__c' does not exist or is not accessible",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded during describe call",
                input: {
                    objectType: "Account"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "REQUEST_LIMIT_EXCEEDED: TotalRequests Limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ========================================
    // GET RECORD OPERATION
    // ========================================
    {
        operationId: "getRecord",
        provider: "salesforce",
        validCases: [
            {
                name: "get_account_all_fields",
                description: "Retrieve an Account with all accessible fields",
                input: {
                    objectType: "Account",
                    recordId: "001Hn00001ACMEACCT"
                },
                expectedOutput: {
                    attributes: {
                        type: "Account",
                        url: "/services/data/v59.0/sobjects/Account/001Hn00001ACMEACCT"
                    },
                    Id: "001Hn00001ACMEACCT",
                    Name: "Acme Corporation",
                    Industry: "Technology",
                    Type: "Customer - Direct",
                    Website: "https://www.acmecorp.com",
                    Phone: "(415) 555-1234",
                    BillingStreet: "123 Market Street",
                    BillingCity: "San Francisco",
                    BillingState: "CA",
                    BillingPostalCode: "94105",
                    BillingCountry: "United States",
                    NumberOfEmployees: 500,
                    AnnualRevenue: 50000000,
                    OwnerId: "005Hn00001OWNERDEF",
                    CreatedDate: "2023-06-15T10:30:00.000Z",
                    LastModifiedDate: "2024-01-20T14:45:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Get record that does not exist",
                input: {
                    objectType: "Account",
                    recordId: "001Hn00001NOTFOUND0"
                },
                expectedError: {
                    type: "not_found",
                    message: "Record 001Hn00001NOTFOUND0 not found in Account",
                    retryable: false
                }
            },
            {
                name: "invalid_record_id_format",
                description: "Get record with malformed ID",
                input: {
                    objectType: "Account",
                    recordId: "invalid-id"
                },
                expectedError: {
                    type: "validation",
                    message: "Record ID must be 15 or 18 characters",
                    retryable: false
                }
            },
            {
                name: "invalid_field",
                description: "Get record requesting non-existent field",
                input: {
                    objectType: "Account",
                    recordId: "001Hn00001ACMEACCT",
                    fields: ["Id", "Name", "NonExistentField__c"]
                },
                expectedError: {
                    type: "validation",
                    message:
                        "INVALID_FIELD: No such column 'NonExistentField__c' on entity 'Account'",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded during record retrieval",
                input: {
                    objectType: "Account",
                    recordId: "001Hn00001ACMEACCT"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "REQUEST_LIMIT_EXCEEDED: TotalRequests Limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ========================================
    // LIST OBJECTS OPERATION
    // ========================================
    {
        operationId: "listObjects",
        provider: "salesforce",
        validCases: [
            {
                name: "list_all_objects",
                description: "Get a list of all available Salesforce objects including custom",
                input: {
                    includeCustom: true
                },
                expectedOutput: {
                    totalCount: 156,
                    objects: [
                        {
                            name: "Account",
                            label: "Account",
                            labelPlural: "Accounts",
                            keyPrefix: "001",
                            queryable: true,
                            createable: true,
                            updateable: true,
                            deletable: true,
                            searchable: true,
                            custom: false
                        },
                        {
                            name: "Contact",
                            label: "Contact",
                            labelPlural: "Contacts",
                            keyPrefix: "003",
                            queryable: true,
                            createable: true,
                            updateable: true,
                            deletable: true,
                            searchable: true,
                            custom: false
                        },
                        {
                            name: "Lead",
                            label: "Lead",
                            labelPlural: "Leads",
                            keyPrefix: "00Q",
                            queryable: true,
                            createable: true,
                            updateable: true,
                            deletable: true,
                            searchable: true,
                            custom: false
                        },
                        {
                            name: "Opportunity",
                            label: "Opportunity",
                            labelPlural: "Opportunities",
                            keyPrefix: "006",
                            queryable: true,
                            createable: true,
                            updateable: true,
                            deletable: true,
                            searchable: true,
                            custom: false
                        },
                        {
                            name: "Case",
                            label: "Case",
                            labelPlural: "Cases",
                            keyPrefix: "500",
                            queryable: true,
                            createable: true,
                            updateable: true,
                            deletable: true,
                            searchable: true,
                            custom: false
                        },
                        {
                            name: "Task",
                            label: "Task",
                            labelPlural: "Tasks",
                            keyPrefix: "00T",
                            queryable: true,
                            createable: true,
                            updateable: true,
                            deletable: true,
                            searchable: true,
                            custom: false
                        },
                        {
                            name: "Project__c",
                            label: "Project",
                            labelPlural: "Projects",
                            keyPrefix: "a01",
                            queryable: true,
                            createable: true,
                            updateable: true,
                            deletable: true,
                            searchable: true,
                            custom: true
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded during list objects call",
                input: {
                    includeCustom: true
                },
                expectedError: {
                    type: "rate_limit",
                    message: "REQUEST_LIMIT_EXCEEDED: TotalRequests Limit exceeded",
                    retryable: true
                }
            },
            {
                name: "server_error",
                description: "Server error during describe global",
                input: {
                    includeCustom: true
                },
                expectedError: {
                    type: "server_error",
                    message: "Failed to list objects",
                    retryable: true
                }
            }
        ]
    },

    // ========================================
    // QUERY RECORDS OPERATION
    // ========================================
    {
        operationId: "queryRecords",
        provider: "salesforce",
        validCases: [
            {
                name: "query_with_soql",
                description: "Execute a full SOQL query string",
                input: {
                    query: "SELECT Id, Name, Industry, AnnualRevenue FROM Account WHERE Industry = 'Technology' ORDER BY AnnualRevenue DESC LIMIT 10"
                },
                expectedOutput: {
                    totalSize: 5,
                    done: true,
                    records: [
                        {
                            attributes: {
                                type: "Account",
                                url: "/services/data/v59.0/sobjects/Account/001Hn00001ACMEACCT"
                            },
                            Id: "001Hn00001ACMEACCT",
                            Name: "Acme Corporation",
                            Industry: "Technology",
                            AnnualRevenue: 50000000
                        },
                        {
                            attributes: {
                                type: "Account",
                                url: "/services/data/v59.0/sobjects/Account/001Hn00001TECHSTRT"
                            },
                            Id: "001Hn00001TECHSTRT",
                            Name: "TechStart Inc",
                            Industry: "Technology",
                            AnnualRevenue: 25000000
                        },
                        {
                            attributes: {
                                type: "Account",
                                url: "/services/data/v59.0/sobjects/Account/001Hn00001CLOUDCO"
                            },
                            Id: "001Hn00001CLOUDCO",
                            Name: "CloudCo Solutions",
                            Industry: "Technology",
                            AnnualRevenue: 15000000
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "missing_query_and_object_type",
                description: "Query without providing query or objectType",
                input: {
                    fields: ["Id", "Name"]
                },
                expectedError: {
                    type: "validation",
                    message: "Either 'query' or 'objectType' must be provided",
                    retryable: false
                }
            },
            {
                name: "malformed_soql",
                description: "Query with invalid SOQL syntax",
                input: {
                    query: "SELECT FROM Account WHERE"
                },
                expectedError: {
                    type: "validation",
                    message: "MALFORMED_QUERY: unexpected token: FROM",
                    retryable: false
                }
            },
            {
                name: "invalid_field_in_query",
                description: "Query with non-existent field",
                input: {
                    objectType: "Account",
                    fields: ["Id", "Name", "InvalidField__c"]
                },
                expectedError: {
                    type: "validation",
                    message: "INVALID_FIELD: No such column 'InvalidField__c' on entity 'Account'",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded during query execution",
                input: {
                    objectType: "Account",
                    fields: ["Id", "Name"],
                    limit: 100
                },
                expectedError: {
                    type: "rate_limit",
                    message: "REQUEST_LIMIT_EXCEEDED: TotalRequests Limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ========================================
    // SEARCH RECORDS OPERATION
    // ========================================
    {
        operationId: "searchRecords",
        provider: "salesforce",
        validCases: [
            {
                name: "search_with_sosl",
                description: "Execute a full SOSL search query",
                input: {
                    searchQuery:
                        "FIND {Acme} IN ALL FIELDS RETURNING Account(Id, Name, Industry), Contact(Id, FirstName, LastName, Email), Lead(Id, FirstName, LastName, Company)"
                },
                expectedOutput: {
                    totalCount: 7,
                    records: [
                        {
                            attributes: {
                                type: "Account",
                                url: "/services/data/v59.0/sobjects/Account/001Hn00001ACMEACCT"
                            },
                            Id: "001Hn00001ACMEACCT",
                            Name: "Acme Corporation",
                            Industry: "Technology"
                        },
                        {
                            attributes: {
                                type: "Contact",
                                url: "/services/data/v59.0/sobjects/Contact/003Hn00001SARAHJSN"
                            },
                            Id: "003Hn00001SARAHJSN",
                            FirstName: "Sarah",
                            LastName: "Johnson",
                            Email: "sarah.johnson@acmecorp.com"
                        },
                        {
                            attributes: {
                                type: "Contact",
                                url: "/services/data/v59.0/sobjects/Contact/003Hn00001DAVIDBRO"
                            },
                            Id: "003Hn00001DAVIDBRO",
                            FirstName: "David",
                            LastName: "Brown",
                            Email: "david.brown@acmecorp.com"
                        }
                    ],
                    groupedByType: {
                        Account: [
                            {
                                attributes: {
                                    type: "Account",
                                    url: "/services/data/v59.0/sobjects/Account/001Hn00001ACMEACCT"
                                },
                                Id: "001Hn00001ACMEACCT",
                                Name: "Acme Corporation",
                                Industry: "Technology"
                            }
                        ],
                        Contact: [
                            {
                                attributes: {
                                    type: "Contact",
                                    url: "/services/data/v59.0/sobjects/Contact/003Hn00001SARAHJSN"
                                },
                                Id: "003Hn00001SARAHJSN",
                                FirstName: "Sarah",
                                LastName: "Johnson",
                                Email: "sarah.johnson@acmecorp.com"
                            },
                            {
                                attributes: {
                                    type: "Contact",
                                    url: "/services/data/v59.0/sobjects/Contact/003Hn00001DAVIDBRO"
                                },
                                Id: "003Hn00001DAVIDBRO",
                                FirstName: "David",
                                LastName: "Brown",
                                Email: "david.brown@acmecorp.com"
                            }
                        ]
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "missing_search_query_and_term",
                description: "Search without providing searchQuery or searchTerm",
                input: {
                    objectTypes: ["Account", "Contact"]
                },
                expectedError: {
                    type: "validation",
                    message: "Either 'searchQuery' or 'searchTerm' must be provided",
                    retryable: false
                }
            },
            {
                name: "malformed_sosl",
                description: "Search with invalid SOSL syntax",
                input: {
                    searchQuery: "FIND IN ALL FIELDS"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid search query: MALFORMED_SEARCH",
                    retryable: false
                }
            },
            {
                name: "search_term_too_short",
                description: "Search term with less than 2 characters",
                input: {
                    searchTerm: "a",
                    objectTypes: ["Account"]
                },
                expectedError: {
                    type: "validation",
                    message: "Search term must be at least 2 characters",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded during search",
                input: {
                    searchTerm: "enterprise",
                    objectTypes: ["Account", "Contact"]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "REQUEST_LIMIT_EXCEEDED: TotalRequests Limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ========================================
    // UPDATE RECORD OPERATION
    // ========================================
    {
        operationId: "updateRecord",
        provider: "salesforce",
        validCases: [
            {
                name: "update_account",
                description: "Update an Account with new information",
                input: {
                    objectType: "Account",
                    recordId: "001Hn00001ACMEACCT",
                    data: {
                        AnnualRevenue: 75000000,
                        NumberOfEmployees: 650,
                        Industry: "Technology",
                        Description:
                            "Leading provider of enterprise software solutions - Updated Q1 2024"
                    }
                },
                expectedOutput: {
                    id: "001Hn00001ACMEACCT",
                    updated: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Update record that does not exist",
                input: {
                    objectType: "Account",
                    recordId: "001Hn00001NOTFOUND0",
                    data: {
                        Name: "Updated Name"
                    }
                },
                expectedError: {
                    type: "not_found",
                    message: "Record 001Hn00001NOTFOUND0 not found in Account",
                    retryable: false
                }
            },
            {
                name: "invalid_field",
                description: "Update with non-existent field",
                input: {
                    objectType: "Account",
                    recordId: "001Hn00001ACMEACCT",
                    data: {
                        InvalidField__c: "some value"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "INVALID_FIELD: No such column 'InvalidField__c' on entity 'Account'",
                    retryable: false
                }
            },
            {
                name: "required_field_null",
                description: "Update required field to null",
                input: {
                    objectType: "Account",
                    recordId: "001Hn00001ACMEACCT",
                    data: {
                        Name: null
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "REQUIRED_FIELD_MISSING: Required fields are missing: [Name]",
                    retryable: false
                }
            },
            {
                name: "invalid_picklist_value",
                description: "Update with invalid picklist value",
                input: {
                    objectType: "Opportunity",
                    recordId: "006Hn00001BIGDEALX",
                    data: {
                        StageName: "Invalid Stage Name"
                    }
                },
                expectedError: {
                    type: "validation",
                    message:
                        "INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST: bad value for restricted picklist field: StageName",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded during update",
                input: {
                    objectType: "Account",
                    recordId: "001Hn00001ACMEACCT",
                    data: {
                        Description: "Updated description"
                    }
                },
                expectedError: {
                    type: "rate_limit",
                    message: "REQUEST_LIMIT_EXCEEDED: TotalRequests Limit exceeded",
                    retryable: true
                }
            }
        ]
    }
];
