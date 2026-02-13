/**
 * SAP SuccessFactors Provider Test Fixtures
 *
 * Based on SAP SuccessFactors OData v2 API response types
 */

import type { TestFixture } from "../../../sandbox";

/**
 * Sample employees for filterableData
 */
const sampleEmployees = [
    {
        id: "admin",
        username: "admin",
        firstName: "System",
        lastName: "Administrator",
        displayName: "System Administrator",
        email: "admin@acmecorp.com",
        status: "active",
        hireDate: "2018-01-01",
        department: "IT",
        division: "Corporate",
        title: "System Administrator",
        managerId: null,
        location: "San Francisco",
        country: "US",
        lastModified: "2024-01-15T14:30:00Z",
        _status: "active",
        _department: "IT"
    },
    {
        id: "jsmith",
        username: "jsmith",
        firstName: "John",
        lastName: "Smith",
        displayName: "John Smith",
        email: "john.smith@acmecorp.com",
        status: "active",
        hireDate: "2022-03-15",
        department: "Engineering",
        division: "Technology",
        title: "Senior Software Engineer",
        managerId: "sjohnson",
        location: "San Francisco",
        country: "US",
        lastModified: "2024-01-15T14:30:00Z",
        _status: "active",
        _department: "Engineering"
    },
    {
        id: "sjohnson",
        username: "sjohnson",
        firstName: "Sarah",
        lastName: "Johnson",
        displayName: "Sarah Johnson",
        email: "sarah.johnson@acmecorp.com",
        status: "active",
        hireDate: "2021-06-01",
        department: "Engineering",
        division: "Technology",
        title: "Engineering Manager",
        managerId: "mchen",
        location: "San Francisco",
        country: "US",
        lastModified: "2024-02-01T09:15:00Z",
        _status: "active",
        _department: "Engineering"
    },
    {
        id: "mchen",
        username: "mchen",
        firstName: "Michael",
        lastName: "Chen",
        displayName: "Michael Chen",
        email: "michael.chen@acmecorp.com",
        status: "active",
        hireDate: "2020-01-15",
        department: "Engineering",
        division: "Technology",
        title: "VP of Engineering",
        managerId: null,
        location: "San Francisco",
        country: "US",
        lastModified: "2024-01-10T11:00:00Z",
        _status: "active",
        _department: "Engineering"
    },
    {
        id: "ewilson",
        username: "ewilson",
        firstName: "Emma",
        lastName: "Wilson",
        displayName: "Emma Wilson",
        email: "emma.wilson@acmecorp.com",
        status: "active",
        hireDate: "2023-01-15",
        department: "Marketing",
        division: "Business",
        title: "Marketing Specialist",
        managerId: "rwilliams",
        location: "New York",
        country: "US",
        lastModified: "2024-02-01T14:00:00Z",
        _status: "active",
        _department: "Marketing"
    }
];

/**
 * Sample departments for filterableData
 */
const sampleDepartments = [
    {
        id: "ENG",
        name: "Engineering",
        description: "Product and Platform Engineering",
        parentDepartmentId: null,
        headOfDepartmentId: "mchen",
        costCenter: "CC-1001",
        startDate: "2018-01-01",
        endDate: null,
        status: "A"
    },
    {
        id: "MKT",
        name: "Marketing",
        description: "Brand and Growth Marketing",
        parentDepartmentId: null,
        headOfDepartmentId: "rwilliams",
        costCenter: "CC-2001",
        startDate: "2018-01-01",
        endDate: null,
        status: "A"
    },
    {
        id: "IT",
        name: "Information Technology",
        description: "Corporate IT and Infrastructure",
        parentDepartmentId: null,
        headOfDepartmentId: "admin",
        costCenter: "CC-3001",
        startDate: "2018-01-01",
        endDate: null,
        status: "A"
    },
    {
        id: "HR",
        name: "Human Resources",
        description: "People Operations and HR",
        parentDepartmentId: null,
        headOfDepartmentId: "lbrown",
        costCenter: "CC-4001",
        startDate: "2018-01-01",
        endDate: null,
        status: "A"
    }
];

