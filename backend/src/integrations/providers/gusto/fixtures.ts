/**
 * Gusto Provider Test Fixtures
 *
 * Based on Gusto API response types for HR operations
 */

import type { TestFixture } from "../../sandbox";

/**
 * Sample employees for filterableData
 */
const sampleEmployees = [
    {
        uuid: "emp-uuid-001",
        firstName: "John",
        lastName: "Smith",
        email: "john.smith@acmecorp.com",
        companyUuid: "comp-uuid-001",
        managerUuid: "emp-uuid-002",
        department: "Engineering",
        dateOfBirth: "1990-05-15",
        currentJobTitle: "Senior Software Engineer",
        hireDate: "2022-03-15",
        onboarded: true,
        terminated: false,
        _department: "Engineering",
        _status: "active"
    },
    {
        uuid: "emp-uuid-002",
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah.johnson@acmecorp.com",
        companyUuid: "comp-uuid-001",
        managerUuid: "emp-uuid-003",
        department: "Engineering",
        dateOfBirth: "1988-11-20",
        currentJobTitle: "Engineering Manager",
        hireDate: "2021-06-01",
        onboarded: true,
        terminated: false,
        _department: "Engineering",
        _status: "active"
    },
    {
        uuid: "emp-uuid-003",
        firstName: "Michael",
        lastName: "Chen",
        email: "michael.chen@acmecorp.com",
        companyUuid: "comp-uuid-001",
        managerUuid: null,
        department: "Engineering",
        dateOfBirth: "1985-03-10",
        currentJobTitle: "VP of Engineering",
        hireDate: "2020-01-15",
        onboarded: true,
        terminated: false,
        _department: "Engineering",
        _status: "active"
    },
    {
        uuid: "emp-uuid-004",
        firstName: "Emily",
        lastName: "Davis",
        email: "emily.davis@acmecorp.com",
        companyUuid: "comp-uuid-001",
        managerUuid: null,
        department: "Marketing",
        dateOfBirth: "1992-08-22",
        currentJobTitle: "Marketing Manager",
        hireDate: "2023-02-01",
        onboarded: true,
        terminated: false,
        _department: "Marketing",
        _status: "active"
    },
    {
        uuid: "emp-uuid-005",
        firstName: "James",
        lastName: "Brown",
        email: "james.brown@acmecorp.com",
        companyUuid: "comp-uuid-001",
        managerUuid: "emp-uuid-004",
        department: "Design",
        dateOfBirth: "1995-01-30",
        currentJobTitle: "Product Designer",
        hireDate: "2023-09-01",
        onboarded: true,
        terminated: false,
        _department: "Design",
        _status: "active"
    }
];

