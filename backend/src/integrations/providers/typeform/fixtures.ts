/**
 * Typeform Provider Test Fixtures
 *
 * Based on official Typeform API documentation:
 * - Forms API: https://developer.typeform.com/create/reference/retrieve-form/
 * - Responses API: https://developer.typeform.com/responses/reference/retrieve-responses/
 * - Workspaces API: https://developer.typeform.com/create/reference/retrieve-workspaces/
 */

import type { TestFixture } from "../../sandbox";

export const typeformFixtures: TestFixture[] = [
    {
        operationId: "getForm",
        provider: "typeform",
        validCases: [
            {
                name: "basic_customer_feedback_form",
                description:
                    "Get detailed information about a customer feedback typeform including its fields, logic, and settings.",
                input: {
                    formId: "abc123xyz"
                },
                expectedOutput: {
                    id: "abc123xyz",
                    title: "Customer Feedback Survey",
                    type: "form",
                    lastUpdatedAt: "2024-01-20T15:30:00.000Z",
                    createdAt: "2024-01-10T09:00:00.000Z",
                    workspaceHref: "https://api.typeform.com/workspaces/ws_abc123",
                    displayLink: "https://demo.typeform.com/to/abc123xyz",
                    settings: {
                        language: "en",
                        progress_bar: "percentage",
                        meta: {
                            allow_indexing: false,
                            description: "Help us improve our service by sharing your feedback"
                        },
                        is_public: true,
                        show_progress_bar: true,
                        show_typeform_branding: false,
                        show_time_to_complete: true
                    },
                    welcomeScreens: [
                        {
                            ref: "welcome_screen_1",
                            title: "Welcome to our feedback survey!",
                            buttonText: "Start",
                            description:
                                "This survey takes about 3 minutes to complete. Your feedback helps us serve you better."
                        }
                    ],
                    thankYouScreens: [
                        {
                            ref: "thankyou_screen_1",
                            title: "Thank you for your feedback!",
                            buttonText: "Visit our website",
                            redirectUrl: "https://example.com/thank-you"
                        }
                    ],
                    fields: [
                        {
                            id: "field_rating_01",
                            ref: "overall_satisfaction",
                            title: "How satisfied are you with our service?",
                            type: "opinion_scale",
                            required: true,
                            properties: {
                                steps: 10,
                                start_at_one: true,
                                labels: {
                                    left: "Not satisfied at all",
                                    right: "Extremely satisfied"
                                }
                            }
                        },
                        {
                            id: "field_choice_02",
                            ref: "product_used",
                            title: "Which of our products have you used?",
                            type: "multiple_choice",
                            required: true,
                            properties: {
                                allow_multiple_selection: true,
                                randomize: false,
                                choices: [
                                    { id: "choice_1", label: "Product A" },
                                    { id: "choice_2", label: "Product B" },
                                    { id: "choice_3", label: "Product C" },
                                    { id: "choice_4", label: "Other" }
                                ]
                            }
                        },
                        {
                            id: "field_text_03",
                            ref: "feedback_comments",
                            title: "What could we do to improve your experience?",
                            type: "long_text",
                            required: false,
                            properties: {
                                max_length: 1000
                            }
                        },
                        {
                            id: "field_email_04",
                            ref: "contact_email",
                            title: "Your email address",
                            type: "email",
                            required: false,
                            properties: {}
                        },
                        {
                            id: "field_nps_05",
                            ref: "nps_score",
                            title: "How likely are you to recommend us to a friend or colleague?",
                            type: "nps",
                            required: true,
                            properties: {
                                labels: {
                                    left: "Not at all likely",
                                    right: "Extremely likely"
                                }
                            }
                        }
                    ],
                    fieldCount: 5,
                    hasLogic: true,
                    variables: [
                        {
                            type: "number",
                            name: "score",
                            value: 0
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "form_not_found",
                description: "Form with the specified ID does not exist",
                input: {
                    formId: "nonexistent_form_id"
                },
                expectedError: {
                    type: "not_found",
                    message: 'Form with ID "nonexistent_form_id" not found',
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for Typeform API",
                input: {
                    formId: "abc123xyz"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "permission",
                description: "Invalid or expired access token",
                input: {
                    formId: "abc123xyz"
                },
                expectedError: {
                    type: "permission",
                    message: "Authentication required",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listForms",
        provider: "typeform",
        filterableData: {
            recordsField: "forms",
            offsetField: "pageCount",
            defaultPageSize: 10,
            maxPageSize: 200,
            pageSizeParam: "pageSize",
            offsetParam: "page",
            filterConfig: {
                type: "generic",
                filterableFields: ["title", "workspaceId"]
            },
            records: [
                {
                    id: "form_feedback_001",
                    title: "Customer Feedback Survey",
                    lastUpdatedAt: "2024-01-20T15:30:00.000Z",
                    createdAt: "2024-01-10T09:00:00.000Z",
                    workspaceHref: "https://api.typeform.com/workspaces/ws_marketing",
                    displayLink: "https://demo.typeform.com/to/form_feedback_001",
                    _workspaceId: "ws_marketing"
                },
                {
                    id: "form_job_app_002",
                    title: "Software Engineer Application",
                    lastUpdatedAt: "2024-01-18T12:00:00.000Z",
                    createdAt: "2024-01-05T10:30:00.000Z",
                    workspaceHref: "https://api.typeform.com/workspaces/ws_hr",
                    displayLink: "https://careers.typeform.com/to/form_job_app_002",
                    _workspaceId: "ws_hr"
                },
                {
                    id: "form_event_003",
                    title: "Annual Conference Registration",
                    lastUpdatedAt: "2024-01-15T08:45:00.000Z",
                    createdAt: "2024-01-01T14:00:00.000Z",
                    workspaceHref: "https://api.typeform.com/workspaces/ws_events",
                    displayLink: "https://events.typeform.com/to/form_event_003",
                    _workspaceId: "ws_events"
                },
                {
                    id: "form_quiz_004",
                    title: "Product Knowledge Quiz",
                    lastUpdatedAt: "2024-01-12T16:20:00.000Z",
                    createdAt: "2023-12-15T11:00:00.000Z",
                    workspaceHref: "https://api.typeform.com/workspaces/ws_training",
                    displayLink: "https://training.typeform.com/to/form_quiz_004",
                    _workspaceId: "ws_training"
                },
                {
                    id: "form_nps_005",
                    title: "NPS Survey Q1 2024",
                    lastUpdatedAt: "2024-01-10T09:15:00.000Z",
                    createdAt: "2023-12-20T13:30:00.000Z",
                    workspaceHref: "https://api.typeform.com/workspaces/ws_marketing",
                    displayLink: "https://demo.typeform.com/to/form_nps_005",
                    _workspaceId: "ws_marketing"
                },
                {
                    id: "form_contact_006",
                    title: "Contact Us Form",
                    lastUpdatedAt: "2024-01-08T14:00:00.000Z",
                    createdAt: "2023-11-01T08:00:00.000Z",
                    workspaceHref: "https://api.typeform.com/workspaces/ws_support",
                    displayLink: "https://support.typeform.com/to/form_contact_006",
                    _workspaceId: "ws_support"
                }
            ]
        },
        validCases: [
            {
                name: "list_all_forms",
                description:
                    "List all typeforms in the account. Returns form metadata including ID, title, creation date, and workspace info.",
                input: {},
                expectedOutput: {
                    totalItems: 6,
                    pageCount: 1,
                    forms: [
                        {
                            id: "form_feedback_001",
                            title: "Customer Feedback Survey",
                            lastUpdatedAt: "2024-01-20T15:30:00.000Z",
                            createdAt: "2024-01-10T09:00:00.000Z",
                            workspaceHref: "https://api.typeform.com/workspaces/ws_marketing",
                            displayLink: "https://demo.typeform.com/to/form_feedback_001"
                        },
                        {
                            id: "form_job_app_002",
                            title: "Software Engineer Application",
                            lastUpdatedAt: "2024-01-18T12:00:00.000Z",
                            createdAt: "2024-01-05T10:30:00.000Z",
                            workspaceHref: "https://api.typeform.com/workspaces/ws_hr",
                            displayLink: "https://careers.typeform.com/to/form_job_app_002"
                        },
                        {
                            id: "form_event_003",
                            title: "Annual Conference Registration",
                            lastUpdatedAt: "2024-01-15T08:45:00.000Z",
                            createdAt: "2024-01-01T14:00:00.000Z",
                            workspaceHref: "https://api.typeform.com/workspaces/ws_events",
                            displayLink: "https://events.typeform.com/to/form_event_003"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "workspace_not_found",
                description: "Workspace does not exist",
                input: {
                    workspaceId: "ws_nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Workspace not found",
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
        operationId: "listResponses",
        provider: "typeform",
        filterableData: {
            recordsField: "responses",
            offsetField: "pageCount",
            defaultPageSize: 25,
            maxPageSize: 1000,
            pageSizeParam: "pageSize",
            offsetParam: "after",
            filterConfig: {
                type: "generic",
                filterableFields: ["completed", "submittedAt"]
            },
            records: [
                {
                    landingId: "landing_001",
                    token: "resp_token_abc123",
                    responseId: "response_001",
                    landedAt: "2024-01-20T10:00:00.000Z",
                    submittedAt: "2024-01-20T10:05:32.000Z",
                    isCompleted: true,
                    metadata: {
                        userAgent:
                            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                        platform: "other",
                        referer: "https://example.com/feedback",
                        browser: "default"
                    },
                    hiddenFields: {
                        customer_id: "cust_12345",
                        utm_source: "email"
                    },
                    calculatedScore: 85,
                    answers: [
                        {
                            fieldId: "field_rating_01",
                            fieldType: "opinion_scale",
                            fieldRef: "overall_satisfaction",
                            answerType: "number",
                            value: 9
                        },
                        {
                            fieldId: "field_choice_02",
                            fieldType: "multiple_choice",
                            fieldRef: "product_used",
                            answerType: "choices",
                            value: ["Product A", "Product C"]
                        },
                        {
                            fieldId: "field_text_03",
                            fieldType: "long_text",
                            fieldRef: "feedback_comments",
                            answerType: "text",
                            value: "Great product! The new features are excellent. Would love to see more integrations."
                        },
                        {
                            fieldId: "field_email_04",
                            fieldType: "email",
                            fieldRef: "contact_email",
                            answerType: "email",
                            value: "john.smith@example.com"
                        },
                        {
                            fieldId: "field_nps_05",
                            fieldType: "nps",
                            fieldRef: "nps_score",
                            answerType: "number",
                            value: 9
                        }
                    ]
                },
                {
                    landingId: "landing_002",
                    token: "resp_token_def456",
                    responseId: "response_002",
                    landedAt: "2024-01-19T14:30:00.000Z",
                    submittedAt: "2024-01-19T14:38:15.000Z",
                    isCompleted: true,
                    metadata: {
                        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
                        platform: "mobile",
                        referer: "https://example.com/app",
                        browser: "default"
                    },
                    hiddenFields: {
                        customer_id: "cust_67890",
                        utm_source: "in_app"
                    },
                    calculatedScore: 60,
                    answers: [
                        {
                            fieldId: "field_rating_01",
                            fieldType: "opinion_scale",
                            fieldRef: "overall_satisfaction",
                            answerType: "number",
                            value: 6
                        },
                        {
                            fieldId: "field_choice_02",
                            fieldType: "multiple_choice",
                            fieldRef: "product_used",
                            answerType: "choices",
                            value: ["Product B"]
                        },
                        {
                            fieldId: "field_text_03",
                            fieldType: "long_text",
                            fieldRef: "feedback_comments",
                            answerType: "text",
                            value: "The app is good but loading times could be improved."
                        },
                        {
                            fieldId: "field_nps_05",
                            fieldType: "nps",
                            fieldRef: "nps_score",
                            answerType: "number",
                            value: 7
                        }
                    ]
                },
                {
                    landingId: "landing_003",
                    token: "resp_token_ghi789",
                    responseId: "response_003",
                    landedAt: "2024-01-18T09:15:00.000Z",
                    submittedAt: null,
                    isCompleted: false,
                    metadata: {
                        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        platform: "other",
                        referer: "https://example.com/",
                        browser: "default"
                    },
                    hiddenFields: {},
                    calculatedScore: null,
                    answers: [
                        {
                            fieldId: "field_rating_01",
                            fieldType: "opinion_scale",
                            fieldRef: "overall_satisfaction",
                            answerType: "number",
                            value: 8
                        }
                    ]
                },
                {
                    landingId: "landing_004",
                    token: "resp_token_jkl012",
                    responseId: "response_004",
                    landedAt: "2024-01-17T16:45:00.000Z",
                    submittedAt: "2024-01-17T16:52:00.000Z",
                    isCompleted: true,
                    metadata: {
                        userAgent:
                            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
                        platform: "other",
                        referer: "https://google.com",
                        browser: "default"
                    },
                    hiddenFields: {
                        customer_id: "cust_11111",
                        utm_source: "organic"
                    },
                    calculatedScore: 95,
                    answers: [
                        {
                            fieldId: "field_rating_01",
                            fieldType: "opinion_scale",
                            fieldRef: "overall_satisfaction",
                            answerType: "number",
                            value: 10
                        },
                        {
                            fieldId: "field_choice_02",
                            fieldType: "multiple_choice",
                            fieldRef: "product_used",
                            answerType: "choices",
                            value: ["Product A", "Product B", "Product C"]
                        },
                        {
                            fieldId: "field_text_03",
                            fieldType: "long_text",
                            fieldRef: "feedback_comments",
                            answerType: "text",
                            value: "Absolutely love the product! Best in class customer support and excellent documentation."
                        },
                        {
                            fieldId: "field_email_04",
                            fieldType: "email",
                            fieldRef: "contact_email",
                            answerType: "email",
                            value: "sarah.johnson@company.com"
                        },
                        {
                            fieldId: "field_nps_05",
                            fieldType: "nps",
                            fieldRef: "nps_score",
                            answerType: "number",
                            value: 10
                        }
                    ]
                },
                {
                    landingId: "landing_005",
                    token: "resp_token_mno345",
                    responseId: "response_005",
                    landedAt: "2024-01-16T11:20:00.000Z",
                    submittedAt: "2024-01-16T11:28:45.000Z",
                    isCompleted: true,
                    metadata: {
                        userAgent: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36",
                        platform: "mobile",
                        referer: "https://twitter.com",
                        browser: "default"
                    },
                    hiddenFields: {
                        customer_id: "cust_22222",
                        utm_source: "social"
                    },
                    calculatedScore: 40,
                    answers: [
                        {
                            fieldId: "field_rating_01",
                            fieldType: "opinion_scale",
                            fieldRef: "overall_satisfaction",
                            answerType: "number",
                            value: 4
                        },
                        {
                            fieldId: "field_choice_02",
                            fieldType: "multiple_choice",
                            fieldRef: "product_used",
                            answerType: "choices",
                            value: ["Product A"]
                        },
                        {
                            fieldId: "field_text_03",
                            fieldType: "long_text",
                            fieldRef: "feedback_comments",
                            answerType: "text",
                            value: "The product has potential but there are too many bugs. Needs more stability."
                        },
                        {
                            fieldId: "field_nps_05",
                            fieldType: "nps",
                            fieldRef: "nps_score",
                            answerType: "number",
                            value: 4
                        }
                    ]
                }
            ]
        },
        validCases: [
            {
                name: "list_all_responses",
                description:
                    "Get all responses (submissions) for a specific typeform. Returns response metadata and answers.",
                input: {
                    formId: "abc123xyz"
                },
                expectedOutput: {
                    totalItems: 5,
                    pageCount: 1,
                    responses: [
                        {
                            landingId: "landing_001",
                            token: "resp_token_abc123",
                            responseId: "response_001",
                            landedAt: "2024-01-20T10:00:00.000Z",
                            submittedAt: "2024-01-20T10:05:32.000Z",
                            isCompleted: true,
                            metadata: {
                                userAgent:
                                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                                platform: "other",
                                referer: "https://example.com/feedback",
                                browser: "default"
                            },
                            hiddenFields: {
                                customer_id: "cust_12345",
                                utm_source: "email"
                            },
                            calculatedScore: 85,
                            answers: [
                                {
                                    fieldId: "field_rating_01",
                                    fieldType: "opinion_scale",
                                    fieldRef: "overall_satisfaction",
                                    answerType: "number",
                                    value: 9
                                }
                            ]
                        }
                    ]
                }
            },
            {
                name: "list_completed_responses_only",
                description: "Filter responses to only show completed submissions",
                input: {
                    formId: "abc123xyz",
                    completed: true
                },
                expectedOutput: {
                    totalItems: 4,
                    pageCount: 1,
                    responses: [
                        {
                            landingId: "landing_001",
                            token: "resp_token_abc123",
                            responseId: "response_001",
                            landedAt: "2024-01-20T10:00:00.000Z",
                            submittedAt: "2024-01-20T10:05:32.000Z",
                            isCompleted: true,
                            metadata: {
                                userAgent:
                                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                                platform: "other",
                                referer: "https://example.com/feedback",
                                browser: "default"
                            },
                            hiddenFields: {
                                customer_id: "cust_12345",
                                utm_source: "email"
                            },
                            calculatedScore: 85,
                            answers: []
                        }
                    ]
                }
            },
            {
                name: "list_responses_with_date_range",
                description: "Get responses submitted within a specific date range",
                input: {
                    formId: "abc123xyz",
                    since: "2024-01-18T00:00:00.000Z",
                    until: "2024-01-21T00:00:00.000Z"
                },
                expectedOutput: {
                    totalItems: 2,
                    pageCount: 1,
                    responses: [
                        {
                            landingId: "landing_001",
                            token: "resp_token_abc123",
                            responseId: "response_001",
                            landedAt: "2024-01-20T10:00:00.000Z",
                            submittedAt: "2024-01-20T10:05:32.000Z",
                            isCompleted: true
                        },
                        {
                            landingId: "landing_002",
                            token: "resp_token_def456",
                            responseId: "response_002",
                            landedAt: "2024-01-19T14:30:00.000Z",
                            submittedAt: "2024-01-19T14:38:15.000Z",
                            isCompleted: true
                        }
                    ]
                }
            },
            {
                name: "list_responses_sorted_ascending",
                description: "Get responses sorted by submission date in ascending order",
                input: {
                    formId: "abc123xyz",
                    sort: "submitted_at,asc",
                    completed: true
                },
                expectedOutput: {
                    totalItems: 4,
                    pageCount: 1,
                    responses: [
                        {
                            landingId: "landing_005",
                            token: "resp_token_mno345",
                            responseId: "response_005",
                            landedAt: "2024-01-16T11:20:00.000Z",
                            submittedAt: "2024-01-16T11:28:45.000Z",
                            isCompleted: true
                        },
                        {
                            landingId: "landing_004",
                            token: "resp_token_jkl012",
                            responseId: "response_004",
                            landedAt: "2024-01-17T16:45:00.000Z",
                            submittedAt: "2024-01-17T16:52:00.000Z",
                            isCompleted: true
                        }
                    ]
                }
            },
            {
                name: "list_responses_with_pagination",
                description: "Get responses with pagination - first 2 responses",
                input: {
                    formId: "abc123xyz",
                    pageSize: 2
                },
                expectedOutput: {
                    totalItems: 5,
                    pageCount: 3,
                    responses: [
                        {
                            landingId: "landing_001",
                            token: "resp_token_abc123",
                            responseId: "response_001",
                            landedAt: "2024-01-20T10:00:00.000Z",
                            submittedAt: "2024-01-20T10:05:32.000Z",
                            isCompleted: true
                        },
                        {
                            landingId: "landing_002",
                            token: "resp_token_def456",
                            responseId: "response_002",
                            landedAt: "2024-01-19T14:30:00.000Z",
                            submittedAt: "2024-01-19T14:38:15.000Z",
                            isCompleted: true
                        }
                    ]
                }
            },
            {
                name: "list_responses_with_specific_fields",
                description: "Get responses including only specific field answers",
                input: {
                    formId: "abc123xyz",
                    fields: ["field_rating_01", "field_nps_05"]
                },
                expectedOutput: {
                    totalItems: 5,
                    pageCount: 1,
                    responses: [
                        {
                            landingId: "landing_001",
                            token: "resp_token_abc123",
                            responseId: "response_001",
                            landedAt: "2024-01-20T10:00:00.000Z",
                            submittedAt: "2024-01-20T10:05:32.000Z",
                            isCompleted: true,
                            answers: [
                                {
                                    fieldId: "field_rating_01",
                                    fieldType: "opinion_scale",
                                    fieldRef: "overall_satisfaction",
                                    answerType: "number",
                                    value: 9
                                },
                                {
                                    fieldId: "field_nps_05",
                                    fieldType: "nps",
                                    fieldRef: "nps_score",
                                    answerType: "number",
                                    value: 9
                                }
                            ]
                        }
                    ]
                }
            },
            {
                name: "list_responses_with_query_search",
                description: "Search responses by answer content",
                input: {
                    formId: "abc123xyz",
                    query: "excellent"
                },
                expectedOutput: {
                    totalItems: 1,
                    pageCount: 1,
                    responses: [
                        {
                            landingId: "landing_001",
                            token: "resp_token_abc123",
                            responseId: "response_001",
                            landedAt: "2024-01-20T10:00:00.000Z",
                            submittedAt: "2024-01-20T10:05:32.000Z",
                            isCompleted: true
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
                    formId: "nonexistent_form_id"
                },
                expectedError: {
                    type: "not_found",
                    message: 'Form with ID "nonexistent_form_id" not found',
                    retryable: false
                }
            },
            {
                name: "invalid_date_format",
                description: "Invalid date format for since/until parameters",
                input: {
                    formId: "abc123xyz",
                    since: "invalid-date"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid date format for 'since' parameter. Use ISO 8601 format.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    formId: "abc123xyz"
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
        operationId: "listWorkspaces",
        provider: "typeform",
        filterableData: {
            recordsField: "workspaces",
            offsetField: "pageCount",
            defaultPageSize: 10,
            maxPageSize: 200,
            pageSizeParam: "pageSize",
            offsetParam: "page",
            filterConfig: {
                type: "generic",
                filterableFields: ["name"]
            },
            records: [
                {
                    id: "ws_default_001",
                    name: "My Workspace",
                    isDefault: true,
                    isShared: false,
                    formCount: 12,
                    formsHref: "https://api.typeform.com/workspaces/ws_default_001/forms",
                    selfHref: "https://api.typeform.com/workspaces/ws_default_001",
                    members: [
                        {
                            email: "owner@example.com",
                            name: "Account Owner",
                            role: "owner"
                        }
                    ]
                },
                {
                    id: "ws_marketing",
                    name: "Marketing Team",
                    isDefault: false,
                    isShared: true,
                    formCount: 8,
                    formsHref: "https://api.typeform.com/workspaces/ws_marketing/forms",
                    selfHref: "https://api.typeform.com/workspaces/ws_marketing",
                    members: [
                        {
                            email: "owner@example.com",
                            name: "Account Owner",
                            role: "owner"
                        },
                        {
                            email: "marketing.lead@example.com",
                            name: "Marketing Lead",
                            role: "admin"
                        },
                        {
                            email: "content.creator@example.com",
                            name: "Content Creator",
                            role: "member"
                        }
                    ]
                },
                {
                    id: "ws_hr",
                    name: "Human Resources",
                    isDefault: false,
                    isShared: true,
                    formCount: 15,
                    formsHref: "https://api.typeform.com/workspaces/ws_hr/forms",
                    selfHref: "https://api.typeform.com/workspaces/ws_hr",
                    members: [
                        {
                            email: "hr.director@example.com",
                            name: "HR Director",
                            role: "admin"
                        },
                        {
                            email: "recruiter@example.com",
                            name: "Senior Recruiter",
                            role: "member"
                        }
                    ]
                },
                {
                    id: "ws_events",
                    name: "Events & Conferences",
                    isDefault: false,
                    isShared: true,
                    formCount: 6,
                    formsHref: "https://api.typeform.com/workspaces/ws_events/forms",
                    selfHref: "https://api.typeform.com/workspaces/ws_events",
                    members: [
                        {
                            email: "events.manager@example.com",
                            name: "Events Manager",
                            role: "admin"
                        }
                    ]
                },
                {
                    id: "ws_training",
                    name: "Training & Development",
                    isDefault: false,
                    isShared: true,
                    formCount: 10,
                    formsHref: "https://api.typeform.com/workspaces/ws_training/forms",
                    selfHref: "https://api.typeform.com/workspaces/ws_training",
                    members: [
                        {
                            email: "training.lead@example.com",
                            name: "Training Lead",
                            role: "admin"
                        },
                        {
                            email: "instructor@example.com",
                            name: "Instructor",
                            role: "member"
                        }
                    ]
                },
                {
                    id: "ws_support",
                    name: "Customer Support",
                    isDefault: false,
                    isShared: true,
                    formCount: 4,
                    formsHref: "https://api.typeform.com/workspaces/ws_support/forms",
                    selfHref: "https://api.typeform.com/workspaces/ws_support",
                    members: [
                        {
                            email: "support.manager@example.com",
                            name: "Support Manager",
                            role: "admin"
                        },
                        {
                            email: "support.agent@example.com",
                            name: "Support Agent",
                            role: "member"
                        }
                    ]
                }
            ]
        },
        validCases: [
            {
                name: "list_all_workspaces",
                description:
                    "List all workspaces in the Typeform account. Workspaces are containers for organizing forms.",
                input: {},
                expectedOutput: {
                    totalItems: 6,
                    pageCount: 1,
                    workspaces: [
                        {
                            id: "ws_default_001",
                            name: "My Workspace",
                            isDefault: true,
                            isShared: false,
                            formCount: 12,
                            formsHref: "https://api.typeform.com/workspaces/ws_default_001/forms",
                            selfHref: "https://api.typeform.com/workspaces/ws_default_001",
                            members: [
                                {
                                    email: "owner@example.com",
                                    name: "Account Owner",
                                    role: "owner"
                                }
                            ]
                        },
                        {
                            id: "ws_marketing",
                            name: "Marketing Team",
                            isDefault: false,
                            isShared: true,
                            formCount: 8,
                            formsHref: "https://api.typeform.com/workspaces/ws_marketing/forms",
                            selfHref: "https://api.typeform.com/workspaces/ws_marketing",
                            members: [
                                {
                                    email: "owner@example.com",
                                    name: "Account Owner",
                                    role: "owner"
                                },
                                {
                                    email: "marketing.lead@example.com",
                                    name: "Marketing Lead",
                                    role: "admin"
                                },
                                {
                                    email: "content.creator@example.com",
                                    name: "Content Creator",
                                    role: "member"
                                }
                            ]
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "permission",
                description: "Invalid or expired access token",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Authentication required",
                    retryable: false
                }
            },
            {
                name: "invalid_page_size",
                description: "Page size exceeds maximum allowed",
                input: {
                    pageSize: 500
                },
                expectedError: {
                    type: "validation",
                    message: "Page size cannot exceed 200",
                    retryable: false
                }
            }
        ]
    }
];
