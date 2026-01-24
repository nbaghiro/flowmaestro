import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleFormsClient } from "../client/GoogleFormsClient";

/**
 * Get form input schema
 */
export const getFormSchema = z.object({
    formId: z.string().min(1).describe("The ID of the form to retrieve")
});

export type GetFormParams = z.infer<typeof getFormSchema>;

/**
 * Get form operation definition
 */
export const getFormOperation: OperationDefinition = {
    id: "getForm",
    name: "Get Form",
    description: "Retrieve form structure and metadata",
    category: "forms",
    retryable: true,
    inputSchema: getFormSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            formId: {
                type: "string",
                description: "The ID of the form to retrieve"
            }
        },
        required: ["formId"]
    }
};

/**
 * Execute get form operation
 */
export async function executeGetForm(
    client: GoogleFormsClient,
    params: GetFormParams
): Promise<OperationResult> {
    try {
        const response = await client.getForm(params.formId);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get form",
                retryable: true
            }
        };
    }
}
