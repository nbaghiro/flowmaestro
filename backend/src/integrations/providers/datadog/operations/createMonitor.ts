import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { DatadogClient } from "../client/DatadogClient";

export const createMonitorSchema = z.object({
    name: z.string().min(1).describe("Monitor name"),
    type: z
        .string()
        .min(1)
        .describe("Monitor type (e.g., 'metric alert', 'service check', 'event alert')"),
    query: z.string().min(1).describe("Monitor query"),
    message: z.string().min(1).describe("Alert message (supports @mentions)"),
    tags: z.array(z.string()).optional().describe("Tags for the monitor"),
    priority: z.number().int().min(1).max(5).optional().describe("Priority (1-5)")
});

export type CreateMonitorParams = z.infer<typeof createMonitorSchema>;

export const createMonitorOperation: OperationDefinition = {
    id: "createMonitor",
    name: "Create Monitor",
    description: "Create a new monitor alert in Datadog",
    category: "monitors",
    inputSchema: createMonitorSchema,
    inputSchemaJSON: toJSONSchema(createMonitorSchema),
    retryable: false,
    timeout: 30000
};

export async function executeCreateMonitor(
    client: DatadogClient,
    params: CreateMonitorParams
): Promise<OperationResult> {
    try {
        const monitor = await client.createMonitor({
            name: params.name,
            type: params.type,
            query: params.query,
            message: params.message,
            tags: params.tags,
            priority: params.priority
        });

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
                createdAt: monitor.created
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create monitor",
                retryable: false
            }
        };
    }
}
