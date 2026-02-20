/**
 * Database Injection Helper
 *
 * Provides utilities for injecting a test database connection
 * into repositories for integration testing.
 */

import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

// ============================================================================
// TEST DATABASE WRAPPER
// ============================================================================

/**
 * A wrapper around PoolClient that mimics the Database interface.
 * Allows repositories to use a test client within a transaction.
 */
export class TestDatabaseClient {
    constructor(private client: PoolClient) {}

    async query<T extends QueryResultRow = QueryResultRow>(
        text: string,
        params?: unknown[]
    ): Promise<QueryResult<T>> {
        return this.client.query<T>(text, params);
    }

    async getClient(): Promise<PoolClient> {
        return this.client;
    }

    async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
        // Already in a transaction, just run the callback
        return callback(this.client);
    }

    getPool(): Pool {
        throw new Error("getPool() not available in test context");
    }
}

// ============================================================================
// REPOSITORY FACTORY WITH INJECTION
// ============================================================================

/**
 * Create a repository instance that uses a test database client.
 * The repository must accept a db parameter in its constructor or methods.
 *
 * @example
 * ```typescript
 * await withTransaction(async (client) => {
 *     const testDb = createTestDatabase(client);
 *     const repo = createTestRepository(WorkflowRepository, testDb);
 *     const workflow = await repo.create({ ... });
 * });
 * ```
 */
export function createTestDatabase(client: PoolClient): TestDatabaseClient {
    return new TestDatabaseClient(client);
}

// ============================================================================
// REPOSITORY TEST HELPERS
// ============================================================================

/**
 * Interface for repositories that can accept an injected database.
 */
export interface InjectableRepository<T> {
    new (db?: unknown): T;
}

/**
 * Create a test repository with injected database.
 * Note: This requires repositories to accept an optional db parameter.
 *
 * Since the existing repositories use the singleton pattern,
 * we provide utilities to work with transactions directly.
 */
export function createTransactionalQuery(client: PoolClient) {
    return async function query<T extends QueryResultRow = QueryResultRow>(
        text: string,
        params?: unknown[]
    ): Promise<QueryResult<T>> {
        return client.query<T>(text, params);
    };
}
