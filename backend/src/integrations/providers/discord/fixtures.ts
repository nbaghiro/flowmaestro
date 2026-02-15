/**
 * Discord Provider Test Fixtures
 *
 * Based on official Discord API documentation:
 * - Webhooks: https://discord.com/developers/docs/resources/webhook
 * - Channels: https://discord.com/developers/docs/resources/channel
 * - Guilds: https://discord.com/developers/docs/resources/guild
 * - Messages: https://discord.com/developers/docs/resources/channel#message-object
 */

import type { TestFixture } from "../../sandbox";

/**
 * Sample guilds for filterableData
 * These represent a realistic set of Discord servers a user might be a member of
 */
const sampleGuilds = [
    {
        id: "1098765432109876543",
        name: "FlowMaestro Community",
        icon: "a_1234567890abcdef1234567890abcdef",
        owner: true,
        permissions: "2199023255551",
        _memberCount: 1250,
        _isOwner: true
    },
    {
        id: "1098765432109876544",
        name: "Developer Hub",
        icon: "b_2345678901bcdef12345678901bcdef1",
        owner: false,
        permissions: "1071698660929",
        _memberCount: 5420,
        _isOwner: false
    },
    {
        id: "1098765432109876545",
        name: "Gaming Lounge",
        icon: "c_3456789012cdef123456789012cdef12",
        owner: false,
        permissions: "1071698660929",
        _memberCount: 890,
        _isOwner: false
    },
    {
        id: "1098765432109876546",
        name: "Tech Support",
        icon: null,
        owner: false,
        permissions: "1071698660929",
        _memberCount: 3200,
        _isOwner: false
    },
    {
        id: "1098765432109876547",
        name: "AI & Automation",
        icon: "d_4567890123def1234567890123def123",
        owner: true,
        permissions: "2199023255551",
        _memberCount: 780,
        _isOwner: true
    },
    {
        id: "1098765432109876548",
        name: "Startup Founders",
        icon: "e_5678901234ef12345678901234ef1234",
        owner: false,
        permissions: "1071698660929",
        _memberCount: 2100,
        _isOwner: false
    },
    {
        id: "1098765432109876549",
        name: "Music Production",
        icon: "f_6789012345f123456789012345f12345",
        owner: false,
        permissions: "68608",
        _memberCount: 4500,
        _isOwner: false
    },
    {
        id: "1098765432109876550",
        name: "Open Source Projects",
        icon: "g_7890123456012345678901234560123456",
        owner: false,
        permissions: "1071698660929",
        _memberCount: 8900,
        _isOwner: false
    }
];

/**
 * Sample channels for filterableData
 * These represent a realistic Discord server with various channel types
 */
