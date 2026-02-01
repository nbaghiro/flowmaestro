import { z } from "zod";
import type { HubspotOwner } from "./listOwners";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";

/**
 * Get Owner Parameters
 */
export const getOwnerSchema = z.object({
    ownerId: z.string()
});

export type GetOwnerParams = z.infer<typeof getOwnerSchema>;

/**
 * Operation Definition
 */
export const getOwnerOperation: OperationDefinition = {
    id: "getOwner",
    name: "Get Owner",
    description: "Retrieve an owner by ID from HubSpot CRM",
    category: "crm",
    inputSchema: getOwnerSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Owner
 */
export async function executeGetOwner(
    client: HubspotClient,
    params: GetOwnerParams
): Promise<OperationResult> {
    try {
        const response = await client.get<HubspotOwner>(`/crm/v3/owners/${params.ownerId}`);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get owner",
                retryable: false
            }
        };
    }
}
