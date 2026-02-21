/**
 * Docker Container Management
 *
 * Handles lifecycle management for code execution containers:
 * - Container creation with resource limits
 * - Code execution via docker exec
 * - Container cleanup
 * - Concurrency control
 */

import { spawn, exec } from "child_process";
import { promisify } from "util";
import { createServiceLogger } from "../../core/logging";
import type { ContainerConfig, ResourceLimits, SupportedLanguage } from "./types";

const execAsync = promisify(exec);
const logger = createServiceLogger("DockerSandbox");

// Container image name
const SANDBOX_IMAGE = process.env.CODE_SANDBOX_IMAGE || "flowmaestro/code-sandbox:latest";

// Concurrency control
const MAX_CONCURRENT_EXECUTIONS = parseInt(process.env.MAX_CONCURRENT_EXECUTIONS || "10");
let currentExecutions = 0;
const executionQueue: Array<() => void> = [];

/**
 * Acquire execution slot (returns when slot is available)
 */
async function acquireExecutionSlot(): Promise<void> {
    if (currentExecutions < MAX_CONCURRENT_EXECUTIONS) {
        currentExecutions++;
        return;
    }

    // Queue and wait
    return new Promise((resolve) => {
        executionQueue.push(() => {
            currentExecutions++;
            resolve();
        });
    });
}

/**
 * Release execution slot
 */
function releaseExecutionSlot(): void {
    currentExecutions--;
    const next = executionQueue.shift();
    if (next) {
        next();
    }
}

/**
 * Generate unique container name
 */
function generateContainerName(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `fm-sandbox-${timestamp}-${random}`;
}

/**
 * Create a new sandbox container
 */
export async function createContainer(
    language: SupportedLanguage,
    limits: ResourceLimits,
    networkEnabled: boolean = false
): Promise<ContainerConfig> {
    const containerName = generateContainerName();

    const dockerArgs = [
        "create",
        "--name",
        containerName,

        // Resource limits
        "--memory",
        `${limits.memoryBytes}`,
        "--memory-swap",
        `${limits.memoryBytes}`, // No swap
        "--cpus",
        `${limits.cpuCores}`,
        "--pids-limit",
        `${limits.maxPids}`,

        // Security settings
        "--read-only",
        "--tmpfs",
        "/tmp:rw,noexec,nosuid,size=64m",
        "--security-opt",
        "no-new-privileges:true",
        "--cap-drop",
        "ALL",

        // No network by default
        ...(networkEnabled ? [] : ["--network", "none"]),

        // Working directory
        "--workdir",
        "/sandbox",

        // Container image
        SANDBOX_IMAGE
    ];

    logger.debug({ containerName, language, limits }, "Creating sandbox container");

    try {
        const { stdout, stderr } = await execAsync(`docker ${dockerArgs.join(" ")}`);

        if (stderr && !stderr.includes("WARNING")) {
            logger.warn({ stderr }, "Docker create warning");
        }

        const containerId = stdout.trim();

        // Start the container
        await execAsync(`docker start ${containerName}`);

        const containerConfig: ContainerConfig = {
            containerId: containerId || containerName,
            language,
            limits,
            networkEnabled,
            createdAt: new Date()
        };

        logger.info(
            { containerName, containerId: containerConfig.containerId },
            "Container created"
        );

        return containerConfig;
    } catch (error) {
        logger.error({ err: error, containerName }, "Failed to create container");
        throw new Error(
            `Failed to create sandbox container: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * Execute code in a container
 */
export async function executeInContainer(
    containerName: string,
    command: string[],
    input: string,
    timeoutMs: number,
    maxOutputBytes: number
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    await acquireExecutionSlot();

    try {
        return await new Promise((resolve, reject) => {
            const startTime = Date.now();

            // Build docker exec command
            const dockerExec = spawn("docker", ["exec", "-i", containerName, ...command]);

            let stdout = "";
            let stderr = "";
            let stdoutTruncated = false;
            let stderrTruncated = false;
            let exitCode = 0;
            let timedOut = false;

            // Set timeout
            const timeoutHandle = setTimeout(() => {
                timedOut = true;
                dockerExec.kill("SIGKILL");
                reject(new Error(`Execution timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            // Collect stdout with size limit
            dockerExec.stdout.on("data", (data: Buffer) => {
                if (stdout.length < maxOutputBytes) {
                    stdout += data.toString();
                    if (stdout.length > maxOutputBytes) {
                        stdout = stdout.substring(0, maxOutputBytes);
                        stdoutTruncated = true;
                    }
                }
            });

            // Collect stderr with size limit
            dockerExec.stderr.on("data", (data: Buffer) => {
                if (stderr.length < maxOutputBytes) {
                    stderr += data.toString();
                    if (stderr.length > maxOutputBytes) {
                        stderr = stderr.substring(0, maxOutputBytes);
                        stderrTruncated = true;
                    }
                }
            });

            // Handle errors
            dockerExec.on("error", (error) => {
                clearTimeout(timeoutHandle);
                reject(error);
            });

            // Handle close
            dockerExec.on("close", (code) => {
                clearTimeout(timeoutHandle);

                if (timedOut) {
                    return; // Already rejected
                }

                exitCode = code ?? 0;

                const duration = Date.now() - startTime;
                logger.debug(
                    { containerName, exitCode, duration, stdoutLength: stdout.length },
                    "Container execution completed"
                );

                // Add truncation warnings
                if (stdoutTruncated) {
                    stderr += "\n[WARNING] stdout was truncated due to size limit";
                }
                if (stderrTruncated) {
                    stderr += "\n[WARNING] stderr was truncated due to size limit";
                }

                resolve({ stdout, stderr, exitCode });
            });

            // Write input to stdin
            if (input) {
                dockerExec.stdin.write(input);
            }
            dockerExec.stdin.end();
        });
    } finally {
        releaseExecutionSlot();
    }
}

