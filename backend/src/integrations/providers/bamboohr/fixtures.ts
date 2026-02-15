/**
 * BambooHR Provider Test Fixtures
 *
 * Based on BambooHR API response types for HR management operations
 */

import type { TestFixture } from "../../sandbox";

/**
 * Sample employees for filterableData
 */
const sampleEmployees = [
    {
        id: "100",
        displayName: "John Smith",
        firstName: "John",
        lastName: "Smith",
        email: "john.smith@acmecorp.com",
        workEmail: "john.smith@acmecorp.com",
        jobTitle: "Senior Software Engineer",
        department: "Engineering",
        division: "Product",
        supervisorId: "101",
        supervisorName: "Sarah Johnson",
        location: "San Francisco",
        status: "Active",
        hireDate: "2022-03-15",
        terminationDate: null,
        _department: "Engineering",
        _status: "Active"
    },
    {
        id: "101",
        displayName: "Sarah Johnson",
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah.johnson@acmecorp.com",
        workEmail: "sarah.johnson@acmecorp.com",
        jobTitle: "Engineering Manager",
        department: "Engineering",
        division: "Product",
        supervisorId: "102",
        supervisorName: "Michael Chen",
        location: "San Francisco",
        status: "Active",
        hireDate: "2021-06-01",
        terminationDate: null,
        _department: "Engineering",
        _status: "Active"
    },
    {
        id: "102",
        displayName: "Michael Chen",
        firstName: "Michael",
        lastName: "Chen",
        email: "michael.chen@acmecorp.com",
        workEmail: "michael.chen@acmecorp.com",
        jobTitle: "VP of Engineering",
        department: "Engineering",
        division: "Product",
        supervisorId: null,
        supervisorName: null,
        location: "San Francisco",
        status: "Active",
        hireDate: "2020-01-15",
        terminationDate: null,
        _department: "Engineering",
        _status: "Active"
    },
    {
        id: "103",
        displayName: "Emily Davis",
        firstName: "Emily",
        lastName: "Davis",
        email: "emily.davis@acmecorp.com",
        workEmail: "emily.davis@acmecorp.com",
        jobTitle: "Marketing Manager",
        department: "Marketing",
        division: "Growth",
        supervisorId: null,
        supervisorName: null,
        location: "New York",
        status: "Active",
        hireDate: "2023-02-01",
        terminationDate: null,
        _department: "Marketing",
        _status: "Active"
    }
];

