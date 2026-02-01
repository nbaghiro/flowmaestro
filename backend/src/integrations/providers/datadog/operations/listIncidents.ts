import { z } from "zod";
import type { DatadogIncidentOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { DatadogClient } from "../client/DatadogClient";

export const listIncidentsSchema = z.object({
    pageOffset: z.number().int().min(0).optional().describe("Pagination offset"),
    pageSize: z.number().int().min(1).max(100).optional().describe("Results per page (max 100)")
});

export type ListIncidentsParams = z.infer<typeof listIncidentsSchema>;

export const listIncidentsOperation: OperationDefinition = {
    id: "listIncidents",
    name: "List Incidents",
    description: "Get all incidents from Datadog",
    category: "incidents",
    inputSchema: listIncidentsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListIncidents(
    client: DatadogClient,
    params: ListIncidentsParams
): Promise<OperationResult> {
    try {
        const result = await client.listIncidents({
            page_offset: params.pageOffset,
            page_size: params.pageSize
        });

        const incidents: DatadogIncidentOutput[] = (result.data || []).map((i) => ({
            id: i.id!,
            title: i.attributes?.title || "",
            customerImpactScope: i.attributes?.customer_impact_scope,
            customerImpacted: i.attributes?.customer_impacted,
            severity: i.attributes?.severity,
            state: i.attributes?.state,
            detected: i.attributes?.detected,
            created: i.attributes?.created,
            modified: i.attributes?.modified,
            resolved: i.attributes?.resolved
        }));

        return {
            success: true,
            data: {
                incidents,
                count: incidents.length,
                pagination: result.meta?.pagination
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list incidents",
                retryable: true
            }
        };
    }
}
