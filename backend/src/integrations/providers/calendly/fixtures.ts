/**
 * Calendly Provider Test Fixtures
 *
 * Based on official Calendly API documentation:
 * - Users: https://developer.calendly.com/api-docs/e2f95eeb44a5e-get-current-user
 * - Event Types: https://developer.calendly.com/api-docs/25a4ece6ce2e7-list-event-types
 * - Scheduled Events: https://developer.calendly.com/api-docs/bf9b27e14ca4c-list-events
 * - Invitees: https://developer.calendly.com/api-docs/6dac6e49ab36f-list-event-invitees
 * - Availability: https://developer.calendly.com/api-docs/e657e5e74cc9f-list-available-times
 */

import type { TestFixture } from "../../sandbox";

/**
 * Sample scheduled events for filterableData
 */
const sampleScheduledEvents = [
    {
        uri: "https://api.calendly.com/scheduled_events/evt_abc123def456",
        name: "30 Minute Meeting",
        status: "active",
        startTime: "2024-01-15T10:00:00.000Z",
        endTime: "2024-01-15T10:30:00.000Z",
        eventType: "https://api.calendly.com/event_types/EVTYPE001ABC",
        location: {
            type: "zoom",
            joinUrl: "https://zoom.us/j/123456789",
            status: "pushed"
        },
        inviteesCounter: {
            total: 1,
            active: 1,
            limit: 1
        },
        eventMemberships: [{ user: "https://api.calendly.com/users/USER001ABC" }],
        eventGuests: [],
        createdAt: "2024-01-10T14:30:00.000Z",
        updatedAt: "2024-01-10T14:30:00.000Z",
        _status: "active",
        _user: "https://api.calendly.com/users/USER001ABC"
    },
    {
        uri: "https://api.calendly.com/scheduled_events/evt_def456ghi789",
        name: "Product Demo",
        status: "active",
        startTime: "2024-01-16T14:00:00.000Z",
        endTime: "2024-01-16T15:00:00.000Z",
        eventType: "https://api.calendly.com/event_types/EVTYPE002DEF",
        location: {
            type: "google_conference",
            joinUrl: "https://meet.google.com/abc-defg-hij",
            status: "pushed"
        },
        inviteesCounter: {
            total: 2,
            active: 2,
            limit: 5
        },
        eventMemberships: [{ user: "https://api.calendly.com/users/USER001ABC" }],
        eventGuests: [
            {
                email: "guest@partner.com",
                createdAt: "2024-01-12T09:00:00.000Z",
                updatedAt: "2024-01-12T09:00:00.000Z"
            }
        ],
        createdAt: "2024-01-12T09:00:00.000Z",
        updatedAt: "2024-01-12T09:00:00.000Z",
        _status: "active",
        _user: "https://api.calendly.com/users/USER001ABC"
    },
    {
        uri: "https://api.calendly.com/scheduled_events/evt_ghi789jkl012",
        name: "Discovery Call",
        status: "active",
        startTime: "2024-01-17T16:00:00.000Z",
        endTime: "2024-01-17T16:30:00.000Z",
        eventType: "https://api.calendly.com/event_types/EVTYPE003GHI",
        location: {
            type: "physical",
            location: "123 Main St, Suite 100, San Francisco, CA 94102"
        },
        inviteesCounter: {
            total: 1,
            active: 1,
            limit: 1
        },
        eventMemberships: [{ user: "https://api.calendly.com/users/USER001ABC" }],
        eventGuests: [],
        createdAt: "2024-01-13T11:15:00.000Z",
        updatedAt: "2024-01-13T11:15:00.000Z",
        _status: "active",
        _user: "https://api.calendly.com/users/USER001ABC"
    },
    {
        uri: "https://api.calendly.com/scheduled_events/evt_jkl012mno345",
        name: "15 Minute Check-in",
        status: "canceled",
        startTime: "2024-01-14T09:00:00.000Z",
        endTime: "2024-01-14T09:15:00.000Z",
        eventType: "https://api.calendly.com/event_types/EVTYPE004JKL",
        location: {
            type: "zoom",
            joinUrl: "https://zoom.us/j/987654321",
            status: "pushed"
        },
        inviteesCounter: {
            total: 1,
            active: 0,
            limit: 1
        },
        eventMemberships: [{ user: "https://api.calendly.com/users/USER001ABC" }],
        eventGuests: [],
        cancellation: {
            canceledBy: "Sarah Johnson",
            reason: "Schedule conflict - will reschedule",
            cancelerType: "invitee",
            createdAt: "2024-01-13T18:00:00.000Z"
        },
        createdAt: "2024-01-08T10:00:00.000Z",
        updatedAt: "2024-01-13T18:00:00.000Z",
        _status: "canceled",
        _user: "https://api.calendly.com/users/USER001ABC"
    },
    {
        uri: "https://api.calendly.com/scheduled_events/evt_mno345pqr678",
        name: "Team Sync",
        status: "active",
        startTime: "2024-01-18T11:00:00.000Z",
        endTime: "2024-01-18T11:30:00.000Z",
        eventType: "https://api.calendly.com/event_types/EVTYPE005MNO",
        location: {
            type: "microsoft_teams_conference",
            joinUrl: "https://teams.microsoft.com/l/meetup-join/abc123",
            status: "pushed"
        },
        inviteesCounter: {
            total: 3,
            active: 3,
            limit: 10
        },
        eventMemberships: [
            { user: "https://api.calendly.com/users/USER001ABC" },
            { user: "https://api.calendly.com/users/USER002DEF" }
        ],
        eventGuests: [],
        createdAt: "2024-01-14T08:30:00.000Z",
        updatedAt: "2024-01-14T08:30:00.000Z",
        _status: "active",
        _user: "https://api.calendly.com/users/USER001ABC"
    }
];

