/**
 * Cal.com Provider Test Fixtures
 *
 * Comprehensive test fixtures for Cal.com scheduling platform operations
 * including bookings, event types, availability, schedules, and user data.
 */

import type { TestFixture } from "../../sandbox";

export const calComFixtures: TestFixture[] = [
    {
        operationId: "cancelBooking",
        provider: "cal-com",
        validCases: [
            {
                name: "cancel_booking_with_reason",
                description: "Cancel an existing booking with a cancellation reason",
                input: {
                    uid: "bk_abc123def456",
                    cancellationReason: "Schedule conflict - need to reschedule for next week"
                },
                expectedOutput: {
                    cancelled: true,
                    bookingUid: "bk_abc123def456",
                    status: "cancelled",
                    cancellationReason: "Schedule conflict - need to reschedule for next week"
                }
            }
        ],
        errorCases: [
            {
                name: "booking_not_found",
                description: "Attempt to cancel a non-existent booking",
                input: {
                    uid: "bk_nonexistent999",
                    cancellationReason: "Test cancellation"
                },
                expectedError: {
                    type: "not_found",
                    message: "Booking not found",
                    retryable: false
                }
            },
            {
                name: "already_cancelled_booking",
                description: "Attempt to cancel an already cancelled booking",
                input: {
                    uid: "bk_alreadycancelled123"
                },
                expectedError: {
                    type: "validation",
                    message: "Booking has already been cancelled",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when cancelling booking",
                input: {
                    uid: "bk_valid123"
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
        operationId: "createBooking",
        provider: "cal-com",
        validCases: [
            {
                name: "create_booking_with_guests",
                description: "Create a team meeting booking with multiple guest attendees",
                input: {
                    eventTypeId: 23456,
                    start: "2025-03-20T14:00:00Z",
                    end: "2025-03-20T15:00:00Z",
                    name: "Michael Chen",
                    email: "michael.chen@acmecorp.com",
                    timeZone: "America/Los_Angeles",
                    language: "en",
                    notes: "Quarterly planning meeting - please have reports ready",
                    guests: [
                        "emily.wilson@acmecorp.com",
                        "david.park@acmecorp.com",
                        "lisa.thompson@acmecorp.com"
                    ]
                },
                expectedOutput: {
                    id: 98766,
                    uid: "bk_teambooking456",
                    title: "Team Planning Session with Michael Chen",
                    description: "Quarterly planning meeting",
                    startTime: "2025-03-20T14:00:00Z",
                    endTime: "2025-03-20T15:00:00Z",
                    status: "accepted",
                    location: "https://zoom.us/j/123456789",
                    meetingUrl: "https://zoom.us/j/123456789",
                    eventTypeId: 23456,
                    attendees: [
                        {
                            id: 789,
                            email: "michael.chen@acmecorp.com",
                            name: "Michael Chen",
                            timeZone: "America/Los_Angeles"
                        }
                    ],
                    guests: [
                        "emily.wilson@acmecorp.com",
                        "david.park@acmecorp.com",
                        "lisa.thompson@acmecorp.com"
                    ],
                    createdAt: "2025-03-12T09:15:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "event_type_not_found",
                description: "Attempt to create booking for non-existent event type",
                input: {
                    eventTypeId: 999999,
                    start: "2025-03-15T10:00:00Z",
                    name: "Test User",
                    email: "test@example.com",
                    timeZone: "UTC"
                },
                expectedError: {
                    type: "not_found",
                    message: "Event type not found",
                    retryable: false
                }
            },
            {
                name: "slot_not_available",
                description: "Attempt to book an already occupied time slot",
                input: {
                    eventTypeId: 12345,
                    start: "2025-03-15T10:00:00Z",
                    name: "Another User",
                    email: "another@example.com",
                    timeZone: "America/New_York"
                },
                expectedError: {
                    type: "validation",
                    message: "Selected time slot is no longer available",
                    retryable: false
                }
            },
            {
                name: "invalid_email_format",
                description: "Attempt to create booking with invalid email",
                input: {
                    eventTypeId: 12345,
                    start: "2025-03-15T10:00:00Z",
                    name: "Invalid User",
                    email: "not-an-email",
                    timeZone: "America/New_York"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email format",
                    retryable: false
                }
            },
            {
                name: "past_start_time",
                description: "Attempt to book a slot in the past",
                input: {
                    eventTypeId: 12345,
                    start: "2020-01-01T10:00:00Z",
                    name: "Past User",
                    email: "past@example.com",
                    timeZone: "UTC"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot book a time slot in the past",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when creating booking",
                input: {
                    eventTypeId: 12345,
                    start: "2025-03-15T11:00:00Z",
                    name: "Rate Limited User",
                    email: "ratelimit@example.com",
                    timeZone: "UTC"
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
        operationId: "getAvailableSlots",
        provider: "cal-com",
        validCases: [
            {
                name: "get_weekly_availability",
                description: "Get available slots for a week",
                input: {
                    eventTypeId: 12345,
                    startTime: "2025-03-17T00:00:00Z",
                    endTime: "2025-03-24T00:00:00Z",
                    timeZone: "America/New_York"
                },
                expectedOutput: {
                    slots: [
                        { date: "2025-03-17", time: "2025-03-17T09:00:00-04:00" },
                        { date: "2025-03-17", time: "2025-03-17T09:30:00-04:00" },
                        { date: "2025-03-17", time: "2025-03-17T10:00:00-04:00" },
                        { date: "2025-03-17", time: "2025-03-17T10:30:00-04:00" },
                        { date: "2025-03-17", time: "2025-03-17T14:00:00-04:00" },
                        { date: "2025-03-17", time: "2025-03-17T14:30:00-04:00" },
                        { date: "2025-03-17", time: "2025-03-17T15:00:00-04:00" },
                        { date: "2025-03-18", time: "2025-03-18T09:00:00-04:00" },
                        { date: "2025-03-18", time: "2025-03-18T09:30:00-04:00" },
                        { date: "2025-03-18", time: "2025-03-18T11:00:00-04:00" },
                        { date: "2025-03-18", time: "2025-03-18T11:30:00-04:00" },
                        { date: "2025-03-19", time: "2025-03-19T10:00:00-04:00" },
                        { date: "2025-03-19", time: "2025-03-19T10:30:00-04:00" },
                        { date: "2025-03-19", time: "2025-03-19T13:00:00-04:00" },
                        { date: "2025-03-20", time: "2025-03-20T09:00:00-04:00" },
                        { date: "2025-03-20", time: "2025-03-20T09:30:00-04:00" },
                        { date: "2025-03-20", time: "2025-03-20T14:00:00-04:00" },
                        { date: "2025-03-20", time: "2025-03-20T14:30:00-04:00" },
                        { date: "2025-03-21", time: "2025-03-21T11:00:00-04:00" },
                        { date: "2025-03-21", time: "2025-03-21T11:30:00-04:00" }
                    ],
                    totalSlots: 20,
                    eventTypeId: 12345,
                    startTime: "2025-03-17T00:00:00Z",
                    endTime: "2025-03-24T00:00:00Z",
                    timeZone: "America/New_York"
                }
            }
        ],
        errorCases: [
            {
                name: "event_type_not_found",
                description: "Request availability for non-existent event type",
                input: {
                    eventTypeId: 999999,
                    startTime: "2025-03-17T00:00:00Z",
                    endTime: "2025-03-24T00:00:00Z"
                },
                expectedError: {
                    type: "not_found",
                    message: "Event type not found",
                    retryable: false
                }
            },
            {
                name: "invalid_date_range",
                description: "Request with end time before start time",
                input: {
                    eventTypeId: 12345,
                    startTime: "2025-03-24T00:00:00Z",
                    endTime: "2025-03-17T00:00:00Z"
                },
                expectedError: {
                    type: "validation",
                    message: "End time must be after start time",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when fetching availability",
                input: {
                    eventTypeId: 12345,
                    startTime: "2025-03-17T00:00:00Z",
                    endTime: "2025-03-24T00:00:00Z"
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
        operationId: "getBooking",
        provider: "cal-com",
        validCases: [
            {
                name: "get_confirmed_booking",
                description: "Retrieve details of a confirmed booking",
                input: {
                    uid: "bk_confirmed123"
                },
                expectedOutput: {
                    id: 10001,
                    uid: "bk_confirmed123",
                    title: "Strategy Consultation with Alex Thompson",
                    description: "Discussion about Q2 product roadmap",
                    startTime: "2025-03-18T14:00:00Z",
                    endTime: "2025-03-18T15:00:00Z",
                    status: "accepted",
                    location: "Google Meet",
                    meetingUrl: "https://meet.google.com/abc-defg-hij",
                    cancellationReason: null,
                    rejectionReason: null,
                    rescheduledFromUid: null,
                    eventTypeId: 12345,
                    attendees: [
                        {
                            id: 2001,
                            email: "alex.thompson@enterprise.com",
                            name: "Alex Thompson",
                            timeZone: "America/Chicago",
                            locale: "en"
                        }
                    ],
                    guests: ["cto@enterprise.com", "pm@enterprise.com"],
                    createdAt: "2025-03-10T09:30:00Z",
                    updatedAt: "2025-03-10T09:30:00Z",
                    responses: {
                        name: "Alex Thompson",
                        email: "alex.thompson@enterprise.com",
                        notes: "Discussion about Q2 product roadmap"
                    },
                    metadata: {
                        source: "website",
                        referrer: "google"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "booking_not_found",
                description: "Attempt to retrieve a non-existent booking",
                input: {
                    uid: "bk_nonexistent999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Booking not found",
                    retryable: false
                }
            },
            {
                name: "invalid_uid_format",
                description: "Attempt to retrieve booking with invalid UID format",
                input: {
                    uid: ""
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid booking UID",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when fetching booking",
                input: {
                    uid: "bk_valid123"
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
        operationId: "getCurrentUser",
        provider: "cal-com",
        validCases: [
            {
                name: "get_authenticated_user",
                description: "Get the authenticated user's profile",
                input: {},
                expectedOutput: {
                    id: 54321,
                    email: "scheduling@company.com",
                    username: "company-scheduling",
                    name: "Company Scheduling Team",
                    bio: "Book meetings with our sales and support team",
                    avatarUrl: "https://cal.com/avatars/company-scheduling.jpg",
                    timeZone: "America/New_York",
                    weekStart: "Monday",
                    timeFormat: 12,
                    defaultScheduleId: 1001,
                    createdDate: "2024-01-15T08:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Invalid or expired authentication token",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Invalid or expired API key",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when fetching user profile",
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
        operationId: "getEventType",
        provider: "cal-com",
        validCases: [
            {
                name: "get_60min_strategy_session",
                description: "Get details of a 60-minute strategy session event type",
                input: {
                    id: 23456
                },
                expectedOutput: {
                    id: 23456,
                    title: "Strategy Session",
                    slug: "strategy-session",
                    description:
                        "In-depth strategy session to plan your project roadmap and deliverables.",
                    length: 60,
                    locations: [
                        {
                            type: "integrations:zoom",
                            link: "https://zoom.us/j/123456789",
                            displayLocationPublicly: true
                        }
                    ],
                    requiresConfirmation: true,
                    recurringEvent: null,
                    disableGuests: false,
                    hideCalendarNotes: false,
                    minimumBookingNotice: 2880,
                    beforeEventBuffer: 15,
                    afterEventBuffer: 15,
                    schedulingType: null,
                    price: 150,
                    currency: "usd",
                    slotInterval: 60,
                    successRedirectUrl: "https://company.com/booking-confirmed",
                    seatsPerTimeSlot: null,
                    seatsShowAttendees: false,
                    seatsShowAvailabilityCount: false,
                    bookingFields: [
                        { name: "name", type: "text", required: true },
                        { name: "email", type: "email", required: true },
                        { name: "company", type: "text", required: true },
                        { name: "projectDetails", type: "textarea", required: true }
                    ],
                    bookingLimits: { PER_DAY: 3 },
                    durationLimits: {},
                    hosts: [
                        { userId: 54321, isFixed: true },
                        { userId: 54322, isFixed: false }
                    ],
                    metadata: { category: "premium" }
                }
            }
        ],
        errorCases: [
            {
                name: "event_type_not_found",
                description: "Attempt to retrieve a non-existent event type",
                input: {
                    id: 999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Event type not found",
                    retryable: false
                }
            },
            {
                name: "unauthorized_access",
                description: "Attempt to access an event type without permission",
                input: {
                    id: 88888
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to access this event type",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when fetching event type",
                input: {
                    id: 12345
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
        operationId: "listBookings",
        provider: "cal-com",
        validCases: [
            {
                name: "list_upcoming_bookings",
                description: "List upcoming bookings with default pagination",
                input: {
                    status: "upcoming",
                    take: 10
                },
                expectedOutput: {
                    bookings: [
                        {
                            id: 20001,
                            uid: "bk_upcoming001",
                            title: "Discovery Call with Emma Davis",
                            description: "Initial consultation",
                            startTime: "2025-03-20T09:00:00Z",
                            endTime: "2025-03-20T09:30:00Z",
                            status: "accepted",
                            location: "Google Meet",
                            meetingUrl: "https://meet.google.com/xyz-abcd-efg",
                            cancellationReason: null,
                            rejectionReason: null,
                            rescheduledFromUid: null,
                            eventTypeId: 12345,
                            attendees: [
                                {
                                    id: 3001,
                                    email: "emma.davis@startup.io",
                                    name: "Emma Davis",
                                    timeZone: "America/New_York"
                                }
                            ],
                            guests: [],
                            createdAt: "2025-03-15T14:20:00Z",
                            updatedAt: null,
                            responses: { name: "Emma Davis", email: "emma.davis@startup.io" }
                        },
                        {
                            id: 20002,
                            uid: "bk_upcoming002",
                            title: "Product Demo with TechCorp Team",
                            description: "Full product demonstration",
                            startTime: "2025-03-21T14:00:00Z",
                            endTime: "2025-03-21T15:00:00Z",
                            status: "accepted",
                            location: "Zoom",
                            meetingUrl: "https://zoom.us/j/987654321",
                            cancellationReason: null,
                            rejectionReason: null,
                            rescheduledFromUid: null,
                            eventTypeId: 23456,
                            attendees: [
                                {
                                    id: 3002,
                                    email: "procurement@techcorp.com",
                                    name: "TechCorp Procurement",
                                    timeZone: "Europe/London"
                                }
                            ],
                            guests: ["cto@techcorp.com", "engineering@techcorp.com"],
                            createdAt: "2025-03-12T10:45:00Z",
                            updatedAt: null,
                            responses: {
                                name: "TechCorp Procurement",
                                email: "procurement@techcorp.com"
                            }
                        },
                        {
                            id: 20003,
                            uid: "bk_upcoming003",
                            title: "Strategy Session with Global Industries",
                            description: "Q2 planning session",
                            startTime: "2025-03-25T16:00:00Z",
                            endTime: "2025-03-25T17:00:00Z",
                            status: "accepted",
                            location: "Microsoft Teams",
                            meetingUrl: "https://teams.microsoft.com/meet/abc123",
                            cancellationReason: null,
                            rejectionReason: null,
                            rescheduledFromUid: null,
                            eventTypeId: 23456,
                            attendees: [
                                {
                                    id: 3003,
                                    email: "strategy@globalind.com",
                                    name: "Global Industries Strategy",
                                    timeZone: "Asia/Tokyo"
                                }
                            ],
                            guests: [],
                            createdAt: "2025-03-18T08:30:00Z",
                            updatedAt: null,
                            responses: {
                                name: "Global Industries Strategy",
                                email: "strategy@globalind.com"
                            }
                        }
                    ],
                    pagination: {
                        totalCount: 15,
                        pageCount: 2,
                        currentPage: 1,
                        perPage: 10
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_status_filter",
                description: "Request with invalid status filter value",
                input: {
                    status: "invalid_status" as never,
                    take: 10
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid status filter",
                    retryable: false
                }
            },
            {
                name: "invalid_pagination",
                description: "Request with invalid pagination parameters",
                input: {
                    take: 500,
                    skip: -10
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid pagination parameters",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when listing bookings",
                input: {
                    take: 10
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
        operationId: "listEventTypes",
        provider: "cal-com",
        validCases: [
            {
                name: "list_all_event_types",
                description: "List all event types for the authenticated user",
                input: {},
                expectedOutput: {
                    eventTypes: [
                        {
                            id: 12345,
                            title: "30-Minute Consultation",
                            slug: "30min-consultation",
                            description: "Quick 30-minute call to discuss your needs",
                            length: 30,
                            locations: [
                                { type: "integrations:google:meet", displayLocationPublicly: true }
                            ],
                            requiresConfirmation: false,
                            price: 0,
                            currency: "usd",
                            slotInterval: 30,
                            minimumBookingNotice: 1440,
                            beforeEventBuffer: 5,
                            afterEventBuffer: 5,
                            seatsPerTimeSlot: null,
                            hosts: [{ userId: 54321, isFixed: true }]
                        },
                        {
                            id: 23456,
                            title: "Strategy Session",
                            slug: "strategy-session",
                            description: "In-depth strategy session for project planning",
                            length: 60,
                            locations: [
                                {
                                    type: "integrations:zoom",
                                    link: "https://zoom.us/j/123456789",
                                    displayLocationPublicly: true
                                }
                            ],
                            requiresConfirmation: true,
                            price: 150,
                            currency: "usd",
                            slotInterval: 60,
                            minimumBookingNotice: 2880,
                            beforeEventBuffer: 15,
                            afterEventBuffer: 15,
                            seatsPerTimeSlot: null,
                            hosts: [
                                { userId: 54321, isFixed: true },
                                { userId: 54322, isFixed: false }
                            ]
                        },
                        {
                            id: 34567,
                            title: "Weekly Team Standup",
                            slug: "weekly-standup",
                            description: "Regular weekly standup meeting",
                            length: 15,
                            locations: [
                                { type: "integrations:google:meet", displayLocationPublicly: true }
                            ],
                            requiresConfirmation: false,
                            price: 0,
                            currency: "usd",
                            slotInterval: 15,
                            minimumBookingNotice: 60,
                            beforeEventBuffer: 0,
                            afterEventBuffer: 0,
                            seatsPerTimeSlot: null,
                            hosts: [
                                { userId: 54321, isFixed: false },
                                { userId: 54322, isFixed: false }
                            ]
                        },
                        {
                            id: 45678,
                            title: "Product Workshop",
                            slug: "product-workshop",
                            description: "Interactive 2-hour workshop with limited seats",
                            length: 120,
                            locations: [
                                {
                                    type: "inPerson",
                                    address: "123 Innovation Hub, San Francisco, CA",
                                    displayLocationPublicly: true
                                }
                            ],
                            requiresConfirmation: true,
                            price: 299,
                            currency: "usd",
                            slotInterval: null,
                            minimumBookingNotice: 10080,
                            beforeEventBuffer: 30,
                            afterEventBuffer: 15,
                            seatsPerTimeSlot: 10,
                            hosts: [
                                { userId: 54321, isFixed: true },
                                { userId: 54324, isFixed: true }
                            ]
                        }
                    ],
                    pagination: {
                        totalCount: 4,
                        pageCount: 1,
                        currentPage: 1,
                        perPage: 20
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_pagination_params",
                description: "Request with invalid pagination parameters",
                input: {
                    take: 200,
                    skip: -5
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid pagination parameters",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when listing event types",
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
        operationId: "listSchedules",
        provider: "cal-com",
        validCases: [
            {
                name: "list_user_schedules",
                description: "List all availability schedules for the user",
                input: {},
                expectedOutput: {
                    schedules: [
                        {
                            id: 1001,
                            name: "Default Working Hours",
                            isDefault: true,
                            timeZone: "America/New_York",
                            availability: [
                                {
                                    id: 5001,
                                    days: [1, 2, 3, 4, 5],
                                    startTime: "09:00:00",
                                    endTime: "12:00:00",
                                    date: null
                                },
                                {
                                    id: 5002,
                                    days: [1, 2, 3, 4, 5],
                                    startTime: "13:00:00",
                                    endTime: "17:00:00",
                                    date: null
                                }
                            ]
                        },
                        {
                            id: 1002,
                            name: "Extended Hours",
                            isDefault: false,
                            timeZone: "America/New_York",
                            availability: [
                                {
                                    id: 5003,
                                    days: [1, 2, 3, 4, 5],
                                    startTime: "07:00:00",
                                    endTime: "12:00:00",
                                    date: null
                                },
                                {
                                    id: 5004,
                                    days: [1, 2, 3, 4, 5],
                                    startTime: "13:00:00",
                                    endTime: "19:00:00",
                                    date: null
                                },
                                {
                                    id: 5005,
                                    days: [6],
                                    startTime: "10:00:00",
                                    endTime: "14:00:00",
                                    date: null
                                }
                            ]
                        },
                        {
                            id: 1003,
                            name: "Europe Hours",
                            isDefault: false,
                            timeZone: "Europe/London",
                            availability: [
                                {
                                    id: 5006,
                                    days: [1, 2, 3, 4, 5],
                                    startTime: "14:00:00",
                                    endTime: "22:00:00",
                                    date: null
                                }
                            ]
                        },
                        {
                            id: 1004,
                            name: "Holiday Schedule",
                            isDefault: false,
                            timeZone: "America/New_York",
                            availability: [
                                {
                                    id: 5007,
                                    days: [],
                                    startTime: "10:00:00",
                                    endTime: "14:00:00",
                                    date: "2025-12-24"
                                },
                                {
                                    id: 5008,
                                    days: [],
                                    startTime: "10:00:00",
                                    endTime: "14:00:00",
                                    date: "2025-12-31"
                                }
                            ]
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Invalid authentication when listing schedules",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Invalid or expired API key",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when listing schedules",
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
        operationId: "rescheduleBooking",
        provider: "cal-com",
        validCases: [
            {
                name: "reschedule_with_reason",
                description: "Reschedule a booking to a new time with a reason",
                input: {
                    uid: "bk_original123",
                    start: "2025-03-25T14:00:00Z",
                    rescheduledReason: "Client requested different time due to travel schedule"
                },
                expectedOutput: {
                    rescheduled: true,
                    id: 30001,
                    uid: "bk_rescheduled456",
                    title: "Consultation with John Doe",
                    startTime: "2025-03-25T14:00:00Z",
                    endTime: "2025-03-25T14:30:00Z",
                    status: "accepted",
                    location: "Google Meet",
                    meetingUrl: "https://meet.google.com/new-meet-link",
                    rescheduledFromUid: "bk_original123",
                    attendees: [
                        {
                            id: 5001,
                            email: "john.doe@client.com",
                            name: "John Doe",
                            timeZone: "America/New_York"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "booking_not_found",
                description: "Attempt to reschedule a non-existent booking",
                input: {
                    uid: "bk_nonexistent999",
                    start: "2025-03-25T14:00:00Z"
                },
                expectedError: {
                    type: "not_found",
                    message: "Booking not found",
                    retryable: false
                }
            },
            {
                name: "slot_not_available",
                description: "Attempt to reschedule to an unavailable time slot",
                input: {
                    uid: "bk_valid123",
                    start: "2025-03-20T10:00:00Z"
                },
                expectedError: {
                    type: "validation",
                    message: "Selected time slot is not available",
                    retryable: false
                }
            },
            {
                name: "cancelled_booking",
                description: "Attempt to reschedule a cancelled booking",
                input: {
                    uid: "bk_cancelled456",
                    start: "2025-03-25T14:00:00Z"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot reschedule a cancelled booking",
                    retryable: false
                }
            },
            {
                name: "past_start_time",
                description: "Attempt to reschedule to a time in the past",
                input: {
                    uid: "bk_valid123",
                    start: "2020-01-01T10:00:00Z"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot reschedule to a time in the past",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when rescheduling booking",
                input: {
                    uid: "bk_valid123",
                    start: "2025-04-01T10:00:00Z"
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
