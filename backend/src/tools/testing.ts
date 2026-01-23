/**
 * Tool Testing Utilities
 *
 * Provides utilities for testing tools in isolation
 */

import { v4 as uuidv4 } from "uuid";
import type {
    BuiltInTool,
    ToolExecutionContext,
    ToolExecutionResult,
    ToolRiskLevel
} from "./types";

/**
 * Options for creating a test context
 */
export interface TestContextOptions {
    userId?: string;
    workspaceId?: string;
    connectionId?: string;
    mode?: "agent" | "persona" | "workflow";
    traceId?: string;
}

/**
 * Create a test execution context
 */
export function createTestContext(options: TestContextOptions = {}): ToolExecutionContext {
    return {
        userId: options.userId || "test-user-id",
        workspaceId: options.workspaceId || "test-workspace-id",
        connectionId: options.connectionId,
        mode: options.mode || "agent",
        traceId: options.traceId || `test-${uuidv4()}`
    };
}

/**
 * Test a built-in tool
 */
export async function testTool(
    tool: BuiltInTool,
    params: Record<string, unknown>,
    contextOptions: TestContextOptions = {}
): Promise<ToolExecutionResult> {
    const context = createTestContext(contextOptions);
    return await tool.execute(params, context);
}

/**
 * Test tool input validation
 */
export function testToolValidation(
    tool: BuiltInTool,
    params: Record<string, unknown>
): { valid: boolean; errors?: string[] } {
    if (!tool.zodSchema) {
        return { valid: true };
    }

    const result = tool.zodSchema.safeParse(params);

    if (result.success) {
        return { valid: true };
    }

    return {
        valid: false,
        errors: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    };
}

/**
 * Assert that a tool result is successful
 */
export function assertSuccess(
    result: ToolExecutionResult
): asserts result is ToolExecutionResult & { success: true } {
    if (!result.success) {
        throw new Error(
            `Expected success but got error: ${result.error?.message || "Unknown error"}`
        );
    }
}

/**
 * Assert that a tool result is a failure
 */
export function assertFailure(
    result: ToolExecutionResult
): asserts result is ToolExecutionResult & { success: false } {
    if (result.success) {
        throw new Error("Expected failure but got success");
    }
}

/**
 * Assert that a tool result has a specific error code
 */
export function assertErrorCode(result: ToolExecutionResult, code: string): void {
    if (result.success) {
        throw new Error(`Expected error code ${code} but got success`);
    }
    if (result.error?.code !== code) {
        throw new Error(`Expected error code ${code} but got ${result.error?.code || "no code"}`);
    }
}

/**
 * Assert that a tool result has data matching a predicate
 */
export function assertDataMatches<T>(
    result: ToolExecutionResult,
    predicate: (data: T) => boolean
): void {
    if (!result.success) {
        throw new Error("Expected success but got failure");
    }
    if (!predicate(result.data as T)) {
        throw new Error("Data does not match predicate");
    }
}

/**
 * Assert that a tool result has metadata
 */
export function assertHasMetadata(result: ToolExecutionResult): void {
    if (!result.metadata) {
        throw new Error("Expected metadata but got none");
    }
}

/**
 * Assert that a tool result has specific credit cost
 */
export function assertCreditCost(result: ToolExecutionResult, expectedCost: number): void {
    if (!result.metadata?.creditCost) {
        throw new Error("Expected credit cost in metadata");
    }
    if (result.metadata.creditCost !== expectedCost) {
        throw new Error(
            `Expected credit cost ${expectedCost} but got ${result.metadata.creditCost}`
        );
    }
}

/**
 * Assertion helpers namespace for tool testing
 */
export const assertions = {
    isSuccess: assertSuccess,
    isFailure: assertFailure,
    hasErrorCode: assertErrorCode,
    dataMatches: assertDataMatches,
    hasMetadata: assertHasMetadata,
    hasCreditCost: assertCreditCost
};

/**
 * Mock tool for testing
 */
export function createMockTool(overrides: Partial<BuiltInTool> = {}): BuiltInTool {
    return {
        name: "mock_tool",
        displayName: "Mock Tool",
        description: "A mock tool for testing",
        category: "web",
        riskLevel: "none" as ToolRiskLevel,
        inputSchema: {
            type: "object",
            properties: {
                input: { type: "string" }
            },
            required: ["input"]
        },
        enabledByDefault: true,
        creditCost: 0,
        execute: async () => ({
            success: true,
            data: { result: "mock result" },
            metadata: { durationMs: 10 }
        }),
        ...overrides
    };
}

/**
 * Create a mock execution result
 */
export function createMockResult(
    overrides: Partial<ToolExecutionResult> = {}
): ToolExecutionResult {
    return {
        success: true,
        data: { result: "mock" },
        metadata: {
            durationMs: 100,
            creditCost: 1
        },
        ...overrides
    };
}

/**
 * Test suite builder for tools
 */
export class ToolTestSuite {
    private tool: BuiltInTool;
    private tests: Array<{
        name: string;
        fn: () => Promise<void>;
    }> = [];

    constructor(tool: BuiltInTool) {
        this.tool = tool;
    }

    /**
     * Add a test case
     */
    test(name: string, fn: () => Promise<void>): this {
        this.tests.push({ name, fn });
        return this;
    }

    /**
     * Add a test for successful execution
     */
    testSuccess(
        name: string,
        params: Record<string, unknown>,
        contextOptions?: TestContextOptions
    ): this {
        this.tests.push({
            name,
            fn: async () => {
                const result = await testTool(this.tool, params, contextOptions);
                assertSuccess(result);
            }
        });
        return this;
    }

    /**
     * Add a test for validation failure
     */
    testValidationFailure(name: string, params: Record<string, unknown>): this {
        this.tests.push({
            name,
            fn: async () => {
                const validation = testToolValidation(this.tool, params);
                if (validation.valid) {
                    throw new Error("Expected validation to fail");
                }
            }
        });
        return this;
    }

    /**
     * Add a test for specific error code
     */
    testErrorCode(
        name: string,
        params: Record<string, unknown>,
        expectedCode: string,
        contextOptions?: TestContextOptions
    ): this {
        this.tests.push({
            name,
            fn: async () => {
                const result = await testTool(this.tool, params, contextOptions);
                assertErrorCode(result, expectedCode);
            }
        });
        return this;
    }

    /**
     * Run all tests
     */
    async run(): Promise<{
        passed: number;
        failed: number;
        results: Array<{ name: string; passed: boolean; error?: string }>;
    }> {
        const results: Array<{ name: string; passed: boolean; error?: string }> = [];

        for (const test of this.tests) {
            try {
                await test.fn();
                results.push({ name: test.name, passed: true });
            } catch (error) {
                results.push({
                    name: test.name,
                    passed: false,
                    error: error instanceof Error ? error.message : "Unknown error"
                });
            }
        }

        return {
            passed: results.filter((r) => r.passed).length,
            failed: results.filter((r) => !r.passed).length,
            results
        };
    }
}

/**
 * Create a test suite for a tool
 */
export function createToolTestSuite(tool: BuiltInTool): ToolTestSuite {
    return new ToolTestSuite(tool);
}
