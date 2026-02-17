import { z } from "zod";
import type { HubspotMarketingListOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { HubspotMarketingClient } from "../client/HubspotMarketingClient";

export const getListsSchema = z.object({
    count: z.number().min(1).max(250).optional().describe("Number of lists to return (max 250)"),
    offset: z.number().min(0).optional().describe("Number of lists to skip")
});

export type GetListsParams = z.infer<typeof getListsSchema>;

export const getListsOperation: OperationDefinition = {
    id: "getLists",
    name: "Get Lists",
    description: "Get all contact lists from HubSpot Marketing",
    category: "lists",
    inputSchema: getListsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetLists(
    client: HubspotMarketingClient,
    params: GetListsParams
): Promise<OperationResult> {
    try {
        const response = await client.getLists({
            count: params.count,
            offset: params.offset
        });

        const lists: HubspotMarketingListOutput[] = response.lists.map((list) => ({
            id: list.listId,
            name: list.name,
            listType: list.listType.toLowerCase() as "static" | "dynamic",
            size: list.metaData.size,
            createdAt: new Date(list.createdAt).toISOString(),
            updatedAt: new Date(list.updatedAt).toISOString(),
            deletable: list.deleteable
        }));

        return {
            success: true,
            data: {
                lists,
                totalItems: lists.length,
                hasMore: response.hasMore,
                offset: response.offset
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get lists",
                retryable: true
            }
        };
    }
}
