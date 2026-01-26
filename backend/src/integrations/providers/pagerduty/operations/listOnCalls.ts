import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PagerDutyClient } from "../client/PagerDutyClient";

export const listOnCallsSchema = z.object({
    escalationPolicyIds: z.array(z.string()).optional().describe("Filter by escalation policy IDs"),
    scheduleIds: z.array(z.string()).optional().describe("Filter by schedule IDs"),
    userIds: z.array(z.string()).optional().describe("Filter by user IDs"),
    since: z.string().optional().describe("Start date/time for the on-call window (ISO 8601)"),
    until: z.string().optional().describe("End date/time for the on-call window (ISO 8601)"),
    earliest: z
        .boolean()
        .optional()
        .default(false)
        .describe("Only return the first on-call for each escalation level"),
    include: z
        .array(z.enum(["escalation_policies", "schedules", "users"]))
        .optional()
        .describe("Additional data to include in the response"),
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .default(25)
        .describe("Maximum number of results (1-100)"),
    offset: z.number().min(0).optional().default(0).describe("Offset for pagination")
});

export type ListOnCallsParams = z.infer<typeof listOnCallsSchema>;

export const listOnCallsOperation: OperationDefinition = {
    id: "listOnCalls",
    name: "List On-Calls",
    description: "Get current on-call users for escalation policies and schedules",
    category: "oncall",
    inputSchema: listOnCallsSchema,
    inputSchemaJSON: toJSONSchema(listOnCallsSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListOnCalls(
    client: PagerDutyClient,
    params: ListOnCallsParams
): Promise<OperationResult> {
    try {
        const response = await client.listOnCalls({
            escalation_policy_ids: params.escalationPolicyIds,
            schedule_ids: params.scheduleIds,
            user_ids: params.userIds,
            since: params.since,
            until: params.until,
            earliest: params.earliest,
            include: params.include,
            limit: params.limit,
            offset: params.offset
        });

        return {
            success: true,
            data: {
                onCalls: response.data,
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
                message: error instanceof Error ? error.message : "Failed to list on-calls",
                retryable: true
            }
        };
    }
}
