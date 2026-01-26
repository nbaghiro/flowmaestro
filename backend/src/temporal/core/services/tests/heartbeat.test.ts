/**
 * Heartbeat Management Tests
 *
 * Tests for Temporal activity heartbeat management.
 */

import { Context } from "@temporalio/activity";
import {
    HeartbeatManager,
    createHeartbeatManager,
    sendHeartbeat,
    isCancelled,
    getCancellationSignal,
    withHeartbeat,
    createStreamingProgressCallback,
    type HeartbeatProgress,
    type HeartbeatOperations
} from "../heartbeat";

// Mock Temporal Context
const mockHeartbeat = jest.fn();
const mockCancelled = Promise.resolve();
const mockCancellationSignal = new AbortController().signal;

jest.mock("@temporalio/activity", () => ({
    Context: {
        current: jest.fn()
    }
}));

describe("Heartbeat Management", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe("HeartbeatManager", () => {
        let mockContext: {
            heartbeat: jest.Mock;
            cancelled: Promise<void>;
            cancellationSignal: AbortSignal;
        };

        beforeEach(() => {
            mockContext = {
                heartbeat: mockHeartbeat,
                cancelled: mockCancelled,
                cancellationSignal: mockCancellationSignal
            };
        });

        it("should create a heartbeat manager with default interval", () => {
            const manager = new HeartbeatManager(
                mockContext as unknown as ConstructorParameters<typeof HeartbeatManager>[0],
                "testActivity"
            );

            expect(manager).toBeDefined();
            expect(manager.isActive()).toBe(false);
            expect(manager.getHeartbeatCount()).toBe(0);
        });

        it("should create a heartbeat manager with custom interval", () => {
            const manager = new HeartbeatManager(
                mockContext as unknown as ConstructorParameters<typeof HeartbeatManager>[0],
                "testActivity",
                5000
            );

            expect(manager).toBeDefined();
        });

        describe("start", () => {
            it("should start heartbeating", () => {
                const manager = new HeartbeatManager(
                    mockContext as unknown as ConstructorParameters<typeof HeartbeatManager>[0],
                    "testActivity",
                    1000
                );

                manager.start();

                expect(manager.isActive()).toBe(true);
                expect(mockHeartbeat).toHaveBeenCalledTimes(1);
            });

            it("should send initial heartbeat immediately", () => {
                const manager = new HeartbeatManager(
                    mockContext as unknown as ConstructorParameters<typeof HeartbeatManager>[0],
                    "testActivity",
                    1000
                );

                manager.start();

                expect(mockHeartbeat).toHaveBeenCalledWith(
                    expect.objectContaining({
                        activityName: "testActivity",
                        heartbeatCount: 1
                    })
                );
            });

            it("should send heartbeats at intervals", () => {
                const manager = new HeartbeatManager(
                    mockContext as unknown as ConstructorParameters<typeof HeartbeatManager>[0],
                    "testActivity",
                    1000
                );

                manager.start();
                expect(mockHeartbeat).toHaveBeenCalledTimes(1);

                jest.advanceTimersByTime(1000);
                expect(mockHeartbeat).toHaveBeenCalledTimes(2);

                jest.advanceTimersByTime(1000);
                expect(mockHeartbeat).toHaveBeenCalledTimes(3);
            });

            it("should include initial progress if provided", () => {
                const manager = new HeartbeatManager(
                    mockContext as unknown as ConstructorParameters<typeof HeartbeatManager>[0],
                    "testActivity",
                    1000
                );

                const progress: HeartbeatProgress = {
                    step: "initializing",
                    percentComplete: 0
                };

                manager.start(progress);

                expect(mockHeartbeat).toHaveBeenCalledWith(
                    expect.objectContaining({
                        step: "initializing",
                        percentComplete: 0
                    })
                );
            });

            it("should not start twice", () => {
                const manager = new HeartbeatManager(
                    mockContext as unknown as ConstructorParameters<typeof HeartbeatManager>[0],
                    "testActivity",
                    1000
                );

                manager.start();
                manager.start();

                expect(mockHeartbeat).toHaveBeenCalledTimes(1);
            });
        });

        describe("update", () => {
            it("should update progress and send heartbeat immediately", () => {
                const manager = new HeartbeatManager(
                    mockContext as unknown as ConstructorParameters<typeof HeartbeatManager>[0],
                    "testActivity",
                    1000
                );

                manager.start();
                mockHeartbeat.mockClear();

                manager.update({ percentComplete: 50, step: "processing" });

                expect(mockHeartbeat).toHaveBeenCalledWith(
                    expect.objectContaining({
                        percentComplete: 50,
                        step: "processing"
                    })
                );
            });

            it("should merge progress updates", () => {
                const manager = new HeartbeatManager(
                    mockContext as unknown as ConstructorParameters<typeof HeartbeatManager>[0],
                    "testActivity",
                    1000
                );

                manager.start({ step: "starting", itemsProcessed: 0 });
                mockHeartbeat.mockClear();

                manager.update({ itemsProcessed: 10 });

                expect(mockHeartbeat).toHaveBeenCalledWith(
                    expect.objectContaining({
                        step: "starting",
                        itemsProcessed: 10
                    })
                );
            });

            it("should increment heartbeat count on update", () => {
                const manager = new HeartbeatManager(
                    mockContext as unknown as ConstructorParameters<typeof HeartbeatManager>[0],
                    "testActivity",
                    1000
                );

                manager.start();
                expect(manager.getHeartbeatCount()).toBe(1);

                manager.update({ percentComplete: 50 });
                expect(manager.getHeartbeatCount()).toBe(2);
            });
        });

        describe("stop", () => {
            it("should stop heartbeating", () => {
                const manager = new HeartbeatManager(
                    mockContext as unknown as ConstructorParameters<typeof HeartbeatManager>[0],
                    "testActivity",
                    1000
                );

                manager.start();
                expect(manager.isActive()).toBe(true);

                manager.stop();
                expect(manager.isActive()).toBe(false);
            });

            it("should stop interval timer", () => {
                const manager = new HeartbeatManager(
                    mockContext as unknown as ConstructorParameters<typeof HeartbeatManager>[0],
                    "testActivity",
                    1000
                );

                manager.start();
                expect(mockHeartbeat).toHaveBeenCalledTimes(1);

                manager.stop();

                jest.advanceTimersByTime(5000);
                expect(mockHeartbeat).toHaveBeenCalledTimes(1);
            });

            it("should be safe to call multiple times", () => {
                const manager = new HeartbeatManager(
                    mockContext as unknown as ConstructorParameters<typeof HeartbeatManager>[0],
                    "testActivity",
                    1000
                );

                manager.start();
                manager.stop();
                manager.stop();
                manager.stop();

                expect(manager.isActive()).toBe(false);
            });
        });

        describe("getHeartbeatCount", () => {
            it("should return 0 before start", () => {
                const manager = new HeartbeatManager(
                    mockContext as unknown as ConstructorParameters<typeof HeartbeatManager>[0],
                    "testActivity",
                    1000
                );

                expect(manager.getHeartbeatCount()).toBe(0);
            });

            it("should track heartbeat count accurately", () => {
                const manager = new HeartbeatManager(
                    mockContext as unknown as ConstructorParameters<typeof HeartbeatManager>[0],
                    "testActivity",
                    1000
                );

                manager.start();
                expect(manager.getHeartbeatCount()).toBe(1);

                jest.advanceTimersByTime(1000);
                expect(manager.getHeartbeatCount()).toBe(2);

                jest.advanceTimersByTime(2000);
                expect(manager.getHeartbeatCount()).toBe(4);
            });
        });

        describe("isActive", () => {
            it("should return false initially", () => {
                const manager = new HeartbeatManager(
                    mockContext as unknown as ConstructorParameters<typeof HeartbeatManager>[0],
                    "testActivity",
                    1000
                );

                expect(manager.isActive()).toBe(false);
            });

            it("should return true after start", () => {
                const manager = new HeartbeatManager(
                    mockContext as unknown as ConstructorParameters<typeof HeartbeatManager>[0],
                    "testActivity",
                    1000
                );

                manager.start();
                expect(manager.isActive()).toBe(true);
            });

            it("should return false after stop", () => {
                const manager = new HeartbeatManager(
                    mockContext as unknown as ConstructorParameters<typeof HeartbeatManager>[0],
                    "testActivity",
                    1000
                );

                manager.start();
                manager.stop();
                expect(manager.isActive()).toBe(false);
            });
        });

        describe("error handling", () => {
            it("should handle heartbeat errors gracefully", () => {
                mockHeartbeat.mockImplementationOnce(() => {
                    throw new Error("Heartbeat failed");
                });

                const manager = new HeartbeatManager(
                    mockContext as unknown as ConstructorParameters<typeof HeartbeatManager>[0],
                    "testActivity",
                    1000
                );

                // Should not throw
                expect(() => manager.start()).not.toThrow();
            });
        });
    });

    describe("createHeartbeatManager", () => {
        it("should return null when not in activity context", () => {
            (Context.current as jest.Mock).mockImplementation(() => {
                throw new Error("Not in activity context");
            });

            const manager = createHeartbeatManager("testActivity");

            expect(manager).toBeNull();
        });

        it("should create manager when in activity context", () => {
            (Context.current as jest.Mock).mockReturnValue({
                heartbeat: mockHeartbeat,
                cancelled: mockCancelled,
                cancellationSignal: mockCancellationSignal
            });

            const manager = createHeartbeatManager("testActivity");

            expect(manager).not.toBeNull();
        });

        it("should pass custom interval to manager", () => {
            (Context.current as jest.Mock).mockReturnValue({
                heartbeat: mockHeartbeat,
                cancelled: mockCancelled,
                cancellationSignal: mockCancellationSignal
            });

            const manager = createHeartbeatManager("testActivity", 5000);

            expect(manager).not.toBeNull();
        });
    });

    describe("sendHeartbeat", () => {
        it("should return false when not in activity context", () => {
            (Context.current as jest.Mock).mockImplementation(() => {
                throw new Error("Not in activity context");
            });

            const result = sendHeartbeat({ step: "test" });

            expect(result).toBe(false);
        });

        it("should return true and send heartbeat when in context", () => {
            (Context.current as jest.Mock).mockReturnValue({
                heartbeat: mockHeartbeat
            });

            const result = sendHeartbeat({ step: "test", percentComplete: 50 });

            expect(result).toBe(true);
            expect(mockHeartbeat).toHaveBeenCalledWith({
                step: "test",
                percentComplete: 50
            });
        });

        it("should send heartbeat without details", () => {
            (Context.current as jest.Mock).mockReturnValue({
                heartbeat: mockHeartbeat
            });

            const result = sendHeartbeat();

            expect(result).toBe(true);
            expect(mockHeartbeat).toHaveBeenCalledWith(undefined);
        });
    });

    describe("isCancelled", () => {
        it("should return false when not in activity context", async () => {
            (Context.current as jest.Mock).mockImplementation(() => {
                throw new Error("Not in activity context");
            });

            const result = await isCancelled();

            expect(result).toBe(false);
        });

        it("should return false when not cancelled", async () => {
            // Create a cancelled promise that never resolves
            const neverCancelled = new Promise<void>(() => {
                // Intentionally never resolves
            });

            (Context.current as jest.Mock).mockReturnValue({
                cancelled: neverCancelled
            });

            const result = await isCancelled();

            expect(result).toBe(false);
        });
    });

    describe("getCancellationSignal", () => {
        it("should return undefined when not in activity context", () => {
            (Context.current as jest.Mock).mockImplementation(() => {
                throw new Error("Not in activity context");
            });

            const signal = getCancellationSignal();

            expect(signal).toBeUndefined();
        });

        it("should return signal when in activity context", () => {
            (Context.current as jest.Mock).mockReturnValue({
                cancellationSignal: mockCancellationSignal
            });

            const signal = getCancellationSignal();

            expect(signal).toBe(mockCancellationSignal);
        });
    });

    describe("withHeartbeat", () => {
        it("should run operation with dummy manager when not in context", async () => {
            (Context.current as jest.Mock).mockImplementation(() => {
                throw new Error("Not in activity context");
            });

            let capturedManager: HeartbeatOperations | null = null;

            const result = await withHeartbeat("testActivity", async (heartbeat) => {
                capturedManager = heartbeat;
                return "result";
            });

            expect(result).toBe("result");
            expect(capturedManager).not.toBeNull();
            expect(capturedManager!.isActive()).toBe(false);
            expect(capturedManager!.getHeartbeatCount()).toBe(0);
        });

        it("should run operation with real manager when in context", async () => {
            (Context.current as jest.Mock).mockReturnValue({
                heartbeat: mockHeartbeat,
                cancelled: mockCancelled,
                cancellationSignal: mockCancellationSignal
            });

            const result = await withHeartbeat("testActivity", async (heartbeat) => {
                expect(heartbeat.isActive()).toBe(true);
                heartbeat.update({ step: "processing" });
                return "result";
            });

            expect(result).toBe("result");
            expect(mockHeartbeat).toHaveBeenCalled();
        });

        it("should stop manager after operation completes", async () => {
            (Context.current as jest.Mock).mockReturnValue({
                heartbeat: mockHeartbeat,
                cancelled: mockCancelled,
                cancellationSignal: mockCancellationSignal
            });

            let capturedManager: HeartbeatOperations | null = null;

            await withHeartbeat("testActivity", async (heartbeat) => {
                capturedManager = heartbeat;
                return "result";
            });

            // Manager should be stopped after operation
            expect(capturedManager!.isActive()).toBe(false);
        });

        it("should stop manager even on error", async () => {
            (Context.current as jest.Mock).mockReturnValue({
                heartbeat: mockHeartbeat,
                cancelled: mockCancelled,
                cancellationSignal: mockCancellationSignal
            });

            let capturedManager: HeartbeatOperations | null = null;

            try {
                await withHeartbeat("testActivity", async (heartbeat) => {
                    capturedManager = heartbeat;
                    throw new Error("Operation failed");
                });
            } catch {
                // Expected
            }

            expect(capturedManager!.isActive()).toBe(false);
        });
    });

    describe("createStreamingProgressCallback", () => {
        let mockContext: {
            heartbeat: jest.Mock;
        };
        let manager: HeartbeatManager;

        beforeEach(() => {
            mockContext = {
                heartbeat: mockHeartbeat
            };
            manager = new HeartbeatManager(
                mockContext as unknown as ConstructorParameters<typeof HeartbeatManager>[0],
                "testActivity",
                1000
            );
            manager.start();
            mockHeartbeat.mockClear();
        });

        afterEach(() => {
            manager.stop();
        });

        it("should create a progress callback", () => {
            const callback = createStreamingProgressCallback(manager);

            expect(typeof callback).toBe("function");
        });

        it("should update progress with items processed", () => {
            const callback = createStreamingProgressCallback(manager);

            callback(10);

            expect(mockHeartbeat).toHaveBeenCalledWith(
                expect.objectContaining({
                    itemsProcessed: 10,
                    step: "streaming"
                })
            );
        });

        it("should calculate percent complete when total provided", () => {
            const callback = createStreamingProgressCallback(manager, 100);

            callback(50);

            expect(mockHeartbeat).toHaveBeenCalledWith(
                expect.objectContaining({
                    itemsProcessed: 50,
                    totalItems: 100,
                    percentComplete: 50
                })
            );
        });

        it("should include message when provided", () => {
            const callback = createStreamingProgressCallback(manager);

            callback(10, "Processing batch 1");

            expect(mockHeartbeat).toHaveBeenCalledWith(
                expect.objectContaining({
                    itemsProcessed: 10,
                    message: "Processing batch 1"
                })
            );
        });

        it("should calculate correct percentages", () => {
            const callback = createStreamingProgressCallback(manager, 200);

            callback(50);
            expect(mockHeartbeat).toHaveBeenLastCalledWith(
                expect.objectContaining({ percentComplete: 25 })
            );

            callback(100);
            expect(mockHeartbeat).toHaveBeenLastCalledWith(
                expect.objectContaining({ percentComplete: 50 })
            );

            callback(200);
            expect(mockHeartbeat).toHaveBeenLastCalledWith(
                expect.objectContaining({ percentComplete: 100 })
            );
        });
    });

    describe("HeartbeatProgress interface", () => {
        it("should allow all optional fields", () => {
            const progress: HeartbeatProgress = {};
            expect(progress).toBeDefined();
        });

        it("should allow all defined fields", () => {
            const progress: HeartbeatProgress = {
                step: "processing",
                percentComplete: 50,
                itemsProcessed: 100,
                totalItems: 200,
                bytesProcessed: 1024,
                totalBytes: 2048,
                message: "Halfway done",
                customField: "custom value"
            };

            expect(progress.step).toBe("processing");
            expect(progress.percentComplete).toBe(50);
            expect(progress.customField).toBe("custom value");
        });
    });
});
