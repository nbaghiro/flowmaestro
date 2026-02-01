/**
 * Rippling Provider Test Fixtures
 */

import type { TestFixture } from "../../../sandbox";

export const ripplingFixtures: TestFixture[] = [
    {
        operationId: "getCompany",
        provider: "rippling",
        validCases: [
            {
                name: "basic_getCompany",
                description: "Get current company information from Rippling",
                input: {
                    // TODO: Add input parameters based on operation schema
                },
                expectedOutput: {
                    // TODO: Add expected output based on operation schema
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Resource not found",
                input: {
                    // TODO: Add input that triggers not_found error
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    // TODO: Add typical input
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
        operationId: "getEmployee",
        provider: "rippling",
        validCases: [
            {
                name: "basic_getEmployee",
                description: "Get detailed employee information by ID",
                input: {
                    // TODO: Add input parameters based on operation schema
                },
                expectedOutput: {
                    // TODO: Add expected output based on operation schema
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Resource not found",
                input: {
                    // TODO: Add input that triggers not_found error
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    // TODO: Add typical input
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
        operationId: "getLeaveBalances",
        provider: "rippling",
        validCases: [
            {
                name: "basic_getLeaveBalances",
                description: "Get leave balances for employees, optionally filtered by employee ID",
                input: {
                    // TODO: Add input parameters based on operation schema
                },
                expectedOutput: {
                    // TODO: Add expected output based on operation schema
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Resource not found",
                input: {
                    // TODO: Add input that triggers not_found error
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    // TODO: Add typical input
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
        operationId: "listAllEmployees",
        provider: "rippling",
        validCases: [
            {
                name: "basic_listAllEmployees",
                description: "List all employees in Rippling, including terminated employees",
                input: {
                    // TODO: Add input parameters based on operation schema
                },
                expectedOutput: {
                    // TODO: Add expected output based on operation schema
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Resource not found",
                input: {
                    // TODO: Add input that triggers not_found error
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    // TODO: Add typical input
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
        operationId: "listDepartments",
        provider: "rippling",
        validCases: [
            {
                name: "basic_listDepartments",
                description: "List organization departments in Rippling",
                input: {
                    // TODO: Add input parameters based on operation schema
                },
                expectedOutput: {
                    // TODO: Add expected output based on operation schema
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Resource not found",
                input: {
                    // TODO: Add input that triggers not_found error
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    // TODO: Add typical input
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
        operationId: "listEmployees",
        provider: "rippling",
        validCases: [
            {
                name: "basic_listEmployees",
                description: "List all active employees in Rippling with pagination support",
                input: {
                    // TODO: Add input parameters based on operation schema
                },
                expectedOutput: {
                    // TODO: Add expected output based on operation schema
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Resource not found",
                input: {
                    // TODO: Add input that triggers not_found error
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    // TODO: Add typical input
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
        operationId: "listLeaveRequests",
        provider: "rippling",
        validCases: [
            {
                name: "basic_listLeaveRequests",
                description:
                    "Get time-off requests with optional filters for date range and status",
                input: {
                    // TODO: Add input parameters based on operation schema
                },
                expectedOutput: {
                    // TODO: Add expected output based on operation schema
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Resource not found",
                input: {
                    // TODO: Add input that triggers not_found error
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    // TODO: Add typical input
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
        operationId: "listTeams",
        provider: "rippling",
        validCases: [
            {
                name: "basic_listTeams",
                description: "List teams in the Rippling organization",
                input: {
                    // TODO: Add input parameters based on operation schema
                },
                expectedOutput: {
                    // TODO: Add expected output based on operation schema
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Resource not found",
                input: {
                    // TODO: Add input that triggers not_found error
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    // TODO: Add typical input
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
        operationId: "listWorkLocations",
        provider: "rippling",
        validCases: [
            {
                name: "basic_listWorkLocations",
                description: "List all work locations in Rippling with addresses",
                input: {
                    // TODO: Add input parameters based on operation schema
                },
                expectedOutput: {
                    // TODO: Add expected output based on operation schema
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Resource not found",
                input: {
                    // TODO: Add input that triggers not_found error
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    // TODO: Add typical input
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
        operationId: "processLeaveRequest",
        provider: "rippling",
        validCases: [
            {
                name: "basic_processLeaveRequest",
                description: "Approve or decline a leave request in Rippling",
                input: {
                    // TODO: Add input parameters based on operation schema
                },
                expectedOutput: {
                    // TODO: Add expected output based on operation schema
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Resource not found",
                input: {
                    // TODO: Add input that triggers not_found error
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    // TODO: Add typical input
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
        operationId: "types",
        provider: "rippling",
        validCases: [
            {
                name: "basic_types",
                description: "Basic types operation",
                input: {
                    // TODO: Add input parameters based on operation schema
                },
                expectedOutput: {
                    // TODO: Add expected output based on operation schema
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Resource not found",
                input: {
                    // TODO: Add input that triggers not_found error
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    // TODO: Add typical input
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
