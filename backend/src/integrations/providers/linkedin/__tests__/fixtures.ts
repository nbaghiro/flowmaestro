/**
 * LinkedIn Provider Test Fixtures
 *
 * Comprehensive test fixtures for all LinkedIn operations with realistic data.
 */

import type { TestFixture } from "../../../sandbox";

export const linkedinFixtures: TestFixture[] = [
    // =============================================================================
    // ADD COMMENT
    // =============================================================================
    {
        operationId: "addComment",
        provider: "linkedin",
        validCases: [
            {
                name: "basic_comment",
                description: "Add a simple comment to a LinkedIn post",
                input: {
                    postId: "urn:li:ugcPost:7150892345678901234",
                    actor: "urn:li:person:ABC123xyz",
                    text: "Great insights! Thanks for sharing this perspective on cloud architecture."
                },
                expectedOutput: {
                    commentId:
                        "urn:li:comment:(urn:li:ugcPost:7150892345678901234,7150998765432109876)",
                    postId: "urn:li:ugcPost:7150892345678901234",
                    actor: "urn:li:person:ABC123xyz",
                    text: "Great insights! Thanks for sharing this perspective on cloud architecture."
                }
            }
        ],
        errorCases: [
            {
                name: "post_not_found",
                description: "Attempting to comment on a non-existent post",
                input: {
                    postId: "urn:li:ugcPost:9999999999999999999",
                    actor: "urn:li:person:ABC123xyz",
                    text: "This comment will fail"
                },
                expectedError: {
                    type: "not_found",
                    message: "Post not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for comments",
                input: {
                    postId: "urn:li:ugcPost:7150892345678901234",
                    actor: "urn:li:person:ABC123xyz",
                    text: "Another comment"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            },
            {
                name: "unauthorized_actor",
                description: "Actor does not have permission to comment",
                input: {
                    postId: "urn:li:ugcPost:7150892345678901234",
                    actor: "urn:li:organization:11111111",
                    text: "Unauthorized comment attempt"
                },
                expectedError: {
                    type: "permission",
                    message: "Not authorized to post as this actor",
                    retryable: false
                }
            }
        ]
    },

    // =============================================================================
    // ADD REACTION
    // =============================================================================
    {
        operationId: "addReaction",
        provider: "linkedin",
        validCases: [
            {
                name: "like_reaction",
                description: "Add a LIKE reaction to a post",
                input: {
                    postId: "urn:li:ugcPost:7150892345678901234",
                    actor: "urn:li:person:ABC123xyz",
                    reactionType: "LIKE"
                },
                expectedOutput: {
                    postId: "urn:li:ugcPost:7150892345678901234",
                    actor: "urn:li:person:ABC123xyz",
                    reactionType: "LIKE"
                }
            }
        ],
        errorCases: [
            {
                name: "post_not_found",
                description: "Attempting to react to a non-existent post",
                input: {
                    postId: "urn:li:ugcPost:9999999999999999999",
                    actor: "urn:li:person:ABC123xyz",
                    reactionType: "LIKE"
                },
                expectedError: {
                    type: "not_found",
                    message: "Post not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for reactions",
                input: {
                    postId: "urn:li:ugcPost:7150892345678901234",
                    actor: "urn:li:person:ABC123xyz",
                    reactionType: "LIKE"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            },
            {
                name: "already_reacted",
                description: "User has already reacted to this post",
                input: {
                    postId: "urn:li:ugcPost:7150892345678901234",
                    actor: "urn:li:person:DuplicateUser",
                    reactionType: "LIKE"
                },
                expectedError: {
                    type: "validation",
                    message: "You have already reacted to this post",
                    retryable: false
                }
            }
        ]
    },

    // =============================================================================
    // CREATE ARTICLE POST
    // =============================================================================
    {
        operationId: "createArticlePost",
        provider: "linkedin",
        validCases: [
            {
                name: "basic_article_post",
                description: "Create a post sharing an article with minimal options",
                input: {
                    author: "urn:li:person:ABC123xyz",
                    content: "Check out this insightful article on the future of cloud computing!",
                    visibility: "PUBLIC",
                    articleUrl: "https://techblog.example.com/future-of-cloud-computing-2024"
                },
                expectedOutput: {
                    postId: "urn:li:ugcPost:7156789012345678901",
                    author: "urn:li:person:ABC123xyz",
                    content: "Check out this insightful article on the future of cloud computing!",
                    visibility: "PUBLIC",
                    articleUrl: "https://techblog.example.com/future-of-cloud-computing-2024"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_url",
                description: "Article URL is invalid or inaccessible",
                input: {
                    author: "urn:li:person:ABC123xyz",
                    content: "Check out this article",
                    visibility: "PUBLIC",
                    articleUrl: "https://invalid-domain-that-does-not-exist.com/article"
                },
                expectedError: {
                    type: "validation",
                    message: "Unable to fetch article preview from the provided URL",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for post creation",
                input: {
                    author: "urn:li:person:ABC123xyz",
                    content: "Another article share",
                    visibility: "PUBLIC",
                    articleUrl: "https://blog.example.com/article"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            },
            {
                name: "unauthorized_author",
                description: "Not authorized to post as this author",
                input: {
                    author: "urn:li:organization:99999999",
                    content: "Unauthorized post attempt",
                    visibility: "PUBLIC",
                    articleUrl: "https://blog.example.com/article"
                },
                expectedError: {
                    type: "permission",
                    message: "Not authorized to post as this author",
                    retryable: false
                }
            }
        ]
    },

    // =============================================================================
    // CREATE POST
    // =============================================================================
    {
        operationId: "createPost",
        provider: "linkedin",
        validCases: [
            {
                name: "basic_text_post",
                description: "Create a simple text post",
                input: {
                    author: "urn:li:person:ABC123xyz",
                    content:
                        "Excited to announce that I've just accepted a new role as Senior Software Engineer at TechCorp! Looking forward to this next chapter in my career.",
                    visibility: "PUBLIC"
                },
                expectedOutput: {
                    postId: "urn:li:ugcPost:7161234567890123456",
                    author: "urn:li:person:ABC123xyz",
                    content:
                        "Excited to announce that I've just accepted a new role as Senior Software Engineer at TechCorp! Looking forward to this next chapter in my career.",
                    visibility: "PUBLIC"
                }
            }
        ],
        errorCases: [
            {
                name: "content_too_long",
                description: "Post content exceeds 3000 character limit",
                input: {
                    author: "urn:li:person:ABC123xyz",
                    content: "A".repeat(3001),
                    visibility: "PUBLIC"
                },
                expectedError: {
                    type: "validation",
                    message: "Post content exceeds maximum length of 3000 characters",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for post creation",
                input: {
                    author: "urn:li:person:ABC123xyz",
                    content: "Another post",
                    visibility: "PUBLIC"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            },
            {
                name: "unauthorized_author",
                description: "Not authorized to post as this author",
                input: {
                    author: "urn:li:organization:99999999",
                    content: "Unauthorized company post",
                    visibility: "PUBLIC"
                },
                expectedError: {
                    type: "permission",
                    message: "Not authorized to post as this author",
                    retryable: false
                }
            }
        ]
    },

    // =============================================================================
    // DELETE POST
    // =============================================================================
    {
        operationId: "deletePost",
        provider: "linkedin",
        validCases: [
            {
                name: "delete_ugc_post",
                description: "Delete a UGC post by URN",
                input: {
                    postId: "urn:li:ugcPost:7150892345678901234"
                },
                expectedOutput: {
                    deleted: true,
                    postId: "urn:li:ugcPost:7150892345678901234"
                }
            }
        ],
        errorCases: [
            {
                name: "post_not_found",
                description: "Attempting to delete a non-existent post",
                input: {
                    postId: "urn:li:ugcPost:9999999999999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Post not found",
                    retryable: false
                }
            },
            {
                name: "unauthorized_delete",
                description: "Not authorized to delete this post",
                input: {
                    postId: "urn:li:ugcPost:7888888888888888888"
                },
                expectedError: {
                    type: "permission",
                    message: "Not authorized to delete this post",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    postId: "urn:li:ugcPost:7150892345678901234"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // =============================================================================
    // GET COMMENTS
    // =============================================================================
    {
        operationId: "getComments",
        provider: "linkedin",
        validCases: [
            {
                name: "basic_get_comments",
                description: "Get comments on a post with default pagination",
                input: {
                    postId: "urn:li:ugcPost:7150892345678901234"
                },
                expectedOutput: {
                    comments: [
                        {
                            id: "urn:li:comment:(urn:li:ugcPost:7150892345678901234,7150111222333444555)",
                            actor: "urn:li:person:CommentUser1",
                            text: "Congratulations on this achievement! Well deserved.",
                            createdAt: "2024-01-15T09:30:00.000Z",
                            lastModifiedAt: "2024-01-15T09:30:00.000Z"
                        },
                        {
                            id: "urn:li:comment:(urn:li:ugcPost:7150892345678901234,7150222333444555666)",
                            actor: "urn:li:person:CommentUser2",
                            text: "Great insights! Would love to connect and discuss further.",
                            createdAt: "2024-01-15T10:15:00.000Z",
                            lastModifiedAt: "2024-01-15T10:15:00.000Z"
                        },
                        {
                            id: "urn:li:comment:(urn:li:ugcPost:7150892345678901234,7150333444555666777)",
                            actor: "urn:li:person:CommentUser3",
                            text: "This is exactly what I needed to read today. Thanks for sharing!",
                            createdAt: "2024-01-15T11:00:00.000Z",
                            lastModifiedAt: "2024-01-15T11:00:00.000Z"
                        }
                    ],
                    count: 3,
                    paging: {
                        count: 10,
                        start: 0,
                        links: [
                            {
                                rel: "next",
                                href: "/v2/socialActions/urn:li:ugcPost:7150892345678901234/comments?start=10&count=10"
                            }
                        ]
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "post_not_found",
                description: "Attempting to get comments on a non-existent post",
                input: {
                    postId: "urn:li:ugcPost:9999999999999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Post not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    postId: "urn:li:ugcPost:7150892345678901234"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // =============================================================================
    // GET ORGANIZATIONS
    // =============================================================================
    {
        operationId: "getOrganizations",
        provider: "linkedin",
        validCases: [
            {
                name: "multiple_organizations",
                description: "User is admin of multiple organizations",
                input: {},
                expectedOutput: {
                    organizations: [
                        {
                            organizationUrn: "urn:li:organization:12345678",
                            organizationId: 12345678,
                            role: "ADMINISTRATOR",
                            state: "APPROVED"
                        },
                        {
                            organizationUrn: "urn:li:organization:87654321",
                            organizationId: 87654321,
                            role: "DIRECT_SPONSORED_CONTENT_POSTER",
                            state: "APPROVED"
                        },
                        {
                            organizationUrn: "urn:li:organization:11223344",
                            organizationId: 11223344,
                            role: "ADMINISTRATOR",
                            state: "APPROVED"
                        }
                    ],
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "User does not have permission to list organizations",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Missing required permission: r_organization_admin",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // =============================================================================
    // GET POST
    // =============================================================================
    {
        operationId: "getPost",
        provider: "linkedin",
        validCases: [
            {
                name: "basic_text_post",
                description: "Get details of a basic text post",
                input: {
                    postId: "urn:li:ugcPost:7150892345678901234"
                },
                expectedOutput: {
                    id: "urn:li:ugcPost:7150892345678901234",
                    author: "urn:li:person:ABC123xyz",
                    content:
                        "Excited to announce that I've just accepted a new role as Senior Software Engineer! Looking forward to this next chapter.",
                    visibility: "PUBLIC",
                    lifecycleState: "PUBLISHED",
                    publishedAt: "2024-01-15T09:00:00.000Z",
                    lastModifiedAt: "2024-01-15T09:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "post_not_found",
                description: "Post does not exist",
                input: {
                    postId: "urn:li:ugcPost:9999999999999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Post not found",
                    retryable: false
                }
            },
            {
                name: "post_deleted",
                description: "Post has been deleted",
                input: {
                    postId: "urn:li:ugcPost:7777777777777777777"
                },
                expectedError: {
                    type: "not_found",
                    message: "Post not found or has been deleted",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    postId: "urn:li:ugcPost:7150892345678901234"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },

    // =============================================================================
    // GET PROFILE
    // =============================================================================
    {
        operationId: "getProfile",
        provider: "linkedin",
        validCases: [
            {
                name: "complete_profile",
                description: "Get profile with all fields populated",
                input: {},
                expectedOutput: {
                    personUrn: "urn:li:person:ABC123xyz",
                    userId: "ABC123xyz",
                    name: "Sarah Johnson",
                    firstName: "Sarah",
                    lastName: "Johnson",
                    email: "sarah.johnson@email.com",
                    emailVerified: true,
                    picture:
                        "https://media.licdn.com/dms/image/C5603AQHqNkL6y7B/profile-displayphoto-shrink_200_200/0/1678234567890?e=1699488000&v=beta&t=abc123",
                    locale: "en_US"
                }
            }
        ],
        errorCases: [
            {
                name: "token_expired",
                description: "OAuth token has expired",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Access token has expired",
                    retryable: false
                }
            },
            {
                name: "insufficient_permissions",
                description: "Missing required profile scope",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Missing required permission: profile",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    }
];
