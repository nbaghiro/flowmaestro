import { z } from "zod";
import { ZoneIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloudflareClient } from "../../client/CloudflareClient";

/**
 * Get Zone operation schema
 */
export const getZoneSchema = z.object({
    zoneId: ZoneIdSchema
});

export type GetZoneParams = z.infer<typeof getZoneSchema>;

/**
 * Get Zone operation definition
 */
export const getZoneOperation: OperationDefinition = {
    id: "zones_getZone",
    name: "Get Zone",
    description: "Get details for a specific zone by ID",
    category: "zones",
    inputSchema: getZoneSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get zone operation
 */
export async function executeGetZone(
    client: CloudflareClient,
    params: GetZoneParams
): Promise<OperationResult> {
    try {
        const zone = await client.getZone(params.zoneId);

        return {
            success: true,
            data: {
                id: zone.id,
                name: zone.name,
                status: zone.status,
                paused: zone.paused,
                type: zone.type,
                developmentMode: zone.development_mode,
                nameServers: zone.name_servers,
                originalNameServers: zone.original_name_servers,
                originalRegistrar: zone.original_registrar,
                originalDnshost: zone.original_dnshost,
                createdOn: zone.created_on,
                modifiedOn: zone.modified_on,
                activatedOn: zone.activated_on,
                plan: zone.plan
                    ? {
                          id: zone.plan.id,
                          name: zone.plan.name,
                          price: zone.plan.price,
                          currency: zone.plan.currency,
                          frequency: zone.plan.frequency
                      }
                    : undefined,
                account: {
                    id: zone.account.id,
                    name: zone.account.name
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get zone",
                retryable: true
            }
        };
    }
}
