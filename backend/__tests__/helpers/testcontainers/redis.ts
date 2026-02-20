/**
 * Redis Testcontainer Helper
 *
 * Manages a Redis container for integration tests with real Redis.
 * Provides client creation, connection management, and data cleanup.
 */

import { RedisContainer, StartedRedisContainer } from "@testcontainers/redis";
import Redis from "ioredis";

// ============================================================================
// TYPES
// ============================================================================

export interface RedisContainerResult {
    container: StartedRedisContainer;
    client: Redis;
    connectionString: string;
}

// ============================================================================
// MODULE STATE
// ============================================================================

let container: StartedRedisContainer | null = null;
let client: Redis | null = null;

// ============================================================================
// CONTAINER LIFECYCLE
// ============================================================================

/**
 * Start a Redis container for testing.
 */
export async function startRedisContainer(): Promise<RedisContainerResult> {
    container = await new RedisContainer("redis:7").start();

    const connectionString = container.getConnectionUrl();

    // Parse connection URL for ioredis
    const url = new URL(connectionString);
    client = new Redis({
        host: url.hostname,
        port: parseInt(url.port, 10),
        lazyConnect: false,
        retryStrategy: () => null // Fail fast in tests
    });

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
        client!.on("ready", resolve);
        client!.on("error", reject);
    });

    return { container, client, connectionString };
}

/**
 * Stop the Redis container and close the client.
 */
export async function stopRedisContainer(): Promise<void> {
    if (client) {
        await client.quit();
        client = null;
    }
    if (container) {
        await container.stop();
        container = null;
    }
}

/**
 * Get the test Redis client (throws if container not started).
 */
export function getTestRedisClient(): Redis {
    if (!client) {
        throw new Error("Redis container not started. Call startRedisContainer() first.");
    }
    return client;
}

// ============================================================================
// DATA MANAGEMENT
// ============================================================================

/**
 * Flush all data from Redis (useful for test cleanup).
 */
export async function flushRedis(): Promise<void> {
    const testClient = getTestRedisClient();
    await testClient.flushdb();
}

/**
 * Flush all data and reset state (alias for flushRedis).
 */
export async function clearRedis(): Promise<void> {
    return flushRedis();
}

/**
 * Get all keys matching a pattern.
 */
export async function getKeys(pattern: string = "*"): Promise<string[]> {
    const testClient = getTestRedisClient();
    return testClient.keys(pattern);
}

/**
 * Delete keys matching a pattern.
 */
export async function deleteKeys(pattern: string): Promise<number> {
    const testClient = getTestRedisClient();
    const keys = await testClient.keys(pattern);
    if (keys.length === 0) return 0;
    return testClient.del(...keys);
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check if the Redis container is healthy and accepting connections.
 */
export async function healthCheck(): Promise<boolean> {
    try {
        const testClient = getTestRedisClient();
        const result = await testClient.ping();
        return result === "PONG";
    } catch {
        return false;
    }
}

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Create a namespaced key for test isolation.
 * Useful when running parallel tests that share the same Redis instance.
 */
export function namespaceKey(testName: string, key: string): string {
    return `test:${testName}:${key}`;
}

/**
 * Clear all keys with a specific test namespace.
 */
export async function clearTestNamespace(testName: string): Promise<number> {
    return deleteKeys(`test:${testName}:*`);
}
