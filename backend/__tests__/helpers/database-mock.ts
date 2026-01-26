/**
 * Database Mock Helper
 *
 * In-memory mocks for database client testing.
 * Tests query building, parameter binding, and result mapping.
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";

// ============================================================================
// TYPES
// ============================================================================

export interface MockQueryResult {
    rows: JsonObject[];
    rowCount: number;
    fields?: Array<{ name: string; dataTypeID: number }>;
}

export interface MockQueryCall {
    sql: string;
    params: JsonValue[];
    timestamp: number;
}

export interface MockDatabaseClient {
    query: jest.Mock<Promise<MockQueryResult>, [sql: string, params?: JsonValue[]]>;
    connect: jest.Mock<Promise<void>, []>;
    release: jest.Mock<void, []>;
    end: jest.Mock<Promise<void>, []>;
    // Track calls for assertions
    getCalls: () => MockQueryCall[];
    clearCalls: () => void;
    // Configure mock responses
    setQueryResult: (sql: string | RegExp, result: MockQueryResult) => void;
    setQueryError: (sql: string | RegExp, error: Error) => void;
    clearQueryResults: () => void;
}

// ============================================================================
// MOCK FACTORY
// ============================================================================

/**
 * Create a mock database client for testing
 */
export function createMockDatabaseClient(): MockDatabaseClient {
    const calls: MockQueryCall[] = [];
    const queryResults = new Map<string | RegExp, MockQueryResult>();
    const queryErrors = new Map<string | RegExp, Error>();

    const defaultResult: MockQueryResult = {
        rows: [],
        rowCount: 0
    };

    const findMatchingResult = (sql: string): MockQueryResult | null => {
        // Check exact matches first
        if (queryResults.has(sql)) {
            return queryResults.get(sql)!;
        }

        // Check regex patterns
        for (const [pattern, result] of queryResults) {
            if (pattern instanceof RegExp && pattern.test(sql)) {
                return result;
            }
        }

        return null;
    };

    const findMatchingError = (sql: string): Error | null => {
        // Check exact matches first
        if (queryErrors.has(sql)) {
            return queryErrors.get(sql)!;
        }

        // Check regex patterns
        for (const [pattern, error] of queryErrors) {
            if (pattern instanceof RegExp && pattern.test(sql)) {
                return error;
            }
        }

        return null;
    };

    const mockQuery = jest.fn(async (sql: string, params: JsonValue[] = []) => {
        calls.push({ sql, params, timestamp: Date.now() });

        // Check for configured error
        const error = findMatchingError(sql);
        if (error) {
            throw error;
        }

        // Return configured result or default
        const result = findMatchingResult(sql);
        return result || defaultResult;
    });

    return {
        query: mockQuery,
        connect: jest.fn().mockResolvedValue(undefined),
        release: jest.fn(),
        end: jest.fn().mockResolvedValue(undefined),

        getCalls: () => [...calls],
        clearCalls: () => {
            calls.length = 0;
        },

        setQueryResult: (sql: string | RegExp, result: MockQueryResult) => {
            queryResults.set(sql, result);
        },

        setQueryError: (sql: string | RegExp, error: Error) => {
            queryErrors.set(sql, error);
        },

        clearQueryResults: () => {
            queryResults.clear();
            queryErrors.clear();
        }
    };
}

// ============================================================================
// MOCK POOL
// ============================================================================

export interface MockPool {
    query: jest.Mock<Promise<MockQueryResult>, [sql: string, params?: JsonValue[]]>;
    connect: jest.Mock<Promise<MockDatabaseClient>, []>;
    end: jest.Mock<Promise<void>, []>;
    totalCount: number;
    idleCount: number;
    waitingCount: number;
}

/**
 * Create a mock connection pool
 */
export function createMockPool(): MockPool {
    const client = createMockDatabaseClient();

    return {
        query: client.query,
        connect: jest.fn().mockResolvedValue(client),
        end: jest.fn().mockResolvedValue(undefined),
        totalCount: 10,
        idleCount: 10,
        waitingCount: 0
    };
}

// ============================================================================
// PRESET RESULTS
// ============================================================================

/**
 * Create a mock result with rows
 */
export function mockRows(rows: JsonObject[]): MockQueryResult {
    return {
        rows,
        rowCount: rows.length,
        fields:
            rows.length > 0 ? Object.keys(rows[0]).map((name) => ({ name, dataTypeID: 25 })) : []
    };
}

/**
 * Create a mock result for INSERT/UPDATE/DELETE
 */
export function mockAffectedRows(count: number): MockQueryResult {
    return {
        rows: [],
        rowCount: count
    };
}

/**
 * Create a mock result for INSERT ... RETURNING
 */
export function mockInsertReturning(inserted: JsonObject[]): MockQueryResult {
    return {
        rows: inserted,
        rowCount: inserted.length
    };
}

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

/**
 * Generate sample user records
 */
export function generateMockUsers(count: number): JsonObject[] {
    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        email: `user${i + 1}@example.com`,
        name: `User ${i + 1}`,
        created_at: new Date(Date.now() - i * 86400000).toISOString(),
        updated_at: new Date().toISOString()
    }));
}

/**
 * Generate sample workflow records
 */
export function generateMockWorkflows(count: number, userId: string = "user-1"): JsonObject[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `workflow-${i + 1}`,
        user_id: userId,
        name: `Workflow ${i + 1}`,
        description: `Test workflow ${i + 1}`,
        definition: { nodes: {}, edges: [] },
        created_at: new Date(Date.now() - i * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null
    }));
}
