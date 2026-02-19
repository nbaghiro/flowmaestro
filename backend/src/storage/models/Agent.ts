import type { JsonObject } from "@flowmaestro/shared";
import type { SafetyConfig } from "../../core/safety/types";

export type LLMProvider = "openai" | "anthropic" | "google" | "xai" | "cohere" | "huggingface";
export type ToolType = "workflow" | "function" | "knowledge_base" | "agent" | "mcp" | "builtin";

export interface Tool {
    id: string;
    name: string;
    description: string;
    type: ToolType;
    schema: JsonObject;
    config: ToolConfig;
}

export interface ToolConfig {
    // For workflow type
    workflowId?: string;

    // For function type (simple utility functions)
    functionName?: string;

    // For knowledge_base type
    knowledgeBaseId?: string;

    // For agent type
    agentId?: string;
    agentName?: string;

    // For MCP type (integration tools)
    connectionId?: string;
    provider?: string;

    // For builtin type
    category?: string;
    creditCost?: number;
}

/**
 * Memory configuration for agents.
 *
 * Features:
 * - Message buffer (recent N messages in context)
 * - Embeddings (for cross-thread semantic search)
 * - Working memory (persistent user facts)
 */
export interface MemoryConfig {
    /** Maximum messages to keep in context window (default: 50) */
    max_messages: number;
    /** Enable cross-thread semantic search via embeddings (default: true) */
    embeddings_enabled?: boolean;
    /** Enable persistent working memory for user facts (default: true) */
    working_memory_enabled?: boolean;
}

export interface AgentModel {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    description: string | null;
    model: string;
    provider: LLMProvider;
    connection_id: string | null;
    system_prompt: string;
    temperature: number;
    max_tokens: number;
    max_iterations: number;
    available_tools: Tool[];
    memory_config: MemoryConfig;
    safety_config: SafetyConfig;
    metadata: JsonObject;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface CreateAgentInput {
    user_id: string;
    workspace_id: string;
    name: string;
    description?: string;
    model: string;
    provider: LLMProvider;
    connection_id?: string;
    system_prompt: string;
    temperature?: number;
    max_tokens?: number;
    max_iterations?: number;
    available_tools?: Tool[];
    memory_config?: MemoryConfig;
    safety_config?: SafetyConfig;
    metadata?: JsonObject;
}

export interface UpdateAgentInput {
    name?: string;
    description?: string;
    model?: string;
    provider?: LLMProvider;
    connection_id?: string;
    system_prompt?: string;
    temperature?: number;
    max_tokens?: number;
    max_iterations?: number;
    available_tools?: Tool[];
    memory_config?: MemoryConfig;
    safety_config?: SafetyConfig;
    metadata?: JsonObject;
}
