/**
 * Rippling Provider Test Fixtures
 *
 * Based on Rippling API response types for HR operations
 */

import type { TestFixture } from "../../sandbox";

/**
 * Sample employees for filterableData
 */
const sampleEmployees = [
    {
        id: "emp_01H8X9KPZN4Q5R6S7T8U9V0W1X",
        displayName: "John Smith",
        firstName: "John",
        lastName: "Smith",
        email: "john.smith@acmecorp.com",
        personalEmail: "john.personal@gmail.com",
        phone: "+1-555-123-4567",
        title: "Senior Software Engineer",
        department: { id: "dept_eng_001", name: "Engineering" },
        managerId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
        managerName: "Sarah Johnson",
        startDate: "2022-03-15",
        endDate: null,
        employmentType: "FULL_TIME",
        employmentStatus: "ACTIVE",
        workLocation: { id: "loc_sf_001", name: "San Francisco HQ" },
        team: { id: "team_platform_001", name: "Platform Team" },
        isManager: false,
        _department: "Engineering",
        _status: "ACTIVE"
    },
    {
        id: "emp_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
        displayName: "Sarah Johnson",
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah.johnson@acmecorp.com",
        personalEmail: null,
        phone: "+1-555-234-5678",
        title: "Engineering Manager",
        department: { id: "dept_eng_001", name: "Engineering" },
        managerId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
        managerName: "Michael Chen",
        startDate: "2021-06-01",
        endDate: null,
        employmentType: "FULL_TIME",
        employmentStatus: "ACTIVE",
        workLocation: { id: "loc_sf_001", name: "San Francisco HQ" },
        team: { id: "team_platform_001", name: "Platform Team" },
        isManager: true,
        _department: "Engineering",
        _status: "ACTIVE"
    },
    {
        id: "emp_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
        displayName: "Michael Chen",
        firstName: "Michael",
        lastName: "Chen",
        email: "michael.chen@acmecorp.com",
        personalEmail: "mchen@protonmail.com",
        phone: "+1-555-345-6789",
        title: "VP of Engineering",
        department: { id: "dept_eng_001", name: "Engineering" },
        managerId: null,
        managerName: null,
        startDate: "2020-01-15",
        endDate: null,
        employmentType: "FULL_TIME",
        employmentStatus: "ACTIVE",
        workLocation: { id: "loc_sf_001", name: "San Francisco HQ" },
        team: null,
        isManager: true,
        _department: "Engineering",
        _status: "ACTIVE"
    },
    {
        id: "emp_01H8X9KPZN4Q5R6S7T8U9V0W4A",
        displayName: "Emily Davis",
        firstName: "Emily",
        lastName: "Davis",
        email: "emily.davis@acmecorp.com",
        personalEmail: null,
        phone: "+1-555-456-7890",
        title: "Marketing Manager",
        department: { id: "dept_mkt_001", name: "Marketing" },
        managerId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W5B",
        managerName: "Robert Wilson",
        startDate: "2023-02-01",
        endDate: null,
        employmentType: "FULL_TIME",
        employmentStatus: "ACTIVE",
        workLocation: { id: "loc_ny_001", name: "New York Office" },
        team: { id: "team_growth_001", name: "Growth Team" },
        isManager: true,
        _department: "Marketing",
        _status: "ACTIVE"
    },
    {
        id: "emp_01H8X9KPZN4Q5R6S7T8U9V0W6C",
        displayName: "James Brown",
        firstName: "James",
        lastName: "Brown",
        email: "james.brown@acmecorp.com",
        personalEmail: null,
        phone: null,
        title: "Product Designer",
        department: { id: "dept_design_001", name: "Design" },
        managerId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W4A",
        managerName: "Emily Davis",
        startDate: "2023-09-01",
        endDate: null,
        employmentType: "CONTRACTOR",
        employmentStatus: "ACTIVE",
        workLocation: { id: "loc_remote_001", name: "Remote" },
        team: { id: "team_product_001", name: "Product Team" },
        isManager: false,
        _department: "Design",
        _status: "ACTIVE"
    }
];

