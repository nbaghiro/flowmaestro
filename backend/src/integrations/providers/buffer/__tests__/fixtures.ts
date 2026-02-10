/**
 * Buffer Provider Test Fixtures
 *
 * Based on official Buffer API documentation:
 * - Profiles: https://bufferapp.com/developers/api/profiles
 * - Updates: https://bufferapp.com/developers/api/updates
 *
 * Buffer is a social media management platform that allows users to schedule
 * and publish posts across multiple social media profiles including Twitter/X,
 * Facebook, Instagram, LinkedIn, and Pinterest.
 */

import type { TestFixture } from "../../../sandbox";

/**
 * Sample profiles representing connected social media accounts
 */
const sampleProfiles = [
    {
        id: "4eb854340acb04e870000010",
        service: "twitter",
        serviceId: "14561327",
        username: "acmecorp",
        formattedUsername: "@acmecorp",
        avatar: "https://pbs.twimg.com/profile_images/1234567890/acme_normal.jpg",
        timezone: "America/New_York",
        isDefault: true,
        pendingCount: 5,
        sentCount: 142,
        _service: "twitter"
    },
    {
        id: "4eb854340acb04e870000011",
        service: "facebook",
        serviceId: "123456789012345",
        username: "AcmeCorporation",
        formattedUsername: "Acme Corporation",
        avatar: "https://graph.facebook.com/123456789012345/picture?type=square",
        timezone: "America/New_York",
        isDefault: false,
        pendingCount: 3,
        sentCount: 89,
        _service: "facebook"
    },
    {
        id: "4eb854340acb04e870000012",
        service: "linkedin",
        serviceId: "urn:li:organization:12345678",
        username: "acme-corporation",
        formattedUsername: "Acme Corporation",
        avatar: "https://media.licdn.com/dms/image/C4E0BAQHexampleHash/company-logo",
        timezone: "America/Los_Angeles",
        isDefault: false,
        pendingCount: 2,
        sentCount: 56,
        _service: "linkedin"
    },
    {
        id: "4eb854340acb04e870000013",
        service: "instagram",
        serviceId: "987654321",
        username: "acmecorp_official",
        formattedUsername: "@acmecorp_official",
        avatar: "https://scontent.cdninstagram.com/v/t51.2885-19/example.jpg",
        timezone: "America/Chicago",
        isDefault: false,
        pendingCount: 8,
        sentCount: 234,
        _service: "instagram"
    },
    {
        id: "4eb854340acb04e870000014",
        service: "pinterest",
        serviceId: "pinner123456",
        username: "acmecorp",
        formattedUsername: "Acme Corp",
        avatar: "https://i.pinimg.com/avatars/acmecorp_example.jpg",
        timezone: "America/Denver",
        isDefault: false,
        pendingCount: 1,
        sentCount: 45,
        _service: "pinterest"
    }
];

/**
 * Sample pending updates in the queue
 */
