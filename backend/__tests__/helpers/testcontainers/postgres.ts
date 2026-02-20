/**
 * PostgreSQL Testcontainer Helper
 *
 * Manages a PostgreSQL container for integration tests with real database.
 * Provides connection pooling, migration running, and transaction isolation.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool, PoolClient } from "pg";

// ============================================================================
// TYPES
// ============================================================================

export interface PostgresContainerResult {
    container: StartedPostgreSqlContainer;
    pool: Pool;
    connectionString: string;
}

// ============================================================================
// MODULE STATE
// ============================================================================

let container: StartedPostgreSqlContainer | null = null;
let pool: Pool | null = null;

// ============================================================================
// CONTAINER LIFECYCLE
// ============================================================================

/**
 * Start a PostgreSQL container for testing.
 * Runs all migrations to set up the schema.
 */
export async function startPostgresContainer(): Promise<PostgresContainerResult> {
    // Use pgvector image which includes PostgreSQL with pgvector extension pre-installed
    // This allows testing vector/embedding features with real database
    container = await new PostgreSqlContainer("pgvector/pgvector:pg15")
        .withDatabase("flowmaestro_test")
        .withUsername("test")
        .withPassword("test")
        .start();

    const connectionString = container.getConnectionUri();
    pool = new Pool({
        connectionString,
        max: 5,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 5000
    });

    // Run migrations
    await runMigrations(pool);

    return { container, pool, connectionString };
}

/**
 * Stop the PostgreSQL container and close the pool.
 */
export async function stopPostgresContainer(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
    if (container) {
        await container.stop();
        container = null;
    }
}

/**
 * Get the test pool (throws if container not started).
 */
export function getTestPool(): Pool {
    if (!pool) {
        throw new Error("PostgreSQL container not started. Call startPostgresContainer() first.");
    }
    return pool;
}

// ============================================================================
// TRANSACTION ISOLATION
// ============================================================================

/**
 * Execute a function within a transaction that is rolled back after completion.
 * This provides test isolation - each test gets a clean database state.
 *
 * @example
 * ```typescript
 * await withTransaction(async (client) => {
 *     const user = await seedUser(client);
 *     const result = await repo.findById(user.id);
 *     expect(result).not.toBeNull();
 * });
 * ```
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const testPool = getTestPool();
    const client = await testPool.connect();

    try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("ROLLBACK"); // Always rollback for test isolation
        return result;
    } finally {
        client.release();
    }
}

/**
 * Execute a function with a savepoint for nested transaction support.
 * Useful for testing transaction behavior within a test.
 */
export async function withSavepoint<T>(
    client: PoolClient,
    name: string,
    fn: () => Promise<T>
): Promise<T> {
    await client.query(`SAVEPOINT ${name}`);
    try {
        const result = await fn();
        return result;
    } catch (error) {
        await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
        throw error;
    }
}

// ============================================================================
// DATABASE UTILITIES
// ============================================================================

/**
 * Clear all data from the database (useful for test cleanup).
 * Uses TRUNCATE CASCADE for efficiency.
 */
export async function clearDatabase(): Promise<void> {
    const testPool = getTestPool();

    // Get all tables in the flowmaestro schema
    const result = await testPool.query(`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'flowmaestro'
        AND tablename NOT LIKE 'pgmigrations%'
    `);

    if (result.rows.length > 0) {
        const tables = result.rows.map((row) => `flowmaestro."${row.tablename}"`).join(", ");
        await testPool.query(`TRUNCATE ${tables} CASCADE`);
    }
}

/**
 * Reset sequences to start from 1 (useful after clearing data).
 */
export async function resetSequences(): Promise<void> {
    const testPool = getTestPool();

    const result = await testPool.query(`
        SELECT sequence_name FROM information_schema.sequences
        WHERE sequence_schema = 'flowmaestro'
    `);

    for (const row of result.rows) {
        await testPool.query(`ALTER SEQUENCE flowmaestro."${row.sequence_name}" RESTART WITH 1`);
    }
}

// ============================================================================
// MIGRATION RUNNER
// ============================================================================

/**
 * Run all migrations in order to set up the database schema.
 */
async function runMigrations(migrationsPool: Pool): Promise<void> {
    const migrationsDir = join(__dirname, "../../../migrations");

    // Create extensions FIRST in public schema (before setting search_path)
    // These extensions provide functions like uuid_generate_v4() used by migrations
    await migrationsPool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public');
    await migrationsPool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public');

    // Verify uuid_generate_v4 is available
    const uuidCheck = await migrationsPool.query("SELECT uuid_generate_v4()");
    if (!uuidCheck.rows[0]) {
        throw new Error("uuid-ossp extension not working - uuid_generate_v4() failed");
    }

    // Create schema
    await migrationsPool.query("CREATE SCHEMA IF NOT EXISTS flowmaestro");

    // Set search path - public must be included for extension functions
    await migrationsPool.query("SET search_path TO flowmaestro, public");

    // Create vector extension (available in pgvector/pgvector image)
    await migrationsPool.query("CREATE EXTENSION IF NOT EXISTS vector SCHEMA public");

    // Verify vector extension is available
    try {
        await migrationsPool.query("SELECT '[1,2,3]'::vector");
    } catch {
        throw new Error(
            "pgvector extension not available - ensure using pgvector/pgvector Docker image"
        );
    }

    // Read and execute migration files in order
    const files = readdirSync(migrationsDir)
        .filter((f) => f.endsWith(".sql") && !f.includes("down"))
        .sort();

    // eslint-disable-next-line no-console
    console.log(`   Running ${files.length} migrations...`);

    for (const file of files) {
        const sql = readFileSync(join(migrationsDir, file), "utf-8");

        try {
            // Execute the migration
            await migrationsPool.query(sql);
            if (file.includes("initial-schema")) {
                // eslint-disable-next-line no-console
                console.log(`   ✓ ${file}`);
            }
        } catch (error) {
            const err = error as Error;
            const msg = err.message.toLowerCase();

            // Ignorable errors - these are expected in some cases
            // Be specific to avoid ignoring real errors
            const ignorablePatterns = [
                "already exists",
                'type "vector" does not exist',
                "duplicate key",
                // Specific "does not exist" patterns for ALTER/DROP operations
                "column.*does not exist",
                "table.*does not exist.*to alter",
                "constraint.*does not exist"
            ];

            const isIgnorable = ignorablePatterns.some((pattern) =>
                new RegExp(pattern, "i").test(msg)
            );

            if (!isIgnorable) {
                // For the initial schema migration, we need to fail hard
                if (file.includes("initial-schema")) {
                    throw err;
                }
                // Log unexpected errors for other migrations
                // eslint-disable-next-line no-console
                console.error(`   ✗ ${file}: ${err.message.substring(0, 100)}`);
            }
        }
    }

    // Verify critical tables exist
    const criticalTables = ["users", "workflows", "workspaces", "executions"];
    for (const table of criticalTables) {
        const result = await migrationsPool.query(
            `SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'flowmaestro' AND table_name = $1
            )`,
            [table]
        );
        if (!result.rows[0].exists) {
            throw new Error(`Critical table 'flowmaestro.${table}' was not created by migrations`);
        }
    }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check if the PostgreSQL container is healthy and accepting connections.
 */
export async function healthCheck(): Promise<boolean> {
    try {
        const testPool = getTestPool();
        await testPool.query("SELECT 1");
        return true;
    } catch {
        return false;
    }
}
