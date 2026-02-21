/**
 * Code Node Execution
 *
 * Complete execution logic and handler for code execution nodes.
 * Uses Docker-based code-sandbox for isolated execution of JavaScript, Python, and Shell.
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import {
    createContainer,
    executeInContainer,
    writeToContainer,
    destroyContainer,
    getLanguageConfig,
    DEFAULT_RESOURCE_LIMITS,
    type SupportedLanguage
} from "../../../../../services/code-sandbox";
import {
    CodeExecutionError,
    ValidationError,
    createActivityLogger,
    withHeartbeat,
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
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute Code node - runs custom JavaScript, Python, or Shell code in a Docker sandbox
 */
export async function executeCodeNode(config: unknown, context: JsonObject): Promise<JsonObject> {
    // Validate config with Zod schema
    const validatedConfig = validateOrThrow(CodeNodeConfigSchema, config, "Code");
    const language = validatedConfig.language as SupportedLanguage;

    return withHeartbeat("code", async (heartbeat) => {
        const startTime = Date.now();
        let containerId: string | undefined;

        try {
            heartbeat.update({ step: "initializing", language });
            logger.info("Executing code", { language });

            // Get language configuration
            const langConfig = getLanguageConfig(language);

            // Create container with resource limits
            heartbeat.update({ step: "creating_container" });
            const container = await createContainer(
                language,
                {
                    ...DEFAULT_RESOURCE_LIMITS,
                    memoryBytes: (validatedConfig.memory || 128) * 1024 * 1024,
                    timeoutMs: validatedConfig.timeout || 30000
                },
                validatedConfig.allowNetworkAccess || false
            );
            containerId = container.containerId;

            // Prepare input data from context
            const inputData: Record<string, unknown> = {};
            if (validatedConfig.inputVariables && validatedConfig.inputVariables.length > 0) {
                for (const varName of validatedConfig.inputVariables) {
                    if (varName in context) {
                        inputData[varName] = context[varName];
                    }
                }
            } else {
                // If no specific variables specified, pass entire context
                Object.assign(inputData, context);
            }

            // Wrap code with input injection and output capture
            heartbeat.update({ step: "preparing_code" });
            const wrappedCode = langConfig.wrapCode(validatedConfig.code, inputData);

            // Write code to container
            const codeFileName = `/tmp/code${langConfig.extension}`;
            await writeToContainer(containerId, codeFileName, wrappedCode);

            // Execute code in container
            heartbeat.update({ step: `executing_${language}` });
            const execResult = await executeInContainer(
                containerId,
                langConfig.getCommand(),
                "",
                validatedConfig.timeout || 30000,
                DEFAULT_RESOURCE_LIMITS.maxOutputBytes
            );

            // Parse output
            heartbeat.update({ step: "parsing_output" });
            const executionTime = Date.now() - startTime;
            const parsed = langConfig.parseOutput(
                execResult.stdout,
                execResult.stderr,
                execResult.exitCode,
                executionTime
            );

            // Build result
            const result: CodeNodeResult = {
                language,
                output: parsed.result as JsonValue,
                stdout: parsed.stdout,
                stderr: parsed.stderr,
                metadata: {
                    executionTime,
                    exitCode: execResult.exitCode
                }
            };

            // Check for execution errors
            if (execResult.exitCode !== 0) {
                logger.warn("Code execution returned non-zero exit code", {
                    language,
                    exitCode: execResult.exitCode,
                    stderr: parsed.stderr
                });
                throw new CodeExecutionError(
                    parsed.stderr || `Code execution failed with exit code ${execResult.exitCode}`,
                    language
                );
            }

            heartbeat.update({ step: "completed", percentComplete: 100 });
            logger.info("Code execution completed", { executionTime });

            if (validatedConfig.outputVariable) {
                return { [validatedConfig.outputVariable]: result } as unknown as JsonObject;
            }

            return result as unknown as JsonObject;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error("Code execution failed", new Error(errorMessage), { language });

            if (error instanceof CodeExecutionError || error instanceof ValidationError) {
                throw error;
            }

            throw new CodeExecutionError(errorMessage, language);
        } finally {
            // Always cleanup container
            if (containerId) {
                destroyContainer(containerId).catch((err) => {
                    logger.warn("Failed to cleanup container", { err, containerId });
                });
            }
        }
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
