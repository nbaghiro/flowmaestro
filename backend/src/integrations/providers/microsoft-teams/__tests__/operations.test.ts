/**
 * Microsoft Teams Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import {
    executeCreateChannel,
    createChannelSchema,
    executeGetChannel,
    getChannelSchema,
    executeGetTeam,
    getTeamSchema,
    executeListChannelMessages,
    listChannelMessagesSchema,
    executeListChannels,
    listChannelsSchema,
    executeListChatMembers,
    listChatMembersSchema,
    executeListChatMessages,
    listChatMessagesSchema,
    executeListChats,
    listChatsSchema,
    executeListJoinedTeams,
    listJoinedTeamsSchema,
    executeReplyToChannelMessage,
    replyToChannelMessageSchema,
    executeSendChannelMessage,
    sendChannelMessageSchema,
    executeSendChatMessage,
    sendChatMessageSchema
} from "../operations";
import type { MicrosoftTeamsClient } from "../client/MicrosoftTeamsClient";

// Mock MicrosoftTeamsClient factory
function createMockMicrosoftTeamsClient(): jest.Mocked<MicrosoftTeamsClient> {
    return {
        listJoinedTeams: jest.fn(),
        getTeam: jest.fn(),
        listChannels: jest.fn(),
        getChannel: jest.fn(),
        createChannel: jest.fn(),
        sendChannelMessage: jest.fn(),
        listChannelMessages: jest.fn(),
        replyToChannelMessage: jest.fn(),
        listChats: jest.fn(),
        getChat: jest.fn(),
        sendChatMessage: jest.fn(),
        listChatMessages: jest.fn(),
        listChatMembers: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<MicrosoftTeamsClient>;
}

describe("MicrosoftTeams Operation Executors", () => {
    let mockClient: jest.Mocked<MicrosoftTeamsClient>;

    beforeEach(() => {
        mockClient = createMockMicrosoftTeamsClient();
    });

    describe("executeListJoinedTeams", () => {
        it("calls client without params", async () => {
            mockClient.listJoinedTeams.mockResolvedValueOnce({
                value: [],
                "@odata.nextLink": undefined
            });

            await executeListJoinedTeams(mockClient, {});

            expect(mockClient.listJoinedTeams).toHaveBeenCalled();
        });

        it("returns normalized output on success", async () => {
            mockClient.listJoinedTeams.mockResolvedValueOnce({
                value: [
                    {
                        id: "team-1",
                        displayName: "Engineering Team",
                        description: "Core engineering team",
                        webUrl: "https://teams.microsoft.com/l/team/team-1"
                    },
                    {
                        id: "team-2",
                        displayName: "Product Team",
                        description: "Product management",
                        webUrl: "https://teams.microsoft.com/l/team/team-2"
                    }
                ],
                "@odata.nextLink": undefined
            });

            const result = await executeListJoinedTeams(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.teams).toHaveLength(2);
            expect(result.data?.teams[0].displayName).toBe("Engineering Team");
            expect(result.data?.hasMore).toBe(false);
        });

        it("returns hasMore when pagination available", async () => {
            mockClient.listJoinedTeams.mockResolvedValueOnce({
                value: [
                    {
                        id: "team-1",
                        displayName: "Team 1",
                        webUrl: "https://teams.microsoft.com/l/team/team-1"
                    }
                ],
                "@odata.nextLink": "https://graph.microsoft.com/v1.0/me/joinedTeams?$skiptoken=abc"
            });

            const result = await executeListJoinedTeams(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.hasMore).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.listJoinedTeams.mockRejectedValueOnce(new Error("Unauthorized"));

            const result = await executeListJoinedTeams(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Unauthorized");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listJoinedTeams.mockRejectedValueOnce("string error");

            const result = await executeListJoinedTeams(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list teams");
        });
    });

    describe("executeGetTeam", () => {
        it("calls client with correct params", async () => {
            mockClient.getTeam.mockResolvedValueOnce({
                id: "team-1",
                displayName: "Engineering Team",
                description: "Core engineering team",
                webUrl: "https://teams.microsoft.com/l/team/team-1"
            });

            await executeGetTeam(mockClient, { teamId: "team-1" });

            expect(mockClient.getTeam).toHaveBeenCalledWith("team-1");
        });

        it("returns normalized output on success", async () => {
            mockClient.getTeam.mockResolvedValueOnce({
                id: "team-1",
                displayName: "Engineering Team",
                description: "Core engineering team",
                webUrl: "https://teams.microsoft.com/l/team/team-1",
                createdDateTime: "2024-01-15T09:00:00Z"
            });

            const result = await executeGetTeam(mockClient, { teamId: "team-1" });

            expect(result.success).toBe(true);
            expect(result.data?.id).toBe("team-1");
            expect(result.data?.displayName).toBe("Engineering Team");
            expect(result.data?.createdDateTime).toBe("2024-01-15T09:00:00Z");
        });

        it("returns error on client failure", async () => {
            mockClient.getTeam.mockRejectedValueOnce(new Error("Team not found"));

            const result = await executeGetTeam(mockClient, { teamId: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Team not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getTeam.mockRejectedValueOnce({ code: "UNKNOWN" });

            const result = await executeGetTeam(mockClient, { teamId: "team-1" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get team");
        });
    });

    describe("executeListChannels", () => {
        it("calls client with correct params", async () => {
            mockClient.listChannels.mockResolvedValueOnce({
                value: [],
                "@odata.nextLink": undefined
            });

            await executeListChannels(mockClient, { teamId: "team-1" });

            expect(mockClient.listChannels).toHaveBeenCalledWith("team-1");
        });

        it("returns normalized output on success", async () => {
            mockClient.listChannels.mockResolvedValueOnce({
                value: [
                    {
                        id: "channel-1",
                        displayName: "General",
                        description: "General discussions",
                        membershipType: "standard",
                        webUrl: "https://teams.microsoft.com/l/channel/channel-1"
                    },
                    {
                        id: "channel-2",
                        displayName: "Engineering",
                        description: "Engineering discussions",
                        membershipType: "private",
                        webUrl: "https://teams.microsoft.com/l/channel/channel-2"
                    }
                ],
                "@odata.nextLink": undefined
            });

            const result = await executeListChannels(mockClient, { teamId: "team-1" });

            expect(result.success).toBe(true);
            expect(result.data?.channels).toHaveLength(2);
            expect(result.data?.channels[0].displayName).toBe("General");
            expect(result.data?.channels[1].membershipType).toBe("private");
            expect(result.data?.hasMore).toBe(false);
        });

        it("returns hasMore when pagination available", async () => {
            mockClient.listChannels.mockResolvedValueOnce({
                value: [
                    {
                        id: "channel-1",
                        displayName: "General",
                        membershipType: "standard",
                        webUrl: "https://teams.microsoft.com/l/channel/channel-1"
                    }
                ],
                "@odata.nextLink":
                    "https://graph.microsoft.com/v1.0/teams/team-1/channels?$skiptoken=abc"
            });

            const result = await executeListChannels(mockClient, { teamId: "team-1" });

            expect(result.success).toBe(true);
            expect(result.data?.hasMore).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.listChannels.mockRejectedValueOnce(new Error("Team not found"));

            const result = await executeListChannels(mockClient, { teamId: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Team not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetChannel", () => {
        it("calls client with correct params", async () => {
            mockClient.getChannel.mockResolvedValueOnce({
                id: "channel-1",
                displayName: "General",
                description: "General discussions",
                membershipType: "standard",
                webUrl: "https://teams.microsoft.com/l/channel/channel-1"
            });

            await executeGetChannel(mockClient, { teamId: "team-1", channelId: "channel-1" });

            expect(mockClient.getChannel).toHaveBeenCalledWith("team-1", "channel-1");
        });

        it("returns normalized output on success", async () => {
            mockClient.getChannel.mockResolvedValueOnce({
                id: "channel-1",
                displayName: "General",
                description: "General discussions",
                membershipType: "standard",
                webUrl: "https://teams.microsoft.com/l/channel/channel-1",
                createdDateTime: "2024-01-15T09:00:00Z"
            });

            const result = await executeGetChannel(mockClient, {
                teamId: "team-1",
                channelId: "channel-1"
            });

            expect(result.success).toBe(true);
            expect(result.data?.id).toBe("channel-1");
            expect(result.data?.displayName).toBe("General");
            expect(result.data?.membershipType).toBe("standard");
        });

        it("returns error on client failure", async () => {
            mockClient.getChannel.mockRejectedValueOnce(new Error("Channel not found"));

            const result = await executeGetChannel(mockClient, {
                teamId: "team-1",
                channelId: "nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Channel not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getChannel.mockRejectedValueOnce(null);

            const result = await executeGetChannel(mockClient, {
                teamId: "team-1",
                channelId: "channel-1"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get channel");
        });
    });

    describe("executeCreateChannel", () => {
        it("calls client with correct params for standard channel", async () => {
            mockClient.createChannel.mockResolvedValueOnce({
                id: "channel-new",
                displayName: "New Channel",
                description: "A new channel",
                membershipType: "standard",
                webUrl: "https://teams.microsoft.com/l/channel/channel-new"
            });

            await executeCreateChannel(mockClient, {
                teamId: "team-1",
                displayName: "New Channel",
                description: "A new channel",
                membershipType: "standard"
            });

            expect(mockClient.createChannel).toHaveBeenCalledWith(
                "team-1",
                "New Channel",
                "A new channel",
                "standard"
            );
        });

        it("calls client with correct params for private channel", async () => {
            mockClient.createChannel.mockResolvedValueOnce({
                id: "channel-private",
                displayName: "Private Channel",
                description: "A private channel",
                membershipType: "private",
                webUrl: "https://teams.microsoft.com/l/channel/channel-private"
            });

            await executeCreateChannel(mockClient, {
                teamId: "team-1",
                displayName: "Private Channel",
                description: "A private channel",
                membershipType: "private"
            });

            expect(mockClient.createChannel).toHaveBeenCalledWith(
                "team-1",
                "Private Channel",
                "A private channel",
                "private"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.createChannel.mockResolvedValueOnce({
                id: "channel-new",
                displayName: "New Channel",
                description: "A new channel",
                membershipType: "standard",
                webUrl: "https://teams.microsoft.com/l/channel/channel-new",
                createdDateTime: "2024-12-19T10:00:00Z"
            });

            const result = await executeCreateChannel(mockClient, {
                teamId: "team-1",
                displayName: "New Channel",
                description: "A new channel"
            });

            expect(result.success).toBe(true);
            expect(result.data?.id).toBe("channel-new");
            expect(result.data?.displayName).toBe("New Channel");
        });

        it("returns error on client failure", async () => {
            mockClient.createChannel.mockRejectedValueOnce(new Error("Team not found"));

            const result = await executeCreateChannel(mockClient, {
                teamId: "nonexistent",
                displayName: "New Channel"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Team not found");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createChannel.mockRejectedValueOnce("string error");

            const result = await executeCreateChannel(mockClient, {
                teamId: "team-1",
                displayName: "New Channel"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create channel");
        });
    });

    describe("executeSendChannelMessage", () => {
        it("calls client with correct params for text message", async () => {
            mockClient.sendChannelMessage.mockResolvedValueOnce({
                id: "msg-1",
                messageType: "message",
                createdDateTime: "2024-12-19T10:00:00Z",
                body: { contentType: "text", content: "Hello team!" },
                webUrl: "https://teams.microsoft.com/l/message/msg-1"
            });

            await executeSendChannelMessage(mockClient, {
                teamId: "team-1",
                channelId: "channel-1",
                content: "Hello team!",
                contentType: "text"
            });

            expect(mockClient.sendChannelMessage).toHaveBeenCalledWith(
                "team-1",
                "channel-1",
                "Hello team!",
                "text"
            );
        });

        it("calls client with correct params for html message", async () => {
            mockClient.sendChannelMessage.mockResolvedValueOnce({
                id: "msg-2",
                messageType: "message",
                createdDateTime: "2024-12-19T10:00:00Z",
                body: { contentType: "html", content: "<p>Hello team!</p>" },
                webUrl: "https://teams.microsoft.com/l/message/msg-2"
            });

            await executeSendChannelMessage(mockClient, {
                teamId: "team-1",
                channelId: "channel-1",
                content: "<p>Hello team!</p>",
                contentType: "html"
            });

            expect(mockClient.sendChannelMessage).toHaveBeenCalledWith(
                "team-1",
                "channel-1",
                "<p>Hello team!</p>",
                "html"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.sendChannelMessage.mockResolvedValueOnce({
                id: "msg-1",
                messageType: "message",
                createdDateTime: "2024-12-19T10:00:00Z",
                body: { contentType: "text", content: "Hello team!" },
                webUrl: "https://teams.microsoft.com/l/message/msg-1"
            });

            const result = await executeSendChannelMessage(mockClient, {
                teamId: "team-1",
                channelId: "channel-1",
                content: "Hello team!"
            });

            expect(result.success).toBe(true);
            expect(result.data?.messageId).toBe("msg-1");
            expect(result.data?.createdDateTime).toBe("2024-12-19T10:00:00Z");
            expect(result.data?.webUrl).toBe("https://teams.microsoft.com/l/message/msg-1");
        });

        it("returns error on client failure", async () => {
            mockClient.sendChannelMessage.mockRejectedValueOnce(new Error("Channel not found"));

            const result = await executeSendChannelMessage(mockClient, {
                teamId: "team-1",
                channelId: "nonexistent",
                content: "Hello"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Channel not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.sendChannelMessage.mockRejectedValueOnce(undefined);

            const result = await executeSendChannelMessage(mockClient, {
                teamId: "team-1",
                channelId: "channel-1",
                content: "Hello"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to send message");
        });
    });

    describe("executeListChannelMessages", () => {
        it("calls client with correct params", async () => {
            mockClient.listChannelMessages.mockResolvedValueOnce({
                value: [],
                "@odata.nextLink": undefined
            });

            await executeListChannelMessages(mockClient, {
                teamId: "team-1",
                channelId: "channel-1",
                top: 10
            });

            expect(mockClient.listChannelMessages).toHaveBeenCalledWith("team-1", "channel-1", 10);
        });

        it("calls client without top param when not provided", async () => {
            mockClient.listChannelMessages.mockResolvedValueOnce({
                value: [],
                "@odata.nextLink": undefined
            });

            await executeListChannelMessages(mockClient, {
                teamId: "team-1",
                channelId: "channel-1"
            });

            expect(mockClient.listChannelMessages).toHaveBeenCalledWith(
                "team-1",
                "channel-1",
                undefined
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.listChannelMessages.mockResolvedValueOnce({
                value: [
                    {
                        id: "msg-1",
                        messageType: "message",
                        createdDateTime: "2024-12-19T10:00:00Z",
                        body: { contentType: "text", content: "Hello team!" },
                        from: {
                            user: { id: "user-1", displayName: "John Smith" }
                        }
                    },
                    {
                        id: "msg-2",
                        messageType: "message",
                        createdDateTime: "2024-12-19T10:05:00Z",
                        body: { contentType: "html", content: "<p>Reply</p>" },
                        from: {
                            application: { id: "app-1", displayName: "Bot App" }
                        }
                    }
                ],
                "@odata.nextLink": undefined
            });

            const result = await executeListChannelMessages(mockClient, {
                teamId: "team-1",
                channelId: "channel-1"
            });

            expect(result.success).toBe(true);
            expect(result.data?.messages).toHaveLength(2);
            expect(result.data?.messages[0].id).toBe("msg-1");
            expect(result.data?.messages[0].content).toBe("Hello team!");
            expect(result.data?.messages[0].from).toBe("John Smith");
            expect(result.data?.messages[1].from).toBe("Bot App");
            expect(result.data?.hasMore).toBe(false);
        });

        it("handles missing from field", async () => {
            mockClient.listChannelMessages.mockResolvedValueOnce({
                value: [
                    {
                        id: "msg-1",
                        messageType: "message",
                        createdDateTime: "2024-12-19T10:00:00Z",
                        body: { contentType: "text", content: "System message" }
                    }
                ],
                "@odata.nextLink": undefined
            });

            const result = await executeListChannelMessages(mockClient, {
                teamId: "team-1",
                channelId: "channel-1"
            });

            expect(result.success).toBe(true);
            expect(result.data?.messages[0].from).toBeUndefined();
        });

        it("returns hasMore when pagination available", async () => {
            mockClient.listChannelMessages.mockResolvedValueOnce({
                value: [
                    {
                        id: "msg-1",
                        messageType: "message",
                        createdDateTime: "2024-12-19T10:00:00Z",
                        body: { contentType: "text", content: "Hello" }
                    }
                ],
                "@odata.nextLink":
                    "https://graph.microsoft.com/v1.0/teams/team-1/channels/channel-1/messages?$skiptoken=abc"
            });

            const result = await executeListChannelMessages(mockClient, {
                teamId: "team-1",
                channelId: "channel-1",
                top: 1
            });

            expect(result.success).toBe(true);
            expect(result.data?.hasMore).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.listChannelMessages.mockRejectedValueOnce(new Error("Channel not found"));

            const result = await executeListChannelMessages(mockClient, {
                teamId: "team-1",
                channelId: "nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Channel not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeReplyToChannelMessage", () => {
        it("calls client with correct params for text reply", async () => {
            mockClient.replyToChannelMessage.mockResolvedValueOnce({
                id: "reply-1",
                messageType: "message",
                createdDateTime: "2024-12-19T11:00:00Z",
                body: { contentType: "text", content: "Thanks!" }
            });

            await executeReplyToChannelMessage(mockClient, {
                teamId: "team-1",
                channelId: "channel-1",
                messageId: "msg-1",
                content: "Thanks!",
                contentType: "text"
            });

            expect(mockClient.replyToChannelMessage).toHaveBeenCalledWith(
                "team-1",
                "channel-1",
                "msg-1",
                "Thanks!",
                "text"
            );
        });

        it("calls client with correct params for html reply", async () => {
            mockClient.replyToChannelMessage.mockResolvedValueOnce({
                id: "reply-2",
                messageType: "message",
                createdDateTime: "2024-12-19T11:00:00Z",
                body: { contentType: "html", content: "<p>Thanks!</p>" }
            });

            await executeReplyToChannelMessage(mockClient, {
                teamId: "team-1",
                channelId: "channel-1",
                messageId: "msg-1",
                content: "<p>Thanks!</p>",
                contentType: "html"
            });

            expect(mockClient.replyToChannelMessage).toHaveBeenCalledWith(
                "team-1",
                "channel-1",
                "msg-1",
                "<p>Thanks!</p>",
                "html"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.replyToChannelMessage.mockResolvedValueOnce({
                id: "reply-1",
                messageType: "message",
                createdDateTime: "2024-12-19T11:00:00Z",
                body: { contentType: "text", content: "Thanks!" }
            });

            const result = await executeReplyToChannelMessage(mockClient, {
                teamId: "team-1",
                channelId: "channel-1",
                messageId: "msg-1",
                content: "Thanks!"
            });

            expect(result.success).toBe(true);
            expect(result.data?.messageId).toBe("reply-1");
            expect(result.data?.createdDateTime).toBe("2024-12-19T11:00:00Z");
        });

        it("returns error on client failure", async () => {
            mockClient.replyToChannelMessage.mockRejectedValueOnce(new Error("Message not found"));

            const result = await executeReplyToChannelMessage(mockClient, {
                teamId: "team-1",
                channelId: "channel-1",
                messageId: "nonexistent",
                content: "Reply"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Message not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.replyToChannelMessage.mockRejectedValueOnce(42);

            const result = await executeReplyToChannelMessage(mockClient, {
                teamId: "team-1",
                channelId: "channel-1",
                messageId: "msg-1",
                content: "Reply"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to reply to message");
        });
    });

    describe("executeListChats", () => {
        it("calls client with top param", async () => {
            mockClient.listChats.mockResolvedValueOnce({
                value: [],
                "@odata.nextLink": undefined
            });

            await executeListChats(mockClient, { top: 25 });

            expect(mockClient.listChats).toHaveBeenCalledWith(25);
        });

        it("calls client without top param when not provided", async () => {
            mockClient.listChats.mockResolvedValueOnce({
                value: [],
                "@odata.nextLink": undefined
            });

            await executeListChats(mockClient, {});

            expect(mockClient.listChats).toHaveBeenCalledWith(undefined);
        });

        it("returns normalized output on success", async () => {
            mockClient.listChats.mockResolvedValueOnce({
                value: [
                    {
                        id: "chat-1",
                        topic: "Project Discussion",
                        chatType: "group",
                        webUrl: "https://teams.microsoft.com/l/chat/chat-1",
                        lastUpdatedDateTime: "2024-12-19T10:00:00Z"
                    },
                    {
                        id: "chat-2",
                        topic: undefined,
                        chatType: "oneOnOne",
                        webUrl: "https://teams.microsoft.com/l/chat/chat-2",
                        lastUpdatedDateTime: "2024-12-19T09:00:00Z"
                    }
                ],
                "@odata.nextLink": undefined
            });

            const result = await executeListChats(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.chats).toHaveLength(2);
            expect(result.data?.chats[0].id).toBe("chat-1");
            expect(result.data?.chats[0].topic).toBe("Project Discussion");
            expect(result.data?.chats[0].chatType).toBe("group");
            expect(result.data?.chats[1].topic).toBeUndefined();
            expect(result.data?.hasMore).toBe(false);
        });

        it("returns hasMore when pagination available", async () => {
            mockClient.listChats.mockResolvedValueOnce({
                value: [
                    {
                        id: "chat-1",
                        chatType: "group",
                        webUrl: "https://teams.microsoft.com/l/chat/chat-1"
                    }
                ],
                "@odata.nextLink": "https://graph.microsoft.com/v1.0/chats?$skiptoken=abc"
            });

            const result = await executeListChats(mockClient, { top: 1 });

            expect(result.success).toBe(true);
            expect(result.data?.hasMore).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.listChats.mockRejectedValueOnce(new Error("Unauthorized"));

            const result = await executeListChats(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Unauthorized");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listChats.mockRejectedValueOnce({ status: 500 });

            const result = await executeListChats(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list chats");
        });
    });

    describe("executeSendChatMessage", () => {
        it("calls client with correct params for text message", async () => {
            mockClient.sendChatMessage.mockResolvedValueOnce({
                id: "msg-1",
                messageType: "message",
                createdDateTime: "2024-12-19T10:00:00Z",
                body: { contentType: "text", content: "Hello!" }
            });

            await executeSendChatMessage(mockClient, {
                chatId: "chat-1",
                content: "Hello!",
                contentType: "text"
            });

            expect(mockClient.sendChatMessage).toHaveBeenCalledWith("chat-1", "Hello!", "text");
        });

        it("calls client with correct params for html message", async () => {
            mockClient.sendChatMessage.mockResolvedValueOnce({
                id: "msg-2",
                messageType: "message",
                createdDateTime: "2024-12-19T10:00:00Z",
                body: { contentType: "html", content: "<p>Hello!</p>" }
            });

            await executeSendChatMessage(mockClient, {
                chatId: "chat-1",
                content: "<p>Hello!</p>",
                contentType: "html"
            });

            expect(mockClient.sendChatMessage).toHaveBeenCalledWith(
                "chat-1",
                "<p>Hello!</p>",
                "html"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.sendChatMessage.mockResolvedValueOnce({
                id: "msg-1",
                messageType: "message",
                createdDateTime: "2024-12-19T10:00:00Z",
                body: { contentType: "text", content: "Hello!" }
            });

            const result = await executeSendChatMessage(mockClient, {
                chatId: "chat-1",
                content: "Hello!"
            });

            expect(result.success).toBe(true);
            expect(result.data?.messageId).toBe("msg-1");
            expect(result.data?.createdDateTime).toBe("2024-12-19T10:00:00Z");
        });

        it("returns error on client failure", async () => {
            mockClient.sendChatMessage.mockRejectedValueOnce(new Error("Chat not found"));

            const result = await executeSendChatMessage(mockClient, {
                chatId: "nonexistent",
                content: "Hello"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Chat not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.sendChatMessage.mockRejectedValueOnce(null);

            const result = await executeSendChatMessage(mockClient, {
                chatId: "chat-1",
                content: "Hello"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to send chat message");
        });
    });

    describe("executeListChatMessages", () => {
        it("calls client with correct params", async () => {
            mockClient.listChatMessages.mockResolvedValueOnce({
                value: [],
                "@odata.nextLink": undefined
            });

            await executeListChatMessages(mockClient, {
                chatId: "chat-1",
                top: 20
            });

            expect(mockClient.listChatMessages).toHaveBeenCalledWith("chat-1", 20);
        });

        it("calls client without top param when not provided", async () => {
            mockClient.listChatMessages.mockResolvedValueOnce({
                value: [],
                "@odata.nextLink": undefined
            });

            await executeListChatMessages(mockClient, { chatId: "chat-1" });

            expect(mockClient.listChatMessages).toHaveBeenCalledWith("chat-1", undefined);
        });

        it("returns normalized output on success", async () => {
            mockClient.listChatMessages.mockResolvedValueOnce({
                value: [
                    {
                        id: "msg-1",
                        messageType: "message",
                        createdDateTime: "2024-12-19T10:00:00Z",
                        body: { contentType: "text", content: "Hi there!" },
                        from: {
                            user: { id: "user-1", displayName: "Jane Doe" }
                        }
                    }
                ],
                "@odata.nextLink": undefined
            });

            const result = await executeListChatMessages(mockClient, { chatId: "chat-1" });

            expect(result.success).toBe(true);
            expect(result.data?.messages).toHaveLength(1);
            expect(result.data?.messages[0].id).toBe("msg-1");
            expect(result.data?.messages[0].content).toBe("Hi there!");
            expect(result.data?.messages[0].from).toBe("Jane Doe");
            expect(result.data?.hasMore).toBe(false);
        });

        it("handles application sender", async () => {
            mockClient.listChatMessages.mockResolvedValueOnce({
                value: [
                    {
                        id: "msg-1",
                        messageType: "message",
                        createdDateTime: "2024-12-19T10:00:00Z",
                        body: { contentType: "text", content: "Bot message" },
                        from: {
                            application: { id: "app-1", displayName: "Workflow Bot" }
                        }
                    }
                ],
                "@odata.nextLink": undefined
            });

            const result = await executeListChatMessages(mockClient, { chatId: "chat-1" });

            expect(result.success).toBe(true);
            expect(result.data?.messages[0].from).toBe("Workflow Bot");
        });

        it("returns hasMore when pagination available", async () => {
            mockClient.listChatMessages.mockResolvedValueOnce({
                value: [
                    {
                        id: "msg-1",
                        messageType: "message",
                        createdDateTime: "2024-12-19T10:00:00Z",
                        body: { contentType: "text", content: "Hello" }
                    }
                ],
                "@odata.nextLink":
                    "https://graph.microsoft.com/v1.0/chats/chat-1/messages?$skiptoken=abc"
            });

            const result = await executeListChatMessages(mockClient, {
                chatId: "chat-1",
                top: 1
            });

            expect(result.success).toBe(true);
            expect(result.data?.hasMore).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.listChatMessages.mockRejectedValueOnce(new Error("Chat not found"));

            const result = await executeListChatMessages(mockClient, { chatId: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Chat not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListChatMembers", () => {
        it("calls client with correct params", async () => {
            mockClient.listChatMembers.mockResolvedValueOnce({
                value: [],
                "@odata.nextLink": undefined
            });

            await executeListChatMembers(mockClient, { chatId: "chat-1" });

            expect(mockClient.listChatMembers).toHaveBeenCalledWith("chat-1");
        });

        it("returns normalized output on success", async () => {
            mockClient.listChatMembers.mockResolvedValueOnce({
                value: [
                    {
                        id: "member-1",
                        displayName: "John Smith",
                        email: "john@example.com",
                        roles: ["owner"]
                    },
                    {
                        id: "member-2",
                        displayName: "Jane Doe",
                        email: "jane@example.com",
                        roles: ["member"]
                    }
                ],
                "@odata.nextLink": undefined
            });

            const result = await executeListChatMembers(mockClient, { chatId: "chat-1" });

            expect(result.success).toBe(true);
            expect(result.data?.members).toHaveLength(2);
            expect(result.data?.members[0].id).toBe("member-1");
            expect(result.data?.members[0].displayName).toBe("John Smith");
            expect(result.data?.members[0].email).toBe("john@example.com");
            expect(result.data?.members[0].roles).toEqual(["owner"]);
            expect(result.data?.members[1].roles).toEqual(["member"]);
            expect(result.data?.hasMore).toBe(false);
        });

        it("returns hasMore when pagination available", async () => {
            mockClient.listChatMembers.mockResolvedValueOnce({
                value: [
                    {
                        id: "member-1",
                        displayName: "John Smith",
                        roles: []
                    }
                ],
                "@odata.nextLink":
                    "https://graph.microsoft.com/v1.0/chats/chat-1/members?$skiptoken=abc"
            });

            const result = await executeListChatMembers(mockClient, { chatId: "chat-1" });

            expect(result.success).toBe(true);
            expect(result.data?.hasMore).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.listChatMembers.mockRejectedValueOnce(new Error("Chat not found"));

            const result = await executeListChatMembers(mockClient, { chatId: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Chat not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listChatMembers.mockRejectedValueOnce(undefined);

            const result = await executeListChatMembers(mockClient, { chatId: "chat-1" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list chat members");
        });
    });

    describe("schema validation", () => {
        describe("listJoinedTeamsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listJoinedTeamsSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("getTeamSchema", () => {
            it("validates with teamId", () => {
                const result = getTeamSchema.safeParse({
                    teamId: "team-123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing teamId", () => {
                const result = getTeamSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects non-string teamId", () => {
                const result = getTeamSchema.safeParse({
                    teamId: 123
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listChannelsSchema", () => {
            it("validates with teamId", () => {
                const result = listChannelsSchema.safeParse({
                    teamId: "team-123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing teamId", () => {
                const result = listChannelsSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("getChannelSchema", () => {
            it("validates with teamId and channelId", () => {
                const result = getChannelSchema.safeParse({
                    teamId: "team-123",
                    channelId: "channel-456"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing channelId", () => {
                const result = getChannelSchema.safeParse({
                    teamId: "team-123"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing teamId", () => {
                const result = getChannelSchema.safeParse({
                    channelId: "channel-456"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createChannelSchema", () => {
            it("validates minimal input", () => {
                const result = createChannelSchema.safeParse({
                    teamId: "team-123",
                    displayName: "New Channel"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createChannelSchema.safeParse({
                    teamId: "team-123",
                    displayName: "New Channel",
                    description: "Channel description",
                    membershipType: "private"
                });
                expect(result.success).toBe(true);
            });

            it("applies default membershipType", () => {
                const result = createChannelSchema.parse({
                    teamId: "team-123",
                    displayName: "New Channel"
                });
                expect(result.membershipType).toBe("standard");
            });

            it("rejects displayName over 50 characters", () => {
                const result = createChannelSchema.safeParse({
                    teamId: "team-123",
                    displayName: "A".repeat(51)
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid membershipType", () => {
                const result = createChannelSchema.safeParse({
                    teamId: "team-123",
                    displayName: "New Channel",
                    membershipType: "shared"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing teamId", () => {
                const result = createChannelSchema.safeParse({
                    displayName: "New Channel"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing displayName", () => {
                const result = createChannelSchema.safeParse({
                    teamId: "team-123"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("sendChannelMessageSchema", () => {
            it("validates minimal input", () => {
                const result = sendChannelMessageSchema.safeParse({
                    teamId: "team-123",
                    channelId: "channel-456",
                    content: "Hello"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = sendChannelMessageSchema.safeParse({
                    teamId: "team-123",
                    channelId: "channel-456",
                    content: "<p>Hello</p>",
                    contentType: "html"
                });
                expect(result.success).toBe(true);
            });

            it("applies default contentType", () => {
                const result = sendChannelMessageSchema.parse({
                    teamId: "team-123",
                    channelId: "channel-456",
                    content: "Hello"
                });
                expect(result.contentType).toBe("text");
            });

            it("rejects invalid contentType", () => {
                const result = sendChannelMessageSchema.safeParse({
                    teamId: "team-123",
                    channelId: "channel-456",
                    content: "Hello",
                    contentType: "markdown"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing content", () => {
                const result = sendChannelMessageSchema.safeParse({
                    teamId: "team-123",
                    channelId: "channel-456"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listChannelMessagesSchema", () => {
            it("validates minimal input", () => {
                const result = listChannelMessagesSchema.safeParse({
                    teamId: "team-123",
                    channelId: "channel-456"
                });
                expect(result.success).toBe(true);
            });

            it("validates with top param", () => {
                const result = listChannelMessagesSchema.safeParse({
                    teamId: "team-123",
                    channelId: "channel-456",
                    top: 25
                });
                expect(result.success).toBe(true);
            });

            it("rejects top less than 1", () => {
                const result = listChannelMessagesSchema.safeParse({
                    teamId: "team-123",
                    channelId: "channel-456",
                    top: 0
                });
                expect(result.success).toBe(false);
            });

            it("rejects top greater than 50", () => {
                const result = listChannelMessagesSchema.safeParse({
                    teamId: "team-123",
                    channelId: "channel-456",
                    top: 100
                });
                expect(result.success).toBe(false);
            });
        });

        describe("replyToChannelMessageSchema", () => {
            it("validates minimal input", () => {
                const result = replyToChannelMessageSchema.safeParse({
                    teamId: "team-123",
                    channelId: "channel-456",
                    messageId: "msg-789",
                    content: "Reply"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = replyToChannelMessageSchema.safeParse({
                    teamId: "team-123",
                    channelId: "channel-456",
                    messageId: "msg-789",
                    content: "<p>Reply</p>",
                    contentType: "html"
                });
                expect(result.success).toBe(true);
            });

            it("applies default contentType", () => {
                const result = replyToChannelMessageSchema.parse({
                    teamId: "team-123",
                    channelId: "channel-456",
                    messageId: "msg-789",
                    content: "Reply"
                });
                expect(result.contentType).toBe("text");
            });

            it("rejects missing messageId", () => {
                const result = replyToChannelMessageSchema.safeParse({
                    teamId: "team-123",
                    channelId: "channel-456",
                    content: "Reply"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listChatsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listChatsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with top param", () => {
                const result = listChatsSchema.safeParse({
                    top: 25
                });
                expect(result.success).toBe(true);
            });

            it("rejects top less than 1", () => {
                const result = listChatsSchema.safeParse({
                    top: 0
                });
                expect(result.success).toBe(false);
            });

            it("rejects top greater than 50", () => {
                const result = listChatsSchema.safeParse({
                    top: 100
                });
                expect(result.success).toBe(false);
            });
        });

        describe("sendChatMessageSchema", () => {
            it("validates minimal input", () => {
                const result = sendChatMessageSchema.safeParse({
                    chatId: "chat-123",
                    content: "Hello"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = sendChatMessageSchema.safeParse({
                    chatId: "chat-123",
                    content: "<p>Hello</p>",
                    contentType: "html"
                });
                expect(result.success).toBe(true);
            });

            it("applies default contentType", () => {
                const result = sendChatMessageSchema.parse({
                    chatId: "chat-123",
                    content: "Hello"
                });
                expect(result.contentType).toBe("text");
            });

            it("rejects missing chatId", () => {
                const result = sendChatMessageSchema.safeParse({
                    content: "Hello"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing content", () => {
                const result = sendChatMessageSchema.safeParse({
                    chatId: "chat-123"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listChatMessagesSchema", () => {
            it("validates minimal input", () => {
                const result = listChatMessagesSchema.safeParse({
                    chatId: "chat-123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with top param", () => {
                const result = listChatMessagesSchema.safeParse({
                    chatId: "chat-123",
                    top: 25
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing chatId", () => {
                const result = listChatMessagesSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects top less than 1", () => {
                const result = listChatMessagesSchema.safeParse({
                    chatId: "chat-123",
                    top: 0
                });
                expect(result.success).toBe(false);
            });

            it("rejects top greater than 50", () => {
                const result = listChatMessagesSchema.safeParse({
                    chatId: "chat-123",
                    top: 100
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listChatMembersSchema", () => {
            it("validates with chatId", () => {
                const result = listChatMembersSchema.safeParse({
                    chatId: "chat-123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing chatId", () => {
                const result = listChatMembersSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects non-string chatId", () => {
                const result = listChatMembersSchema.safeParse({
                    chatId: 123
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
