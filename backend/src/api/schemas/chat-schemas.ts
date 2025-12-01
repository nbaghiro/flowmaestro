import { z } from "zod";

/**
 * Chat action types - only for node modification operations
 * null = conversational mode (no structured changes)
 */
export const actionTypeSchema = z.enum(["add", "modify", "remove"]).nullable();

/**
 * Node change schema for proposed modifications
 */
export const nodeChangeSchema = z.object({
    type: z.enum(["add", "modify", "remove"]),
    nodeId: z.string().optional(),
    nodeType: z.string().optional(),
    nodeLabel: z.string().optional(),
    config: z.record(z.unknown()).optional(),
    position: z
        .object({
            x: z.number(),
            y: z.number()
        })
        .optional(),
    connectTo: z.string().optional(),
    updates: z.record(z.unknown()).optional()
});

/**
 * Chat message schema for conversation history
 */
export const chatMessageSchema = z.object({
    id: z.string(),
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
    timestamp: z.date().or(z.string()),
    proposedChanges: z.array(z.any()).optional()
});

/**
 * Workflow context schema
 */
export const workflowContextSchema = z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
    selectedNodeId: z.string().nullable().optional(),
    executionHistory: z.array(z.any()).optional()
});

/**
 * Chat request schema
 */
export const chatRequestSchema = z.object({
    workflowId: z.string().uuid().optional(),
    action: actionTypeSchema,
    message: z.string().min(1).max(5000),
    context: workflowContextSchema,
    conversationHistory: z.array(chatMessageSchema).optional().default([]),
    connectionId: z.string().uuid(),
    model: z.string().optional()
});

/**
 * Chat response schema
 */
export const chatResponseSchema = z.object({
    response: z.string(),
    changes: z.array(nodeChangeSchema).optional()
});

/**
 * TypeScript types derived from schemas
 */
export type ActionType = z.infer<typeof actionTypeSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type NodeChange = z.infer<typeof nodeChangeSchema>;
export type WorkflowContext = z.infer<typeof workflowContextSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
