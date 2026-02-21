/**
 * Approval Expiration Scheduler Tests
 *
 * Tests for the background scheduler that expires pending approvals
 * and sends expiration warnings.
 */

// Mock dependencies - must be before imports
const mockApprovalRepo = {
    findExpiredPending: jest.fn(),
    findExpiringSoon: jest.fn(),
    update: jest.fn(),
    markWarned: jest.fn()
};

jest.mock("../../../storage/repositories/PersonaApprovalRequestRepository", () => ({
    PersonaApprovalRequestRepository: jest.fn().mockImplementation(() => mockApprovalRepo)
}));

jest.mock("../../events/RedisEventBus", () => ({
    redisEventBus: {
        publishJson: jest.fn().mockResolvedValue(undefined)
    }
}));

// Import after mocks are set up
import { ApprovalExpirationScheduler } from "../ApprovalExpirationScheduler";

// Mock timers
jest.useFakeTimers();

describe("ApprovalExpirationScheduler", () => {
    let scheduler: ApprovalExpirationScheduler;

    beforeEach(() => {
        jest.clearAllMocks();
        scheduler = new ApprovalExpirationScheduler();
    });

    afterEach(() => {
        scheduler.stop();
    });

    describe("start/stop", () => {
        it("should start the scheduler", () => {
            expect(scheduler.getStatus().running).toBe(false);
            scheduler.start();
            expect(scheduler.getStatus().running).toBe(true);
        });

        it("should stop the scheduler", () => {
            scheduler.start();
            expect(scheduler.getStatus().running).toBe(true);
            scheduler.stop();
            expect(scheduler.getStatus().running).toBe(false);
        });

        it("should not start twice", () => {
            scheduler.start();
            scheduler.start(); // Second call should be a no-op
            expect(scheduler.getStatus().running).toBe(true);
        });

        it("should not fail when stopping a non-running scheduler", () => {
            scheduler.stop(); // Should not throw
            expect(scheduler.getStatus().running).toBe(false);
        });
    });

    describe("getStatus", () => {
        it("should return scheduler status", () => {
            const status = scheduler.getStatus();

            expect(status).toHaveProperty("running");
            expect(status).toHaveProperty("checkInterval");
            expect(status).toHaveProperty("warningWindow");
            expect(status).toHaveProperty("circuitBreaker");
            expect(status.checkInterval).toBe(60 * 1000);
            expect(status.warningWindow).toBe(60 * 60 * 1000);
        });

        it("should reflect circuit breaker state", () => {
            const status = scheduler.getStatus();

            expect(status.circuitBreaker).toHaveProperty("state");
            expect(status.circuitBreaker).toHaveProperty("failureCount");
            expect(status.circuitBreaker).toHaveProperty("lastFailureTime");
        });
    });

    describe("triggerManualCheck", () => {
        it("should expire pending approvals past deadline", async () => {
            const expiredApproval = {
                id: "approval-1",
                instance_id: "instance-1",
                status: "pending",
                expires_at: new Date(Date.now() - 1000)
            };

            mockApprovalRepo.findExpiredPending.mockResolvedValue([expiredApproval]);
            mockApprovalRepo.findExpiringSoon.mockResolvedValue([]);
            mockApprovalRepo.update.mockResolvedValue({ ...expiredApproval, status: "expired" });

            const result = await scheduler.triggerManualCheck();

            expect(result.expired).toBe(1);
            expect(result.warned).toBe(0);
            expect(mockApprovalRepo.update).toHaveBeenCalledWith("approval-1", {
                status: "expired",
                responded_at: expect.any(Date)
            });
        });

        it("should send warnings for expiring soon approvals", async () => {
            const expiringApproval = {
                id: "approval-1",
                instance_id: "instance-1",
                status: "pending",
                expires_at: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
            };

            mockApprovalRepo.findExpiredPending.mockResolvedValue([]);
            mockApprovalRepo.findExpiringSoon.mockResolvedValue([expiringApproval]);
            mockApprovalRepo.markWarned.mockResolvedValue(true);

            const result = await scheduler.triggerManualCheck();

            expect(result.expired).toBe(0);
            expect(result.warned).toBe(1);
            expect(mockApprovalRepo.markWarned).toHaveBeenCalledWith("approval-1");
        });

        it("should handle multiple expired and expiring approvals", async () => {
            const expiredApprovals = [
                {
                    id: "expired-1",
                    instance_id: "i-1",
                    status: "pending",
                    expires_at: new Date(Date.now() - 1000)
                },
                {
                    id: "expired-2",
                    instance_id: "i-2",
                    status: "pending",
                    expires_at: new Date(Date.now() - 2000)
                }
            ];

            const expiringApprovals = [
                {
                    id: "expiring-1",
                    instance_id: "i-3",
                    status: "pending",
                    expires_at: new Date(Date.now() + 30 * 60 * 1000)
                }
            ];

            mockApprovalRepo.findExpiredPending.mockResolvedValue(expiredApprovals);
            mockApprovalRepo.findExpiringSoon.mockResolvedValue(expiringApprovals);
            mockApprovalRepo.update.mockResolvedValue({});
            mockApprovalRepo.markWarned.mockResolvedValue(true);

            const result = await scheduler.triggerManualCheck();

            expect(result.expired).toBe(2);
            expect(result.warned).toBe(1);
        });

        it("should continue processing despite individual failures", async () => {
            const expiredApprovals = [
                {
                    id: "approval-1",
                    instance_id: "i-1",
                    status: "pending",
                    expires_at: new Date(Date.now() - 1000)
                },
                {
                    id: "approval-2",
                    instance_id: "i-2",
                    status: "pending",
                    expires_at: new Date(Date.now() - 2000)
                }
            ];

            mockApprovalRepo.findExpiredPending.mockResolvedValue(expiredApprovals);
            mockApprovalRepo.findExpiringSoon.mockResolvedValue([]);
            mockApprovalRepo.update
                .mockRejectedValueOnce(new Error("DB error"))
                .mockResolvedValueOnce({});

            const result = await scheduler.triggerManualCheck();

            expect(result.expired).toBe(1); // Only one succeeded
            expect(mockApprovalRepo.update).toHaveBeenCalledTimes(2);
        });

        it("should return zero counts when nothing to process", async () => {
            mockApprovalRepo.findExpiredPending.mockResolvedValue([]);
            mockApprovalRepo.findExpiringSoon.mockResolvedValue([]);

            const result = await scheduler.triggerManualCheck();

            expect(result.expired).toBe(0);
            expect(result.warned).toBe(0);
        });
    });

    describe("resetCircuitBreaker", () => {
        it("should reset circuit breaker state", () => {
            scheduler.resetCircuitBreaker();
            const status = scheduler.getStatus();
            expect(status.circuitBreaker.failureCount).toBe(0);
        });
    });

    describe("scheduled execution", () => {
        it("should run initial cycle on start", async () => {
            mockApprovalRepo.findExpiredPending.mockResolvedValue([]);
            mockApprovalRepo.findExpiringSoon.mockResolvedValue([]);

            scheduler.start();

            // Wait for async execution
            await Promise.resolve();
            jest.runOnlyPendingTimers();
            await Promise.resolve();

            expect(mockApprovalRepo.findExpiredPending).toHaveBeenCalled();
        });
    });
});
