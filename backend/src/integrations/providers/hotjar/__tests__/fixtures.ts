/**
 * Hotjar Provider Test Fixtures
 */

import type { TestFixture } from "../../../sandbox";

export const hotjarFixtures: TestFixture[] = [
    {
        operationId: "listSurveys",
        provider: "hotjar",
        validCases: [
            {
                name: "list_surveys_for_site",
                description: "List all surveys for a site",
                input: {
                    site_id: "1234567"
                },
                expectedOutput: {
                    results: [
                        {
                            id: "survey_001",
                            name: "NPS Survey Q1 2025",
                            site_id: "1234567",
                            type: "nps",
                            status: "active",
                            created_at: "2025-01-15T10:00:00Z",
                            updated_at: "2025-01-20T14:30:00Z"
                        },
                        {
                            id: "survey_002",
                            name: "Post-Purchase Feedback",
                            site_id: "1234567",
                            type: "survey",
                            status: "active",
                            created_at: "2025-02-01T09:00:00Z",
                            updated_at: "2025-02-05T11:15:00Z"
                        },
                        {
                            id: "survey_003",
                            name: "Exit Intent Survey",
                            site_id: "1234567",
                            type: "survey",
                            status: "paused",
                            created_at: "2024-11-10T08:00:00Z",
                            updated_at: "2025-01-05T16:00:00Z"
                        }
                    ],
                    next_cursor: null
                }
            },
            {
                name: "list_surveys_with_questions",
                description: "List surveys including question details",
                input: {
                    site_id: "1234567",
                    with_questions: true
                },
                expectedOutput: {
                    results: [
                        {
                            id: "survey_001",
                            name: "NPS Survey Q1 2025",
                            site_id: "1234567",
                            type: "nps",
                            status: "active",
                            created_at: "2025-01-15T10:00:00Z",
                            updated_at: "2025-01-20T14:30:00Z",
                            questions: [
                                {
                                    id: "q_001",
                                    type: "nps",
                                    text: "How likely are you to recommend us to a friend?",
                                    position: 1
                                },
                                {
                                    id: "q_002",
                                    type: "open_text",
                                    text: "What could we do to improve?",
                                    position: 2
                                }
                            ]
                        }
                    ],
                    next_cursor: null
                }
            }
        ],
        errorCases: [
            {
                name: "missing_site_id",
                description: "Site ID is required",
                input: {},
                expectedError: {
                    type: "validation",
                    message: "Required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    site_id: "1234567"
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
        operationId: "getSurveyResponses",
        provider: "hotjar",
        validCases: [
            {
                name: "get_responses_for_survey",
                description: "Get responses for a specific survey",
                input: {
                    site_id: "1234567",
                    survey_id: "survey_001"
                },
                expectedOutput: {
                    results: [
                        {
                            id: "resp_001",
                            survey_id: "survey_001",
                            created_at: "2025-01-22T15:30:00Z",
                            answers: [
                                { question_id: "q_001", value: 9 },
                                { question_id: "q_002", value: "Great product, love the UX!" }
                            ],
                            browser: "Chrome 120",
                            device: "desktop",
                            country: "US",
                            os: "macOS 14"
                        },
                        {
                            id: "resp_002",
                            survey_id: "survey_001",
                            created_at: "2025-01-22T16:45:00Z",
                            answers: [
                                { question_id: "q_001", value: 7 },
                                {
                                    question_id: "q_002",
                                    value: "Checkout process could be faster"
                                }
                            ],
                            browser: "Safari 17",
                            device: "mobile",
                            country: "GB",
                            os: "iOS 17"
                        }
                    ],
                    next_cursor: null
                }
            },
            {
                name: "get_responses_with_pagination",
                description: "Get paginated survey responses",
                input: {
                    site_id: "1234567",
                    survey_id: "survey_001",
                    limit: 1
                },
                expectedOutput: {
                    results: [
                        {
                            id: "resp_001",
                            survey_id: "survey_001",
                            created_at: "2025-01-22T15:30:00Z",
                            answers: [
                                { question_id: "q_001", value: 9 },
                                { question_id: "q_002", value: "Great product, love the UX!" }
                            ],
                            browser: "Chrome 120",
                            device: "desktop",
                            country: "US",
                            os: "macOS 14"
                        }
                    ],
                    next_cursor: "eyJpZCI6InJlc3BfMDAxIn0="
                }
            }
        ],
        errorCases: [
            {
                name: "missing_site_id",
                description: "Site ID is required",
                input: {
                    survey_id: "survey_001"
                },
                expectedError: {
                    type: "validation",
                    message: "Required",
                    retryable: false
                }
            },
            {
                name: "missing_survey_id",
                description: "Survey ID is required",
                input: {
                    site_id: "1234567"
                },
                expectedError: {
                    type: "validation",
                    message: "Required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    site_id: "1234567",
                    survey_id: "survey_001"
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
        operationId: "userLookup",
        provider: "hotjar",
        validCases: [
            {
                name: "lookup_by_email",
                description: "Look up a user by email address",
                input: {
                    organization_id: "org_12345",
                    data_subject_email: "user@example.com"
                },
                expectedOutput: {
                    status: "accepted",
                    message: "User lookup request accepted and is being processed",
                    request_id: "req_abc123def456"
                }
            },
            {
                name: "lookup_by_site_user_map",
                description: "Look up a user by site ID to user ID mapping",
                input: {
                    organization_id: "org_12345",
                    data_subject_site_id_to_user_id_map: {
                        "1234567": "user_789"
                    }
                },
                expectedOutput: {
                    status: "accepted",
                    message: "User lookup request accepted and is being processed",
                    request_id: "req_ghi789jkl012"
                }
            },
            {
                name: "delete_user_data",
                description: "Delete all hits for a data subject",
                input: {
                    organization_id: "org_12345",
                    data_subject_email: "user@example.com",
                    delete_all_hits: true
                },
                expectedOutput: {
                    status: "accepted",
                    message: "User data deletion request accepted and is being processed",
                    request_id: "req_mno345pqr678"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_identifier",
                description:
                    "At least one of data_subject_email or data_subject_site_id_to_user_id_map is required",
                input: {
                    organization_id: "org_12345"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "At least one of data_subject_email or data_subject_site_id_to_user_id_map is required",
                    retryable: false
                }
            },
            {
                name: "missing_organization_id",
                description: "Organization ID is required",
                input: {
                    data_subject_email: "user@example.com"
                },
                expectedError: {
                    type: "validation",
                    message: "Required",
                    retryable: false
                }
            }
        ]
    }
];
