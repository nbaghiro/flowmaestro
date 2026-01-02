/**
 * Discord Integration Types
 * Shared between frontend and backend
 */

// ==========================================================================
// Discord API Types
// ==========================================================================

/**
 * Discord User (from OAuth2 /users/@me)
 */
export interface DiscordUser {
    id: string;
    username: string;
    discriminator: string;
    global_name: string | null;
    avatar: string | null;
    bot?: boolean;
    system?: boolean;
    mfa_enabled?: boolean;
    banner?: string | null;
    accent_color?: number | null;
    locale?: string;
    verified?: boolean;
    email?: string | null;
    flags?: number;
    premium_type?: number;
    public_flags?: number;
}

/**
 * Discord Guild (Server) - partial from OAuth2
 */
export interface DiscordGuild {
    id: string;
    name: string;
    icon: string | null;
    owner: boolean;
    permissions: string;
    features: string[];
}

/**
 * Discord Channel
 */
export interface DiscordChannel {
    id: string;
    type: DiscordChannelType;
    guild_id?: string;
    position?: number;
    permission_overwrites?: DiscordOverwrite[];
    name?: string;
    topic?: string | null;
    nsfw?: boolean;
    last_message_id?: string | null;
    bitrate?: number;
    user_limit?: number;
    rate_limit_per_user?: number;
    recipients?: DiscordUser[];
    icon?: string | null;
    owner_id?: string;
    application_id?: string;
    managed?: boolean;
    parent_id?: string | null;
    last_pin_timestamp?: string | null;
    rtc_region?: string | null;
    video_quality_mode?: number;
    message_count?: number;
    member_count?: number;
    thread_metadata?: DiscordThreadMetadata;
    member?: DiscordThreadMember;
    default_auto_archive_duration?: number;
    permissions?: string;
    flags?: number;
    total_message_sent?: number;
}

/**
 * Discord Channel Types
 */
export enum DiscordChannelType {
    GUILD_TEXT = 0,
    DM = 1,
    GUILD_VOICE = 2,
    GROUP_DM = 3,
    GUILD_CATEGORY = 4,
    GUILD_ANNOUNCEMENT = 5,
    ANNOUNCEMENT_THREAD = 10,
    PUBLIC_THREAD = 11,
    PRIVATE_THREAD = 12,
    GUILD_STAGE_VOICE = 13,
    GUILD_DIRECTORY = 14,
    GUILD_FORUM = 15,
    GUILD_MEDIA = 16
}

/**
 * Discord Permission Overwrite
 */
export interface DiscordOverwrite {
    id: string;
    type: number;
    allow: string;
    deny: string;
}

/**
 * Discord Thread Metadata
 */
export interface DiscordThreadMetadata {
    archived: boolean;
    auto_archive_duration: number;
    archive_timestamp: string;
    locked: boolean;
    invitable?: boolean;
    create_timestamp?: string | null;
}

/**
 * Discord Thread Member
 */
export interface DiscordThreadMember {
    id?: string;
    user_id?: string;
    join_timestamp: string;
    flags: number;
    member?: unknown;
}

// ==========================================================================
// Discord Message Types
// ==========================================================================

/**
 * Discord Embed
 */
export interface DiscordEmbed {
    title?: string;
    type?: "rich" | "image" | "video" | "gifv" | "article" | "link";
    description?: string;
    url?: string;
    timestamp?: string;
    color?: number;
    footer?: DiscordEmbedFooter;
    image?: DiscordEmbedMedia;
    thumbnail?: DiscordEmbedMedia;
    video?: DiscordEmbedMedia;
    provider?: DiscordEmbedProvider;
    author?: DiscordEmbedAuthor;
    fields?: DiscordEmbedField[];
}

export interface DiscordEmbedFooter {
    text: string;
    icon_url?: string;
    proxy_icon_url?: string;
}

export interface DiscordEmbedMedia {
    url: string;
    proxy_url?: string;
    height?: number;
    width?: number;
}

export interface DiscordEmbedProvider {
    name?: string;
    url?: string;
}

export interface DiscordEmbedAuthor {
    name: string;
    url?: string;
    icon_url?: string;
    proxy_icon_url?: string;
}

export interface DiscordEmbedField {
    name: string;
    value: string;
    inline?: boolean;
}

/**
 * Discord Message Payload (for sending)
 */
export interface DiscordMessagePayload {
    content?: string;
    tts?: boolean;
    embeds?: DiscordEmbed[];
    allowed_mentions?: DiscordAllowedMentions;
    message_reference?: DiscordMessageReference;
    components?: DiscordComponent[];
    flags?: number;
}

export interface DiscordAllowedMentions {
    parse?: Array<"roles" | "users" | "everyone">;
    roles?: string[];
    users?: string[];
    replied_user?: boolean;
}

export interface DiscordMessageReference {
    message_id?: string;
    channel_id?: string;
    guild_id?: string;
    fail_if_not_exists?: boolean;
}

/**
 * Discord Component (buttons, select menus)
 */
export interface DiscordComponent {
    type: number;
    components?: DiscordComponent[];
    style?: number;
    label?: string;
    emoji?: DiscordEmoji;
    custom_id?: string;
    url?: string;
    disabled?: boolean;
    options?: DiscordSelectOption[];
    placeholder?: string;
    min_values?: number;
    max_values?: number;
}

export interface DiscordEmoji {
    id?: string | null;
    name?: string | null;
    animated?: boolean;
}

export interface DiscordSelectOption {
    label: string;
    value: string;
    description?: string;
    emoji?: DiscordEmoji;
    default?: boolean;
}

