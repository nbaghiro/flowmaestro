/**
 * WhatsApp Provider Test Fixtures
 *
 * Based on official WhatsApp Business Cloud API documentation:
 * - Messages: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 * - Templates: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/message-templates
 * - Phone Numbers: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/phone-numbers
 * - Business Profile: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/business-profiles
 */

import type { TestFixture } from "../../sandbox";

/**
 * Sample message templates for filterableData
 */
const sampleMessageTemplates = [
    {
        id: "template_001",
        name: "order_confirmation",
        status: "APPROVED",
        category: "TRANSACTIONAL",
        language: "en_US",
        components: [
            {
                type: "HEADER",
                format: "TEXT",
                text: "Order Confirmed!"
            },
            {
                type: "BODY",
                text: "Hi {{1}}, your order #{{2}} has been confirmed. Estimated delivery: {{3}}."
            },
            {
                type: "FOOTER",
                text: "Thank you for your purchase!"
            }
        ],
        _status: "APPROVED",
        _category: "TRANSACTIONAL"
    },
    {
        id: "template_002",
        name: "shipping_update",
        status: "APPROVED",
        category: "TRANSACTIONAL",
        language: "en_US",
        components: [
            {
                type: "HEADER",
                format: "TEXT",
                text: "Shipping Update"
            },
            {
                type: "BODY",
                text: "Your package is on its way! Track your shipment: {{1}}"
            }
        ],
        _status: "APPROVED",
        _category: "TRANSACTIONAL"
    },
    {
        id: "template_003",
        name: "appointment_reminder",
        status: "APPROVED",
        category: "UTILITY",
        language: "en_US",
        components: [
            {
                type: "BODY",
                text: "Reminder: You have an appointment on {{1}} at {{2}}. Reply YES to confirm or NO to reschedule."
            },
            {
                type: "BUTTON",
                buttons: [
                    { type: "QUICK_REPLY", text: "YES" },
                    { type: "QUICK_REPLY", text: "NO" }
                ]
            }
        ],
        _status: "APPROVED",
        _category: "UTILITY"
    },
    {
        id: "template_004",
        name: "welcome_message",
        status: "APPROVED",
        category: "MARKETING",
        language: "en_US",
        components: [
            {
                type: "HEADER",
                format: "IMAGE"
            },
            {
                type: "BODY",
                text: "Welcome to {{1}}! We're excited to have you. Check out our latest offers at {{2}}"
            },
            {
                type: "BUTTON",
                buttons: [{ type: "URL", text: "Visit Website", url: "https://example.com" }]
            }
        ],
        _status: "APPROVED",
        _category: "MARKETING"
    },
    {
        id: "template_005",
        name: "password_reset",
        status: "APPROVED",
        category: "AUTHENTICATION",
        language: "en_US",
        components: [
            {
                type: "BODY",
                text: "Your verification code is {{1}}. This code expires in 10 minutes."
            }
        ],
        _status: "APPROVED",
        _category: "AUTHENTICATION"
    },
    {
        id: "template_006",
        name: "newsletter_promo",
        status: "PENDING",
        category: "MARKETING",
        language: "en_US",
        components: [
            {
                type: "HEADER",
                format: "VIDEO"
            },
            {
                type: "BODY",
                text: "Don't miss out! Our biggest sale of the year starts {{1}}. Use code {{2}} for extra savings!"
            }
        ],
        _status: "PENDING",
        _category: "MARKETING"
    },
    {
        id: "template_007",
        name: "feedback_request",
        status: "REJECTED",
        category: "UTILITY",
        language: "en_US",
        components: [
            {
                type: "BODY",
                text: "How was your experience with us? Rate us from 1-5."
            }
        ],
        _status: "REJECTED",
        _category: "UTILITY"
    },
    {
        id: "template_008",
        name: "order_confirmation_es",
        status: "APPROVED",
        category: "TRANSACTIONAL",
        language: "es_ES",
        components: [
            {
                type: "HEADER",
                format: "TEXT",
                text: "Pedido Confirmado!"
            },
            {
                type: "BODY",
                text: "Hola {{1}}, tu pedido #{{2}} ha sido confirmado. Entrega estimada: {{3}}."
            }
        ],
        _status: "APPROVED",
        _category: "TRANSACTIONAL"
    }
];

