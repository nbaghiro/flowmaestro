/**
 * Instagram Provider Test Fixtures
 */

import type { TestFixture } from "../../../sandbox";

export const instagramFixtures: TestFixture[] = [
    {
        operationId: "getAccountInfo",
        provider: "instagram",
        validCases: [
            {
                name: "basic_getAccountInfo",
                description: "Get information about an Instagram Business account",
                input: {
                    igAccountId: "17841405793187218"
                },
                expectedOutput: {
                    id: "17841405793187218",
                    username: "fashionbrand_official",
                    name: "Fashion Brand",
                    profilePictureUrl:
                        "https://scontent.cdninstagram.com/v/t51.2885-19/123456789_123456789012345_1234567890123456789_n.jpg",
                    followersCount: 125000,
                    followsCount: 892,
                    mediaCount: 1432,
                    biography:
                        "Premium fashion for the modern lifestyle. Shop our latest collection. Free shipping worldwide.",
                    website: "https://www.fashionbrand.com"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_account_id",
                description: "Account ID does not exist",
                input: {
                    igAccountId: "invalid_account_12345"
                },
                expectedError: {
                    type: "not_found",
                    message: "Instagram account not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when fetching account info",
                input: {
                    igAccountId: "17841405793187218"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "permission",
                description: "No permission to access account",
                input: {
                    igAccountId: "17841400000000000"
                },
                expectedError: {
                    type: "permission",
                    message: "Permission denied to access this Instagram account",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getAccountInsights",
        provider: "instagram",
        validCases: [
            {
                name: "basic_getAccountInsights",
                description: "Get account-level insights with default metrics",
                input: {
                    igAccountId: "17841405793187218"
                },
                expectedOutput: {
                    igAccountId: "17841405793187218",
                    period: "day",
                    insights: [
                        {
                            name: "impressions",
                            value: 45230,
                            period: "day",
                            title: "Impressions",
                            description: "Total number of times your posts have been seen"
                        },
                        {
                            name: "reach",
                            value: 32150,
                            period: "day",
                            title: "Reach",
                            description: "Total number of unique accounts that have seen your posts"
                        },
                        {
                            name: "follower_count",
                            value: 125000,
                            period: "day",
                            title: "Followers",
                            description: "Total number of followers"
                        },
                        {
                            name: "profile_views",
                            value: 892,
                            period: "day",
                            title: "Profile Views",
                            description: "Total number of times your profile has been viewed"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_metric",
                description: "Invalid metric name requested",
                input: {
                    igAccountId: "17841405793187218",
                    metrics: ["invalid_metric_name"],
                    period: "day"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid metric: invalid_metric_name",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when fetching insights",
                input: {
                    igAccountId: "17841405793187218",
                    period: "day"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "account_not_found",
                description: "Account not found for insights",
                input: {
                    igAccountId: "17841400000000000",
                    period: "day"
                },
                expectedError: {
                    type: "not_found",
                    message: "Instagram account not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getConversations",
        provider: "instagram",
        validCases: [
            {
                name: "basic_getConversations",
                description: "List Instagram Direct Message conversations",
                input: {
                    pageId: "103847295847261"
                },
                expectedOutput: {
                    conversations: [
                        {
                            id: "t_10158847392847561",
                            updatedTime: "2024-01-15T14:32:18+0000",
                            participants: [
                                {
                                    id: "17841423456789012",
                                    username: "customer_jane",
                                    name: "Jane Smith"
                                }
                            ]
                        },
                        {
                            id: "t_10158847392847562",
                            updatedTime: "2024-01-15T10:15:42+0000",
                            participants: [
                                {
                                    id: "17841498765432109",
                                    username: "fashion_blogger_mark",
                                    name: "Mark Thompson"
                                }
                            ]
                        },
                        {
                            id: "t_10158847392847563",
                            updatedTime: "2024-01-14T22:45:09+0000",
                            participants: [
                                {
                                    id: "17841432109876543",
                                    username: "style_maven_lisa"
                                }
                            ]
                        }
                    ],
                    nextCursor:
                        "QVFIUnpMcVJiRlB4NVZAhVzJ2ZAEZAFbmFMc0xLQjFCMGxOYjd2VmhLdnlQYnQ3LVJvT0NjTWZAqLXpxRVlYYnNKTm5JZAHM5X0VlVm5pVUMtSE5fUGZA4RjBR"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_page_id",
                description: "Page ID not found or not connected to Instagram",
                input: {
                    pageId: "invalid_page_12345"
                },
                expectedError: {
                    type: "not_found",
                    message: "Facebook Page not found or not connected to Instagram",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when fetching conversations",
                input: {
                    pageId: "103847295847261"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "messaging_not_enabled",
                description: "Messaging feature not enabled for this account",
                input: {
                    pageId: "103847295847263"
                },
                expectedError: {
                    type: "permission",
                    message: "Instagram Messaging is not enabled for this account",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getMediaInsights",
        provider: "instagram",
        validCases: [
            {
                name: "basic_getMediaInsights",
                description: "Get engagement metrics for an Instagram post",
                input: {
                    mediaId: "17895742836847562"
                },
                expectedOutput: {
                    mediaId: "17895742836847562",
                    insights: [
                        {
                            name: "engagement",
                            value: 4532,
                            period: "lifetime",
                            title: "Engagement",
                            description: "Total number of likes and comments on the post"
                        },
                        {
                            name: "impressions",
                            value: 125430,
                            period: "lifetime",
                            title: "Impressions",
                            description: "Total number of times the post has been seen"
                        },
                        {
                            name: "reach",
                            value: 89250,
                            period: "lifetime",
                            title: "Reach",
                            description: "Total number of unique accounts that have seen the post"
                        },
                        {
                            name: "saved",
                            value: 312,
                            period: "lifetime",
                            title: "Saved",
                            description: "Total number of unique accounts that have saved the post"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "media_not_found",
                description: "Media ID does not exist",
                input: {
                    mediaId: "invalid_media_12345"
                },
                expectedError: {
                    type: "not_found",
                    message: "Media not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when fetching media insights",
                input: {
                    mediaId: "17895742836847562"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "insights_not_available",
                description: "Insights not available for this media type",
                input: {
                    mediaId: "17895742836847565",
                    metrics: ["video_views"]
                },
                expectedError: {
                    type: "validation",
                    message: "video_views metric is not available for image posts",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getMessages",
        provider: "instagram",
        validCases: [
            {
                name: "basic_getMessages",
                description: "Get messages from an Instagram Direct Message conversation",
                input: {
                    conversationId: "t_10158847392847561"
                },
                expectedOutput: {
                    messages: [
                        {
                            id: "m_mid.1705329138000",
                            createdTime: "2024-01-15T14:32:18+0000",
                            from: {
                                id: "17841423456789012",
                                username: "customer_jane",
                                name: "Jane Smith"
                            },
                            text: "Hi! I was wondering if you have this dress in size medium?"
                        },
                        {
                            id: "m_mid.1705329145000",
                            createdTime: "2024-01-15T14:32:25+0000",
                            from: {
                                id: "17841405793187218",
                                username: "fashionbrand_official",
                                name: "Fashion Brand"
                            },
                            text: "Hello Jane! Yes, we do have it in medium. Would you like me to send you the link?"
                        },
                        {
                            id: "m_mid.1705329160000",
                            createdTime: "2024-01-15T14:32:40+0000",
                            from: {
                                id: "17841423456789012",
                                username: "customer_jane",
                                name: "Jane Smith"
                            },
                            text: "Yes please! That would be great."
                        }
                    ],
                    nextCursor:
                        "QVFIUnpMcVJiRlB4NVZAhVzJ2ZAEZAFbmFMc0xLQjFCMGxOYjd2VmhLdnlQYnQ3LVJvT0NjTWZAqLXpxRVlYYnNKTm5JZAHM5X0VlVm5pVUMtSE5fUGZA4RjBT"
                }
            }
        ],
        errorCases: [
            {
                name: "conversation_not_found",
                description: "Conversation ID does not exist",
                input: {
                    conversationId: "t_invalid_conversation"
                },
                expectedError: {
                    type: "not_found",
                    message: "Conversation not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when fetching messages",
                input: {
                    conversationId: "t_10158847392847561"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "access_denied",
                description: "No access to this conversation",
                input: {
                    conversationId: "t_10158847392847999"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have access to this conversation",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "publishCarousel",
        provider: "instagram",
        validCases: [
            {
                name: "basic_publishCarousel",
                description: "Publish a carousel post with images",
                input: {
                    igAccountId: "17841405793187218",
                    mediaItems: [
                        {
                            type: "IMAGE",
                            url: "https://cdn.fashionbrand.com/summer-collection/look1.jpg"
                        },
                        {
                            type: "IMAGE",
                            url: "https://cdn.fashionbrand.com/summer-collection/look2.jpg"
                        },
                        {
                            type: "IMAGE",
                            url: "https://cdn.fashionbrand.com/summer-collection/look3.jpg"
                        }
                    ],
                    caption:
                        "Our Summer 2024 Collection is here! Swipe through to see our favorite looks. Shop now - link in bio.\n\n#SummerFashion #NewCollection #FashionBrand #OOTD #StyleInspo"
                },
                expectedOutput: {
                    mediaId: "17895742836847570",
                    permalink: "https://www.instagram.com/p/C2abc123XYZ/"
                }
            }
        ],
        errorCases: [
            {
                name: "too_few_items",
                description: "Carousel must have at least 2 items",
                input: {
                    igAccountId: "17841405793187218",
                    mediaItems: [
                        {
                            type: "IMAGE",
                            url: "https://cdn.fashionbrand.com/single-image.jpg"
                        }
                    ],
                    caption: "Single image post"
                },
                expectedError: {
                    type: "validation",
                    message: "Carousel must contain between 2 and 10 media items",
                    retryable: false
                }
            },
            {
                name: "invalid_media_url",
                description: "Media URL is not accessible",
                input: {
                    igAccountId: "17841405793187218",
                    mediaItems: [
                        {
                            type: "IMAGE",
                            url: "https://cdn.fashionbrand.com/nonexistent.jpg"
                        },
                        {
                            type: "IMAGE",
                            url: "https://cdn.fashionbrand.com/summer-collection/look1.jpg"
                        }
                    ],
                    caption: "Test carousel"
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "Unable to download media from URL: https://cdn.fashionbrand.com/nonexistent.jpg",
                    retryable: true
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when publishing carousel",
                input: {
                    igAccountId: "17841405793187218",
                    mediaItems: [
                        {
                            type: "IMAGE",
                            url: "https://cdn.fashionbrand.com/image1.jpg"
                        },
                        {
                            type: "IMAGE",
                            url: "https://cdn.fashionbrand.com/image2.jpg"
                        }
                    ]
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
        operationId: "publishPhoto",
        provider: "instagram",
        validCases: [
            {
                name: "basic_publishPhoto",
                description: "Publish a single photo to Instagram feed",
                input: {
                    igAccountId: "17841405793187218",
                    imageUrl: "https://cdn.fashionbrand.com/featured/spring-dress.jpg",
                    caption:
                        "Spring has sprung! Our bestselling floral dress is back in stock. Get yours before it sells out again!\n\nShop: link in bio\n\n#SpringFashion #FloralDress #FashionBrand #NewArrivals"
                },
                expectedOutput: {
                    mediaId: "17895742836847580",
                    permalink: "https://www.instagram.com/p/C2jkl012GHI/"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_image_url",
                description: "Image URL is not accessible",
                input: {
                    igAccountId: "17841405793187218",
                    imageUrl: "https://cdn.fashionbrand.com/nonexistent-image.jpg",
                    caption: "Test photo"
                },
                expectedError: {
                    type: "server_error",
                    message: "Unable to download media from URL",
                    retryable: true
                }
            },
            {
                name: "image_too_large",
                description: "Image exceeds 8MB limit",
                input: {
                    igAccountId: "17841405793187218",
                    imageUrl: "https://cdn.fashionbrand.com/huge-image-50mb.jpg",
                    caption: "Large image test"
                },
                expectedError: {
                    type: "validation",
                    message: "Image file size exceeds the 8MB limit",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when publishing photo",
                input: {
                    igAccountId: "17841405793187218",
                    imageUrl: "https://cdn.fashionbrand.com/featured/spring-dress.jpg"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "caption_too_long",
                description: "Caption exceeds 2200 character limit",
                input: {
                    igAccountId: "17841405793187218",
                    imageUrl: "https://cdn.fashionbrand.com/featured/spring-dress.jpg",
                    caption: "A".repeat(2201)
                },
                expectedError: {
                    type: "validation",
                    message: "Caption exceeds 2200 character limit",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "publishReel",
        provider: "instagram",
        validCases: [
            {
                name: "basic_publishReel",
                description: "Publish a video reel to Instagram",
                input: {
                    igAccountId: "17841405793187218",
                    videoUrl: "https://cdn.fashionbrand.com/reels/styling-tips-001.mp4",
                    caption:
                        "3 ways to style a white tee! Which one is your favorite? Comment below!\n\n#StylingTips #FashionReels #OOTD #StyleHacks"
                },
                expectedOutput: {
                    mediaId: "17895742836847590",
                    permalink: "https://www.instagram.com/reel/C2stu901PQR/"
                }
            }
        ],
        errorCases: [
            {
                name: "video_too_long",
                description: "Video exceeds 90 second limit for reels",
                input: {
                    igAccountId: "17841405793187218",
                    videoUrl: "https://cdn.fashionbrand.com/reels/too-long-video.mp4",
                    caption: "Too long video"
                },
                expectedError: {
                    type: "validation",
                    message: "Video duration exceeds the maximum allowed length for reels",
                    retryable: false
                }
            },
            {
                name: "invalid_video_url",
                description: "Video URL is not accessible",
                input: {
                    igAccountId: "17841405793187218",
                    videoUrl: "https://cdn.fashionbrand.com/nonexistent-video.mp4"
                },
                expectedError: {
                    type: "server_error",
                    message: "Unable to download video from URL",
                    retryable: true
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when publishing reel",
                input: {
                    igAccountId: "17841405793187218",
                    videoUrl: "https://cdn.fashionbrand.com/reels/styling-tips-001.mp4"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "unsupported_format",
                description: "Video format not supported",
                input: {
                    igAccountId: "17841405793187218",
                    videoUrl: "https://cdn.fashionbrand.com/reels/video.avi",
                    caption: "Test reel"
                },
                expectedError: {
                    type: "validation",
                    message: "Video format not supported. Please use MP4 format",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "publishStory",
        provider: "instagram",
        validCases: [
            {
                name: "basic_publishStory",
                description: "Publish an image story to Instagram Stories",
                input: {
                    igAccountId: "17841405793187218",
                    mediaUrl: "https://cdn.fashionbrand.com/stories/flash-sale.jpg",
                    mediaType: "image"
                },
                expectedOutput: {
                    mediaId: "17895742836847600"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_media_url",
                description: "Story media URL is not accessible",
                input: {
                    igAccountId: "17841405793187218",
                    mediaUrl: "https://cdn.fashionbrand.com/nonexistent-story.jpg",
                    mediaType: "image"
                },
                expectedError: {
                    type: "server_error",
                    message: "Unable to download media from URL",
                    retryable: true
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when publishing story",
                input: {
                    igAccountId: "17841405793187218",
                    mediaUrl: "https://cdn.fashionbrand.com/stories/flash-sale.jpg",
                    mediaType: "image"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "video_too_long",
                description: "Story video exceeds 60 second limit",
                input: {
                    igAccountId: "17841405793187218",
                    mediaUrl: "https://cdn.fashionbrand.com/stories/long-video.mp4",
                    mediaType: "video"
                },
                expectedError: {
                    type: "validation",
                    message: "Story video duration exceeds the 60 second limit",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "sendMediaMessage",
        provider: "instagram",
        validCases: [
            {
                name: "send_image_message",
                description: "Send an image message to an Instagram user",
                input: {
                    pageId: "103847295847261",
                    recipientId: "17841423456789012",
                    mediaType: "image",
                    mediaUrl: "https://cdn.fashionbrand.com/products/dress-medium.jpg"
                },
                expectedOutput: {
                    messageId: "m_mid.1705332000001",
                    recipientId: "17841423456789012"
                }
            }
        ],
        errorCases: [
            {
                name: "recipient_not_found",
                description: "Recipient IGSID not found",
                input: {
                    pageId: "103847295847261",
                    recipientId: "invalid_recipient_id",
                    mediaType: "image",
                    mediaUrl: "https://cdn.fashionbrand.com/products/dress-medium.jpg"
                },
                expectedError: {
                    type: "not_found",
                    message: "Recipient not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when sending media message",
                input: {
                    pageId: "103847295847261",
                    recipientId: "17841423456789012",
                    mediaType: "image",
                    mediaUrl: "https://cdn.fashionbrand.com/products/dress-medium.jpg"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "invalid_media_url",
                description: "Media URL cannot be accessed",
                input: {
                    pageId: "103847295847261",
                    recipientId: "17841423456789012",
                    mediaType: "image",
                    mediaUrl: "https://cdn.fashionbrand.com/nonexistent.jpg"
                },
                expectedError: {
                    type: "server_error",
                    message: "Unable to download media from URL",
                    retryable: true
                }
            },
            {
                name: "messaging_window_expired",
                description: "24-hour messaging window has expired",
                input: {
                    pageId: "103847295847261",
                    recipientId: "17841456789012345",
                    mediaType: "image",
                    mediaUrl: "https://cdn.fashionbrand.com/products/dress-medium.jpg"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot send message outside 24-hour window without HUMAN_AGENT tag",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "sendQuickReplies",
        provider: "instagram",
        validCases: [
            {
                name: "basic_sendQuickReplies",
                description: "Send a message with quick reply buttons",
                input: {
                    pageId: "103847295847261",
                    recipientId: "17841423456789012",
                    text: "How can I help you today?",
                    quickReplies: [
                        {
                            title: "Track Order",
                            payload: "TRACK_ORDER"
                        },
                        {
                            title: "Returns",
                            payload: "RETURNS"
                        },
                        {
                            title: "Size Guide",
                            payload: "SIZE_GUIDE"
                        },
                        {
                            title: "Contact Support",
                            payload: "CONTACT_SUPPORT"
                        }
                    ]
                },
                expectedOutput: {
                    messageId: "m_mid.1705335000001",
                    recipientId: "17841423456789012"
                }
            }
        ],
        errorCases: [
            {
                name: "too_many_quick_replies",
                description: "Quick replies array exceeds 13 items",
                input: {
                    pageId: "103847295847261",
                    recipientId: "17841423456789012",
                    text: "Select an option:",
                    quickReplies: Array(14)
                        .fill(null)
                        .map((_, i) => ({
                            title: `Option ${i + 1}`,
                            payload: `OPTION_${i + 1}`
                        }))
                },
                expectedError: {
                    type: "validation",
                    message: "Quick replies array cannot exceed 13 items",
                    retryable: false
                }
            },
            {
                name: "title_too_long",
                description: "Quick reply title exceeds 20 character limit",
                input: {
                    pageId: "103847295847261",
                    recipientId: "17841423456789012",
                    text: "Select an option:",
                    quickReplies: [
                        {
                            title: "This title is way too long for a quick reply button",
                            payload: "OPTION_1"
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "Quick reply title cannot exceed 20 characters",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when sending quick replies",
                input: {
                    pageId: "103847295847261",
                    recipientId: "17841423456789012",
                    text: "How can I help?",
                    quickReplies: [
                        {
                            title: "Help",
                            payload: "HELP"
                        }
                    ]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "recipient_not_found",
                description: "Recipient IGSID not found",
                input: {
                    pageId: "103847295847261",
                    recipientId: "invalid_recipient",
                    text: "How can I help?",
                    quickReplies: [
                        {
                            title: "Help",
                            payload: "HELP"
                        }
                    ]
                },
                expectedError: {
                    type: "not_found",
                    message: "Recipient not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "sendTextMessage",
        provider: "instagram",
        validCases: [
            {
                name: "basic_sendTextMessage",
                description: "Send a text message to an Instagram user",
                input: {
                    pageId: "103847295847261",
                    recipientId: "17841423456789012",
                    text: "Hi Jane! Yes, we have that dress in medium. Here's the link: https://fashionbrand.com/dresses/floral-medium"
                },
                expectedOutput: {
                    messageId: "m_mid.1705338000001",
                    recipientId: "17841423456789012"
                }
            }
        ],
        errorCases: [
            {
                name: "recipient_not_found",
                description: "Recipient IGSID not found",
                input: {
                    pageId: "103847295847261",
                    recipientId: "invalid_recipient_id",
                    text: "Hello!"
                },
                expectedError: {
                    type: "not_found",
                    message: "Recipient not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when sending text message",
                input: {
                    pageId: "103847295847261",
                    recipientId: "17841423456789012",
                    text: "Test message"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "message_too_long",
                description: "Message exceeds 1000 character limit",
                input: {
                    pageId: "103847295847261",
                    recipientId: "17841423456789012",
                    text: "A".repeat(1001)
                },
                expectedError: {
                    type: "validation",
                    message: "Message text cannot exceed 1000 characters",
                    retryable: false
                }
            },
            {
                name: "messaging_window_expired",
                description: "24-hour messaging window has expired without tag",
                input: {
                    pageId: "103847295847261",
                    recipientId: "17841456789012345",
                    text: "Following up on our conversation!"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot send message outside 24-hour window without HUMAN_AGENT tag",
                    retryable: false
                }
            },
            {
                name: "page_not_connected",
                description: "Page is not connected to Instagram",
                input: {
                    pageId: "999999999999999",
                    recipientId: "17841423456789012",
                    text: "Hello!"
                },
                expectedError: {
                    type: "not_found",
                    message: "Facebook Page not found or not connected to Instagram",
                    retryable: false
                }
            }
        ]
    }
];
