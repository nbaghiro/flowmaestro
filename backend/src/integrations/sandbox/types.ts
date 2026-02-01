/**
 * Sandbox Test Data Types
 *
 * Core types for the sandbox/test connection infrastructure.
 * These types are used both at runtime (for test connections) and in tests.
 */

import type { OperationError, OperationResult } from "../core/types";

/**
 * A test fixture for an integration operation
 */
export interface TestFixture<TInput = unknown, TOutput = unknown> {
    operationId: string;
    provider: string;
    validCases: TestCase<TInput, TOutput>[];
    errorCases: TestCase<TInput, undefined>[];
    edgeCases?: TestCase<TInput, TOutput>[];
    /**
     * For list operations: the base dataset that can be filtered/paginated.
     * When this is provided, the sandbox will dynamically filter results
     * based on input params instead of returning static test case outputs.
     */
    filterableData?: FilterableDataConfig;
}

/**
 * Configuration for operations that support filtering/pagination
 */
export interface FilterableDataConfig {
    /** The full dataset of records */
    records: Record<string, unknown>[];
    /** Field name that contains the records array in the response (e.g., "records", "results", "data") */
    recordsField: string;
    /** Field name for the pagination offset in responses (e.g., "offset", "nextCursor", "after") */
    offsetField?: string;
    /** Default page size if not specified in params */
    defaultPageSize?: number;
    /** Maximum page size allowed */
    maxPageSize?: number;
    /** Param name for page size (e.g., "pageSize", "limit", "maxResults") */
    pageSizeParam?: string;
    /** Param name for offset/cursor (e.g., "offset", "cursor", "after") */
    offsetParam?: string;
    /** Provider-specific filter configuration */
    filterConfig?: FilterConfig;
}

/**
 * Provider-specific filter configuration
 */
export interface FilterConfig {
    /** Filter type determines how filters are applied */
    type: "airtable" | "hubspot" | "generic";
    /** Fields that can be filtered on */
    filterableFields?: string[];
}

/**
 * A single test case within a fixture
 */
export interface TestCase<TInput, TOutput> {
    name: string;
    description?: string;
    input: TInput;
    expectedOutput?: TOutput;
    expectedError?: ExpectedError;
}

/**
 * Expected error shape for error test cases
 */
export interface ExpectedError {
    type: OperationError["type"];
    message?: string;
    retryable?: boolean;
}

/**
 * A custom sandbox scenario for runtime testing
 */
export interface SandboxScenario {
    id: string;
    provider: string;
    operation: string;
    /** Optional matchers for specific parameter values */
    paramMatchers?: Record<string, unknown>;
    /** The sandbox response to return */
    response: OperationResult;
    /** Optional delay in milliseconds to simulate API latency */
    delay?: number;
}
