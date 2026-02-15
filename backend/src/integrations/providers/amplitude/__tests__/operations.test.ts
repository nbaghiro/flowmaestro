/**
 * Amplitude Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeIdentifyUser, identifyUserSchema } from "../operations/identifyUser";
import { executeTrackEvent, trackEventSchema } from "../operations/trackEvent";
import { executeTrackEvents, trackEventsSchema } from "../operations/trackEvents";
import type { AmplitudeClient } from "../client/AmplitudeClient";

// Mock AmplitudeClient factory
function createMockAmplitudeClient(): jest.Mocked<AmplitudeClient> {
    return {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<AmplitudeClient>;
}

describe("Amplitude Operation Executors", () => {
    let mockClient: jest.Mocked<AmplitudeClient>;

    beforeEach(() => {
        mockClient = createMockAmplitudeClient();
    });

    describe("executeTrackEvent", () => {
        it("calls client with correct params for user_id event", async () => {
            mockClient.post.mockResolvedValueOnce({
                code: 200,
                events_ingested: 1,
                server_upload_time: 1234567890,
                payload_size_bytes: 256
            });

            await executeTrackEvent(mockClient, {
                user_id: "user-123",
                event_type: "button_clicked",
                event_properties: { button_id: "submit" }
            });

            expect(mockClient.post).toHaveBeenCalledWith("/2/httpapi", {
                api_key: undefined,
                events: [
                    expect.objectContaining({
                        user_id: "user-123",
                        event_type: "button_clicked",
                        event_properties: { button_id: "submit" },
                        time: expect.any(Number)
                    })
                ]
            });
        });

        it("calls client with correct params for device_id event", async () => {
            mockClient.post.mockResolvedValueOnce({
                code: 200,
                events_ingested: 1,
                server_upload_time: 1234567890,
                payload_size_bytes: 256
            });

            await executeTrackEvent(mockClient, {
                device_id: "device-abc",
                event_type: "app_opened"
            });

            expect(mockClient.post).toHaveBeenCalledWith("/2/httpapi", {
                api_key: undefined,
                events: [
                    expect.objectContaining({
                        device_id: "device-abc",
                        event_type: "app_opened",
                        time: expect.any(Number)
                    })
                ]
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce({
                code: 200,
                events_ingested: 1,
                server_upload_time: 1234567890,
                payload_size_bytes: 256
            });

            const result = await executeTrackEvent(mockClient, {
                user_id: "user-123",
                event_type: "purchase_completed"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                code: 200,
                events_ingested: 1,
                server_upload_time: 1234567890
            });
        });

        it("includes user_properties when provided", async () => {
            mockClient.post.mockResolvedValueOnce({
                code: 200,
                events_ingested: 1,
                server_upload_time: 1234567890,
                payload_size_bytes: 256
            });

            await executeTrackEvent(mockClient, {
                user_id: "user-123",
                event_type: "signup_completed",
                user_properties: { plan: "premium", source: "referral" }
            });

            expect(mockClient.post).toHaveBeenCalledWith("/2/httpapi", {
                api_key: undefined,
                events: [
                    expect.objectContaining({
                        user_id: "user-123",
                        event_type: "signup_completed",
                        user_properties: { plan: "premium", source: "referral" }
                    })
                ]
            });
        });

        it("includes custom time when provided", async () => {
            const customTime = 1609459200000; // 2021-01-01

            mockClient.post.mockResolvedValueOnce({
                code: 200,
                events_ingested: 1,
                server_upload_time: 1234567890,
                payload_size_bytes: 256
            });

            await executeTrackEvent(mockClient, {
                user_id: "user-123",
                event_type: "historical_event",
                time: customTime
            });

            expect(mockClient.post).toHaveBeenCalledWith("/2/httpapi", {
                api_key: undefined,
                events: [
                    expect.objectContaining({
                        user_id: "user-123",
                        event_type: "historical_event",
                        time: customTime
                    })
                ]
            });
        });

        it("includes insert_id for deduplication", async () => {
            mockClient.post.mockResolvedValueOnce({
                code: 200,
                events_ingested: 1,
                server_upload_time: 1234567890,
                payload_size_bytes: 256
            });

            await executeTrackEvent(mockClient, {
                user_id: "user-123",
                event_type: "order_placed",
                insert_id: "order-12345-unique"
            });

            expect(mockClient.post).toHaveBeenCalledWith("/2/httpapi", {
                api_key: undefined,
                events: [
                    expect.objectContaining({
                        user_id: "user-123",
                        event_type: "order_placed",
                        insert_id: "order-12345-unique"
                    })
                ]
            });
        });

        it("returns error on client failure", async () => {
            mockClient.post.mockRejectedValueOnce(
                new Error("Amplitude API error: Invalid API key")
            );

            const result = await executeTrackEvent(mockClient, {
                user_id: "user-123",
                event_type: "test_event"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Amplitude API error: Invalid API key");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.post.mockRejectedValueOnce("non-error object");

            const result = await executeTrackEvent(mockClient, {
                user_id: "user-123",
                event_type: "test_event"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to track event");
        });

        it("handles rate limit errors", async () => {
            mockClient.post.mockRejectedValueOnce(
                new Error("Rate limited by Amplitude. Please try again later.")
            );

            const result = await executeTrackEvent(mockClient, {
                user_id: "user-123",
                event_type: "test_event"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe(
                "Rate limited by Amplitude. Please try again later."
            );
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeTrackEvents", () => {
        it("calls client with correct params for batch events", async () => {
            mockClient.post.mockResolvedValueOnce({
                code: 200,
                events_ingested: 3,
                server_upload_time: 1234567890,
                payload_size_bytes: 1024
            });

            await executeTrackEvents(mockClient, {
                events: [
                    { user_id: "user-1", event_type: "event_1" },
                    { user_id: "user-2", event_type: "event_2" },
                    { device_id: "device-1", event_type: "event_3" }
                ]
            });

            expect(mockClient.post).toHaveBeenCalledWith("/batch", {
                events: [
                    expect.objectContaining({
                        user_id: "user-1",
                        event_type: "event_1",
                        time: expect.any(Number)
                    }),
                    expect.objectContaining({
                        user_id: "user-2",
                        event_type: "event_2",
                        time: expect.any(Number)
                    }),
                    expect.objectContaining({
                        device_id: "device-1",
                        event_type: "event_3",
                        time: expect.any(Number)
                    })
                ]
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce({
                code: 200,
                events_ingested: 2,
                server_upload_time: 1234567890,
                payload_size_bytes: 512
            });

            const result = await executeTrackEvents(mockClient, {
                events: [
                    { user_id: "user-1", event_type: "event_a" },
                    { user_id: "user-2", event_type: "event_b" }
                ]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                code: 200,
                events_ingested: 2,
                server_upload_time: 1234567890,
                payload_size_bytes: 512
            });
        });

        it("includes event properties in batch events", async () => {
            mockClient.post.mockResolvedValueOnce({
                code: 200,
                events_ingested: 1,
                server_upload_time: 1234567890,
                payload_size_bytes: 256
            });

            await executeTrackEvents(mockClient, {
                events: [
                    {
                        user_id: "user-1",
                        event_type: "checkout",
                        event_properties: { cart_value: 99.99, items: 3 }
                    }
                ]
            });

            expect(mockClient.post).toHaveBeenCalledWith("/batch", {
                events: [
                    expect.objectContaining({
                        user_id: "user-1",
                        event_type: "checkout",
                        event_properties: { cart_value: 99.99, items: 3 }
                    })
                ]
            });
        });

        it("returns validation error when events lack user_id and device_id", async () => {
            const result = await executeTrackEvents(mockClient, {
                events: [
                    { user_id: "user-1", event_type: "valid_event" },
                    { event_type: "invalid_event" } as { user_id?: string; event_type: string }
                ]
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("validation");
            expect(result.error?.message).toBe("Each event must have either user_id or device_id");
            expect(result.error?.retryable).toBe(false);
            expect(mockClient.post).not.toHaveBeenCalled();
        });

        it("returns error on client failure", async () => {
            mockClient.post.mockRejectedValueOnce(
                new Error("Amplitude API error: Payload too large")
            );

            const result = await executeTrackEvents(mockClient, {
                events: [{ user_id: "user-1", event_type: "test_event" }]
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Amplitude API error: Payload too large");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.post.mockRejectedValueOnce({ code: "UNKNOWN" });

            const result = await executeTrackEvents(mockClient, {
                events: [{ user_id: "user-1", event_type: "test_event" }]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to track events");
        });

        it("includes insert_id for deduplication in batch events", async () => {
            mockClient.post.mockResolvedValueOnce({
                code: 200,
                events_ingested: 2,
                server_upload_time: 1234567890,
                payload_size_bytes: 512
            });

            await executeTrackEvents(mockClient, {
                events: [
                    { user_id: "user-1", event_type: "event_1", insert_id: "insert-1" },
                    { user_id: "user-2", event_type: "event_2", insert_id: "insert-2" }
                ]
            });

            expect(mockClient.post).toHaveBeenCalledWith("/batch", {
                events: [
                    expect.objectContaining({ insert_id: "insert-1" }),
                    expect.objectContaining({ insert_id: "insert-2" })
                ]
            });
        });

        it("preserves custom timestamps for events", async () => {
            const time1 = 1609459200000;
            const time2 = 1609545600000;

            mockClient.post.mockResolvedValueOnce({
                code: 200,
                events_ingested: 2,
                server_upload_time: 1234567890,
                payload_size_bytes: 512
            });

            await executeTrackEvents(mockClient, {
                events: [
                    { user_id: "user-1", event_type: "event_1", time: time1 },
                    { user_id: "user-2", event_type: "event_2", time: time2 }
                ]
            });

            expect(mockClient.post).toHaveBeenCalledWith("/batch", {
                events: [
                    expect.objectContaining({ time: time1 }),
                    expect.objectContaining({ time: time2 })
                ]
            });
        });
    });

    describe("executeIdentifyUser", () => {
        it("calls client with correct params for $set operation", async () => {
            mockClient.post.mockResolvedValueOnce({
                code: 200,
                events_ingested: 1,
                server_upload_time: 1234567890
            });

            await executeIdentifyUser(mockClient, {
                user_id: "user-123",
                user_properties: {
                    $set: { name: "John Doe", email: "john@example.com" }
                }
            });

            expect(mockClient.post).toHaveBeenCalledWith("/identify", {
                identification: JSON.stringify([
                    {
                        user_id: "user-123",
                        user_properties: {
                            $set: { name: "John Doe", email: "john@example.com" }
                        }
                    }
                ])
            });
        });

        it("calls client with correct params for device_id", async () => {
            mockClient.post.mockResolvedValueOnce({
                code: 200,
                events_ingested: 1,
                server_upload_time: 1234567890
            });

            await executeIdentifyUser(mockClient, {
                device_id: "device-abc",
                user_properties: {
                    $set: { app_version: "1.2.3" }
                }
            });

            expect(mockClient.post).toHaveBeenCalledWith("/identify", {
                identification: JSON.stringify([
                    {
                        device_id: "device-abc",
                        user_properties: {
                            $set: { app_version: "1.2.3" }
                        }
                    }
                ])
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce({
                code: 200,
                events_ingested: 1,
                server_upload_time: 1234567890
            });

            const result = await executeIdentifyUser(mockClient, {
                user_id: "user-123",
                user_properties: {
                    $set: { tier: "premium" }
                }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                code: 200,
                events_ingested: 1,
                server_upload_time: 1234567890
            });
        });

        it("handles $setOnce operation", async () => {
            mockClient.post.mockResolvedValueOnce({
                code: 200,
                events_ingested: 1,
                server_upload_time: 1234567890
            });

            await executeIdentifyUser(mockClient, {
                user_id: "user-123",
                user_properties: {
                    $setOnce: { first_seen: "2024-01-01" }
                }
            });

            expect(mockClient.post).toHaveBeenCalledWith("/identify", {
                identification: JSON.stringify([
                    {
                        user_id: "user-123",
                        user_properties: {
                            $setOnce: { first_seen: "2024-01-01" }
                        }
                    }
                ])
            });
        });

        it("handles $add operation for numeric increments", async () => {
            mockClient.post.mockResolvedValueOnce({
                code: 200,
                events_ingested: 1,
                server_upload_time: 1234567890
            });

            await executeIdentifyUser(mockClient, {
                user_id: "user-123",
                user_properties: {
                    $add: { login_count: 1, total_purchases: 5 }
                }
            });

            expect(mockClient.post).toHaveBeenCalledWith("/identify", {
                identification: JSON.stringify([
                    {
                        user_id: "user-123",
                        user_properties: {
                            $add: { login_count: 1, total_purchases: 5 }
                        }
                    }
                ])
            });
        });

        it("handles $append operation for arrays", async () => {
            mockClient.post.mockResolvedValueOnce({
                code: 200,
                events_ingested: 1,
                server_upload_time: 1234567890
            });

            await executeIdentifyUser(mockClient, {
                user_id: "user-123",
                user_properties: {
                    $append: { interests: "technology" }
                }
            });

            expect(mockClient.post).toHaveBeenCalledWith("/identify", {
                identification: JSON.stringify([
                    {
                        user_id: "user-123",
                        user_properties: {
                            $append: { interests: "technology" }
                        }
                    }
                ])
            });
        });

        it("handles $prepend operation for arrays", async () => {
            mockClient.post.mockResolvedValueOnce({
                code: 200,
                events_ingested: 1,
                server_upload_time: 1234567890
            });

            await executeIdentifyUser(mockClient, {
                user_id: "user-123",
                user_properties: {
                    $prepend: { recent_categories: "electronics" }
                }
            });

            expect(mockClient.post).toHaveBeenCalledWith("/identify", {
                identification: JSON.stringify([
                    {
                        user_id: "user-123",
                        user_properties: {
                            $prepend: { recent_categories: "electronics" }
                        }
                    }
                ])
            });
        });

        it("handles $unset operation to remove properties", async () => {
            mockClient.post.mockResolvedValueOnce({
                code: 200,
                events_ingested: 1,
                server_upload_time: 1234567890
            });

            await executeIdentifyUser(mockClient, {
                user_id: "user-123",
                user_properties: {
                    $unset: { old_property: "-" }
                }
            });

            expect(mockClient.post).toHaveBeenCalledWith("/identify", {
                identification: JSON.stringify([
                    {
                        user_id: "user-123",
                        user_properties: {
                            $unset: { old_property: "-" }
                        }
                    }
                ])
            });
        });

        it("handles multiple operations in single identify call", async () => {
            mockClient.post.mockResolvedValueOnce({
                code: 200,
                events_ingested: 1,
                server_upload_time: 1234567890
            });

            await executeIdentifyUser(mockClient, {
                user_id: "user-123",
                user_properties: {
                    $set: { name: "Jane Doe" },
                    $setOnce: { signup_date: "2024-01-15" },
                    $add: { login_count: 1 }
                }
            });

            expect(mockClient.post).toHaveBeenCalledWith("/identify", {
                identification: JSON.stringify([
                    {
                        user_id: "user-123",
                        user_properties: {
                            $set: { name: "Jane Doe" },
                            $setOnce: { signup_date: "2024-01-15" },
                            $add: { login_count: 1 }
                        }
                    }
                ])
            });
        });

        it("returns error on client failure", async () => {
            mockClient.post.mockRejectedValueOnce(
                new Error("Amplitude API key or secret key is invalid. Please reconnect.")
            );

            const result = await executeIdentifyUser(mockClient, {
                user_id: "user-123",
                user_properties: { $set: { name: "Test" } }
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Amplitude API key or secret key is invalid. Please reconnect."
            );
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.post.mockRejectedValueOnce(null);

            const result = await executeIdentifyUser(mockClient, {
                user_id: "user-123",
                user_properties: { $set: { name: "Test" } }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to identify user");
        });
    });

    describe("schema validation", () => {
        describe("trackEventSchema", () => {
            it("validates event with user_id", () => {
                const result = trackEventSchema.safeParse({
                    user_id: "user-123",
                    event_type: "button_clicked"
                });
                expect(result.success).toBe(true);
            });

            it("validates event with device_id", () => {
                const result = trackEventSchema.safeParse({
                    device_id: "device-abc",
                    event_type: "app_opened"
                });
                expect(result.success).toBe(true);
            });

            it("validates full event with all optional fields", () => {
                const result = trackEventSchema.safeParse({
                    user_id: "user-123",
                    device_id: "device-abc",
                    event_type: "purchase_completed",
                    event_properties: { item_id: "SKU-001", price: 29.99 },
                    user_properties: { lifetime_value: 150.0 },
                    time: 1609459200000,
                    insert_id: "unique-insert-id"
                });
                expect(result.success).toBe(true);
            });

            it("rejects event without user_id or device_id", () => {
                const result = trackEventSchema.safeParse({
                    event_type: "some_event"
                });
                expect(result.success).toBe(false);
            });

            it("rejects event without event_type", () => {
                const result = trackEventSchema.safeParse({
                    user_id: "user-123"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty event_type", () => {
                const result = trackEventSchema.safeParse({
                    user_id: "user-123",
                    event_type: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("trackEventsSchema", () => {
            it("validates single event in batch", () => {
                const result = trackEventsSchema.safeParse({
                    events: [{ user_id: "user-123", event_type: "event_1" }]
                });
                expect(result.success).toBe(true);
            });

            it("validates multiple events in batch", () => {
                const result = trackEventsSchema.safeParse({
                    events: [
                        { user_id: "user-1", event_type: "event_1" },
                        { device_id: "device-2", event_type: "event_2" },
                        { user_id: "user-3", event_type: "event_3" }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty events array", () => {
                const result = trackEventsSchema.safeParse({
                    events: []
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing events field", () => {
                const result = trackEventsSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("validates events with all optional fields", () => {
                const result = trackEventsSchema.safeParse({
                    events: [
                        {
                            user_id: "user-1",
                            device_id: "device-1",
                            event_type: "complex_event",
                            event_properties: { key: "value" },
                            user_properties: { name: "Test" },
                            time: 1609459200000,
                            insert_id: "dedup-id"
                        }
                    ]
                });
                expect(result.success).toBe(true);
            });
        });

        describe("identifyUserSchema", () => {
            it("validates identify with user_id", () => {
                const result = identifyUserSchema.safeParse({
                    user_id: "user-123",
                    user_properties: { $set: { name: "John" } }
                });
                expect(result.success).toBe(true);
            });

            it("validates identify with device_id", () => {
                const result = identifyUserSchema.safeParse({
                    device_id: "device-abc",
                    user_properties: { $set: { app_version: "2.0" } }
                });
                expect(result.success).toBe(true);
            });

            it("validates all property operations", () => {
                const result = identifyUserSchema.safeParse({
                    user_id: "user-123",
                    user_properties: {
                        $set: { name: "Jane" },
                        $setOnce: { first_login: "2024-01-01" },
                        $add: { sessions: 1 },
                        $append: { tags: "premium" },
                        $prepend: { history: "action" },
                        $unset: { deprecated: "-" }
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects identify without user_id or device_id", () => {
                const result = identifyUserSchema.safeParse({
                    user_properties: { $set: { name: "Test" } }
                });
                expect(result.success).toBe(false);
            });

            it("rejects identify without user_properties", () => {
                const result = identifyUserSchema.safeParse({
                    user_id: "user-123"
                });
                expect(result.success).toBe(false);
            });

            it("validates empty user_properties object", () => {
                const result = identifyUserSchema.safeParse({
                    user_id: "user-123",
                    user_properties: {}
                });
                expect(result.success).toBe(true);
            });

            it("validates $add with numeric values", () => {
                const result = identifyUserSchema.safeParse({
                    user_id: "user-123",
                    user_properties: {
                        $add: { count: 5, score: -3 }
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects $add with non-numeric values", () => {
                const result = identifyUserSchema.safeParse({
                    user_id: "user-123",
                    user_properties: {
                        $add: { count: "not a number" }
                    }
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
