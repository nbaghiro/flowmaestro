import { z } from "zod";
import { LookerClient } from "../client/LookerClient";
import { LookerFolderIdSchema, LookerFieldsSchema } from "./schemas";
import type { LookerLook } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Looks operation schema
 */
export const listLooksSchema = z.object({
    folder_id: LookerFolderIdSchema,
    fields: LookerFieldsSchema
});

export type ListLooksParams = z.infer<typeof listLooksSchema>;

/**
 * List Looks operation definition
 */
export const listLooksOperation: OperationDefinition = {
    id: "listLooks",
    name: "List Looks",
    description: "Get all Looks (saved queries) in the Looker instance",
    category: "looks",
    inputSchema: listLooksSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list looks operation
 */
export async function executeListLooks(
    client: LookerClient,
    params: ListLooksParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {};

        if (params.folder_id) {
            queryParams.folder_id = params.folder_id;
        }

        if (params.fields && params.fields.length > 0) {
            queryParams.fields = params.fields.join(",");
        }

        const looks = await client.get<LookerLook[]>("/looks", queryParams);

        return {
            success: true,
            data: {
                looks,
                count: looks.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list looks",
                retryable: true
            }
        };
    }
}
