/**
 * LinkedIn Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeAddComment, addCommentSchema } from "../operations/addComment";
import { executeAddReaction, addReactionSchema } from "../operations/addReaction";
import { executeCreateArticlePost, createArticlePostSchema } from "../operations/createArticlePost";
import { executeCreatePost, createPostSchema } from "../operations/createPost";
import { executeDeletePost, deletePostSchema } from "../operations/deletePost";
import { executeGetComments, getCommentsSchema } from "../operations/getComments";
import { executeGetOrganizations, getOrganizationsSchema } from "../operations/getOrganizations";
import { executeGetPost, getPostSchema } from "../operations/getPost";
import { executeGetProfile, getProfileSchema } from "../operations/getProfile";
import type { LinkedInClient } from "../client/LinkedInClient";

// Mock LinkedInClient factory
function createMockLinkedInClient(): jest.Mocked<LinkedInClient> {
    return {
        getProfile: jest.fn(),
        getOrganizations: jest.fn(),
        createPost: jest.fn(),
        createArticlePost: jest.fn(),
        getPost: jest.fn(),
        deletePost: jest.fn(),
        addComment: jest.fn(),
        getComments: jest.fn(),
        addReaction: jest.fn(),
        initializeImageUpload: jest.fn(),
        initializeVideoUpload: jest.fn(),
        createMediaPost: jest.fn(),
        uploadMedia: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<LinkedInClient>;
}

describe("LinkedIn Operation Executors", () => {
    let mockClient: jest.Mocked<LinkedInClient>;

    beforeEach(() => {
        mockClient = createMockLinkedInClient();
    });

    describe("executeCreatePost", () => {
        it("calls client with correct params", async () => {
            mockClient.createPost.mockResolvedValueOnce({
                id: "urn:li:ugcPost:7161234567890123456"
            });

            await executeCreatePost(mockClient, {
                author: "urn:li:person:ABC123xyz",
                content: "Hello LinkedIn!",
                visibility: "PUBLIC"
            });

            expect(mockClient.createPost).toHaveBeenCalledWith({
                author: "urn:li:person:ABC123xyz",
                commentary: "Hello LinkedIn!",
                visibility: "PUBLIC"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.createPost.mockResolvedValueOnce({
                id: "urn:li:ugcPost:7161234567890123456"
            });

            const result = await executeCreatePost(mockClient, {
                author: "urn:li:person:ABC123xyz",
                content: "Hello LinkedIn!",
                visibility: "PUBLIC"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                postId: "urn:li:ugcPost:7161234567890123456",
                author: "urn:li:person:ABC123xyz",
                content: "Hello LinkedIn!",
                visibility: "PUBLIC"
            });
        });

        it("handles string response format", async () => {
            mockClient.createPost.mockResolvedValueOnce(
                "urn:li:ugcPost:7161234567890123456" as unknown as { id?: string }
            );

            const result = await executeCreatePost(mockClient, {
                author: "urn:li:person:ABC123xyz",
                content: "Hello LinkedIn!",
                visibility: "PUBLIC"
            });

            expect(result.success).toBe(true);
            expect(result.data?.postId).toBe("urn:li:ugcPost:7161234567890123456");
        });

        it("supports organization author", async () => {
            mockClient.createPost.mockResolvedValueOnce({
                id: "urn:li:ugcPost:7161234567890123456"
            });

            await executeCreatePost(mockClient, {
                author: "urn:li:organization:12345678",
                content: "Company announcement!",
                visibility: "PUBLIC"
            });

            expect(mockClient.createPost).toHaveBeenCalledWith({
                author: "urn:li:organization:12345678",
                commentary: "Company announcement!",
                visibility: "PUBLIC"
            });
        });

        it("supports different visibility options", async () => {
            mockClient.createPost.mockResolvedValueOnce({
                id: "urn:li:ugcPost:7161234567890123456"
            });

            await executeCreatePost(mockClient, {
                author: "urn:li:person:ABC123xyz",
                content: "Connections only post",
                visibility: "CONNECTIONS"
            });

            expect(mockClient.createPost).toHaveBeenCalledWith({
                author: "urn:li:person:ABC123xyz",
                commentary: "Connections only post",
                visibility: "CONNECTIONS"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.createPost.mockRejectedValueOnce(new Error("Not authorized to post"));

            const result = await executeCreatePost(mockClient, {
                author: "urn:li:person:ABC123xyz",
                content: "Hello",
                visibility: "PUBLIC"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Not authorized to post");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createPost.mockRejectedValueOnce("string error");

            const result = await executeCreatePost(mockClient, {
                author: "urn:li:person:ABC123xyz",
                content: "Hello",
                visibility: "PUBLIC"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create post");
        });
    });

    describe("executeCreateArticlePost", () => {
        it("calls client with correct params", async () => {
            mockClient.createArticlePost.mockResolvedValueOnce({
                id: "urn:li:ugcPost:7156789012345678901"
            });

            await executeCreateArticlePost(mockClient, {
                author: "urn:li:person:ABC123xyz",
                content: "Check out this article!",
                visibility: "PUBLIC",
                articleUrl: "https://example.com/article"
            });

            expect(mockClient.createArticlePost).toHaveBeenCalledWith({
                author: "urn:li:person:ABC123xyz",
                commentary: "Check out this article!",
                visibility: "PUBLIC",
                articleUrl: "https://example.com/article",
                articleTitle: undefined,
                articleDescription: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.createArticlePost.mockResolvedValueOnce({
                id: "urn:li:ugcPost:7156789012345678901"
            });

            const result = await executeCreateArticlePost(mockClient, {
                author: "urn:li:person:ABC123xyz",
                content: "Check out this article!",
                visibility: "PUBLIC",
                articleUrl: "https://example.com/article"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                postId: "urn:li:ugcPost:7156789012345678901",
                author: "urn:li:person:ABC123xyz",
                content: "Check out this article!",
                visibility: "PUBLIC",
                articleUrl: "https://example.com/article"
            });
        });

        it("passes optional article title and description", async () => {
            mockClient.createArticlePost.mockResolvedValueOnce({
                id: "urn:li:ugcPost:7156789012345678901"
            });

            await executeCreateArticlePost(mockClient, {
                author: "urn:li:person:ABC123xyz",
                content: "Check out this article!",
                visibility: "PUBLIC",
                articleUrl: "https://example.com/article",
                articleTitle: "My Article Title",
                articleDescription: "A brief description"
            });

            expect(mockClient.createArticlePost).toHaveBeenCalledWith({
                author: "urn:li:person:ABC123xyz",
                commentary: "Check out this article!",
                visibility: "PUBLIC",
                articleUrl: "https://example.com/article",
                articleTitle: "My Article Title",
                articleDescription: "A brief description"
            });
        });

        it("handles string response format", async () => {
            mockClient.createArticlePost.mockResolvedValueOnce(
                "urn:li:ugcPost:7156789012345678901" as unknown as { id?: string }
            );

            const result = await executeCreateArticlePost(mockClient, {
                author: "urn:li:person:ABC123xyz",
                content: "Check out this article!",
                visibility: "PUBLIC",
                articleUrl: "https://example.com/article"
            });

            expect(result.success).toBe(true);
            expect(result.data?.postId).toBe("urn:li:ugcPost:7156789012345678901");
        });

        it("returns error on client failure", async () => {
            mockClient.createArticlePost.mockRejectedValueOnce(
                new Error("Unable to fetch article preview")
            );

            const result = await executeCreateArticlePost(mockClient, {
                author: "urn:li:person:ABC123xyz",
                content: "Check out this article!",
                visibility: "PUBLIC",
                articleUrl: "https://invalid-url.com/article"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Unable to fetch article preview");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createArticlePost.mockRejectedValueOnce(null);

            const result = await executeCreateArticlePost(mockClient, {
                author: "urn:li:person:ABC123xyz",
                content: "Check out this article!",
                visibility: "PUBLIC",
                articleUrl: "https://example.com/article"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create article post");
        });
    });

    describe("executeDeletePost", () => {
        it("calls client with correct params", async () => {
            mockClient.deletePost.mockResolvedValueOnce(undefined);

            await executeDeletePost(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234"
            });

            expect(mockClient.deletePost).toHaveBeenCalledWith(
                "urn:li:ugcPost:7150892345678901234"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.deletePost.mockResolvedValueOnce(undefined);

            const result = await executeDeletePost(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                postId: "urn:li:ugcPost:7150892345678901234"
            });
        });

        it("works with share URN format", async () => {
            mockClient.deletePost.mockResolvedValueOnce(undefined);

            await executeDeletePost(mockClient, {
                postId: "urn:li:share:7150892345678901234"
            });

            expect(mockClient.deletePost).toHaveBeenCalledWith("urn:li:share:7150892345678901234");
        });

        it("returns error on client failure", async () => {
            mockClient.deletePost.mockRejectedValueOnce(new Error("Post not found"));

            const result = await executeDeletePost(mockClient, {
                postId: "urn:li:ugcPost:9999999999999999999"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Post not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unauthorized delete", async () => {
            mockClient.deletePost.mockRejectedValueOnce(
                new Error("Not authorized to delete this post")
            );

            const result = await executeDeletePost(mockClient, {
                postId: "urn:li:ugcPost:7888888888888888888"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Not authorized to delete this post");
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.deletePost.mockRejectedValueOnce(undefined);

            const result = await executeDeletePost(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to delete post");
        });
    });

    describe("executeGetPost", () => {
        it("calls client with correct params", async () => {
            mockClient.getPost.mockResolvedValueOnce({
                id: "urn:li:ugcPost:7150892345678901234",
                author: "urn:li:person:ABC123xyz",
                commentary: "Test post content",
                visibility: "PUBLIC",
                lifecycleState: "PUBLISHED",
                publishedAt: "2024-01-15T09:00:00.000Z",
                lastModifiedAt: "2024-01-15T09:00:00.000Z"
            });

            await executeGetPost(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234"
            });

            expect(mockClient.getPost).toHaveBeenCalledWith("urn:li:ugcPost:7150892345678901234");
        });

        it("returns normalized output on success", async () => {
            mockClient.getPost.mockResolvedValueOnce({
                id: "urn:li:ugcPost:7150892345678901234",
                author: "urn:li:person:ABC123xyz",
                commentary: "Test post content",
                visibility: "PUBLIC",
                lifecycleState: "PUBLISHED",
                publishedAt: "2024-01-15T09:00:00.000Z",
                lastModifiedAt: "2024-01-15T09:00:00.000Z"
            });

            const result = await executeGetPost(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "urn:li:ugcPost:7150892345678901234",
                author: "urn:li:person:ABC123xyz",
                content: "Test post content",
                visibility: "PUBLIC",
                lifecycleState: "PUBLISHED",
                publishedAt: "2024-01-15T09:00:00.000Z",
                lastModifiedAt: "2024-01-15T09:00:00.000Z"
            });
        });

        it("handles post without optional fields", async () => {
            mockClient.getPost.mockResolvedValueOnce({
                id: "urn:li:ugcPost:7150892345678901234",
                author: "urn:li:person:ABC123xyz",
                visibility: "PUBLIC",
                lifecycleState: "PUBLISHED"
            });

            const result = await executeGetPost(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234"
            });

            expect(result.success).toBe(true);
            expect(result.data?.content).toBeUndefined();
            expect(result.data?.publishedAt).toBeUndefined();
        });

        it("returns error on client failure", async () => {
            mockClient.getPost.mockRejectedValueOnce(new Error("Post not found"));

            const result = await executeGetPost(mockClient, {
                postId: "urn:li:ugcPost:9999999999999999999"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Post not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getPost.mockRejectedValueOnce({ code: "UNKNOWN" });

            const result = await executeGetPost(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get post");
        });
    });

    describe("executeGetProfile", () => {
        it("calls client getProfile method", async () => {
            mockClient.getProfile.mockResolvedValueOnce({
                sub: "ABC123xyz",
                name: "Sarah Johnson",
                given_name: "Sarah",
                family_name: "Johnson",
                email: "sarah.johnson@email.com",
                email_verified: true,
                picture: "https://media.licdn.com/dms/image/profile.jpg",
                locale: "en_US"
            });

            await executeGetProfile(mockClient, {});

            expect(mockClient.getProfile).toHaveBeenCalled();
        });

        it("returns normalized output on success", async () => {
            mockClient.getProfile.mockResolvedValueOnce({
                sub: "ABC123xyz",
                name: "Sarah Johnson",
                given_name: "Sarah",
                family_name: "Johnson",
                email: "sarah.johnson@email.com",
                email_verified: true,
                picture: "https://media.licdn.com/dms/image/profile.jpg",
                locale: "en_US"
            });

            const result = await executeGetProfile(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                personUrn: "urn:li:person:ABC123xyz",
                userId: "ABC123xyz",
                name: "Sarah Johnson",
                firstName: "Sarah",
                lastName: "Johnson",
                email: "sarah.johnson@email.com",
                emailVerified: true,
                picture: "https://media.licdn.com/dms/image/profile.jpg",
                locale: "en_US"
            });
        });

        it("handles profile with minimal fields", async () => {
            mockClient.getProfile.mockResolvedValueOnce({
                sub: "XYZ789abc",
                name: "John Doe"
            });

            const result = await executeGetProfile(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                personUrn: "urn:li:person:XYZ789abc",
                userId: "XYZ789abc",
                name: "John Doe",
                firstName: undefined,
                lastName: undefined,
                email: undefined,
                emailVerified: undefined,
                picture: undefined,
                locale: undefined
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getProfile.mockRejectedValueOnce(new Error("Access token has expired"));

            const result = await executeGetProfile(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Access token has expired");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getProfile.mockRejectedValueOnce(42);

            const result = await executeGetProfile(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get profile");
        });
    });

    describe("executeGetOrganizations", () => {
        it("calls client getOrganizations method", async () => {
            mockClient.getOrganizations.mockResolvedValueOnce({
                elements: []
            });

            await executeGetOrganizations(mockClient, {});

            expect(mockClient.getOrganizations).toHaveBeenCalled();
        });

        it("returns normalized output on success", async () => {
            mockClient.getOrganizations.mockResolvedValueOnce({
                elements: [
                    {
                        organization: "urn:li:organization:12345678",
                        organizationId: 12345678,
                        role: "ADMINISTRATOR",
                        state: "APPROVED"
                    },
                    {
                        organization: "urn:li:organization:87654321",
                        organizationId: 87654321,
                        role: "DIRECT_SPONSORED_CONTENT_POSTER",
                        state: "APPROVED"
                    }
                ]
            });

            const result = await executeGetOrganizations(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
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
                    }
                ],
                count: 2
            });
        });

        it("handles empty organizations list", async () => {
            mockClient.getOrganizations.mockResolvedValueOnce({
                elements: []
            });

            const result = await executeGetOrganizations(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                organizations: [],
                count: 0
            });
        });

        it("handles missing elements in response", async () => {
            mockClient.getOrganizations.mockResolvedValueOnce({});

            const result = await executeGetOrganizations(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                organizations: [],
                count: 0
            });
        });

        it("constructs URN from organizationId when organization field missing", async () => {
            mockClient.getOrganizations.mockResolvedValueOnce({
                elements: [
                    {
                        organizationId: 99999999,
                        role: "ADMINISTRATOR",
                        state: "APPROVED"
                    }
                ]
            });

            const result = await executeGetOrganizations(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.organizations[0].organizationUrn).toBe(
                "urn:li:organization:99999999"
            );
        });

        it("returns error on client failure", async () => {
            mockClient.getOrganizations.mockRejectedValueOnce(
                new Error("Missing required permission: r_organization_admin")
            );

            const result = await executeGetOrganizations(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Missing required permission: r_organization_admin");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getOrganizations.mockRejectedValueOnce(false);

            const result = await executeGetOrganizations(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get organizations");
        });
    });

    describe("executeAddComment", () => {
        it("calls client with correct params", async () => {
            mockClient.addComment.mockResolvedValueOnce({
                id: "urn:li:comment:(urn:li:ugcPost:7150892345678901234,7150998765432109876)"
            });

            await executeAddComment(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234",
                actor: "urn:li:person:ABC123xyz",
                text: "Great post!"
            });

            expect(mockClient.addComment).toHaveBeenCalledWith(
                "urn:li:ugcPost:7150892345678901234",
                "urn:li:person:ABC123xyz",
                "Great post!"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.addComment.mockResolvedValueOnce({
                id: "urn:li:comment:(urn:li:ugcPost:7150892345678901234,7150998765432109876)"
            });

            const result = await executeAddComment(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234",
                actor: "urn:li:person:ABC123xyz",
                text: "Great post!"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                commentId:
                    "urn:li:comment:(urn:li:ugcPost:7150892345678901234,7150998765432109876)",
                postId: "urn:li:ugcPost:7150892345678901234",
                actor: "urn:li:person:ABC123xyz",
                text: "Great post!"
            });
        });

        it("handles string response format", async () => {
            mockClient.addComment.mockResolvedValueOnce(
                "urn:li:comment:(urn:li:ugcPost:7150892345678901234,7150998765432109876)" as unknown as {
                    id?: string;
                }
            );

            const result = await executeAddComment(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234",
                actor: "urn:li:person:ABC123xyz",
                text: "Great post!"
            });

            expect(result.success).toBe(true);
            expect(result.data?.commentId).toBe(
                "urn:li:comment:(urn:li:ugcPost:7150892345678901234,7150998765432109876)"
            );
        });

        it("returns error on client failure", async () => {
            mockClient.addComment.mockRejectedValueOnce(new Error("Post not found"));

            const result = await executeAddComment(mockClient, {
                postId: "urn:li:ugcPost:9999999999999999999",
                actor: "urn:li:person:ABC123xyz",
                text: "This comment will fail"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Post not found");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.addComment.mockRejectedValueOnce([]);

            const result = await executeAddComment(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234",
                actor: "urn:li:person:ABC123xyz",
                text: "Great post!"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to add comment");
        });
    });

    describe("executeGetComments", () => {
        it("calls client with default params", async () => {
            mockClient.getComments.mockResolvedValueOnce({
                elements: [],
                paging: { count: 10, start: 0 }
            });

            await executeGetComments(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234"
            });

            expect(mockClient.getComments).toHaveBeenCalledWith(
                "urn:li:ugcPost:7150892345678901234",
                {
                    start: undefined,
                    count: undefined
                }
            );
        });

        it("calls client with custom pagination params", async () => {
            mockClient.getComments.mockResolvedValueOnce({
                elements: [],
                paging: { count: 5, start: 10 }
            });

            await executeGetComments(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234",
                start: 10,
                count: 5
            });

            expect(mockClient.getComments).toHaveBeenCalledWith(
                "urn:li:ugcPost:7150892345678901234",
                {
                    start: 10,
                    count: 5
                }
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.getComments.mockResolvedValueOnce({
                elements: [
                    {
                        id: "urn:li:comment:(urn:li:ugcPost:7150892345678901234,7150111222333444555)",
                        actor: "urn:li:person:CommentUser1",
                        message: { text: "Great insights!" },
                        created: { time: 1705311000000 },
                        lastModified: { time: 1705311000000 }
                    },
                    {
                        id: "urn:li:comment:(urn:li:ugcPost:7150892345678901234,7150222333444555666)",
                        actor: "urn:li:person:CommentUser2",
                        message: { text: "Thanks for sharing!" },
                        created: { time: 1705313700000 }
                    }
                ],
                paging: {
                    count: 10,
                    start: 0,
                    links: [{ rel: "next", href: "/v2/comments?start=10" }]
                }
            });

            const result = await executeGetComments(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234"
            });

            expect(result.success).toBe(true);
            expect(result.data?.comments).toHaveLength(2);
            expect(result.data?.comments[0]).toEqual({
                id: "urn:li:comment:(urn:li:ugcPost:7150892345678901234,7150111222333444555)",
                actor: "urn:li:person:CommentUser1",
                text: "Great insights!",
                createdAt: expect.any(String),
                lastModifiedAt: expect.any(String)
            });
            expect(result.data?.count).toBe(2);
            expect(result.data?.paging).toBeDefined();
        });

        it("handles empty comments list", async () => {
            mockClient.getComments.mockResolvedValueOnce({
                elements: [],
                paging: { count: 10, start: 0 }
            });

            const result = await executeGetComments(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234"
            });

            expect(result.success).toBe(true);
            expect(result.data?.comments).toEqual([]);
            expect(result.data?.count).toBe(0);
        });

        it("handles comments without timestamps", async () => {
            mockClient.getComments.mockResolvedValueOnce({
                elements: [
                    {
                        id: "urn:li:comment:123",
                        actor: "urn:li:person:User1",
                        message: { text: "Comment without timestamps" }
                    }
                ],
                paging: { count: 10, start: 0 }
            });

            const result = await executeGetComments(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234"
            });

            expect(result.success).toBe(true);
            expect(result.data?.comments[0].createdAt).toBeUndefined();
            expect(result.data?.comments[0].lastModifiedAt).toBeUndefined();
        });

        it("returns error on client failure", async () => {
            mockClient.getComments.mockRejectedValueOnce(new Error("Post not found"));

            const result = await executeGetComments(mockClient, {
                postId: "urn:li:ugcPost:9999999999999999999"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Post not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getComments.mockRejectedValueOnce(Symbol("error"));

            const result = await executeGetComments(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get comments");
        });
    });

    describe("executeAddReaction", () => {
        it("calls client with correct params", async () => {
            mockClient.addReaction.mockResolvedValueOnce(undefined);

            await executeAddReaction(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234",
                actor: "urn:li:person:ABC123xyz",
                reactionType: "LIKE"
            });

            expect(mockClient.addReaction).toHaveBeenCalledWith(
                "urn:li:ugcPost:7150892345678901234",
                "urn:li:person:ABC123xyz",
                "LIKE"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.addReaction.mockResolvedValueOnce(undefined);

            const result = await executeAddReaction(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234",
                actor: "urn:li:person:ABC123xyz",
                reactionType: "LIKE"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                postId: "urn:li:ugcPost:7150892345678901234",
                actor: "urn:li:person:ABC123xyz",
                reactionType: "LIKE"
            });
        });

        it("supports all reaction types", async () => {
            const reactionTypes = [
                "LIKE",
                "CELEBRATE",
                "SUPPORT",
                "LOVE",
                "INSIGHTFUL",
                "FUNNY"
            ] as const;

            for (const reactionType of reactionTypes) {
                mockClient.addReaction.mockResolvedValueOnce(undefined);

                const result = await executeAddReaction(mockClient, {
                    postId: "urn:li:ugcPost:7150892345678901234",
                    actor: "urn:li:person:ABC123xyz",
                    reactionType
                });

                expect(result.success).toBe(true);
                expect(result.data?.reactionType).toBe(reactionType);
            }
        });

        it("returns error on client failure", async () => {
            mockClient.addReaction.mockRejectedValueOnce(new Error("Post not found"));

            const result = await executeAddReaction(mockClient, {
                postId: "urn:li:ugcPost:9999999999999999999",
                actor: "urn:li:person:ABC123xyz",
                reactionType: "LIKE"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Post not found");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles already reacted error", async () => {
            mockClient.addReaction.mockRejectedValueOnce(
                new Error("You have already reacted to this post")
            );

            const result = await executeAddReaction(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234",
                actor: "urn:li:person:DuplicateUser",
                reactionType: "LIKE"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("You have already reacted to this post");
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.addReaction.mockRejectedValueOnce(new Map());

            const result = await executeAddReaction(mockClient, {
                postId: "urn:li:ugcPost:7150892345678901234",
                actor: "urn:li:person:ABC123xyz",
                reactionType: "LIKE"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to add reaction");
        });
    });

    describe("schema validation", () => {
        describe("createPostSchema", () => {
            it("validates minimal input", () => {
                const result = createPostSchema.safeParse({
                    author: "urn:li:person:ABC123xyz",
                    content: "Hello LinkedIn!",
                    visibility: "PUBLIC"
                });
                expect(result.success).toBe(true);
            });

            it("validates with default visibility", () => {
                const result = createPostSchema.safeParse({
                    author: "urn:li:person:ABC123xyz",
                    content: "Hello LinkedIn!"
                });
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.visibility).toBe("PUBLIC");
                }
            });

            it("validates organization author", () => {
                const result = createPostSchema.safeParse({
                    author: "urn:li:organization:12345678",
                    content: "Company post",
                    visibility: "PUBLIC"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid author URN", () => {
                const result = createPostSchema.safeParse({
                    author: "invalid-urn",
                    content: "Hello LinkedIn!",
                    visibility: "PUBLIC"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing content", () => {
                const result = createPostSchema.safeParse({
                    author: "urn:li:person:ABC123xyz",
                    visibility: "PUBLIC"
                });
                expect(result.success).toBe(false);
            });

            it("rejects content exceeding max length", () => {
                const result = createPostSchema.safeParse({
                    author: "urn:li:person:ABC123xyz",
                    content: "A".repeat(3001),
                    visibility: "PUBLIC"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid visibility", () => {
                const result = createPostSchema.safeParse({
                    author: "urn:li:person:ABC123xyz",
                    content: "Hello LinkedIn!",
                    visibility: "INVALID"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createArticlePostSchema", () => {
            it("validates minimal input", () => {
                const result = createArticlePostSchema.safeParse({
                    author: "urn:li:person:ABC123xyz",
                    content: "Check out this article!",
                    visibility: "PUBLIC",
                    articleUrl: "https://example.com/article"
                });
                expect(result.success).toBe(true);
            });

            it("validates with optional fields", () => {
                const result = createArticlePostSchema.safeParse({
                    author: "urn:li:person:ABC123xyz",
                    content: "Check out this article!",
                    visibility: "PUBLIC",
                    articleUrl: "https://example.com/article",
                    articleTitle: "My Article",
                    articleDescription: "A great article"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid URL", () => {
                const result = createArticlePostSchema.safeParse({
                    author: "urn:li:person:ABC123xyz",
                    content: "Check out this article!",
                    visibility: "PUBLIC",
                    articleUrl: "not-a-url"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing articleUrl", () => {
                const result = createArticlePostSchema.safeParse({
                    author: "urn:li:person:ABC123xyz",
                    content: "Check out this article!",
                    visibility: "PUBLIC"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("deletePostSchema", () => {
            it("validates valid post ID", () => {
                const result = deletePostSchema.safeParse({
                    postId: "urn:li:ugcPost:7150892345678901234"
                });
                expect(result.success).toBe(true);
            });

            it("validates share URN format", () => {
                const result = deletePostSchema.safeParse({
                    postId: "urn:li:share:7150892345678901234"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing postId", () => {
                const result = deletePostSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("getPostSchema", () => {
            it("validates valid post ID", () => {
                const result = getPostSchema.safeParse({
                    postId: "urn:li:ugcPost:7150892345678901234"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing postId", () => {
                const result = getPostSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("getProfileSchema", () => {
            it("validates empty input", () => {
                const result = getProfileSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("getOrganizationsSchema", () => {
            it("validates empty input", () => {
                const result = getOrganizationsSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("addCommentSchema", () => {
            it("validates valid input", () => {
                const result = addCommentSchema.safeParse({
                    postId: "urn:li:ugcPost:7150892345678901234",
                    actor: "urn:li:person:ABC123xyz",
                    text: "Great post!"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty text", () => {
                const result = addCommentSchema.safeParse({
                    postId: "urn:li:ugcPost:7150892345678901234",
                    actor: "urn:li:person:ABC123xyz",
                    text: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects text exceeding max length", () => {
                const result = addCommentSchema.safeParse({
                    postId: "urn:li:ugcPost:7150892345678901234",
                    actor: "urn:li:person:ABC123xyz",
                    text: "A".repeat(1251)
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid actor URN", () => {
                const result = addCommentSchema.safeParse({
                    postId: "urn:li:ugcPost:7150892345678901234",
                    actor: "invalid-actor",
                    text: "Great post!"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getCommentsSchema", () => {
            it("validates minimal input", () => {
                const result = getCommentsSchema.safeParse({
                    postId: "urn:li:ugcPost:7150892345678901234"
                });
                expect(result.success).toBe(true);
            });

            it("validates with pagination", () => {
                const result = getCommentsSchema.safeParse({
                    postId: "urn:li:ugcPost:7150892345678901234",
                    start: 10,
                    count: 50
                });
                expect(result.success).toBe(true);
            });

            it("rejects count exceeding max", () => {
                const result = getCommentsSchema.safeParse({
                    postId: "urn:li:ugcPost:7150892345678901234",
                    count: 101
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative start", () => {
                const result = getCommentsSchema.safeParse({
                    postId: "urn:li:ugcPost:7150892345678901234",
                    start: -1
                });
                expect(result.success).toBe(false);
            });
        });

        describe("addReactionSchema", () => {
            it("validates valid input", () => {
                const result = addReactionSchema.safeParse({
                    postId: "urn:li:ugcPost:7150892345678901234",
                    actor: "urn:li:person:ABC123xyz",
                    reactionType: "LIKE"
                });
                expect(result.success).toBe(true);
            });

            it("validates all reaction types", () => {
                const reactionTypes = [
                    "LIKE",
                    "CELEBRATE",
                    "SUPPORT",
                    "LOVE",
                    "INSIGHTFUL",
                    "FUNNY"
                ];
                for (const reactionType of reactionTypes) {
                    const result = addReactionSchema.safeParse({
                        postId: "urn:li:ugcPost:7150892345678901234",
                        actor: "urn:li:person:ABC123xyz",
                        reactionType
                    });
                    expect(result.success).toBe(true);
                }
            });

            it("uses default reaction type", () => {
                const result = addReactionSchema.safeParse({
                    postId: "urn:li:ugcPost:7150892345678901234",
                    actor: "urn:li:person:ABC123xyz"
                });
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.reactionType).toBe("LIKE");
                }
            });

            it("rejects invalid reaction type", () => {
                const result = addReactionSchema.safeParse({
                    postId: "urn:li:ugcPost:7150892345678901234",
                    actor: "urn:li:person:ABC123xyz",
                    reactionType: "INVALID"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing actor", () => {
                const result = addReactionSchema.safeParse({
                    postId: "urn:li:ugcPost:7150892345678901234",
                    reactionType: "LIKE"
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
