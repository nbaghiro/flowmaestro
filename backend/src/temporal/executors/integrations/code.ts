import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";
import * as os from "os";
import * as path from "path";
import { VM } from "vm2";
import type { JsonObject, JsonValue } from "@flowmaestro/shared";

export interface CodeNodeConfig {
    language: "javascript" | "python";
    code: string; // The code to execute
    timeout?: number; // Max execution time in ms (default: 30000)
    memory?: number; // Max memory in MB (default: 128)

    // Input/Output
    inputVariables?: string[]; // Variables to pass from context
    outputVariable?: string;

    // Security (for future enhancement)
    allowNetworkAccess?: boolean; // Default: false
    allowFileSystemAccess?: boolean; // Default: false
}

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

/**
 * Execute Code node - runs custom JavaScript or Python code in a sandboxed environment
 */
export async function executeCodeNode(
    config: CodeNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const startTime = Date.now();

    console.log(`[Code] Executing ${config.language} code`);

    let result: CodeNodeResult;

    switch (config.language) {
        case "javascript":
            result = await executeJavaScript(config, context);
            break;

        case "python":
            result = await executePython(config, context);
            break;

        default:
            throw new Error(`Unsupported language: ${config.language}`);
    }

    result.metadata = {
        ...result.metadata,
        executionTime: Date.now() - startTime
    };

    console.log(`[Code] Execution completed in ${result.metadata.executionTime}ms`);

    if (config.outputVariable) {
        return { [config.outputVariable]: result } as unknown as JsonObject;
    }

    return result as unknown as JsonObject;
}

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
                console.log("[Code/JS]", message);
            },
            error: (...args: unknown[]) => {
                const message = args
                    .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
                    .join(" ");
                logs.push(`ERROR: ${message}`);
                console.error("[Code/JS]", message);
            },
            warn: (...args: unknown[]) => {
                const message = args
                    .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
                    .join(" ");
                logs.push(`WARN: ${message}`);
                console.warn("[Code/JS]", message);
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
        console.error("[Code/JS] Execution failed:", errorMessage);
        throw new Error(`JavaScript execution failed: ${errorMessage}`);
    }
}

/**
 * Execute Python code using child process
 */
async function executePython(config: CodeNodeConfig, context: JsonObject): Promise<CodeNodeResult> {
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

        // Execute Python script
        return await new Promise((resolve, reject) => {
            const python = spawn("python3", [tempFile], {
                timeout: config.timeout || 30000
            });

            let stdout = "";
            let stderr = "";

            python.stdout.on("data", (data: Buffer) => {
                stdout += data.toString();
            });

            python.stderr.on("data", (data: Buffer) => {
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
