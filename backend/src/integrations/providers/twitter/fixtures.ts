/**
 * Twitter (X) Provider Test Fixtures
 *
 * Based on X API v2 documentation:
 * - Manage Tweets: https://developer.twitter.com/en/docs/twitter-api/tweets/manage-tweets
 * - Users Lookup: https://developer.twitter.com/en/docs/twitter-api/users/lookup
 * - Timelines: https://developer.twitter.com/en/docs/twitter-api/tweets/timelines
 * - Search: https://developer.twitter.com/en/docs/twitter-api/tweets/search
 */

import type { TestFixture } from "../../sandbox";

export const twitterFixtures: TestFixture[] = [
    {
        operationId: "postTweet",
        provider: "twitter",
        validCases: [
            {
                name: "simple_text_tweet",
                description: "Post a simple text tweet",
                input: {
                    text: "Hello, World! Testing the FlowMaestro X integration."
                },
                expectedOutput: {
                    tweetId: "1738592847392847392",
                    text: "Hello, World! Testing the FlowMaestro X integration."
                }
            },
            {
                name: "tweet_with_reply",
                description: "Post a tweet as a reply to another tweet",
                input: {
                    text: "Great point! Thanks for sharing.",
                    reply_to_tweet_id: "1738592847000000001"
                },
                expectedOutput: {
                    tweetId: "1738592847392847393",
                    text: "Great point! Thanks for sharing."
                }
            },
            {
                name: "tweet_with_quote",
                description: "Post a quote tweet referencing another tweet",
                input: {
                    text: "This is absolutely worth reading!",
                    quote_tweet_id: "1738592847000000002"
                },
                expectedOutput: {
                    tweetId: "1738592847392847394",
                    text: "This is absolutely worth reading! https://t.co/abc123def4"
                }
            }
        ],
        errorCases: [
            {
                name: "tweet_not_found_for_reply",
                description: "Reply to a tweet that does not exist",
                input: {
                    text: "Reply to deleted tweet",
                    reply_to_tweet_id: "1738592847999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Tweet not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for posting tweets",
                input: {
                    text: "Rate limit test tweet"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Too Many Requests",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteTweet",
        provider: "twitter",
        validCases: [
            {
                name: "delete_own_tweet",
                description: "Delete a tweet owned by the authenticated user",
                input: {
                    tweet_id: "1738592847392847392"
                },
                expectedOutput: {
                    deleted: true,
                    tweetId: "1738592847392847392"
                }
            },
            {
                name: "delete_reply_tweet",
                description: "Delete a reply tweet",
                input: {
                    tweet_id: "1738592847392847393"
                },
                expectedOutput: {
                    deleted: true,
                    tweetId: "1738592847392847393"
                }
            }
        ],
        errorCases: [
            {
                name: "tweet_not_found",
                description: "Attempt to delete a non-existent tweet",
                input: {
                    tweet_id: "1738592847999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Tweet not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for delete operation",
                input: {
                    tweet_id: "1738592847392847392"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Too Many Requests",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getUser",
        provider: "twitter",
        validCases: [
            {
                name: "get_user_by_username",
                description: "Get user profile by username",
                input: {
                    username: "FlowMaestro"
                },
                expectedOutput: {
                    id: "1234567890123456789",
                    name: "FlowMaestro",
                    username: "FlowMaestro",
                    description: "Workflow automation platform for modern teams",
                    profileImageUrl:
                        "https://pbs.twimg.com/profile_images/1234567890/avatar_normal.jpg",
                    createdAt: "2023-01-15T10:30:00.000Z",
                    isVerified: true,
                    isProtected: false,
                    metrics: {
                        followers_count: 15420,
                        following_count: 892,
                        tweet_count: 3241,
                        listed_count: 156
                    }
                }
            },
            {
                name: "get_authenticated_user",
                description: "Get the authenticated user's profile when no username provided",
                input: {},
                expectedOutput: {
                    id: "9876543210987654321",
                    name: "John Doe",
                    username: "johndoe_dev",
                    description: "Software Engineer | Open Source Enthusiast",
                    profileImageUrl:
                        "https://pbs.twimg.com/profile_images/9876543210/avatar_normal.jpg",
                    createdAt: "2020-06-20T14:22:00.000Z",
                    isVerified: false,
                    isProtected: false,
                    metrics: {
                        followers_count: 512,
                        following_count: 347,
                        tweet_count: 1892,
                        listed_count: 12
                    }
                }
            },
            {
                name: "get_verified_account",
                description: "Get a verified user account",
                input: {
                    username: "github"
                },
                expectedOutput: {
                    id: "1300192384012830720",
                    name: "GitHub",
                    username: "github",
                    description: "How people build software.",
                    profileImageUrl:
                        "https://pbs.twimg.com/profile_images/github/avatar_normal.jpg",
                    createdAt: "2019-03-12T18:45:00.000Z",
                    isVerified: true,
                    isProtected: false,
                    metrics: {
                        followers_count: 2500000,
                        following_count: 423,
                        tweet_count: 15678,
                        listed_count: 8932
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "user_not_found",
                description: "User with the given username does not exist",
                input: {
                    username: "nonexistent_user_xyz_123456"
                },
                expectedError: {
                    type: "not_found",
                    message: "User @nonexistent_user_xyz_123456 not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for user lookup",
                input: {
                    username: "FlowMaestro"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Too Many Requests",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getUserTimeline",
        provider: "twitter",
        validCases: [
            {
                name: "get_own_timeline",
                description: "Get the authenticated user's recent tweets",
                input: {
                    max_results: 10
                },
                expectedOutput: {
                    tweets: [
                        {
                            id: "1738592847392847395",
                            text: "Just shipped a major update to our workflow engine!",
                            authorId: "9876543210987654321",
                            createdAt: "2024-12-23T15:30:00.000Z",
                            conversationId: "1738592847392847395",
                            metrics: {
                                retweet_count: 12,
                                reply_count: 5,
                                like_count: 48,
                                quote_count: 3
                            }
                        },
                        {
                            id: "1738592847392847390",
                            text: "Working on some exciting new integrations. Stay tuned!",
                            authorId: "9876543210987654321",
                            createdAt: "2024-12-22T10:15:00.000Z",
                            conversationId: "1738592847392847390",
                            metrics: {
                                retweet_count: 8,
                                reply_count: 3,
                                like_count: 32,
                                quote_count: 1
                            }
                        }
                    ],
                    meta: {
                        resultCount: 2,
                        nextToken: "b26v89c19zqg8o3fpdkjq7wu",
                        newestId: "1738592847392847395",
                        oldestId: "1738592847392847390"
                    }
                }
            },
            {
                name: "get_user_timeline_by_id",
                description: "Get tweets from a specific user by ID",
                input: {
                    user_id: "1234567890123456789",
                    max_results: 5
                },
                expectedOutput: {
                    tweets: [
                        {
                            id: "1738592847392847400",
                            text: "Announcing our new API v2 with improved performance!",
                            authorId: "1234567890123456789",
                            createdAt: "2024-12-23T18:00:00.000Z",
                            conversationId: "1738592847392847400",
                            metrics: {
                                retweet_count: 156,
                                reply_count: 42,
                                like_count: 892,
                                quote_count: 28
                            }
                        }
                    ],
                    meta: {
                        resultCount: 1,
                        newestId: "1738592847392847400",
                        oldestId: "1738592847392847400"
                    }
                }
            },
            {
                name: "get_timeline_with_pagination",
                description: "Get next page of timeline results",
                input: {
                    user_id: "9876543210987654321",
                    max_results: 10,
                    pagination_token: "b26v89c19zqg8o3fpdkjq7wu"
                },
                expectedOutput: {
                    tweets: [
                        {
                            id: "1738592847392847380",
                            text: "Happy to announce we've reached 10,000 active users!",
                            authorId: "9876543210987654321",
                            createdAt: "2024-12-21T12:00:00.000Z",
                            conversationId: "1738592847392847380",
                            metrics: {
                                retweet_count: 25,
                                reply_count: 18,
                                like_count: 145,
                                quote_count: 7
                            }
                        }
                    ],
                    meta: {
                        resultCount: 1,
                        previousToken: "a25u88b18yqf7n2eocjp6xvt",
                        newestId: "1738592847392847380",
                        oldestId: "1738592847392847380"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "user_not_found",
                description: "User ID does not exist",
                input: {
                    user_id: "9999999999999999999",
                    max_results: 10
                },
                expectedError: {
                    type: "not_found",
                    message: "User not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for timeline retrieval",
                input: {
                    max_results: 10
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Too Many Requests",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "replyToTweet",
        provider: "twitter",
        validCases: [
            {
                name: "simple_reply",
                description: "Reply to a tweet with a simple text message",
                input: {
                    tweet_id: "1738592847392847400",
                    text: "This is great news! Congratulations on the launch!"
                },
                expectedOutput: {
                    replyId: "1738592847392847401",
                    text: "This is great news! Congratulations on the launch!",
                    inReplyToTweetId: "1738592847392847400"
                }
            },
            {
                name: "reply_with_mention",
                description: "Reply to a tweet mentioning the author",
                input: {
                    tweet_id: "1738592847392847395",
                    text: "@johndoe_dev Amazing work! Would love to learn more about the implementation."
                },
                expectedOutput: {
                    replyId: "1738592847392847402",
                    text: "@johndoe_dev Amazing work! Would love to learn more about the implementation.",
                    inReplyToTweetId: "1738592847392847395"
                }
            },
            {
                name: "reply_in_thread",
                description: "Add a reply to an ongoing thread",
                input: {
                    tweet_id: "1738592847392847401",
                    text: "Thanks! Here's a thread with more details..."
                },
                expectedOutput: {
                    replyId: "1738592847392847403",
                    text: "Thanks! Here's a thread with more details...",
                    inReplyToTweetId: "1738592847392847401"
                }
            }
        ],
        errorCases: [
            {
                name: "tweet_not_found",
                description: "Original tweet to reply to does not exist",
                input: {
                    tweet_id: "1738592847999999999",
                    text: "Reply to non-existent tweet"
                },
                expectedError: {
                    type: "not_found",
                    message: "Tweet not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for posting replies",
                input: {
                    tweet_id: "1738592847392847400",
                    text: "Rate limited reply"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Too Many Requests",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "searchTweets",
        provider: "twitter",
        validCases: [
            {
                name: "search_by_keyword",
                description: "Search for tweets containing a specific keyword",
                input: {
                    query: "workflow automation",
                    max_results: 10
                },
                expectedOutput: {
                    tweets: [
                        {
                            id: "1738592847392847410",
                            text: "Just discovered an amazing workflow automation tool that saved me hours of work!",
                            authorId: "1111111111111111111",
                            createdAt: "2024-12-23T20:00:00.000Z",
                            conversationId: "1738592847392847410",
                            metrics: {
                                retweet_count: 5,
                                reply_count: 2,
                                like_count: 18,
                                quote_count: 1
                            }
                        },
                        {
                            id: "1738592847392847411",
                            text: "Workflow automation is the future of productivity. Here's why...",
                            authorId: "2222222222222222222",
                            createdAt: "2024-12-23T19:30:00.000Z",
                            conversationId: "1738592847392847411",
                            metrics: {
                                retweet_count: 32,
                                reply_count: 8,
                                like_count: 125,
                                quote_count: 12
                            }
                        }
                    ],
                    meta: {
                        resultCount: 2,
                        nextToken: "c37w90d20arg9p4gqelkr8xv",
                        newestId: "1738592847392847410",
                        oldestId: "1738592847392847411"
                    }
                }
            },
            {
                name: "search_from_user",
                description: "Search for tweets from a specific user",
                input: {
                    query: "from:FlowMaestro",
                    max_results: 5
                },
                expectedOutput: {
                    tweets: [
                        {
                            id: "1738592847392847420",
                            text: "Excited to announce our new Slack integration!",
                            authorId: "1234567890123456789",
                            createdAt: "2024-12-23T16:00:00.000Z",
                            conversationId: "1738592847392847420",
                            metrics: {
                                retweet_count: 45,
                                reply_count: 12,
                                like_count: 234,
                                quote_count: 8
                            }
                        }
                    ],
                    meta: {
                        resultCount: 1,
                        newestId: "1738592847392847420",
                        oldestId: "1738592847392847420"
                    }
                }
            },
            {
                name: "search_with_hashtag",
                description: "Search for tweets with a specific hashtag",
                input: {
                    query: "#DevOps #Automation",
                    max_results: 10
                },
                expectedOutput: {
                    tweets: [
                        {
                            id: "1738592847392847430",
                            text: "Implementing CI/CD pipelines with #DevOps #Automation best practices",
                            authorId: "3333333333333333333",
                            createdAt: "2024-12-23T21:00:00.000Z",
                            conversationId: "1738592847392847430",
                            metrics: {
                                retweet_count: 78,
                                reply_count: 15,
                                like_count: 312,
                                quote_count: 22
                            }
                        }
                    ],
                    meta: {
                        resultCount: 1,
                        newestId: "1738592847392847430",
                        oldestId: "1738592847392847430"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_query",
                description: "Search query is invalid or malformed",
                input: {
                    query: "",
                    max_results: 10
                },
                expectedError: {
                    type: "validation",
                    message: "Query cannot be empty",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for search operation",
                input: {
                    query: "workflow automation",
                    max_results: 10
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Too Many Requests",
                    retryable: true
                }
            }
        ]
    }
];
