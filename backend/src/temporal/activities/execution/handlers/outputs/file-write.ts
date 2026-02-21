/**
 * File Write Node Handler
 *
 * Writes files to the execution workspace using the file_write builtin tool.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { fileWriteTool } from "../../../../../services/tools/builtin/file-write";
import { createActivityLogger, interpolateVariables, getExecutionContext } from "../../../../core";
import {
    FileWriteNodeConfigSchema,
    validateOrThrow,
    type FileWriteNodeConfig
} from "../../../../core/schemas";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";
import type { ToolExecutionContext } from "../../../../../services/tools/types";

const logger = createActivityLogger({ nodeType: "FileWrite" });

// ============================================================================
// TYPES
// ============================================================================

export type { FileWriteNodeConfig };

/**
 * Result from file write.
 */
export interface FileWriteNodeResult {
    path: string;
    fullPath: string;
    size: number;
    created: boolean;
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for FileWrite node type.
 * Writes files to the execution workspace.
 */
export class FileWriteNodeHandler extends BaseNodeHandler {
    readonly name = "FileWriteNodeHandler";
    readonly supportedNodeTypes = ["fileWrite"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const config = validateOrThrow(FileWriteNodeConfigSchema, input.nodeConfig, "FileWrite");
        const context = getExecutionContext(input.context);

        logger.info("Writing file", {
            path: config.path,
            encoding: config.encoding,
            overwrite: config.overwrite
        });

        // Interpolate variables in path and content
        const path = interpolateVariables(config.path, context);
        const content = interpolateVariables(config.content, context);

        if (!path || typeof path !== "string") {
            throw new Error("File path is required");
        }

        if (content === undefined || content === null) {
            throw new Error("Content is required");
        }

        // Build tool input
        const toolInput = {
            path,
            content: typeof content === "string" ? content : JSON.stringify(content, null, 2),
            encoding: config.encoding,
            createDirectories: config.createDirectories,
            overwrite: config.overwrite
        };

        // Create tool execution context
        const toolContext: ToolExecutionContext = {
            userId: input.metadata.userId || "system",
            workspaceId: "default",
            mode: "workflow",
            traceId: input.metadata.executionId
        };

        // Execute the builtin tool
        const toolResult = await fileWriteTool.execute(toolInput, toolContext);

        if (!toolResult.success) {
            throw new Error(toolResult.error?.message || "File write failed");
        }

        const result = toolResult.data as FileWriteNodeResult;

        logger.info("File written successfully", {
            path: result.path,
            size: result.size,
            created: result.created
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
 * Factory function for creating FileWrite handler.
 */
export function createFileWriteNodeHandler(): FileWriteNodeHandler {
    return new FileWriteNodeHandler();
}
