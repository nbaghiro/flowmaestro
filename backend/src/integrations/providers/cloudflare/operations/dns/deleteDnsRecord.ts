import { z } from "zod";
import { ZoneIdSchema, DNSRecordIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloudflareClient } from "../../client/CloudflareClient";

/**
 * Delete DNS Record operation schema
 */
export const deleteDnsRecordSchema = z.object({
    zoneId: ZoneIdSchema,
    recordId: DNSRecordIdSchema
});

export type DeleteDnsRecordParams = z.infer<typeof deleteDnsRecordSchema>;

/**
 * Delete DNS Record operation definition
 */
export const deleteDnsRecordOperation: OperationDefinition = {
    id: "dns_deleteRecord",
    name: "Delete DNS Record",
    description: "Delete a DNS record from a zone",
    category: "dns",
    inputSchema: deleteDnsRecordSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute delete DNS record operation
 */
export async function executeDeleteDnsRecord(
    client: CloudflareClient,
    params: DeleteDnsRecordParams
): Promise<OperationResult> {
    try {
        const result = await client.deleteDNSRecord(params.zoneId, params.recordId);

        return {
            success: true,
            data: {
                id: result.id,
                message: "DNS record deleted successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete DNS record",
                retryable: false
            }
        };
    }
}
