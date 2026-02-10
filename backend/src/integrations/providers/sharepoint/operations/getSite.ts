import { getSiteInputSchema, type GetSiteInput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SharePointClient } from "../client/SharePointClient";

export const getSiteOperation: OperationDefinition = {
    id: "getSite",
    name: "Get Site",
    description: "Get details of a specific SharePoint site",
    category: "sites",
    inputSchema: getSiteInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetSite(
    client: SharePointClient,
    params: GetSiteInput
): Promise<OperationResult> {
    try {
        const result = await client.getSite(params.siteId);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get site",
                retryable: true
            }
        };
    }
}
