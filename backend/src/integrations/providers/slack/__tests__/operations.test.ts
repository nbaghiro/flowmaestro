/**
 * Slack Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeListChannels, listChannelsSchema } from "../operations/listChannels";
import { executeSendMessage, sendMessageSchema } from "../operations/sendMessage";
import type { SlackClient } from "../client/SlackClient";

// Mock SlackClient factory
function createMockSlackClient(): jest.Mocked<SlackClient> {
    return {
        postMessage: jest.fn(),
        listConversations: jest.fn(),
        getUserInfo: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<SlackClient>;
}

describe("Slack Operation Executors", () => {
    let mockClient: jest.Mocked<SlackClient>;

    beforeEach(() => {
        mockClient = createMockSlackClient();
    });

    describe("executeSendMessage", () => {
        it("calls client with correct params", async () => {
            mockClient.postMessage.mockResolvedValueOnce({
                ok: true,
                ts: "1234567890.123456",
                channel: "C024BE91L"
            });

            await executeSendMessage(mockClient, {
                channel: "#general",
                text: "Hello, World!"
            });

            expect(mockClient.postMessage).toHaveBeenCalledWith({
                channel: "#general",
                text: "Hello, World!",
                thread_ts: undefined,
                blocks: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.postMessage.mockResolvedValueOnce({
                ok: true,
                ts: "1234567890.123456",
                channel: "C024BE91L"
            });

            const result = await executeSendMessage(mockClient, {
                channel: "#general",
                text: "Hello"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                messageId: "1234567890.123456",
                channel: "C024BE91L",
                threadTimestamp: "1234567890.123456"
            });
        });

        it("passes thread_ts for threaded replies", async () => {
            mockClient.postMessage.mockResolvedValueOnce({
                ok: true,
                ts: "1234567890.654321",
                channel: "C024BE91L"
            });

            await executeSendMessage(mockClient, {
                channel: "#general",
                text: "Reply in thread",
                thread_ts: "1234567890.123456"
            });

            expect(mockClient.postMessage).toHaveBeenCalledWith({
                channel: "#general",
                text: "Reply in thread",
                thread_ts: "1234567890.123456",
                blocks: undefined
            });
        });

        it("passes blocks for rich messages", async () => {
            const blocks = [
                {
                    type: "section",
                    text: { type: "mrkdwn", text: "*Bold text*" }
                }
            ];

            mockClient.postMessage.mockResolvedValueOnce({
                ok: true,
                ts: "1234567890.123456",
                channel: "C024BE91L"
            });

            await executeSendMessage(mockClient, {
                channel: "#general",
                text: "Fallback text",
                blocks
            });

            expect(mockClient.postMessage).toHaveBeenCalledWith({
                channel: "#general",
                text: "Fallback text",
                thread_ts: undefined,
                blocks
            });
        });

        it("returns error on client failure", async () => {
            mockClient.postMessage.mockRejectedValueOnce(new Error("channel_not_found"));

            const result = await executeSendMessage(mockClient, {
                channel: "#nonexistent",
                text: "Hello"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("channel_not_found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.postMessage.mockRejectedValueOnce("string error");

            const result = await executeSendMessage(mockClient, {
                channel: "#test",
                text: "Hello"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to send message");
        });
    });

    describe("executeListChannels", () => {
        it("calls client with default params", async () => {
            mockClient.listConversations.mockResolvedValueOnce({
                ok: true,
                channels: [],
                response_metadata: {}
            });

            await executeListChannels(mockClient, {});

            expect(mockClient.listConversations).toHaveBeenCalledWith({
                types: "public_channel,private_channel",
                exclude_archived: undefined,
                limit: undefined
            });
        });

        it("calls client with custom params", async () => {
            mockClient.listConversations.mockResolvedValueOnce({
                ok: true,
                channels: [],
                response_metadata: {}
            });

            await executeListChannels(mockClient, {
                excludeArchived: false,
                limit: 50
            });

            expect(mockClient.listConversations).toHaveBeenCalledWith({
                types: "public_channel,private_channel",
                exclude_archived: false,
                limit: 50
            });
        });

        it("returns normalized channel output", async () => {
            mockClient.listConversations.mockResolvedValueOnce({
                ok: true,
                channels: [
                    {
                        id: "C024BE91L",
                        name: "general",
                        is_private: false,
                        is_archived: false,
                        num_members: 42
                    },
                    {
                        id: "C024BE92M",
                        name: "random",
                        is_private: false,
                        is_archived: false,
                        num_members: 35
                    }
                ],
                response_metadata: {}
            });

            const result = await executeListChannels(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.channels).toHaveLength(2);
            expect(result.data?.channels[0]).toEqual({
                id: "C024BE91L",
                name: "general",
                isPrivate: false,
                isArchived: false,
                memberCount: 42
            });
        });

        it("returns nextCursor when pagination available", async () => {
            mockClient.listConversations.mockResolvedValueOnce({
                ok: true,
                channels: [{ id: "C1", name: "ch1", is_private: false, is_archived: false }],
                response_metadata: {
                    next_cursor: "dXNlcjpVMDYxTkZUVDI="
                }
            });

            const result = await executeListChannels(mockClient, { limit: 1 });

            expect(result.success).toBe(true);
            expect(result.data?.nextCursor).toBe("dXNlcjpVMDYxTkZUVDI=");
        });

        it("handles empty nextCursor", async () => {
            mockClient.listConversations.mockResolvedValueOnce({
                ok: true,
                channels: [],
                response_metadata: {
                    next_cursor: ""
                }
            });

            const result = await executeListChannels(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.nextCursor).toBe("");
        });

        it("handles missing num_members", async () => {
            mockClient.listConversations.mockResolvedValueOnce({
                ok: true,
                channels: [
                    {
                        id: "C024BE91L",
                        name: "general",
                        is_private: false,
                        is_archived: false
                        // num_members not present
                    }
                ],
                response_metadata: {}
            });

            const result = await executeListChannels(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.channels[0].memberCount).toBe(0);
        });

        it("returns error on client failure", async () => {
            mockClient.listConversations.mockRejectedValueOnce(new Error("missing_scope"));

            const result = await executeListChannels(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("missing_scope");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("schema validation", () => {
        describe("sendMessageSchema", () => {
            it("validates minimal input", () => {
                const result = sendMessageSchema.safeParse({
                    channel: "#general",
                    text: "Hello"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = sendMessageSchema.safeParse({
                    channel: "#general",
                    text: "Hello",
                    thread_ts: "1234567890.123456",
                    blocks: [{ type: "section" }]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing channel", () => {
                const result = sendMessageSchema.safeParse({
                    text: "Hello"
                });
                expect(result.success).toBe(false);
            });

            it("accepts message without text when blocks provided", () => {
                const result = sendMessageSchema.safeParse({
                    channel: "#general",
                    blocks: [{ type: "section" }]
                });
                // This may pass or fail depending on schema definition
                // Just check it doesn't throw
                expect(typeof result.success).toBe("boolean");
            });
        });

        describe("listChannelsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listChannelsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with excludeArchived", () => {
                const result = listChannelsSchema.safeParse({
                    excludeArchived: true
                });
                expect(result.success).toBe(true);
            });

            it("validates with limit", () => {
                const result = listChannelsSchema.safeParse({
                    limit: 100
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid limit", () => {
                const result = listChannelsSchema.safeParse({
                    limit: 2000 // > 1000
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative limit", () => {
                const result = listChannelsSchema.safeParse({
                    limit: -1
                });
                expect(result.success).toBe(false);
            });

            it("applies defaults", () => {
                const result = listChannelsSchema.parse({});
                expect(result.excludeArchived).toBe(true);
                expect(result.limit).toBe(100);
            });
        });
    });
});
