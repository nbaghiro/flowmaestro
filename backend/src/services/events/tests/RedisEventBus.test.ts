/**
 * RedisEventBus Tests
 *
 * Tests for Redis pub/sub event bus (RedisEventBus.ts)
 */

// Mock the logging module
jest.mock("../../../core/logging", () => ({
    createServiceLogger: jest.fn().mockReturnValue({
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn()
    })
}));

// Mock config
jest.mock("../../../core/config", () => ({
    config: {
        redis: {
            host: "localhost",
            port: 6379
        }
    }
}));

// Create mock Redis instances
const mockPublish = jest.fn();
const mockPsubscribe = jest.fn();
const mockPunsubscribe = jest.fn();
const mockConnect = jest.fn();
const mockQuit = jest.fn();
const mockOn = jest.fn();

class MockRedis {
    on = mockOn;
    connect = mockConnect;
    publish = mockPublish;
    psubscribe = mockPsubscribe;
    punsubscribe = mockPunsubscribe;
    quit = mockQuit;

    constructor() {
        // Store event handlers
        mockOn.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
            // Store handler for later invocation in tests
            (this as Record<string, unknown>)[`_${event}Handler`] = handler;
            return this;
        });
    }
}

jest.mock("ioredis", () => MockRedis);

// Import after mocking
import type { WebSocketEvent, ThreadStreamingEvent } from "@flowmaestro/shared";
import { RedisEventBus } from "../RedisEventBus";

