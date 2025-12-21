import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDocsClient } from "../client/GoogleDocsClient";

/**
 * Replace text input schema
 */
export const replaceTextSchema = z.object({
    documentId: z.string().min(1).describe("The ID of the document"),
    find: z.string().min(1).describe("The text to find"),
    replace: z.string().describe("The text to replace with (can be empty to delete)"),
    matchCase: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to match case when finding text")
});

export type ReplaceTextParams = z.infer<typeof replaceTextSchema>;

/**
 * Replace text operation definition
 */
export const replaceTextOperation: OperationDefinition = {
    id: "replaceText",
    name: "Replace Text",
    description: "Find and replace all occurrences of text in a Google Docs document",
    category: "documents",
    retryable: true,
    inputSchema: replaceTextSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            documentId: {
                type: "string",
                description: "The ID of the document"
            },
            find: {
                type: "string",
                description: "The text to find"
            },
            replace: {
                type: "string",
                description: "The text to replace with (can be empty to delete)"
            },
            matchCase: {
                type: "boolean",
                description: "Whether to match case when finding text (default: false)"
            }
        },
        required: ["documentId", "find", "replace"]
    }
};

interface BatchUpdateResponse {
    documentId: string;
    replies?: Array<{
        replaceAllText?: {
            occurrencesChanged?: number;
        };
    }>;
}

/**
 * Execute replace text operation
 * Uses batchUpdate with replaceAllText request
 */
export async function executeReplaceText(
    client: GoogleDocsClient,
    params: ReplaceTextParams
): Promise<OperationResult> {
    try {
        const requests = [
            {
                replaceAllText: {
                    containsText: {
                        text: params.find,
                        matchCase: params.matchCase ?? false
                    },
                    replaceText: params.replace
                }
            }
        ];

        const response = (await client.batchUpdate(
            params.documentId,
            requests
        )) as BatchUpdateResponse;

        const occurrencesChanged = response.replies?.[0]?.replaceAllText?.occurrencesChanged ?? 0;

        return {
            success: true,
            data: {
                documentId: response.documentId,
                occurrencesChanged,
                find: params.find,
                replace: params.replace
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to replace text",
                retryable: true
            }
        };
    }
}
