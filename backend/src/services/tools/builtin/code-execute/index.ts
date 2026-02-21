/**
 * Code Execute Tool
 *
 * Execute Python, JavaScript, or shell code in isolated Docker sandbox containers.
 * Supports stateful sessions for multi-call computations.
 *
 * Security:
 * - Code is executed in isolated Docker containers
 * - Resource limits (CPU, memory, time, PIDs) are enforced
 * - Dangerous patterns are blocked before execution
 * - Network access is disabled by default
 *
 * Usage:
 * - For Python, assign your output to the `result` variable
 * - For JavaScript, assign your output to the `result` variable
 * - For shell, stdout is captured as the result
 */

import { createServiceLogger } from "../../../../core/logging";
import { analyzeCodeSecurity, sanitizeCode, validatePackageNames } from "./security";
import { codeExecuteInputSchema, codeExecuteJsonSchema, type CodeExecuteOutput } from "./types";
import type { ExecuteCodeInput } from "../../../../temporal/activities/code-execution";
import type { BuiltInTool, ToolExecutionContext, ToolExecutionResult } from "../../types";

const logger = createServiceLogger("CodeExecuteTool");

// Credit cost for code execution
const CODE_EXECUTE_CREDIT_COST = 5;

/**
 * Execute code in a sandboxed environment
 */
async function executeCodeExecute(
    params: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
        // Validate input
        const input = codeExecuteInputSchema.parse(params);

        logger.info(
            {
                language: input.language,
                codeLength: input.code.length,
                timeout: input.timeout,
                sessionId: input.sessionId,
                traceId: context.traceId
            },
            "Executing code"
        );

        // Sanitize code
        const sanitizedCode = sanitizeCode(input.code);

        // Security analysis
        const securityResult = analyzeCodeSecurity(sanitizedCode, input.language);

        if (securityResult.blocked) {
            logger.warn(
                {
                    language: input.language,
                    blockedPatterns: securityResult.blockedPatterns,
                    traceId: context.traceId
                },
                "Code execution blocked for security reasons"
            );

            return {
                success: false,
                error: {
                    message: `Code execution blocked: ${securityResult.summary}`,
                    code: "SECURITY_BLOCKED",
                    retryable: false
                },
                metadata: {
                    durationMs: Date.now() - startTime
                }
            };
        }

        // Validate packages if provided
        if (input.packages && input.packages.length > 0) {
            const { invalid } = validatePackageNames(input.packages);
            if (invalid.length > 0) {
                return {
                    success: false,
                    error: {
                        message: `Invalid package names: ${invalid.join(", ")}`,
                        code: "INVALID_PACKAGES",
                        retryable: false
                    },
                    metadata: {
                        durationMs: Date.now() - startTime
                    }
                };
            }
        }

        // Build activity input
        const activityInput: ExecuteCodeInput = {
            code: sanitizedCode,
            language: input.language,
            timeout: input.timeout,
            inputData: input.inputData,
            packages: input.packages,
            sessionId: input.sessionId,
            userId: context.userId,
            workspaceId: context.workspaceId,
            traceId: context.traceId,
            inputFiles: input.inputFiles,
            outputFiles: input.outputFiles
        };

        // Execute via Temporal activity
        // Note: This tool is called from within an agent/persona workflow context,
        // so we use a direct import rather than proxyActivities
        const { executeCode } = await import("../../../../temporal/activities/code-execution");
        const result = await executeCode(activityInput);

        // Check if execution failed
        if (result.metadata.exitCode !== 0 && result.metadata.exitCode !== undefined) {
            // Non-zero exit code indicates error, but still return as "success" with error in data
            // This allows the LLM to see the error and potentially fix the code
            logger.info(
                {
                    language: input.language,
                    exitCode: result.metadata.exitCode,
                    executionTimeMs: result.metadata.executionTimeMs,
                    traceId: context.traceId
                },
                "Code execution completed with errors"
            );
        } else {
            logger.info(
                {
                    language: input.language,
                    executionTimeMs: result.metadata.executionTimeMs,
                    hasResult: result.result !== null,
                    sessionId: result.metadata.sessionId,
                    traceId: context.traceId
                },
                "Code execution completed successfully"
            );
        }

        // Build output
        const output: CodeExecuteOutput = {
            result: result.result,
            stdout: result.stdout,
            stderr: result.stderr,
            metadata: result.metadata,
            savedFiles: result.savedFiles,
            warnings:
                [
                    ...(result.warnings || []),
                    ...(securityResult.warningPatterns.length > 0
                        ? securityResult.warningPatterns.map((p) => p.description)
                        : [])
                ].length > 0
                    ? [
                          ...(result.warnings || []),
                          ...securityResult.warningPatterns.map((p) => p.description)
                      ]
                    : undefined
        };

        return {
            success: true,
            data: output,
            metadata: {
                durationMs: Date.now() - startTime,
                creditCost: CODE_EXECUTE_CREDIT_COST
            }
        };
    } catch (error) {
        logger.error({ err: error, traceId: context.traceId }, "Code execution failed");

        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Code execution failed",
                retryable: false
            },
            metadata: {
                durationMs: Date.now() - startTime
            }
        };
    }
}

/**
 * Code Execute Tool Definition
 */
export const codeExecuteTool: BuiltInTool = {
    name: "code_execute",
    displayName: "Code Execute",
    description: `Execute Python, JavaScript, or shell code in a secure sandbox environment.

Use this tool to:
- Perform calculations and data processing
- Transform and analyze data
- Generate files (CSV, JSON, etc.)
- Run algorithms and computations

For Python: Assign your output to the 'result' variable.
For JavaScript: Assign your output to the 'result' variable.
For shell: The stdout output becomes the result.

Example (Python):
\`\`\`python
import pandas as pd
data = [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]
df = pd.DataFrame(data)
result = df.to_dict(orient="records")
\`\`\`

Example (JavaScript):
\`\`\`javascript
const data = [1, 2, 3, 4, 5];
const sum = data.reduce((a, b) => a + b, 0);
const result = { sum, average: sum / data.length };
\`\`\`

Use sessionId to maintain state across multiple calls for multi-step computations.`,

    category: "code",
    riskLevel: "high",

    inputSchema: codeExecuteJsonSchema,
    zodSchema: codeExecuteInputSchema,

    enabledByDefault: true,
    creditCost: CODE_EXECUTE_CREDIT_COST,

    tags: ["code", "python", "javascript", "shell", "computation", "data"],

    execute: executeCodeExecute
};

// Re-export types
export type { CodeExecuteInput, CodeExecuteOutput } from "./types";
export { codeExecuteInputSchema, codeExecuteJsonSchema } from "./types";
