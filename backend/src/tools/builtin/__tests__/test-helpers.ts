/**
 * Tool Testing Utilities
 *
 * Utilities for testing tools in isolation. Provides both:
 * - Runtime utilities that can be used in scripts, REPL, or anywhere
 * - Jest-specific assertions using expect() for better test reporting
 */

import { execSync } from "child_process";
import { v4 as uuidv4 } from "uuid";
import type {
    BuiltInTool,
    ToolExecutionContext,
    ToolExecutionResult,
    ToolRiskLevel
} from "../../types";

// ============================================================================
// Context Creation
// ============================================================================

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
 * Create a mock tool execution context with fixed IDs for deterministic tests
 */
export function createMockContext(overrides?: Partial<ToolExecutionContext>): ToolExecutionContext {
    return createTestContext({
        userId: "test-user-123",
        workspaceId: "test-workspace-456",
        traceId: "test-trace-abc",
        ...overrides
    });
}

// ============================================================================
// Tool Execution
// ============================================================================

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
 * Test that a tool rejects invalid input with schema validation
 */
export async function testInvalidInput(
    tool: BuiltInTool,
    invalidParams: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<void> {
    const result = await tool.execute(invalidParams, context);
    assertError(result);
}

// ============================================================================
// Runtime Assertions (throw errors, no Jest dependency)
// ============================================================================

/**
 * Assert that a tool result is successful (runtime version - throws on failure)
 */
export function assertSuccess(
    result: ToolExecutionResult
): asserts result is ToolExecutionResult & { success: true; data: Record<string, unknown> } {
    if (typeof expect !== "undefined") {
        // Jest environment - use expect() for better reporting
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.error).toBeUndefined();
    } else {
        // Runtime environment - throw errors
        if (!result.success) {
            throw new Error(
                `Expected success but got error: ${result.error?.message || "Unknown error"}`
            );
        }
    }
}

/**
 * Assert that a tool result is a failure (runtime version)
 */
export function assertFailure(
    result: ToolExecutionResult
): asserts result is ToolExecutionResult & { success: false } {
    if (result.success) {
        throw new Error("Expected failure but got success");
    }
}

/**
 * Assert that a tool result is an error (Jest version with optional code check)
 */
