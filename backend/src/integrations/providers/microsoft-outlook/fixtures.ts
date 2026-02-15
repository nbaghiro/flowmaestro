/**
 * Microsoft Outlook Provider Test Fixtures
 *
 * Based on Microsoft Graph API documentation:
 * - Mail: https://learn.microsoft.com/en-us/graph/api/resources/mail-api-overview
 * - Calendar: https://learn.microsoft.com/en-us/graph/api/resources/calendar
 */

import type { TestFixture } from "../../sandbox";

export const microsoftOutlookFixtures: TestFixture[] = [
    {
        operationId: "createEvent",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "basic_event",
                description: "Create a basic calendar event",
                input: {
                    subject: "Team Standup",
                    start: "2024-03-15T09:00:00",
                    end: "2024-03-15T09:30:00",
                    timeZone: "America/New_York"
                },
                expectedOutput: {
                    id: "AAMkAGI1AAAt9AHjAAA=",
                    subject: "Team Standup",
                    start: { dateTime: "2024-03-15T09:00:00", timeZone: "America/New_York" },
                    end: { dateTime: "2024-03-15T09:30:00", timeZone: "America/New_York" },
                    location: null,
                    isOnlineMeeting: false,
                    onlineMeetingUrl: null,
                    webLink: "https://outlook.office365.com/owa/?itemid=AAMkAGI1AAAt9AHjAAA%3D"
                }
            },
            {
                name: "event_with_attendees",
                description: "Create event with attendees and location",
                input: {
                    subject: "Project Review Meeting",
                    start: "2024-03-20T14:00:00",
                    end: "2024-03-20T15:00:00",
                    timeZone: "UTC",
                    body: "Quarterly project review with all stakeholders",
                    location: "Conference Room A",
                    attendees: ["alice@company.com", "bob@company.com"]
                },
                expectedOutput: {
                    id: "AAMkAGI1AAAt9AHkAAA=",
                    subject: "Project Review Meeting",
                    start: { dateTime: "2024-03-20T14:00:00", timeZone: "UTC" },
                    end: { dateTime: "2024-03-20T15:00:00", timeZone: "UTC" },
                    location: "Conference Room A",
                    isOnlineMeeting: false,
                    onlineMeetingUrl: null,
                    webLink: "https://outlook.office365.com/owa/?itemid=AAMkAGI1AAAt9AHkAAA%3D"
                }
            },
            {
                name: "teams_meeting",
                description: "Create event as Teams online meeting",
                input: {
                    subject: "Remote Team Sync",
                    start: "2024-03-25T16:00:00",
                    end: "2024-03-25T16:30:00",
                    timeZone: "Europe/London",
                    isOnlineMeeting: true,
                    attendees: ["remote-team@company.com"]
                },
                expectedOutput: {
                    id: "AAMkAGI1AAAt9AHlAAA=",
                    subject: "Remote Team Sync",
                    start: { dateTime: "2024-03-25T16:00:00", timeZone: "Europe/London" },
                    end: { dateTime: "2024-03-25T16:30:00", timeZone: "Europe/London" },
                    location: null,
                    isOnlineMeeting: true,
                    onlineMeetingUrl:
                        "https://teams.microsoft.com/l/meetup-join/19%3ameeting_abc123",
                    webLink: "https://outlook.office365.com/owa/?itemid=AAMkAGI1AAAt9AHlAAA%3D"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_time_range",
                description: "End time before start time",
                input: {
                    subject: "Invalid Meeting",
                    start: "2024-03-15T10:00:00",
                    end: "2024-03-15T09:00:00",
                    timeZone: "UTC"
                },
                expectedError: {
                    type: "validation",
                    message: "End time must be after start time",
                    retryable: false
                }
            },
            {
                name: "calendar_not_found",
                description: "Specified calendar does not exist",
                input: {
                    subject: "Meeting",
                    start: "2024-03-15T09:00:00",
                    end: "2024-03-15T10:00:00",
                    calendarId: "nonexistent-calendar-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Calendar not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "deleteEvent",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "delete_event",
                description: "Delete a calendar event",
                input: {
                    eventId: "AAMkAGI1AAAt9AHjAAA="
                },
                expectedOutput: {
                    success: true,
                    message: "Event deleted successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "event_not_found",
                description: "Event does not exist",
                input: {
                    eventId: "nonexistent-event-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Event not found",
                    retryable: false
                }
            },
            {
                name: "permission_denied",
                description: "No permission to delete event",
                input: {
                    eventId: "AAMkAGI1BBBt9AHjAAA="
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to delete this event",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "deleteMessage",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "delete_message",
                description: "Delete an email message",
                input: {
                    messageId: "AAMkAGI1AAAoZCfHAAA="
                },
                expectedOutput: {
                    success: true,
                    message: "Message deleted successfully"
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
                    message: "Message not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    messageId: "AAMkAGI1AAAoZCfHAAA="
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Too many requests. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "forwardMessage",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "forward_to_single_recipient",
                description: "Forward email to one recipient",
                input: {
                    messageId: "AAMkAGI1AAAoZCfHAAA=",
                    to: ["colleague@company.com"],
                    comment: "FYI - please review this"
                },
                expectedOutput: {
                    success: true,
                    message: "Message forwarded successfully"
                }
            },
            {
                name: "forward_to_multiple_recipients",
                description: "Forward email to multiple recipients",
                input: {
                    messageId: "AAMkAGI1AAAoZCfHAAA=",
                    to: ["alice@company.com", "bob@company.com", "carol@company.com"]
                },
                expectedOutput: {
                    success: true,
                    message: "Message forwarded successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "message_not_found",
                description: "Original message does not exist",
                input: {
                    messageId: "nonexistent-message-id",
                    to: ["someone@company.com"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Message not found",
                    retryable: false
                }
            },
            {
                name: "invalid_recipient",
                description: "Invalid email address",
                input: {
                    messageId: "AAMkAGI1AAAoZCfHAAA=",
                    to: ["invalid-email"]
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid recipient email address",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getEvent",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "get_basic_event",
                description: "Get a simple calendar event",
                input: {
                    eventId: "AAMkAGI1AAAt9AHjAAA="
                },
                expectedOutput: {
                    id: "AAMkAGI1AAAt9AHjAAA=",
                    subject: "Team Standup",
                    bodyPreview: "Daily standup meeting to discuss progress and blockers",
                    body: {
                        contentType: "html",
                        content: "<p>Daily standup meeting to discuss progress and blockers</p>"
                    },
                    start: { dateTime: "2024-03-15T09:00:00", timeZone: "America/New_York" },
                    end: { dateTime: "2024-03-15T09:30:00", timeZone: "America/New_York" },
                    location: "Conference Room B",
                    attendees: [
                        {
                            email: "alice@company.com",
                            name: "Alice Smith",
                            type: "required",
                            response: "accepted"
                        },
                        {
                            email: "bob@company.com",
                            name: "Bob Jones",
                            type: "required",
                            response: "tentativelyAccepted"
                        }
                    ],
                    organizer: { address: "organizer@company.com", name: "Meeting Organizer" },
                    isOnlineMeeting: false,
                    onlineMeetingUrl: null,
                    webLink: "https://outlook.office365.com/owa/?itemid=AAMkAGI1AAAt9AHjAAA%3D",
                    isCancelled: false,
                    responseStatus: { response: "organizer", time: "2024-03-10T10:00:00Z" },
                    createdDateTime: "2024-03-10T10:00:00Z",
                    lastModifiedDateTime: "2024-03-10T10:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "event_not_found",
                description: "Event does not exist",
                input: {
                    eventId: "nonexistent-event-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Event not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    eventId: "AAMkAGI1AAAt9AHjAAA="
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
        operationId: "getMessage",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "get_email_message",
                description: "Get a specific email message",
                input: {
                    messageId: "AAMkAGI1AAAoZCfHAAA="
                },
                expectedOutput: {
                    id: "AAMkAGI1AAAoZCfHAAA=",
                    subject: "Q4 Budget Review",
                    bodyPreview: "Please find attached the Q4 budget proposal for review...",
                    body: {
                        contentType: "html",
                        content: "<p>Please find attached the Q4 budget proposal for review.</p>"
                    },
                    from: { address: "finance@company.com", name: "Finance Team" },
                    toRecipients: [{ address: "user@company.com", name: "Current User" }],
                    ccRecipients: [{ address: "manager@company.com", name: "Manager" }],
                    bccRecipients: [],
                    receivedDateTime: "2024-03-14T14:30:00Z",
                    sentDateTime: "2024-03-14T14:29:55Z",
                    isRead: true,
                    isDraft: false,
                    importance: "high",
                    hasAttachments: true,
                    webLink: "https://outlook.office365.com/owa/?ItemID=AAMkAGI1AAAoZCfHAAA%3D"
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
                    message: "Message not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    messageId: "AAMkAGI1AAAoZCfHAAA="
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
        operationId: "listCalendars",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "list_all_calendars",
                description: "List all user calendars",
                input: {},
                expectedOutput: {
                    calendars: [
                        {
                            id: "AAMkAGI1AABhGF9kAAA=",
                            name: "Calendar",
                            color: "auto",
                            isDefaultCalendar: true,
                            canEdit: true,
                            owner: { address: "user@company.com", name: "Current User" }
                        },
                        {
                            id: "AAMkAGI1AABhGF9lAAA=",
                            name: "Work",
                            color: "lightBlue",
                            isDefaultCalendar: false,
                            canEdit: true,
                            owner: { address: "user@company.com", name: "Current User" }
                        },
                        {
                            id: "AAMkAGI1AABhGF9mAAA=",
                            name: "Team Calendar",
                            color: "lightGreen",
                            isDefaultCalendar: false,
                            canEdit: false,
                            owner: { address: "team@company.com", name: "Team" }
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Not authorized to access calendars",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Access denied. Required scope: Calendars.Read",
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
        operationId: "listEvents",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "list_events_in_range",
                description: "List events within a date range",
                input: {
                    startDateTime: "2024-03-01T00:00:00",
                    endDateTime: "2024-03-31T23:59:59"
                },
                expectedOutput: {
                    events: [
                        {
                            id: "AAMkAGI1AAAt9AHjAAA=",
                            subject: "Team Standup",
                            bodyPreview: "Daily standup meeting",
                            start: {
                                dateTime: "2024-03-15T09:00:00",
                                timeZone: "America/New_York"
                            },
                            end: { dateTime: "2024-03-15T09:30:00", timeZone: "America/New_York" },
                            location: "Conference Room B",
                            attendees: [
                                {
                                    email: "alice@company.com",
                                    name: "Alice",
                                    type: "required",
                                    response: "accepted"
                                }
                            ],
                            organizer: { address: "organizer@company.com", name: "Organizer" },
                            isOnlineMeeting: false,
                            onlineMeetingUrl: null,
                            webLink:
                                "https://outlook.office365.com/owa/?itemid=AAMkAGI1AAAt9AHjAAA%3D",
                            isCancelled: false
                        },
                        {
                            id: "AAMkAGI1AAAt9AHkAAA=",
                            subject: "Project Review",
                            bodyPreview: "Quarterly review",
                            start: {
                                dateTime: "2024-03-20T14:00:00",
                                timeZone: "America/New_York"
                            },
                            end: { dateTime: "2024-03-20T15:00:00", timeZone: "America/New_York" },
                            location: "Board Room",
                            attendees: [],
                            organizer: { address: "pm@company.com", name: "Project Manager" },
                            isOnlineMeeting: true,
                            onlineMeetingUrl: "https://teams.microsoft.com/l/meetup-join/xyz",
                            webLink:
                                "https://outlook.office365.com/owa/?itemid=AAMkAGI1AAAt9AHkAAA%3D",
                            isCancelled: false
                        }
                    ],
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_date_range",
                description: "Invalid date format",
                input: {
                    startDateTime: "invalid-date",
                    endDateTime: "2024-03-31"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid date format. Use ISO 8601 format.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    startDateTime: "2024-03-01T00:00:00",
                    endDateTime: "2024-03-31T23:59:59"
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
        operationId: "listMailFolders",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "list_folders",
                description: "List all mail folders",
                input: {},
                expectedOutput: {
                    folders: [
                        {
                            id: "AAMkAGI1AABf0GEAAAA=",
                            displayName: "Inbox",
                            totalItemCount: 156,
                            unreadItemCount: 12
                        },
                        {
                            id: "AAMkAGI1AABf0GFAAAA=",
                            displayName: "Drafts",
                            totalItemCount: 3,
                            unreadItemCount: 0
                        },
                        {
                            id: "AAMkAGI1AABf0GGAAAA=",
                            displayName: "Sent Items",
                            totalItemCount: 423,
                            unreadItemCount: 0
                        },
                        {
                            id: "AAMkAGI1AABf0GHAAAA=",
                            displayName: "Deleted Items",
                            totalItemCount: 45,
                            unreadItemCount: 0
                        },
                        {
                            id: "AAMkAGI1AABf0GIAAAA=",
                            displayName: "Junk Email",
                            totalItemCount: 8,
                            unreadItemCount: 8
                        },
                        {
                            id: "AAMkAGI1AABf0GJAAAA=",
                            displayName: "Archive",
                            totalItemCount: 1250,
                            unreadItemCount: 0
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Not authorized to access mail folders",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Access denied. Required scope: Mail.Read",
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
        operationId: "listMessages",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "list_inbox_messages",
                description: "List messages from inbox",
                input: {
                    top: 10
                },
                expectedOutput: {
                    messages: [
                        {
                            id: "AAMkAGI1AAAoZCfHAAA=",
                            subject: "Q4 Budget Review",
                            bodyPreview: "Please find attached the Q4 budget proposal...",
                            from: { address: "finance@company.com", name: "Finance Team" },
                            toRecipients: [{ address: "user@company.com", name: "User" }],
                            receivedDateTime: "2024-03-14T14:30:00Z",
                            isRead: true,
                            isDraft: false,
                            importance: "high",
                            hasAttachments: true
                        },
                        {
                            id: "AAMkAGI1AAAoZCfIAAA=",
                            subject: "Weekly Newsletter",
                            bodyPreview: "This week's updates and announcements...",
                            from: { address: "newsletter@company.com", name: "Company News" },
                            toRecipients: [{ address: "all@company.com", name: "All Employees" }],
                            receivedDateTime: "2024-03-14T10:00:00Z",
                            isRead: false,
                            isDraft: false,
                            importance: "normal",
                            hasAttachments: false
                        }
                    ],
                    hasMore: true
                }
            },
            {
                name: "list_unread_messages",
                description: "List only unread messages",
                input: {
                    filter: "isRead eq false",
                    top: 5
                },
                expectedOutput: {
                    messages: [
                        {
                            id: "AAMkAGI1AAAoZCfIAAA=",
                            subject: "Weekly Newsletter",
                            bodyPreview: "This week's updates and announcements...",
                            from: { address: "newsletter@company.com", name: "Company News" },
                            toRecipients: [{ address: "all@company.com", name: "All Employees" }],
                            receivedDateTime: "2024-03-14T10:00:00Z",
                            isRead: false,
                            isDraft: false,
                            importance: "normal",
                            hasAttachments: false
                        }
                    ],
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "folder_not_found",
                description: "Mail folder does not exist",
                input: {
                    folderId: "nonexistent-folder"
                },
                expectedError: {
                    type: "not_found",
                    message: "Mail folder not found",
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
        operationId: "markAsRead",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "mark_as_read",
                description: "Mark a message as read",
                input: {
                    messageId: "AAMkAGI1AAAoZCfHAAA=",
                    isRead: true
                },
                expectedOutput: {
                    id: "AAMkAGI1AAAoZCfHAAA=",
                    isRead: true
                }
            },
            {
                name: "mark_as_unread",
                description: "Mark a message as unread",
                input: {
                    messageId: "AAMkAGI1AAAoZCfHAAA=",
                    isRead: false
                },
                expectedOutput: {
                    id: "AAMkAGI1AAAoZCfHAAA=",
                    isRead: false
                }
            }
        ],
        errorCases: [
            {
                name: "message_not_found",
                description: "Message does not exist",
                input: {
                    messageId: "nonexistent-message-id",
                    isRead: true
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
                    messageId: "AAMkAGI1AAAoZCfHAAA=",
                    isRead: true
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
        operationId: "moveMessage",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "move_to_archive",
                description: "Move message to archive folder",
                input: {
                    messageId: "AAMkAGI1AAAoZCfHAAA=",
                    destinationFolderId: "AAMkAGI1AABf0GJAAAA="
                },
                expectedOutput: {
                    id: "AAMkAGI1AAAoZCfHAAA=",
                    parentFolderId: "AAMkAGI1AABf0GJAAAA="
                }
            }
        ],
        errorCases: [
            {
                name: "message_not_found",
                description: "Message does not exist",
                input: {
                    messageId: "nonexistent-message-id",
                    destinationFolderId: "AAMkAGI1AABf0GJAAAA="
                },
                expectedError: {
                    type: "not_found",
                    message: "Message not found",
                    retryable: false
                }
            },
            {
                name: "folder_not_found",
                description: "Destination folder does not exist",
                input: {
                    messageId: "AAMkAGI1AAAoZCfHAAA=",
                    destinationFolderId: "nonexistent-folder"
                },
                expectedError: {
                    type: "not_found",
                    message: "Destination folder not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "replyToMessage",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "reply_to_message",
                description: "Reply to an email message",
                input: {
                    messageId: "AAMkAGI1AAAoZCfHAAA=",
                    comment: "Thank you for the update. I will review and get back to you."
                },
                expectedOutput: {
                    success: true,
                    message: "Reply sent successfully"
                }
            },
            {
                name: "reply_all",
                description: "Reply all to an email message",
                input: {
                    messageId: "AAMkAGI1AAAoZCfHAAA=",
                    comment: "Thanks everyone, acknowledged.",
                    replyAll: true
                },
                expectedOutput: {
                    success: true,
                    message: "Reply sent successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "message_not_found",
                description: "Original message does not exist",
                input: {
                    messageId: "nonexistent-message-id",
                    comment: "Reply text"
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
                    messageId: "AAMkAGI1AAAoZCfHAAA=",
                    comment: "Reply text"
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
        operationId: "respondToEvent",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "accept_event",
                description: "Accept an event invitation",
                input: {
                    eventId: "AAMkAGI1AAAt9AHjAAA=",
                    response: "accept",
                    comment: "Looking forward to it!"
                },
                expectedOutput: {
                    success: true,
                    response: "accepted"
                }
            },
            {
                name: "tentatively_accept",
                description: "Tentatively accept an event",
                input: {
                    eventId: "AAMkAGI1AAAt9AHjAAA=",
                    response: "tentativelyAccept"
                },
                expectedOutput: {
                    success: true,
                    response: "tentativelyAccepted"
                }
            },
            {
                name: "decline_event",
                description: "Decline an event invitation",
                input: {
                    eventId: "AAMkAGI1AAAt9AHjAAA=",
                    response: "decline",
                    comment: "I have a conflict at this time."
                },
                expectedOutput: {
                    success: true,
                    response: "declined"
                }
            }
        ],
        errorCases: [
            {
                name: "event_not_found",
                description: "Event does not exist",
                input: {
                    eventId: "nonexistent-event-id",
                    response: "accept"
                },
                expectedError: {
                    type: "not_found",
                    message: "Event not found",
                    retryable: false
                }
            },
            {
                name: "already_responded",
                description: "Already responded to this event",
                input: {
                    eventId: "AAMkAGI1AAAt9AHjAAA=",
                    response: "accept"
                },
                expectedError: {
                    type: "validation",
                    message: "You have already responded to this event",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "sendMail",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "simple_email",
                description: "Send a simple text email",
                input: {
                    to: ["recipient@example.com"],
                    subject: "Hello from FlowMaestro",
                    body: "This is a test email sent via the Outlook integration.",
                    bodyType: "text"
                },
                expectedOutput: {
                    message: "Email sent successfully",
                    recipients: ["recipient@example.com"],
                    subject: "Hello from FlowMaestro"
                }
            },
            {
                name: "html_email_with_cc",
                description: "Send HTML email with CC recipients",
                input: {
                    to: ["primary@example.com"],
                    cc: ["cc1@example.com", "cc2@example.com"],
                    subject: "Project Update",
                    body: "<h1>Project Status</h1><p>Everything is on track.</p>",
                    bodyType: "html",
                    importance: "high"
                },
                expectedOutput: {
                    message: "Email sent successfully",
                    recipients: ["primary@example.com"],
                    subject: "Project Update"
                }
            },
            {
                name: "email_with_bcc",
                description: "Send email with BCC recipients",
                input: {
                    to: ["recipient@example.com"],
                    bcc: ["hidden@example.com"],
                    subject: "Confidential Information",
                    body: "This message contains sensitive information."
                },
                expectedOutput: {
                    message: "Email sent successfully",
                    recipients: ["recipient@example.com"],
                    subject: "Confidential Information"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_recipient",
                description: "Invalid email address format",
                input: {
                    to: ["not-an-email"],
                    subject: "Test",
                    body: "Test body"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email address: not-an-email",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Sending rate limit exceeded",
                input: {
                    to: ["recipient@example.com"],
                    subject: "Test",
                    body: "Test body"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Sending rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateEvent",
        provider: "microsoft-outlook",
        validCases: [
            {
                name: "update_event_time",
                description: "Update event start and end time",
                input: {
                    eventId: "AAMkAGI1AAAt9AHjAAA=",
                    start: "2024-03-15T10:00:00",
                    end: "2024-03-15T11:00:00"
                },
                expectedOutput: {
                    id: "AAMkAGI1AAAt9AHjAAA=",
                    subject: "Team Standup",
                    start: { dateTime: "2024-03-15T10:00:00", timeZone: "America/New_York" },
                    end: { dateTime: "2024-03-15T11:00:00", timeZone: "America/New_York" },
                    location: "Conference Room B",
                    isOnlineMeeting: false,
                    webLink: "https://outlook.office365.com/owa/?itemid=AAMkAGI1AAAt9AHjAAA%3D"
                }
            },
            {
                name: "update_event_subject",
                description: "Update event subject and location",
                input: {
                    eventId: "AAMkAGI1AAAt9AHjAAA=",
                    subject: "Updated Team Standup",
                    location: "Virtual - Teams"
                },
                expectedOutput: {
                    id: "AAMkAGI1AAAt9AHjAAA=",
                    subject: "Updated Team Standup",
                    start: { dateTime: "2024-03-15T09:00:00", timeZone: "America/New_York" },
                    end: { dateTime: "2024-03-15T09:30:00", timeZone: "America/New_York" },
                    location: "Virtual - Teams",
                    isOnlineMeeting: false,
                    webLink: "https://outlook.office365.com/owa/?itemid=AAMkAGI1AAAt9AHjAAA%3D"
                }
            }
        ],
        errorCases: [
            {
                name: "event_not_found",
                description: "Event does not exist",
                input: {
                    eventId: "nonexistent-event-id",
                    subject: "Updated Subject"
                },
                expectedError: {
                    type: "not_found",
                    message: "Event not found",
                    retryable: false
                }
            },
            {
                name: "no_edit_permission",
                description: "No permission to edit event",
                input: {
                    eventId: "AAMkAGI1BBBt9AHjAAA=",
                    subject: "Trying to update"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to edit this event",
                    retryable: false
                }
            }
        ]
    }
];
