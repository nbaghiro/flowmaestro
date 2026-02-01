import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleFormsClient } from "../client/GoogleFormsClient";

/**
 * Update form input schema
 *
 * The requests array follows the Google Forms API batchUpdate format.
 * Each request can contain one of: createItem, updateItem, deleteItem,
 * moveItem, updateFormInfo, or updateSettings.
 */
export const updateFormSchema = z.object({
    formId: z.string().min(1).describe("The ID of the form to update"),
    requests: z
        .array(z.record(z.unknown()))
        .min(1)
        .describe(
            "Array of update requests. Each request should contain one operation (createItem, updateItem, deleteItem, moveItem, updateFormInfo, updateSettings)"
        )
});

export type UpdateFormParams = z.infer<typeof updateFormSchema>;

/**
 * Update form operation definition
 */
export const updateFormOperation: OperationDefinition = {
    id: "updateForm",
    name: "Update Form",
    description:
        "Batch update a form (add/modify questions, change settings, update form info, etc.)",
    category: "forms",
    retryable: true,
    inputSchema: updateFormSchema
};

/**
 * Execute update form operation
 */
export async function executeUpdateForm(
    client: GoogleFormsClient,
    params: UpdateFormParams
): Promise<OperationResult> {
    try {
        const response = await client.batchUpdateForm(params.formId, params.requests);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update form",
                retryable: true
            }
        };
    }
}
