/**
 * Microsoft-outlook Provider Test Fixtures
 */

import type { TestFixture } from "../../../sandbox";

export const microsoftOutlookFixtures: TestFixture[] = [
    {
        operationId: "createEvent",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "basic_createEvent",
                description: "Create a new calendar event",
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
        operationId: "deleteEvent",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "basic_deleteEvent",
                description: "Delete a calendar event",
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
        operationId: "deleteMessage",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "basic_deleteMessage",
                description: "Delete an email message",
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
        operationId: "forwardMessage",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "basic_forwardMessage",
                description: "Forward an email to new recipients",
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
        operationId: "getEvent",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "basic_getEvent",
                description: "Get a specific calendar event by ID",
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
        operationId: "getMessage",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "basic_getMessage",
                description: "Get a specific email message by ID",
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
        operationId: "listCalendars",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "basic_listCalendars",
                description: "List user",
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
        operationId: "listEvents",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "basic_listEvents",
                description: "List calendar events within a time range",
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
        operationId: "listMailFolders",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "basic_listMailFolders",
                description: "List all mail folders in the user",
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
        operationId: "listMessages",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "basic_listMessages",
                description: "List email messages in a mail folder",
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
        operationId: "markAsRead",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "basic_markAsRead",
                description: "Mark a message as read or unread",
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
        operationId: "moveMessage",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "basic_moveMessage",
                description: "Move a message to another folder",
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
        operationId: "replyToMessage",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "basic_replyToMessage",
                description: "Reply to an email message",
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
        operationId: "respondToEvent",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "basic_respondToEvent",
                description: "Accept, tentatively accept, or decline an event invitation",
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
        operationId: "sendMail",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "basic_sendMail",
                description: "Send an email message",
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
        operationId: "updateEvent",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "basic_updateEvent",
                description: "Update an existing calendar event",
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
