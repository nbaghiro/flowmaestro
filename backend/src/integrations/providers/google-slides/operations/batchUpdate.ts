import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSlidesClient } from "../client/GoogleSlidesClient";

/**
 * Batch update input schema
 * Supports all Google Slides API batchUpdate request types
 */
export const batchUpdateSchema = z.object({
    presentationId: z.string().min(1).describe("The ID of the presentation to update"),
    requests: z
        .array(z.record(z.unknown()))
        .min(1)
        .describe("Array of update requests (createSlide, insertText, createShape, etc.)")
});

export type BatchUpdateParams = z.infer<typeof batchUpdateSchema>;

/**
 * Batch update operation definition
 */
export const batchUpdateOperation: OperationDefinition = {
    id: "batchUpdate",
    name: "Batch Update Presentation",
    description:
        "Apply multiple updates to a presentation atomically. Supports all Google Slides API request types including createSlide, duplicateObject, createShape, insertText, updatePageProperties, deleteObject, replaceAllText, and more.",
    category: "presentations",
    retryable: true,
    inputSchema: batchUpdateSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            presentationId: {
                type: "string",
                description: "The ID of the presentation to update"
            },
            requests: {
                type: "array",
                items: {
                    type: "object",
                    description:
                        "A single update request. Common types: createSlide, duplicateObject, createShape, createImage, createVideo, createTable, insertText, deleteText, replaceAllText, updateShapeProperties, updateTextStyle, updatePageProperties, deleteObject"
                },
                description: "Array of update requests to apply atomically"
            }
        },
        required: ["presentationId", "requests"]
    }
};

interface BatchUpdateResponse {
    presentationId: string;
    replies?: unknown[];
    writeControl?: {
        requiredRevisionId?: string;
    };
}

/**
 * Execute batch update operation
 */
export async function executeBatchUpdate(
    client: GoogleSlidesClient,
    params: BatchUpdateParams
): Promise<OperationResult> {
    try {
        const response = (await client.batchUpdate(
            params.presentationId,
            params.requests
        )) as BatchUpdateResponse;

        return {
            success: true,
            data: {
                presentationId: response.presentationId,
                replies: response.replies,
                writeControl: response.writeControl
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update presentation",
                retryable: true
            }
        };
    }
}
