/**
 * Status Service
 *
 * Aggregates health checks from all FlowMaestro services
 * and provides cached status data for the public status page.
 */

import { Connection } from "@temporalio/client";
import type { ComponentHealth, OverallStatus, StatusResponse } from "@flowmaestro/shared";
import { config } from "../../core/config";
import { createServiceLogger } from "../../core/logging";
import { db } from "../../storage/database";
import { redis } from "../redis";

const logger = createServiceLogger("StatusService");

// Cache TTL in seconds
const CACHE_TTL = 30;
const CACHE_KEY = "status:aggregated";

// Component names for health checks
const COMPONENTS = {
    API: { name: "api", displayName: "API Server" },
    DATABASE: { name: "database", displayName: "Database" },
    REDIS: { name: "redis", displayName: "Redis Cache" },
    TEMPORAL: { name: "temporal", displayName: "Workflow Engine" },
    FILE_STORAGE: { name: "file_storage", displayName: "File Storage" }
} as const;

/**
 * Check API server health (self-check)
 */
async function checkApiHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();

    return {
        name: COMPONENTS.API.name,
        displayName: COMPONENTS.API.displayName,
        status: "operational",
        latencyMs: Date.now() - startTime,
        lastChecked: new Date().toISOString()
    };
}

/**
 * Check database health
 */
async function checkDatabaseHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
        const pool = db.getPool();
        await pool.query("SELECT 1");

        return {
            name: COMPONENTS.DATABASE.name,
            displayName: COMPONENTS.DATABASE.displayName,
            status: "operational",
            latencyMs: Date.now() - startTime,
            lastChecked: new Date().toISOString()
        };
    } catch (error) {
        logger.error({ err: error }, "Database health check failed");
        return {
            name: COMPONENTS.DATABASE.name,
            displayName: COMPONENTS.DATABASE.displayName,
            status: "outage",
            latencyMs: Date.now() - startTime,
            message: error instanceof Error ? error.message : "Connection failed",
            lastChecked: new Date().toISOString()
        };
    }
}

/**
 * Check Redis health
 */
async function checkRedisHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
        const result = await redis.ping();

        if (result === "PONG") {
            return {
                name: COMPONENTS.REDIS.name,
                displayName: COMPONENTS.REDIS.displayName,
                status: "operational",
                latencyMs: Date.now() - startTime,
                lastChecked: new Date().toISOString()
            };
        }

        return {
            name: COMPONENTS.REDIS.name,
            displayName: COMPONENTS.REDIS.displayName,
            status: "degraded",
            latencyMs: Date.now() - startTime,
            message: "Unexpected ping response",
            lastChecked: new Date().toISOString()
        };
    } catch (error) {
        logger.error({ err: error }, "Redis health check failed");
        return {
            name: COMPONENTS.REDIS.name,
            displayName: COMPONENTS.REDIS.displayName,
            status: "outage",
            latencyMs: Date.now() - startTime,
            message: error instanceof Error ? error.message : "Connection failed",
            lastChecked: new Date().toISOString()
        };
    }
}

/**
 * Check Temporal server health
 */
async function checkTemporalHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
        const connection = await Connection.connect({
            address: config.temporal.address
        });

        await connection.workflowService.getSystemInfo({});
        await connection.close();

        return {
            name: COMPONENTS.TEMPORAL.name,
            displayName: COMPONENTS.TEMPORAL.displayName,
            status: "operational",
            latencyMs: Date.now() - startTime,
            lastChecked: new Date().toISOString()
        };
    } catch (error) {
        logger.error({ err: error }, "Temporal health check failed");
        return {
            name: COMPONENTS.TEMPORAL.name,
            displayName: COMPONENTS.TEMPORAL.displayName,
            status: "outage",
            latencyMs: Date.now() - startTime,
            message: error instanceof Error ? error.message : "Connection failed",
            lastChecked: new Date().toISOString()
        };
    }
}

/**
 * Check file storage (GCS) health
 */
async function checkFileStorageHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();

    // For now, we just check if the bucket is configured
    // A more thorough check would attempt to list objects or write a test file
    const bucketConfigured = Boolean(config.gcs.knowledgeDocsBucket);

    if (bucketConfigured) {
        return {
            name: COMPONENTS.FILE_STORAGE.name,
            displayName: COMPONENTS.FILE_STORAGE.displayName,
            status: "operational",
            latencyMs: Date.now() - startTime,
            lastChecked: new Date().toISOString()
        };
    }

    return {
        name: COMPONENTS.FILE_STORAGE.name,
        displayName: COMPONENTS.FILE_STORAGE.displayName,
        status: "unknown",
        latencyMs: Date.now() - startTime,
        message: "Bucket not configured",
        lastChecked: new Date().toISOString()
    };
}

/**
 * Calculate overall status from component statuses
 */
function calculateOverallStatus(components: ComponentHealth[]): OverallStatus {
    const statuses = components.map((c) => c.status);

    // Count by status
    const outageCount = statuses.filter((s) => s === "outage").length;
    const degradedCount = statuses.filter((s) => s === "degraded").length;

    // Critical components
    const criticalComponents: string[] = [COMPONENTS.API.name, COMPONENTS.DATABASE.name];
    const criticalOutage = components.some(
        (c) => criticalComponents.includes(c.name) && c.status === "outage"
    );

    if (criticalOutage) {
        return "major_outage";
    }

    if (outageCount > 0) {
        return "partial_outage";
    }

    if (degradedCount > 0) {
        return "degraded";
    }

    return "operational";
}

/**
 * Get uptime percentages (placeholder - would need historical data)
 */
function getUptimeMetrics(): StatusResponse["uptime"] {
    // In a real implementation, this would query historical status data
    // For now, return placeholder values
    return {
        last24Hours: 100,
        last7Days: 99.95,
        last30Days: 99.9
    };
}

/**
 * Fetch aggregated status (with caching)
 */
export async function getAggregatedStatus(): Promise<StatusResponse> {
    // Try to get from cache first
    try {
        const cached = await redis.get(CACHE_KEY);
        if (cached) {
            return JSON.parse(cached) as StatusResponse;
        }
    } catch (error) {
        logger.warn({ err: error }, "Failed to read status from cache");
    }

    // Run all health checks in parallel
    const [apiHealth, dbHealth, redisHealth, temporalHealth, storageHealth] = await Promise.all([
        checkApiHealth(),
        checkDatabaseHealth(),
        checkRedisHealth(),
        checkTemporalHealth(),
        checkFileStorageHealth()
    ]);

    const components: ComponentHealth[] = [
        apiHealth,
        dbHealth,
        redisHealth,
        temporalHealth,
        storageHealth
    ];

    // Calculate overall status
    const overallStatus = calculateOverallStatus(components);

    const response: StatusResponse = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        components,
        uptime: getUptimeMetrics()
    };

    // Cache the result
    try {
        await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(response));
    } catch (error) {
        logger.warn({ err: error }, "Failed to cache status");
    }

    return response;
}

/**
 * Invalidate status cache (call after creating/updating incidents)
 */
export async function invalidateStatusCache(): Promise<void> {
    try {
        await redis.del(CACHE_KEY);
        logger.info("Status cache invalidated");
    } catch (error) {
        logger.error({ err: error }, "Failed to invalidate status cache");
    }
}

/**
 * Map component status to HTTP-friendly status code
 */
export function getStatusCode(status: OverallStatus): number {
    switch (status) {
        case "operational":
            return 200;
        case "degraded":
            return 200; // Still operational, just degraded
        case "partial_outage":
            return 200; // Some components down
        case "major_outage":
            return 503; // Service unavailable
    }
}
