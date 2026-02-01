/**
 * Telegram Provider Test Fixtures
 */

import type { TestFixture } from "../../../sandbox";

export const telegramFixtures: TestFixture[] = [
    {
        operationId: "deleteMessage",
        provider: "telegram",
        validCases: [
            {
                name: "basic_deleteMessage",
                description: "Delete a message from a chat",
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
        operationId: "editMessageText",
        provider: "telegram",
        validCases: [
            {
                name: "basic_editMessageText",
                description: "Edit the text of a previously sent message",
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
        provider: "telegram",
        validCases: [
            {
                name: "basic_forwardMessage",
                description: "Forward a message from one chat to another",
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
        operationId: "getChat",
        provider: "telegram",
        validCases: [
            {
                name: "basic_getChat",
                description: "Get up-to-date information about a chat",
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
        operationId: "getMe",
        provider: "telegram",
        validCases: [
            {
                name: "basic_getMe",
                description: "Get basic information about the bot",
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
        operationId: "sendDocument",
        provider: "telegram",
        validCases: [
            {
                name: "basic_sendDocument",
                description: "Send a file/document to a Telegram chat",
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
        operationId: "sendMessage",
        provider: "telegram",
        validCases: [
            {
                name: "basic_sendMessage",
                description: "Send a text message to a Telegram chat",
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
        operationId: "sendPhoto",
        provider: "telegram",
        validCases: [
            {
                name: "basic_sendPhoto",
                description: "Send a photo to a Telegram chat",
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
        provider: "telegram",
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
