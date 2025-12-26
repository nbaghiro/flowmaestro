import { createServiceLogger } from "../../core/logging";
import { CircuitBreaker, CircuitBreakerOpenError } from "../../core/utils/circuit-breaker";
import { ConnectionRepository } from "../../storage/repositories/ConnectionRepository";
import { getAccessToken } from "./TokenRefreshService";

const logger = createServiceLogger("CredentialRefreshScheduler");

/**
 * Automatic OAuth Token Refresh Scheduler
 *
 * This service runs in the background and proactively refreshes OAuth tokens
 * before they expire, preventing authentication failures during workflow execution.
 *
 * Key features:
 * - Runs every 5 minutes to check for expiring tokens
 * - Refreshes tokens that expire within 10 minutes
 * - Handles multi-tenant by scanning all users
 * - Logs refresh successes and failures
 * - Circuit breaker protection (stops after 3 consecutive failures)
 * - Graceful error handling (doesn't crash on individual failures)
 */
export class CredentialRefreshScheduler {
    private connectionRepo = new ConnectionRepository();
    private intervalId: NodeJS.Timeout | null = null;
    private isRunning = false;

    // Configuration
    private readonly CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
    private readonly REFRESH_BUFFER = 10 * 60 * 1000; // Refresh tokens expiring within 10 minutes

    // Circuit breaker to protect against cascading failures
    private circuitBreaker = new CircuitBreaker({
        name: "CredentialRefresh",
        failureThreshold: 3, // Open circuit after 3 consecutive failures
        resetTimeout: 5 * 60 * 1000, // Try again after 5 minutes
        onOpen: () => {
            logger.error(
                "Circuit breaker OPENED - scheduler paused after repeated failures. Will retry in 5 minutes."
            );
            // TODO: Send alert to ops team
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
                refreshBufferSec: this.REFRESH_BUFFER / 1000
            },
            "Starting scheduler"
        );

        this.isRunning = true;

        // Run immediately on startup
        this.runRefreshCycle().catch((error) => {
            logger.error({ err: error }, "Initial refresh cycle failed");
        });

        // Then run periodically
        this.intervalId = setInterval(() => {
            this.runRefreshCycle().catch((error) => {
                logger.error({ err: error }, "Refresh cycle failed");
            });
        }, this.CHECK_INTERVAL);

        logger.info("Scheduler started successfully");
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
        logger.info("Scheduler stopped");
    }

    /**
     * Get scheduler status
     */
    getStatus(): {
        running: boolean;
        checkInterval: number;
        refreshBuffer: number;
        circuitBreaker: {
            state: string;
            failureCount: number;
            lastFailureTime: number | null;
        };
    } {
        return {
            running: this.isRunning,
            checkInterval: this.CHECK_INTERVAL,
            refreshBuffer: this.REFRESH_BUFFER,
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
     * Run a single refresh cycle across all users (protected by circuit breaker)
     */
    private async runRefreshCycle(): Promise<void> {
        try {
            // Execute with circuit breaker protection
            await this.circuitBreaker.execute(async () => {
                await this.executeRefreshCycle();
            });
        } catch (error) {
            if (error instanceof CircuitBreakerOpenError) {
                // Circuit is open, skip this cycle
                logger.warn(
                    "Skipping refresh cycle - circuit breaker is OPEN. Will retry when circuit resets."
                );
            } else {
                // Other error, log it
                logger.error({ err: error }, "Unexpected error in refresh cycle");
                throw error;
            }
        }
    }

    /**
     * Execute the actual refresh cycle logic
     */
    private async executeRefreshCycle(): Promise<void> {
        const startTime = Date.now();
        logger.info("Starting refresh cycle...");

        const stats = {
            scanned: 0,
            refreshed: 0,
            failed: 0,
            errors: [] as Array<{ connectionId: string; error: string }>
        };

        // Find all expiring OAuth connections across all users
        const expiringConnections = await this.connectionRepo.findAllExpiringSoon(
            this.REFRESH_BUFFER
        );

        stats.scanned = expiringConnections.length;

        if (expiringConnections.length === 0) {
            logger.info("No expiring tokens found");
            return;
        }

        logger.info(
            { count: expiringConnections.length },
            "Found connections with tokens expiring soon"
        );

        // Refresh each connection
        for (const connection of expiringConnections) {
            try {
                // Use getAccessToken which handles refresh automatically
                await getAccessToken(connection.id);

                stats.refreshed++;
                logger.info(
                    {
                        provider: connection.provider,
                        connectionId: connection.id,
                        userId: connection.user_id
                    },
                    "Refreshed connection"
                );
            } catch (error) {
                stats.failed++;
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                stats.errors.push({
                    connectionId: connection.id,
                    error: errorMessage
                });

                logger.error(
                    { connectionId: connection.id, err: errorMessage },
                    "Failed to refresh connection"
                );
            }
        }

        const duration = Date.now() - startTime;
        logger.info(
            {
                durationMs: duration,
                scanned: stats.scanned,
                refreshed: stats.refreshed,
                failed: stats.failed
            },
            "Cycle complete"
        );

        // Log errors if any
        if (stats.errors.length > 0) {
            logger.warn(
                { errorCount: stats.errors.length, errors: stats.errors },
                "Refresh failures detected"
            );
        }

        // If too many individual connection failures, throw to trigger circuit breaker
        const failureRate = stats.scanned > 0 ? stats.failed / stats.scanned : 0;
        if (failureRate > 0.5 && stats.scanned > 5) {
            throw new Error(
                `High failure rate detected: ${stats.failed}/${stats.scanned} ` +
                    `(${(failureRate * 100).toFixed(1)}%) connections failed to refresh`
            );
        }
    }

    /**
     * Manually trigger a refresh cycle (for testing or manual intervention)
     */
    async triggerManualRefresh(): Promise<{
        scanned: number;
        refreshed: number;
        failed: number;
    }> {
        logger.info("Manual refresh triggered");

        const startTime = Date.now();
        const stats = { scanned: 0, refreshed: 0, failed: 0 };

        const expiringConnections = await this.connectionRepo.findAllExpiringSoon(
            this.REFRESH_BUFFER
        );

        stats.scanned = expiringConnections.length;

        for (const connection of expiringConnections) {
            try {
                await getAccessToken(connection.id);
                stats.refreshed++;
            } catch (error) {
                stats.failed++;
                logger.error(
                    { connectionId: connection.id, err: error },
                    "Failed to refresh connection"
                );
            }
        }

        const duration = Date.now() - startTime;
        logger.info(
            {
                durationMs: duration,
                scanned: stats.scanned,
                refreshed: stats.refreshed,
                failed: stats.failed
            },
            "Manual refresh complete"
        );

        return stats;
    }
}

// Singleton instance
export const credentialRefreshScheduler = new CredentialRefreshScheduler();
