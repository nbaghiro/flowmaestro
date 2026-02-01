import { z } from "zod";
import { AirtableClient } from "../client/AirtableClient";
import { baseIdSchema, tableIdSchema, recordIdSchema } from "../schemas";
import type { AirtableComment } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const listCommentsSchema = z.object({
    baseId: baseIdSchema,
    tableId: tableIdSchema,
    recordId: recordIdSchema,
    pageSize: z.number().min(1).max(100).optional(),
    offset: z.string().optional()
});

export type ListCommentsParams = z.infer<typeof listCommentsSchema>;

export const listCommentsOperation: OperationDefinition = {
    id: "listComments",
    name: "List Comments",
    description: "List comments on a record",
    category: "collaboration",
    inputSchema: listCommentsSchema,
    retryable: true,
    timeout: 10000
};

export async function executeListComments(
    client: AirtableClient,
    params: ListCommentsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};
        if (params.pageSize) queryParams.pageSize = params.pageSize;
        if (params.offset) queryParams.offset = params.offset;

        const response = await client.get<{ comments: AirtableComment[]; offset?: string }>(
            `/${params.baseId}/${params.tableId}/${params.recordId}/comments`,
            queryParams
        );

        return {
            success: true,
            data: {
                comments: response.comments,
                offset: response.offset,
                hasMore: !!response.offset
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list comments",
                retryable: true
            }
        };
    }
}
