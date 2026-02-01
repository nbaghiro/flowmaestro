import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PagerDutyClient } from "../client/PagerDutyClient";

export const listServicesSchema = z.object({
    query: z.string().optional().describe("Search query to filter services by name"),
    teamIds: z.array(z.string()).optional().describe("Filter by team IDs"),
    include: z
        .array(z.enum(["escalation_policies", "teams", "integrations"]))
        .optional()
        .describe("Additional data to include in the response"),
    sortBy: z.enum(["name", "created_at"]).optional().describe("Sort field"),
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .default(25)
        .describe("Maximum number of results (1-100)"),
    offset: z.number().min(0).optional().default(0).describe("Offset for pagination")
});

export type ListServicesParams = z.infer<typeof listServicesSchema>;

export const listServicesOperation: OperationDefinition = {
    id: "listServices",
    name: "List Services",
    description: "List all services with optional filtering",
    category: "services",
    inputSchema: listServicesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListServices(
    client: PagerDutyClient,
    params: ListServicesParams
): Promise<OperationResult> {
    try {
        const response = await client.listServices({
            query: params.query,
            team_ids: params.teamIds,
            include: params.include,
            sort_by: params.sortBy,
            limit: params.limit,
            offset: params.offset
        });

        return {
            success: true,
            data: {
                services: response.data,
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
                message: error instanceof Error ? error.message : "Failed to list services",
                retryable: true
            }
        };
    }
}
