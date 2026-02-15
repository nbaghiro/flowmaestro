/**
 * Personio Provider Test Fixtures
 *
 * Based on Personio API documentation: https://developer.personio.de/
 */

import type { TestFixture } from "../../sandbox";

export const personioFixtures: TestFixture[] = [
    {
        operationId: "listEmployees",
        provider: "personio",
        filterableData: {
            recordsField: "employees",
            offsetField: "pagination",
            defaultPageSize: 50,
            maxPageSize: 200,
            pageSizeParam: "limit",
            offsetParam: "offset",
            filterConfig: {
                type: "generic"
            },
            records: [
                {
                    id: "12345",
                    firstName: "Anna",
                    lastName: "Schmidt",
                    email: "anna.schmidt@example.de",
                    gender: "female",
                    status: "active",
                    position: "Software Engineer",
                    department: "Engineering",
                    office: "Berlin",
                    hireDate: "2022-01-15",
                    terminationDate: null,
                    employmentType: "full-time",
                    weeklyWorkingHours: 40,
                    supervisor: {
                        id: 12340,
                        first_name: "Thomas",
                        last_name: "Mueller"
                    },
                    team: "Platform"
                },
                {
                    id: "12346",
                    firstName: "Max",
                    lastName: "Weber",
                    email: "max.weber@example.de",
                    gender: "male",
                    status: "active",
                    position: "Product Manager",
                    department: "Product",
                    office: "Munich",
                    hireDate: "2021-06-01",
                    terminationDate: null,
                    employmentType: "full-time",
                    weeklyWorkingHours: 40,
                    supervisor: {
                        id: 12340,
                        first_name: "Thomas",
                        last_name: "Mueller"
                    },
                    team: "Growth"
                },
                {
                    id: "12347",
                    firstName: "Lisa",
                    lastName: "Bauer",
                    email: "lisa.bauer@example.de",
                    gender: "female",
                    status: "active",
                    position: "UX Designer",
                    department: "Design",
                    office: "Berlin",
                    hireDate: "2023-03-20",
                    terminationDate: null,
                    employmentType: "full-time",
                    weeklyWorkingHours: 40,
                    supervisor: {
                        id: 12345,
                        first_name: "Anna",
                        last_name: "Schmidt"
                    },
                    team: "Product Design"
                },
                {
                    id: "12348",
                    firstName: "Felix",
                    lastName: "Klein",
                    email: "felix.klein@example.de",
                    gender: "male",
                    status: "active",
                    position: "Data Analyst",
                    department: "Analytics",
                    office: "Remote",
                    hireDate: "2022-09-01",
                    terminationDate: null,
                    employmentType: "part-time",
                    weeklyWorkingHours: 24,
                    supervisor: {
                        id: 12346,
                        first_name: "Max",
                        last_name: "Weber"
                    },
                    team: "Business Intelligence"
                },
                {
                    id: "12340",
                    firstName: "Thomas",
                    lastName: "Mueller",
                    email: "thomas.mueller@example.de",
                    gender: "male",
                    status: "active",
                    position: "CTO",
                    department: "Engineering",
                    office: "Berlin",
                    hireDate: "2019-01-01",
                    terminationDate: null,
                    employmentType: "full-time",
                    weeklyWorkingHours: 40,
                    supervisor: null,
                    team: "Leadership"
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
                            id: "12345",
                            firstName: "Anna",
                            lastName: "Schmidt",
                            email: "anna.schmidt@example.de",
                            status: "active",
                            position: "Software Engineer",
                            department: "Engineering",
                            office: "Berlin"
                        },
                        {
                            id: "12346",
                            firstName: "Max",
                            lastName: "Weber",
                            email: "max.weber@example.de",
                            status: "active",
                            position: "Product Manager",
                            department: "Product",
                            office: "Munich"
                        },
                        {
                            id: "12347",
                            firstName: "Lisa",
                            lastName: "Bauer",
                            email: "lisa.bauer@example.de",
                            status: "active",
                            position: "UX Designer",
                            department: "Design",
                            office: "Berlin"
                        }
                    ],
                    total: 5,
                    pagination: {
                        currentPage: 1,
                        totalPages: 1
                    }
                }
            },
            {
                name: "list_with_pagination",
                description: "List employees with pagination",
                input: {
                    limit: 2,
                    offset: 0
                },
                expectedOutput: {
                    employees: [
                        {
                            id: "12345",
                            firstName: "Anna",
                            lastName: "Schmidt",
                            email: "anna.schmidt@example.de"
                        },
                        {
                            id: "12346",
                            firstName: "Max",
                            lastName: "Weber",
                            email: "max.weber@example.de"
                        }
                    ],
                    total: 2,
                    pagination: {
                        currentPage: 1,
                        totalPages: 3
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_credentials",
                description: "Invalid Client ID or Client Secret",
                input: {},
                expectedError: {
                    type: "permission",
                    message:
                        "Invalid Personio credentials. Please check your Client ID and Client Secret.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded (300 req/min)",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by Personio. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getEmployee",
        provider: "personio",
        validCases: [
            {
                name: "get_employee_by_id",
                description: "Get detailed employee information by ID",
                input: {
                    employeeId: 12345
                },
                expectedOutput: {
                    employee: {
                        id: 12345,
                        firstName: "Anna",
                        lastName: "Schmidt",
                        email: "anna.schmidt@example.de",
                        gender: "female",
                        status: "active",
                        position: "Software Engineer",
                        department: "Engineering",
                        office: "Berlin",
                        hireDate: "2022-01-15",
                        terminationDate: null,
                        employmentType: "full-time",
                        weeklyWorkingHours: 40,
                        supervisor: {
                            id: 12340,
                            first_name: "Thomas",
                            last_name: "Mueller"
                        },
                        team: "Platform",
                        subcompany: "Tech GmbH",
                        costCenter: "CC-ENG-001"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "employee_not_found",
                description: "Employee ID does not exist",
                input: {
                    employeeId: 99999
                },
                expectedError: {
                    type: "not_found",
                    message: "Employee not found: 99999",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createEmployee",
        provider: "personio",
        validCases: [
            {
                name: "create_full_employee",
                description: "Create a new employee with all details",
                input: {
                    firstName: "Julia",
                    lastName: "Hoffmann",
                    email: "julia.hoffmann@example.de",
                    gender: "female",
                    position: "Frontend Developer",
                    department: "Engineering",
                    office: "Berlin",
                    hireDate: "2024-03-01",
                    employmentType: "full-time",
                    weeklyWorkingHours: 40,
                    supervisorId: 12345
                },
                expectedOutput: {
                    id: 12350,
                    message: "Employee created successfully",
                    firstName: "Julia",
                    lastName: "Hoffmann",
                    email: "julia.hoffmann@example.de"
                }
            },
            {
                name: "create_minimal_employee",
                description: "Create employee with only required fields",
                input: {
                    firstName: "Jan",
                    lastName: "Fischer",
                    email: "jan.fischer@example.de"
                },
                expectedOutput: {
                    id: 12351,
                    message: "Employee created successfully",
                    firstName: "Jan",
                    lastName: "Fischer",
                    email: "jan.fischer@example.de"
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_email",
                description: "Email already exists in the system",
                input: {
                    firstName: "Test",
                    lastName: "User",
                    email: "anna.schmidt@example.de"
                },
                expectedError: {
                    type: "validation",
                    message: "An employee with email anna.schmidt@example.de already exists",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updateEmployee",
        provider: "personio",
        validCases: [
            {
                name: "update_position",
                description: "Update employee's position",
                input: {
                    employeeId: 12345,
                    position: "Senior Software Engineer"
                },
                expectedOutput: {
                    id: 12345,
                    message: "Employee updated successfully",
                    updatedFields: ["position"]
                }
            },
            {
                name: "update_multiple_fields",
                description: "Update multiple employee fields",
                input: {
                    employeeId: 12345,
                    position: "Tech Lead",
                    department: "Platform Engineering",
                    weeklyWorkingHours: 38
                },
                expectedOutput: {
                    id: 12345,
                    message: "Employee updated successfully",
                    updatedFields: ["position", "department", "weekly_working_hours"]
                }
            }
        ],
        errorCases: [
            {
                name: "employee_not_found",
                description: "Employee ID does not exist",
                input: {
                    employeeId: 99999,
                    position: "Test"
                },
                expectedError: {
                    type: "not_found",
                    message: "Employee not found: 99999",
                    retryable: false
                }
            },
            {
                name: "no_fields_provided",
                description: "No fields provided for update",
                input: {
                    employeeId: 12345
                },
                expectedError: {
                    type: "validation",
                    message: "At least one field must be provided for update",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listAbsences",
        provider: "personio",
        validCases: [
            {
                name: "list_all_absences",
                description: "List all absences in the organization",
                input: {},
                expectedOutput: {
                    absences: [
                        {
                            id: 5001,
                            status: "approved",
                            startDate: "2024-02-12",
                            endDate: "2024-02-16",
                            daysCount: 5,
                            halfDayStart: false,
                            halfDayEnd: false,
                            comment: "Winter vacation",
                            timeOffType: {
                                id: 1,
                                name: "Vacation",
                                category: "leave"
                            },
                            employee: {
                                id: 12345,
                                firstName: "Anna",
                                lastName: "Schmidt",
                                email: "anna.schmidt@example.de"
                            },
                            createdAt: "2024-01-20T10:00:00.000Z"
                        },
                        {
                            id: 5002,
                            status: "pending",
                            startDate: "2024-03-25",
                            endDate: "2024-03-29",
                            daysCount: 5,
                            halfDayStart: false,
                            halfDayEnd: false,
                            comment: "Easter holiday",
                            timeOffType: {
                                id: 1,
                                name: "Vacation",
                                category: "leave"
                            },
                            employee: {
                                id: 12346,
                                firstName: "Max",
                                lastName: "Weber",
                                email: "max.weber@example.de"
                            },
                            createdAt: "2024-02-01T14:30:00.000Z"
                        }
                    ],
                    total: 2,
                    pagination: null
                }
            },
            {
                name: "list_absences_by_date_range",
                description: "List absences within a specific date range",
                input: {
                    startDate: "2024-02-01",
                    endDate: "2024-02-29"
                },
                expectedOutput: {
                    absences: [
                        {
                            id: 5001,
                            status: "approved",
                            startDate: "2024-02-12",
                            endDate: "2024-02-16",
                            daysCount: 5,
                            employee: {
                                id: 12345,
                                firstName: "Anna",
                                lastName: "Schmidt"
                            }
                        }
                    ],
                    total: 1,
                    pagination: null
                }
            },
            {
                name: "list_absences_by_employee",
                description: "List absences for specific employees",
                input: {
                    employeeIds: [12345, 12346]
                },
                expectedOutput: {
                    absences: [
                        {
                            id: 5001,
                            status: "approved",
                            startDate: "2024-02-12",
                            endDate: "2024-02-16"
                        },
                        {
                            id: 5002,
                            status: "pending",
                            startDate: "2024-03-25",
                            endDate: "2024-03-29"
                        }
                    ],
                    total: 2,
                    pagination: null
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_date_range",
                description: "Invalid date range - end date before start date",
                input: {
                    startDate: "2024-02-28",
                    endDate: "2024-02-01"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid date range: end date must be after start date",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by Personio. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createAbsence",
        provider: "personio",
        validCases: [
            {
                name: "create_vacation_request",
                description: "Create a new vacation request",
                input: {
                    employeeId: 12345,
                    timeOffTypeId: 1,
                    startDate: "2024-04-15",
                    endDate: "2024-04-19",
                    comment: "Spring vacation"
                },
                expectedOutput: {
                    id: 5003,
                    message: "Absence created successfully",
                    employeeId: 12345,
                    startDate: "2024-04-15",
                    endDate: "2024-04-19"
                }
            },
            {
                name: "create_half_day_absence",
                description: "Create an absence with half days",
                input: {
                    employeeId: 12345,
                    timeOffTypeId: 1,
                    startDate: "2024-04-22",
                    endDate: "2024-04-22",
                    halfDayStart: true,
                    halfDayEnd: true,
                    comment: "Personal appointment"
                },
                expectedOutput: {
                    id: 5004,
                    message: "Absence created successfully",
                    employeeId: 12345,
                    startDate: "2024-04-22",
                    endDate: "2024-04-22"
                }
            }
        ],
        errorCases: [
            {
                name: "overlapping_absence",
                description: "Absence overlaps with existing period",
                input: {
                    employeeId: 12345,
                    timeOffTypeId: 1,
                    startDate: "2024-02-14",
                    endDate: "2024-02-18"
                },
                expectedError: {
                    type: "validation",
                    message: "Absence overlaps with existing time-off period",
                    retryable: false
                }
            },
            {
                name: "insufficient_balance",
                description: "Not enough leave balance",
                input: {
                    employeeId: 12345,
                    timeOffTypeId: 1,
                    startDate: "2024-06-01",
                    endDate: "2024-06-30"
                },
                expectedError: {
                    type: "validation",
                    message: "Insufficient time-off balance for this request",
                    retryable: false
                }
            },
            {
                name: "employee_not_found",
                description: "Employee ID does not exist",
                input: {
                    employeeId: 99999,
                    timeOffTypeId: 1,
                    startDate: "2024-04-15",
                    endDate: "2024-04-19"
                },
                expectedError: {
                    type: "not_found",
                    message: "Employee or time-off type not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getAbsenceBalance",
        provider: "personio",
        validCases: [
            {
                name: "get_all_balances",
                description: "Get all absence balances for an employee",
                input: {
                    employeeId: 12345
                },
                expectedOutput: {
                    employeeId: 12345,
                    year: 2024,
                    balances: [
                        {
                            id: 1,
                            name: "Vacation",
                            category: "leave",
                            balance: 30,
                            used: 5,
                            available: 25
                        },
                        {
                            id: 2,
                            name: "Sick Leave",
                            category: "sick",
                            balance: 10,
                            used: 0,
                            available: 10
                        },
                        {
                            id: 3,
                            name: "Home Office",
                            category: "remote",
                            balance: 52,
                            used: 12,
                            available: 40
                        }
                    ]
                }
            },
            {
                name: "get_balance_for_specific_year",
                description: "Get absence balance for a specific year",
                input: {
                    employeeId: 12345,
                    year: 2023
                },
                expectedOutput: {
                    employeeId: 12345,
                    year: 2023,
                    balances: [
                        {
                            id: 1,
                            name: "Vacation",
                            category: "leave",
                            balance: 30,
                            used: 28,
                            available: 2
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
                    employeeId: 99999
                },
                expectedError: {
                    type: "not_found",
                    message: "Employee not found: 99999",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listAttendances",
        provider: "personio",
        validCases: [
            {
                name: "list_attendances_for_week",
                description: "List attendance records for a week",
                input: {
                    startDate: "2024-02-05",
                    endDate: "2024-02-09"
                },
                expectedOutput: {
                    attendances: [
                        {
                            id: 8001,
                            employeeId: 12345,
                            date: "2024-02-05",
                            startTime: "09:00",
                            endTime: "17:30",
                            breakMinutes: 30,
                            comment: null,
                            isHoliday: false,
                            isOnTimeOff: false,
                            status: "approved",
                            createdAt: "2024-02-05T09:00:00.000Z"
                        },
                        {
                            id: 8002,
                            employeeId: 12345,
                            date: "2024-02-06",
                            startTime: "08:45",
                            endTime: "17:15",
                            breakMinutes: 45,
                            comment: "Remote work",
                            isHoliday: false,
                            isOnTimeOff: false,
                            status: "approved",
                            createdAt: "2024-02-06T08:45:00.000Z"
                        },
                        {
                            id: 8003,
                            employeeId: 12346,
                            date: "2024-02-05",
                            startTime: "10:00",
                            endTime: "18:00",
                            breakMinutes: 60,
                            comment: null,
                            isHoliday: false,
                            isOnTimeOff: false,
                            status: "approved",
                            createdAt: "2024-02-05T10:00:00.000Z"
                        }
                    ],
                    total: 3,
                    pagination: null
                }
            },
            {
                name: "list_attendances_for_employee",
                description: "List attendance records for specific employees",
                input: {
                    startDate: "2024-02-01",
                    endDate: "2024-02-29",
                    employeeIds: [12345]
                },
                expectedOutput: {
                    attendances: [
                        {
                            id: 8001,
                            employeeId: 12345,
                            date: "2024-02-05",
                            startTime: "09:00",
                            endTime: "17:30"
                        },
                        {
                            id: 8002,
                            employeeId: 12345,
                            date: "2024-02-06",
                            startTime: "08:45",
                            endTime: "17:15"
                        }
                    ],
                    total: 2,
                    pagination: null
                }
            }
        ],
        errorCases: [
            {
                name: "missing_date_range",
                description: "Date range is required for listing attendances",
                input: {},
                expectedError: {
                    type: "validation",
                    message: "Start date and end date are required for listing attendances",
                    retryable: false
                }
            },
            {
                name: "invalid_date_range",
                description: "Invalid date range - end date before start date",
                input: {
                    startDate: "2024-02-28",
                    endDate: "2024-02-01"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid date range: end date must be after start date",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createAttendance",
        provider: "personio",
        validCases: [
            {
                name: "create_full_day_attendance",
                description: "Create a full day attendance record",
                input: {
                    employeeId: 12345,
                    date: "2024-02-07",
                    startTime: "09:00",
                    endTime: "17:30",
                    breakMinutes: 30,
                    comment: "Regular work day"
                },
                expectedOutput: {
                    id: 8004,
                    message: "Attendance created successfully",
                    employeeId: 12345,
                    date: "2024-02-07",
                    startTime: "09:00",
                    endTime: "17:30"
                }
            },
            {
                name: "create_minimal_attendance",
                description: "Create attendance with minimal fields",
                input: {
                    employeeId: 12345,
                    date: "2024-02-08",
                    startTime: "10:00",
                    endTime: "16:00"
                },
                expectedOutput: {
                    id: 8005,
                    message: "Attendance created successfully",
                    employeeId: 12345,
                    date: "2024-02-08",
                    startTime: "10:00",
                    endTime: "16:00"
                }
            }
        ],
        errorCases: [
            {
                name: "employee_not_found",
                description: "Employee ID does not exist",
                input: {
                    employeeId: 99999,
                    date: "2024-02-07",
                    startTime: "09:00",
                    endTime: "17:00"
                },
                expectedError: {
                    type: "not_found",
                    message: "Employee not found: 99999",
                    retryable: false
                }
            },
            {
                name: "invalid_time_range",
                description: "End time is before start time",
                input: {
                    employeeId: 12345,
                    date: "2024-02-07",
                    startTime: "17:00",
                    endTime: "09:00"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid time range: end time must be after start time",
                    retryable: false
                }
            },
            {
                name: "duplicate_attendance",
                description: "Attendance already exists for this date",
                input: {
                    employeeId: 12345,
                    date: "2024-02-05",
                    startTime: "09:00",
                    endTime: "17:00"
                },
                expectedError: {
                    type: "validation",
                    message: "Attendance record already exists for this date and time",
                    retryable: false
                }
            }
        ]
    }
];
