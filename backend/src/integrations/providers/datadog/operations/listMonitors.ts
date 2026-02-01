import { z } from "zod";
import type { DatadogMonitorOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { DatadogClient } from "../client/DatadogClient";

export const listMonitorsSchema = z.object({
    tags: z.array(z.string()).optional().describe("Filter by tags"),
    page: z.number().int().min(0).optional().describe("Page number"),
    pageSize: z.number().int().min(1).max(1000).optional().describe("Results per page (max 1000)")
});

export type ListMonitorsParams = z.infer<typeof listMonitorsSchema>;

export const listMonitorsOperation: OperationDefinition = {
    id: "listMonitors",
    name: "List Monitors",
    description: "Get all monitors for the organization",
    category: "monitors",
    inputSchema: listMonitorsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListMonitors(
    client: DatadogClient,
    params: ListMonitorsParams
): Promise<OperationResult> {
    try {
        const monitors = await client.listMonitors({
            tags: params.tags,
            page: params.page,
            page_size: params.pageSize
        });

        const formattedMonitors: DatadogMonitorOutput[] = monitors.map((m) => ({
            id: m.id!,
            name: m.name,
            type: m.type,
            query: m.query,
            message: m.message,
            tags: m.tags || [],
            priority: m.priority,
            overallState: m.overall_state,
            createdAt: m.created,
            modifiedAt: m.modified
        }));

        return {
            success: true,
            data: {
                monitors: formattedMonitors,
                count: formattedMonitors.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list monitors",
                retryable: true
            }
        };
    }
}
