import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PagerDutyClient } from "../client/PagerDutyClient";

export const listIncidentsSchema = z.object({
    statuses: z
        .array(z.enum(["triggered", "acknowledged", "resolved"]))
        .optional()
        .describe("Filter by incident status"),
    urgencies: z
        .array(z.enum(["high", "low"]))
        .optional()
        .describe("Filter by urgency level"),
    since: z.string().optional().describe("Start date/time (ISO 8601 format)"),
    until: z.string().optional().describe("End date/time (ISO 8601 format)"),
    serviceIds: z.array(z.string()).optional().describe("Filter by service IDs"),
    userIds: z.array(z.string()).optional().describe("Filter by user IDs (assigned)"),
    teamIds: z.array(z.string()).optional().describe("Filter by team IDs"),
    sortBy: z
        .enum(["incident_number", "created_at", "resolved_at", "urgency"])
        .optional()
        .describe("Sort field"),
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .default(25)
        .describe("Maximum number of results (1-100)"),
    offset: z.number().min(0).optional().default(0).describe("Offset for pagination")
});

export type ListIncidentsParams = z.infer<typeof listIncidentsSchema>;

export const listIncidentsOperation: OperationDefinition = {
    id: "listIncidents",
    name: "List Incidents",
    description: "List incidents with filtering by status, urgency, date range, and more",
    category: "incidents",
    inputSchema: listIncidentsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListIncidents(
    client: PagerDutyClient,
    params: ListIncidentsParams
): Promise<OperationResult> {
    try {
        const response = await client.listIncidents({
            statuses: params.statuses,
            urgencies: params.urgencies,
            since: params.since,
            until: params.until,
            service_ids: params.serviceIds,
            user_ids: params.userIds,
            team_ids: params.teamIds,
            sort_by: params.sortBy,
            limit: params.limit,
            offset: params.offset
        });

        return {
            success: true,
            data: {
                incidents: response.data,
                pagination: {
                    offset: response.offset,
                    limit: response.limit,
                    more: response.more,
                    total: response.total
                }
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
