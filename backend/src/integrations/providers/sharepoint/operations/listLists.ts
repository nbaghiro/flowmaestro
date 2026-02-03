import { listListsInputSchema, type ListListsInput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SharePointClient } from "../client/SharePointClient";

export const listListsOperation: OperationDefinition = {
    id: "listLists",
    name: "List Lists",
    description: "List all lists in a SharePoint site",
    category: "lists",
    inputSchema: listListsInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeListLists(
    client: SharePointClient,
    params: ListListsInput
): Promise<OperationResult> {
    try {
        const result = await client.listLists(params);
        return {
            success: true,
            data: {
                lists: result.value,
                hasMore: !!result["@odata.nextLink"]
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list lists",
                retryable: true
            }
        };
    }
}
