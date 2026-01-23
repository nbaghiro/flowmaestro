/**
 * Test Helpers for Built-in Tools
 *
 * Shared utilities for testing built-in tool implementations
 */

import { execSync } from "child_process";
import type { ToolExecutionContext, ToolExecutionResult, BuiltInTool } from "../../types";

/**
 * Create a mock tool execution context
 */
export function createMockContext(overrides?: Partial<ToolExecutionContext>): ToolExecutionContext {
    return {
        userId: "test-user-123",
        workspaceId: "test-workspace-456",
        mode: "agent",
        traceId: "test-trace-abc",
        ...overrides
    };
}

/**
 * Assert that a tool result is successful
 */
export function assertSuccess(
    result: ToolExecutionResult
): asserts result is ToolExecutionResult & {
    success: true;
    data: Record<string, unknown>;
} {
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.error).toBeUndefined();
}

/**
 * Assert that a tool result is an error
 */
export function assertError(
    result: ToolExecutionResult,
    expectedCode?: string
): asserts result is ToolExecutionResult & {
    success: false;
    error: { message: string; code?: string };
} {
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toBeTruthy();
    if (expectedCode) {
        expect(result.error?.code).toBe(expectedCode);
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
    expect(tool.name).toBe(expected.name);
    expect(tool.category).toBe(expected.category);
    expect(tool.riskLevel).toBe(expected.riskLevel);
    expect(tool.displayName).toBeTruthy();
    expect(tool.description).toBeTruthy();
    expect(tool.inputSchema).toBeDefined();
    expect(tool.zodSchema).toBeDefined();
    expect(tool.execute).toBeInstanceOf(Function);
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
    expect(code).toBeDefined();
    for (const str of expectedStrings) {
        expect(code).toContain(str);
    }
}

/**
 * Assert that result includes metadata with duration
 */
export function assertHasMetadata(result: ToolExecutionResult): void {
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(0);
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

/**
 * Check if Python is available for syntax validation tests
 * Caches the result after first check
 */
let pythonAvailable: boolean | null = null;
let pythonVersion: string | null = null;

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
    isPythonAvailable(); // Ensure check has run
    return pythonVersion;
}

/**
 * Require Python to be available - throws if not
 * Use this in beforeAll() hooks to fail fast
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
 * Throws if Python is not available
 */
export function validatePythonSyntax(
    code: string
): { valid: true } | { valid: false; error: string } {
    requirePython();

    try {
        // Use Python's ast.parse to validate syntax
        // We pass the code via stdin to avoid shell escaping issues
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
 * Assert that generated Python code has valid syntax
 */
export function assertValidPythonSyntax(result: ToolExecutionResult): void {
    assertSuccess(result);
    const code = result.data?.generatedCode as string | undefined;
    expect(code).toBeDefined();

    if (!code) {
        throw new Error("No generated code found in result");
    }

    const validation = validatePythonSyntax(code);

    if (!validation.valid) {
        // Include helpful debugging info in the error message
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
    // First check for expected strings
    assertPythonCodeContains(result, expectedStrings);

    // Then validate syntax
    assertValidPythonSyntax(result);
}