const sampleChannels = [
    {
        id: "1112223334445556667",
        name: "welcome",
        type: 0,
        typeName: "text",
        position: 0,
        parentId: "1112223334445556660",
        topic: "Welcome to the server! Please read the rules.",
        _type: "text",
        _isAnnouncement: false
    },
    {
        id: "1112223334445556668",
        name: "general",
        type: 0,
        typeName: "text",
        position: 1,
        parentId: "1112223334445556660",
        topic: "General discussion - keep it friendly!",
        _type: "text",
        _isAnnouncement: false
    },
    {
        id: "1112223334445556669",
        name: "announcements",
        type: 5,
        typeName: "announcement",
        position: 2,
        parentId: "1112223334445556660",
        topic: "Important server announcements and updates",
        _type: "announcement",
        _isAnnouncement: true
    },
    {
        id: "1112223334445556670",
        name: "help-and-support",
        type: 0,
        typeName: "text",
        position: 3,
        parentId: "1112223334445556661",
        topic: "Get help with any issues or questions",
        _type: "text",
        _isAnnouncement: false
    },
    {
        id: "1112223334445556671",
        name: "feature-requests",
        type: 15,
        typeName: "forum",
        position: 4,
        parentId: "1112223334445556661",
        topic: "Suggest new features and vote on ideas",
        _type: "forum",
        _isAnnouncement: false
    },
    {
        id: "1112223334445556672",
        name: "off-topic",
        type: 0,
        typeName: "text",
        position: 5,
        parentId: "1112223334445556662",
        topic: "Chat about anything not related to the main topic",
        _type: "text",
        _isAnnouncement: false
    },
    {
        id: "1112223334445556673",
        name: "memes",
        type: 0,
        typeName: "text",
        position: 6,
        parentId: "1112223334445556662",
        topic: "Share your favorite memes - SFW only!",
        _type: "text",
        _isAnnouncement: false
    },
    {
        id: "1112223334445556674",
        name: "voice-chat",
        type: 2,
        typeName: "voice",
        position: 7,
        parentId: "1112223334445556663",
        topic: null,
        _type: "voice",
        _isAnnouncement: false
    },
    {
        id: "1112223334445556675",
        name: "music",
        type: 2,
        typeName: "voice",
        position: 8,
        parentId: "1112223334445556663",
        topic: null,
        _type: "voice",
        _isAnnouncement: false
    },
    {
        id: "1112223334445556676",
        name: "stage-events",
        type: 13,
        typeName: "stage",
        position: 9,
        parentId: "1112223334445556663",
        topic: "Live events and presentations",
        _type: "stage",
        _isAnnouncement: false
    },
    {
        id: "1112223334445556677",
        name: "bot-commands",
        type: 0,
        typeName: "text",
        position: 10,
        parentId: "1112223334445556664",
        topic: "Use bot commands here to keep other channels clean",
        _type: "text",
        _isAnnouncement: false
    },
    {
        id: "1112223334445556678",
        name: "mod-logs",
        type: 0,
        typeName: "text",
        position: 11,
        parentId: "1112223334445556665",
        topic: "Moderation logs and actions",
        _type: "text",
        _isAnnouncement: false
    }
];

