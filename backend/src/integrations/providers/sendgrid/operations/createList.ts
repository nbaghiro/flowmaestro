import { z } from "zod";
import type { SendGridListOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient } from "../client/SendGridClient";

export const createListSchema = z.object({
    name: z.string().min(1).describe("The name of the list")
});

export type CreateListParams = z.infer<typeof createListSchema>;

export const createListOperation: OperationDefinition = {
    id: "createList",
    name: "Create List",
    description: "Create a new contact list in SendGrid Marketing",
    category: "lists",
    inputSchema: createListSchema,
    retryable: false,
    timeout: 15000
};

export async function executeCreateList(
    client: SendGridClient,
    params: CreateListParams
): Promise<OperationResult> {
    try {
        const list = await client.createList(params.name);

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
                message: error instanceof Error ? error.message : "Failed to create list",
                retryable: false
            }
        };
    }
}