/**
 * Sample event types for filterableData
 */
const sampleEventTypes = [
    {
        uri: "https://api.calendly.com/event_types/EVTYPE001ABC",
        name: "30 Minute Meeting",
        active: true,
        slug: "30-minute-meeting",
        schedulingUrl: "https://calendly.com/alex-chen/30-minute-meeting",
        duration: 30,
        kind: "solo",
        poolingType: null,
        type: "StandardEventType",
        color: "#0099CC",
        description: "A quick 30-minute call to discuss your needs",
        profile: {
            type: "User",
            name: "Alex Chen",
            owner: "https://api.calendly.com/users/USER001ABC"
        },
        createdAt: "2023-06-15T10:00:00.000Z",
        updatedAt: "2024-01-05T14:30:00.000Z",
        _active: true,
        _user: "https://api.calendly.com/users/USER001ABC"
    },
    {
        uri: "https://api.calendly.com/event_types/EVTYPE002DEF",
        name: "Product Demo",
        active: true,
        slug: "product-demo",
        schedulingUrl: "https://calendly.com/alex-chen/product-demo",
        duration: 60,
        kind: "solo",
        poolingType: null,
        type: "StandardEventType",
        color: "#FF6B35",
        description: "In-depth product demonstration and Q&A session",
        profile: {
            type: "User",
            name: "Alex Chen",
            owner: "https://api.calendly.com/users/USER001ABC"
        },
        createdAt: "2023-06-15T10:30:00.000Z",
        updatedAt: "2024-01-02T09:00:00.000Z",
        _active: true,
        _user: "https://api.calendly.com/users/USER001ABC"
    },
    {
        uri: "https://api.calendly.com/event_types/EVTYPE003GHI",
        name: "Discovery Call",
        active: true,
        slug: "discovery-call",
        schedulingUrl: "https://calendly.com/alex-chen/discovery-call",
        duration: 30,
        kind: "solo",
        poolingType: null,
        type: "StandardEventType",
        color: "#6B5B95",
        description: "Initial conversation to understand your requirements",
        profile: {
            type: "User",
            name: "Alex Chen",
            owner: "https://api.calendly.com/users/USER001ABC"
        },
        createdAt: "2023-07-20T11:00:00.000Z",
        updatedAt: "2023-12-15T16:00:00.000Z",
        _active: true,
        _user: "https://api.calendly.com/users/USER001ABC"
    },
    {
        uri: "https://api.calendly.com/event_types/EVTYPE004JKL",
        name: "15 Minute Check-in",
        active: true,
        slug: "15-minute-checkin",
        schedulingUrl: "https://calendly.com/alex-chen/15-minute-checkin",
        duration: 15,
        kind: "solo",
        poolingType: null,
        type: "StandardEventType",
        color: "#88B04B",
        description: "Quick follow-up or status check",
        profile: {
            type: "User",
            name: "Alex Chen",
            owner: "https://api.calendly.com/users/USER001ABC"
        },
        createdAt: "2023-08-01T09:00:00.000Z",
        updatedAt: "2023-11-30T12:00:00.000Z",
        _active: true,
        _user: "https://api.calendly.com/users/USER001ABC"
    },
    {
        uri: "https://api.calendly.com/event_types/EVTYPE005MNO",
        name: "Team Sync",
        active: true,
        slug: "team-sync",
        schedulingUrl: "https://calendly.com/alex-chen/team-sync",
        duration: 30,
        kind: "group",
        poolingType: "round_robin",
        type: "StandardEventType",
        color: "#F7CAC9",
        description: "Weekly team synchronization meeting",
        profile: {
            type: "Team",
            name: "Product Team",
            owner: "https://api.calendly.com/organizations/ORG001ABC"
        },
        createdAt: "2023-09-10T14:00:00.000Z",
        updatedAt: "2024-01-08T10:00:00.000Z",
        _active: true,
        _user: "https://api.calendly.com/users/USER001ABC"
    },
    {
        uri: "https://api.calendly.com/event_types/EVTYPE006PQR",
        name: "Old Consultation (Inactive)",
        active: false,
        slug: "old-consultation",
        schedulingUrl: "https://calendly.com/alex-chen/old-consultation",
        duration: 45,
        kind: "solo",
        poolingType: null,
        type: "StandardEventType",
        color: "#92A8D1",
        description: "Archived event type - no longer in use",
        profile: {
            type: "User",
            name: "Alex Chen",
            owner: "https://api.calendly.com/users/USER001ABC"
        },
        createdAt: "2022-12-01T10:00:00.000Z",
        updatedAt: "2023-06-01T08:00:00.000Z",
        _active: false,
        _user: "https://api.calendly.com/users/USER001ABC"
    }
];

