/**
 * ADP Provider Test Fixtures
 *
 * Based on ADP API response types for HR operations
 */

import type { TestFixture } from "../../sandbox";

/**
 * Sample workers for filterableData
 */
const sampleWorkers = [
    {
        associateOID: "G3XXXXXXXXXXXXXXXXX1",
        workerId: "100001",
        name: "John Smith",
        firstName: "John",
        lastName: "Smith",
        workEmail: "john.smith@acmecorp.com",
        personalEmail: "john.personal@gmail.com",
        phone: "+1-555-123-4567",
        status: "Active",
        hireDate: "2022-03-15",
        terminationDate: null,
        positionTitle: "Senior Software Engineer",
        department: "Engineering",
        workLocation: "San Francisco HQ",
        reportsTo: "Sarah Johnson",
        _department: "Engineering",
        _status: "Active"
    },
    {
        associateOID: "G3XXXXXXXXXXXXXXXXX2",
        workerId: "100002",
        name: "Sarah Johnson",
        firstName: "Sarah",
        lastName: "Johnson",
        workEmail: "sarah.johnson@acmecorp.com",
        personalEmail: null,
        phone: "+1-555-234-5678",
        status: "Active",
        hireDate: "2021-06-01",
        terminationDate: null,
        positionTitle: "Engineering Manager",
        department: "Engineering",
        workLocation: "San Francisco HQ",
        reportsTo: "Michael Chen",
        _department: "Engineering",
        _status: "Active"
    },
    {
        associateOID: "G3XXXXXXXXXXXXXXXXX3",
        workerId: "100003",
        name: "Michael Chen",
        firstName: "Michael",
        lastName: "Chen",
        workEmail: "michael.chen@acmecorp.com",
        personalEmail: "mchen@protonmail.com",
        phone: "+1-555-345-6789",
        status: "Active",
        hireDate: "2020-01-15",
        terminationDate: null,
        positionTitle: "VP of Engineering",
        department: "Engineering",
        workLocation: "San Francisco HQ",
        reportsTo: null,
        _department: "Engineering",
        _status: "Active"
    },
    {
        associateOID: "G3XXXXXXXXXXXXXXXXX4",
        workerId: "100004",
        name: "Emily Davis",
        firstName: "Emily",
        lastName: "Davis",
        workEmail: "emily.davis@acmecorp.com",
        personalEmail: null,
        phone: "+1-555-456-7890",
        status: "Active",
        hireDate: "2023-02-01",
        terminationDate: null,
        positionTitle: "Marketing Manager",
        department: "Marketing",
        workLocation: "New York Office",
        reportsTo: "Robert Wilson",
        _department: "Marketing",
        _status: "Active"
    },
    {
        associateOID: "G3XXXXXXXXXXXXXXXXX5",
        workerId: "100005",
        name: "James Brown",
        firstName: "James",
        lastName: "Brown",
        workEmail: "james.brown@acmecorp.com",
        personalEmail: null,
        phone: null,
        status: "Terminated",
        hireDate: "2022-08-01",
        terminationDate: "2024-01-15",
        positionTitle: "Product Designer",
        department: "Design",
        workLocation: "Remote",
        reportsTo: "Emily Davis",
        _department: "Design",
        _status: "Terminated"
    }
];

