/**
 * Telegram Provider Test Fixtures
 *
 * Based on Telegram Bot API documentation:
 * - sendMessage: https://core.telegram.org/bots/api#sendmessage
 * - getChat: https://core.telegram.org/bots/api#getchat
 * - getMe: https://core.telegram.org/bots/api#getme
 * - sendPhoto: https://core.telegram.org/bots/api#sendphoto
 * - sendDocument: https://core.telegram.org/bots/api#senddocument
 * - forwardMessage: https://core.telegram.org/bots/api#forwardmessage
 * - deleteMessage: https://core.telegram.org/bots/api#deletemessage
 * - editMessageText: https://core.telegram.org/bots/api#editmessagetext
 */

import type { TestFixture } from "../../../sandbox";

export const telegramFixtures: TestFixture[] = [
    // ============================================================================
    // MESSAGING
    // ============================================================================
    {
        operationId: "sendMessage",
        provider: "telegram",
        validCases: [
            {
                name: "simple_text_message",
                description: "Send a simple text message to a chat",
                input: {
                    chat_id: 123456789,
                    text: "Hello, World!"
                },
                expectedOutput: {
                    messageId: 1001,
                    chatId: 123456789,
                    date: 1718452800,
                    text: "Hello, World!"
                }
            },
            {
                name: "message_with_html_formatting",
                description: "Send a message with HTML formatting",
                input: {
                    chat_id: 123456789,
                    text: '<b>Important:</b> This is a <i>formatted</i> message with a <a href="https://example.com">link</a>',
                    parse_mode: "HTML"
                },
                expectedOutput: {
                    messageId: 1002,
                    chatId: 123456789,
                    date: 1718452860,
                    text: "Important: This is a formatted message with a link"
                }
            },
            {
                name: "message_with_markdown",
                description: "Send a message with Markdown formatting",
                input: {
                    chat_id: "@channel_username",
                    text: "*Bold* and _italic_ text with `code`",
                    parse_mode: "Markdown"
                },
                expectedOutput: {
                    messageId: 1003,
                    chatId: -1001234567890,
                    date: 1718452920,
                    text: "Bold and italic text with code"
                }
            },
            {
                name: "silent_message",
                description: "Send a message without notification",
                input: {
                    chat_id: 123456789,
                    text: "Silent notification message",
                    disable_notification: true
                },
                expectedOutput: {
                    messageId: 1004,
                    chatId: 123456789,
                    date: 1718452980,
                    text: "Silent notification message"
                }
            },
            {
                name: "reply_to_message",
                description: "Send a message as a reply to another message",
                input: {
                    chat_id: 123456789,
                    text: "This is a reply",
                    reply_to_message_id: 999
                },
                expectedOutput: {
                    messageId: 1005,
                    chatId: 123456789,
                    date: 1718453040,
                    text: "This is a reply"
                }
            }
        ],
        errorCases: [
            {
                name: "chat_not_found",
                description: "Chat does not exist or bot is not a member",
                input: {
                    chat_id: 999999999,
                    text: "Hello"
                },
                expectedError: {
                    type: "not_found",
                    message: "Bad Request: chat not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Too many requests sent",
                input: {
                    chat_id: 123456789,
                    text: "Rapid message"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Too Many Requests: retry after 30",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "editMessageText",
        provider: "telegram",
        validCases: [
            {
                name: "edit_text_message",
                description: "Edit the text of an existing message",
                input: {
                    chat_id: 123456789,
                    message_id: 1001,
                    text: "Updated message content"
                },
                expectedOutput: {
                    messageId: 1001,
                    chatId: 123456789,
                    date: 1718452800,
                    editDate: 1718453100,
                    text: "Updated message content"
                }
            },
            {
                name: "edit_with_formatting",
                description: "Edit message with HTML formatting",
                input: {
                    chat_id: -1001234567890,
                    message_id: 2001,
                    text: "<b>Updated:</b> New formatted content",
                    parse_mode: "HTML"
                },
                expectedOutput: {
                    messageId: 2001,
                    chatId: -1001234567890,
                    date: 1718450000,
                    editDate: 1718453200,
                    text: "Updated: New formatted content"
                }
            }
        ],
        errorCases: [
            {
                name: "message_not_found",
                description: "Message to edit does not exist",
                input: {
                    chat_id: 123456789,
                    message_id: 99999,
                    text: "Updated text"
                },
                expectedError: {
                    type: "not_found",
                    message: "Bad Request: message to edit not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Too many edit requests",
                input: {
                    chat_id: 123456789,
                    message_id: 1001,
                    text: "Rapid edit"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Too Many Requests: retry after 30",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "forwardMessage",
        provider: "telegram",
        validCases: [
            {
                name: "forward_to_user",
                description: "Forward a message to another user",
                input: {
                    chat_id: 987654321,
                    from_chat_id: 123456789,
                    message_id: 1001
                },
                expectedOutput: {
                    messageId: 3001,
                    chatId: 987654321,
                    date: 1718453300,
                    forwardDate: 1718452800,
                    forwardFrom: {
                        id: 111222333,
                        is_bot: false,
                        first_name: "John",
                        last_name: "Doe",
                        username: "johndoe"
                    }
                }
            },
            {
                name: "forward_to_channel",
                description: "Forward a message to a channel",
                input: {
                    chat_id: "@my_channel",
                    from_chat_id: 123456789,
                    message_id: 1002,
                    disable_notification: true
                },
                expectedOutput: {
                    messageId: 3002,
                    chatId: -1001234567890,
                    date: 1718453400,
                    forwardDate: 1718452860
                }
            }
        ],
        errorCases: [
            {
                name: "source_message_not_found",
                description: "Source message does not exist",
                input: {
                    chat_id: 987654321,
                    from_chat_id: 123456789,
                    message_id: 99999
                },
                expectedError: {
                    type: "not_found",
                    message: "Bad Request: message to forward not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Too many forward requests",
                input: {
                    chat_id: 987654321,
                    from_chat_id: 123456789,
                    message_id: 1001
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Too Many Requests: retry after 30",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteMessage",
        provider: "telegram",
        validCases: [
            {
                name: "delete_own_message",
                description: "Delete a message sent by the bot",
                input: {
                    chat_id: 123456789,
                    message_id: 1001
                },
                expectedOutput: {
                    deleted: true,
                    messageId: 1001,
                    chatId: 123456789
                }
            },
            {
                name: "delete_in_group",
                description: "Delete a message in a group (as admin)",
                input: {
                    chat_id: -1001234567890,
                    message_id: 2001
                },
                expectedOutput: {
                    deleted: true,
                    messageId: 2001,
                    chatId: -1001234567890
                }
            }
        ],
        errorCases: [
            {
                name: "message_not_found",
                description: "Message to delete does not exist",
                input: {
                    chat_id: 123456789,
                    message_id: 99999
                },
                expectedError: {
                    type: "not_found",
                    message: "Bad Request: message to delete not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Too many delete requests",
                input: {
                    chat_id: 123456789,
                    message_id: 1001
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Too Many Requests: retry after 30",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // MEDIA
    // ============================================================================
    {
        operationId: "sendPhoto",
        provider: "telegram",
        validCases: [
            {
                name: "send_photo_by_url",
                description: "Send a photo using a URL",
                input: {
                    chat_id: 123456789,
                    photo: "https://example.com/images/photo.jpg"
                },
                expectedOutput: {
                    messageId: 4001,
                    chatId: 123456789,
                    date: 1718453500,
                    photo: [
                        {
                            file_id: "AgACAgIAAxkBAAIBZ2ZnhNwAAe3h0H4AAW4qh_0OykAAAxcAAiS-MRt...",
                            file_unique_id: "AQADIr4xGwAD9gI",
                            width: 90,
                            height: 90,
                            file_size: 1234
                        },
                        {
                            file_id: "AgACAgIAAxkBAAIBZ2ZnhNwAAe3h0H4AAW4qh_0OykAAAxcAAiS-MRu...",
                            file_unique_id: "AQADIr4xGwAD9gJ",
                            width: 320,
                            height: 320,
                            file_size: 12345
                        },
                        {
                            file_id: "AgACAgIAAxkBAAIBZ2ZnhNwAAe3h0H4AAW4qh_0OykAAAxcAAiS-MRv...",
                            file_unique_id: "AQADIr4xGwAD9gK",
                            width: 800,
                            height: 800,
                            file_size: 45678
                        }
                    ]
                }
            },
            {
                name: "send_photo_with_caption",
                description: "Send a photo with a caption",
                input: {
                    chat_id: 123456789,
                    photo: "https://example.com/images/product.jpg",
                    caption: "<b>New Product Launch!</b>\nCheck out our latest offering",
                    parse_mode: "HTML"
                },
                expectedOutput: {
                    messageId: 4002,
                    chatId: 123456789,
                    date: 1718453600,
                    photo: [
                        {
                            file_id: "AgACAgIAAxkBAAIBaGZnhNwAAe3h0H4AAW4qh_0OykAAAxcAAiS-MRx...",
                            file_unique_id: "AQADIr4xGwAD9gL",
                            width: 800,
                            height: 600,
                            file_size: 56789
                        }
                    ],
                    caption: "New Product Launch!\nCheck out our latest offering"
                }
            },
            {
                name: "send_photo_by_file_id",
                description: "Send a photo that exists on Telegram servers",
                input: {
                    chat_id: -1001234567890,
                    photo: "AgACAgIAAxkBAAIBZ2ZnhNwAAe3h0H4AAW4qh_0OykAAAxcAAiS-MRv...",
                    disable_notification: true
                },
                expectedOutput: {
                    messageId: 4003,
                    chatId: -1001234567890,
                    date: 1718453700,
                    photo: [
                        {
                            file_id: "AgACAgIAAxkBAAIBZ2ZnhNwAAe3h0H4AAW4qh_0OykAAAxcAAiS-MRv...",
                            file_unique_id: "AQADIr4xGwAD9gK",
                            width: 800,
                            height: 800,
                            file_size: 45678
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_photo_url",
                description: "Photo URL is invalid or inaccessible",
                input: {
                    chat_id: 123456789,
                    photo: "https://invalid-domain.xyz/nonexistent.jpg"
                },
                expectedError: {
                    type: "validation",
                    message: "Bad Request: wrong file identifier/HTTP URL specified",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Too many photo upload requests",
                input: {
                    chat_id: 123456789,
                    photo: "https://example.com/images/photo.jpg"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Too Many Requests: retry after 60",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "sendDocument",
        provider: "telegram",
        validCases: [
            {
                name: "send_document_by_url",
                description: "Send a document using a URL",
                input: {
                    chat_id: 123456789,
                    document: "https://example.com/files/report.pdf"
                },
                expectedOutput: {
                    messageId: 5001,
                    chatId: 123456789,
                    date: 1718453800,
                    document: {
                        file_id: "BQACAgIAAxkBAAIBaGZnhN0AAe3h0H4AAW4qh_0OykAAAxcAAiS-MRy...",
                        file_unique_id: "AQADIr4xGwAD9gM",
                        file_name: "report.pdf",
                        mime_type: "application/pdf",
                        file_size: 1234567
                    }
                }
            },
            {
                name: "send_document_with_caption",
                description: "Send a document with caption",
                input: {
                    chat_id: 123456789,
                    document: "https://example.com/files/data.xlsx",
                    caption: "Monthly Sales Report - June 2024"
                },
                expectedOutput: {
                    messageId: 5002,
                    chatId: 123456789,
                    date: 1718453900,
                    document: {
                        file_id: "BQACAgIAAxkBAAIBaWZnhN0AAe3h0H4AAW4qh_0OykAAAxcAAiS-MRz...",
                        file_unique_id: "AQADIr4xGwAD9gN",
                        file_name: "data.xlsx",
                        mime_type:
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        file_size: 234567
                    },
                    caption: "Monthly Sales Report - June 2024"
                }
            },
            {
                name: "send_document_disable_detection",
                description: "Send a document without content type detection",
                input: {
                    chat_id: -1001234567890,
                    document: "https://example.com/files/archive.zip",
                    disable_content_type_detection: true
                },
                expectedOutput: {
                    messageId: 5003,
                    chatId: -1001234567890,
                    date: 1718454000,
                    document: {
                        file_id: "BQACAgIAAxkBAAIBamZnhN0AAe3h0H4AAW4qh_0OykAAAxcAAiS-MR0...",
                        file_unique_id: "AQADIr4xGwAD9gO",
                        file_name: "archive.zip",
                        mime_type: "application/zip",
                        file_size: 5678901
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "file_too_large",
                description: "Document exceeds maximum file size",
                input: {
                    chat_id: 123456789,
                    document: "https://example.com/files/huge-file.bin"
                },
                expectedError: {
                    type: "validation",
                    message: "Bad Request: file is too big",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Too many document upload requests",
                input: {
                    chat_id: 123456789,
                    document: "https://example.com/files/report.pdf"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Too Many Requests: retry after 60",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // DATA / INFO
    // ============================================================================
    {
        operationId: "getMe",
        provider: "telegram",
        validCases: [
            {
                name: "get_bot_info",
                description: "Get information about the bot",
                input: {},
                expectedOutput: {
                    id: 1234567890,
                    isBot: true,
                    firstName: "FlowMaestro",
                    lastName: "Bot",
                    username: "flowmaestro_bot",
                    languageCode: "en"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_token",
                description: "Bot token is invalid",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Unauthorized: Invalid bot token",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Too many requests",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Too Many Requests: retry after 30",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getChat",
        provider: "telegram",
        validCases: [
            {
                name: "get_private_chat",
                description: "Get information about a private chat with a user",
                input: {
                    chat_id: 123456789
                },
                expectedOutput: {
                    id: 123456789,
                    type: "private",
                    firstName: "John",
                    lastName: "Doe",
                    username: "johndoe",
                    bio: "Software Developer | Tech Enthusiast"
                }
            },
            {
                name: "get_group_chat",
                description: "Get information about a group chat",
                input: {
                    chat_id: -100123456789
                },
                expectedOutput: {
                    id: -100123456789,
                    type: "supergroup",
                    title: "FlowMaestro Users",
                    username: "flowmaestro_users",
                    description:
                        "Official community for FlowMaestro users. Share tips, ask questions, and connect!"
                }
            },
            {
                name: "get_channel",
                description: "Get information about a channel",
                input: {
                    chat_id: "@my_channel"
                },
                expectedOutput: {
                    id: -1001234567890,
                    type: "channel",
                    title: "Product Updates",
                    username: "my_channel",
                    description: "Official product announcements and updates"
                }
            }
        ],
        errorCases: [
            {
                name: "chat_not_found",
                description: "Chat does not exist or bot is not a member",
                input: {
                    chat_id: 999999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Bad Request: chat not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Too many requests",
                input: {
                    chat_id: 123456789
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Too Many Requests: retry after 30",
                    retryable: true
                }
            }
        ]
    }
];
