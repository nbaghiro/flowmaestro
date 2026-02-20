/**
 * Setup for E2E Tests
 *
 * Runs after environment is set up for each test file.
 * Provides database and Redis client injection, cleanup utilities.
 */

import Redis from "ioredis";
import { Pool } from "pg";

// ============================================================================
// RE-INITIALIZE CLIENTS FROM GLOBAL STATE
// ============================================================================

// Pool and client initialized from environment variables set by globalSetup
let pool: Pool | null = null;
let redisClient: Redis | null = null;

/**
 * Get the PostgreSQL pool for tests.
 * Creates a new pool from environment if not already created.
 */
export function getPool(): Pool {
    if (!pool && process.env.TEST_DATABASE_URL) {
        pool = new Pool({
            connectionString: process.env.TEST_DATABASE_URL,
            max: 5,
            idleTimeoutMillis: 10000
        });
    }

    if (!pool) {
        throw new Error("PostgreSQL pool not available. Ensure globalSetup ran successfully.");
    }

    return pool;
}

/**
 * Get the Redis client for tests.
 * Creates a new client from environment if not already created.
 */
export function getRedis(): Redis {
    if (!redisClient && process.env.TEST_REDIS_URL) {
        const url = new URL(process.env.TEST_REDIS_URL);
        redisClient = new Redis({
            host: url.hostname,
            port: parseInt(url.port, 10),
            lazyConnect: false,
            // Enable offline queue so commands queue while connecting
            enableOfflineQueue: true,
            // Auto-reconnect settings
            retryStrategy: (times: number) => {
                if (times > 3) return null; // Stop retrying
                return Math.min(times * 100, 1000);
            }
        });
    }

    if (!redisClient) {
        throw new Error("Redis client not available. Ensure globalSetup ran successfully.");
    }

    return redisClient;
}

/**
 * Ensure Redis connection is ready before proceeding.
 * Call this in beforeAll/beforeEach to wait for connection.
 */
export async function waitForRedis(): Promise<void> {
    const redis = getRedis();

    // Wait for connection to be ready via event if not already
    if (redis.status !== "ready") {
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("Redis connection timeout"));
            }, 10000);

            if (redis.status === "ready") {
                clearTimeout(timeout);
                resolve();
                return;
            }

            redis.once("ready", () => {
                clearTimeout(timeout);
                resolve();
            });

            redis.once("error", (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    // Verify connection is truly ready with a ping
    const pong = await redis.ping();
    if (pong !== "PONG") {
        throw new Error(`Redis ping failed: ${pong}`);
    }
}

// ============================================================================
// TEST LIFECYCLE HOOKS
// ============================================================================

// Increase timeout for E2E tests with real infrastructure
jest.setTimeout(60000);

// Set environment to test
process.env.NODE_ENV = "test";

// Wait for Redis connection to be ready before running tests
beforeAll(async () => {
    await waitForRedis();
});

// Cleanup after each test file
// Note: We don't close Redis here because it's shared across test files.
// The global teardown will handle final cleanup.
afterAll(async () => {
    // Close database pool (each file gets its own pool from environment)
    if (pool) {
        await pool.end();
        pool = null;
    }

    // Note: Redis client is intentionally NOT closed here to avoid
    // timing issues with sequential test files. Global teardown handles it.
});

// ============================================================================
// DATABASE UTILITIES
// ============================================================================

/**
 * Execute a callback within a transaction that rolls back after completion.
 * Provides test isolation without affecting other tests.
 */
export async function withTransaction<T>(
    fn: (client: import("pg").PoolClient) => Promise<T>
): Promise<T> {
    const testPool = getPool();
    const client = await testPool.connect();

    try {
        await client.query("BEGIN");
        await client.query("SET search_path TO flowmaestro, public");
        const result = await fn(client);
        await client.query("ROLLBACK");
        return result;
    } catch (error) {
        // Ensure rollback on error to clean up the transaction state
        try {
            await client.query("ROLLBACK");
        } catch {
            // Ignore rollback errors
        }
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Clear all data from the database.
 * Use sparingly - prefer withTransaction for test isolation.
 */
export async function clearDatabase(): Promise<void> {
    const testPool = getPool();

    const result = await testPool.query(`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'flowmaestro'
        AND tablename NOT LIKE 'pgmigrations%'
    `);

    if (result.rows.length > 0) {
        const tables = result.rows
            .map((row: { tablename: string }) => `flowmaestro."${row.tablename}"`)
            .join(", ");
        await testPool.query(`TRUNCATE ${tables} CASCADE`);
    }
}

// ============================================================================
// REDIS UTILITIES
// ============================================================================

// Counter for generating unique test prefixes
let testPrefixCounter = 0;

/**
 * Generate a unique prefix for Redis keys in this test run.
 * Use this to avoid interference between parallel tests.
 */
export function getTestPrefix(): string {
    testPrefixCounter++;
    return `test_${process.pid}_${testPrefixCounter}_`;
}

/**
 * Flush all Redis data and verify connection is ready.
 */
export async function flushRedis(): Promise<void> {
    // Wait for connection to be ready first
    await waitForRedis();

    const redis = getRedis();

    // Check connection status before operations
    if (redis.status !== "ready") {
        throw new Error(`Redis not ready, status: ${redis.status}`);
    }

    const result = await redis.flushdb();
    if (result !== "OK") {
        throw new Error(`Redis flushdb failed: ${result}`);
    }

    // Verify flush completed with a round-trip
    const pong = await redis.ping();
    if (pong !== "PONG") {
        throw new Error(`Redis ping after flush failed: ${pong}`);
    }

    // Reset prefix counter after flush
    testPrefixCounter = 0;
}

/**
 * Delete Redis keys matching a pattern.
 */
export async function deleteRedisKeys(pattern: string): Promise<number> {
    const redis = getRedis();
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;
    return redis.del(...keys);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { Pool, Redis };
