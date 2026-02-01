import { z } from "zod";
import { AirtableClient } from "../client/AirtableClient";
import { baseIdSchema, tableIdSchema, recordIdSchema } from "../schemas";
import type { AirtableComment } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const createCommentSchema = z.object({
    baseId: baseIdSchema,
    tableId: tableIdSchema,
    recordId: recordIdSchema,
    text: z.string().describe("Comment text (supports @mentions)")
});

export type CreateCommentParams = z.infer<typeof createCommentSchema>;

export const createCommentOperation: OperationDefinition = {
    id: "createComment",
    name: "Create Comment",
    description: "Add a comment to a record",
    category: "collaboration",
    inputSchema: createCommentSchema,
    retryable: true,
    timeout: 10000
};

export async function executeCreateComment(
    client: AirtableClient,
    params: CreateCommentParams
): Promise<OperationResult> {
    try {
        const response = await client.post<AirtableComment>(
            `/${params.baseId}/${params.tableId}/${params.recordId}/comments`,
            { text: params.text }
        );

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create comment",
                retryable: true
            }
        };
    }
}
