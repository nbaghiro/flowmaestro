/**
 * Mixpanel Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeImportEvents, importEventsSchema } from "../operations/importEvents";
import { executeSetGroupProfile, setGroupProfileSchema } from "../operations/setGroupProfile";
import { executeSetUserProfile, setUserProfileSchema } from "../operations/setUserProfile";
import { executeTrackEvent, trackEventSchema } from "../operations/trackEvent";
import type { MixpanelClient } from "../client/MixpanelClient";

// Mock MixpanelClient factory
function createMockMixpanelClient(): jest.Mocked<MixpanelClient> {
    return {
        getProjectToken: jest.fn().mockReturnValue("test-project-token"),
        request: jest.fn(),
        requestWithTokenParam: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn()
    } as unknown as jest.Mocked<MixpanelClient>;
}

describe("Mixpanel Operation Executors", () => {
    let mockClient: jest.Mocked<MixpanelClient>;

    beforeEach(() => {
        mockClient = createMockMixpanelClient();
    });

    describe("executeTrackEvent", () => {
        it("calls client with correct params", async () => {
            mockClient.request.mockResolvedValueOnce(1);

            await executeTrackEvent(mockClient, {
                event: "Button Clicked",
                distinct_id: "user-123",
                properties: { button_name: "signup" }
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "POST",
                url: "/track",
                params: { data: expect.any(String) }
            });

            // Verify the encoded data contains correct structure
            const callArgs = mockClient.request.mock.calls[0][0];
            const encodedData = callArgs.params.data as string;
            const decodedData = JSON.parse(Buffer.from(encodedData, "base64").toString());

            expect(decodedData).toEqual([
                {
                    event: "Button Clicked",
                    properties: {
                        token: "test-project-token",
                        distinct_id: "user-123",
                        button_name: "signup"
                    }
                }
            ]);
        });

        it("returns normalized output on success", async () => {
            mockClient.request.mockResolvedValueOnce(1);

            const result = await executeTrackEvent(mockClient, {
                event: "Page View",
                distinct_id: "user-456"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                tracked: true,
                event: "Page View"
            });
        });

        it("includes time and insert_id when provided", async () => {
            mockClient.request.mockResolvedValueOnce(1);

            await executeTrackEvent(mockClient, {
                event: "Purchase",
                distinct_id: "user-789",
                time: 1704067200,
                insert_id: "unique-id-123"
            });

            const callArgs = mockClient.request.mock.calls[0][0];
            const encodedData = callArgs.params.data as string;
            const decodedData = JSON.parse(Buffer.from(encodedData, "base64").toString());

            expect(decodedData[0].properties.time).toBe(1704067200);
            expect(decodedData[0].properties.$insert_id).toBe("unique-id-123");
        });

        it("handles anonymous tracking without distinct_id", async () => {
            mockClient.request.mockResolvedValueOnce(1);

            await executeTrackEvent(mockClient, {
                event: "Anonymous Event"
            });

            const callArgs = mockClient.request.mock.calls[0][0];
            const encodedData = callArgs.params.data as string;
            const decodedData = JSON.parse(Buffer.from(encodedData, "base64").toString());

            expect(decodedData[0].properties.distinct_id).toBeUndefined();
            expect(decodedData[0].properties.token).toBe("test-project-token");
        });

        it("returns error when Mixpanel rejects event (response = 0)", async () => {
            mockClient.request.mockResolvedValueOnce(0);

            const result = await executeTrackEvent(mockClient, {
                event: "Invalid Event",
                distinct_id: "user-123"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Mixpanel rejected the event");
            expect(result.error?.retryable).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.request.mockRejectedValueOnce(new Error("Network error"));

            const result = await executeTrackEvent(mockClient, {
                event: "Test Event",
                distinct_id: "user-123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Network error");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.request.mockRejectedValueOnce("string error");

            const result = await executeTrackEvent(mockClient, {
                event: "Test Event",
                distinct_id: "user-123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to track event");
        });
    });

    describe("executeImportEvents", () => {
        it("calls client with correct params", async () => {
            mockClient.requestWithTokenParam.mockResolvedValueOnce({
                code: 200,
                num_records_imported: 2,
                status: "OK"
            });

            await executeImportEvents(mockClient, {
                events: [
                    {
                        event: "Historical Event 1",
                        distinct_id: "user-123",
                        time: 1704067200
                    },
                    {
                        event: "Historical Event 2",
                        distinct_id: "user-456",
                        time: 1704153600
                    }
                ]
            });

            expect(mockClient.requestWithTokenParam).toHaveBeenCalledWith({
                method: "POST",
                url: "/import",
                headers: {
                    "Content-Type": "application/x-ndjson"
                },
                data: expect.any(String)
            });

            // Verify NDJSON format
            const callArgs = mockClient.requestWithTokenParam.mock.calls[0][0];
            const ndjsonData = callArgs.data as string;
            const lines = ndjsonData.split("\n");

            expect(lines).toHaveLength(2);
            expect(JSON.parse(lines[0])).toEqual({
                event: "Historical Event 1",
                properties: {
                    distinct_id: "user-123",
                    time: 1704067200
                }
            });
            expect(JSON.parse(lines[1])).toEqual({
                event: "Historical Event 2",
                properties: {
                    distinct_id: "user-456",
                    time: 1704153600
                }
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.requestWithTokenParam.mockResolvedValueOnce({
                code: 200,
                num_records_imported: 5,
                status: "OK"
            });

            const result = await executeImportEvents(mockClient, {
                events: [
                    { event: "Event 1", distinct_id: "user-1", time: 1704067200 },
                    { event: "Event 2", distinct_id: "user-2", time: 1704067200 },
                    { event: "Event 3", distinct_id: "user-3", time: 1704067200 },
                    { event: "Event 4", distinct_id: "user-4", time: 1704067200 },
                    { event: "Event 5", distinct_id: "user-5", time: 1704067200 }
                ]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                imported: true,
                num_records_imported: 5,
                status: "OK"
            });
        });

        it("includes insert_id and properties when provided", async () => {
            mockClient.requestWithTokenParam.mockResolvedValueOnce({
                code: 200,
                num_records_imported: 1,
                status: "OK"
            });

            await executeImportEvents(mockClient, {
                events: [
                    {
                        event: "Purchase",
                        distinct_id: "user-123",
                        time: 1704067200,
                        insert_id: "dedup-id-123",
                        properties: { amount: 99.99, currency: "USD" }
                    }
                ]
            });

            const callArgs = mockClient.requestWithTokenParam.mock.calls[0][0];
            const ndjsonData = callArgs.data as string;
            const eventData = JSON.parse(ndjsonData);

            expect(eventData.properties.$insert_id).toBe("dedup-id-123");
            expect(eventData.properties.amount).toBe(99.99);
            expect(eventData.properties.currency).toBe("USD");
        });

        it("returns error when import fails with non-200 code", async () => {
            mockClient.requestWithTokenParam.mockResolvedValueOnce({
                code: 400,
                num_records_imported: 0,
                status: "Invalid data"
            });

            const result = await executeImportEvents(mockClient, {
                events: [{ event: "Bad Event", distinct_id: "user-123", time: 1704067200 }]
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Import failed with code 400: Invalid data");
            expect(result.error?.retryable).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.requestWithTokenParam.mockRejectedValueOnce(
                new Error("Rate limited by Mixpanel")
            );

            const result = await executeImportEvents(mockClient, {
                events: [{ event: "Test", distinct_id: "user-123", time: 1704067200 }]
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Rate limited by Mixpanel");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.requestWithTokenParam.mockRejectedValueOnce("string error");

            const result = await executeImportEvents(mockClient, {
                events: [{ event: "Test", distinct_id: "user-123", time: 1704067200 }]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to import events");
        });
    });

    describe("executeSetUserProfile", () => {
        it("calls client with correct params for $set operation", async () => {
            mockClient.request.mockResolvedValueOnce(1);

            await executeSetUserProfile(mockClient, {
                distinct_id: "user-123",
                operations: {
                    $set: { name: "John Doe", email: "john@example.com" }
                }
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "POST",
                url: "/engage",
                params: { data: expect.any(String) }
            });

            const callArgs = mockClient.request.mock.calls[0][0];
            const encodedData = callArgs.params.data as string;
            const decodedData = JSON.parse(Buffer.from(encodedData, "base64").toString());

            expect(decodedData).toEqual([
                {
                    $token: "test-project-token",
                    $distinct_id: "user-123",
                    $set: { name: "John Doe", email: "john@example.com" }
                }
            ]);
        });

        it("returns normalized output on success", async () => {
            mockClient.request.mockResolvedValueOnce(1);

            const result = await executeSetUserProfile(mockClient, {
                distinct_id: "user-456",
                operations: { $set: { plan: "premium" } }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                updated: true,
                distinct_id: "user-456"
            });
        });

        it("includes ip and ignore_time when provided", async () => {
            mockClient.request.mockResolvedValueOnce(1);

            await executeSetUserProfile(mockClient, {
                distinct_id: "user-123",
                operations: { $set: { name: "Test" } },
                ip: "192.168.1.1",
                ignore_time: true
            });

            const callArgs = mockClient.request.mock.calls[0][0];
            const encodedData = callArgs.params.data as string;
            const decodedData = JSON.parse(Buffer.from(encodedData, "base64").toString());

            expect(decodedData[0].$ip).toBe("192.168.1.1");
            expect(decodedData[0].$ignore_time).toBe(true);
        });

        it("handles $set_once operation", async () => {
            mockClient.request.mockResolvedValueOnce(1);

            await executeSetUserProfile(mockClient, {
                distinct_id: "user-123",
                operations: {
                    $set_once: { first_login: "2024-01-01" }
                }
            });

            const callArgs = mockClient.request.mock.calls[0][0];
            const encodedData = callArgs.params.data as string;
            const decodedData = JSON.parse(Buffer.from(encodedData, "base64").toString());

            expect(decodedData[0].$set_once).toEqual({ first_login: "2024-01-01" });
        });

        it("handles $add operation for numeric increments", async () => {
            mockClient.request.mockResolvedValueOnce(1);

            await executeSetUserProfile(mockClient, {
                distinct_id: "user-123",
                operations: {
                    $add: { login_count: 1, points: 50 }
                }
            });

            const callArgs = mockClient.request.mock.calls[0][0];
            const encodedData = callArgs.params.data as string;
            const decodedData = JSON.parse(Buffer.from(encodedData, "base64").toString());

            expect(decodedData[0].$add).toEqual({ login_count: 1, points: 50 });
        });

        it("handles $append operation for list properties", async () => {
            mockClient.request.mockResolvedValueOnce(1);

            await executeSetUserProfile(mockClient, {
                distinct_id: "user-123",
                operations: {
                    $append: { favorite_colors: "blue" }
                }
            });

            const callArgs = mockClient.request.mock.calls[0][0];
            const encodedData = callArgs.params.data as string;
            const decodedData = JSON.parse(Buffer.from(encodedData, "base64").toString());

            expect(decodedData[0].$append).toEqual({ favorite_colors: "blue" });
        });

        it("handles $union operation for list merging", async () => {
            mockClient.request.mockResolvedValueOnce(1);

            await executeSetUserProfile(mockClient, {
                distinct_id: "user-123",
                operations: {
                    $union: { tags: ["vip", "beta_user"] }
                }
            });

            const callArgs = mockClient.request.mock.calls[0][0];
            const encodedData = callArgs.params.data as string;
            const decodedData = JSON.parse(Buffer.from(encodedData, "base64").toString());

            expect(decodedData[0].$union).toEqual({ tags: ["vip", "beta_user"] });
        });

        it("handles $remove operation", async () => {
            mockClient.request.mockResolvedValueOnce(1);

            await executeSetUserProfile(mockClient, {
                distinct_id: "user-123",
                operations: {
                    $remove: { tags: "inactive" }
                }
            });

            const callArgs = mockClient.request.mock.calls[0][0];
            const encodedData = callArgs.params.data as string;
            const decodedData = JSON.parse(Buffer.from(encodedData, "base64").toString());

            expect(decodedData[0].$remove).toEqual({ tags: "inactive" });
        });

        it("handles $unset operation to remove properties", async () => {
            mockClient.request.mockResolvedValueOnce(1);

            await executeSetUserProfile(mockClient, {
                distinct_id: "user-123",
                operations: {
                    $unset: ["temporary_flag", "old_field"]
                }
            });

            const callArgs = mockClient.request.mock.calls[0][0];
            const encodedData = callArgs.params.data as string;
            const decodedData = JSON.parse(Buffer.from(encodedData, "base64").toString());

            expect(decodedData[0].$unset).toEqual(["temporary_flag", "old_field"]);
        });

        it("handles multiple operations in single request", async () => {
            mockClient.request.mockResolvedValueOnce(1);

            await executeSetUserProfile(mockClient, {
                distinct_id: "user-123",
                operations: {
                    $set: { name: "John" },
                    $set_once: { created_at: "2024-01-01" },
                    $add: { login_count: 1 }
                }
            });

            const callArgs = mockClient.request.mock.calls[0][0];
            const encodedData = callArgs.params.data as string;
            const decodedData = JSON.parse(Buffer.from(encodedData, "base64").toString());

            expect(decodedData[0].$set).toEqual({ name: "John" });
            expect(decodedData[0].$set_once).toEqual({ created_at: "2024-01-01" });
            expect(decodedData[0].$add).toEqual({ login_count: 1 });
        });

        it("returns error when Mixpanel rejects update (response = 0)", async () => {
            mockClient.request.mockResolvedValueOnce(0);

            const result = await executeSetUserProfile(mockClient, {
                distinct_id: "user-123",
                operations: { $set: { name: "Test" } }
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Mixpanel rejected the profile update");
            expect(result.error?.retryable).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.request.mockRejectedValueOnce(new Error("Token is invalid"));

            const result = await executeSetUserProfile(mockClient, {
                distinct_id: "user-123",
                operations: { $set: { name: "Test" } }
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Token is invalid");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.request.mockRejectedValueOnce("string error");

            const result = await executeSetUserProfile(mockClient, {
                distinct_id: "user-123",
                operations: { $set: { name: "Test" } }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to update user profile");
        });
    });

    describe("executeSetGroupProfile", () => {
        it("calls client with correct params for $set operation", async () => {
            mockClient.request.mockResolvedValueOnce(1);

            await executeSetGroupProfile(mockClient, {
                group_key: "company",
                group_id: "acme-corp",
                operations: {
                    $set: { name: "Acme Corporation", industry: "Technology" }
                }
            });

            expect(mockClient.request).toHaveBeenCalledWith({
                method: "POST",
                url: "/groups",
                params: { data: expect.any(String) }
            });

            const callArgs = mockClient.request.mock.calls[0][0];
            const encodedData = callArgs.params.data as string;
            const decodedData = JSON.parse(Buffer.from(encodedData, "base64").toString());

            expect(decodedData).toEqual([
                {
                    $token: "test-project-token",
                    $group_key: "company",
                    $group_id: "acme-corp",
                    $set: { name: "Acme Corporation", industry: "Technology" }
                }
            ]);
        });

        it("returns normalized output on success", async () => {
            mockClient.request.mockResolvedValueOnce(1);

            const result = await executeSetGroupProfile(mockClient, {
                group_key: "team",
                group_id: "engineering",
                operations: { $set: { size: 25 } }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                updated: true,
                group_key: "team",
                group_id: "engineering"
            });
        });

        it("handles $set_once operation", async () => {
            mockClient.request.mockResolvedValueOnce(1);

            await executeSetGroupProfile(mockClient, {
                group_key: "company",
                group_id: "acme-corp",
                operations: {
                    $set_once: { founded_date: "2020-01-15" }
                }
            });

            const callArgs = mockClient.request.mock.calls[0][0];
            const encodedData = callArgs.params.data as string;
            const decodedData = JSON.parse(Buffer.from(encodedData, "base64").toString());

            expect(decodedData[0].$set_once).toEqual({ founded_date: "2020-01-15" });
        });

        it("handles $unset operation to remove group properties", async () => {
            mockClient.request.mockResolvedValueOnce(1);

            await executeSetGroupProfile(mockClient, {
                group_key: "company",
                group_id: "acme-corp",
                operations: {
                    $unset: ["deprecated_field", "old_metric"]
                }
            });

            const callArgs = mockClient.request.mock.calls[0][0];
            const encodedData = callArgs.params.data as string;
            const decodedData = JSON.parse(Buffer.from(encodedData, "base64").toString());

            expect(decodedData[0].$unset).toEqual(["deprecated_field", "old_metric"]);
        });

        it("handles multiple operations in single request", async () => {
            mockClient.request.mockResolvedValueOnce(1);

            await executeSetGroupProfile(mockClient, {
                group_key: "company",
                group_id: "acme-corp",
                operations: {
                    $set: { employees: 100 },
                    $set_once: { created_at: "2024-01-01" },
                    $unset: ["temp_field"]
                }
            });

            const callArgs = mockClient.request.mock.calls[0][0];
            const encodedData = callArgs.params.data as string;
            const decodedData = JSON.parse(Buffer.from(encodedData, "base64").toString());

            expect(decodedData[0].$set).toEqual({ employees: 100 });
            expect(decodedData[0].$set_once).toEqual({ created_at: "2024-01-01" });
            expect(decodedData[0].$unset).toEqual(["temp_field"]);
        });

        it("returns error when Mixpanel rejects update (response = 0)", async () => {
            mockClient.request.mockResolvedValueOnce(0);

            const result = await executeSetGroupProfile(mockClient, {
                group_key: "company",
                group_id: "invalid",
                operations: { $set: { name: "Test" } }
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Mixpanel rejected the group profile update");
            expect(result.error?.retryable).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.request.mockRejectedValueOnce(new Error("Group analytics not enabled"));

            const result = await executeSetGroupProfile(mockClient, {
                group_key: "company",
                group_id: "acme",
                operations: { $set: { name: "Test" } }
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Group analytics not enabled");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.request.mockRejectedValueOnce("string error");

            const result = await executeSetGroupProfile(mockClient, {
                group_key: "company",
                group_id: "acme",
                operations: { $set: { name: "Test" } }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to update group profile");
        });
    });

    describe("schema validation", () => {
        describe("trackEventSchema", () => {
            it("validates minimal input with just event name", () => {
                const result = trackEventSchema.safeParse({
                    event: "Button Clicked"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input with all fields", () => {
                const result = trackEventSchema.safeParse({
                    event: "Purchase",
                    distinct_id: "user-123",
                    properties: { amount: 99.99, currency: "USD" },
                    time: 1704067200,
                    insert_id: "uuid-123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty event name", () => {
                const result = trackEventSchema.safeParse({
                    event: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing event name", () => {
                const result = trackEventSchema.safeParse({
                    distinct_id: "user-123"
                });
                expect(result.success).toBe(false);
            });

            it("accepts event without distinct_id (anonymous tracking)", () => {
                const result = trackEventSchema.safeParse({
                    event: "Page View"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty distinct_id when provided", () => {
                const result = trackEventSchema.safeParse({
                    event: "Test",
                    distinct_id: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("importEventsSchema", () => {
            it("validates single event", () => {
                const result = importEventsSchema.safeParse({
                    events: [
                        {
                            event: "Historical Event",
                            distinct_id: "user-123",
                            time: 1704067200
                        }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("validates multiple events", () => {
                const result = importEventsSchema.safeParse({
                    events: [
                        { event: "Event 1", distinct_id: "user-1", time: 1704067200 },
                        { event: "Event 2", distinct_id: "user-2", time: 1704153600 }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("validates event with all optional fields", () => {
                const result = importEventsSchema.safeParse({
                    events: [
                        {
                            event: "Purchase",
                            distinct_id: "user-123",
                            time: 1704067200,
                            insert_id: "dedup-123",
                            properties: { amount: 50 }
                        }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty events array", () => {
                const result = importEventsSchema.safeParse({
                    events: []
                });
                expect(result.success).toBe(false);
            });

            it("rejects more than 2000 events", () => {
                const tooManyEvents = Array.from({ length: 2001 }, (_, i) => ({
                    event: `Event ${i}`,
                    distinct_id: `user-${i}`,
                    time: 1704067200
                }));

                const result = importEventsSchema.safeParse({
                    events: tooManyEvents
                });
                expect(result.success).toBe(false);
            });

            it("rejects event without distinct_id", () => {
                const result = importEventsSchema.safeParse({
                    events: [
                        {
                            event: "Test",
                            time: 1704067200
                        }
                    ]
                });
                expect(result.success).toBe(false);
            });

            it("rejects event without time", () => {
                const result = importEventsSchema.safeParse({
                    events: [
                        {
                            event: "Test",
                            distinct_id: "user-123"
                        }
                    ]
                });
                expect(result.success).toBe(false);
            });

            it("rejects event with empty event name", () => {
                const result = importEventsSchema.safeParse({
                    events: [
                        {
                            event: "",
                            distinct_id: "user-123",
                            time: 1704067200
                        }
                    ]
                });
                expect(result.success).toBe(false);
            });

            it("rejects event with empty distinct_id", () => {
                const result = importEventsSchema.safeParse({
                    events: [
                        {
                            event: "Test",
                            distinct_id: "",
                            time: 1704067200
                        }
                    ]
                });
                expect(result.success).toBe(false);
            });
        });

        describe("setUserProfileSchema", () => {
            it("validates minimal input with $set operation", () => {
                const result = setUserProfileSchema.safeParse({
                    distinct_id: "user-123",
                    operations: {
                        $set: { name: "John" }
                    }
                });
                expect(result.success).toBe(true);
            });

            it("validates input with all optional fields", () => {
                const result = setUserProfileSchema.safeParse({
                    distinct_id: "user-123",
                    operations: { $set: { name: "John" } },
                    ip: "192.168.1.1",
                    ignore_time: true
                });
                expect(result.success).toBe(true);
            });

            it("validates $set_once operation", () => {
                const result = setUserProfileSchema.safeParse({
                    distinct_id: "user-123",
                    operations: {
                        $set_once: { created_at: "2024-01-01" }
                    }
                });
                expect(result.success).toBe(true);
            });

            it("validates $add operation with numeric values", () => {
                const result = setUserProfileSchema.safeParse({
                    distinct_id: "user-123",
                    operations: {
                        $add: { login_count: 1, points: 50 }
                    }
                });
                expect(result.success).toBe(true);
            });

            it("validates $append operation", () => {
                const result = setUserProfileSchema.safeParse({
                    distinct_id: "user-123",
                    operations: {
                        $append: { tags: "new_tag" }
                    }
                });
                expect(result.success).toBe(true);
            });

            it("validates $union operation with array values", () => {
                const result = setUserProfileSchema.safeParse({
                    distinct_id: "user-123",
                    operations: {
                        $union: { interests: ["music", "sports"] }
                    }
                });
                expect(result.success).toBe(true);
            });

            it("validates $remove operation", () => {
                const result = setUserProfileSchema.safeParse({
                    distinct_id: "user-123",
                    operations: {
                        $remove: { tags: "old_tag" }
                    }
                });
                expect(result.success).toBe(true);
            });

            it("validates $unset operation with string array", () => {
                const result = setUserProfileSchema.safeParse({
                    distinct_id: "user-123",
                    operations: {
                        $unset: ["field1", "field2"]
                    }
                });
                expect(result.success).toBe(true);
            });

            it("validates multiple operations together", () => {
                const result = setUserProfileSchema.safeParse({
                    distinct_id: "user-123",
                    operations: {
                        $set: { name: "John" },
                        $set_once: { first_login: "2024-01-01" },
                        $add: { visits: 1 },
                        $unset: ["temp_field"]
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing distinct_id", () => {
                const result = setUserProfileSchema.safeParse({
                    operations: { $set: { name: "John" } }
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty distinct_id", () => {
                const result = setUserProfileSchema.safeParse({
                    distinct_id: "",
                    operations: { $set: { name: "John" } }
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing operations", () => {
                const result = setUserProfileSchema.safeParse({
                    distinct_id: "user-123"
                });
                expect(result.success).toBe(false);
            });

            it("accepts empty operations object", () => {
                const result = setUserProfileSchema.safeParse({
                    distinct_id: "user-123",
                    operations: {}
                });
                expect(result.success).toBe(true);
            });
        });

        describe("setGroupProfileSchema", () => {
            it("validates minimal input with $set operation", () => {
                const result = setGroupProfileSchema.safeParse({
                    group_key: "company",
                    group_id: "acme-corp",
                    operations: {
                        $set: { name: "Acme Corporation" }
                    }
                });
                expect(result.success).toBe(true);
            });

            it("validates $set_once operation", () => {
                const result = setGroupProfileSchema.safeParse({
                    group_key: "company",
                    group_id: "acme-corp",
                    operations: {
                        $set_once: { founded_date: "2020-01-01" }
                    }
                });
                expect(result.success).toBe(true);
            });

            it("validates $unset operation", () => {
                const result = setGroupProfileSchema.safeParse({
                    group_key: "company",
                    group_id: "acme-corp",
                    operations: {
                        $unset: ["deprecated_field"]
                    }
                });
                expect(result.success).toBe(true);
            });

            it("validates multiple operations together", () => {
                const result = setGroupProfileSchema.safeParse({
                    group_key: "team",
                    group_id: "engineering",
                    operations: {
                        $set: { size: 25 },
                        $set_once: { created_at: "2024-01-01" },
                        $unset: ["temp_field"]
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing group_key", () => {
                const result = setGroupProfileSchema.safeParse({
                    group_id: "acme-corp",
                    operations: { $set: { name: "Acme" } }
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty group_key", () => {
                const result = setGroupProfileSchema.safeParse({
                    group_key: "",
                    group_id: "acme-corp",
                    operations: { $set: { name: "Acme" } }
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing group_id", () => {
                const result = setGroupProfileSchema.safeParse({
                    group_key: "company",
                    operations: { $set: { name: "Acme" } }
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty group_id", () => {
                const result = setGroupProfileSchema.safeParse({
                    group_key: "company",
                    group_id: "",
                    operations: { $set: { name: "Acme" } }
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing operations", () => {
                const result = setGroupProfileSchema.safeParse({
                    group_key: "company",
                    group_id: "acme-corp"
                });
                expect(result.success).toBe(false);
            });

            it("accepts empty operations object", () => {
                const result = setGroupProfileSchema.safeParse({
                    group_key: "company",
                    group_id: "acme-corp",
                    operations: {}
                });
                expect(result.success).toBe(true);
            });
        });
    });
});
