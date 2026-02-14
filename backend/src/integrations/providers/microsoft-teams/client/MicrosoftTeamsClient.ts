/**
 * Microsoft Teams Client
 * HTTP client for Microsoft Graph API - Teams endpoints
 */

import { MicrosoftGraphClient } from "../../../core/microsoft";

export interface TeamsClientConfig {
    accessToken: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface Team {
    id: string;
    displayName: string;
    description?: string;
    webUrl: string;
    createdDateTime?: string;
}

export interface TeamsResponse {
    value: Team[];
    "@odata.nextLink"?: string;
}

export interface Channel {
    id: string;
    displayName: string;
    description?: string;
    membershipType: "standard" | "private" | "shared";
    webUrl: string;
    email?: string;
    createdDateTime?: string;
}

export interface ChannelsResponse {
    value: Channel[];
    "@odata.nextLink"?: string;
}

export interface ChatMessageBody {
    contentType: "text" | "html";
    content: string;
}

export interface ChatMessageFrom {
    user?: {
        id: string;
        displayName: string;
        userIdentityType?: string;
    };
    application?: {
        id: string;
        displayName: string;
    };
}

export interface ChatMessage {
    id: string;
    messageType: "message" | "systemEventMessage" | "unknownFutureValue";
    createdDateTime: string;
    lastModifiedDateTime?: string;
    subject?: string;
    body: ChatMessageBody;
    from?: ChatMessageFrom;
    webUrl?: string;
    importance?: "normal" | "high" | "urgent";
}

export interface ChatMessagesResponse {
    value: ChatMessage[];
    "@odata.nextLink"?: string;
}

export interface Chat {
    id: string;
    topic?: string;
    chatType: "oneOnOne" | "group" | "meeting";
    webUrl: string;
    createdDateTime?: string;
    lastUpdatedDateTime?: string;
}

export interface ChatsResponse {
    value: Chat[];
    "@odata.nextLink"?: string;
}

export interface ConversationMember {
    id: string;
    displayName: string;
    userId?: string;
    email?: string;
    roles: string[];
}

export interface MembersResponse {
    value: ConversationMember[];
    "@odata.nextLink"?: string;
}

// ============================================================================
// Client Implementation
// ============================================================================

export class MicrosoftTeamsClient extends MicrosoftGraphClient {
    constructor(config: TeamsClientConfig) {
        super({
            accessToken: config.accessToken,
            serviceName: "Microsoft Teams"
        });
    }

    // ============================================================================
    // Teams Operations
    // ============================================================================

    /**
     * List teams the user is a member of
     */
    async listJoinedTeams(): Promise<TeamsResponse> {
        return this.get("/me/joinedTeams");
    }

    /**
     * Get team details by ID
     */
    async getTeam(teamId: string): Promise<Team> {
        return this.get(`/teams/${teamId}`);
    }

    // ============================================================================
    // Channel Operations
    // ============================================================================

    /**
     * List channels in a team
     */
    async listChannels(teamId: string): Promise<ChannelsResponse> {
        return this.get(`/teams/${teamId}/channels`);
    }

    /**
     * Get channel details
     */
    async getChannel(teamId: string, channelId: string): Promise<Channel> {
        return this.get(`/teams/${teamId}/channels/${channelId}`);
    }

    /**
     * Create a new channel in a team
     */
    async createChannel(
        teamId: string,
        displayName: string,
        description?: string,
        membershipType: "standard" | "private" = "standard"
    ): Promise<Channel> {
        return this.post(`/teams/${teamId}/channels`, {
            displayName,
            description,
            membershipType
        });
    }

    /**
     * Send a message to a channel
     */
    async sendChannelMessage(
        teamId: string,
        channelId: string,
        content: string,
        contentType: "text" | "html" = "text"
    ): Promise<ChatMessage> {
        return this.post(`/teams/${teamId}/channels/${channelId}/messages`, {
            body: {
                contentType,
                content
            }
        });
    }

    /**
     * List messages in a channel
     */
    async listChannelMessages(
        teamId: string,
        channelId: string,
        top?: number
    ): Promise<ChatMessagesResponse> {
        let endpoint = `/teams/${teamId}/channels/${channelId}/messages`;
        if (top) {
            endpoint += `?$top=${top}`;
        }
        return this.get(endpoint);
    }

    /**
     * Reply to a channel message
     */
    async replyToChannelMessage(
        teamId: string,
        channelId: string,
        messageId: string,
        content: string,
        contentType: "text" | "html" = "text"
    ): Promise<ChatMessage> {
        return this.post(`/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`, {
            body: {
                contentType,
                content
            }
        });
    }

    // ============================================================================
    // Chat Operations
    // ============================================================================

    /**
     * List user's chats
     */
    async listChats(top?: number): Promise<ChatsResponse> {
        let endpoint = "/chats";
        if (top) {
            endpoint += `?$top=${top}`;
        }
        return this.get(endpoint);
    }

    /**
     * Get chat details
     */
    async getChat(chatId: string): Promise<Chat> {
        return this.get(`/chats/${chatId}`);
    }

    /**
     * Send a message to a chat
     */
    async sendChatMessage(
        chatId: string,
        content: string,
        contentType: "text" | "html" = "text"
    ): Promise<ChatMessage> {
        return this.post(`/chats/${chatId}/messages`, {
            body: {
                contentType,
                content
            }
        });
    }

    /**
     * List messages in a chat
     */
    async listChatMessages(chatId: string, top?: number): Promise<ChatMessagesResponse> {
        let endpoint = `/chats/${chatId}/messages`;
        if (top) {
            endpoint += `?$top=${top}`;
        }
        return this.get(endpoint);
    }

    /**
     * List members of a chat
     */
    async listChatMembers(chatId: string): Promise<MembersResponse> {
        return this.get(`/chats/${chatId}/members`);
    }
}
