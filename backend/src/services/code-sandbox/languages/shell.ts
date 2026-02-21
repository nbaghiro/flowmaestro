/**
 * Shell Language Wrapper
 *
 * Wraps shell scripts with input injection via environment variables.
 */

import type { CodeExecutionResult } from "../types";

/**
 * Generate Shell wrapper script
 *
 * The wrapper:
 * 1. Sets input variables as environment variables
 * 2. Executes user script
 * 3. Captures exit code and any result output
 */
export function wrapShellCode(code: string, inputData?: Record<string, unknown>): string {
    const envVars: string[] = [];

    if (inputData) {
        for (const [key, value] of Object.entries(inputData)) {
            // Convert value to string for environment variable
            let stringValue: string;
            if (typeof value === "string") {
                stringValue = value;
            } else if (value === null || value === undefined) {
                stringValue = "";
            } else if (typeof value === "object") {
                stringValue = JSON.stringify(value);
            } else {
                stringValue = String(value);
            }

            // Escape single quotes in value
            const escapedValue = stringValue.replace(/'/g, "'\"'\"'");
            envVars.push(`export ${sanitizeVarName(key)}='${escapedValue}'`);
        }
    }

    return `#!/bin/bash
set -e

# FlowMaestro input variables
${envVars.join("\n")}

# User script starts here
${code}
`.trim();
}

/**
 * Parse Shell execution output
 */
export function parseShellOutput(
    stdout: string,
    stderr: string,
    exitCode: number,
    executionTimeMs: number
): Partial<CodeExecutionResult> {
    // For shell scripts, the result is the stdout if exit code is 0
    // Otherwise, return null and let stderr show the error

    return {
        result: exitCode === 0 ? stdout.trim() || null : null,
        stdout: stdout,
        stderr: stderr,
        metadata: {
            executionTimeMs,
            language: "shell",
            exitCode
        }
    };
}

/**
 * Get Shell execution command
 */
export function getShellCommand(): string[] {
    return ["bash", "/tmp/code.sh"];
}

/**
 * Sanitize variable name for shell
 * Shell variable names must start with letter/underscore and contain only alphanumeric/underscore
 */
function sanitizeVarName(name: string): string {
    // Replace invalid characters with underscore
    let sanitized = name.replace(/[^a-zA-Z0-9_]/g, "_");

    // Ensure it starts with letter or underscore
    if (/^[0-9]/.test(sanitized)) {
        sanitized = "_" + sanitized;
    }

    // Convert to uppercase (convention for shell env vars)
    return sanitized.toUpperCase();
}
