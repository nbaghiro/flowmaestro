/**
 * RingCentral Provider Test Fixtures
 *
 * Based on RingCentral API documentation for unified communications
 */

import type { TestFixture } from "../../../sandbox";

/**
 * Sample messages for filterableData
 */
const sampleMessages = [
    {
        id: "msg-001",
        type: "SMS",
        direction: "Outbound",
        status: "Delivered",
        readStatus: "Read",
        from: "+14155551234",
        to: ["+14155555678"],
        subject: null,
        createdAt: "2024-01-15T10:30:00Z",
        conversationId: "conv-001"
    },
    {
        id: "msg-002",
        type: "SMS",
        direction: "Inbound",
        status: "Received",
        readStatus: "Unread",
        from: "+14155555678",
        to: ["+14155551234"],
        subject: null,
        createdAt: "2024-01-15T10:35:00Z",
        conversationId: "conv-001"
    },
    {
        id: "msg-003",
        type: "MMS",
        direction: "Outbound",
        status: "Delivered",
        readStatus: "Read",
        from: "+14155551234",
        to: ["+14155559999"],
        subject: null,
        createdAt: "2024-01-16T14:00:00Z",
        conversationId: "conv-002"
    }
];

/**
 * Sample call logs for filterableData
 */
const sampleCallLogs = [
    {
        id: "call-001",
        sessionId: "sess-001",
        startTime: "2024-01-15T09:00:00Z",
        duration: 180,
        type: "Voice",
        direction: "Inbound",
        action: "Phone Call",
        result: "Call Accepted",
        from: { phoneNumber: "+14155555678", name: "John Doe", location: "San Francisco, CA" },
        to: { phoneNumber: "+14155551234", name: null, location: null },
        hasRecording: true
    },
    {
        id: "call-002",
        sessionId: "sess-002",
        startTime: "2024-01-15T14:30:00Z",
        duration: 45,
        type: "Voice",
        direction: "Outbound",
        action: "RingOut Web",
        result: "Call Connected",
        from: { phoneNumber: "+14155551234", name: null, location: null },
        to: { phoneNumber: "+14155559999", name: "Client Office", location: "New York, NY" },
        hasRecording: false
    },
    {
        id: "call-003",
        sessionId: "sess-003",
        startTime: "2024-01-16T11:00:00Z",
        duration: null,
        type: "Voice",
        direction: "Inbound",
        action: "Phone Call",
        result: "Missed",
        from: { phoneNumber: "+14155558888", name: null, location: "Los Angeles, CA" },
        to: { phoneNumber: "+14155551234", name: null, location: null },
        hasRecording: false
    }
];

/**
 * Sample chats for filterableData
 */
const sampleChats = [
    {
        id: "chat-001",
        type: "Team",
        name: "Engineering",
        description: "Engineering team discussions",
        status: "Active",
        createdAt: "2024-01-01T00:00:00Z",
        lastModifiedAt: "2024-01-16T12:00:00Z",
        memberCount: 15
    },
    {
        id: "chat-002",
        type: "Direct",
        name: null,
        description: null,
        status: "Active",
        createdAt: "2024-01-10T09:00:00Z",
        lastModifiedAt: "2024-01-15T16:00:00Z",
        memberCount: 2
    },
    {
        id: "chat-003",
        type: "Group",
        name: "Project Alpha",
        description: "Project Alpha planning",
        status: "Active",
        createdAt: "2024-01-05T10:00:00Z",
        lastModifiedAt: "2024-01-16T09:00:00Z",
        memberCount: 5
    }
];