export const sapSuccessfactorsFixtures: TestFixture[] = [
    {
        operationId: "getEmployee",
        provider: "sap-successfactors",
        validCases: [
            {
                name: "get_employee_full_details",
                description: "Get detailed employee information by user ID",
                input: {
                    userId: "jsmith"
                },
                expectedOutput: {
                    id: "jsmith",
                    username: "jsmith",
                    firstName: "John",
                    lastName: "Smith",
                    displayName: "John Smith",
                    email: "john.smith@acmecorp.com",
                    status: "active",
                    hireDate: "2022-03-15",
                    department: "Engineering",
                    division: "Technology",
                    title: "Senior Software Engineer",
                    managerId: "sjohnson",
                    location: "San Francisco",
                    country: "US",
                    timeZone: "America/Los_Angeles",
                    defaultLocale: "en_US",
                    lastModified: "2024-01-15T14:30:00Z"
                }
            },
            {
                name: "get_manager_employee",
                description: "Get employee who is a manager",
                input: {
                    userId: "sjohnson"
                },
                expectedOutput: {
                    id: "sjohnson",
                    username: "sjohnson",
                    firstName: "Sarah",
                    lastName: "Johnson",
                    displayName: "Sarah Johnson",
                    email: "sarah.johnson@acmecorp.com",
                    status: "active",
                    hireDate: "2021-06-01",
                    department: "Engineering",
                    division: "Technology",
                    title: "Engineering Manager",
                    managerId: "mchen",
                    location: "San Francisco",
                    country: "US",
                    timeZone: "America/Los_Angeles",
                    defaultLocale: "en_US",
                    lastModified: "2024-02-01T09:15:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Employee does not exist",
                input: {
                    userId: "nonexistent_user_123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Employee not found",
                    retryable: false
                }
            },
            {
                name: "unauthorized",
                description: "Invalid or expired OAuth token",
                input: {
                    userId: "jsmith"
                },
                expectedError: {
                    type: "permission",
                    message: "SAP SuccessFactors authentication failed",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listEmployees",
        provider: "sap-successfactors",
        filterableData: {
            records: sampleEmployees,
            recordsField: "employees",
            offsetField: "nextLink",
            defaultPageSize: 100,
            maxPageSize: 1000,
            pageSizeParam: "top",
            filterConfig: {
                type: "generic",
                filterableFields: ["_status", "_department", "country"]
            }
        },
        validCases: [
            {
                name: "list_all_employees",
                description: "List all employees with default pagination",
                input: {}
            },
            {
                name: "list_employees_with_pagination",
                description: "List employees with custom pagination",
                input: {
                    top: 10,
                    skip: 0
                }
            },
            {
                name: "list_active_employees",
                description: "List only active employees",
                input: {
                    status: "active"
                }
            },
            {
                name: "list_with_filter",
                description: "List employees with OData filter",
                input: {
                    filter: "department eq 'Engineering'"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_filter",
                description: "Invalid OData filter expression",
                input: {
                    filter: "invalid odata filter syntax"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid OData filter expression",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message:
                        "SAP SuccessFactors rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listDepartments",
        provider: "sap-successfactors",
        filterableData: {
            records: sampleDepartments,
            recordsField: "departments",
            offsetField: "nextLink",
            defaultPageSize: 100,
            maxPageSize: 1000,
            pageSizeParam: "top",
            filterConfig: {
                type: "generic",
                filterableFields: ["status"]
            }
        },
        validCases: [
            {
                name: "list_all_departments",
                description: "List all departments",
                input: {}
            },
            {
                name: "list_departments_paginated",
                description: "List departments with pagination",
                input: {
                    top: 10,
                    skip: 0
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Insufficient permissions to list departments",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Insufficient permissions to access department data",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getTimeOffBalance",
        provider: "sap-successfactors",
        validCases: [
            {
                name: "get_employee_balance",
                description: "Get time off balance for an employee",
                input: {
                    userId: "jsmith"
                },
                expectedOutput: {
                    balances: [
                        {
                            id: "TA-001-jsmith",
                            userId: "jsmith",
                            accountId: "PTO_ANNUAL",
                            accountName: "Annual Paid Time Off",
                            balance: 15.5,
                            unit: "DAYS",
                            asOfDate: "2024-01-31",
                            approved: 12.5,
                            pending: 3.0
                        },
                        {
                            id: "TA-002-jsmith",
                            userId: "jsmith",
                            accountId: "SICK_LEAVE",
                            accountName: "Sick Leave",
                            balance: 5.0,
                            unit: "DAYS",
                            asOfDate: "2024-01-31",
                            approved: 4.0,
                            pending: 1.0
                        }
                    ],
                    pagination: {
                        total: 2,
                        top: 100,
                        skip: 0,
                        hasMore: false,
                        nextLink: null
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "user_not_found",
                description: "User ID does not exist",
                input: {
                    userId: "nonexistent_user_123"
                },
                expectedError: {
                    type: "not_found",
                    message: "User not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listTimeOffRequests",
        provider: "sap-successfactors",
        validCases: [
            {
                name: "list_all_requests",
                description: "List all time off requests",
                input: {},
                expectedOutput: {
                    timeOffRequests: [
                        {
                            id: "ET-001",
                            userId: "jsmith",
                            timeType: "PTO",
                            timeTypeName: "Paid Time Off",
                            startDate: "2024-02-15",
                            endDate: "2024-02-16",
                            daysRequested: 2,
                            hoursRequested: 16,
                            status: "APPROVED",
                            comment: "Family vacation",
                            workflowRequestId: "WF-001",
                            createdAt: "2024-01-25T10:30:00Z",
                            lastModified: "2024-01-26T09:00:00Z"
                        }
                    ],
                    pagination: {
                        total: 1,
                        top: 100,
                        skip: 0,
                        hasMore: false,
                        nextLink: null
                    }
                }
            },
            {
                name: "list_user_requests",
                description: "List time off requests for a specific user",
                input: {
                    userId: "jsmith"
                },
                expectedOutput: {
                    timeOffRequests: [
                        {
                            id: "ET-001",
                            userId: "jsmith",
                            timeType: "PTO",
                            timeTypeName: "Paid Time Off",
                            startDate: "2024-02-15",
                            endDate: "2024-02-16",
                            daysRequested: 2,
                            hoursRequested: 16,
                            status: "APPROVED",
                            comment: "Family vacation",
                            workflowRequestId: "WF-001",
                            createdAt: "2024-01-25T10:30:00Z",
                            lastModified: "2024-01-26T09:00:00Z"
                        }
                    ],
                    pagination: {
                        total: 1,
                        top: 100,
                        skip: 0,
                        hasMore: false,
                        nextLink: null
                    }
                }
            },
            {
                name: "list_pending_requests",
                description: "List pending time off requests",
                input: {
                    filter: "approvalStatus eq 'PENDING'"
                },
                expectedOutput: {
                    timeOffRequests: [],
                    pagination: {
                        total: 0,
                        top: 100,
                        skip: 0,
                        hasMore: false,
                        nextLink: null
                    }
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
                    message:
                        "SAP SuccessFactors rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listJobs",
        provider: "sap-successfactors",
        validCases: [
            {
                name: "list_all_jobs",
                description: "List all job assignments",
                input: {},
                expectedOutput: {
                    jobs: [
                        {
                            sequenceNumber: 1,
                            userId: "jsmith",
                            startDate: "2022-03-15",
                            endDate: null,
                            jobCode: "SE-III",
                            jobTitle: "Senior Software Engineer",
                            department: "Engineering",
                            division: "Technology",
                            businessUnit: "Product",
                            location: "San Francisco",
                            costCenter: "CC-1001",
                            managerId: "sjohnson",
                            employmentType: "FULL_TIME",
                            employeeClass: "REG",
                            payGrade: "L5",
                            standardHours: 40,
                            fte: 1.0,
                            eventReason: "HIRE",
                            lastModified: "2024-01-15T14:30:00Z"
                        }
                    ],
                    pagination: {
                        total: 1,
                        top: 100,
                        skip: 0,
                        hasMore: false,
                        nextLink: null
                    }
                }
            },
            {
                name: "list_user_jobs",
                description: "List job assignments for a specific user",
                input: {
                    userId: "jsmith"
                },
                expectedOutput: {
                    jobs: [
                        {
                            sequenceNumber: 1,
                            userId: "jsmith",
                            startDate: "2022-03-15",
                            endDate: null,
                            jobCode: "SE-III",
                            jobTitle: "Senior Software Engineer",
                            department: "Engineering",
                            division: "Technology",
                            businessUnit: "Product",
                            location: "San Francisco",
                            costCenter: "CC-1001",
                            managerId: "sjohnson",
                            employmentType: "FULL_TIME",
                            employeeClass: "REG",
                            payGrade: "L5",
                            standardHours: 40,
                            fte: 1.0,
                            eventReason: "HIRE",
                            lastModified: "2024-01-15T14:30:00Z"
                        }
                    ],
                    pagination: {
                        total: 1,
                        top: 100,
                        skip: 0,
                        hasMore: false,
                        nextLink: null
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Insufficient permissions to list job data",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Insufficient permissions to access job data",
                    retryable: false
                }
            }
        ]
    }
];