const samplePendingUpdates = [
    {
        id: "4ecda256512f7ee521000001",
        text: "Excited to announce our new product launch! Stay tuned for more details. #innovation #tech",
        textFormatted:
            'Excited to announce our new product launch! Stay tuned for more details. <a href="https://twitter.com/hashtag/innovation">#innovation</a> <a href="https://twitter.com/hashtag/tech">#tech</a>',
        profileId: "4eb854340acb04e870000010",
        service: "twitter",
        status: "buffer",
        scheduledAt: "2024-02-15T14:00:00.000Z",
        dueAt: "2024-02-15T14:00:00.000Z",
        createdAt: "2024-02-10T09:30:00.000Z",
        media: {
            photo: "https://buffer-media-uploads.s3.amazonaws.com/product-launch.jpg",
            thumbnail: "https://buffer-media-uploads.s3.amazonaws.com/product-launch-thumb.jpg"
        },
        _profileId: "4eb854340acb04e870000010",
        _status: "buffer"
    },
    {
        id: "4ecda256512f7ee521000002",
        text: "Check out our latest blog post on maximizing productivity in remote teams! Link in bio.",
        textFormatted:
            "Check out our latest blog post on maximizing productivity in remote teams! Link in bio.",
        profileId: "4eb854340acb04e870000013",
        service: "instagram",
        status: "buffer",
        scheduledAt: "2024-02-15T18:30:00.000Z",
        dueAt: "2024-02-15T18:30:00.000Z",
        createdAt: "2024-02-10T10:15:00.000Z",
        media: {
            photo: "https://buffer-media-uploads.s3.amazonaws.com/blog-productivity.jpg",
            thumbnail: "https://buffer-media-uploads.s3.amazonaws.com/blog-productivity-thumb.jpg"
        },
        _profileId: "4eb854340acb04e870000013",
        _status: "buffer"
    },
    {
        id: "4ecda256512f7ee521000003",
        text: "Happy Friday, everyone! What are your weekend plans? Share in the comments!",
        textFormatted:
            "Happy Friday, everyone! What are your weekend plans? Share in the comments!",
        profileId: "4eb854340acb04e870000011",
        service: "facebook",
        status: "buffer",
        scheduledAt: "2024-02-16T12:00:00.000Z",
        dueAt: "2024-02-16T12:00:00.000Z",
        createdAt: "2024-02-10T11:00:00.000Z",
        _profileId: "4eb854340acb04e870000011",
        _status: "buffer"
    },
    {
        id: "4ecda256512f7ee521000004",
        text: "Join us for our upcoming webinar on digital transformation strategies. Register now: https://acme.co/webinar",
        textFormatted:
            'Join us for our upcoming webinar on digital transformation strategies. Register now: <a href="https://acme.co/webinar">https://acme.co/webinar</a>',
        profileId: "4eb854340acb04e870000012",
        service: "linkedin",
        status: "buffer",
        scheduledAt: "2024-02-17T15:00:00.000Z",
        dueAt: "2024-02-17T15:00:00.000Z",
        createdAt: "2024-02-10T14:30:00.000Z",
        media: {
            link: "https://acme.co/webinar",
            thumbnail: "https://buffer-media-uploads.s3.amazonaws.com/webinar-preview.jpg"
        },
        _profileId: "4eb854340acb04e870000012",
        _status: "buffer"
    },
    {
        id: "4ecda256512f7ee521000005",
        text: "Behind the scenes at our office! Our team is hard at work bringing you amazing products.",
        textFormatted:
            "Behind the scenes at our office! Our team is hard at work bringing you amazing products.",
        profileId: "4eb854340acb04e870000010",
        service: "twitter",
        status: "buffer",
        scheduledAt: "2024-02-18T10:00:00.000Z",
        dueAt: "2024-02-18T10:00:00.000Z",
        createdAt: "2024-02-10T16:00:00.000Z",
        media: {
            photo: "https://buffer-media-uploads.s3.amazonaws.com/office-bts.jpg",
            thumbnail: "https://buffer-media-uploads.s3.amazonaws.com/office-bts-thumb.jpg"
        },
        _profileId: "4eb854340acb04e870000010",
        _status: "buffer"
    }
];

