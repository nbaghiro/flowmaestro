import { CircuitBreaker, CircuitBreakerOpenError } from "../../core/utils/CircuitBreaker";
import { ConnectionRepository } from "../../storage/repositories/ConnectionRepository";
import { getAccessToken } from "./TokenRefreshService";

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
            console.error(
                "[CredentialRefresh] ⚠️  Circuit breaker OPENED - scheduler paused after repeated failures. " +
                    "Will retry in 5 minutes."
            );
            // TODO: Send alert to ops team
        },
        onClose: () => {
            console.log(
                "[CredentialRefresh] ✓ Circuit breaker CLOSED - scheduler recovered and resumed normal operation"
            );
        }
    });

    /**
     * Start the background scheduler
     */
    start(): void {
        if (this.isRunning) {
            console.log("[CredentialRefresh] Scheduler already running");
            return;
        }

        console.log(
            `[CredentialRefresh] Starting scheduler (check interval: ${this.CHECK_INTERVAL / 1000}s, ` +
                `refresh buffer: ${this.REFRESH_BUFFER / 1000}s)`
        );

        this.isRunning = true;

        // Run immediately on startup
        this.runRefreshCycle().catch((error) => {
            console.error("[CredentialRefresh] Initial refresh cycle failed:", error);
        });

        // Then run periodically
        this.intervalId = setInterval(() => {
            this.runRefreshCycle().catch((error) => {
                console.error("[CredentialRefresh] Refresh cycle failed:", error);
            });
        }, this.CHECK_INTERVAL);

        console.log("[CredentialRefresh] Scheduler started successfully");
    }

    /**
     * Stop the background scheduler
     */
    stop(): void {
        if (!this.isRunning) {
            console.log("[CredentialRefresh] Scheduler not running");
            return;
        }

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.isRunning = false;
        console.log("[CredentialRefresh] Scheduler stopped");
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
        console.log("[CredentialRefresh] Circuit breaker manually reset by admin");
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
                console.warn(
                    "[CredentialRefresh] Skipping refresh cycle - circuit breaker is OPEN. " +
                        "Will retry when circuit resets."
                );
            } else {
                // Other error, log it
                console.error("[CredentialRefresh] Unexpected error in refresh cycle:", error);
                throw error;
            }
        }
    }

    /**
     * Execute the actual refresh cycle logic
     */
    private async executeRefreshCycle(): Promise<void> {
        const startTime = Date.now();
        console.log("[CredentialRefresh] Starting refresh cycle...");

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
            console.log("[CredentialRefresh] No expiring tokens found");
            return;
        }

        console.log(
            `[CredentialRefresh] Found ${expiringConnections.length} connections with tokens expiring soon`
        );

        // Refresh each connection
        for (const connection of expiringConnections) {
            try {
                // Use getAccessToken which handles refresh automatically
                await getAccessToken(connection.id);

                stats.refreshed++;
                console.log(
                    `[CredentialRefresh] ✓ Refreshed ${connection.provider} connection ` +
                        `${connection.id} for user ${connection.user_id}`
                );
            } catch (error) {
                stats.failed++;
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                stats.errors.push({
                    connectionId: connection.id,
                    error: errorMessage
                });

                console.error(
                    `[CredentialRefresh] ✗ Failed to refresh connection ${connection.id}:`,
                    errorMessage
                );
            }
        }

        const duration = Date.now() - startTime;
        console.log(
            `[CredentialRefresh] Cycle complete in ${duration}ms - ` +
                `Scanned: ${stats.scanned}, Refreshed: ${stats.refreshed}, Failed: ${stats.failed}`
        );

        // Log errors if any
        if (stats.errors.length > 0) {
            console.warn(
                `[CredentialRefresh] ${stats.errors.length} refresh failures:`,
                stats.errors
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
        console.log("[CredentialRefresh] Manual refresh triggered");

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
                console.error(`[CredentialRefresh] Failed to refresh ${connection.id}:`, error);
            }
        }

        const duration = Date.now() - startTime;
        console.log(
            `[CredentialRefresh] Manual refresh complete in ${duration}ms - ` +
                `Scanned: ${stats.scanned}, Refreshed: ${stats.refreshed}, Failed: ${stats.failed}`
        );

        return stats;
    }
}

// Singleton instance
export const credentialRefreshScheduler = new CredentialRefreshScheduler();
