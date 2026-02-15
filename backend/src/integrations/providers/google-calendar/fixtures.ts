/**
 * Google Calendar Provider Test Fixtures
 *
 * Based on official Google Calendar API documentation:
 * - Events: https://developers.google.com/calendar/api/v3/reference/events
 * - CalendarList: https://developers.google.com/calendar/api/v3/reference/calendarList
 * - FreeBusy: https://developers.google.com/calendar/api/v3/reference/freebusy
 */

import type { TestFixture } from "../../sandbox";

/**
 * Sample calendar events for filterableData
 */
const sampleEvents = [
    {
        kind: "calendar#event",
        etag: '"3325012345678901"',
        id: "event001abc123",
        status: "confirmed",
        htmlLink: "https://www.google.com/calendar/event?eid=event001abc123",
        created: "2024-01-10T08:00:00.000Z",
        updated: "2024-01-10T08:30:00.000Z",
        summary: "Team Standup",
        description: "Daily team sync meeting",
        location: "Conference Room A",
        creator: {
            email: "alice@example.com",
            displayName: "Alice Johnson",
            self: true
        },
        organizer: {
            email: "alice@example.com",
            displayName: "Alice Johnson",
            self: true
        },
        start: {
            dateTime: "2024-01-15T09:00:00-08:00",
            timeZone: "America/Los_Angeles"
        },
        end: {
            dateTime: "2024-01-15T09:30:00-08:00",
            timeZone: "America/Los_Angeles"
        },
        recurrence: ["RRULE:FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR"],
        iCalUID: "event001abc123@google.com",
        sequence: 0,
        attendees: [
            {
                email: "alice@example.com",
                displayName: "Alice Johnson",
                responseStatus: "accepted",
                organizer: true
            },
            { email: "bob@example.com", displayName: "Bob Smith", responseStatus: "accepted" },
            { email: "carol@example.com", displayName: "Carol Davis", responseStatus: "tentative" }
        ],
        reminders: {
            useDefault: false,
            overrides: [
                { method: "popup", minutes: 10 },
                { method: "email", minutes: 30 }
            ]
        },
        _calendarId: "primary",
        _status: "confirmed"
    },
    {
        kind: "calendar#event",
        etag: '"3325012345678902"',
        id: "event002def456",
        status: "confirmed",
        htmlLink: "https://www.google.com/calendar/event?eid=event002def456",
        created: "2024-01-08T14:00:00.000Z",
        updated: "2024-01-12T10:00:00.000Z",
        summary: "Q1 Planning Meeting",
        description: "Quarterly planning session to discuss goals and roadmap",
        location: "Main Conference Room",
        creator: {
            email: "manager@example.com",
            displayName: "Project Manager"
        },
        organizer: {
            email: "manager@example.com",
            displayName: "Project Manager"
        },
        start: {
            dateTime: "2024-01-16T14:00:00-08:00",
            timeZone: "America/Los_Angeles"
        },
        end: {
            dateTime: "2024-01-16T16:00:00-08:00",
            timeZone: "America/Los_Angeles"
        },
        iCalUID: "event002def456@google.com",
        sequence: 1,
        attendees: [
            {
                email: "alice@example.com",
                displayName: "Alice Johnson",
                responseStatus: "accepted"
            },
            { email: "bob@example.com", displayName: "Bob Smith", responseStatus: "needsAction" }
        ],
        reminders: {
            useDefault: true
        },
        _calendarId: "primary",
        _status: "confirmed"
    },
    {
        kind: "calendar#event",
        etag: '"3325012345678903"',
        id: "event003ghi789",
        status: "confirmed",
        htmlLink: "https://www.google.com/calendar/event?eid=event003ghi789",
        created: "2024-01-05T09:00:00.000Z",
        updated: "2024-01-05T09:00:00.000Z",
        summary: "Company Holiday Party",
        description: "Annual holiday celebration",
        location: "Downtown Event Center",
        creator: {
            email: "hr@example.com",
            displayName: "HR Team"
        },
        organizer: {
            email: "hr@example.com",
            displayName: "HR Team"
        },
        start: {
            date: "2024-01-20"
        },
        end: {
            date: "2024-01-21"
        },
        iCalUID: "event003ghi789@google.com",
        sequence: 0,
        reminders: {
            useDefault: true
        },
        _calendarId: "primary",
        _status: "confirmed"
    },
    {
        kind: "calendar#event",
        etag: '"3325012345678904"',
        id: "event004jkl012",
        status: "tentative",
        htmlLink: "https://www.google.com/calendar/event?eid=event004jkl012",
        created: "2024-01-11T11:00:00.000Z",
        updated: "2024-01-11T11:00:00.000Z",
        summary: "Product Demo",
        description: "Demo new features to stakeholders",
        creator: {
            email: "alice@example.com",
            displayName: "Alice Johnson",
            self: true
        },
        organizer: {
            email: "alice@example.com",
            displayName: "Alice Johnson",
            self: true
        },
        start: {
            dateTime: "2024-01-18T11:00:00-08:00",
            timeZone: "America/Los_Angeles"
        },
        end: {
            dateTime: "2024-01-18T12:00:00-08:00",
            timeZone: "America/Los_Angeles"
        },
        iCalUID: "event004jkl012@google.com",
        sequence: 0,
        conferenceData: {
            entryPoints: [
                {
                    entryPointType: "video",
                    uri: "https://meet.google.com/abc-defg-hij",
                    label: "meet.google.com/abc-defg-hij"
                }
            ],
            conferenceSolution: {
                key: { type: "hangoutsMeet" },
                name: "Google Meet"
            },
            conferenceId: "abc-defg-hij"
        },
        _calendarId: "primary",
        _status: "tentative"
    },
    {
        kind: "calendar#event",
        etag: '"3325012345678905"',
        id: "event005mno345",
        status: "confirmed",
        htmlLink: "https://www.google.com/calendar/event?eid=event005mno345",
        created: "2024-01-12T08:00:00.000Z",
        updated: "2024-01-12T08:00:00.000Z",
        summary: "1:1 with Manager",
        creator: {
            email: "alice@example.com",
            displayName: "Alice Johnson",
            self: true
        },
        organizer: {
            email: "alice@example.com",
            displayName: "Alice Johnson",
            self: true
        },
        start: {
            dateTime: "2024-01-19T15:00:00-08:00",
            timeZone: "America/Los_Angeles"
        },
        end: {
            dateTime: "2024-01-19T15:30:00-08:00",
            timeZone: "America/Los_Angeles"
        },
        iCalUID: "event005mno345@google.com",
        sequence: 0,
        _calendarId: "primary",
        _status: "confirmed"
    }
];

