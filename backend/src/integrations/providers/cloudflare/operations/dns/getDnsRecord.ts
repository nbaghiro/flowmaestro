import { z } from "zod";
import { ZoneIdSchema, DNSRecordIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloudflareClient } from "../../client/CloudflareClient";

/**
 * Get DNS Record operation schema
 */
export const getDnsRecordSchema = z.object({
    zoneId: ZoneIdSchema,
    recordId: DNSRecordIdSchema
});

export type GetDnsRecordParams = z.infer<typeof getDnsRecordSchema>;

/**
 * Get DNS Record operation definition
 */
export const getDnsRecordOperation: OperationDefinition = {
    id: "dns_getRecord",
    name: "Get DNS Record",
    description: "Get details for a specific DNS record",
    category: "dns",
    inputSchema: getDnsRecordSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get DNS record operation
 */
export async function executeGetDnsRecord(
    client: CloudflareClient,
    params: GetDnsRecordParams
): Promise<OperationResult> {
    try {
        const record = await client.getDNSRecord(params.zoneId, params.recordId);

        return {
            success: true,
            data: {
                id: record.id,
                zoneId: record.zone_id,
                zoneName: record.zone_name,
                name: record.name,
                type: record.type,
                content: record.content,
                proxied: record.proxied,
                proxiable: record.proxiable,
                ttl: record.ttl,
                priority: record.priority,
                locked: record.locked,
                meta: record.meta,
                createdOn: record.created_on,
                modifiedOn: record.modified_on
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get DNS record",
                retryable: true
            }
        };
    }
}