/**
 * Copy file into container
 */
export async function copyToContainer(
    containerName: string,
    localPath: string,
    containerPath: string
): Promise<void> {
    try {
        await execAsync(`docker cp "${localPath}" "${containerName}:${containerPath}"`);
        logger.debug({ containerName, localPath, containerPath }, "File copied to container");
    } catch (error) {
        logger.error({ err: error, containerName, localPath }, "Failed to copy file to container");
        throw new Error(
            `Failed to copy file to container: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * Copy file from container
 */
export async function copyFromContainer(
    containerName: string,
    containerPath: string,
    localPath: string
): Promise<void> {
    try {
        await execAsync(`docker cp "${containerName}:${containerPath}" "${localPath}"`);
        logger.debug({ containerName, containerPath, localPath }, "File copied from container");
    } catch (error) {
        logger.error(
            { err: error, containerName, containerPath },
            "Failed to copy file from container"
        );
        throw new Error(
            `Failed to copy file from container: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * Write content directly to container
 */
export async function writeToContainer(
    containerName: string,
    containerPath: string,
    content: string
): Promise<void> {
    try {
        // Use docker exec with echo/cat to write content
        const encodedContent = Buffer.from(content).toString("base64");
        await execAsync(
            `docker exec ${containerName} sh -c "echo '${encodedContent}' | base64 -d > ${containerPath}"`
        );
        logger.debug(
            { containerName, containerPath, contentLength: content.length },
            "Content written to container"
        );
    } catch (error) {
        logger.error({ err: error, containerName, containerPath }, "Failed to write to container");
        throw new Error(
            `Failed to write to container: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * Read content from container
 */
export async function readFromContainer(
    containerName: string,
    containerPath: string
): Promise<string> {
    try {
        const { stdout } = await execAsync(`docker exec ${containerName} cat "${containerPath}"`);
        return stdout;
    } catch (error) {
        logger.error({ err: error, containerName, containerPath }, "Failed to read from container");
        throw new Error(
            `Failed to read from container: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * Install additional packages in container
 */
export async function installPackages(
    containerName: string,
    language: SupportedLanguage,
    packages: string[],
    timeoutMs: number = 60000
): Promise<{ success: boolean; error?: string }> {
    if (packages.length === 0) {
        return { success: true };
    }

    // Validate package names (basic security check)
    const validPackagePattern = /^[a-zA-Z0-9_-]+([=<>][a-zA-Z0-9._-]+)?$/;
    for (const pkg of packages) {
        if (!validPackagePattern.test(pkg)) {
            return { success: false, error: `Invalid package name: ${pkg}` };
        }
    }

    try {
        let command: string[];

        switch (language) {
            case "python":
                command = ["pip", "install", "--user", "--no-cache-dir", ...packages];
                break;
            case "javascript":
                command = ["npm", "install", "--no-save", ...packages];
                break;
            default:
                return {
                    success: false,
                    error: `Package installation not supported for ${language}`
                };
        }

        logger.info({ containerName, language, packages }, "Installing packages");

        const { stderr, exitCode } = await executeInContainer(
            containerName,
            command,
            "",
            timeoutMs,
            50000 // 50KB output limit for package install
        );

        if (exitCode !== 0) {
            logger.warn({ containerName, exitCode, stderr }, "Package installation failed");
            return {
                success: false,
                error: stderr || `Package installation exited with code ${exitCode}`
            };
        }

        logger.info({ containerName, packages }, "Packages installed successfully");
        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ err: error, containerName, packages }, "Package installation error");
        return { success: false, error: errorMessage };
    }
}

/**
 * Destroy a container
 */
export async function destroyContainer(containerName: string): Promise<void> {
    try {
        // Force remove container (stops if running)
        await execAsync(`docker rm -f ${containerName} 2>/dev/null || true`);
        logger.debug({ containerName }, "Container destroyed");
    } catch (error) {
        // Ignore errors during cleanup (container may already be gone)
        logger.debug({ err: error, containerName }, "Container cleanup (may already be destroyed)");
    }
}

/**
 * Check if container exists and is running
 */
export async function isContainerRunning(containerName: string): Promise<boolean> {
    try {
        const { stdout } = await execAsync(
            `docker inspect -f '{{.State.Running}}' ${containerName} 2>/dev/null || echo "false"`
        );
        return stdout.trim() === "true";
    } catch {
        return false;
    }
}

/**
 * Get container stats
 */
export async function getContainerStats(): Promise<{
    activeContainers: number;
    queuedExecutions: number;
    maxConcurrent: number;
}> {
    return {
        activeContainers: currentExecutions,
        queuedExecutions: executionQueue.length,
        maxConcurrent: MAX_CONCURRENT_EXECUTIONS
    };
}

/**
 * Cleanup stale containers (for background job)
 */
export async function cleanupStaleContainers(maxAgeMinutes: number = 30): Promise<number> {
    try {
        // Find all flowmaestro sandbox containers
        const { stdout } = await execAsync(
            'docker ps -a --filter "name=fm-sandbox-" --format "{{.Names}}\t{{.CreatedAt}}" 2>/dev/null || echo ""'
        );

        if (!stdout.trim()) {
            return 0;
        }

        const cutoffTime = Date.now() - maxAgeMinutes * 60 * 1000;
        const lines = stdout.trim().split("\n");
        let cleanedCount = 0;

        for (const line of lines) {
            const [containerName, createdAt] = line.split("\t");
            if (!containerName || !createdAt) continue;

            const createdTime = new Date(createdAt).getTime();
            if (createdTime < cutoffTime) {
                await destroyContainer(containerName);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            logger.info({ cleanedCount }, "Cleaned up stale sandbox containers");
        }

        return cleanedCount;
    } catch (error) {
        logger.warn({ err: error }, "Error during stale container cleanup");
        return 0;
    }
}
