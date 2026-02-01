import { z } from "zod";
import { LookerClient } from "../client/LookerClient";
import type { LookerFolder } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Folders operation schema
 */
export const listFoldersSchema = z.object({
    parent_id: z.string().optional().describe("Filter by parent folder ID (empty for root folders)")
});

export type ListFoldersParams = z.infer<typeof listFoldersSchema>;

/**
 * List Folders operation definition
 */
export const listFoldersOperation: OperationDefinition = {
    id: "listFolders",
    name: "List Folders",
    description: "Get all folders in the Looker instance",
    category: "folders",
    inputSchema: listFoldersSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list folders operation
 */
export async function executeListFolders(
    client: LookerClient,
    params: ListFoldersParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {};

        if (params.parent_id !== undefined) {
            queryParams.parent_id = params.parent_id;
        }

        const folders = await client.get<LookerFolder[]>("/folders", queryParams);

        return {
            success: true,
            data: {
                folders,
                count: folders.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list folders",
                retryable: true
            }
        };
    }
}
