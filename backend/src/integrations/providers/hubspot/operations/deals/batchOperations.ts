import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotDeal, HubspotBatchResponse } from "../types";

/**
 * Batch Create Deals Parameters
 */
export const batchCreateDealsSchema = z.object({
    inputs: z
        .array(
            z.object({
                properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
            })
        )
        .min(1)
        .max(100)
});

export type BatchCreateDealsParams = z.infer<typeof batchCreateDealsSchema>;

export const batchCreateDealsOperation: OperationDefinition = {
    id: "batchCreateDeals",
    name: "Batch Create Deals",
    description: "Create multiple deals at once (max 100)",
    category: "crm",
    inputSchema: batchCreateDealsSchema,
    retryable: true,
    timeout: 10000
};

export async function executeBatchCreateDeals(
    client: HubspotClient,
    params: BatchCreateDealsParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotBatchResponse<HubspotDeal>>(
            "/crm/v3/objects/deals/batch/create",
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
                message: error instanceof Error ? error.message : "Failed to batch create deals",
                retryable: false
            }
        };
    }
}

/**
 * Batch Update Deals Parameters
 */
export const batchUpdateDealsSchema = z.object({
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

export type BatchUpdateDealsParams = z.infer<typeof batchUpdateDealsSchema>;

export const batchUpdateDealsOperation: OperationDefinition = {
    id: "batchUpdateDeals",
    name: "Batch Update Deals",
    description: "Update multiple deals at once (max 100)",
    category: "crm",
    inputSchema: batchUpdateDealsSchema,
    retryable: true,
    timeout: 10000
};

export async function executeBatchUpdateDeals(
    client: HubspotClient,
    params: BatchUpdateDealsParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotBatchResponse<HubspotDeal>>(
            "/crm/v3/objects/deals/batch/update",
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
                message: error instanceof Error ? error.message : "Failed to batch update deals",
                retryable: false
            }
        };
    }
}

/**
 * Batch Read Deals Parameters
 */
export const batchReadDealsSchema = z.object({
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

export type BatchReadDealsParams = z.infer<typeof batchReadDealsSchema>;

export const batchReadDealsOperation: OperationDefinition = {
    id: "batchReadDeals",
    name: "Batch Read Deals",
    description: "Read multiple deals by IDs (max 100)",
    category: "crm",
    inputSchema: batchReadDealsSchema,
    retryable: true,
    timeout: 10000
};

export async function executeBatchReadDeals(
    client: HubspotClient,
    params: BatchReadDealsParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotBatchResponse<HubspotDeal>>(
            "/crm/v3/objects/deals/batch/read",
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
                message: error instanceof Error ? error.message : "Failed to batch read deals",
                retryable: false
            }
        };
    }
}

/**
 * Batch Upsert Deals Parameters
 */
export const batchUpsertDealsSchema = z.object({
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

export type BatchUpsertDealsParams = z.infer<typeof batchUpsertDealsSchema>;

export const batchUpsertDealsOperation: OperationDefinition = {
    id: "batchUpsertDeals",
    name: "Batch Upsert Deals",
    description: "Create or update multiple deals at once (max 100)",
    category: "crm",
    inputSchema: batchUpsertDealsSchema,
    retryable: true,
    timeout: 10000
};

export async function executeBatchUpsertDeals(
    client: HubspotClient,
    params: BatchUpsertDealsParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotBatchResponse<HubspotDeal>>(
            "/crm/v3/objects/deals/batch/upsert",
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
                message: error instanceof Error ? error.message : "Failed to batch upsert deals",
                retryable: false
            }
        };
    }
}
