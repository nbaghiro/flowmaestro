import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleFormsClient } from "../client/GoogleFormsClient";

/**
 * Get response input schema
 */
export const getResponseSchema = z.object({
    formId: z.string().min(1).describe("The ID of the form"),
    responseId: z.string().min(1).describe("The ID of the response to retrieve")
});

export type GetResponseParams = z.infer<typeof getResponseSchema>;

/**
 * Get response operation definition
 */
export const getResponseOperation: OperationDefinition = {
    id: "getResponse",
    name: "Get Response",
    description: "Get a single form response by ID",
    category: "responses",
    retryable: true,
    inputSchema: getResponseSchema
};

/**
 * Execute get response operation
 */
export async function executeGetResponse(
    client: GoogleFormsClient,
    params: GetResponseParams
): Promise<OperationResult> {
    try {
        const response = await client.getResponse(params.formId, params.responseId);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get response",
                retryable: true
            }
        };
    }
}
