import { z } from "zod";
import { ZoneIdSchema, PaginationSchema, DNSRecordTypeSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloudflareClient } from "../../client/CloudflareClient";

/**
 * List DNS Records operation schema
 */
export const listDnsRecordsSchema = PaginationSchema.extend({
    zoneId: ZoneIdSchema,
    type: DNSRecordTypeSchema.optional().describe("Filter by DNS record type"),
    name: z.string().optional().describe("Filter by record name (full or partial)"),
    content: z.string().optional().describe("Filter by record content")
});

export type ListDnsRecordsParams = z.infer<typeof listDnsRecordsSchema>;

/**
 * List DNS Records operation definition
 */
export const listDnsRecordsOperation: OperationDefinition = {
    id: "dns_listRecords",
    name: "List DNS Records",
    description: "List all DNS records for a zone",
    category: "dns",
    inputSchema: listDnsRecordsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list DNS records operation
 */
export async function executeListDnsRecords(
    client: CloudflareClient,
    params: ListDnsRecordsParams
): Promise<OperationResult> {
    try {
        const { zoneId, ...queryParams } = params;
        const response = await client.listDNSRecords(zoneId, queryParams);

        return {
            success: true,
            data: {
                records: response.records.map((record) => ({
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
                    createdOn: record.created_on,
                    modifiedOn: record.modified_on
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
                message: error instanceof Error ? error.message : "Failed to list DNS records",
                retryable: true
            }
        };
    }
}
