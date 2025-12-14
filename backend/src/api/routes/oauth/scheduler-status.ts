import { credentialRefreshScheduler } from "../../../services/oauth/CredentialRefreshScheduler";
import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * GET /oauth/scheduler-status
 *
 * Get the status of the credential refresh scheduler
 * (requires authentication)
 */
export async function getSchedulerStatus(
    _request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const status = credentialRefreshScheduler.getStatus();

    reply.send({
        success: true,
        data: {
            ...status,
            checkIntervalSeconds: status.checkInterval / 1000,
            refreshBufferSeconds: status.refreshBuffer / 1000,
            circuitBreaker: {
                ...status.circuitBreaker,
                isHealthy: status.circuitBreaker.state === "CLOSED",
                lastFailureTimeFormatted: status.circuitBreaker.lastFailureTime
                    ? new Date(status.circuitBreaker.lastFailureTime).toISOString()
                    : null
            }
        }
    });
}

/**
 * POST /oauth/scheduler-refresh
 *
 * Manually trigger a credential refresh cycle
 * (requires authentication)
 */
export async function triggerSchedulerRefresh(
    _request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    try {
        const results = await credentialRefreshScheduler.triggerManualRefresh();

        reply.send({
            success: true,
            data: results,
            message: `Manual refresh complete. Scanned: ${results.scanned}, Refreshed: ${results.refreshed}, Failed: ${results.failed}`
        });
    } catch (error) {
        reply.status(500).send({
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Failed to trigger refresh",
                type: "server_error"
            }
        });
    }
}

/**
 * POST /oauth/scheduler-reset-circuit
 *
 * Manually reset the circuit breaker (for ops/admin recovery)
 * (requires authentication)
 */
export async function resetCircuitBreaker(
    _request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    try {
        credentialRefreshScheduler.resetCircuitBreaker();

        reply.send({
            success: true,
            message: "Circuit breaker manually reset. Scheduler will resume normal operation."
        });
    } catch (error) {
        reply.status(500).send({
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Failed to reset circuit breaker",
                type: "server_error"
            }
        });
    }
}