/**
 * Sample calendars for filterableData
 */
const sampleCalendars = [
    {
        kind: "calendar#calendarListEntry",
        etag: '"1704067200000"',
        id: "alice@example.com",
        summary: "Alice Johnson",
        description: "Personal calendar",
        timeZone: "America/Los_Angeles",
        colorId: "1",
        backgroundColor: "#ac725e",
        foregroundColor: "#1d1d1d",
        selected: true,
        accessRole: "owner",
        defaultReminders: [{ method: "popup", minutes: 10 }],
        primary: true,
        _accessRole: "owner"
    },
    {
        kind: "calendar#calendarListEntry",
        etag: '"1704067200001"',
        id: "team-calendar@group.calendar.google.com",
        summary: "Team Calendar",
        description: "Shared team events and meetings",
        timeZone: "America/Los_Angeles",
        colorId: "9",
        backgroundColor: "#7bd148",
        foregroundColor: "#1d1d1d",
        selected: true,
        accessRole: "writer",
        defaultReminders: [],
        _accessRole: "writer"
    },
    {
        kind: "calendar#calendarListEntry",
        etag: '"1704067200002"',
        id: "company-holidays@group.calendar.google.com",
        summary: "Company Holidays",
        description: "Official company holidays",
        timeZone: "America/Los_Angeles",
        colorId: "17",
        backgroundColor: "#9a9cff",
        foregroundColor: "#1d1d1d",
        selected: true,
        accessRole: "reader",
        defaultReminders: [],
        _accessRole: "reader"
    },
    {
        kind: "calendar#calendarListEntry",
        etag: '"1704067200003"',
        id: "en.usa#holiday@group.v.calendar.google.com",
        summary: "Holidays in United States",
        timeZone: "America/Los_Angeles",
        colorId: "8",
        backgroundColor: "#16a765",
        foregroundColor: "#000000",
        selected: false,
        accessRole: "reader",
        defaultReminders: [],
        _accessRole: "reader"
    }
];

