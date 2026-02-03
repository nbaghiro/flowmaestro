import { z } from "zod";
import { ZoneIdSchema, DNSRecordIdSchema, DNSRecordTypeSchema, TTLSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloudflareClient } from "../../client/CloudflareClient";

/**
 * Update DNS Record operation schema
 */
export const updateDnsRecordSchema = z.object({
    zoneId: ZoneIdSchema,
    recordId: DNSRecordIdSchema,
    type: DNSRecordTypeSchema.optional().describe("New DNS record type"),
    name: z.string().min(1).optional().describe("New DNS record name"),
    content: z.string().min(1).optional().describe("New DNS record content"),
    ttl: TTLSchema.describe("New time to live in seconds (1 = automatic)"),
    proxied: z.boolean().optional().describe("Whether the record is proxied through Cloudflare"),
    priority: z.number().int().min(0).max(65535).optional().describe("New priority for MX records")
});

export type UpdateDnsRecordParams = z.infer<typeof updateDnsRecordSchema>;

/**
 * Update DNS Record operation definition
 */
export const updateDnsRecordOperation: OperationDefinition = {
    id: "dns_updateRecord",
    name: "Update DNS Record",
    description: "Update an existing DNS record",
    category: "dns",
    inputSchema: updateDnsRecordSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute update DNS record operation
 */
export async function executeUpdateDnsRecord(
    client: CloudflareClient,
    params: UpdateDnsRecordParams
): Promise<OperationResult> {
    try {
        const { zoneId, recordId, ...updateData } = params;
        const record = await client.updateDNSRecord(zoneId, recordId, updateData);

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
                createdOn: record.created_on,
                modifiedOn: record.modified_on,
                message: "DNS record updated successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update DNS record",
                retryable: false
            }
        };
    }
}
