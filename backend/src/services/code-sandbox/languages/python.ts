/**
 * Python Language Wrapper
 *
 * Wraps Python code with input injection and output capture logic.
 */

import type { CodeExecutionResult } from "../types";

/**
 * Generate Python wrapper code
 *
 * The wrapper:
 * 1. Imports common modules
 * 2. Injects input variables into global scope
 * 3. Executes user code
 * 4. Captures the `result` variable if present
 * 5. Outputs result as JSON to stdout with a marker
 */
export function wrapPythonCode(code: string, inputData?: Record<string, unknown>): string {
    const inputJson = JSON.stringify(inputData || {}).replace(/'/g, "\\'");

    return `
import json
import sys
import traceback

# FlowMaestro input injection
_fm_input = json.loads('${inputJson}')
globals().update(_fm_input)

# Execute user code
try:
    exec('''
${escapeTripleQuotes(code)}
''')

    # Capture result variable if defined
    if 'result' in dir():
        print("__FM_RESULT_START__")
        print(json.dumps(result, default=str))
        print("__FM_RESULT_END__")

except Exception as e:
    print("__FM_ERROR_START__", file=sys.stderr)
    print(json.dumps({
        "error": str(e),
        "type": type(e).__name__,
        "traceback": traceback.format_exc()
    }), file=sys.stderr)
    print("__FM_ERROR_END__", file=sys.stderr)
    sys.exit(1)
`.trim();
}

/**
 * Parse Python execution output
 */
export function parsePythonOutput(
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
            cleanStderr = `${errorData.type}: ${errorData.error}\n${errorData.traceback}`;
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
            language: "python",
            exitCode
        },
        warnings: warnings.length > 0 ? warnings : undefined
    };
}

/**
 * Get Python execution command
 */
export function getPythonCommand(): string[] {
    return ["python3", "-u", "/tmp/code.py"];
}

/**
 * Escape triple quotes in user code
 */
function escapeTripleQuotes(code: string): string {
    // Escape triple single quotes that could break our wrapper
    return code.replace(/'''/g, "\\'''");
}
