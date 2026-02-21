/**
 * Approval Expiration Scheduler
 *
 * Background scheduler that:
 * 1. Expires pending approval requests that have passed their expiration time
 * 2. Sends warning notifications for approvals about to expire
 * 3. Signals the Temporal workflow when an approval expires
 */

import { createServiceLogger } from "../../core/logging";
import { CircuitBreaker, CircuitBreakerOpenError } from "../../core/utils/circuit-breaker";
import { PersonaApprovalRequestRepository } from "../../storage/repositories/PersonaApprovalRequestRepository";
import { redisEventBus } from "../events/RedisEventBus";

const logger = createServiceLogger("ApprovalExpirationScheduler");

/**
 * Approval Expiration Scheduler
 *
 * Key features:
 * - Runs every 60 seconds to check for expiring/expired approvals
 * - Expires approvals past their deadline
 * - Sends warnings 1 hour before expiration
 * - Circuit breaker protection (stops after 3 consecutive failures)
 * - Graceful error handling (doesn't crash on individual failures)
 */
export class ApprovalExpirationScheduler {
    private approvalRepo = new PersonaApprovalRequestRepository();
    private intervalId: NodeJS.Timeout | null = null;
    private isRunning = false;

    // Configuration
    private readonly CHECK_INTERVAL = 60 * 1000; // Check every 60 seconds
    private readonly WARNING_WINDOW = 60 * 60 * 1000; // Warn 1 hour before expiration

    // Circuit breaker to protect against cascading failures
    private circuitBreaker = new CircuitBreaker({
        name: "ApprovalExpiration",
        failureThreshold: 3, // Open circuit after 3 consecutive failures
        resetTimeout: 5 * 60 * 1000, // Try again after 5 minutes
        onOpen: () => {
            logger.error(
                "Circuit breaker OPENED - scheduler paused after repeated failures. Will retry in 5 minutes."
            );
        },
        onClose: () => {
            logger.info(
                "Circuit breaker CLOSED - scheduler recovered and resumed normal operation"
            );
        }
    });

    /**
     * Start the background scheduler
     */
    start(): void {
        if (this.isRunning) {
            logger.info("Scheduler already running");
            return;
        }

        logger.info(
            {
                checkIntervalSec: this.CHECK_INTERVAL / 1000,
                warningWindowSec: this.WARNING_WINDOW / 1000
            },
            "Starting approval expiration scheduler"
        );

        this.isRunning = true;

        // Run immediately on startup
        this.runExpirationCycle().catch((error) => {
            logger.error({ err: error }, "Initial expiration cycle failed");
        });

        // Then run periodically
        this.intervalId = setInterval(() => {
            this.runExpirationCycle().catch((error) => {
                logger.error({ err: error }, "Expiration cycle failed");
            });
        }, this.CHECK_INTERVAL);

        logger.info("Approval expiration scheduler started successfully");
    }

    /**
     * Stop the background scheduler
     */
    stop(): void {
        if (!this.isRunning) {
            logger.info("Scheduler not running");
            return;
        }

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.isRunning = false;
        logger.info("Approval expiration scheduler stopped");
    }

    /**
     * Get scheduler status
     */
    getStatus(): {
        running: boolean;
        checkInterval: number;
        warningWindow: number;
        circuitBreaker: {
            state: string;
            failureCount: number;
            lastFailureTime: number | null;
        };
    } {
        return {
            running: this.isRunning,
            checkInterval: this.CHECK_INTERVAL,
            warningWindow: this.WARNING_WINDOW,
            circuitBreaker: this.circuitBreaker.getStats()
        };
    }

    /**
     * Manually reset circuit breaker (for ops/admin use)
     */
    resetCircuitBreaker(): void {
        this.circuitBreaker.forceClose();
        logger.info("Circuit breaker manually reset by admin");
    }

    /**
     * Run a single expiration cycle (protected by circuit breaker)
     */
    private async runExpirationCycle(): Promise<void> {
        try {
            await this.circuitBreaker.execute(async () => {
                await this.executeExpirationCycle();
            });
        } catch (error) {
            if (error instanceof CircuitBreakerOpenError) {
                logger.warn(
                    "Skipping expiration cycle - circuit breaker is OPEN. Will retry when circuit resets."
                );
            } else {
                logger.error({ err: error }, "Unexpected error in expiration cycle");
                throw error;
            }
        }
    }

