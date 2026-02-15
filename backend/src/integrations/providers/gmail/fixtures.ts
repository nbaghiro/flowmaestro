/**
 * Gmail Provider Test Fixtures
 *
 * Based on official Gmail API documentation:
 * - Send Message: https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send
 * - Get Message: https://developers.google.com/gmail/api/reference/rest/v1/users.messages/get
 * - List Messages: https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list
 * - Create Label: https://developers.google.com/gmail/api/reference/rest/v1/users.labels/create
 * - List Labels: https://developers.google.com/gmail/api/reference/rest/v1/users.labels/list
 */

import type { TestFixture } from "../../sandbox";

export const gmailFixtures: TestFixture[] = [
    {
        operationId: "sendMessage",
        provider: "gmail",
        validCases: [
            {
                name: "simple_email",
                description: "Send a simple email message",
                input: {
                    to: "recipient@example.com",
                    subject: "Hello from FlowMaestro",
                    body: "This is a test email sent via the Gmail API."
                },
                expectedOutput: {
                    id: "18d5c3e4f5a6b7c8",
                    threadId: "18d5c3e4f5a6b7c8",
                    labelIds: ["SENT"]
                }
            },
            {
                name: "email_with_cc_and_bcc",
                description: "Send an email with CC and BCC recipients",
                input: {
                    to: "primary@example.com",
                    cc: "cc@example.com",
                    bcc: "bcc@example.com",
                    subject: "Important Update",
                    body: "Please review the attached document."
                },
                expectedOutput: {
                    id: "18d5c3e4f5a6b7c9",
                    threadId: "18d5c3e4f5a6b7c9",
                    labelIds: ["SENT"]
                }
            },
            {
                name: "reply_to_thread",
                description: "Send a reply in an existing email thread",
                input: {
                    to: "colleague@example.com",
                    subject: "Re: Project Discussion",
                    body: "Thanks for the update. I'll review it today.",
                    threadId: "18d5c3e4f5a6b7c0"
                },
                expectedOutput: {
                    id: "18d5c3e4f5a6b7ca",
                    threadId: "18d5c3e4f5a6b7c0",
                    labelIds: ["SENT"]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_recipient",
                description: "Send to an invalid email address",
                input: {
                    to: "not-a-valid-email",
                    subject: "Test",
                    body: "Test body"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid To header",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    to: "test@example.com",
                    subject: "Test",
                    body: "Test body"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate Limit Exceeded",
                    retryable: true
                }
            },
            {
                name: "permission",
                description: "Invalid or expired auth token",
                input: {
                    to: "test@example.com",
                    subject: "Test",
                    body: "Test body"
                },
                expectedError: {
                    type: "permission",
                    message: "Invalid Credentials",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getMessage",
        provider: "gmail",
        validCases: [
            {
                name: "get_full_message",
                description: "Get a message with full details",
                input: {
                    messageId: "18d5c3e4f5a6b7c8"
                },
                expectedOutput: {
                    id: "18d5c3e4f5a6b7c8",
                    threadId: "18d5c3e4f5a6b7c8",
                    labelIds: ["INBOX", "UNREAD", "IMPORTANT"],
                    snippet: "Hello, this is the beginning of the email content...",
                    historyId: "12345678",
                    internalDate: "1706115600000",
                    sizeEstimate: 2048,
                    payload: {
                        partId: "",
                        mimeType: "multipart/alternative",
                        filename: "",
                        headers: [
                            { name: "From", value: "sender@example.com" },
                            { name: "To", value: "recipient@example.com" },
                            { name: "Subject", value: "Hello from FlowMaestro" },
                            { name: "Date", value: "Wed, 24 Jan 2024 10:00:00 -0500" },
                            { name: "Message-ID", value: "<abc123@mail.example.com>" }
                        ],
                        body: {
                            size: 0
                        },
                        parts: [
                            {
                                partId: "0",
                                mimeType: "text/plain",
                                filename: "",
                                headers: [
                                    { name: "Content-Type", value: "text/plain; charset=UTF-8" }
                                ],
                                body: {
                                    size: 156,
                                    data: "SGVsbG8sIHRoaXMgaXMgdGhlIGVtYWlsIGNvbnRlbnQu"
                                }
                            },
                            {
                                partId: "1",
                                mimeType: "text/html",
                                filename: "",
                                headers: [
                                    { name: "Content-Type", value: "text/html; charset=UTF-8" }
                                ],
                                body: {
                                    size: 256,
                                    data: "PGh0bWw+PGJvZHk+SGVsbG8sIHRoaXMgaXMgdGhlIGVtYWlsIGNvbnRlbnQuPC9ib2R5PjwvaHRtbD4="
                                }
                            }
                        ]
                    }
                }
            },
            {
                name: "get_message_metadata_only",
                description: "Get a message with metadata only",
                input: {
                    messageId: "18d5c3e4f5a6b7c9",
                    format: "metadata",
                    metadataHeaders: ["From", "To", "Subject", "Date"]
                },
                expectedOutput: {
                    id: "18d5c3e4f5a6b7c9",
                    threadId: "18d5c3e4f5a6b7c9",
                    labelIds: ["INBOX"],
                    snippet: "Meeting reminder for tomorrow...",
                    historyId: "12345679",
                    internalDate: "1706202000000",
                    sizeEstimate: 1024,
                    payload: {
                        mimeType: "text/plain",
                        headers: [
                            { name: "From", value: "calendar@example.com" },
                            { name: "To", value: "user@example.com" },
                            { name: "Subject", value: "Meeting Reminder" },
                            { name: "Date", value: "Thu, 25 Jan 2024 10:00:00 -0500" }
                        ]
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "message_not_found",
                description: "Message does not exist",
                input: {
                    messageId: "nonexistent-message-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Requested entity was not found.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listMessages",
        provider: "gmail",
        filterableData: {
            recordsField: "messages",
            offsetField: "nextPageToken",
            defaultPageSize: 100,
            maxPageSize: 500,
            pageSizeParam: "maxResults",
            offsetParam: "pageToken",
            filterConfig: {
                type: "generic",
                filterableFields: ["q", "labelIds"]
            },
            records: [
                {
                    id: "18d5c3e4f5a6b7c8",
                    threadId: "18d5c3e4f5a6b7c8",
                    _labelIds: ["INBOX", "UNREAD"],
                    _from: "sender1@example.com",
                    _subject: "Project Update"
                },
                {
                    id: "18d5c3e4f5a6b7c9",
                    threadId: "18d5c3e4f5a6b7c9",
                    _labelIds: ["INBOX"],
                    _from: "sender2@example.com",
                    _subject: "Meeting Notes"
                },
                {
                    id: "18d5c3e4f5a6b7ca",
                    threadId: "18d5c3e4f5a6b7ca",
                    _labelIds: ["SENT"],
                    _from: "me@example.com",
                    _subject: "Re: Project Update"
                },
                {
                    id: "18d5c3e4f5a6b7cb",
                    threadId: "18d5c3e4f5a6b7cb",
                    _labelIds: ["INBOX", "STARRED"],
                    _from: "important@example.com",
                    _subject: "Important: Action Required"
                },
                {
                    id: "18d5c3e4f5a6b7cc",
                    threadId: "18d5c3e4f5a6b7cc",
                    _labelIds: ["TRASH"],
                    _from: "spam@example.com",
                    _subject: "Deleted Message"
                }
            ]
        },
        validCases: [
            {
                name: "list_inbox_messages",
                description: "List messages from inbox",
                input: {
                    labelIds: ["INBOX"]
                },
                expectedOutput: {
                    messages: [
                        { id: "18d5c3e4f5a6b7c8", threadId: "18d5c3e4f5a6b7c8" },
                        { id: "18d5c3e4f5a6b7c9", threadId: "18d5c3e4f5a6b7c9" }
                    ],
                    resultSizeEstimate: 2
                }
            },
            {
                name: "list_with_query",
                description: "List messages matching a search query",
                input: {
                    q: "from:sender1@example.com"
                },
                expectedOutput: {
                    messages: [{ id: "18d5c3e4f5a6b7c8", threadId: "18d5c3e4f5a6b7c8" }],
                    resultSizeEstimate: 1
                }
            },
            {
                name: "list_with_pagination",
                description: "List messages with pagination",
                input: {
                    maxResults: 2
                },
                expectedOutput: {
                    messages: [
                        { id: "18d5c3e4f5a6b7c8", threadId: "18d5c3e4f5a6b7c8" },
                        { id: "18d5c3e4f5a6b7c9", threadId: "18d5c3e4f5a6b7c9" }
                    ],
                    nextPageToken: "token_18d5c3e4f5a6b7c9",
                    resultSizeEstimate: 5
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_query",
                description: "Invalid search query syntax",
                input: {
                    q: "from:(invalid syntax"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid query",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createLabel",
        provider: "gmail",
        validCases: [
            {
                name: "create_simple_label",
                description: "Create a simple label",
                input: {
                    name: "Work Projects"
                },
                expectedOutput: {
                    id: "Label_123456789",
                    name: "Work Projects",
                    messageListVisibility: "show",
                    labelListVisibility: "labelShow",
                    type: "user",
                    messagesTotal: 0,
                    messagesUnread: 0,
                    threadsTotal: 0,
                    threadsUnread: 0
                }
            },
            {
                name: "create_label_with_colors",
                description: "Create a label with custom colors",
                input: {
                    name: "Urgent",
                    labelListVisibility: "labelShow",
                    messageListVisibility: "show",
                    color: {
                        textColor: "#ffffff",
                        backgroundColor: "#fb4c2f"
                    }
                },
                expectedOutput: {
                    id: "Label_987654321",
                    name: "Urgent",
                    messageListVisibility: "show",
                    labelListVisibility: "labelShow",
                    type: "user",
                    messagesTotal: 0,
                    messagesUnread: 0,
                    threadsTotal: 0,
                    threadsUnread: 0,
                    color: {
                        textColor: "#ffffff",
                        backgroundColor: "#fb4c2f"
                    }
                }
            },
            {
                name: "create_nested_label",
                description: "Create a nested label using slash notation",
                input: {
                    name: "Work/Projects/2024"
                },
                expectedOutput: {
                    id: "Label_nested_123",
                    name: "Work/Projects/2024",
                    messageListVisibility: "show",
                    labelListVisibility: "labelShow",
                    type: "user",
                    messagesTotal: 0,
                    messagesUnread: 0,
                    threadsTotal: 0,
                    threadsUnread: 0
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_label",
                description: "Label name already exists",
                input: {
                    name: "Existing Label"
                },
                expectedError: {
                    type: "validation",
                    message: "Label name exists or conflicts",
                    retryable: false
                }
            },
            {
                name: "invalid_label_name",
                description: "Label name contains invalid characters",
                input: {
                    name: ""
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid label name",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listLabels",
        provider: "gmail",
        validCases: [
            {
                name: "list_all_labels",
                description: "List all labels including system and user labels",
                input: {},
                expectedOutput: {
                    labels: [
                        {
                            id: "INBOX",
                            name: "INBOX",
                            type: "system",
                            messageListVisibility: "show",
                            labelListVisibility: "labelShow",
                            messagesTotal: 150,
                            messagesUnread: 23,
                            threadsTotal: 120,
                            threadsUnread: 18
                        },
                        {
                            id: "SENT",
                            name: "SENT",
                            type: "system",
                            messageListVisibility: "show",
                            labelListVisibility: "labelShow",
                            messagesTotal: 500,
                            messagesUnread: 0,
                            threadsTotal: 450,
                            threadsUnread: 0
                        },
                        {
                            id: "DRAFT",
                            name: "DRAFT",
                            type: "system",
                            messageListVisibility: "show",
                            labelListVisibility: "labelShow",
                            messagesTotal: 5,
                            messagesUnread: 0,
                            threadsTotal: 5,
                            threadsUnread: 0
                        },
                        {
                            id: "TRASH",
                            name: "TRASH",
                            type: "system",
                            messageListVisibility: "hide",
                            labelListVisibility: "labelHide",
                            messagesTotal: 50,
                            messagesUnread: 0,
                            threadsTotal: 45,
                            threadsUnread: 0
                        },
                        {
                            id: "SPAM",
                            name: "SPAM",
                            type: "system",
                            messageListVisibility: "hide",
                            labelListVisibility: "labelHide",
                            messagesTotal: 12,
                            messagesUnread: 0,
                            threadsTotal: 12,
                            threadsUnread: 0
                        },
                        {
                            id: "STARRED",
                            name: "STARRED",
                            type: "system",
                            messageListVisibility: "show",
                            labelListVisibility: "labelShow",
                            messagesTotal: 25,
                            messagesUnread: 3,
                            threadsTotal: 20,
                            threadsUnread: 2
                        },
                        {
                            id: "IMPORTANT",
                            name: "IMPORTANT",
                            type: "system",
                            messageListVisibility: "show",
                            labelListVisibility: "labelShow",
                            messagesTotal: 75,
                            messagesUnread: 10,
                            threadsTotal: 60,
                            threadsUnread: 8
                        },
                        {
                            id: "Label_123456789",
                            name: "Work Projects",
                            type: "user",
                            messageListVisibility: "show",
                            labelListVisibility: "labelShow",
                            messagesTotal: 45,
                            messagesUnread: 5,
                            threadsTotal: 30,
                            threadsUnread: 3
                        },
                        {
                            id: "Label_987654321",
                            name: "Urgent",
                            type: "user",
                            messageListVisibility: "show",
                            labelListVisibility: "labelShow",
                            messagesTotal: 10,
                            messagesUnread: 2,
                            threadsTotal: 8,
                            threadsUnread: 2,
                            color: {
                                textColor: "#ffffff",
                                backgroundColor: "#fb4c2f"
                            }
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "permission_denied",
                description: "Insufficient permissions to list labels",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Request had insufficient authentication scopes.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Too many requests to Gmail API",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate Limit Exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteLabel",
        provider: "gmail",
        validCases: [
            {
                name: "delete_user_label",
                description: "Delete a user-created label",
                input: {
                    labelId: "Label_123456789"
                },
                expectedOutput: {}
            }
        ],
        errorCases: [
            {
                name: "label_not_found",
                description: "Label does not exist",
                input: {
                    labelId: "Label_nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Requested entity was not found.",
                    retryable: false
                }
            },
            {
                name: "cannot_delete_system_label",
                description: "Cannot delete system labels",
                input: {
                    labelId: "INBOX"
                },
                expectedError: {
                    type: "validation",
                    message: "System labels cannot be deleted",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "modifyMessage",
        provider: "gmail",
        validCases: [
            {
                name: "add_labels",
                description: "Add labels to a message",
                input: {
                    messageId: "18d5c3e4f5a6b7c8",
                    addLabelIds: ["STARRED", "Label_123456789"]
                },
                expectedOutput: {
                    id: "18d5c3e4f5a6b7c8",
                    threadId: "18d5c3e4f5a6b7c8",
                    labelIds: ["INBOX", "STARRED", "Label_123456789"]
                }
            },
            {
                name: "remove_labels",
                description: "Remove labels from a message",
                input: {
                    messageId: "18d5c3e4f5a6b7c8",
                    removeLabelIds: ["UNREAD"]
                },
                expectedOutput: {
                    id: "18d5c3e4f5a6b7c8",
                    threadId: "18d5c3e4f5a6b7c8",
                    labelIds: ["INBOX"]
                }
            },
            {
                name: "mark_as_read",
                description: "Mark a message as read by removing UNREAD label",
                input: {
                    messageId: "18d5c3e4f5a6b7c9",
                    removeLabelIds: ["UNREAD"]
                },
                expectedOutput: {
                    id: "18d5c3e4f5a6b7c9",
                    threadId: "18d5c3e4f5a6b7c9",
                    labelIds: ["INBOX"]
                }
            }
        ],
        errorCases: [
            {
                name: "message_not_found",
                description: "Message does not exist",
                input: {
                    messageId: "nonexistent-id",
                    addLabelIds: ["STARRED"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Requested entity was not found.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "trashMessage",
        provider: "gmail",
        validCases: [
            {
                name: "trash_message",
                description: "Move a message to trash",
                input: {
                    messageId: "18d5c3e4f5a6b7c8"
                },
                expectedOutput: {
                    id: "18d5c3e4f5a6b7c8",
                    threadId: "18d5c3e4f5a6b7c8",
                    labelIds: ["TRASH"]
                }
            }
        ],
        errorCases: [
            {
                name: "message_not_found",
                description: "Message does not exist",
                input: {
                    messageId: "nonexistent-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Requested entity was not found.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "untrashMessage",
        provider: "gmail",
        validCases: [
            {
                name: "untrash_message",
                description: "Restore a message from trash",
                input: {
                    messageId: "18d5c3e4f5a6b7c8"
                },
                expectedOutput: {
                    id: "18d5c3e4f5a6b7c8",
                    threadId: "18d5c3e4f5a6b7c8",
                    labelIds: ["INBOX"]
                }
            }
        ],
        errorCases: [
            {
                name: "message_not_found",
                description: "Message does not exist",
                input: {
                    messageId: "nonexistent-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Requested entity was not found.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getThread",
        provider: "gmail",
        validCases: [
            {
                name: "get_thread",
                description: "Get a thread with all messages",
                input: {
                    threadId: "18d5c3e4f5a6b7c8"
                },
                expectedOutput: {
                    id: "18d5c3e4f5a6b7c8",
                    historyId: "12345678",
                    messages: [
                        {
                            id: "18d5c3e4f5a6b7c8",
                            threadId: "18d5c3e4f5a6b7c8",
                            labelIds: ["INBOX"],
                            snippet: "Original message content...",
                            historyId: "12345678",
                            internalDate: "1706115600000",
                            payload: {
                                mimeType: "text/plain",
                                headers: [
                                    { name: "From", value: "sender@example.com" },
                                    { name: "To", value: "recipient@example.com" },
                                    { name: "Subject", value: "Original Subject" }
                                ]
                            }
                        },
                        {
                            id: "18d5c3e4f5a6b7d0",
                            threadId: "18d5c3e4f5a6b7c8",
                            labelIds: ["SENT"],
                            snippet: "Reply message content...",
                            historyId: "12345679",
                            internalDate: "1706119200000",
                            payload: {
                                mimeType: "text/plain",
                                headers: [
                                    { name: "From", value: "recipient@example.com" },
                                    { name: "To", value: "sender@example.com" },
                                    { name: "Subject", value: "Re: Original Subject" }
                                ]
                            }
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "thread_not_found",
                description: "Thread does not exist",
                input: {
                    threadId: "nonexistent-thread-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Requested entity was not found.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listThreads",
        provider: "gmail",
        validCases: [
            {
                name: "list_threads",
                description: "List email threads",
                input: {
                    labelIds: ["INBOX"],
                    maxResults: 10
                },
                expectedOutput: {
                    threads: [
                        {
                            id: "18d5c3e4f5a6b7c8",
                            snippet: "Latest message in thread...",
                            historyId: "12345678"
                        },
                        {
                            id: "18d5c3e4f5a6b7c9",
                            snippet: "Another thread preview...",
                            historyId: "12345679"
                        }
                    ],
                    resultSizeEstimate: 2
                }
            }
        ],
        errorCases: [
            {
                name: "label_not_found",
                description: "Requested label does not exist",
                input: {
                    labelIds: ["Label_nonexistent"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Requested entity was not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Too many requests to Gmail API",
                input: {
                    maxResults: 100
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate Limit Exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "replyToMessage",
        provider: "gmail",
        validCases: [
            {
                name: "reply_to_message",
                description: "Reply to an existing message",
                input: {
                    messageId: "18d5c3e4f5a6b7c8",
                    body: "Thank you for your email. I will look into this."
                },
                expectedOutput: {
                    id: "18d5c3e4f5a6b7d1",
                    threadId: "18d5c3e4f5a6b7c8",
                    labelIds: ["SENT"]
                }
            }
        ],
        errorCases: [
            {
                name: "original_not_found",
                description: "Original message not found",
                input: {
                    messageId: "nonexistent-id",
                    body: "Reply text"
                },
                expectedError: {
                    type: "not_found",
                    message: "Requested entity was not found.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "forwardMessage",
        provider: "gmail",
        validCases: [
            {
                name: "forward_message",
                description: "Forward an email to another recipient",
                input: {
                    messageId: "18d5c3e4f5a6b7c8",
                    to: "forwarded@example.com",
                    body: "FYI - see below."
                },
                expectedOutput: {
                    id: "18d5c3e4f5a6b7d2",
                    threadId: "18d5c3e4f5a6b7d2",
                    labelIds: ["SENT"]
                }
            }
        ],
        errorCases: [
            {
                name: "original_not_found",
                description: "Original message not found",
                input: {
                    messageId: "nonexistent-id",
                    to: "test@example.com"
                },
                expectedError: {
                    type: "not_found",
                    message: "Requested entity was not found.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getAttachment",
        provider: "gmail",
        validCases: [
            {
                name: "get_attachment",
                description: "Get an attachment from a message",
                input: {
                    messageId: "18d5c3e4f5a6b7c8",
                    attachmentId: "ANGjdJ_abc123"
                },
                expectedOutput: {
                    size: 15420,
                    data: "base64encodedattachmentdata..."
                }
            }
        ],
        errorCases: [
            {
                name: "attachment_not_found",
                description: "Attachment does not exist",
                input: {
                    messageId: "18d5c3e4f5a6b7c8",
                    attachmentId: "nonexistent-attachment"
                },
                expectedError: {
                    type: "not_found",
                    message: "Requested entity was not found.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updateLabel",
        provider: "gmail",
        validCases: [
            {
                name: "update_label_name",
                description: "Update a label's name",
                input: {
                    labelId: "Label_123456789",
                    name: "Work Projects (Updated)"
                },
                expectedOutput: {
                    id: "Label_123456789",
                    name: "Work Projects (Updated)",
                    messageListVisibility: "show",
                    labelListVisibility: "labelShow",
                    type: "user",
                    messagesTotal: 45,
                    messagesUnread: 5,
                    threadsTotal: 30,
                    threadsUnread: 3
                }
            },
            {
                name: "update_label_colors",
                description: "Update a label's colors",
                input: {
                    labelId: "Label_987654321",
                    color: {
                        textColor: "#000000",
                        backgroundColor: "#fad165"
                    }
                },
                expectedOutput: {
                    id: "Label_987654321",
                    name: "Urgent",
                    messageListVisibility: "show",
                    labelListVisibility: "labelShow",
                    type: "user",
                    messagesTotal: 10,
                    messagesUnread: 2,
                    threadsTotal: 8,
                    threadsUnread: 2,
                    color: {
                        textColor: "#000000",
                        backgroundColor: "#fad165"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "label_not_found",
                description: "Label does not exist",
                input: {
                    labelId: "Label_nonexistent",
                    name: "New Name"
                },
                expectedError: {
                    type: "not_found",
                    message: "Requested entity was not found.",
                    retryable: false
                }
            }
        ]
    }
];
