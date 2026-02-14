/**
 * Heartbeat Integration Tests
 *
 * Tests the Temporal heartbeat functionality for long-running activities.
 * Heartbeats are used to:
 * - Report progress during long operations
 * - Detect activity cancellation
 * - Prevent activity timeout
 *
 * Activities using heartbeat: llm, embeddings, audio, router, http, database, code
 */

import { Context } from "@temporalio/activity";
import { HEARTBEAT_INTERVALS } from "../../../../src/temporal/core/constants";
import {
    HeartbeatManager,
    createHeartbeatManager,
    sendHeartbeat,
    withHeartbeat,
    isCancelled,
    getCancellationSignal,
    createStreamingProgressCallback,
    type HeartbeatProgress,
    type HeartbeatOperations
} from "../../../../src/temporal/core/services/heartbeat";

// Increase test timeout
jest.setTimeout(30000);

// ============================================================================
// MOCK ACTIVITY CONTEXT
// ============================================================================

/**
 * Create a mock Temporal activity context for testing
 */
function createMockActivityContext(): {
    context: Context;
    heartbeatCalls: HeartbeatProgress[];
    triggerCancellation: () => void;
    cancellationPromise: Promise<never>;
} {
    const heartbeatCalls: HeartbeatProgress[] = [];
    let resolveCancellation: () => void;

    const cancellationPromise = new Promise<never>((_, reject) => {
        resolveCancellation = () => {
            reject(new Error("Activity cancelled"));
        };
    });

    const mockContext = {
        heartbeat: (details?: HeartbeatProgress) => {
            if (details) {
                heartbeatCalls.push(details);
            }
        },
        cancelled: cancellationPromise,
        cancellationSignal: new AbortController().signal,
        info: {
            activityId: "test-activity-id",
            activityType: "testActivity",
            taskQueue: "test-queue",
            workflowExecution: {
                workflowId: "test-workflow-id",
                runId: "test-run-id"
            }
        }
    } as unknown as Context;

    return {
        context: mockContext,
        heartbeatCalls,
        triggerCancellation: () => resolveCancellation(),
        cancellationPromise
    };
}

// ============================================================================
// HEARTBEAT MANAGER UNIT TESTS
// ============================================================================

