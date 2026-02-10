import { z } from "zod";
import { LiveChatClient } from "../client/LiveChatClient";
import type { LiveChatAgentsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const listAgentsSchema = z.object({});

export type ListAgentsParams = z.infer<typeof listAgentsSchema>;

export const listAgentsOperation: OperationDefinition = {
    id: "listAgents",
    name: "List Agents",
    description: "List all agents via the Configuration API",
    category: "agents",
    actionType: "read",
    inputSchema: listAgentsSchema,
    retryable: true,
    timeout: 10000
};

export async function executeListAgents(
    client: LiveChatClient,
    _params: ListAgentsParams
): Promise<OperationResult> {
    try {
        const response = await client.configAction<LiveChatAgentsResponse>("list_agents");

        return {
            success: true,
            data: {
                agents: response.agents.map((a) => ({
                    id: a.id,
                    name: a.name,
                    login: a.login,
                    role: a.role,
                    avatar: a.avatar,
                    maxChatsCount: a.max_chats_count,
                    groups: a.groups
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list agents",
                retryable: true
            }
        };
    }
}