/**
 * Sample invitees for filterableData
 */
const sampleInvitees = [
    {
        uri: "https://api.calendly.com/scheduled_events/evt_abc123def456/invitees/inv_001",
        email: "sarah.johnson@techcorp.com",
        name: "Sarah Johnson",
        status: "active",
        questionsAndAnswers: [
            {
                question: "What topics would you like to discuss?",
                answer: "Product pricing and enterprise features",
                position: 0
            },
            {
                question: "How did you hear about us?",
                answer: "LinkedIn advertisement",
                position: 1
            }
        ],
        timezone: "America/New_York",
        tracking: {
            utmCampaign: "q1-outreach",
            utmSource: "linkedin",
            utmMedium: "paid",
            utmContent: "enterprise-ad",
            utmTerm: "scheduling software",
            salesforceUuid: null
        },
        textReminderNumber: "+1-555-0123",
        rescheduled: false,
        oldInvitee: null,
        newInvitee: null,
        cancelUrl: "https://calendly.com/cancellations/inv_001",
        rescheduleUrl: "https://calendly.com/reschedulings/inv_001",
        createdAt: "2024-01-10T14:30:00.000Z",
        updatedAt: "2024-01-10T14:30:00.000Z",
        _eventUuid: "evt_abc123def456",
        _status: "active"
    },
    {
        uri: "https://api.calendly.com/scheduled_events/evt_def456ghi789/invitees/inv_002",
        email: "michael.brown@startup.io",
        name: "Michael Brown",
        status: "active",
        questionsAndAnswers: [
            {
                question: "Company size?",
                answer: "50-100 employees",
                position: 0
            }
        ],
        timezone: "America/Los_Angeles",
        tracking: {
            utmCampaign: null,
            utmSource: "direct",
            utmMedium: null,
            utmContent: null,
            utmTerm: null,
            salesforceUuid: "SF-00001234"
        },
        textReminderNumber: null,
        rescheduled: false,
        oldInvitee: null,
        newInvitee: null,
        cancelUrl: "https://calendly.com/cancellations/inv_002",
        rescheduleUrl: "https://calendly.com/reschedulings/inv_002",
        createdAt: "2024-01-12T09:00:00.000Z",
        updatedAt: "2024-01-12T09:00:00.000Z",
        _eventUuid: "evt_def456ghi789",
        _status: "active"
    },
    {
        uri: "https://api.calendly.com/scheduled_events/evt_def456ghi789/invitees/inv_003",
        email: "jennifer.lee@partner.com",
        name: "Jennifer Lee",
        status: "active",
        questionsAndAnswers: [],
        timezone: "America/Chicago",
        tracking: {
            utmCampaign: null,
            utmSource: null,
            utmMedium: null,
            utmContent: null,
            utmTerm: null,
            salesforceUuid: null
        },
        textReminderNumber: "+1-555-0456",
        rescheduled: true,
        oldInvitee: "https://api.calendly.com/scheduled_events/evt_old123/invitees/inv_old",
        newInvitee: null,
        cancelUrl: "https://calendly.com/cancellations/inv_003",
        rescheduleUrl: "https://calendly.com/reschedulings/inv_003",
        createdAt: "2024-01-12T10:30:00.000Z",
        updatedAt: "2024-01-12T10:30:00.000Z",
        _eventUuid: "evt_def456ghi789",
        _status: "active"
    },
    {
        uri: "https://api.calendly.com/scheduled_events/evt_jkl012mno345/invitees/inv_004",
        email: "robert.wilson@enterprise.com",
        name: "Robert Wilson",
        status: "canceled",
        questionsAndAnswers: [
            {
                question: "What is your role?",
                answer: "VP of Engineering",
                position: 0
            }
        ],
        timezone: "Europe/London",
        tracking: {
            utmCampaign: "webinar-followup",
            utmSource: "email",
            utmMedium: "newsletter",
            utmContent: null,
            utmTerm: null,
            salesforceUuid: "SF-00005678"
        },
        textReminderNumber: null,
        rescheduled: false,
        oldInvitee: null,
        newInvitee: null,
        cancelUrl: "https://calendly.com/cancellations/inv_004",
        rescheduleUrl: "https://calendly.com/reschedulings/inv_004",
        cancellation: {
            canceledBy: "Robert Wilson",
            reason: "Schedule conflict - will reschedule",
            cancelerType: "invitee",
            createdAt: "2024-01-13T18:00:00.000Z"
        },
        createdAt: "2024-01-08T10:00:00.000Z",
        updatedAt: "2024-01-13T18:00:00.000Z",
        _eventUuid: "evt_jkl012mno345",
        _status: "canceled"
    }
];