describe("HeartbeatManager Unit Tests", () => {
    let originalContextCurrent: typeof Context.current;

    beforeAll(() => {
        // Store original Context.current
        originalContextCurrent = Context.current;
    });

    afterAll(() => {
        // Restore original Context.current
        (Context as { current: typeof Context.current }).current = originalContextCurrent;
    });

    describe("HeartbeatManager Class", () => {
        it("should create a heartbeat manager with default interval", () => {
            const { context, heartbeatCalls } = createMockActivityContext();

            const manager = new HeartbeatManager(context, "testActivity");

            expect(manager.getHeartbeatCount()).toBe(0);
            expect(manager.isActive()).toBe(false);
            expect(heartbeatCalls).toHaveLength(0);
        });

        it("should create a heartbeat manager with custom interval", () => {
            const { context } = createMockActivityContext();

            const manager = new HeartbeatManager(context, "testActivity", 5000);

            expect(manager).toBeDefined();
        });

        it("should send initial heartbeat on start", async () => {
            const { context, heartbeatCalls } = createMockActivityContext();

            const manager = new HeartbeatManager(context, "testActivity", 100);
            manager.start();

            // Initial heartbeat should be sent immediately
            expect(heartbeatCalls.length).toBeGreaterThanOrEqual(1);
            expect(manager.isActive()).toBe(true);
            expect(manager.getHeartbeatCount()).toBe(1);

            manager.stop();
        });

        it("should send heartbeats at regular intervals", async () => {
            const { context, heartbeatCalls } = createMockActivityContext();

            const manager = new HeartbeatManager(context, "testActivity", 50);
            manager.start();

            // Wait for multiple intervals
            await delay(150);

            // Should have sent multiple heartbeats
            expect(manager.getHeartbeatCount()).toBeGreaterThanOrEqual(3);
            expect(heartbeatCalls.length).toBeGreaterThanOrEqual(3);

            manager.stop();
        });

        it("should stop heartbeating when stop is called", async () => {
            const { context } = createMockActivityContext();

            const manager = new HeartbeatManager(context, "testActivity", 50);
            manager.start();

            await delay(100);
            const countAtStop = manager.getHeartbeatCount();
            manager.stop();

            expect(manager.isActive()).toBe(false);

            // Wait and verify no more heartbeats
            await delay(100);
            expect(manager.getHeartbeatCount()).toBe(countAtStop);
        });

        it("should update progress and send immediate heartbeat", () => {
            const { context, heartbeatCalls } = createMockActivityContext();

            const manager = new HeartbeatManager(context, "testActivity", 10000);
            manager.start();

            const initialCount = manager.getHeartbeatCount();

            manager.update({
                step: "processing",
                percentComplete: 50,
                itemsProcessed: 5,
                totalItems: 10
            });

            expect(manager.getHeartbeatCount()).toBe(initialCount + 1);

            // Find the update heartbeat
            const updateHeartbeat = heartbeatCalls.find((h) => h.step === "processing");
            expect(updateHeartbeat).toBeDefined();
            expect(updateHeartbeat?.percentComplete).toBe(50);
            expect(updateHeartbeat?.itemsProcessed).toBe(5);
            expect(updateHeartbeat?.totalItems).toBe(10);

            manager.stop();
        });

        it("should merge progress updates", () => {
            const { context, heartbeatCalls } = createMockActivityContext();

            const manager = new HeartbeatManager(context, "testActivity", 10000);
            manager.start({ step: "init" });

            manager.update({ percentComplete: 25 });
            manager.update({ percentComplete: 50, message: "halfway" });

            // Should have initial + 2 updates
            expect(manager.getHeartbeatCount()).toBe(3);

            // Last heartbeat should have merged values
            const lastHeartbeat = heartbeatCalls[heartbeatCalls.length - 1];
            expect(lastHeartbeat.percentComplete).toBe(50);
            expect(lastHeartbeat.message).toBe("halfway");

            manager.stop();
        });

        it("should not start twice", () => {
            const { context } = createMockActivityContext();

            const manager = new HeartbeatManager(context, "testActivity", 50);
            manager.start();

            const countAfterFirstStart = manager.getHeartbeatCount();
            manager.start(); // Should be no-op

            expect(manager.getHeartbeatCount()).toBe(countAfterFirstStart);

            manager.stop();
        });

        it("should include activity name and timestamp in heartbeat", () => {
            const { context, heartbeatCalls } = createMockActivityContext();

            const manager = new HeartbeatManager(context, "myCustomActivity", 10000);
            manager.start();

            expect(heartbeatCalls.length).toBeGreaterThanOrEqual(1);
            expect(heartbeatCalls[0].activityName).toBe("myCustomActivity");
            expect(heartbeatCalls[0].timestamp).toBeDefined();
            expect(heartbeatCalls[0].heartbeatCount).toBe(1);

            manager.stop();
        });
    });

    describe("createHeartbeatManager Helper", () => {
        it("should return null when not in activity context", () => {
            // Mock Context.current to throw
            (Context as { current: typeof Context.current }).current = () => {
                throw new Error("Not in activity context");
            };

            const manager = createHeartbeatManager("testActivity");

            expect(manager).toBeNull();
        });

        it("should create manager when in activity context", () => {
            const { context } = createMockActivityContext();

            // Mock Context.current to return our mock
            (Context as { current: typeof Context.current }).current = () => context;

            const manager = createHeartbeatManager("testActivity");

            expect(manager).not.toBeNull();
            expect(manager).toBeInstanceOf(HeartbeatManager);

            // Restore
            (Context as { current: typeof Context.current }).current = originalContextCurrent;
        });
    });

    describe("sendHeartbeat Helper", () => {
        it("should return false when not in activity context", () => {
            // Mock Context.current to throw
            (Context as { current: typeof Context.current }).current = () => {
                throw new Error("Not in activity context");
            };

            const result = sendHeartbeat({ step: "test" });

            expect(result).toBe(false);
        });

        it("should return true and send heartbeat when in context", () => {
            const { context, heartbeatCalls } = createMockActivityContext();

            // Mock Context.current
            (Context as { current: typeof Context.current }).current = () => context;

            const result = sendHeartbeat({ step: "test", percentComplete: 75 });

            expect(result).toBe(true);
            expect(heartbeatCalls).toHaveLength(1);
            expect(heartbeatCalls[0].step).toBe("test");

            // Restore
            (Context as { current: typeof Context.current }).current = originalContextCurrent;
        });
    });

    describe("withHeartbeat Wrapper", () => {
        it("should run operation with heartbeat manager", async () => {
            const { context, heartbeatCalls } = createMockActivityContext();

            // Mock Context.current
            (Context as { current: typeof Context.current }).current = () => context;

            let capturedHeartbeat: HeartbeatOperations | null = null;

            const result = await withHeartbeat("testOp", async (heartbeat) => {
                capturedHeartbeat = heartbeat;
                heartbeat.update({ step: "running", percentComplete: 50 });
                return "success";
            });

            expect(result).toBe("success");
            expect(capturedHeartbeat).not.toBeNull();
            expect(heartbeatCalls.some((h) => h.step === "running")).toBe(true);

            // Restore
            (Context as { current: typeof Context.current }).current = originalContextCurrent;
        });

        it("should provide dummy manager when not in activity context", async () => {
            // Mock Context.current to throw
            (Context as { current: typeof Context.current }).current = () => {
                throw new Error("Not in activity context");
            };

            let capturedHeartbeat: HeartbeatOperations | undefined;

            const result = await withHeartbeat("testOp", async (heartbeat) => {
                capturedHeartbeat = heartbeat;
                heartbeat.start();
                heartbeat.update({ step: "test" });
                heartbeat.stop();
                return "worked";
            });

            expect(result).toBe("worked");
            expect(capturedHeartbeat).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(capturedHeartbeat!.getHeartbeatCount()).toBe(0);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(capturedHeartbeat!.isActive()).toBe(false);
        });

        it("should stop heartbeat manager after operation completes", async () => {
            const { context } = createMockActivityContext();

            // Mock Context.current
            (Context as { current: typeof Context.current }).current = () => context;

            let managerRef: HeartbeatOperations | undefined;

            await withHeartbeat("testOp", async (heartbeat) => {
                managerRef = heartbeat;
                expect(heartbeat.isActive()).toBe(true);
                return "done";
            });

            // After completion, manager should be stopped
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(managerRef!.isActive()).toBe(false);

            // Restore
            (Context as { current: typeof Context.current }).current = originalContextCurrent;
        });

        it("should stop heartbeat manager even if operation throws", async () => {
            const { context } = createMockActivityContext();

            // Mock Context.current
            (Context as { current: typeof Context.current }).current = () => context;

            let managerRef: HeartbeatOperations | undefined;

            await expect(
                withHeartbeat("testOp", async (heartbeat) => {
                    managerRef = heartbeat;
                    throw new Error("Operation failed");
                })
            ).rejects.toThrow("Operation failed");

            // Manager should still be stopped
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(managerRef!.isActive()).toBe(false);

            // Restore
            (Context as { current: typeof Context.current }).current = originalContextCurrent;
        });

        it("should use custom interval when provided", async () => {
            const { context, heartbeatCalls } = createMockActivityContext();

            // Mock Context.current
            (Context as { current: typeof Context.current }).current = () => context;

            await withHeartbeat(
                "testOp",
                async () => {
                    await delay(150);
                    return "done";
                },
                50 // Custom interval of 50ms
            );

            // Should have multiple heartbeats due to short interval
            expect(heartbeatCalls.length).toBeGreaterThan(2);

            // Restore
            (Context as { current: typeof Context.current }).current = originalContextCurrent;
        });
    });

    describe("isCancelled Helper", () => {
        it("should return false when not in activity context", async () => {
            // Mock Context.current to throw
            (Context as { current: typeof Context.current }).current = () => {
                throw new Error("Not in activity context");
            };

            const result = await isCancelled();

            expect(result).toBe(false);
        });

        it("should return false when not cancelled", async () => {
            const { context } = createMockActivityContext();

            // Mock Context.current
            (Context as { current: typeof Context.current }).current = () => context;

            const result = await isCancelled();

            expect(result).toBe(false);

            // Restore
            (Context as { current: typeof Context.current }).current = originalContextCurrent;
        });
    });

    describe("getCancellationSignal Helper", () => {
        it("should return undefined when not in activity context", () => {
            // Mock Context.current to throw
            (Context as { current: typeof Context.current }).current = () => {
                throw new Error("Not in activity context");
            };

            const signal = getCancellationSignal();

            expect(signal).toBeUndefined();
        });

        it("should return AbortSignal when in context", () => {
            const { context } = createMockActivityContext();

            // Mock Context.current
            (Context as { current: typeof Context.current }).current = () => context;

            const signal = getCancellationSignal();

            expect(signal).toBeDefined();
            expect(signal).toBeInstanceOf(AbortSignal);

            // Restore
            (Context as { current: typeof Context.current }).current = originalContextCurrent;
        });
    });

    describe("createStreamingProgressCallback", () => {
        it("should create callback that updates heartbeat with progress", () => {
            const { context, heartbeatCalls } = createMockActivityContext();

            const manager = new HeartbeatManager(context, "streaming", 10000);
            manager.start();

            const callback = createStreamingProgressCallback(manager, 100);

            callback(25);
            callback(50, "halfway done");
            callback(100, "complete");

            // Check heartbeats were sent
            const progressHeartbeats = heartbeatCalls.filter((h) => h.step === "streaming");
            expect(progressHeartbeats.length).toBe(3);

            // Check percentage calculation
            expect(progressHeartbeats[0].percentComplete).toBe(25);
            expect(progressHeartbeats[1].percentComplete).toBe(50);
            expect(progressHeartbeats[1].message).toBe("halfway done");
            expect(progressHeartbeats[2].percentComplete).toBe(100);

            manager.stop();
        });

        it("should work without total items", () => {
            const { context, heartbeatCalls } = createMockActivityContext();

            const manager = new HeartbeatManager(context, "streaming", 10000);
            manager.start();

            const callback = createStreamingProgressCallback(manager); // No totalItems

            callback(10);
            callback(20);

            const progressHeartbeats = heartbeatCalls.filter((h) => h.step === "streaming");
            expect(progressHeartbeats.length).toBe(2);
            expect(progressHeartbeats[0].itemsProcessed).toBe(10);
            expect(progressHeartbeats[0].percentComplete).toBeUndefined();

            manager.stop();
        });
    });
});

