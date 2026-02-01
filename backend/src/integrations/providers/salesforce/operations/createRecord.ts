import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SalesforceClient } from "../client/SalesforceClient";

/**
 * Create record input schema
 */
export const createRecordSchema = z.object({
    objectType: z
        .string()
        .min(1)
        .describe("Salesforce object type (e.g., Account, Contact, Lead, Opportunity, Custom__c)"),
    data: z.record(z.unknown()).describe("Field values for the new record")
});

export type CreateRecordParams = z.infer<typeof createRecordSchema>;

/**
 * Create record operation definition
 */
export const createRecordOperation: OperationDefinition = {
    id: "createRecord",
    name: "Create Salesforce Record",
    description: "Create a new record in Salesforce for any standard or custom object",
    category: "records",
    retryable: false, // Don't retry creates to avoid duplicates
    inputSchema: createRecordSchema
};

/**
 * Execute create record operation
 */
export async function executeCreateRecord(
    client: SalesforceClient,
    params: CreateRecordParams
): Promise<OperationResult> {
    try {
        const result = await client.createRecord(
            params.objectType,
            params.data as Record<string, unknown>
        );

        if (result.success) {
            return {
                success: true,
                data: {
                    id: result.id,
                    success: true
                }
            };
        } else {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: result.errors.map((e) => e.message).join("; "),
                    retryable: false,
                    details: { errors: result.errors }
                }
            };
        }
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create record",
                retryable: false
            }
        };
    }
}
