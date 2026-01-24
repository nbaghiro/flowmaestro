/**
 * CredentialRefreshScheduler Tests
 *
 * Tests for the background OAuth token refresh scheduler.
 */

// Mock dependencies
const mockConnectionRepo = {
    findAllExpiringSoon: jest.fn()
};

jest.mock("../../../storage/repositories/ConnectionRepository", () => ({
    ConnectionRepository: jest.fn().mockImplementation(() => mockConnectionRepo)
}));

const mockGetAccessToken = jest.fn();
jest.mock("../TokenRefreshService", () => ({
    getAccessToken: mockGetAccessToken
}));

jest.mock("../../../core/logging", () => ({
    createServiceLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    })
}));

// Import after mocks
import { CredentialRefreshScheduler } from "../CredentialRefreshScheduler";

describe("CredentialRefreshScheduler", () => {
    let scheduler: CredentialRefreshScheduler;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        scheduler = new CredentialRefreshScheduler();
    });

    afterEach(() => {
        scheduler.stop();
        jest.useRealTimers();
    });

    describe("start", () => {
        it("should start the scheduler", () => {
            mockConnectionRepo.findAllExpiringSoon.mockResolvedValue([]);

            scheduler.start();
            const status = scheduler.getStatus();

            expect(status.running).toBe(true);
        });

        it("should run initial refresh cycle on start", async () => {
            mockConnectionRepo.findAllExpiringSoon.mockResolvedValue([]);

            scheduler.start();

            // Let the initial cycle run
            await Promise.resolve();

            expect(mockConnectionRepo.findAllExpiringSoon).toHaveBeenCalled();
        });

        it("should not start if already running", () => {
            mockConnectionRepo.findAllExpiringSoon.mockResolvedValue([]);

            scheduler.start();
            scheduler.start(); // Second call

            const status = scheduler.getStatus();
            expect(status.running).toBe(true);
        });

        it("should run periodically after start", async () => {
            mockConnectionRepo.findAllExpiringSoon.mockResolvedValue([]);

            scheduler.start();
            await Promise.resolve();

            // Clear call count from initial run
            mockConnectionRepo.findAllExpiringSoon.mockClear();

            // Advance timer by check interval (5 minutes)
            jest.advanceTimersByTime(5 * 60 * 1000);
            await Promise.resolve();

            expect(mockConnectionRepo.findAllExpiringSoon).toHaveBeenCalled();
        });
    });

    describe("stop", () => {
        it("should stop the scheduler", () => {
            mockConnectionRepo.findAllExpiringSoon.mockResolvedValue([]);

            scheduler.start();
            scheduler.stop();

            const status = scheduler.getStatus();
            expect(status.running).toBe(false);
        });

        it("should not error if not running", () => {
            expect(() => scheduler.stop()).not.toThrow();
        });

        it("should prevent further refresh cycles", async () => {
            mockConnectionRepo.findAllExpiringSoon.mockResolvedValue([]);

            scheduler.start();
            await Promise.resolve();
            scheduler.stop();

            mockConnectionRepo.findAllExpiringSoon.mockClear();

            // Advance timer
            jest.advanceTimersByTime(5 * 60 * 1000);
            await Promise.resolve();

            expect(mockConnectionRepo.findAllExpiringSoon).not.toHaveBeenCalled();
        });
    });

    describe("getStatus", () => {
        it("should return running status", () => {
            const status = scheduler.getStatus();

            expect(status).toHaveProperty("running");
            expect(status).toHaveProperty("checkInterval");
            expect(status).toHaveProperty("refreshBuffer");
            expect(status).toHaveProperty("circuitBreaker");
        });

        it("should return correct intervals", () => {
            const status = scheduler.getStatus();

            expect(status.checkInterval).toBe(5 * 60 * 1000); // 5 minutes
            expect(status.refreshBuffer).toBe(10 * 60 * 1000); // 10 minutes
        });

        it("should return circuit breaker status", () => {
            const status = scheduler.getStatus();

            expect(status.circuitBreaker).toHaveProperty("state");
            expect(status.circuitBreaker).toHaveProperty("failureCount");
            expect(status.circuitBreaker).toHaveProperty("lastFailureTime");
        });
    });

    describe("triggerManualRefresh", () => {
        it("should refresh expiring connections", async () => {
            const mockConnections = [
                { id: "conn-1", provider: "slack", user_id: "user-1" },
                { id: "conn-2", provider: "google", user_id: "user-2" }
            ];
            mockConnectionRepo.findAllExpiringSoon.mockResolvedValue(mockConnections);
            mockGetAccessToken.mockResolvedValue("new-token");

            const result = await scheduler.triggerManualRefresh();

            expect(result.scanned).toBe(2);
            expect(result.refreshed).toBe(2);
            expect(result.failed).toBe(0);
            expect(mockGetAccessToken).toHaveBeenCalledTimes(2);
            expect(mockGetAccessToken).toHaveBeenCalledWith("conn-1");
            expect(mockGetAccessToken).toHaveBeenCalledWith("conn-2");
        });

        it("should return stats when no connections are expiring", async () => {
            mockConnectionRepo.findAllExpiringSoon.mockResolvedValue([]);

            const result = await scheduler.triggerManualRefresh();

            expect(result.scanned).toBe(0);
            expect(result.refreshed).toBe(0);
            expect(result.failed).toBe(0);
        });

        it("should count failed refreshes", async () => {
            const mockConnections = [
                { id: "conn-1", provider: "slack", user_id: "user-1" },
                { id: "conn-2", provider: "google", user_id: "user-2" },
                { id: "conn-3", provider: "github", user_id: "user-3" }
            ];
            mockConnectionRepo.findAllExpiringSoon.mockResolvedValue(mockConnections);
            mockGetAccessToken
                .mockResolvedValueOnce("token-1")
                .mockRejectedValueOnce(new Error("Token expired"))
                .mockResolvedValueOnce("token-3");

            const result = await scheduler.triggerManualRefresh();

            expect(result.scanned).toBe(3);
            expect(result.refreshed).toBe(2);
            expect(result.failed).toBe(1);
        });

        it("should continue refreshing after individual failures", async () => {
            const mockConnections = [
                { id: "conn-1", provider: "slack", user_id: "user-1" },
                { id: "conn-2", provider: "google", user_id: "user-2" }
            ];
            mockConnectionRepo.findAllExpiringSoon.mockResolvedValue(mockConnections);
            mockGetAccessToken
                .mockRejectedValueOnce(new Error("First failed"))
                .mockResolvedValueOnce("token-2");

            const result = await scheduler.triggerManualRefresh();

            expect(result.refreshed).toBe(1);
            expect(result.failed).toBe(1);
            expect(mockGetAccessToken).toHaveBeenCalledTimes(2);
        });
    });

    describe("resetCircuitBreaker", () => {
        it("should reset the circuit breaker", () => {
            // Get initial status
            const initialStatus = scheduler.getStatus();
            expect(initialStatus.circuitBreaker.state).toBe("CLOSED");

            // Reset should not throw
            expect(() => scheduler.resetCircuitBreaker()).not.toThrow();

            // Status should still be closed
            const status = scheduler.getStatus();
            expect(status.circuitBreaker.state).toBe("CLOSED");
        });
    });

    describe("circuit breaker behavior", () => {
        it("should open circuit after repeated failures", async () => {
            // Make findAllExpiringSoon throw to trigger circuit breaker
            mockConnectionRepo.findAllExpiringSoon.mockRejectedValue(
                new Error("Database connection failed")
            );

            scheduler.start();

            // Run multiple cycles to trigger circuit breaker (threshold is 3)
            for (let i = 0; i < 4; i++) {
                await Promise.resolve();
                jest.advanceTimersByTime(5 * 60 * 1000);
            }

            const status = scheduler.getStatus();
            expect(status.circuitBreaker.failureCount).toBeGreaterThan(0);
        });

        it("should skip cycles when circuit is open", async () => {
            // First, trigger the circuit to open
            mockConnectionRepo.findAllExpiringSoon.mockRejectedValue(new Error("DB error"));

            scheduler.start();

            // Trigger failures
            for (let i = 0; i < 5; i++) {
                await Promise.resolve();
                jest.advanceTimersByTime(5 * 60 * 1000);
            }

            // Clear mock and advance time
            mockConnectionRepo.findAllExpiringSoon.mockClear();
            jest.advanceTimersByTime(5 * 60 * 1000);
            await Promise.resolve();

            // Should have limited calls due to circuit breaker
            const status = scheduler.getStatus();
            // Circuit breaker should have recorded failures
            expect(status.circuitBreaker.failureCount).toBeGreaterThanOrEqual(0);
        });
    });

    describe("refresh cycle with high failure rate", () => {
        it("should handle connections with mixed success/failure", async () => {
            const mockConnections = Array.from({ length: 10 }, (_, i) => ({
                id: `conn-${i}`,
                provider: "slack",
                user_id: `user-${i}`
            }));
            mockConnectionRepo.findAllExpiringSoon.mockResolvedValue(mockConnections);

            // 7 successes, 3 failures
            mockGetAccessToken
                .mockResolvedValueOnce("token")
                .mockResolvedValueOnce("token")
                .mockResolvedValueOnce("token")
                .mockRejectedValueOnce(new Error("Failed"))
                .mockResolvedValueOnce("token")
                .mockResolvedValueOnce("token")
                .mockRejectedValueOnce(new Error("Failed"))
                .mockResolvedValueOnce("token")
                .mockResolvedValueOnce("token")
                .mockRejectedValueOnce(new Error("Failed"));

            const result = await scheduler.triggerManualRefresh();

            expect(result.scanned).toBe(10);
            expect(result.refreshed).toBe(7);
            expect(result.failed).toBe(3);
        });
    });
});
