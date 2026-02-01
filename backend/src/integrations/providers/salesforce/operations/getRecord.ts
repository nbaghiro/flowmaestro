import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SalesforceClient } from "../client/SalesforceClient";

/**
 * Get record input schema
 */
export const getRecordSchema = z.object({
    objectType: z.string().min(1).describe("Salesforce object type (e.g., Account, Contact, Lead)"),
    recordId: z.string().min(15).max(18).describe("Salesforce record ID (15 or 18 character)"),
    fields: z
        .array(z.string())
        .optional()
        .describe("Specific fields to retrieve (if not provided, returns all accessible fields)")
});

export type GetRecordParams = z.infer<typeof getRecordSchema>;

/**
 * Get record operation definition
 */
export const getRecordOperation: OperationDefinition = {
    id: "getRecord",
    name: "Get Salesforce Record",
    description: "Retrieve a single record by its ID from Salesforce",
    category: "records",
    retryable: true,
    inputSchema: getRecordSchema
};

/**
 * Execute get record operation
 */
export async function executeGetRecord(
    client: SalesforceClient,
    params: GetRecordParams
): Promise<OperationResult> {
    try {
        const record = await client.getRecord(params.objectType, params.recordId, params.fields);

        return {
            success: true,
            data: record
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to get record";

        // Check if it's a not found error
        if (errorMessage.includes("not found") || errorMessage.includes("NOT_FOUND")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Record ${params.recordId} not found in ${params.objectType}`,
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: errorMessage,
                retryable: true
            }
        };
    }
}
