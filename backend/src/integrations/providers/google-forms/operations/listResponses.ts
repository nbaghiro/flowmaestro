import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleFormsClient } from "../client/GoogleFormsClient";

/**
 * List responses input schema
 */
export const listResponsesSchema = z.object({
    formId: z.string().min(1).describe("The ID of the form"),
    pageSize: z
        .number()
        .int()
        .min(1)
        .max(5000)
        .optional()
        .describe("Maximum number of responses to return (max 5000)"),
    pageToken: z.string().optional().describe("Token for pagination to get the next page"),
    filter: z
        .string()
        .optional()
        .describe(
            'Filter by timestamp (e.g., "timestamp > 2024-01-01T00:00:00Z" or "timestamp >= 2024-01-01T00:00:00.000Z")'
        )
});

export type ListResponsesParams = z.infer<typeof listResponsesSchema>;

/**
 * List responses operation definition
 */
export const listResponsesOperation: OperationDefinition = {
    id: "listResponses",
    name: "List Responses",
    description: "Get all responses for a form with optional pagination and filtering",
    category: "responses",
    retryable: true,
    inputSchema: listResponsesSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            formId: {
                type: "string",
                description: "The ID of the form"
            },
            pageSize: {
                type: "number",
                description: "Maximum number of responses to return (max 5000)"
            },
            pageToken: {
                type: "string",
                description: "Token for pagination to get the next page"
            },
            filter: {
                type: "string",
                description:
                    'Filter by timestamp (e.g., "timestamp > 2024-01-01T00:00:00Z" or "timestamp >= 2024-01-01T00:00:00.000Z")'
            }
        },
        required: ["formId"]
    }
};

/**
 * Execute list responses operation
 */
export async function executeListResponses(
    client: GoogleFormsClient,
    params: ListResponsesParams
): Promise<OperationResult> {
    try {
        const response = await client.listResponses(params.formId, {
            pageSize: params.pageSize,
            pageToken: params.pageToken,
            filter: params.filter
        });

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list responses",
                retryable: true
            }
        };
    }
}
