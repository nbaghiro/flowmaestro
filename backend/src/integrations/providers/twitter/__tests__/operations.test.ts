/**
 * Twitter Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeDeleteTweet, deleteTweetSchema } from "../operations/deleteTweet";
import { executeGetUser, getUserSchema } from "../operations/getUser";
import { executeGetUserTimeline, getUserTimelineSchema } from "../operations/getUserTimeline";
import { executePostTweet, postTweetSchema } from "../operations/postTweet";
import { executeReplyToTweet, replyToTweetSchema } from "../operations/replyToTweet";
import { executeSearchTweets, searchTweetsSchema } from "../operations/searchTweets";
import type { TwitterClient } from "../client/TwitterClient";
import type {
    CreateTweetResponse,
    DeleteTweetResponse,
    TweetsResponse,
    XAPIResponse,
    XUser
} from "../operations/types";

// Mock TwitterClient factory
function createMockTwitterClient(): jest.Mocked<TwitterClient> {
    return {
        postTweet: jest.fn(),
        deleteTweet: jest.fn(),
        getMe: jest.fn(),
        getUserByUsername: jest.fn(),
        getUserTweets: jest.fn(),
        searchRecentTweets: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<TwitterClient>;
}

describe("Twitter Operation Executors", () => {
    let mockClient: jest.Mocked<TwitterClient>;

    beforeEach(() => {
        mockClient = createMockTwitterClient();
    });

    describe("executePostTweet", () => {
        it("calls client with correct params for simple tweet", async () => {
            const response: CreateTweetResponse = {
                data: {
                    id: "1234567890123456789",
                    text: "Hello, World!"
                }
            };
            mockClient.postTweet.mockResolvedValueOnce(response);

            await executePostTweet(mockClient, {
                text: "Hello, World!"
            });

            expect(mockClient.postTweet).toHaveBeenCalledWith({
                text: "Hello, World!"
            });
        });

        it("returns normalized output on success", async () => {
            const response: CreateTweetResponse = {
                data: {
                    id: "1234567890123456789",
                    text: "Hello, World!"
                }
            };
            mockClient.postTweet.mockResolvedValueOnce(response);

            const result = await executePostTweet(mockClient, {
                text: "Hello, World!"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                tweetId: "1234567890123456789",
                text: "Hello, World!"
            });
        });

        it("calls client with reply params when reply_to_tweet_id provided", async () => {
            const response: CreateTweetResponse = {
                data: {
                    id: "1234567890123456790",
                    text: "@user Hello back!"
                }
            };
            mockClient.postTweet.mockResolvedValueOnce(response);

            await executePostTweet(mockClient, {
                text: "@user Hello back!",
                reply_to_tweet_id: "1234567890123456789"
            });

            expect(mockClient.postTweet).toHaveBeenCalledWith({
                text: "@user Hello back!",
                reply: { in_reply_to_tweet_id: "1234567890123456789" }
            });
        });

        it("calls client with quote params when quote_tweet_id provided", async () => {
            const response: CreateTweetResponse = {
                data: {
                    id: "1234567890123456791",
                    text: "Check this out!"
                }
            };
            mockClient.postTweet.mockResolvedValueOnce(response);

            await executePostTweet(mockClient, {
                text: "Check this out!",
                quote_tweet_id: "1234567890123456789"
            });

            expect(mockClient.postTweet).toHaveBeenCalledWith({
                text: "Check this out!",
                quote_tweet_id: "1234567890123456789"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.postTweet.mockRejectedValueOnce(
                new Error("Duplicate tweet. You cannot post the same content twice.")
            );

            const result = await executePostTweet(mockClient, {
                text: "Hello, World!"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Duplicate tweet. You cannot post the same content twice."
            );
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.postTweet.mockRejectedValueOnce("string error");

            const result = await executePostTweet(mockClient, {
                text: "Hello, World!"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to post tweet");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeDeleteTweet", () => {
        it("calls client with correct params", async () => {
            const response: DeleteTweetResponse = {
                data: {
                    deleted: true
                }
            };
            mockClient.deleteTweet.mockResolvedValueOnce(response);

            await executeDeleteTweet(mockClient, {
                tweet_id: "1234567890123456789"
            });

            expect(mockClient.deleteTweet).toHaveBeenCalledWith("1234567890123456789");
        });

        it("returns normalized output on success", async () => {
            const response: DeleteTweetResponse = {
                data: {
                    deleted: true
                }
            };
            mockClient.deleteTweet.mockResolvedValueOnce(response);

            const result = await executeDeleteTweet(mockClient, {
                tweet_id: "1234567890123456789"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                tweetId: "1234567890123456789"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.deleteTweet.mockRejectedValueOnce(new Error("Resource not found."));

            const result = await executeDeleteTweet(mockClient, {
                tweet_id: "1234567890123456789"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found.");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.deleteTweet.mockRejectedValueOnce({ some: "object" });

            const result = await executeDeleteTweet(mockClient, {
                tweet_id: "1234567890123456789"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to delete tweet");
        });
    });

    describe("executeGetUser", () => {
        const mockUser: XUser = {
            id: "123456789",
            name: "Test User",
            username: "testuser",
            description: "A test user account",
            profile_image_url: "https://pbs.twimg.com/profile_images/123/avatar.jpg",
            created_at: "2020-01-01T00:00:00.000Z",
            verified: true,
            protected: false,
            public_metrics: {
                followers_count: 1000,
                following_count: 500,
                tweet_count: 250,
                listed_count: 10
            }
        };

        it("calls getMe when no username provided", async () => {
            const response: XAPIResponse<XUser> = { data: mockUser };
            mockClient.getMe.mockResolvedValueOnce(response);

            await executeGetUser(mockClient, {});

            expect(mockClient.getMe).toHaveBeenCalledWith([
                "id",
                "name",
                "username",
                "description",
                "profile_image_url",
                "created_at",
                "public_metrics",
                "verified",
                "protected"
            ]);
            expect(mockClient.getUserByUsername).not.toHaveBeenCalled();
        });

        it("calls getUserByUsername when username provided", async () => {
            const response: XAPIResponse<XUser> = { data: mockUser };
            mockClient.getUserByUsername.mockResolvedValueOnce(response);

            await executeGetUser(mockClient, { username: "testuser" });

            expect(mockClient.getUserByUsername).toHaveBeenCalledWith("testuser", [
                "id",
                "name",
                "username",
                "description",
                "profile_image_url",
                "created_at",
                "public_metrics",
                "verified",
                "protected"
            ]);
            expect(mockClient.getMe).not.toHaveBeenCalled();
        });

        it("returns normalized output on success", async () => {
            const response: XAPIResponse<XUser> = { data: mockUser };
            mockClient.getMe.mockResolvedValueOnce(response);

            const result = await executeGetUser(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "123456789",
                name: "Test User",
                username: "testuser",
                description: "A test user account",
                profileImageUrl: "https://pbs.twimg.com/profile_images/123/avatar.jpg",
                createdAt: "2020-01-01T00:00:00.000Z",
                isVerified: true,
                isProtected: false,
                metrics: {
                    followers_count: 1000,
                    following_count: 500,
                    tweet_count: 250,
                    listed_count: 10
                }
            });
        });

        it("returns not_found error when user not found", async () => {
            const response: XAPIResponse<XUser> = { data: undefined };
            mockClient.getUserByUsername.mockResolvedValueOnce(response);

            const result = await executeGetUser(mockClient, { username: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toBe("User @nonexistent not found");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error when authenticated user not found", async () => {
            const response: XAPIResponse<XUser> = { data: undefined };
            mockClient.getMe.mockResolvedValueOnce(response);

            const result = await executeGetUser(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Unable to get authenticated user");
        });

        it("returns error on client failure", async () => {
            mockClient.getMe.mockRejectedValueOnce(
                new Error("X authentication failed. Please reconnect your account.")
            );

            const result = await executeGetUser(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "X authentication failed. Please reconnect your account."
            );
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetUserTimeline", () => {
        const mockTweetsResponse: TweetsResponse = {
            data: [
                {
                    id: "1234567890123456789",
                    text: "First tweet",
                    author_id: "123456789",
                    created_at: "2024-01-15T10:00:00.000Z",
                    conversation_id: "1234567890123456789",
                    public_metrics: {
                        retweet_count: 10,
                        reply_count: 5,
                        like_count: 100,
                        quote_count: 2
                    }
                },
                {
                    id: "1234567890123456790",
                    text: "Second tweet",
                    author_id: "123456789",
                    created_at: "2024-01-14T10:00:00.000Z",
                    conversation_id: "1234567890123456790",
                    public_metrics: {
                        retweet_count: 5,
                        reply_count: 2,
                        like_count: 50,
                        quote_count: 1
                    }
                }
            ],
            meta: {
                result_count: 2,
                next_token: "abc123",
                newest_id: "1234567890123456789",
                oldest_id: "1234567890123456790"
            }
        };

        it("calls getMe when no user_id provided", async () => {
            const meResponse: XAPIResponse<XUser> = {
                data: { id: "123456789", name: "Test", username: "test" }
            };
            mockClient.getMe.mockResolvedValueOnce(meResponse);
            mockClient.getUserTweets.mockResolvedValueOnce(mockTweetsResponse);

            await executeGetUserTimeline(mockClient, {});

            expect(mockClient.getMe).toHaveBeenCalledWith(["id"]);
            expect(mockClient.getUserTweets).toHaveBeenCalledWith("123456789", {
                max_results: 10,
                pagination_token: undefined,
                "tweet.fields": "id,text,author_id,created_at,public_metrics,conversation_id"
            });
        });

        it("calls getUserTweets directly when user_id provided", async () => {
            mockClient.getUserTweets.mockResolvedValueOnce(mockTweetsResponse);

            await executeGetUserTimeline(mockClient, { user_id: "987654321" });

            expect(mockClient.getMe).not.toHaveBeenCalled();
            expect(mockClient.getUserTweets).toHaveBeenCalledWith("987654321", {
                max_results: 10,
                pagination_token: undefined,
                "tweet.fields": "id,text,author_id,created_at,public_metrics,conversation_id"
            });
        });

        it("passes max_results and pagination_token", async () => {
            mockClient.getUserTweets.mockResolvedValueOnce(mockTweetsResponse);

            await executeGetUserTimeline(mockClient, {
                user_id: "123456789",
                max_results: 50,
                pagination_token: "token123"
            });

            expect(mockClient.getUserTweets).toHaveBeenCalledWith("123456789", {
                max_results: 50,
                pagination_token: "token123",
                "tweet.fields": "id,text,author_id,created_at,public_metrics,conversation_id"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.getUserTweets.mockResolvedValueOnce(mockTweetsResponse);

            const result = await executeGetUserTimeline(mockClient, { user_id: "123456789" });

            expect(result.success).toBe(true);
            expect(result.data?.tweets).toHaveLength(2);
            expect(result.data?.tweets[0]).toEqual({
                id: "1234567890123456789",
                text: "First tweet",
                authorId: "123456789",
                createdAt: "2024-01-15T10:00:00.000Z",
                conversationId: "1234567890123456789",
                metrics: {
                    retweet_count: 10,
                    reply_count: 5,
                    like_count: 100,
                    quote_count: 2
                }
            });
            expect(result.data?.meta).toEqual({
                resultCount: 2,
                nextToken: "abc123",
                newestId: "1234567890123456789",
                oldestId: "1234567890123456790"
            });
        });

        it("handles empty timeline", async () => {
            const emptyResponse: TweetsResponse = {
                data: [],
                meta: { result_count: 0 }
            };
            mockClient.getUserTweets.mockResolvedValueOnce(emptyResponse);

            const result = await executeGetUserTimeline(mockClient, { user_id: "123456789" });

            expect(result.success).toBe(true);
            expect(result.data?.tweets).toHaveLength(0);
            expect(result.data?.meta.resultCount).toBe(0);
        });

        it("handles missing data array", async () => {
            const responseWithoutData: TweetsResponse = {
                meta: { result_count: 0 }
            };
            mockClient.getUserTweets.mockResolvedValueOnce(responseWithoutData);

            const result = await executeGetUserTimeline(mockClient, { user_id: "123456789" });

            expect(result.success).toBe(true);
            expect(result.data?.tweets).toHaveLength(0);
        });

        it("returns error when authenticated user ID cannot be fetched", async () => {
            const emptyMeResponse: XAPIResponse<XUser> = { data: undefined };
            mockClient.getMe.mockResolvedValueOnce(emptyMeResponse);

            const result = await executeGetUserTimeline(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Unable to get authenticated user ID");
            expect(result.error?.retryable).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.getUserTweets.mockRejectedValueOnce(new Error("Rate limited"));

            const result = await executeGetUserTimeline(mockClient, { user_id: "123456789" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Rate limited");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeSearchTweets", () => {
        const mockSearchResponse: TweetsResponse = {
            data: [
                {
                    id: "1234567890123456789",
                    text: "Tweet about #TypeScript",
                    author_id: "111111111",
                    created_at: "2024-01-15T10:00:00.000Z",
                    conversation_id: "1234567890123456789",
                    public_metrics: {
                        retweet_count: 50,
                        reply_count: 20,
                        like_count: 200,
                        quote_count: 10
                    }
                }
            ],
            meta: {
                result_count: 1,
                next_token: "nextpage123",
                newest_id: "1234567890123456789",
                oldest_id: "1234567890123456789"
            }
        };

        it("calls client with correct params", async () => {
            mockClient.searchRecentTweets.mockResolvedValueOnce(mockSearchResponse);

            await executeSearchTweets(mockClient, {
                query: "#TypeScript"
            });

            expect(mockClient.searchRecentTweets).toHaveBeenCalledWith({
                query: "#TypeScript",
                max_results: 10,
                next_token: undefined,
                "tweet.fields": "id,text,author_id,created_at,public_metrics,conversation_id"
            });
        });

        it("calls client with custom max_results", async () => {
            mockClient.searchRecentTweets.mockResolvedValueOnce(mockSearchResponse);

            await executeSearchTweets(mockClient, {
                query: "from:elonmusk",
                max_results: 50
            });

            expect(mockClient.searchRecentTweets).toHaveBeenCalledWith({
                query: "from:elonmusk",
                max_results: 50,
                next_token: undefined,
                "tweet.fields": "id,text,author_id,created_at,public_metrics,conversation_id"
            });
        });

        it("calls client with pagination token", async () => {
            mockClient.searchRecentTweets.mockResolvedValueOnce(mockSearchResponse);

            await executeSearchTweets(mockClient, {
                query: "AI",
                next_token: "nextpage123"
            });

            expect(mockClient.searchRecentTweets).toHaveBeenCalledWith({
                query: "AI",
                max_results: 10,
                next_token: "nextpage123",
                "tweet.fields": "id,text,author_id,created_at,public_metrics,conversation_id"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.searchRecentTweets.mockResolvedValueOnce(mockSearchResponse);

            const result = await executeSearchTweets(mockClient, {
                query: "#TypeScript"
            });

            expect(result.success).toBe(true);
            expect(result.data?.tweets).toHaveLength(1);
            expect(result.data?.tweets[0]).toEqual({
                id: "1234567890123456789",
                text: "Tweet about #TypeScript",
                authorId: "111111111",
                createdAt: "2024-01-15T10:00:00.000Z",
                conversationId: "1234567890123456789",
                metrics: {
                    retweet_count: 50,
                    reply_count: 20,
                    like_count: 200,
                    quote_count: 10
                }
            });
            expect(result.data?.meta).toEqual({
                resultCount: 1,
                nextToken: "nextpage123",
                newestId: "1234567890123456789",
                oldestId: "1234567890123456789"
            });
        });

        it("handles empty search results", async () => {
            const emptyResponse: TweetsResponse = {
                data: [],
                meta: { result_count: 0 }
            };
            mockClient.searchRecentTweets.mockResolvedValueOnce(emptyResponse);

            const result = await executeSearchTweets(mockClient, {
                query: "nonexistent query xyz123"
            });

            expect(result.success).toBe(true);
            expect(result.data?.tweets).toHaveLength(0);
            expect(result.data?.meta.resultCount).toBe(0);
        });

        it("handles missing data in response", async () => {
            const responseWithoutData: TweetsResponse = {
                meta: { result_count: 0 }
            };
            mockClient.searchRecentTweets.mockResolvedValueOnce(responseWithoutData);

            const result = await executeSearchTweets(mockClient, { query: "test" });

            expect(result.success).toBe(true);
            expect(result.data?.tweets).toHaveLength(0);
        });

        it("returns error on client failure", async () => {
            mockClient.searchRecentTweets.mockRejectedValueOnce(
                new Error("Access forbidden. Check that your app has the required permissions.")
            );

            const result = await executeSearchTweets(mockClient, { query: "test" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Access forbidden. Check that your app has the required permissions."
            );
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.searchRecentTweets.mockRejectedValueOnce(null);

            const result = await executeSearchTweets(mockClient, { query: "test" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to search tweets");
        });
    });

    describe("executeReplyToTweet", () => {
        it("calls client with correct params", async () => {
            const response: CreateTweetResponse = {
                data: {
                    id: "1234567890123456790",
                    text: "@user Great point!"
                }
            };
            mockClient.postTweet.mockResolvedValueOnce(response);

            await executeReplyToTweet(mockClient, {
                tweet_id: "1234567890123456789",
                text: "@user Great point!"
            });

            expect(mockClient.postTweet).toHaveBeenCalledWith({
                text: "@user Great point!",
                reply: { in_reply_to_tweet_id: "1234567890123456789" }
            });
        });

        it("returns normalized output on success", async () => {
            const response: CreateTweetResponse = {
                data: {
                    id: "1234567890123456790",
                    text: "@user Great point!"
                }
            };
            mockClient.postTweet.mockResolvedValueOnce(response);

            const result = await executeReplyToTweet(mockClient, {
                tweet_id: "1234567890123456789",
                text: "@user Great point!"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                replyId: "1234567890123456790",
                text: "@user Great point!",
                inReplyToTweetId: "1234567890123456789"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.postTweet.mockRejectedValueOnce(new Error("Resource not found."));

            const result = await executeReplyToTweet(mockClient, {
                tweet_id: "9999999999999999999",
                text: "Reply to nonexistent tweet"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found.");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.postTweet.mockRejectedValueOnce(undefined);

            const result = await executeReplyToTweet(mockClient, {
                tweet_id: "1234567890123456789",
                text: "Reply"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to reply to tweet");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("schema validation", () => {
        describe("postTweetSchema", () => {
            it("validates minimal input", () => {
                const result = postTweetSchema.safeParse({
                    text: "Hello, World!"
                });
                expect(result.success).toBe(true);
            });

            it("validates with reply_to_tweet_id", () => {
                const result = postTweetSchema.safeParse({
                    text: "Reply text",
                    reply_to_tweet_id: "1234567890123456789"
                });
                expect(result.success).toBe(true);
            });

            it("validates with quote_tweet_id", () => {
                const result = postTweetSchema.safeParse({
                    text: "Quote text",
                    quote_tweet_id: "1234567890123456789"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty text", () => {
                const result = postTweetSchema.safeParse({
                    text: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects text over 280 characters", () => {
                const result = postTweetSchema.safeParse({
                    text: "a".repeat(281)
                });
                expect(result.success).toBe(false);
            });

            it("rejects non-numeric tweet IDs", () => {
                const result = postTweetSchema.safeParse({
                    text: "Hello",
                    reply_to_tweet_id: "not-a-number"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("deleteTweetSchema", () => {
            it("validates valid tweet_id", () => {
                const result = deleteTweetSchema.safeParse({
                    tweet_id: "1234567890123456789"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing tweet_id", () => {
                const result = deleteTweetSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects non-numeric tweet_id", () => {
                const result = deleteTweetSchema.safeParse({
                    tweet_id: "abc123"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getUserSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = getUserSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with valid username", () => {
                const result = getUserSchema.safeParse({
                    username: "testuser"
                });
                expect(result.success).toBe(true);
            });

            it("validates username with underscores", () => {
                const result = getUserSchema.safeParse({
                    username: "test_user_123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects username with @ symbol", () => {
                const result = getUserSchema.safeParse({
                    username: "@testuser"
                });
                expect(result.success).toBe(false);
            });

            it("rejects username over 15 characters", () => {
                const result = getUserSchema.safeParse({
                    username: "thisusernameistoolong"
                });
                expect(result.success).toBe(false);
            });

            it("rejects username with special characters", () => {
                const result = getUserSchema.safeParse({
                    username: "test-user"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getUserTimelineSchema", () => {
            it("validates empty input (uses defaults)", () => {
                const result = getUserTimelineSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with user_id", () => {
                const result = getUserTimelineSchema.safeParse({
                    user_id: "123456789"
                });
                expect(result.success).toBe(true);
            });

            it("validates with max_results", () => {
                const result = getUserTimelineSchema.safeParse({
                    max_results: 50
                });
                expect(result.success).toBe(true);
            });

            it("validates with pagination_token", () => {
                const result = getUserTimelineSchema.safeParse({
                    pagination_token: "abc123xyz"
                });
                expect(result.success).toBe(true);
            });

            it("rejects max_results below 5", () => {
                const result = getUserTimelineSchema.safeParse({
                    max_results: 3
                });
                expect(result.success).toBe(false);
            });

            it("rejects max_results above 100", () => {
                const result = getUserTimelineSchema.safeParse({
                    max_results: 150
                });
                expect(result.success).toBe(false);
            });

            it("rejects non-numeric user_id", () => {
                const result = getUserTimelineSchema.safeParse({
                    user_id: "not-a-number"
                });
                expect(result.success).toBe(false);
            });

            it("applies default max_results of 10", () => {
                const result = getUserTimelineSchema.parse({});
                expect(result.max_results).toBe(10);
            });
        });

        describe("searchTweetsSchema", () => {
            it("validates minimal input", () => {
                const result = searchTweetsSchema.safeParse({
                    query: "#TypeScript"
                });
                expect(result.success).toBe(true);
            });

            it("validates with all options", () => {
                const result = searchTweetsSchema.safeParse({
                    query: "from:user lang:en",
                    max_results: 50,
                    next_token: "token123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty query", () => {
                const result = searchTweetsSchema.safeParse({
                    query: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects query over 512 characters", () => {
                const result = searchTweetsSchema.safeParse({
                    query: "a".repeat(513)
                });
                expect(result.success).toBe(false);
            });

            it("rejects max_results below 5", () => {
                const result = searchTweetsSchema.safeParse({
                    query: "test",
                    max_results: 2
                });
                expect(result.success).toBe(false);
            });

            it("rejects max_results above 100", () => {
                const result = searchTweetsSchema.safeParse({
                    query: "test",
                    max_results: 200
                });
                expect(result.success).toBe(false);
            });

            it("applies default max_results of 10", () => {
                const result = searchTweetsSchema.parse({
                    query: "test"
                });
                expect(result.max_results).toBe(10);
            });
        });

        describe("replyToTweetSchema", () => {
            it("validates valid input", () => {
                const result = replyToTweetSchema.safeParse({
                    tweet_id: "1234567890123456789",
                    text: "This is a reply"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing tweet_id", () => {
                const result = replyToTweetSchema.safeParse({
                    text: "This is a reply"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing text", () => {
                const result = replyToTweetSchema.safeParse({
                    tweet_id: "1234567890123456789"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty text", () => {
                const result = replyToTweetSchema.safeParse({
                    tweet_id: "1234567890123456789",
                    text: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects text over 280 characters", () => {
                const result = replyToTweetSchema.safeParse({
                    tweet_id: "1234567890123456789",
                    text: "a".repeat(281)
                });
                expect(result.success).toBe(false);
            });

            it("rejects non-numeric tweet_id", () => {
                const result = replyToTweetSchema.safeParse({
                    tweet_id: "invalid-id",
                    text: "Reply text"
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
