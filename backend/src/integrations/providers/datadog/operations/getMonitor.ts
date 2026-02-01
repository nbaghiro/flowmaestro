import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { DatadogClient } from "../client/DatadogClient";

export const getMonitorSchema = z.object({
    monitorId: z.number().int().describe("Monitor ID")
});

export type GetMonitorParams = z.infer<typeof getMonitorSchema>;

export const getMonitorOperation: OperationDefinition = {
    id: "getMonitor",
    name: "Get Monitor",
    description: "Get details of a specific monitor",
    category: "monitors",
    inputSchema: getMonitorSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetMonitor(
    client: DatadogClient,
    params: GetMonitorParams
): Promise<OperationResult> {
    try {
        const monitor = await client.getMonitor(params.monitorId);

        return {
            success: true,
            data: {
                id: monitor.id,
                name: monitor.name,
                type: monitor.type,
                query: monitor.query,
                message: monitor.message,
                tags: monitor.tags || [],
                priority: monitor.priority,
                overallState: monitor.overall_state,
                options: monitor.options,
                createdAt: monitor.created,
                modifiedAt: monitor.modified
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get monitor",
                retryable: true
            }
        };
    }
}
