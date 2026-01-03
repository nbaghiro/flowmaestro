/**
 * Code Node Execution
 *
 * Complete execution logic and handler for code execution nodes.
 * Supports JavaScript (VM2 sandbox) and Python (child process).
 */

import { spawn, ChildProcess } from "child_process";
import { writeFile, unlink } from "fs/promises";
import * as os from "os";
import * as path from "path";
import { VM } from "vm2";
import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { CodeExecutionError, ValidationError, createActivityLogger } from "../../../../core";
import {
    withHeartbeat,
    getCancellationSignal,
    type HeartbeatOperations,
    CodeNodeConfigSchema,
    validateOrThrow,
    type CodeNodeConfig,
    getExecutionContext
} from "../../../../core";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";

const logger = createActivityLogger({ nodeType: "Code" });

// ============================================================================
// TYPES
// ============================================================================

export type { CodeNodeConfig };

export interface CodeNodeResult {
    language: string;
    output: JsonValue; // Return value from code
    stdout?: string; // Console output
    stderr?: string; // Error output
    logs?: string[]; // Collected logs

    metadata?: {
        executionTime: number;
        memoryUsed?: number;
        exitCode?: number;
    };
}

// ============================================================================
// JAVASCRIPT EXECUTION
// ============================================================================

/**
 * Execute JavaScript code using VM2 sandbox
 */
