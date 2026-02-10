import { z } from "zod";
import { PaginationSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloudflareClient } from "../../client/CloudflareClient";

/**
 * List Zones operation schema
 */
export const listZonesSchema = PaginationSchema.extend({
    name: z.string().optional().describe("Filter by zone name"),
    status: z
        .enum(["active", "pending", "initializing", "moved", "deleted", "deactivated"])
        .optional()
        .describe("Filter by zone status")
});

export type ListZonesParams = z.infer<typeof listZonesSchema>;

/**
 * List Zones operation definition
 */
export const listZonesOperation: OperationDefinition = {
    id: "zones_listZones",
    name: "List Zones",
    description: "List all zones in the Cloudflare account",
    category: "zones",
    inputSchema: listZonesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list zones operation
 */
export async function executeListZones(
    client: CloudflareClient,
    params: ListZonesParams
): Promise<OperationResult> {
    try {
        const response = await client.listZones(params);

        return {
            success: true,
            data: {
                zones: response.zones.map((zone) => ({
                    id: zone.id,
                    name: zone.name,
                    status: zone.status,
                    paused: zone.paused,
                    type: zone.type,
                    developmentMode: zone.development_mode,
                    nameServers: zone.name_servers,
                    createdOn: zone.created_on,
                    modifiedOn: zone.modified_on,
                    activatedOn: zone.activated_on,
                    plan: zone.plan
                        ? {
                              id: zone.plan.id,
                              name: zone.plan.name
                          }
                        : undefined,
                    account: {
                        id: zone.account.id,
                        name: zone.account.name
                    }
                })),
                pagination: response.result_info
                    ? {
                          page: response.result_info.page,
                          perPage: response.result_info.per_page,
                          totalPages: response.result_info.total_pages,
                          totalCount: response.result_info.total_count
                      }
                    : undefined
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list zones",
                retryable: true
            }
        };
    }
}
