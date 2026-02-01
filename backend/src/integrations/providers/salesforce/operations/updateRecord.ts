import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SalesforceClient } from "../client/SalesforceClient";

/**
 * Update record input schema
 */
export const updateRecordSchema = z.object({
    objectType: z.string().min(1).describe("Salesforce object type (e.g., Account, Contact, Lead)"),
    recordId: z.string().min(15).max(18).describe("Salesforce record ID (15 or 18 character)"),
    data: z.record(z.unknown()).describe("Field values to update")
});

export type UpdateRecordParams = z.infer<typeof updateRecordSchema>;

/**
 * Update record operation definition
 */
export const updateRecordOperation: OperationDefinition = {
    id: "updateRecord",
    name: "Update Salesforce Record",
    description: "Update an existing record in Salesforce",
    category: "records",
    retryable: true, // Safe to retry updates
    inputSchema: updateRecordSchema
};

/**
 * Execute update record operation
 */
export async function executeUpdateRecord(
    client: SalesforceClient,
    params: UpdateRecordParams
): Promise<OperationResult> {
    try {
        await client.updateRecord(
            params.objectType,
            params.recordId,
            params.data as Record<string, unknown>
        );

        return {
            success: true,
            data: {
                id: params.recordId,
                updated: true
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to update record";

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

        // Check if it's a validation error
        if (
            errorMessage.includes("INVALID_FIELD") ||
            errorMessage.includes("REQUIRED_FIELD_MISSING")
        ) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: errorMessage,
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
