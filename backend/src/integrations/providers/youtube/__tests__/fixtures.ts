/**
 * YouTube Provider Test Fixtures
 *
 * Comprehensive test fixtures for YouTube Data API operations including
 * videos, channels, playlists, comments, subscriptions, and search.
 */

import type { TestFixture } from "../../../sandbox";

export const youtubeFixtures: TestFixture[] = [
    {
        operationId: "addToPlaylist",
        provider: "youtube",
        validCases: [
            {
                name: "add_video_to_playlist",
                description: "Add a video to a YouTube playlist at the end",
                input: {
                    playlistId: "PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
                    videoId: "dQw4w9WgXcQ"
                },
                expectedOutput: {
                    playlistItemId:
                        "UExhVWRIWWNCV2hJSV9oXzdqNE5XRXpOVjJfMVFiZ3h6eA.5BE06F5B4D8B1234",
                    playlistId: "PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
                    videoId: "dQw4w9WgXcQ",
                    position: 15,
                    title: "Rick Astley - Never Gonna Give You Up (Official Music Video)"
                }
            },
            {
                name: "add_video_at_specific_position",
                description: "Add a video to a playlist at a specific position",
                input: {
                    playlistId: "PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
                    videoId: "9bZkp7q19f0",
                    position: 0
                },
                expectedOutput: {
                    playlistItemId:
                        "UExhVWRIWWNCV2hJSV9oXzdqNE5XRXpOVjJfMVFiZ3h6eA.9F7C5D8A1E2B3456",
                    playlistId: "PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
                    videoId: "9bZkp7q19f0",
                    position: 0,
                    title: "PSY - GANGNAM STYLE(강남스타일) M/V"
                }
            },
            {
                name: "add_video_to_watch_later",
                description: "Add a video to the Watch Later playlist",
                input: {
                    playlistId: "WL",
                    videoId: "jNQXAC9IVRw"
                },
                expectedOutput: {
                    playlistItemId: "V0wuQUNfSVZSd3c5Rjdj",
                    playlistId: "WL",
                    videoId: "jNQXAC9IVRw",
                    position: 0,
                    title: "Me at the zoo"
                }
            }
        ],
        errorCases: [
            {
                name: "playlist_not_found",
                description: "Attempt to add video to a non-existent playlist",
                input: {
                    playlistId: "PLnonexistent123456",
                    videoId: "dQw4w9WgXcQ"
                },
                expectedError: {
                    type: "not_found",
                    message: "Playlist not found",
                    retryable: false
                }
            },
            {
                name: "video_not_found",
                description: "Attempt to add a non-existent video to playlist",
                input: {
                    playlistId: "PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
                    videoId: "invalid_video_id_123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Video not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when adding to playlist",
                input: {
                    playlistId: "PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
                    videoId: "dQw4w9WgXcQ"
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
        operationId: "createPlaylist",
        provider: "youtube",
        validCases: [
            {
                name: "create_public_playlist",
                description: "Create a new public YouTube playlist",
                input: {
                    title: "Best Programming Tutorials 2025",
                    description:
                        "A curated collection of the best programming tutorials covering JavaScript, Python, and system design.",
                    privacyStatus: "public",
                    tags: ["programming", "tutorials", "coding", "javascript", "python"]
                },
                expectedOutput: {
                    id: "PLnew123456789abcdef",
                    title: "Best Programming Tutorials 2025",
                    description:
                        "A curated collection of the best programming tutorials covering JavaScript, Python, and system design.",
                    channelId: "UCuserChannel123456",
                    channelTitle: "Tech Learning Hub",
                    privacyStatus: "public",
                    publishedAt: "2025-03-15T10:30:00Z"
                }
            },
            {
                name: "create_private_playlist",
                description: "Create a private playlist with minimal information",
                input: {
                    title: "Watch Later - Personal"
                },
                expectedOutput: {
                    id: "PLprivate789abcdef123",
                    title: "Watch Later - Personal",
                    description: null,
                    channelId: "UCuserChannel123456",
                    channelTitle: "Tech Learning Hub",
                    privacyStatus: "private",
                    publishedAt: "2025-03-15T11:00:00Z"
                }
            },
            {
                name: "create_unlisted_playlist_with_language",
                description: "Create an unlisted playlist with default language",
                input: {
                    title: "Japanese Learning Resources",
                    description: "Videos for learning Japanese - JLPT N5 to N1",
                    privacyStatus: "unlisted",
                    defaultLanguage: "ja",
                    tags: ["japanese", "language learning", "JLPT"]
                },
                expectedOutput: {
                    id: "PLunlisted456def789",
                    title: "Japanese Learning Resources",
                    description: "Videos for learning Japanese - JLPT N5 to N1",
                    channelId: "UCuserChannel123456",
                    channelTitle: "Tech Learning Hub",
                    privacyStatus: "unlisted",
                    publishedAt: "2025-03-15T12:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "title_too_long",
                description: "Attempt to create playlist with title exceeding 150 characters",
                input: {
                    title: "A".repeat(151),
                    privacyStatus: "private"
                },
                expectedError: {
                    type: "validation",
                    message: "Playlist title must not exceed 150 characters",
                    retryable: false
                }
            },
            {
                name: "rate_limit",
                description: "Daily API quota exceeded",
                input: {
                    title: "New Playlist",
                    privacyStatus: "private"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Daily quota exceeded for YouTube Data API",
                    retryable: true
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when creating playlist",
                input: {
                    title: "Test Playlist"
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
        operationId: "deleteComment",
        provider: "youtube",
        validCases: [
            {
                name: "delete_own_comment",
                description: "Delete a comment you authored",
                input: {
                    commentId: "UgxvW8rZPVBKl3D_abc"
                },
                expectedOutput: {
                    commentId: "UgxvW8rZPVBKl3D_abc",
                    deleted: true,
                    message: "Comment deleted successfully"
                }
            },
            {
                name: "delete_comment_on_own_video",
                description: "Delete a comment on your own video as the channel owner",
                input: {
                    commentId: "Ugz8_HKmNpZ2xB_def456"
                },
                expectedOutput: {
                    commentId: "Ugz8_HKmNpZ2xB_def456",
                    deleted: true,
                    message: "Comment deleted successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "comment_not_found",
                description: "Attempt to delete a non-existent comment",
                input: {
                    commentId: "Ugxnonexistent999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Comment not found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "Attempt to delete someone else's comment on another channel",
                input: {
                    commentId: "UgxOtherUser_xyz789"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to delete this comment",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when deleting comment",
                input: {
                    commentId: "UgxvW8rZPVBKl3D_abc"
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
        operationId: "deletePlaylist",
        provider: "youtube",
        validCases: [
            {
                name: "delete_user_playlist",
                description: "Delete a user-created playlist",
                input: {
                    playlistId: "PLuser_created_abc123"
                },
                expectedOutput: {
                    playlistId: "PLuser_created_abc123",
                    deleted: true,
                    message: "Playlist deleted successfully"
                }
            },
            {
                name: "delete_empty_playlist",
                description: "Delete an empty playlist",
                input: {
                    playlistId: "PLempty_playlist_456"
                },
                expectedOutput: {
                    playlistId: "PLempty_playlist_456",
                    deleted: true,
                    message: "Playlist deleted successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "playlist_not_found",
                description: "Attempt to delete a non-existent playlist",
                input: {
                    playlistId: "PLnonexistent_abc"
                },
                expectedError: {
                    type: "not_found",
                    message: "Playlist not found",
                    retryable: false
                }
            },
            {
                name: "cannot_delete_system_playlist",
                description: "Attempt to delete a system playlist like Watch Later",
                input: {
                    playlistId: "WL"
                },
                expectedError: {
                    type: "permission",
                    message: "Cannot delete system playlists",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when deleting playlist",
                input: {
                    playlistId: "PLuser_playlist_789"
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
        operationId: "getChannel",
        provider: "youtube",
        validCases: [
            {
                name: "get_channel_by_id",
                description: "Get detailed information about a YouTube channel by ID",
                input: {
                    channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
                    part: ["snippet", "statistics"]
                },
                expectedOutput: {
                    id: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
                    title: "Google for Developers",
                    description:
                        "Subscribe to the Google for Developers channel for the latest news, product updates, and technical content from Google's developer platforms.",
                    customUrl: "@GoogleDevelopers",
                    publishedAt: "2007-08-23T00:34:43Z",
                    thumbnails: {
                        default: {
                            url: "https://yt3.ggpht.com/ytc/default_channel_88.jpg",
                            width: 88,
                            height: 88
                        },
                        medium: {
                            url: "https://yt3.ggpht.com/ytc/medium_channel_240.jpg",
                            width: 240,
                            height: 240
                        },
                        high: {
                            url: "https://yt3.ggpht.com/ytc/high_channel_800.jpg",
                            width: 800,
                            height: 800
                        }
                    },
                    country: "US",
                    viewCount: "287654321",
                    subscriberCount: "2580000",
                    hiddenSubscriberCount: false,
                    videoCount: "5432"
                }
            },
            {
                name: "get_channel_by_username",
                description: "Get channel details using legacy username",
                input: {
                    forUsername: "GoogleDevelopers",
                    part: ["snippet", "statistics", "contentDetails"]
                },
                expectedOutput: {
                    id: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
                    title: "Google for Developers",
                    description:
                        "Subscribe to the Google for Developers channel for the latest news.",
                    customUrl: "@GoogleDevelopers",
                    publishedAt: "2007-08-23T00:34:43Z",
                    thumbnails: {
                        default: {
                            url: "https://yt3.ggpht.com/ytc/default_88.jpg",
                            width: 88,
                            height: 88
                        }
                    },
                    country: "US",
                    viewCount: "287654321",
                    subscriberCount: "2580000",
                    hiddenSubscriberCount: false,
                    videoCount: "5432"
                }
            },
            {
                name: "get_authenticated_user_channel",
                description: "Get the authenticated user's own channel",
                input: {
                    mine: true,
                    part: ["snippet", "statistics"]
                },
                expectedOutput: {
                    id: "UCmyChannel123456789",
                    title: "My Tech Channel",
                    description: "Personal tech reviews and tutorials",
                    customUrl: "@MyTechChannel",
                    publishedAt: "2020-05-15T10:00:00Z",
                    thumbnails: {
                        default: {
                            url: "https://yt3.ggpht.com/ytc/my_channel_default.jpg",
                            width: 88,
                            height: 88
                        }
                    },
                    country: "US",
                    viewCount: "125000",
                    subscriberCount: "5200",
                    hiddenSubscriberCount: false,
                    videoCount: "89"
                }
            },
            {
                name: "get_channel_hidden_subscribers",
                description: "Get channel with hidden subscriber count",
                input: {
                    channelId: "UCprivateChannel789",
                    part: ["snippet", "statistics"]
                },
                expectedOutput: {
                    id: "UCprivateChannel789",
                    title: "Private Creator",
                    description: "A channel with hidden subscriber count",
                    customUrl: "@PrivateCreator",
                    publishedAt: "2019-01-01T00:00:00Z",
                    thumbnails: {
                        default: {
                            url: "https://yt3.ggpht.com/ytc/private_default.jpg",
                            width: 88,
                            height: 88
                        }
                    },
                    country: null,
                    viewCount: "50000",
                    subscriberCount: null,
                    hiddenSubscriberCount: true,
                    videoCount: "25"
                }
            }
        ],
        errorCases: [
            {
                name: "channel_not_found",
                description: "Attempt to get a non-existent channel",
                input: {
                    channelId: "UCnonexistent_channel_id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Channel not found",
                    retryable: false
                }
            },
            {
                name: "no_identifier_provided",
                description: "Request without channelId, forUsername, or mine parameter",
                input: {
                    part: ["snippet"]
                },
                expectedError: {
                    type: "validation",
                    message: "Must specify channelId, forUsername, or mine=true",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when fetching channel",
                input: {
                    channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw"
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
        operationId: "getVideo",
        provider: "youtube",
        validCases: [
            {
                name: "get_video_full_details",
                description: "Get detailed information about a specific YouTube video",
                input: {
                    videoId: "dQw4w9WgXcQ",
                    part: ["snippet", "contentDetails", "statistics", "status"]
                },
                expectedOutput: {
                    id: "dQw4w9WgXcQ",
                    title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
                    description:
                        'The official video for "Never Gonna Give You Up" by Rick Astley.\n\n"Never Gonna Give You Up" was a global smash on its release in July 1987...',
                    channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
                    channelTitle: "Rick Astley",
                    publishedAt: "2009-10-25T06:57:33Z",
                    thumbnails: {
                        default: {
                            url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg",
                            width: 120,
                            height: 90
                        },
                        medium: {
                            url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
                            width: 320,
                            height: 180
                        },
                        high: {
                            url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
                            width: 480,
                            height: 360
                        },
                        standard: {
                            url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/sddefault.jpg",
                            width: 640,
                            height: 480
                        },
                        maxres: {
                            url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
                            width: 1280,
                            height: 720
                        }
                    },
                    tags: ["Rick Astley", "Never Gonna Give You Up", "80s music", "pop music"],
                    categoryId: "10",
                    duration: "PT3M33S",
                    dimension: "2d",
                    definition: "hd",
                    caption: "true",
                    viewCount: "1500000000",
                    likeCount: "15000000",
                    commentCount: "2500000",
                    privacyStatus: "public",
                    uploadStatus: "processed",
                    embeddable: true,
                    madeForKids: false
                }
            },
            {
                name: "get_video_basic_info",
                description: "Get basic video information with default parts",
                input: {
                    videoId: "9bZkp7q19f0"
                },
                expectedOutput: {
                    id: "9bZkp7q19f0",
                    title: "PSY - GANGNAM STYLE(강남스타일) M/V",
                    description:
                        "PSY - 'I LUV IT' M/V @ https://youtu.be/Xvjnoagk6GU\nPSY - 'New Face' M/V @https://youtu.be/OwJPPaEyqhI...",
                    channelId: "UCrDkAvwZum-UTjHmzDI2iIw",
                    channelTitle: "officialpsy",
                    publishedAt: "2012-07-15T07:46:32Z",
                    thumbnails: {
                        default: {
                            url: "https://i.ytimg.com/vi/9bZkp7q19f0/default.jpg",
                            width: 120,
                            height: 90
                        },
                        high: {
                            url: "https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg",
                            width: 480,
                            height: 360
                        }
                    },
                    tags: ["PSY", "Gangnam Style", "K-pop"],
                    categoryId: "10",
                    duration: "PT4M13S",
                    dimension: "2d",
                    definition: "hd",
                    caption: "true",
                    viewCount: "5000000000",
                    likeCount: "25000000",
                    commentCount: "12000000",
                    privacyStatus: "public",
                    uploadStatus: "processed",
                    embeddable: true,
                    madeForKids: false
                }
            },
            {
                name: "get_video_made_for_kids",
                description: "Get a video marked as made for kids",
                input: {
                    videoId: "XqZsoesa55w",
                    part: ["snippet", "status"]
                },
                expectedOutput: {
                    id: "XqZsoesa55w",
                    title: "Baby Shark Dance | #babyshark Most Viewed Video | Animal Songs | PINKFONG Songs for Children",
                    description:
                        "Baby Shark has officially become the most viewed video in YouTube history!",
                    channelId: "UCcdwLMPsaU2ezNSJU1nFoBQ",
                    channelTitle: "Pinkfong Baby Shark - Kids' Songs & Stories",
                    publishedAt: "2016-06-17T12:32:34Z",
                    thumbnails: {
                        default: {
                            url: "https://i.ytimg.com/vi/XqZsoesa55w/default.jpg",
                            width: 120,
                            height: 90
                        }
                    },
                    tags: ["baby shark", "kids songs", "children"],
                    categoryId: "24",
                    duration: "PT2M16S",
                    dimension: "2d",
                    definition: "hd",
                    caption: "true",
                    viewCount: "14000000000",
                    likeCount: "45000000",
                    commentCount: null,
                    privacyStatus: "public",
                    uploadStatus: "processed",
                    embeddable: true,
                    madeForKids: true
                }
            }
        ],
        errorCases: [
            {
                name: "video_not_found",
                description: "Attempt to get a non-existent or deleted video",
                input: {
                    videoId: "nonexistent_video_123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Video not found or is private",
                    retryable: false
                }
            },
            {
                name: "private_video",
                description: "Attempt to get a private video you don't own",
                input: {
                    videoId: "privateVideo789xyz"
                },
                expectedError: {
                    type: "not_found",
                    message: "Video not found or is private",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when fetching video",
                input: {
                    videoId: "dQw4w9WgXcQ"
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
        operationId: "insertComment",
        provider: "youtube",
        validCases: [
            {
                name: "post_simple_comment",
                description: "Post a simple comment on a YouTube video",
                input: {
                    videoId: "dQw4w9WgXcQ",
                    text: "This song never gets old! Classic!"
                },
                expectedOutput: {
                    threadId: "UgxXYZ123abc_thread",
                    commentId: "UgxXYZ123abc_comment",
                    videoId: "dQw4w9WgXcQ",
                    text: "This song never gets old! Classic!",
                    authorDisplayName: "MyChannel",
                    publishedAt: "2025-03-15T14:30:00Z"
                }
            },
            {
                name: "post_detailed_comment",
                description: "Post a longer, detailed comment with timestamps",
                input: {
                    videoId: "BaW_jenozKc",
                    text: "Great tutorial! Here are my notes:\n1:30 - Setting up the environment\n5:45 - First code example\n12:00 - Advanced concepts\nThanks for the clear explanations!"
                },
                expectedOutput: {
                    threadId: "UgwABC456def_thread",
                    commentId: "UgwABC456def_comment",
                    videoId: "BaW_jenozKc",
                    text: "Great tutorial! Here are my notes:\n1:30 - Setting up the environment\n5:45 - First code example\n12:00 - Advanced concepts\nThanks for the clear explanations!",
                    authorDisplayName: "MyChannel",
                    publishedAt: "2025-03-15T15:00:00Z"
                }
            },
            {
                name: "post_comment_with_mentions",
                description: "Post a comment mentioning another channel",
                input: {
                    videoId: "jNQXAC9IVRw",
                    text: "Hey @jawed this is where it all started! Amazing piece of internet history."
                },
                expectedOutput: {
                    threadId: "UgzMNO789ghi_thread",
                    commentId: "UgzMNO789ghi_comment",
                    videoId: "jNQXAC9IVRw",
                    text: "Hey @jawed this is where it all started! Amazing piece of internet history.",
                    authorDisplayName: "MyChannel",
                    publishedAt: "2025-03-15T16:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "video_not_found",
                description: "Attempt to comment on a non-existent video",
                input: {
                    videoId: "nonexistent123",
                    text: "Test comment"
                },
                expectedError: {
                    type: "not_found",
                    message: "Video not found",
                    retryable: false
                }
            },
            {
                name: "comments_disabled",
                description: "Attempt to comment on a video with comments disabled",
                input: {
                    videoId: "commentsDisabled456",
                    text: "This video has comments turned off"
                },
                expectedError: {
                    type: "permission",
                    message: "Comments are disabled for this video",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when posting comment",
                input: {
                    videoId: "dQw4w9WgXcQ",
                    text: "Testing rate limits"
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
        operationId: "listComments",
        provider: "youtube",
        validCases: [
            {
                name: "list_video_comments",
                description: "List comment threads for a specific video",
                input: {
                    videoId: "dQw4w9WgXcQ",
                    maxResults: 10,
                    order: "relevance"
                },
                expectedOutput: {
                    comments: [
                        {
                            threadId: "UgzThread001_abc",
                            videoId: "dQw4w9WgXcQ",
                            channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
                            topLevelComment: {
                                id: "UgzComment001_abc",
                                authorDisplayName: "MusicFan2024",
                                authorProfileImageUrl: "https://yt3.ggpht.com/user1_avatar.jpg",
                                authorChannelUrl: "http://www.youtube.com/channel/UC_user1",
                                text: "Still the best song to rick roll people with in 2025!",
                                likeCount: 125000,
                                publishedAt: "2025-01-15T10:00:00Z",
                                updatedAt: "2025-01-15T10:00:00Z"
                            },
                            totalReplyCount: 523,
                            canReply: true,
                            isPublic: true,
                            replies: [
                                {
                                    id: "UgzReply001_xyz",
                                    authorDisplayName: "ReplyGuy99",
                                    authorProfileImageUrl:
                                        "https://yt3.ggpht.com/reply1_avatar.jpg",
                                    text: "Facts! Got my whole office with this last week",
                                    likeCount: 2341,
                                    publishedAt: "2025-01-16T08:30:00Z"
                                }
                            ]
                        },
                        {
                            threadId: "UgzThread002_def",
                            videoId: "dQw4w9WgXcQ",
                            channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
                            topLevelComment: {
                                id: "UgzComment002_def",
                                authorDisplayName: "80sNostalgia",
                                authorProfileImageUrl: "https://yt3.ggpht.com/user2_avatar.jpg",
                                authorChannelUrl: "http://www.youtube.com/channel/UC_user2",
                                text: "I was in high school when this came out. Now my kids rick roll me. The circle of life.",
                                likeCount: 89000,
                                publishedAt: "2024-12-01T14:20:00Z",
                                updatedAt: "2024-12-01T14:20:00Z"
                            },
                            totalReplyCount: 156,
                            canReply: true,
                            isPublic: true,
                            replies: null
                        }
                    ],
                    nextPageToken: "QURTSl9pMkJMdW9fNHBKT2xJN1B0Vklmc3V4",
                    pageInfo: {
                        totalResults: 2500000,
                        resultsPerPage: 10
                    }
                }
            },
            {
                name: "list_comments_by_time",
                description: "List newest comments on a video sorted by time",
                input: {
                    videoId: "9bZkp7q19f0",
                    maxResults: 5,
                    order: "time",
                    textFormat: "plainText"
                },
                expectedOutput: {
                    comments: [
                        {
                            threadId: "UgzNewThread001",
                            videoId: "9bZkp7q19f0",
                            channelId: "UCrDkAvwZum-UTjHmzDI2iIw",
                            topLevelComment: {
                                id: "UgzNewComment001",
                                authorDisplayName: "KpopFan2025",
                                authorProfileImageUrl: "https://yt3.ggpht.com/kpop_avatar.jpg",
                                authorChannelUrl: "http://www.youtube.com/channel/UC_kpopfan",
                                text: "Just discovered this in 2025 and I can see why it went viral!",
                                likeCount: 15,
                                publishedAt: "2025-03-15T18:00:00Z",
                                updatedAt: "2025-03-15T18:00:00Z"
                            },
                            totalReplyCount: 0,
                            canReply: true,
                            isPublic: true,
                            replies: null
                        }
                    ],
                    nextPageToken: "QURTSl9pMVNvcnRCeVRpbWU",
                    pageInfo: {
                        totalResults: 12000000,
                        resultsPerPage: 5
                    }
                }
            },
            {
                name: "list_comments_with_search",
                description: "Search for comments containing specific terms",
                input: {
                    videoId: "BaW_jenozKc",
                    searchTerms: "tutorial",
                    maxResults: 25
                },
                expectedOutput: {
                    comments: [
                        {
                            threadId: "UgzSearchThread001",
                            videoId: "BaW_jenozKc",
                            channelId: "UCvjgXvBlldQCL9YcRs0IFVw",
                            topLevelComment: {
                                id: "UgzSearchComment001",
                                authorDisplayName: "LearnToCode",
                                authorProfileImageUrl: "https://yt3.ggpht.com/coder_avatar.jpg",
                                authorChannelUrl: "http://www.youtube.com/channel/UC_coder",
                                text: "Best tutorial on this topic I've found. Clear and concise!",
                                likeCount: 890,
                                publishedAt: "2025-02-20T09:15:00Z",
                                updatedAt: "2025-02-20T09:15:00Z"
                            },
                            totalReplyCount: 12,
                            canReply: true,
                            isPublic: true,
                            replies: null
                        }
                    ],
                    nextPageToken: null,
                    pageInfo: {
                        totalResults: 1,
                        resultsPerPage: 25
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "no_filter_provided",
                description: "Request without videoId or channelId",
                input: {
                    maxResults: 10
                },
                expectedError: {
                    type: "validation",
                    message: "Must specify either videoId or channelId",
                    retryable: false
                }
            },
            {
                name: "video_not_found",
                description: "Request comments for a non-existent video",
                input: {
                    videoId: "nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Video not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when listing comments",
                input: {
                    videoId: "dQw4w9WgXcQ"
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
        operationId: "listPlaylistItems",
        provider: "youtube",
        validCases: [
            {
                name: "list_playlist_videos",
                description: "List videos in a YouTube playlist",
                input: {
                    playlistId: "PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
                    maxResults: 10
                },
                expectedOutput: {
                    items: [
                        {
                            id: "UExhVWRIWWNCV2hJSV9oXzdqNE5XRXpOVjJfMVFiZ3h6eA.5BE06F5B4D8B1234",
                            videoId: "dQw4w9WgXcQ",
                            title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
                            description:
                                'The official video for "Never Gonna Give You Up" by Rick Astley.',
                            position: 0,
                            channelId: "UCuserPlaylistOwner",
                            channelTitle: "Playlist Owner",
                            thumbnails: {
                                default: {
                                    url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg",
                                    width: 120,
                                    height: 90
                                },
                                medium: {
                                    url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
                                    width: 320,
                                    height: 180
                                }
                            },
                            videoOwnerChannelTitle: "Rick Astley",
                            videoOwnerChannelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
                            publishedAt: "2024-01-10T12:00:00Z",
                            videoPublishedAt: "2009-10-25T06:57:33Z",
                            privacyStatus: "public"
                        },
                        {
                            id: "UExhVWRIWWNCV2hJSV9oXzdqNE5XRXpOVjJfMVFiZ3h6eA.9F7C5D8A1E2B5678",
                            videoId: "9bZkp7q19f0",
                            title: "PSY - GANGNAM STYLE(강남스타일) M/V",
                            description: "PSY - 'I LUV IT' M/V @ https://youtu.be/Xvjnoagk6GU",
                            position: 1,
                            channelId: "UCuserPlaylistOwner",
                            channelTitle: "Playlist Owner",
                            thumbnails: {
                                default: {
                                    url: "https://i.ytimg.com/vi/9bZkp7q19f0/default.jpg",
                                    width: 120,
                                    height: 90
                                }
                            },
                            videoOwnerChannelTitle: "officialpsy",
                            videoOwnerChannelId: "UCrDkAvwZum-UTjHmzDI2iIw",
                            publishedAt: "2024-01-11T08:30:00Z",
                            videoPublishedAt: "2012-07-15T07:46:32Z",
                            privacyStatus: "public"
                        }
                    ],
                    nextPageToken: "EAAaBlBUOkNBVQ",
                    pageInfo: {
                        totalResults: 50,
                        resultsPerPage: 10
                    }
                }
            },
            {
                name: "list_liked_videos",
                description: "List videos from the Liked Videos playlist",
                input: {
                    playlistId: "LL",
                    maxResults: 5,
                    part: ["snippet", "contentDetails", "status"]
                },
                expectedOutput: {
                    items: [
                        {
                            id: "TExMaWtlZF92aWRlbzE",
                            videoId: "kJQP7kiw5Fk",
                            title: "Luis Fonsi - Despacito ft. Daddy Yankee",
                            description: '"Despacito" available on these music platforms...',
                            position: 0,
                            channelId: "UCLikedVideosOwner",
                            channelTitle: "My Channel",
                            thumbnails: {
                                default: {
                                    url: "https://i.ytimg.com/vi/kJQP7kiw5Fk/default.jpg",
                                    width: 120,
                                    height: 90
                                }
                            },
                            videoOwnerChannelTitle: "Luis Fonsi",
                            videoOwnerChannelId: "UCLp8toNIcrc6RKGs0P2Gg5w",
                            publishedAt: "2025-03-01T15:00:00Z",
                            videoPublishedAt: "2017-01-12T15:00:00Z",
                            privacyStatus: "public"
                        }
                    ],
                    nextPageToken: "CAQQAA",
                    pageInfo: {
                        totalResults: 150,
                        resultsPerPage: 5
                    }
                }
            },
            {
                name: "list_playlist_empty",
                description: "List videos from an empty playlist",
                input: {
                    playlistId: "PL_empty_playlist_123"
                },
                expectedOutput: {
                    items: [],
                    nextPageToken: null,
                    pageInfo: {
                        totalResults: 0,
                        resultsPerPage: 25
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "playlist_not_found",
                description: "Request items from a non-existent playlist",
                input: {
                    playlistId: "PLnonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Playlist not found",
                    retryable: false
                }
            },
            {
                name: "private_playlist",
                description: "Request items from a private playlist you don't own",
                input: {
                    playlistId: "PLprivate_other_user"
                },
                expectedError: {
                    type: "permission",
                    message: "This playlist is private",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when listing playlist items",
                input: {
                    playlistId: "PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf"
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
        operationId: "listPlaylists",
        provider: "youtube",
        validCases: [
            {
                name: "list_channel_playlists",
                description: "List playlists from a specific channel",
                input: {
                    channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
                    maxResults: 10
                },
                expectedOutput: {
                    playlists: [
                        {
                            id: "PLIivdWyY5sqJxnwJhe3etaK57n6guoGAy",
                            title: "AI Adventures",
                            description:
                                "Join us on a journey to discover the basics of machine learning.",
                            channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
                            channelTitle: "Google for Developers",
                            publishedAt: "2017-03-15T00:00:00Z",
                            thumbnails: {
                                default: {
                                    url: "https://i.ytimg.com/vi/nKW8Ndu7Mjw/default.jpg",
                                    width: 120,
                                    height: 90
                                },
                                medium: {
                                    url: "https://i.ytimg.com/vi/nKW8Ndu7Mjw/mqdefault.jpg",
                                    width: 320,
                                    height: 180
                                }
                            },
                            privacyStatus: "public",
                            itemCount: 28
                        },
                        {
                            id: "PLIivdWyY5sqKDnLNOVf8AbqupWJZ8PAtg",
                            title: "Cloud Minute",
                            description: "Quick tips and tutorials for Google Cloud Platform.",
                            channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
                            channelTitle: "Google for Developers",
                            publishedAt: "2018-06-01T00:00:00Z",
                            thumbnails: {
                                default: {
                                    url: "https://i.ytimg.com/vi/example/default.jpg",
                                    width: 120,
                                    height: 90
                                }
                            },
                            privacyStatus: "public",
                            itemCount: 45
                        }
                    ],
                    nextPageToken: "CAUQAA",
                    pageInfo: {
                        totalResults: 125,
                        resultsPerPage: 10
                    }
                }
            },
            {
                name: "list_my_playlists",
                description: "List the authenticated user's playlists",
                input: {
                    mine: true,
                    maxResults: 25
                },
                expectedOutput: {
                    playlists: [
                        {
                            id: "PLmy_watch_later_123",
                            title: "Watch Later",
                            description: "Videos to watch later",
                            channelId: "UCmyChannel123456",
                            channelTitle: "My Channel",
                            publishedAt: "2020-01-01T00:00:00Z",
                            thumbnails: {
                                default: {
                                    url: "https://i.ytimg.com/img/no_thumbnail.jpg",
                                    width: 120,
                                    height: 90
                                }
                            },
                            privacyStatus: "private",
                            itemCount: 37
                        },
                        {
                            id: "PLmy_favorites_456",
                            title: "Favorite Music Videos",
                            description: "My all-time favorite music videos",
                            channelId: "UCmyChannel123456",
                            channelTitle: "My Channel",
                            publishedAt: "2021-05-15T10:30:00Z",
                            thumbnails: {
                                default: {
                                    url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg",
                                    width: 120,
                                    height: 90
                                }
                            },
                            privacyStatus: "unlisted",
                            itemCount: 89
                        }
                    ],
                    nextPageToken: null,
                    pageInfo: {
                        totalResults: 2,
                        resultsPerPage: 25
                    }
                }
            },
            {
                name: "list_playlists_by_ids",
                description: "Get specific playlists by their IDs",
                input: {
                    ids: [
                        "PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
                        "PLIivdWyY5sqJxnwJhe3etaK57n6guoGAy"
                    ],
                    part: ["snippet", "status", "contentDetails"]
                },
                expectedOutput: {
                    playlists: [
                        {
                            id: "PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
                            title: "Viral Videos Collection",
                            description: "The most viral videos of all time",
                            channelId: "UCviralChannel",
                            channelTitle: "Viral Videos",
                            publishedAt: "2015-08-20T00:00:00Z",
                            thumbnails: {
                                default: {
                                    url: "https://i.ytimg.com/vi/viral/default.jpg",
                                    width: 120,
                                    height: 90
                                }
                            },
                            privacyStatus: "public",
                            itemCount: 50
                        },
                        {
                            id: "PLIivdWyY5sqJxnwJhe3etaK57n6guoGAy",
                            title: "AI Adventures",
                            description:
                                "Join us on a journey to discover the basics of machine learning.",
                            channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
                            channelTitle: "Google for Developers",
                            publishedAt: "2017-03-15T00:00:00Z",
                            thumbnails: {
                                default: {
                                    url: "https://i.ytimg.com/vi/ai/default.jpg",
                                    width: 120,
                                    height: 90
                                }
                            },
                            privacyStatus: "public",
                            itemCount: 28
                        }
                    ],
                    nextPageToken: null,
                    pageInfo: {
                        totalResults: 2,
                        resultsPerPage: 2
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "channel_not_found",
                description: "Request playlists from a non-existent channel",
                input: {
                    channelId: "UCnonexistent_channel"
                },
                expectedError: {
                    type: "not_found",
                    message: "Channel not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when listing playlists",
                input: {
                    mine: true
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
        operationId: "listSubscriptions",
        provider: "youtube",
        validCases: [
            {
                name: "list_my_subscriptions",
                description: "List the authenticated user's channel subscriptions",
                input: {
                    mine: true,
                    maxResults: 10,
                    order: "relevance"
                },
                expectedOutput: {
                    subscriptions: [
                        {
                            id: "UCabc123_subscription1",
                            channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
                            title: "Google for Developers",
                            description:
                                "Subscribe for the latest news and updates from Google's developer platforms.",
                            thumbnails: {
                                default: {
                                    url: "https://yt3.ggpht.com/google_devs.jpg",
                                    width: 88,
                                    height: 88
                                }
                            },
                            publishedAt: "2022-03-15T10:00:00Z",
                            totalItemCount: 5432,
                            newItemCount: 3
                        },
                        {
                            id: "UCdef456_subscription2",
                            channelId: "UCVHFbqXqoYvEWM1Ddxl0QKg",
                            title: "Fireship",
                            description:
                                "High-intensity code tutorials to help you ship more applications faster.",
                            thumbnails: {
                                default: {
                                    url: "https://yt3.ggpht.com/fireship.jpg",
                                    width: 88,
                                    height: 88
                                }
                            },
                            publishedAt: "2021-09-20T14:30:00Z",
                            totalItemCount: 650,
                            newItemCount: 5
                        },
                        {
                            id: "UCghi789_subscription3",
                            channelId: "UCsBjURrPoezykLs9EqgamOA",
                            title: "Fireship",
                            description: "High-intensity code tutorials.",
                            thumbnails: {
                                default: {
                                    url: "https://yt3.ggpht.com/fireship2.jpg",
                                    width: 88,
                                    height: 88
                                }
                            },
                            publishedAt: "2023-01-05T08:00:00Z",
                            totalItemCount: 320,
                            newItemCount: 0
                        }
                    ],
                    nextPageToken: "CAUQAA",
                    pageInfo: {
                        totalResults: 87,
                        resultsPerPage: 10
                    }
                }
            },
            {
                name: "list_subscriptions_alphabetically",
                description: "List subscriptions sorted alphabetically",
                input: {
                    mine: true,
                    maxResults: 5,
                    order: "alphabetical"
                },
                expectedOutput: {
                    subscriptions: [
                        {
                            id: "UCalphaFirst_sub",
                            channelId: "UCa1pha123",
                            title: "A Channel Starting With A",
                            description: "First alphabetically",
                            thumbnails: {
                                default: {
                                    url: "https://yt3.ggpht.com/alpha.jpg",
                                    width: 88,
                                    height: 88
                                }
                            },
                            publishedAt: "2024-01-01T00:00:00Z",
                            totalItemCount: 100,
                            newItemCount: 2
                        }
                    ],
                    nextPageToken: "CAMQAg",
                    pageInfo: {
                        totalResults: 87,
                        resultsPerPage: 5
                    }
                }
            },
            {
                name: "check_specific_subscription",
                description: "Check if subscribed to a specific channel",
                input: {
                    mine: true,
                    forChannelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw"
                },
                expectedOutput: {
                    subscriptions: [
                        {
                            id: "UCabc123_subscription1",
                            channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
                            title: "Google for Developers",
                            description: "Subscribe for the latest news and updates.",
                            thumbnails: {
                                default: {
                                    url: "https://yt3.ggpht.com/google_devs.jpg",
                                    width: 88,
                                    height: 88
                                }
                            },
                            publishedAt: "2022-03-15T10:00:00Z",
                            totalItemCount: 5432,
                            newItemCount: 3
                        }
                    ],
                    nextPageToken: null,
                    pageInfo: {
                        totalResults: 1,
                        resultsPerPage: 1
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Invalid authentication when listing subscriptions",
                input: {
                    mine: true
                },
                expectedError: {
                    type: "permission",
                    message: "Invalid or expired OAuth token",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when listing subscriptions",
                input: {
                    mine: true
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
        operationId: "listVideos",
        provider: "youtube",
        validCases: [
            {
                name: "list_videos_by_ids",
                description: "Get multiple videos by their IDs",
                input: {
                    ids: ["dQw4w9WgXcQ", "9bZkp7q19f0", "kJQP7kiw5Fk"],
                    part: ["snippet", "contentDetails", "statistics"]
                },
                expectedOutput: {
                    videos: [
                        {
                            id: "dQw4w9WgXcQ",
                            title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
                            description:
                                'The official video for "Never Gonna Give You Up" by Rick Astley.',
                            channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
                            channelTitle: "Rick Astley",
                            publishedAt: "2009-10-25T06:57:33Z",
                            thumbnails: {
                                default: {
                                    url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg",
                                    width: 120,
                                    height: 90
                                }
                            },
                            duration: "PT3M33S",
                            definition: "hd",
                            viewCount: "1500000000",
                            likeCount: "15000000",
                            commentCount: "2500000"
                        },
                        {
                            id: "9bZkp7q19f0",
                            title: "PSY - GANGNAM STYLE(강남스타일) M/V",
                            description: "PSY - 'I LUV IT' M/V @ https://youtu.be/Xvjnoagk6GU",
                            channelId: "UCrDkAvwZum-UTjHmzDI2iIw",
                            channelTitle: "officialpsy",
                            publishedAt: "2012-07-15T07:46:32Z",
                            thumbnails: {
                                default: {
                                    url: "https://i.ytimg.com/vi/9bZkp7q19f0/default.jpg",
                                    width: 120,
                                    height: 90
                                }
                            },
                            duration: "PT4M13S",
                            definition: "hd",
                            viewCount: "5000000000",
                            likeCount: "25000000",
                            commentCount: "12000000"
                        },
                        {
                            id: "kJQP7kiw5Fk",
                            title: "Luis Fonsi - Despacito ft. Daddy Yankee",
                            description: '"Despacito" available on these music platforms.',
                            channelId: "UCLp8toNIcrc6RKGs0P2Gg5w",
                            channelTitle: "Luis Fonsi",
                            publishedAt: "2017-01-12T15:00:00Z",
                            thumbnails: {
                                default: {
                                    url: "https://i.ytimg.com/vi/kJQP7kiw5Fk/default.jpg",
                                    width: 120,
                                    height: 90
                                }
                            },
                            duration: "PT4M42S",
                            definition: "hd",
                            viewCount: "8500000000",
                            likeCount: "52000000",
                            commentCount: "15000000"
                        }
                    ],
                    nextPageToken: null,
                    pageInfo: {
                        totalResults: 3,
                        resultsPerPage: 3
                    }
                }
            },
            {
                name: "list_most_popular",
                description: "Get most popular videos chart",
                input: {
                    chart: "mostPopular",
                    regionCode: "US",
                    maxResults: 5
                },
                expectedOutput: {
                    videos: [
                        {
                            id: "trendingVideo1",
                            title: "Trending Video #1 - Music",
                            description: "The hottest new music video",
                            channelId: "UCtrendingArtist1",
                            channelTitle: "Trending Artist",
                            publishedAt: "2025-03-14T00:00:00Z",
                            thumbnails: {
                                default: {
                                    url: "https://i.ytimg.com/vi/trending1/default.jpg",
                                    width: 120,
                                    height: 90
                                }
                            },
                            duration: "PT3M45S",
                            definition: "hd",
                            viewCount: "50000000",
                            likeCount: "2000000",
                            commentCount: "150000"
                        },
                        {
                            id: "trendingVideo2",
                            title: "Viral Video #2 - Comedy",
                            description: "This video is going viral!",
                            channelId: "UCtrendingCreator2",
                            channelTitle: "Comedy Creator",
                            publishedAt: "2025-03-13T12:00:00Z",
                            thumbnails: {
                                default: {
                                    url: "https://i.ytimg.com/vi/trending2/default.jpg",
                                    width: 120,
                                    height: 90
                                }
                            },
                            duration: "PT10M22S",
                            definition: "hd",
                            viewCount: "25000000",
                            likeCount: "1500000",
                            commentCount: "200000"
                        }
                    ],
                    nextPageToken: "CAUQAA",
                    pageInfo: {
                        totalResults: 200,
                        resultsPerPage: 5
                    }
                }
            },
            {
                name: "list_liked_videos",
                description: "List videos the user has liked",
                input: {
                    myRating: "like",
                    maxResults: 10
                },
                expectedOutput: {
                    videos: [
                        {
                            id: "likedVideo1",
                            title: "Amazing Tutorial I Liked",
                            description: "Great content that I liked",
                            channelId: "UCeducator1",
                            channelTitle: "Tech Educator",
                            publishedAt: "2025-02-01T00:00:00Z",
                            thumbnails: {
                                default: {
                                    url: "https://i.ytimg.com/vi/liked1/default.jpg",
                                    width: 120,
                                    height: 90
                                }
                            },
                            duration: "PT15M00S",
                            definition: "hd",
                            viewCount: "500000",
                            likeCount: "25000",
                            commentCount: "1500"
                        }
                    ],
                    nextPageToken: "CAUQAA",
                    pageInfo: {
                        totalResults: 150,
                        resultsPerPage: 10
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "videos_not_found",
                description: "Request videos with invalid IDs",
                input: {
                    ids: ["invalid_id_1", "invalid_id_2"]
                },
                expectedError: {
                    type: "not_found",
                    message: "No videos found for the provided IDs",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when listing videos",
                input: {
                    chart: "mostPopular"
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
        operationId: "rateVideo",
        provider: "youtube",
        validCases: [
            {
                name: "like_video",
                description: "Like a YouTube video",
                input: {
                    videoId: "dQw4w9WgXcQ",
                    rating: "like"
                },
                expectedOutput: {
                    videoId: "dQw4w9WgXcQ",
                    rating: "like",
                    message: "Successfully liked video"
                }
            },
            {
                name: "dislike_video",
                description: "Dislike a YouTube video",
                input: {
                    videoId: "unwantedVideo123",
                    rating: "dislike"
                },
                expectedOutput: {
                    videoId: "unwantedVideo123",
                    rating: "dislike",
                    message: "Successfully disliked video"
                }
            },
            {
                name: "remove_rating",
                description: "Remove rating from a previously rated video",
                input: {
                    videoId: "dQw4w9WgXcQ",
                    rating: "none"
                },
                expectedOutput: {
                    videoId: "dQw4w9WgXcQ",
                    rating: "none",
                    message: "Successfully removed rating from video"
                }
            }
        ],
        errorCases: [
            {
                name: "video_not_found",
                description: "Attempt to rate a non-existent video",
                input: {
                    videoId: "nonexistent_video_id",
                    rating: "like"
                },
                expectedError: {
                    type: "not_found",
                    message: "Video not found",
                    retryable: false
                }
            },
            {
                name: "rating_disabled",
                description: "Attempt to rate a video with ratings disabled",
                input: {
                    videoId: "ratingsDisabledVideo",
                    rating: "like"
                },
                expectedError: {
                    type: "permission",
                    message: "Ratings are disabled for this video",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when rating video",
                input: {
                    videoId: "dQw4w9WgXcQ",
                    rating: "like"
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
        operationId: "removeFromPlaylist",
        provider: "youtube",
        validCases: [
            {
                name: "remove_video_from_playlist",
                description: "Remove a video from a playlist using playlist item ID",
                input: {
                    playlistItemId:
                        "UExhVWRIWWNCV2hJSV9oXzdqNE5XRXpOVjJfMVFiZ3h6eA.5BE06F5B4D8B1234"
                },
                expectedOutput: {
                    playlistItemId:
                        "UExhVWRIWWNCV2hJSV9oXzdqNE5XRXpOVjJfMVFiZ3h6eA.5BE06F5B4D8B1234",
                    removed: true,
                    message: "Video removed from playlist successfully"
                }
            },
            {
                name: "remove_from_watch_later",
                description: "Remove a video from the Watch Later playlist",
                input: {
                    playlistItemId: "V0xfYWJjMTIzNDU2Nzg5"
                },
                expectedOutput: {
                    playlistItemId: "V0xfYWJjMTIzNDU2Nzg5",
                    removed: true,
                    message: "Video removed from playlist successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "playlist_item_not_found",
                description: "Attempt to remove a non-existent playlist item",
                input: {
                    playlistItemId: "nonexistent_item_123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Playlist item not found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "Attempt to remove from another user's playlist",
                input: {
                    playlistItemId: "other_user_playlist_item"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to modify this playlist",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when removing from playlist",
                input: {
                    playlistItemId:
                        "UExhVWRIWWNCV2hJSV9oXzdqNE5XRXpOVjJfMVFiZ3h6eA.5BE06F5B4D8B1234"
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
        operationId: "search",
        provider: "youtube",
        validCases: [
            {
                name: "search_videos",
                description: "Search for videos on YouTube",
                input: {
                    query: "typescript tutorial 2025",
                    type: "video",
                    maxResults: 10,
                    order: "relevance"
                },
                expectedOutput: {
                    results: [
                        {
                            id: "videoResult1_abc",
                            type: "video",
                            title: "TypeScript Full Course for Beginners 2025",
                            description:
                                "Learn TypeScript from scratch in this comprehensive tutorial.",
                            channelId: "UCts_educator",
                            channelTitle: "Code Academy",
                            publishedAt: "2025-01-15T10:00:00Z",
                            thumbnails: {
                                default: {
                                    url: "https://i.ytimg.com/vi/videoResult1/default.jpg",
                                    width: 120,
                                    height: 90
                                },
                                medium: {
                                    url: "https://i.ytimg.com/vi/videoResult1/mqdefault.jpg",
                                    width: 320,
                                    height: 180
                                }
                            }
                        },
                        {
                            id: "videoResult2_def",
                            type: "video",
                            title: "Advanced TypeScript Patterns - 2025 Edition",
                            description: "Master advanced TypeScript patterns used in production.",
                            channelId: "UCadvanced_ts",
                            channelTitle: "Advanced Dev",
                            publishedAt: "2025-02-20T14:30:00Z",
                            thumbnails: {
                                default: {
                                    url: "https://i.ytimg.com/vi/videoResult2/default.jpg",
                                    width: 120,
                                    height: 90
                                }
                            }
                        }
                    ],
                    nextPageToken: "CAUQAA",
                    pageInfo: {
                        totalResults: 1500000,
                        resultsPerPage: 10
                    }
                }
            },
            {
                name: "search_channels",
                description: "Search for YouTube channels",
                input: {
                    query: "programming tutorials",
                    type: "channel",
                    maxResults: 5,
                    order: "viewCount"
                },
                expectedOutput: {
                    results: [
                        {
                            id: "UCchannel1_abc",
                            type: "channel",
                            title: "freeCodeCamp.org",
                            description: "Learn to code for free with millions of other people.",
                            channelId: "UC8butISFwT-Wl7EV0hUK0BQ",
                            channelTitle: "freeCodeCamp.org",
                            publishedAt: "2014-12-16T21:18:48Z",
                            thumbnails: {
                                default: {
                                    url: "https://yt3.ggpht.com/freecodecamp.jpg",
                                    width: 88,
                                    height: 88
                                }
                            }
                        },
                        {
                            id: "UCchannel2_def",
                            type: "channel",
                            title: "Traversy Media",
                            description: "Practical project-based courses on web development.",
                            channelId: "UC29ju8bIPH5as8OGnQzwJyA",
                            channelTitle: "Traversy Media",
                            publishedAt: "2009-03-04T02:32:29Z",
                            thumbnails: {
                                default: {
                                    url: "https://yt3.ggpht.com/traversy.jpg",
                                    width: 88,
                                    height: 88
                                }
                            }
                        }
                    ],
                    nextPageToken: "CAUQAA",
                    pageInfo: {
                        totalResults: 50000,
                        resultsPerPage: 5
                    }
                }
            },
            {
                name: "search_with_filters",
                description: "Search with multiple filters applied",
                input: {
                    query: "react hooks",
                    type: "video",
                    maxResults: 10,
                    order: "date",
                    publishedAfter: "2025-01-01T00:00:00Z",
                    videoDuration: "medium",
                    videoDefinition: "high",
                    regionCode: "US",
                    safeSearch: "moderate"
                },
                expectedOutput: {
                    results: [
                        {
                            id: "filteredResult1",
                            type: "video",
                            title: "React Hooks Deep Dive - Latest Features 2025",
                            description:
                                "Comprehensive guide to React hooks including new features.",
                            channelId: "UCreact_expert",
                            channelTitle: "React Expert",
                            publishedAt: "2025-03-10T08:00:00Z",
                            thumbnails: {
                                default: {
                                    url: "https://i.ytimg.com/vi/filtered1/default.jpg",
                                    width: 120,
                                    height: 90
                                }
                            }
                        }
                    ],
                    nextPageToken: null,
                    pageInfo: {
                        totalResults: 1,
                        resultsPerPage: 10
                    }
                }
            },
            {
                name: "search_playlists",
                description: "Search for playlists on YouTube",
                input: {
                    query: "learn python complete course",
                    type: "playlist",
                    maxResults: 5
                },
                expectedOutput: {
                    results: [
                        {
                            id: "PLplaylist1_abc",
                            type: "playlist",
                            title: "Python Full Course - Beginner to Advanced",
                            description: "Complete Python programming course from zero to hero.",
                            channelId: "UCpython_master",
                            channelTitle: "Python Master",
                            publishedAt: "2024-06-01T00:00:00Z",
                            thumbnails: {
                                default: {
                                    url: "https://i.ytimg.com/vi/playlist1/default.jpg",
                                    width: 120,
                                    height: 90
                                }
                            }
                        }
                    ],
                    nextPageToken: "CAUQAA",
                    pageInfo: {
                        totalResults: 25000,
                        resultsPerPage: 5
                    }
                }
            },
            {
                name: "search_channel_videos",
                description: "Search for videos within a specific channel",
                input: {
                    query: "kubernetes",
                    channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
                    type: "video",
                    maxResults: 10
                },
                expectedOutput: {
                    results: [
                        {
                            id: "channelSearchResult1",
                            type: "video",
                            title: "Kubernetes Best Practices - Google Cloud",
                            description: "Learn Kubernetes best practices from Google experts.",
                            channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
                            channelTitle: "Google for Developers",
                            publishedAt: "2024-11-15T16:00:00Z",
                            thumbnails: {
                                default: {
                                    url: "https://i.ytimg.com/vi/k8s1/default.jpg",
                                    width: 120,
                                    height: 90
                                }
                            }
                        }
                    ],
                    nextPageToken: null,
                    pageInfo: {
                        totalResults: 45,
                        resultsPerPage: 10
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "empty_query",
                description: "Search with empty query string",
                input: {
                    query: "",
                    type: "video"
                },
                expectedError: {
                    type: "validation",
                    message: "Search query is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when searching",
                input: {
                    query: "popular search term"
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
        operationId: "subscribe",
        provider: "youtube",
        validCases: [
            {
                name: "subscribe_to_channel",
                description: "Subscribe to a YouTube channel",
                input: {
                    channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw"
                },
                expectedOutput: {
                    subscriptionId: "new_subscription_abc123",
                    channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
                    channelTitle: "Google for Developers",
                    subscribedAt: "2025-03-15T14:00:00Z"
                }
            },
            {
                name: "subscribe_to_creator",
                description: "Subscribe to a content creator's channel",
                input: {
                    channelId: "UCVHFbqXqoYvEWM1Ddxl0QKg"
                },
                expectedOutput: {
                    subscriptionId: "new_subscription_def456",
                    channelId: "UCVHFbqXqoYvEWM1Ddxl0QKg",
                    channelTitle: "Fireship",
                    subscribedAt: "2025-03-15T15:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "channel_not_found",
                description: "Attempt to subscribe to a non-existent channel",
                input: {
                    channelId: "UCnonexistent_channel_123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Channel not found",
                    retryable: false
                }
            },
            {
                name: "already_subscribed",
                description: "Attempt to subscribe to an already subscribed channel",
                input: {
                    channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw"
                },
                expectedError: {
                    type: "validation",
                    message: "Already subscribed to this channel",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when subscribing",
                input: {
                    channelId: "UCVHFbqXqoYvEWM1Ddxl0QKg"
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
        operationId: "unsubscribe",
        provider: "youtube",
        validCases: [
            {
                name: "unsubscribe_from_channel",
                description: "Unsubscribe from a YouTube channel",
                input: {
                    subscriptionId: "UCabc123_subscription1"
                },
                expectedOutput: {
                    subscriptionId: "UCabc123_subscription1",
                    unsubscribed: true,
                    message: "Successfully unsubscribed from channel"
                }
            },
            {
                name: "unsubscribe_cleanup",
                description: "Unsubscribe from an inactive channel",
                input: {
                    subscriptionId: "UCold_inactive_sub789"
                },
                expectedOutput: {
                    subscriptionId: "UCold_inactive_sub789",
                    unsubscribed: true,
                    message: "Successfully unsubscribed from channel"
                }
            }
        ],
        errorCases: [
            {
                name: "subscription_not_found",
                description: "Attempt to unsubscribe with invalid subscription ID",
                input: {
                    subscriptionId: "nonexistent_subscription_123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Subscription not found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "Attempt to unsubscribe from another user's subscription",
                input: {
                    subscriptionId: "other_user_subscription_456"
                },
                expectedError: {
                    type: "permission",
                    message: "You cannot modify this subscription",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when unsubscribing",
                input: {
                    subscriptionId: "UCabc123_subscription1"
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
        operationId: "updatePlaylist",
        provider: "youtube",
        validCases: [
            {
                name: "update_playlist_title",
                description: "Update playlist title only",
                input: {
                    playlistId: "PLmy_playlist_123",
                    title: "Updated Playlist Title 2025"
                },
                expectedOutput: {
                    id: "PLmy_playlist_123",
                    title: "Updated Playlist Title 2025",
                    description: "Original description",
                    privacyStatus: "public"
                }
            },
            {
                name: "update_playlist_description",
                description: "Update playlist title and description",
                input: {
                    playlistId: "PLcoding_tutorials",
                    title: "Best Coding Tutorials",
                    description:
                        "Curated list of the best coding tutorials for 2025. Covering JavaScript, Python, TypeScript, and more."
                },
                expectedOutput: {
                    id: "PLcoding_tutorials",
                    title: "Best Coding Tutorials",
                    description:
                        "Curated list of the best coding tutorials for 2025. Covering JavaScript, Python, TypeScript, and more.",
                    privacyStatus: "public"
                }
            },
            {
                name: "update_playlist_privacy",
                description: "Change playlist privacy status",
                input: {
                    playlistId: "PLprivate_to_public",
                    privacyStatus: "public"
                },
                expectedOutput: {
                    id: "PLprivate_to_public",
                    title: "My Playlist",
                    description: "A playlist",
                    privacyStatus: "public"
                }
            },
            {
                name: "update_all_fields",
                description: "Update all editable playlist fields",
                input: {
                    playlistId: "PLfull_update",
                    title: "Complete Python Course 2025",
                    description: "From beginner to advanced Python programming",
                    privacyStatus: "unlisted",
                    defaultLanguage: "en"
                },
                expectedOutput: {
                    id: "PLfull_update",
                    title: "Complete Python Course 2025",
                    description: "From beginner to advanced Python programming",
                    privacyStatus: "unlisted"
                }
            }
        ],
        errorCases: [
            {
                name: "playlist_not_found",
                description: "Attempt to update a non-existent playlist",
                input: {
                    playlistId: "PLnonexistent_123",
                    title: "New Title"
                },
                expectedError: {
                    type: "not_found",
                    message: "Playlist not found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "Attempt to update another user's playlist",
                input: {
                    playlistId: "PLother_user_playlist",
                    title: "Trying to change"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to modify this playlist",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when updating playlist",
                input: {
                    playlistId: "PLmy_playlist_123",
                    title: "Rate Limited Update"
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
