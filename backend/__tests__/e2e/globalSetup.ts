/**
 * Global Setup for E2E Tests
 *
 * Starts PostgreSQL and Redis containers once before all test files.
 * Connection strings are stored in environment variables for test processes.
 */

import { startPostgresContainer } from "../helpers/testcontainers/postgres";
import { startRedisContainer } from "../helpers/testcontainers/redis";

export default async function globalSetup(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log("\n🐳 Starting test containers...\n");

    const startTime = Date.now();

    try {
        // Start containers in parallel for faster startup
        const [postgres, redis] = await Promise.all([
            startPostgresContainer(),
            startRedisContainer()
        ]);

        // Store connection strings for test processes
        process.env.TEST_DATABASE_URL = postgres.connectionString;
        process.env.TEST_REDIS_URL = redis.connectionString;

        // Store container references for global teardown
        // Using globalThis to persist across Jest workers
        (globalThis as Record<string, unknown>).__POSTGRES_CONTAINER__ = postgres.container;
        (globalThis as Record<string, unknown>).__REDIS_CONTAINER__ = redis.container;
        (globalThis as Record<string, unknown>).__POSTGRES_POOL__ = postgres.pool;
        (globalThis as Record<string, unknown>).__REDIS_CLIENT__ = redis.client;

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        // eslint-disable-next-line no-console
        console.log(`✅ Containers ready in ${duration}s\n`);
        // eslint-disable-next-line no-console
        console.log(`   PostgreSQL: ${postgres.connectionString.replace(/:[^:@]+@/, ":****@")}`);
        // eslint-disable-next-line no-console
        console.log(`   Redis: ${redis.connectionString}\n`);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("❌ Failed to start test containers:", error);
        throw error;
    }
}
