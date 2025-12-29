/**
 * File Operations Node Execution
 *
 * Complete execution logic and handler for file operation nodes.
 * Supports reading, writing, and parsing files (PDF, CSV, JSON).
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as pdf from "pdf-parse";
import type { JsonObject } from "@flowmaestro/shared";
import { activityLogger, interpolateVariables, getExecutionContext } from "../../../../core";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";

// ============================================================================
// TYPES
// ============================================================================

export interface FileOperationsNodeConfig {
    operation: "read" | "write" | "parsePDF" | "parseCSV" | "parseJSON";
    fileSource?: "upload" | "url" | "path"; // For read/parse operations
    filePath?: string; // Local file path or URL
    fileData?: string; // Base64 encoded file data
    content?: string; // Content to write
    format?: "csv" | "json" | "xml" | "text" | "pdf" | "markdown";
    outputPath?: string; // Where to write file
    outputVariable?: string; // Variable name to store result
}

export interface FileOperationsNodeResult {
    content?: string;
    filePath?: string;
    metadata?: {
        size: number;
        pages?: number;
        format?: string;
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function readFile(
    config: FileOperationsNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const filePath = interpolateVariables(config.filePath || "", context);

    if (config.fileSource === "url") {
        // Download file from URL
        activityLogger.info("Downloading from URL", { url: filePath });
        const response = await fetch(filePath);

        if (!response.ok) {
            throw new Error(`Failed to download file: HTTP ${response.status}`);
        }

        const content = await response.text();
        return {
            content: content,
            metadata: {
                size: content.length
            }
        } as unknown as JsonObject;
    } else {
        // Read from local filesystem
        activityLogger.info("Reading from path", { filePath });
        const content = await fs.readFile(filePath, "utf-8");
        const stats = await fs.stat(filePath);
        return {
            content,
            filePath,
            metadata: {
                size: stats.size
            }
        } as unknown as JsonObject;
    }
}

async function writeFile(
    config: FileOperationsNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const content = interpolateVariables(config.content || "", context);
    const outputPath = interpolateVariables(config.outputPath || "", context);

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    activityLogger.info("Writing file", { outputPath });
    await fs.writeFile(outputPath, content, "utf-8");

    const stats = await fs.stat(outputPath);

    return {
        filePath: outputPath,
        metadata: {
            size: stats.size,
            format: config.format
        }
    } as unknown as JsonObject;
}

async function parsePDF(
    config: FileOperationsNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    let buffer: Buffer;

    if (config.fileSource === "url") {
        // Download PDF from URL
        const url = interpolateVariables(config.filePath || "", context);
        activityLogger.info("Downloading PDF from URL", { url });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "FlowMaestro/1.0"
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Failed to download PDF: HTTP ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    } else if (config.fileSource === "path") {
        // Read from local path
        const filePath = interpolateVariables(config.filePath || "", context);
        activityLogger.info("Reading PDF from path", { filePath });
        buffer = await fs.readFile(filePath);
    } else if (config.fileData) {
        // Decode from base64
        activityLogger.info("Decoding PDF from base64 data");
        buffer = Buffer.from(config.fileData, "base64");
    } else {
        throw new Error("PDF source not specified (url, path, or fileData required)");
    }

    activityLogger.info("Parsing PDF", { bufferSize: buffer.length });

    // Parse PDF
    const data = await (
        pdf as unknown as (dataBuffer: Buffer) => Promise<{ numpages: number; text: string }>
    )(buffer);

    activityLogger.info("Extracted PDF content", {
        pages: data.numpages,
        characterCount: data.text.length
    });

    return {
        content: data.text,
        metadata: {
            size: buffer.length,
            pages: data.numpages,
            format: "pdf"
        }
    } as unknown as JsonObject;
}

async function parseCSV(
    config: FileOperationsNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    // First read the file
    const fileResult = await readFile(config, context);
    const content = fileResult.content;

    if (typeof content !== "string") {
        throw new Error("CSV content must be a string");
    }

    const csvText = content || "";

    // Simple CSV parsing (for production, use a library like papaparse)
    const lines = csvText.split("\n").filter((line: string) => line.trim());
    if (lines.length === 0) {
        return { content: JSON.stringify([]) } as unknown as JsonObject;
    }

    const headers = lines[0].split(",").map((h: string) => h.trim());
    const rows = lines.slice(1).map((line: string) => {
        const values = line.split(",").map((v: string) => v.trim());
        const obj: Record<string, string> = {};
        headers.forEach((header: string, i: number) => {
            obj[header] = values[i] || "";
        });
        return obj;
    });

    return {
        content: JSON.stringify(rows, null, 2),
        metadata: {
            size: csvText.length,
            format: "csv"
        }
    } as unknown as JsonObject;
}

async function parseJSONFile(
    config: FileOperationsNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const fileResult = await readFile(config, context);
    const content = fileResult.content;

    if (typeof content !== "string") {
        throw new Error("JSON content must be a string");
    }

    const jsonText = content || "";

    try {
        const parsed = JSON.parse(jsonText);
        return {
            content: JSON.stringify(parsed, null, 2),
            metadata: {
                size: jsonText.length,
                format: "json"
            }
        } as unknown as JsonObject;
    } catch (error) {
        throw new Error(`Invalid JSON in file: ${error}`);
    }
}

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute File Operations node - handles file reading, writing, and parsing
 */
export async function executeFileOperationsNode(
    config: FileOperationsNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    activityLogger.info("File operations node", { operation: config.operation });

    let result: FileOperationsNodeResult;

    switch (config.operation) {
        case "read":
            result = (await readFile(config, context)) as FileOperationsNodeResult;
            break;
        case "write":
            result = (await writeFile(config, context)) as FileOperationsNodeResult;
            break;
        case "parsePDF":
            result = (await parsePDF(config, context)) as FileOperationsNodeResult;
            break;
        case "parseCSV":
            result = (await parseCSV(config, context)) as FileOperationsNodeResult;
            break;
        case "parseJSON":
            result = (await parseJSONFile(config, context)) as FileOperationsNodeResult;
            break;
        default:
            throw new Error(`Unsupported file operation: ${config.operation}`);
    }

    // Wrap result in outputVariable if specified
    if (config.outputVariable) {
        return { [config.outputVariable]: result } as unknown as JsonObject;
    }

    return result as unknown as JsonObject;
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for File Operations node type.
 */
export class FileOperationsNodeHandler extends BaseNodeHandler {
    readonly name = "FileOperationsNodeHandler";
    readonly supportedNodeTypes = ["file", "fileOperations"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const context = getExecutionContext(input.context);

        const result = await executeFileOperationsNode(
            input.nodeConfig as unknown as FileOperationsNodeConfig,
            context
        );

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
 * Factory function for creating File Operations handler.
 */
export function createFileOperationsNodeHandler(): FileOperationsNodeHandler {
    return new FileOperationsNodeHandler();
}
