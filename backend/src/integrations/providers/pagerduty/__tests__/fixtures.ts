/**
 * Pagerduty Provider Test Fixtures
 */

import type { TestFixture } from "../../../sandbox";

export const pagerdutyFixtures: TestFixture[] = [
    {
        operationId: "createIncident",
        provider: "pagerduty",
        validCases: [
            {
                name: "basic_createIncident",
                description: "Trigger a new incident on a service",
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
        operationId: "getIncident",
        provider: "pagerduty",
        validCases: [
            {
                name: "basic_getIncident",
                description: "Get a single incident by ID with full details",
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
        operationId: "getService",
        provider: "pagerduty",
        validCases: [
            {
                name: "basic_getService",
                description: "Get a single service by ID with full details",
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
        operationId: "listEscalationPolicies",
        provider: "pagerduty",
        validCases: [
            {
                name: "basic_listEscalationPolicies",
                description: "List escalation policies with optional filtering",
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
        operationId: "listIncidents",
        provider: "pagerduty",
        validCases: [
            {
                name: "basic_listIncidents",
                description:
                    "List incidents with filtering by status, urgency, date range, and more",
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
        operationId: "listOnCalls",
        provider: "pagerduty",
        validCases: [
            {
                name: "basic_listOnCalls",
                description: "Get current on-call users for escalation policies and schedules",
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
        operationId: "listSchedules",
        provider: "pagerduty",
        validCases: [
            {
                name: "basic_listSchedules",
                description: "List on-call schedules with optional filtering",
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
        operationId: "listServices",
        provider: "pagerduty",
        validCases: [
            {
                name: "basic_listServices",
                description: "List all services with optional filtering",
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
        operationId: "listUsers",
        provider: "pagerduty",
        validCases: [
            {
                name: "basic_listUsers",
                description: "List users in the account with optional filtering",
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
        operationId: "updateIncident",
        provider: "pagerduty",
        validCases: [
            {
                name: "basic_updateIncident",
                description: "Acknowledge, resolve, or reassign an incident",
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
