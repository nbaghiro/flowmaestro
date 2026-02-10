/**
 * Workday Provider Test Fixtures
 *
 * Based on Workday REST API documentation for Human Capital Management (HCM):
 * - Workers API
 * - Time Off / Absence API
 * - Pay Groups API
 * - Organization API
 */

import type { TestFixture } from "../../../sandbox";

/**
 * Sample workers for test data
 */
const sampleWorkers = [
    {
        id: "3aa5550b7fe348b98d7b5741afc65534",
        workerId: "WRK-001234",
        firstName: "Sarah",
        lastName: "Johnson",
        fullName: "Sarah Johnson",
        email: "sarah.johnson@flowmaestro.com",
        businessTitle: "Senior Software Engineer",
        department: "Engineering",
        supervisorId: "2bb4440a6ed237a87c6a4630beb54423",
        supervisorName: "Michael Chen",
        hireDate: "2021-03-15",
        terminationDate: null,
        workerType: "Regular",
        location: "San Francisco, CA",
        employeeStatus: "Active",
        managementLevel: null,
        timeType: "Full-time",
        payType: "Salaried"
    },
    {
        id: "4cc6661c8gf459c09e8c6852bgf76645",
        workerId: "WRK-001235",
        firstName: "James",
        lastName: "Wilson",
        fullName: "James Wilson",
        email: "james.wilson@flowmaestro.com",
        businessTitle: "Product Manager",
        department: "Product",
        supervisorId: "5dd7772d9hg560d10f9d7963chg87756",
        supervisorName: "Emily Davis",
        hireDate: "2020-08-01",
        terminationDate: null,
        workerType: "Regular",
        location: "New York, NY",
        employeeStatus: "Active",
        managementLevel: "Manager",
        timeType: "Full-time",
        payType: "Salaried"
    }
];