describe("RedisEventBus", () => {
    let eventBus: RedisEventBus;

    beforeEach(() => {
        jest.clearAllMocks();
        mockConnect.mockResolvedValue(undefined);
        mockPublish.mockResolvedValue(1);
        mockPsubscribe.mockResolvedValue(undefined);
        mockPunsubscribe.mockResolvedValue(undefined);
        mockQuit.mockResolvedValue(undefined);

        // Reset singleton by accessing private constructor
        // Note: We need to reset the singleton for testing
        (RedisEventBus as unknown as { instance: RedisEventBus | undefined }).instance = undefined;
        eventBus = RedisEventBus.getInstance();
    });

    describe("Singleton pattern", () => {
        it("should return same instance", () => {
            const instance1 = RedisEventBus.getInstance();
            const instance2 = RedisEventBus.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe("connect", () => {
        it("should connect publisher and subscriber", async () => {
            await eventBus.connect();

            expect(mockConnect).toHaveBeenCalledTimes(2);
            expect(eventBus.connected).toBe(true);
        });

        it("should not connect if already connected", async () => {
            await eventBus.connect();
            await eventBus.connect();

            expect(mockConnect).toHaveBeenCalledTimes(2); // Still only 2 (pub + sub)
        });

        it("should throw on connection error", async () => {
            mockConnect.mockRejectedValue(new Error("Connection refused"));

            await expect(eventBus.connect()).rejects.toThrow("Connection refused");
            expect(eventBus.connected).toBe(false);
        });
    });

    describe("publish", () => {
        it("should publish event to channel", async () => {
            await eventBus.connect();

            const event = { type: "test.event", data: { foo: "bar" } } as unknown as WebSocketEvent;
            await eventBus.publish("test-channel", event);

            expect(mockPublish).toHaveBeenCalledWith("test-channel", JSON.stringify(event));
        });

        it("should not publish when not connected", async () => {
            const event = { type: "test.event", data: {} } as unknown as WebSocketEvent;
            await eventBus.publish("test-channel", event);

            expect(mockPublish).not.toHaveBeenCalled();
        });

        it("should handle publish errors gracefully", async () => {
            await eventBus.connect();
            mockPublish.mockRejectedValue(new Error("Publish failed"));

            const event = { type: "test.event", data: {} } as unknown as WebSocketEvent;

            // Should not throw
            await expect(eventBus.publish("test-channel", event)).resolves.toBeUndefined();
        });
    });

    describe("publishJson", () => {
        it("should publish JSON data to channel", async () => {
            await eventBus.connect();

            const data = { type: "sse.event", message: "Hello" };
            await eventBus.publishJson("sse-channel", data);

            expect(mockPublish).toHaveBeenCalledWith("sse-channel", JSON.stringify(data));
        });

        it("should not publish when not connected", async () => {
            const data = { type: "sse.event" };
            await eventBus.publishJson("sse-channel", data);

            expect(mockPublish).not.toHaveBeenCalled();
        });
    });

    describe("subscribe", () => {
        it("should subscribe to pattern", async () => {
            await eventBus.connect();

            const handler = jest.fn();
            await eventBus.subscribe("workflow:*", handler);

            expect(mockPsubscribe).toHaveBeenCalledWith("workflow:*");
        });

        it("should auto-connect if not connected", async () => {
            const handler = jest.fn();
            await eventBus.subscribe("workflow:*", handler);

            expect(mockConnect).toHaveBeenCalled();
            expect(mockPsubscribe).toHaveBeenCalled();
        });

        it("should allow multiple handlers for same pattern", async () => {
            await eventBus.connect();

            const handler1 = jest.fn();
            const handler2 = jest.fn();

            await eventBus.subscribe("workflow:*", handler1);
            await eventBus.subscribe("workflow:*", handler2);

            // Should only subscribe to Redis once
            expect(mockPsubscribe).toHaveBeenCalledTimes(1);
        });
    });

    describe("unsubscribe", () => {
        it("should unsubscribe handler from pattern", async () => {
            await eventBus.connect();

            const handler = jest.fn();
            await eventBus.subscribe("workflow:*", handler);
            await eventBus.unsubscribe("workflow:*", handler);

            expect(mockPunsubscribe).toHaveBeenCalledWith("workflow:*");
        });

        it("should unsubscribe all handlers when no handler specified", async () => {
            await eventBus.connect();

            const handler = jest.fn();
            await eventBus.subscribe("workflow:*", handler);
            await eventBus.unsubscribe("workflow:*");

            expect(mockPunsubscribe).toHaveBeenCalled();
        });

        it("should not unsubscribe from Redis when other handlers exist", async () => {
            await eventBus.connect();

            const handler1 = jest.fn();
            const handler2 = jest.fn();

            await eventBus.subscribe("workflow:*", handler1);
            await eventBus.subscribe("workflow:*", handler2);
            await eventBus.unsubscribe("workflow:*", handler1);

            // Should not unsubscribe since handler2 still exists
            expect(mockPunsubscribe).not.toHaveBeenCalled();
        });

        it("should do nothing when pattern not subscribed", async () => {
            await eventBus.connect();
            await eventBus.unsubscribe("unknown:*");

            expect(mockPunsubscribe).not.toHaveBeenCalled();
        });
    });

    describe("disconnect", () => {
        it("should disconnect both clients", async () => {
            await eventBus.connect();
            await eventBus.disconnect();

            expect(mockQuit).toHaveBeenCalledTimes(2);
            expect(eventBus.connected).toBe(false);
        });

        it("should clear handlers on disconnect", async () => {
            await eventBus.connect();
            const handler = jest.fn();
            await eventBus.subscribe("test:*", handler);
            await eventBus.disconnect();

            // After disconnect, subscribing again should create new Redis subscription
            await eventBus.connect();
            await eventBus.subscribe("test:*", handler);

            expect(mockPsubscribe).toHaveBeenCalledTimes(2);
        });

        it("should do nothing when not connected", async () => {
            await eventBus.disconnect();

            expect(mockQuit).not.toHaveBeenCalled();
        });
    });

    describe("Thread events", () => {
        it("should publish thread event to correct channel", async () => {
            await eventBus.connect();

            const event = {
                type: "token",
                content: "Hello"
            } as unknown as ThreadStreamingEvent;
            await eventBus.publishThreadEvent("thread-123", event);

            expect(mockPublish).toHaveBeenCalledWith(
                "thread:thread-123:stream",
                expect.any(String)
            );
        });

        it("should subscribe to thread channel", async () => {
            await eventBus.connect();

            const handler = jest.fn();
            await eventBus.subscribeToThread("thread-456", handler);

            expect(mockPsubscribe).toHaveBeenCalledWith("thread:thread-456:stream");
        });

        it("should unsubscribe from thread channel", async () => {
            await eventBus.connect();

            const handler = jest.fn();
            await eventBus.subscribeToThread("thread-789", handler);
            await eventBus.unsubscribeFromThread("thread-789", handler);

            expect(mockPunsubscribe).toHaveBeenCalledWith("thread:thread-789:stream");
        });
    });

    describe("connected getter", () => {
        it("should return false initially", () => {
            expect(eventBus.connected).toBe(false);
        });

        it("should return true after connect", async () => {
            await eventBus.connect();
            expect(eventBus.connected).toBe(true);
        });

        it("should return false after disconnect", async () => {
            await eventBus.connect();
            await eventBus.disconnect();
            expect(eventBus.connected).toBe(false);
        });
    });
});
