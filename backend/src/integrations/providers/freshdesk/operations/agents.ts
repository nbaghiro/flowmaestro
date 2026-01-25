/**
 * Freshdesk Agents Operations
 */

import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FreshdeskClient } from "../client/FreshdeskClient";
import type { FreshdeskAgent } from "../types";

// ============================================
// List Agents
// ============================================

export const listAgentsSchema = z.object({
    email: z.string().email().optional().describe("Filter by email"),
    per_page: z.number().int().min(1).max(100).optional().describe("Results per page")
});

export type ListAgentsParams = z.infer<typeof listAgentsSchema>;

export const listAgentsOperation: OperationDefinition = {
    id: "listAgents",
    name: "List Agents",
    description: "List all support agents",
    category: "data",
    inputSchema: listAgentsSchema,
    inputSchemaJSON: toJSONSchema(listAgentsSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListAgents(
    client: FreshdeskClient,
    params: ListAgentsParams
): Promise<OperationResult> {
    try {
        const agents = (await client.listAgents(params)) as FreshdeskAgent[];

        return {
            success: true,
            data: {
                agents
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

// ============================================
// Get Agent
// ============================================

export const getAgentSchema = z.object({
    agentId: z.number().int().describe("Agent ID")
});

export type GetAgentParams = z.infer<typeof getAgentSchema>;

export const getAgentOperation: OperationDefinition = {
    id: "getAgent",
    name: "Get Agent",
    description: "Retrieve a specific agent",
    category: "data",
    inputSchema: getAgentSchema,
    inputSchemaJSON: toJSONSchema(getAgentSchema),
    retryable: true,
    timeout: 10000
};

export async function executeGetAgent(
    client: FreshdeskClient,
    params: GetAgentParams
): Promise<OperationResult> {
    try {
        const agent = (await client.getAgent(params.agentId)) as FreshdeskAgent;

        return {
            success: true,
            data: agent
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get agent",
                retryable: true
            }
        };
    }
}

// ============================================
// Get Current Agent
// ============================================

export const getCurrentAgentSchema = z.object({});

export type GetCurrentAgentParams = z.infer<typeof getCurrentAgentSchema>;

export const getCurrentAgentOperation: OperationDefinition = {
    id: "getCurrentAgent",
    name: "Get Current Agent",
    description: "Get the authenticated agent's details",
    category: "data",
    inputSchema: getCurrentAgentSchema,
    inputSchemaJSON: toJSONSchema(getCurrentAgentSchema),
    retryable: true,
    timeout: 10000
};

export async function executeGetCurrentAgent(
    client: FreshdeskClient,
    _params: GetCurrentAgentParams
): Promise<OperationResult> {
    try {
        const agent = (await client.getCurrentAgent()) as FreshdeskAgent;

        return {
            success: true,
            data: agent
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get current agent",
                retryable: true
            }
        };
    }
}
