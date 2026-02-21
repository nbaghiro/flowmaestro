/**
 * File Read Tool
 *
 * Reads files from the execution workspace (temp directory)
 */

import { readFile, stat, access, mkdir } from "fs/promises";
import { join, resolve, normalize } from "path";
import { z } from "zod";
import { createServiceLogger } from "../../../core/logging";
import type { BuiltInTool, ToolExecutionContext, ToolExecutionResult } from "../types";

const logger = createServiceLogger("FileReadTool");

/**
 * Base workspace directory for file operations
 */
const WORKSPACE_BASE = "/tmp/fm-workspace";

/**
 * Get the workspace directory for a given execution
 * Creates it if it doesn't exist
 */
async function getWorkspaceDir(traceId?: string): Promise<string> {
    const workspaceId = traceId || "default";
    const workspaceDir = join(WORKSPACE_BASE, workspaceId);

    try {
        await mkdir(workspaceDir, { recursive: true });
    } catch {
        // Directory may already exist
    }

    return workspaceDir;
}

/**
 * Validate that a path is within the workspace (prevent path traversal)
 */
function isPathWithinWorkspace(workspaceDir: string, requestedPath: string): boolean {
    const normalizedWorkspace = resolve(workspaceDir);
    const normalizedPath = resolve(workspaceDir, requestedPath);
    return normalizedPath.startsWith(normalizedWorkspace);
}

/**
 * Input schema for file read
 */
export const fileReadInputSchema = z.object({
    path: z.string().min(1).max(500).describe("Path to the file to read (relative to workspace)"),
    encoding: z.enum(["utf-8", "base64", "binary"]).default("utf-8").describe("File encoding"),
    maxSize: z
        .number()
        .int()
        .min(1)
        .max(10000000) // 10MB max
        .default(1000000) // 1MB default
        .describe("Maximum file size in bytes")
});

export type FileReadInput = z.infer<typeof fileReadInputSchema>;

/**
 * File read result
 */
export interface FileReadOutput {
    path: string;
    content: string;
    encoding: string;
    size: number;
}

/**
 * Execute file read
 */
async function executeFileRead(
    params: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
        // Validate input
        const input = fileReadInputSchema.parse(params);

        // Get workspace directory
        const workspaceDir = await getWorkspaceDir(context.traceId);

        logger.info(
            {
                path: input.path,
                workspaceDir,
                traceId: context.traceId
            },
            "Reading file from workspace"
        );

        // Normalize the path (remove leading slashes for relative path)
        const relativePath = normalize(input.path).replace(/^[/\\]+/, "");

        // Security: Validate path doesn't escape workspace
        if (!isPathWithinWorkspace(workspaceDir, relativePath)) {
            return {
                success: false,
                error: {
                    message: "Access denied: Path escapes workspace directory",
                    code: "ACCESS_DENIED",
                    retryable: false
                },
                metadata: {
                    durationMs: Date.now() - startTime
                }
            };
        }

        // Block access to sensitive paths
        if (
            relativePath.includes("..") ||
            relativePath.startsWith("etc") ||
            relativePath.startsWith("proc")
        ) {
            return {
                success: false,
                error: {
                    message: "Access denied: Invalid file path",
                    code: "ACCESS_DENIED",
                    retryable: false
                },
                metadata: {
                    durationMs: Date.now() - startTime
                }
            };
        }

        const fullPath = join(workspaceDir, relativePath);

        // Check if file exists
        try {
            await access(fullPath);
        } catch {
            return {
                success: false,
                error: {
                    message: `File not found: ${input.path}`,
                    code: "FILE_NOT_FOUND",
                    retryable: false
                },
                metadata: {
                    durationMs: Date.now() - startTime
                }
            };
        }

        // Check file size
        const stats = await stat(fullPath);
        if (stats.size > input.maxSize) {
            return {
                success: false,
                error: {
                    message: `File too large: ${stats.size} bytes (max: ${input.maxSize} bytes)`,
                    code: "FILE_TOO_LARGE",
                    retryable: false
                },
                metadata: {
                    durationMs: Date.now() - startTime
                }
            };
        }

        // Read the file
        let content: string;
        if (input.encoding === "base64") {
            const buffer = await readFile(fullPath);
            content = buffer.toString("base64");
        } else if (input.encoding === "binary") {
            const buffer = await readFile(fullPath);
            content = buffer.toString("binary");
        } else {
            content = await readFile(fullPath, "utf-8");
        }

        const output: FileReadOutput = {
            path: input.path,
            content,
            encoding: input.encoding,
            size: stats.size
        };

        logger.info(
            {
                path: input.path,
                size: stats.size,
                traceId: context.traceId
            },
            "File read successfully"
        );

        return {
            success: true,
            data: output,
            metadata: {
                durationMs: Date.now() - startTime,
                creditCost: 0 // File reads are free
            }
        };
    } catch (error) {
        logger.error({ err: error, traceId: context.traceId }, "File read failed");

        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : "File read failed",
                retryable: false
            },
            metadata: {
                durationMs: Date.now() - startTime
            }
        };
    }
}

/**
 * File Read Tool Definition
 */
export const fileReadTool: BuiltInTool = {
    name: "file_read",
    displayName: "Read File",
    description:
        "Read a file from the execution workspace. Use this to read code files, data files, or any other files that have been created or downloaded during execution. Paths are relative to the workspace directory.",
    category: "file",
    riskLevel: "low",
    inputSchema: {
        type: "object",
        properties: {
            path: {
                type: "string",
                description: "Path to the file to read (relative to workspace)",
                minLength: 1,
                maxLength: 500
            },
            encoding: {
                type: "string",
                enum: ["utf-8", "base64", "binary"],
                description: "File encoding",
                default: "utf-8"
            },
            maxSize: {
                type: "number",
                description: "Maximum file size in bytes",
                minimum: 1,
                maximum: 10000000,
                default: 1000000
            }
        },
        required: ["path"]
    },
    zodSchema: fileReadInputSchema,
    enabledByDefault: true,
    creditCost: 0,
    tags: ["file", "read", "filesystem"],
    execute: executeFileRead
};
