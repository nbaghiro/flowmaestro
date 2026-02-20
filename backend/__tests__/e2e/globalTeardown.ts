/**
 * Global Teardown for E2E Tests
 *
 * Stops PostgreSQL and Redis containers after all test files complete.
 */

import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedRedisContainer } from "@testcontainers/redis";
import type Redis from "ioredis";
import type { Pool } from "pg";

export default async function globalTeardown(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log("\n🧹 Stopping test containers...\n");

    const startTime = Date.now();

    try {
        // Retrieve container references from global state
        const postgresContainer = (globalThis as Record<string, unknown>).__POSTGRES_CONTAINER__ as
            | StartedPostgreSqlContainer
            | undefined;
        const redisContainer = (globalThis as Record<string, unknown>).__REDIS_CONTAINER__ as
            | StartedRedisContainer
            | undefined;
        const postgresPool = (globalThis as Record<string, unknown>).__POSTGRES_POOL__ as
            | Pool
            | undefined;
        const redisClient = (globalThis as Record<string, unknown>).__REDIS_CLIENT__ as
            | Redis
            | undefined;

        // Close connections first
        const connectionClosePromises: Promise<void>[] = [];

        if (postgresPool) {
            connectionClosePromises.push(
                postgresPool.end().catch((err) => {
                    // eslint-disable-next-line no-console
                    console.warn("Warning: Error closing PostgreSQL pool:", err.message);
                })
            );
        }

        if (redisClient) {
            connectionClosePromises.push(
                redisClient
                    .quit()
                    .then(() => undefined)
                    .catch((err) => {
                        // eslint-disable-next-line no-console
                        console.warn("Warning: Error closing Redis client:", err.message);
                    })
            );
        }

        await Promise.all(connectionClosePromises);

        // Stop containers
        const containerStopPromises: Promise<void>[] = [];

        if (postgresContainer) {
            containerStopPromises.push(
                postgresContainer
                    .stop()
                    .then(() => undefined)
                    .catch((err) => {
                        // eslint-disable-next-line no-console
                        console.warn("Warning: Error stopping PostgreSQL container:", err.message);
                    })
            );
        }

        if (redisContainer) {
            containerStopPromises.push(
                redisContainer
                    .stop()
                    .then(() => undefined)
                    .catch((err) => {
                        // eslint-disable-next-line no-console
                        console.warn("Warning: Error stopping Redis container:", err.message);
                    })
            );
        }

        await Promise.all(containerStopPromises);

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        // eslint-disable-next-line no-console
        console.log(`✅ Containers stopped in ${duration}s\n`);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("❌ Error during teardown:", error);
        // Don't throw - we want tests to complete even if teardown fails
    }
}
