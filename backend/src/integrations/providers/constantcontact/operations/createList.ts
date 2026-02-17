import { z } from "zod";
import type { ConstantContactListOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConstantContactClient } from "../client/ConstantContactClient";

export const createListSchema = z.object({
    name: z.string().min(1).max(255).describe("List name"),
    description: z.string().max(255).optional().describe("List description"),
    favorite: z.boolean().optional().describe("Mark as favorite list")
});

export type CreateListParams = z.infer<typeof createListSchema>;

export const createListOperation: OperationDefinition = {
    id: "createList",
    name: "Create List",
    description: "Create a new contact list in Constant Contact",
    category: "lists",
    inputSchema: createListSchema,
    retryable: false,
    timeout: 15000
};

export async function executeCreateList(
    client: ConstantContactClient,
    params: CreateListParams
): Promise<OperationResult> {
    try {
        const list = await client.createList({
            name: params.name,
            description: params.description,
            favorite: params.favorite
        });

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
        const message = error instanceof Error ? error.message : "Failed to create list";
        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: false
            }
        };
    }
}
