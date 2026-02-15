/**
 * Segment Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeAliasUser, aliasUserSchema } from "../operations/aliasUser";
import { executeBatchEvents, batchEventsSchema } from "../operations/batchEvents";
import { executeGroupUser, groupUserSchema } from "../operations/groupUser";
import { executeIdentifyUser, identifyUserSchema } from "../operations/identifyUser";
import { executeTrackEvent, trackEventSchema } from "../operations/trackEvent";
import { executeTrackPage, trackPageSchema } from "../operations/trackPage";
import { executeTrackScreen, trackScreenSchema } from "../operations/trackScreen";
import type { SegmentClient, SegmentResponse } from "../client/SegmentClient";

// Mock SegmentClient factory
function createMockSegmentClient(): jest.Mocked<SegmentClient> {
    return {
        track: jest.fn(),
        identify: jest.fn(),
        page: jest.fn(),
        screen: jest.fn(),
        group: jest.fn(),
        alias: jest.fn(),
        batch: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<SegmentClient>;
}

describe("Segment Operation Executors", () => {
    let mockClient: jest.Mocked<SegmentClient>;

    beforeEach(() => {
        mockClient = createMockSegmentClient();
    });

    describe("executeTrackEvent", () => {
        it("calls client with correct params", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.track.mockResolvedValueOnce(mockResponse);

            await executeTrackEvent(mockClient, {
                userId: "user-123",
                event: "Order Completed"
            });

            expect(mockClient.track).toHaveBeenCalledWith({
                userId: "user-123",
                event: "Order Completed"
            });
        });

        it("returns normalized output on success", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.track.mockResolvedValueOnce(mockResponse);

            const result = await executeTrackEvent(mockClient, {
                userId: "user-123",
                event: "Button Clicked"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                success: true,
                event: "Button Clicked",
                userId: "user-123",
                anonymousId: undefined
            });
        });

        it("passes properties for event tracking", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.track.mockResolvedValueOnce(mockResponse);

            const properties = {
                revenue: 99.99,
                productId: "prod-456",
                quantity: 2
            };

            await executeTrackEvent(mockClient, {
                userId: "user-123",
                event: "Order Completed",
                properties
            });

            expect(mockClient.track).toHaveBeenCalledWith({
                userId: "user-123",
                event: "Order Completed",
                properties
            });
        });

        it("passes context for contextual information", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.track.mockResolvedValueOnce(mockResponse);

            const context = {
                ip: "192.168.1.1",
                locale: "en-US",
                timezone: "America/New_York"
            };

            await executeTrackEvent(mockClient, {
                userId: "user-123",
                event: "Page Viewed",
                context
            });

            expect(mockClient.track).toHaveBeenCalledWith({
                userId: "user-123",
                event: "Page Viewed",
                context
            });
        });

        it("passes integrations for destination control", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.track.mockResolvedValueOnce(mockResponse);

            const integrations = {
                All: true,
                "Google Analytics": false
            };

            await executeTrackEvent(mockClient, {
                userId: "user-123",
                event: "Sign Up",
                integrations
            });

            expect(mockClient.track).toHaveBeenCalledWith({
                userId: "user-123",
                event: "Sign Up",
                integrations
            });
        });

        it("passes timestamp and messageId", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.track.mockResolvedValueOnce(mockResponse);

            const timestamp = "2024-01-15T10:30:00Z";
            const messageId = "msg-123-456";

            await executeTrackEvent(mockClient, {
                userId: "user-123",
                event: "Login",
                timestamp,
                messageId
            });

            expect(mockClient.track).toHaveBeenCalledWith({
                userId: "user-123",
                event: "Login",
                timestamp,
                messageId
            });
        });

        it("uses anonymousId when userId not provided", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.track.mockResolvedValueOnce(mockResponse);

            const result = await executeTrackEvent(mockClient, {
                anonymousId: "anon-789",
                event: "Product Viewed"
            });

            expect(mockClient.track).toHaveBeenCalledWith({
                anonymousId: "anon-789",
                event: "Product Viewed"
            });
            expect(result.data).toEqual({
                success: true,
                event: "Product Viewed",
                userId: undefined,
                anonymousId: "anon-789"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.track.mockRejectedValueOnce(new Error("Segment API error: Bad request"));

            const result = await executeTrackEvent(mockClient, {
                userId: "user-123",
                event: "Test Event"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Segment API error: Bad request");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.track.mockRejectedValueOnce("string error");

            const result = await executeTrackEvent(mockClient, {
                userId: "user-123",
                event: "Test Event"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to track event");
        });
    });

    describe("executeIdentifyUser", () => {
        it("calls client with correct params", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.identify.mockResolvedValueOnce(mockResponse);

            await executeIdentifyUser(mockClient, {
                userId: "user-123"
            });

            expect(mockClient.identify).toHaveBeenCalledWith({
                userId: "user-123"
            });
        });

        it("returns normalized output on success", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.identify.mockResolvedValueOnce(mockResponse);

            const traits = { email: "user@example.com", name: "John Doe" };
            const result = await executeIdentifyUser(mockClient, {
                userId: "user-123",
                traits
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                success: true,
                userId: "user-123",
                anonymousId: undefined,
                traits
            });
        });

        it("passes traits for user identification", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.identify.mockResolvedValueOnce(mockResponse);

            const traits = {
                email: "user@example.com",
                name: "John Doe",
                plan: "premium",
                age: 30
            };

            await executeIdentifyUser(mockClient, {
                userId: "user-123",
                traits
            });

            expect(mockClient.identify).toHaveBeenCalledWith({
                userId: "user-123",
                traits
            });
        });

        it("uses anonymousId when userId not provided", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.identify.mockResolvedValueOnce(mockResponse);

            const result = await executeIdentifyUser(mockClient, {
                anonymousId: "anon-456",
                traits: { favoriteColor: "blue" }
            });

            expect(mockClient.identify).toHaveBeenCalledWith({
                anonymousId: "anon-456",
                traits: { favoriteColor: "blue" }
            });
            expect(result.data?.anonymousId).toBe("anon-456");
        });

        it("passes context and integrations", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.identify.mockResolvedValueOnce(mockResponse);

            const context = { ip: "10.0.0.1" };
            const integrations = { Mixpanel: true };

            await executeIdentifyUser(mockClient, {
                userId: "user-123",
                context,
                integrations
            });

            expect(mockClient.identify).toHaveBeenCalledWith({
                userId: "user-123",
                context,
                integrations
            });
        });

        it("returns error on client failure", async () => {
            mockClient.identify.mockRejectedValueOnce(new Error("Rate limited by Segment"));

            const result = await executeIdentifyUser(mockClient, {
                userId: "user-123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Rate limited by Segment");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.identify.mockRejectedValueOnce(undefined);

            const result = await executeIdentifyUser(mockClient, {
                userId: "user-123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to identify user");
        });
    });

    describe("executeTrackPage", () => {
        it("calls client with correct params", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.page.mockResolvedValueOnce(mockResponse);

            await executeTrackPage(mockClient, {
                userId: "user-123",
                name: "Home"
            });

            expect(mockClient.page).toHaveBeenCalledWith({
                userId: "user-123",
                name: "Home"
            });
        });

        it("returns normalized output on success", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.page.mockResolvedValueOnce(mockResponse);

            const result = await executeTrackPage(mockClient, {
                userId: "user-123",
                name: "Pricing",
                category: "Marketing"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                success: true,
                name: "Pricing",
                category: "Marketing",
                userId: "user-123",
                anonymousId: undefined
            });
        });

        it("passes category and properties", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.page.mockResolvedValueOnce(mockResponse);

            const properties = {
                url: "https://example.com/docs/api",
                title: "API Documentation",
                referrer: "https://google.com"
            };

            await executeTrackPage(mockClient, {
                userId: "user-123",
                name: "API Docs",
                category: "Docs",
                properties
            });

            expect(mockClient.page).toHaveBeenCalledWith({
                userId: "user-123",
                name: "API Docs",
                category: "Docs",
                properties
            });
        });

        it("works with anonymousId", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.page.mockResolvedValueOnce(mockResponse);

            const result = await executeTrackPage(mockClient, {
                anonymousId: "anon-123",
                name: "Landing Page"
            });

            expect(mockClient.page).toHaveBeenCalledWith({
                anonymousId: "anon-123",
                name: "Landing Page"
            });
            expect(result.data?.anonymousId).toBe("anon-123");
        });

        it("returns error on client failure", async () => {
            mockClient.page.mockRejectedValueOnce(new Error("Segment Write Key is invalid"));

            const result = await executeTrackPage(mockClient, {
                userId: "user-123",
                name: "Test Page"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Segment Write Key is invalid");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.page.mockRejectedValueOnce(null);

            const result = await executeTrackPage(mockClient, {
                userId: "user-123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to track page");
        });
    });

    describe("executeTrackScreen", () => {
        it("calls client with correct params", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.screen.mockResolvedValueOnce(mockResponse);

            await executeTrackScreen(mockClient, {
                userId: "user-123",
                name: "Profile"
            });

            expect(mockClient.screen).toHaveBeenCalledWith({
                userId: "user-123",
                name: "Profile"
            });
        });

        it("returns normalized output on success", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.screen.mockResolvedValueOnce(mockResponse);

            const result = await executeTrackScreen(mockClient, {
                userId: "user-123",
                name: "Settings",
                category: "Account"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                success: true,
                name: "Settings",
                category: "Account",
                userId: "user-123",
                anonymousId: undefined
            });
        });

        it("passes category and properties for mobile screens", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.screen.mockResolvedValueOnce(mockResponse);

            const properties = {
                screenDensity: 3.0,
                orientation: "portrait"
            };

            await executeTrackScreen(mockClient, {
                userId: "user-123",
                name: "Dashboard",
                category: "Main",
                properties
            });

            expect(mockClient.screen).toHaveBeenCalledWith({
                userId: "user-123",
                name: "Dashboard",
                category: "Main",
                properties
            });
        });

        it("works with anonymousId", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.screen.mockResolvedValueOnce(mockResponse);

            const result = await executeTrackScreen(mockClient, {
                anonymousId: "device-789",
                name: "Onboarding"
            });

            expect(mockClient.screen).toHaveBeenCalledWith({
                anonymousId: "device-789",
                name: "Onboarding"
            });
            expect(result.data?.anonymousId).toBe("device-789");
        });

        it("passes context with device info", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.screen.mockResolvedValueOnce(mockResponse);

            const context = {
                device: {
                    manufacturer: "Apple",
                    model: "iPhone 15",
                    type: "ios"
                },
                os: {
                    name: "iOS",
                    version: "17.0"
                }
            };

            await executeTrackScreen(mockClient, {
                userId: "user-123",
                name: "Home",
                context
            });

            expect(mockClient.screen).toHaveBeenCalledWith({
                userId: "user-123",
                name: "Home",
                context
            });
        });

        it("returns error on client failure", async () => {
            mockClient.screen.mockRejectedValueOnce(new Error("Network error"));

            const result = await executeTrackScreen(mockClient, {
                userId: "user-123",
                name: "Test Screen"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Network error");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.screen.mockRejectedValueOnce({ code: "UNKNOWN" });

            const result = await executeTrackScreen(mockClient, {
                userId: "user-123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to track screen");
        });
    });

    describe("executeGroupUser", () => {
        it("calls client with correct params", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.group.mockResolvedValueOnce(mockResponse);

            await executeGroupUser(mockClient, {
                userId: "user-123",
                groupId: "company-456"
            });

            expect(mockClient.group).toHaveBeenCalledWith({
                userId: "user-123",
                groupId: "company-456"
            });
        });

        it("returns normalized output on success", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.group.mockResolvedValueOnce(mockResponse);

            const traits = { name: "Acme Inc", industry: "Technology" };
            const result = await executeGroupUser(mockClient, {
                userId: "user-123",
                groupId: "company-456",
                traits
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                success: true,
                groupId: "company-456",
                userId: "user-123",
                anonymousId: undefined,
                traits
            });
        });

        it("passes traits for group information", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.group.mockResolvedValueOnce(mockResponse);

            const traits = {
                name: "Acme Corporation",
                industry: "Software",
                employees: 500,
                plan: "enterprise",
                website: "https://acme.com"
            };

            await executeGroupUser(mockClient, {
                userId: "user-123",
                groupId: "company-456",
                traits
            });

            expect(mockClient.group).toHaveBeenCalledWith({
                userId: "user-123",
                groupId: "company-456",
                traits
            });
        });

        it("works with anonymousId", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.group.mockResolvedValueOnce(mockResponse);

            const result = await executeGroupUser(mockClient, {
                anonymousId: "anon-789",
                groupId: "org-123"
            });

            expect(mockClient.group).toHaveBeenCalledWith({
                anonymousId: "anon-789",
                groupId: "org-123"
            });
            expect(result.data?.anonymousId).toBe("anon-789");
        });

        it("passes context, integrations, timestamp, and messageId", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.group.mockResolvedValueOnce(mockResponse);

            const context = { ip: "192.168.1.100" };
            const integrations = { Amplitude: true, Mixpanel: false };
            const timestamp = "2024-01-20T15:00:00Z";
            const messageId = "msg-group-123";

            await executeGroupUser(mockClient, {
                userId: "user-123",
                groupId: "team-789",
                context,
                integrations,
                timestamp,
                messageId
            });

            expect(mockClient.group).toHaveBeenCalledWith({
                userId: "user-123",
                groupId: "team-789",
                context,
                integrations,
                timestamp,
                messageId
            });
        });

        it("returns error on client failure", async () => {
            mockClient.group.mockRejectedValueOnce(new Error("Invalid groupId"));

            const result = await executeGroupUser(mockClient, {
                userId: "user-123",
                groupId: "invalid"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Invalid groupId");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.group.mockRejectedValueOnce(42);

            const result = await executeGroupUser(mockClient, {
                userId: "user-123",
                groupId: "test-group"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to group user");
        });
    });

    describe("executeAliasUser", () => {
        it("calls client with correct params", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.alias.mockResolvedValueOnce(mockResponse);

            await executeAliasUser(mockClient, {
                userId: "user-123",
                previousId: "anon-456"
            });

            expect(mockClient.alias).toHaveBeenCalledWith({
                userId: "user-123",
                previousId: "anon-456"
            });
        });

        it("returns normalized output on success", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.alias.mockResolvedValueOnce(mockResponse);

            const result = await executeAliasUser(mockClient, {
                userId: "user-123",
                previousId: "anonymous-user-789"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                success: true,
                userId: "user-123",
                anonymousId: undefined,
                previousId: "anonymous-user-789"
            });
        });

        it("links anonymous user to registered user", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.alias.mockResolvedValueOnce(mockResponse);

            await executeAliasUser(mockClient, {
                userId: "registered-user-123",
                previousId: "session-anon-abc123"
            });

            expect(mockClient.alias).toHaveBeenCalledWith({
                userId: "registered-user-123",
                previousId: "session-anon-abc123"
            });
        });

        it("passes context and integrations", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.alias.mockResolvedValueOnce(mockResponse);

            const context = { ip: "10.0.0.5" };
            const integrations = { All: true };

            await executeAliasUser(mockClient, {
                userId: "user-123",
                previousId: "old-user-456",
                context,
                integrations
            });

            expect(mockClient.alias).toHaveBeenCalledWith({
                userId: "user-123",
                previousId: "old-user-456",
                context,
                integrations
            });
        });

        it("passes timestamp and messageId", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.alias.mockResolvedValueOnce(mockResponse);

            const timestamp = "2024-01-25T12:00:00Z";
            const messageId = "alias-msg-123";

            await executeAliasUser(mockClient, {
                userId: "user-123",
                previousId: "temp-id-789",
                timestamp,
                messageId
            });

            expect(mockClient.alias).toHaveBeenCalledWith({
                userId: "user-123",
                previousId: "temp-id-789",
                timestamp,
                messageId
            });
        });

        it("returns error on client failure", async () => {
            mockClient.alias.mockRejectedValueOnce(new Error("Alias already exists"));

            const result = await executeAliasUser(mockClient, {
                userId: "user-123",
                previousId: "existing-alias"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Alias already exists");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.alias.mockRejectedValueOnce([]);

            const result = await executeAliasUser(mockClient, {
                userId: "user-123",
                previousId: "old-id"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to alias user");
        });
    });

    describe("executeBatchEvents", () => {
        it("calls client with correct params for track events", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.batch.mockResolvedValueOnce(mockResponse);

            await executeBatchEvents(mockClient, {
                batch: [
                    {
                        type: "track",
                        userId: "user-123",
                        event: "Order Completed"
                    }
                ]
            });

            expect(mockClient.batch).toHaveBeenCalledWith({
                batch: [
                    {
                        type: "track",
                        userId: "user-123",
                        event: "Order Completed"
                    }
                ]
            });
        });

        it("returns normalized output on success", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.batch.mockResolvedValueOnce(mockResponse);

            const result = await executeBatchEvents(mockClient, {
                batch: [
                    { type: "track", userId: "user-1", event: "Event 1" },
                    { type: "track", userId: "user-2", event: "Event 2" },
                    { type: "identify", userId: "user-3" }
                ]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                success: true,
                eventsCount: 3,
                eventsByType: {
                    track: 2,
                    identify: 1
                }
            });
        });

        it("handles multiple event types in batch", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.batch.mockResolvedValueOnce(mockResponse);

            await executeBatchEvents(mockClient, {
                batch: [
                    { type: "track", userId: "user-1", event: "Purchase" },
                    { type: "identify", userId: "user-1", traits: { email: "test@example.com" } },
                    { type: "page", userId: "user-1", name: "Checkout" },
                    { type: "screen", userId: "user-1", name: "Receipt" },
                    { type: "group", userId: "user-1", groupId: "company-1" },
                    { type: "alias", userId: "user-1", previousId: "anon-1" }
                ]
            });

            expect(mockClient.batch).toHaveBeenCalledWith({
                batch: [
                    { type: "track", userId: "user-1", event: "Purchase" },
                    { type: "identify", userId: "user-1", traits: { email: "test@example.com" } },
                    { type: "page", userId: "user-1", name: "Checkout" },
                    { type: "screen", userId: "user-1", name: "Receipt" },
                    { type: "group", userId: "user-1", groupId: "company-1" },
                    { type: "alias", userId: "user-1", previousId: "anon-1" }
                ]
            });
        });

        it("passes properties for track events in batch", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.batch.mockResolvedValueOnce(mockResponse);

            const properties = { revenue: 50.0, currency: "USD" };

            await executeBatchEvents(mockClient, {
                batch: [
                    {
                        type: "track",
                        userId: "user-123",
                        event: "Order Completed",
                        properties
                    }
                ]
            });

            expect(mockClient.batch).toHaveBeenCalledWith({
                batch: [
                    {
                        type: "track",
                        userId: "user-123",
                        event: "Order Completed",
                        properties
                    }
                ]
            });
        });

        it("passes top-level context and integrations", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.batch.mockResolvedValueOnce(mockResponse);

            const context = { library: { name: "flowmaestro", version: "1.0.0" } };
            const integrations = { All: true, "Google Analytics": false };

            await executeBatchEvents(mockClient, {
                batch: [{ type: "track", userId: "user-1", event: "Test" }],
                context,
                integrations
            });

            expect(mockClient.batch).toHaveBeenCalledWith({
                batch: [{ type: "track", userId: "user-1", event: "Test" }],
                context,
                integrations
            });
        });

        it("passes category for page and screen events", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.batch.mockResolvedValueOnce(mockResponse);

            await executeBatchEvents(mockClient, {
                batch: [
                    { type: "page", userId: "user-1", name: "Docs", category: "Documentation" },
                    { type: "screen", userId: "user-1", name: "Settings", category: "Account" }
                ]
            });

            expect(mockClient.batch).toHaveBeenCalledWith({
                batch: [
                    { type: "page", userId: "user-1", name: "Docs", category: "Documentation" },
                    { type: "screen", userId: "user-1", name: "Settings", category: "Account" }
                ]
            });
        });

        it("counts events by type correctly", async () => {
            const mockResponse: SegmentResponse = { success: true };
            mockClient.batch.mockResolvedValueOnce(mockResponse);

            const result = await executeBatchEvents(mockClient, {
                batch: [
                    { type: "track", userId: "user-1", event: "Event 1" },
                    { type: "track", userId: "user-2", event: "Event 2" },
                    { type: "track", userId: "user-3", event: "Event 3" },
                    { type: "identify", userId: "user-1" },
                    { type: "identify", userId: "user-2" },
                    { type: "page", userId: "user-1", name: "Home" },
                    { type: "group", userId: "user-1", groupId: "org-1" }
                ]
            });

            expect(result.success).toBe(true);
            expect(result.data?.eventsByType).toEqual({
                track: 3,
                identify: 2,
                page: 1,
                group: 1
            });
        });

        it("returns error on client failure", async () => {
            mockClient.batch.mockRejectedValueOnce(
                new Error("Segment API error: Request payload too large")
            );

            const result = await executeBatchEvents(mockClient, {
                batch: [{ type: "track", userId: "user-1", event: "Test" }]
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Segment API error: Request payload too large");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.batch.mockRejectedValueOnce(new Set());

            const result = await executeBatchEvents(mockClient, {
                batch: [{ type: "track", userId: "user-1", event: "Test" }]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to send batch events");
        });
    });

    describe("schema validation", () => {
        describe("trackEventSchema", () => {
            it("validates minimal input with userId", () => {
                const result = trackEventSchema.safeParse({
                    userId: "user-123",
                    event: "Button Clicked"
                });
                expect(result.success).toBe(true);
            });

            it("validates minimal input with anonymousId", () => {
                const result = trackEventSchema.safeParse({
                    anonymousId: "anon-456",
                    event: "Page Viewed"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = trackEventSchema.safeParse({
                    userId: "user-123",
                    anonymousId: "anon-456",
                    event: "Order Completed",
                    properties: { revenue: 99.99 },
                    context: { ip: "192.168.1.1" },
                    integrations: { All: true },
                    timestamp: "2024-01-15T10:00:00Z",
                    messageId: "msg-123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing event", () => {
                const result = trackEventSchema.safeParse({
                    userId: "user-123"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty event", () => {
                const result = trackEventSchema.safeParse({
                    userId: "user-123",
                    event: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing both userId and anonymousId", () => {
                const result = trackEventSchema.safeParse({
                    event: "Test Event"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("identifyUserSchema", () => {
            it("validates minimal input with userId", () => {
                const result = identifyUserSchema.safeParse({
                    userId: "user-123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with traits", () => {
                const result = identifyUserSchema.safeParse({
                    userId: "user-123",
                    traits: {
                        email: "user@example.com",
                        name: "John Doe",
                        age: 30
                    }
                });
                expect(result.success).toBe(true);
            });

            it("validates with anonymousId", () => {
                const result = identifyUserSchema.safeParse({
                    anonymousId: "anon-789"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing both userId and anonymousId", () => {
                const result = identifyUserSchema.safeParse({
                    traits: { email: "test@example.com" }
                });
                expect(result.success).toBe(false);
            });
        });

        describe("trackPageSchema", () => {
            it("validates minimal input", () => {
                const result = trackPageSchema.safeParse({
                    userId: "user-123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with name and category", () => {
                const result = trackPageSchema.safeParse({
                    userId: "user-123",
                    name: "Pricing",
                    category: "Marketing"
                });
                expect(result.success).toBe(true);
            });

            it("validates with properties", () => {
                const result = trackPageSchema.safeParse({
                    userId: "user-123",
                    name: "Product",
                    properties: {
                        url: "https://example.com/product",
                        referrer: "https://google.com"
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing both userId and anonymousId", () => {
                const result = trackPageSchema.safeParse({
                    name: "Home"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("trackScreenSchema", () => {
            it("validates minimal input", () => {
                const result = trackScreenSchema.safeParse({
                    userId: "user-123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with name and category", () => {
                const result = trackScreenSchema.safeParse({
                    userId: "user-123",
                    name: "Settings",
                    category: "Account"
                });
                expect(result.success).toBe(true);
            });

            it("validates with context device info", () => {
                const result = trackScreenSchema.safeParse({
                    userId: "user-123",
                    name: "Home",
                    context: {
                        device: {
                            manufacturer: "Apple",
                            model: "iPhone 15"
                        }
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing both userId and anonymousId", () => {
                const result = trackScreenSchema.safeParse({
                    name: "Profile"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("groupUserSchema", () => {
            it("validates minimal input", () => {
                const result = groupUserSchema.safeParse({
                    userId: "user-123",
                    groupId: "company-456"
                });
                expect(result.success).toBe(true);
            });

            it("validates with traits", () => {
                const result = groupUserSchema.safeParse({
                    userId: "user-123",
                    groupId: "company-456",
                    traits: {
                        name: "Acme Inc",
                        industry: "Technology",
                        employees: 500
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing groupId", () => {
                const result = groupUserSchema.safeParse({
                    userId: "user-123"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty groupId", () => {
                const result = groupUserSchema.safeParse({
                    userId: "user-123",
                    groupId: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing both userId and anonymousId", () => {
                const result = groupUserSchema.safeParse({
                    groupId: "company-456"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("aliasUserSchema", () => {
            it("validates minimal input", () => {
                const result = aliasUserSchema.safeParse({
                    userId: "user-123",
                    previousId: "anon-456"
                });
                expect(result.success).toBe(true);
            });

            it("validates with context and integrations", () => {
                const result = aliasUserSchema.safeParse({
                    userId: "user-123",
                    previousId: "old-id-789",
                    context: { ip: "10.0.0.1" },
                    integrations: { Mixpanel: true }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing previousId", () => {
                const result = aliasUserSchema.safeParse({
                    userId: "user-123"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty previousId", () => {
                const result = aliasUserSchema.safeParse({
                    userId: "user-123",
                    previousId: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing both userId and anonymousId", () => {
                const result = aliasUserSchema.safeParse({
                    previousId: "old-id"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("batchEventsSchema", () => {
            it("validates minimal batch with track event", () => {
                const result = batchEventsSchema.safeParse({
                    batch: [
                        {
                            type: "track",
                            userId: "user-123",
                            event: "Test Event"
                        }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("validates batch with multiple event types", () => {
                const result = batchEventsSchema.safeParse({
                    batch: [
                        { type: "track", userId: "user-1", event: "Purchase" },
                        {
                            type: "identify",
                            userId: "user-1",
                            traits: { email: "test@example.com" }
                        },
                        { type: "page", userId: "user-1", name: "Checkout" },
                        { type: "screen", userId: "user-1", name: "Receipt" },
                        { type: "group", userId: "user-1", groupId: "company-1" },
                        { type: "alias", userId: "user-1", previousId: "anon-1" }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("validates batch with top-level context", () => {
                const result = batchEventsSchema.safeParse({
                    batch: [{ type: "track", userId: "user-1", event: "Test" }],
                    context: {
                        library: { name: "flowmaestro", version: "1.0.0" }
                    }
                });
                expect(result.success).toBe(true);
            });

            it("validates batch with top-level integrations", () => {
                const result = batchEventsSchema.safeParse({
                    batch: [{ type: "track", userId: "user-1", event: "Test" }],
                    integrations: { All: true, "Google Analytics": false }
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty batch array", () => {
                const result = batchEventsSchema.safeParse({
                    batch: []
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing batch", () => {
                const result = batchEventsSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects invalid event type", () => {
                const result = batchEventsSchema.safeParse({
                    batch: [
                        {
                            type: "invalid",
                            userId: "user-123"
                        }
                    ]
                });
                expect(result.success).toBe(false);
            });

            it("rejects track event without event name", () => {
                const result = batchEventsSchema.safeParse({
                    batch: [
                        {
                            type: "track",
                            userId: "user-123"
                        }
                    ]
                });
                expect(result.success).toBe(false);
            });

            it("rejects group event without groupId", () => {
                const result = batchEventsSchema.safeParse({
                    batch: [
                        {
                            type: "group",
                            userId: "user-123"
                        }
                    ]
                });
                expect(result.success).toBe(false);
            });

            it("rejects alias event without previousId", () => {
                const result = batchEventsSchema.safeParse({
                    batch: [
                        {
                            type: "alias",
                            userId: "user-123"
                        }
                    ]
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
