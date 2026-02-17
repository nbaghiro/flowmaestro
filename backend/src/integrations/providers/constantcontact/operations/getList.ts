import { z } from "zod";
import type { ConstantContactListOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConstantContactClient } from "../client/ConstantContactClient";

export const getListSchema = z.object({
    listId: z.string().describe("The list ID to retrieve")
});

export type GetListParams = z.infer<typeof getListSchema>;

export const getListOperation: OperationDefinition = {
    id: "getList",
    name: "Get List",
    description: "Retrieve a single contact list by ID from Constant Contact",
    category: "lists",
    inputSchema: getListSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetList(
    client: ConstantContactClient,
    params: GetListParams
): Promise<OperationResult> {
    try {
        const list = await client.getList(params.listId);

        const output: ConstantContactListOutput = {
            id: list.list_id,
            name: list.name,
            description: list.description,
            membershipCount: list.membership_count,
            favorite: list.favorite,
            createdAt: list.created_at,
            updatedAt: list.updated_at
        };

        return { success: true, data: output };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get list";
        return {
            success: false,
            error: {
                type: message.includes("not found") ? "not_found" : "server_error",
                message,
                retryable: false
            }
        };
    }
}