export const ringcentralFixtures: TestFixture[] = [
    {
        operationId: "sendSms",
        provider: "ringcentral",
        validCases: [
            {
                name: "send_simple_sms",
                description: "Send a simple SMS to one recipient",
                input: {
                    from: "+14155551234",
                    to: ["+14155555678"],
                    text: "Hello! This is a test message."
                },
                expectedOutput: {
                    messageId: "msg-new-001",
                    type: "SMS",
                    direction: "Outbound",
                    status: "Queued",
                    from: "+14155551234",
                    to: ["+14155555678"],
                    createdAt: "2024-01-16T10:00:00Z"
                }
            },
            {
                name: "send_sms_multiple_recipients",
                description: "Send SMS to multiple recipients",
                input: {
                    from: "+14155551234",
                    to: ["+14155555678", "+14155559999"],
                    text: "Group notification: Meeting in 10 minutes"
                },
                expectedOutput: {
                    messageId: "msg-new-002",
                    type: "SMS",
                    direction: "Outbound",
                    status: "Queued",
                    from: "+14155551234",
                    to: ["+14155555678", "+14155559999"]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_from_number",
                description: "From number is not a valid RingCentral number",
                input: {
                    from: "+10000000000",
                    to: ["+14155555678"],
                    text: "Test"
                },
                expectedError: {
                    type: "validation",
                    message: "The from phone number is not valid",
                    retryable: false
                }
            },
            {
                name: "text_too_long",
                description: "SMS text exceeds maximum length",
                input: {
                    from: "+14155551234",
                    to: ["+14155555678"],
                    text: "x".repeat(1001)
                },
                expectedError: {
                    type: "validation",
                    message: "String must contain at most 1000 character(s)",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "sendMms",
        provider: "ringcentral",
        validCases: [
            {
                name: "send_mms_with_image",
                description: "Send MMS with an image attachment",
                input: {
                    from: "+14155551234",
                    to: ["+14155555678"],
                    text: "Check out this photo!",
                    attachments: [
                        {
                            fileName: "photo.jpg",
                            contentType: "image/jpeg",
                            content: "base64encodedcontent..."
                        }
                    ]
                },
                expectedOutput: {
                    messageId: "msg-mms-001",
                    type: "MMS",
                    direction: "Outbound",
                    status: "Queued",
                    attachmentCount: 1
                }
            }
        ],
        errorCases: [
            {
                name: "no_attachments",
                description: "MMS requires at least one attachment",
                input: {
                    from: "+14155551234",
                    to: ["+14155555678"],
                    attachments: []
                },
                expectedError: {
                    type: "validation",
                    message: "Array must contain at least 1 element(s)",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listMessages",
        provider: "ringcentral",
        filterableData: {
            records: sampleMessages,
            recordsField: "messages",
            offsetField: "page",
            defaultPageSize: 100,
            maxPageSize: 1000,
            pageSizeParam: "perPage",
            filterConfig: {
                type: "generic",
                filterableFields: ["type", "direction", "readStatus"]
            }
        },
        validCases: [
            {
                name: "list_all_messages",
                description: "List all messages",
                input: {}
            },
            {
                name: "list_sms_only",
                description: "List only SMS messages",
                input: {
                    messageType: "SMS"
                }
            },
            {
                name: "list_inbound_messages",
                description: "List inbound messages",
                input: {
                    direction: "Inbound"
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "makeCall",
        provider: "ringcentral",
        validCases: [
            {
                name: "make_ringout_call",
                description: "Initiate a RingOut call",
                input: {
                    from: "+14155551234",
                    to: "+14155555678"
                },
                expectedOutput: {
                    ringOutId: "ringout-001",
                    callStatus: "InProgress",
                    callerStatus: "InProgress",
                    calleeStatus: "InProgress"
                }
            },
            {
                name: "make_call_with_caller_id",
                description: "Make call with custom caller ID",
                input: {
                    from: "+14155551234",
                    to: "+14155555678",
                    callerId: "+14155551234",
                    playPrompt: false
                },
                expectedOutput: {
                    ringOutId: "ringout-002",
                    callStatus: "InProgress"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_destination",
                description: "Destination number is invalid",
                input: {
                    from: "+14155551234",
                    to: "invalid"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid destination phone number",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "cancelCall",
        provider: "ringcentral",
        validCases: [
            {
                name: "cancel_ringout",
                description: "Cancel an in-progress RingOut call",
                input: {
                    ringOutId: "ringout-001"
                },
                expectedOutput: {
                    cancelled: true,
                    ringOutId: "ringout-001"
                }
            }
        ],
        errorCases: [
            {
                name: "call_not_found",
                description: "RingOut call does not exist",
                input: {
                    ringOutId: "ringout-nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in RingCentral",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getCallLogs",
        provider: "ringcentral",
        filterableData: {
            records: sampleCallLogs,
            recordsField: "callLogs",
            offsetField: "page",
            defaultPageSize: 100,
            maxPageSize: 1000,
            pageSizeParam: "perPage",
            filterConfig: {
                type: "generic",
                filterableFields: ["type", "direction", "result"]
            }
        },
        validCases: [
            {
                name: "get_all_call_logs",
                description: "Get all call logs",
                input: {}
            },
            {
                name: "get_inbound_calls",
                description: "Get only inbound calls",
                input: {
                    direction: "Inbound"
                }
            },
            {
                name: "get_detailed_logs",
                description: "Get call logs with detailed view",
                input: {
                    view: "Detailed"
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "listVoicemails",
        provider: "ringcentral",
        validCases: [
            {
                name: "list_voicemails",
                description: "List all voicemail messages",
                input: {},
                expectedOutput: {
                    voicemails: [
                        {
                            id: "vm-001",
                            direction: "Inbound",
                            readStatus: "Unread",
                            from: "+14155555678",
                            fromName: "John Doe",
                            createdAt: "2024-01-15T10:00:00Z",
                            hasAttachments: true
                        }
                    ],
                    pagination: {
                        page: 1,
                        perPage: 100,
                        totalPages: 1,
                        totalElements: 1,
                        hasNext: false
                    }
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "sendTeamMessage",
        provider: "ringcentral",
        validCases: [
            {
                name: "send_team_message",
                description: "Send a message to a team chat",
                input: {
                    chatId: "chat-001",
                    text: "Hello team! Quick update on the project."
                },
                expectedOutput: {
                    messageId: "team-msg-001",
                    groupId: "chat-001",
                    type: "TextMessage",
                    text: "Hello team! Quick update on the project.",
                    createdAt: "2024-01-16T12:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "chat_not_found",
                description: "Chat does not exist",
                input: {
                    chatId: "chat-nonexistent",
                    text: "Test message"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in RingCentral",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listChats",
        provider: "ringcentral",
        filterableData: {
            records: sampleChats,
            recordsField: "chats",
            offsetField: "nextToken",
            defaultPageSize: 100,
            maxPageSize: 250,
            pageSizeParam: "recordCount",
            filterConfig: {
                type: "generic",
                filterableFields: ["type", "status"]
            }
        },
        validCases: [
            {
                name: "list_all_chats",
                description: "List all team chats",
                input: {}
            },
            {
                name: "list_team_chats",
                description: "List only team chats",
                input: {
                    type: ["Team"]
                }
            }
        ],
        errorCases: []
    },
    {
        operationId: "scheduleMeeting",
        provider: "ringcentral",
        validCases: [
            {
                name: "schedule_meeting",
                description: "Schedule a video meeting",
                input: {
                    topic: "Project Kickoff Meeting",
                    startTime: "2024-01-20T14:00:00Z",
                    durationInMinutes: 60,
                    timeZone: "America/New_York"
                },
                expectedOutput: {
                    meetingId: "meeting-001",
                    uuid: "uuid-001",
                    topic: "Project Kickoff Meeting",
                    startTime: "2024-01-20T14:00:00Z",
                    duration: 60,
                    status: "NotStarted",
                    joinUrl: "https://v.ringcentral.com/join/123456789"
                }
            },
            {
                name: "schedule_instant_meeting",
                description: "Create an instant meeting",
                input: {
                    topic: "Quick Sync",
                    meetingType: "Instant"
                },
                expectedOutput: {
                    meetingId: "meeting-002",
                    topic: "Quick Sync",
                    status: "NotStarted"
                }
            },
            {
                name: "schedule_meeting_with_options",
                description: "Schedule meeting with waiting room and mute",
                input: {
                    topic: "All Hands Meeting",
                    startTime: "2024-01-25T15:00:00Z",
                    durationInMinutes: 90,
                    enableWaitingRoom: true,
                    muteParticipantsOnEntry: true,
                    password: "secure123"
                },
                expectedOutput: {
                    meetingId: "meeting-003",
                    topic: "All Hands Meeting",
                    password: "secure123"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_topic",
                description: "Meeting topic is required",
                input: {
                    topic: "",
                    startTime: "2024-01-20T14:00:00Z"
                },
                expectedError: {
                    type: "validation",
                    message: "String must contain at least 1 character(s)",
                    retryable: false
                }
            }
        ]
    }
];