export const calendlyFixtures: TestFixture[] = [
    // ==================== getCurrentUser ====================
    {
        operationId: "getCurrentUser",
        provider: "calendly",
        validCases: [
            {
                name: "get_current_user",
                description: "Get the authenticated user's profile information",
                input: {},
                expectedOutput: {
                    uri: "https://api.calendly.com/users/USER001ABC",
                    name: "Alex Chen",
                    slug: "alex-chen",
                    email: "alex.chen@company.com",
                    schedulingUrl: "https://calendly.com/alex-chen",
                    timezone: "America/Los_Angeles",
                    avatarUrl: "https://assets.calendly.com/avatars/user001.png",
                    organization: "https://api.calendly.com/organizations/ORG001ABC",
                    createdAt: "2023-01-15T08:00:00.000Z",
                    updatedAt: "2024-01-10T12:30:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Invalid or expired access token",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "The access token is invalid or has expired",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            }
        ]
    },

    // ==================== getEventType ====================
    {
        operationId: "getEventType",
        provider: "calendly",
        validCases: [
            {
                name: "get_event_type_30_min",
                description: "Get details of a 30-minute meeting event type",
                input: {
                    uuid: "EVTYPE001ABC"
                },
                expectedOutput: {
                    uri: "https://api.calendly.com/event_types/EVTYPE001ABC",
                    name: "30 Minute Meeting",
                    active: true,
                    slug: "30-minute-meeting",
                    schedulingUrl: "https://calendly.com/alex-chen/30-minute-meeting",
                    duration: 30,
                    kind: "solo",
                    poolingType: null,
                    type: "StandardEventType",
                    color: "#0099CC",
                    description: "A quick 30-minute call to discuss your needs",
                    descriptionHtml: "<p>A quick 30-minute call to discuss your needs</p>",
                    internalNote: "Standard intro call",
                    profile: {
                        type: "User",
                        name: "Alex Chen",
                        owner: "https://api.calendly.com/users/USER001ABC"
                    },
                    secret: false,
                    adminManaged: false,
                    customQuestions: [
                        {
                            name: "What topics would you like to discuss?",
                            type: "text",
                            position: 0,
                            enabled: true,
                            required: false,
                            answerChoices: [],
                            includeOther: false
                        },
                        {
                            name: "How did you hear about us?",
                            type: "select",
                            position: 1,
                            enabled: true,
                            required: true,
                            answerChoices: ["LinkedIn", "Google Search", "Referral", "Other"],
                            includeOther: true
                        }
                    ],
                    createdAt: "2023-06-15T10:00:00.000Z",
                    updatedAt: "2024-01-05T14:30:00.000Z"
                }
            },
            {
                name: "get_event_type_group",
                description: "Get details of a group/round-robin event type",
                input: {
                    uuid: "EVTYPE005MNO"
                },
                expectedOutput: {
                    uri: "https://api.calendly.com/event_types/EVTYPE005MNO",
                    name: "Team Sync",
                    active: true,
                    slug: "team-sync",
                    schedulingUrl: "https://calendly.com/alex-chen/team-sync",
                    duration: 30,
                    kind: "group",
                    poolingType: "round_robin",
                    type: "StandardEventType",
                    color: "#F7CAC9",
                    description: "Weekly team synchronization meeting",
                    descriptionHtml: "<p>Weekly team synchronization meeting</p>",
                    internalNote: null,
                    profile: {
                        type: "Team",
                        name: "Product Team",
                        owner: "https://api.calendly.com/organizations/ORG001ABC"
                    },
                    secret: false,
                    adminManaged: true,
                    customQuestions: [],
                    createdAt: "2023-09-10T14:00:00.000Z",
                    updatedAt: "2024-01-08T10:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "event_type_not_found",
                description: "Event type does not exist",
                input: {
                    uuid: "NONEXISTENT_EVENT_TYPE"
                },
                expectedError: {
                    type: "not_found",
                    message: "Event type not found",
                    retryable: false
                }
            },
            {
                name: "invalid_uuid_format",
                description: "Invalid UUID format provided",
                input: {
                    uuid: "invalid-format-!!!"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid event type UUID format",
                    retryable: false
                }
            }
        ]
    },

    // ==================== listEventTypes ====================
    {
        operationId: "listEventTypes",
        provider: "calendly",
        filterableData: {
            records: sampleEventTypes,
            recordsField: "eventTypes",
            offsetField: "nextPageToken",
            defaultPageSize: 20,
            maxPageSize: 100,
            pageSizeParam: "count",
            offsetParam: "pageToken",
            filterConfig: {
                type: "generic",
                filterableFields: ["_active", "_user"]
            }
        },
        validCases: [
            {
                name: "list_all_event_types",
                description: "List all event types for the authenticated user",
                input: {
                    user: "https://api.calendly.com/users/USER001ABC"
                }
            },
            {
                name: "list_active_event_types",
                description: "List only active event types",
                input: {
                    user: "https://api.calendly.com/users/USER001ABC",
                    active: true
                }
            },
            {
                name: "list_event_types_paginated",
                description: "List event types with pagination",
                input: {
                    user: "https://api.calendly.com/users/USER001ABC",
                    count: 2
                }
            },
            {
                name: "list_org_event_types",
                description: "List event types for an organization",
                input: {
                    organization: "https://api.calendly.com/organizations/ORG001ABC"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_user_or_org",
                description: "Neither user nor organization URI provided",
                input: {},
                expectedError: {
                    type: "validation",
                    message: "Either user or organization URI must be provided",
                    retryable: false
                }
            },
            {
                name: "user_not_found",
                description: "Specified user does not exist",
                input: {
                    user: "https://api.calendly.com/users/NONEXISTENT"
                },
                expectedError: {
                    type: "not_found",
                    message: "User not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    user: "https://api.calendly.com/users/USER001ABC"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            }
        ]
    },

    // ==================== getScheduledEvent ====================
    {
        operationId: "getScheduledEvent",
        provider: "calendly",
        validCases: [
            {
                name: "get_active_scheduled_event",
                description: "Get details of an active scheduled event",
                input: {
                    uuid: "evt_abc123def456"
                },
                expectedOutput: {
                    uri: "https://api.calendly.com/scheduled_events/evt_abc123def456",
                    name: "30 Minute Meeting",
                    status: "active",
                    startTime: "2024-01-15T10:00:00.000Z",
                    endTime: "2024-01-15T10:30:00.000Z",
                    eventType: "https://api.calendly.com/event_types/EVTYPE001ABC",
                    location: {
                        type: "zoom",
                        joinUrl: "https://zoom.us/j/123456789",
                        status: "pushed"
                    },
                    inviteesCounter: {
                        total: 1,
                        active: 1,
                        limit: 1
                    },
                    eventMemberships: [{ user: "https://api.calendly.com/users/USER001ABC" }],
                    eventGuests: [],
                    cancellation: null,
                    createdAt: "2024-01-10T14:30:00.000Z",
                    updatedAt: "2024-01-10T14:30:00.000Z"
                }
            },
            {
                name: "get_canceled_scheduled_event",
                description: "Get details of a canceled scheduled event",
                input: {
                    uuid: "evt_jkl012mno345"
                },
                expectedOutput: {
                    uri: "https://api.calendly.com/scheduled_events/evt_jkl012mno345",
                    name: "15 Minute Check-in",
                    status: "canceled",
                    startTime: "2024-01-14T09:00:00.000Z",
                    endTime: "2024-01-14T09:15:00.000Z",
                    eventType: "https://api.calendly.com/event_types/EVTYPE004JKL",
                    location: {
                        type: "zoom",
                        joinUrl: "https://zoom.us/j/987654321",
                        status: "pushed"
                    },
                    inviteesCounter: {
                        total: 1,
                        active: 0,
                        limit: 1
                    },
                    eventMemberships: [{ user: "https://api.calendly.com/users/USER001ABC" }],
                    eventGuests: [],
                    cancellation: {
                        canceledBy: "Sarah Johnson",
                        reason: "Schedule conflict - will reschedule",
                        cancelerType: "invitee",
                        createdAt: "2024-01-13T18:00:00.000Z"
                    },
                    createdAt: "2024-01-08T10:00:00.000Z",
                    updatedAt: "2024-01-13T18:00:00.000Z"
                }
            },
            {
                name: "get_event_with_guests",
                description: "Get scheduled event with additional guests",
                input: {
                    uuid: "evt_def456ghi789"
                },
                expectedOutput: {
                    uri: "https://api.calendly.com/scheduled_events/evt_def456ghi789",
                    name: "Product Demo",
                    status: "active",
                    startTime: "2024-01-16T14:00:00.000Z",
                    endTime: "2024-01-16T15:00:00.000Z",
                    eventType: "https://api.calendly.com/event_types/EVTYPE002DEF",
                    location: {
                        type: "google_conference",
                        joinUrl: "https://meet.google.com/abc-defg-hij",
                        status: "pushed"
                    },
                    inviteesCounter: {
                        total: 2,
                        active: 2,
                        limit: 5
                    },
                    eventMemberships: [{ user: "https://api.calendly.com/users/USER001ABC" }],
                    eventGuests: [
                        {
                            email: "guest@partner.com",
                            createdAt: "2024-01-12T09:00:00.000Z",
                            updatedAt: "2024-01-12T09:00:00.000Z"
                        }
                    ],
                    cancellation: null,
                    createdAt: "2024-01-12T09:00:00.000Z",
                    updatedAt: "2024-01-12T09:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "event_not_found",
                description: "Scheduled event does not exist",
                input: {
                    uuid: "evt_nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Scheduled event not found",
                    retryable: false
                }
            },
            {
                name: "no_access",
                description: "User does not have access to this event",
                input: {
                    uuid: "evt_other_user_event"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have access to this scheduled event",
                    retryable: false
                }
            }
        ]
    },

    // ==================== listScheduledEvents ====================
    {
        operationId: "listScheduledEvents",
        provider: "calendly",
        filterableData: {
            records: sampleScheduledEvents,
            recordsField: "events",
            offsetField: "nextPageToken",
            defaultPageSize: 20,
            maxPageSize: 100,
            pageSizeParam: "count",
            offsetParam: "pageToken",
            filterConfig: {
                type: "generic",
                filterableFields: ["_status", "_user"]
            }
        },
        validCases: [
            {
                name: "list_all_scheduled_events",
                description: "List all scheduled events for the user",
                input: {
                    user: "https://api.calendly.com/users/USER001ABC"
                }
            },
            {
                name: "list_active_scheduled_events",
                description: "List only active scheduled events",
                input: {
                    user: "https://api.calendly.com/users/USER001ABC",
                    status: "active"
                }
            },
            {
                name: "list_canceled_scheduled_events",
                description: "List only canceled scheduled events",
                input: {
                    user: "https://api.calendly.com/users/USER001ABC",
                    status: "canceled"
                }
            },
            {
                name: "list_events_with_date_range",
                description: "List events within a specific date range",
                input: {
                    user: "https://api.calendly.com/users/USER001ABC",
                    minStartTime: "2024-01-15T00:00:00Z",
                    maxStartTime: "2024-01-20T00:00:00Z"
                }
            },
            {
                name: "list_events_by_invitee_email",
                description: "Filter events by invitee email address",
                input: {
                    user: "https://api.calendly.com/users/USER001ABC",
                    inviteeEmail: "sarah.johnson@techcorp.com"
                }
            },
            {
                name: "list_events_paginated",
                description: "List events with pagination",
                input: {
                    user: "https://api.calendly.com/users/USER001ABC",
                    count: 2
                }
            }
        ],
        errorCases: [
            {
                name: "missing_user_or_org",
                description: "Neither user nor organization URI provided",
                input: {},
                expectedError: {
                    type: "validation",
                    message: "Either user or organization URI must be provided",
                    retryable: false
                }
            },
            {
                name: "invalid_date_range",
                description: "Invalid date range - max before min",
                input: {
                    user: "https://api.calendly.com/users/USER001ABC",
                    minStartTime: "2024-01-20T00:00:00Z",
                    maxStartTime: "2024-01-15T00:00:00Z"
                },
                expectedError: {
                    type: "validation",
                    message: "maxStartTime must be after minStartTime",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    user: "https://api.calendly.com/users/USER001ABC"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            }
        ]
    },

    // ==================== listEventInvitees ====================
    {
        operationId: "listEventInvitees",
        provider: "calendly",
        filterableData: {
            records: sampleInvitees,
            recordsField: "invitees",
            offsetField: "nextPageToken",
            defaultPageSize: 20,
            maxPageSize: 100,
            pageSizeParam: "count",
            offsetParam: "pageToken",
            filterConfig: {
                type: "generic",
                filterableFields: ["_eventUuid", "_status"]
            }
        },
        validCases: [
            {
                name: "list_all_invitees",
                description: "List all invitees for a scheduled event",
                input: {
                    eventUuid: "evt_abc123def456"
                }
            },
            {
                name: "list_active_invitees",
                description: "List only active invitees",
                input: {
                    eventUuid: "evt_def456ghi789",
                    status: "active"
                }
            },
            {
                name: "list_canceled_invitees",
                description: "List only canceled invitees",
                input: {
                    eventUuid: "evt_jkl012mno345",
                    status: "canceled"
                }
            },
            {
                name: "find_invitee_by_email",
                description: "Find invitee by email address",
                input: {
                    eventUuid: "evt_abc123def456",
                    email: "sarah.johnson@techcorp.com"
                }
            },
            {
                name: "list_invitees_paginated",
                description: "List invitees with pagination",
                input: {
                    eventUuid: "evt_def456ghi789",
                    count: 1
                }
            }
        ],
        errorCases: [
            {
                name: "event_not_found",
                description: "Scheduled event does not exist",
                input: {
                    eventUuid: "evt_nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Scheduled event not found",
                    retryable: false
                }
            },
            {
                name: "invalid_email_format",
                description: "Invalid email format in filter",
                input: {
                    eventUuid: "evt_abc123def456",
                    email: "not-an-email"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email address format",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    eventUuid: "evt_abc123def456"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            }
        ]
    },

    // ==================== getAvailability ====================
    {
        operationId: "getAvailability",
        provider: "calendly",
        validCases: [
            {
                name: "get_availability_week",
                description: "Get available time slots for a week",
                input: {
                    eventType: "https://api.calendly.com/event_types/EVTYPE001ABC",
                    startTime: "2024-01-15T00:00:00Z",
                    endTime: "2024-01-22T00:00:00Z"
                },
                expectedOutput: {
                    availableTimes: [
                        {
                            status: "available",
                            inviteesRemaining: 1,
                            startTime: "2024-01-15T14:00:00.000Z",
                            schedulingUrl:
                                "https://calendly.com/alex-chen/30-minute-meeting?month=2024-01&date=2024-01-15&time=14:00"
                        },
                        {
                            status: "available",
                            inviteesRemaining: 1,
                            startTime: "2024-01-15T14:30:00.000Z",
                            schedulingUrl:
                                "https://calendly.com/alex-chen/30-minute-meeting?month=2024-01&date=2024-01-15&time=14:30"
                        },
                        {
                            status: "available",
                            inviteesRemaining: 1,
                            startTime: "2024-01-15T15:00:00.000Z",
                            schedulingUrl:
                                "https://calendly.com/alex-chen/30-minute-meeting?month=2024-01&date=2024-01-15&time=15:00"
                        },
                        {
                            status: "available",
                            inviteesRemaining: 1,
                            startTime: "2024-01-16T09:00:00.000Z",
                            schedulingUrl:
                                "https://calendly.com/alex-chen/30-minute-meeting?month=2024-01&date=2024-01-16&time=09:00"
                        },
                        {
                            status: "available",
                            inviteesRemaining: 1,
                            startTime: "2024-01-16T09:30:00.000Z",
                            schedulingUrl:
                                "https://calendly.com/alex-chen/30-minute-meeting?month=2024-01&date=2024-01-16&time=09:30"
                        },
                        {
                            status: "available",
                            inviteesRemaining: 1,
                            startTime: "2024-01-16T10:00:00.000Z",
                            schedulingUrl:
                                "https://calendly.com/alex-chen/30-minute-meeting?month=2024-01&date=2024-01-16&time=10:00"
                        },
                        {
                            status: "available",
                            inviteesRemaining: 1,
                            startTime: "2024-01-17T11:00:00.000Z",
                            schedulingUrl:
                                "https://calendly.com/alex-chen/30-minute-meeting?month=2024-01&date=2024-01-17&time=11:00"
                        },
                        {
                            status: "available",
                            inviteesRemaining: 1,
                            startTime: "2024-01-17T11:30:00.000Z",
                            schedulingUrl:
                                "https://calendly.com/alex-chen/30-minute-meeting?month=2024-01&date=2024-01-17&time=11:30"
                        },
                        {
                            status: "available",
                            inviteesRemaining: 1,
                            startTime: "2024-01-18T13:00:00.000Z",
                            schedulingUrl:
                                "https://calendly.com/alex-chen/30-minute-meeting?month=2024-01&date=2024-01-18&time=13:00"
                        },
                        {
                            status: "available",
                            inviteesRemaining: 1,
                            startTime: "2024-01-19T10:00:00.000Z",
                            schedulingUrl:
                                "https://calendly.com/alex-chen/30-minute-meeting?month=2024-01&date=2024-01-19&time=10:00"
                        }
                    ]
                }
            },
            {
                name: "get_availability_single_day",
                description: "Get available time slots for a single day",
                input: {
                    eventType: "https://api.calendly.com/event_types/EVTYPE002DEF",
                    startTime: "2024-01-20T00:00:00Z",
                    endTime: "2024-01-21T00:00:00Z"
                },
                expectedOutput: {
                    availableTimes: [
                        {
                            status: "available",
                            inviteesRemaining: 5,
                            startTime: "2024-01-20T09:00:00.000Z",
                            schedulingUrl:
                                "https://calendly.com/alex-chen/product-demo?month=2024-01&date=2024-01-20&time=09:00"
                        },
                        {
                            status: "available",
                            inviteesRemaining: 5,
                            startTime: "2024-01-20T10:30:00.000Z",
                            schedulingUrl:
                                "https://calendly.com/alex-chen/product-demo?month=2024-01&date=2024-01-20&time=10:30"
                        },
                        {
                            status: "available",
                            inviteesRemaining: 5,
                            startTime: "2024-01-20T14:00:00.000Z",
                            schedulingUrl:
                                "https://calendly.com/alex-chen/product-demo?month=2024-01&date=2024-01-20&time=14:00"
                        },
                        {
                            status: "available",
                            inviteesRemaining: 5,
                            startTime: "2024-01-20T15:30:00.000Z",
                            schedulingUrl:
                                "https://calendly.com/alex-chen/product-demo?month=2024-01&date=2024-01-20&time=15:30"
                        }
                    ]
                }
            },
            {
                name: "get_availability_no_slots",
                description: "Query availability when fully booked",
                input: {
                    eventType: "https://api.calendly.com/event_types/EVTYPE001ABC",
                    startTime: "2024-01-13T00:00:00Z",
                    endTime: "2024-01-14T00:00:00Z"
                },
                expectedOutput: {
                    availableTimes: []
                }
            }
        ],
        errorCases: [
            {
                name: "event_type_not_found",
                description: "Event type does not exist",
                input: {
                    eventType: "https://api.calendly.com/event_types/NONEXISTENT",
                    startTime: "2024-01-15T00:00:00Z",
                    endTime: "2024-01-22T00:00:00Z"
                },
                expectedError: {
                    type: "not_found",
                    message: "Event type not found",
                    retryable: false
                }
            },
            {
                name: "invalid_date_range",
                description: "End time is before start time",
                input: {
                    eventType: "https://api.calendly.com/event_types/EVTYPE001ABC",
                    startTime: "2024-01-22T00:00:00Z",
                    endTime: "2024-01-15T00:00:00Z"
                },
                expectedError: {
                    type: "validation",
                    message: "End time must be after start time",
                    retryable: false
                }
            },
            {
                name: "range_too_large",
                description: "Date range exceeds maximum allowed",
                input: {
                    eventType: "https://api.calendly.com/event_types/EVTYPE001ABC",
                    startTime: "2024-01-01T00:00:00Z",
                    endTime: "2024-12-31T00:00:00Z"
                },
                expectedError: {
                    type: "validation",
                    message: "Date range cannot exceed 7 days",
                    retryable: false
                }
            },
            {
                name: "inactive_event_type",
                description: "Event type is not active",
                input: {
                    eventType: "https://api.calendly.com/event_types/EVTYPE006PQR",
                    startTime: "2024-01-15T00:00:00Z",
                    endTime: "2024-01-22T00:00:00Z"
                },
                expectedError: {
                    type: "validation",
                    message: "Event type is not active",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    eventType: "https://api.calendly.com/event_types/EVTYPE001ABC",
                    startTime: "2024-01-15T00:00:00Z",
                    endTime: "2024-01-22T00:00:00Z"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            }
        ]
    },

    // ==================== cancelEvent ====================
    {
        operationId: "cancelEvent",
        provider: "calendly",
        validCases: [
            {
                name: "cancel_event_with_reason",
                description: "Cancel a scheduled event with a cancellation reason",
                input: {
                    uuid: "evt_abc123def456",
                    reason: "Meeting is no longer needed - issue resolved via email"
                },
                expectedOutput: {
                    canceled: true,
                    eventUuid: "evt_abc123def456",
                    reason: "Meeting is no longer needed - issue resolved via email"
                }
            },
            {
                name: "cancel_event_without_reason",
                description: "Cancel a scheduled event without providing a reason",
                input: {
                    uuid: "evt_def456ghi789"
                },
                expectedOutput: {
                    canceled: true,
                    eventUuid: "evt_def456ghi789",
                    reason: null
                }
            },
            {
                name: "cancel_event_reschedule",
                description: "Cancel event due to rescheduling",
                input: {
                    uuid: "evt_ghi789jkl012",
                    reason: "Rescheduling to a different time slot"
                },
                expectedOutput: {
                    canceled: true,
                    eventUuid: "evt_ghi789jkl012",
                    reason: "Rescheduling to a different time slot"
                }
            }
        ],
        errorCases: [
            {
                name: "event_not_found",
                description: "Scheduled event does not exist",
                input: {
                    uuid: "evt_nonexistent123",
                    reason: "Test cancellation"
                },
                expectedError: {
                    type: "not_found",
                    message: "Scheduled event not found",
                    retryable: false
                }
            },
            {
                name: "event_already_canceled",
                description: "Event has already been canceled",
                input: {
                    uuid: "evt_jkl012mno345",
                    reason: "Trying to cancel again"
                },
                expectedError: {
                    type: "validation",
                    message: "Event has already been canceled",
                    retryable: false
                }
            },
            {
                name: "event_in_past",
                description: "Cannot cancel an event that has already occurred",
                input: {
                    uuid: "evt_past_event_123",
                    reason: "Too late to cancel"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot cancel an event that has already occurred",
                    retryable: false
                }
            },
            {
                name: "no_permission",
                description: "User does not have permission to cancel this event",
                input: {
                    uuid: "evt_other_user_event",
                    reason: "Unauthorized cancellation"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to cancel this event",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    uuid: "evt_abc123def456",
                    reason: "Rate limit test"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            }
        ]
    }
];
