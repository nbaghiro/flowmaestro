import { z } from "zod";
import type { HubspotMarketingListOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { HubspotMarketingClient } from "../client/HubspotMarketingClient";

export const createListSchema = z.object({
    name: z.string().min(1).max(200).describe("Name for the new list"),
    dynamic: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether the list is dynamic (true) or static (false)")
});

export type CreateListParams = z.infer<typeof createListSchema>;

export const createListOperation: OperationDefinition = {
    id: "createList",
    name: "Create List",
    description: "Create a new contact list in HubSpot Marketing",
    category: "lists",
    inputSchema: createListSchema,
    retryable: false,
    timeout: 15000
};

export async function executeCreateList(
    client: HubspotMarketingClient,
    params: CreateListParams
): Promise<OperationResult> {
    try {
        const list = await client.createList({
            name: params.name,
            dynamic: params.dynamic || false
        });

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
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create list",
                retryable: false
            }
        };
    }
}