// ==========================================================================
// Discord Webhook Types
// ==========================================================================

/**
 * Discord Webhook
 */
export interface DiscordWebhook {
    id: string;
    type: DiscordWebhookType;
    guild_id?: string | null;
    channel_id?: string | null;
    user?: DiscordUser;
    name: string | null;
    avatar: string | null;
    token?: string;
    application_id: string | null;
    source_guild?: Partial<DiscordGuild>;
    source_channel?: Partial<DiscordChannel>;
    url?: string;
}

export enum DiscordWebhookType {
    Incoming = 1,
    ChannelFollower = 2,
    Application = 3
}

/**
 * Discord Webhook Message Payload
 */
export interface DiscordWebhookPayload {
    content?: string;
    username?: string;
    avatar_url?: string;
    tts?: boolean;
    embeds?: DiscordEmbed[];
    allowed_mentions?: DiscordAllowedMentions;
    components?: DiscordComponent[];
    flags?: number;
    thread_name?: string;
}

// ==========================================================================
// Discord OAuth2 Types
// ==========================================================================

/**
 * Discord OAuth2 Token Response
 */
export interface DiscordTokenResponse {
    access_token: string;
    token_type: "Bearer";
    expires_in: number;
    refresh_token: string;
    scope: string;
}

/**
 * Discord OAuth2 Error Response
 */
export interface DiscordOAuthError {
    error: string;
    error_description?: string;
}

// ==========================================================================
// FlowMaestro Discord Integration Types
// ==========================================================================

/**
 * Discord connection account info (stored in connection metadata)
 */
export interface DiscordAccountInfo {
    id: string;
    username: string;
    email?: string | null;
    avatar?: string | null;
    discriminator?: string;
    global_name?: string | null;
}

/**
 * Discord Send Message operation parameters
 */
export interface DiscordSendMessageParams {
    channelId: string;
    content?: string;
    embeds?: DiscordEmbed[];
    tts?: boolean;
}

/**
 * Discord Execute Webhook operation parameters
 */
export interface DiscordExecuteWebhookParams {
    webhookUrl: string;
    content?: string;
    username?: string;
    avatarUrl?: string;
    embeds?: DiscordEmbed[];
    tts?: boolean;
}

/**
 * Discord Create Webhook operation parameters
 */
export interface DiscordCreateWebhookParams {
    channelId: string;
    name: string;
    avatar?: string;
}

/**
 * Discord List Channels operation parameters
 */
export interface DiscordListChannelsParams {
    guildId: string;
    type?: DiscordChannelType;
}

/**
 * Discord List Guilds operation response
 */
export interface DiscordListGuildsResult {
    guilds: DiscordGuild[];
}

/**
 * Discord List Channels operation response
 */
export interface DiscordListChannelsResult {
    channels: DiscordChannel[];
}

// ==========================================================================
// Discord API Constants
// ==========================================================================

export const DISCORD_API_VERSION = "10";
export const DISCORD_API_BASE_URL = `https://discord.com/api/v${DISCORD_API_VERSION}`;
export const DISCORD_CDN_URL = "https://cdn.discordapp.com";

/**
 * Discord Bot Permission Flags
 */
export const DiscordPermissions = {
    VIEW_CHANNEL: 1n << 10n, // 1024
    SEND_MESSAGES: 1n << 11n, // 2048
    SEND_TTS_MESSAGES: 1n << 12n, // 4096
    MANAGE_MESSAGES: 1n << 13n, // 8192
    EMBED_LINKS: 1n << 14n, // 16384
    ATTACH_FILES: 1n << 15n, // 32768
    READ_MESSAGE_HISTORY: 1n << 16n, // 65536
    MENTION_EVERYONE: 1n << 17n, // 131072
    USE_EXTERNAL_EMOJIS: 1n << 18n, // 262144
    ADD_REACTIONS: 1n << 6n, // 64
    MANAGE_WEBHOOKS: 1n << 29n // 536870912
} as const;

/**
 * Calculate bot permission integer for FlowMaestro bot
 * Includes: VIEW_CHANNEL, SEND_MESSAGES, EMBED_LINKS, MANAGE_WEBHOOKS
 */
export const FLOWMAESTRO_BOT_PERMISSIONS = Number(
    DiscordPermissions.VIEW_CHANNEL |
        DiscordPermissions.SEND_MESSAGES |
        DiscordPermissions.EMBED_LINKS |
        DiscordPermissions.MANAGE_WEBHOOKS
); // 536889472

/**
 * Generate Discord avatar URL
 */
export function getDiscordAvatarUrl(userId: string, avatarHash: string | null): string | null {
    if (!avatarHash) return null;
    const extension = avatarHash.startsWith("a_") ? "gif" : "png";
    return `${DISCORD_CDN_URL}/avatars/${userId}/${avatarHash}.${extension}`;
}

/**
 * Generate Discord guild icon URL
 */
export function getDiscordGuildIconUrl(guildId: string, iconHash: string | null): string | null {
    if (!iconHash) return null;
    const extension = iconHash.startsWith("a_") ? "gif" : "png";
    return `${DISCORD_CDN_URL}/icons/${guildId}/${iconHash}.${extension}`;
}

/**
 * Generate bot invite URL with required permissions
 */
export function getDiscordBotInviteUrl(clientId: string, guildId?: string): string {
    const params = new URLSearchParams({
        client_id: clientId,
        permissions: FLOWMAESTRO_BOT_PERMISSIONS.toString(),
        scope: "bot applications.commands"
    });

    if (guildId) {
        params.set("guild_id", guildId);
        params.set("disable_guild_select", "true");
    }

    return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
