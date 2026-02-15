/**
 * Discord Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { DiscordChannelType } from "@flowmaestro/shared";
import { executeCreateWebhook, createWebhookSchema } from "../operations/createWebhook";
import { executeExecuteWebhook, executeWebhookSchema } from "../operations/executeWebhook";
import { executeListChannels, listChannelsSchema } from "../operations/listChannels";
import { executeListGuilds, listGuildsSchema } from "../operations/listGuilds";
import { executeSendMessage, sendMessageSchema } from "../operations/sendMessage";
import type { DiscordClient } from "../client/DiscordClient";

// Mock DiscordClient factory
function createMockDiscordClient(): jest.Mocked<DiscordClient> {
    return {
        // Bot request methods
        botRequest: jest.fn(),
        userRequest: jest.fn(),
        // User operations
        getCurrentUser: jest.fn(),
        getCurrentUserGuilds: jest.fn(),
        // Guild operations
        getGuildChannels: jest.fn(),
        getGuildTextChannels: jest.fn(),
        getGuild: jest.fn(),
        // Channel operations
        getChannel: jest.fn(),
        sendMessage: jest.fn(),
        sendTextMessage: jest.fn(),
        sendEmbedMessage: jest.fn(),
        // Webhook operations
        createWebhook: jest.fn(),
        getChannelWebhooks: jest.fn(),
        getGuildWebhooks: jest.fn(),
        deleteWebhook: jest.fn(),
        executeWebhook: jest.fn(),
        executeWebhookText: jest.fn(),
        executeWebhookEmbed: jest.fn(),
        // BaseAPIClient methods
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<DiscordClient>;
}

describe("Discord Operation Executors", () => {
    let mockClient: jest.Mocked<DiscordClient>;

    beforeEach(() => {
        mockClient = createMockDiscordClient();
    });

    describe("executeSendMessage", () => {
        it("calls client with correct params", async () => {
            mockClient.sendMessage.mockResolvedValueOnce({
                id: "1234567890123456789",
                channel_id: "9876543210987654321",
                guild_id: "1111111111111111111",
                content: "Hello, Discord!",
                timestamp: "2024-01-15T12:00:00.000Z"
            });

            await executeSendMessage(mockClient, {
                channelId: "9876543210987654321",
                content: "Hello, Discord!"
            });

            expect(mockClient.sendMessage).toHaveBeenCalledWith("9876543210987654321", {
                content: "Hello, Discord!",
                embeds: undefined,
                tts: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.sendMessage.mockResolvedValueOnce({
                id: "1234567890123456789",
                channel_id: "9876543210987654321",
                guild_id: "1111111111111111111",
                content: "Hello, Discord!",
                timestamp: "2024-01-15T12:00:00.000Z"
            });

            const result = await executeSendMessage(mockClient, {
                channelId: "9876543210987654321",
                content: "Hello"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                messageId: "1234567890123456789",
                channelId: "9876543210987654321",
                guildId: "1111111111111111111",
                timestamp: "2024-01-15T12:00:00.000Z"
            });
        });

        it("passes embeds for rich messages", async () => {
            const embeds = [
                {
                    title: "Test Embed",
                    description: "This is a test embed",
                    color: 0x5865f2
                }
            ];

            mockClient.sendMessage.mockResolvedValueOnce({
                id: "1234567890123456789",
                channel_id: "9876543210987654321",
                content: "",
                timestamp: "2024-01-15T12:00:00.000Z"
            });

            await executeSendMessage(mockClient, {
                channelId: "9876543210987654321",
                embeds
            });

            expect(mockClient.sendMessage).toHaveBeenCalledWith("9876543210987654321", {
                content: undefined,
                embeds,
                tts: undefined
            });
        });

        it("passes tts flag when enabled", async () => {
            mockClient.sendMessage.mockResolvedValueOnce({
                id: "1234567890123456789",
                channel_id: "9876543210987654321",
                content: "TTS message",
                timestamp: "2024-01-15T12:00:00.000Z"
            });

            await executeSendMessage(mockClient, {
                channelId: "9876543210987654321",
                content: "TTS message",
                tts: true
            });

            expect(mockClient.sendMessage).toHaveBeenCalledWith("9876543210987654321", {
                content: "TTS message",
                embeds: undefined,
                tts: true
            });
        });

        it("returns validation error when no content or embeds provided", async () => {
            const result = await executeSendMessage(mockClient, {
                channelId: "9876543210987654321"
            });

            expect(result.success).toBe(false);
            expect(result.error).toEqual({
                type: "validation",
                message: "Message must have either content or embeds",
                retryable: false
            });
            expect(mockClient.sendMessage).not.toHaveBeenCalled();
        });

        it("returns error on client failure", async () => {
            mockClient.sendMessage.mockRejectedValueOnce(
                new Error("Missing permissions. The bot doesn't have the required permissions.")
            );

            const result = await executeSendMessage(mockClient, {
                channelId: "9876543210987654321",
                content: "Hello"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Missing permissions. The bot doesn't have the required permissions."
            );
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.sendMessage.mockRejectedValueOnce("string error");

            const result = await executeSendMessage(mockClient, {
                channelId: "9876543210987654321",
                content: "Hello"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to send message");
        });
    });

    describe("executeListGuilds", () => {
        it("calls client getCurrentUserGuilds", async () => {
            mockClient.getCurrentUserGuilds.mockResolvedValueOnce([]);

            await executeListGuilds(mockClient, {});

            expect(mockClient.getCurrentUserGuilds).toHaveBeenCalled();
        });

        it("returns normalized guild output", async () => {
            mockClient.getCurrentUserGuilds.mockResolvedValueOnce([
                {
                    id: "1111111111111111111",
                    name: "Test Server",
                    icon: "a_abc123",
                    owner: true,
                    permissions: "2147483647",
                    features: ["COMMUNITY"]
                },
                {
                    id: "2222222222222222222",
                    name: "Another Server",
                    icon: null,
                    owner: false,
                    permissions: "1024",
                    features: []
                }
            ]);

            const result = await executeListGuilds(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.guilds).toHaveLength(2);
            expect(result.data?.guilds[0]).toEqual({
                id: "1111111111111111111",
                name: "Test Server",
                icon: "a_abc123",
                owner: true,
                permissions: "2147483647"
            });
            expect(result.data?.count).toBe(2);
        });

        it("returns empty list when user has no guilds", async () => {
            mockClient.getCurrentUserGuilds.mockResolvedValueOnce([]);

            const result = await executeListGuilds(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.guilds).toEqual([]);
            expect(result.data?.count).toBe(0);
        });

        it("returns error on client failure", async () => {
            mockClient.getCurrentUserGuilds.mockRejectedValueOnce(
                new Error("No access token available for user request")
            );

            const result = await executeListGuilds(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("No access token available for user request");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListChannels", () => {
        it("calls client with textOnly true", async () => {
            mockClient.getGuildTextChannels.mockResolvedValueOnce([]);

            await executeListChannels(mockClient, {
                guildId: "1111111111111111111",
                textOnly: true
            });

            expect(mockClient.getGuildTextChannels).toHaveBeenCalledWith("1111111111111111111");
            expect(mockClient.getGuildChannels).not.toHaveBeenCalled();
        });

        it("calls getGuildChannels when textOnly is false", async () => {
            mockClient.getGuildChannels.mockResolvedValueOnce([]);

            await executeListChannels(mockClient, {
                guildId: "1111111111111111111",
                textOnly: false
            });

            expect(mockClient.getGuildChannels).toHaveBeenCalledWith("1111111111111111111");
            expect(mockClient.getGuildTextChannels).not.toHaveBeenCalled();
        });

        it("returns normalized channel output sorted by position", async () => {
            mockClient.getGuildTextChannels.mockResolvedValueOnce([
                {
                    id: "3333333333333333333",
                    name: "random",
                    type: DiscordChannelType.GUILD_TEXT,
                    position: 2,
                    parent_id: "0000000000000000000",
                    topic: "Random discussions"
                },
                {
                    id: "4444444444444444444",
                    name: "general",
                    type: DiscordChannelType.GUILD_TEXT,
                    position: 0,
                    parent_id: "0000000000000000000",
                    topic: "General chat"
                },
                {
                    id: "5555555555555555555",
                    name: "announcements",
                    type: DiscordChannelType.GUILD_ANNOUNCEMENT,
                    position: 1,
                    parent_id: null,
                    topic: "Important announcements"
                }
            ]);

            const result = await executeListChannels(mockClient, {
                guildId: "1111111111111111111",
                textOnly: true
            });

            expect(result.success).toBe(true);
            expect(result.data?.channels).toHaveLength(3);
            // Should be sorted by position
            expect(result.data?.channels[0].name).toBe("general");
            expect(result.data?.channels[1].name).toBe("announcements");
            expect(result.data?.channels[2].name).toBe("random");
            expect(result.data?.channels[0]).toEqual({
                id: "4444444444444444444",
                name: "general",
                type: DiscordChannelType.GUILD_TEXT,
                typeName: "text",
                position: 0,
                parentId: "0000000000000000000",
                topic: "General chat"
            });
            expect(result.data?.count).toBe(3);
            expect(result.data?.guildId).toBe("1111111111111111111");
        });

        it("maps channel types to type names correctly", async () => {
            mockClient.getGuildChannels.mockResolvedValueOnce([
                {
                    id: "1",
                    name: "text-channel",
                    type: DiscordChannelType.GUILD_TEXT,
                    position: 0
                },
                {
                    id: "2",
                    name: "voice-channel",
                    type: DiscordChannelType.GUILD_VOICE,
                    position: 1
                },
                {
                    id: "3",
                    name: "category",
                    type: DiscordChannelType.GUILD_CATEGORY,
                    position: 2
                },
                {
                    id: "4",
                    name: "announcements",
                    type: DiscordChannelType.GUILD_ANNOUNCEMENT,
                    position: 3
                },
                {
                    id: "5",
                    name: "stage",
                    type: DiscordChannelType.GUILD_STAGE_VOICE,
                    position: 4
                },
                {
                    id: "6",
                    name: "forum",
                    type: DiscordChannelType.GUILD_FORUM,
                    position: 5
                }
            ]);

            const result = await executeListChannels(mockClient, {
                guildId: "1111111111111111111",
                textOnly: false
            });

            expect(result.success).toBe(true);
            expect(result.data?.channels[0].typeName).toBe("text");
            expect(result.data?.channels[1].typeName).toBe("voice");
            expect(result.data?.channels[2].typeName).toBe("category");
            expect(result.data?.channels[3].typeName).toBe("announcement");
            expect(result.data?.channels[4].typeName).toBe("stage");
            expect(result.data?.channels[5].typeName).toBe("forum");
        });

        it("returns error on client failure", async () => {
            mockClient.getGuildTextChannels.mockRejectedValueOnce(
                new Error("Unknown guild. The server may have been deleted.")
            );

            const result = await executeListChannels(mockClient, {
                guildId: "1111111111111111111",
                textOnly: true
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Unknown guild. The server may have been deleted.");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeCreateWebhook", () => {
        it("calls client with correct params", async () => {
            mockClient.createWebhook.mockResolvedValueOnce({
                id: "7777777777777777777",
                type: 1,
                guild_id: "1111111111111111111",
                channel_id: "9876543210987654321",
                name: "FlowMaestro Webhook",
                avatar: null,
                token: "webhook_token_abc123",
                application_id: null
            });

            await executeCreateWebhook(mockClient, {
                channelId: "9876543210987654321",
                name: "FlowMaestro Webhook"
            });

            expect(mockClient.createWebhook).toHaveBeenCalledWith(
                "9876543210987654321",
                "FlowMaestro Webhook",
                undefined
            );
        });

        it("passes avatar when provided", async () => {
            mockClient.createWebhook.mockResolvedValueOnce({
                id: "7777777777777777777",
                type: 1,
                channel_id: "9876543210987654321",
                name: "Custom Webhook",
                avatar: "abc123",
                token: "webhook_token_abc123",
                application_id: null
            });

            await executeCreateWebhook(mockClient, {
                channelId: "9876543210987654321",
                name: "Custom Webhook",
                avatar: "data:image/png;base64,iVBORw0KGgo..."
            });

            expect(mockClient.createWebhook).toHaveBeenCalledWith(
                "9876543210987654321",
                "Custom Webhook",
                "data:image/png;base64,iVBORw0KGgo..."
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.createWebhook.mockResolvedValueOnce({
                id: "7777777777777777777",
                type: 1,
                guild_id: "1111111111111111111",
                channel_id: "9876543210987654321",
                name: "FlowMaestro Webhook",
                avatar: null,
                token: "webhook_token_abc123",
                application_id: null,
                url: "https://discord.com/api/webhooks/7777777777777777777/webhook_token_abc123"
            });

            const result = await executeCreateWebhook(mockClient, {
                channelId: "9876543210987654321",
                name: "FlowMaestro Webhook"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                webhookId: "7777777777777777777",
                webhookToken: "webhook_token_abc123",
                webhookUrl:
                    "https://discord.com/api/webhooks/7777777777777777777/webhook_token_abc123",
                channelId: "9876543210987654321",
                guildId: "1111111111111111111",
                name: "FlowMaestro Webhook"
            });
        });

        it("constructs webhookUrl when not provided by API", async () => {
            mockClient.createWebhook.mockResolvedValueOnce({
                id: "7777777777777777777",
                type: 1,
                channel_id: "9876543210987654321",
                name: "FlowMaestro Webhook",
                avatar: null,
                token: "webhook_token_abc123",
                application_id: null
                // No url field
            });

            const result = await executeCreateWebhook(mockClient, {
                channelId: "9876543210987654321",
                name: "FlowMaestro Webhook"
            });

            expect(result.success).toBe(true);
            expect(result.data?.webhookUrl).toBe(
                "https://discord.com/api/webhooks/7777777777777777777/webhook_token_abc123"
            );
        });

        it("returns error on client failure", async () => {
            mockClient.createWebhook.mockRejectedValueOnce(
                new Error("Missing permissions. The bot doesn't have the required permissions.")
            );

            const result = await executeCreateWebhook(mockClient, {
                channelId: "9876543210987654321",
                name: "Test Webhook"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Missing permissions. The bot doesn't have the required permissions."
            );
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeExecuteWebhook", () => {
        const validWebhookUrl =
            "https://discord.com/api/webhooks/7777777777777777777/webhook_token_abc123";

        it("calls client with correct params", async () => {
            mockClient.executeWebhook.mockResolvedValueOnce({
                id: "8888888888888888888"
            });

            await executeExecuteWebhook(mockClient, {
                webhookUrl: validWebhookUrl,
                content: "Hello from webhook!"
            });

            expect(mockClient.executeWebhook).toHaveBeenCalledWith(validWebhookUrl, {
                content: "Hello from webhook!",
                username: undefined,
                avatar_url: undefined,
                embeds: undefined,
                tts: undefined
            });
        });

        it("passes optional params when provided", async () => {
            const embeds = [
                {
                    title: "Webhook Embed",
                    description: "Test description",
                    color: 0xff0000
                }
            ];

            mockClient.executeWebhook.mockResolvedValueOnce({
                id: "8888888888888888888"
            });

            await executeExecuteWebhook(mockClient, {
                webhookUrl: validWebhookUrl,
                content: "Message content",
                username: "Custom Bot",
                avatarUrl: "https://example.com/avatar.png",
                embeds,
                tts: true
            });

            expect(mockClient.executeWebhook).toHaveBeenCalledWith(validWebhookUrl, {
                content: "Message content",
                username: "Custom Bot",
                avatar_url: "https://example.com/avatar.png",
                embeds,
                tts: true
            });
        });

        it("returns normalized output on success with message ID", async () => {
            mockClient.executeWebhook.mockResolvedValueOnce({
                id: "8888888888888888888"
            });

            const result = await executeExecuteWebhook(mockClient, {
                webhookUrl: validWebhookUrl,
                content: "Test message"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                messageId: "8888888888888888888",
                webhookExecuted: true
            });
        });

        it("returns success without messageId when webhook returns void", async () => {
            mockClient.executeWebhook.mockResolvedValueOnce(undefined);

            const result = await executeExecuteWebhook(mockClient, {
                webhookUrl: validWebhookUrl,
                content: "Test message"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                messageId: undefined,
                webhookExecuted: true
            });
        });

        it("returns validation error when no content or embeds provided", async () => {
            const result = await executeExecuteWebhook(mockClient, {
                webhookUrl: validWebhookUrl
            });

            expect(result.success).toBe(false);
            expect(result.error).toEqual({
                type: "validation",
                message: "Webhook message must have either content or embeds",
                retryable: false
            });
            expect(mockClient.executeWebhook).not.toHaveBeenCalled();
        });

        it("accepts embeds without content", async () => {
            mockClient.executeWebhook.mockResolvedValueOnce({
                id: "8888888888888888888"
            });

            const result = await executeExecuteWebhook(mockClient, {
                webhookUrl: validWebhookUrl,
                embeds: [{ title: "Embed Only" }]
            });

            expect(result.success).toBe(true);
            expect(mockClient.executeWebhook).toHaveBeenCalled();
        });

        it("returns error on client failure", async () => {
            mockClient.executeWebhook.mockRejectedValueOnce(
                new Error("Webhook execution failed: Unknown Webhook")
            );

            const result = await executeExecuteWebhook(mockClient, {
                webhookUrl: validWebhookUrl,
                content: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Webhook execution failed: Unknown Webhook");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("schema validation", () => {
        describe("sendMessageSchema", () => {
            it("validates minimal input with content", () => {
                const result = sendMessageSchema.safeParse({
                    channelId: "1234567890123456789",
                    content: "Hello"
                });
                expect(result.success).toBe(true);
            });

            it("validates minimal input with embeds", () => {
                const result = sendMessageSchema.safeParse({
                    channelId: "1234567890123456789",
                    embeds: [{ title: "Test" }]
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = sendMessageSchema.safeParse({
                    channelId: "1234567890123456789",
                    content: "Hello",
                    embeds: [
                        {
                            title: "Test",
                            description: "Description",
                            color: 0x5865f2,
                            fields: [{ name: "Field", value: "Value", inline: true }]
                        }
                    ],
                    tts: true
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing channelId", () => {
                const result = sendMessageSchema.safeParse({
                    content: "Hello"
                });
                expect(result.success).toBe(false);
            });

            it("rejects non-numeric channelId", () => {
                const result = sendMessageSchema.safeParse({
                    channelId: "invalid-channel-id",
                    content: "Hello"
                });
                expect(result.success).toBe(false);
            });

            it("rejects content over 2000 characters", () => {
                const result = sendMessageSchema.safeParse({
                    channelId: "1234567890123456789",
                    content: "x".repeat(2001)
                });
                expect(result.success).toBe(false);
            });

            it("rejects more than 10 embeds", () => {
                const result = sendMessageSchema.safeParse({
                    channelId: "1234567890123456789",
                    embeds: Array(11).fill({ title: "Test" })
                });
                expect(result.success).toBe(false);
            });

            it("applies default tts as false", () => {
                const result = sendMessageSchema.parse({
                    channelId: "1234567890123456789",
                    content: "Hello"
                });
                expect(result.tts).toBe(false);
            });
        });

        describe("listGuildsSchema", () => {
            it("validates empty input (no params needed)", () => {
                const result = listGuildsSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("listChannelsSchema", () => {
            it("validates minimal input", () => {
                const result = listChannelsSchema.safeParse({
                    guildId: "1234567890123456789"
                });
                expect(result.success).toBe(true);
            });

            it("validates with textOnly option", () => {
                const result = listChannelsSchema.safeParse({
                    guildId: "1234567890123456789",
                    textOnly: false
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing guildId", () => {
                const result = listChannelsSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects non-numeric guildId", () => {
                const result = listChannelsSchema.safeParse({
                    guildId: "invalid-guild-id"
                });
                expect(result.success).toBe(false);
            });

            it("applies default textOnly as true", () => {
                const result = listChannelsSchema.parse({
                    guildId: "1234567890123456789"
                });
                expect(result.textOnly).toBe(true);
            });
        });

        describe("createWebhookSchema", () => {
            it("validates minimal input", () => {
                const result = createWebhookSchema.safeParse({
                    channelId: "1234567890123456789",
                    name: "Test Webhook"
                });
                expect(result.success).toBe(true);
            });

            it("validates with avatar", () => {
                const result = createWebhookSchema.safeParse({
                    channelId: "1234567890123456789",
                    name: "Test Webhook",
                    avatar: "data:image/png;base64,..."
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing channelId", () => {
                const result = createWebhookSchema.safeParse({
                    name: "Test Webhook"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing name", () => {
                const result = createWebhookSchema.safeParse({
                    channelId: "1234567890123456789"
                });
                expect(result.success).toBe(false);
            });

            it("rejects non-numeric channelId", () => {
                const result = createWebhookSchema.safeParse({
                    channelId: "invalid",
                    name: "Test"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty name", () => {
                const result = createWebhookSchema.safeParse({
                    channelId: "1234567890123456789",
                    name: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects name over 80 characters", () => {
                const result = createWebhookSchema.safeParse({
                    channelId: "1234567890123456789",
                    name: "x".repeat(81)
                });
                expect(result.success).toBe(false);
            });
        });

        describe("executeWebhookSchema", () => {
            const validWebhookUrl =
                "https://discord.com/api/webhooks/1234567890123456789/token_abc123";

            it("validates minimal input with content", () => {
                const result = executeWebhookSchema.safeParse({
                    webhookUrl: validWebhookUrl,
                    content: "Hello"
                });
                expect(result.success).toBe(true);
            });

            it("validates minimal input with embeds", () => {
                const result = executeWebhookSchema.safeParse({
                    webhookUrl: validWebhookUrl,
                    embeds: [{ title: "Test" }]
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = executeWebhookSchema.safeParse({
                    webhookUrl: validWebhookUrl,
                    content: "Hello",
                    username: "Custom Bot",
                    avatarUrl: "https://example.com/avatar.png",
                    embeds: [{ title: "Test", description: "Description" }],
                    tts: true
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing webhookUrl", () => {
                const result = executeWebhookSchema.safeParse({
                    content: "Hello"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid webhookUrl format", () => {
                const result = executeWebhookSchema.safeParse({
                    webhookUrl: "https://example.com/not-a-webhook",
                    content: "Hello"
                });
                expect(result.success).toBe(false);
            });

            it("rejects non-discord webhookUrl", () => {
                const result = executeWebhookSchema.safeParse({
                    webhookUrl: "https://slack.com/api/webhooks/123/token",
                    content: "Hello"
                });
                expect(result.success).toBe(false);
            });

            it("rejects content over 2000 characters", () => {
                const result = executeWebhookSchema.safeParse({
                    webhookUrl: validWebhookUrl,
                    content: "x".repeat(2001)
                });
                expect(result.success).toBe(false);
            });

            it("rejects username over 80 characters", () => {
                const result = executeWebhookSchema.safeParse({
                    webhookUrl: validWebhookUrl,
                    content: "Hello",
                    username: "x".repeat(81)
                });
                expect(result.success).toBe(false);
            });

            it("rejects more than 10 embeds", () => {
                const result = executeWebhookSchema.safeParse({
                    webhookUrl: validWebhookUrl,
                    embeds: Array(11).fill({ title: "Test" })
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid avatarUrl", () => {
                const result = executeWebhookSchema.safeParse({
                    webhookUrl: validWebhookUrl,
                    content: "Hello",
                    avatarUrl: "not-a-url"
                });
                expect(result.success).toBe(false);
            });

            it("applies default tts as false", () => {
                const result = executeWebhookSchema.parse({
                    webhookUrl: validWebhookUrl,
                    content: "Hello"
                });
                expect(result.tts).toBe(false);
            });
        });
    });
});