    /**
     * Execute the actual expiration cycle logic
     */
    private async executeExpirationCycle(): Promise<void> {
        const startTime = Date.now();
        logger.debug("Starting expiration cycle...");

        const stats = {
            expired: 0,
            warned: 0,
            errors: [] as Array<{ approvalId: string; error: string }>
        };

        // Step 1: Expire pending approvals past their deadline
        try {
            const expiredApprovals = await this.approvalRepo.findExpiredPending();

            for (const approval of expiredApprovals) {
                try {
                    // Mark as expired
                    await this.approvalRepo.update(approval.id, {
                        status: "expired",
                        responded_at: new Date()
                    });

                    // TODO: Signal the Temporal workflow that the approval expired
                    // This would require implementing a signal mechanism

                    stats.expired++;
                    logger.info(
                        {
                            approvalId: approval.id,
                            instanceId: approval.instance_id
                        },
                        "Expired approval request"
                    );
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    stats.errors.push({
                        approvalId: approval.id,
                        error: errorMessage
                    });
                    logger.error(
                        { approvalId: approval.id, err: error },
                        "Failed to expire approval"
                    );
                }
            }
        } catch (error) {
            logger.error({ err: error }, "Failed to find expired approvals");
            throw error;
        }

        // Step 2: Send warnings for approvals about to expire
        try {
            const expiringApprovals = await this.approvalRepo.findExpiringSoon(this.WARNING_WINDOW);

            for (const approval of expiringApprovals) {
                try {
                    // Calculate seconds until expiration
                    const expiresInSeconds = approval.expires_at
                        ? Math.floor((approval.expires_at.getTime() - Date.now()) / 1000)
                        : 0;

                    // Emit warning event
                    await redisEventBus.publishJson(`persona:${approval.instance_id}:events`, {
                        type: "persona:instance:approval_expiring_soon",
                        timestamp: Date.now(),
                        instanceId: approval.instance_id, // Note: frontend uses instanceId
                        approval_id: approval.id,
                        expires_at: approval.expires_at?.toISOString() || "",
                        expires_in_seconds: Math.max(0, expiresInSeconds)
                    });

                    // Mark as warned
                    await this.approvalRepo.markWarned(approval.id);

                    stats.warned++;
                    logger.info(
                        {
                            approvalId: approval.id,
                            instanceId: approval.instance_id,
                            expiresInSeconds
                        },
                        "Sent expiration warning"
                    );
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    stats.errors.push({
                        approvalId: approval.id,
                        error: errorMessage
                    });
                    logger.error(
                        { approvalId: approval.id, err: error },
                        "Failed to send expiration warning"
                    );
                }
            }
        } catch (error) {
            logger.error({ err: error }, "Failed to find expiring approvals");
            throw error;
        }

        const duration = Date.now() - startTime;
        if (stats.expired > 0 || stats.warned > 0) {
            logger.info(
                {
                    durationMs: duration,
                    expired: stats.expired,
                    warned: stats.warned,
                    errors: stats.errors.length
                },
                "Expiration cycle complete"
            );
        } else {
            logger.debug({ durationMs: duration }, "Expiration cycle complete - no actions needed");
        }

        // Log errors if any
        if (stats.errors.length > 0) {
            logger.warn(
                { errorCount: stats.errors.length, errors: stats.errors },
                "Expiration failures detected"
            );
        }
    }

    /**
     * Manually trigger an expiration cycle (for testing or manual intervention)
     */
    async triggerManualCheck(): Promise<{
        expired: number;
        warned: number;
    }> {
        logger.info("Manual expiration check triggered");

        const startTime = Date.now();
        const stats = { expired: 0, warned: 0 };

        // Expire pending approvals
        const expiredApprovals = await this.approvalRepo.findExpiredPending();
        for (const approval of expiredApprovals) {
            try {
                await this.approvalRepo.update(approval.id, {
                    status: "expired",
                    responded_at: new Date()
                });
                stats.expired++;
            } catch (error) {
                logger.error({ approvalId: approval.id, err: error }, "Failed to expire approval");
            }
        }

        // Send warnings
        const expiringApprovals = await this.approvalRepo.findExpiringSoon(this.WARNING_WINDOW);
        for (const approval of expiringApprovals) {
            try {
                await this.approvalRepo.markWarned(approval.id);
                stats.warned++;
            } catch (error) {
                logger.error(
                    { approvalId: approval.id, err: error },
                    "Failed to send expiration warning"
                );
            }
        }

        const duration = Date.now() - startTime;
        logger.info(
            {
                durationMs: duration,
                expired: stats.expired,
                warned: stats.warned
            },
            "Manual expiration check complete"
        );

        return stats;
    }
}

// Singleton instance
export const approvalExpirationScheduler = new ApprovalExpirationScheduler();
