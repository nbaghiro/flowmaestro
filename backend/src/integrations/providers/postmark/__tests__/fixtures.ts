/**
 * Postmark Provider Test Fixtures
 *
 * Based on Postmark API documentation for transactional email operations
 */

import type { TestFixture } from "../../../sandbox";

/**
 * Sample templates for filterableData
 */
const sampleTemplates = [
    {
        templateId: 12345,
        name: "Welcome Email",
        alias: "welcome-email",
        subject: "Welcome to {{company_name}}!",
        active: true,
        templateType: "Standard",
        layoutTemplate: null
    },
    {
        templateId: 12346,
        name: "Password Reset",
        alias: "password-reset",
        subject: "Reset Your Password",
        active: true,
        templateType: "Standard",
        layoutTemplate: null
    },
    {
        templateId: 12347,
        name: "Order Confirmation",
        alias: "order-confirmation",
        subject: "Your Order #{{order_id}} is Confirmed",
        active: true,
        templateType: "Standard",
        layoutTemplate: "base-layout"
    },
    {
        templateId: 12348,
        name: "Base Layout",
        alias: "base-layout",
        subject: "",
        active: true,
        templateType: "Layout",
        layoutTemplate: null
    }
];

/**
 * Sample bounces for filterableData
 */
const sampleBounces = [
    {
        id: 1001,
        type: "HardBounce",
        typeCode: 1,
        name: "Hard bounce",
        tag: "marketing",
        messageId: "msg-001",
        email: "invalid@nonexistent-domain.com",
        from: "sender@company.com",
        bouncedAt: "2024-01-15T10:30:00Z",
        description: "The server was unable to deliver your message",
        details: "smtp;550 5.1.1 The email account does not exist",
        inactive: true,
        canActivate: true,
        subject: "Welcome to our service",
        messageStream: "outbound"
    },
    {
        id: 1002,
        type: "SoftBounce",
        typeCode: 2,
        name: "Soft bounce",
        tag: "transactional",
        messageId: "msg-002",
        email: "user@example.com",
        from: "sender@company.com",
        bouncedAt: "2024-01-16T14:20:00Z",
        description: "Mailbox temporarily unavailable",
        details: "smtp;450 4.2.2 Mailbox full",
        inactive: false,
        canActivate: false,
        subject: "Your order confirmation",
        messageStream: "outbound"
    },
    {
        id: 1003,
        type: "SpamComplaint",
        typeCode: 512,
        name: "Spam complaint",
        tag: "marketing",
        messageId: "msg-003",
        email: "complained@example.com",
        from: "marketing@company.com",
        bouncedAt: "2024-01-17T09:00:00Z",
        description: "The subscriber explicitly marked this message as spam",
        details: "Spam complaint received via feedback loop",
        inactive: true,
        canActivate: false,
        subject: "Special Offer Inside!",
        messageStream: "broadcast"
    }
];

