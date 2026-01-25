import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { DatadogClient } from "../client/DatadogClient";

export const muteMonitorSchema = z.object({
    monitorId: z.number().int().describe("Monitor ID"),
    scope: z.string().optional().describe("Scope to mute (e.g., 'host:myhost')"),
    end: z.number().int().optional().describe("Unix timestamp when mute ends")
});

export type MuteMonitorParams = z.infer<typeof muteMonitorSchema>;

export const muteMonitorOperation: OperationDefinition = {
    id: "muteMonitor",
    name: "Mute Monitor",
    description: "Mute a monitor (silence alerts)",
    category: "monitors",
    inputSchema: muteMonitorSchema,
    inputSchemaJSON: toJSONSchema(muteMonitorSchema),
    retryable: false,
    timeout: 30000
};

export async function executeMuteMonitor(
    client: DatadogClient,
    params: MuteMonitorParams
): Promise<OperationResult> {
    try {
        const monitor = await client.muteMonitor(params.monitorId, {
            scope: params.scope,
            end: params.end
        });

        return {
            success: true,
            data: {
                id: monitor.id,
                name: monitor.name,
                muted: true,
                overallState: monitor.overall_state
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to mute monitor",
                retryable: false
            }
        };
    }
}
