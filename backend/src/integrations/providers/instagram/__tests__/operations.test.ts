/**
 * Instagram Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeGetAccountInfo, getAccountInfoSchema } from "../operations/getAccountInfo";
import {
    executeGetAccountInsights,
    getAccountInsightsSchema
} from "../operations/getAccountInsights";
import { executeGetConversations, getConversationsSchema } from "../operations/getConversations";
import { executeGetMediaInsights, getMediaInsightsSchema } from "../operations/getMediaInsights";
import { executeGetMessages, getMessagesSchema } from "../operations/getMessages";
import { executePublishCarousel, publishCarouselSchema } from "../operations/publishCarousel";
import { executePublishPhoto, publishPhotoSchema } from "../operations/publishPhoto";
import { executePublishReel, publishReelSchema } from "../operations/publishReel";
import { executePublishStory, publishStorySchema } from "../operations/publishStory";
import { executeSendMediaMessage, sendMediaMessageSchema } from "../operations/sendMediaMessage";
import { executeSendQuickReplies, sendQuickRepliesSchema } from "../operations/sendQuickReplies";
import { executeSendTextMessage, sendTextMessageSchema } from "../operations/sendTextMessage";
import type { InstagramClient } from "../client/InstagramClient";
import type {
    InstagramAccount,
    InstagramAccountInsight,
    InstagramConversation,
    InstagramMessage,
    InstagramMediaInsight,
    InstagramMedia,
    InstagramSendMessageResponse
} from "../types";

// Mock InstagramClient factory
function createMockInstagramClient(): jest.Mocked<InstagramClient> {
    return {
        // Account operations
        getAccountInfo: jest.fn(),
        getAccountInsights: jest.fn(),
        getInstagramAccount: jest.fn(),
        discoverInstagramAccount: jest.fn(),
        getConnectedPages: jest.fn(),

        // Messaging operations
        sendMessage: jest.fn(),
        sendTextMessage: jest.fn(),
        sendMediaMessage: jest.fn(),
        sendQuickReplies: jest.fn(),
        getConversations: jest.fn(),
        getMessages: jest.fn(),

        // Publishing operations
        publishPhoto: jest.fn(),
        publishCarousel: jest.fn(),
        publishReel: jest.fn(),
        publishStory: jest.fn(),
        createMediaContainer: jest.fn(),
        publishMediaContainer: jest.fn(),
        getContainerStatus: jest.fn(),

        // Media operations
        getMedia: jest.fn(),
        getMediaInsights: jest.fn(),

        // Client state management
        updateAccessToken: jest.fn(),
        setPageId: jest.fn(),
        getPageId: jest.fn(),
        setIgAccountId: jest.fn(),
        getIgAccountId: jest.fn(),

        // Base HTTP methods
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<InstagramClient>;
}

describe("Instagram Operation Executors", () => {
    let mockClient: jest.Mocked<InstagramClient>;

    beforeEach(() => {
        mockClient = createMockInstagramClient();
    });

    describe("executeGetAccountInfo", () => {
        const mockAccount: InstagramAccount = {
            id: "17841400000000001",
            username: "testbusiness",
            name: "Test Business",
            profile_picture_url: "https://example.com/pic.jpg",
            followers_count: 10000,
            follows_count: 500,
            media_count: 150,
            biography: "Test business account",
            website: "https://example.com"
        };

        it("calls client with correct params", async () => {
            mockClient.getAccountInfo.mockResolvedValueOnce(mockAccount);

            await executeGetAccountInfo(mockClient, {
                igAccountId: "17841400000000001"
            });

            expect(mockClient.getAccountInfo).toHaveBeenCalledWith("17841400000000001");
        });

        it("returns normalized output on success", async () => {
            mockClient.getAccountInfo.mockResolvedValueOnce(mockAccount);

            const result = await executeGetAccountInfo(mockClient, {
                igAccountId: "17841400000000001"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "17841400000000001",
                username: "testbusiness",
                name: "Test Business",
                profilePictureUrl: "https://example.com/pic.jpg",
                followersCount: 10000,
                followsCount: 500,
                mediaCount: 150,
                biography: "Test business account",
                website: "https://example.com"
            });
        });

        it("handles account with minimal fields", async () => {
            const minimalAccount: InstagramAccount = {
                id: "17841400000000001",
                username: "minimal"
            };
            mockClient.getAccountInfo.mockResolvedValueOnce(minimalAccount);

            const result = await executeGetAccountInfo(mockClient, {
                igAccountId: "17841400000000001"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "17841400000000001",
                username: "minimal",
                name: undefined,
                profilePictureUrl: undefined,
                followersCount: undefined,
                followsCount: undefined,
                mediaCount: undefined,
                biography: undefined,
                website: undefined
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getAccountInfo.mockRejectedValueOnce(new Error("Account not found"));

            const result = await executeGetAccountInfo(mockClient, {
                igAccountId: "invalid-id"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Account not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getAccountInfo.mockRejectedValueOnce("string error");

            const result = await executeGetAccountInfo(mockClient, {
                igAccountId: "17841400000000001"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get account info");
        });
    });

    describe("executeGetAccountInsights", () => {
        const mockInsights: { data: InstagramAccountInsight[] } = {
            data: [
                {
                    id: "insight1",
                    name: "impressions",
                    period: "day",
                    values: [{ value: 5000 }],
                    title: "Impressions",
                    description: "Total impressions"
                },
                {
                    id: "insight2",
                    name: "reach",
                    period: "day",
                    values: [{ value: 3000 }],
                    title: "Reach",
                    description: "Total reach"
                }
            ]
        };

        it("calls client with correct params", async () => {
            mockClient.getAccountInsights.mockResolvedValueOnce(mockInsights);

            await executeGetAccountInsights(mockClient, {
                igAccountId: "17841400000000001",
                metrics: ["impressions", "reach"],
                period: "day"
            });

            expect(mockClient.getAccountInsights).toHaveBeenCalledWith(
                "17841400000000001",
                ["impressions", "reach"],
                "day"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.getAccountInsights.mockResolvedValueOnce(mockInsights);

            const result = await executeGetAccountInsights(mockClient, {
                igAccountId: "17841400000000001",
                metrics: ["impressions", "reach"],
                period: "day"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                igAccountId: "17841400000000001",
                period: "day",
                insights: [
                    {
                        name: "impressions",
                        value: 5000,
                        period: "day",
                        title: "Impressions",
                        description: "Total impressions"
                    },
                    {
                        name: "reach",
                        value: 3000,
                        period: "day",
                        title: "Reach",
                        description: "Total reach"
                    }
                ]
            });
        });

        it("handles empty values array", async () => {
            const emptyInsights: { data: InstagramAccountInsight[] } = {
                data: [
                    {
                        id: "insight1",
                        name: "impressions",
                        period: "day",
                        values: [],
                        title: "Impressions",
                        description: "Total impressions"
                    }
                ]
            };
            mockClient.getAccountInsights.mockResolvedValueOnce(emptyInsights);

            const result = await executeGetAccountInsights(mockClient, {
                igAccountId: "17841400000000001",
                metrics: ["impressions"],
                period: "day"
            });

            expect(result.success).toBe(true);
            expect(result.data?.insights[0].value).toBe(0);
        });

        it("returns error on client failure", async () => {
            mockClient.getAccountInsights.mockRejectedValueOnce(new Error("Permission denied"));

            const result = await executeGetAccountInsights(mockClient, {
                igAccountId: "17841400000000001",
                metrics: ["impressions"],
                period: "day"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Permission denied");
        });
    });

    describe("executeGetConversations", () => {
        const mockConversations: {
            data: InstagramConversation[];
            paging?: { cursors: { after: string } };
        } = {
            data: [
                {
                    id: "conv123",
                    updated_time: "2024-01-15T10:30:00Z",
                    participants: {
                        data: [
                            { id: "user1", username: "john_doe", name: "John Doe" },
                            { id: "user2", username: "page_user", name: "Business" }
                        ]
                    }
                },
                {
                    id: "conv456",
                    updated_time: "2024-01-14T09:00:00Z",
                    participants: {
                        data: [{ id: "user3", username: "jane_doe" }]
                    }
                }
            ],
            paging: {
                cursors: { after: "cursor_next_page" }
            }
        };

        it("calls client with correct params", async () => {
            mockClient.getConversations.mockResolvedValueOnce(mockConversations);

            await executeGetConversations(mockClient, {
                pageId: "page123",
                limit: 10,
                after: "cursor_start"
            });

            expect(mockClient.getConversations).toHaveBeenCalledWith("page123", {
                limit: 10,
                after: "cursor_start"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.getConversations.mockResolvedValueOnce(mockConversations);

            const result = await executeGetConversations(mockClient, {
                pageId: "page123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                conversations: [
                    {
                        id: "conv123",
                        updatedTime: "2024-01-15T10:30:00Z",
                        participants: [
                            { id: "user1", username: "john_doe", name: "John Doe" },
                            { id: "user2", username: "page_user", name: "Business" }
                        ]
                    },
                    {
                        id: "conv456",
                        updatedTime: "2024-01-14T09:00:00Z",
                        participants: [{ id: "user3", username: "jane_doe", name: undefined }]
                    }
                ],
                nextCursor: "cursor_next_page"
            });
        });

        it("handles empty conversations", async () => {
            mockClient.getConversations.mockResolvedValueOnce({ data: [] });

            const result = await executeGetConversations(mockClient, {
                pageId: "page123"
            });

            expect(result.success).toBe(true);
            expect(result.data?.conversations).toHaveLength(0);
            expect(result.data?.nextCursor).toBeUndefined();
        });

        it("returns error on client failure", async () => {
            mockClient.getConversations.mockRejectedValueOnce(new Error("Rate limited"));

            const result = await executeGetConversations(mockClient, {
                pageId: "page123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Rate limited");
        });
    });

    describe("executeGetMessages", () => {
        const mockMessages: {
            data: InstagramMessage[];
            paging?: { cursors: { after: string } };
        } = {
            data: [
                {
                    id: "msg123",
                    created_time: "2024-01-15T10:30:00Z",
                    from: { id: "user1", username: "john_doe", name: "John" },
                    to: { data: [{ id: "page1" }] },
                    message: "Hello there!"
                },
                {
                    id: "msg456",
                    created_time: "2024-01-15T10:31:00Z",
                    from: { id: "page1", name: "Business" },
                    to: { data: [{ id: "user1" }] },
                    message: "Hi! How can I help?"
                }
            ],
            paging: {
                cursors: { after: "msg_cursor_next" }
            }
        };

        it("calls client with correct params", async () => {
            mockClient.getMessages.mockResolvedValueOnce(mockMessages);

            await executeGetMessages(mockClient, {
                conversationId: "conv123",
                limit: 25,
                after: "cursor"
            });

            expect(mockClient.getMessages).toHaveBeenCalledWith("conv123", {
                limit: 25,
                after: "cursor"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.getMessages.mockResolvedValueOnce(mockMessages);

            const result = await executeGetMessages(mockClient, {
                conversationId: "conv123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                messages: [
                    {
                        id: "msg123",
                        createdTime: "2024-01-15T10:30:00Z",
                        from: { id: "user1", username: "john_doe", name: "John" },
                        text: "Hello there!",
                        attachments: undefined
                    },
                    {
                        id: "msg456",
                        createdTime: "2024-01-15T10:31:00Z",
                        from: { id: "page1", username: undefined, name: "Business" },
                        text: "Hi! How can I help?",
                        attachments: undefined
                    }
                ],
                nextCursor: "msg_cursor_next"
            });
        });

        it("handles messages with attachments", async () => {
            const messagesWithAttachments: {
                data: InstagramMessage[];
                paging?: { cursors: { after: string } };
            } = {
                data: [
                    {
                        id: "msg789",
                        created_time: "2024-01-15T11:00:00Z",
                        from: { id: "user1" },
                        to: { data: [{ id: "page1" }] },
                        attachments: {
                            data: [
                                {
                                    id: "att1",
                                    mime_type: "image/jpeg",
                                    name: "photo.jpg",
                                    size: 12345,
                                    image_data: {
                                        url: "https://example.com/image.jpg",
                                        width: 800,
                                        height: 600
                                    }
                                }
                            ]
                        }
                    }
                ]
            };
            mockClient.getMessages.mockResolvedValueOnce(messagesWithAttachments);

            const result = await executeGetMessages(mockClient, {
                conversationId: "conv123"
            });

            expect(result.success).toBe(true);
            expect(result.data?.messages[0].attachments).toEqual([
                {
                    id: "att1",
                    type: "image/jpeg",
                    url: "https://example.com/image.jpg"
                }
            ]);
        });

        it("returns error on client failure", async () => {
            mockClient.getMessages.mockRejectedValueOnce(new Error("Conversation not found"));

            const result = await executeGetMessages(mockClient, {
                conversationId: "invalid"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Conversation not found");
        });
    });

    describe("executeGetMediaInsights", () => {
        const mockMediaInsights: { data: InstagramMediaInsight[] } = {
            data: [
                {
                    id: "insight1",
                    name: "engagement",
                    period: "lifetime",
                    values: [{ value: 250 }],
                    title: "Engagement",
                    description: "Total engagement"
                },
                {
                    id: "insight2",
                    name: "impressions",
                    period: "lifetime",
                    values: [{ value: 5000 }],
                    title: "Impressions",
                    description: "Total impressions"
                }
            ]
        };

        it("calls client with correct params", async () => {
            mockClient.getMediaInsights.mockResolvedValueOnce(mockMediaInsights);

            await executeGetMediaInsights(mockClient, {
                mediaId: "media123",
                metrics: ["engagement", "impressions"]
            });

            expect(mockClient.getMediaInsights).toHaveBeenCalledWith("media123", [
                "engagement",
                "impressions"
            ]);
        });

        it("returns normalized output on success", async () => {
            mockClient.getMediaInsights.mockResolvedValueOnce(mockMediaInsights);

            const result = await executeGetMediaInsights(mockClient, {
                mediaId: "media123",
                metrics: ["engagement", "impressions"]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                mediaId: "media123",
                insights: [
                    {
                        name: "engagement",
                        value: 250,
                        period: "lifetime",
                        title: "Engagement",
                        description: "Total engagement"
                    },
                    {
                        name: "impressions",
                        value: 5000,
                        period: "lifetime",
                        title: "Impressions",
                        description: "Total impressions"
                    }
                ]
            });
        });

        it("handles empty values", async () => {
            const emptyInsights: { data: InstagramMediaInsight[] } = {
                data: [
                    {
                        id: "insight1",
                        name: "saved",
                        period: "lifetime",
                        values: [],
                        title: "Saved",
                        description: "Saved count"
                    }
                ]
            };
            mockClient.getMediaInsights.mockResolvedValueOnce(emptyInsights);

            const result = await executeGetMediaInsights(mockClient, {
                mediaId: "media123"
            });

            expect(result.success).toBe(true);
            expect(result.data?.insights[0].value).toBe(0);
        });

        it("returns error on client failure", async () => {
            mockClient.getMediaInsights.mockRejectedValueOnce(new Error("Media not found"));

            const result = await executeGetMediaInsights(mockClient, {
                mediaId: "invalid"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Media not found");
        });
    });

    describe("executePublishPhoto", () => {
        const mockPublishResponse = { id: "media_17841400000000099" };
        const mockMedia: InstagramMedia = {
            id: "media_17841400000000099",
            media_type: "IMAGE",
            media_url: "https://example.com/photo.jpg",
            permalink: "https://instagram.com/p/ABC123",
            timestamp: "2024-01-15T12:00:00Z"
        };

        it("calls client with correct params", async () => {
            mockClient.publishPhoto.mockResolvedValueOnce(mockPublishResponse);
            mockClient.getMedia.mockResolvedValueOnce(mockMedia);

            await executePublishPhoto(mockClient, {
                igAccountId: "17841400000000001",
                imageUrl: "https://example.com/photo.jpg",
                caption: "Test photo #instagram",
                locationId: "loc123"
            });

            expect(mockClient.publishPhoto).toHaveBeenCalledWith(
                "17841400000000001",
                "https://example.com/photo.jpg",
                "Test photo #instagram",
                "loc123"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.publishPhoto.mockResolvedValueOnce(mockPublishResponse);
            mockClient.getMedia.mockResolvedValueOnce(mockMedia);

            const result = await executePublishPhoto(mockClient, {
                igAccountId: "17841400000000001",
                imageUrl: "https://example.com/photo.jpg"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                mediaId: "media_17841400000000099",
                permalink: "https://instagram.com/p/ABC123"
            });
        });

        it("handles photo without caption", async () => {
            mockClient.publishPhoto.mockResolvedValueOnce(mockPublishResponse);
            mockClient.getMedia.mockResolvedValueOnce(mockMedia);

            await executePublishPhoto(mockClient, {
                igAccountId: "17841400000000001",
                imageUrl: "https://example.com/photo.jpg"
            });

            expect(mockClient.publishPhoto).toHaveBeenCalledWith(
                "17841400000000001",
                "https://example.com/photo.jpg",
                undefined,
                undefined
            );
        });

        it("returns error on publish failure", async () => {
            mockClient.publishPhoto.mockRejectedValueOnce(new Error("Invalid image URL"));

            const result = await executePublishPhoto(mockClient, {
                igAccountId: "17841400000000001",
                imageUrl: "https://invalid.com/photo.jpg"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Invalid image URL");
            expect(result.error?.retryable).toBe(true);
        });

        it("returns error when getMedia fails after publish", async () => {
            mockClient.publishPhoto.mockResolvedValueOnce(mockPublishResponse);
            mockClient.getMedia.mockRejectedValueOnce(new Error("Media fetch failed"));

            const result = await executePublishPhoto(mockClient, {
                igAccountId: "17841400000000001",
                imageUrl: "https://example.com/photo.jpg"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Media fetch failed");
        });
    });

    describe("executePublishCarousel", () => {
        const mockPublishResponse = { id: "media_carousel_001" };
        const mockMedia: InstagramMedia = {
            id: "media_carousel_001",
            media_type: "CAROUSEL_ALBUM",
            permalink: "https://instagram.com/p/XYZ789",
            timestamp: "2024-01-15T13:00:00Z"
        };

        it("calls client with correct params", async () => {
            mockClient.publishCarousel.mockResolvedValueOnce(mockPublishResponse);
            mockClient.getMedia.mockResolvedValueOnce(mockMedia);

            await executePublishCarousel(mockClient, {
                igAccountId: "17841400000000001",
                mediaItems: [
                    { type: "IMAGE", url: "https://example.com/img1.jpg" },
                    { type: "IMAGE", url: "https://example.com/img2.jpg" },
                    { type: "VIDEO", url: "https://example.com/vid1.mp4" }
                ],
                caption: "Multi-image post",
                locationId: "loc456"
            });

            expect(mockClient.publishCarousel).toHaveBeenCalledWith(
                "17841400000000001",
                [
                    { type: "IMAGE", url: "https://example.com/img1.jpg" },
                    { type: "IMAGE", url: "https://example.com/img2.jpg" },
                    { type: "VIDEO", url: "https://example.com/vid1.mp4" }
                ],
                "Multi-image post",
                "loc456"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.publishCarousel.mockResolvedValueOnce(mockPublishResponse);
            mockClient.getMedia.mockResolvedValueOnce(mockMedia);

            const result = await executePublishCarousel(mockClient, {
                igAccountId: "17841400000000001",
                mediaItems: [
                    { type: "IMAGE", url: "https://example.com/img1.jpg" },
                    { type: "IMAGE", url: "https://example.com/img2.jpg" }
                ]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                mediaId: "media_carousel_001",
                permalink: "https://instagram.com/p/XYZ789"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.publishCarousel.mockRejectedValueOnce(new Error("Video processing timeout"));

            const result = await executePublishCarousel(mockClient, {
                igAccountId: "17841400000000001",
                mediaItems: [
                    { type: "VIDEO", url: "https://example.com/vid1.mp4" },
                    { type: "VIDEO", url: "https://example.com/vid2.mp4" }
                ]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Video processing timeout");
        });
    });

    describe("executePublishReel", () => {
        const mockPublishResponse = { id: "media_reel_001" };
        const mockMedia: InstagramMedia = {
            id: "media_reel_001",
            media_type: "REELS",
            permalink: "https://instagram.com/reel/DEF456",
            timestamp: "2024-01-15T14:00:00Z"
        };

        it("calls client with correct params", async () => {
            mockClient.publishReel.mockResolvedValueOnce(mockPublishResponse);
            mockClient.getMedia.mockResolvedValueOnce(mockMedia);

            await executePublishReel(mockClient, {
                igAccountId: "17841400000000001",
                videoUrl: "https://example.com/reel.mp4",
                caption: "Check out this reel!",
                shareToFeed: true,
                coverUrl: "https://example.com/cover.jpg",
                thumbOffset: 5000
            });

            expect(mockClient.publishReel).toHaveBeenCalledWith(
                "17841400000000001",
                "https://example.com/reel.mp4",
                "Check out this reel!",
                {
                    shareToFeed: true,
                    coverUrl: "https://example.com/cover.jpg",
                    thumbOffset: 5000
                }
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.publishReel.mockResolvedValueOnce(mockPublishResponse);
            mockClient.getMedia.mockResolvedValueOnce(mockMedia);

            const result = await executePublishReel(mockClient, {
                igAccountId: "17841400000000001",
                videoUrl: "https://example.com/reel.mp4"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                mediaId: "media_reel_001",
                permalink: "https://instagram.com/reel/DEF456"
            });
        });

        it("handles reel without optional params", async () => {
            mockClient.publishReel.mockResolvedValueOnce(mockPublishResponse);
            mockClient.getMedia.mockResolvedValueOnce(mockMedia);

            // When calling executor directly (without schema parsing), optional params are undefined
            await executePublishReel(mockClient, {
                igAccountId: "17841400000000001",
                videoUrl: "https://example.com/reel.mp4"
            });

            expect(mockClient.publishReel).toHaveBeenCalledWith(
                "17841400000000001",
                "https://example.com/reel.mp4",
                undefined,
                {
                    shareToFeed: undefined,
                    coverUrl: undefined,
                    thumbOffset: undefined
                }
            );
        });

        it("uses schema defaults when params are parsed", async () => {
            mockClient.publishReel.mockResolvedValueOnce(mockPublishResponse);
            mockClient.getMedia.mockResolvedValueOnce(mockMedia);

            // When params go through schema parsing, defaults are applied
            const parsedParams = publishReelSchema.parse({
                igAccountId: "17841400000000001",
                videoUrl: "https://example.com/reel.mp4"
            });

            await executePublishReel(mockClient, parsedParams);

            expect(mockClient.publishReel).toHaveBeenCalledWith(
                "17841400000000001",
                "https://example.com/reel.mp4",
                undefined,
                {
                    shareToFeed: true, // default from schema
                    coverUrl: undefined,
                    thumbOffset: undefined
                }
            );
        });

        it("returns error on client failure", async () => {
            mockClient.publishReel.mockRejectedValueOnce(
                new Error("Video duration must be 3-60 seconds")
            );

            const result = await executePublishReel(mockClient, {
                igAccountId: "17841400000000001",
                videoUrl: "https://example.com/too-long.mp4"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Video duration must be 3-60 seconds");
        });
    });

    describe("executePublishStory", () => {
        const mockPublishResponse = { id: "media_story_001" };

        it("calls client with correct params for image story", async () => {
            mockClient.publishStory.mockResolvedValueOnce(mockPublishResponse);

            await executePublishStory(mockClient, {
                igAccountId: "17841400000000001",
                mediaUrl: "https://example.com/story.jpg",
                mediaType: "image"
            });

            expect(mockClient.publishStory).toHaveBeenCalledWith(
                "17841400000000001",
                "https://example.com/story.jpg",
                "image"
            );
        });

        it("calls client with correct params for video story", async () => {
            mockClient.publishStory.mockResolvedValueOnce(mockPublishResponse);

            await executePublishStory(mockClient, {
                igAccountId: "17841400000000001",
                mediaUrl: "https://example.com/story.mp4",
                mediaType: "video"
            });

            expect(mockClient.publishStory).toHaveBeenCalledWith(
                "17841400000000001",
                "https://example.com/story.mp4",
                "video"
            );
        });

        it("returns normalized output on success (no permalink for stories)", async () => {
            mockClient.publishStory.mockResolvedValueOnce(mockPublishResponse);

            const result = await executePublishStory(mockClient, {
                igAccountId: "17841400000000001",
                mediaUrl: "https://example.com/story.jpg",
                mediaType: "image"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                mediaId: "media_story_001"
                // Note: No permalink for stories
            });
        });

        it("returns error on client failure", async () => {
            mockClient.publishStory.mockRejectedValueOnce(new Error("Story upload failed"));

            const result = await executePublishStory(mockClient, {
                igAccountId: "17841400000000001",
                mediaUrl: "https://example.com/story.jpg",
                mediaType: "image"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Story upload failed");
        });
    });

    describe("executeSendTextMessage", () => {
        const mockResponse: InstagramSendMessageResponse = {
            message_id: "m_mid.123456",
            recipient_id: "igsid_user123"
        };

        it("calls client with correct params", async () => {
            mockClient.sendTextMessage.mockResolvedValueOnce(mockResponse);

            await executeSendTextMessage(mockClient, {
                pageId: "page123",
                recipientId: "igsid_user123",
                text: "Hello! How can I help you today?",
                tag: "HUMAN_AGENT"
            });

            expect(mockClient.sendTextMessage).toHaveBeenCalledWith(
                "page123",
                "igsid_user123",
                "Hello! How can I help you today?",
                "HUMAN_AGENT"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.sendTextMessage.mockResolvedValueOnce(mockResponse);

            const result = await executeSendTextMessage(mockClient, {
                pageId: "page123",
                recipientId: "igsid_user123",
                text: "Hello!"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                messageId: "m_mid.123456",
                recipientId: "igsid_user123"
            });
        });

        it("sends message without tag", async () => {
            mockClient.sendTextMessage.mockResolvedValueOnce(mockResponse);

            await executeSendTextMessage(mockClient, {
                pageId: "page123",
                recipientId: "igsid_user123",
                text: "Quick response"
            });

            expect(mockClient.sendTextMessage).toHaveBeenCalledWith(
                "page123",
                "igsid_user123",
                "Quick response",
                undefined
            );
        });

        it("returns error on client failure", async () => {
            mockClient.sendTextMessage.mockRejectedValueOnce(
                new Error("Recipient blocked messages")
            );

            const result = await executeSendTextMessage(mockClient, {
                pageId: "page123",
                recipientId: "blocked_user",
                text: "Hello"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Recipient blocked messages");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeSendMediaMessage", () => {
        const mockResponse: InstagramSendMessageResponse = {
            message_id: "m_mid.789012",
            recipient_id: "igsid_user456"
        };

        it("calls client with correct params for image", async () => {
            mockClient.sendMediaMessage.mockResolvedValueOnce(mockResponse);

            await executeSendMediaMessage(mockClient, {
                pageId: "page123",
                recipientId: "igsid_user456",
                mediaType: "image",
                mediaUrl: "https://example.com/image.jpg"
            });

            expect(mockClient.sendMediaMessage).toHaveBeenCalledWith(
                "page123",
                "igsid_user456",
                "image",
                "https://example.com/image.jpg",
                undefined
            );
        });

        it("calls client with correct params for video with tag", async () => {
            mockClient.sendMediaMessage.mockResolvedValueOnce(mockResponse);

            await executeSendMediaMessage(mockClient, {
                pageId: "page123",
                recipientId: "igsid_user456",
                mediaType: "video",
                mediaUrl: "https://example.com/video.mp4",
                tag: "HUMAN_AGENT"
            });

            expect(mockClient.sendMediaMessage).toHaveBeenCalledWith(
                "page123",
                "igsid_user456",
                "video",
                "https://example.com/video.mp4",
                "HUMAN_AGENT"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.sendMediaMessage.mockResolvedValueOnce(mockResponse);

            const result = await executeSendMediaMessage(mockClient, {
                pageId: "page123",
                recipientId: "igsid_user456",
                mediaType: "audio",
                mediaUrl: "https://example.com/audio.mp3"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                messageId: "m_mid.789012",
                recipientId: "igsid_user456"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.sendMediaMessage.mockRejectedValueOnce(new Error("Invalid media URL"));

            const result = await executeSendMediaMessage(mockClient, {
                pageId: "page123",
                recipientId: "igsid_user456",
                mediaType: "image",
                mediaUrl: "https://invalid.url"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Invalid media URL");
        });
    });

    describe("executeSendQuickReplies", () => {
        const mockResponse: InstagramSendMessageResponse = {
            message_id: "m_mid.345678",
            recipient_id: "igsid_user789"
        };

        it("calls client with correct params", async () => {
            mockClient.sendQuickReplies.mockResolvedValueOnce(mockResponse);

            await executeSendQuickReplies(mockClient, {
                pageId: "page123",
                recipientId: "igsid_user789",
                text: "Choose an option:",
                quickReplies: [
                    { title: "Option A", payload: "OPTION_A" },
                    {
                        title: "Option B",
                        payload: "OPTION_B",
                        imageUrl: "https://example.com/b.png"
                    }
                ]
            });

            expect(mockClient.sendQuickReplies).toHaveBeenCalledWith(
                "page123",
                "igsid_user789",
                "Choose an option:",
                [
                    {
                        content_type: "text",
                        title: "Option A",
                        payload: "OPTION_A",
                        image_url: undefined
                    },
                    {
                        content_type: "text",
                        title: "Option B",
                        payload: "OPTION_B",
                        image_url: "https://example.com/b.png"
                    }
                ],
                undefined
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.sendQuickReplies.mockResolvedValueOnce(mockResponse);

            const result = await executeSendQuickReplies(mockClient, {
                pageId: "page123",
                recipientId: "igsid_user789",
                text: "Select:",
                quickReplies: [{ title: "Yes", payload: "YES" }]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                messageId: "m_mid.345678",
                recipientId: "igsid_user789"
            });
        });

        it("sends with HUMAN_AGENT tag", async () => {
            mockClient.sendQuickReplies.mockResolvedValueOnce(mockResponse);

            await executeSendQuickReplies(mockClient, {
                pageId: "page123",
                recipientId: "igsid_user789",
                text: "Select:",
                quickReplies: [{ title: "Yes", payload: "YES" }],
                tag: "HUMAN_AGENT"
            });

            expect(mockClient.sendQuickReplies).toHaveBeenCalledWith(
                "page123",
                "igsid_user789",
                "Select:",
                [{ content_type: "text", title: "Yes", payload: "YES", image_url: undefined }],
                "HUMAN_AGENT"
            );
        });

        it("returns error on client failure", async () => {
            mockClient.sendQuickReplies.mockRejectedValueOnce(new Error("24h window expired"));

            const result = await executeSendQuickReplies(mockClient, {
                pageId: "page123",
                recipientId: "igsid_user789",
                text: "Select:",
                quickReplies: [{ title: "Option", payload: "OPT" }]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("24h window expired");
        });
    });

    describe("schema validation", () => {
        describe("getAccountInfoSchema", () => {
            it("validates valid input", () => {
                const result = getAccountInfoSchema.safeParse({
                    igAccountId: "17841400000000001"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing igAccountId", () => {
                const result = getAccountInfoSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("getAccountInsightsSchema", () => {
            it("validates minimal input", () => {
                const result = getAccountInsightsSchema.safeParse({
                    igAccountId: "17841400000000001"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = getAccountInsightsSchema.safeParse({
                    igAccountId: "17841400000000001",
                    metrics: ["impressions", "reach"],
                    period: "week"
                });
                expect(result.success).toBe(true);
            });

            it("applies default metrics", () => {
                const result = getAccountInsightsSchema.parse({
                    igAccountId: "17841400000000001"
                });
                expect(result.metrics).toEqual([
                    "impressions",
                    "reach",
                    "follower_count",
                    "profile_views"
                ]);
            });

            it("applies default period", () => {
                const result = getAccountInsightsSchema.parse({
                    igAccountId: "17841400000000001"
                });
                expect(result.period).toBe("day");
            });

            it("rejects invalid period", () => {
                const result = getAccountInsightsSchema.safeParse({
                    igAccountId: "17841400000000001",
                    period: "invalid"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getConversationsSchema", () => {
            it("validates minimal input", () => {
                const result = getConversationsSchema.safeParse({
                    pageId: "page123"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = getConversationsSchema.safeParse({
                    pageId: "page123",
                    limit: 50,
                    after: "cursor123"
                });
                expect(result.success).toBe(true);
            });

            it("applies default limit", () => {
                const result = getConversationsSchema.parse({
                    pageId: "page123"
                });
                expect(result.limit).toBe(20);
            });

            it("rejects limit over 100", () => {
                const result = getConversationsSchema.safeParse({
                    pageId: "page123",
                    limit: 150
                });
                expect(result.success).toBe(false);
            });

            it("rejects limit under 1", () => {
                const result = getConversationsSchema.safeParse({
                    pageId: "page123",
                    limit: 0
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getMessagesSchema", () => {
            it("validates minimal input", () => {
                const result = getMessagesSchema.safeParse({
                    conversationId: "conv123"
                });
                expect(result.success).toBe(true);
            });

            it("applies default limit", () => {
                const result = getMessagesSchema.parse({
                    conversationId: "conv123"
                });
                expect(result.limit).toBe(20);
            });
        });

        describe("getMediaInsightsSchema", () => {
            it("validates minimal input", () => {
                const result = getMediaInsightsSchema.safeParse({
                    mediaId: "media123"
                });
                expect(result.success).toBe(true);
            });

            it("applies default metrics", () => {
                const result = getMediaInsightsSchema.parse({
                    mediaId: "media123"
                });
                expect(result.metrics).toEqual(["engagement", "impressions", "reach", "saved"]);
            });
        });

        describe("publishPhotoSchema", () => {
            it("validates minimal input", () => {
                const result = publishPhotoSchema.safeParse({
                    igAccountId: "17841400000000001",
                    imageUrl: "https://example.com/photo.jpg"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = publishPhotoSchema.safeParse({
                    igAccountId: "17841400000000001",
                    imageUrl: "https://example.com/photo.jpg",
                    caption: "Test caption #hashtag",
                    locationId: "loc123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid URL", () => {
                const result = publishPhotoSchema.safeParse({
                    igAccountId: "17841400000000001",
                    imageUrl: "not-a-url"
                });
                expect(result.success).toBe(false);
            });

            it("rejects caption over 2200 characters", () => {
                const result = publishPhotoSchema.safeParse({
                    igAccountId: "17841400000000001",
                    imageUrl: "https://example.com/photo.jpg",
                    caption: "x".repeat(2201)
                });
                expect(result.success).toBe(false);
            });
        });

        describe("publishCarouselSchema", () => {
            it("validates valid carousel", () => {
                const result = publishCarouselSchema.safeParse({
                    igAccountId: "17841400000000001",
                    mediaItems: [
                        { type: "IMAGE", url: "https://example.com/1.jpg" },
                        { type: "IMAGE", url: "https://example.com/2.jpg" }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("rejects carousel with 1 item", () => {
                const result = publishCarouselSchema.safeParse({
                    igAccountId: "17841400000000001",
                    mediaItems: [{ type: "IMAGE", url: "https://example.com/1.jpg" }]
                });
                expect(result.success).toBe(false);
            });

            it("rejects carousel with 11 items", () => {
                const items = Array.from({ length: 11 }, (_, i) => ({
                    type: "IMAGE" as const,
                    url: `https://example.com/${i}.jpg`
                }));
                const result = publishCarouselSchema.safeParse({
                    igAccountId: "17841400000000001",
                    mediaItems: items
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid media type", () => {
                const result = publishCarouselSchema.safeParse({
                    igAccountId: "17841400000000001",
                    mediaItems: [
                        { type: "AUDIO", url: "https://example.com/1.mp3" },
                        { type: "IMAGE", url: "https://example.com/2.jpg" }
                    ]
                });
                expect(result.success).toBe(false);
            });
        });

        describe("publishReelSchema", () => {
            it("validates minimal input", () => {
                const result = publishReelSchema.safeParse({
                    igAccountId: "17841400000000001",
                    videoUrl: "https://example.com/reel.mp4"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = publishReelSchema.safeParse({
                    igAccountId: "17841400000000001",
                    videoUrl: "https://example.com/reel.mp4",
                    caption: "Check this out!",
                    shareToFeed: false,
                    coverUrl: "https://example.com/cover.jpg",
                    thumbOffset: 5000
                });
                expect(result.success).toBe(true);
            });

            it("applies default shareToFeed", () => {
                const result = publishReelSchema.parse({
                    igAccountId: "17841400000000001",
                    videoUrl: "https://example.com/reel.mp4"
                });
                expect(result.shareToFeed).toBe(true);
            });

            it("rejects negative thumbOffset", () => {
                const result = publishReelSchema.safeParse({
                    igAccountId: "17841400000000001",
                    videoUrl: "https://example.com/reel.mp4",
                    thumbOffset: -100
                });
                expect(result.success).toBe(false);
            });
        });

        describe("publishStorySchema", () => {
            it("validates image story", () => {
                const result = publishStorySchema.safeParse({
                    igAccountId: "17841400000000001",
                    mediaUrl: "https://example.com/story.jpg",
                    mediaType: "image"
                });
                expect(result.success).toBe(true);
            });

            it("validates video story", () => {
                const result = publishStorySchema.safeParse({
                    igAccountId: "17841400000000001",
                    mediaUrl: "https://example.com/story.mp4",
                    mediaType: "video"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid mediaType", () => {
                const result = publishStorySchema.safeParse({
                    igAccountId: "17841400000000001",
                    mediaUrl: "https://example.com/story.gif",
                    mediaType: "gif"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("sendTextMessageSchema", () => {
            it("validates minimal input", () => {
                const result = sendTextMessageSchema.safeParse({
                    pageId: "page123",
                    recipientId: "igsid_user123",
                    text: "Hello"
                });
                expect(result.success).toBe(true);
            });

            it("validates with HUMAN_AGENT tag", () => {
                const result = sendTextMessageSchema.safeParse({
                    pageId: "page123",
                    recipientId: "igsid_user123",
                    text: "Hello",
                    tag: "HUMAN_AGENT"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty text", () => {
                const result = sendTextMessageSchema.safeParse({
                    pageId: "page123",
                    recipientId: "igsid_user123",
                    text: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects text over 1000 characters", () => {
                const result = sendTextMessageSchema.safeParse({
                    pageId: "page123",
                    recipientId: "igsid_user123",
                    text: "x".repeat(1001)
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid tag", () => {
                const result = sendTextMessageSchema.safeParse({
                    pageId: "page123",
                    recipientId: "igsid_user123",
                    text: "Hello",
                    tag: "INVALID_TAG"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("sendMediaMessageSchema", () => {
            it("validates image message", () => {
                const result = sendMediaMessageSchema.safeParse({
                    pageId: "page123",
                    recipientId: "igsid_user123",
                    mediaType: "image",
                    mediaUrl: "https://example.com/image.jpg"
                });
                expect(result.success).toBe(true);
            });

            it("validates video message", () => {
                const result = sendMediaMessageSchema.safeParse({
                    pageId: "page123",
                    recipientId: "igsid_user123",
                    mediaType: "video",
                    mediaUrl: "https://example.com/video.mp4"
                });
                expect(result.success).toBe(true);
            });

            it("validates audio message", () => {
                const result = sendMediaMessageSchema.safeParse({
                    pageId: "page123",
                    recipientId: "igsid_user123",
                    mediaType: "audio",
                    mediaUrl: "https://example.com/audio.mp3"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid mediaType", () => {
                const result = sendMediaMessageSchema.safeParse({
                    pageId: "page123",
                    recipientId: "igsid_user123",
                    mediaType: "file",
                    mediaUrl: "https://example.com/doc.pdf"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid URL", () => {
                const result = sendMediaMessageSchema.safeParse({
                    pageId: "page123",
                    recipientId: "igsid_user123",
                    mediaType: "image",
                    mediaUrl: "not-a-url"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("sendQuickRepliesSchema", () => {
            it("validates minimal quick replies", () => {
                const result = sendQuickRepliesSchema.safeParse({
                    pageId: "page123",
                    recipientId: "igsid_user123",
                    text: "Choose:",
                    quickReplies: [{ title: "Yes", payload: "YES" }]
                });
                expect(result.success).toBe(true);
            });

            it("validates quick replies with image", () => {
                const result = sendQuickRepliesSchema.safeParse({
                    pageId: "page123",
                    recipientId: "igsid_user123",
                    text: "Choose:",
                    quickReplies: [
                        {
                            title: "Option",
                            payload: "OPT",
                            imageUrl: "https://example.com/icon.png"
                        }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty quickReplies array", () => {
                const result = sendQuickRepliesSchema.safeParse({
                    pageId: "page123",
                    recipientId: "igsid_user123",
                    text: "Choose:",
                    quickReplies: []
                });
                expect(result.success).toBe(false);
            });

            it("rejects more than 13 quick replies", () => {
                const quickReplies = Array.from({ length: 14 }, (_, i) => ({
                    title: `Opt${i}`,
                    payload: `OPT_${i}`
                }));
                const result = sendQuickRepliesSchema.safeParse({
                    pageId: "page123",
                    recipientId: "igsid_user123",
                    text: "Choose:",
                    quickReplies
                });
                expect(result.success).toBe(false);
            });

            it("rejects title over 20 characters", () => {
                const result = sendQuickRepliesSchema.safeParse({
                    pageId: "page123",
                    recipientId: "igsid_user123",
                    text: "Choose:",
                    quickReplies: [{ title: "x".repeat(21), payload: "OPT" }]
                });
                expect(result.success).toBe(false);
            });

            it("rejects payload over 1000 characters", () => {
                const result = sendQuickRepliesSchema.safeParse({
                    pageId: "page123",
                    recipientId: "igsid_user123",
                    text: "Choose:",
                    quickReplies: [{ title: "Option", payload: "x".repeat(1001) }]
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
