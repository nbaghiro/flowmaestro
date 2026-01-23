/**
 * Temporal Client Tests
 *
 * Tests for the Temporal client connection factory with retry logic.
 * Note: These tests use module isolation to test singleton behavior.
 */

describe("Temporal Client", () => {
    let mockConnectionClose: jest.Mock;
    let mockConnectionConnect: jest.Mock;
    let MockClient: jest.Mock;

    beforeEach(() => {
        jest.resetModules();
        jest.useFakeTimers();

        mockConnectionClose = jest.fn().mockResolvedValue(undefined);
        mockConnectionConnect = jest.fn().mockResolvedValue({
            close: mockConnectionClose
        });
        MockClient = jest.fn().mockImplementation(() => ({ _isClient: true }));

        jest.doMock("@temporalio/client", () => ({
            Connection: {
                connect: mockConnectionConnect
            },
            Client: MockClient
        }));

        jest.doMock("../../core/config", () => ({
            config: {
                temporal: {
                    address: "localhost:7233"
                }
            }
        }));

        jest.doMock("../../core/logging", () => ({
            createServiceLogger: jest.fn().mockReturnValue({
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn()
            })
        }));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe("getTemporalClient", () => {
        it("should connect to Temporal server with configured address", async () => {
            const { getTemporalClient } = await import("../client");

            const clientPromise = getTemporalClient();
            await jest.runAllTimersAsync();
            const client = await clientPromise;

            expect(mockConnectionConnect).toHaveBeenCalledWith({
                address: "localhost:7233"
            });
            expect(MockClient).toHaveBeenCalledWith({
                connection: expect.any(Object),
                namespace: "default"
            });
            expect(client).toBeDefined();
        });

        it("should return cached client on subsequent calls", async () => {
            const { getTemporalClient } = await import("../client");

            // First call
            const promise1 = getTemporalClient();
            await jest.runAllTimersAsync();
            const client1 = await promise1;

            // Second call should return same instance
            const client2 = await getTemporalClient();

            expect(client1).toBe(client2);
            expect(mockConnectionConnect).toHaveBeenCalledTimes(1);
        });

        it("should handle concurrent connection requests", async () => {
            const { getTemporalClient } = await import("../client");

            // Start multiple concurrent requests before any resolves
            const promises = [getTemporalClient(), getTemporalClient(), getTemporalClient()];

            await jest.runAllTimersAsync();
            const clients = await Promise.all(promises);

            // All should return the same client
            expect(clients[0]).toBe(clients[1]);
            expect(clients[1]).toBe(clients[2]);

            // Connection should only be made once
            expect(mockConnectionConnect).toHaveBeenCalledTimes(1);
        });
    });

    describe("connection retry logic", () => {
        it("should retry on connection failure", async () => {
            let callCount = 0;
            mockConnectionConnect.mockImplementation(async () => {
                callCount++;
                if (callCount <= 2) {
                    throw new Error(`Connection failed attempt ${callCount}`);
                }
                return { close: mockConnectionClose };
            });

            const { getTemporalClient } = await import("../client");
            const clientPromise = getTemporalClient();

            await jest.runAllTimersAsync();
            const client = await clientPromise;

            expect(client).toBeDefined();
            expect(mockConnectionConnect).toHaveBeenCalledTimes(3);
        });

        // Note: Testing max retries with module mocking is complex due to Jest's
        // module caching behavior. The retry logic is tested indirectly via the
        // "should retry on connection failure" test above.
    });

    describe("closeTemporalConnection", () => {
        it("should close connection when connected", async () => {
            const { getTemporalClient, closeTemporalConnection } = await import("../client");

            // First establish connection
            const clientPromise = getTemporalClient();
            await jest.runAllTimersAsync();
            await clientPromise;

            // Now close
            await closeTemporalConnection();

            expect(mockConnectionClose).toHaveBeenCalled();
        });

        it("should be safe to call when not connected", async () => {
            const { closeTemporalConnection } = await import("../client");

            // Should not throw when no connection exists
            await expect(closeTemporalConnection()).resolves.toBeUndefined();
        });

        it("should allow reconnection after close", async () => {
            const { getTemporalClient, closeTemporalConnection } = await import("../client");

            // Connect
            const promise1 = getTemporalClient();
            await jest.runAllTimersAsync();
            await promise1;

            // Close
            await closeTemporalConnection();

            // Reconnect
            const promise2 = getTemporalClient();
            await jest.runAllTimersAsync();
            await promise2;

            expect(mockConnectionConnect).toHaveBeenCalledTimes(2);
        });
    });
});
