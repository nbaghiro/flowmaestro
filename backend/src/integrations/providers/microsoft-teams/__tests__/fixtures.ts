/**
 * Microsoft Teams Provider Test Fixtures
 *
 * Based on Microsoft Graph API documentation:
 * - Teams: https://learn.microsoft.com/en-us/graph/api/resources/team
 * - Channels: https://learn.microsoft.com/en-us/graph/api/resources/channel
 * - Chat: https://learn.microsoft.com/en-us/graph/api/resources/chat
 */

import type { TestFixture } from "../../../sandbox";

/**
 * Sample teams for filterable data
 */
const sampleTeams = [
    {
        id: "19:a3b1c2d3e4f5-6789-abcd-ef01-234567890abc@thread.tacv2",
        displayName: "Engineering Team",
        description: "Core engineering and development team",
        visibility: "private",
        webUrl: "https://teams.microsoft.com/l/team/19%3aa3b1c2d3e4f5%40thread.tacv2",
        _department: "engineering"
    },
    {
        id: "19:b4c2d3e4f5a6-7890-bcde-f012-345678901bcd@thread.tacv2",
        displayName: "Product Team",
        description: "Product management and strategy",
        visibility: "private",
        webUrl: "https://teams.microsoft.com/l/team/19%3ab4c2d3e4f5a6%40thread.tacv2",
        _department: "product"
    },
    {
        id: "19:c5d3e4f5a6b7-8901-cdef-0123-456789012cde@thread.tacv2",
        displayName: "Marketing",
        description: "Marketing and communications team",
        visibility: "public",
        webUrl: "https://teams.microsoft.com/l/team/19%3ac5d3e4f5a6b7%40thread.tacv2",
        _department: "marketing"
    }
];

/**
 * Sample channels for filterable data
 */
const sampleChannels = [
    {
        id: "19:general@thread.tacv2",
        displayName: "General",
        description: "General discussions for the team",
        membershipType: "standard",
        webUrl: "https://teams.microsoft.com/l/channel/19%3ageneral%40thread.tacv2",
        _isDefault: true
    },
    {
        id: "19:engineering-updates@thread.tacv2",
        displayName: "Engineering Updates",
        description: "Daily standups and engineering updates",
        membershipType: "standard",
        webUrl: "https://teams.microsoft.com/l/channel/19%3aengineering-updates%40thread.tacv2",
        _isDefault: false
    },
    {
        id: "19:leadership-private@thread.tacv2",
        displayName: "Leadership",
        description: "Private leadership discussions",
        membershipType: "private",
        webUrl: "https://teams.microsoft.com/l/channel/19%3aleadership-private%40thread.tacv2",
        _isDefault: false
    }
];

