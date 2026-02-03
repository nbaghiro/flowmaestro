import { z } from "zod";
import { ZoneIdSchema, DNSRecordTypeSchema, TTLSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloudflareClient } from "../../client/CloudflareClient";

/**
 * Create DNS Record operation schema
 */
export const createDnsRecordSchema = z.object({
    zoneId: ZoneIdSchema,
    type: DNSRecordTypeSchema.describe("DNS record type (A, AAAA, CNAME, TXT, MX, etc.)"),
    name: z.string().min(1).describe("DNS record name (e.g., '@' for root, 'www', 'api')"),
    content: z.string().min(1).describe("DNS record content (IP address, hostname, or text)"),
    ttl: TTLSchema.default(1).describe("Time to live in seconds (1 = automatic)"),
    proxied: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether the record is proxied through Cloudflare"),
    priority: z
        .number()
        .int()
        .min(0)
        .max(65535)
        .optional()
        .describe("Priority for MX records (required for MX type)")
});

export type CreateDnsRecordParams = z.infer<typeof createDnsRecordSchema>;

/**
 * Create DNS Record operation definition
 */
export const createDnsRecordOperation: OperationDefinition = {
    id: "dns_createRecord",
    name: "Create DNS Record",
    description: "Create a new DNS record in a zone",
    category: "dns",
    inputSchema: createDnsRecordSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute create DNS record operation
 */
export async function executeCreateDnsRecord(
    client: CloudflareClient,
    params: CreateDnsRecordParams
): Promise<OperationResult> {
    try {
        const { zoneId, ...recordData } = params;
        const record = await client.createDNSRecord(zoneId, recordData);

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
                message: "DNS record created successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create DNS record",
                retryable: false
            }
        };
    }
}
