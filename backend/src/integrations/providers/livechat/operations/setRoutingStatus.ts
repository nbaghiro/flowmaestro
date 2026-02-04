import { z } from "zod";
import { LiveChatClient } from "../client/LiveChatClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const setRoutingStatusSchema = z.object({
    status: z
        .enum(["accepting_chats", "not_accepting_chats", "offline"])
        .describe("New routing status for the agent"),
    agent_id: z.string().optional().describe("Agent ID (defaults to the authenticated agent)")
});

export type SetRoutingStatusParams = z.infer<typeof setRoutingStatusSchema>;

export const setRoutingStatusOperation: OperationDefinition = {
    id: "setRoutingStatus",
    name: "Set Routing Status",
    description: "Set the routing status for an agent (accepting chats, not accepting, offline)",
    category: "agents",
    actionType: "write",
    inputSchema: setRoutingStatusSchema,
    retryable: true,
    timeout: 10000
};

export async function executeSetRoutingStatus(
    client: LiveChatClient,
    params: SetRoutingStatusParams
): Promise<OperationResult> {
    try {
        await client.agentAction<Record<string, never>>(
            "set_routing_status",
            params as unknown as Record<string, unknown>
        );

        return {
            success: true,
            data: {
                status: params.status,
                agentId: params.agent_id || "self",
                updated: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to set routing status",
                retryable: true
            }
        };
    }
}
