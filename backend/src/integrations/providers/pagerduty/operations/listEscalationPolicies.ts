import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PagerDutyClient } from "../client/PagerDutyClient";

export const listEscalationPoliciesSchema = z.object({
    query: z.string().optional().describe("Search query to filter escalation policies by name"),
    userIds: z.array(z.string()).optional().describe("Filter by user IDs on the policy"),
    teamIds: z.array(z.string()).optional().describe("Filter by team IDs"),
    include: z
        .array(z.enum(["services", "teams", "targets"]))
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

export type ListEscalationPoliciesParams = z.infer<typeof listEscalationPoliciesSchema>;

export const listEscalationPoliciesOperation: OperationDefinition = {
    id: "listEscalationPolicies",
    name: "List Escalation Policies",
    description: "List escalation policies with optional filtering",
    category: "policies",
    inputSchema: listEscalationPoliciesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListEscalationPolicies(
    client: PagerDutyClient,
    params: ListEscalationPoliciesParams
): Promise<OperationResult> {
    try {
        const response = await client.listEscalationPolicies({
            query: params.query,
            user_ids: params.userIds,
            team_ids: params.teamIds,
            include: params.include,
            sort_by: params.sortBy,
            limit: params.limit,
            offset: params.offset
        });

        return {
            success: true,
            data: {
                escalationPolicies: response.data,
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
                message:
                    error instanceof Error ? error.message : "Failed to list escalation policies",
                retryable: true
            }
        };
    }
}
