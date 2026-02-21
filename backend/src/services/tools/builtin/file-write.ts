/**
 * File Write Tool
 *
 * Writes files to the execution workspace (temp directory)
 */

import { writeFile, mkdir, access, stat } from "fs/promises";
import { join, resolve, normalize, dirname } from "path";
import { z } from "zod";
import { createServiceLogger } from "../../../core/logging";
import type { BuiltInTool, ToolExecutionContext, ToolExecutionResult } from "../types";

const logger = createServiceLogger("FileWriteTool");

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
 * Input schema for file write
 */
export const fileWriteInputSchema = z.object({
    path: z
        .string()
        .min(1)
        .max(500)
        .describe("Path where to write the file (relative to workspace)"),
    content: z.string().max(10000000).describe("Content to write to the file"), // 10MB max
    encoding: z.enum(["utf-8", "base64"]).default("utf-8").describe("File encoding"),
    createDirectories: z
        .boolean()
        .default(true)
        .describe("Create parent directories if they don't exist"),
    overwrite: z.boolean().default(true).describe("Overwrite file if it exists")
});

export type FileWriteInput = z.infer<typeof fileWriteInputSchema>;

/**
 * File write result
 */
export interface FileWriteOutput {
    path: string;
    fullPath: string;
    size: number;
    created: boolean;
}

/**
 * Execute file write
 */
async function executeFileWrite(
    params: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
        // Validate input
        const input = fileWriteInputSchema.parse(params);

        // Get workspace directory
        const workspaceDir = await getWorkspaceDir(context.traceId);

        logger.info(
            {
                path: input.path,
                contentLength: input.content.length,
                workspaceDir,
                traceId: context.traceId
            },
            "Writing file to workspace"
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

        // Check if file exists and overwrite is false
        let fileExists = false;
        try {
            await access(fullPath);
            fileExists = true;
        } catch {
            // File doesn't exist, which is fine
        }

        if (fileExists && !input.overwrite) {
            return {
                success: false,
                error: {
                    message: `File already exists: ${input.path}. Set overwrite: true to replace it.`,
                    code: "FILE_EXISTS",
                    retryable: false
                },
                metadata: {
                    durationMs: Date.now() - startTime
                }
            };
        }

        // Create parent directories if needed
        if (input.createDirectories) {
            const parentDir = dirname(fullPath);
            await mkdir(parentDir, { recursive: true });
        }

        // Convert content if base64 encoded
        let contentToWrite: string | Buffer;
        if (input.encoding === "base64") {
            contentToWrite = Buffer.from(input.content, "base64");
        } else {
            contentToWrite = input.content;
        }

        // Write the file
        await writeFile(fullPath, contentToWrite);

        // Get final file stats
        const stats = await stat(fullPath);

        const output: FileWriteOutput = {
            path: input.path,
            fullPath,
            size: stats.size,
            created: !fileExists
        };

        logger.info(
            {
                path: input.path,
                size: stats.size,
                created: output.created,
                traceId: context.traceId
            },
            "File written successfully"
        );

        return {
            success: true,
            data: output,
            metadata: {
                durationMs: Date.now() - startTime,
                creditCost: 0 // File writes are free within workspace
            }
        };
    } catch (error) {
        logger.error({ err: error, traceId: context.traceId }, "File write failed");

        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : "File write failed",
                retryable: false
            },
            metadata: {
                durationMs: Date.now() - startTime
            }
        };
    }
}

/**
 * File Write Tool Definition
 */
export const fileWriteTool: BuiltInTool = {
    name: "file_write",
    displayName: "Write File",
    description:
        "Write content to a file in the execution workspace. Use this to save code, data, reports, or any other files. Paths are relative to the workspace directory.",
    category: "file",
    riskLevel: "medium",
    inputSchema: {
        type: "object",
        properties: {
            path: {
                type: "string",
                description: "Path where to write the file (relative to workspace)",
                minLength: 1,
                maxLength: 500
            },
            content: {
                type: "string",
                description: "Content to write to the file",
                maxLength: 10000000
            },
            encoding: {
                type: "string",
                enum: ["utf-8", "base64"],
                description: "File encoding",
                default: "utf-8"
            },
            createDirectories: {
                type: "boolean",
                description: "Create parent directories if they don't exist",
                default: true
            },
            overwrite: {
                type: "boolean",
                description: "Overwrite file if it exists",
                default: true
            }
        },
        required: ["path", "content"]
    },
    zodSchema: fileWriteInputSchema,
    enabledByDefault: true,
    creditCost: 0,
    tags: ["file", "write", "filesystem", "save"],
    execute: executeFileWrite
};