export const adpFixtures: TestFixture[] = [
    {
        operationId: "listWorkers",
        provider: "adp",
        filterableData: {
            records: sampleWorkers.filter((w) => w._status === "Active"),
            recordsField: "workers",
            offsetField: "nextOffset",
            defaultPageSize: 50,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["_department", "_status", "positionTitle"]
            }
        },
        validCases: [
            {
                name: "list_all_workers",
                description: "List all active workers",
                input: {}
            },
            {
                name: "list_workers_paginated",
                description: "List workers with pagination",
                input: {
                    limit: 10,
                    offset: 0
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
        operationId: "getWorker",
        provider: "adp",
        validCases: [
            {
                name: "get_worker_by_oid",
                description: "Get a specific worker by associate OID",
                input: {
                    associateOID: "G3XXXXXXXXXXXXXXXXX1"
                },
                expectedOutput: {
                    associateOID: "G3XXXXXXXXXXXXXXXXX1",
                    workerId: "100001",
                    name: "John Smith",
                    firstName: "John",
                    lastName: "Smith",
                    workEmail: "john.smith@acmecorp.com",
                    personalEmail: "john.personal@gmail.com",
                    phone: "+1-555-123-4567",
                    status: "Active",
                    hireDate: "2022-03-15",
                    terminationDate: null,
                    positionTitle: "Senior Software Engineer",
                    department: "Engineering",
                    workLocation: "San Francisco HQ",
                    reportsTo: "Sarah Johnson"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Worker does not exist",
                input: {
                    associateOID: "INVALID_OID"
                },
                expectedError: {
                    type: "not_found",
                    message: "Worker not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    associateOID: "G3XXXXXXXXXXXXXXXXX1"
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
        operationId: "listDepartments",
        provider: "adp",
        validCases: [
            {
                name: "list_all_departments",
                description: "List all organization departments",
                input: {},
                expectedOutput: {
                    departments: [
                        {
                            code: "ENG",
                            shortName: "Engineering",
                            longName: "Engineering Department",
                            parentCode: null
                        },
                        {
                            code: "MKT",
                            shortName: "Marketing",
                            longName: "Marketing Department",
                            parentCode: null
                        },
                        {
                            code: "DSN",
                            shortName: "Design",
                            longName: "Design Department",
                            parentCode: "ENG"
                        }
                    ]
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
            }
        ]
    },
    {
        operationId: "getCompanyInfo",
        provider: "adp",
        validCases: [
            {
                name: "get_company_info",
                description: "Get organization-level company information",
                input: {},
                expectedOutput: {
                    totalDepartments: 3,
                    departments: [
                        {
                            code: "ENG",
                            shortName: "Engineering",
                            longName: "Engineering Department",
                            parentCode: null
                        },
                        {
                            code: "MKT",
                            shortName: "Marketing",
                            longName: "Marketing Department",
                            parentCode: null
                        },
                        {
                            code: "DSN",
                            shortName: "Design",
                            longName: "Design Department",
                            parentCode: "ENG"
                        }
                    ]
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
            }
        ]
    },
    {
        operationId: "listTimeOffRequests",
        provider: "adp",
        validCases: [
            {
                name: "list_time_off_requests",
                description: "List time off requests for a worker",
                input: {
                    associateOID: "G3XXXXXXXXXXXXXXXXX1"
                },
                expectedOutput: {
                    timeOffRequests: [
                        {
                            id: "TOR-001",
                            workerAssociateOID: "G3XXXXXXXXXXXXXXXXX1",
                            policyCode: "PTO",
                            policyName: "Paid Time Off",
                            startDate: "2024-02-15",
                            endDate: "2024-02-16",
                            quantity: 2,
                            unit: "Day",
                            status: "Approved",
                            submittedAt: "2024-01-25T10:30:00Z",
                            comments: "Family vacation"
                        }
                    ]
                }
            },
            {
                name: "list_time_off_requests_with_dates",
                description: "List time off requests filtered by date range",
                input: {
                    associateOID: "G3XXXXXXXXXXXXXXXXX1",
                    startDate: "2024-01-01",
                    endDate: "2024-06-30"
                },
                expectedOutput: {
                    timeOffRequests: [
                        {
                            id: "TOR-001",
                            workerAssociateOID: "G3XXXXXXXXXXXXXXXXX1",
                            policyCode: "PTO",
                            policyName: "Paid Time Off",
                            startDate: "2024-02-15",
                            endDate: "2024-02-16",
                            quantity: 2,
                            unit: "Day",
                            status: "Approved",
                            submittedAt: "2024-01-25T10:30:00Z",
                            comments: "Family vacation"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "worker_not_found",
                description: "Worker associate OID does not exist",
                input: {
                    associateOID: "INVALID_OID"
                },
                expectedError: {
                    type: "not_found",
                    message: "Worker not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getTimeOffBalances",
        provider: "adp",
        validCases: [
            {
                name: "get_time_off_balances",
                description: "Get time off balances for a worker",
                input: {
                    associateOID: "G3XXXXXXXXXXXXXXXXX1"
                },
                expectedOutput: {
                    balances: [
                        {
                            policyCode: "PTO",
                            policyName: "Paid Time Off",
                            asOfDate: "2024-01-31",
                            balance: 12.5,
                            used: 2.5,
                            planned: 0,
                            unit: "Day"
                        },
                        {
                            policyCode: "SICK",
                            policyName: "Sick Leave",
                            asOfDate: "2024-01-31",
                            balance: 5.0,
                            used: 1.0,
                            planned: 0,
                            unit: "Day"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "worker_not_found",
                description: "Worker associate OID does not exist",
                input: {
                    associateOID: "INVALID_OID"
                },
                expectedError: {
                    type: "not_found",
                    message: "Worker not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createTimeOffRequest",
        provider: "adp",
        validCases: [
            {
                name: "create_time_off_request",
                description: "Create a new time off request",
                input: {
                    associateOID: "G3XXXXXXXXXXXXXXXXX1",
                    policyCode: "PTO",
                    startDate: "2024-03-15",
                    endDate: "2024-03-17",
                    comments: "Spring break"
                },
                expectedOutput: {
                    id: "TOR-002",
                    workerAssociateOID: "G3XXXXXXXXXXXXXXXXX1",
                    policyCode: "PTO",
                    policyName: "Paid Time Off",
                    startDate: "2024-03-15",
                    endDate: "2024-03-17",
                    quantity: 3,
                    unit: "Day",
                    status: "Pending",
                    submittedAt: "2024-02-20T14:00:00Z",
                    comments: "Spring break"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_dates",
                description: "End date before start date",
                input: {
                    associateOID: "G3XXXXXXXXXXXXXXXXX1",
                    policyCode: "PTO",
                    startDate: "2024-03-17",
                    endDate: "2024-03-15"
                },
                expectedError: {
                    type: "validation",
                    message: "End date must be after start date",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listPayStatements",
        provider: "adp",
        validCases: [
            {
                name: "list_pay_statements",
                description: "List pay statements for a worker",
                input: {
                    associateOID: "G3XXXXXXXXXXXXXXXXX1"
                },
                expectedOutput: {
                    payStatements: [
                        {
                            id: "PS-001",
                            payDate: "2024-01-31",
                            periodStart: "2024-01-16",
                            periodEnd: "2024-01-31",
                            grossPay: 5000.0,
                            netPay: 3750.0,
                            currency: "USD"
                        },
                        {
                            id: "PS-002",
                            payDate: "2024-01-15",
                            periodStart: "2024-01-01",
                            periodEnd: "2024-01-15",
                            grossPay: 5000.0,
                            netPay: 3750.0,
                            currency: "USD"
                        }
                    ]
                }
            },
            {
                name: "list_pay_statements_with_dates",
                description: "List pay statements filtered by date range",
                input: {
                    associateOID: "G3XXXXXXXXXXXXXXXXX1",
                    startDate: "2024-01-01",
                    endDate: "2024-01-31"
                },
                expectedOutput: {
                    payStatements: [
                        {
                            id: "PS-001",
                            payDate: "2024-01-31",
                            periodStart: "2024-01-16",
                            periodEnd: "2024-01-31",
                            grossPay: 5000.0,
                            netPay: 3750.0,
                            currency: "USD"
                        },
                        {
                            id: "PS-002",
                            payDate: "2024-01-15",
                            periodStart: "2024-01-01",
                            periodEnd: "2024-01-15",
                            grossPay: 5000.0,
                            netPay: 3750.0,
                            currency: "USD"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "worker_not_found",
                description: "Worker associate OID does not exist",
                input: {
                    associateOID: "INVALID_OID"
                },
                expectedError: {
                    type: "not_found",
                    message: "Worker not found",
                    retryable: false
                }
            }
        ]
    }
];
