/**
 * Zoom Provider Test Fixtures
 *
 * Based on Zoom API v2 documentation:
 * - Meetings API: https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#tag/Meetings
 * - Users API: https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#tag/Users
 * - Cloud Recording API: https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#tag/Cloud-Recording
 */

import type { TestFixture } from "../../sandbox";

export const zoomFixtures: TestFixture[] = [
    // ============================================================================
    // MEETINGS - CREATE
    // ============================================================================
    {
        operationId: "createMeeting",
        provider: "zoom",
        validCases: [
            {
                name: "scheduled_meeting",
                description: "Create a scheduled meeting with basic settings",
                input: {
                    topic: "Weekly Team Standup",
                    type: 2,
                    start_time: "2024-06-20T09:00:00Z",
                    duration: 30,
                    timezone: "America/New_York",
                    agenda: "Discuss weekly progress and blockers"
                },
                expectedOutput: {
                    id: 85746529345,
                    uuid: "gkABCp2gQpCN3L6RaXyzAB==",
                    hostId: "KDcuGIm1QgePTO8WbOqwIQ",
                    topic: "Weekly Team Standup",
                    type: 2,
                    startTime: "2024-06-20T09:00:00Z",
                    duration: 30,
                    timezone: "America/New_York",
                    agenda: "Discuss weekly progress and blockers",
                    createdAt: "2024-06-15T14:30:00Z",
                    joinUrl: "https://zoom.us/j/85746529345",
                    startUrl: "https://zoom.us/s/85746529345?zak=abc123",
                    password: "Xy7k9L",
                    settings: {
                        host_video: true,
                        participant_video: true,
                        join_before_host: false,
                        mute_upon_entry: true,
                        auto_recording: "none",
                        waiting_room: true
                    }
                }
            },
            {
                name: "meeting_with_settings",
                description: "Create a meeting with custom settings",
                input: {
                    topic: "Client Demo Session",
                    type: 2,
                    start_time: "2024-06-25T15:00:00Z",
                    duration: 60,
                    timezone: "Europe/London",
                    password: "demo2024",
                    settings: {
                        host_video: true,
                        participant_video: false,
                        join_before_host: true,
                        mute_upon_entry: true,
                        auto_recording: "cloud",
                        waiting_room: false
                    }
                },
                expectedOutput: {
                    id: 91234567890,
                    uuid: "hLMNOp3rStUV4W5XyZabCD==",
                    hostId: "KDcuGIm1QgePTO8WbOqwIQ",
                    topic: "Client Demo Session",
                    type: 2,
                    startTime: "2024-06-25T15:00:00Z",
                    duration: 60,
                    timezone: "Europe/London",
                    createdAt: "2024-06-15T15:00:00Z",
                    joinUrl: "https://zoom.us/j/91234567890",
                    startUrl: "https://zoom.us/s/91234567890?zak=def456",
                    password: "demo2024",
                    settings: {
                        host_video: true,
                        participant_video: false,
                        join_before_host: true,
                        mute_upon_entry: true,
                        auto_recording: "cloud",
                        waiting_room: false
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_start_time",
                description: "Start time is in the past",
                input: {
                    topic: "Past Meeting",
                    type: 2,
                    start_time: "2020-01-01T00:00:00Z",
                    duration: 30
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Zoom API error (300): " + "Invalid date time for the start_time field",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    topic: "Rate Limited Meeting",
                    type: 2,
                    duration: 30
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by Zoom. " + "Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // MEETINGS - LIST
    // ============================================================================
    {
        operationId: "listMeetings",
        provider: "zoom",
        validCases: [
            {
                name: "list_scheduled",
                description: "List scheduled meetings",
                input: {
                    type: "scheduled",
                    page_size: 30
                },
                expectedOutput: {
                    meetings: [
                        {
                            id: 85746529345,
                            uuid: "gkABCp2gQpCN3L6RaXyzAB==",
                            hostId: "KDcuGIm1QgePTO8WbOqwIQ",
                            topic: "Weekly Team Standup",
                            type: 2,
                            startTime: "2024-06-20T09:00:00Z",
                            duration: 30,
                            timezone: "America/New_York",
                            createdAt: "2024-06-15T14:30:00Z",
                            joinUrl: "https://zoom.us/j/85746529345"
                        },
                        {
                            id: 91234567890,
                            uuid: "hLMNOp3rStUV4W5XyZabCD==",
                            hostId: "KDcuGIm1QgePTO8WbOqwIQ",
                            topic: "Client Demo Session",
                            type: 2,
                            startTime: "2024-06-25T15:00:00Z",
                            duration: 60,
                            timezone: "Europe/London",
                            createdAt: "2024-06-15T15:00:00Z",
                            joinUrl: "https://zoom.us/j/91234567890"
                        }
                    ],
                    pageCount: 1,
                    pageSize: 30,
                    totalRecords: 2
                }
            },
            {
                name: "list_upcoming",
                description: "List upcoming meetings with pagination",
                input: {
                    type: "upcoming",
                    page_size: 10
                },
                expectedOutput: {
                    meetings: [
                        {
                            id: 85746529345,
                            uuid: "gkABCp2gQpCN3L6RaXyzAB==",
                            hostId: "KDcuGIm1QgePTO8WbOqwIQ",
                            topic: "Weekly Team Standup",
                            type: 2,
                            startTime: "2024-06-20T09:00:00Z",
                            duration: 30,
                            timezone: "America/New_York",
                            createdAt: "2024-06-15T14:30:00Z",
                            joinUrl: "https://zoom.us/j/85746529345"
                        }
                    ],
                    pageCount: 1,
                    pageSize: 10,
                    totalRecords: 1
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Invalid access token",
                input: {
                    type: "scheduled"
                },
                expectedError: {
                    type: "permission",
                    message: "Zoom access token is invalid. " + "Please reconnect.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    type: "scheduled"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by Zoom. " + "Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // MEETINGS - GET
    // ============================================================================
    {
        operationId: "getMeeting",
        provider: "zoom",
        validCases: [
            {
                name: "scheduled_meeting",
                description: "Get details of a scheduled meeting",
                input: {
                    meetingId: "85746529345"
                },
                expectedOutput: {
                    id: 85746529345,
                    uuid: "gkABCp2gQpCN3L6RaXyzAB==",
                    hostId: "KDcuGIm1QgePTO8WbOqwIQ",
                    topic: "Weekly Team Standup",
                    type: 2,
                    status: "waiting",
                    startTime: "2024-06-20T09:00:00Z",
                    duration: 30,
                    timezone: "America/New_York",
                    agenda: "Discuss weekly progress and blockers",
                    createdAt: "2024-06-15T14:30:00Z",
                    joinUrl: "https://zoom.us/j/85746529345",
                    startUrl: "https://zoom.us/s/85746529345?zak=abc123",
                    password: "Xy7k9L",
                    settings: {
                        host_video: true,
                        participant_video: true,
                        join_before_host: false,
                        mute_upon_entry: true,
                        auto_recording: "none",
                        waiting_room: true
                    }
                }
            },
            {
                name: "started_meeting",
                description: "Get details of a meeting in progress",
                input: {
                    meetingId: 91234567890
                },
                expectedOutput: {
                    id: 91234567890,
                    uuid: "hLMNOp3rStUV4W5XyZabCD==",
                    hostId: "KDcuGIm1QgePTO8WbOqwIQ",
                    topic: "Client Demo Session",
                    type: 2,
                    status: "started",
                    startTime: "2024-06-25T15:00:00Z",
                    duration: 60,
                    timezone: "Europe/London",
                    createdAt: "2024-06-15T15:00:00Z",
                    joinUrl: "https://zoom.us/j/91234567890",
                    startUrl: "https://zoom.us/s/91234567890?zak=def456",
                    password: "demo2024",
                    settings: {
                        host_video: true,
                        participant_video: false,
                        join_before_host: true,
                        mute_upon_entry: true,
                        auto_recording: "cloud",
                        waiting_room: false
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Meeting does not exist",
                input: {
                    meetingId: "99999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Zoom API error: " + "Meeting not found: 99999999999",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    meetingId: "85746529345"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by Zoom. " + "Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // MEETINGS - UPDATE
    // ============================================================================
    {
        operationId: "updateMeeting",
        provider: "zoom",
        validCases: [
            {
                name: "update_topic_and_time",
                description: "Update meeting topic and start time",
                input: {
                    meetingId: "85746529345",
                    topic: "Updated Team Standup",
                    start_time: "2024-06-21T10:00:00Z",
                    duration: 45
                },
                expectedOutput: {
                    meetingId: "85746529345",
                    updated: true
                }
            },
            {
                name: "update_settings",
                description: "Update meeting settings only",
                input: {
                    meetingId: 91234567890,
                    settings: {
                        waiting_room: true,
                        mute_upon_entry: false,
                        auto_recording: "local"
                    }
                },
                expectedOutput: {
                    meetingId: 91234567890,
                    updated: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Meeting to update does not exist",
                input: {
                    meetingId: "99999999999",
                    topic: "Nonexistent Meeting"
                },
                expectedError: {
                    type: "not_found",
                    message: "Zoom API error: " + "Meeting not found: 99999999999",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    meetingId: "85746529345",
                    topic: "Rate Limited Update"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by Zoom. " + "Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // MEETINGS - DELETE
    // ============================================================================
    {
        operationId: "deleteMeeting",
        provider: "zoom",
        validCases: [
            {
                name: "delete_scheduled",
                description: "Delete a scheduled meeting",
                input: {
                    meetingId: "85746529345"
                },
                expectedOutput: {
                    meetingId: "85746529345",
                    deleted: true
                }
            },
            {
                name: "delete_by_numeric_id",
                description: "Delete a meeting using numeric ID",
                input: {
                    meetingId: 91234567890
                },
                expectedOutput: {
                    meetingId: 91234567890,
                    deleted: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Meeting to delete does not exist",
                input: {
                    meetingId: "99999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Zoom API error: " + "Meeting not found: 99999999999",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    meetingId: "85746529345"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by Zoom. " + "Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // USERS - GET
    // ============================================================================
    {
        operationId: "getUser",
        provider: "zoom",
        validCases: [
            {
                name: "licensed_user",
                description: "Get profile of a licensed Zoom user",
                input: {},
                expectedOutput: {
                    id: "KDcuGIm1QgePTO8WbOqwIQ",
                    firstName: "Jane",
                    lastName: "Smith",
                    email: "jane.smith@example.com",
                    type: 2,
                    status: "active",
                    pmi: 4567891230,
                    timezone: "America/New_York",
                    dept: "Engineering",
                    createdAt: "2023-01-15T08:00:00Z",
                    lastLoginTime: "2024-06-15T09:30:00Z",
                    picUrl: "https://zoom.us/p/KDcuGIm1QgePTO8WbOqwIQ",
                    language: "en-US",
                    accountId: "ACC_aBcDeFgHiJkLmN"
                }
            },
            {
                name: "basic_user",
                description: "Get profile of a basic Zoom user",
                input: {},
                expectedOutput: {
                    id: "PLmnOpQrStUv5W6XyZaBcD",
                    firstName: "John",
                    lastName: "Doe",
                    email: "john.doe@example.com",
                    type: 1,
                    status: "active",
                    pmi: 1234567890,
                    timezone: "Europe/London",
                    createdAt: "2024-03-10T12:00:00Z",
                    lastLoginTime: "2024-06-14T16:45:00Z",
                    language: "en-US",
                    accountId: "ACC_xYzAbCdEfGhIjK"
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Invalid access token",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Zoom access token is invalid. " + "Please reconnect.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by Zoom. " + "Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // RECORDINGS - LIST
    // ============================================================================
    {
        operationId: "listRecordings",
        provider: "zoom",
        validCases: [
            {
                name: "list_by_date_range",
                description: "List recordings within a date range",
                input: {
                    from: "2024-06-01",
                    to: "2024-06-30",
                    page_size: 30
                },
                expectedOutput: {
                    recordings: [
                        {
                            uuid: "qRsTuVwXyZ1A2B3C4D5E==",
                            id: 85746529345,
                            hostId: "KDcuGIm1QgePTO8WbOqwIQ",
                            topic: "Weekly Team Standup",
                            type: 2,
                            startTime: "2024-06-13T09:00:00Z",
                            timezone: "America/New_York",
                            duration: 28,
                            totalSize: 52428800,
                            recordingCount: 2,
                            shareUrl: "https://zoom.us/rec/share/abc123",
                            recordingFiles: [
                                {
                                    id: "rec-abc123",
                                    meetingId: "85746529345",
                                    recordingStart: "2024-06-13T09:00:00Z",
                                    recordingEnd: "2024-06-13T09:28:00Z",
                                    fileType: "MP4",
                                    fileExtension: "MP4",
                                    fileSize: 41943040,
                                    downloadUrl: "https://zoom.us/rec/download/abc123",
                                    playUrl: "https://zoom.us/rec/play/abc123",
                                    status: "completed",
                                    recordingType: "shared_screen_with_speaker_view"
                                },
                                {
                                    id: "rec-def456",
                                    meetingId: "85746529345",
                                    recordingStart: "2024-06-13T09:00:00Z",
                                    recordingEnd: "2024-06-13T09:28:00Z",
                                    fileType: "M4A",
                                    fileExtension: "M4A",
                                    fileSize: 10485760,
                                    downloadUrl: "https://zoom.us/rec/download/def456",
                                    status: "completed",
                                    recordingType: "audio_only"
                                }
                            ]
                        }
                    ],
                    from: "2024-06-01",
                    to: "2024-06-30",
                    pageCount: 1,
                    pageSize: 30,
                    totalRecords: 1
                }
            },
            {
                name: "list_default_range",
                description: "List recordings with default parameters",
                input: {},
                expectedOutput: {
                    recordings: [
                        {
                            uuid: "fGhIjKlMnOpQrStUvWxYz==",
                            id: 91234567890,
                            hostId: "KDcuGIm1QgePTO8WbOqwIQ",
                            topic: "Client Demo Session",
                            type: 2,
                            startTime: "2024-06-10T15:00:00Z",
                            timezone: "Europe/London",
                            duration: 55,
                            totalSize: 104857600,
                            recordingCount: 1,
                            recordingFiles: [
                                {
                                    id: "rec-ghi789",
                                    meetingId: "91234567890",
                                    recordingStart: "2024-06-10T15:00:00Z",
                                    recordingEnd: "2024-06-10T15:55:00Z",
                                    fileType: "MP4",
                                    fileExtension: "MP4",
                                    fileSize: 104857600,
                                    downloadUrl: "https://zoom.us/rec/download/ghi789",
                                    playUrl: "https://zoom.us/rec/play/ghi789",
                                    status: "completed",
                                    recordingType: "active_speaker"
                                }
                            ]
                        }
                    ],
                    pageCount: 1,
                    pageSize: 30,
                    totalRecords: 1
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Invalid access token",
                input: {
                    from: "2024-06-01",
                    to: "2024-06-30"
                },
                expectedError: {
                    type: "permission",
                    message: "Zoom access token is invalid. " + "Please reconnect.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    from: "2024-06-01",
                    to: "2024-06-30"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by Zoom. " + "Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // RECORDINGS - GET MEETING RECORDINGS
    // ============================================================================
    {
        operationId: "getMeetingRecordings",
        provider: "zoom",
        validCases: [
            {
                name: "meeting_with_recordings",
                description: "Get recordings for a meeting with multiple files",
                input: {
                    meetingId: "85746529345"
                },
                expectedOutput: {
                    uuid: "qRsTuVwXyZ1A2B3C4D5E==",
                    id: 85746529345,
                    hostId: "KDcuGIm1QgePTO8WbOqwIQ",
                    topic: "Weekly Team Standup",
                    type: 2,
                    startTime: "2024-06-13T09:00:00Z",
                    timezone: "America/New_York",
                    duration: 28,
                    totalSize: 52428800,
                    recordingCount: 2,
                    shareUrl: "https://zoom.us/rec/share/abc123",
                    recordingFiles: [
                        {
                            id: "rec-abc123",
                            meetingId: "85746529345",
                            recordingStart: "2024-06-13T09:00:00Z",
                            recordingEnd: "2024-06-13T09:28:00Z",
                            fileType: "MP4",
                            fileExtension: "MP4",
                            fileSize: 41943040,
                            downloadUrl: "https://zoom.us/rec/download/abc123",
                            playUrl: "https://zoom.us/rec/play/abc123",
                            status: "completed",
                            recordingType: "shared_screen_with_speaker_view"
                        },
                        {
                            id: "rec-def456",
                            meetingId: "85746529345",
                            recordingStart: "2024-06-13T09:00:00Z",
                            recordingEnd: "2024-06-13T09:28:00Z",
                            fileType: "M4A",
                            fileExtension: "M4A",
                            fileSize: 10485760,
                            downloadUrl: "https://zoom.us/rec/download/def456",
                            status: "completed",
                            recordingType: "audio_only"
                        }
                    ]
                }
            },
            {
                name: "meeting_with_single_recording",
                description: "Get recording for a meeting with one file",
                input: {
                    meetingId: 91234567890
                },
                expectedOutput: {
                    uuid: "fGhIjKlMnOpQrStUvWxYz==",
                    id: 91234567890,
                    hostId: "KDcuGIm1QgePTO8WbOqwIQ",
                    topic: "Client Demo Session",
                    type: 2,
                    startTime: "2024-06-10T15:00:00Z",
                    timezone: "Europe/London",
                    duration: 55,
                    totalSize: 104857600,
                    recordingCount: 1,
                    password: "demo2024",
                    recordingFiles: [
                        {
                            id: "rec-ghi789",
                            meetingId: "91234567890",
                            recordingStart: "2024-06-10T15:00:00Z",
                            recordingEnd: "2024-06-10T15:55:00Z",
                            fileType: "MP4",
                            fileExtension: "MP4",
                            fileSize: 104857600,
                            downloadUrl: "https://zoom.us/rec/download/ghi789",
                            playUrl: "https://zoom.us/rec/play/ghi789",
                            status: "completed",
                            recordingType: "active_speaker"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Meeting recordings not found",
                input: {
                    meetingId: "99999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Zoom API error: " + "Recording not found for meeting 99999999999",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    meetingId: "85746529345"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited by Zoom. " + "Please try again later.",
                    retryable: true
                }
            }
        ]
    }
];