export function assertError(
    result: ToolExecutionResult,
    expectedCode?: string
): asserts result is ToolExecutionResult & {
    success: false;
    error: { message: string; code?: string };
} {
    if (typeof expect !== "undefined") {
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.message).toBeTruthy();
        if (expectedCode) {
            expect(result.error?.code).toBe(expectedCode);
        }
    } else {
        if (result.success) {
            throw new Error("Expected error but got success");
        }
        if (expectedCode && result.error?.code !== expectedCode) {
            throw new Error(
                `Expected error code ${expectedCode} but got ${result.error?.code || "no code"}`
            );
        }
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
 * Assert that a tool result has metadata (with optional duration check)
 */
export function assertHasMetadata(result: ToolExecutionResult): void {
    if (typeof expect !== "undefined") {
        expect(result.metadata).toBeDefined();
        expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(0);
    } else {
        if (!result.metadata) {
            throw new Error("Expected metadata but got none");
        }
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
 * Assert that a tool has correct basic properties
 */
export function assertToolProperties(
    tool: BuiltInTool,
    expected: {
        name: string;
        category: string;
        riskLevel: string;
    }
): void {
    if (typeof expect !== "undefined") {
        expect(tool.name).toBe(expected.name);
        expect(tool.category).toBe(expected.category);
        expect(tool.riskLevel).toBe(expected.riskLevel);
        expect(tool.displayName).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.zodSchema).toBeDefined();
        expect(tool.execute).toBeInstanceOf(Function);
    } else {
        if (tool.name !== expected.name) {
            throw new Error(`Expected name ${expected.name} but got ${tool.name}`);
        }
        if (tool.category !== expected.category) {
            throw new Error(`Expected category ${expected.category} but got ${tool.category}`);
        }
        if (tool.riskLevel !== expected.riskLevel) {
            throw new Error(`Expected riskLevel ${expected.riskLevel} but got ${tool.riskLevel}`);
        }
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

// ============================================================================
// Mock Factories
// ============================================================================

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

// ============================================================================
// Python Validation Utilities
// ============================================================================

let pythonAvailable: boolean | null = null;
let pythonVersion: string | null = null;

/**
 * Check if Python is available for syntax validation
 * Caches the result after first check
 */
export function isPythonAvailable(): boolean {
    if (pythonAvailable !== null) {
        return pythonAvailable;
    }

    try {
        const result = execSync("python3 --version", { stdio: "pipe", encoding: "utf-8" });
        pythonVersion = result.trim();
        pythonAvailable = true;
    } catch {
        pythonAvailable = false;
    }

    return pythonAvailable;
}

/**
 * Get Python version string (for error messages)
 */
export function getPythonVersion(): string | null {
    isPythonAvailable();
    return pythonVersion;
}

/**
 * Require Python to be available - throws if not
 */
export function requirePython(): void {
    if (!isPythonAvailable()) {
        throw new Error(
            "Python 3 is required for syntax validation tests but was not found.\n" +
                "Please install Python 3 and ensure 'python3' is available in PATH.\n" +
                "On macOS: brew install python3\n" +
                "On Ubuntu: sudo apt-get install python3\n" +
                "On Windows: https://www.python.org/downloads/"
        );
    }
}

/**
 * Validate Python syntax using Python's ast module
 * Returns { valid: true } or { valid: false, error: string }
 */
export function validatePythonSyntax(
    code: string
): { valid: true } | { valid: false; error: string } {
    requirePython();

    try {
        execSync('python3 -c "import sys, ast; ast.parse(sys.stdin.read())"', {
            input: code,
            stdio: ["pipe", "pipe", "pipe"],
            encoding: "utf-8",
            timeout: 5000
        });
        return { valid: true };
    } catch (error) {
        const err = error as { stderr?: string; message?: string };
        const errorMessage = err.stderr || err.message || "Unknown Python syntax error";
        return { valid: false, error: errorMessage };
    }
}

/**
 * Assert that generated Python code contains expected strings
 */
export function assertPythonCodeContains(
    result: ToolExecutionResult,
    expectedStrings: string[]
): void {
    assertSuccess(result);
    const code = result.data?.generatedCode as string | undefined;
    if (typeof expect !== "undefined") {
        expect(code).toBeDefined();
        for (const str of expectedStrings) {
            expect(code).toContain(str);
        }
    } else {
        if (!code) {
            throw new Error("Expected generated code but got none");
        }
        for (const str of expectedStrings) {
            if (!code.includes(str)) {
                throw new Error(`Expected code to contain "${str}"`);
            }
        }
    }
}

/**
 * Assert that generated Python code has valid syntax
 */
export function assertValidPythonSyntax(result: ToolExecutionResult): void {
    assertSuccess(result);
    const code = result.data?.generatedCode as string | undefined;
    if (typeof expect !== "undefined") {
        expect(code).toBeDefined();
    }

    if (!code) {
        throw new Error("No generated code found in result");
    }

    const validation = validatePythonSyntax(code);

    if (!validation.valid) {
        const codePreview = code.split("\n").slice(0, 20).join("\n");
        throw new Error(
            "Generated Python code has invalid syntax:\n\n" +
                `Error: ${validation.error}\n\n` +
                `Code preview (first 20 lines):\n${codePreview}`
        );
    }
}

/**
 * Combined assertion: check code contains expected strings AND has valid syntax
 */
export function assertValidPythonCodeContains(
    result: ToolExecutionResult,
    expectedStrings: string[]
): void {
    assertPythonCodeContains(result, expectedStrings);
    assertValidPythonSyntax(result);
}

// ============================================================================
// Test Suite Builder (for programmatic testing)
// ============================================================================

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
