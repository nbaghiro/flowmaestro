import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDocsClient } from "../client/GoogleDocsClient";

/**
 * Append text input schema
 */
export const appendTextSchema = z.object({
    documentId: z.string().min(1).describe("The ID of the document"),
    text: z.string().min(1).describe("The text to append to the end of the document")
});

export type AppendTextParams = z.infer<typeof appendTextSchema>;

/**
 * Append text operation definition
 */
export const appendTextOperation: OperationDefinition = {
    id: "appendText",
    name: "Append Text",
    description: "Append text to the end of a Google Docs document",
    category: "documents",
    retryable: true,
    inputSchema: appendTextSchema
};

interface BatchUpdateResponse {
    documentId: string;
    replies?: unknown[];
}

/**
 * Execute append text operation
 * Uses batchUpdate with insertText at endOfSegmentLocation
 */
export async function executeAppendText(
    client: GoogleDocsClient,
    params: AppendTextParams
): Promise<OperationResult> {
    try {
        // Use insertText request with endOfSegmentLocation to append at end
        const requests = [
            {
                insertText: {
                    text: params.text,
                    endOfSegmentLocation: {
                        segmentId: "" // Empty string means the body of the document
                    }
                }
            }
        ];

        const response = (await client.batchUpdate(
            params.documentId,
            requests
        )) as BatchUpdateResponse;

        return {
            success: true,
            data: {
                documentId: response.documentId,
                appended: true,
                textLength: params.text.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to append text",
                retryable: true
            }
        };
    }
}
