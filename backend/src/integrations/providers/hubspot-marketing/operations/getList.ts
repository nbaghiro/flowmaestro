import { z } from "zod";
import type { HubspotMarketingListOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { HubspotMarketingClient } from "../client/HubspotMarketingClient";

export const getListSchema = z.object({
    listId: z.number().describe("The ID of the list to retrieve")
});

export type GetListParams = z.infer<typeof getListSchema>;

export const getListOperation: OperationDefinition = {
    id: "getList",
    name: "Get List",
    description: "Get a single contact list from HubSpot Marketing by ID",
    category: "lists",
    inputSchema: getListSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetList(
    client: HubspotMarketingClient,
    params: GetListParams
): Promise<OperationResult> {
    try {
        const list = await client.getList(params.listId);

        const output: HubspotMarketingListOutput = {
            id: list.listId,
            name: list.name,
            listType: list.listType.toLowerCase() as "static" | "dynamic",
            size: list.metaData.size,
            createdAt: new Date(list.createdAt).toISOString(),
            updatedAt: new Date(list.updatedAt).toISOString(),
            deletable: list.deleteable
        };

        return { success: true, data: output };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get list";
        return {
            success: false,
            error: {
                type: message.includes("not found") ? "not_found" : "server_error",
                message,
                retryable: !message.includes("not found")
            }
        };
    }
}
