/**
 * Discord operation response types
 */

export interface DiscordMessageResponse {
    id: string;
    channel_id: string;
    guild_id?: string;
    content: string;
    timestamp: string;
    author: {
        id: string;
        username: string;
        discriminator: string;
        avatar: string | null;
    };
}

export interface DiscordWebhookResponse {
    id: string;
    type: number;
    guild_id?: string;
    channel_id?: string;
    name: string | null;
    token?: string;
    url?: string;
}