async function executeJavaScript(
    config: CodeNodeConfig,
    context: JsonObject
): Promise<CodeNodeResult> {
    const logs: string[] = [];

    // Create sandbox with input variables and safe console
    // Note: sandbox can contain functions (console methods) which aren't JsonValue
    const sandbox: Record<string, unknown> = {
        console: {
            log: (...args: unknown[]) => {
                const message = args
                    .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
                    .join(" ");
                logs.push(message);
                logger.debug("JS code output", { output: message });
            },
            error: (...args: unknown[]) => {
                const message = args
                    .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
                    .join(" ");
                logs.push(`ERROR: ${message}`);
                logger.warn("JS code error output", { output: message });
            },
            warn: (...args: unknown[]) => {
                const message = args
                    .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
                    .join(" ");
                logs.push(`WARN: ${message}`);
                logger.warn("JS code warning output", { output: message });
            }
        }
    };

    // Add input variables to sandbox
    if (config.inputVariables) {
        for (const varName of config.inputVariables) {
            if (varName in context) {
                sandbox[varName] = context[varName];
            }
        }
    } else {
        // If no specific variables specified, pass entire context
        Object.assign(sandbox, context);
    }

    try {
        const vm = new VM({
            timeout: config.timeout || 30000,
            sandbox,
            eval: false,
            wasm: false,
            fixAsync: true
        });

        // Wrap code to handle both sync and async
        const wrappedCode = `
(async () => {
    ${config.code}
})()
        `;

        const output = await vm.run(wrappedCode);

        return {
            language: "javascript",
            output,
            logs,
            metadata: {
                executionTime: 0 // Will be set by caller
            }
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("JS execution failed", new Error(errorMessage), { language: "javascript" });
        throw new CodeExecutionError(errorMessage, "javascript");
    }
}

// ============================================================================
// PYTHON EXECUTION
// ============================================================================

/**
 * Execute Python code using child process
 */
async function executePython(
    config: CodeNodeConfig,
    context: JsonObject,
    heartbeat: HeartbeatOperations
): Promise<CodeNodeResult> {
    // Create temporary file for Python code
    const tempDir = os.tmpdir();
    const tempFile = path.join(
        tempDir,
        `flowmaestro-${Date.now()}-${Math.random().toString(36).substring(7)}.py`
    );

    try {
        // Prepare input variables as JSON
        const inputVars: JsonObject = {};
        if (config.inputVariables) {
            for (const varName of config.inputVariables) {
                if (varName in context) {
                    inputVars[varName] = context[varName];
                }
            }
        } else {
            Object.assign(inputVars, context);
        }

        // Wrap user code with input/output handling
        const wrappedCode = `
import json
import sys

# Load input variables
_flowmaestro_input = json.loads('''${JSON.stringify(inputVars).replace(/'/g, "\\'")}''')

# Make variables available in global scope
globals().update(_flowmaestro_input)

# User code starts here
${config.code}

# If there's a result variable, output it
if 'result' in globals():
    print("__FLOWMAESTRO_OUTPUT__")
    print(json.dumps(result))
`;

        await writeFile(tempFile, wrappedCode, "utf-8");

        heartbeat.update({ step: "running_python_process" });

        // Execute Python script
        return await new Promise((resolve, reject) => {
            const python: ChildProcess = spawn("python3", [tempFile], {
                timeout: config.timeout || 30000
            });

            // Connect cancellation signal from Temporal
            const temporalSignal = getCancellationSignal();
            if (temporalSignal) {
                temporalSignal.addEventListener("abort", () => {
                    python.kill("SIGTERM");
                    reject(new Error("Python execution cancelled"));
                });
            }

            let stdout = "";
            let stderr = "";

            python.stdout?.on("data", (data: Buffer) => {
                stdout += data.toString();
            });

            python.stderr?.on("data", (data: Buffer) => {
                stderr += data.toString();
            });

            python.on("error", (error: Error) => {
                unlink(tempFile).catch(() => {});
                reject(new Error(`Failed to execute Python: ${error.message}`));
            });

            python.on("close", async (code: number | null) => {
                // Clean up temp file
                await unlink(tempFile).catch(() => {});

                if (code === 0) {
                    // Extract output if present
                    let output: JsonValue = null;
                    const outputMarker = "__FLOWMAESTRO_OUTPUT__";
                    const markerIndex = stdout.indexOf(outputMarker);

                    if (markerIndex !== -1) {
                        const outputJson = stdout
                            .substring(markerIndex + outputMarker.length)
                            .trim();
                        const consoleOutput = stdout.substring(0, markerIndex).trim();

                        try {
                            output = JSON.parse(outputJson);
                        } catch (_e) {
                            // If JSON parsing fails, return the raw output
                            output = outputJson;
                        }

                        resolve({
                            language: "python",
                            output,
                            stdout: consoleOutput,
                            stderr: stderr.trim(),
                            metadata: {
                                executionTime: 0,
                                exitCode: code
                            }
                        });
                    } else {
                        // No explicit result, return stdout
                        resolve({
                            language: "python",
                            output: stdout.trim(),
                            stdout: stdout.trim(),
                            stderr: stderr.trim(),
                            metadata: {
                                executionTime: 0,
                                exitCode: code
                            }
                        });
                    }
                } else {
                    reject(
                        new Error(`Python execution failed with code ${code}: ${stderr || stdout}`)
                    );
                }
            });
        });
    } catch (error: unknown) {
        // Ensure cleanup on error
        await unlink(tempFile).catch(() => {});
        throw error;
    }
}

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute Code node - runs custom JavaScript or Python code in a sandboxed environment
 */
export async function executeCodeNode(config: unknown, context: JsonObject): Promise<JsonObject> {
    // Validate config with Zod schema
    const validatedConfig = validateOrThrow(CodeNodeConfigSchema, config, "Code");

    return withHeartbeat("code", async (heartbeat) => {
        const startTime = Date.now();

        heartbeat.update({ step: "initializing", language: validatedConfig.language });
        logger.info("Executing code", { language: validatedConfig.language });

        let result: CodeNodeResult;

        switch (validatedConfig.language) {
            case "javascript":
                heartbeat.update({ step: "executing_javascript" });
                result = await executeJavaScript(validatedConfig, context);
                break;

            case "python":
                heartbeat.update({ step: "executing_python" });
                result = await executePython(validatedConfig, context, heartbeat);
                break;

            default:
                throw new ValidationError(
                    `Unsupported language: ${validatedConfig.language}`,
                    "language"
                );
        }

        result.metadata = {
            ...result.metadata,
            executionTime: Date.now() - startTime
        };

        heartbeat.update({ step: "completed", percentComplete: 100 });
        logger.info("Code execution completed", { executionTime: result.metadata.executionTime });

        if (validatedConfig.outputVariable) {
            return { [validatedConfig.outputVariable]: result } as unknown as JsonObject;
        }

        return result as unknown as JsonObject;
    });
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for Code node type.
 */
export class CodeNodeHandler extends BaseNodeHandler {
    readonly name = "CodeNodeHandler";
    readonly supportedNodeTypes = ["code"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const context = getExecutionContext(input.context);

        const result = await executeCodeNode(input.nodeConfig, context);

        return this.success(
            result,
            {},
            {
                durationMs: Date.now() - startTime
            }
        );
    }
}

/**
 * Factory function for creating Code handler.
 */
export function createCodeNodeHandler(): CodeNodeHandler {
    return new CodeNodeHandler();
}
