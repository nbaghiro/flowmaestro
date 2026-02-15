/**
 * Expensify Provider Test Fixtures
 *
 * Based on official Expensify Integrations documentation:
 * https://integrations.expensify.com/
 */

import type { TestFixture } from "../../sandbox";

export const expensifyFixtures: TestFixture[] = [
    // ==================== REPORTS ====================
    {
        operationId: "exportReports",
        provider: "expensify",
        validCases: [
            {
                name: "export_all_reports",
                description: "Export all expense reports",
                input: {},
                expectedOutput: {
                    reports: [
                        {
                            reportID: "R001234567",
                            reportName: "January 2024 Expenses",
                            status: "Approved",
                            total: 125000,
                            currency: "USD",
                            created: "2024-01-15T10:00:00Z",
                            submitted: "2024-01-20T14:30:00Z",
                            approved: "2024-01-21T09:00:00Z",
                            ownerEmail: "john.doe@company.com",
                            policyID: "P12345",
                            policyName: "Corporate Travel",
                            expenses: [
                                {
                                    transactionID: "T001",
                                    merchant: "United Airlines",
                                    amount: 75000,
                                    currency: "USD",
                                    category: "Travel - Airfare",
                                    created: "2024-01-10",
                                    billable: true,
                                    reimbursable: true
                                },
                                {
                                    transactionID: "T002",
                                    merchant: "Hilton Hotels",
                                    amount: 50000,
                                    currency: "USD",
                                    category: "Travel - Lodging",
                                    created: "2024-01-11",
                                    billable: true,
                                    reimbursable: true
                                }
                            ]
                        },
                        {
                            reportID: "R001234568",
                            reportName: "Client Meeting Expenses",
                            status: "Reimbursed",
                            total: 35000,
                            currency: "USD",
                            created: "2024-01-08T11:00:00Z",
                            submitted: "2024-01-09T10:00:00Z",
                            approved: "2024-01-09T15:00:00Z",
                            reimbursed: "2024-01-12T12:00:00Z",
                            ownerEmail: "jane.smith@company.com",
                            policyID: "P12345",
                            policyName: "Corporate Travel"
                        }
                    ],
                    count: 2,
                    format: "json"
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Invalid credentials",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Invalid Partner User ID or Secret",
                    retryable: false
                }
            },
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
        operationId: "getReport",
        provider: "expensify",
        validCases: [
            {
                name: "get_report_by_id",
                description: "Get a specific report by ID",
                input: { reportID: "R001234567" },
                expectedOutput: {
                    reportID: "R001234567",
                    reportName: "January 2024 Expenses",
                    status: "Approved",
                    total: 125000,
                    currency: "USD",
                    created: "2024-01-15T10:00:00Z",
                    submitted: "2024-01-20T14:30:00Z",
                    approved: "2024-01-21T09:00:00Z",
                    ownerEmail: "john.doe@company.com",
                    policyID: "P12345",
                    policyName: "Corporate Travel",
                    expenses: [
                        {
                            transactionID: "T001",
                            merchant: "United Airlines",
                            amount: 75000,
                            currency: "USD",
                            category: "Travel - Airfare",
                            created: "2024-01-10",
                            billable: true,
                            reimbursable: true
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "report_not_found",
                description: "Report does not exist",
                input: { reportID: "R999999999" },
                expectedError: {
                    type: "not_found",
                    message: "Report not found",
                    retryable: false
                }
            }
        ]
    },

    // ==================== EXPENSES ====================
    {
        operationId: "createExpense",
        provider: "expensify",
        validCases: [
            {
                name: "create_basic_expense",
                description: "Create a basic expense",
                input: {
                    employeeEmail: "john.doe@company.com",
                    merchant: "Uber",
                    amount: 2500,
                    currency: "USD",
                    created: "2024-01-18",
                    category: "Travel - Ground Transportation",
                    reimbursable: true
                },
                expectedOutput: {
                    transactionID: "T003",
                    created: true
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_employee",
                description: "Employee email not found in policy",
                input: {
                    employeeEmail: "unknown@company.com",
                    merchant: "Uber",
                    amount: 2500,
                    created: "2024-01-18"
                },
                expectedError: {
                    type: "validation",
                    message: "Employee not found in policy",
                    retryable: false
                }
            }
        ]
    },

    // ==================== POLICIES ====================
    {
        operationId: "listPolicies",
        provider: "expensify",
        validCases: [
            {
                name: "list_all_policies",
                description: "List all workspace policies",
                input: {},
                expectedOutput: {
                    policies: [
                        {
                            policyID: "P12345",
                            name: "Corporate Travel",
                            type: "corporate",
                            owner: "admin@company.com",
                            outputCurrency: "USD"
                        },
                        {
                            policyID: "P12346",
                            name: "Office Supplies",
                            type: "team",
                            owner: "manager@company.com",
                            outputCurrency: "USD"
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
        operationId: "updatePolicy",
        provider: "expensify",
        validCases: [
            {
                name: "update_policy_settings",
                description: "Update policy settings",
                input: {
                    policyID: "P12345",
                    maxExpenseAge: 90,
                    maxExpenseAmount: 500000,
                    autoApproveAmount: 10000
                },
                expectedOutput: {
                    policyID: "P12345",
                    updated: true
                }
            }
        ],
        errorCases: [
            {
                name: "policy_not_found",
                description: "Policy does not exist",
                input: {
                    policyID: "P99999",
                    name: "New Name"
                },
                expectedError: {
                    type: "not_found",
                    message: "Policy not found",
                    retryable: false
                }
            }
        ]
    },

    // ==================== EMPLOYEES ====================
    {
        operationId: "manageEmployees",
        provider: "expensify",
        validCases: [
            {
                name: "add_employees",
                description: "Add employees to a policy",
                input: {
                    policyID: "P12345",
                    employees: [
                        {
                            email: "newuser@company.com",
                            action: "add",
                            role: "user"
                        },
                        {
                            email: "newadmin@company.com",
                            action: "add",
                            role: "admin",
                            approvalLimit: 100000
                        }
                    ]
                },
                expectedOutput: {
                    policyID: "P12345",
                    processed: 2
                }
            }
        ],
        errorCases: [
            {
                name: "policy_not_found",
                description: "Policy does not exist",
                input: {
                    policyID: "P99999",
                    employees: [{ email: "user@company.com", action: "add" }]
                },
                expectedError: {
                    type: "not_found",
                    message: "Policy not found",
                    retryable: false
                }
            },
            {
                name: "invalid_email",
                description: "Invalid employee email",
                input: {
                    policyID: "P12345",
                    employees: [{ email: "invalid-email", action: "add" }]
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email format",
                    retryable: false
                }
            }
        ]
    }
];
