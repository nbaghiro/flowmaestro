/**
 * Code Execution Activity
 *
 * Temporal activity that executes code in Docker sandbox containers.
 * Supports Python, JavaScript, and Shell with optional session persistence.
 */

import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { createServiceLogger } from "../../core/logging";
import {
    createContainer,
    executeInContainer,
    writeToContainer,
    copyFromContainer,
    installPackages,
    destroyContainer,
    getLanguageConfig,
    createSession,
    getSessionForUser,
    touchSession,
    deleteSession,
    isSessionActive,
    DEFAULT_RESOURCE_LIMITS,
    type CodeExecutionResult,
    type SupportedLanguage,
    type ResourceLimits
} from "../../services/code-sandbox";
import { withHeartbeat, getCancellationSignal } from "../core";

const logger = createServiceLogger("CodeExecutionActivity");

/**
 * Activity input type
 */
export interface ExecuteCodeInput {
    /** Code to execute */
    code: string;

    /** Programming language */
    language: SupportedLanguage;

    /** Timeout in milliseconds */
    timeout: number;

    /** Input data to pass to the code */
    inputData?: Record<string, unknown>;

    /** Additional packages to install */
    packages?: string[];

    /** Session ID for persistent state */
    sessionId?: string;

    /** User ID for session ownership */
    userId: string;

    /** Workspace ID for file operations */
    workspaceId: string;

    /** Trace ID for logging */
    traceId?: string;

    /** Input files to read from workspace */
    inputFiles?: Array<{
        path: string;
        variableName: string;
    }>;

    /** Output files to save to workspace */
    outputFiles?: Array<{
        sandboxPath: string;
        workspacePath: string;
    }>;

    /** Resource limits (optional, uses defaults) */
    resourceLimits?: Partial<ResourceLimits>;

    /** Allow network access (default: false) */
    networkEnabled?: boolean;
}

/**
 * Execute code in a Docker sandbox
 *
 * This activity:
 * 1. Creates or reuses a session container
 * 2. Wraps code with input injection and output capture
 * 3. Executes code in the container
 * 4. Parses output and returns structured result
 * 5. Handles sessions for stateful execution
 */
