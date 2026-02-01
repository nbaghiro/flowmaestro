import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotCompany, HubspotBatchResponse } from "../types";

/**
 * Batch Create Companies Parameters
 */
export const batchCreateCompaniesSchema = z.object({
    inputs: z
        .array(
            z.object({
                properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
            })
        )
        .min(1)
        .max(100)
});

export type BatchCreateCompaniesParams = z.infer<typeof batchCreateCompaniesSchema>;

export const batchCreateCompaniesOperation: OperationDefinition = {
    id: "batchCreateCompanies",
    name: "Batch Create Companies",
    description: "Create multiple companies at once (max 100)",
    category: "crm",
    inputSchema: batchCreateCompaniesSchema,
    retryable: true,
    timeout: 10000
};

export async function executeBatchCreateCompanies(
    client: HubspotClient,
    params: BatchCreateCompaniesParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotBatchResponse<HubspotCompany>>(
            "/crm/v3/objects/companies/batch/create",
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
                message:
                    error instanceof Error ? error.message : "Failed to batch create companies",
                retryable: false
            }
        };
    }
}

/**
 * Batch Update Companies Parameters
 */
export const batchUpdateCompaniesSchema = z.object({
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

export type BatchUpdateCompaniesParams = z.infer<typeof batchUpdateCompaniesSchema>;

export const batchUpdateCompaniesOperation: OperationDefinition = {
    id: "batchUpdateCompanies",
    name: "Batch Update Companies",
    description: "Update multiple companies at once (max 100)",
    category: "crm",
    inputSchema: batchUpdateCompaniesSchema,
    retryable: true,
    timeout: 10000
};

export async function executeBatchUpdateCompanies(
    client: HubspotClient,
    params: BatchUpdateCompaniesParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotBatchResponse<HubspotCompany>>(
            "/crm/v3/objects/companies/batch/update",
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
                message:
                    error instanceof Error ? error.message : "Failed to batch update companies",
                retryable: false
            }
        };
    }
}

/**
 * Batch Read Companies Parameters
 */
export const batchReadCompaniesSchema = z.object({
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

export type BatchReadCompaniesParams = z.infer<typeof batchReadCompaniesSchema>;

export const batchReadCompaniesOperation: OperationDefinition = {
    id: "batchReadCompanies",
    name: "Batch Read Companies",
    description: "Read multiple companies by IDs (max 100)",
    category: "crm",
    inputSchema: batchReadCompaniesSchema,
    retryable: true,
    timeout: 10000
};

export async function executeBatchReadCompanies(
    client: HubspotClient,
    params: BatchReadCompaniesParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotBatchResponse<HubspotCompany>>(
            "/crm/v3/objects/companies/batch/read",
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
                message: error instanceof Error ? error.message : "Failed to batch read companies",
                retryable: false
            }
        };
    }
}

/**
 * Batch Upsert Companies Parameters
 */
export const batchUpsertCompaniesSchema = z.object({
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

export type BatchUpsertCompaniesParams = z.infer<typeof batchUpsertCompaniesSchema>;

export const batchUpsertCompaniesOperation: OperationDefinition = {
    id: "batchUpsertCompanies",
    name: "Batch Upsert Companies",
    description: "Create or update multiple companies at once (max 100)",
    category: "crm",
    inputSchema: batchUpsertCompaniesSchema,
    retryable: true,
    timeout: 10000
};

export async function executeBatchUpsertCompanies(
    client: HubspotClient,
    params: BatchUpsertCompaniesParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotBatchResponse<HubspotCompany>>(
            "/crm/v3/objects/companies/batch/upsert",
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
                message:
                    error instanceof Error ? error.message : "Failed to batch upsert companies",
                retryable: false
            }
        };
    }
}
