/**
 * File Read Node Handler
 *
 * Reads files from the execution workspace using the file_read builtin tool.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { fileReadTool } from "../../../../../tools/builtin/file-read";
import { createActivityLogger, interpolateVariables, getExecutionContext } from "../../../../core";
import {
    FileReadNodeConfigSchema,
    validateOrThrow,
    type FileReadNodeConfig
} from "../../../../core/schemas";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";
import type { ToolExecutionContext } from "../../../../../tools/types";

const logger = createActivityLogger({ nodeType: "FileRead" });

// ============================================================================
// TYPES
// ============================================================================

export type { FileReadNodeConfig };

/**
 * Result from file read.
 */
export interface FileReadNodeResult {
    path: string;
    content: string;
    encoding: string;
    size: number;
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for FileRead node type.
 * Reads files from the execution workspace.
 */
export class FileReadNodeHandler extends BaseNodeHandler {
    readonly name = "FileReadNodeHandler";
    readonly supportedNodeTypes = ["fileRead"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const config = validateOrThrow(FileReadNodeConfigSchema, input.nodeConfig, "FileRead");
        const context = getExecutionContext(input.context);

        logger.info("Reading file", {
            encoding: config.encoding,
            maxSize: config.maxSize
        });

        // Interpolate variables in path
        const path = interpolateVariables(config.path, context);

        if (!path || typeof path !== "string") {
            throw new Error("File path is required");
        }

        // Build tool input
        const toolInput = {
            path,
            encoding: config.encoding,
            maxSize: config.maxSize
        };

        // Create tool execution context
        const toolContext: ToolExecutionContext = {
            userId: input.metadata.userId || "system",
            workspaceId: "default",
            mode: "workflow",
            traceId: input.metadata.executionId
        };

        // Execute the builtin tool
        const toolResult = await fileReadTool.execute(toolInput, toolContext);

        if (!toolResult.success) {
            throw new Error(toolResult.error?.message || "File read failed");
        }

        const result = toolResult.data as FileReadNodeResult;

        logger.info("File read successfully", {
            path: result.path,
            size: result.size,
            encoding: result.encoding
        });

        // Build output
        const outputData: JsonObject = {};
        if (config.outputVariable) {
            outputData[config.outputVariable] = result as unknown as JsonObject;
        }

        return this.success(outputData, {}, { durationMs: Date.now() - startTime });
    }
}

/**
 * Factory function for creating FileRead handler.
 */
export function createFileReadNodeHandler(): FileReadNodeHandler {
    return new FileReadNodeHandler();
}
