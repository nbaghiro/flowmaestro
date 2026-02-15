/**
 * Deel Provider Test Fixtures
 *
 * Based on Deel API response types for HR operations
 */

import type { TestFixture } from "../../sandbox";

/**
 * Sample people for filterableData
 */
const samplePeople = [
    {
        id: "person_01H8X9KPZN4Q5R6S7T8U9V0W1X",
        displayName: "John Smith",
        firstName: "John",
        lastName: "Smith",
        email: "john.smith@acmecorp.com",
        workerType: "employee",
        status: "active",
        hireDate: "2022-03-15",
        terminationDate: null,
        department: "Engineering",
        jobTitle: "Senior Software Engineer",
        country: "US",
        currency: "USD",
        managerId: "person_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
        _workerType: "employee",
        _status: "active"
    },
    {
        id: "person_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
        displayName: "Sarah Johnson",
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah.johnson@acmecorp.com",
        workerType: "employee",
        status: "active",
        hireDate: "2021-06-01",
        terminationDate: null,
        department: "Engineering",
        jobTitle: "Engineering Manager",
        country: "US",
        currency: "USD",
        managerId: null,
        _workerType: "employee",
        _status: "active"
    },
    {
        id: "person_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
        displayName: "Carlos Mendez",
        firstName: "Carlos",
        lastName: "Mendez",
        email: "carlos.mendez@contractor.com",
        workerType: "contractor",
        status: "active",
        hireDate: "2023-09-01",
        terminationDate: null,
        department: "Design",
        jobTitle: "Product Designer",
        country: "MX",
        currency: "USD",
        managerId: "person_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
        _workerType: "contractor",
        _status: "active"
    },
    {
        id: "person_01H8X9KPZN4Q5R6S7T8U9V0W4A",
        displayName: "Emma Wilson",
        firstName: "Emma",
        lastName: "Wilson",
        email: "emma.wilson@acmecorp.com",
        workerType: "eor",
        status: "active",
        hireDate: "2023-01-15",
        terminationDate: null,
        department: "Marketing",
        jobTitle: "Marketing Specialist",
        country: "DE",
        currency: "EUR",
        managerId: null,
        _workerType: "eor",
        _status: "active"
    },
    {
        id: "person_01H8X9KPZN4Q5R6S7T8U9V0W5B",
        displayName: "Alex Turner",
        firstName: "Alex",
        lastName: "Turner",
        email: "alex.turner@acmecorp.com",
        workerType: "employee",
        status: "inactive",
        hireDate: "2022-08-01",
        terminationDate: "2023-12-15",
        department: "Engineering",
        jobTitle: "Software Engineer",
        country: "US",
        currency: "USD",
        managerId: "person_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
        _workerType: "employee",
        _status: "inactive"
    }
];

/**
 * Sample contracts for filterableData
 */
const sampleContracts = [
    {
        id: "contract_01H8X9KPZN4Q5R6S7T8U9V0W1X",
        personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W1X",
        personName: "John Smith",
        type: "employee",
        status: "active",
        startDate: "2022-03-15",
        endDate: null,
        compensation: {
            amount: 150000,
            currency: "USD",
            frequency: "annually"
        },
        jobTitle: "Senior Software Engineer",
        scopeOfWork: null,
        country: "US",
        createdAt: "2022-03-10T08:00:00Z",
        updatedAt: "2024-01-15T14:30:00Z",
        _type: "employee",
        _status: "active"
    },
    {
        id: "contract_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
        personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
        personName: "Carlos Mendez",
        type: "contractor",
        status: "active",
        startDate: "2023-09-01",
        endDate: "2024-08-31",
        compensation: {
            amount: 75,
            currency: "USD",
            frequency: "hourly"
        },
        jobTitle: "Product Designer",
        scopeOfWork: "UI/UX design for web and mobile applications",
        country: "MX",
        createdAt: "2023-08-25T10:00:00Z",
        updatedAt: null,
        _type: "contractor",
        _status: "active"
    },
    {
        id: "contract_01H8X9KPZN4Q5R6S7T8U9V0W4A",
        personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W4A",
        personName: "Emma Wilson",
        type: "eor",
        status: "active",
        startDate: "2023-01-15",
        endDate: null,
        compensation: {
            amount: 72000,
            currency: "EUR",
            frequency: "annually"
        },
        jobTitle: "Marketing Specialist",
        scopeOfWork: null,
        country: "DE",
        createdAt: "2023-01-10T09:00:00Z",
        updatedAt: "2024-02-01T11:00:00Z",
        _type: "eor",
        _status: "active"
    }
];

