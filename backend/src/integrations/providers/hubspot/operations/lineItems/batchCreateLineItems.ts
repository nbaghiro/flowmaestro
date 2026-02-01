import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotBatchResponse, HubspotObject } from "../types";

/**
 * Batch Create Line Items Parameters
 */
export const batchCreateLineItemsSchema = z.object({
    inputs: z.array(
        z.object({
            properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
            associations: z
                .array(
                    z.object({
                        to: z.object({
                            id: z.string()
                        }),
                        types: z.array(
                            z.object({
                                associationCategory: z.string(),
                                associationTypeId: z.number()
                            })
                        )
                    })
                )
                .optional()
        })
    )
});

export type BatchCreateLineItemsParams = z.infer<typeof batchCreateLineItemsSchema>;

/**
 * Operation Definition
 */
export const batchCreateLineItemsOperation: OperationDefinition = {
    id: "batchCreateLineItems",
    name: "Batch Create Line Items",
    description: "Create multiple line items in HubSpot CRM in a single request",
    category: "crm",
    inputSchema: batchCreateLineItemsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute Batch Create Line Items
 */
export async function executeBatchCreateLineItems(
    client: HubspotClient,
    params: BatchCreateLineItemsParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotBatchResponse<HubspotObject>>(
            "/crm/v3/objects/line_items/batch/create",
            { inputs: params.inputs }
        );

        return {
            success: true,
            data: {
                status: response.status,
                results: response.results,
                startedAt: response.startedAt,
                completedAt: response.completedAt
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to batch create line items",
                retryable: false
            }
        };
    }
}
