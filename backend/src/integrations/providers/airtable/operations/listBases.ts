import { z } from "zod";
import { AirtableClient } from "../client/AirtableClient";
import type { AirtableBase } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const listBasesSchema = z.object({
    offset: z.string().optional().describe("Pagination offset")
});

export type ListBasesParams = z.infer<typeof listBasesSchema>;

export const listBasesOperation: OperationDefinition = {
    id: "listBases",
    name: "List Bases",
    description: "List all bases the user has access to",
    category: "schema",
    inputSchema: listBasesSchema,
    retryable: true,
    timeout: 10000
};

export async function executeListBases(
    client: AirtableClient,
    params: ListBasesParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};
        if (params.offset) {
            queryParams.offset = params.offset;
        }

        const response = await client.get<{ bases: AirtableBase[]; offset?: string }>(
            "/meta/bases",
            queryParams
        );

        return {
            success: true,
            data: {
                bases: response.bases,
                offset: response.offset,
                hasMore: !!response.offset
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list bases",
                retryable: true
            }
        };
    }
}
