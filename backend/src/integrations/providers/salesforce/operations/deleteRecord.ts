import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SalesforceClient } from "../client/SalesforceClient";

/**
 * Delete record input schema
 */
export const deleteRecordSchema = z.object({
    objectType: z.string().min(1).describe("Salesforce object type (e.g., Account, Contact, Lead)"),
    recordId: z.string().min(15).max(18).describe("Salesforce record ID (15 or 18 character)")
});

export type DeleteRecordParams = z.infer<typeof deleteRecordSchema>;

/**
 * Delete record operation definition
 */
export const deleteRecordOperation: OperationDefinition = {
    id: "deleteRecord",
    name: "Delete Salesforce Record",
    description: "Delete a record from Salesforce (moves to Recycle Bin)",
    category: "records",
    retryable: false, // Don't retry deletes
    inputSchema: deleteRecordSchema
};

/**
 * Execute delete record operation
 */
export async function executeDeleteRecord(
    client: SalesforceClient,
    params: DeleteRecordParams
): Promise<OperationResult> {
    try {
        await client.deleteRecord(params.objectType, params.recordId);

        return {
            success: true,
            data: {
                id: params.recordId,
                deleted: true
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete record";

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

        // Check if it's a permission error
        if (
            errorMessage.includes("INSUFFICIENT_ACCESS") ||
            errorMessage.includes("Permission denied")
        ) {
            return {
                success: false,
                error: {
                    type: "permission",
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
                retryable: false
            }
        };
    }
}
