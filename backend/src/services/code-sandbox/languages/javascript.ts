/**
 * JavaScript Language Wrapper
 *
 * Wraps JavaScript code with input injection and output capture logic.
 */

import type { CodeExecutionResult } from "../types";

/**
 * Generate JavaScript wrapper code
 *
 * The wrapper:
 * 1. Injects input variables into global scope
 * 2. Provides common utility functions
 * 3. Executes user code (supports async/await)
 * 4. Captures the `result` variable if present
 * 5. Outputs result as JSON to stdout with a marker
 */
export function wrapJavaScriptCode(code: string, inputData?: Record<string, unknown>): string {
    const inputJson = JSON.stringify(inputData || {});

    return `
const __fmInput = ${inputJson};

// Inject input variables into global scope
Object.assign(globalThis, __fmInput);

// Async wrapper to support await in user code
(async () => {
    try {
        // User code starts here
        ${code}

        // Capture result if defined
        if (typeof result !== 'undefined') {
            console.log("__FM_RESULT_START__");
            console.log(JSON.stringify(result, (key, value) => {
                // Handle BigInt serialization
                if (typeof value === 'bigint') {
                    return value.toString();
                }
                // Handle circular references
                if (typeof value === 'object' && value !== null) {
                    if (value instanceof Error) {
                        return { message: value.message, name: value.name, stack: value.stack };
                    }
                    if (value instanceof Date) {
                        return value.toISOString();
                    }
                    if (value instanceof Map) {
                        return Object.fromEntries(value);
                    }
                    if (value instanceof Set) {
                        return Array.from(value);
                    }
                }
                return value;
            }));
            console.log("__FM_RESULT_END__");
        }
    } catch (error) {
        console.error("__FM_ERROR_START__");
        console.error(JSON.stringify({
            error: error.message || String(error),
            type: error.name || 'Error',
            stack: error.stack
        }));
        console.error("__FM_ERROR_END__");
        process.exit(1);
    }
})();
`.trim();
}

/**
 * Parse JavaScript execution output
 */
export function parseJavaScriptOutput(
    stdout: string,
    stderr: string,
    exitCode: number,
    executionTimeMs: number
): Partial<CodeExecutionResult> {
    let result: unknown = null;
    let cleanStdout = stdout;
    const warnings: string[] = [];

    // Extract result if present
    const resultStartMarker = "__FM_RESULT_START__";
    const resultEndMarker = "__FM_RESULT_END__";
    const resultStartIndex = stdout.indexOf(resultStartMarker);
    const resultEndIndex = stdout.indexOf(resultEndMarker);

    if (resultStartIndex !== -1 && resultEndIndex !== -1) {
        const resultJson = stdout
            .substring(resultStartIndex + resultStartMarker.length, resultEndIndex)
            .trim();

        try {
            result = JSON.parse(resultJson);
        } catch {
            // If JSON parsing fails, use raw string
            result = resultJson;
            warnings.push("Failed to parse result as JSON, returning as string");
        }

        // Remove result markers from stdout
        cleanStdout = (
            stdout.substring(0, resultStartIndex) +
            stdout.substring(resultEndIndex + resultEndMarker.length)
        ).trim();
    }

    // Extract error details if present
    const errorStartMarker = "__FM_ERROR_START__";
    const errorEndMarker = "__FM_ERROR_END__";
    const errorStartIndex = stderr.indexOf(errorStartMarker);
    const errorEndIndex = stderr.indexOf(errorEndMarker);

    let cleanStderr = stderr;
    if (errorStartIndex !== -1 && errorEndIndex !== -1) {
        const errorJson = stderr
            .substring(errorStartIndex + errorStartMarker.length, errorEndIndex)
            .trim();

        try {
            const errorData = JSON.parse(errorJson);
            // Replace stderr with formatted error
            cleanStderr = `${errorData.type}: ${errorData.error}\n${errorData.stack || ""}`;
        } catch {
            // Keep original stderr
        }
    }

    return {
        result,
        stdout: cleanStdout,
        stderr: cleanStderr,
        metadata: {
            executionTimeMs,
            language: "javascript",
            exitCode
        },
        warnings: warnings.length > 0 ? warnings : undefined
    };
}

/**
 * Get JavaScript execution command
 */
export function getJavaScriptCommand(): string[] {
    return ["node", "/tmp/code.js"];
}