export const discordFixtures: TestFixture[] = [
    {
        operationId: "createWebhook",
        provider: "discord",
        validCases: [
            {
                name: "basic_webhook",
                description: "Create a basic webhook in a Discord channel",
                input: {
                    channelId: "1112223334445556668",
                    name: "FlowMaestro Notifications"
                },
                expectedOutput: {
                    webhookId: "1234567890123456789",
                    webhookToken: "abc123XYZ_def456-ghi789jkl012mno345pqr678stu901vwx234yz",
                    webhookUrl:
                        "https://discord.com/api/webhooks/1234567890123456789/abc123XYZ_def456-ghi789jkl012mno345pqr678stu901vwx234yz",
                    channelId: "1112223334445556668",
                    guildId: "1098765432109876543",
                    name: "FlowMaestro Notifications"
                }
            },
            {
                name: "webhook_with_avatar",
                description: "Create a webhook with a custom avatar",
                input: {
                    channelId: "1112223334445556670",
                    name: "Support Bot",
                    avatar: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                },
                expectedOutput: {
                    webhookId: "1234567890123456790",
                    webhookToken: "xyz789ABC_mno456-pqr123stu789vwx012yz345abc678def901ghi",
                    webhookUrl:
                        "https://discord.com/api/webhooks/1234567890123456790/xyz789ABC_mno456-pqr123stu789vwx012yz345abc678def901ghi",
                    channelId: "1112223334445556670",
                    guildId: "1098765432109876543",
                    name: "Support Bot"
                }
            },
            {
                name: "webhook_announcement_channel",
                description: "Create a webhook in an announcement channel",
                input: {
                    channelId: "1112223334445556669",
                    name: "Release Announcements"
                },
                expectedOutput: {
                    webhookId: "1234567890123456791",
                    webhookToken: "rel123ANN_nce456-ver789sio012upd345not678ice901pub234lish",
                    webhookUrl:
                        "https://discord.com/api/webhooks/1234567890123456791/rel123ANN_nce456-ver789sio012upd345not678ice901pub234lish",
                    channelId: "1112223334445556669",
                    guildId: "1098765432109876543",
                    name: "Release Announcements"
                }
            }
        ],
        errorCases: [
            {
                name: "channel_not_found",
                description: "Channel does not exist",
                input: {
                    channelId: "9999999999999999999",
                    name: "Test Webhook"
                },
                expectedError: {
                    type: "not_found",
                    message: "Unknown Channel",
                    retryable: false
                }
            },
            {
                name: "missing_permissions",
                description: "Bot lacks MANAGE_WEBHOOKS permission",
                input: {
                    channelId: "1112223334445556678",
                    name: "Unauthorized Webhook"
                },
                expectedError: {
                    type: "permission",
                    message: "Missing Permissions",
                    retryable: false
                }
            },
            {
                name: "max_webhooks_reached",
                description: "Channel has reached the maximum number of webhooks (15)",
                input: {
                    channelId: "1112223334445556677",
                    name: "One Too Many"
                },
                expectedError: {
                    type: "validation",
                    message: "Maximum number of webhooks reached (15)",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    channelId: "1112223334445556668",
                    name: "Rate Limited Webhook"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "You are being rate limited",
                    retryable: true
                }
            },
            {
                name: "invalid_name_too_long",
                description: "Webhook name exceeds 80 characters",
                input: {
                    channelId: "1112223334445556668",
                    name: "This webhook name is way too long and exceeds the maximum allowed character limit of eighty characters"
                },
                expectedError: {
                    type: "validation",
                    message: "Webhook name must be between 1 and 80 characters",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "executeWebhook",
        provider: "discord",
        validCases: [
            {
                name: "simple_text_message",
                description: "Send a simple text message via webhook",
                input: {
                    webhookUrl:
                        "https://discord.com/api/webhooks/1234567890123456789/abc123XYZ_def456-ghi789jkl012mno345pqr678stu901vwx234yz",
                    content: "Hello from FlowMaestro!"
                },
                expectedOutput: {
                    messageId: "1234567890123456792",
                    webhookExecuted: true
                }
            },
            {
                name: "message_with_custom_username",
                description: "Send a message with custom username and avatar",
                input: {
                    webhookUrl:
                        "https://discord.com/api/webhooks/1234567890123456789/abc123XYZ_def456-ghi789jkl012mno345pqr678stu901vwx234yz",
                    content: "Deployment successful!",
                    username: "Deploy Bot",
                    avatarUrl: "https://cdn.example.com/avatars/deploy-bot.png"
                },
                expectedOutput: {
                    messageId: "1234567890123456793",
                    webhookExecuted: true
                }
            },
            {
                name: "message_with_embed",
                description: "Send a message with a rich embed",
                input: {
                    webhookUrl:
                        "https://discord.com/api/webhooks/1234567890123456789/abc123XYZ_def456-ghi789jkl012mno345pqr678stu901vwx234yz",
                    embeds: [
                        {
                            title: "New Feature Released",
                            description:
                                "We have just released a new feature that allows you to automate Discord messages!",
                            url: "https://flowmaestro.com/changelog/discord-integration",
                            color: 5814783,
                            timestamp: "2024-01-15T10:30:00.000Z",
                            footer: {
                                text: "FlowMaestro",
                                icon_url: "https://cdn.example.com/flowmaestro-icon.png"
                            },
                            thumbnail: {
                                url: "https://cdn.example.com/feature-thumbnail.png"
                            },
                            author: {
                                name: "FlowMaestro Team",
                                url: "https://flowmaestro.com",
                                icon_url: "https://cdn.example.com/team-icon.png"
                            },
                            fields: [
                                {
                                    name: "Version",
                                    value: "2.5.0",
                                    inline: true
                                },
                                {
                                    name: "Release Date",
                                    value: "January 15, 2024",
                                    inline: true
                                },
                                {
                                    name: "Highlights",
                                    value: "- Discord webhook support\n- Rich embed messages\n- Custom avatars",
                                    inline: false
                                }
                            ]
                        }
                    ]
                },
                expectedOutput: {
                    messageId: "1234567890123456794",
                    webhookExecuted: true
                }
            },
            {
                name: "message_with_multiple_embeds",
                description: "Send a message with multiple embeds",
                input: {
                    webhookUrl:
                        "https://discord.com/api/webhooks/1234567890123456789/abc123XYZ_def456-ghi789jkl012mno345pqr678stu901vwx234yz",
                    content: "Here are the latest stats:",
                    embeds: [
                        {
                            title: "Server Stats",
                            color: 3447003,
                            fields: [
                                { name: "Members", value: "1,250", inline: true },
                                { name: "Online", value: "342", inline: true },
                                { name: "Messages Today", value: "4,521", inline: true }
                            ]
                        },
                        {
                            title: "Performance",
                            color: 15158332,
                            fields: [
                                { name: "Uptime", value: "99.9%", inline: true },
                                { name: "Response Time", value: "45ms", inline: true },
                                { name: "API Calls", value: "12,345", inline: true }
                            ]
                        }
                    ]
                },
                expectedOutput: {
                    messageId: "1234567890123456795",
                    webhookExecuted: true
                }
            },
            {
                name: "tts_message",
                description: "Send a text-to-speech message",
                input: {
                    webhookUrl:
                        "https://discord.com/api/webhooks/1234567890123456789/abc123XYZ_def456-ghi789jkl012mno345pqr678stu901vwx234yz",
                    content: "Attention everyone! Important announcement incoming.",
                    tts: true
                },
                expectedOutput: {
                    messageId: "1234567890123456796",
                    webhookExecuted: true
                }
            },
            {
                name: "alert_embed",
                description: "Send an alert notification embed",
                input: {
                    webhookUrl:
                        "https://discord.com/api/webhooks/1234567890123456789/abc123XYZ_def456-ghi789jkl012mno345pqr678stu901vwx234yz",
                    username: "Alert System",
                    embeds: [
                        {
                            title: "High CPU Usage Alert",
                            description: "Server **prod-api-01** is experiencing high CPU usage.",
                            color: 15548997,
                            timestamp: "2024-01-15T14:22:00.000Z",
                            fields: [
                                { name: "Server", value: "prod-api-01", inline: true },
                                { name: "CPU Usage", value: "95%", inline: true },
                                { name: "Duration", value: "5 minutes", inline: true },
                                { name: "Status", value: "CRITICAL", inline: false }
                            ],
                            footer: {
                                text: "Monitoring System"
                            }
                        }
                    ]
                },
                expectedOutput: {
                    messageId: "1234567890123456797",
                    webhookExecuted: true
                }
            }
        ],
        errorCases: [
            {
                name: "webhook_not_found",
                description: "Webhook does not exist or has been deleted",
                input: {
                    webhookUrl:
                        "https://discord.com/api/webhooks/9999999999999999999/invalid_token_that_does_not_exist",
                    content: "This will fail"
                },
                expectedError: {
                    type: "not_found",
                    message: "Unknown Webhook",
                    retryable: false
                }
            },
            {
                name: "invalid_webhook_token",
                description: "Webhook token is invalid",
                input: {
                    webhookUrl:
                        "https://discord.com/api/webhooks/1234567890123456789/invalid_token",
                    content: "This will fail"
                },
                expectedError: {
                    type: "permission",
                    message: "Invalid Webhook Token",
                    retryable: false
                }
            },
            {
                name: "empty_message",
                description: "Message has neither content nor embeds",
                input: {
                    webhookUrl:
                        "https://discord.com/api/webhooks/1234567890123456789/abc123XYZ_def456-ghi789jkl012mno345pqr678stu901vwx234yz"
                },
                expectedError: {
                    type: "validation",
                    message: "Webhook message must have either content or embeds",
                    retryable: false
                }
            },
            {
                name: "content_too_long",
                description: "Message content exceeds 2000 characters",
                input: {
                    webhookUrl:
                        "https://discord.com/api/webhooks/1234567890123456789/abc123XYZ_def456-ghi789jkl012mno345pqr678stu901vwx234yz",
                    content: "x".repeat(2001)
                },
                expectedError: {
                    type: "validation",
                    message: "Content must be 2000 characters or less",
                    retryable: false
                }
            },
            {
                name: "too_many_embeds",
                description: "Message has more than 10 embeds",
                input: {
                    webhookUrl:
                        "https://discord.com/api/webhooks/1234567890123456789/abc123XYZ_def456-ghi789jkl012mno345pqr678stu901vwx234yz",
                    embeds: Array(11)
                        .fill(null)
                        .map((_, i) => ({
                            title: `Embed ${i + 1}`,
                            description: "Too many embeds"
                        }))
                },
                expectedError: {
                    type: "validation",
                    message: "Maximum of 10 embeds allowed",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded on webhook",
                input: {
                    webhookUrl:
                        "https://discord.com/api/webhooks/1234567890123456789/abc123XYZ_def456-ghi789jkl012mno345pqr678stu901vwx234yz",
                    content: "Rate limit test"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "You are being rate limited",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listChannels",
        provider: "discord",
        filterableData: {
            records: sampleChannels,
            recordsField: "channels",
            defaultPageSize: 50,
            maxPageSize: 100,
            filterConfig: {
                type: "generic",
                filterableFields: ["_type", "_isAnnouncement", "parentId"]
            }
        },
        validCases: [
            {
                name: "list_all_channels",
                description: "List all channels in a Discord server",
                input: {
                    guildId: "1098765432109876543",
                    textOnly: false
                }
            },
            {
                name: "list_text_channels_only",
                description: "List only text channels (excluding voice, categories, etc.)",
                input: {
                    guildId: "1098765432109876543",
                    textOnly: true
                }
            },
            {
                name: "list_channels_different_guild",
                description: "List channels in a different server",
                input: {
                    guildId: "1098765432109876544",
                    textOnly: true
                },
                expectedOutput: {
                    channels: [
                        {
                            id: "2223334445556667778",
                            name: "general",
                            type: 0,
                            typeName: "text",
                            position: 0,
                            parentId: null,
                            topic: "Main discussion channel"
                        },
                        {
                            id: "2223334445556667779",
                            name: "dev-chat",
                            type: 0,
                            typeName: "text",
                            position: 1,
                            parentId: null,
                            topic: "Developer discussions"
                        }
                    ],
                    count: 2,
                    guildId: "1098765432109876544"
                }
            }
        ],
        errorCases: [
            {
                name: "guild_not_found",
                description: "Guild does not exist",
                input: {
                    guildId: "9999999999999999999",
                    textOnly: true
                },
                expectedError: {
                    type: "not_found",
                    message: "Unknown Guild",
                    retryable: false
                }
            },
            {
                name: "missing_access",
                description: "Bot is not a member of the guild",
                input: {
                    guildId: "1111111111111111111",
                    textOnly: true
                },
                expectedError: {
                    type: "permission",
                    message: "Missing Access",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    guildId: "1098765432109876543",
                    textOnly: true
                },
                expectedError: {
                    type: "rate_limit",
                    message: "You are being rate limited",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listGuilds",
        provider: "discord",
        filterableData: {
            records: sampleGuilds,
            recordsField: "guilds",
            defaultPageSize: 100,
            maxPageSize: 200,
            filterConfig: {
                type: "generic",
                filterableFields: ["_isOwner"]
            }
        },
        validCases: [
            {
                name: "list_all_guilds",
                description: "List all guilds the bot/user is a member of",
                input: {}
            },
            {
                name: "list_guilds_empty_params",
                description: "List guilds with no parameters",
                input: {},
                expectedOutput: {
                    guilds: sampleGuilds.map((g) => ({
                        id: g.id,
                        name: g.name,
                        icon: g.icon,
                        owner: g.owner,
                        permissions: g.permissions
                    })),
                    count: sampleGuilds.length
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_token",
                description: "OAuth token is invalid or expired",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "401: Unauthorized",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "You are being rate limited",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "sendMessage",
        provider: "discord",
        validCases: [
            {
                name: "simple_text_message",
                description: "Send a simple text message to a channel",
                input: {
                    channelId: "1112223334445556668",
                    content: "Hello, World!"
                },
                expectedOutput: {
                    messageId: "1234567890123456798",
                    channelId: "1112223334445556668",
                    guildId: "1098765432109876543",
                    timestamp: "2024-01-15T10:30:00.000Z"
                }
            },
            {
                name: "message_with_mentions",
                description: "Send a message with user and role mentions",
                input: {
                    channelId: "1112223334445556668",
                    content:
                        "Hey <@123456789012345678>! Check out this update. cc <@&987654321098765432>"
                },
                expectedOutput: {
                    messageId: "1234567890123456799",
                    channelId: "1112223334445556668",
                    guildId: "1098765432109876543",
                    timestamp: "2024-01-15T10:31:00.000Z"
                }
            },
            {
                name: "message_with_embed",
                description: "Send a message with a rich embed",
                input: {
                    channelId: "1112223334445556668",
                    embeds: [
                        {
                            title: "Build Status",
                            description: "The latest build has completed successfully.",
                            color: 3066993,
                            timestamp: "2024-01-15T10:32:00.000Z",
                            fields: [
                                { name: "Branch", value: "main", inline: true },
                                { name: "Commit", value: "abc1234", inline: true },
                                { name: "Duration", value: "2m 34s", inline: true }
                            ],
                            footer: {
                                text: "CI/CD Pipeline"
                            }
                        }
                    ]
                },
                expectedOutput: {
                    messageId: "1234567890123456800",
                    channelId: "1112223334445556668",
                    guildId: "1098765432109876543",
                    timestamp: "2024-01-15T10:32:00.000Z"
                }
            },
            {
                name: "message_with_image_embed",
                description: "Send a message with an image embed",
                input: {
                    channelId: "1112223334445556673",
                    embeds: [
                        {
                            title: "Screenshot of the Day",
                            description: "Check out this amazing view!",
                            color: 15844367,
                            image: {
                                url: "https://cdn.example.com/screenshots/amazing-view.png"
                            },
                            footer: {
                                text: "Shared by CommunityBot"
                            }
                        }
                    ]
                },
                expectedOutput: {
                    messageId: "1234567890123456801",
                    channelId: "1112223334445556673",
                    guildId: "1098765432109876543",
                    timestamp: "2024-01-15T10:33:00.000Z"
                }
            },
            {
                name: "message_content_and_embed",
                description: "Send a message with both text content and embed",
                input: {
                    channelId: "1112223334445556668",
                    content: "Here are the weekly stats:",
                    embeds: [
                        {
                            title: "Weekly Activity Report",
                            color: 9807270,
                            fields: [
                                { name: "Messages", value: "15,234", inline: true },
                                { name: "Active Users", value: "892", inline: true },
                                { name: "New Members", value: "+47", inline: true }
                            ]
                        }
                    ]
                },
                expectedOutput: {
                    messageId: "1234567890123456802",
                    channelId: "1112223334445556668",
                    guildId: "1098765432109876543",
                    timestamp: "2024-01-15T10:34:00.000Z"
                }
            },
            {
                name: "tts_message",
                description: "Send a text-to-speech message",
                input: {
                    channelId: "1112223334445556668",
                    content: "Important announcement: Server maintenance in 10 minutes!",
                    tts: true
                },
                expectedOutput: {
                    messageId: "1234567890123456803",
                    channelId: "1112223334445556668",
                    guildId: "1098765432109876543",
                    timestamp: "2024-01-15T10:35:00.000Z"
                }
            },
            {
                name: "message_with_code_block",
                description: "Send a message with a code block",
                input: {
                    channelId: "1112223334445556670",
                    content:
                        "Here is the solution:\n```javascript\nconst greeting = 'Hello, Discord!';\nconsole.log(greeting);\n```"
                },
                expectedOutput: {
                    messageId: "1234567890123456804",
                    channelId: "1112223334445556670",
                    guildId: "1098765432109876543",
                    timestamp: "2024-01-15T10:36:00.000Z"
                }
            },
            {
                name: "message_with_author_embed",
                description: "Send a message with an author in the embed",
                input: {
                    channelId: "1112223334445556669",
                    embeds: [
                        {
                            author: {
                                name: "FlowMaestro Team",
                                url: "https://flowmaestro.com",
                                icon_url: "https://cdn.example.com/flowmaestro-logo.png"
                            },
                            title: "Version 3.0 Released!",
                            description:
                                "We are excited to announce the release of FlowMaestro v3.0 with Discord integration!",
                            color: 5793266,
                            url: "https://flowmaestro.com/releases/v3.0",
                            thumbnail: {
                                url: "https://cdn.example.com/v3-badge.png"
                            },
                            fields: [
                                {
                                    name: "New Features",
                                    value: "- Discord webhooks\n- Rich embeds\n- Channel management",
                                    inline: false
                                },
                                {
                                    name: "Documentation",
                                    value: "[View Docs](https://docs.flowmaestro.com/discord)",
                                    inline: true
                                }
                            ],
                            footer: {
                                text: "Release Announcement",
                                icon_url: "https://cdn.example.com/release-icon.png"
                            },
                            timestamp: "2024-01-15T12:00:00.000Z"
                        }
                    ]
                },
                expectedOutput: {
                    messageId: "1234567890123456805",
                    channelId: "1112223334445556669",
                    guildId: "1098765432109876543",
                    timestamp: "2024-01-15T12:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "channel_not_found",
                description: "Channel does not exist",
                input: {
                    channelId: "9999999999999999999",
                    content: "This will fail"
                },
                expectedError: {
                    type: "not_found",
                    message: "Unknown Channel",
                    retryable: false
                }
            },
            {
                name: "missing_permissions",
                description: "Bot lacks SEND_MESSAGES permission",
                input: {
                    channelId: "1112223334445556678",
                    content: "No permission to send here"
                },
                expectedError: {
                    type: "permission",
                    message: "Missing Permissions",
                    retryable: false
                }
            },
            {
                name: "empty_message",
                description: "Message has neither content nor embeds",
                input: {
                    channelId: "1112223334445556668"
                },
                expectedError: {
                    type: "validation",
                    message: "Message must have either content or embeds",
                    retryable: false
                }
            },
            {
                name: "content_too_long",
                description: "Message content exceeds 2000 characters",
                input: {
                    channelId: "1112223334445556668",
                    content: "x".repeat(2001)
                },
                expectedError: {
                    type: "validation",
                    message: "Content must be 2000 characters or less",
                    retryable: false
                }
            },
            {
                name: "too_many_embeds",
                description: "Message has more than 10 embeds",
                input: {
                    channelId: "1112223334445556668",
                    embeds: Array(11)
                        .fill(null)
                        .map((_, i) => ({
                            title: `Embed ${i + 1}`,
                            description: "Too many embeds"
                        }))
                },
                expectedError: {
                    type: "validation",
                    message: "Maximum of 10 embeds allowed",
                    retryable: false
                }
            },
            {
                name: "embed_too_large",
                description: "Embed description exceeds 4096 characters",
                input: {
                    channelId: "1112223334445556668",
                    embeds: [
                        {
                            title: "Large Embed",
                            description: "x".repeat(4097)
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "Embed description must be 4096 characters or less",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    channelId: "1112223334445556668",
                    content: "Rate limit test"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "You are being rate limited",
                    retryable: true
                }
            },
            {
                name: "cannot_send_to_voice",
                description: "Cannot send text message to voice channel",
                input: {
                    channelId: "1112223334445556674",
                    content: "This is a voice channel"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot send messages to this channel type",
                    retryable: false
                }
            }
        ]
    }
];
