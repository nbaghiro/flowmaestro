import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotTicket, HubspotBatchResponse } from "../types";

/**
 * Batch Create Tickets Parameters
 */
export const batchCreateTicketsSchema = z.object({
    inputs: z
        .array(
            z.object({
                properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
            })
        )
        .min(1)
        .max(100)
});

export type BatchCreateTicketsParams = z.infer<typeof batchCreateTicketsSchema>;

export const batchCreateTicketsOperation: OperationDefinition = {
    id: "batchCreateTickets",
    name: "Batch Create Tickets",
    description: "Create multiple tickets at once (max 100)",
    category: "crm",
    inputSchema: batchCreateTicketsSchema,
    retryable: true,
    timeout: 10000
};

export async function executeBatchCreateTickets(
    client: HubspotClient,
    params: BatchCreateTicketsParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotBatchResponse<HubspotTicket>>(
            "/crm/v3/objects/tickets/batch/create",
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
                message: error instanceof Error ? error.message : "Failed to batch create tickets",
                retryable: false
            }
        };
    }
}

/**
 * Batch Update Tickets Parameters
 */
export const batchUpdateTicketsSchema = z.object({
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

export type BatchUpdateTicketsParams = z.infer<typeof batchUpdateTicketsSchema>;

export const batchUpdateTicketsOperation: OperationDefinition = {
    id: "batchUpdateTickets",
    name: "Batch Update Tickets",
    description: "Update multiple tickets at once (max 100)",
    category: "crm",
    inputSchema: batchUpdateTicketsSchema,
    retryable: true,
    timeout: 10000
};

export async function executeBatchUpdateTickets(
    client: HubspotClient,
    params: BatchUpdateTicketsParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotBatchResponse<HubspotTicket>>(
            "/crm/v3/objects/tickets/batch/update",
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
                message: error instanceof Error ? error.message : "Failed to batch update tickets",
                retryable: false
            }
        };
    }
}

/**
 * Batch Read Tickets Parameters
 */
export const batchReadTicketsSchema = z.object({
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

export type BatchReadTicketsParams = z.infer<typeof batchReadTicketsSchema>;

export const batchReadTicketsOperation: OperationDefinition = {
    id: "batchReadTickets",
    name: "Batch Read Tickets",
    description: "Read multiple tickets by IDs (max 100)",
    category: "crm",
    inputSchema: batchReadTicketsSchema,
    retryable: true,
    timeout: 10000
};

export async function executeBatchReadTickets(
    client: HubspotClient,
    params: BatchReadTicketsParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotBatchResponse<HubspotTicket>>(
            "/crm/v3/objects/tickets/batch/read",
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
                message: error instanceof Error ? error.message : "Failed to batch read tickets",
                retryable: false
            }
        };
    }
}

/**
 * Batch Upsert Tickets Parameters
 */
export const batchUpsertTicketsSchema = z.object({
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

export type BatchUpsertTicketsParams = z.infer<typeof batchUpsertTicketsSchema>;

export const batchUpsertTicketsOperation: OperationDefinition = {
    id: "batchUpsertTickets",
    name: "Batch Upsert Tickets",
    description: "Create or update multiple tickets at once (max 100)",
    category: "crm",
    inputSchema: batchUpsertTicketsSchema,
    retryable: true,
    timeout: 10000
};

export async function executeBatchUpsertTickets(
    client: HubspotClient,
    params: BatchUpsertTicketsParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotBatchResponse<HubspotTicket>>(
            "/crm/v3/objects/tickets/batch/upsert",
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
                message: error instanceof Error ? error.message : "Failed to batch upsert tickets",
                retryable: false
            }
        };
    }
}
