/**
 * Zendesk Provider Test Fixtures
 */

import type { TestFixture } from "../../../sandbox";

export const zendeskFixtures: TestFixture[] = [
    {
        operationId: "createArticle",
        provider: "zendesk",
        validCases: [
            {
                name: "basic_createArticle",
                description: "Create a new Help Center article in a section",
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
        operationId: "getArticle",
        provider: "zendesk",
        validCases: [
            {
                name: "basic_getArticle",
                description: "Get a Help Center article by ID",
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
        operationId: "listArticles",
        provider: "zendesk",
        validCases: [
            {
                name: "basic_listArticles",
                description:
                    "List Help Center articles with optional filtering by section or category",
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
        operationId: "listCategories",
        provider: "zendesk",
        validCases: [
            {
                name: "basic_listCategories",
                description: "List Help Center categories",
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
        operationId: "listSections",
        provider: "zendesk",
        validCases: [
            {
                name: "basic_listSections",
                description: "List Help Center sections with optional filtering by category",
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
        operationId: "searchArticles",
        provider: "zendesk",
        validCases: [
            {
                name: "basic_searchArticles",
                description: "Search Help Center articles by keyword with optional filtering",
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
        operationId: "updateArticle",
        provider: "zendesk",
        validCases: [
            {
                name: "basic_updateArticle",
                description: "Update an existing Help Center article",
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
        operationId: "addTicketComment",
        provider: "zendesk",
        validCases: [
            {
                name: "basic_addTicketComment",
                description: "Add a comment to an existing ticket in Zendesk",
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
        operationId: "createTicket",
        provider: "zendesk",
        validCases: [
            {
                name: "basic_createTicket",
                description: "Create a new support ticket in Zendesk",
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
        operationId: "deleteTicket",
        provider: "zendesk",
        validCases: [
            {
                name: "basic_deleteTicket",
                description: "Permanently delete a ticket from Zendesk (cannot be undone)",
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
        operationId: "getTicket",
        provider: "zendesk",
        validCases: [
            {
                name: "basic_getTicket",
                description: "Get a ticket by ID from Zendesk",
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
        operationId: "listTickets",
        provider: "zendesk",
        validCases: [
            {
                name: "basic_listTickets",
                description: "List all tickets in Zendesk with pagination",
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
        operationId: "searchTickets",
        provider: "zendesk",
        validCases: [
            {
                name: "basic_searchTickets",
                description:
                    "Search for tickets using Zendesk search syntax (e.g., status:open, priority:high, assignee:me)",
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
        operationId: "updateTicket",
        provider: "zendesk",
        validCases: [
            {
                name: "basic_updateTicket",
                description: "Update an existing ticket in Zendesk",
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
        operationId: "createUser",
        provider: "zendesk",
        validCases: [
            {
                name: "basic_createUser",
                description: "Create a new user in Zendesk",
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
        operationId: "getCurrentUser",
        provider: "zendesk",
        validCases: [
            {
                name: "basic_getCurrentUser",
                description: "Get the currently authenticated user in Zendesk",
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
        operationId: "getUser",
        provider: "zendesk",
        validCases: [
            {
                name: "basic_getUser",
                description: "Get a user by ID from Zendesk",
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
        provider: "zendesk",
        validCases: [
            {
                name: "basic_listUsers",
                description: "List all users in Zendesk with pagination",
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
        operationId: "searchUsers",
        provider: "zendesk",
        validCases: [
            {
                name: "basic_searchUsers",
                description:
                    "Search for users using Zendesk search syntax (e.g., email:john@example.com, role:agent)",
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
        operationId: "updateUser",
        provider: "zendesk",
        validCases: [
            {
                name: "basic_updateUser",
                description: "Update an existing user in Zendesk",
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
