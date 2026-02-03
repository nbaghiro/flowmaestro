import { createItemInputSchema, type CreateItemInput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SharePointClient } from "../client/SharePointClient";

export const createItemOperation: OperationDefinition = {
    id: "createItem",
    name: "Create Item",
    description: "Create a new item in a SharePoint list",
    category: "items",
    inputSchema: createItemInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeCreateItem(
    client: SharePointClient,
    params: CreateItemInput
): Promise<OperationResult> {
    try {
        const result = await client.createItem(params);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create item",
                retryable: true
            }
        };
    }
}
