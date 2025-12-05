import type { JsonObject } from "@flowmaestro/shared";
import type { SafetyConfig } from "../../core/safety/types";

export type LLMProvider = "openai" | "anthropic" | "google" | "cohere" | "huggingface";
export type ToolType = "workflow" | "function" | "knowledge_base" | "agent" | "mcp";
export type MemoryType = "buffer" | "summary" | "vector";

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

    // For function type
    functionName?: string;

    // For knowledge_base type
    knowledgeBaseId?: string;

    // For agent type
    agentId?: string;
    agentName?: string;

    // For MCP type
    connectionId?: string;
    provider?: string;
}

export interface MemoryConfig {
    type: MemoryType;
    max_messages: number;
    summary_interval?: number; // For summary type
    vector_store_id?: string; // For vector type
}

export interface AgentModel {
    id: string;
    user_id: string;
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