/**
 * Sample departments for filterableData
 */
const sampleDepartments = [
    {
        id: "dept_eng_001",
        name: "Engineering",
        code: "ENG",
        parentId: null,
        parentName: null,
        headId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
        headName: "Michael Chen",
        memberCount: 45,
        createdAt: "2020-01-01T00:00:00Z",
        updatedAt: "2024-01-15T10:30:00Z"
    },
    {
        id: "dept_mkt_001",
        name: "Marketing",
        code: "MKT",
        parentId: null,
        parentName: null,
        headId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W5B",
        headName: "Robert Wilson",
        memberCount: 12,
        createdAt: "2020-01-01T00:00:00Z",
        updatedAt: "2024-02-01T14:00:00Z"
    },
    {
        id: "dept_design_001",
        name: "Design",
        code: "DSN",
        parentId: "dept_eng_001",
        parentName: "Engineering",
        headId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W4A",
        headName: "Emily Davis",
        memberCount: 8,
        createdAt: "2021-06-15T00:00:00Z",
        updatedAt: "2024-01-20T09:00:00Z"
    }
];

export const ripplingFixtures: TestFixture[] = [
    {
        operationId: "getCompany",
        provider: "rippling",
        validCases: [
            {
                name: "get_company_info",
                description: "Get current company information from Rippling",
                input: {},
                expectedOutput: {
                    id: "comp_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                    name: "Acme Corporation",
                    legalName: "Acme Corporation Inc.",
                    ein: "12-3456789",
                    address: {
                        street1: "123 Market Street",
                        street2: "Suite 400",
                        city: "San Francisco",
                        state: "CA",
                        postalCode: "94105",
                        country: "US"
                    },
                    phone: "+1-415-555-0100",
                    website: "https://www.acmecorp.com",
                    industry: "Technology",
                    employeeCount: 150,
                    foundedYear: 2018
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Invalid or expired API token",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Invalid API token or insufficient permissions",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getEmployee",
        provider: "rippling",
        validCases: [
            {
                name: "get_employee_full_details",
                description: "Get detailed employee information by ID with all fields",
                input: {
                    employeeId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W1X"
                },
                expectedOutput: {
                    id: "emp_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                    displayName: "John Smith",
                    firstName: "John",
                    lastName: "Smith",
                    email: "john.smith@acmecorp.com",
                    personalEmail: "john.personal@gmail.com",
                    phone: "+1-555-123-4567",
                    title: "Senior Software Engineer",
                    department: { id: "dept_eng_001", name: "Engineering" },
                    managerId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
                    managerName: "Sarah Johnson",
                    startDate: "2022-03-15",
                    endDate: null,
                    employmentType: "FULL_TIME",
                    employmentStatus: "ACTIVE",
                    workLocation: { id: "loc_sf_001", name: "San Francisco HQ" },
                    team: { id: "team_platform_001", name: "Platform Team" },
                    flsaStatus: "EXEMPT",
                    isManager: false,
                    createdAt: "2022-03-10T08:00:00Z",
                    updatedAt: "2024-01-15T14:30:00Z"
                }
            },
            {
                name: "get_manager_employee",
                description: "Get employee who is a manager",
                input: {
                    employeeId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W2Y"
                },
                expectedOutput: {
                    id: "emp_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
                    displayName: "Sarah Johnson",
                    firstName: "Sarah",
                    lastName: "Johnson",
                    email: "sarah.johnson@acmecorp.com",
                    personalEmail: null,
                    phone: "+1-555-234-5678",
                    title: "Engineering Manager",
                    department: { id: "dept_eng_001", name: "Engineering" },
                    managerId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
                    managerName: "Michael Chen",
                    startDate: "2021-06-01",
                    endDate: null,
                    employmentType: "FULL_TIME",
                    employmentStatus: "ACTIVE",
                    workLocation: { id: "loc_sf_001", name: "San Francisco HQ" },
                    team: { id: "team_platform_001", name: "Platform Team" },
                    flsaStatus: "EXEMPT",
                    isManager: true,
                    createdAt: "2021-05-25T10:00:00Z",
                    updatedAt: "2024-02-01T09:15:00Z"
                }
            },
            {
                name: "get_terminated_employee",
                description: "Get a terminated employee's information",
                input: {
                    employeeId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W9H"
                },
                expectedOutput: {
                    id: "emp_01H8X9KPZN4Q5R6S7T8U9V0W9H",
                    displayName: "Alex Turner",
                    firstName: "Alex",
                    lastName: "Turner",
                    email: "alex.turner@acmecorp.com",
                    personalEmail: "alex.t@email.com",
                    phone: null,
                    title: "Software Engineer",
                    department: { id: "dept_eng_001", name: "Engineering" },
                    managerId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
                    managerName: "Sarah Johnson",
                    startDate: "2022-08-01",
                    endDate: "2023-12-15",
                    employmentType: "FULL_TIME",
                    employmentStatus: "TERMINATED",
                    workLocation: { id: "loc_sf_001", name: "San Francisco HQ" },
                    team: { id: "team_platform_001", name: "Platform Team" },
                    flsaStatus: "EXEMPT",
                    isManager: false,
                    createdAt: "2022-07-25T09:00:00Z",
                    updatedAt: "2023-12-15T17:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Employee does not exist",
                input: {
                    employeeId: "emp_nonexistent_123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Employee not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    employeeId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W1X"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getLeaveBalances",
        provider: "rippling",
        validCases: [
            {
                name: "get_leave_balances_by_employee",
                description: "Get leave balances for a specific employee",
                input: {
                    employeeId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W1X"
                },
                expectedOutput: {
                    balances: [
                        {
                            employeeId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                            employeeName: "John Smith",
                            policyId: "policy_pto_001",
                            policyName: "Paid Time Off",
                            balance: 12.5,
                            unit: "days",
                            accrued: 15.0,
                            used: 2.5,
                            pending: 0,
                            asOfDate: "2024-01-31"
                        },
                        {
                            employeeId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                            employeeName: "John Smith",
                            policyId: "policy_sick_001",
                            policyName: "Sick Leave",
                            balance: 5.0,
                            unit: "days",
                            accrued: 6.0,
                            used: 1.0,
                            pending: 0,
                            asOfDate: "2024-01-31"
                        }
                    ]
                }
            },
            {
                name: "get_all_leave_balances",
                description: "Get leave balances for all employees",
                input: {},
                expectedOutput: {
                    balances: [
                        {
                            employeeId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                            employeeName: "John Smith",
                            policyId: "policy_pto_001",
                            policyName: "Paid Time Off",
                            balance: 12.5,
                            unit: "days",
                            accrued: 15.0,
                            used: 2.5,
                            pending: 0,
                            asOfDate: "2024-01-31"
                        },
                        {
                            employeeId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
                            employeeName: "Sarah Johnson",
                            policyId: "policy_pto_001",
                            policyName: "Paid Time Off",
                            balance: 18.0,
                            unit: "days",
                            accrued: 20.0,
                            used: 2.0,
                            pending: 3.0,
                            asOfDate: "2024-01-31"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "employee_not_found",
                description: "Employee ID does not exist",
                input: {
                    employeeId: "emp_nonexistent_123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Employee not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listAllEmployees",
        provider: "rippling",
        filterableData: {
            records: sampleEmployees,
            recordsField: "employees",
            offsetField: "nextOffset",
            defaultPageSize: 50,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["_department", "_status", "employmentType"]
            }
        },
        validCases: [
            {
                name: "list_all_employees",
                description: "List all employees including terminated",
                input: {}
            },
            {
                name: "list_employees_with_pagination",
                description: "List employees with custom page size",
                input: {
                    limit: 10,
                    offset: 0
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_pagination",
                description: "Invalid pagination parameters",
                input: {
                    limit: 500
                },
                expectedError: {
                    type: "validation",
                    message: "Limit must be between 1 and 100",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listDepartments",
        provider: "rippling",
        filterableData: {
            records: sampleDepartments,
            recordsField: "departments",
            offsetField: "nextOffset",
            defaultPageSize: 50,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["name", "code"]
            }
        },
        validCases: [
            {
                name: "list_all_departments",
                description: "List all organization departments",
                input: {}
            },
            {
                name: "list_departments_paginated",
                description: "List departments with pagination",
                input: {
                    limit: 10,
                    offset: 0
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_limit",
                description: "Limit exceeds maximum allowed value",
                input: {
                    limit: 200
                },
                expectedError: {
                    type: "validation",
                    message: "Limit must be between 1 and 100",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listEmployees",
        provider: "rippling",
        filterableData: {
            records: sampleEmployees.filter((e) => e.employmentStatus === "ACTIVE"),
            recordsField: "employees",
            offsetField: "nextOffset",
            defaultPageSize: 50,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["_department", "employmentType", "isManager"]
            }
        },
        validCases: [
            {
                name: "list_active_employees",
                description: "List all active employees with pagination",
                input: {}
            },
            {
                name: "list_employees_page_two",
                description: "Get second page of employees",
                input: {
                    limit: 2,
                    offset: 2
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_offset",
                description: "Negative offset not allowed",
                input: {
                    offset: -1
                },
                expectedError: {
                    type: "validation",
                    message: "Offset must be a non-negative integer",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listLeaveRequests",
        provider: "rippling",
        validCases: [
            {
                name: "list_pending_leave_requests",
                description: "Get pending time-off requests",
                input: {
                    status: "PENDING"
                },
                expectedOutput: {
                    leaveRequests: [
                        {
                            id: "leave_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                            employeeId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                            employeeName: "John Smith",
                            leaveType: "PTO",
                            leaveTypeName: "Paid Time Off",
                            startDate: "2024-02-15",
                            endDate: "2024-02-16",
                            totalDays: 2,
                            status: "PENDING",
                            reason: "Family vacation",
                            reviewerId: null,
                            reviewerName: null,
                            reviewedAt: null,
                            createdAt: "2024-01-25T10:30:00Z",
                            updatedAt: null
                        }
                    ],
                    pagination: {
                        total: 1,
                        limit: 50,
                        offset: 0,
                        hasMore: false
                    }
                }
            },
            {
                name: "list_leave_requests_by_date_range",
                description: "Get leave requests for a specific date range",
                input: {
                    startDate: "2024-01-01",
                    endDate: "2024-03-31"
                },
                expectedOutput: {
                    leaveRequests: [
                        {
                            id: "leave_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
                            employeeId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
                            employeeName: "Sarah Johnson",
                            leaveType: "PTO",
                            leaveTypeName: "Paid Time Off",
                            startDate: "2024-01-08",
                            endDate: "2024-01-12",
                            totalDays: 5,
                            status: "APPROVED",
                            reason: "Winter break",
                            reviewerId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
                            reviewerName: "Michael Chen",
                            reviewedAt: "2024-01-02T14:00:00Z",
                            createdAt: "2023-12-20T09:00:00Z",
                            updatedAt: "2024-01-02T14:00:00Z"
                        },
                        {
                            id: "leave_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
                            employeeId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                            employeeName: "John Smith",
                            leaveType: "SICK",
                            leaveTypeName: "Sick Leave",
                            startDate: "2024-02-01",
                            endDate: "2024-02-01",
                            totalDays: 1,
                            status: "APPROVED",
                            reason: "Not feeling well",
                            reviewerId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
                            reviewerName: "Sarah Johnson",
                            reviewedAt: "2024-02-01T08:30:00Z",
                            createdAt: "2024-02-01T07:00:00Z",
                            updatedAt: "2024-02-01T08:30:00Z"
                        }
                    ],
                    pagination: {
                        total: 2,
                        limit: 50,
                        offset: 0,
                        hasMore: false
                    }
                }
            },
            {
                name: "list_all_leave_requests",
                description: "Get all leave requests without filters",
                input: {},
                expectedOutput: {
                    leaveRequests: [
                        {
                            id: "leave_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                            employeeId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                            employeeName: "John Smith",
                            leaveType: "PTO",
                            leaveTypeName: "Paid Time Off",
                            startDate: "2024-02-15",
                            endDate: "2024-02-16",
                            totalDays: 2,
                            status: "PENDING",
                            reason: "Family vacation",
                            reviewerId: null,
                            reviewerName: null,
                            reviewedAt: null,
                            createdAt: "2024-01-25T10:30:00Z",
                            updatedAt: null
                        }
                    ],
                    pagination: {
                        total: 1,
                        limit: 50,
                        offset: 0,
                        hasMore: false
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_date_format",
                description: "Invalid date format provided",
                input: {
                    startDate: "01-15-2024"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listTeams",
        provider: "rippling",
        validCases: [
            {
                name: "list_all_teams",
                description: "List all teams in the organization",
                input: {},
                expectedOutput: {
                    teams: [
                        {
                            id: "team_platform_001",
                            name: "Platform Team",
                            description: "Core platform infrastructure and services",
                            leaderId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
                            leaderName: "Sarah Johnson",
                            memberCount: 8,
                            createdAt: "2021-06-15T00:00:00Z",
                            updatedAt: "2024-01-10T12:00:00Z"
                        },
                        {
                            id: "team_growth_001",
                            name: "Growth Team",
                            description: "Customer acquisition and retention",
                            leaderId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W4A",
                            leaderName: "Emily Davis",
                            memberCount: 5,
                            createdAt: "2023-02-01T00:00:00Z",
                            updatedAt: "2024-02-01T09:00:00Z"
                        },
                        {
                            id: "team_product_001",
                            name: "Product Team",
                            description: "Product design and management",
                            leaderId: null,
                            leaderName: null,
                            memberCount: 3,
                            createdAt: "2023-06-01T00:00:00Z",
                            updatedAt: null
                        }
                    ],
                    pagination: {
                        total: 3,
                        limit: 50,
                        offset: 0,
                        hasMore: false
                    }
                }
            },
            {
                name: "list_teams_paginated",
                description: "List teams with pagination",
                input: {
                    limit: 2,
                    offset: 0
                },
                expectedOutput: {
                    teams: [
                        {
                            id: "team_platform_001",
                            name: "Platform Team",
                            description: "Core platform infrastructure and services",
                            leaderId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
                            leaderName: "Sarah Johnson",
                            memberCount: 8,
                            createdAt: "2021-06-15T00:00:00Z",
                            updatedAt: "2024-01-10T12:00:00Z"
                        },
                        {
                            id: "team_growth_001",
                            name: "Growth Team",
                            description: "Customer acquisition and retention",
                            leaderId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W4A",
                            leaderName: "Emily Davis",
                            memberCount: 5,
                            createdAt: "2023-02-01T00:00:00Z",
                            updatedAt: "2024-02-01T09:00:00Z"
                        }
                    ],
                    pagination: {
                        total: 3,
                        limit: 2,
                        offset: 0,
                        hasMore: true
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Insufficient permissions to list teams",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Insufficient permissions to access team data",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listWorkLocations",
        provider: "rippling",
        validCases: [
            {
                name: "list_all_work_locations",
                description: "List all work locations with addresses",
                input: {},
                expectedOutput: {
                    workLocations: [
                        {
                            id: "loc_sf_001",
                            name: "San Francisco HQ",
                            address: {
                                street1: "123 Market Street",
                                street2: "Suite 400",
                                city: "San Francisco",
                                state: "CA",
                                postalCode: "94105",
                                country: "US"
                            },
                            timezone: "America/Los_Angeles",
                            isPrimary: true,
                            employeeCount: 85
                        },
                        {
                            id: "loc_ny_001",
                            name: "New York Office",
                            address: {
                                street1: "456 Broadway",
                                street2: "Floor 10",
                                city: "New York",
                                state: "NY",
                                postalCode: "10013",
                                country: "US"
                            },
                            timezone: "America/New_York",
                            isPrimary: false,
                            employeeCount: 35
                        },
                        {
                            id: "loc_remote_001",
                            name: "Remote",
                            address: {
                                street1: "N/A",
                                street2: null,
                                city: "N/A",
                                state: null,
                                postalCode: null,
                                country: "US"
                            },
                            timezone: "America/Los_Angeles",
                            isPrimary: false,
                            employeeCount: 30
                        }
                    ],
                    pagination: {
                        total: 3,
                        limit: 50,
                        offset: 0,
                        hasMore: false
                    }
                }
            },
            {
                name: "list_work_locations_paginated",
                description: "List work locations with pagination",
                input: {
                    limit: 1,
                    offset: 0
                },
                expectedOutput: {
                    workLocations: [
                        {
                            id: "loc_sf_001",
                            name: "San Francisco HQ",
                            address: {
                                street1: "123 Market Street",
                                street2: "Suite 400",
                                city: "San Francisco",
                                state: "CA",
                                postalCode: "94105",
                                country: "US"
                            },
                            timezone: "America/Los_Angeles",
                            isPrimary: true,
                            employeeCount: 85
                        }
                    ],
                    pagination: {
                        total: 3,
                        limit: 1,
                        offset: 0,
                        hasMore: true
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Insufficient permissions",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Insufficient permissions to access work location data",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "processLeaveRequest",
        provider: "rippling",
        validCases: [
            {
                name: "approve_leave_request",
                description: "Approve a pending leave request",
                input: {
                    requestId: "leave_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                    action: "approve"
                },
                expectedOutput: {
                    id: "leave_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                    employeeId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                    employeeName: "John Smith",
                    leaveType: "PTO",
                    leaveTypeName: "Paid Time Off",
                    startDate: "2024-02-15",
                    endDate: "2024-02-16",
                    totalDays: 2,
                    status: "APPROVED",
                    reason: "Family vacation",
                    reviewerId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
                    reviewerName: "Sarah Johnson",
                    reviewedAt: "2024-01-26T09:00:00Z",
                    createdAt: "2024-01-25T10:30:00Z",
                    updatedAt: "2024-01-26T09:00:00Z"
                }
            },
            {
                name: "decline_leave_request",
                description: "Decline a pending leave request",
                input: {
                    requestId: "leave_01H8X9KPZN4Q5R6S7T8U9V0W4A",
                    action: "decline"
                },
                expectedOutput: {
                    id: "leave_01H8X9KPZN4Q5R6S7T8U9V0W4A",
                    employeeId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W4A",
                    employeeName: "Emily Davis",
                    leaveType: "PTO",
                    leaveTypeName: "Paid Time Off",
                    startDate: "2024-03-01",
                    endDate: "2024-03-05",
                    totalDays: 5,
                    status: "DECLINED",
                    reason: "Conference attendance",
                    reviewerId: "emp_01H8X9KPZN4Q5R6S7T8U9V0W5B",
                    reviewerName: "Robert Wilson",
                    reviewedAt: "2024-02-20T11:30:00Z",
                    createdAt: "2024-02-15T14:00:00Z",
                    updatedAt: "2024-02-20T11:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Leave request does not exist",
                input: {
                    requestId: "leave_nonexistent_123",
                    action: "approve"
                },
                expectedError: {
                    type: "not_found",
                    message: "Leave request not found",
                    retryable: false
                }
            },
            {
                name: "already_processed",
                description: "Leave request was already processed",
                input: {
                    requestId: "leave_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
                    action: "approve"
                },
                expectedError: {
                    type: "validation",
                    message: "Leave request has already been processed",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    requestId: "leave_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                    action: "approve"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    }
];
