/**
 * Calendly Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeCancelEvent, cancelEventSchema } from "../operations/cancelEvent";
import { executeGetAvailability, getAvailabilitySchema } from "../operations/getAvailability";
import { executeGetCurrentUser, getCurrentUserSchema } from "../operations/getCurrentUser";
import { executeGetEventType, getEventTypeSchema } from "../operations/getEventType";
import { executeGetScheduledEvent, getScheduledEventSchema } from "../operations/getScheduledEvent";
import { executeListEventInvitees, listEventInviteesSchema } from "../operations/listEventInvitees";
import { executeListEventTypes, listEventTypesSchema } from "../operations/listEventTypes";
import {
    executeListScheduledEvents,
    listScheduledEventsSchema
} from "../operations/listScheduledEvents";
import type { CalendlyClient } from "../client/CalendlyClient";

// Mock CalendlyClient factory
function createMockCalendlyClient(): jest.Mocked<CalendlyClient> {
    return {
        getCurrentUser: jest.fn(),
        listEventTypes: jest.fn(),
        getEventType: jest.fn(),
        listScheduledEvents: jest.fn(),
        getScheduledEvent: jest.fn(),
        listEventInvitees: jest.fn(),
        cancelEvent: jest.fn(),
        getAvailability: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<CalendlyClient>;
}

describe("Calendly Operation Executors", () => {
    let mockClient: jest.Mocked<CalendlyClient>;

    beforeEach(() => {
        mockClient = createMockCalendlyClient();
    });

    describe("executeGetCurrentUser", () => {
        it("calls client getCurrentUser", async () => {
            mockClient.getCurrentUser.mockResolvedValueOnce({
                resource: {
                    uri: "https://api.calendly.com/users/USER001ABC",
                    name: "Alex Chen",
                    slug: "alex-chen",
                    email: "alex.chen@company.com",
                    scheduling_url: "https://calendly.com/alex-chen",
                    timezone: "America/Los_Angeles",
                    avatar_url: "https://assets.calendly.com/avatars/user001.png",
                    current_organization: "https://api.calendly.com/organizations/ORG001ABC",
                    created_at: "2023-01-15T08:00:00.000Z",
                    updated_at: "2024-01-10T12:30:00.000Z"
                }
            });

            await executeGetCurrentUser(mockClient, {});

            expect(mockClient.getCurrentUser).toHaveBeenCalledTimes(1);
        });

        it("returns normalized output on success", async () => {
            mockClient.getCurrentUser.mockResolvedValueOnce({
                resource: {
                    uri: "https://api.calendly.com/users/USER001ABC",
                    name: "Alex Chen",
                    slug: "alex-chen",
                    email: "alex.chen@company.com",
                    scheduling_url: "https://calendly.com/alex-chen",
                    timezone: "America/Los_Angeles",
                    avatar_url: "https://assets.calendly.com/avatars/user001.png",
                    current_organization: "https://api.calendly.com/organizations/ORG001ABC",
                    created_at: "2023-01-15T08:00:00.000Z",
                    updated_at: "2024-01-10T12:30:00.000Z"
                }
            });

            const result = await executeGetCurrentUser(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
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
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getCurrentUser.mockRejectedValueOnce(
                new Error("Calendly authentication failed. Please reconnect.")
            );

            const result = await executeGetCurrentUser(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Calendly authentication failed. Please reconnect.");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getCurrentUser.mockRejectedValueOnce("unknown error");

            const result = await executeGetCurrentUser(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get current user");
        });
    });

    describe("executeGetEventType", () => {
        it("calls client with correct params", async () => {
            mockClient.getEventType.mockResolvedValueOnce({
                resource: {
                    uri: "https://api.calendly.com/event_types/EVTYPE001ABC",
                    name: "30 Minute Meeting",
                    active: true,
                    slug: "30-minute-meeting",
                    scheduling_url: "https://calendly.com/alex-chen/30-minute-meeting",
                    duration: 30,
                    kind: "solo",
                    pooling_type: null,
                    type: "StandardEventType",
                    color: "#0099CC",
                    created_at: "2023-06-15T10:00:00.000Z",
                    updated_at: "2024-01-05T14:30:00.000Z",
                    internal_note: "Standard intro call",
                    description_plain: "A quick 30-minute call to discuss your needs",
                    description_html: "<p>A quick 30-minute call to discuss your needs</p>",
                    profile: {
                        type: "User",
                        name: "Alex Chen",
                        owner: "https://api.calendly.com/users/USER001ABC"
                    },
                    secret: false,
                    deleted_at: null,
                    admin_managed: false,
                    custom_questions: []
                }
            });

            await executeGetEventType(mockClient, { uuid: "EVTYPE001ABC" });

            expect(mockClient.getEventType).toHaveBeenCalledWith("EVTYPE001ABC");
        });

        it("returns normalized output on success", async () => {
            mockClient.getEventType.mockResolvedValueOnce({
                resource: {
                    uri: "https://api.calendly.com/event_types/EVTYPE001ABC",
                    name: "30 Minute Meeting",
                    active: true,
                    slug: "30-minute-meeting",
                    scheduling_url: "https://calendly.com/alex-chen/30-minute-meeting",
                    duration: 30,
                    kind: "solo",
                    pooling_type: null,
                    type: "StandardEventType",
                    color: "#0099CC",
                    created_at: "2023-06-15T10:00:00.000Z",
                    updated_at: "2024-01-05T14:30:00.000Z",
                    internal_note: "Standard intro call",
                    description_plain: "A quick 30-minute call",
                    description_html: "<p>A quick 30-minute call</p>",
                    profile: {
                        type: "User",
                        name: "Alex Chen",
                        owner: "https://api.calendly.com/users/USER001ABC"
                    },
                    secret: false,
                    deleted_at: null,
                    admin_managed: false,
                    custom_questions: [
                        {
                            name: "What topics would you like to discuss?",
                            type: "text",
                            position: 0,
                            enabled: true,
                            required: false,
                            answer_choices: [],
                            include_other: false
                        }
                    ]
                }
            });

            const result = await executeGetEventType(mockClient, { uuid: "EVTYPE001ABC" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
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
                description: "A quick 30-minute call",
                descriptionHtml: "<p>A quick 30-minute call</p>",
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
                        answer_choices: [],
                        include_other: false
                    }
                ],
                createdAt: "2023-06-15T10:00:00.000Z",
                updatedAt: "2024-01-05T14:30:00.000Z"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getEventType.mockRejectedValueOnce(
                new Error("The requested resource was not found.")
            );

            const result = await executeGetEventType(mockClient, { uuid: "NONEXISTENT" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("The requested resource was not found.");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListEventTypes", () => {
        it("calls client with correct params", async () => {
            mockClient.listEventTypes.mockResolvedValueOnce({
                collection: [],
                pagination: {
                    count: 0,
                    next_page: null,
                    previous_page: null,
                    next_page_token: null
                }
            });

            await executeListEventTypes(mockClient, {
                user: "https://api.calendly.com/users/USER001ABC",
                active: true,
                count: 10
            });

            expect(mockClient.listEventTypes).toHaveBeenCalledWith({
                user: "https://api.calendly.com/users/USER001ABC",
                organization: undefined,
                count: 10,
                page_token: undefined,
                active: true
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listEventTypes.mockResolvedValueOnce({
                collection: [
                    {
                        uri: "https://api.calendly.com/event_types/EVTYPE001ABC",
                        name: "30 Minute Meeting",
                        active: true,
                        slug: "30-minute-meeting",
                        scheduling_url: "https://calendly.com/alex-chen/30-minute-meeting",
                        duration: 30,
                        kind: "solo",
                        pooling_type: null,
                        type: "StandardEventType",
                        color: "#0099CC",
                        created_at: "2023-06-15T10:00:00.000Z",
                        updated_at: "2024-01-05T14:30:00.000Z",
                        internal_note: null,
                        description_plain: "A quick call",
                        description_html: "<p>A quick call</p>",
                        profile: {
                            type: "User",
                            name: "Alex Chen",
                            owner: "https://api.calendly.com/users/USER001ABC"
                        },
                        secret: false,
                        deleted_at: null,
                        admin_managed: false,
                        custom_questions: []
                    }
                ],
                pagination: {
                    count: 1,
                    next_page: null,
                    previous_page: null,
                    next_page_token: "token123"
                }
            });

            const result = await executeListEventTypes(mockClient, {
                user: "https://api.calendly.com/users/USER001ABC"
            });

            expect(result.success).toBe(true);
            expect(result.data?.eventTypes).toHaveLength(1);
            expect(result.data?.eventTypes[0]).toEqual({
                uri: "https://api.calendly.com/event_types/EVTYPE001ABC",
                name: "30 Minute Meeting",
                active: true,
                slug: "30-minute-meeting",
                schedulingUrl: "https://calendly.com/alex-chen/30-minute-meeting",
                duration: 30,
                kind: "solo",
                type: "StandardEventType",
                color: "#0099CC",
                description: "A quick call",
                profile: {
                    type: "User",
                    name: "Alex Chen",
                    owner: "https://api.calendly.com/users/USER001ABC"
                },
                createdAt: "2023-06-15T10:00:00.000Z",
                updatedAt: "2024-01-05T14:30:00.000Z"
            });
            expect(result.data?.pagination).toEqual({
                count: 1,
                nextPageToken: "token123"
            });
        });

        it("handles empty collection", async () => {
            mockClient.listEventTypes.mockResolvedValueOnce({
                collection: [],
                pagination: {
                    count: 0,
                    next_page: null,
                    previous_page: null,
                    next_page_token: null
                }
            });

            const result = await executeListEventTypes(mockClient, {
                user: "https://api.calendly.com/users/USER001ABC"
            });

            expect(result.success).toBe(true);
            expect(result.data?.eventTypes).toHaveLength(0);
        });

        it("returns error on client failure", async () => {
            mockClient.listEventTypes.mockRejectedValueOnce(new Error("Rate limited"));

            const result = await executeListEventTypes(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Rate limited");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetScheduledEvent", () => {
        it("calls client with correct params", async () => {
            mockClient.getScheduledEvent.mockResolvedValueOnce({
                resource: {
                    uri: "https://api.calendly.com/scheduled_events/evt_abc123",
                    name: "30 Minute Meeting",
                    status: "active",
                    start_time: "2024-01-15T10:00:00.000Z",
                    end_time: "2024-01-15T10:30:00.000Z",
                    event_type: "https://api.calendly.com/event_types/EVTYPE001ABC",
                    location: {
                        type: "zoom",
                        join_url: "https://zoom.us/j/123456789",
                        status: "pushed"
                    },
                    invitees_counter: { total: 1, active: 1, limit: 1 },
                    created_at: "2024-01-10T14:30:00.000Z",
                    updated_at: "2024-01-10T14:30:00.000Z",
                    event_memberships: [{ user: "https://api.calendly.com/users/USER001ABC" }],
                    event_guests: []
                }
            });

            await executeGetScheduledEvent(mockClient, { uuid: "evt_abc123" });

            expect(mockClient.getScheduledEvent).toHaveBeenCalledWith("evt_abc123");
        });

        it("returns normalized output on success", async () => {
            mockClient.getScheduledEvent.mockResolvedValueOnce({
                resource: {
                    uri: "https://api.calendly.com/scheduled_events/evt_abc123",
                    name: "30 Minute Meeting",
                    status: "active",
                    start_time: "2024-01-15T10:00:00.000Z",
                    end_time: "2024-01-15T10:30:00.000Z",
                    event_type: "https://api.calendly.com/event_types/EVTYPE001ABC",
                    location: {
                        type: "zoom",
                        join_url: "https://zoom.us/j/123456789",
                        status: "pushed"
                    },
                    invitees_counter: { total: 1, active: 1, limit: 1 },
                    created_at: "2024-01-10T14:30:00.000Z",
                    updated_at: "2024-01-10T14:30:00.000Z",
                    event_memberships: [{ user: "https://api.calendly.com/users/USER001ABC" }],
                    event_guests: []
                }
            });

            const result = await executeGetScheduledEvent(mockClient, { uuid: "evt_abc123" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                uri: "https://api.calendly.com/scheduled_events/evt_abc123",
                name: "30 Minute Meeting",
                status: "active",
                startTime: "2024-01-15T10:00:00.000Z",
                endTime: "2024-01-15T10:30:00.000Z",
                eventType: "https://api.calendly.com/event_types/EVTYPE001ABC",
                location: {
                    type: "zoom",
                    join_url: "https://zoom.us/j/123456789",
                    status: "pushed"
                },
                inviteesCounter: { total: 1, active: 1, limit: 1 },
                eventMemberships: [{ user: "https://api.calendly.com/users/USER001ABC" }],
                eventGuests: [],
                cancellation: null,
                createdAt: "2024-01-10T14:30:00.000Z",
                updatedAt: "2024-01-10T14:30:00.000Z"
            });
        });

        it("returns normalized output for canceled event", async () => {
            mockClient.getScheduledEvent.mockResolvedValueOnce({
                resource: {
                    uri: "https://api.calendly.com/scheduled_events/evt_canceled",
                    name: "15 Minute Check-in",
                    status: "canceled",
                    start_time: "2024-01-14T09:00:00.000Z",
                    end_time: "2024-01-14T09:15:00.000Z",
                    event_type: "https://api.calendly.com/event_types/EVTYPE004JKL",
                    location: null,
                    invitees_counter: { total: 1, active: 0, limit: 1 },
                    created_at: "2024-01-08T10:00:00.000Z",
                    updated_at: "2024-01-13T18:00:00.000Z",
                    event_memberships: [{ user: "https://api.calendly.com/users/USER001ABC" }],
                    event_guests: [],
                    cancellation: {
                        canceled_by: "Sarah Johnson",
                        reason: "Schedule conflict",
                        canceler_type: "invitee",
                        created_at: "2024-01-13T18:00:00.000Z"
                    }
                }
            });

            const result = await executeGetScheduledEvent(mockClient, { uuid: "evt_canceled" });

            expect(result.success).toBe(true);
            expect(result.data?.status).toBe("canceled");
            expect(result.data?.cancellation).toEqual({
                canceledBy: "Sarah Johnson",
                reason: "Schedule conflict",
                cancelerType: "invitee",
                createdAt: "2024-01-13T18:00:00.000Z"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getScheduledEvent.mockRejectedValueOnce(
                new Error("The requested resource was not found.")
            );

            const result = await executeGetScheduledEvent(mockClient, { uuid: "NONEXISTENT" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("The requested resource was not found.");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListScheduledEvents", () => {
        it("calls client with correct params", async () => {
            mockClient.listScheduledEvents.mockResolvedValueOnce({
                collection: [],
                pagination: {
                    count: 0,
                    next_page: null,
                    previous_page: null,
                    next_page_token: null
                }
            });

            await executeListScheduledEvents(mockClient, {
                user: "https://api.calendly.com/users/USER001ABC",
                status: "active",
                minStartTime: "2024-01-15T00:00:00Z",
                maxStartTime: "2024-01-20T00:00:00Z",
                count: 10
            });

            expect(mockClient.listScheduledEvents).toHaveBeenCalledWith({
                user: "https://api.calendly.com/users/USER001ABC",
                organization: undefined,
                min_start_time: "2024-01-15T00:00:00Z",
                max_start_time: "2024-01-20T00:00:00Z",
                status: "active",
                count: 10,
                page_token: undefined,
                invitee_email: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listScheduledEvents.mockResolvedValueOnce({
                collection: [
                    {
                        uri: "https://api.calendly.com/scheduled_events/evt_abc123",
                        name: "30 Minute Meeting",
                        status: "active",
                        start_time: "2024-01-15T10:00:00.000Z",
                        end_time: "2024-01-15T10:30:00.000Z",
                        event_type: "https://api.calendly.com/event_types/EVTYPE001ABC",
                        location: {
                            type: "zoom",
                            join_url: "https://zoom.us/j/123456789",
                            status: "pushed"
                        },
                        invitees_counter: { total: 1, active: 1, limit: 1 },
                        created_at: "2024-01-10T14:30:00.000Z",
                        updated_at: "2024-01-10T14:30:00.000Z",
                        event_memberships: [{ user: "https://api.calendly.com/users/USER001ABC" }],
                        event_guests: []
                    }
                ],
                pagination: {
                    count: 1,
                    next_page: null,
                    previous_page: null,
                    next_page_token: "token456"
                }
            });

            const result = await executeListScheduledEvents(mockClient, {
                user: "https://api.calendly.com/users/USER001ABC"
            });

            expect(result.success).toBe(true);
            expect(result.data?.events).toHaveLength(1);
            expect(result.data?.events[0]).toEqual({
                uri: "https://api.calendly.com/scheduled_events/evt_abc123",
                name: "30 Minute Meeting",
                status: "active",
                startTime: "2024-01-15T10:00:00.000Z",
                endTime: "2024-01-15T10:30:00.000Z",
                eventType: "https://api.calendly.com/event_types/EVTYPE001ABC",
                location: {
                    type: "zoom",
                    join_url: "https://zoom.us/j/123456789",
                    status: "pushed"
                },
                inviteesCounter: { total: 1, active: 1, limit: 1 },
                eventMemberships: [{ user: "https://api.calendly.com/users/USER001ABC" }],
                eventGuests: [],
                cancellation: null,
                createdAt: "2024-01-10T14:30:00.000Z",
                updatedAt: "2024-01-10T14:30:00.000Z"
            });
            expect(result.data?.pagination).toEqual({
                count: 1,
                nextPageToken: "token456"
            });
        });

        it("filters by invitee email", async () => {
            mockClient.listScheduledEvents.mockResolvedValueOnce({
                collection: [],
                pagination: {
                    count: 0,
                    next_page: null,
                    previous_page: null,
                    next_page_token: null
                }
            });

            await executeListScheduledEvents(mockClient, {
                user: "https://api.calendly.com/users/USER001ABC",
                inviteeEmail: "sarah@example.com"
            });

            expect(mockClient.listScheduledEvents).toHaveBeenCalledWith({
                user: "https://api.calendly.com/users/USER001ABC",
                organization: undefined,
                min_start_time: undefined,
                max_start_time: undefined,
                status: undefined,
                count: undefined,
                page_token: undefined,
                invitee_email: "sarah@example.com"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listScheduledEvents.mockRejectedValueOnce(new Error("Rate limited"));

            const result = await executeListScheduledEvents(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Rate limited");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListEventInvitees", () => {
        it("calls client with correct params", async () => {
            mockClient.listEventInvitees.mockResolvedValueOnce({
                collection: [],
                pagination: {
                    count: 0,
                    next_page: null,
                    previous_page: null,
                    next_page_token: null
                }
            });

            await executeListEventInvitees(mockClient, {
                eventUuid: "evt_abc123",
                status: "active",
                count: 10
            });

            expect(mockClient.listEventInvitees).toHaveBeenCalledWith("evt_abc123", {
                status: "active",
                count: 10,
                page_token: undefined,
                email: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listEventInvitees.mockResolvedValueOnce({
                collection: [
                    {
                        uri: "https://api.calendly.com/scheduled_events/evt_abc123/invitees/inv_001",
                        email: "sarah.johnson@techcorp.com",
                        name: "Sarah Johnson",
                        status: "active",
                        questions_and_answers: [
                            {
                                question: "What topics would you like to discuss?",
                                answer: "Product pricing",
                                position: 0
                            }
                        ],
                        timezone: "America/New_York",
                        created_at: "2024-01-10T14:30:00.000Z",
                        updated_at: "2024-01-10T14:30:00.000Z",
                        tracking: {
                            utm_campaign: "q1-outreach",
                            utm_source: "linkedin",
                            utm_medium: "paid",
                            utm_content: "enterprise-ad",
                            utm_term: "scheduling software",
                            salesforce_uuid: null
                        },
                        text_reminder_number: "+1-555-0123",
                        rescheduled: false,
                        old_invitee: null,
                        new_invitee: null,
                        cancel_url: "https://calendly.com/cancellations/inv_001",
                        reschedule_url: "https://calendly.com/reschedulings/inv_001"
                    }
                ],
                pagination: {
                    count: 1,
                    next_page: null,
                    previous_page: null,
                    next_page_token: null
                }
            });

            const result = await executeListEventInvitees(mockClient, {
                eventUuid: "evt_abc123"
            });

            expect(result.success).toBe(true);
            expect(result.data?.invitees).toHaveLength(1);
            expect(result.data?.invitees[0]).toEqual({
                uri: "https://api.calendly.com/scheduled_events/evt_abc123/invitees/inv_001",
                email: "sarah.johnson@techcorp.com",
                name: "Sarah Johnson",
                status: "active",
                questionsAndAnswers: [
                    {
                        question: "What topics would you like to discuss?",
                        answer: "Product pricing",
                        position: 0
                    }
                ],
                timezone: "America/New_York",
                tracking: {
                    utm_campaign: "q1-outreach",
                    utm_source: "linkedin",
                    utm_medium: "paid",
                    utm_content: "enterprise-ad",
                    utm_term: "scheduling software",
                    salesforce_uuid: null
                },
                textReminderNumber: "+1-555-0123",
                rescheduled: false,
                oldInvitee: null,
                newInvitee: null,
                cancelUrl: "https://calendly.com/cancellations/inv_001",
                rescheduleUrl: "https://calendly.com/reschedulings/inv_001",
                cancellation: null,
                createdAt: "2024-01-10T14:30:00.000Z",
                updatedAt: "2024-01-10T14:30:00.000Z"
            });
        });

        it("returns invitee with cancellation info", async () => {
            mockClient.listEventInvitees.mockResolvedValueOnce({
                collection: [
                    {
                        uri: "https://api.calendly.com/scheduled_events/evt_canceled/invitees/inv_004",
                        email: "robert.wilson@enterprise.com",
                        name: "Robert Wilson",
                        status: "canceled",
                        questions_and_answers: [],
                        timezone: "Europe/London",
                        created_at: "2024-01-08T10:00:00.000Z",
                        updated_at: "2024-01-13T18:00:00.000Z",
                        tracking: {
                            utm_campaign: null,
                            utm_source: null,
                            utm_medium: null,
                            utm_content: null,
                            utm_term: null,
                            salesforce_uuid: null
                        },
                        text_reminder_number: null,
                        rescheduled: false,
                        old_invitee: null,
                        new_invitee: null,
                        cancel_url: "https://calendly.com/cancellations/inv_004",
                        reschedule_url: "https://calendly.com/reschedulings/inv_004",
                        cancellation: {
                            canceled_by: "Robert Wilson",
                            reason: "Schedule conflict",
                            canceler_type: "invitee",
                            created_at: "2024-01-13T18:00:00.000Z"
                        }
                    }
                ],
                pagination: {
                    count: 1,
                    next_page: null,
                    previous_page: null,
                    next_page_token: null
                }
            });

            const result = await executeListEventInvitees(mockClient, {
                eventUuid: "evt_canceled",
                status: "canceled"
            });

            expect(result.success).toBe(true);
            expect(result.data?.invitees[0].cancellation).toEqual({
                canceledBy: "Robert Wilson",
                reason: "Schedule conflict",
                cancelerType: "invitee",
                createdAt: "2024-01-13T18:00:00.000Z"
            });
        });

        it("filters by email address", async () => {
            mockClient.listEventInvitees.mockResolvedValueOnce({
                collection: [],
                pagination: {
                    count: 0,
                    next_page: null,
                    previous_page: null,
                    next_page_token: null
                }
            });

            await executeListEventInvitees(mockClient, {
                eventUuid: "evt_abc123",
                email: "sarah@example.com"
            });

            expect(mockClient.listEventInvitees).toHaveBeenCalledWith("evt_abc123", {
                status: undefined,
                count: undefined,
                page_token: undefined,
                email: "sarah@example.com"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listEventInvitees.mockRejectedValueOnce(
                new Error("The requested resource was not found.")
            );

            const result = await executeListEventInvitees(mockClient, {
                eventUuid: "NONEXISTENT"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("The requested resource was not found.");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeCancelEvent", () => {
        it("calls client with correct params", async () => {
            mockClient.cancelEvent.mockResolvedValueOnce({ resource: null });

            await executeCancelEvent(mockClient, {
                uuid: "evt_abc123",
                reason: "Meeting no longer needed"
            });

            expect(mockClient.cancelEvent).toHaveBeenCalledWith(
                "evt_abc123",
                "Meeting no longer needed"
            );
        });

        it("returns normalized output on success with reason", async () => {
            mockClient.cancelEvent.mockResolvedValueOnce({ resource: null });

            const result = await executeCancelEvent(mockClient, {
                uuid: "evt_abc123",
                reason: "Meeting no longer needed"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                canceled: true,
                eventUuid: "evt_abc123",
                reason: "Meeting no longer needed"
            });
        });

        it("returns normalized output on success without reason", async () => {
            mockClient.cancelEvent.mockResolvedValueOnce({ resource: null });

            const result = await executeCancelEvent(mockClient, {
                uuid: "evt_def456"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                canceled: true,
                eventUuid: "evt_def456",
                reason: null
            });
        });

        it("returns error on client failure", async () => {
            mockClient.cancelEvent.mockRejectedValueOnce(
                new Error("The requested resource was not found.")
            );

            const result = await executeCancelEvent(mockClient, {
                uuid: "NONEXISTENT",
                reason: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("The requested resource was not found.");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.cancelEvent.mockRejectedValueOnce("unknown error");

            const result = await executeCancelEvent(mockClient, { uuid: "evt_abc123" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to cancel event");
        });
    });

    describe("executeGetAvailability", () => {
        it("calls client with correct params", async () => {
            mockClient.getAvailability.mockResolvedValueOnce({
                collection: [],
                pagination: {
                    count: 0,
                    next_page: null,
                    previous_page: null,
                    next_page_token: null
                }
            });

            await executeGetAvailability(mockClient, {
                eventType: "https://api.calendly.com/event_types/EVTYPE001ABC",
                startTime: "2024-01-15T00:00:00Z",
                endTime: "2024-01-22T00:00:00Z"
            });

            expect(mockClient.getAvailability).toHaveBeenCalledWith({
                event_type: "https://api.calendly.com/event_types/EVTYPE001ABC",
                start_time: "2024-01-15T00:00:00Z",
                end_time: "2024-01-22T00:00:00Z"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.getAvailability.mockResolvedValueOnce({
                collection: [
                    {
                        status: "available",
                        invitees_remaining: 1,
                        start_time: "2024-01-15T14:00:00.000Z",
                        scheduling_url:
                            "https://calendly.com/alex-chen/30-minute-meeting?month=2024-01&date=2024-01-15&time=14:00"
                    },
                    {
                        status: "available",
                        invitees_remaining: 1,
                        start_time: "2024-01-15T14:30:00.000Z",
                        scheduling_url:
                            "https://calendly.com/alex-chen/30-minute-meeting?month=2024-01&date=2024-01-15&time=14:30"
                    }
                ],
                pagination: {
                    count: 2,
                    next_page: null,
                    previous_page: null,
                    next_page_token: null
                }
            });

            const result = await executeGetAvailability(mockClient, {
                eventType: "https://api.calendly.com/event_types/EVTYPE001ABC",
                startTime: "2024-01-15T00:00:00Z",
                endTime: "2024-01-16T00:00:00Z"
            });

            expect(result.success).toBe(true);
            expect(result.data?.availableTimes).toHaveLength(2);
            expect(result.data?.availableTimes[0]).toEqual({
                status: "available",
                inviteesRemaining: 1,
                startTime: "2024-01-15T14:00:00.000Z",
                schedulingUrl:
                    "https://calendly.com/alex-chen/30-minute-meeting?month=2024-01&date=2024-01-15&time=14:00"
            });
        });

        it("returns empty availability when fully booked", async () => {
            mockClient.getAvailability.mockResolvedValueOnce({
                collection: [],
                pagination: {
                    count: 0,
                    next_page: null,
                    previous_page: null,
                    next_page_token: null
                }
            });

            const result = await executeGetAvailability(mockClient, {
                eventType: "https://api.calendly.com/event_types/EVTYPE001ABC",
                startTime: "2024-01-13T00:00:00Z",
                endTime: "2024-01-14T00:00:00Z"
            });

            expect(result.success).toBe(true);
            expect(result.data?.availableTimes).toHaveLength(0);
        });

        it("returns error on client failure", async () => {
            mockClient.getAvailability.mockRejectedValueOnce(
                new Error("The requested resource was not found.")
            );

            const result = await executeGetAvailability(mockClient, {
                eventType: "https://api.calendly.com/event_types/NONEXISTENT",
                startTime: "2024-01-15T00:00:00Z",
                endTime: "2024-01-22T00:00:00Z"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("The requested resource was not found.");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getAvailability.mockRejectedValueOnce("unknown error");

            const result = await executeGetAvailability(mockClient, {
                eventType: "https://api.calendly.com/event_types/EVTYPE001ABC",
                startTime: "2024-01-15T00:00:00Z",
                endTime: "2024-01-22T00:00:00Z"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get availability");
        });
    });

    describe("schema validation", () => {
        describe("getCurrentUserSchema", () => {
            it("validates empty input (no params required)", () => {
                const result = getCurrentUserSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("getEventTypeSchema", () => {
            it("validates valid uuid", () => {
                const result = getEventTypeSchema.safeParse({
                    uuid: "EVTYPE001ABC"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing uuid", () => {
                const result = getEventTypeSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listEventTypesSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listEventTypesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with user", () => {
                const result = listEventTypesSchema.safeParse({
                    user: "https://api.calendly.com/users/USER001ABC"
                });
                expect(result.success).toBe(true);
            });

            it("validates with organization", () => {
                const result = listEventTypesSchema.safeParse({
                    organization: "https://api.calendly.com/organizations/ORG001ABC"
                });
                expect(result.success).toBe(true);
            });

            it("validates with count", () => {
                const result = listEventTypesSchema.safeParse({
                    user: "https://api.calendly.com/users/USER001ABC",
                    count: 50
                });
                expect(result.success).toBe(true);
            });

            it("rejects count above 100", () => {
                const result = listEventTypesSchema.safeParse({
                    count: 101
                });
                expect(result.success).toBe(false);
            });

            it("rejects count below 1", () => {
                const result = listEventTypesSchema.safeParse({
                    count: 0
                });
                expect(result.success).toBe(false);
            });

            it("validates with active filter", () => {
                const result = listEventTypesSchema.safeParse({
                    user: "https://api.calendly.com/users/USER001ABC",
                    active: true
                });
                expect(result.success).toBe(true);
            });

            it("validates with pageToken", () => {
                const result = listEventTypesSchema.safeParse({
                    user: "https://api.calendly.com/users/USER001ABC",
                    pageToken: "token123"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("getScheduledEventSchema", () => {
            it("validates valid uuid", () => {
                const result = getScheduledEventSchema.safeParse({
                    uuid: "evt_abc123def456"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing uuid", () => {
                const result = getScheduledEventSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listScheduledEventsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listScheduledEventsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with user", () => {
                const result = listScheduledEventsSchema.safeParse({
                    user: "https://api.calendly.com/users/USER001ABC"
                });
                expect(result.success).toBe(true);
            });

            it("validates with status filter", () => {
                const result = listScheduledEventsSchema.safeParse({
                    user: "https://api.calendly.com/users/USER001ABC",
                    status: "active"
                });
                expect(result.success).toBe(true);
            });

            it("validates with canceled status", () => {
                const result = listScheduledEventsSchema.safeParse({
                    status: "canceled"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid status", () => {
                const result = listScheduledEventsSchema.safeParse({
                    status: "invalid"
                });
                expect(result.success).toBe(false);
            });

            it("validates with date range", () => {
                const result = listScheduledEventsSchema.safeParse({
                    user: "https://api.calendly.com/users/USER001ABC",
                    minStartTime: "2024-01-15T00:00:00Z",
                    maxStartTime: "2024-01-20T00:00:00Z"
                });
                expect(result.success).toBe(true);
            });

            it("validates with inviteeEmail", () => {
                const result = listScheduledEventsSchema.safeParse({
                    user: "https://api.calendly.com/users/USER001ABC",
                    inviteeEmail: "test@example.com"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid email format", () => {
                const result = listScheduledEventsSchema.safeParse({
                    inviteeEmail: "not-an-email"
                });
                expect(result.success).toBe(false);
            });

            it("rejects count above 100", () => {
                const result = listScheduledEventsSchema.safeParse({
                    count: 101
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listEventInviteesSchema", () => {
            it("validates minimal input", () => {
                const result = listEventInviteesSchema.safeParse({
                    eventUuid: "evt_abc123def456"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing eventUuid", () => {
                const result = listEventInviteesSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("validates with status filter", () => {
                const result = listEventInviteesSchema.safeParse({
                    eventUuid: "evt_abc123def456",
                    status: "active"
                });
                expect(result.success).toBe(true);
            });

            it("validates with canceled status", () => {
                const result = listEventInviteesSchema.safeParse({
                    eventUuid: "evt_abc123def456",
                    status: "canceled"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid status", () => {
                const result = listEventInviteesSchema.safeParse({
                    eventUuid: "evt_abc123def456",
                    status: "pending"
                });
                expect(result.success).toBe(false);
            });

            it("validates with email filter", () => {
                const result = listEventInviteesSchema.safeParse({
                    eventUuid: "evt_abc123def456",
                    email: "test@example.com"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid email format", () => {
                const result = listEventInviteesSchema.safeParse({
                    eventUuid: "evt_abc123def456",
                    email: "not-an-email"
                });
                expect(result.success).toBe(false);
            });

            it("validates with count", () => {
                const result = listEventInviteesSchema.safeParse({
                    eventUuid: "evt_abc123def456",
                    count: 50
                });
                expect(result.success).toBe(true);
            });

            it("rejects count above 100", () => {
                const result = listEventInviteesSchema.safeParse({
                    eventUuid: "evt_abc123def456",
                    count: 101
                });
                expect(result.success).toBe(false);
            });

            it("rejects count below 1", () => {
                const result = listEventInviteesSchema.safeParse({
                    eventUuid: "evt_abc123def456",
                    count: 0
                });
                expect(result.success).toBe(false);
            });

            it("validates with pageToken", () => {
                const result = listEventInviteesSchema.safeParse({
                    eventUuid: "evt_abc123def456",
                    pageToken: "token123"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("cancelEventSchema", () => {
            it("validates minimal input", () => {
                const result = cancelEventSchema.safeParse({
                    uuid: "evt_abc123def456"
                });
                expect(result.success).toBe(true);
            });

            it("validates with reason", () => {
                const result = cancelEventSchema.safeParse({
                    uuid: "evt_abc123def456",
                    reason: "Meeting no longer needed"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing uuid", () => {
                const result = cancelEventSchema.safeParse({
                    reason: "Some reason"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getAvailabilitySchema", () => {
            it("validates valid input", () => {
                const result = getAvailabilitySchema.safeParse({
                    eventType: "https://api.calendly.com/event_types/EVTYPE001ABC",
                    startTime: "2024-01-15T00:00:00Z",
                    endTime: "2024-01-22T00:00:00Z"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing eventType", () => {
                const result = getAvailabilitySchema.safeParse({
                    startTime: "2024-01-15T00:00:00Z",
                    endTime: "2024-01-22T00:00:00Z"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing startTime", () => {
                const result = getAvailabilitySchema.safeParse({
                    eventType: "https://api.calendly.com/event_types/EVTYPE001ABC",
                    endTime: "2024-01-22T00:00:00Z"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing endTime", () => {
                const result = getAvailabilitySchema.safeParse({
                    eventType: "https://api.calendly.com/event_types/EVTYPE001ABC",
                    startTime: "2024-01-15T00:00:00Z"
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
