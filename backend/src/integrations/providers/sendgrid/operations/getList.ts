import { z } from "zod";
import type { SendGridListOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient } from "../client/SendGridClient";

export const getListSchema = z.object({
    listId: z.string().min(1).describe("The unique ID of the list")
});

export type GetListParams = z.infer<typeof getListSchema>;

export const getListOperation: OperationDefinition = {
    id: "getList",
    name: "Get List",
    description: "Get a single contact list by ID from SendGrid",
    category: "lists",
    inputSchema: getListSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetList(
    client: SendGridClient,
    params: GetListParams
): Promise<OperationResult> {
    try {
        const list = await client.getList(params.listId);

        const output: SendGridListOutput = {
            id: list.id,
            name: list.name,
            contactCount: list.contact_count
        };

        return {
            success: true,
            data: output
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
