/**
 * Provider Test Utilities
 *
 * Provides helper functions for testing integration provider operations
 * using the sandbox infrastructure and test fixtures.
 */

import { ExecutionRouter } from "../../src/integrations/core/ExecutionRouter";
import { providerRegistry } from "../../src/integrations/core/ProviderRegistry";
import { fixtureRegistry, sandboxDataService } from "../../src/integrations/sandbox";
import type { ExecutionContext, OperationResult } from "../../src/integrations/core/types";
import type { TestFixture, TestCase } from "../../src/integrations/sandbox";
import type { ConnectionWithData } from "../../src/storage/models/Connection";

/**
 * Create a test connection for a provider
 */
export function createTestConnection(
    provider: string,
    overrides: Partial<ConnectionWithData> = {}
): ConnectionWithData {
    return {
        id: `test-connection-${provider}-${Date.now()}`,
        user_id: "test-user-id",
        workspace_id: "test-workspace-id",
        name: `Test ${provider} Connection`,
        connection_method: "oauth2",
        provider,
        status: "active",
        metadata: {
            isTestConnection: true,
            account_info: { name: `Test ${provider} Account` }
        },
        capabilities: {},
        last_used_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        data: {
            access_token: `test-token-${provider}`,
            token_type: "Bearer",
            expires_at: new Date(Date.now() + 3600000).toISOString()
        },
        ...overrides
    } as ConnectionWithData;
}

/**
 * Create a test execution context for provider operations
 */
export function createExecutionContext(mode: "workflow" | "agent" = "workflow"): ExecutionContext {
    if (mode === "workflow") {
        return {
            mode: "workflow",
            workflowId: `test-workflow-${Date.now()}`,
            nodeId: `test-node-${Date.now()}`
        };
    }
    return {
        mode: "agent",
        conversationId: `test-conversation-${Date.now()}`,
        toolCallId: `test-tool-call-${Date.now()}`
    };
}

/**
 * Create an ExecutionRouter for testing
 *
 * Test connections have isTestConnection: true in metadata, which
 * triggers sandbox mode automatically in the ExecutionRouter.
 */
export function createTestRouter(): ExecutionRouter {
    return new ExecutionRouter(providerRegistry);
}

/**
 * Execute an operation using the test router
 */
export async function executeTestOperation(
    provider: string,
    operationId: string,
    params: Record<string, unknown>,
    options: {
        connectionOverrides?: Partial<ConnectionWithData>;
        contextMode?: "workflow" | "agent";
    } = {}
): Promise<OperationResult> {
    const router = createTestRouter();
    const connection = createTestConnection(provider, options.connectionOverrides);
    const context = createExecutionContext(options.contextMode);

    return router.execute(provider, operationId, params, connection, context);
}

/**
 * Get all fixtures for a provider
 */
export function getProviderFixtures(provider: string): TestFixture<unknown, unknown>[] {
    return fixtureRegistry.getByProvider(provider);
}

/**
 * Check if a provider has fixtures registered
 */
export function hasProviderFixtures(provider: string): boolean {
    return fixtureRegistry.getByProvider(provider).length > 0;
}

/**
 * Run fixture-based tests for a provider
 *
 * This helper creates a describe block for each operation and runs all
 * valid and error test cases from the registered fixtures.
 *
 * @example
 * ```typescript
 * describe("Slack Provider Operations", () => {
 *     describeProviderFixtures("slack");
 * });
 * ```
 */
