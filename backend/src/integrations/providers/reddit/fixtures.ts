/**
 * Reddit Provider Test Fixtures
 *
 * Comprehensive test fixtures covering all Reddit operations with realistic data.
 */

import type { TestFixture } from "../../sandbox";

export const redditFixtures: TestFixture[] = [
    // ==================== GET ME ====================
    {
        operationId: "getMe",
        provider: "reddit",
        validCases: [
            {
                name: "basic_user",
                description: "Get information about a standard Reddit user",
                input: {},
                expectedOutput: {
                    id: "t2_abc123def",
                    username: "TechEnthusiast2024",
                    displayName: "u/TechEnthusiast2024",
                    linkKarma: 4521,
                    commentKarma: 12847,
                    totalKarma: 17368,
                    isGold: false,
                    isMod: false,
                    hasVerifiedEmail: true,
                    iconImg: "https://styles.redditmedia.com/t5_abc123/styles/profileIcon_snoo.png",
                    createdUtc: 1609459200
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_token",
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
                description: "Rate limit exceeded for API requests",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests.",
                    retryable: true
                }
            },
            {
                name: "server_unavailable",
                description: "Reddit API server is temporarily unavailable",
                input: {},
                expectedError: {
                    type: "server_error",
                    message: "Reddit API is temporarily unavailable",
                    retryable: true
                }
            }
        ]
    },

    // ==================== GET POST ====================
    {
        operationId: "getPost",
        provider: "reddit",
        validCases: [
            {
                name: "text_post_with_comments",
                description: "Get a text post with multiple comments from r/programming",
                input: {
                    subreddit: "programming",
                    postId: "1abc2de",
                    commentSort: "top",
                    commentLimit: 25,
                    commentDepth: 3
                },
                expectedOutput: {
                    post: {
                        id: "1abc2de",
                        fullname: "t3_1abc2de",
                        title: "Why TypeScript is becoming the standard for large-scale applications",
                        author: "DevOpsEngineer42",
                        subreddit: "programming",
                        score: 2847,
                        numComments: 342,
                        url: "https://reddit.com/r/programming/comments/1abc2de/why_typescript_is_becoming_the_standard_for/",
                        permalink:
                            "https://reddit.com/r/programming/comments/1abc2de/why_typescript_is_becoming_the_standard_for/",
                        isSelf: true,
                        selftext:
                            "After working on multiple enterprise projects over the past 5 years, I've noticed a significant shift towards TypeScript...",
                        selftextHtml:
                            '&lt;!-- SC_OFF --&gt;&lt;div class="md"&gt;&lt;p&gt;After working on multiple enterprise projects...&lt;/p&gt;&lt;/div&gt;',
                        createdUtc: 1706745600,
                        upvoteRatio: 0.94,
                        isNsfw: false,
                        isSpoiler: false,
                        isStickied: false,
                        isLocked: false,
                        isArchived: false,
                        flair: "Discussion"
                    },
                    comments: [
                        {
                            id: "kx7y8z9",
                            fullname: "t1_kx7y8z9",
                            body: "Great analysis! I've had similar experiences. The type safety alone has prevented countless bugs in production.",
                            author: "SeniorDeveloper",
                            score: 523,
                            createdUtc: 1706749200,
                            parentId: "t3_1abc2de",
                            depth: 0,
                            isSubmitter: false
                        },
                        {
                            id: "kx7yab1",
                            fullname: "t1_kx7yab1",
                            body: "Agreed, but the initial learning curve can be steep for teams new to typed languages.",
                            author: "JuniorDevAdvocate",
                            score: 187,
                            createdUtc: 1706752800,
                            parentId: "t1_kx7y8z9",
                            depth: 1,
                            isSubmitter: false
                        }
                    ],
                    commentCount: 2
                }
            }
        ],
        errorCases: [
            {
                name: "post_not_found",
                description: "Post ID does not exist",
                input: {
                    subreddit: "programming",
                    postId: "nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Post not found",
                    retryable: false
                }
            },
            {
                name: "subreddit_not_found",
                description: "Subreddit does not exist",
                input: {
                    subreddit: "thissubredditdoesnotexist12345",
                    postId: "abc123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Subreddit not found",
                    retryable: false
                }
            },
            {
                name: "private_subreddit",
                description: "Subreddit is private and user is not approved",
                input: {
                    subreddit: "privateclub",
                    postId: "xyz789"
                },
                expectedError: {
                    type: "permission",
                    message: "This subreddit is private. You must be an approved user to view it.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    subreddit: "AskReddit",
                    postId: "abc123"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== GET POSTS ====================
    {
        operationId: "getPosts",
        provider: "reddit",
        validCases: [
            {
                name: "hot_posts_default",
                description: "Get hot posts from r/programming with default settings",
                input: {
                    subreddit: "programming"
                },
                expectedOutput: {
                    posts: [
                        {
                            id: "abc123",
                            fullname: "t3_abc123",
                            title: "Rust 2.0 Released: What developers need to know",
                            author: "rust_evangelist",
                            subreddit: "programming",
                            score: 5432,
                            numComments: 892,
                            url: "https://blog.rust-lang.org/2024/rust-2-release",
                            permalink:
                                "https://reddit.com/r/programming/comments/abc123/rust_20_released/",
                            isSelf: false,
                            thumbnail: "https://b.thumbs.redditmedia.com/rust_thumbnail.jpg",
                            createdUtc: 1706745600,
                            upvoteRatio: 0.96,
                            isNsfw: false,
                            isSpoiler: false,
                            isStickied: false,
                            flair: "Release"
                        },
                        {
                            id: "def456",
                            fullname: "t3_def456",
                            title: "I built a full-stack app in a weekend using AI coding assistants - here's what I learned",
                            author: "weekend_coder",
                            subreddit: "programming",
                            score: 3210,
                            numComments: 567,
                            url: "https://reddit.com/r/programming/comments/def456/i_built_a_fullstack_app/",
                            permalink:
                                "https://reddit.com/r/programming/comments/def456/i_built_a_fullstack_app/",
                            isSelf: true,
                            selftext:
                                "This past weekend I challenged myself to build a complete SaaS product...",
                            thumbnail: "self",
                            createdUtc: 1706742000,
                            upvoteRatio: 0.91,
                            isNsfw: false,
                            isSpoiler: false,
                            isStickied: false,
                            flair: "Project"
                        }
                    ],
                    after: "t3_def456",
                    before: null,
                    count: 2
                }
            }
        ],
        errorCases: [
            {
                name: "subreddit_not_found",
                description: "Subreddit does not exist",
                input: {
                    subreddit: "thisdoesnotexist999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Subreddit not found",
                    retryable: false
                }
            },
            {
                name: "subreddit_banned",
                description: "Subreddit has been banned",
                input: {
                    subreddit: "bannedsubreddit"
                },
                expectedError: {
                    type: "permission",
                    message: "This subreddit has been banned",
                    retryable: false
                }
            },
            {
                name: "invalid_subreddit_name",
                description: "Subreddit name contains invalid characters",
                input: {
                    subreddit: "invalid-name!"
                },
                expectedError: {
                    type: "validation",
                    message: "Subreddit name can only contain letters, numbers, and underscores",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    subreddit: "popular"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== SAVE ====================
    {
        operationId: "save",
        provider: "reddit",
        validCases: [
            {
                name: "save_post",
                description: "Save a post to saved list",
                input: {
                    fullname: "t3_abc123xyz"
                },
                expectedOutput: {
                    fullname: "t3_abc123xyz",
                    message: "Successfully saved t3_abc123xyz"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_fullname_format",
                description: "Fullname has invalid format",
                input: {
                    fullname: "invalid_format"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid Reddit fullname format",
                    retryable: false
                }
            },
            {
                name: "thing_not_found",
                description: "Post or comment does not exist",
                input: {
                    fullname: "t3_nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "The specified post or comment was not found",
                    retryable: false
                }
            },
            {
                name: "category_not_found",
                description: "Specified category does not exist (non-Gold users)",
                input: {
                    fullname: "t3_abc123",
                    category: "nonexistent_category"
                },
                expectedError: {
                    type: "validation",
                    message: "Save categories require Reddit Premium",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    fullname: "t3_abc123"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== UNSAVE ====================
    {
        operationId: "unsave",
        provider: "reddit",
        validCases: [
            {
                name: "unsave_post",
                description: "Remove a post from saved list",
                input: {
                    fullname: "t3_savedpost123"
                },
                expectedOutput: {
                    fullname: "t3_savedpost123",
                    message: "Successfully unsaved t3_savedpost123"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_fullname_format",
                description: "Fullname has invalid format",
                input: {
                    fullname: "bad_format_here"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid Reddit fullname format",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    fullname: "t3_abc123"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== SUBMIT COMMENT ====================
    {
        operationId: "submitComment",
        provider: "reddit",
        validCases: [
            {
                name: "comment_on_post",
                description: "Submit a comment on a post",
                input: {
                    parentFullname: "t3_abc123xyz",
                    text: "This is a really insightful post! I especially liked the part about TypeScript generics. Have you considered writing a follow-up about advanced type patterns?"
                },
                expectedOutput: {
                    commentId: "newcom123",
                    fullname: "t1_newcom123",
                    body: "This is a really insightful post! I especially liked the part about TypeScript generics. Have you considered writing a follow-up about advanced type patterns?",
                    author: "TechEnthusiast2024",
                    parentId: "t3_abc123xyz",
                    createdUtc: 1706923800
                }
            }
        ],
        errorCases: [
            {
                name: "post_not_found",
                description: "Parent post does not exist",
                input: {
                    parentFullname: "t3_nonexistent",
                    text: "This is my comment"
                },
                expectedError: {
                    type: "not_found",
                    message: "The post or comment you are replying to was not found",
                    retryable: false
                }
            },
            {
                name: "thread_locked",
                description: "Thread is locked and not accepting new comments",
                input: {
                    parentFullname: "t3_lockedpost",
                    text: "I want to add something"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Reddit API error: THREAD_LOCKED: This post is locked and not accepting new comments",
                    retryable: false
                }
            },
            {
                name: "thread_archived",
                description: "Thread is archived and not accepting new comments",
                input: {
                    parentFullname: "t3_archivedpost",
                    text: "Commenting on old post"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Reddit API error: TOO_OLD: This post is archived and cannot receive new comments",
                    retryable: false
                }
            },
            {
                name: "comment_too_long",
                description: "Comment exceeds maximum length",
                input: {
                    parentFullname: "t3_abc123",
                    text: "x".repeat(10001)
                },
                expectedError: {
                    type: "validation",
                    message: "Comment text (max 10000 characters)",
                    retryable: false
                }
            },
            {
                name: "banned_from_subreddit",
                description: "User is banned from the subreddit",
                input: {
                    parentFullname: "t3_bannedsub_post",
                    text: "My comment"
                },
                expectedError: {
                    type: "permission",
                    message: "You are banned from this subreddit",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "User is posting too frequently",
                input: {
                    parentFullname: "t3_abc123",
                    text: "Another comment"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "You are doing that too much. Try again in 8 minutes.",
                    retryable: true
                }
            }
        ]
    },

    // ==================== SUBMIT TEXT POST ====================
    {
        operationId: "submitTextPost",
        provider: "reddit",
        validCases: [
            {
                name: "basic_text_post",
                description: "Submit a basic text post to a subreddit",
                input: {
                    subreddit: "learnprogramming",
                    title: "Best resources for learning Rust in 2024?",
                    text: "I'm a Python developer looking to learn Rust for systems programming. What resources would you recommend? I've heard good things about \"The Rust Book\" but wondering if there are other great options.\n\nMy goals:\n- Understand memory management\n- Build CLI tools\n- Eventually contribute to open source Rust projects"
                },
                expectedOutput: {
                    postId: "newtextpost1",
                    fullname: "t3_newtextpost1",
                    url: "https://reddit.com/r/learnprogramming/comments/newtextpost1/best_resources_for_learning_rust_in_2024/",
                    permalink:
                        "https://reddit.com/r/learnprogramming/comments/newtextpost1/best_resources_for_learning_rust_in_2024/"
                }
            }
        ],
        errorCases: [
            {
                name: "subreddit_not_found",
                description: "Subreddit does not exist",
                input: {
                    subreddit: "nonexistentsubreddit12345",
                    title: "Test post",
                    text: "Test content"
                },
                expectedError: {
                    type: "not_found",
                    message: "Subreddit not found",
                    retryable: false
                }
            },
            {
                name: "title_too_long",
                description: "Post title exceeds 300 characters",
                input: {
                    subreddit: "test",
                    title: "x".repeat(301),
                    text: "Content"
                },
                expectedError: {
                    type: "validation",
                    message: "Post title (max 300 characters)",
                    retryable: false
                }
            },
            {
                name: "content_too_long",
                description: "Post text exceeds maximum length",
                input: {
                    subreddit: "test",
                    title: "Test title",
                    text: "x".repeat(40001)
                },
                expectedError: {
                    type: "validation",
                    message: "Post or comment text content",
                    retryable: false
                }
            },
            {
                name: "banned_from_subreddit",
                description: "User is banned from posting in this subreddit",
                input: {
                    subreddit: "strictmoderation",
                    title: "Test post",
                    text: "Content"
                },
                expectedError: {
                    type: "permission",
                    message:
                        "Reddit API error: USER_BANNED: You are banned from posting in this subreddit",
                    retryable: false
                }
            },
            {
                name: "subreddit_restricted",
                description: "Subreddit only allows approved submitters",
                input: {
                    subreddit: "restrictedcommunity",
                    title: "Test post",
                    text: "Content"
                },
                expectedError: {
                    type: "permission",
                    message:
                        "Reddit API error: SUBREDDIT_RESTRICTED: This subreddit only allows approved users to post",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "User is posting too frequently",
                input: {
                    subreddit: "popular",
                    title: "My post",
                    text: "Content"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "You are doing that too much. Try again in 5 minutes.",
                    retryable: true
                }
            },
            {
                name: "low_karma_restriction",
                description: "Subreddit requires minimum karma to post",
                input: {
                    subreddit: "highkarmacommunity",
                    title: "My first post",
                    text: "Hello everyone"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Reddit API error: KARMA_TOO_LOW: Your account does not have enough karma to post here",
                    retryable: false
                }
            }
        ]
    },

    // ==================== SUBMIT LINK POST ====================
    {
        operationId: "submitLinkPost",
        provider: "reddit",
        validCases: [
            {
                name: "basic_link_post",
                description: "Submit a basic link post",
                input: {
                    subreddit: "programming",
                    title: "Comprehensive Guide to Modern CSS Layouts (2024)",
                    url: "https://css-tricks.com/modern-css-layouts-2024"
                },
                expectedOutput: {
                    postId: "linkpost1",
                    fullname: "t3_linkpost1",
                    url: "https://reddit.com/r/programming/comments/linkpost1/comprehensive_guide_to_modern_css/",
                    permalink:
                        "https://reddit.com/r/programming/comments/linkpost1/comprehensive_guide_to_modern_css/"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_url",
                description: "URL is not valid",
                input: {
                    subreddit: "programming",
                    title: "Test link",
                    url: "not-a-valid-url"
                },
                expectedError: {
                    type: "validation",
                    message: "URL for link post",
                    retryable: false
                }
            },
            {
                name: "link_already_submitted",
                description: "Link has already been submitted to this subreddit",
                input: {
                    subreddit: "technology",
                    title: "Article about AI",
                    url: "https://example.com/already-posted-article"
                },
                expectedError: {
                    type: "validation",
                    message: "Reddit API error: ALREADY_SUB: That link has already been submitted",
                    retryable: false
                }
            },
            {
                name: "domain_blocked",
                description: "Domain is blocked in this subreddit",
                input: {
                    subreddit: "technology",
                    title: "Interesting article",
                    url: "https://blocked-domain.com/article"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Reddit API error: DOMAIN_BLOCKED: Links from this domain are not allowed",
                    retryable: false
                }
            },
            {
                name: "subreddit_text_only",
                description: "Subreddit only allows text posts",
                input: {
                    subreddit: "writingprompts",
                    title: "Check out this writing resource",
                    url: "https://example.com/writing-tips"
                },
                expectedError: {
                    type: "validation",
                    message: "Reddit API error: NO_LINKS: This community only allows text posts",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "User is posting too frequently",
                input: {
                    subreddit: "popular",
                    title: "Cool link",
                    url: "https://example.com"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "You are doing that too much. Try again in 10 minutes.",
                    retryable: true
                }
            }
        ]
    },

    // ==================== VOTE ====================
    {
        operationId: "vote",
        provider: "reddit",
        validCases: [
            {
                name: "upvote_post",
                description: "Upvote a post",
                input: {
                    fullname: "t3_greatpost123",
                    direction: "up"
                },
                expectedOutput: {
                    fullname: "t3_greatpost123",
                    direction: "up",
                    message: "Successfully upvoted t3_greatpost123"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_fullname_format",
                description: "Fullname has invalid format",
                input: {
                    fullname: "invalid123",
                    direction: "up"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid Reddit fullname format",
                    retryable: false
                }
            },
            {
                name: "thing_not_found",
                description: "Post or comment does not exist",
                input: {
                    fullname: "t3_deletedpost",
                    direction: "up"
                },
                expectedError: {
                    type: "not_found",
                    message: "The specified post or comment was not found",
                    retryable: false
                }
            },
            {
                name: "archived_content",
                description: "Cannot vote on archived content",
                input: {
                    fullname: "t3_archivedpost",
                    direction: "up"
                },
                expectedError: {
                    type: "validation",
                    message: "This post has been archived and cannot receive votes",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Voting too frequently",
                input: {
                    fullname: "t3_somepost",
                    direction: "up"
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
