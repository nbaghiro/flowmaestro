/**
 * Tools Module Type Definitions
 *
 * This module provides a unified tool interface that works for:
 * - Simple Agents (explicit tool assignment)
 * - Personas (automatic access to ALL tools)
 * - Workflows (direct function import)
 */

import type { JSONSchema } from "../integrations/core/types";
import type { ZodSchema } from "zod";

/**
 * Tool category for organization and filtering
 */
export type ToolCategory =
    | "web" // Web search, browsing
    | "code" // Code execution, analysis
    | "file" // File read/write
    | "data" // Data analysis, processing
    | "media" // Image generation, PDF creation
    | "integration"; // MCP integration tools

/**
 * Risk level for tool execution
 * Used for autonomy level decisions in personas
 */
export type ToolRiskLevel =
    | "none" // Read-only, no side effects (e.g., web_search)
    | "low" // Minor side effects, easily reversible (e.g., file_read)
    | "medium" // Moderate side effects (e.g., file_write with limited scope)
    | "high"; // Significant side effects (e.g., code execution, external API calls)

/**
 * Tool execution context
 * Provides information about the current execution environment
 */
export interface ToolExecutionContext {
    /** User ID for permission checks */
    userId: string;

    /** Workspace ID for resource scoping */
    workspaceId: string;

    /** Connection ID for integration tools */
    connectionId?: string;

    /** Execution mode */
    mode: "agent" | "persona" | "workflow";

    /** Trace/correlation ID for logging and file isolation */
    traceId?: string;

    /** Additional metadata for specific contexts (e.g., personaInstanceId) */
    metadata?: Record<string, unknown>;
}

/**
 * Result of tool execution
 */
export interface ToolExecutionResult {
    /** Whether the execution was successful */
    success: boolean;

    /** Result data (for successful executions) */
    data?: unknown;

    /** Error information (for failed executions) */
    error?: {
        message: string;
        code?: string;
        retryable: boolean;
    };

    /** Execution metadata */
    metadata?: {
        /** Execution duration in milliseconds */
        durationMs?: number;
        /** Credit cost for this execution */
        creditCost?: number;
        /** Whether user approval was required */
        requiredApproval?: boolean;
    };
}

/**
 * Core tool definition interface
 * Extends MCPTool format for LLM compatibility
 */
export interface ToolDefinition {
    /** Unique tool identifier (e.g., "web_search", "slack_sendMessage") */
    name: string;

    /** Human-readable display name */
    displayName: string;

    /** Description for LLM to understand when to use this tool */
    description: string;

    /** Tool category for organization */
    category: ToolCategory;

    /** Risk level for autonomy decisions */
    riskLevel: ToolRiskLevel;

    /** JSON Schema for input parameters (LLM-facing) */
    inputSchema: JSONSchema;

    /** Zod schema for runtime validation (optional but recommended) */
    zodSchema?: ZodSchema;

    /** Whether this tool is enabled by default */
    enabledByDefault: boolean;

    /** Credit cost per execution (0 for free tools) */
    creditCost: number;

    /** Tags for filtering and discovery */
    tags?: string[];

    /** Whether this tool requires a specific connection */
    requiresConnection?: boolean;

    /** Provider name for integration tools */
    provider?: string;
}

/**
 * Built-in tool with execute function
 * Used for tools that execute locally (not via MCP)
 */
export interface BuiltInTool extends ToolDefinition {
    /** Execute the tool */
    execute: (
        params: Record<string, unknown>,
        context: ToolExecutionContext
    ) => Promise<ToolExecutionResult>;
}

/**
 * Integration tool (MCP-based)
 * References external provider tools
 */
export interface IntegrationTool extends ToolDefinition {
    /** Provider name */
    provider: string;

    /** Original MCP tool name */
    mcpToolName: string;

    /** Connection ID required for execution */
    connectionId: string;
}

/**
 * Union type for all tools
 */
export type AnyTool = BuiltInTool | IntegrationTool;

/**
 * Tool collection for agents/personas
 */
export interface ToolCollection {
    /** Built-in tools */
    builtIn: BuiltInTool[];

    /** Integration tools (from user's connections) */
    integration: IntegrationTool[];

    /** Get all tools as flat array */
    all: () => AnyTool[];

    /** Get tools by category */
    byCategory: (category: ToolCategory) => AnyTool[];

    /** Find tool by name */
    findByName: (name: string) => AnyTool | undefined;
}

/**
 * Tool registry for managing available tools
 */
export interface ToolRegistry {
    /** Register a built-in tool */
    registerBuiltIn: (tool: BuiltInTool) => void;

    /** Get all built-in tools */
    getBuiltInTools: () => BuiltInTool[];

    /** Get built-in tool by name */
    getBuiltInTool: (name: string) => BuiltInTool | undefined;

    /** Get all integration tools for a user's connections */
    getIntegrationTools: (
        userId: string,
        workspaceId: string,
        connectionIds: string[]
    ) => Promise<IntegrationTool[]>;

    /** Get all tools available to a user (for personas) */
    getAllToolsForUser: (userId: string, workspaceId: string) => Promise<ToolCollection>;
}

/**
 * Convert ToolDefinition to LLM-compatible format
 */
export interface LLMToolFormat {
    name: string;
    description: string;
    input_schema: JSONSchema;
}

/**
 * Convert a tool definition to LLM format
 */
export function toLLMFormat(tool: ToolDefinition): LLMToolFormat {
    return {
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema
    };
}

/**
 * Convert array of tools to LLM format
 */
export function toLLMFormatArray(tools: ToolDefinition[]): LLMToolFormat[] {
    return tools.map(toLLMFormat);
}

/**
 * Type guard to check if a tool is a built-in tool
 */
export function isBuiltInTool(tool: AnyTool): tool is BuiltInTool {
    return "execute" in tool && typeof tool.execute === "function";
}

/**
 * Type guard to check if a tool is an integration tool
 */
export function isIntegrationTool(tool: AnyTool): tool is IntegrationTool {
    return "mcpToolName" in tool && "connectionId" in tool;
}
