/**
 * Hootsuite Provider Test Fixtures
 *
 * Comprehensive test fixtures for Hootsuite social media management operations
 * including message scheduling, social profile management, and media uploads.
 */

import type { TestFixture } from "../../../sandbox";

export const hootsuiteFixtures: TestFixture[] = [
    {
        operationId: "deleteMessage",
        provider: "hootsuite",
        validCases: [
            {
                name: "delete_scheduled_post",
                description: "Delete a scheduled social media post",
                input: {
                    messageId: "168549237410582"
                },
                expectedOutput: {
                    deleted: true,
                    messageId: "168549237410582",
                    message: "Message deleted successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "message_not_found",
                description: "Attempt to delete a message that does not exist",
                input: {
                    messageId: "999999999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Message not found",
                    retryable: false
                }
            },
            {
                name: "already_sent_message",
                description: "Attempt to delete a message that has already been published",
                input: {
                    messageId: "168549237410001"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot delete a message that has already been sent",
                    retryable: false
                }
            },
            {
                name: "invalid_message_id_format",
                description: "Invalid message ID format provided",
                input: {
                    messageId: ""
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid message ID format",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getMessage",
        provider: "hootsuite",
        validCases: [
            {
                name: "get_scheduled_twitter_post",
                description: "Get details of a scheduled Twitter/X post",
                input: {
                    messageId: "168549237410582"
                },
                expectedOutput: {
                    id: "168549237410582",
                    state: "SCHEDULED",
                    text: "Excited to announce our new product launch! Join us for the live demo on Friday at 2 PM EST. #ProductLaunch #Innovation",
                    socialProfileId: "134829571023847",
                    socialProfileType: "TWITTER",
                    scheduledSendTime: "2024-03-15T19:00:00Z",
                    createdAt: "2024-03-10T14:32:18Z",
                    sentAt: null,
                    mediaUrls: [
                        "https://media.hootsuite.com/uploads/2024/03/product-launch-banner.jpg"
                    ],
                    extendedInfo: {
                        targetType: "TIMELINE",
                        postType: "TWEET"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "message_not_found",
                description: "Attempt to get a message that does not exist",
                input: {
                    messageId: "999999999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Message not found",
                    retryable: false
                }
            },
            {
                name: "unauthorized_access",
                description: "Attempt to access a message from another organization",
                input: {
                    messageId: "168549237499999"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to access this message",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listSocialProfiles",
        provider: "hootsuite",
        validCases: [
            {
                name: "list_all_connected_profiles",
                description: "List all social media profiles connected to Hootsuite account",
                input: {},
                expectedOutput: {
                    profiles: [
                        {
                            id: "134829571023847",
                            type: "TWITTER",
                            socialNetworkId: "1829457102384",
                            username: "acme_official",
                            avatarUrl: "https://pbs.twimg.com/profile_images/acme_official.jpg",
                            ownerId: "usr_92847561023"
                        },
                        {
                            id: "892347561098234",
                            type: "INSTAGRAM",
                            socialNetworkId: "17841405793284756",
                            username: "acme.brand",
                            avatarUrl: "https://scontent.cdninstagram.com/acme_brand_profile.jpg",
                            ownerId: "usr_92847561023"
                        },
                        {
                            id: "567823901456789",
                            type: "LINKEDINCOMPANY",
                            socialNetworkId: "urn:li:organization:12345678",
                            username: "ACME Corporation",
                            avatarUrl: "https://media.licdn.com/dms/image/acme_corp_logo.jpg",
                            ownerId: "usr_92847561023"
                        },
                        {
                            id: "234567890123456",
                            type: "FACEBOOKPAGE",
                            socialNetworkId: "108294756102938",
                            username: "ACME Official",
                            avatarUrl: "https://graph.facebook.com/108294756102938/picture",
                            ownerId: "usr_92847561023"
                        },
                        {
                            id: "345678901234567",
                            type: "PINTEREST",
                            socialNetworkId: "892345761029384",
                            username: "acme_pins",
                            avatarUrl: "https://i.pinimg.com/avatars/acme_pins.jpg",
                            ownerId: "usr_92847561023"
                        },
                        {
                            id: "456789012345678",
                            type: "YOUTUBE",
                            socialNetworkId: "UCx9Rk7fJ2kLpT8Q4nHvYzWg",
                            username: "ACME Channel",
                            avatarUrl: "https://yt3.ggpht.com/ytc/acme_channel.jpg",
                            ownerId: "usr_92847561023"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Access token is invalid or expired",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Invalid or expired access token",
                    retryable: false
                }
            },
            {
                name: "service_unavailable",
                description: "Hootsuite API is temporarily unavailable",
                input: {},
                expectedError: {
                    type: "server_error",
                    message: "Service temporarily unavailable",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "scheduleMessage",
        provider: "hootsuite",
        validCases: [
            {
                name: "schedule_twitter_post_with_image",
                description: "Schedule a Twitter post with an attached image",
                input: {
                    socialProfileIds: ["134829571023847"],
                    text: "Thrilled to share our Q1 results! Revenue up 25% YoY. Full report at example.com/q1-2024 #Earnings #Growth",
                    scheduledSendTime: "2024-03-20T14:00:00Z",
                    mediaUrls: ["mda_892347561098"]
                },
                expectedOutput: {
                    id: "168549237411001",
                    state: "SCHEDULED",
                    text: "Thrilled to share our Q1 results! Revenue up 25% YoY. Full report at example.com/q1-2024 #Earnings #Growth",
                    socialProfileId: "134829571023847",
                    scheduledSendTime: "2024-03-20T14:00:00Z",
                    createdAt: "2024-03-14T10:30:00Z",
                    mediaUrls: ["mda_892347561098"]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_social_profile",
                description: "Attempt to post to a non-existent social profile",
                input: {
                    socialProfileIds: ["999999999999999"],
                    text: "Test post content",
                    scheduledSendTime: "2024-03-20T14:00:00Z"
                },
                expectedError: {
                    type: "not_found",
                    message: "Social profile not found",
                    retryable: false
                }
            },
            {
                name: "disconnected_profile",
                description: "Attempt to post to a disconnected social profile",
                input: {
                    socialProfileIds: ["134829571099999"],
                    text: "Test post content",
                    scheduledSendTime: "2024-03-20T14:00:00Z"
                },
                expectedError: {
                    type: "validation",
                    message: "Social profile is disconnected. Please reconnect the account.",
                    retryable: false
                }
            },
            {
                name: "text_too_long_for_twitter",
                description: "Attempt to post text exceeding Twitter character limit",
                input: {
                    socialProfileIds: ["134829571023847"],
                    text: "A".repeat(300),
                    scheduledSendTime: "2024-03-20T14:00:00Z"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Text exceeds maximum character limit for this social network (280 characters)",
                    retryable: false
                }
            },
            {
                name: "past_scheduled_time",
                description: "Attempt to schedule a post in the past",
                input: {
                    socialProfileIds: ["134829571023847"],
                    text: "Test post content",
                    scheduledSendTime: "2020-01-01T00:00:00Z"
                },
                expectedError: {
                    type: "validation",
                    message: "Scheduled send time must be in the future",
                    retryable: false
                }
            },
            {
                name: "invalid_media_id",
                description: "Attempt to attach media that does not exist",
                input: {
                    socialProfileIds: ["892347561098234"],
                    text: "Check out this photo!",
                    scheduledSendTime: "2024-03-20T14:00:00Z",
                    mediaUrls: ["mda_invalid_id_123"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Media not found or upload incomplete",
                    retryable: false
                }
            },
            {
                name: "too_many_media_instagram",
                description: "Attempt to attach more than 10 images to Instagram carousel",
                input: {
                    socialProfileIds: ["892347561098234"],
                    text: "Too many images",
                    scheduledSendTime: "2024-03-20T14:00:00Z",
                    mediaUrls: [
                        "mda_1",
                        "mda_2",
                        "mda_3",
                        "mda_4",
                        "mda_5",
                        "mda_6",
                        "mda_7",
                        "mda_8",
                        "mda_9",
                        "mda_10",
                        "mda_11"
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "Instagram carousel supports a maximum of 10 media items",
                    retryable: false
                }
            },
            {
                name: "empty_social_profiles",
                description: "Attempt to schedule without specifying social profiles",
                input: {
                    socialProfileIds: [],
                    text: "Test post content",
                    scheduledSendTime: "2024-03-20T14:00:00Z"
                },
                expectedError: {
                    type: "validation",
                    message: "At least one social profile ID is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when scheduling messages",
                input: {
                    socialProfileIds: ["134829571023847"],
                    text: "Test post content",
                    scheduledSendTime: "2024-03-20T14:00:00Z"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "insufficient_permissions",
                description: "User does not have permission to post to this profile",
                input: {
                    socialProfileIds: ["134829571023847"],
                    text: "Test post content",
                    scheduledSendTime: "2024-03-20T14:00:00Z"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to post to this social profile",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "uploadMedia",
        provider: "hootsuite",
        validCases: [
            {
                name: "upload_jpeg_image",
                description: "Create upload URL for a JPEG image file",
                input: {
                    sizeBytes: 2548576,
                    mimeType: "image/jpeg"
                },
                expectedOutput: {
                    mediaId: "mda_892347561101",
                    uploadUrl:
                        "https://media-upload.hootsuite.com/v1/uploads/mda_892347561101?signature=abc123def456",
                    uploadUrlDurationSeconds: 3600,
                    instructions:
                        "PUT your media file to the uploadUrl. After upload completes, use the mediaId when scheduling messages."
                }
            }
        ],
        errorCases: [
            {
                name: "unsupported_mime_type",
                description: "Attempt to upload an unsupported file type",
                input: {
                    sizeBytes: 1048576,
                    mimeType: "application/pdf"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Unsupported media type. Supported types: image/jpeg, image/png, image/gif, image/webp, video/mp4, video/quicktime",
                    retryable: false
                }
            },
            {
                name: "file_too_large_image",
                description: "Attempt to upload an image that exceeds size limit",
                input: {
                    sizeBytes: 21474836480,
                    mimeType: "image/jpeg"
                },
                expectedError: {
                    type: "validation",
                    message: "File size exceeds maximum allowed (20MB for images)",
                    retryable: false
                }
            },
            {
                name: "file_too_large_video",
                description: "Attempt to upload a video that exceeds size limit",
                input: {
                    sizeBytes: 5368709120,
                    mimeType: "video/mp4"
                },
                expectedError: {
                    type: "validation",
                    message: "File size exceeds maximum allowed (1GB for videos)",
                    retryable: false
                }
            },
            {
                name: "zero_size_file",
                description: "Attempt to upload a file with zero bytes",
                input: {
                    sizeBytes: 0,
                    mimeType: "image/jpeg"
                },
                expectedError: {
                    type: "validation",
                    message: "File size must be greater than 0 bytes",
                    retryable: false
                }
            },
            {
                name: "negative_size",
                description: "Attempt to upload with negative file size",
                input: {
                    sizeBytes: -1024,
                    mimeType: "image/jpeg"
                },
                expectedError: {
                    type: "validation",
                    message: "File size must be a positive integer",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when creating upload URL",
                input: {
                    sizeBytes: 1048576,
                    mimeType: "image/jpeg"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "storage_quota_exceeded",
                description: "Organization has exceeded its media storage quota",
                input: {
                    sizeBytes: 52428800,
                    mimeType: "video/mp4"
                },
                expectedError: {
                    type: "rate_limit",
                    message:
                        "Media storage quota exceeded. Please delete unused media or upgrade your plan.",
                    retryable: true
                }
            },
            {
                name: "invalid_mime_type_format",
                description: "Provide an invalid MIME type format",
                input: {
                    sizeBytes: 1048576,
                    mimeType: "invalid"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid MIME type format",
                    retryable: false
                }
            }
        ]
    }
];
