/**
 * Crisp Operators Operations
 */

import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { CrispClient } from "../client/CrispClient";
import type { CrispOperator } from "../types";

// ============================================
// List Operators
// ============================================

export const listOperatorsSchema = z.object({});

export type ListOperatorsParams = z.infer<typeof listOperatorsSchema>;

export const listOperatorsOperation: OperationDefinition = {
    id: "listOperators",
    name: "List Operators",
    description: "List all operators for the website",
    category: "operators",
    inputSchema: listOperatorsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListOperators(
    client: CrispClient,
    _params: ListOperatorsParams
): Promise<OperationResult> {
    try {
        const operators = (await client.listOperators()) as CrispOperator[];

        return {
            success: true,
            data: {
                operators
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list operators",
                retryable: true
            }
        };
    }
}

// ============================================
// Get Operator Availability
// ============================================

export const getOperatorAvailabilitySchema = z.object({
    operatorId: z.string().min(1).describe("Operator user ID")
});

export type GetOperatorAvailabilityParams = z.infer<typeof getOperatorAvailabilitySchema>;

export const getOperatorAvailabilityOperation: OperationDefinition = {
    id: "getOperatorAvailability",
    name: "Get Operator Availability",
    description: "Get the availability status of an operator",
    category: "operators",
    inputSchema: getOperatorAvailabilitySchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetOperatorAvailability(
    client: CrispClient,
    params: GetOperatorAvailabilityParams
): Promise<OperationResult> {
    try {
        const result = await client.getOperatorAvailability(params.operatorId);

        return {
            success: true,
            data: {
                operatorId: params.operatorId,
                availability: result.availability
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to get operator availability",
                retryable: true
            }
        };
    }
}

// ============================================
// Assign Conversation
// ============================================

export const assignConversationSchema = z.object({
    sessionId: z.string().min(1).describe("Conversation session ID"),
    operatorId: z.string().min(1).describe("Operator user ID to assign")
});

export type AssignConversationParams = z.infer<typeof assignConversationSchema>;

export const assignConversationOperation: OperationDefinition = {
    id: "assignConversation",
    name: "Assign Conversation",
    description: "Assign a conversation to an operator",
    category: "operators",
    inputSchema: assignConversationSchema,
    retryable: false,
    timeout: 10000
};

export async function executeAssignConversation(
    client: CrispClient,
    params: AssignConversationParams
): Promise<OperationResult> {
    try {
        await client.assignConversation(params.sessionId, params.operatorId);

        return {
            success: true,
            data: {
                assigned: true,
                sessionId: params.sessionId,
                operatorId: params.operatorId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to assign conversation",
                retryable: false
            }
        };
    }
}

// ============================================
// Unassign Conversation
// ============================================

export const unassignConversationSchema = z.object({
    sessionId: z.string().min(1).describe("Conversation session ID")
});

export type UnassignConversationParams = z.infer<typeof unassignConversationSchema>;

export const unassignConversationOperation: OperationDefinition = {
    id: "unassignConversation",
    name: "Unassign Conversation",
    description: "Unassign a conversation from its current operator",
    category: "operators",
    inputSchema: unassignConversationSchema,
    retryable: false,
    timeout: 10000
};

export async function executeUnassignConversation(
    client: CrispClient,
    params: UnassignConversationParams
): Promise<OperationResult> {
    try {
        await client.unassignConversation(params.sessionId);

        return {
            success: true,
            data: {
                unassigned: true,
                sessionId: params.sessionId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to unassign conversation",
                retryable: false
            }
        };
    }
}