export const deelFixtures: TestFixture[] = [
    {
        operationId: "getPerson",
        provider: "deel",
        validCases: [
            {
                name: "get_employee",
                description: "Get detailed information for an employee",
                input: {
                    personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W1X"
                },
                expectedOutput: {
                    id: "person_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                    displayName: "John Smith",
                    firstName: "John",
                    lastName: "Smith",
                    email: "john.smith@acmecorp.com",
                    workerType: "employee",
                    status: "active",
                    hireDate: "2022-03-15",
                    terminationDate: null,
                    department: "Engineering",
                    jobTitle: "Senior Software Engineer",
                    country: "US",
                    currency: "USD",
                    managerId: "person_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
                    createdAt: "2022-03-10T08:00:00Z",
                    updatedAt: "2024-01-15T14:30:00Z"
                }
            },
            {
                name: "get_contractor",
                description: "Get detailed information for a contractor",
                input: {
                    personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W3Z"
                },
                expectedOutput: {
                    id: "person_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
                    displayName: "Carlos Mendez",
                    firstName: "Carlos",
                    lastName: "Mendez",
                    email: "carlos.mendez@contractor.com",
                    workerType: "contractor",
                    status: "active",
                    hireDate: "2023-09-01",
                    terminationDate: null,
                    department: "Design",
                    jobTitle: "Product Designer",
                    country: "MX",
                    currency: "USD",
                    managerId: "person_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
                    createdAt: "2023-08-25T10:00:00Z",
                    updatedAt: null
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Person does not exist",
                input: {
                    personId: "person_nonexistent_123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Person not found",
                    retryable: false
                }
            },
            {
                name: "unauthorized",
                description: "Invalid or expired API token",
                input: {
                    personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W1X"
                },
                expectedError: {
                    type: "permission",
                    message: "Invalid API token or insufficient permissions",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getContract",
        provider: "deel",
        validCases: [
            {
                name: "get_employee_contract",
                description: "Get detailed contract information for an employee",
                input: {
                    contractId: "contract_01H8X9KPZN4Q5R6S7T8U9V0W1X"
                },
                expectedOutput: {
                    id: "contract_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                    personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                    personName: "John Smith",
                    type: "employee",
                    status: "active",
                    startDate: "2022-03-15",
                    endDate: null,
                    compensation: {
                        amount: 150000,
                        currency: "USD",
                        frequency: "annually"
                    },
                    jobTitle: "Senior Software Engineer",
                    scopeOfWork: null,
                    country: "US",
                    createdAt: "2022-03-10T08:00:00Z",
                    updatedAt: "2024-01-15T14:30:00Z"
                }
            },
            {
                name: "get_contractor_contract",
                description: "Get detailed contract information for a contractor",
                input: {
                    contractId: "contract_01H8X9KPZN4Q5R6S7T8U9V0W3Z"
                },
                expectedOutput: {
                    id: "contract_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
                    personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
                    personName: "Carlos Mendez",
                    type: "contractor",
                    status: "active",
                    startDate: "2023-09-01",
                    endDate: "2024-08-31",
                    compensation: {
                        amount: 75,
                        currency: "USD",
                        frequency: "hourly"
                    },
                    jobTitle: "Product Designer",
                    scopeOfWork: "UI/UX design for web and mobile applications",
                    country: "MX",
                    createdAt: "2023-08-25T10:00:00Z",
                    updatedAt: null
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Contract does not exist",
                input: {
                    contractId: "contract_nonexistent_123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Contract not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listPeople",
        provider: "deel",
        filterableData: {
            records: samplePeople,
            recordsField: "people",
            offsetField: "nextPage",
            defaultPageSize: 50,
            maxPageSize: 100,
            pageSizeParam: "pageSize",
            filterConfig: {
                type: "generic",
                filterableFields: ["_workerType", "_status", "department"]
            }
        },
        validCases: [
            {
                name: "list_all_people",
                description: "List all workers with default pagination",
                input: {}
            },
            {
                name: "list_with_pagination",
                description: "List workers with custom page size",
                input: {
                    page: 1,
                    pageSize: 10
                }
            },
            {
                name: "list_employees_only",
                description: "List only employees",
                input: {
                    workerType: "employee"
                }
            },
            {
                name: "list_active_contractors",
                description: "List active contractors",
                input: {
                    workerType: "contractor",
                    status: "active"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_page_size",
                description: "Page size exceeds maximum",
                input: {
                    pageSize: 500
                },
                expectedError: {
                    type: "validation",
                    message: "Page size must be between 1 and 100",
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
        operationId: "listContracts",
        provider: "deel",
        filterableData: {
            records: sampleContracts,
            recordsField: "contracts",
            offsetField: "nextPage",
            defaultPageSize: 50,
            maxPageSize: 100,
            pageSizeParam: "pageSize",
            filterConfig: {
                type: "generic",
                filterableFields: ["_type", "_status"]
            }
        },
        validCases: [
            {
                name: "list_all_contracts",
                description: "List all contracts with default pagination",
                input: {}
            },
            {
                name: "list_active_contracts",
                description: "List only active contracts",
                input: {
                    status: "active"
                }
            },
            {
                name: "list_contractor_contracts",
                description: "List only contractor-type contracts",
                input: {
                    type: "contractor"
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
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getTimeOffBalance",
        provider: "deel",
        validCases: [
            {
                name: "get_employee_balance",
                description: "Get time off balance for an employee",
                input: {
                    personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W1X"
                },
                expectedOutput: {
                    entitlements: [
                        {
                            personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                            personName: "John Smith",
                            policyId: "policy_pto_001",
                            policyName: "Paid Time Off",
                            balance: 15.5,
                            unit: "days",
                            accrued: 20.0,
                            used: 4.5,
                            pending: 0,
                            asOfDate: "2024-01-31"
                        },
                        {
                            personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                            personName: "John Smith",
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
            }
        ],
        errorCases: [
            {
                name: "person_not_found",
                description: "Person does not exist",
                input: {
                    personId: "person_nonexistent_123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Person not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listTimeOffRequests",
        provider: "deel",
        validCases: [
            {
                name: "list_all_requests",
                description: "List all time off requests for a person",
                input: {
                    personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W1X"
                },
                expectedOutput: {
                    timeOffRequests: [
                        {
                            id: "timeoff_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                            personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                            personName: "John Smith",
                            type: "pto",
                            typeName: "Paid Time Off",
                            startDate: "2024-02-15",
                            endDate: "2024-02-16",
                            totalDays: 2,
                            status: "approved",
                            reason: "Family vacation",
                            reviewerId: "person_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
                            reviewerName: "Sarah Johnson",
                            reviewedAt: "2024-01-26T09:00:00Z",
                            createdAt: "2024-01-25T10:30:00Z",
                            updatedAt: "2024-01-26T09:00:00Z"
                        }
                    ],
                    pagination: {
                        total: 1,
                        page: 1,
                        pageSize: 50,
                        totalPages: 1,
                        hasMore: false
                    }
                }
            },
            {
                name: "list_pending_requests",
                description: "List only pending time off requests",
                input: {
                    personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                    status: "pending"
                },
                expectedOutput: {
                    timeOffRequests: [],
                    pagination: {
                        total: 0,
                        page: 1,
                        pageSize: 50,
                        totalPages: 0,
                        hasMore: false
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "person_not_found",
                description: "Person does not exist",
                input: {
                    personId: "person_nonexistent_123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Person not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createTimeOffRequest",
        provider: "deel",
        validCases: [
            {
                name: "create_pto_request",
                description: "Create a new PTO request",
                input: {
                    personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                    type: "pto",
                    startDate: "2024-03-01",
                    endDate: "2024-03-05",
                    reason: "Spring vacation"
                },
                expectedOutput: {
                    id: "timeoff_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
                    personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                    personName: "John Smith",
                    type: "pto",
                    typeName: "Paid Time Off",
                    startDate: "2024-03-01",
                    endDate: "2024-03-05",
                    totalDays: 5,
                    status: "pending",
                    reason: "Spring vacation",
                    createdAt: "2024-02-15T10:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_dates",
                description: "End date is before start date",
                input: {
                    personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                    type: "pto",
                    startDate: "2024-03-05",
                    endDate: "2024-03-01"
                },
                expectedError: {
                    type: "validation",
                    message: "End date must be after start date",
                    retryable: false
                }
            },
            {
                name: "insufficient_balance",
                description: "Not enough time off balance",
                input: {
                    personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                    type: "pto",
                    startDate: "2024-03-01",
                    endDate: "2024-03-31"
                },
                expectedError: {
                    type: "validation",
                    message: "Insufficient time off balance",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listTimesheets",
        provider: "deel",
        validCases: [
            {
                name: "list_all_timesheets",
                description: "List all timesheets",
                input: {},
                expectedOutput: {
                    timesheets: [
                        {
                            id: "timesheet_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                            personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
                            personName: "Carlos Mendez",
                            contractId: "contract_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
                            periodStart: "2024-01-01",
                            periodEnd: "2024-01-31",
                            status: "approved",
                            totalHours: 160,
                            totalAmount: 12000,
                            currency: "USD",
                            submittedAt: "2024-02-01T08:00:00Z",
                            approvedAt: "2024-02-03T10:00:00Z",
                            createdAt: "2024-01-01T00:00:00Z",
                            updatedAt: "2024-02-03T10:00:00Z"
                        }
                    ],
                    pagination: {
                        total: 1,
                        page: 1,
                        pageSize: 50,
                        totalPages: 1,
                        hasMore: false
                    }
                }
            },
            {
                name: "list_timesheets_by_person",
                description: "List timesheets for a specific contractor",
                input: {
                    personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W3Z"
                },
                expectedOutput: {
                    timesheets: [
                        {
                            id: "timesheet_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                            personId: "person_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
                            personName: "Carlos Mendez",
                            contractId: "contract_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
                            periodStart: "2024-01-01",
                            periodEnd: "2024-01-31",
                            status: "approved",
                            totalHours: 160,
                            totalAmount: 12000,
                            currency: "USD",
                            submittedAt: "2024-02-01T08:00:00Z",
                            approvedAt: "2024-02-03T10:00:00Z",
                            createdAt: "2024-01-01T00:00:00Z",
                            updatedAt: "2024-02-03T10:00:00Z"
                        }
                    ],
                    pagination: {
                        total: 1,
                        page: 1,
                        pageSize: 50,
                        totalPages: 1,
                        hasMore: false
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
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    }
];
