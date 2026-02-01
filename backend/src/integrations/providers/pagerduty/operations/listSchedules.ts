import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PagerDutyClient } from "../client/PagerDutyClient";

export const listSchedulesSchema = z.object({
    query: z.string().optional().describe("Search query to filter schedules by name"),
    include: z
        .array(
            z.enum([
                "schedule_layers",
                "final_schedule",
                "overrides_subschedule",
                "escalation_policies",
                "users"
            ])
        )
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

export type ListSchedulesParams = z.infer<typeof listSchedulesSchema>;

export const listSchedulesOperation: OperationDefinition = {
    id: "listSchedules",
    name: "List Schedules",
    description: "List on-call schedules with optional filtering",
    category: "schedules",
    inputSchema: listSchedulesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListSchedules(
    client: PagerDutyClient,
    params: ListSchedulesParams
): Promise<OperationResult> {
    try {
        const response = await client.listSchedules({
            query: params.query,
            include: params.include,
            limit: params.limit,
            offset: params.offset
        });

        return {
            success: true,
            data: {
                schedules: response.data,
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
                message: error instanceof Error ? error.message : "Failed to list schedules",
                retryable: true
            }
        };
    }
}