export async function executeCode(input: ExecuteCodeInput): Promise<CodeExecutionResult> {
    const {
        code,
        language,
        timeout,
        inputData,
        packages,
        sessionId,
        userId,
        workspaceId,
        traceId,
        inputFiles,
        outputFiles,
        resourceLimits,
        networkEnabled = false
    } = input;

    logger.info(
        { language, timeout, sessionId, hasInputData: !!inputData, traceId },
        "Starting code execution"
    );

    return withHeartbeat("code-execution", async (heartbeat) => {
        const startTime = Date.now();
        let containerName: string | undefined;
        let isNewContainer = false;
        const warnings: string[] = [];

        try {
            heartbeat.update({ step: "initializing", language });

            // Get language configuration
            const langConfig = getLanguageConfig(language);

            // Merge resource limits with defaults
            const limits: ResourceLimits = {
                ...DEFAULT_RESOURCE_LIMITS,
                ...resourceLimits,
                timeoutMs: timeout
            };

            // Check for existing session
            if (sessionId) {
                heartbeat.update({ step: "checking_session" });

                const session = getSessionForUser(sessionId, userId);
                if (session) {
                    // Verify session language matches
                    if (session.language !== language) {
                        throw new Error(
                            `Session language mismatch: session is ${session.language}, requested ${language}`
                        );
                    }

                    // Verify container is still running
                    if (await isSessionActive(sessionId)) {
                        containerName = session.containerId;
                        touchSession(sessionId);
                        logger.debug(
                            { sessionId, containerName },
                            "Reusing existing session container"
                        );
                    } else {
                        // Session container died, delete session
                        await deleteSession(sessionId);
                        warnings.push(
                            "Previous session container was not running, created new one"
                        );
                    }
                }
            }

            // Create new container if needed
            if (!containerName) {
                heartbeat.update({ step: "creating_container" });

                const containerConfig = await createContainer(language, limits, networkEnabled);

                containerName = containerConfig.containerId;
                isNewContainer = true;

                // Register session if sessionId provided
                if (sessionId) {
                    createSession(sessionId, containerName, language, userId);
                }

                logger.debug({ containerName, isNewContainer }, "Container ready");
            }

            // Install additional packages if requested
            if (packages && packages.length > 0) {
                heartbeat.update({ step: "installing_packages", packages });

                const installResult = await installPackages(
                    containerName,
                    language,
                    packages,
                    Math.min(60000, timeout) // Max 60s for package install
                );

                if (!installResult.success) {
                    throw new Error(`Failed to install packages: ${installResult.error}`);
                }
            }

            // Read input files if specified
            const enrichedInputData = { ...inputData };
            if (inputFiles && inputFiles.length > 0) {
                heartbeat.update({ step: "reading_input_files" });

                for (const inputFile of inputFiles) {
                    try {
                        const workspacePath = getWorkspaceFilePath(workspaceId, inputFile.path);
                        const content = await fs.readFile(workspacePath, "utf-8");

                        // Try to parse as JSON, otherwise use raw string
                        try {
                            enrichedInputData[inputFile.variableName] = JSON.parse(content);
                        } catch {
                            enrichedInputData[inputFile.variableName] = content;
                        }
                    } catch (error) {
                        warnings.push(
                            `Failed to read input file ${inputFile.path}: ${error instanceof Error ? error.message : String(error)}`
                        );
                    }
                }
            }

            // Wrap code with input injection and output capture
            heartbeat.update({ step: "preparing_code" });
            const wrappedCode = langConfig.wrapCode(code, enrichedInputData);

            // Write code to container
            const codeFileName = `/tmp/code${langConfig.extension}`;
            await writeToContainer(containerName, codeFileName, wrappedCode);

            // Execute code
            heartbeat.update({ step: "executing", language });

            // Set up cancellation handling
            const cancellationSignal = getCancellationSignal();
            let wasCancelled = false;

            if (cancellationSignal) {
                cancellationSignal.addEventListener("abort", () => {
                    wasCancelled = true;
                    logger.info({ containerName, sessionId }, "Execution cancelled");

                    // If new container (not session), destroy it
                    if (isNewContainer && !sessionId && containerName) {
                        destroyContainer(containerName).catch((err) => {
                            logger.warn(
                                { err, containerName },
                                "Error destroying cancelled container"
                            );
                        });
                    }
                });
            }

            // Execute in container
            const execResult = await executeInContainer(
                containerName,
                langConfig.getCommand(),
                "", // No stdin input (variables passed via code wrapper)
                limits.timeoutMs,
                limits.maxOutputBytes
            );

            if (wasCancelled) {
                throw new Error("Execution was cancelled");
            }

            // Parse output
            heartbeat.update({ step: "parsing_output" });
            const executionTimeMs = Date.now() - startTime;

            const parsedResult = langConfig.parseOutput(
                execResult.stdout,
                execResult.stderr,
                execResult.exitCode,
                executionTimeMs
            );

            // Save output files if specified
            const savedFiles: Array<{ workspacePath: string; size: number }> = [];
            if (outputFiles && outputFiles.length > 0 && execResult.exitCode === 0) {
                heartbeat.update({ step: "saving_output_files" });

                for (const outputFile of outputFiles) {
                    try {
                        const localPath = getWorkspaceFilePath(
                            workspaceId,
                            outputFile.workspacePath
                        );

                        // Ensure directory exists
                        await fs.mkdir(path.dirname(localPath), { recursive: true });

                        // Copy from container
                        await copyFromContainer(containerName, outputFile.sandboxPath, localPath);

                        // Get file size
                        const stats = await fs.stat(localPath);
                        savedFiles.push({
                            workspacePath: outputFile.workspacePath,
                            size: stats.size
                        });
                    } catch (error) {
                        warnings.push(
                            `Failed to save output file ${outputFile.sandboxPath}: ${error instanceof Error ? error.message : String(error)}`
                        );
                    }
                }
            }

            // Cleanup container if not using sessions
            if (!sessionId && containerName) {
                heartbeat.update({ step: "cleanup" });
                destroyContainer(containerName).catch((err) => {
                    logger.warn({ err, containerName }, "Error during container cleanup");
                });
            }

            heartbeat.update({ step: "completed", percentComplete: 100 });

            const result: CodeExecutionResult = {
                result: parsedResult.result ?? null,
                stdout: parsedResult.stdout || "",
                stderr: parsedResult.stderr || "",
                metadata: {
                    executionTimeMs,
                    language,
                    exitCode: execResult.exitCode,
                    sandboxId: containerName,
                    sessionId
                },
                savedFiles: savedFiles.length > 0 ? savedFiles : undefined,
                warnings:
                    [...warnings, ...(parsedResult.warnings || [])].length > 0
                        ? [...warnings, ...(parsedResult.warnings || [])]
                        : undefined
            };

            logger.info(
                {
                    language,
                    executionTimeMs,
                    exitCode: execResult.exitCode,
                    hasResult: result.result !== null,
                    sessionId,
                    traceId
                },
                "Code execution completed"
            );

            return result;
        } catch (error) {
            const executionTimeMs = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            logger.error(
                { err: error, language, sessionId, containerName, traceId },
                "Code execution failed"
            );

            // Cleanup container on error if not using sessions
            if (!sessionId && containerName && isNewContainer) {
                destroyContainer(containerName).catch((err) => {
                    logger.warn({ err, containerName }, "Error during error cleanup");
                });
            }

            // Return error result instead of throwing (tool expects result format)
            return {
                result: null,
                stdout: "",
                stderr: errorMessage,
                metadata: {
                    executionTimeMs,
                    language,
                    exitCode: 1,
                    sandboxId: containerName,
                    sessionId
                },
                warnings: warnings.length > 0 ? warnings : undefined
            };
        }
    });
}

/**
 * End a code execution session
 *
 * Destroys the container and cleans up session state.
 */
export async function endCodeSession(sessionId: string, userId: string): Promise<void> {
    const session = getSessionForUser(sessionId, userId);
    if (!session) {
        logger.debug({ sessionId, userId }, "Session not found or not owned by user");
        return;
    }

    await deleteSession(sessionId);
    logger.info({ sessionId, userId }, "Session ended");
}

/**
 * Get workspace file path
 */
function getWorkspaceFilePath(workspaceId: string, relativePath: string): string {
    // Workspace files are stored in /tmp/fm-workspace/<workspaceId>/<path>
    const baseDir = path.join(os.tmpdir(), "fm-workspace", workspaceId);

    // Ensure path doesn't escape workspace directory
    const normalizedPath = path.normalize(relativePath).replace(/^(\.\.\/|\.\.\\)+/, "");
    const fullPath = path.join(baseDir, normalizedPath);

    if (!fullPath.startsWith(baseDir)) {
        throw new Error("Path traversal attempt detected");
    }

    return fullPath;
}
