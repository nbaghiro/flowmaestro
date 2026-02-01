import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleFormsClient } from "../client/GoogleFormsClient";

/**
 * Create form input schema
 */
export const createFormSchema = z.object({
    title: z.string().min(1).max(255).describe("The title of the form")
});

export type CreateFormParams = z.infer<typeof createFormSchema>;

/**
 * Create form operation definition
 */
export const createFormOperation: OperationDefinition = {
    id: "createForm",
    name: "Create Form",
    description: "Create a new Google Form with a title",
    category: "forms",
    retryable: true,
    inputSchema: createFormSchema
};

/**
 * Execute create form operation
 */
export async function executeCreateForm(
    client: GoogleFormsClient,
    params: CreateFormParams
): Promise<OperationResult> {
    try {
        const response = await client.createForm({
            title: params.title
        });

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create form",
                retryable: true
            }
        };
    }
}