export const whatsappFixtures: TestFixture[] = [
    {
        operationId: "sendTextMessage",
        provider: "whatsapp",
        validCases: [
            {
                name: "basic_text_message",
                description: "Send a simple text message to a WhatsApp user",
                input: {
                    phoneNumberId: "123456789012345",
                    to: "+14155552671",
                    text: "Hello! Thank you for contacting us. How can we help you today?"
                },
                expectedOutput: {
                    messageId: "wamid.HBgNMTQ1NTU1NTI2NzEVAgASGBQzRUIwMEY2MzQ4MTU0QjEyRThFNgA=",
                    recipientPhone: "14155552671",
                    status: "accepted"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_phone_number",
                description: "Phone number format is invalid",
                input: {
                    phoneNumberId: "123456789012345",
                    to: "invalid-phone",
                    text: "This will fail"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid phone number format. Use E.164 format (e.g., +14155552671)",
                    retryable: false
                }
            },
            {
                name: "phone_number_id_not_found",
                description: "The WhatsApp Business phone number ID does not exist",
                input: {
                    phoneNumberId: "999999999999999",
                    to: "+14155552671",
                    text: "This will fail"
                },
                expectedError: {
                    type: "not_found",
                    message: "Phone number ID not found or not accessible",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for sending messages",
                input: {
                    phoneNumberId: "123456789012345",
                    to: "+14155552671",
                    text: "Rate limit test"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            },
            {
                name: "recipient_not_opted_in",
                description: "Recipient has not opted in to receive messages",
                input: {
                    phoneNumberId: "123456789012345",
                    to: "+14155550000",
                    text: "This will fail"
                },
                expectedError: {
                    type: "permission",
                    message: "Recipient has not opted in to receive messages from this business",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "sendMediaMessage",
        provider: "whatsapp",
        validCases: [
            {
                name: "send_image_with_url",
                description: "Send an image message using a public URL",
                input: {
                    phoneNumberId: "123456789012345",
                    to: "+14155552671",
                    mediaType: "image",
                    mediaUrl: "https://cdn.example.com/images/product.jpg",
                    caption: "Check out our new product!"
                },
                expectedOutput: {
                    messageId: "wamid.HBgNMTQ1NTU1NTI2NzEVAgASGBQzRUIwMEY2MzQ4MTU0QjEyRThFNgB=",
                    recipientPhone: "14155552671",
                    status: "accepted"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_media_source",
                description: "Neither mediaUrl nor mediaId provided",
                input: {
                    phoneNumberId: "123456789012345",
                    to: "+14155552671",
                    mediaType: "image"
                },
                expectedError: {
                    type: "validation",
                    message: "Either mediaUrl or mediaId must be provided",
                    retryable: false
                }
            },
            {
                name: "invalid_media_url",
                description: "Media URL is not accessible or invalid",
                input: {
                    phoneNumberId: "123456789012345",
                    to: "+14155552671",
                    mediaType: "image",
                    mediaUrl: "https://invalid-domain.example/not-found.jpg"
                },
                expectedError: {
                    type: "validation",
                    message: "Unable to download media from the provided URL",
                    retryable: false
                }
            },
            {
                name: "unsupported_media_type",
                description: "Media file type is not supported",
                input: {
                    phoneNumberId: "123456789012345",
                    to: "+14155552671",
                    mediaType: "image",
                    mediaUrl: "https://cdn.example.com/files/document.exe"
                },
                expectedError: {
                    type: "validation",
                    message: "Unsupported media type. Supported formats: JPEG, PNG for images",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for media messages",
                input: {
                    phoneNumberId: "123456789012345",
                    to: "+14155552671",
                    mediaType: "video",
                    mediaUrl: "https://cdn.example.com/videos/demo.mp4"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "sendTemplateMessage",
        provider: "whatsapp",
        validCases: [
            {
                name: "send_template_with_parameters",
                description: "Send a template message with dynamic parameters",
                input: {
                    phoneNumberId: "123456789012345",
                    to: "+14155552671",
                    templateName: "order_confirmation",
                    languageCode: "en_US",
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: "John" },
                                { type: "text", text: "ORD-12345" },
                                { type: "text", text: "January 20, 2024" }
                            ]
                        }
                    ]
                },
                expectedOutput: {
                    messageId: "wamid.HBgNMTQ1NTU1NTI2NzEVAgASGBQzRUIwMEY2MzQ4MTU0QjEyRThFNgC=",
                    recipientPhone: "14155552671",
                    status: "accepted"
                }
            }
        ],
        errorCases: [
            {
                name: "template_not_found",
                description: "Template name does not exist",
                input: {
                    phoneNumberId: "123456789012345",
                    to: "+14155552671",
                    templateName: "nonexistent_template",
                    languageCode: "en_US"
                },
                expectedError: {
                    type: "not_found",
                    message: "Message template not found or not approved",
                    retryable: false
                }
            },
            {
                name: "template_not_approved",
                description: "Template exists but is not yet approved",
                input: {
                    phoneNumberId: "123456789012345",
                    to: "+14155552671",
                    templateName: "pending_template",
                    languageCode: "en_US"
                },
                expectedError: {
                    type: "validation",
                    message: "Template is pending approval and cannot be used yet",
                    retryable: false
                }
            },
            {
                name: "missing_parameters",
                description: "Required template parameters not provided",
                input: {
                    phoneNumberId: "123456789012345",
                    to: "+14155552671",
                    templateName: "order_confirmation",
                    languageCode: "en_US"
                },
                expectedError: {
                    type: "validation",
                    message: "Missing required template parameters",
                    retryable: false
                }
            },
            {
                name: "invalid_language_code",
                description: "Language code not available for this template",
                input: {
                    phoneNumberId: "123456789012345",
                    to: "+14155552671",
                    templateName: "order_confirmation",
                    languageCode: "xx_XX"
                },
                expectedError: {
                    type: "validation",
                    message: "Template not available in the specified language",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for template messages",
                input: {
                    phoneNumberId: "123456789012345",
                    to: "+14155552671",
                    templateName: "order_confirmation",
                    languageCode: "en_US"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "sendReaction",
        provider: "whatsapp",
        validCases: [
            {
                name: "react_with_emoji",
                description: "React to a message with a thumbs up emoji",
                input: {
                    phoneNumberId: "123456789012345",
                    to: "+14155552671",
                    messageId: "wamid.HBgNMTQ1NTU1NTI2NzEVAgASGBQzRUIwMEY2MzQ4MTU0QjEyRThFNgA=",
                    emoji: "\uD83D\uDC4D"
                },
                expectedOutput: {
                    messageId: "wamid.HBgNMTQ1NTU1NTI2NzEVAgASGBQzRUIwMEY2MzQ4MTU0QjEyRThFNgD=",
                    recipientPhone: "14155552671",
                    status: "accepted"
                }
            }
        ],
        errorCases: [
            {
                name: "message_not_found",
                description: "Original message to react to does not exist",
                input: {
                    phoneNumberId: "123456789012345",
                    to: "+14155552671",
                    messageId: "wamid.INVALID_MESSAGE_ID",
                    emoji: "\uD83D\uDC4D"
                },
                expectedError: {
                    type: "not_found",
                    message: "Original message not found",
                    retryable: false
                }
            },
            {
                name: "invalid_emoji",
                description: "Emoji is not a valid reaction",
                input: {
                    phoneNumberId: "123456789012345",
                    to: "+14155552671",
                    messageId: "wamid.HBgNMTQ1NTU1NTI2NzEVAgASGBQzRUIwMEY2MzQ4MTU0QjEyRThFNgA=",
                    emoji: "not-an-emoji"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid emoji provided",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for reactions",
                input: {
                    phoneNumberId: "123456789012345",
                    to: "+14155552671",
                    messageId: "wamid.HBgNMTQ1NTU1NTI2NzEVAgASGBQzRUIwMEY2MzQ4MTU0QjEyRThFNgA=",
                    emoji: "\u2764\uFE0F"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "markAsRead",
        provider: "whatsapp",
        validCases: [
            {
                name: "mark_message_as_read",
                description: "Mark a received message as read to send read receipt",
                input: {
                    phoneNumberId: "123456789012345",
                    messageId: "wamid.HBgNMTQ1NTU1NTI2NzEVAgASGBQzRUIwMEY2MzQ4MTU0QjEyRThFNgA="
                },
                expectedOutput: {
                    success: true,
                    messageId: "wamid.HBgNMTQ1NTU1NTI2NzEVAgASGBQzRUIwMEY2MzQ4MTU0QjEyRThFNgA="
                }
            }
        ],
        errorCases: [
            {
                name: "message_not_found",
                description: "Message ID does not exist",
                input: {
                    phoneNumberId: "123456789012345",
                    messageId: "wamid.INVALID_MESSAGE_ID"
                },
                expectedError: {
                    type: "not_found",
                    message: "Message not found",
                    retryable: false
                }
            },
            {
                name: "phone_number_id_not_found",
                description: "Phone number ID does not exist",
                input: {
                    phoneNumberId: "999999999999999",
                    messageId: "wamid.HBgNMTQ1NTU1NTI2NzEVAgASGBQzRUIwMEY2MzQ4MTU0QjEyRThFNgA="
                },
                expectedError: {
                    type: "not_found",
                    message: "Phone number ID not found or not accessible",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    phoneNumberId: "123456789012345",
                    messageId: "wamid.HBgNMTQ1NTU1NTI2NzEVAgASGBQzRUIwMEY2MzQ4MTU0QjEyRThFNgA="
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getPhoneNumbers",
        provider: "whatsapp",
        validCases: [
            {
                name: "list_phone_numbers",
                description: "List all phone numbers for a WhatsApp Business Account",
                input: {
                    wabaId: "123456789012345"
                },
                expectedOutput: {
                    phoneNumbers: [
                        {
                            id: "111222333444555",
                            displayPhoneNumber: "+1 (555) 123-4567",
                            verifiedName: "Acme Corporation",
                            qualityRating: "GREEN",
                            codeVerificationStatus: "VERIFIED",
                            platformType: "CLOUD_API",
                            throughputLevel: "STANDARD"
                        },
                        {
                            id: "222333444555666",
                            displayPhoneNumber: "+1 (555) 987-6543",
                            verifiedName: "Acme Support",
                            qualityRating: "GREEN",
                            codeVerificationStatus: "VERIFIED",
                            platformType: "CLOUD_API",
                            throughputLevel: "HIGH"
                        }
                    ],
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "waba_not_found",
                description: "WhatsApp Business Account ID does not exist",
                input: {
                    wabaId: "999999999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "WhatsApp Business Account not found",
                    retryable: false
                }
            },
            {
                name: "permission_denied",
                description: "User does not have access to this WABA",
                input: {
                    wabaId: "888888888888888"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to access this WhatsApp Business Account",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    wabaId: "123456789012345"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getBusinessProfile",
        provider: "whatsapp",
        validCases: [
            {
                name: "get_business_profile",
                description: "Retrieve the business profile for a WhatsApp Business phone number",
                input: {
                    phoneNumberId: "123456789012345"
                },
                expectedOutput: {
                    about: "Your trusted partner for automation solutions",
                    address: "123 Main Street, San Francisco, CA 94102",
                    description:
                        "We help businesses automate their workflows with cutting-edge technology. Available Mon-Fri 9am-6pm PST.",
                    email: "support@acmecorp.com",
                    profilePictureUrl: "https://scontent.whatsapp.net/v/t61.24694-24/profile.jpg",
                    vertical: "TECH",
                    websites: ["https://www.acmecorp.com", "https://support.acmecorp.com"]
                }
            }
        ],
        errorCases: [
            {
                name: "phone_number_not_found",
                description: "Phone number ID does not exist",
                input: {
                    phoneNumberId: "999999999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Business profile not found",
                    retryable: false
                }
            },
            {
                name: "permission_denied",
                description: "User does not have access to this phone number",
                input: {
                    phoneNumberId: "888888888888888"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to access this phone number",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    phoneNumberId: "123456789012345"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getMessageTemplates",
        provider: "whatsapp",
        filterableData: {
            records: sampleMessageTemplates,
            recordsField: "templates",
            offsetField: "paging",
            defaultPageSize: 25,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["_status", "_category"]
            }
        },
        validCases: [
            {
                name: "list_all_templates",
                description: "List all message templates for a WhatsApp Business Account",
                input: {
                    wabaId: "123456789012345"
                }
            },
            {
                name: "list_approved_templates",
                description: "List only approved message templates",
                input: {
                    wabaId: "123456789012345",
                    status: "APPROVED"
                }
            },
            {
                name: "list_templates_with_limit",
                description: "List templates with a custom limit",
                input: {
                    wabaId: "123456789012345",
                    limit: 5
                }
            }
        ],
        errorCases: [
            {
                name: "waba_not_found",
                description: "WhatsApp Business Account ID does not exist",
                input: {
                    wabaId: "999999999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "WhatsApp Business Account not found",
                    retryable: false
                }
            },
            {
                name: "permission_denied",
                description: "User does not have access to this WABA",
                input: {
                    wabaId: "888888888888888"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to access this WhatsApp Business Account",
                    retryable: false
                }
            },
            {
                name: "invalid_status_filter",
                description: "Invalid status filter value",
                input: {
                    wabaId: "123456789012345",
                    status: "INVALID_STATUS"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid status filter. Valid values: APPROVED, PENDING, REJECTED",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    wabaId: "123456789012345"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    }
];
