import { listSitesInputSchema, type ListSitesInput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SharePointClient } from "../client/SharePointClient";

export const listSitesOperation: OperationDefinition = {
    id: "listSites",
    name: "List Sites",
    description: "Search for and list SharePoint sites",
    category: "sites",
    inputSchema: listSitesInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeListSites(
    client: SharePointClient,
    params: ListSitesInput
): Promise<OperationResult> {
    try {
        const result = await client.listSites(params);
        return {
            success: true,
            data: {
                sites: result.value,
                hasMore: !!result["@odata.nextLink"]
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list sites",
                retryable: true
            }
        };
    }
}
