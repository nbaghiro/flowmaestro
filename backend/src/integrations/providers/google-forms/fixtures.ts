/**
 * Google Forms Provider Test Fixtures
 *
 * Based on official Google Forms API v1 documentation:
 * - Forms: https://developers.google.com/forms/api/reference/rest/v1/forms
 * - Responses: https://developers.google.com/forms/api/reference/rest/v1/forms.responses
 */

import type { TestFixture } from "../../sandbox";

export const googleFormsFixtures: TestFixture[] = [
    {
        operationId: "createForm",
        provider: "google-forms",
        validCases: [
            {
                name: "basic_form",
                description: "Create a new Google Form with a title",
                input: {
                    title: "Customer Feedback Survey"
                },
                expectedOutput: {
                    formId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    info: {
                        title: "Customer Feedback Survey",
                        documentTitle: "Customer Feedback Survey"
                    },
                    settings: {
                        quizSettings: {
                            isQuiz: false
                        }
                    },
                    revisionId: "00000001",
                    responderUri:
                        "https://docs.google.com/forms/d/e/1FAIpQLSfA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X/viewform",
                    linkedSheetId: null
                }
            }
        ],
        errorCases: [
            {
                name: "empty_title",
                description: "Title cannot be empty",
                input: {
                    title: ""
                },
                expectedError: {
                    type: "validation",
                    message: "Title is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Google Forms API rate limit exceeded",
                input: {
                    title: "Test Form"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Google Forms rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            },
            {
                name: "auth_expired",
                description: "OAuth token expired",
                input: {
                    title: "Test Form"
                },
                expectedError: {
                    type: "permission",
                    message: "Google Forms authentication failed. Please reconnect.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getForm",
        provider: "google-forms",
        validCases: [
            {
                name: "feedback_survey",
                description: "Retrieve a customer feedback survey with multiple question types",
                input: {
                    formId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                },
                expectedOutput: {
                    formId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    info: {
                        title: "Customer Feedback Survey",
                        documentTitle: "Customer Feedback Survey",
                        description: "Please help us improve our service by sharing your feedback."
                    },
                    settings: {
                        quizSettings: {
                            isQuiz: false
                        }
                    },
                    revisionId: "00000015",
                    responderUri:
                        "https://docs.google.com/forms/d/e/1FAIpQLSfA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X/viewform",
                    linkedSheetId: "1a2b3c4d5e6f7g8h9i0j",
                    items: [
                        {
                            itemId: "00000001",
                            title: "How satisfied are you with our service?",
                            description: "Rate from 1 (very dissatisfied) to 5 (very satisfied)",
                            questionItem: {
                                question: {
                                    questionId: "0a1b2c3d",
                                    required: true,
                                    scaleQuestion: {
                                        low: 1,
                                        high: 5,
                                        lowLabel: "Very Dissatisfied",
                                        highLabel: "Very Satisfied"
                                    }
                                }
                            }
                        },
                        {
                            itemId: "00000002",
                            title: "Which products have you used?",
                            description: "Select all that apply",
                            questionItem: {
                                question: {
                                    questionId: "1b2c3d4e",
                                    required: false,
                                    choiceQuestion: {
                                        type: "CHECKBOX",
                                        options: [
                                            { value: "Product A" },
                                            { value: "Product B" },
                                            { value: "Product C" },
                                            { value: "Product D" }
                                        ],
                                        shuffle: false
                                    }
                                }
                            }
                        },
                        {
                            itemId: "00000003",
                            title: "How did you hear about us?",
                            questionItem: {
                                question: {
                                    questionId: "2c3d4e5f",
                                    required: true,
                                    choiceQuestion: {
                                        type: "RADIO",
                                        options: [
                                            { value: "Social Media" },
                                            { value: "Friend or Colleague" },
                                            { value: "Online Advertisement" },
                                            { value: "Search Engine" },
                                            { value: "Other", isOther: true }
                                        ],
                                        shuffle: false
                                    }
                                }
                            }
                        },
                        {
                            itemId: "00000004",
                            title: "Your Email Address",
                            description: "We'll use this to follow up on your feedback",
                            questionItem: {
                                question: {
                                    questionId: "3d4e5f6g",
                                    required: false,
                                    textQuestion: {
                                        paragraph: false
                                    }
                                }
                            }
                        },
                        {
                            itemId: "00000005",
                            title: "Additional Comments",
                            description: "Please share any other feedback or suggestions",
                            questionItem: {
                                question: {
                                    questionId: "4e5f6g7h",
                                    required: false,
                                    textQuestion: {
                                        paragraph: true
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "form_not_found",
                description: "Form does not exist",
                input: {
                    formId: "nonexistent_form_id_12345"
                },
                expectedError: {
                    type: "not_found",
                    message: "Form or resource not found.",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "No permission to access the form",
                input: {
                    formId: "private_form_no_access_67890"
                },
                expectedError: {
                    type: "permission",
                    message:
                        "Permission denied: You don't have permission to access this resource.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Google Forms API rate limit exceeded",
                input: {
                    formId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Google Forms rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getResponse",
        provider: "google-forms",
        validCases: [
            {
                name: "complete_feedback_response",
                description: "Get a complete feedback survey response with all questions answered",
                input: {
                    formId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    responseId: "ACYDBNhA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0"
                },
                expectedOutput: {
                    responseId: "ACYDBNhA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0",
                    formId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    createTime: "2024-01-15T14:30:00.000Z",
                    lastSubmittedTime: "2024-01-15T14:35:22.000Z",
                    respondentEmail: "john.smith@example.com",
                    answers: {
                        "0a1b2c3d": {
                            questionId: "0a1b2c3d",
                            textAnswers: {
                                answers: [{ value: "4" }]
                            }
                        },
                        "1b2c3d4e": {
                            questionId: "1b2c3d4e",
                            textAnswers: {
                                answers: [{ value: "Product A" }, { value: "Product C" }]
                            }
                        },
                        "2c3d4e5f": {
                            questionId: "2c3d4e5f",
                            textAnswers: {
                                answers: [{ value: "Social Media" }]
                            }
                        },
                        "3d4e5f6g": {
                            questionId: "3d4e5f6g",
                            textAnswers: {
                                answers: [{ value: "john.smith@example.com" }]
                            }
                        },
                        "4e5f6g7h": {
                            questionId: "4e5f6g7h",
                            textAnswers: {
                                answers: [
                                    {
                                        value: "Great service overall! The support team was very helpful when I had questions about Product A. Would recommend to others."
                                    }
                                ]
                            }
                        }
                    },
                    totalScore: null
                }
            }
        ],
        errorCases: [
            {
                name: "response_not_found",
                description: "Response does not exist",
                input: {
                    formId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    responseId: "nonexistent_response_id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Form or resource not found.",
                    retryable: false
                }
            },
            {
                name: "form_not_found",
                description: "Form does not exist",
                input: {
                    formId: "nonexistent_form_id",
                    responseId: "ACYDBNhA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0"
                },
                expectedError: {
                    type: "not_found",
                    message: "Form or resource not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Google Forms API rate limit exceeded",
                input: {
                    formId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    responseId: "ACYDBNhA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Google Forms rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listResponses",
        provider: "google-forms",
        validCases: [
            {
                name: "all_responses",
                description: "List all responses for a feedback survey",
                input: {
                    formId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                },
                expectedOutput: {
                    responses: [
                        {
                            responseId: "ACYDBNhA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0",
                            formId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                            createTime: "2024-01-15T14:30:00.000Z",
                            lastSubmittedTime: "2024-01-15T14:35:22.000Z",
                            respondentEmail: "john.smith@example.com",
                            answers: {
                                "0a1b2c3d": {
                                    questionId: "0a1b2c3d",
                                    textAnswers: {
                                        answers: [{ value: "4" }]
                                    }
                                },
                                "2c3d4e5f": {
                                    questionId: "2c3d4e5f",
                                    textAnswers: {
                                        answers: [{ value: "Social Media" }]
                                    }
                                }
                            },
                            totalScore: null
                        },
                        {
                            responseId: "ACYDBNhD4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3",
                            formId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                            createTime: "2024-01-16T10:15:00.000Z",
                            lastSubmittedTime: "2024-01-16T10:18:45.000Z",
                            respondentEmail: "sarah.jones@example.com",
                            answers: {
                                "0a1b2c3d": {
                                    questionId: "0a1b2c3d",
                                    textAnswers: {
                                        answers: [{ value: "5" }]
                                    }
                                },
                                "2c3d4e5f": {
                                    questionId: "2c3d4e5f",
                                    textAnswers: {
                                        answers: [{ value: "Friend or Colleague" }]
                                    }
                                }
                            },
                            totalScore: null
                        },
                        {
                            responseId: "ACYDBNhE5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4",
                            formId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                            createTime: "2024-01-17T08:45:00.000Z",
                            lastSubmittedTime: "2024-01-17T08:50:30.000Z",
                            respondentEmail: "mike.chen@example.com",
                            answers: {
                                "0a1b2c3d": {
                                    questionId: "0a1b2c3d",
                                    textAnswers: {
                                        answers: [{ value: "3" }]
                                    }
                                },
                                "2c3d4e5f": {
                                    questionId: "2c3d4e5f",
                                    textAnswers: {
                                        answers: [{ value: "Search Engine" }]
                                    }
                                }
                            },
                            totalScore: null
                        }
                    ],
                    nextPageToken: null
                }
            }
        ],
        errorCases: [
            {
                name: "form_not_found",
                description: "Form does not exist",
                input: {
                    formId: "nonexistent_form_id_99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Form or resource not found.",
                    retryable: false
                }
            },
            {
                name: "invalid_filter",
                description: "Invalid filter syntax",
                input: {
                    formId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    filter: "invalid filter syntax"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid request: Bad request",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Google Forms API rate limit exceeded",
                input: {
                    formId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Google Forms rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateForm",
        provider: "google-forms",
        validCases: [
            {
                name: "add_text_question",
                description: "Add a short text question to the form",
                input: {
                    formId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    requests: [
                        {
                            createItem: {
                                item: {
                                    title: "What is your favorite feature?",
                                    questionItem: {
                                        question: {
                                            required: true,
                                            textQuestion: {
                                                paragraph: false
                                            }
                                        }
                                    }
                                },
                                location: {
                                    index: 0
                                }
                            }
                        }
                    ]
                },
                expectedOutput: {
                    form: {
                        formId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                        info: {
                            title: "Customer Feedback Survey",
                            documentTitle: "Customer Feedback Survey"
                        },
                        revisionId: "00000016"
                    },
                    replies: [
                        {
                            createItem: {
                                itemId: "00000006",
                                questionId: ["5f6g7h8i"]
                            }
                        }
                    ],
                    writeControl: {
                        requiredRevisionId: "00000016"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "form_not_found",
                description: "Form does not exist",
                input: {
                    formId: "nonexistent_form_id",
                    requests: [
                        {
                            updateFormInfo: {
                                info: {
                                    title: "New Title"
                                },
                                updateMask: "title"
                            }
                        }
                    ]
                },
                expectedError: {
                    type: "not_found",
                    message: "Form or resource not found.",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "No edit permission for the form",
                input: {
                    formId: "readonly_form_id_12345",
                    requests: [
                        {
                            updateFormInfo: {
                                info: {
                                    title: "New Title"
                                },
                                updateMask: "title"
                            }
                        }
                    ]
                },
                expectedError: {
                    type: "permission",
                    message:
                        "Permission denied: You don't have permission to access this resource.",
                    retryable: false
                }
            },
            {
                name: "invalid_request",
                description: "Invalid batch update request format",
                input: {
                    formId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    requests: [
                        {
                            invalidOperation: {
                                data: "invalid"
                            }
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid request: Bad request",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Google Forms API rate limit exceeded",
                input: {
                    formId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    requests: [
                        {
                            updateFormInfo: {
                                info: {
                                    title: "Updated Title"
                                },
                                updateMask: "title"
                            }
                        }
                    ]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Google Forms rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            },
            {
                name: "empty_requests",
                description: "Empty requests array",
                input: {
                    formId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    requests: []
                },
                expectedError: {
                    type: "validation",
                    message: "At least one request is required",
                    retryable: false
                }
            }
        ]
    }
];
