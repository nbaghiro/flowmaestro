import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SalesforceClient } from "../client/SalesforceClient";

/**
 * Describe object input schema
 */
export const describeObjectSchema = z.object({
    objectType: z
        .string()
        .min(1)
        .describe("Salesforce object type to describe (e.g., Account, Contact, Lead, Custom__c)")
});

export type DescribeObjectParams = z.infer<typeof describeObjectSchema>;

/**
 * Describe object operation definition
 */
export const describeObjectOperation: OperationDefinition = {
    id: "describeObject",
    name: "Describe Salesforce Object",
    description:
        "Get metadata about a Salesforce object including its fields, relationships, and picklist values",
    category: "metadata",
    retryable: true,
    inputSchema: describeObjectSchema
};

/**
 * Execute describe object operation
 */
export async function executeDescribeObject(
    client: SalesforceClient,
    params: DescribeObjectParams
): Promise<OperationResult> {
    try {
        const describe = await client.describeSObject(params.objectType);

        // Return a cleaned up version of the describe result
        return {
            success: true,
            data: {
                name: describe.name,
                label: describe.label,
                labelPlural: describe.labelPlural,
                keyPrefix: describe.keyPrefix,
                queryable: describe.queryable,
                createable: describe.createable,
                updateable: describe.updateable,
                deletable: describe.deletable,
                searchable: describe.searchable,
                fields: describe.fields.map((field) => ({
                    name: field.name,
                    label: field.label,
                    type: field.type,
                    length: field.length,
                    precision: field.precision,
                    scale: field.scale,
                    nillable: field.nillable,
                    createable: field.createable,
                    updateable: field.updateable,
                    defaultValue: field.defaultValue,
                    picklistValues: field.picklistValues,
                    referenceTo: field.referenceTo,
                    relationshipName: field.relationshipName,
                    externalId: field.externalId,
                    idLookup: field.idLookup,
                    unique: field.unique
                })),
                childRelationships: describe.childRelationships,
                recordTypeInfos: describe.recordTypeInfos
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to describe object";

        // Check if it's an invalid type error
        if (errorMessage.includes("INVALID_TYPE") || errorMessage.includes("does not exist")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Object type '${params.objectType}' does not exist or is not accessible`,
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
