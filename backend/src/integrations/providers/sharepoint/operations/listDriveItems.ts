import { listDriveItemsInputSchema, type ListDriveItemsInput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SharePointClient } from "../client/SharePointClient";

export const listDriveItemsOperation: OperationDefinition = {
    id: "listDriveItems",
    name: "List Drive Items",
    description: "List files and folders in a SharePoint site's document library",
    category: "files",
    inputSchema: listDriveItemsInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeListDriveItems(
    client: SharePointClient,
    params: ListDriveItemsInput
): Promise<OperationResult> {
    try {
        const result = await client.listDriveItems(params);
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
                message: error instanceof Error ? error.message : "Failed to list drive items",
                retryable: true
            }
        };
    }
}
