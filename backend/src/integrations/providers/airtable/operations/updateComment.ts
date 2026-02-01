import { z } from "zod";
import { AirtableClient } from "../client/AirtableClient";
import { baseIdSchema, tableIdSchema, recordIdSchema } from "../schemas";
import type { AirtableComment } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const updateCommentSchema = z.object({
    baseId: baseIdSchema,
    tableId: tableIdSchema,
    recordId: recordIdSchema,
    commentId: z.string().describe("The comment ID"),
    text: z.string().describe("Updated comment text")
});

export type UpdateCommentParams = z.infer<typeof updateCommentSchema>;

export const updateCommentOperation: OperationDefinition = {
    id: "updateComment",
    name: "Update Comment",
    description: "Edit an existing comment",
    category: "collaboration",
    inputSchema: updateCommentSchema,
    retryable: true,
    timeout: 10000
};

export async function executeUpdateComment(
    client: AirtableClient,
    params: UpdateCommentParams
): Promise<OperationResult> {
    try {
        const response = await client.patch<AirtableComment>(
            `/${params.baseId}/${params.tableId}/${params.recordId}/comments/${params.commentId}`,
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
                message: error instanceof Error ? error.message : "Failed to update comment",
                retryable: true
            }
        };
    }
}