export const googleCalendarFixtures: TestFixture[] = [
    // ==================== listEvents ====================
    {
        operationId: "listEvents",
        provider: "google-calendar",
        filterableData: {
            records: sampleEvents,
            recordsField: "items",
            offsetField: "nextPageToken",
            defaultPageSize: 250,
            maxPageSize: 2500,
            pageSizeParam: "maxResults",
            filterConfig: {
                type: "generic",
                filterableFields: ["_calendarId", "_status"]
            }
        },
        validCases: [
            {
                name: "list_events_primary_calendar",
                description: "List events from primary calendar",
                input: {
                    calendarId: "primary"
                }
            },
            {
                name: "list_events_with_pagination",
                description: "List events with limited results",
                input: {
                    calendarId: "primary",
                    maxResults: 2
                }
            }
        ],
        errorCases: [
            {
                name: "calendar_not_found",
                description: "Calendar does not exist",
                input: {
                    calendarId: "nonexistent-calendar-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Calendar not found",
                    retryable: false
                }
            },
            {
                name: "no_calendar_access",
                description: "No permission to access calendar",
                input: {
                    calendarId: "private-calendar@example.com"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have access to this calendar",
                    retryable: false
                }
            }
        ]
    },

    // ==================== getEvent ====================
    {
        operationId: "getEvent",
        provider: "google-calendar",
        validCases: [
            {
                name: "get_event_by_id",
                description: "Get a specific event by ID",
                input: {
                    calendarId: "primary",
                    eventId: "event001abc123"
                },
                expectedOutput: {
                    kind: "calendar#event",
                    etag: '"3325012345678901"',
                    id: "event001abc123",
                    status: "confirmed",
                    htmlLink: "https://www.google.com/calendar/event?eid=event001abc123",
                    created: "2024-01-10T08:00:00.000Z",
                    updated: "2024-01-10T08:30:00.000Z",
                    summary: "Team Standup",
                    description: "Daily team sync meeting",
                    location: "Conference Room A",
                    creator: {
                        email: "alice@example.com",
                        displayName: "Alice Johnson",
                        self: true
                    },
                    organizer: {
                        email: "alice@example.com",
                        displayName: "Alice Johnson",
                        self: true
                    },
                    start: {
                        dateTime: "2024-01-15T09:00:00-08:00",
                        timeZone: "America/Los_Angeles"
                    },
                    end: {
                        dateTime: "2024-01-15T09:30:00-08:00",
                        timeZone: "America/Los_Angeles"
                    },
                    recurrence: ["RRULE:FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR"],
                    iCalUID: "event001abc123@google.com",
                    sequence: 0,
                    attendees: [
                        {
                            email: "alice@example.com",
                            displayName: "Alice Johnson",
                            responseStatus: "accepted",
                            organizer: true
                        },
                        {
                            email: "bob@example.com",
                            displayName: "Bob Smith",
                            responseStatus: "accepted"
                        },
                        {
                            email: "carol@example.com",
                            displayName: "Carol Davis",
                            responseStatus: "tentative"
                        }
                    ],
                    reminders: {
                        useDefault: false,
                        overrides: [
                            { method: "popup", minutes: 10 },
                            { method: "email", minutes: 30 }
                        ]
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "event_not_found",
                description: "Event does not exist",
                input: {
                    calendarId: "primary",
                    eventId: "nonexistent-event-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Event not found",
                    retryable: false
                }
            }
        ]
    },

    // ==================== createEvent ====================
    {
        operationId: "createEvent",
        provider: "google-calendar",
        validCases: [
            {
                name: "create_simple_event",
                description: "Create a simple calendar event",
                input: {
                    calendarId: "primary",
                    summary: "Coffee Chat",
                    start: {
                        dateTime: "2024-01-25T10:00:00-08:00",
                        timeZone: "America/Los_Angeles"
                    },
                    end: {
                        dateTime: "2024-01-25T10:30:00-08:00",
                        timeZone: "America/Los_Angeles"
                    }
                },
                expectedOutput: {
                    kind: "calendar#event",
                    id: "{{uuid}}",
                    status: "confirmed",
                    htmlLink: "https://www.google.com/calendar/event?eid={{uuid}}",
                    created: "{{iso}}",
                    updated: "{{iso}}",
                    summary: "Coffee Chat",
                    creator: {
                        email: "alice@example.com",
                        self: true
                    },
                    organizer: {
                        email: "alice@example.com",
                        self: true
                    },
                    start: {
                        dateTime: "2024-01-25T10:00:00-08:00",
                        timeZone: "America/Los_Angeles"
                    },
                    end: {
                        dateTime: "2024-01-25T10:30:00-08:00",
                        timeZone: "America/Los_Angeles"
                    },
                    iCalUID: "{{uuid}}@google.com",
                    sequence: 0,
                    reminders: {
                        useDefault: true
                    }
                }
            },
            {
                name: "create_event_with_attendees",
                description: "Create an event with attendees and location",
                input: {
                    calendarId: "primary",
                    summary: "Project Kickoff",
                    description: "Initial meeting to discuss project scope",
                    location: "Conference Room B",
                    start: {
                        dateTime: "2024-01-26T14:00:00-08:00",
                        timeZone: "America/Los_Angeles"
                    },
                    end: {
                        dateTime: "2024-01-26T15:00:00-08:00",
                        timeZone: "America/Los_Angeles"
                    },
                    attendees: [
                        { email: "bob@example.com", displayName: "Bob Smith" },
                        { email: "carol@example.com", optional: true }
                    ]
                },
                expectedOutput: {
                    kind: "calendar#event",
                    id: "{{uuid}}",
                    status: "confirmed",
                    summary: "Project Kickoff",
                    description: "Initial meeting to discuss project scope",
                    location: "Conference Room B",
                    start: {
                        dateTime: "2024-01-26T14:00:00-08:00",
                        timeZone: "America/Los_Angeles"
                    },
                    end: {
                        dateTime: "2024-01-26T15:00:00-08:00",
                        timeZone: "America/Los_Angeles"
                    },
                    attendees: [
                        {
                            email: "alice@example.com",
                            self: true,
                            responseStatus: "accepted",
                            organizer: true
                        },
                        {
                            email: "bob@example.com",
                            displayName: "Bob Smith",
                            responseStatus: "needsAction"
                        },
                        {
                            email: "carol@example.com",
                            optional: true,
                            responseStatus: "needsAction"
                        }
                    ]
                }
            },
            {
                name: "create_all_day_event",
                description: "Create an all-day event",
                input: {
                    calendarId: "primary",
                    summary: "Team Offsite",
                    start: {
                        date: "2024-02-15"
                    },
                    end: {
                        date: "2024-02-16"
                    }
                },
                expectedOutput: {
                    kind: "calendar#event",
                    id: "{{uuid}}",
                    status: "confirmed",
                    summary: "Team Offsite",
                    start: {
                        date: "2024-02-15"
                    },
                    end: {
                        date: "2024-02-16"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_time_range",
                description: "End time is before start time",
                input: {
                    calendarId: "primary",
                    summary: "Invalid Event",
                    start: {
                        dateTime: "2024-01-25T12:00:00-08:00"
                    },
                    end: {
                        dateTime: "2024-01-25T10:00:00-08:00"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "End time must be after start time",
                    retryable: false
                }
            },
            {
                name: "calendar_read_only",
                description: "Cannot create events in read-only calendar",
                input: {
                    calendarId: "en.usa#holiday@group.v.calendar.google.com",
                    summary: "Test Event",
                    start: { dateTime: "2024-01-25T10:00:00-08:00" },
                    end: { dateTime: "2024-01-25T11:00:00-08:00" }
                },
                expectedError: {
                    type: "permission",
                    message: "Calendar is read-only",
                    retryable: false
                }
            }
        ]
    },

    // ==================== updateEvent ====================
    {
        operationId: "updateEvent",
        provider: "google-calendar",
        validCases: [
            {
                name: "update_event_summary",
                description: "Update event title",
                input: {
                    calendarId: "primary",
                    eventId: "event001abc123",
                    summary: "Team Standup (Updated)"
                },
                expectedOutput: {
                    kind: "calendar#event",
                    id: "event001abc123",
                    status: "confirmed",
                    updated: "{{iso}}",
                    summary: "Team Standup (Updated)",
                    sequence: 1
                }
            }
        ],
        errorCases: [
            {
                name: "event_not_found",
                description: "Event does not exist",
                input: {
                    calendarId: "primary",
                    eventId: "nonexistent-event-id",
                    summary: "Updated Title"
                },
                expectedError: {
                    type: "not_found",
                    message: "Event not found",
                    retryable: false
                }
            },
            {
                name: "no_edit_permission",
                description: "Cannot edit event without permission",
                input: {
                    calendarId: "company-holidays@group.calendar.google.com",
                    eventId: "holiday-event-123",
                    summary: "Updated Holiday"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to edit this event",
                    retryable: false
                }
            }
        ]
    },

    // ==================== deleteEvent ====================
    {
        operationId: "deleteEvent",
        provider: "google-calendar",
        validCases: [
            {
                name: "delete_event",
                description: "Delete an event",
                input: {
                    calendarId: "primary",
                    eventId: "event-to-delete-123"
                },
                expectedOutput: {
                    deleted: true
                }
            }
        ],
        errorCases: [
            {
                name: "event_not_found",
                description: "Event does not exist",
                input: {
                    calendarId: "primary",
                    eventId: "nonexistent-event-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Event not found",
                    retryable: false
                }
            }
        ]
    },

    // ==================== quickAdd ====================
    {
        operationId: "quickAdd",
        provider: "google-calendar",
        validCases: [
            {
                name: "quick_add_event",
                description: "Create event from natural language text",
                input: {
                    calendarId: "primary",
                    text: "Meeting with Bob tomorrow at 3pm for 1 hour"
                },
                expectedOutput: {
                    kind: "calendar#event",
                    id: "{{uuid}}",
                    status: "confirmed",
                    summary: "Meeting with Bob",
                    iCalUID: "{{uuid}}@google.com",
                    sequence: 0,
                    reminders: {
                        useDefault: true
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "cannot_parse_text",
                description: "Cannot parse natural language input",
                input: {
                    calendarId: "primary",
                    text: "asdfghjkl"
                },
                expectedError: {
                    type: "validation",
                    message: "Could not parse the provided text into an event",
                    retryable: false
                }
            }
        ]
    },

    // ==================== listCalendars ====================
    {
        operationId: "listCalendars",
        provider: "google-calendar",
        filterableData: {
            records: sampleCalendars,
            recordsField: "items",
            offsetField: "nextPageToken",
            defaultPageSize: 250,
            maxPageSize: 250,
            pageSizeParam: "maxResults",
            filterConfig: {
                type: "generic",
                filterableFields: ["_accessRole"]
            }
        },
        validCases: [
            {
                name: "list_all_calendars",
                description: "List all accessible calendars",
                input: {}
            },
            {
                name: "list_calendars_limited",
                description: "List calendars with limited results",
                input: {
                    maxResults: 2
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    maxResults: 250
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            }
        ]
    },

    // ==================== getCalendar ====================
    {
        operationId: "getCalendar",
        provider: "google-calendar",
        validCases: [
            {
                name: "get_primary_calendar",
                description: "Get primary calendar details",
                input: {
                    calendarId: "primary"
                },
                expectedOutput: {
                    kind: "calendar#calendarListEntry",
                    etag: '"1704067200000"',
                    id: "alice@example.com",
                    summary: "Alice Johnson",
                    description: "Personal calendar",
                    timeZone: "America/Los_Angeles",
                    colorId: "1",
                    backgroundColor: "#ac725e",
                    foregroundColor: "#1d1d1d",
                    selected: true,
                    accessRole: "owner",
                    defaultReminders: [{ method: "popup", minutes: 10 }],
                    primary: true
                }
            }
        ],
        errorCases: [
            {
                name: "calendar_not_found",
                description: "Calendar does not exist",
                input: {
                    calendarId: "nonexistent-calendar@example.com"
                },
                expectedError: {
                    type: "not_found",
                    message: "Calendar not found",
                    retryable: false
                }
            }
        ]
    },

    // ==================== createCalendar ====================
    {
        operationId: "createCalendar",
        provider: "google-calendar",
        validCases: [
            {
                name: "create_new_calendar",
                description: "Create a new secondary calendar",
                input: {
                    summary: "Project Alpha",
                    description: "Calendar for Project Alpha milestones",
                    timeZone: "America/Los_Angeles"
                },
                expectedOutput: {
                    kind: "calendar#calendar",
                    etag: '"{{uuid}}"',
                    id: "{{uuid}}@group.calendar.google.com",
                    summary: "Project Alpha",
                    description: "Calendar for Project Alpha milestones",
                    timeZone: "America/Los_Angeles"
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limit",
                description: "Calendar creation quota exceeded",
                input: {
                    summary: "Too Many Calendars"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Calendar creation quota exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== getFreeBusy ====================
    {
        operationId: "getFreeBusy",
        provider: "google-calendar",
        validCases: [
            {
                name: "check_availability",
                description: "Check availability for multiple calendars",
                input: {
                    timeMin: "2024-01-15T00:00:00Z",
                    timeMax: "2024-01-16T00:00:00Z",
                    items: [{ id: "alice@example.com" }, { id: "bob@example.com" }],
                    timeZone: "America/Los_Angeles"
                },
                expectedOutput: {
                    kind: "calendar#freeBusy",
                    timeMin: "2024-01-15T00:00:00.000Z",
                    timeMax: "2024-01-16T00:00:00.000Z",
                    calendars: {
                        "alice@example.com": {
                            busy: [
                                {
                                    start: "2024-01-15T09:00:00-08:00",
                                    end: "2024-01-15T09:30:00-08:00"
                                },
                                {
                                    start: "2024-01-15T14:00:00-08:00",
                                    end: "2024-01-15T15:00:00-08:00"
                                }
                            ]
                        },
                        "bob@example.com": {
                            busy: [
                                {
                                    start: "2024-01-15T10:00:00-08:00",
                                    end: "2024-01-15T11:00:00-08:00"
                                }
                            ]
                        }
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_time_range",
                description: "Invalid time range specified",
                input: {
                    timeMin: "2024-01-16T00:00:00Z",
                    timeMax: "2024-01-15T00:00:00Z",
                    items: [{ id: "alice@example.com" }]
                },
                expectedError: {
                    type: "validation",
                    message: "timeMax must be after timeMin",
                    retryable: false
                }
            },
            {
                name: "calendar_not_accessible",
                description: "Cannot access calendar free/busy information",
                input: {
                    timeMin: "2024-01-15T00:00:00Z",
                    timeMax: "2024-01-16T00:00:00Z",
                    items: [{ id: "private-user@other-domain.com" }]
                },
                expectedError: {
                    type: "permission",
                    message: "Cannot access free/busy information for one or more calendars",
                    retryable: false
                }
            }
        ]
    }
];
