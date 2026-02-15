/**
 * Google Meet Provider Test Fixtures
 *
 * Based on Google Meet REST API v2 documentation:
 * - Spaces: https://developers.google.com/meet/api/reference/rest/v2/spaces
 * - Conference Records: https://developers.google.com/meet/api/reference/rest/v2/conferenceRecords
 * - Participants: https://developers.google.com/meet/api/reference/rest/v2/conferenceRecords.participants
 */

import type { TestFixture } from "../../sandbox";

export const googleMeetFixtures: TestFixture[] = [
    // ============================================================================
    // SPACES
    // ============================================================================
    {
        operationId: "createSpace",
        provider: "google-meet",
        validCases: [
            {
                name: "default_space",
                description: "Create a space with default configuration",
                input: {},
                expectedOutput: {
                    name: "spaces/abc-defg-hij",
                    meetingUri: "https://meet.google.com/abc-defg-hij",
                    meetingCode: "abc-defg-hij",
                    config: {
                        accessType: "OPEN",
                        entryPointAccess: "ALL"
                    }
                }
            },
            {
                name: "restricted_space",
                description: "Create a space with restricted access",
                input: {
                    accessType: "RESTRICTED",
                    entryPointAccess: "CREATOR_APP_ONLY"
                },
                expectedOutput: {
                    name: "spaces/klm-nopq-rst",
                    meetingUri: "https://meet.google.com/klm-nopq-rst",
                    meetingCode: "klm-nopq-rst",
                    config: {
                        accessType: "RESTRICTED",
                        entryPointAccess: "CREATOR_APP_ONLY"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "permission_denied",
                description: "User does not have permission to create spaces",
                input: {},
                expectedError: {
                    type: "permission",
                    message:
                        "Permission denied: Caller does not have required permission to create meeting spaces.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Google Meet rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getSpace",
        provider: "google-meet",
        validCases: [
            {
                name: "active_space",
                description: "Get details of an active meeting space",
                input: {
                    name: "spaces/abc-defg-hij"
                },
                expectedOutput: {
                    name: "spaces/abc-defg-hij",
                    meetingUri: "https://meet.google.com/abc-defg-hij",
                    meetingCode: "abc-defg-hij",
                    config: {
                        accessType: "OPEN",
                        entryPointAccess: "ALL"
                    },
                    activeConference: {
                        conferenceRecord: "conferenceRecords/rec-001"
                    }
                }
            },
            {
                name: "idle_space",
                description: "Get details of a space with no active conference",
                input: {
                    name: "spaces/uvw-xyza-bcd"
                },
                expectedOutput: {
                    name: "spaces/uvw-xyza-bcd",
                    meetingUri: "https://meet.google.com/uvw-xyza-bcd",
                    meetingCode: "uvw-xyza-bcd",
                    config: {
                        accessType: "TRUSTED",
                        entryPointAccess: "ALL"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Space does not exist",
                input: {
                    name: "spaces/nonexistent-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Google Meet resource not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "spaces/abc-defg-hij"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Google Meet rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateSpace",
        provider: "google-meet",
        validCases: [
            {
                name: "update_access_type",
                description: "Update space access type to restricted",
                input: {
                    name: "spaces/abc-defg-hij",
                    config: {
                        accessType: "RESTRICTED"
                    }
                },
                expectedOutput: {
                    name: "spaces/abc-defg-hij",
                    meetingUri: "https://meet.google.com/abc-defg-hij",
                    meetingCode: "abc-defg-hij",
                    config: {
                        accessType: "RESTRICTED",
                        entryPointAccess: "ALL"
                    }
                }
            },
            {
                name: "update_entry_point",
                description: "Update space entry point access",
                input: {
                    name: "spaces/klm-nopq-rst",
                    config: {
                        entryPointAccess: "CREATOR_APP_ONLY"
                    },
                    updateMask: "config.entryPointAccess"
                },
                expectedOutput: {
                    name: "spaces/klm-nopq-rst",
                    meetingUri: "https://meet.google.com/klm-nopq-rst",
                    meetingCode: "klm-nopq-rst",
                    config: {
                        accessType: "OPEN",
                        entryPointAccess: "CREATOR_APP_ONLY"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_update_mask",
                description: "Invalid update mask field path",
                input: {
                    name: "spaces/abc-defg-hij",
                    config: {
                        accessType: "OPEN"
                    },
                    updateMask: "config.invalidField"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Invalid request: Invalid field path in update mask: config.invalidField",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "spaces/abc-defg-hij",
                    config: {
                        accessType: "OPEN"
                    }
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Google Meet rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "endActiveConference",
        provider: "google-meet",
        validCases: [
            {
                name: "end_active_meeting",
                description: "End an active conference in a space",
                input: {
                    name: "spaces/abc-defg-hij"
                },
                expectedOutput: {
                    ended: true,
                    spaceName: "spaces/abc-defg-hij"
                }
            },
            {
                name: "end_meeting_by_id",
                description: "End an active conference using space ID only",
                input: {
                    name: "klm-nopq-rst"
                },
                expectedOutput: {
                    ended: true,
                    spaceName: "klm-nopq-rst"
                }
            }
        ],
        errorCases: [
            {
                name: "no_active_conference",
                description: "Space has no active conference to end",
                input: {
                    name: "spaces/uvw-xyza-bcd"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid request: No active conference in this space.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "spaces/abc-defg-hij"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Google Meet rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // CONFERENCE RECORDS
    // ============================================================================
    {
        operationId: "listConferenceRecords",
        provider: "google-meet",
        validCases: [
            {
                name: "list_all_records",
                description: "List all conference records",
                input: {},
                expectedOutput: {
                    conferenceRecords: [
                        {
                            name: "conferenceRecords/rec-001",
                            startTime: "2024-08-15T10:00:00Z",
                            endTime: "2024-08-15T11:00:00Z",
                            expireTime: "2024-09-14T11:00:00Z",
                            space: "spaces/abc-defg-hij"
                        },
                        {
                            name: "conferenceRecords/rec-002",
                            startTime: "2024-08-16T14:30:00Z",
                            endTime: "2024-08-16T15:15:00Z",
                            expireTime: "2024-09-15T15:15:00Z",
                            space: "spaces/klm-nopq-rst"
                        }
                    ]
                }
            },
            {
                name: "list_with_filter",
                description: "List conference records filtered by space",
                input: {
                    filter: "space.name=spaces/abc-defg-hij",
                    pageSize: 10
                },
                expectedOutput: {
                    conferenceRecords: [
                        {
                            name: "conferenceRecords/rec-001",
                            startTime: "2024-08-15T10:00:00Z",
                            endTime: "2024-08-15T11:00:00Z",
                            expireTime: "2024-09-14T11:00:00Z",
                            space: "spaces/abc-defg-hij"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_filter",
                description: "Invalid filter expression",
                input: {
                    filter: "invalid.field=value"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid request: Unsupported filter field: invalid.field",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Google Meet rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getConferenceRecord",
        provider: "google-meet",
        validCases: [
            {
                name: "completed_conference",
                description: "Get a completed conference record",
                input: {
                    name: "conferenceRecords/rec-001"
                },
                expectedOutput: {
                    name: "conferenceRecords/rec-001",
                    startTime: "2024-08-15T10:00:00Z",
                    endTime: "2024-08-15T11:00:00Z",
                    expireTime: "2024-09-14T11:00:00Z",
                    space: "spaces/abc-defg-hij"
                }
            },
            {
                name: "ongoing_conference",
                description: "Get an ongoing conference record (no endTime)",
                input: {
                    name: "conferenceRecords/rec-003"
                },
                expectedOutput: {
                    name: "conferenceRecords/rec-003",
                    startTime: "2024-08-17T09:00:00Z",
                    expireTime: "2024-09-16T09:00:00Z",
                    space: "spaces/efg-hijk-lmn"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Conference record does not exist",
                input: {
                    name: "conferenceRecords/nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Google Meet resource not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "conferenceRecords/rec-001"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Google Meet rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // PARTICIPANTS
    // ============================================================================
    {
        operationId: "listParticipants",
        provider: "google-meet",
        validCases: [
            {
                name: "all_participants",
                description: "List all participants of a conference",
                input: {
                    conferenceRecordName: "conferenceRecords/rec-001"
                },
                expectedOutput: {
                    participants: [
                        {
                            name: "conferenceRecords/rec-001/participants/p1",
                            earliestStartTime: "2024-08-15T10:00:00Z",
                            latestEndTime: "2024-08-15T11:00:00Z",
                            signedinUser: {
                                user: "users/user-001",
                                displayName: "Alice Johnson"
                            }
                        },
                        {
                            name: "conferenceRecords/rec-001/participants/p2",
                            earliestStartTime: "2024-08-15T10:05:00Z",
                            latestEndTime: "2024-08-15T10:45:00Z",
                            signedinUser: {
                                user: "users/user-002",
                                displayName: "Bob Williams"
                            }
                        },
                        {
                            name: "conferenceRecords/rec-001/participants/p3",
                            earliestStartTime: "2024-08-15T10:10:00Z",
                            latestEndTime: "2024-08-15T11:00:00Z",
                            anonymousUser: {
                                displayName: "Anonymous Panda"
                            }
                        }
                    ],
                    totalSize: 3
                }
            },
            {
                name: "paginated_participants",
                description: "List participants with pagination",
                input: {
                    conferenceRecordName: "conferenceRecords/rec-002",
                    pageSize: 2
                },
                expectedOutput: {
                    participants: [
                        {
                            name: "conferenceRecords/rec-002/participants/p1",
                            earliestStartTime: "2024-08-16T14:30:00Z",
                            latestEndTime: "2024-08-16T15:15:00Z",
                            signedinUser: {
                                user: "users/user-003",
                                displayName: "Carol Davis"
                            }
                        },
                        {
                            name: "conferenceRecords/rec-002/participants/p2",
                            earliestStartTime: "2024-08-16T14:32:00Z",
                            latestEndTime: "2024-08-16T15:10:00Z",
                            phoneUser: {
                                displayName: "+1 555-0123"
                            }
                        }
                    ],
                    nextPageToken: "next_page_token_abc123",
                    totalSize: 5
                }
            }
        ],
        errorCases: [
            {
                name: "conference_not_found",
                description: "Conference record does not exist",
                input: {
                    conferenceRecordName: "conferenceRecords/nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Google Meet resource not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    conferenceRecordName: "conferenceRecords/rec-001"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Google Meet rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getParticipant",
        provider: "google-meet",
        validCases: [
            {
                name: "signed_in_participant",
                description: "Get a signed-in participant",
                input: {
                    name: "conferenceRecords/rec-001/participants/p1"
                },
                expectedOutput: {
                    name: "conferenceRecords/rec-001/participants/p1",
                    earliestStartTime: "2024-08-15T10:00:00Z",
                    latestEndTime: "2024-08-15T11:00:00Z",
                    signedinUser: {
                        user: "users/user-001",
                        displayName: "Alice Johnson"
                    }
                }
            },
            {
                name: "anonymous_participant",
                description: "Get an anonymous participant",
                input: {
                    name: "conferenceRecords/rec-001/participants/p3"
                },
                expectedOutput: {
                    name: "conferenceRecords/rec-001/participants/p3",
                    earliestStartTime: "2024-08-15T10:10:00Z",
                    latestEndTime: "2024-08-15T11:00:00Z",
                    anonymousUser: {
                        displayName: "Anonymous Panda"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Participant does not exist",
                input: {
                    name: "conferenceRecords/rec-001/participants/nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Google Meet resource not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "conferenceRecords/rec-001/participants/p1"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Google Meet rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    }
];
