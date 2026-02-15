/**
 * Facebook Provider Test Fixtures
 *
 * Comprehensive test fixtures for Facebook Messenger Platform operations.
 * Includes realistic messaging data for conversations, templates, quick replies, etc.
 */

import type { TestFixture } from "../../sandbox";

export const facebookFixtures: TestFixture[] = [
    // ==================== GET CONVERSATIONS ====================
    {
        operationId: "getConversations",
        provider: "facebook",
        validCases: [
            {
                name: "list_conversations_basic",
                description: "List Messenger conversations for a Page with default pagination",
                input: {
                    pageId: "102847362917483"
                },
                expectedOutput: {
                    conversations: [
                        {
                            id: "t_10158726394827463",
                            updatedTime: "2024-01-15T14:32:18+0000",
                            link: "https://www.facebook.com/messages/t/10158726394827463",
                            messageCount: 47,
                            unreadCount: 2,
                            participants: [
                                {
                                    id: "102847362917483",
                                    name: "Acme Support",
                                    email: undefined
                                },
                                {
                                    id: "3928471649283746",
                                    name: "Sarah Johnson",
                                    email: "sarah.johnson@example.com"
                                }
                            ]
                        },
                        {
                            id: "t_10158726394827464",
                            updatedTime: "2024-01-15T13:15:42+0000",
                            link: "https://www.facebook.com/messages/t/10158726394827464",
                            messageCount: 12,
                            unreadCount: 0,
                            participants: [
                                {
                                    id: "102847362917483",
                                    name: "Acme Support",
                                    email: undefined
                                },
                                {
                                    id: "5839274619283746",
                                    name: "Michael Chen",
                                    email: undefined
                                }
                            ]
                        }
                    ],
                    nextCursor:
                        "QVFIUjNfR2xKZATJfNE9qMkJYWFk2ZAXYzNHJwd1JIVHg3cWxVZAGpFX3d0a1hHNWt0ZAl9IVlBjWmVpMkVUTVBZAWGZAXVlVhV0E"
                }
            }
        ],
        errorCases: [
            {
                name: "page_not_found",
                description: "Page ID does not exist or access denied",
                input: {
                    pageId: "999999999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Page not found or you do not have permission to access this Page",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for conversation listing",
                input: {
                    pageId: "102847362917483"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests",
                    retryable: true
                }
            },
            {
                name: "invalid_cursor",
                description: "Invalid pagination cursor provided",
                input: {
                    pageId: "102847362917483",
                    after: "invalid_cursor_value_xyz"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid pagination cursor",
                    retryable: false
                }
            }
        ]
    },

    // ==================== GET MESSAGES ====================
    {
        operationId: "getMessages",
        provider: "facebook",
        validCases: [
            {
                name: "get_messages_basic",
                description: "Get messages from a Messenger conversation with default pagination",
                input: {
                    conversationId: "t_10158726394827463"
                },
                expectedOutput: {
                    messages: [
                        {
                            id: "m_mid.HYGZSWJ4TWKlzP7MQQhMXg",
                            createdTime: "2024-01-15T14:32:18+0000",
                            from: {
                                id: "3928471649283746",
                                name: "Sarah Johnson"
                            },
                            text: "Hi, I need help with my recent order #12345. It hasn't arrived yet.",
                            attachments: undefined
                        },
                        {
                            id: "m_mid.HYGZSWJ4TWKlzP7MQQhMXh",
                            createdTime: "2024-01-15T14:28:05+0000",
                            from: {
                                id: "102847362917483",
                                name: "Acme Support"
                            },
                            text: "Hello Sarah! I'd be happy to help you track your order. Let me look that up for you.",
                            attachments: undefined
                        },
                        {
                            id: "m_mid.HYGZSWJ4TWKlzP7MQQhMXi",
                            createdTime: "2024-01-15T14:25:12+0000",
                            from: {
                                id: "3928471649283746",
                                name: "Sarah Johnson"
                            },
                            text: "Thank you so much!",
                            attachments: undefined
                        }
                    ],
                    nextCursor:
                        "QVFIUm1YNkJfX2lCSkJQSVJGdlZAjYmxRWmFpYXB1ZAHVkcWJfbFlYQTUwTVE1VWt3cWE1T1ExZAEdRWXc"
                }
            }
        ],
        errorCases: [
            {
                name: "conversation_not_found",
                description: "Conversation ID does not exist",
                input: {
                    conversationId: "t_99999999999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Conversation not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for message retrieval",
                input: {
                    conversationId: "t_10158726394827463"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests",
                    retryable: true
                }
            },
            {
                name: "permission",
                description: "No permission to access this conversation",
                input: {
                    conversationId: "t_10158726394827999"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to access this conversation",
                    retryable: false
                }
            }
        ]
    },

    // ==================== GET PAGE INFO ====================
    {
        operationId: "getPageInfo",
        provider: "facebook",
        validCases: [
            {
                name: "get_page_info_full",
                description: "Get complete information about a Facebook Page",
                input: {
                    pageId: "102847362917483"
                },
                expectedOutput: {
                    id: "102847362917483",
                    name: "Acme Customer Support",
                    username: "acmesupport",
                    about: "Official customer support channel for Acme Inc. We're here to help 24/7!",
                    category: "Product/Service",
                    pictureUrl: "https://scontent.xx.fbcdn.net/v/t1.6435-1/acme_logo.jpg"
                }
            }
        ],
        errorCases: [
            {
                name: "page_not_found",
                description: "Page ID does not exist",
                input: {
                    pageId: "000000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Page not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for page info request",
                input: {
                    pageId: "102847362917483"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests",
                    retryable: true
                }
            },
            {
                name: "access_token_expired",
                description: "Page access token has expired",
                input: {
                    pageId: "102847362917483"
                },
                expectedError: {
                    type: "permission",
                    message: "Access token has expired. Please reconnect your Facebook account",
                    retryable: false
                }
            }
        ]
    },

    // ==================== MARK AS SEEN ====================
    {
        operationId: "markAsSeen",
        provider: "facebook",
        validCases: [
            {
                name: "mark_as_seen_success",
                description: "Mark a conversation as seen (shows blue checkmarks)",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746"
                },
                expectedOutput: {
                    success: true,
                    recipientId: "3928471649283746"
                }
            }
        ],
        errorCases: [
            {
                name: "recipient_not_found",
                description: "Recipient PSID not found",
                input: {
                    pageId: "102847362917483",
                    recipientId: "9999999999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Recipient not found. The user may have deleted the conversation",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for sender actions",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests",
                    retryable: true
                }
            },
            {
                name: "page_not_found",
                description: "Page ID does not exist or no access",
                input: {
                    pageId: "999999999999999",
                    recipientId: "3928471649283746"
                },
                expectedError: {
                    type: "not_found",
                    message: "Page not found or you do not have permission to access this Page",
                    retryable: false
                }
            }
        ]
    },

    // ==================== SEND BUTTON TEMPLATE ====================
    {
        operationId: "sendButtonTemplate",
        provider: "facebook",
        validCases: [
            {
                name: "send_button_template_web_url",
                description: "Send button template with web URL buttons",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746",
                    text: "How would you like to track your order?",
                    buttons: [
                        {
                            type: "web_url",
                            title: "Track Online",
                            url: "https://acme.com/track?order=12345"
                        },
                        {
                            type: "web_url",
                            title: "View Details",
                            url: "https://acme.com/orders/12345"
                        }
                    ]
                },
                expectedOutput: {
                    messageId: "mid.HYGZSWJ4TWKlzP7MQQhMXj",
                    recipientId: "3928471649283746"
                }
            }
        ],
        errorCases: [
            {
                name: "recipient_not_found",
                description: "Recipient PSID not found or blocked the page",
                input: {
                    pageId: "102847362917483",
                    recipientId: "9999999999999999",
                    text: "Test message",
                    buttons: [
                        {
                            type: "postback",
                            title: "Test",
                            payload: "TEST"
                        }
                    ]
                },
                expectedError: {
                    type: "not_found",
                    message:
                        "Recipient not found. The user may have blocked messages from this Page",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for sending messages",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746",
                    text: "Test message",
                    buttons: [
                        {
                            type: "postback",
                            title: "Test",
                            payload: "TEST"
                        }
                    ]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests",
                    retryable: true
                }
            },
            {
                name: "outside_messaging_window",
                description: "Attempting to send message outside 24h window without tag",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746",
                    text: "Promotional message",
                    buttons: [
                        {
                            type: "web_url",
                            title: "Shop Now",
                            url: "https://acme.com/sale"
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Cannot send promotional content outside the 24-hour messaging window. Use a message tag for allowed message types",
                    retryable: false
                }
            }
        ]
    },

    // ==================== SEND GENERIC TEMPLATE ====================
    {
        operationId: "sendGenericTemplate",
        provider: "facebook",
        validCases: [
            {
                name: "send_generic_template_single_card",
                description: "Send a single product card",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746",
                    elements: [
                        {
                            title: "Wireless Bluetooth Headphones",
                            subtitle: "$79.99 - Premium sound quality with 30-hour battery life",
                            imageUrl: "https://acme.com/images/headphones.jpg",
                            defaultActionUrl: "https://acme.com/products/headphones",
                            buttons: [
                                {
                                    type: "web_url",
                                    title: "View Product",
                                    url: "https://acme.com/products/headphones"
                                },
                                {
                                    type: "postback",
                                    title: "Add to Cart",
                                    payload: "ADD_TO_CART_HEADPHONES"
                                }
                            ]
                        }
                    ]
                },
                expectedOutput: {
                    messageId: "mid.GENERICTEMPLATE001",
                    recipientId: "3928471649283746"
                }
            }
        ],
        errorCases: [
            {
                name: "recipient_not_found",
                description: "Recipient PSID not found",
                input: {
                    pageId: "102847362917483",
                    recipientId: "9999999999999999",
                    elements: [
                        {
                            title: "Test Card"
                        }
                    ]
                },
                expectedError: {
                    type: "not_found",
                    message:
                        "Recipient not found. The user may have blocked messages from this Page",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746",
                    elements: [
                        {
                            title: "Test Card"
                        }
                    ]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests",
                    retryable: true
                }
            },
            {
                name: "invalid_image_url",
                description: "Image URL is not accessible",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746",
                    elements: [
                        {
                            title: "Product Card",
                            imageUrl: "https://invalid-domain.com/image-not-found.jpg"
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "Unable to load image from the provided URL",
                    retryable: false
                }
            }
        ]
    },

    // ==================== SEND MEDIA TEMPLATE ====================
    {
        operationId: "sendMediaTemplate",
        provider: "facebook",
        validCases: [
            {
                name: "send_media_template_image",
                description: "Send an image with a button",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746",
                    mediaType: "image",
                    mediaUrl: "https://acme.com/images/product-showcase.jpg",
                    buttons: [
                        {
                            type: "web_url",
                            title: "Shop Collection",
                            url: "https://acme.com/new-arrivals"
                        }
                    ]
                },
                expectedOutput: {
                    messageId: "mid.MEDIATEMPLATE001",
                    recipientId: "3928471649283746"
                }
            }
        ],
        errorCases: [
            {
                name: "recipient_not_found",
                description: "Recipient PSID not found",
                input: {
                    pageId: "102847362917483",
                    recipientId: "9999999999999999",
                    mediaType: "image",
                    mediaUrl: "https://acme.com/images/test.jpg"
                },
                expectedError: {
                    type: "not_found",
                    message:
                        "Recipient not found. The user may have blocked messages from this Page",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746",
                    mediaType: "image",
                    mediaUrl: "https://acme.com/images/test.jpg"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests",
                    retryable: true
                }
            },
            {
                name: "invalid_media_url",
                description: "Media URL is not accessible or invalid format",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746",
                    mediaType: "video",
                    mediaUrl: "https://invalid-domain.com/video-not-found.mp4"
                },
                expectedError: {
                    type: "validation",
                    message: "Unable to load media from the provided URL",
                    retryable: false
                }
            },
            {
                name: "media_too_large",
                description: "Media file exceeds size limit",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746",
                    mediaType: "video",
                    mediaUrl: "https://acme.com/videos/large-file.mp4"
                },
                expectedError: {
                    type: "validation",
                    message: "Media file exceeds the maximum allowed size of 25MB",
                    retryable: false
                }
            }
        ]
    },

    // ==================== SEND QUICK REPLIES ====================
    {
        operationId: "sendQuickReplies",
        provider: "facebook",
        validCases: [
            {
                name: "send_quick_replies_text",
                description: "Send quick reply buttons for user selection",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746",
                    text: "What type of support do you need?",
                    quickReplies: [
                        {
                            contentType: "text",
                            title: "Order Issues",
                            payload: "SUPPORT_ORDER"
                        },
                        {
                            contentType: "text",
                            title: "Refund Request",
                            payload: "SUPPORT_REFUND"
                        },
                        {
                            contentType: "text",
                            title: "Product Info",
                            payload: "SUPPORT_PRODUCT"
                        },
                        {
                            contentType: "text",
                            title: "Other",
                            payload: "SUPPORT_OTHER"
                        }
                    ]
                },
                expectedOutput: {
                    messageId: "mid.QUICKREPLY001",
                    recipientId: "3928471649283746"
                }
            }
        ],
        errorCases: [
            {
                name: "recipient_not_found",
                description: "Recipient PSID not found",
                input: {
                    pageId: "102847362917483",
                    recipientId: "9999999999999999",
                    text: "Test message",
                    quickReplies: [
                        {
                            contentType: "text",
                            title: "Test",
                            payload: "TEST"
                        }
                    ]
                },
                expectedError: {
                    type: "not_found",
                    message:
                        "Recipient not found. The user may have blocked messages from this Page",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746",
                    text: "Test message",
                    quickReplies: [
                        {
                            contentType: "text",
                            title: "Test",
                            payload: "TEST"
                        }
                    ]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests",
                    retryable: true
                }
            },
            {
                name: "too_many_quick_replies",
                description: "More than 13 quick replies provided",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746",
                    text: "Select an option",
                    quickReplies: Array(14).fill({
                        contentType: "text",
                        title: "Option",
                        payload: "OPTION"
                    })
                },
                expectedError: {
                    type: "validation",
                    message: "Maximum of 13 quick replies allowed",
                    retryable: false
                }
            }
        ]
    },

    // ==================== SEND TEXT MESSAGE ====================
    {
        operationId: "sendTextMessage",
        provider: "facebook",
        validCases: [
            {
                name: "send_text_message_simple",
                description: "Send a simple text message",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746",
                    text: "Hello! Thank you for contacting Acme Support. How can I help you today?"
                },
                expectedOutput: {
                    messageId: "mid.TEXTMSG001",
                    recipientId: "3928471649283746"
                }
            }
        ],
        errorCases: [
            {
                name: "recipient_not_found",
                description: "Recipient PSID not found or user blocked the page",
                input: {
                    pageId: "102847362917483",
                    recipientId: "9999999999999999",
                    text: "Hello!"
                },
                expectedError: {
                    type: "not_found",
                    message:
                        "Recipient not found. The user may have blocked messages from this Page",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for sending messages",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746",
                    text: "Hello!"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests",
                    retryable: true
                }
            },
            {
                name: "message_too_long",
                description: "Message exceeds 2000 character limit",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746",
                    text: "A".repeat(2001)
                },
                expectedError: {
                    type: "validation",
                    message: "Message text exceeds the maximum length of 2000 characters",
                    retryable: false
                }
            },
            {
                name: "outside_messaging_window",
                description: "Attempting to send message outside 24h window without tag",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746",
                    text: "Check out our new sale! 50% off everything!"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Cannot send promotional content outside the 24-hour messaging window. Use a message tag for allowed message types",
                    retryable: false
                }
            },
            {
                name: "page_not_found",
                description: "Page ID does not exist or no access",
                input: {
                    pageId: "999999999999999",
                    recipientId: "3928471649283746",
                    text: "Hello!"
                },
                expectedError: {
                    type: "not_found",
                    message: "Page not found or you do not have permission to access this Page",
                    retryable: false
                }
            }
        ]
    },

    // ==================== SEND TYPING INDICATOR ====================
    {
        operationId: "sendTypingIndicator",
        provider: "facebook",
        validCases: [
            {
                name: "send_typing_indicator_on",
                description: "Show typing indicator (three dots)",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746",
                    on: true
                },
                expectedOutput: {
                    success: true,
                    recipientId: "3928471649283746"
                }
            }
        ],
        errorCases: [
            {
                name: "recipient_not_found",
                description: "Recipient PSID not found",
                input: {
                    pageId: "102847362917483",
                    recipientId: "9999999999999999",
                    on: true
                },
                expectedError: {
                    type: "not_found",
                    message: "Recipient not found. The user may have deleted the conversation",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for sender actions",
                input: {
                    pageId: "102847362917483",
                    recipientId: "3928471649283746",
                    on: true
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests",
                    retryable: true
                }
            },
            {
                name: "page_not_found",
                description: "Page ID does not exist or no access",
                input: {
                    pageId: "999999999999999",
                    recipientId: "3928471649283746",
                    on: true
                },
                expectedError: {
                    type: "not_found",
                    message: "Page not found or you do not have permission to access this Page",
                    retryable: false
                }
            }
        ]
    }
];
