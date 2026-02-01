import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotListResponse } from "../types";

/**
 * HubSpot Owner type
 */
export interface HubspotOwner {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    userId?: number;
    createdAt: string;
    updatedAt: string;
    archived: boolean;
}

/**
 * List Owners Parameters
 */
export const listOwnersSchema = z.object({
    limit: z.number().min(1).max(100).optional().default(10),
    after: z.string().optional(),
    archived: z.boolean().optional()
});

export type ListOwnersParams = z.infer<typeof listOwnersSchema>;

/**
 * Operation Definition
 */
export const listOwnersOperation: OperationDefinition = {
    id: "listOwners",
    name: "List Owners",
    description: "List all owners in HubSpot CRM with pagination",
    category: "crm",
    inputSchema: listOwnersSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute List Owners
 */
export async function executeListOwners(
    client: HubspotClient,
    params: ListOwnersParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            limit: params.limit
        };

        if (params.after) {
            queryParams.after = params.after;
        }

        if (params.archived !== undefined) {
            queryParams.archived = params.archived;
        }

        const response = await client.get<HubspotListResponse<HubspotOwner>>(
            "/crm/v3/owners",
            queryParams
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
                message: error instanceof Error ? error.message : "Failed to list owners",
                retryable: false
            }
        };
    }
}
