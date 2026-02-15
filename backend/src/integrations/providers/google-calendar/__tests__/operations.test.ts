/**
 * GoogleCalendar Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import {
    executeListEvents,
    listEventsSchema,
    executeGetEvent,
    getEventSchema,
    executeCreateEvent,
    createEventSchema,
    executeUpdateEvent,
    updateEventSchema,
    executeDeleteEvent,
    deleteEventSchema,
    executeQuickAdd,
    quickAddSchema,
    executeListCalendars,
    listCalendarsSchema,
    executeGetCalendar,
    getCalendarSchema,
    executeCreateCalendar,
    createCalendarSchema,
    executeGetFreeBusy,
    getFreeBusySchema
} from "../operations";
import type { GoogleCalendarClient } from "../client/GoogleCalendarClient";

// Mock GoogleCalendarClient factory
function createMockGoogleCalendarClient(): jest.Mocked<GoogleCalendarClient> {
    return {
        listEvents: jest.fn(),
        getEvent: jest.fn(),
        createEvent: jest.fn(),
        updateEvent: jest.fn(),
        patchEvent: jest.fn(),
        deleteEvent: jest.fn(),
        quickAdd: jest.fn(),
        listCalendars: jest.fn(),
        getCalendar: jest.fn(),
        createCalendar: jest.fn(),
        getFreeBusy: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<GoogleCalendarClient>;
}

describe("GoogleCalendar Operation Executors", () => {
    let mockClient: jest.Mocked<GoogleCalendarClient>;

    beforeEach(() => {
        mockClient = createMockGoogleCalendarClient();
    });

    describe("executeListEvents", () => {
        it("calls client with correct params", async () => {
            mockClient.listEvents.mockResolvedValueOnce({
                kind: "calendar#events",
                items: []
            });

            await executeListEvents(mockClient, {
                calendarId: "primary",
                timeMin: "2024-01-01T00:00:00Z",
                timeMax: "2024-01-31T23:59:59Z"
            });

            expect(mockClient.listEvents).toHaveBeenCalledWith({
                calendarId: "primary",
                timeMin: "2024-01-01T00:00:00Z",
                timeMax: "2024-01-31T23:59:59Z"
            });
        });

        it("returns normalized output on success", async () => {
            const mockEvents = {
                kind: "calendar#events",
                items: [
                    {
                        id: "event123",
                        summary: "Team Meeting",
                        start: { dateTime: "2024-01-15T10:00:00Z" },
                        end: { dateTime: "2024-01-15T11:00:00Z" }
                    }
                ],
                nextPageToken: "token123"
            };

            mockClient.listEvents.mockResolvedValueOnce(mockEvents);

            const result = await executeListEvents(mockClient, {
                calendarId: "primary"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockEvents);
        });

        it("passes optional params", async () => {
            mockClient.listEvents.mockResolvedValueOnce({
                kind: "calendar#events",
                items: []
            });

            await executeListEvents(mockClient, {
                calendarId: "work@group.calendar.google.com",
                maxResults: 50,
                orderBy: "startTime",
                q: "meeting",
                singleEvents: true
            });

            expect(mockClient.listEvents).toHaveBeenCalledWith({
                calendarId: "work@group.calendar.google.com",
                maxResults: 50,
                orderBy: "startTime",
                q: "meeting",
                singleEvents: true
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listEvents.mockRejectedValueOnce(new Error("Calendar not found"));

            const result = await executeListEvents(mockClient, {
                calendarId: "nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Calendar not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listEvents.mockRejectedValueOnce("string error");

            const result = await executeListEvents(mockClient, {
                calendarId: "primary"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list events");
        });
    });

    describe("executeGetEvent", () => {
        it("calls client with correct params", async () => {
            mockClient.getEvent.mockResolvedValueOnce({
                id: "event123",
                summary: "Team Meeting"
            });

            await executeGetEvent(mockClient, {
                calendarId: "primary",
                eventId: "event123"
            });

            expect(mockClient.getEvent).toHaveBeenCalledWith("primary", "event123");
        });

        it("returns normalized output on success", async () => {
            const mockEvent = {
                id: "event123",
                summary: "Team Meeting",
                description: "Weekly sync",
                location: "Conference Room A",
                start: { dateTime: "2024-01-15T10:00:00Z" },
                end: { dateTime: "2024-01-15T11:00:00Z" },
                attendees: [{ email: "user@example.com", responseStatus: "accepted" }]
            };

            mockClient.getEvent.mockResolvedValueOnce(mockEvent);

            const result = await executeGetEvent(mockClient, {
                calendarId: "primary",
                eventId: "event123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockEvent);
        });

        it("returns error on client failure", async () => {
            mockClient.getEvent.mockRejectedValueOnce(new Error("Event not found"));

            const result = await executeGetEvent(mockClient, {
                calendarId: "primary",
                eventId: "nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Event not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getEvent.mockRejectedValueOnce("string error");

            const result = await executeGetEvent(mockClient, {
                calendarId: "primary",
                eventId: "event123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get event");
        });
    });

    describe("executeCreateEvent", () => {
        it("calls client with correct params", async () => {
            mockClient.createEvent.mockResolvedValueOnce({
                id: "newEvent123",
                summary: "New Meeting"
            });

            await executeCreateEvent(mockClient, {
                calendarId: "primary",
                summary: "New Meeting",
                start: { dateTime: "2024-01-20T14:00:00Z" },
                end: { dateTime: "2024-01-20T15:00:00Z" }
            });

            expect(mockClient.createEvent).toHaveBeenCalledWith("primary", {
                summary: "New Meeting",
                start: { dateTime: "2024-01-20T14:00:00Z" },
                end: { dateTime: "2024-01-20T15:00:00Z" }
            });
        });

        it("returns normalized output on success", async () => {
            const mockEvent = {
                id: "newEvent123",
                summary: "New Meeting",
                htmlLink: "https://calendar.google.com/event?eid=newEvent123",
                start: { dateTime: "2024-01-20T14:00:00Z" },
                end: { dateTime: "2024-01-20T15:00:00Z" }
            };

            mockClient.createEvent.mockResolvedValueOnce(mockEvent);

            const result = await executeCreateEvent(mockClient, {
                calendarId: "primary",
                summary: "New Meeting",
                start: { dateTime: "2024-01-20T14:00:00Z" },
                end: { dateTime: "2024-01-20T15:00:00Z" }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockEvent);
        });

        it("passes all optional fields", async () => {
            mockClient.createEvent.mockResolvedValueOnce({
                id: "newEvent123",
                summary: "Full Meeting"
            });

            await executeCreateEvent(mockClient, {
                calendarId: "work@group.calendar.google.com",
                summary: "Full Meeting",
                description: "Important discussion",
                location: "Board Room",
                start: { dateTime: "2024-01-20T14:00:00-07:00", timeZone: "America/Los_Angeles" },
                end: { dateTime: "2024-01-20T15:00:00-07:00", timeZone: "America/Los_Angeles" },
                attendees: [
                    { email: "alice@example.com", displayName: "Alice", optional: false },
                    { email: "bob@example.com", optional: true }
                ],
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: "email", minutes: 60 },
                        { method: "popup", minutes: 10 }
                    ]
                }
            });

            expect(mockClient.createEvent).toHaveBeenCalledWith("work@group.calendar.google.com", {
                summary: "Full Meeting",
                description: "Important discussion",
                location: "Board Room",
                start: { dateTime: "2024-01-20T14:00:00-07:00", timeZone: "America/Los_Angeles" },
                end: { dateTime: "2024-01-20T15:00:00-07:00", timeZone: "America/Los_Angeles" },
                attendees: [
                    { email: "alice@example.com", displayName: "Alice", optional: false },
                    { email: "bob@example.com", optional: true }
                ],
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: "email", minutes: 60 },
                        { method: "popup", minutes: 10 }
                    ]
                }
            });
        });

        it("creates all-day event with date format", async () => {
            mockClient.createEvent.mockResolvedValueOnce({
                id: "allDayEvent",
                summary: "Holiday"
            });

            await executeCreateEvent(mockClient, {
                calendarId: "primary",
                summary: "Holiday",
                start: { date: "2024-12-25" },
                end: { date: "2024-12-26" }
            });

            expect(mockClient.createEvent).toHaveBeenCalledWith("primary", {
                summary: "Holiday",
                start: { date: "2024-12-25" },
                end: { date: "2024-12-26" }
            });
        });

        it("returns error on client failure", async () => {
            mockClient.createEvent.mockRejectedValueOnce(new Error("Quota exceeded"));

            const result = await executeCreateEvent(mockClient, {
                calendarId: "primary",
                summary: "Meeting",
                start: { dateTime: "2024-01-20T14:00:00Z" },
                end: { dateTime: "2024-01-20T15:00:00Z" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Quota exceeded");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createEvent.mockRejectedValueOnce("string error");

            const result = await executeCreateEvent(mockClient, {
                calendarId: "primary",
                summary: "Meeting",
                start: { dateTime: "2024-01-20T14:00:00Z" },
                end: { dateTime: "2024-01-20T15:00:00Z" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create event");
        });
    });

    describe("executeUpdateEvent", () => {
        it("calls client with correct params", async () => {
            mockClient.patchEvent.mockResolvedValueOnce({
                id: "event123",
                summary: "Updated Meeting"
            });

            await executeUpdateEvent(mockClient, {
                calendarId: "primary",
                eventId: "event123",
                summary: "Updated Meeting"
            });

            expect(mockClient.patchEvent).toHaveBeenCalledWith("primary", "event123", {
                summary: "Updated Meeting"
            });
        });

        it("returns normalized output on success", async () => {
            const mockEvent = {
                id: "event123",
                summary: "Updated Meeting",
                updated: "2024-01-15T12:00:00Z"
            };

            mockClient.patchEvent.mockResolvedValueOnce(mockEvent);

            const result = await executeUpdateEvent(mockClient, {
                calendarId: "primary",
                eventId: "event123",
                summary: "Updated Meeting"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockEvent);
        });

        it("updates multiple fields", async () => {
            mockClient.patchEvent.mockResolvedValueOnce({
                id: "event123",
                summary: "New Title"
            });

            await executeUpdateEvent(mockClient, {
                calendarId: "primary",
                eventId: "event123",
                summary: "New Title",
                description: "New description",
                location: "New Location",
                start: { dateTime: "2024-01-20T16:00:00Z" },
                end: { dateTime: "2024-01-20T17:00:00Z" }
            });

            expect(mockClient.patchEvent).toHaveBeenCalledWith("primary", "event123", {
                summary: "New Title",
                description: "New description",
                location: "New Location",
                start: { dateTime: "2024-01-20T16:00:00Z" },
                end: { dateTime: "2024-01-20T17:00:00Z" }
            });
        });

        it("updates attendees", async () => {
            mockClient.patchEvent.mockResolvedValueOnce({
                id: "event123",
                attendees: [{ email: "new@example.com" }]
            });

            await executeUpdateEvent(mockClient, {
                calendarId: "primary",
                eventId: "event123",
                attendees: [{ email: "new@example.com", displayName: "New Attendee" }]
            });

            expect(mockClient.patchEvent).toHaveBeenCalledWith("primary", "event123", {
                attendees: [{ email: "new@example.com", displayName: "New Attendee" }]
            });
        });

        it("returns error on client failure", async () => {
            mockClient.patchEvent.mockRejectedValueOnce(new Error("Event not found"));

            const result = await executeUpdateEvent(mockClient, {
                calendarId: "primary",
                eventId: "nonexistent",
                summary: "Updated"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Event not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.patchEvent.mockRejectedValueOnce("string error");

            const result = await executeUpdateEvent(mockClient, {
                calendarId: "primary",
                eventId: "event123",
                summary: "Updated"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to update event");
        });
    });

    describe("executeDeleteEvent", () => {
        it("calls client with correct params", async () => {
            mockClient.deleteEvent.mockResolvedValueOnce(undefined);

            await executeDeleteEvent(mockClient, {
                calendarId: "primary",
                eventId: "event123"
            });

            expect(mockClient.deleteEvent).toHaveBeenCalledWith("primary", "event123", undefined);
        });

        it("returns normalized output on success", async () => {
            mockClient.deleteEvent.mockResolvedValueOnce(undefined);

            const result = await executeDeleteEvent(mockClient, {
                calendarId: "primary",
                eventId: "event123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                eventId: "event123"
            });
        });

        it("passes sendUpdates option", async () => {
            mockClient.deleteEvent.mockResolvedValueOnce(undefined);

            await executeDeleteEvent(mockClient, {
                calendarId: "primary",
                eventId: "event123",
                sendUpdates: "all"
            });

            expect(mockClient.deleteEvent).toHaveBeenCalledWith("primary", "event123", {
                sendUpdates: "all"
            });
        });

        it("passes externalOnly sendUpdates option", async () => {
            mockClient.deleteEvent.mockResolvedValueOnce(undefined);

            await executeDeleteEvent(mockClient, {
                calendarId: "primary",
                eventId: "event123",
                sendUpdates: "externalOnly"
            });

            expect(mockClient.deleteEvent).toHaveBeenCalledWith("primary", "event123", {
                sendUpdates: "externalOnly"
            });
        });

        it("passes none sendUpdates option", async () => {
            mockClient.deleteEvent.mockResolvedValueOnce(undefined);

            await executeDeleteEvent(mockClient, {
                calendarId: "primary",
                eventId: "event123",
                sendUpdates: "none"
            });

            expect(mockClient.deleteEvent).toHaveBeenCalledWith("primary", "event123", {
                sendUpdates: "none"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.deleteEvent.mockRejectedValueOnce(new Error("Event not found"));

            const result = await executeDeleteEvent(mockClient, {
                calendarId: "primary",
                eventId: "nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Event not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.deleteEvent.mockRejectedValueOnce("string error");

            const result = await executeDeleteEvent(mockClient, {
                calendarId: "primary",
                eventId: "event123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to delete event");
        });
    });

    describe("executeQuickAdd", () => {
        it("calls client with correct params", async () => {
            mockClient.quickAdd.mockResolvedValueOnce({
                id: "quickEvent123",
                summary: "Dinner with John"
            });

            await executeQuickAdd(mockClient, {
                calendarId: "primary",
                text: "Dinner with John tomorrow at 7pm"
            });

            expect(mockClient.quickAdd).toHaveBeenCalledWith(
                "primary",
                "Dinner with John tomorrow at 7pm"
            );
        });

        it("returns normalized output on success", async () => {
            const mockEvent = {
                id: "quickEvent123",
                summary: "Dinner with John",
                start: { dateTime: "2024-01-16T19:00:00Z" },
                end: { dateTime: "2024-01-16T20:00:00Z" }
            };

            mockClient.quickAdd.mockResolvedValueOnce(mockEvent);

            const result = await executeQuickAdd(mockClient, {
                calendarId: "primary",
                text: "Dinner with John tomorrow at 7pm"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockEvent);
        });

        it("works with different calendar", async () => {
            mockClient.quickAdd.mockResolvedValueOnce({
                id: "quickEvent456",
                summary: "Meeting at office"
            });

            await executeQuickAdd(mockClient, {
                calendarId: "work@group.calendar.google.com",
                text: "Meeting at office 3pm Friday"
            });

            expect(mockClient.quickAdd).toHaveBeenCalledWith(
                "work@group.calendar.google.com",
                "Meeting at office 3pm Friday"
            );
        });

        it("returns error on client failure", async () => {
            mockClient.quickAdd.mockRejectedValueOnce(new Error("Could not parse event text"));

            const result = await executeQuickAdd(mockClient, {
                calendarId: "primary",
                text: "gibberish event text"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Could not parse event text");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.quickAdd.mockRejectedValueOnce("string error");

            const result = await executeQuickAdd(mockClient, {
                calendarId: "primary",
                text: "Some event"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to quick add event");
        });
    });

    describe("executeListCalendars", () => {
        it("calls client with default params", async () => {
            mockClient.listCalendars.mockResolvedValueOnce({
                kind: "calendar#calendarList",
                items: []
            });

            await executeListCalendars(mockClient, {});

            expect(mockClient.listCalendars).toHaveBeenCalledWith({});
        });

        it("returns normalized output on success", async () => {
            const mockCalendars = {
                kind: "calendar#calendarList",
                items: [
                    {
                        id: "primary",
                        summary: "My Calendar",
                        primary: true,
                        accessRole: "owner"
                    },
                    {
                        id: "work@group.calendar.google.com",
                        summary: "Work",
                        accessRole: "writer"
                    }
                ]
            };

            mockClient.listCalendars.mockResolvedValueOnce(mockCalendars);

            const result = await executeListCalendars(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockCalendars);
        });

        it("passes maxResults param", async () => {
            mockClient.listCalendars.mockResolvedValueOnce({
                kind: "calendar#calendarList",
                items: []
            });

            await executeListCalendars(mockClient, {
                maxResults: 50
            });

            expect(mockClient.listCalendars).toHaveBeenCalledWith({
                maxResults: 50
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listCalendars.mockRejectedValueOnce(new Error("Permission denied"));

            const result = await executeListCalendars(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Permission denied");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listCalendars.mockRejectedValueOnce("string error");

            const result = await executeListCalendars(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list calendars");
        });
    });

    describe("executeGetCalendar", () => {
        it("calls client with correct params", async () => {
            mockClient.getCalendar.mockResolvedValueOnce({
                id: "primary",
                summary: "My Calendar"
            });

            await executeGetCalendar(mockClient, {
                calendarId: "primary"
            });

            expect(mockClient.getCalendar).toHaveBeenCalledWith("primary");
        });

        it("returns normalized output on success", async () => {
            const mockCalendar = {
                id: "primary",
                summary: "My Calendar",
                description: "Personal calendar",
                timeZone: "America/Los_Angeles",
                accessRole: "owner"
            };

            mockClient.getCalendar.mockResolvedValueOnce(mockCalendar);

            const result = await executeGetCalendar(mockClient, {
                calendarId: "primary"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockCalendar);
        });

        it("works with custom calendar ID", async () => {
            mockClient.getCalendar.mockResolvedValueOnce({
                id: "custom@group.calendar.google.com",
                summary: "Custom Calendar"
            });

            await executeGetCalendar(mockClient, {
                calendarId: "custom@group.calendar.google.com"
            });

            expect(mockClient.getCalendar).toHaveBeenCalledWith("custom@group.calendar.google.com");
        });

        it("returns error on client failure", async () => {
            mockClient.getCalendar.mockRejectedValueOnce(new Error("Calendar not found"));

            const result = await executeGetCalendar(mockClient, {
                calendarId: "nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Calendar not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getCalendar.mockRejectedValueOnce("string error");

            const result = await executeGetCalendar(mockClient, {
                calendarId: "primary"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get calendar");
        });
    });

    describe("executeCreateCalendar", () => {
        it("calls client with correct params", async () => {
            mockClient.createCalendar.mockResolvedValueOnce({
                id: "new@group.calendar.google.com",
                summary: "New Calendar"
            });

            await executeCreateCalendar(mockClient, {
                summary: "New Calendar"
            });

            expect(mockClient.createCalendar).toHaveBeenCalledWith({
                summary: "New Calendar"
            });
        });

        it("returns normalized output on success", async () => {
            const mockCalendar = {
                id: "new@group.calendar.google.com",
                summary: "New Calendar",
                etag: '"abc123"'
            };

            mockClient.createCalendar.mockResolvedValueOnce(mockCalendar);

            const result = await executeCreateCalendar(mockClient, {
                summary: "New Calendar"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockCalendar);
        });

        it("passes all optional fields", async () => {
            mockClient.createCalendar.mockResolvedValueOnce({
                id: "work@group.calendar.google.com",
                summary: "Work Calendar"
            });

            await executeCreateCalendar(mockClient, {
                summary: "Work Calendar",
                description: "Calendar for work events",
                location: "San Francisco, CA",
                timeZone: "America/Los_Angeles"
            });

            expect(mockClient.createCalendar).toHaveBeenCalledWith({
                summary: "Work Calendar",
                description: "Calendar for work events",
                location: "San Francisco, CA",
                timeZone: "America/Los_Angeles"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.createCalendar.mockRejectedValueOnce(new Error("Quota exceeded"));

            const result = await executeCreateCalendar(mockClient, {
                summary: "New Calendar"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Quota exceeded");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createCalendar.mockRejectedValueOnce("string error");

            const result = await executeCreateCalendar(mockClient, {
                summary: "New Calendar"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create calendar");
        });
    });

    describe("executeGetFreeBusy", () => {
        it("calls client with correct params", async () => {
            mockClient.getFreeBusy.mockResolvedValueOnce({
                kind: "calendar#freeBusy",
                calendars: {}
            });

            await executeGetFreeBusy(mockClient, {
                timeMin: "2024-01-15T00:00:00Z",
                timeMax: "2024-01-15T23:59:59Z",
                items: [{ id: "primary" }]
            });

            expect(mockClient.getFreeBusy).toHaveBeenCalledWith({
                timeMin: "2024-01-15T00:00:00Z",
                timeMax: "2024-01-15T23:59:59Z",
                items: [{ id: "primary" }]
            });
        });

        it("returns normalized output on success", async () => {
            const mockFreeBusy = {
                kind: "calendar#freeBusy",
                timeMin: "2024-01-15T00:00:00Z",
                timeMax: "2024-01-15T23:59:59Z",
                calendars: {
                    primary: {
                        busy: [
                            {
                                start: "2024-01-15T10:00:00Z",
                                end: "2024-01-15T11:00:00Z"
                            }
                        ]
                    }
                }
            };

            mockClient.getFreeBusy.mockResolvedValueOnce(mockFreeBusy);

            const result = await executeGetFreeBusy(mockClient, {
                timeMin: "2024-01-15T00:00:00Z",
                timeMax: "2024-01-15T23:59:59Z",
                items: [{ id: "primary" }]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockFreeBusy);
        });

        it("queries multiple calendars", async () => {
            mockClient.getFreeBusy.mockResolvedValueOnce({
                kind: "calendar#freeBusy",
                calendars: {}
            });

            await executeGetFreeBusy(mockClient, {
                timeMin: "2024-01-15T00:00:00Z",
                timeMax: "2024-01-15T23:59:59Z",
                items: [
                    { id: "primary" },
                    { id: "work@group.calendar.google.com" },
                    { id: "user@example.com" }
                ]
            });

            expect(mockClient.getFreeBusy).toHaveBeenCalledWith({
                timeMin: "2024-01-15T00:00:00Z",
                timeMax: "2024-01-15T23:59:59Z",
                items: [
                    { id: "primary" },
                    { id: "work@group.calendar.google.com" },
                    { id: "user@example.com" }
                ]
            });
        });

        it("passes timeZone param", async () => {
            mockClient.getFreeBusy.mockResolvedValueOnce({
                kind: "calendar#freeBusy",
                calendars: {}
            });

            await executeGetFreeBusy(mockClient, {
                timeMin: "2024-01-15T00:00:00Z",
                timeMax: "2024-01-15T23:59:59Z",
                items: [{ id: "primary" }],
                timeZone: "America/Los_Angeles"
            });

            expect(mockClient.getFreeBusy).toHaveBeenCalledWith({
                timeMin: "2024-01-15T00:00:00Z",
                timeMax: "2024-01-15T23:59:59Z",
                items: [{ id: "primary" }],
                timeZone: "America/Los_Angeles"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getFreeBusy.mockRejectedValueOnce(new Error("Invalid time range"));

            const result = await executeGetFreeBusy(mockClient, {
                timeMin: "2024-01-15T00:00:00Z",
                timeMax: "2024-01-14T23:59:59Z",
                items: [{ id: "primary" }]
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Invalid time range");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getFreeBusy.mockRejectedValueOnce("string error");

            const result = await executeGetFreeBusy(mockClient, {
                timeMin: "2024-01-15T00:00:00Z",
                timeMax: "2024-01-15T23:59:59Z",
                items: [{ id: "primary" }]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get free/busy information");
        });
    });

    describe("schema validation", () => {
        describe("listEventsSchema", () => {
            it("validates minimal input", () => {
                const result = listEventsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("applies default calendarId", () => {
                const result = listEventsSchema.parse({});
                expect(result.calendarId).toBe("primary");
            });

            it("validates full input", () => {
                const result = listEventsSchema.safeParse({
                    calendarId: "work@group.calendar.google.com",
                    timeMin: "2024-01-01T00:00:00Z",
                    timeMax: "2024-01-31T23:59:59Z",
                    maxResults: 100,
                    orderBy: "startTime",
                    q: "meeting",
                    singleEvents: true
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid orderBy", () => {
                const result = listEventsSchema.safeParse({
                    orderBy: "invalid"
                });
                expect(result.success).toBe(false);
            });

            it("rejects maxResults out of range", () => {
                const result = listEventsSchema.safeParse({
                    maxResults: 3000
                });
                expect(result.success).toBe(false);
            });

            it("rejects maxResults below minimum", () => {
                const result = listEventsSchema.safeParse({
                    maxResults: 0
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getEventSchema", () => {
            it("validates minimal input with eventId", () => {
                const result = getEventSchema.safeParse({
                    eventId: "event123"
                });
                expect(result.success).toBe(true);
            });

            it("applies default calendarId", () => {
                const result = getEventSchema.parse({
                    eventId: "event123"
                });
                expect(result.calendarId).toBe("primary");
            });

            it("validates full input", () => {
                const result = getEventSchema.safeParse({
                    calendarId: "work@group.calendar.google.com",
                    eventId: "event123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing eventId", () => {
                const result = getEventSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty eventId", () => {
                const result = getEventSchema.safeParse({
                    eventId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createEventSchema", () => {
            it("validates minimal input", () => {
                const result = createEventSchema.safeParse({
                    summary: "Meeting",
                    start: { dateTime: "2024-01-20T14:00:00Z" },
                    end: { dateTime: "2024-01-20T15:00:00Z" }
                });
                expect(result.success).toBe(true);
            });

            it("applies default calendarId", () => {
                const result = createEventSchema.parse({
                    summary: "Meeting",
                    start: { dateTime: "2024-01-20T14:00:00Z" },
                    end: { dateTime: "2024-01-20T15:00:00Z" }
                });
                expect(result.calendarId).toBe("primary");
            });

            it("validates all-day event", () => {
                const result = createEventSchema.safeParse({
                    summary: "Holiday",
                    start: { date: "2024-12-25" },
                    end: { date: "2024-12-26" }
                });
                expect(result.success).toBe(true);
            });

            it("validates event with attendees", () => {
                const result = createEventSchema.safeParse({
                    summary: "Team Meeting",
                    start: { dateTime: "2024-01-20T14:00:00Z" },
                    end: { dateTime: "2024-01-20T15:00:00Z" },
                    attendees: [
                        { email: "alice@example.com", displayName: "Alice" },
                        { email: "bob@example.com", optional: true }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("validates event with reminders", () => {
                const result = createEventSchema.safeParse({
                    summary: "Meeting",
                    start: { dateTime: "2024-01-20T14:00:00Z" },
                    end: { dateTime: "2024-01-20T15:00:00Z" },
                    reminders: {
                        useDefault: false,
                        overrides: [
                            { method: "email", minutes: 60 },
                            { method: "popup", minutes: 10 }
                        ]
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing summary", () => {
                const result = createEventSchema.safeParse({
                    start: { dateTime: "2024-01-20T14:00:00Z" },
                    end: { dateTime: "2024-01-20T15:00:00Z" }
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty summary", () => {
                const result = createEventSchema.safeParse({
                    summary: "",
                    start: { dateTime: "2024-01-20T14:00:00Z" },
                    end: { dateTime: "2024-01-20T15:00:00Z" }
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid attendee email", () => {
                const result = createEventSchema.safeParse({
                    summary: "Meeting",
                    start: { dateTime: "2024-01-20T14:00:00Z" },
                    end: { dateTime: "2024-01-20T15:00:00Z" },
                    attendees: [{ email: "not-an-email" }]
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid reminder method", () => {
                const result = createEventSchema.safeParse({
                    summary: "Meeting",
                    start: { dateTime: "2024-01-20T14:00:00Z" },
                    end: { dateTime: "2024-01-20T15:00:00Z" },
                    reminders: {
                        overrides: [{ method: "sms", minutes: 10 }]
                    }
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative reminder minutes", () => {
                const result = createEventSchema.safeParse({
                    summary: "Meeting",
                    start: { dateTime: "2024-01-20T14:00:00Z" },
                    end: { dateTime: "2024-01-20T15:00:00Z" },
                    reminders: {
                        overrides: [{ method: "popup", minutes: -10 }]
                    }
                });
                expect(result.success).toBe(false);
            });

            it("rejects summary too long", () => {
                const result = createEventSchema.safeParse({
                    summary: "a".repeat(1025),
                    start: { dateTime: "2024-01-20T14:00:00Z" },
                    end: { dateTime: "2024-01-20T15:00:00Z" }
                });
                expect(result.success).toBe(false);
            });
        });

        describe("updateEventSchema", () => {
            it("validates minimal input", () => {
                const result = updateEventSchema.safeParse({
                    eventId: "event123"
                });
                expect(result.success).toBe(true);
            });

            it("applies default calendarId", () => {
                const result = updateEventSchema.parse({
                    eventId: "event123"
                });
                expect(result.calendarId).toBe("primary");
            });

            it("validates full input", () => {
                const result = updateEventSchema.safeParse({
                    calendarId: "work@group.calendar.google.com",
                    eventId: "event123",
                    summary: "Updated Meeting",
                    description: "New description",
                    location: "Room B",
                    start: { dateTime: "2024-01-20T16:00:00Z" },
                    end: { dateTime: "2024-01-20T17:00:00Z" }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing eventId", () => {
                const result = updateEventSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty eventId", () => {
                const result = updateEventSchema.safeParse({
                    eventId: ""
                });
                expect(result.success).toBe(false);
            });

            it("validates partial update (summary only)", () => {
                const result = updateEventSchema.safeParse({
                    eventId: "event123",
                    summary: "New Title"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("deleteEventSchema", () => {
            it("validates minimal input", () => {
                const result = deleteEventSchema.safeParse({
                    eventId: "event123"
                });
                expect(result.success).toBe(true);
            });

            it("applies default calendarId", () => {
                const result = deleteEventSchema.parse({
                    eventId: "event123"
                });
                expect(result.calendarId).toBe("primary");
            });

            it("validates with sendUpdates", () => {
                const result = deleteEventSchema.safeParse({
                    eventId: "event123",
                    sendUpdates: "all"
                });
                expect(result.success).toBe(true);
            });

            it("validates all sendUpdates options", () => {
                expect(
                    deleteEventSchema.safeParse({
                        eventId: "event123",
                        sendUpdates: "all"
                    }).success
                ).toBe(true);
                expect(
                    deleteEventSchema.safeParse({
                        eventId: "event123",
                        sendUpdates: "externalOnly"
                    }).success
                ).toBe(true);
                expect(
                    deleteEventSchema.safeParse({
                        eventId: "event123",
                        sendUpdates: "none"
                    }).success
                ).toBe(true);
            });

            it("rejects invalid sendUpdates", () => {
                const result = deleteEventSchema.safeParse({
                    eventId: "event123",
                    sendUpdates: "invalid"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing eventId", () => {
                const result = deleteEventSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("quickAddSchema", () => {
            it("validates minimal input", () => {
                const result = quickAddSchema.safeParse({
                    text: "Meeting tomorrow at 3pm"
                });
                expect(result.success).toBe(true);
            });

            it("applies default calendarId", () => {
                const result = quickAddSchema.parse({
                    text: "Meeting tomorrow at 3pm"
                });
                expect(result.calendarId).toBe("primary");
            });

            it("validates full input", () => {
                const result = quickAddSchema.safeParse({
                    calendarId: "work@group.calendar.google.com",
                    text: "Dinner with John tomorrow at 7pm"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing text", () => {
                const result = quickAddSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty text", () => {
                const result = quickAddSchema.safeParse({
                    text: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listCalendarsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listCalendarsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with maxResults", () => {
                const result = listCalendarsSchema.safeParse({
                    maxResults: 50
                });
                expect(result.success).toBe(true);
            });

            it("rejects maxResults out of range", () => {
                const result = listCalendarsSchema.safeParse({
                    maxResults: 300
                });
                expect(result.success).toBe(false);
            });

            it("rejects maxResults below minimum", () => {
                const result = listCalendarsSchema.safeParse({
                    maxResults: 0
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getCalendarSchema", () => {
            it("validates empty input (uses default)", () => {
                const result = getCalendarSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("applies default calendarId", () => {
                const result = getCalendarSchema.parse({});
                expect(result.calendarId).toBe("primary");
            });

            it("validates with custom calendarId", () => {
                const result = getCalendarSchema.safeParse({
                    calendarId: "work@group.calendar.google.com"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty calendarId", () => {
                const result = getCalendarSchema.safeParse({
                    calendarId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createCalendarSchema", () => {
            it("validates minimal input", () => {
                const result = createCalendarSchema.safeParse({
                    summary: "New Calendar"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createCalendarSchema.safeParse({
                    summary: "Work Calendar",
                    description: "Calendar for work events",
                    location: "San Francisco, CA",
                    timeZone: "America/Los_Angeles"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing summary", () => {
                const result = createCalendarSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty summary", () => {
                const result = createCalendarSchema.safeParse({
                    summary: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects summary too long", () => {
                const result = createCalendarSchema.safeParse({
                    summary: "a".repeat(256)
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getFreeBusySchema", () => {
            it("validates minimal input", () => {
                const result = getFreeBusySchema.safeParse({
                    timeMin: "2024-01-15T00:00:00Z",
                    timeMax: "2024-01-15T23:59:59Z",
                    items: [{ id: "primary" }]
                });
                expect(result.success).toBe(true);
            });

            it("validates with multiple items", () => {
                const result = getFreeBusySchema.safeParse({
                    timeMin: "2024-01-15T00:00:00Z",
                    timeMax: "2024-01-15T23:59:59Z",
                    items: [{ id: "primary" }, { id: "work@group.calendar.google.com" }]
                });
                expect(result.success).toBe(true);
            });

            it("validates with timeZone", () => {
                const result = getFreeBusySchema.safeParse({
                    timeMin: "2024-01-15T00:00:00Z",
                    timeMax: "2024-01-15T23:59:59Z",
                    items: [{ id: "primary" }],
                    timeZone: "America/Los_Angeles"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing timeMin", () => {
                const result = getFreeBusySchema.safeParse({
                    timeMax: "2024-01-15T23:59:59Z",
                    items: [{ id: "primary" }]
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing timeMax", () => {
                const result = getFreeBusySchema.safeParse({
                    timeMin: "2024-01-15T00:00:00Z",
                    items: [{ id: "primary" }]
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing items", () => {
                const result = getFreeBusySchema.safeParse({
                    timeMin: "2024-01-15T00:00:00Z",
                    timeMax: "2024-01-15T23:59:59Z"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty items array", () => {
                const result = getFreeBusySchema.safeParse({
                    timeMin: "2024-01-15T00:00:00Z",
                    timeMax: "2024-01-15T23:59:59Z",
                    items: []
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
