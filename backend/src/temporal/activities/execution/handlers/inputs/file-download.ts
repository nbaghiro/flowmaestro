/**
 * File Download Node Handler
 *
 * Downloads files from URLs using the file_download builtin tool.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { fileDownloadTool } from "../../../../../services/tools/builtin/file-download";
import { createActivityLogger, interpolateVariables, getExecutionContext } from "../../../../core";
import {
    FileDownloadNodeConfigSchema,
    validateOrThrow,
    type FileDownloadNodeConfig
} from "../../../../core/schemas";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";
import type { ToolExecutionContext } from "../../../../../services/tools/types";

const logger = createActivityLogger({ nodeType: "FileDownload" });

// ============================================================================
// TYPES
// ============================================================================

export type { FileDownloadNodeConfig };

/**
 * Result from file download.
 */
export interface FileDownloadNodeResult {
    path: string;
    filename: string;
    size: number;
    contentType: string;
    downloadTime: number;
    url: string;
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for FileDownload node type.
 * Downloads files from URLs.
 */
export class FileDownloadNodeHandler extends BaseNodeHandler {
    readonly name = "FileDownloadNodeHandler";
    readonly supportedNodeTypes = ["fileDownload"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const config = validateOrThrow(
            FileDownloadNodeConfigSchema,
            input.nodeConfig,
            "FileDownload"
        );
        const context = getExecutionContext(input.context);

        logger.info("Downloading file", {
            maxSize: config.maxSize,
            timeout: config.timeout
        });

        // Interpolate variables in URL and filename
        const url = interpolateVariables(config.url, context);
        const filename = config.filename
            ? interpolateVariables(config.filename, context)
            : undefined;

        if (!url || typeof url !== "string") {
            throw new Error("URL is required");
        }

        // Build tool input
        const toolInput = {
            url,
            filename: typeof filename === "string" ? filename : undefined,
            maxSize: config.maxSize,
            timeout: config.timeout,
            followRedirects: config.followRedirects,
            validateContentType: config.allowedContentTypes
        };

        // Create tool execution context
        const toolContext: ToolExecutionContext = {
            userId: input.metadata.userId || "system",
            workspaceId: "default",
            mode: "workflow",
            traceId: input.metadata.executionId
        };

        // Execute the builtin tool
        const toolResult = await fileDownloadTool.execute(toolInput, toolContext);

        if (!toolResult.success) {
            throw new Error(toolResult.error?.message || "File download failed");
        }

        const result = toolResult.data as FileDownloadNodeResult;

        logger.info("File downloaded successfully", {
            path: result.path,
            size: result.size,
            contentType: result.contentType
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
 * Factory function for creating FileDownload handler.
 */
export function createFileDownloadNodeHandler(): FileDownloadNodeHandler {
    return new FileDownloadNodeHandler();
}
