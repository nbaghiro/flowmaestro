import { describe, it, expect } from "@jest/globals";
import { executeWaitNode } from "../../../src/temporal/activities/node-executors/flow-control/wait-executor";

describe("Wait Executor", () => {
    it("passes through context unchanged for duration wait", async () => {
        const config = { waitType: "duration" as const, duration: 0 };
        const context = { value: 123 };

        const result = await executeWaitNode(config, context);

        expect(result.waitType).toBe("duration");
        expect(result.skipped).toBe(true);
        expect(result.reason).toBe("Duration is zero or negative");
        expect(typeof result.startTime).toBe("string");
        expect(typeof result.endTime).toBe("string");
    });

    it("waits until a timestamp (0ms diff)", async () => {
        const now = new Date();
        const config = {
            waitType: "until" as const,
            timestamp: now.toISOString()
        };

        const result = await executeWaitNode(config, {});

        expect(result.waitType).toBe("until");
        expect(result.skipped).toBe(true);
        expect(result.reason).toBe("Target time already passed");
        expect(result.actualWaitDuration).toBeGreaterThanOrEqual(0);
    });

    it("handles missing duration gracefully", async () => {
        const config = { waitType: "duration" as const };

        const result = await executeWaitNode(config, {});

        expect(result.waitType).toBe("duration");
        expect(result.skipped).toBe(true);
        expect(result.reason).toBe("Duration is zero or negative");
    });
});
