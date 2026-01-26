/**
 * EventBridge Tests
 *
 * Tests for Redis event bus wrapper (EventBridge.ts)
 */

// Mock the RedisEventBus singleton
const mockConnect = jest.fn();

jest.mock("../../events/RedisEventBus", () => ({
    redisEventBus: {
        connect: mockConnect
    }
}));

// Mock logging
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

// Import after mocks
import { EventBridge, eventBridge } from "../EventBridge";

describe("EventBridge", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockConnect.mockResolvedValue(undefined);
        // Reset singleton state
        (EventBridge as unknown as { instance: EventBridge | null }).instance = null;
    });

    describe("getInstance", () => {
        it("should return singleton instance", () => {
            const instance1 = EventBridge.getInstance();
            const instance2 = EventBridge.getInstance();

            expect(instance1).toBe(instance2);
        });

        it("should create new instance on first call", () => {
            const instance = EventBridge.getInstance();

            expect(instance).toBeDefined();
            expect(instance).toBeInstanceOf(EventBridge);
        });
    });

    describe("initialize", () => {
        it("should connect to Redis event bus", async () => {
            const bridge = EventBridge.getInstance();

            await bridge.initialize();

            expect(mockConnect).toHaveBeenCalled();
        });

        it("should set initialized to true on success", async () => {
            const bridge = EventBridge.getInstance();

            await bridge.initialize();

            expect(bridge.isInitialized()).toBe(true);
        });

        it("should not reinitialize if already initialized", async () => {
            const bridge = EventBridge.getInstance();

            await bridge.initialize();
            await bridge.initialize();

            expect(mockConnect).toHaveBeenCalledTimes(1);
        });

        it("should set initialized to true even if Redis fails", async () => {
            mockConnect.mockRejectedValue(new Error("Redis connection error"));
            const bridge = EventBridge.getInstance();

            await bridge.initialize();

            // Still marks as initialized (but logs error)
            expect(bridge.isInitialized()).toBe(true);
        });
    });

    describe("isInitialized", () => {
        it("should return false before initialization", () => {
            const bridge = EventBridge.getInstance();

            expect(bridge.isInitialized()).toBe(false);
        });

        it("should return true after initialization", async () => {
            const bridge = EventBridge.getInstance();

            await bridge.initialize();

            expect(bridge.isInitialized()).toBe(true);
        });
    });

    describe("eventBridge singleton export", () => {
        it("should export global singleton", () => {
            expect(eventBridge).toBeDefined();
            expect(eventBridge).toBeInstanceOf(EventBridge);
        });
    });
});
