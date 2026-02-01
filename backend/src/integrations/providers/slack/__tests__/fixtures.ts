/**
 * Slack Provider Test Fixtures
 *
 * Based on official Slack API documentation:
 * - chat.postMessage: https://api.slack.com/methods/chat.postMessage
 * - conversations.list: https://api.slack.com/methods/conversations.list
 */

import type { TestFixture } from "../../../sandbox";

/**
 * Sample channels for filterableData
 * These represent a realistic Slack workspace with various channel types
 */
const sampleChannels = [
    {
        id: "C024BE91L",
        name: "general",
        isPrivate: false,
        isArchived: false,
        memberCount: 45,
        // Internal filter fields
        _type: "public_channel",
        _isGeneral: true
    },
    {
        id: "C024BE92M",
        name: "random",
        isPrivate: false,
        isArchived: false,
        memberCount: 42,
        _type: "public_channel",
        _isGeneral: false
    },
    {
        id: "C024BE93N",
        name: "engineering",
        isPrivate: false,
        isArchived: false,
        memberCount: 15,
        _type: "public_channel",
        _isGeneral: false
    },
    {
        id: "C024BE94O",
        name: "design",
        isPrivate: false,
        isArchived: false,
        memberCount: 8,
        _type: "public_channel",
        _isGeneral: false
    },
    {
        id: "C024BE95P",
        name: "sales",
        isPrivate: false,
        isArchived: false,
        memberCount: 12,
        _type: "public_channel",
        _isGeneral: false
    },
    {
        id: "C024BE96Q",
        name: "leadership",
        isPrivate: true,
        isArchived: false,
        memberCount: 5,
        _type: "private_channel",
        _isGeneral: false
    },
    {
        id: "C024BE97R",
        name: "old-project",
        isPrivate: false,
        isArchived: true,
        memberCount: 0,
        _type: "public_channel",
        _isGeneral: false
    },
    {
        id: "C024BE98S",
        name: "marketing",
        isPrivate: false,
        isArchived: false,
        memberCount: 10,
        _type: "public_channel",
        _isGeneral: false
    },
    {
        id: "C024BE99T",
        name: "customer-support",
        isPrivate: false,
        isArchived: false,
        memberCount: 7,
        _type: "public_channel",
        _isGeneral: false
    },
    {
        id: "C024BEA0U",
        name: "hr-confidential",
        isPrivate: true,
        isArchived: false,
        memberCount: 3,
        _type: "private_channel",
        _isGeneral: false
    }
];

export const slackFixtures: TestFixture[] = [
    {
        operationId: "sendMessage",
        provider: "slack",
        validCases: [
            {
                name: "simple_text_message",
                description: "Send a simple text message to a channel",
                input: {
                    channel: "#general",
                    text: "Hello, World!"
                },
                // Normalized output matching executeSendMessage return format
                expectedOutput: {
                    messageId: "1503435956.000247",
                    channel: "C024BE91L",
                    threadTimestamp: "1503435956.000247"
                }
            },
            {
                name: "message_with_thread",
                description: "Send a message as a reply in a thread",
                input: {
                    channel: "#general",
                    text: "This is a reply",
                    thread_ts: "1503435956.000000"
                },
                // Normalized output matching executeSendMessage return format
                expectedOutput: {
                    messageId: "1503435956.000248",
                    channel: "C024BE91L",
                    threadTimestamp: "1503435956.000248"
                }
            },
            {
                name: "message_with_blocks",
                description: "Send a message with Block Kit blocks",
                input: {
                    channel: "#engineering",
                    text: "Deployment notification",
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: "*Deployment Complete* :rocket:"
                            }
                        },
                        {
                            type: "section",
                            fields: [
                                { type: "mrkdwn", text: "*Environment:*\nProduction" },
                                { type: "mrkdwn", text: "*Version:*\nv2.3.1" }
                            ]
                        }
                    ]
                },
                // Normalized output matching executeSendMessage return format
                expectedOutput: {
                    messageId: "1503435956.000249",
                    channel: "C024BE93N",
                    threadTimestamp: "1503435956.000249"
                }
            },
            {
                name: "message_with_attachments",
                description: "Send a message with legacy attachments",
                input: {
                    channel: "#alerts",
                    text: "System Alert",
                    attachments: [
                        {
                            color: "danger",
                            title: "High CPU Usage",
                            text: "Server cpu-01 is experiencing high CPU usage (95%)",
                            footer: "Monitoring System",
                            ts: 1503435956
                        }
                    ]
                },
                // Normalized output matching executeSendMessage return format
                expectedOutput: {
                    messageId: "1503435956.000250",
                    channel: "C024BE91L",
                    threadTimestamp: "1503435956.000250"
                }
            }
        ],
        errorCases: [
            {
                name: "channel_not_found",
                description: "Channel does not exist",
                input: {
                    channel: "#nonexistent",
                    text: "Hello"
                },
                expectedError: {
                    type: "not_found",
                    message: "channel_not_found",
                    retryable: false
                }
            },
            {
                name: "not_in_channel",
                description: "Bot is not in the channel",
                input: {
                    channel: "#private-channel",
                    text: "Hello"
                },
                expectedError: {
                    type: "permission",
                    message: "not_in_channel",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    channel: "#rate-limit-test",
                    text: "Hello"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "ratelimited",
                    retryable: true
                }
            },
            {
                name: "message_too_long",
                description: "Message text exceeds 40,000 character limit",
                input: {
                    channel: "#general",
                    text: "x".repeat(50000)
                },
                expectedError: {
                    type: "validation",
                    message: "msg_too_long",
                    retryable: false
                }
            },
            {
                name: "invalid_blocks",
                description: "Block Kit blocks are malformed",
                input: {
                    channel: "#general",
                    text: "Test",
                    blocks: [{ type: "invalid_block_type" }]
                },
                expectedError: {
                    type: "validation",
                    message: "invalid_blocks",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listChannels",
        provider: "slack",
        filterableData: {
            records: sampleChannels,
            recordsField: "channels",
            offsetField: "nextCursor",
            defaultPageSize: 100,
            maxPageSize: 1000,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["_type", "_isGeneral", "isArchived", "isPrivate"]
            }
        },
        validCases: [
            {
                name: "list_all_channels",
                description: "List all available channels",
                input: {
                    excludeArchived: true,
                    limit: 100
                }
                // expectedOutput handled by filterableData
            },
            {
                name: "list_with_small_limit",
                description: "List channels with pagination",
                input: {
                    excludeArchived: true,
                    limit: 3
                }
                // expectedOutput handled by filterableData - will return first 3 channels and nextCursor
            }
        ],
        errorCases: [
            {
                name: "invalid_limit",
                description: "Limit exceeds maximum allowed value",
                input: {
                    limit: 2000
                },
                expectedError: {
                    type: "validation",
                    message: "invalid_limit",
                    retryable: false
                }
            },
            {
                name: "missing_scope",
                description: "Bot token lacks required scope",
                input: {
                    excludeArchived: true
                },
                expectedError: {
                    type: "permission",
                    message: "missing_scope",
                    retryable: false
                }
            }
        ]
    }
];