// ============================================================================
// HEARTBEAT INTERVALS CONFIGURATION TESTS
// ============================================================================

describe("Heartbeat Intervals Configuration", () => {
    it("should have correct default intervals", () => {
        expect(HEARTBEAT_INTERVALS.DEFAULT).toBe(30000); // 30 seconds
        expect(HEARTBEAT_INTERVALS.FREQUENT).toBe(10000); // 10 seconds
        expect(HEARTBEAT_INTERVALS.STREAMING).toBe(5000); // 5 seconds
    });

    it("should use appropriate interval for different activity types", () => {
        // This tests the constants are appropriate for their use cases
        expect(HEARTBEAT_INTERVALS.STREAMING).toBeLessThan(HEARTBEAT_INTERVALS.FREQUENT);
        expect(HEARTBEAT_INTERVALS.FREQUENT).toBeLessThan(HEARTBEAT_INTERVALS.DEFAULT);
    });
});

// ============================================================================
// HEARTBEAT PROGRESS TYPES TESTS
// ============================================================================

describe("HeartbeatProgress Types", () => {
    it("should support all progress fields", () => {
        const { context, heartbeatCalls } = createMockActivityContext();

        const manager = new HeartbeatManager(context, "test", 10000);
        manager.start({
            step: "init",
            percentComplete: 0,
            itemsProcessed: 0,
            totalItems: 100,
            bytesProcessed: 0,
            totalBytes: 1000000,
            message: "Starting processing",
            customField: "custom value"
        });

        expect(heartbeatCalls.length).toBe(1);
        const hb = heartbeatCalls[0];
        expect(hb.step).toBe("init");
        expect(hb.percentComplete).toBe(0);
        expect(hb.itemsProcessed).toBe(0);
        expect(hb.totalItems).toBe(100);
        expect(hb.bytesProcessed).toBe(0);
        expect(hb.totalBytes).toBe(1000000);
        expect(hb.message).toBe("Starting processing");
        expect(hb.customField).toBe("custom value");

        manager.stop();
    });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
