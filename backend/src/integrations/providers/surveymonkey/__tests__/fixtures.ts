/**
 * SurveyMonkey Provider Test Fixtures
 *
 * Based on SurveyMonkey API documentation:
 * - Surveys API: https://developer.surveymonkey.com/api/v3/#surveys
 * - Responses API: https://developer.surveymonkey.com/api/v3/#survey-responses
 * - Collectors API: https://developer.surveymonkey.com/api/v3/#collectors-and-invite-messages
 */

import type { TestFixture } from "../../../sandbox";

/**
 * Sample surveys for filterableData
 */
const sampleSurveys = [
    {
        id: "307785415",
        title: "Customer Satisfaction Survey Q2 2024",
        nickname: "CSAT Q2",
        language: "en",
        questionCount: 12,
        pageCount: 3,
        responseCount: 245,
        dateCreated: "2024-04-01T09:00:00Z",
        dateModified: "2024-04-15T14:30:00Z",
        previewUrl: "https://www.surveymonkey.com/r/preview/307785415",
        collectUrl: "https://www.surveymonkey.com/r/HGYTMNB",
        _status: "open",
        _hasResponses: true
    },
    {
        id: "307785416",
        title: "Employee Engagement Survey 2024",
        nickname: "Engagement 2024",
        language: "en",
        questionCount: 25,
        pageCount: 5,
        responseCount: 89,
        dateCreated: "2024-02-15T10:00:00Z",
        dateModified: "2024-03-01T16:45:00Z",
        previewUrl: "https://www.surveymonkey.com/r/preview/307785416",
        collectUrl: "https://www.surveymonkey.com/r/JKPWXYZ",
        _status: "open",
        _hasResponses: true
    },
    {
        id: "307785417",
        title: "Product Feedback - Beta Features",
        nickname: "Beta Feedback",
        language: "en",
        questionCount: 8,
        pageCount: 2,
        responseCount: 0,
        dateCreated: "2024-06-01T08:00:00Z",
        dateModified: "2024-06-01T08:00:00Z",
        previewUrl: "https://www.surveymonkey.com/r/preview/307785417",
        collectUrl: "https://www.surveymonkey.com/r/LMNOPQR",
        _status: "draft",
        _hasResponses: false
    }
];

/**
 * Sample responses for filterableData
 */
const sampleResponses = [
    {
        id: "11852344598",
        surveyId: "307785415",
        collectorId: "395938267",
        recipientId: "8493487238",
        totalTime: 245,
        status: "completed",
        dateCreated: "2024-06-10T14:23:15Z",
        dateModified: "2024-06-10T14:27:20Z",
        ipAddress: "192.168.1.100",
        collectionMode: "default",
        _status: "completed"
    },
    {
        id: "11852344599",
        surveyId: "307785415",
        collectorId: "395938267",
        recipientId: "8493487239",
        totalTime: 180,
        status: "completed",
        dateCreated: "2024-06-10T15:10:00Z",
        dateModified: "2024-06-10T15:13:00Z",
        ipAddress: "192.168.1.101",
        collectionMode: "default",
        _status: "completed"
    },
    {
        id: "11852344600",
        surveyId: "307785415",
        collectorId: "395938268",
        recipientId: null,
        totalTime: 0,
        status: "partial",
        dateCreated: "2024-06-11T09:00:00Z",
        dateModified: "2024-06-11T09:02:00Z",
        ipAddress: "192.168.1.102",
        collectionMode: "default",
        _status: "partial"
    }
];

