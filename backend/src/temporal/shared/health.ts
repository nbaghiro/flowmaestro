/**
 * Health check utilities for Temporal worker and activities
 *
 * Provides health status information for monitoring and alerting
 */

import { Connection } from "@temporalio/client";
import { config } from "../../core/config";

/**
 * Individual component health status
 */
export interface ComponentHealth {
    name: string;
    status: "healthy" | "degraded" | "unhealthy";
    latencyMs?: number;
    message?: string;
    lastChecked: string;
}

/**
 * Overall health check result
 */
export interface HealthCheckResult {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    version: string;
    uptime: number;
    components: ComponentHealth[];
}

/**
 * Worker metrics for health reporting
 */
export interface WorkerMetrics {
    activitiesExecuted: number;
    activitiesFailed: number;
    averageActivityDurationMs: number;
    currentlyExecuting: number;
}

// Track worker start time
const workerStartTime = Date.now();

// Track activity metrics
let activityMetrics: WorkerMetrics = {
    activitiesExecuted: 0,
    activitiesFailed: 0,
    averageActivityDurationMs: 0,
    currentlyExecuting: 0
};

/**
 * Update activity metrics after activity completion
 */
export function recordActivityCompletion(durationMs: number, success: boolean): void {
    activityMetrics.activitiesExecuted++;
    if (!success) {
        activityMetrics.activitiesFailed++;
    }

    // Update rolling average
    const total = activityMetrics.activitiesExecuted;
    const currentAvg = activityMetrics.averageActivityDurationMs;
    activityMetrics.averageActivityDurationMs = (currentAvg * (total - 1) + durationMs) / total;
}

/**
 * Track currently executing activities
 */
export function incrementExecuting(): void {
    activityMetrics.currentlyExecuting++;
}

export function decrementExecuting(): void {
    activityMetrics.currentlyExecuting = Math.max(0, activityMetrics.currentlyExecuting - 1);
}

/**
 * Get current worker metrics
 */
export function getWorkerMetrics(): WorkerMetrics {
    return { ...activityMetrics };
}

/**
 * Reset metrics (useful for testing)
 */
export function resetMetrics(): void {
    activityMetrics = {
        activitiesExecuted: 0,
        activitiesFailed: 0,
        averageActivityDurationMs: 0,
        currentlyExecuting: 0
    };
}

/**
 * Check Temporal server connectivity
 */
async function checkTemporalHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    const componentName = "temporal";

    try {
        const connection = await Connection.connect({
            address: config.temporal.address
        });

        // Try to get server capabilities as a health check
        await connection.workflowService.getSystemInfo({});
        await connection.close();

        return {
            name: componentName,
            status: "healthy",
            latencyMs: Date.now() - startTime,
            lastChecked: new Date().toISOString()
        };
    } catch (error) {
        return {
            name: componentName,
            status: "unhealthy",
            latencyMs: Date.now() - startTime,
            message: error instanceof Error ? error.message : "Unknown error",
            lastChecked: new Date().toISOString()
        };
    }
}

/**
 * Check Redis connectivity (for event bus)
 */
async function checkRedisHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    const componentName = "redis";

    try {
        // Import dynamically to avoid circular dependencies
        const { redisEventBus } = await import("../../services/events/RedisEventBus");

        if (redisEventBus.connected) {
            return {
                name: componentName,
                status: "healthy",
                latencyMs: Date.now() - startTime,
                lastChecked: new Date().toISOString()
            };
        } else {
            return {
                name: componentName,
                status: "degraded",
                latencyMs: Date.now() - startTime,
                message: "Redis not connected - events may not be published",
                lastChecked: new Date().toISOString()
            };
        }
    } catch (error) {
        return {
            name: componentName,
            status: "unhealthy",
            latencyMs: Date.now() - startTime,
            message: error instanceof Error ? error.message : "Unknown error",
            lastChecked: new Date().toISOString()
        };
    }
}

/**
 * Check database connectivity
 */
async function checkDatabaseHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    const componentName = "database";

    try {
        // Import dynamically to avoid circular dependencies
        const { db } = await import("../../storage/database");
        const pool = db.getPool();

        // Simple query to check connectivity
        await pool.query("SELECT 1");

        return {
            name: componentName,
            status: "healthy",
            latencyMs: Date.now() - startTime,
            lastChecked: new Date().toISOString()
        };
    } catch (error) {
        return {
            name: componentName,
            status: "unhealthy",
            latencyMs: Date.now() - startTime,
            message: error instanceof Error ? error.message : "Unknown error",
            lastChecked: new Date().toISOString()
        };
    }
}

/**
 * Check worker activity metrics
 */
function checkWorkerHealth(): ComponentHealth {
    const metrics = getWorkerMetrics();
    const componentName = "worker";

    // Calculate failure rate
    const failureRate =
        metrics.activitiesExecuted > 0 ? metrics.activitiesFailed / metrics.activitiesExecuted : 0;

    // Determine health based on metrics
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    let message: string | undefined;

    if (failureRate > 0.5) {
        status = "unhealthy";
        message = `High failure rate: ${(failureRate * 100).toFixed(1)}%`;
    } else if (failureRate > 0.1) {
        status = "degraded";
        message = `Elevated failure rate: ${(failureRate * 100).toFixed(1)}%`;
    }

    return {
        name: componentName,
        status,
        message,
        lastChecked: new Date().toISOString()
    };
}

/**
 * Perform full health check of worker and dependencies
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
    const components: ComponentHealth[] = [];

    // Check all components in parallel
    const [temporal, redis, database] = await Promise.all([
        checkTemporalHealth(),
        checkRedisHealth(),
        checkDatabaseHealth()
    ]);

    components.push(temporal, redis, database, checkWorkerHealth());

    // Determine overall status
    const hasUnhealthy = components.some((c) => c.status === "unhealthy");
    const hasDegraded = components.some((c) => c.status === "degraded");

    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (hasUnhealthy) {
        overallStatus = "unhealthy";
    } else if (hasDegraded) {
        overallStatus = "degraded";
    }

    return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "unknown",
        uptime: Date.now() - workerStartTime,
        components
    };
}

/**
 * Simple liveness check - just returns true if process is running
 */
export function isAlive(): boolean {
    return true;
}

/**
 * Readiness check - returns true if worker is ready to process activities
 */
export async function isReady(): Promise<boolean> {
    try {
        const health = await performHealthCheck();
        // Ready if at least Temporal is healthy
        const temporalHealth = health.components.find((c) => c.name === "temporal");
        return temporalHealth?.status === "healthy";
    } catch {
        return false;
    }
}
