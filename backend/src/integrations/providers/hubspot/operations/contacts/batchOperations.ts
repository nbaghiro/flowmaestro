import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotContact, HubspotBatchResponse } from "../types";

/**
 * Batch Create Contacts Parameters
 */
export const batchCreateContactsSchema = z.object({
    inputs: z
        .array(
            z.object({
                properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
            })
        )
        .min(1)
        .max(100)
});

export type BatchCreateContactsParams = z.infer<typeof batchCreateContactsSchema>;

export const batchCreateContactsOperation: OperationDefinition = {
    id: "batchCreateContacts",
    name: "Batch Create Contacts",
    description: "Create multiple contacts at once (max 100)",
    category: "crm",
    inputSchema: batchCreateContactsSchema,
    retryable: true,
    timeout: 10000
};

export async function executeBatchCreateContacts(
    client: HubspotClient,
    params: BatchCreateContactsParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotBatchResponse<HubspotContact>>(
            "/crm/v3/objects/contacts/batch/create",
            params
        );

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to batch create contacts",
                retryable: false
            }
        };
    }
}

/**
 * Batch Update Contacts Parameters
 */
export const batchUpdateContactsSchema = z.object({
    inputs: z
        .array(
            z.object({
                id: z.string(),
                properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
            })
        )
        .min(1)
        .max(100)
});

export type BatchUpdateContactsParams = z.infer<typeof batchUpdateContactsSchema>;

export const batchUpdateContactsOperation: OperationDefinition = {
    id: "batchUpdateContacts",
    name: "Batch Update Contacts",
    description: "Update multiple contacts at once (max 100)",
    category: "crm",
    inputSchema: batchUpdateContactsSchema,
    retryable: true,
    timeout: 10000
};

export async function executeBatchUpdateContacts(
    client: HubspotClient,
    params: BatchUpdateContactsParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotBatchResponse<HubspotContact>>(
            "/crm/v3/objects/contacts/batch/update",
            params
        );

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to batch update contacts",
                retryable: false
            }
        };
    }
}

/**
 * Batch Read Contacts Parameters
 */
export const batchReadContactsSchema = z.object({
    inputs: z
        .array(
            z.object({
                id: z.string()
            })
        )
        .min(1)
        .max(100),
    properties: z.array(z.string()).optional()
});

export type BatchReadContactsParams = z.infer<typeof batchReadContactsSchema>;

export const batchReadContactsOperation: OperationDefinition = {
    id: "batchReadContacts",
    name: "Batch Read Contacts",
    description: "Read multiple contacts by IDs (max 100)",
    category: "crm",
    inputSchema: batchReadContactsSchema,
    retryable: true,
    timeout: 10000
};

export async function executeBatchReadContacts(
    client: HubspotClient,
    params: BatchReadContactsParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotBatchResponse<HubspotContact>>(
            "/crm/v3/objects/contacts/batch/read",
            {
                inputs: params.inputs,
                properties: params.properties
            }
        );

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to batch read contacts",
                retryable: false
            }
        };
    }
}

/**
 * Batch Upsert Contacts Parameters
 */
export const batchUpsertContactsSchema = z.object({
    inputs: z
        .array(
            z.object({
                properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
                id: z.string().optional(),
                idProperty: z.string().optional()
            })
        )
        .min(1)
        .max(100)
});

export type BatchUpsertContactsParams = z.infer<typeof batchUpsertContactsSchema>;

export const batchUpsertContactsOperation: OperationDefinition = {
    id: "batchUpsertContacts",
    name: "Batch Upsert Contacts",
    description: "Create or update multiple contacts at once (max 100)",
    category: "crm",
    inputSchema: batchUpsertContactsSchema,
    retryable: true,
    timeout: 10000
};

export async function executeBatchUpsertContacts(
    client: HubspotClient,
    params: BatchUpsertContactsParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotBatchResponse<HubspotContact>>(
            "/crm/v3/objects/contacts/batch/upsert",
            params
        );

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to batch upsert contacts",
                retryable: false
            }
        };
    }
}