export const workdayFixtures: TestFixture[] = [
    {
        operationId: "getWorker",
        provider: "workday",
        validCases: [
            {
                name: "get_worker_by_id",
                description: "Get detailed worker information by worker ID",
                input: {
                    workerId: "3aa5550b7fe348b98d7b5741afc65534"
                },
                expectedOutput: {
                    id: "3aa5550b7fe348b98d7b5741afc65534",
                    workerId: "WRK-001234",
                    firstName: "Sarah",
                    lastName: "Johnson",
                    fullName: "Sarah Johnson",
                    email: "sarah.johnson@flowmaestro.com",
                    businessTitle: "Senior Software Engineer",
                    department: "Engineering",
                    supervisorId: "2bb4440a6ed237a87c6a4630beb54423",
                    supervisorName: "Michael Chen",
                    hireDate: "2021-03-15",
                    terminationDate: null,
                    workerType: "Regular",
                    location: "San Francisco, CA",
                    employeeStatus: "Active",
                    managementLevel: null,
                    timeType: "Full-time",
                    payType: "Salaried",
                    jobProfile: {
                        id: "JP-ENG-003",
                        name: "Senior Software Engineer",
                        jobFamily: "Software Engineering",
                        jobFamilyGroup: "Technology",
                        jobCategory: "Individual Contributor",
                        managementLevel: null
                    },
                    compensation: {
                        basePay: 165000,
                        currency: "USD",
                        frequency: "Annual",
                        effectiveDate: "2024-01-01"
                    },
                    organization: {
                        id: "ORG-ENG-001",
                        name: "Engineering Department",
                        type: "Cost Center",
                        parentId: "ORG-TECH-001"
                    },
                    customFields: {}
                }
            },
            {
                name: "get_manager",
                description: "Get worker information for a manager",
                input: {
                    workerId: "2bb4440a6ed237a87c6a4630beb54423"
                },
                expectedOutput: {
                    id: "2bb4440a6ed237a87c6a4630beb54423",
                    workerId: "WRK-001100",
                    firstName: "Michael",
                    lastName: "Chen",
                    fullName: "Michael Chen",
                    email: "michael.chen@flowmaestro.com",
                    businessTitle: "Engineering Director",
                    department: "Engineering",
                    supervisorId: "1aa3330z5dc126z76b5z3520adc43312",
                    supervisorName: "Lisa Park",
                    hireDate: "2019-01-10",
                    terminationDate: null,
                    workerType: "Regular",
                    location: "San Francisco, CA",
                    employeeStatus: "Active",
                    managementLevel: "Director",
                    timeType: "Full-time",
                    payType: "Salaried",
                    jobProfile: {
                        id: "JP-ENG-001",
                        name: "Engineering Director",
                        jobFamily: "Engineering Management",
                        jobFamilyGroup: "Technology",
                        jobCategory: "Manager",
                        managementLevel: "Director"
                    },
                    compensation: {
                        basePay: 250000,
                        currency: "USD",
                        frequency: "Annual",
                        effectiveDate: "2024-01-01"
                    },
                    organization: {
                        id: "ORG-ENG-001",
                        name: "Engineering Department",
                        type: "Cost Center",
                        parentId: "ORG-TECH-001"
                    },
                    customFields: {
                        directReports: 12
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "worker_not_found",
                description: "Worker with the given ID does not exist",
                input: {
                    workerId: "nonexistent-worker-id-12345"
                },
                expectedError: {
                    type: "not_found",
                    message: "Worker not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for Workday API",
                input: {
                    workerId: "3aa5550b7fe348b98d7b5741afc65534"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listWorkers",
        provider: "workday",
        validCases: [
            {
                name: "list_all_workers",
                description: "List all workers with default pagination",
                input: {
                    limit: 20
                },
                expectedOutput: {
                    workers: sampleWorkers,
                    pagination: {
                        total: 156,
                        offset: 0,
                        limit: 20
                    }
                }
            },
            {
                name: "list_workers_with_offset",
                description: "List workers with pagination offset",
                input: {
                    limit: 10,
                    offset: 20
                },
                expectedOutput: {
                    workers: [sampleWorkers[0]],
                    pagination: {
                        total: 156,
                        offset: 20,
                        limit: 10
                    }
                }
            },
            {
                name: "list_workers_small_page",
                description: "List workers with small page size",
                input: {
                    limit: 5
                },
                expectedOutput: {
                    workers: sampleWorkers,
                    pagination: {
                        total: 156,
                        offset: 0,
                        limit: 5
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_limit",
                description: "Limit exceeds maximum allowed value",
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
                input: {
                    limit: 20
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getCompanyInfo",
        provider: "workday",
        validCases: [
            {
                name: "get_company_info",
                description: "Get organization details from Workday",
                input: {},
                expectedOutput: {
                    id: "ORG-FM-001",
                    name: "FlowMaestro Inc",
                    legalName: "FlowMaestro Inc.",
                    industry: "Software & Technology",
                    country: "United States",
                    headquarters: "San Francisco, CA",
                    employeeCount: 156,
                    foundedYear: 2020,
                    website: "https://flowmaestro.com",
                    fiscalYearStartMonth: 1
                }
            },
            {
                name: "get_company_info_complete",
                description: "Get full company information including all fields",
                input: {},
                expectedOutput: {
                    id: "ORG-FM-001",
                    name: "FlowMaestro Inc",
                    legalName: "FlowMaestro Inc.",
                    industry: "Software & Technology",
                    country: "United States",
                    headquarters: "San Francisco, CA",
                    employeeCount: 156,
                    foundedYear: 2020,
                    website: "https://flowmaestro.com",
                    fiscalYearStartMonth: 1
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Not authorized to access company information",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Insufficient permissions to access company information",
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
        operationId: "requestTimeOff",
        provider: "workday",
        validCases: [
            {
                name: "request_vacation",
                description: "Submit a vacation time-off request",
                input: {
                    workerId: "3aa5550b7fe348b98d7b5741afc65534",
                    startDate: "2024-03-15",
                    endDate: "2024-03-22",
                    absenceType: "ABS-VAC-001",
                    comment: "Annual family vacation"
                },
                expectedOutput: {
                    id: "TOR-2024-001234",
                    workerId: "3aa5550b7fe348b98d7b5741afc65534",
                    workerName: "Sarah Johnson",
                    absenceTypeId: "ABS-VAC-001",
                    absenceTypeName: "Vacation",
                    startDate: "2024-03-15",
                    endDate: "2024-03-22",
                    totalDays: 6,
                    status: "pending",
                    comment: "Annual family vacation",
                    approverName: "Michael Chen",
                    createdAt: "2024-01-15T10:30:00Z"
                }
            },
            {
                name: "request_sick_leave",
                description: "Submit a sick leave request",
                input: {
                    workerId: "4cc6661c8gf459c09e8c6852bgf76645",
                    startDate: "2024-01-20",
                    endDate: "2024-01-20",
                    absenceType: "ABS-SICK-001"
                },
                expectedOutput: {
                    id: "TOR-2024-001235",
                    workerId: "4cc6661c8gf459c09e8c6852bgf76645",
                    workerName: "James Wilson",
                    absenceTypeId: "ABS-SICK-001",
                    absenceTypeName: "Sick Leave",
                    startDate: "2024-01-20",
                    endDate: "2024-01-20",
                    totalDays: 1,
                    status: "pending",
                    comment: null,
                    approverName: "Emily Davis",
                    createdAt: "2024-01-20T08:15:00Z"
                }
            },
            {
                name: "request_personal_day",
                description: "Submit a personal day request with comment",
                input: {
                    workerId: "3aa5550b7fe348b98d7b5741afc65534",
                    startDate: "2024-02-14",
                    endDate: "2024-02-14",
                    absenceType: "ABS-PER-001",
                    comment: "Personal appointment"
                },
                expectedOutput: {
                    id: "TOR-2024-001236",
                    workerId: "3aa5550b7fe348b98d7b5741afc65534",
                    workerName: "Sarah Johnson",
                    absenceTypeId: "ABS-PER-001",
                    absenceTypeName: "Personal Day",
                    startDate: "2024-02-14",
                    endDate: "2024-02-14",
                    totalDays: 1,
                    status: "pending",
                    comment: "Personal appointment",
                    approverName: "Michael Chen",
                    createdAt: "2024-01-25T14:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "worker_not_found",
                description: "Worker does not exist",
                input: {
                    workerId: "nonexistent-worker",
                    startDate: "2024-03-15",
                    endDate: "2024-03-22",
                    absenceType: "ABS-VAC-001"
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
                    workerId: "3aa5550b7fe348b98d7b5741afc65534",
                    startDate: "2024-03-15",
                    endDate: "2024-03-22",
                    absenceType: "ABS-VAC-001"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listAbsenceBalances",
        provider: "workday",
        validCases: [
            {
                name: "list_worker_balances",
                description: "Get absence balances for a specific worker",
                input: {
                    workerId: "3aa5550b7fe348b98d7b5741afc65534"
                },
                expectedOutput: {
                    absenceBalances: [
                        {
                            workerId: "3aa5550b7fe348b98d7b5741afc65534",
                            workerName: "Sarah Johnson",
                            timeOffPlanId: "TOP-VAC-001",
                            timeOffPlanName: "Annual Vacation",
                            balance: 15.5,
                            unit: "Days",
                            asOfDate: "2024-01-15"
                        },
                        {
                            workerId: "3aa5550b7fe348b98d7b5741afc65534",
                            workerName: "Sarah Johnson",
                            timeOffPlanId: "TOP-SICK-001",
                            timeOffPlanName: "Sick Leave",
                            balance: 8,
                            unit: "Days",
                            asOfDate: "2024-01-15"
                        },
                        {
                            workerId: "3aa5550b7fe348b98d7b5741afc65534",
                            workerName: "Sarah Johnson",
                            timeOffPlanId: "TOP-PER-001",
                            timeOffPlanName: "Personal Days",
                            balance: 3,
                            unit: "Days",
                            asOfDate: "2024-01-15"
                        }
                    ],
                    pagination: {
                        total: 3,
                        offset: 0,
                        limit: 100
                    }
                }
            },
            {
                name: "list_all_balances",
                description: "Get absence balances for all workers",
                input: {},
                expectedOutput: {
                    absenceBalances: [
                        {
                            workerId: "3aa5550b7fe348b98d7b5741afc65534",
                            workerName: "Sarah Johnson",
                            timeOffPlanId: "TOP-VAC-001",
                            timeOffPlanName: "Annual Vacation",
                            balance: 15.5,
                            unit: "Days",
                            asOfDate: "2024-01-15"
                        },
                        {
                            workerId: "4cc6661c8gf459c09e8c6852bgf76645",
                            workerName: "James Wilson",
                            timeOffPlanId: "TOP-VAC-001",
                            timeOffPlanName: "Annual Vacation",
                            balance: 12,
                            unit: "Days",
                            asOfDate: "2024-01-15"
                        }
                    ],
                    pagination: {
                        total: 312,
                        offset: 0,
                        limit: 100
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "worker_not_found",
                description: "Worker does not exist when filtering",
                input: {
                    workerId: "nonexistent-worker-12345"
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
        operationId: "getEligibleAbsenceTypes",
        provider: "workday",
        validCases: [
            {
                name: "get_eligible_absence_types",
                description: "Get absence types a worker is eligible for",
                input: {
                    workerId: "3aa5550b7fe348b98d7b5741afc65534"
                },
                expectedOutput: {
                    absenceTypes: [
                        {
                            id: "ABS-VAC-001",
                            name: "Vacation",
                            description: "Annual paid vacation leave",
                            category: "Paid Time Off",
                            unit: "Days",
                            minDuration: 0.5,
                            maxDuration: 20,
                            requiresApproval: true
                        },
                        {
                            id: "ABS-SICK-001",
                            name: "Sick Leave",
                            description: "Paid sick leave for illness or medical appointments",
                            category: "Paid Time Off",
                            unit: "Days",
                            minDuration: 0.5,
                            maxDuration: null,
                            requiresApproval: false
                        },
                        {
                            id: "ABS-PER-001",
                            name: "Personal Day",
                            description: "Personal time off for personal matters",
                            category: "Paid Time Off",
                            unit: "Days",
                            minDuration: 1,
                            maxDuration: 1,
                            requiresApproval: true
                        },
                        {
                            id: "ABS-BER-001",
                            name: "Bereavement",
                            description: "Leave for family bereavement",
                            category: "Paid Time Off",
                            unit: "Days",
                            minDuration: 1,
                            maxDuration: 5,
                            requiresApproval: false
                        },
                        {
                            id: "ABS-JUR-001",
                            name: "Jury Duty",
                            description: "Time off for jury service",
                            category: "Paid Time Off",
                            unit: "Days",
                            minDuration: 1,
                            maxDuration: null,
                            requiresApproval: false
                        }
                    ],
                    pagination: {
                        total: 5,
                        offset: 0,
                        limit: 100
                    }
                }
            },
            {
                name: "get_contractor_absence_types",
                description: "Get absence types for a contractor (limited options)",
                input: {
                    workerId: "5dd7772d9hg560d10f9d7963chg87756"
                },
                expectedOutput: {
                    absenceTypes: [
                        {
                            id: "ABS-UNP-001",
                            name: "Unpaid Leave",
                            description: "Unpaid time off",
                            category: "Unpaid Time Off",
                            unit: "Days",
                            minDuration: 1,
                            maxDuration: null,
                            requiresApproval: true
                        }
                    ],
                    pagination: {
                        total: 1,
                        offset: 0,
                        limit: 100
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "worker_not_found",
                description: "Worker does not exist",
                input: {
                    workerId: "nonexistent-worker-12345"
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
                    workerId: "3aa5550b7fe348b98d7b5741afc65534"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listPayGroups",
        provider: "workday",
        validCases: [
            {
                name: "list_all_pay_groups",
                description: "List all pay group configurations",
                input: {
                    limit: 20
                },
                expectedOutput: {
                    payGroups: [
                        {
                            id: "PG-US-BI-001",
                            name: "US Bi-Weekly Salaried",
                            description: "Bi-weekly payroll for US salaried employees",
                            frequency: "Bi-Weekly",
                            country: "United States",
                            currency: "USD",
                            nextPayDate: "2024-01-26",
                            workerCount: 120
                        },
                        {
                            id: "PG-US-SM-001",
                            name: "US Semi-Monthly Salaried",
                            description: "Semi-monthly payroll for US salaried employees",
                            frequency: "Semi-Monthly",
                            country: "United States",
                            currency: "USD",
                            nextPayDate: "2024-01-31",
                            workerCount: 25
                        },
                        {
                            id: "PG-US-HR-001",
                            name: "US Hourly",
                            description: "Bi-weekly payroll for US hourly employees",
                            frequency: "Bi-Weekly",
                            country: "United States",
                            currency: "USD",
                            nextPayDate: "2024-01-26",
                            workerCount: 11
                        }
                    ],
                    pagination: {
                        total: 3,
                        offset: 0,
                        limit: 20
                    }
                }
            },
            {
                name: "list_pay_groups_paginated",
                description: "List pay groups with pagination",
                input: {
                    limit: 2,
                    offset: 0
                },
                expectedOutput: {
                    payGroups: [
                        {
                            id: "PG-US-BI-001",
                            name: "US Bi-Weekly Salaried",
                            description: "Bi-weekly payroll for US salaried employees",
                            frequency: "Bi-Weekly",
                            country: "United States",
                            currency: "USD",
                            nextPayDate: "2024-01-26",
                            workerCount: 120
                        },
                        {
                            id: "PG-US-SM-001",
                            name: "US Semi-Monthly Salaried",
                            description: "Semi-monthly payroll for US salaried employees",
                            frequency: "Semi-Monthly",
                            country: "United States",
                            currency: "USD",
                            nextPayDate: "2024-01-31",
                            workerCount: 25
                        }
                    ],
                    pagination: {
                        total: 3,
                        offset: 0,
                        limit: 2
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Not authorized to view pay groups",
                input: {
                    limit: 20
                },
                expectedError: {
                    type: "permission",
                    message: "Insufficient permissions to view pay groups",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    limit: 20
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    }
];