export const bamboohrFixtures: TestFixture[] = [
    {
        operationId: "listEmployees",
        provider: "bamboohr",
        filterableData: {
            records: sampleEmployees,
            recordsField: "employees",
            offsetField: "nextOffset",
            defaultPageSize: 50,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["_department", "_status"]
            }
        },
        validCases: [
            {
                name: "list_all_employees",
                description: "List all employees in BambooHR",
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
        provider: "bamboohr",
        validCases: [
            {
                name: "get_employee_details",
                description: "Get detailed employee information by ID",
                input: {
                    employeeId: "100"
                },
                expectedOutput: {
                    id: "100",
                    displayName: "John Smith",
                    firstName: "John",
                    lastName: "Smith",
                    email: "john.smith@acmecorp.com",
                    workEmail: "john.smith@acmecorp.com",
                    jobTitle: "Senior Software Engineer",
                    department: "Engineering",
                    division: "Product",
                    supervisorId: "101",
                    supervisorName: "Sarah Johnson",
                    location: "San Francisco",
                    status: "Active",
                    hireDate: "2022-03-15",
                    terminationDate: null,
                    workPhone: "+1-555-123-4567",
                    mobilePhone: "+1-555-987-6543",
                    photoUrl: null
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Employee does not exist",
                input: {
                    employeeId: "999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Employee not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getEmployeeDirectory",
        provider: "bamboohr",
        validCases: [
            {
                name: "get_full_directory",
                description: "Get the full employee directory",
                input: {},
                expectedOutput: {
                    employees: [
                        {
                            id: "100",
                            displayName: "John Smith",
                            firstName: "John",
                            lastName: "Smith",
                            preferredName: null,
                            jobTitle: "Senior Software Engineer",
                            workPhone: "+1-555-123-4567",
                            workEmail: "john.smith@acmecorp.com",
                            department: "Engineering",
                            location: "San Francisco",
                            division: "Product",
                            photoUrl: null
                        },
                        {
                            id: "101",
                            displayName: "Sarah Johnson",
                            firstName: "Sarah",
                            lastName: "Johnson",
                            preferredName: null,
                            jobTitle: "Engineering Manager",
                            workPhone: "+1-555-234-5678",
                            workEmail: "sarah.johnson@acmecorp.com",
                            department: "Engineering",
                            location: "San Francisco",
                            division: "Product",
                            photoUrl: null
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Invalid or expired token",
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
        provider: "bamboohr",
        validCases: [
            {
                name: "get_company_info",
                description: "Get company information",
                input: {},
                expectedOutput: {
                    name: "Acme Corporation",
                    employees: 150,
                    paidTimeOffAllowed: true,
                    timezone: "America/Los_Angeles"
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Invalid or expired token",
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
        provider: "bamboohr",
        validCases: [
            {
                name: "list_pending_requests",
                description: "List pending time off requests",
                input: {
                    status: "requested"
                },
                expectedOutput: {
                    timeOffRequests: [
                        {
                            id: "tor_001",
                            employeeId: "100",
                            employeeName: "John Smith",
                            start: "2024-02-15",
                            end: "2024-02-16",
                            type: { id: "1", name: "Vacation" },
                            amount: { unit: "days", amount: 2 },
                            status: "requested",
                            notes: "Family trip",
                            created: "2024-01-25T10:30:00Z"
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
                name: "list_requests_by_date_range",
                description: "List time off requests for a date range",
                input: {
                    start: "2024-01-01",
                    end: "2024-03-31"
                },
                expectedOutput: {
                    timeOffRequests: [
                        {
                            id: "tor_002",
                            employeeId: "101",
                            employeeName: "Sarah Johnson",
                            start: "2024-01-08",
                            end: "2024-01-12",
                            type: { id: "1", name: "Vacation" },
                            amount: { unit: "days", amount: 5 },
                            status: "approved",
                            notes: "Winter break",
                            created: "2023-12-20T09:00:00Z"
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
                    start: "01-15-2024"
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
        operationId: "createTimeOffRequest",
        provider: "bamboohr",
        validCases: [
            {
                name: "create_vacation_request",
                description: "Create a vacation time off request",
                input: {
                    employeeId: "100",
                    start: "2024-03-01",
                    end: "2024-03-05",
                    timeOffTypeId: "1",
                    amount: 5,
                    notes: "Spring break"
                },
                expectedOutput: {
                    id: "tor_new_001",
                    employeeId: "100",
                    employeeName: "John Smith",
                    start: "2024-03-01",
                    end: "2024-03-05",
                    type: { id: "1", name: "Vacation" },
                    amount: { unit: "days", amount: 5 },
                    status: "requested",
                    notes: "Spring break",
                    created: "2024-02-01T10:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "employee_not_found",
                description: "Employee does not exist",
                input: {
                    employeeId: "999999",
                    start: "2024-03-01",
                    end: "2024-03-05",
                    timeOffTypeId: "1",
                    amount: 5
                },
                expectedError: {
                    type: "not_found",
                    message: "Employee not found",
                    retryable: false
                }
            },
            {
                name: "invalid_time_off_type",
                description: "Time off type does not exist",
                input: {
                    employeeId: "100",
                    start: "2024-03-01",
                    end: "2024-03-05",
                    timeOffTypeId: "999",
                    amount: 5
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid time off type",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getWhosOut",
        provider: "bamboohr",
        validCases: [
            {
                name: "get_whos_out_today",
                description: "Get who's out today",
                input: {},
                expectedOutput: {
                    entries: [
                        {
                            id: "wo_001",
                            type: "timeOff",
                            employeeId: "101",
                            employeeName: "Sarah Johnson",
                            name: "Vacation",
                            start: "2024-02-01",
                            end: "2024-02-02"
                        },
                        {
                            id: "wo_002",
                            type: "holiday",
                            employeeId: null,
                            employeeName: null,
                            name: "Presidents Day",
                            start: "2024-02-19",
                            end: "2024-02-19"
                        }
                    ]
                }
            },
            {
                name: "get_whos_out_date_range",
                description: "Get who's out for a specific date range",
                input: {
                    start: "2024-02-01",
                    end: "2024-02-28"
                },
                expectedOutput: {
                    entries: [
                        {
                            id: "wo_001",
                            type: "timeOff",
                            employeeId: "101",
                            employeeName: "Sarah Johnson",
                            name: "Vacation",
                            start: "2024-02-01",
                            end: "2024-02-02"
                        }
                    ]
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
        operationId: "listTimeOffPolicies",
        provider: "bamboohr",
        validCases: [
            {
                name: "list_all_policies",
                description: "List all time off policies",
                input: {},
                expectedOutput: {
                    policies: [
                        {
                            id: "1",
                            name: "Vacation",
                            type: "vacation",
                            accrualType: "accruing",
                            effectiveDate: "2020-01-01"
                        },
                        {
                            id: "2",
                            name: "Sick Leave",
                            type: "sick",
                            accrualType: "accruing",
                            effectiveDate: "2020-01-01"
                        },
                        {
                            id: "3",
                            name: "Personal Day",
                            type: "personal",
                            accrualType: "manual",
                            effectiveDate: "2020-01-01"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Invalid or expired token",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Invalid API token or insufficient permissions",
                    retryable: false
                }
            }
        ]
    }
];