export const postmarkFixtures: TestFixture[] = [
    {
        operationId: "sendEmail",
        provider: "postmark",
        validCases: [
            {
                name: "send_simple_email",
                description: "Send a simple text email to a single recipient",
                input: {
                    from: "sender@company.com",
                    to: "recipient@example.com",
                    subject: "Welcome to our service!",
                    textBody: "Thank you for signing up. We're excited to have you on board."
                },
                expectedOutput: {
                    messageId: "msg-12345-abcde",
                    to: "recipient@example.com",
                    submittedAt: "2024-01-15T10:30:00Z"
                }
            },
            {
                name: "send_html_email_with_tracking",
                description: "Send an HTML email with open and link tracking",
                input: {
                    from: "notifications@company.com",
                    to: "customer@example.com",
                    cc: "manager@company.com",
                    subject: "Your Order Has Shipped!",
                    htmlBody: "<h1>Order Shipped</h1><p>Your order #12345 has been shipped.</p>",
                    textBody: "Your order #12345 has been shipped.",
                    tag: "shipping-notification",
                    trackOpens: true,
                    trackLinks: "HtmlAndText",
                    metadata: { orderId: "12345", customerId: "cust-789" }
                },
                expectedOutput: {
                    messageId: "msg-67890-fghij",
                    to: "customer@example.com",
                    submittedAt: "2024-01-15T11:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_from_address",
                description: "From address not verified",
                input: {
                    from: "unverified@notverified.com",
                    to: "recipient@example.com",
                    subject: "Test",
                    textBody: "Test email"
                },
                expectedError: {
                    type: "validation",
                    message: "The From address is not a Sender Signature",
                    retryable: false
                }
            },
            {
                name: "missing_content",
                description: "Neither HTML nor text body provided",
                input: {
                    from: "sender@company.com",
                    to: "recipient@example.com",
                    subject: "Test"
                },
                expectedError: {
                    type: "validation",
                    message: "Either htmlBody or textBody is required",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "sendBatchEmails",
        provider: "postmark",
        validCases: [
            {
                name: "send_batch_emails",
                description: "Send multiple emails in one request",
                input: {
                    emails: [
                        {
                            from: "sender@company.com",
                            to: "user1@example.com",
                            subject: "Hello User 1",
                            textBody: "This is a message for user 1"
                        },
                        {
                            from: "sender@company.com",
                            to: "user2@example.com",
                            subject: "Hello User 2",
                            textBody: "This is a message for user 2"
                        }
                    ]
                },
                expectedOutput: {
                    total: 2,
                    successCount: 2,
                    failedCount: 0,
                    results: [
                        {
                            messageId: "msg-batch-001",
                            to: "user1@example.com",
                            submittedAt: "2024-01-15T10:30:00Z",
                            errorCode: 0,
                            message: "OK"
                        },
                        {
                            messageId: "msg-batch-002",
                            to: "user2@example.com",
                            submittedAt: "2024-01-15T10:30:01Z",
                            errorCode: 0,
                            message: "OK"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "batch_exceeds_limit",
                description: "Batch contains more than 500 emails",
                input: {
                    emails: Array(501).fill({
                        from: "sender@company.com",
                        to: "user@example.com",
                        subject: "Test",
                        textBody: "Test"
                    })
                },
                expectedError: {
                    type: "validation",
                    message: "Array must contain at most 500 element(s)",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "sendTemplateEmail",
        provider: "postmark",
        validCases: [
            {
                name: "send_template_by_id",
                description: "Send email using template ID",
                input: {
                    from: "sender@company.com",
                    to: "customer@example.com",
                    templateId: 12345,
                    templateModel: {
                        name: "John Doe",
                        company_name: "Acme Corp",
                        action_url: "https://example.com/activate"
                    }
                },
                expectedOutput: {
                    messageId: "msg-template-001",
                    to: "customer@example.com",
                    submittedAt: "2024-01-15T10:30:00Z"
                }
            },
            {
                name: "send_template_by_alias",
                description: "Send email using template alias",
                input: {
                    from: "sender@company.com",
                    to: "customer@example.com",
                    templateAlias: "welcome-email",
                    templateModel: {
                        name: "Jane Smith",
                        company_name: "Tech Inc"
                    },
                    tag: "onboarding"
                },
                expectedOutput: {
                    messageId: "msg-template-002",
                    to: "customer@example.com",
                    submittedAt: "2024-01-15T11:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "template_not_found",
                description: "Template ID does not exist",
                input: {
                    from: "sender@company.com",
                    to: "customer@example.com",
                    templateId: 99999,
                    templateModel: {}
                },
                expectedError: {
                    type: "not_found",
                    message: "Template not found",
                    retryable: false
                }
            },
            {
                name: "missing_template_identifier",
                description: "Neither templateId nor templateAlias provided",
                input: {
                    from: "sender@company.com",
                    to: "customer@example.com",
                    templateModel: {}
                },
                expectedError: {
                    type: "validation",
                    message: "Either templateId or templateAlias is required",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listTemplates",
        provider: "postmark",
        filterableData: {
            records: sampleTemplates,
            recordsField: "templates",
            offsetField: "offset",
            defaultPageSize: 100,
            maxPageSize: 500,
            pageSizeParam: "count",
            filterConfig: {
                type: "generic",
                filterableFields: ["templateType", "active"]
            }
        },
        validCases: [
            {
                name: "list_all_templates",
                description: "List all email templates",
                input: {}
            },
            {
                name: "list_standard_templates",
                description: "List only standard templates",
                input: {
                    templateType: "Standard"
                }
            },
            {
                name: "list_templates_paginated",
                description: "List templates with pagination",
                input: {
                    count: 10,
                    offset: 0
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_count",
                description: "Count exceeds maximum",
                input: {
                    count: 1000
                },
                expectedError: {
                    type: "validation",
                    message: "Number must be less than or equal to 500",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getTemplate",
        provider: "postmark",
        validCases: [
            {
                name: "get_template_by_id",
                description: "Get template by numeric ID",
                input: {
                    templateIdOrAlias: 12345
                },
                expectedOutput: {
                    templateId: 12345,
                    name: "Welcome Email",
                    alias: "welcome-email",
                    subject: "Welcome to {{company_name}}!",
                    active: true,
                    templateType: "Standard",
                    layoutTemplate: null,
                    htmlBody: "<html><body><h1>Welcome!</h1></body></html>",
                    textBody: "Welcome to our service!"
                }
            },
            {
                name: "get_template_by_alias",
                description: "Get template by string alias",
                input: {
                    templateIdOrAlias: "password-reset"
                },
                expectedOutput: {
                    templateId: 12346,
                    name: "Password Reset",
                    alias: "password-reset",
                    subject: "Reset Your Password",
                    active: true,
                    templateType: "Standard",
                    layoutTemplate: null,
                    htmlBody: "<html><body><h1>Password Reset</h1></body></html>",
                    textBody: "Click here to reset your password"
                }
            }
        ],
        errorCases: [
            {
                name: "template_not_found",
                description: "Template does not exist",
                input: {
                    templateIdOrAlias: "nonexistent-template"
                },
                expectedError: {
                    type: "not_found",
                    message: "Template not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getDeliveryStats",
        provider: "postmark",
        validCases: [
            {
                name: "get_delivery_stats",
                description: "Get email delivery statistics",
                input: {},
                expectedOutput: {
                    inactiveMails: 15,
                    bounces: [
                        { name: "All", count: 45 },
                        { name: "HardBounce", count: 12, type: "HardBounce" },
                        { name: "SoftBounce", count: 23, type: "SoftBounce" },
                        { name: "SpamComplaint", count: 5, type: "SpamComplaint" },
                        { name: "Transient", count: 5, type: "Transient" }
                    ]
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "listBounces",
        provider: "postmark",
        filterableData: {
            records: sampleBounces,
            recordsField: "bounces",
            offsetField: "offset",
            defaultPageSize: 50,
            maxPageSize: 500,
            pageSizeParam: "count",
            filterConfig: {
                type: "generic",
                filterableFields: ["type", "inactive", "tag", "messageStream"]
            }
        },
        validCases: [
            {
                name: "list_all_bounces",
                description: "List all bounced emails",
                input: {}
            },
            {
                name: "list_hard_bounces",
                description: "List only hard bounces",
                input: {
                    type: "HardBounce"
                }
            },
            {
                name: "list_inactive_bounces",
                description: "List inactive bounced addresses",
                input: {
                    inactive: true
                }
            },
            {
                name: "filter_by_email",
                description: "Filter bounces by email pattern",
                input: {
                    emailFilter: "@example.com"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_count",
                description: "Count exceeds maximum",
                input: {
                    count: 1000
                },
                expectedError: {
                    type: "validation",
                    message: "Number must be less than or equal to 500",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "activateBounce",
        provider: "postmark",
        validCases: [
            {
                name: "activate_bounce",
                description: "Reactivate a bounced email address",
                input: {
                    bounceId: 1001
                },
                expectedOutput: {
                    message: "OK",
                    bounce: {
                        id: 1001,
                        type: "HardBounce",
                        email: "invalid@nonexistent-domain.com",
                        inactive: false,
                        canActivate: false
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "bounce_not_found",
                description: "Bounce ID does not exist",
                input: {
                    bounceId: 99999
                },
                expectedError: {
                    type: "not_found",
                    message: "Bounce not found",
                    retryable: false
                }
            },
            {
                name: "cannot_activate",
                description: "Bounce cannot be activated (e.g., spam complaint)",
                input: {
                    bounceId: 1003
                },
                expectedError: {
                    type: "validation",
                    message: "This bounce cannot be activated",
                    retryable: false
                }
            }
        ]
    }
];
