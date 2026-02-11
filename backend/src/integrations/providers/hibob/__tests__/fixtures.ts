/**
 * HiBob Provider Test Fixtures
 *
 * Based on HiBob API documentation: https://apidocs.hibob.com/
 */

import type { TestFixture } from "../../../sandbox";

export const hibobFixtures: TestFixture[] = [
    {
        operationId: "listEmployees",
        provider: "hibob",
        filterableData: {
            recordsField: "employees",
            defaultPageSize: 100,
            maxPageSize: 1000,
            filterConfig: {
                type: "generic"
            },
            records: [
                {
                    id: "2345678901",
                    firstName: "Sarah",
                    lastName: "Chen",
                    email: "sarah.chen@example.com",
                    displayName: "Sarah Chen",
                    title: "Senior Software Engineer",
                    department: "Engineering",
                    site: "San Francisco",
                    startDate: "2021-03-15",
                    status: "active",
                    avatarUrl: "https://api.hibob.com/avatars/2345678901.jpg",
                    manager: {
                        id: "1234567890",
                        displayName: "Marcus Johnson",
                        email: "marcus.johnson@example.com"
                    }
                },
                {
                    id: "3456789012",
                    firstName: "Alex",
                    lastName: "Rivera",
                    email: "alex.rivera@example.com",
                    displayName: "Alex Rivera",
                    title: "Product Manager",
                    department: "Product",
                    site: "New York",
                    startDate: "2022-06-01",
                    status: "active",
                    avatarUrl: "https://api.hibob.com/avatars/3456789012.jpg",
                    manager: {
                        id: "1234567890",
                        displayName: "Marcus Johnson",
                        email: "marcus.johnson@example.com"
                    }
                },
                {
                    id: "4567890123",
                    firstName: "Emily",
                    lastName: "Wong",
                    email: "emily.wong@example.com",
                    displayName: "Emily Wong",
                    title: "UX Designer",
                    department: "Design",
                    site: "San Francisco",
                    startDate: "2023-01-10",
                    status: "active",
                    avatarUrl: null,
                    manager: {
                        id: "2345678901",
                        displayName: "Sarah Chen",
                        email: "sarah.chen@example.com"
                    }
                },
                {
                    id: "5678901234",
                    firstName: "James",
                    lastName: "Wilson",
                    email: "james.wilson@example.com",
                    displayName: "James Wilson",
                    title: "Data Analyst",
                    department: "Analytics",
                    site: "Remote",
                    startDate: "2022-09-20",
                    status: "active",
                    avatarUrl: "https://api.hibob.com/avatars/5678901234.jpg",
                    manager: {
                        id: "3456789012",
                        displayName: "Alex Rivera",
                        email: "alex.rivera@example.com"
                    }
                },
                {
                    id: "1234567890",
                    firstName: "Marcus",
                    lastName: "Johnson",
                    email: "marcus.johnson@example.com",
                    displayName: "Marcus Johnson",
                    title: "VP of Engineering",
                    department: "Engineering",
                    site: "San Francisco",
                    startDate: "2019-05-01",
                    status: "active",
                    avatarUrl: "https://api.hibob.com/avatars/1234567890.jpg",
                    manager: null
                }
            ]
        },
        validCases: [
            {
                name: "list_all_employees",
                description: "List all employees in the organization",
                input: {},
                expectedOutput: {
                    employees: [
                        {
                            id: "2345678901",
                            firstName: "Sarah",
                            lastName: "Chen",
                            email: "sarah.chen@example.com",
                            displayName: "Sarah Chen",
                            title: "Senior Software Engineer",
                            department: "Engineering",
                            site: "San Francisco",
                            startDate: "2021-03-15",
                            status: "active",
                            avatarUrl: "https://api.hibob.com/avatars/2345678901.jpg",
                            manager: {
                                id: "1234567890",
                                displayName: "Marcus Johnson",
                                email: "marcus.johnson@example.com"
                            }
                        },
                        {
                            id: "3456789012",
                            firstName: "Alex",
                            lastName: "Rivera",
                            email: "alex.rivera@example.com",
                            displayName: "Alex Rivera",
                            title: "Product Manager",
                            department: "Product",
                            site: "New York",
                            startDate: "2022-06-01",
                            status: "active",
                            avatarUrl: "https://api.hibob.com/avatars/3456789012.jpg",
                            manager: {
                                id: "1234567890",
                                displayName: "Marcus Johnson",
                                email: "marcus.johnson@example.com"
                            }
                        },
                        {
                            id: "4567890123",
                            firstName: "Emily",
                            lastName: "Wong",
                            email: "emily.wong@example.com",
                            displayName: "Emily Wong",
                            title: "UX Designer",
                            department: "Design",
                            site: "San Francisco",
                            startDate: "2023-01-10",
                            status: "active",
                            avatarUrl: null,
                            manager: {
                                id: "2345678901",
                                displayName: "Sarah Chen",
                                email: "sarah.chen@example.com"
                            }
                        }
                    ],
                    total: 5
                }
            },
            {
                name: "list_with_inactive",
                description: "List all employees including inactive",
                input: {
                    showInactive: true
                },
                expectedOutput: {
                    employees: [
                        {
                            id: "2345678901",
                            firstName: "Sarah",
                            lastName: "Chen",
                            email: "sarah.chen@example.com",
                            displayName: "Sarah Chen",
                            title: "Senior Software Engineer",
                            department: "Engineering"
                        }
                    ],
                    total: 6
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_credentials",
                description: "Invalid or expired Service User credentials",
                input: {},
                expectedError: {
                    type: "permission",
                    message:
                        "HiBob credentials are invalid or expired. Please check your Service User ID and Token.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by HiBob. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getEmployee",
        provider: "hibob",
        validCases: [
            {
                name: "get_employee_by_id",
                description: "Get detailed employee information by ID",
                input: {
                    employeeId: "2345678901"
                },
                expectedOutput: {
                    employee: {
                        id: "2345678901",
                        firstName: "Sarah",
                        lastName: "Chen",
                        email: "sarah.chen@example.com",
                        displayName: "Sarah Chen",
                        personal: {
                            birthDate: "1990-05-15",
                            nationality: "United States",
                            gender: "Female"
                        },
                        work: {
                            title: "Senior Software Engineer",
                            department: "Engineering",
                            site: "San Francisco",
                            startDate: "2021-03-15",
                            employmentType: "Full-time",
                            manager: {
                                id: "1234567890",
                                displayName: "Marcus Johnson",
                                email: "marcus.johnson@example.com"
                            }
                        },
                        status: "active",
                        terminationDate: null,
                        avatarUrl: "https://api.hibob.com/avatars/2345678901.jpg",
                        createdAt: "2021-03-10T10:30:00.000Z"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "employee_not_found",
                description: "Employee ID does not exist",
                input: {
                    employeeId: "nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Employee not found: nonexistent123",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "searchEmployees",
        provider: "hibob",
        validCases: [
            {
                name: "search_by_department",
                description: "Search employees by department",
                input: {
                    filters: [
                        {
                            fieldPath: "work.department",
                            operator: "equals",
                            values: ["Engineering"]
                        }
                    ]
                },
                expectedOutput: {
                    employees: [
                        {
                            id: "2345678901",
                            firstName: "Sarah",
                            lastName: "Chen",
                            email: "sarah.chen@example.com",
                            displayName: "Sarah Chen",
                            title: "Senior Software Engineer",
                            department: "Engineering"
                        },
                        {
                            id: "1234567890",
                            firstName: "Marcus",
                            lastName: "Johnson",
                            email: "marcus.johnson@example.com",
                            displayName: "Marcus Johnson",
                            title: "VP of Engineering",
                            department: "Engineering"
                        }
                    ],
                    total: 2
                }
            },
            {
                name: "search_with_field_selection",
                description: "Search with specific fields returned",
                input: {
                    fields: ["firstName", "surname", "email"],
                    filters: [
                        {
                            fieldPath: "work.site",
                            operator: "equals",
                            values: ["San Francisco"]
                        }
                    ]
                },
                expectedOutput: {
                    employees: [
                        {
                            id: "2345678901",
                            firstName: "Sarah",
                            lastName: "Chen",
                            email: "sarah.chen@example.com"
                        },
                        {
                            id: "4567890123",
                            firstName: "Emily",
                            lastName: "Wong",
                            email: "emily.wong@example.com"
                        }
                    ],
                    total: 3
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_filter_field",
                description: "Invalid field path in filter",
                input: {
                    filters: [
                        {
                            fieldPath: "invalid.field.path",
                            operator: "equals",
                            values: ["test"]
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid field path: invalid.field.path",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listTimeOffRequests",
        provider: "hibob",
        validCases: [
            {
                name: "list_employee_requests",
                description: "List all time-off requests for an employee",
                input: {
                    employeeId: "2345678901"
                },
                expectedOutput: {
                    requests: [
                        {
                            id: 101,
                            requestId: 1001,
                            employeeId: "2345678901",
                            employeeDisplayName: "Sarah Chen",
                            policyType: "holiday",
                            policyTypeDisplayName: "Vacation",
                            type: "timeOff",
                            status: "approved",
                            startDate: "2024-02-15",
                            startDatePortion: "all_day",
                            endDate: "2024-02-19",
                            endDatePortion: "all_day",
                            requestedDays: 5,
                            description: "Family vacation",
                            approver: {
                                id: "1234567890",
                                displayName: "Marcus Johnson",
                                email: "marcus.johnson@example.com"
                            },
                            createdAt: "2024-01-20T14:30:00.000Z"
                        },
                        {
                            id: 102,
                            requestId: 1002,
                            employeeId: "2345678901",
                            employeeDisplayName: "Sarah Chen",
                            policyType: "sick",
                            policyTypeDisplayName: "Sick Leave",
                            type: "timeOff",
                            status: "approved",
                            startDate: "2024-01-10",
                            startDatePortion: "all_day",
                            endDate: "2024-01-10",
                            endDatePortion: "all_day",
                            requestedDays: 1,
                            description: "Doctor appointment",
                            approver: null,
                            createdAt: "2024-01-09T08:15:00.000Z"
                        }
                    ],
                    total: 2
                }
            },
            {
                name: "list_requests_with_date_range",
                description: "List time-off requests within a date range",
                input: {
                    employeeId: "2345678901",
                    fromDate: "2024-01-01",
                    toDate: "2024-03-31"
                },
                expectedOutput: {
                    requests: [
                        {
                            id: 101,
                            requestId: 1001,
                            employeeId: "2345678901",
                            employeeDisplayName: "Sarah Chen",
                            policyType: "holiday",
                            policyTypeDisplayName: "Vacation",
                            status: "approved",
                            startDate: "2024-02-15",
                            endDate: "2024-02-19",
                            requestedDays: 5
                        }
                    ],
                    total: 1
                }
            }
        ],
        errorCases: [
            {
                name: "employee_not_found",
                description: "Employee ID does not exist",
                input: {
                    employeeId: "nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Employee not found: nonexistent123",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getTimeOffBalance",
        provider: "hibob",
        validCases: [
            {
                name: "get_all_balances",
                description: "Get all time-off balances for an employee",
                input: {
                    employeeId: "2345678901"
                },
                expectedOutput: {
                    employeeId: "2345678901",
                    balances: [
                        {
                            employeeId: "2345678901",
                            policyType: "holiday",
                            policyTypeDisplayName: "Vacation",
                            balance: 20,
                            used: 5,
                            pending: 3,
                            available: 12,
                            startingBalance: 20,
                            accrued: 0,
                            adjustments: 0
                        },
                        {
                            employeeId: "2345678901",
                            policyType: "sick",
                            policyTypeDisplayName: "Sick Leave",
                            balance: 10,
                            used: 1,
                            pending: 0,
                            available: 9,
                            startingBalance: 10,
                            accrued: 0,
                            adjustments: 0
                        }
                    ]
                }
            },
            {
                name: "get_specific_policy_balance",
                description: "Get balance for a specific policy type",
                input: {
                    employeeId: "2345678901",
                    policyType: "holiday"
                },
                expectedOutput: {
                    employeeId: "2345678901",
                    balances: [
                        {
                            employeeId: "2345678901",
                            policyType: "holiday",
                            policyTypeDisplayName: "Vacation",
                            balance: 20,
                            used: 5,
                            pending: 3,
                            available: 12,
                            startingBalance: 20,
                            accrued: 0,
                            adjustments: 0
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
                    employeeId: "nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Employee not found: nonexistent123",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createTimeOffRequest",
        provider: "hibob",
        validCases: [
            {
                name: "create_vacation_request",
                description: "Create a new vacation request",
                input: {
                    employeeId: "2345678901",
                    policyType: "holiday",
                    startDate: "2024-03-15",
                    endDate: "2024-03-20",
                    description: "Spring break vacation"
                },
                expectedOutput: {
                    id: 103,
                    requestId: 1003,
                    status: "pending",
                    employeeId: "2345678901",
                    policyType: "holiday",
                    startDate: "2024-03-15",
                    endDate: "2024-03-20"
                }
            },
            {
                name: "create_half_day_request",
                description: "Create a half-day time-off request",
                input: {
                    employeeId: "2345678901",
                    policyType: "holiday",
                    startDate: "2024-03-25",
                    startDatePortion: "morning",
                    endDate: "2024-03-25",
                    endDatePortion: "morning",
                    description: "Morning off for personal errand"
                },
                expectedOutput: {
                    id: 104,
                    requestId: 1004,
                    status: "pending",
                    employeeId: "2345678901",
                    policyType: "holiday",
                    startDate: "2024-03-25",
                    endDate: "2024-03-25"
                }
            }
        ],
        errorCases: [
            {
                name: "insufficient_balance",
                description: "Employee does not have enough time-off balance",
                input: {
                    employeeId: "2345678901",
                    policyType: "holiday",
                    startDate: "2024-04-01",
                    endDate: "2024-04-30"
                },
                expectedError: {
                    type: "validation",
                    message: "Insufficient time-off balance for this request",
                    retryable: false
                }
            },
            {
                name: "overlapping_request",
                description: "Request overlaps with existing time-off",
                input: {
                    employeeId: "2345678901",
                    policyType: "holiday",
                    startDate: "2024-02-16",
                    endDate: "2024-02-18"
                },
                expectedError: {
                    type: "validation",
                    message: "Time-off request overlaps with existing request",
                    retryable: false
                }
            },
            {
                name: "employee_not_found",
                description: "Employee ID does not exist",
                input: {
                    employeeId: "nonexistent123",
                    policyType: "holiday",
                    startDate: "2024-03-15",
                    endDate: "2024-03-20"
                },
                expectedError: {
                    type: "not_found",
                    message: "Employee not found: nonexistent123",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getWhosOut",
        provider: "hibob",
        validCases: [
            {
                name: "get_whos_out_week",
                description: "Get employees out during a specific week",
                input: {
                    fromDate: "2024-02-12",
                    toDate: "2024-02-18"
                },
                expectedOutput: {
                    fromDate: "2024-02-12",
                    toDate: "2024-02-18",
                    outEmployees: [
                        {
                            employeeId: "2345678901",
                            employeeDisplayName: "Sarah Chen",
                            policyType: "holiday",
                            policyTypeDisplayName: "Vacation",
                            startDate: "2024-02-15",
                            endDate: "2024-02-19"
                        }
                    ],
                    total: 1
                }
            },
            {
                name: "get_whos_out_today",
                description: "Get employees out today",
                input: {
                    fromDate: "2024-02-15",
                    toDate: "2024-02-15"
                },
                expectedOutput: {
                    fromDate: "2024-02-15",
                    toDate: "2024-02-15",
                    outEmployees: [
                        {
                            employeeId: "2345678901",
                            employeeDisplayName: "Sarah Chen",
                            policyType: "holiday",
                            policyTypeDisplayName: "Vacation",
                            startDate: "2024-02-15",
                            endDate: "2024-02-19"
                        },
                        {
                            employeeId: "3456789012",
                            employeeDisplayName: "Alex Rivera",
                            policyType: "sick",
                            policyTypeDisplayName: "Sick Leave",
                            startDate: "2024-02-15",
                            endDate: "2024-02-15"
                        }
                    ],
                    total: 2
                }
            },
            {
                name: "get_whos_out_empty",
                description: "No employees out during the period",
                input: {
                    fromDate: "2024-12-25",
                    toDate: "2024-12-31"
                },
                expectedOutput: {
                    fromDate: "2024-12-25",
                    toDate: "2024-12-31",
                    outEmployees: [],
                    total: 0
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_date_range",
                description: "Invalid date range - end date before start date",
                input: {
                    fromDate: "2024-02-28",
                    toDate: "2024-02-01"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid date range: toDate must be after fromDate",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    fromDate: "2024-02-01",
                    toDate: "2024-02-28"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by HiBob. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listTimeOffPolicies",
        provider: "hibob",
        validCases: [
            {
                name: "list_all_policies",
                description: "List all time-off policies",
                input: {},
                expectedOutput: {
                    policies: [
                        {
                            name: "Vacation",
                            policyType: "holiday",
                            allowance: 20,
                            unit: "days",
                            isUnlimited: false,
                            accrualPeriod: "yearly"
                        },
                        {
                            name: "Sick Leave",
                            policyType: "sick",
                            allowance: 10,
                            unit: "days",
                            isUnlimited: false,
                            accrualPeriod: "yearly"
                        },
                        {
                            name: "Personal Days",
                            policyType: "personal",
                            allowance: 3,
                            unit: "days",
                            isUnlimited: false,
                            accrualPeriod: "yearly"
                        },
                        {
                            name: "Parental Leave",
                            policyType: "parental",
                            allowance: 12,
                            unit: "days",
                            isUnlimited: false,
                            accrualPeriod: null
                        },
                        {
                            name: "Bereavement",
                            policyType: "bereavement",
                            allowance: 5,
                            unit: "days",
                            isUnlimited: false,
                            accrualPeriod: null
                        }
                    ],
                    total: 5
                }
            }
        ],
        errorCases: [
            {
                name: "permission_denied",
                description: "Insufficient permissions to view policies",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Insufficient permissions to access time-off policies",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by HiBob. Please try again later.",
                    retryable: true
                }
            }
        ]
    }
];
