/**
 * Coda Provider Test Fixtures
 *
 * Based on official Coda API documentation:
 * - List Docs: https://coda.io/developers/apis/v1#operation/listDocs
 * - List Tables: https://coda.io/developers/apis/v1#operation/listTables
 * - Insert Rows: https://coda.io/developers/apis/v1#operation/upsertRows
 */

import type { TestFixture } from "../../../sandbox";

export const codaFixtures: TestFixture[] = [
    {
        operationId: "listDocs",
        provider: "coda",
        filterableData: {
            recordsField: "documents",
            offsetField: "nextPageToken",
            defaultPageSize: 100,
            maxPageSize: 500,
            pageSizeParam: "limit",
            offsetParam: "pageToken",
            filterConfig: {
                type: "generic"
            },
            records: [
                {
                    id: "AbCDeFGH",
                    name: "Q1 2024 Product Roadmap",
                    owner: "Sarah Chen",
                    browserLink: "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH",
                    createdAt: "2024-01-05T09:30:00.000Z",
                    updatedAt: "2024-01-28T14:22:15.000Z"
                },
                {
                    id: "IjKLmNoP",
                    name: "Engineering Team Wiki",
                    owner: "Marcus Johnson",
                    browserLink: "https://coda.io/d/Engineering-Team-Wiki_dIjKLmNoP",
                    createdAt: "2023-11-12T16:45:00.000Z",
                    updatedAt: "2024-01-27T11:08:42.000Z"
                },
                {
                    id: "QrStUvWx",
                    name: "Customer Feedback Tracker",
                    owner: "Emily Rodriguez",
                    browserLink: "https://coda.io/d/Customer-Feedback-Tracker_dQrStUvWx",
                    createdAt: "2024-01-10T13:20:00.000Z",
                    updatedAt: "2024-01-28T09:55:30.000Z"
                },
                {
                    id: "YzAbCdEf",
                    name: "Sprint Planning - Team Alpha",
                    owner: "David Kim",
                    browserLink: "https://coda.io/d/Sprint-Planning-Team-Alpha_dYzAbCdEf",
                    createdAt: "2024-01-15T08:00:00.000Z",
                    updatedAt: "2024-01-26T17:30:00.000Z"
                },
                {
                    id: "GhIjKlMn",
                    name: "Marketing Campaign Analytics",
                    owner: "Jessica Taylor",
                    browserLink: "https://coda.io/d/Marketing-Campaign-Analytics_dGhIjKlMn",
                    createdAt: "2023-12-01T10:15:00.000Z",
                    updatedAt: "2024-01-28T08:12:45.000Z"
                },
                {
                    id: "OpQrStUv",
                    name: "Sales Pipeline Dashboard",
                    owner: "Michael Brown",
                    browserLink: "https://coda.io/d/Sales-Pipeline-Dashboard_dOpQrStUv",
                    createdAt: "2023-10-20T14:30:00.000Z",
                    updatedAt: "2024-01-27T16:45:20.000Z"
                }
            ]
        },
        validCases: [
            {
                name: "list_all_docs",
                description: "List all Coda documents accessible with this API key",
                input: {},
                expectedOutput: {
                    documents: [
                        {
                            id: "AbCDeFGH",
                            name: "Q1 2024 Product Roadmap",
                            owner: "Sarah Chen",
                            browserLink: "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH",
                            createdAt: "2024-01-05T09:30:00.000Z",
                            updatedAt: "2024-01-28T14:22:15.000Z"
                        },
                        {
                            id: "IjKLmNoP",
                            name: "Engineering Team Wiki",
                            owner: "Marcus Johnson",
                            browserLink: "https://coda.io/d/Engineering-Team-Wiki_dIjKLmNoP",
                            createdAt: "2023-11-12T16:45:00.000Z",
                            updatedAt: "2024-01-27T11:08:42.000Z"
                        },
                        {
                            id: "QrStUvWx",
                            name: "Customer Feedback Tracker",
                            owner: "Emily Rodriguez",
                            browserLink: "https://coda.io/d/Customer-Feedback-Tracker_dQrStUvWx",
                            createdAt: "2024-01-10T13:20:00.000Z",
                            updatedAt: "2024-01-28T09:55:30.000Z"
                        }
                    ],
                    nextPageToken: null
                }
            },
            {
                name: "list_docs_with_limit",
                description: "List documents with a specified limit",
                input: {
                    limit: 2
                },
                expectedOutput: {
                    documents: [
                        {
                            id: "AbCDeFGH",
                            name: "Q1 2024 Product Roadmap",
                            owner: "Sarah Chen",
                            browserLink: "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH",
                            createdAt: "2024-01-05T09:30:00.000Z",
                            updatedAt: "2024-01-28T14:22:15.000Z"
                        },
                        {
                            id: "IjKLmNoP",
                            name: "Engineering Team Wiki",
                            owner: "Marcus Johnson",
                            browserLink: "https://coda.io/d/Engineering-Team-Wiki_dIjKLmNoP",
                            createdAt: "2023-11-12T16:45:00.000Z",
                            updatedAt: "2024-01-27T11:08:42.000Z"
                        }
                    ],
                    nextPageToken: "eyJsYXN0SWQiOiJJaktMbU5vUCJ9"
                }
            },
            {
                name: "list_docs_empty",
                description: "List documents when user has no documents",
                input: {
                    limit: 100
                },
                expectedOutput: {
                    documents: [],
                    nextPageToken: null
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Invalid or expired API token",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Invalid API token. Please check your Coda API credentials.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded (Coda allows 100 requests per 6 seconds)",
                input: {
                    limit: 100
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please slow down your requests.",
                    retryable: true
                }
            },
            {
                name: "invalid_limit",
                description: "Limit parameter exceeds maximum allowed value",
                input: {
                    limit: 1000
                },
                expectedError: {
                    type: "validation",
                    message: "Limit must be between 1 and 500",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getTables",
        provider: "coda",
        filterableData: {
            recordsField: "tables",
            offsetField: "nextPageToken",
            defaultPageSize: 100,
            maxPageSize: 500,
            pageSizeParam: "limit",
            offsetParam: "pageToken",
            filterConfig: {
                type: "generic"
            },
            records: [
                {
                    id: "grid-tasks",
                    name: "Tasks",
                    browserLink:
                        "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH/Tasks_tugrid-tasks"
                },
                {
                    id: "grid-milestones",
                    name: "Milestones",
                    browserLink:
                        "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH/Milestones_tugrid-milestones"
                },
                {
                    id: "grid-team-members",
                    name: "Team Members",
                    browserLink:
                        "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH/Team-Members_tugrid-team-members"
                },
                {
                    id: "grid-dependencies",
                    name: "Dependencies",
                    browserLink:
                        "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH/Dependencies_tugrid-dependencies"
                },
                {
                    id: "grid-risks",
                    name: "Risk Register",
                    browserLink:
                        "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH/Risk-Register_tugrid-risks"
                }
            ]
        },
        validCases: [
            {
                name: "get_all_tables",
                description: "Get all tables in a Coda document",
                input: {
                    docId: "AbCDeFGH"
                },
                expectedOutput: {
                    tables: [
                        {
                            id: "grid-tasks",
                            name: "Tasks",
                            browserLink:
                                "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH/Tasks_tugrid-tasks"
                        },
                        {
                            id: "grid-milestones",
                            name: "Milestones",
                            browserLink:
                                "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH/Milestones_tugrid-milestones"
                        },
                        {
                            id: "grid-team-members",
                            name: "Team Members",
                            browserLink:
                                "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH/Team-Members_tugrid-team-members"
                        }
                    ],
                    nextPageToken: null
                }
            },
            {
                name: "get_tables_with_limit",
                description: "Get tables with pagination limit",
                input: {
                    docId: "AbCDeFGH",
                    limit: 2
                },
                expectedOutput: {
                    tables: [
                        {
                            id: "grid-tasks",
                            name: "Tasks",
                            browserLink:
                                "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH/Tasks_tugrid-tasks"
                        },
                        {
                            id: "grid-milestones",
                            name: "Milestones",
                            browserLink:
                                "https://coda.io/d/Q1-2024-Product-Roadmap_dAbCDeFGH/Milestones_tugrid-milestones"
                        }
                    ],
                    nextPageToken: "eyJsYXN0SWQiOiJncmlkLW1pbGVzdG9uZXMifQ"
                }
            },
            {
                name: "get_tables_engineering_wiki",
                description: "Get tables from the Engineering Team Wiki document",
                input: {
                    docId: "IjKLmNoP"
                },
                expectedOutput: {
                    tables: [
                        {
                            id: "grid-onboarding",
                            name: "Onboarding Checklist",
                            browserLink:
                                "https://coda.io/d/Engineering-Team-Wiki_dIjKLmNoP/Onboarding-Checklist_tugrid-onboarding"
                        },
                        {
                            id: "grid-tech-stack",
                            name: "Tech Stack Reference",
                            browserLink:
                                "https://coda.io/d/Engineering-Team-Wiki_dIjKLmNoP/Tech-Stack-Reference_tugrid-tech-stack"
                        },
                        {
                            id: "grid-processes",
                            name: "Development Processes",
                            browserLink:
                                "https://coda.io/d/Engineering-Team-Wiki_dIjKLmNoP/Development-Processes_tugrid-processes"
                        },
                        {
                            id: "grid-contacts",
                            name: "Team Contacts",
                            browserLink:
                                "https://coda.io/d/Engineering-Team-Wiki_dIjKLmNoP/Team-Contacts_tugrid-contacts"
                        }
                    ],
                    nextPageToken: null
                }
            },
            {
                name: "get_tables_empty_doc",
                description: "Get tables from a document with no tables",
                input: {
                    docId: "EmptyDoc123"
                },
                expectedOutput: {
                    tables: [],
                    nextPageToken: null
                }
            }
        ],
        errorCases: [
            {
                name: "doc_not_found",
                description: "Document does not exist or no access",
                input: {
                    docId: "NonexistentDoc"
                },
                expectedError: {
                    type: "not_found",
                    message: "Document not found: NonexistentDoc",
                    retryable: false
                }
            },
            {
                name: "no_read_permission",
                description: "User does not have read access to the document",
                input: {
                    docId: "PrivateDoc456"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to access this document",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    docId: "AbCDeFGH"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please slow down your requests.",
                    retryable: true
                }
            },
            {
                name: "invalid_doc_id",
                description: "Document ID format is invalid",
                input: {
                    docId: ""
                },
                expectedError: {
                    type: "validation",
                    message: "Document ID is required",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "addRow",
        provider: "coda",
        validCases: [
            {
                name: "add_task_row",
                description: "Add a new task row to a tasks table",
                input: {
                    docId: "AbCDeFGH",
                    tableId: "grid-tasks",
                    cells: {
                        "Task Name": "Implement user authentication",
                        Status: "Not Started",
                        Priority: "High",
                        Assignee: "Sarah Chen",
                        "Due Date": "2024-02-15",
                        "Estimated Hours": 16,
                        Tags: ["backend", "security"]
                    }
                },
                expectedOutput: {
                    requestId: "req-abc123def456",
                    rowIds: ["i-row-a1b2c3d4e5"]
                }
            },
            {
                name: "add_milestone_row",
                description: "Add a new milestone to the milestones table",
                input: {
                    docId: "AbCDeFGH",
                    tableId: "grid-milestones",
                    cells: {
                        "Milestone Name": "Beta Release",
                        "Target Date": "2024-03-01",
                        Owner: "Marcus Johnson",
                        Status: "On Track",
                        Description: "Release beta version to select customers for feedback",
                        Dependencies: ["Alpha Release", "Security Audit"]
                    }
                },
                expectedOutput: {
                    requestId: "req-ghi789jkl012",
                    rowIds: ["i-row-f6g7h8i9j0"]
                }
            },
            {
                name: "add_team_member_row",
                description: "Add a new team member to the team members table",
                input: {
                    docId: "AbCDeFGH",
                    tableId: "grid-team-members",
                    cells: {
                        Name: "Alex Rivera",
                        Role: "Senior Frontend Engineer",
                        Email: "alex.rivera@company.com",
                        "Start Date": "2024-01-22",
                        Team: "Product",
                        Skills: ["React", "TypeScript", "GraphQL"],
                        Manager: "Sarah Chen"
                    }
                },
                expectedOutput: {
                    requestId: "req-mno345pqr678",
                    rowIds: ["i-row-k1l2m3n4o5"]
                }
            },
            {
                name: "add_customer_feedback_row",
                description: "Add new customer feedback entry",
                input: {
                    docId: "QrStUvWx",
                    tableId: "grid-feedback",
                    cells: {
                        "Customer Name": "Acme Corporation",
                        "Feedback Type": "Feature Request",
                        Description: "Would like to see bulk import functionality for CSV files",
                        "Submitted Date": "2024-01-28",
                        Priority: "Medium",
                        Status: "Under Review",
                        "Product Area": "Data Import",
                        "Contact Email": "john.smith@acme.com"
                    }
                },
                expectedOutput: {
                    requestId: "req-stu901vwx234",
                    rowIds: ["i-row-p6q7r8s9t0"]
                }
            },
            {
                name: "add_risk_entry_row",
                description: "Add a new risk to the risk register",
                input: {
                    docId: "AbCDeFGH",
                    tableId: "grid-risks",
                    cells: {
                        "Risk Title": "Third-party API rate limiting",
                        Category: "Technical",
                        Probability: "Medium",
                        Impact: "High",
                        "Risk Score": 6,
                        "Mitigation Strategy": "Implement caching layer and request queuing",
                        Owner: "David Kim",
                        Status: "Mitigating",
                        "Identified Date": "2024-01-25"
                    }
                },
                expectedOutput: {
                    requestId: "req-yza567bcd890",
                    rowIds: ["i-row-u1v2w3x4y5"]
                }
            },
            {
                name: "add_row_with_formula_reference",
                description: "Add a row with a reference to another row (linked record)",
                input: {
                    docId: "AbCDeFGH",
                    tableId: "grid-dependencies",
                    cells: {
                        "Dependent Task": "i-row-a1b2c3d4e5",
                        "Depends On": "i-row-z9y8x7w6v5",
                        "Dependency Type": "Finish-to-Start",
                        Notes: "Auth must be complete before API integration begins"
                    }
                },
                expectedOutput: {
                    requestId: "req-efg123hij456",
                    rowIds: ["i-row-dep123456"]
                }
            },
            {
                name: "add_row_minimal_fields",
                description: "Add a row with only required fields",
                input: {
                    docId: "AbCDeFGH",
                    tableId: "grid-tasks",
                    cells: {
                        "Task Name": "Quick task"
                    }
                },
                expectedOutput: {
                    requestId: "req-klm789nop012",
                    rowIds: ["i-row-minimal123"]
                }
            },
            {
                name: "add_row_with_boolean_and_number",
                description: "Add a row with boolean and numeric field types",
                input: {
                    docId: "IjKLmNoP",
                    tableId: "grid-onboarding",
                    cells: {
                        "Employee Name": "Chris Park",
                        "Completed Orientation": true,
                        "Completed Security Training": false,
                        "Days Since Start": 5,
                        "Completion Percentage": 45.5,
                        Notes: "In progress with security training"
                    }
                },
                expectedOutput: {
                    requestId: "req-qrs345tuv678",
                    rowIds: ["i-row-onboard789"]
                }
            }
        ],
        errorCases: [
            {
                name: "doc_not_found",
                description: "Document does not exist",
                input: {
                    docId: "NonexistentDoc",
                    tableId: "grid-tasks",
                    cells: {
                        "Task Name": "Test task"
                    }
                },
                expectedError: {
                    type: "not_found",
                    message: "Document not found: NonexistentDoc",
                    retryable: false
                }
            },
            {
                name: "table_not_found",
                description: "Table does not exist in the document",
                input: {
                    docId: "AbCDeFGH",
                    tableId: "grid-nonexistent",
                    cells: {
                        "Task Name": "Test task"
                    }
                },
                expectedError: {
                    type: "not_found",
                    message: "Table not found: grid-nonexistent in document AbCDeFGH",
                    retryable: false
                }
            },
            {
                name: "invalid_column_name",
                description: "Column does not exist in the table",
                input: {
                    docId: "AbCDeFGH",
                    tableId: "grid-tasks",
                    cells: {
                        NonexistentColumn: "value",
                        "Task Name": "Test task"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: 'Unknown column: "NonexistentColumn"',
                    retryable: false
                }
            },
            {
                name: "invalid_column_value_type",
                description: "Value type does not match column type",
                input: {
                    docId: "AbCDeFGH",
                    tableId: "grid-tasks",
                    cells: {
                        "Task Name": "Test task",
                        "Estimated Hours": "not a number"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: 'Invalid value for column "Estimated Hours": expected number',
                    retryable: false
                }
            },
            {
                name: "no_write_permission",
                description: "User does not have write access to the document",
                input: {
                    docId: "ReadOnlyDoc789",
                    tableId: "grid-tasks",
                    cells: {
                        "Task Name": "Test task"
                    }
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to edit this document",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    docId: "AbCDeFGH",
                    tableId: "grid-tasks",
                    cells: {
                        "Task Name": "Test task"
                    }
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please slow down your requests.",
                    retryable: true
                }
            },
            {
                name: "empty_cells",
                description: "Cells object is empty",
                input: {
                    docId: "AbCDeFGH",
                    tableId: "grid-tasks",
                    cells: {}
                },
                expectedError: {
                    type: "validation",
                    message: "At least one cell value must be provided",
                    retryable: false
                }
            },
            {
                name: "invalid_date_format",
                description: "Date field has invalid format",
                input: {
                    docId: "AbCDeFGH",
                    tableId: "grid-tasks",
                    cells: {
                        "Task Name": "Test task",
                        "Due Date": "not-a-date"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: 'Invalid date format for column "Due Date": expected ISO 8601 date',
                    retryable: false
                }
            },
            {
                name: "doc_id_required",
                description: "Document ID is missing",
                input: {
                    docId: "",
                    tableId: "grid-tasks",
                    cells: {
                        "Task Name": "Test task"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "Document ID is required",
                    retryable: false
                }
            },
            {
                name: "table_id_required",
                description: "Table ID is missing",
                input: {
                    docId: "AbCDeFGH",
                    tableId: "",
                    cells: {
                        "Task Name": "Test task"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "Table ID is required",
                    retryable: false
                }
            }
        ]
    }
];
