import { listItemsInputSchema, type ListItemsInput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SharePointClient } from "../client/SharePointClient";

export const listItemsOperation: OperationDefinition = {
    id: "listItems",
    name: "List Items",
    description: "List items in a SharePoint list with expanded fields",
    category: "items",
    inputSchema: listItemsInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeListItems(
    client: SharePointClient,
    params: ListItemsInput
): Promise<OperationResult> {
    try {
        const result = await client.listItems(params);
        return {
            success: true,
            data: {
                items: result.value,
                hasMore: !!result["@odata.nextLink"]
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list items",
                retryable: true
            }
        };
    }
}
