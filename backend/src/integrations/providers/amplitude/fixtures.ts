/**
 * Amplitude Provider Test Fixtures
 */

import type { TestFixture } from "../../sandbox";

export const amplitudeFixtures: TestFixture[] = [
    {
        operationId: "trackEvent",
        provider: "amplitude",
        validCases: [
            {
                name: "track_event_with_user_id",
                description: "Track a single event with user ID",
                input: {
                    user_id: "user_123",
                    event_type: "button_clicked",
                    event_properties: {
                        button_name: "signup",
                        page: "homepage"
                    }
                },
                expectedOutput: {
                    code: 200,
                    events_ingested: 1,
                    server_upload_time: 1705939200000
                }
            }
        ],
        errorCases: [
            {
                name: "missing_user_and_device_id",
                description: "Either user_id or device_id is required",
                input: {
                    event_type: "button_clicked"
                },
                expectedError: {
                    type: "validation",
                    message: "Either user_id or device_id is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    user_id: "user_123",
                    event_type: "test"
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
        operationId: "trackEvents",
        provider: "amplitude",
        validCases: [
            {
                name: "track_multiple_events",
                description: "Track multiple events in a batch",
                input: {
                    events: [
                        {
                            user_id: "user_123",
                            event_type: "page_view",
                            event_properties: { page: "home" }
                        },
                        {
                            user_id: "user_123",
                            event_type: "button_clicked",
                            event_properties: { button: "cta" }
                        }
                    ]
                },
                expectedOutput: {
                    code: 200,
                    events_ingested: 2,
                    server_upload_time: 1705939200000
                }
            }
        ],
        errorCases: [
            {
                name: "empty_events_array",
                description: "Events array cannot be empty",
                input: {
                    events: []
                },
                expectedError: {
                    type: "validation",
                    message: "Events array cannot be empty",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "identifyUser",
        provider: "amplitude",
        validCases: [
            {
                name: "identify_user_set_properties",
                description: "Set user properties",
                input: {
                    user_id: "user_123",
                    user_properties: {
                        $set: {
                            name: "John Doe",
                            email: "john@example.com",
                            plan: "premium"
                        }
                    }
                },
                expectedOutput: {
                    code: 200,
                    events_ingested: 1,
                    server_upload_time: 1705939200000
                }
            }
        ],
        errorCases: [
            {
                name: "missing_user_and_device_id",
                description: "Either user_id or device_id is required",
                input: {
                    user_properties: {
                        $set: { name: "Test" }
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "Either user_id or device_id is required",
                    retryable: false
                }
            }
        ]
    }
];