export const gustoFixtures: TestFixture[] = [
    {
        operationId: "listEmployees",
        provider: "gusto",
        filterableData: {
            records: sampleEmployees,
            recordsField: "employees",
            offsetField: "nextPage",
            defaultPageSize: 25,
            maxPageSize: 100,
            pageSizeParam: "per",
            filterConfig: {
                type: "generic",
                filterableFields: ["_department", "_status", "currentJobTitle"]
            }
        },
        validCases: [
            {
                name: "list_all_employees",
                description: "List all employees for a company",
                input: {
                    companyId: "comp-uuid-001"
                }
            },
            {
                name: "list_employees_paginated",
                description: "List employees with pagination",
                input: {
                    companyId: "comp-uuid-001",
                    page: 1,
                    per: 10
                }
            }
        ],
        errorCases: [
            {
                name: "company_not_found",
                description: "Company UUID does not exist",
                input: {
                    companyId: "invalid-uuid"
                },
                expectedError: {
                    type: "not_found",
                    message: "Company not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    companyId: "comp-uuid-001"
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
        operationId: "getEmployee",
        provider: "gusto",
        validCases: [
            {
                name: "get_employee_full_details",
                description: "Get detailed employee information by UUID",
                input: {
                    employeeUuid: "emp-uuid-001"
                },
                expectedOutput: {
                    uuid: "emp-uuid-001",
                    firstName: "John",
                    lastName: "Smith",
                    email: "john.smith@acmecorp.com",
                    companyUuid: "comp-uuid-001",
                    managerUuid: "emp-uuid-002",
                    department: "Engineering",
                    dateOfBirth: "1990-05-15",
                    onboarded: true,
                    terminated: false,
                    jobs: [
                        {
                            uuid: "job-uuid-001",
                            title: "Senior Software Engineer",
                            rate: "120000.00",
                            paymentUnit: "Year",
                            hireDate: "2022-03-15",
                            locationUuid: "loc-uuid-001"
                        }
                    ],
                    homeAddress: {
                        street1: "123 Market Street",
                        street2: "Apt 4B",
                        city: "San Francisco",
                        state: "CA",
                        zip: "94105",
                        country: "USA"
                    },
                    paidTimeOff: [
                        {
                            name: "Vacation",
                            accrualUnit: "Hour",
                            accrualRate: "6.15",
                            accrualBalance: "80.00",
                            maximumAccrualBalance: "160.00",
                            paidAtTermination: true
                        }
                    ],
                    terminations: []
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Employee does not exist",
                input: {
                    employeeUuid: "invalid-uuid"
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
        operationId: "getCompany",
        provider: "gusto",
        validCases: [
            {
                name: "get_company_info",
                description: "Get company information from Gusto",
                input: {
                    companyId: "comp-uuid-001"
                },
                expectedOutput: {
                    uuid: "comp-uuid-001",
                    name: "Acme Corporation",
                    tradeName: "Acme Corp",
                    ein: "12-3456789",
                    entityType: "C-Corporation",
                    tier: "complete",
                    isSuspended: false,
                    locations: [
                        {
                            uuid: "loc-uuid-001",
                            street1: "123 Market Street",
                            street2: "Suite 400",
                            city: "San Francisco",
                            state: "CA",
                            zip: "94105",
                            country: "USA",
                            active: true
                        }
                    ],
                    primarySignatory: {
                        firstName: "Michael",
                        lastName: "Chen",
                        email: "michael.chen@acmecorp.com"
                    },
                    primaryPayrollAdmin: {
                        firstName: "Sarah",
                        lastName: "Johnson",
                        email: "sarah.johnson@acmecorp.com"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "company_not_found",
                description: "Company UUID does not exist",
                input: {
                    companyId: "invalid-uuid"
                },
                expectedError: {
                    type: "not_found",
                    message: "Company not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listDepartments",
        provider: "gusto",
        validCases: [
            {
                name: "list_all_departments",
                description: "List all departments for a company",
                input: {
                    companyId: "comp-uuid-001"
                },
                expectedOutput: {
                    departments: [
                        {
                            uuid: "dept-uuid-001",
                            title: "Engineering",
                            employeeCount: 3,
                            employees: [
                                { uuid: "emp-uuid-001", fullName: "John Smith" },
                                { uuid: "emp-uuid-002", fullName: "Sarah Johnson" },
                                { uuid: "emp-uuid-003", fullName: "Michael Chen" }
                            ],
                            contractorCount: 0,
                            contractors: []
                        },
                        {
                            uuid: "dept-uuid-002",
                            title: "Marketing",
                            employeeCount: 1,
                            employees: [{ uuid: "emp-uuid-004", fullName: "Emily Davis" }],
                            contractorCount: 0,
                            contractors: []
                        },
                        {
                            uuid: "dept-uuid-003",
                            title: "Design",
                            employeeCount: 1,
                            employees: [{ uuid: "emp-uuid-005", fullName: "James Brown" }],
                            contractorCount: 1,
                            contractors: [{ uuid: "con-uuid-001", fullName: "Lisa Wilson" }]
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "company_not_found",
                description: "Company UUID does not exist",
                input: {
                    companyId: "invalid-uuid"
                },
                expectedError: {
                    type: "not_found",
                    message: "Company not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listPayrolls",
        provider: "gusto",
        validCases: [
            {
                name: "list_all_payrolls",
                description: "List all payrolls for a company",
                input: {
                    companyId: "comp-uuid-001"
                },
                expectedOutput: {
                    payrolls: [
                        {
                            uuid: "pay-uuid-001",
                            companyUuid: "comp-uuid-001",
                            payPeriodStart: "2024-01-16",
                            payPeriodEnd: "2024-01-31",
                            checkDate: "2024-02-05",
                            processed: true,
                            payrollDeadline: "2024-02-03",
                            companyDebit: "85000.00",
                            netPay: "62500.00",
                            grossPay: "75000.00"
                        },
                        {
                            uuid: "pay-uuid-002",
                            companyUuid: "comp-uuid-001",
                            payPeriodStart: "2024-01-01",
                            payPeriodEnd: "2024-01-15",
                            checkDate: "2024-01-22",
                            processed: true,
                            payrollDeadline: "2024-01-19",
                            companyDebit: "85000.00",
                            netPay: "62500.00",
                            grossPay: "75000.00"
                        }
                    ]
                }
            },
            {
                name: "list_processed_payrolls",
                description: "List only processed payrolls",
                input: {
                    companyId: "comp-uuid-001",
                    processed: true
                },
                expectedOutput: {
                    payrolls: [
                        {
                            uuid: "pay-uuid-001",
                            companyUuid: "comp-uuid-001",
                            payPeriodStart: "2024-01-16",
                            payPeriodEnd: "2024-01-31",
                            checkDate: "2024-02-05",
                            processed: true,
                            payrollDeadline: "2024-02-03",
                            companyDebit: "85000.00",
                            netPay: "62500.00",
                            grossPay: "75000.00"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "company_not_found",
                description: "Company UUID does not exist",
                input: {
                    companyId: "invalid-uuid"
                },
                expectedError: {
                    type: "not_found",
                    message: "Company not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listTimeOffActivities",
        provider: "gusto",
        validCases: [
            {
                name: "list_time_off_activities",
                description: "List time off activities for an employee",
                input: {
                    employeeUuid: "emp-uuid-001"
                },
                expectedOutput: {
                    timeOffActivities: [
                        {
                            uuid: "toa-uuid-001",
                            employeeUuid: "emp-uuid-001",
                            policyUuid: "policy-uuid-001",
                            policyName: "Vacation",
                            eventType: "used",
                            hours: "16.00",
                            effectiveDate: "2024-01-15"
                        },
                        {
                            uuid: "toa-uuid-002",
                            employeeUuid: "emp-uuid-001",
                            policyUuid: "policy-uuid-001",
                            policyName: "Vacation",
                            eventType: "accrued",
                            hours: "6.15",
                            effectiveDate: "2024-01-31"
                        },
                        {
                            uuid: "toa-uuid-003",
                            employeeUuid: "emp-uuid-001",
                            policyUuid: "policy-uuid-002",
                            policyName: "Sick Leave",
                            eventType: "used",
                            hours: "8.00",
                            effectiveDate: "2024-02-01"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "employee_not_found",
                description: "Employee UUID does not exist",
                input: {
                    employeeUuid: "invalid-uuid"
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
        operationId: "listLocations",
        provider: "gusto",
        validCases: [
            {
                name: "list_all_locations",
                description: "List all locations for a company",
                input: {
                    companyId: "comp-uuid-001"
                },
                expectedOutput: {
                    locations: [
                        {
                            uuid: "loc-uuid-001",
                            companyUuid: "comp-uuid-001",
                            street1: "123 Market Street",
                            street2: "Suite 400",
                            city: "San Francisco",
                            state: "CA",
                            zip: "94105",
                            country: "USA",
                            active: true
                        },
                        {
                            uuid: "loc-uuid-002",
                            companyUuid: "comp-uuid-001",
                            street1: "456 Broadway",
                            street2: "Floor 10",
                            city: "New York",
                            state: "NY",
                            zip: "10013",
                            country: "USA",
                            active: true
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "company_not_found",
                description: "Company UUID does not exist",
                input: {
                    companyId: "invalid-uuid"
                },
                expectedError: {
                    type: "not_found",
                    message: "Company not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listBenefits",
        provider: "gusto",
        validCases: [
            {
                name: "list_all_benefits",
                description: "List all supported benefit types",
                input: {},
                expectedOutput: {
                    benefits: [
                        {
                            uuid: "ben-uuid-001",
                            name: "Medical Insurance",
                            description: "Medical insurance benefit",
                            benefitType: 1,
                            responsibleForEmployerTaxes: false,
                            responsibleForEmployeeW2: true
                        },
                        {
                            uuid: "ben-uuid-002",
                            name: "401(k)",
                            description: "401(k) retirement plan",
                            benefitType: 2,
                            responsibleForEmployerTaxes: false,
                            responsibleForEmployeeW2: false
                        },
                        {
                            uuid: "ben-uuid-003",
                            name: "Dental Insurance",
                            description: "Dental insurance benefit",
                            benefitType: 3,
                            responsibleForEmployerTaxes: false,
                            responsibleForEmployeeW2: true
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
    }
];