export function describeProviderFixtures(provider: string): void {
    const fixtures = fixtureRegistry.getByProvider(provider);

    if (fixtures.length === 0) {
        it(`should have fixtures registered for ${provider}`, () => {
            expect(fixtures.length).toBeGreaterThan(0);
        });
        return;
    }

    let router: ExecutionRouter;
    let connection: ConnectionWithData;
    let context: ExecutionContext;

    beforeAll(() => {
        router = createTestRouter();
        connection = createTestConnection(provider);
        context = createExecutionContext();
    });

    beforeEach(() => {
        sandboxDataService.clearScenarios();
    });

    describe.each(fixtures)("$operationId", (fixture: TestFixture<unknown, unknown>) => {
        describe("valid cases", () => {
            if (fixture.validCases.length === 0) {
                it.skip("no valid cases defined", () => {});
                return;
            }

            it.each(fixture.validCases)("$name", async (testCase: TestCase<unknown, unknown>) => {
                const result = await router.execute(
                    provider,
                    fixture.operationId,
                    testCase.input as Record<string, unknown>,
                    connection,
                    context
                );

                expect(result.success).toBe(true);

                // For fixtures with filterableData, verify the filtering behavior
                if (fixture.filterableData) {
                    verifyFilterableResponse(
                        result,
                        fixture,
                        testCase.input as Record<string, unknown>
                    );
                } else if (testCase.expectedOutput) {
                    expect(result.data).toMatchObject(testCase.expectedOutput as object);
                }
            });
        });

        describe("error cases", () => {
            if (fixture.errorCases.length === 0) {
                it.skip("no error cases defined", () => {});
                return;
            }

            it.each(fixture.errorCases)("$name", async (testCase: TestCase<unknown, undefined>) => {
                // Register error scenario for this test case
                const scenarioId = `error-${fixture.operationId}-${testCase.name}`;
                sandboxDataService.registerScenario({
                    id: scenarioId,
                    provider,
                    operation: fixture.operationId,
                    paramMatchers: testCase.input as Record<string, unknown>,
                    response: {
                        success: false,
                        error: {
                            type: testCase.expectedError?.type || "server_error",
                            message: testCase.expectedError?.message || "Test error",
                            retryable: testCase.expectedError?.retryable || false
                        }
                    }
                });

                const result = await router.execute(
                    provider,
                    fixture.operationId,
                    testCase.input as Record<string, unknown>,
                    connection,
                    context
                );

                expect(result.success).toBe(false);

                if (testCase.expectedError) {
                    expect(result.error?.type).toBe(testCase.expectedError.type);
                    expect(result.error?.message).toBe(testCase.expectedError.message);
                    expect(result.error?.retryable).toBe(testCase.expectedError.retryable);
                }

                sandboxDataService.removeScenario(scenarioId);
            });
        });

        if (fixture.edgeCases && fixture.edgeCases.length > 0) {
            describe("edge cases", () => {
                it.each(fixture.edgeCases!)(
                    "$name",
                    async (testCase: TestCase<unknown, unknown>) => {
                        const result = await router.execute(
                            provider,
                            fixture.operationId,
                            testCase.input as Record<string, unknown>,
                            connection,
                            context
                        );

                        if (testCase.expectedOutput) {
                            expect(result.success).toBe(true);
                            expect(result.data).toMatchObject(testCase.expectedOutput as object);
                        } else if (testCase.expectedError) {
                            expect(result.success).toBe(false);
                            expect(result.error?.type).toBe(testCase.expectedError.type);
                        }
                    }
                );
            });
        }
    });
}

/**
 * Assert that an operation result is successful
 */
export function expectOperationSuccess(
    result: OperationResult,
    expectedData?: Record<string, unknown>
): void {
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    if (expectedData) {
        expect(result.data).toMatchObject(expectedData);
    }
}

/**
 * Assert that an operation result is an error
 */
export function expectOperationError(
    result: OperationResult,
    expectedError?: {
        type?: string;
        message?: string | RegExp;
        retryable?: boolean;
    }
): void {
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    if (expectedError?.type) {
        expect(result.error?.type).toBe(expectedError.type);
    }

    if (expectedError?.message) {
        if (typeof expectedError.message === "string") {
            expect(result.error?.message).toBe(expectedError.message);
        } else {
            expect(result.error?.message).toMatch(expectedError.message);
        }
    }

    if (expectedError?.retryable !== undefined) {
        expect(result.error?.retryable).toBe(expectedError.retryable);
    }
}

/**
 * Verify a filterable response from sandbox
 *
 * For fixtures with filterableData, we verify:
 * 1. The response has the correct structure (records field, etc.)
 * 2. Pagination works correctly (offset present when more records exist)
 * 3. Filters are applied correctly
 */
function verifyFilterableResponse(
    result: OperationResult,
    fixture: TestFixture<unknown, unknown>,
    input: Record<string, unknown>
): void {
    const config = fixture.filterableData!;
    const data = result.data as Record<string, unknown>;

    // Check that records field exists and is an array
    expect(data).toHaveProperty(config.recordsField);
    const records = data[config.recordsField] as unknown[];
    expect(Array.isArray(records)).toBe(true);

    // Verify records don't have internal metadata fields
    for (const record of records) {
        const recordObj = record as Record<string, unknown>;
        const internalFields = Object.keys(recordObj).filter((k) => k.startsWith("_"));
        expect(internalFields).toEqual([]);
    }

    // Verify pagination
    const pageSizeParam = config.pageSizeParam || "pageSize";
    const pageSize = input[pageSizeParam] as number | undefined;
    if (pageSize && pageSize < config.records.length) {
        // Should have offset when there are more records
        expect(records.length).toBeLessThanOrEqual(pageSize);
        if (records.length === pageSize) {
            // May or may not have offset depending on total records
            const totalMatchingRecords = getFilteredRecordCount(config.records, input, config);
            if (totalMatchingRecords > pageSize) {
                expect(data).toHaveProperty(config.offsetField!);
            }
        }
    }

    // Verify filtering based on provider type
    if (config.filterConfig?.type === "airtable") {
        verifyAirtableFiltering(records, config.records, input);
    } else if (config.filterConfig?.type === "hubspot") {
        verifyHubspotFiltering(records, config.records, input);
    }
}

