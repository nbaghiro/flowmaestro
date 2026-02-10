import { getListInputSchema, type GetListInput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SharePointClient } from "../client/SharePointClient";

export const getListOperation: OperationDefinition = {
    id: "getList",
    name: "Get List",
    description: "Get details of a specific SharePoint list",
    category: "lists",
    inputSchema: getListInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetList(
    client: SharePointClient,
    params: GetListInput
): Promise<OperationResult> {
    try {
        const result = await client.getList(params);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get list",
                retryable: true
            }
        };
    }
}