export const microsoftTeamsFixtures: TestFixture[] = [
    {
        operationId: "createChannel",
        provider: "microsoft-teams",
        validCases: [
            {
                name: "create_standard_channel",
                description: "Create a new standard channel in a Microsoft Team",
                input: {
                    teamId: "19:a3b1c2d3e4f5-6789-abcd-ef01-234567890abc@thread.tacv2",
                    displayName: "Project Alpha",
                    description: "Channel for Project Alpha discussions",
                    membershipType: "standard"
                },
                expectedOutput: {
                    id: "19:project-alpha@thread.tacv2",
                    displayName: "Project Alpha",
                    description: "Channel for Project Alpha discussions",
                    membershipType: "standard",
                    webUrl: "https://teams.microsoft.com/l/channel/19%3aproject-alpha%40thread.tacv2"
                }
            },
            {
                name: "create_private_channel",
                description: "Create a private channel with restricted membership",
                input: {
                    teamId: "19:a3b1c2d3e4f5-6789-abcd-ef01-234567890abc@thread.tacv2",
                    displayName: "Confidential HR",
                    description: "Private HR discussions",
                    membershipType: "private"
                },
                expectedOutput: {
                    id: "19:confidential-hr@thread.tacv2",
                    displayName: "Confidential HR",
                    description: "Private HR discussions",
                    membershipType: "private",
                    webUrl: "https://teams.microsoft.com/l/channel/19%3aconfidential-hr%40thread.tacv2"
                }
            },
            {
                name: "create_channel_minimal",
                description: "Create a channel with only required fields",
                input: {
                    teamId: "19:a3b1c2d3e4f5-6789-abcd-ef01-234567890abc@thread.tacv2",
                    displayName: "Quick Updates"
                },
                expectedOutput: {
                    id: "19:quick-updates@thread.tacv2",
                    displayName: "Quick Updates",
                    membershipType: "standard",
                    webUrl: "https://teams.microsoft.com/l/channel/19%3aquick-updates%40thread.tacv2"
                }
            }
        ],
        errorCases: [
            {
                name: "team_not_found",
                description: "Team does not exist",
                input: {
                    teamId: "19:nonexistent-team@thread.tacv2",
                    displayName: "Test Channel"
                },
                expectedError: {
                    type: "not_found",
                    message: "Team not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    teamId: "19:rate-limit-test@thread.tacv2",
                    displayName: "Test Channel"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 30 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getChannel",
        provider: "microsoft-teams",
        validCases: [
            {
                name: "get_standard_channel",
                description: "Get details of a standard channel",
                input: {
                    teamId: "19:a3b1c2d3e4f5-6789-abcd-ef01-234567890abc@thread.tacv2",
                    channelId: "19:general@thread.tacv2"
                },
                expectedOutput: {
                    id: "19:general@thread.tacv2",
                    displayName: "General",
                    description: "General discussions for the team",
                    membershipType: "standard",
                    webUrl: "https://teams.microsoft.com/l/channel/19%3ageneral%40thread.tacv2",
                    createdDateTime: "2024-01-15T09:00:00Z"
                }
            },
            {
                name: "get_private_channel",
                description: "Get details of a private channel",
                input: {
                    teamId: "19:a3b1c2d3e4f5-6789-abcd-ef01-234567890abc@thread.tacv2",
                    channelId: "19:leadership-private@thread.tacv2"
                },
                expectedOutput: {
                    id: "19:leadership-private@thread.tacv2",
                    displayName: "Leadership",
                    description: "Private leadership discussions",
                    membershipType: "private",
                    webUrl: "https://teams.microsoft.com/l/channel/19%3aleadership-private%40thread.tacv2",
                    createdDateTime: "2024-02-20T14:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "channel_not_found",
                description: "Channel does not exist",
                input: {
                    teamId: "19:a3b1c2d3e4f5-6789-abcd-ef01-234567890abc@thread.tacv2",
                    channelId: "19:nonexistent@thread.tacv2"
                },
                expectedError: {
                    type: "not_found",
                    message: "Channel not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    teamId: "19:rate-limit-test@thread.tacv2",
                    channelId: "19:general@thread.tacv2"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getTeam",
        provider: "microsoft-teams",
        validCases: [
            {
                name: "get_engineering_team",
                description: "Get details of the engineering team",
                input: {
                    teamId: "19:a3b1c2d3e4f5-6789-abcd-ef01-234567890abc@thread.tacv2"
                },
                expectedOutput: {
                    id: "19:a3b1c2d3e4f5-6789-abcd-ef01-234567890abc@thread.tacv2",
                    displayName: "Engineering Team",
                    description: "Core engineering and development team",
                    visibility: "private",
                    webUrl: "https://teams.microsoft.com/l/team/19%3aa3b1c2d3e4f5%40thread.tacv2",
                    createdDateTime: "2023-06-01T10:00:00Z",
                    memberSettings: {
                        allowCreateUpdateChannels: true,
                        allowDeleteChannels: false
                    }
                }
            },
            {
                name: "get_marketing_team",
                description: "Get details of a public team",
                input: {
                    teamId: "19:c5d3e4f5a6b7-8901-cdef-0123-456789012cde@thread.tacv2"
                },
                expectedOutput: {
                    id: "19:c5d3e4f5a6b7-8901-cdef-0123-456789012cde@thread.tacv2",
                    displayName: "Marketing",
                    description: "Marketing and communications team",
                    visibility: "public",
                    webUrl: "https://teams.microsoft.com/l/team/19%3ac5d3e4f5a6b7%40thread.tacv2",
                    createdDateTime: "2023-09-15T08:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "team_not_found",
                description: "Team does not exist",
                input: {
                    teamId: "19:nonexistent-team-id@thread.tacv2"
                },
                expectedError: {
                    type: "not_found",
                    message: "Team not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    teamId: "19:rate-limit-test@thread.tacv2"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listChannelMessages",
        provider: "microsoft-teams",
        validCases: [
            {
                name: "list_recent_messages",
                description: "List recent messages in a channel",
                input: {
                    teamId: "19:a3b1c2d3e4f5-6789-abcd-ef01-234567890abc@thread.tacv2",
                    channelId: "19:general@thread.tacv2",
                    top: 10
                },
                expectedOutput: {
                    messages: [
                        {
                            id: "1703001234567",
                            content: "Hey team, the deployment is complete!",
                            contentType: "text",
                            from: "John Smith",
                            createdDateTime: "2024-12-19T14:30:00Z",
                            messageType: "message"
                        },
                        {
                            id: "1703001234568",
                            content:
                                "<p>Great work everyone! <strong>Milestone achieved.</strong></p>",
                            contentType: "html",
                            from: "Jane Doe",
                            createdDateTime: "2024-12-19T14:35:00Z",
                            messageType: "message"
                        },
                        {
                            id: "1703001234569",
                            content: "Thanks for the update!",
                            contentType: "text",
                            from: "Mike Johnson",
                            createdDateTime: "2024-12-19T14:40:00Z",
                            messageType: "message"
                        }
                    ],
                    hasMore: true
                }
            },
            {
                name: "list_messages_default_limit",
                description: "List messages without specifying limit",
                input: {
                    teamId: "19:a3b1c2d3e4f5-6789-abcd-ef01-234567890abc@thread.tacv2",
                    channelId: "19:engineering-updates@thread.tacv2"
                },
                expectedOutput: {
                    messages: [
                        {
                            id: "1703001234570",
                            content: "Daily standup at 10 AM",
                            contentType: "text",
                            from: "Sarah Wilson",
                            createdDateTime: "2024-12-19T09:00:00Z",
                            messageType: "message"
                        }
                    ],
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "channel_not_found",
                description: "Channel does not exist",
                input: {
                    teamId: "19:a3b1c2d3e4f5-6789-abcd-ef01-234567890abc@thread.tacv2",
                    channelId: "19:nonexistent@thread.tacv2"
                },
                expectedError: {
                    type: "not_found",
                    message: "Channel not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    teamId: "19:rate-limit-test@thread.tacv2",
                    channelId: "19:general@thread.tacv2"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listChannels",
        provider: "microsoft-teams",
        filterableData: {
            records: sampleChannels,
            recordsField: "channels",
            defaultPageSize: 50,
            maxPageSize: 100,
            filterConfig: {
                type: "generic",
                filterableFields: ["membershipType", "_isDefault"]
            }
        },
        validCases: [
            {
                name: "list_all_channels",
                description: "List all channels in a team",
                input: {
                    teamId: "19:a3b1c2d3e4f5-6789-abcd-ef01-234567890abc@thread.tacv2"
                }
            },
            {
                name: "list_channels_specific_team",
                description: "List channels for a specific team",
                input: {
                    teamId: "19:b4c2d3e4f5a6-7890-bcde-f012-345678901bcd@thread.tacv2"
                }
            }
        ],
        errorCases: [
            {
                name: "team_not_found",
                description: "Team does not exist",
                input: {
                    teamId: "19:nonexistent-team@thread.tacv2"
                },
                expectedError: {
                    type: "not_found",
                    message: "Team not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    teamId: "19:rate-limit-test@thread.tacv2"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listChatMembers",
        provider: "microsoft-teams",
        validCases: [
            {
                name: "list_group_chat_members",
                description: "List members of a group chat",
                input: {
                    chatId: "19:meeting_ZGFhY2E3YzEtNGFhZi00YmQ5LWI5ZGEtZjg5NTU5MzVhMDg5@thread.v2"
                },
                expectedOutput: {
                    members: [
                        {
                            id: "MCMjMCMjMzI5NjhlZmYtMzRkMS00NmZhLWI4YmItNGE3YTA0MWQ5ZGU0",
                            displayName: "John Smith",
                            email: "john.smith@contoso.com",
                            roles: ["owner"]
                        },
                        {
                            id: "MCMjMCMjYjQ4NjYzMmQtZDhmNC00NDM3LTg2MzUtMmZjZjgwYzA5Y2U0",
                            displayName: "Jane Doe",
                            email: "jane.doe@contoso.com",
                            roles: ["member"]
                        },
                        {
                            id: "MCMjMCMjN2Q1ZWZkMjgtYmYyYy00YTQ2LThiYmQtMjhkNzc3NmUzYmU0",
                            displayName: "Mike Johnson",
                            email: "mike.johnson@contoso.com",
                            roles: ["member"]
                        }
                    ],
                    hasMore: false
                }
            },
            {
                name: "list_one_on_one_chat_members",
                description: "List members of a 1:1 chat",
                input: {
                    chatId: "19:oneOnOne_ZGFhY2E3YzEtNGFhZi00YmQ5@thread.v2"
                },
                expectedOutput: {
                    members: [
                        {
                            id: "MCMjMCMjMzI5NjhlZmYtMzRkMS00NmZhLWI4YmItNGE3YTA0MWQ5ZGU0",
                            displayName: "John Smith",
                            email: "john.smith@contoso.com",
                            roles: ["owner"]
                        },
                        {
                            id: "MCMjMCMjYjQ4NjYzMmQtZDhmNC00NDM3LTg2MzUtMmZjZjgwYzA5Y2U0",
                            displayName: "Jane Doe",
                            email: "jane.doe@contoso.com",
                            roles: ["owner"]
                        }
                    ],
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "chat_not_found",
                description: "Chat does not exist",
                input: {
                    chatId: "19:nonexistent-chat@thread.v2"
                },
                expectedError: {
                    type: "not_found",
                    message: "Chat not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    chatId: "19:rate-limit-test@thread.v2"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listChatMessages",
        provider: "microsoft-teams",
        validCases: [
            {
                name: "list_chat_messages",
                description: "List messages in a chat",
                input: {
                    chatId: "19:meeting_ZGFhY2E3YzEtNGFhZi00YmQ5LWI5ZGEtZjg5NTU5MzVhMDg5@thread.v2",
                    top: 20
                },
                expectedOutput: {
                    messages: [
                        {
                            id: "1703001234580",
                            content: "Hi everyone, let's discuss the Q1 planning",
                            contentType: "text",
                            from: "John Smith",
                            createdDateTime: "2024-12-19T10:00:00Z",
                            messageType: "message"
                        },
                        {
                            id: "1703001234581",
                            content: "Sounds good! I have some ideas to share",
                            contentType: "text",
                            from: "Jane Doe",
                            createdDateTime: "2024-12-19T10:05:00Z",
                            messageType: "message"
                        }
                    ],
                    hasMore: true
                }
            },
            {
                name: "list_chat_messages_minimal",
                description: "List chat messages with default options",
                input: {
                    chatId: "19:oneOnOne_ZGFhY2E3YzEtNGFhZi00YmQ5@thread.v2"
                },
                expectedOutput: {
                    messages: [
                        {
                            id: "1703001234582",
                            content: "Quick question about the API",
                            contentType: "text",
                            from: "Mike Johnson",
                            createdDateTime: "2024-12-19T11:00:00Z",
                            messageType: "message"
                        }
                    ],
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "chat_not_found",
                description: "Chat does not exist",
                input: {
                    chatId: "19:nonexistent-chat@thread.v2"
                },
                expectedError: {
                    type: "not_found",
                    message: "Chat not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    chatId: "19:rate-limit-test@thread.v2"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listChats",
        provider: "microsoft-teams",
        validCases: [
            {
                name: "list_user_chats",
                description: "List all chats for the current user",
                input: {
                    top: 25
                },
                expectedOutput: {
                    chats: [
                        {
                            id: "19:meeting_ZGFhY2E3YzEtNGFhZi00YmQ5LWI5ZGEtZjg5NTU5MzVhMDg5@thread.v2",
                            topic: "Q1 Planning Meeting",
                            chatType: "group",
                            webUrl: "https://teams.microsoft.com/l/chat/19%3ameeting%40thread.v2",
                            lastUpdatedDateTime: "2024-12-19T10:05:00Z"
                        },
                        {
                            id: "19:oneOnOne_ZGFhY2E3YzEtNGFhZi00YmQ5@thread.v2",
                            topic: null,
                            chatType: "oneOnOne",
                            webUrl: "https://teams.microsoft.com/l/chat/19%3aoneOnOne%40thread.v2",
                            lastUpdatedDateTime: "2024-12-19T11:00:00Z"
                        },
                        {
                            id: "19:meeting_YmI5ZDdhODAtOWRiMS00YmMzLWExNDMtNjU2NWE3YTVkYWY2@thread.v2",
                            topic: "Design Review",
                            chatType: "meeting",
                            webUrl: "https://teams.microsoft.com/l/chat/19%3ameeting2%40thread.v2",
                            lastUpdatedDateTime: "2024-12-18T16:30:00Z"
                        }
                    ],
                    hasMore: true
                }
            },
            {
                name: "list_chats_default",
                description: "List chats with default pagination",
                input: {},
                expectedOutput: {
                    chats: [
                        {
                            id: "19:meeting_ZGFhY2E3YzEtNGFhZi00YmQ5LWI5ZGEtZjg5NTU5MzVhMDg5@thread.v2",
                            topic: "Q1 Planning Meeting",
                            chatType: "group",
                            webUrl: "https://teams.microsoft.com/l/chat/19%3ameeting%40thread.v2",
                            lastUpdatedDateTime: "2024-12-19T10:05:00Z"
                        }
                    ],
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "User not authorized to access chats",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Access denied. Chat.Read permission required.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    top: 50
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listJoinedTeams",
        provider: "microsoft-teams",
        filterableData: {
            records: sampleTeams,
            recordsField: "teams",
            defaultPageSize: 100,
            maxPageSize: 999,
            filterConfig: {
                type: "generic",
                filterableFields: ["visibility", "_department"]
            }
        },
        validCases: [
            {
                name: "list_all_joined_teams",
                description: "List all teams the user is a member of",
                input: {}
            },
            {
                name: "list_teams_with_filter",
                description: "List teams with visibility filter",
                input: {}
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "User not authorized",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Access denied. Team.ReadBasic.All permission required.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "replyToChannelMessage",
        provider: "microsoft-teams",
        validCases: [
            {
                name: "reply_text_message",
                description: "Reply to a channel message with plain text",
                input: {
                    teamId: "19:a3b1c2d3e4f5-6789-abcd-ef01-234567890abc@thread.tacv2",
                    channelId: "19:general@thread.tacv2",
                    messageId: "1703001234567",
                    content: "Thanks for the update! I'll follow up tomorrow.",
                    contentType: "text"
                },
                expectedOutput: {
                    messageId: "1703001234590",
                    createdDateTime: "2024-12-19T15:00:00Z"
                }
            },
            {
                name: "reply_html_message",
                description: "Reply to a channel message with HTML content",
                input: {
                    teamId: "19:a3b1c2d3e4f5-6789-abcd-ef01-234567890abc@thread.tacv2",
                    channelId: "19:engineering-updates@thread.tacv2",
                    messageId: "1703001234570",
                    content:
                        "<p>Great point! Here's my <strong>feedback</strong>:</p><ul><li>Item 1</li><li>Item 2</li></ul>",
                    contentType: "html"
                },
                expectedOutput: {
                    messageId: "1703001234591",
                    createdDateTime: "2024-12-19T15:05:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "message_not_found",
                description: "Parent message does not exist",
                input: {
                    teamId: "19:a3b1c2d3e4f5-6789-abcd-ef01-234567890abc@thread.tacv2",
                    channelId: "19:general@thread.tacv2",
                    messageId: "9999999999999",
                    content: "Reply to nonexistent message"
                },
                expectedError: {
                    type: "not_found",
                    message: "Message not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    teamId: "19:rate-limit-test@thread.tacv2",
                    channelId: "19:general@thread.tacv2",
                    messageId: "1703001234567",
                    content: "Test reply"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "sendChannelMessage",
        provider: "microsoft-teams",
        validCases: [
            {
                name: "send_text_message",
                description: "Send a plain text message to a channel",
                input: {
                    teamId: "19:a3b1c2d3e4f5-6789-abcd-ef01-234567890abc@thread.tacv2",
                    channelId: "19:general@thread.tacv2",
                    content: "Hello team! This is an important announcement.",
                    contentType: "text"
                },
                expectedOutput: {
                    messageId: "1703001234600",
                    createdDateTime: "2024-12-19T16:00:00Z",
                    webUrl: "https://teams.microsoft.com/l/message/19%3ageneral%40thread.tacv2/1703001234600"
                }
            },
            {
                name: "send_html_message",
                description: "Send a formatted HTML message to a channel",
                input: {
                    teamId: "19:a3b1c2d3e4f5-6789-abcd-ef01-234567890abc@thread.tacv2",
                    channelId: "19:engineering-updates@thread.tacv2",
                    content:
                        "<h3>Weekly Report</h3><p>Here are the <strong>highlights</strong>:</p><ul><li>Feature A completed</li><li>Bug fixes deployed</li></ul>",
                    contentType: "html"
                },
                expectedOutput: {
                    messageId: "1703001234601",
                    createdDateTime: "2024-12-19T16:05:00Z",
                    webUrl: "https://teams.microsoft.com/l/message/19%3aengineering-updates%40thread.tacv2/1703001234601"
                }
            },
            {
                name: "send_message_default_content_type",
                description: "Send a message with default content type",
                input: {
                    teamId: "19:a3b1c2d3e4f5-6789-abcd-ef01-234567890abc@thread.tacv2",
                    channelId: "19:general@thread.tacv2",
                    content: "Quick update: meeting moved to 3 PM"
                },
                expectedOutput: {
                    messageId: "1703001234602",
                    createdDateTime: "2024-12-19T16:10:00Z",
                    webUrl: "https://teams.microsoft.com/l/message/19%3ageneral%40thread.tacv2/1703001234602"
                }
            }
        ],
        errorCases: [
            {
                name: "channel_not_found",
                description: "Channel does not exist",
                input: {
                    teamId: "19:a3b1c2d3e4f5-6789-abcd-ef01-234567890abc@thread.tacv2",
                    channelId: "19:nonexistent@thread.tacv2",
                    content: "Test message"
                },
                expectedError: {
                    type: "not_found",
                    message: "Channel not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    teamId: "19:rate-limit-test@thread.tacv2",
                    channelId: "19:general@thread.tacv2",
                    content: "Test message"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "sendChatMessage",
        provider: "microsoft-teams",
        validCases: [
            {
                name: "send_chat_message_text",
                description: "Send a plain text message to a chat",
                input: {
                    chatId: "19:meeting_ZGFhY2E3YzEtNGFhZi00YmQ5LWI5ZGEtZjg5NTU5MzVhMDg5@thread.v2",
                    content: "Hi everyone, ready for the sync?",
                    contentType: "text"
                },
                expectedOutput: {
                    messageId: "1703001234610",
                    createdDateTime: "2024-12-19T17:00:00Z"
                }
            },
            {
                name: "send_chat_message_html",
                description: "Send an HTML formatted message to a chat",
                input: {
                    chatId: "19:oneOnOne_ZGFhY2E3YzEtNGFhZi00YmQ5@thread.v2",
                    content:
                        "<p>Please review this <a href='https://example.com/doc'>document</a></p>",
                    contentType: "html"
                },
                expectedOutput: {
                    messageId: "1703001234611",
                    createdDateTime: "2024-12-19T17:05:00Z"
                }
            },
            {
                name: "send_chat_message_default",
                description: "Send a message with default content type",
                input: {
                    chatId: "19:meeting_ZGFhY2E3YzEtNGFhZi00YmQ5LWI5ZGEtZjg5NTU5MzVhMDg5@thread.v2",
                    content: "Got it, thanks!"
                },
                expectedOutput: {
                    messageId: "1703001234612",
                    createdDateTime: "2024-12-19T17:10:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "chat_not_found",
                description: "Chat does not exist",
                input: {
                    chatId: "19:nonexistent-chat@thread.v2",
                    content: "Test message"
                },
                expectedError: {
                    type: "not_found",
                    message: "Chat not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    chatId: "19:rate-limit-test@thread.v2",
                    content: "Test message"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    }
];