export const surveymonkeyFixtures: TestFixture[] = [
    // ============================================================================
    // SURVEYS
    // ============================================================================
    {
        operationId: "listSurveys",
        provider: "surveymonkey",
        filterableData: {
            records: sampleSurveys,
            recordsField: "surveys",
            offsetField: "page",
            defaultPageSize: 50,
            maxPageSize: 1000,
            pageSizeParam: "perPage",
            filterConfig: {
                type: "generic",
                filterableFields: ["_status", "_hasResponses", "language"]
            }
        },
        validCases: [
            {
                name: "list_all_surveys",
                description: "List all surveys in the account",
                input: {
                    page: 1,
                    perPage: 50
                }
            },
            {
                name: "list_with_pagination",
                description: "List surveys with pagination",
                input: {
                    page: 2,
                    perPage: 10
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_credentials",
                description: "API token is invalid or expired",
                input: {
                    page: 1
                },
                expectedError: {
                    type: "permission",
                    message: "Authentication error: Invalid access token",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    page: 1
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getSurvey",
        provider: "surveymonkey",
        validCases: [
            {
                name: "active_survey",
                description: "Get details of an active survey",
                input: {
                    surveyId: "307785415"
                },
                expectedOutput: {
                    id: "307785415",
                    title: "Customer Satisfaction Survey Q2 2024",
                    nickname: "CSAT Q2",
                    language: "en",
                    questionCount: 12,
                    pageCount: 3,
                    responseCount: 245,
                    dateCreated: "2024-04-01T09:00:00Z",
                    dateModified: "2024-04-15T14:30:00Z",
                    previewUrl: "https://www.surveymonkey.com/r/preview/307785415",
                    collectUrl: "https://www.surveymonkey.com/r/HGYTMNB",
                    analyzeUrl: "https://www.surveymonkey.com/analyze/307785415",
                    editUrl: "https://www.surveymonkey.com/create/307785415",
                    summaryUrl: "https://www.surveymonkey.com/summary/307785415",
                    folderId: "12345",
                    customVariables: {}
                }
            },
            {
                name: "draft_survey",
                description: "Get details of a draft survey",
                input: {
                    surveyId: "307785417"
                },
                expectedOutput: {
                    id: "307785417",
                    title: "Product Feedback - Beta Features",
                    nickname: "Beta Feedback",
                    language: "en",
                    questionCount: 8,
                    pageCount: 2,
                    responseCount: 0,
                    dateCreated: "2024-06-01T08:00:00Z",
                    dateModified: "2024-06-01T08:00:00Z",
                    previewUrl: "https://www.surveymonkey.com/r/preview/307785417",
                    collectUrl: "https://www.surveymonkey.com/r/LMNOPQR",
                    analyzeUrl: "https://www.surveymonkey.com/analyze/307785417",
                    editUrl: "https://www.surveymonkey.com/create/307785417",
                    summaryUrl: "https://www.surveymonkey.com/summary/307785417"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Survey does not exist",
                input: {
                    surveyId: "999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: 'Survey with ID "999999999" not found',
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    surveyId: "307785415"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getSurveyDetails",
        provider: "surveymonkey",
        validCases: [
            {
                name: "survey_with_questions",
                description: "Get full survey details including all pages and questions",
                input: {
                    surveyId: "307785415"
                },
                expectedOutput: {
                    id: "307785415",
                    title: "Customer Satisfaction Survey Q2 2024",
                    nickname: "CSAT Q2",
                    language: "en",
                    questionCount: 12,
                    pageCount: 3,
                    responseCount: 245,
                    dateCreated: "2024-04-01T09:00:00Z",
                    dateModified: "2024-04-15T14:30:00Z",
                    previewUrl: "https://www.surveymonkey.com/r/preview/307785415",
                    collectUrl: "https://www.surveymonkey.com/r/HGYTMNB",
                    pages: [
                        {
                            id: "98765432",
                            title: "Overall Satisfaction",
                            description: "Please rate your overall experience with our service",
                            position: 1,
                            questionCount: 4,
                            questions: [
                                {
                                    id: "123456789",
                                    family: "single_choice",
                                    subtype: "vertical",
                                    heading: "How satisfied are you with our service overall?",
                                    position: 1,
                                    required: true,
                                    choices: [
                                        { id: "1001", text: "Very Satisfied", position: 1 },
                                        { id: "1002", text: "Satisfied", position: 2 },
                                        { id: "1003", text: "Neutral", position: 3 },
                                        { id: "1004", text: "Dissatisfied", position: 4 },
                                        { id: "1005", text: "Very Dissatisfied", position: 5 }
                                    ]
                                },
                                {
                                    id: "123456790",
                                    family: "open_ended",
                                    subtype: "essay",
                                    heading: "Please provide any additional comments:",
                                    position: 2,
                                    required: false
                                }
                            ]
                        },
                        {
                            id: "98765433",
                            title: "Product Quality",
                            description: "Rate specific aspects of our products",
                            position: 2,
                            questionCount: 5,
                            questions: [
                                {
                                    id: "123456791",
                                    family: "matrix",
                                    subtype: "rating",
                                    heading: "Please rate the following aspects:",
                                    position: 1,
                                    required: true,
                                    rows: [
                                        { id: "2001", text: "Product Quality", position: 1 },
                                        { id: "2002", text: "Value for Money", position: 2 },
                                        { id: "2003", text: "Ease of Use", position: 3 }
                                    ],
                                    columns: [
                                        { id: "3001", text: "Poor", position: 1 },
                                        { id: "3002", text: "Fair", position: 2 },
                                        { id: "3003", text: "Good", position: 3 },
                                        { id: "3004", text: "Excellent", position: 4 }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            },
            {
                name: "empty_survey",
                description: "Get details of a survey with no questions yet",
                input: {
                    surveyId: "307785418"
                },
                expectedOutput: {
                    id: "307785418",
                    title: "New Survey Template",
                    nickname: null,
                    language: "en",
                    questionCount: 0,
                    pageCount: 1,
                    responseCount: 0,
                    dateCreated: "2024-06-15T10:00:00Z",
                    dateModified: "2024-06-15T10:00:00Z",
                    pages: [
                        {
                            id: "98765440",
                            title: "Page 1",
                            position: 1,
                            questionCount: 0,
                            questions: []
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Survey does not exist",
                input: {
                    surveyId: "999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: 'Survey with ID "999999999" not found',
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    surveyId: "307785415"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // RESPONSES
    // ============================================================================
    {
        operationId: "listResponses",
        provider: "surveymonkey",
        filterableData: {
            records: sampleResponses,
            recordsField: "responses",
            offsetField: "page",
            defaultPageSize: 50,
            maxPageSize: 100,
            pageSizeParam: "perPage",
            filterConfig: {
                type: "generic",
                filterableFields: ["_status", "collectorId"]
            }
        },
        validCases: [
            {
                name: "list_all_responses",
                description: "List all responses for a survey",
                input: {
                    surveyId: "307785415",
                    page: 1,
                    perPage: 50
                }
            },
            {
                name: "list_completed_only",
                description: "List only completed responses",
                input: {
                    surveyId: "307785415",
                    status: "completed",
                    page: 1,
                    perPage: 25
                }
            },
            {
                name: "list_by_date_range",
                description: "List responses within a date range",
                input: {
                    surveyId: "307785415",
                    startCreatedAt: "2024-06-01T00:00:00Z",
                    endCreatedAt: "2024-06-30T23:59:59Z",
                    page: 1
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Survey does not exist",
                input: {
                    surveyId: "999999999",
                    page: 1
                },
                expectedError: {
                    type: "not_found",
                    message: 'Survey with ID "999999999" not found',
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    surveyId: "307785415",
                    page: 1
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getResponseDetails",
        provider: "surveymonkey",
        validCases: [
            {
                name: "completed_response",
                description: "Get full details of a completed response",
                input: {
                    surveyId: "307785415",
                    responseId: "11852344598"
                },
                expectedOutput: {
                    id: "11852344598",
                    surveyId: "307785415",
                    collectorId: "395938267",
                    recipientId: "8493487238",
                    totalTime: 245,
                    status: "completed",
                    dateCreated: "2024-06-10T14:23:15Z",
                    dateModified: "2024-06-10T14:27:20Z",
                    editUrl: "https://www.surveymonkey.com/r/edit/11852344598",
                    analyzeUrl: "https://www.surveymonkey.com/analyze/11852344598",
                    ipAddress: "192.168.1.100",
                    customVariables: {},
                    collectionMode: "default",
                    pages: [
                        {
                            id: "98765432",
                            questions: [
                                {
                                    id: "123456789",
                                    variableId: null,
                                    answers: [{ choiceId: "1002", text: null }]
                                },
                                {
                                    id: "123456790",
                                    variableId: null,
                                    answers: [{ text: "Great service, very helpful support team!" }]
                                }
                            ]
                        },
                        {
                            id: "98765433",
                            questions: [
                                {
                                    id: "123456791",
                                    variableId: null,
                                    answers: [
                                        { rowId: "2001", colId: "3004" },
                                        { rowId: "2002", colId: "3003" },
                                        { rowId: "2003", colId: "3004" }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            },
            {
                name: "partial_response",
                description: "Get details of a partial response",
                input: {
                    surveyId: "307785415",
                    responseId: "11852344600"
                },
                expectedOutput: {
                    id: "11852344600",
                    surveyId: "307785415",
                    collectorId: "395938268",
                    recipientId: null,
                    totalTime: 0,
                    status: "partial",
                    dateCreated: "2024-06-11T09:00:00Z",
                    dateModified: "2024-06-11T09:02:00Z",
                    ipAddress: "192.168.1.102",
                    collectionMode: "default",
                    pages: [
                        {
                            id: "98765432",
                            questions: [
                                {
                                    id: "123456789",
                                    variableId: null,
                                    answers: [{ choiceId: "1003", text: null }]
                                }
                            ]
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Response does not exist",
                input: {
                    surveyId: "307785415",
                    responseId: "99999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: 'Response with ID "99999999999" not found in survey "307785415"',
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    surveyId: "307785415",
                    responseId: "11852344598"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // COLLECTORS
    // ============================================================================
    {
        operationId: "listCollectors",
        provider: "surveymonkey",
        validCases: [
            {
                name: "list_all_collectors",
                description: "List all collectors for a survey",
                input: {
                    surveyId: "307785415",
                    page: 1,
                    perPage: 50
                },
                expectedOutput: {
                    total: 3,
                    page: 1,
                    perPage: 50,
                    collectors: [
                        {
                            id: "395938267",
                            name: "Web Link - Main",
                            type: "weblink",
                            status: "open",
                            dateCreated: "2024-04-01T09:30:00Z",
                            dateModified: "2024-04-01T09:30:00Z",
                            responseCount: 200,
                            url: "https://www.surveymonkey.com/r/HGYTMNB",
                            editUrl: "https://www.surveymonkey.com/collect/list?sm=395938267",
                            redirectType: "url",
                            redirectUrl: "https://example.com/thank-you",
                            thankYouMessage: "Thank you for completing our survey!",
                            allowMultipleResponses: false,
                            anonymousType: "not_anonymous",
                            passwordEnabled: false,
                            displaySurveyResults: false,
                            closeDate: null,
                            responseLimit: null
                        },
                        {
                            id: "395938268",
                            name: "Email Invitation",
                            type: "email",
                            status: "open",
                            dateCreated: "2024-04-02T10:00:00Z",
                            dateModified: "2024-04-02T10:00:00Z",
                            responseCount: 35,
                            url: null,
                            editUrl: "https://www.surveymonkey.com/collect/list?sm=395938268",
                            redirectType: "close",
                            thankYouMessage: "Your feedback is valuable to us.",
                            allowMultipleResponses: false,
                            anonymousType: "not_anonymous",
                            passwordEnabled: false,
                            displaySurveyResults: true,
                            closeDate: "2024-06-30T23:59:59Z",
                            responseLimit: 500
                        },
                        {
                            id: "395938269",
                            name: "Embedded Survey",
                            type: "weblink",
                            status: "closed",
                            dateCreated: "2024-04-05T14:00:00Z",
                            dateModified: "2024-04-20T16:00:00Z",
                            responseCount: 10,
                            url: "https://www.surveymonkey.com/r/XYZABCD",
                            editUrl: "https://www.surveymonkey.com/collect/list?sm=395938269",
                            redirectType: "close",
                            allowMultipleResponses: true,
                            anonymousType: "fully_anonymous",
                            passwordEnabled: true,
                            displaySurveyResults: false,
                            closeDate: "2024-04-20T16:00:00Z",
                            responseLimit: null
                        }
                    ]
                }
            },
            {
                name: "list_with_pagination",
                description: "List collectors with pagination",
                input: {
                    surveyId: "307785415",
                    page: 1,
                    perPage: 2
                },
                expectedOutput: {
                    total: 3,
                    page: 1,
                    perPage: 2,
                    collectors: [
                        {
                            id: "395938267",
                            name: "Web Link - Main",
                            type: "weblink",
                            status: "open",
                            dateCreated: "2024-04-01T09:30:00Z",
                            dateModified: "2024-04-01T09:30:00Z",
                            responseCount: 200,
                            url: "https://www.surveymonkey.com/r/HGYTMNB"
                        },
                        {
                            id: "395938268",
                            name: "Email Invitation",
                            type: "email",
                            status: "open",
                            dateCreated: "2024-04-02T10:00:00Z",
                            dateModified: "2024-04-02T10:00:00Z",
                            responseCount: 35
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Survey does not exist",
                input: {
                    surveyId: "999999999",
                    page: 1
                },
                expectedError: {
                    type: "not_found",
                    message: 'Survey with ID "999999999" not found',
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    surveyId: "307785415",
                    page: 1
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    }
];