export const bufferFixtures: TestFixture[] = [
    {
        operationId: "createUpdate",
        provider: "buffer",
        validCases: [
            {
                name: "create_update",
                description:
                    "Create a post across multiple social media profiles with media and scheduling",
                input: {
                    profileIds: [
                        "4eb854340acb04e870000010",
                        "4eb854340acb04e870000011",
                        "4eb854340acb04e870000012"
                    ],
                    text: "Big announcement coming tomorrow! Stay tuned for something special.",
                    media: {
                        photo: "https://example.com/announcement.jpg",
                        thumbnail: "https://example.com/announcement-thumb.jpg"
                    }
                },
                expectedOutput: {
                    message: "Update created successfully",
                    updates: [
                        {
                            id: "4ecda256512f7ee521000102",
                            text: "Big announcement coming tomorrow! Stay tuned for something special.",
                            profileId: "4eb854340acb04e870000010",
                            service: "twitter",
                            status: "buffer",
                            createdAt: "2024-02-10T12:00:00.000Z"
                        },
                        {
                            id: "4ecda256512f7ee521000103",
                            text: "Big announcement coming tomorrow! Stay tuned for something special.",
                            profileId: "4eb854340acb04e870000011",
                            service: "facebook",
                            status: "buffer",
                            createdAt: "2024-02-10T12:00:00.000Z"
                        },
                        {
                            id: "4ecda256512f7ee521000104",
                            text: "Big announcement coming tomorrow! Stay tuned for something special.",
                            profileId: "4eb854340acb04e870000012",
                            service: "linkedin",
                            status: "buffer",
                            createdAt: "2024-02-10T12:00:00.000Z"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "profile_not_found",
                description: "Profile ID does not exist",
                input: {
                    profileIds: ["nonexistent_profile_id"],
                    text: "This will fail"
                },
                expectedError: {
                    type: "not_found",
                    message: "Profile not found",
                    retryable: false
                }
            },
            {
                name: "empty_text",
                description: "Update text cannot be empty",
                input: {
                    profileIds: ["4eb854340acb04e870000010"],
                    text: ""
                },
                expectedError: {
                    type: "validation",
                    message: "Text cannot be empty",
                    retryable: false
                }
            },
            {
                name: "text_too_long_twitter",
                description: "Text exceeds Twitter character limit",
                input: {
                    profileIds: ["4eb854340acb04e870000010"],
                    text: "x".repeat(300)
                },
                expectedError: {
                    type: "validation",
                    message: "Text exceeds maximum length for this service",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded on Buffer API",
                input: {
                    profileIds: ["4eb854340acb04e870000010"],
                    text: "Rate limit test post"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "invalid_scheduled_time",
                description: "Scheduled time is in the past",
                input: {
                    profileIds: ["4eb854340acb04e870000010"],
                    text: "This post is scheduled for the past",
                    scheduledAt: "2020-01-01T00:00:00Z"
                },
                expectedError: {
                    type: "validation",
                    message: "Scheduled time must be in the future",
                    retryable: false
                }
            },
            {
                name: "invalid_media_url",
                description: "Media URL is invalid or inaccessible",
                input: {
                    profileIds: ["4eb854340acb04e870000010"],
                    text: "Post with invalid media",
                    media: {
                        photo: "https://invalid-url.example/image.jpg"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "Media URL is invalid or inaccessible",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "deleteUpdate",
        provider: "buffer",
        validCases: [
            {
                name: "delete_pending_update",
                description: "Delete a scheduled update from the queue",
                input: {
                    updateId: "4ecda256512f7ee521000001"
                },
                expectedOutput: {
                    deleted: true,
                    updateId: "4ecda256512f7ee521000001",
                    message: "Update deleted successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "update_not_found",
                description: "Update ID does not exist",
                input: {
                    updateId: "nonexistent_update_id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Update not found",
                    retryable: false
                }
            },
            {
                name: "update_already_sent",
                description: "Cannot delete an update that has already been sent",
                input: {
                    updateId: "4ecda256512f7ee521000099"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot delete an update that has already been sent",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded on Buffer API",
                input: {
                    updateId: "4ecda256512f7ee521000001"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "unauthorized_access",
                description: "User does not have permission to delete this update",
                input: {
                    updateId: "4ecda256512f7ee521000098"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to delete this update",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getPendingUpdates",
        provider: "buffer",
        filterableData: {
            records: samplePendingUpdates,
            recordsField: "updates",
            offsetField: "offset",
            defaultPageSize: 10,
            maxPageSize: 100,
            pageSizeParam: "count",
            offsetParam: "page",
            filterConfig: {
                type: "generic",
                filterableFields: ["_profileId", "_status"]
            }
        },
        validCases: [
            {
                name: "get_pending_updates_for_profile",
                description: "Get all pending updates for a specific profile",
                input: {
                    profileId: "4eb854340acb04e870000010"
                },
                expectedOutput: {
                    total: 2,
                    updates: [
                        {
                            id: "4ecda256512f7ee521000001",
                            text: "Excited to announce our new product launch! Stay tuned for more details. #innovation #tech",
                            profileId: "4eb854340acb04e870000010",
                            service: "twitter",
                            status: "buffer",
                            scheduledAt: "2024-02-15T14:00:00.000Z"
                        },
                        {
                            id: "4ecda256512f7ee521000005",
                            text: "Behind the scenes at our office! Our team is hard at work bringing you amazing products.",
                            profileId: "4eb854340acb04e870000010",
                            service: "twitter",
                            status: "buffer",
                            scheduledAt: "2024-02-18T10:00:00.000Z"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "profile_not_found",
                description: "Profile ID does not exist",
                input: {
                    profileId: "nonexistent_profile_id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Profile not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded on Buffer API",
                input: {
                    profileId: "4eb854340acb04e870000010"
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
        operationId: "getProfile",
        provider: "buffer",
        validCases: [
            {
                name: "get_profile",
                description: "Get details of a social media profile",
                input: {
                    profileId: "4eb854340acb04e870000010"
                },
                expectedOutput: {
                    id: "4eb854340acb04e870000010",
                    service: "twitter",
                    serviceId: "14561327",
                    username: "acmecorp",
                    formattedUsername: "@acmecorp",
                    avatar: "https://pbs.twimg.com/profile_images/1234567890/acme_normal.jpg",
                    timezone: "America/New_York",
                    isDefault: true,
                    pendingCount: 5,
                    sentCount: 142,
                    schedules: [
                        {
                            days: ["mon", "tue", "wed", "thu", "fri"],
                            times: ["09:00", "12:00", "17:00"]
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "profile_not_found",
                description: "Profile ID does not exist",
                input: {
                    profileId: "nonexistent_profile_id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Profile not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded on Buffer API",
                input: {
                    profileId: "4eb854340acb04e870000010"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "invalid_profile_id_format",
                description: "Profile ID format is invalid",
                input: {
                    profileId: "invalid!@#$%"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid profile ID format",
                    retryable: false
                }
            },
            {
                name: "profile_disconnected",
                description: "Profile has been disconnected from Buffer",
                input: {
                    profileId: "4eb854340acb04e870000099"
                },
                expectedError: {
                    type: "not_found",
                    message: "Profile has been disconnected",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getUpdate",
        provider: "buffer",
        validCases: [
            {
                name: "get_update",
                description: "Get details of an update in the queue with media",
                input: {
                    updateId: "4ecda256512f7ee521000001"
                },
                expectedOutput: {
                    id: "4ecda256512f7ee521000001",
                    text: "Excited to announce our new product launch! Stay tuned for more details. #innovation #tech",
                    textFormatted:
                        'Excited to announce our new product launch! Stay tuned for more details. <a href="https://twitter.com/hashtag/innovation">#innovation</a> <a href="https://twitter.com/hashtag/tech">#tech</a>',
                    profileId: "4eb854340acb04e870000010",
                    service: "twitter",
                    status: "buffer",
                    scheduledAt: "2024-02-15T14:00:00.000Z",
                    dueAt: "2024-02-15T14:00:00.000Z",
                    createdAt: "2024-02-10T09:30:00.000Z",
                    media: {
                        photo: "https://buffer-media-uploads.s3.amazonaws.com/product-launch.jpg",
                        thumbnail:
                            "https://buffer-media-uploads.s3.amazonaws.com/product-launch-thumb.jpg"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "update_not_found",
                description: "Update ID does not exist",
                input: {
                    updateId: "nonexistent_update_id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Update not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded on Buffer API",
                input: {
                    updateId: "4ecda256512f7ee521000001"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "invalid_update_id_format",
                description: "Update ID format is invalid",
                input: {
                    updateId: "invalid!@#$%"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid update ID format",
                    retryable: false
                }
            },
            {
                name: "unauthorized_access",
                description: "User does not have permission to view this update",
                input: {
                    updateId: "4ecda256512f7ee521000098"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to view this update",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listProfiles",
        provider: "buffer",
        filterableData: {
            records: sampleProfiles,
            recordsField: "profiles",
            defaultPageSize: 100,
            maxPageSize: 100,
            filterConfig: {
                type: "generic",
                filterableFields: ["_service"]
            }
        },
        validCases: [
            {
                name: "list_all_profiles",
                description: "List all connected social media profiles",
                input: {},
                expectedOutput: {
                    profiles: [
                        {
                            id: "4eb854340acb04e870000010",
                            service: "twitter",
                            username: "acmecorp",
                            formattedUsername: "@acmecorp",
                            pendingCount: 5,
                            sentCount: 142
                        },
                        {
                            id: "4eb854340acb04e870000011",
                            service: "facebook",
                            username: "AcmeCorporation",
                            formattedUsername: "Acme Corporation",
                            pendingCount: 3,
                            sentCount: 89
                        }
                    ]
                }
            },
            {
                name: "list_profiles_by_service",
                description: "List profiles filtered by service type",
                input: {
                    service: "twitter"
                },
                expectedOutput: {
                    profiles: [
                        {
                            id: "4eb854340acb04e870000010",
                            service: "twitter",
                            username: "acmecorp",
                            formattedUsername: "@acmecorp",
                            pendingCount: 5,
                            sentCount: 142
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Authentication token is invalid or expired",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Invalid or expired access token",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded on Buffer API",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "service_unavailable",
                description: "Buffer API is temporarily unavailable",
                input: {},
                expectedError: {
                    type: "server_error",
                    message: "Service temporarily unavailable",
                    retryable: true
                }
            }
        ]
    }
];
