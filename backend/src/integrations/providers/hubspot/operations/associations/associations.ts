import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";

/**
 * Create Association Parameters
 */
export const createAssociationSchema = z.object({
    fromObjectType: z.string(),
    fromObjectId: z.string(),
    toObjectType: z.string(),
    toObjectId: z.string(),
    associationTypeId: z.number()
});

export type CreateAssociationParams = z.infer<typeof createAssociationSchema>;

export const createAssociationOperation: OperationDefinition = {
    id: "createAssociation",
    name: "Create Association",
    description: "Create an association between two HubSpot objects",
    category: "crm",
    inputSchema: createAssociationSchema,
    retryable: true,
    timeout: 10000
};

export async function executeCreateAssociation(
    client: HubspotClient,
    params: CreateAssociationParams
): Promise<OperationResult> {
    try {
        const endpoint = `/crm/v3/objects/${params.fromObjectType}/${params.fromObjectId}/associations/${params.toObjectType}/${params.toObjectId}/${params.associationTypeId}`;

        const response = await client.put(endpoint);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create association",
                retryable: false
            }
        };
    }
}

/**
 * Delete Association Parameters
 */
export const deleteAssociationSchema = z.object({
    fromObjectType: z.string(),
    fromObjectId: z.string(),
    toObjectType: z.string(),
    toObjectId: z.string(),
    associationTypeId: z.number()
});

export type DeleteAssociationParams = z.infer<typeof deleteAssociationSchema>;

export const deleteAssociationOperation: OperationDefinition = {
    id: "deleteAssociation",
    name: "Delete Association",
    description: "Delete an association between two HubSpot objects",
    category: "crm",
    inputSchema: deleteAssociationSchema,
    retryable: true,
    timeout: 10000
};

export async function executeDeleteAssociation(
    client: HubspotClient,
    params: DeleteAssociationParams
): Promise<OperationResult> {
    try {
        const endpoint = `/crm/v3/objects/${params.fromObjectType}/${params.fromObjectId}/associations/${params.toObjectType}/${params.toObjectId}/${params.associationTypeId}`;

        await client.delete(endpoint);

        return {
            success: true,
            data: {
                deleted: true,
                fromObjectType: params.fromObjectType,
                fromObjectId: params.fromObjectId,
                toObjectType: params.toObjectType,
                toObjectId: params.toObjectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete association",
                retryable: false
            }
        };
    }
}

/**
 * List Associations Parameters
 */
export const listAssociationsSchema = z.object({
    objectType: z.string(),
    objectId: z.string(),
    toObjectType: z.string()
});

export type ListAssociationsParams = z.infer<typeof listAssociationsSchema>;

export const listAssociationsOperation: OperationDefinition = {
    id: "listAssociations",
    name: "List Associations",
    description: "List all associations for an object",
    category: "crm",
    inputSchema: listAssociationsSchema,
    retryable: true,
    timeout: 10000
};

export async function executeListAssociations(
    client: HubspotClient,
    params: ListAssociationsParams
): Promise<OperationResult> {
    try {
        const endpoint = `/crm/v3/objects/${params.objectType}/${params.objectId}/associations/${params.toObjectType}`;

        const response = await client.get(endpoint);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list associations",
                retryable: false
            }
        };
    }
}

/**
 * Batch Create Associations Parameters
 */
export const batchCreateAssociationsSchema = z.object({
    fromObjectType: z.string(),
    toObjectType: z.string(),
    inputs: z
        .array(
            z.object({
                from: z.object({
                    id: z.string()
                }),
                to: z.object({
                    id: z.string()
                }),
                type: z.string()
            })
        )
        .min(1)
        .max(100)
});

export type BatchCreateAssociationsParams = z.infer<typeof batchCreateAssociationsSchema>;

export const batchCreateAssociationsOperation: OperationDefinition = {
    id: "batchCreateAssociations",
    name: "Batch Create Associations",
    description: "Create multiple associations at once (max 100)",
    category: "crm",
    inputSchema: batchCreateAssociationsSchema,
    retryable: true,
    timeout: 10000
};

export async function executeBatchCreateAssociations(
    client: HubspotClient,
    params: BatchCreateAssociationsParams
): Promise<OperationResult> {
    try {
        const endpoint = `/crm/v3/associations/${params.fromObjectType}/${params.toObjectType}/batch/create`;

        const response = await client.post(endpoint, {
            inputs: params.inputs
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
                message:
                    error instanceof Error ? error.message : "Failed to batch create associations",
                retryable: false
            }
        };
    }
}