/**
 * Get count of records after applying filters
 */
function getFilteredRecordCount(
    allRecords: Record<string, unknown>[],
    input: Record<string, unknown>,
    _config: TestFixture<unknown, unknown>["filterableData"]
): number {
    let filtered = [...allRecords];

    // Apply view filter
    const view = input.view as string | undefined;
    if (view) {
        filtered = filtered.filter((record) => {
            const views = (record as Record<string, unknown>)._views as string[] | undefined;
            return views?.includes(view);
        });
    }

    // Apply formula filter
    const formula = input.filterByFormula as string | undefined;
    if (formula) {
        const match = formula.match(/\{([^}]+)\}\s*=\s*['"]([^'"]+)['"]/);
        if (match) {
            const fieldName = match[1];
            const expectedValue = match[2];
            filtered = filtered.filter((record) => {
                const fields = (record as Record<string, unknown>).fields as Record<
                    string,
                    unknown
                >;
                return fields && String(fields[fieldName]) === expectedValue;
            });
        }
    }

    return filtered.length;
}

/**
 * Verify Airtable-specific filtering is applied correctly
 */
function verifyAirtableFiltering(
    resultRecords: unknown[],
    sourceRecords: Record<string, unknown>[],
    input: Record<string, unknown>
): void {
    // Verify view filtering
    const view = input.view as string | undefined;
    if (view) {
        for (const record of resultRecords) {
            const recordObj = record as Record<string, unknown>;
            const sourceRecord = sourceRecords.find((r) => r.id === recordObj.id);
            expect(sourceRecord).toBeDefined();

            const views = (sourceRecord as Record<string, unknown>)._views as string[] | undefined;
            expect(views).toBeDefined();
            expect(views).toContain(view);
        }
    }

    // Verify formula filtering
    const formula = input.filterByFormula as string | undefined;
    if (formula) {
        const match = formula.match(/\{([^}]+)\}\s*=\s*['"]([^'"]+)['"]/);
        if (match) {
            const fieldName = match[1];
            const expectedValue = match[2];

            for (const record of resultRecords) {
                const fields = (record as Record<string, unknown>).fields as Record<
                    string,
                    unknown
                >;
                expect(fields).toBeDefined();
                expect(String(fields[fieldName])).toBe(expectedValue);
            }
        }
    }
}

/**
 * Verify HubSpot-specific filtering is applied correctly
 */
function verifyHubspotFiltering(
    resultRecords: unknown[],
    _sourceRecords: Record<string, unknown>[],
    input: Record<string, unknown>
): void {
    const filterGroups = input.filterGroups as
        | Array<{
              filters: Array<{
                  propertyName: string;
                  operator: string;
                  value: unknown;
              }>;
          }>
        | undefined;

    if (!filterGroups || filterGroups.length === 0) {
        return;
    }

    // Verify each returned record matches at least one filter group
    for (const record of resultRecords) {
        const properties = (record as Record<string, unknown>).properties as Record<
            string,
            unknown
        >;
        expect(properties).toBeDefined();

        // Record must match at least one filter group (OR)
        const matchesAnyGroup = filterGroups.some((group) => {
            // All filters in group must match (AND)
            return group.filters.every((filter) => {
                const fieldValue = String(properties[filter.propertyName] || "").toLowerCase();
                const filterValue = String(filter.value || "").toLowerCase();

                switch (filter.operator) {
                    case "EQ":
                        return fieldValue === filterValue;
                    case "NEQ":
                        return fieldValue !== filterValue;
                    case "CONTAINS_TOKEN":
                        return fieldValue.includes(filterValue);
                    case "NOT_CONTAINS_TOKEN":
                        return !fieldValue.includes(filterValue);
                    default:
                        return true;
                }
            });
        });

        expect(matchesAnyGroup).toBe(true);
    }
}
