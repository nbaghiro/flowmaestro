import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDriveClient } from "../client/GoogleDriveClient";

/**
 * Export document input schema
 */
export const exportDocumentSchema = z.object({
    fileId: z.string().min(1).describe("Google Workspace document ID to export"),
    mimeType: z
        .string()
        .describe(
            "Export MIME type (e.g., 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' for Word)"
        )
});

export type ExportDocumentParams = z.infer<typeof exportDocumentSchema>;

/**
 * Export document operation definition
 */
export const exportDocumentOperation: OperationDefinition = {
    id: "exportDocument",
    name: "Export Google Workspace Document",
    description:
        "Export a Google Workspace document (Docs, Sheets, Slides) to another format (PDF, Word, Excel, etc.)",
    category: "export",
    retryable: true,
    inputSchema: exportDocumentSchema
};

/**
 * Execute export document operation
 */
export async function executeExportDocument(
    client: GoogleDriveClient,
    params: ExportDocumentParams
): Promise<OperationResult> {
    try {
        const content = await client.exportDocument(params.fileId, params.mimeType);

        // Convert Blob to base64 for easier handling
        let exportedContent: string | Blob = content;

        if (content instanceof Blob) {
            const arrayBuffer = await content.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            exportedContent = base64;
        }

        return {
            success: true,
            data: {
                fileId: params.fileId,
                mimeType: params.mimeType,
                content: exportedContent,
                contentType: content.type
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to export document",
                retryable: true
            }
        };
    }
}
