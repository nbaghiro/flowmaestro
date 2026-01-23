/**
 * Health Checks Tests
 *
 * Tests for worker health monitoring and metrics tracking.
 */

import {
    recordActivityCompletion,
    incrementExecuting,
    decrementExecuting,
    getWorkerMetrics,
    resetMetrics,
    isAlive
} from "../health";

describe("Health Checks", () => {
    beforeEach(() => {
        resetMetrics();
    });

    describe("recordActivityCompletion", () => {
        it("should increment activities executed count", () => {
            recordActivityCompletion(100, true);
            const metrics = getWorkerMetrics();
            expect(metrics.activitiesExecuted).toBe(1);
        });

        it("should increment failed count on failure", () => {
            recordActivityCompletion(100, false);
            const metrics = getWorkerMetrics();
            expect(metrics.activitiesExecuted).toBe(1);
            expect(metrics.activitiesFailed).toBe(1);
        });

        it("should not increment failed count on success", () => {
            recordActivityCompletion(100, true);
            const metrics = getWorkerMetrics();
            expect(metrics.activitiesExecuted).toBe(1);
            expect(metrics.activitiesFailed).toBe(0);
        });

        it("should calculate rolling average duration", () => {
            recordActivityCompletion(100, true);
            expect(getWorkerMetrics().averageActivityDurationMs).toBe(100);

            recordActivityCompletion(200, true);
            expect(getWorkerMetrics().averageActivityDurationMs).toBe(150);

            recordActivityCompletion(300, true);
            expect(getWorkerMetrics().averageActivityDurationMs).toBe(200);
        });

        it("should handle zero duration", () => {
            recordActivityCompletion(0, true);
            expect(getWorkerMetrics().averageActivityDurationMs).toBe(0);
        });

        it("should handle large durations", () => {
            recordActivityCompletion(1000000, true);
            expect(getWorkerMetrics().averageActivityDurationMs).toBe(1000000);
        });

        it("should track multiple completions correctly", () => {
            for (let i = 0; i < 10; i++) {
                recordActivityCompletion(100, i % 3 === 0); // every third fails
            }
            const metrics = getWorkerMetrics();
            expect(metrics.activitiesExecuted).toBe(10);
            expect(metrics.activitiesFailed).toBe(6); // indices 1,2,4,5,7,8
        });
    });

    describe("incrementExecuting / decrementExecuting", () => {
        it("should increment currently executing count", () => {
            expect(getWorkerMetrics().currentlyExecuting).toBe(0);
            incrementExecuting();
            expect(getWorkerMetrics().currentlyExecuting).toBe(1);
        });

        it("should decrement currently executing count", () => {
            incrementExecuting();
            incrementExecuting();
            expect(getWorkerMetrics().currentlyExecuting).toBe(2);

            decrementExecuting();
            expect(getWorkerMetrics().currentlyExecuting).toBe(1);
        });

        it("should not go below zero", () => {
            decrementExecuting();
            expect(getWorkerMetrics().currentlyExecuting).toBe(0);

            decrementExecuting();
            expect(getWorkerMetrics().currentlyExecuting).toBe(0);
        });

        it("should handle multiple increments and decrements", () => {
            incrementExecuting();
            incrementExecuting();
            incrementExecuting();
            decrementExecuting();
            incrementExecuting();
            decrementExecuting();
            decrementExecuting();
            expect(getWorkerMetrics().currentlyExecuting).toBe(1);
        });
    });

    describe("getWorkerMetrics", () => {
        it("should return a copy of metrics", () => {
            recordActivityCompletion(100, true);
            const metrics1 = getWorkerMetrics();
            const metrics2 = getWorkerMetrics();

            expect(metrics1).toEqual(metrics2);
            expect(metrics1).not.toBe(metrics2); // Different object reference
        });

        it("should return all metric fields", () => {
            const metrics = getWorkerMetrics();
            expect(metrics).toHaveProperty("activitiesExecuted");
            expect(metrics).toHaveProperty("activitiesFailed");
            expect(metrics).toHaveProperty("averageActivityDurationMs");
            expect(metrics).toHaveProperty("currentlyExecuting");
        });

        it("should return correct initial values", () => {
            const metrics = getWorkerMetrics();
            expect(metrics.activitiesExecuted).toBe(0);
            expect(metrics.activitiesFailed).toBe(0);
            expect(metrics.averageActivityDurationMs).toBe(0);
            expect(metrics.currentlyExecuting).toBe(0);
        });
    });

    describe("resetMetrics", () => {
        it("should reset all metrics to initial values", () => {
            recordActivityCompletion(100, true);
            recordActivityCompletion(200, false);
            incrementExecuting();

            const beforeReset = getWorkerMetrics();
            expect(beforeReset.activitiesExecuted).toBe(2);
            expect(beforeReset.activitiesFailed).toBe(1);
            expect(beforeReset.currentlyExecuting).toBe(1);

            resetMetrics();

            const afterReset = getWorkerMetrics();
            expect(afterReset.activitiesExecuted).toBe(0);
            expect(afterReset.activitiesFailed).toBe(0);
            expect(afterReset.averageActivityDurationMs).toBe(0);
            expect(afterReset.currentlyExecuting).toBe(0);
        });
    });

    describe("isAlive", () => {
        it("should always return true", () => {
            expect(isAlive()).toBe(true);
        });
    });

    describe("failure rate calculations", () => {
        it("should calculate 0% failure rate with all successes", () => {
            recordActivityCompletion(100, true);
            recordActivityCompletion(100, true);
            recordActivityCompletion(100, true);

            const metrics = getWorkerMetrics();
            const failureRate = metrics.activitiesFailed / metrics.activitiesExecuted;
            expect(failureRate).toBe(0);
        });

        it("should calculate 100% failure rate with all failures", () => {
            recordActivityCompletion(100, false);
            recordActivityCompletion(100, false);
            recordActivityCompletion(100, false);

            const metrics = getWorkerMetrics();
            const failureRate = metrics.activitiesFailed / metrics.activitiesExecuted;
            expect(failureRate).toBe(1);
        });

        it("should calculate 50% failure rate correctly", () => {
            recordActivityCompletion(100, true);
            recordActivityCompletion(100, false);

            const metrics = getWorkerMetrics();
            const failureRate = metrics.activitiesFailed / metrics.activitiesExecuted;
            expect(failureRate).toBe(0.5);
        });
    });

    describe("concurrent activity tracking", () => {
        it("should accurately track concurrent activities", () => {
            // Simulate 3 activities starting
            incrementExecuting();
            incrementExecuting();
            incrementExecuting();
            expect(getWorkerMetrics().currentlyExecuting).toBe(3);

            // First completes
            decrementExecuting();
            recordActivityCompletion(100, true);
            expect(getWorkerMetrics().currentlyExecuting).toBe(2);
            expect(getWorkerMetrics().activitiesExecuted).toBe(1);

            // Second fails
            decrementExecuting();
            recordActivityCompletion(200, false);
            expect(getWorkerMetrics().currentlyExecuting).toBe(1);
            expect(getWorkerMetrics().activitiesExecuted).toBe(2);
            expect(getWorkerMetrics().activitiesFailed).toBe(1);

            // Third completes
            decrementExecuting();
            recordActivityCompletion(300, true);
            expect(getWorkerMetrics().currentlyExecuting).toBe(0);
            expect(getWorkerMetrics().activitiesExecuted).toBe(3);
        });
    });
});
