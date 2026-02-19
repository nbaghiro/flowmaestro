/**
 * Agent Activities - Core LLM calls, tool execution, safety validation, and multi-agent orchestration
 *
 * Critical Gap Fixes:
 * - Rate limiting for LLM calls to prevent cost runaway
 * - Tool execution timeout to prevent hanging executions
 * - Enhanced schema validation before coercion
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { config as appConfig } from "../../../core/config";
import { SafetyPipeline } from "../../../core/safety/safety-pipeline";
import { getLLMRateLimiter, RateLimitExceededError } from "../../../core/utils/llm-rate-limiter";
import { ExecutionRouter } from "../../../integrations/core/ExecutionRouter";
import { providerRegistry } from "../../../integrations/registry";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { SafetyLogRepository } from "../../../storage/repositories/SafetyLogRepository";
import { WorkflowRepository } from "../../../storage/repositories/WorkflowRepository";
import {
    executeWithTimeout,
    ToolTimeoutError,
    validateToolInput,
    coerceToolArguments,
    createValidationErrorResponse,
    executeTool
} from "../../../tools";
import { activityLogger, createActivityLogger } from "../../core";
import { emitAgentToken } from "./events";
import {
    searchThreadMemory as searchThreadMemoryActivity,
    injectThreadMemoryTools,
    injectWorkingMemoryTool,
    executeClearThreadMemory,
    executeUpdateWorkingMemory
} from "./memory";
import type { SafetyContext, SafetyCheckResult, SafetyConfig } from "../../../core/safety/types";
import type { AgentModel, Tool } from "../../../storage/models/Agent";
import type { ThreadMessage, ToolCall } from "../../../storage/models/AgentExecution";
import type { KnowledgeBaseModel } from "../../../storage/models/KnowledgeBase";
import type { ToolExecutionContext } from "../../../tools";
import type { AgentConfig, LLMResponse } from "../../workflows/agent-orchestrator";

// =============================================================================
// Repository and Service Instances
// =============================================================================

const agentRepo = new AgentRepository();
const executionRepo = new AgentExecutionRepository();
const workflowRepo = new WorkflowRepository();
const connectionRepo = new ConnectionRepository();
const executionRouter = new ExecutionRouter(providerRegistry);
const safetyLogger = createActivityLogger({ component: "SafetyActivity" });

// Rate limiter for LLM calls - prevents cost runaway
const llmRateLimiter = getLLMRateLimiter();

// =============================================================================
// Types and Interfaces - Core Activities
// =============================================================================

/**
 * Get agent configuration for workflow execution
 */
export interface GetAgentConfigInput {
    agentId: string;
    userId: string;
    workspaceId?: string;
}

/**
 * Call LLM with thread messages and tools
 */
export interface CallLLMInput {
    model: string;
    provider: string;
    connectionId: string | null;
    messages: ThreadMessage[];
    tools: Tool[];
    temperature: number;
    maxTokens: number;
    executionId?: string; // For streaming token emission
    threadId: string; // Required for thread-scoped streaming events
    /** Workspace ID for rate limiting (optional for backwards compatibility) */
    workspaceId?: string;
    /** User ID for rate limiting attribution */
    userId?: string;
}

/**
 * Execute tool call (workflow, function, knowledge base, mcp, or builtin)
 */
export interface ExecuteToolCallInput {
    executionId: string;
    toolCall: ToolCall;
    availableTools: Tool[];
    userId: string;
    workspaceId: string;
    agentId?: string;
    /** Additional metadata for tool context (e.g., personaInstanceId) */
    metadata?: Record<string, unknown>;
}

/**
 * Save agent checkpoint for continue-as-new
 */
export interface SaveAgentCheckpointInput {
    executionId: string;
    messages: ThreadMessage[];
    iterations: number;
}

// =============================================================================
// Types and Interfaces - Safety Activities
// =============================================================================

export interface ValidateInputInput {
    content: string;
    context: SafetyContext;
    config: SafetyConfig;
}

export interface ValidateInputResult {
    content: string; // Potentially redacted
    shouldProceed: boolean;
    violations: SafetyCheckResult[];
}

export interface ValidateOutputInput {
    content: string;
    context: SafetyContext;
    config: SafetyConfig;
}

export interface ValidateOutputResult {
    content: string; // Potentially redacted
    shouldProceed: boolean;
    violations: SafetyCheckResult[];
}

export interface LogSafetyEventInput {
    userId: string;
    agentId: string;
    executionId: string;
    threadId?: string;
    result: SafetyCheckResult;
    direction: "input" | "output";
    originalContent?: string;
}

// =============================================================================
// Types and Interfaces - Internal LLM Provider Calls
// =============================================================================

interface OpenAICallInput {
    model: string;
    apiKey: string;
    messages: ThreadMessage[];
    tools: Tool[];
    temperature: number;
    maxTokens: number;
    executionId?: string;
    threadId: string;
}

interface AnthropicCallInput {
    model: string;
    apiKey: string;
    messages: ThreadMessage[];
    tools: Tool[];
    temperature: number;
    maxTokens: number;
    executionId?: string;
    threadId: string;
}

interface GoogleCallInput {
    model: string;
    apiKey: string;
    messages: ThreadMessage[];
    tools: Tool[];
    temperature: number;
    maxTokens: number;
    executionId?: string;
    threadId: string;
}

interface CohereCallInput {
    model: string;
    apiKey: string;
    messages: ThreadMessage[];
    tools: Tool[];
    temperature: number;
    maxTokens: number;
    executionId?: string;
    threadId: string;
}

interface HuggingFaceCallInput {
    model: string;
    apiKey: string;
    messages: ThreadMessage[];
    tools: Tool[];
    temperature: number;
    maxTokens: number;
    executionId?: string;
    threadId: string;
}

// =============================================================================
// Types and Interfaces - Internal Tool Execution
// =============================================================================

interface ExecuteWorkflowToolInput {
    tool: Tool;
    arguments: JsonObject;
    userId: string;
}

interface ExecuteFunctionToolInput {
    tool: Tool;
    arguments: JsonObject;
    userId?: string;
    agentId?: string;
    executionId?: string;
}

interface ExecuteKnowledgeBaseToolInput {
    tool: Tool;
    arguments: JsonObject;
    userId: string;
}

interface ExecuteAgentToolInput {
    tool: Tool;
    arguments: JsonObject;
    userId: string;
}

interface ExecuteMCPToolInput {
    tool: Tool;
    arguments: JsonObject;
    userId: string;
}

interface ExecuteBuiltInToolInput {
    tool: Tool;
    arguments: JsonObject;
    userId: string;
    workspaceId: string;
    executionId?: string;
    /** Additional metadata for tool context (e.g., personaInstanceId) */
    metadata?: Record<string, unknown>;
}

interface ExecuteSearchThreadMemoryInput {
    agentId: string;
    userId: string;
    executionId?: string;
    arguments: JsonObject;
}

// =============================================================================
// Core Activity Functions - Agent Configuration
// =============================================================================

export async function getAgentConfig(input: GetAgentConfigInput): Promise<AgentConfig> {
    const { agentId, workspaceId } = input;

    // Use workspace-scoped lookup when workspaceId is available
    const agent = workspaceId
        ? await agentRepo.findByIdAndWorkspaceId(agentId, workspaceId)
        : await agentRepo.findById(agentId);
    if (!agent) {
        throw new Error(`Agent ${agentId} not found or access denied`);
    }

    // Inject memory tools:
    // - Thread memory tools (search and clear) for semantic search
    // - Working memory tool for persistent user context
    let toolsWithMemory = injectThreadMemoryTools(agent.available_tools);
    toolsWithMemory = injectWorkingMemoryTool(toolsWithMemory);

    return {
        id: agent.id,
        name: agent.name,
        model: agent.model,
        provider: agent.provider,
        connection_id: agent.connection_id,
        system_prompt: agent.system_prompt,
        temperature: agent.temperature,
        max_tokens: agent.max_tokens,
        max_iterations: agent.max_iterations,
        available_tools: toolsWithMemory,
        memory_config: agent.memory_config,
        safety_config: agent.safety_config
    };
}

// =============================================================================
// Core Activity Functions - LLM Calls
// =============================================================================

export async function callLLM(input: CallLLMInput): Promise<LLMResponse> {
    const {
        model,
        provider,
        connectionId,
        messages,
        tools,
        temperature,
        maxTokens,
        threadId,
        workspaceId,
        userId
    } = input;

    // CRITICAL: Rate limit check before making LLM call
    // This prevents runaway costs from agents making excessive API calls
    if (workspaceId) {
        const rateLimitResult = await llmRateLimiter.checkLimit(workspaceId, userId || "unknown");
        if (!rateLimitResult.allowed) {
            activityLogger.warn("LLM rate limit exceeded", {
                workspaceId,
                userId,
                reason: rateLimitResult.reason,
                currentUsage: rateLimitResult.currentUsage
            });
            throw new RateLimitExceededError(rateLimitResult);
        }

        // Record the call attempt (before making the actual call)
        // Estimate tokens based on message count - will be updated with actual usage
        const estimatedTokens = messages.reduce((acc, m) => acc + m.content.length / 4, 0);
        await llmRateLimiter.recordCall(
            workspaceId,
            userId || "unknown",
            Math.ceil(estimatedTokens)
        );
    }

    // Get API credentials from connection
    // Also update provider if connection is overridden (connection determines provider)
    let apiKey: string | null = null;
    let actualProvider = provider;

    if (connectionId) {
        const connection = await connectionRepo.findByIdWithData(connectionId);
        if (connection && connection.data) {
            // Use the connection's provider (important for overrides)
            actualProvider = connection.provider as typeof provider;

            activityLogger.info("Connection override detected", {
                originalProvider: provider,
                actualProvider,
                model
            });

            // Extract API key from connection data
            const connectionData = connection.data;
            if ("api_key" in connectionData) {
                apiKey = connectionData.api_key || null;
            } else if ("apiKey" in connectionData) {
                apiKey = ((connectionData as Record<string, unknown>).apiKey as string) || null;
            }
        }
    }

    // If no connection or API key, try environment variables
    if (!apiKey) {
        switch (actualProvider) {
            case "openai":
                apiKey = appConfig.ai.openai.apiKey || null;
                break;
            case "anthropic":
                apiKey = appConfig.ai.anthropic.apiKey || null;
                break;
            case "google":
                apiKey = appConfig.ai.google.apiKey || null;
                break;
            case "cohere":
                apiKey = appConfig.ai.cohere.apiKey || null;
                break;
            case "huggingface":
                apiKey = appConfig.ai.huggingface.apiKey || null;
                break;
        }
    }

    if (!apiKey) {
        throw new Error(`No API key found for provider ${actualProvider}`);
    }

    // Call appropriate LLM provider (use actualProvider which may be overridden)
    switch (actualProvider) {
        case "openai":
            return await callOpenAI({
                model,
                apiKey,
                messages,
                tools,
                temperature,
                maxTokens,
                executionId: input.executionId,
                threadId
            });
        case "anthropic":
            return await callAnthropic({
                model,
                apiKey,
                messages,
                tools,
                temperature,
                maxTokens,
                executionId: input.executionId,
                threadId
            });
        case "google":
            return await callGoogle({
                model,
                apiKey,
                messages,
                tools,
                temperature,
                maxTokens,
                executionId: input.executionId,
                threadId
            });
        case "cohere":
            return await callCohere({
                model,
                apiKey,
                messages,
                tools,
                temperature,
                maxTokens,
                executionId: input.executionId,
                threadId
            });
        case "huggingface":
            return await callHuggingFace({
                model,
                apiKey,
                messages,
                tools,
                temperature,
                maxTokens,
                executionId: input.executionId,
                threadId
            });
        default:
            throw new Error(`Provider ${provider} not yet implemented`);
    }
}

// =============================================================================
// Core Activity Functions - Tool Execution
// =============================================================================

export async function executeToolCall(input: ExecuteToolCallInput): Promise<JsonObject> {
    const { toolCall, availableTools, userId, workspaceId, agentId, executionId, metadata } = input;

    // Find tool definition
    const tool = availableTools.find((t) => t.name === toolCall.name);
    if (!tool) {
        throw new Error(`Tool "${toolCall.name}" not found in available tools`);
    }

    // Coerce argument types (e.g., string "123" to number 123)
    const coercedArgs = coerceToolArguments(tool, toolCall.arguments);

    // Validate tool input arguments
    const validation = validateToolInput(tool, coercedArgs);

    if (!validation.success) {
        // Throw error so orchestrator can emit tool:call:failed event
        activityLogger.warn("Tool validation failed", {
            toolName: toolCall.name,
            error: validation.error?.message,
            receivedArgs: toolCall.arguments,
            coercedArgs
        });

        // Throw an error that includes the validation details
        // The orchestrator will catch this, emit the failed event, and add error to messages
        const errorResponse = createValidationErrorResponse(toolCall.name, validation);
        throw new Error(
            `Tool validation failed: ${validation.error?.message}. ${errorResponse.hint}`
        );
    }

    // Use validated and coerced data
    const validatedArgs = validation.data as JsonObject;

    // CRITICAL: Wrap tool execution with timeout to prevent hanging
    // This ensures slow/hanging tools don't block agent execution indefinitely
    const startTime = Date.now();

    try {
        const result = await executeWithTimeout(
            tool.name,
            tool.type,
            async (_signal: AbortSignal) => {
                // Execute the appropriate tool type
                switch (tool.type) {
                    case "workflow":
                        return await executeWorkflowTool({
                            tool,
                            arguments: validatedArgs,
                            userId
                        });
                    case "function":
                        return await executeFunctionTool({
                            tool,
                            arguments: validatedArgs,
                            userId,
                            agentId,
                            executionId
                        });
                    case "knowledge_base":
                        return await executeKnowledgeBaseTool({
                            tool,
                            arguments: validatedArgs,
                            userId
                        });
                    case "agent":
                        return await executeAgentTool({ tool, arguments: validatedArgs, userId });
                    case "mcp":
                        return await executeMCPToolCall({ tool, arguments: validatedArgs, userId });
                    case "builtin":
                        return await executeBuiltInTool({
                            tool,
                            arguments: validatedArgs,
                            userId,
                            workspaceId,
                            executionId,
                            metadata
                        });
                    default:
                        throw new Error(`Unknown tool type: ${tool.type}`);
                }
            }
        );

        const duration = Date.now() - startTime;
        activityLogger.debug("Tool execution completed", {
            toolName: tool.name,
            toolType: tool.type,
            durationMs: duration
        });

        return result;
    } catch (error) {
        const duration = Date.now() - startTime;

        if (error instanceof ToolTimeoutError) {
            activityLogger.error("Tool execution timed out", error, {
                toolName: tool.name,
                toolType: tool.type,
                timeoutMs: error.timeoutMs,
                durationMs: duration
            });
            // Re-throw with more context for the orchestrator
            throw new Error(
                `Tool "${tool.name}" timed out after ${error.timeoutMs}ms. ` +
                    "The tool may be experiencing issues with external dependencies. " +
                    "Do NOT retry this tool immediately."
            );
        }

        // Re-throw other errors
        throw error;
    }
}

// =============================================================================
// Core Activity Functions - Checkpoint
// =============================================================================

export async function saveAgentCheckpoint(input: SaveAgentCheckpointInput): Promise<void> {
    const { executionId, messages, iterations } = input;

    await executionRepo.update(executionId, {
        thread_history: messages,
        iterations
    });
}

// =============================================================================
// Safety Activity Functions
// =============================================================================

/**
 * Validate user input through safety pipeline
 */
export async function validateInput(input: ValidateInputInput): Promise<ValidateInputResult> {
    safetyLogger.info("Validating input through safety pipeline", {
        executionId: input.context.executionId,
        agentId: input.context.agentId,
        userId: input.context.userId,
        direction: input.context.direction,
        contentLength: input.content.length
    });

    // Create safety pipeline with agent's config
    const pipeline = new SafetyPipeline(input.config);

    // Process content
    const { content, shouldProceed, results } = await pipeline.process(
        input.content,
        input.context
    );

    // Filter for violations (anything that's not "allow")
    const violations = results.filter((r) => r.action !== "allow");

    // Log violations
    if (violations.length > 0) {
        safetyLogger.warn("Safety violations found in input", {
            executionId: input.context.executionId,
            agentId: input.context.agentId,
            userId: input.context.userId,
            direction: input.context.direction,
            violationCount: violations.length,
            violations: violations.map((v) => ({ type: v.type, action: v.action }))
        });

        // Log each violation to database
        const safetyLogRepo = new SafetyLogRepository();
        for (const violation of violations) {
            await safetyLogRepo.create({
                user_id: input.context.userId,
                agent_id: input.context.agentId,
                execution_id: input.context.executionId,
                thread_id: input.context.threadId,
                check_type: violation.type,
                action: violation.action,
                direction: input.context.direction,
                original_content: violation.action === "block" ? input.content : undefined,
                redacted_content: violation.redactedContent,
                metadata: violation.metadata || {}
            });
        }
    }

    return {
        content,
        shouldProceed,
        violations
    };
}

/**
 * Validate agent output through safety pipeline
 */
export async function validateOutput(input: ValidateOutputInput): Promise<ValidateOutputResult> {
    safetyLogger.info("Validating output through safety pipeline", {
        executionId: input.context.executionId,
        agentId: input.context.agentId,
        userId: input.context.userId,
        direction: input.context.direction,
        contentLength: input.content.length
    });

    // Create safety pipeline with agent's config
    const pipeline = new SafetyPipeline(input.config);

    // Process content
    const { content, shouldProceed, results } = await pipeline.process(
        input.content,
        input.context
    );

    // Filter for violations
    const violations = results.filter((r) => r.action !== "allow");

    // Log violations
    if (violations.length > 0) {
        safetyLogger.warn("Safety violations found in output", {
            executionId: input.context.executionId,
            agentId: input.context.agentId,
            userId: input.context.userId,
            direction: input.context.direction,
            violationCount: violations.length,
            violations: violations.map((v) => ({ type: v.type, action: v.action }))
        });

        // Log each violation to database
        const safetyLogRepo = new SafetyLogRepository();
        for (const violation of violations) {
            await safetyLogRepo.create({
                user_id: input.context.userId,
                agent_id: input.context.agentId,
                execution_id: input.context.executionId,
                thread_id: input.context.threadId,
                check_type: violation.type,
                action: violation.action,
                direction: input.context.direction,
                redacted_content: violation.redactedContent,
                metadata: violation.metadata || {}
            });
        }
    }

    return {
        content,
        shouldProceed,
        violations
    };
}

/**
 * Log safety event to database
 */
export async function logSafetyEvent(input: LogSafetyEventInput): Promise<void> {
    const safetyLogRepo = new SafetyLogRepository();

    await safetyLogRepo.create({
        user_id: input.userId,
        agent_id: input.agentId,
        execution_id: input.executionId,
        thread_id: input.threadId,
        check_type: input.result.type,
        action: input.result.action,
        direction: input.direction,
        original_content: input.originalContent,
        redacted_content: input.result.redactedContent,
        metadata: input.result.metadata || {}
    });
}

// =============================================================================
// Multi-Agent Orchestration Functions - Tool Generation
// =============================================================================

/**
 * Generate a tool definition from an agent
 *
 * This allows agents to call other agents as tools, enabling multi-agent orchestration.
 */
export function generateAgentTool(agent: AgentModel): Tool {
    // Extract input/output information from agent's description or use defaults
    const schema = {
        type: "object",
        properties: {
            input: {
                type: "string",
                description: "The input/query to send to the agent"
            },
            context: {
                type: "object",
                description: "Optional context to provide to the agent",
                properties: {},
                additionalProperties: true
            }
        },
        required: ["input"],
        additionalProperties: false
    };

    return {
        id: `agent-tool-${agent.id}`,
        type: "agent",
        name: generateAgentToolName(agent.name),
        description: `Call the "${agent.name}" agent. ${agent.description || ""}`,
        schema,
        config: {
            agentId: agent.id,
            agentName: agent.name
        }
    };
}

/**
 * Generate a valid tool name from an agent name
 *
 * Tool names must be valid function names (alphanumeric + underscores, start with letter)
 */
export function generateAgentToolName(agentName: string): string {
    // Convert to lowercase, replace spaces and special chars with underscores
    let toolName = agentName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, ""); // Remove leading/trailing underscores

    // Ensure it starts with a letter
    if (!/^[a-z]/.test(toolName)) {
        toolName = `agent_${toolName}`;
    }

    // Add prefix to avoid name collisions
    return `call_${toolName}`;
}

/**
 * Generate agent tools for all agents in a workspace
 *
 * This allows creating a "team" of agents that can call each other.
 */
export async function generateAgentToolsForWorkspace(
    workspaceId: string,
    options?: {
        excludeAgentId?: string; // Exclude specific agent (e.g., the calling agent)
        includeAgentIds?: string[]; // Only include specific agents
    }
): Promise<Tool[]> {
    const { excludeAgentId, includeAgentIds } = options || {};

    // Get all agents for workspace
    const result = await agentRepo.findByWorkspaceId(workspaceId);
    let filteredAgents = result.agents;

    // Filter agents
    if (excludeAgentId) {
        filteredAgents = filteredAgents.filter((agent) => agent.id !== excludeAgentId);
    }

    if (includeAgentIds && includeAgentIds.length > 0) {
        filteredAgents = filteredAgents.filter((agent) => includeAgentIds.includes(agent.id));
    }

    // Generate tools
    return filteredAgents.map(generateAgentTool);
}

/**
 * Generate a tool definition for a specific agent by ID
 */
export async function generateAgentToolById(
    agentId: string,
    workspaceId: string
): Promise<Tool | null> {
    const agent = await agentRepo.findByIdAndWorkspaceId(agentId, workspaceId);
    if (!agent) {
        return null;
    }

    return generateAgentTool(agent);
}

/**
 * Auto-inject agent tools into an agent's available tools
 *
 * This makes all other agents available as tools to the calling agent.
 */
export async function injectAgentTools(
    existingTools: Tool[],
    workspaceId: string,
    currentAgentId?: string
): Promise<Tool[]> {
    // Generate tools for all other agents in the workspace
    const agentTools = await generateAgentToolsForWorkspace(workspaceId, {
        excludeAgentId: currentAgentId // Don't allow agent to call itself
    });

    // Merge with existing tools, avoiding duplicates
    const existingToolNames = new Set(existingTools.map((t) => t.name));
    const newAgentTools = agentTools.filter((tool) => !existingToolNames.has(tool.name));

    return [...existingTools, ...newAgentTools];
}

/**
 * Check if a tool is an agent tool
 */
export function isAgentTool(tool: Tool): boolean {
    return tool.type === "agent";
}

/**
 * Extract agent ID from an agent tool
 */
export function getAgentIdFromTool(tool: Tool): string | null {
    if (!isAgentTool(tool)) {
        return null;
    }

    return (tool.config.agentId as string) || null;
}

// =============================================================================
// Knowledge Base Tool Generation
// =============================================================================

/**
 * Generate a tool definition from a knowledge base.
 * Allows agents to search and retrieve information from the knowledge base.
 */
export function generateKnowledgeBaseTool(kb: KnowledgeBaseModel): Tool {
    const schema = {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "The search query to find relevant information in the knowledge base"
            },
            topK: {
                type: "number",
                description: "Number of results to return (default: 10)"
            },
            minScore: {
                type: "number",
                description: "Minimum similarity score threshold 0-1 (default: 0.3)"
            }
        },
        required: ["query"],
        additionalProperties: false
    };

    return {
        id: `kb-tool-${kb.id}`,
        type: "knowledge_base",
        name: generateKnowledgeBaseToolName(kb.name),
        description: `Search the "${kb.name}" knowledge base for relevant information. ${kb.description || ""}`,
        schema,
        config: {
            knowledgeBaseId: kb.id
        }
    };
}

/**
 * Generate a valid tool name from a knowledge base name.
 * Tool names must be valid function names (alphanumeric + underscores, start with letter).
 */
export function generateKnowledgeBaseToolName(kbName: string): string {
    let toolName = kbName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    if (!/^[a-z]/.test(toolName)) {
        toolName = `kb_${toolName}`;
    }

    return `search_${toolName}`;
}

// =============================================================================
// Internal Helper Functions - Tool Name and JSON Schema Sanitization
// =============================================================================

/**
 * Sanitize tool name to ensure it's valid for LLM function calling
 * OpenAI, Anthropic, and other providers require: ^[a-zA-Z0-9_-]+$
 * - Only alphanumeric characters, underscores, and hyphens
 * - Must start with a letter or underscore
 */
function sanitizeToolName(name: string): string {
    // Replace any character that isn't alphanumeric, underscore, or hyphen with underscore
    let sanitized = name.replace(/[^a-zA-Z0-9_-]/g, "_");

    // Remove consecutive underscores
    sanitized = sanitized.replace(/_+/g, "_");

    // Remove leading/trailing underscores and hyphens
    sanitized = sanitized.replace(/^[_-]+|[_-]+$/g, "");

    // Ensure it starts with a letter or underscore (not a number or hyphen)
    if (/^[0-9-]/.test(sanitized)) {
        sanitized = `tool_${sanitized}`;
    }

    // If empty after sanitization, provide a fallback
    if (!sanitized) {
        sanitized = "unnamed_tool";
    }

    return sanitized;
}

/**
 * Sanitize JSON schema to ensure it's valid for OpenAI's function calling
 * Fixes common issues like missing 'items' for arrays
 */
function sanitizeJsonSchema(schema: JsonObject): JsonObject {
    const sanitized = { ...schema };

    // Recursively fix array types missing 'items'
    function fixSchema(obj: Record<string, unknown>): void {
        for (const key in obj) {
            const value = obj[key];

            if (value && typeof value === "object" && !Array.isArray(value)) {
                const objValue = value as Record<string, unknown>;

                // If this is an array type without items, add default items
                if (objValue.type === "array" && !objValue.items) {
                    objValue.items = { type: "object" };
                }

                // Recursively process nested objects
                fixSchema(objValue);

                // Process properties object if it exists
                if (objValue.properties && typeof objValue.properties === "object") {
                    fixSchema(objValue.properties as Record<string, unknown>);
                }

                // Process items if it exists
                if (objValue.items && typeof objValue.items === "object") {
                    fixSchema(objValue.items as Record<string, unknown>);
                }

                // Process additionalProperties if it exists
                if (
                    objValue.additionalProperties &&
                    typeof objValue.additionalProperties === "object"
                ) {
                    fixSchema(objValue.additionalProperties as Record<string, unknown>);
                }
            }
        }
    }

    fixSchema(sanitized);
    return sanitized;
}

// =============================================================================
// Internal LLM Provider Functions
// =============================================================================

async function callOpenAI(input: OpenAICallInput): Promise<LLMResponse> {
    const { model, apiKey, messages, tools, temperature, maxTokens, executionId, threadId } = input;

    // Format messages for OpenAI (sanitize tool names for consistency)
    const formattedMessages = messages.map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : msg.role === "tool" ? "tool" : "user",
        content: msg.content,
        ...(msg.tool_calls && {
            tool_calls: msg.tool_calls.map((tc) => ({
                id: tc.id,
                type: "function",
                function: {
                    name: sanitizeToolName(tc.name),
                    arguments:
                        typeof tc.arguments === "string"
                            ? tc.arguments
                            : JSON.stringify(tc.arguments)
                }
            }))
        }),
        ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
        ...(msg.tool_name && { name: sanitizeToolName(msg.tool_name) })
    }));

    // Format tools for OpenAI function calling with name and schema sanitization
    const formattedTools = tools.map((tool) => ({
        type: "function",
        function: {
            name: sanitizeToolName(tool.name),
            description: tool.description,
            parameters: sanitizeJsonSchema(tool.schema)
        }
    }));

    // Call OpenAI API with streaming
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: formattedMessages,
            tools: formattedTools.length > 0 ? formattedTools : undefined,
            temperature,
            max_tokens: maxTokens,
            stream: true, // Enable streaming
            // Ask OpenAI to include usage in the final chunk so we can surface token counts
            stream_options: {
                include_usage: true
            }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    // Process streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let toolCalls: ToolCall[] | undefined;
    // Accumulate arguments as strings during streaming, then parse at the end
    const toolCallArgsStrings: string[] = [];
    let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;
    let finishReason = "";

    if (!reader) {
        throw new Error("Failed to get response reader");
    }

    // Process streaming response chunks
    let done = false;
    while (!done) {
        const result = await reader.read();
        done = result.done;
        if (done) break;

        const value = result.value;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
            if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                    continue;
                }

                try {
                    const parsed = JSON.parse(data) as {
                        choices?: Array<{
                            delta?: {
                                content?: string;
                                tool_calls?: Array<{
                                    index: number;
                                    id?: string;
                                    function?: {
                                        name?: string;
                                        arguments?: string;
                                    };
                                }>;
                            };
                            finish_reason?: string;
                        }>;
                        usage?: {
                            prompt_tokens: number;
                            completion_tokens: number;
                            total_tokens: number;
                        };
                    };

                    if (parsed.choices && parsed.choices[0]) {
                        const choice = parsed.choices[0];
                        const delta = choice.delta;

                        if (delta?.content && executionId) {
                            // Emit token for streaming
                            await emitAgentToken({ executionId, token: delta.content, threadId });
                            fullContent += delta.content;
                        }

                        if (delta?.tool_calls) {
                            // Handle tool calls (for now, we'll collect them)
                            if (!toolCalls) {
                                toolCalls = [];
                            }
                            for (const toolCall of delta.tool_calls) {
                                if (toolCall.index !== undefined) {
                                    if (!toolCalls[toolCall.index]) {
                                        toolCalls[toolCall.index] = {
                                            id: toolCall.id || "",
                                            name: toolCall.function?.name || "",
                                            arguments: {}
                                        };
                                    } else {
                                        // Update id and name if they arrive in subsequent chunks
                                        if (toolCall.id) {
                                            toolCalls[toolCall.index].id = toolCall.id;
                                        }
                                        if (toolCall.function?.name) {
                                            toolCalls[toolCall.index].name = toolCall.function.name;
                                        }
                                    }
                                    // Accumulate arguments string fragments
                                    if (toolCall.function?.arguments) {
                                        if (!toolCallArgsStrings[toolCall.index]) {
                                            toolCallArgsStrings[toolCall.index] = "";
                                        }
                                        toolCallArgsStrings[toolCall.index] +=
                                            toolCall.function.arguments;
                                    }
                                }
                            }
                        }

                        if (choice.finish_reason) {
                            finishReason = choice.finish_reason;
                        }
                    }

                    if (parsed.usage) {
                        usage = {
                            promptTokens: parsed.usage.prompt_tokens,
                            completionTokens: parsed.usage.completion_tokens,
                            totalTokens: parsed.usage.total_tokens
                        };
                    }
                } catch {
                    // Skip invalid JSON lines
                    continue;
                }
            }
        }
    }

    // Parse accumulated argument strings into tool calls
    if (toolCalls) {
        for (let i = 0; i < toolCalls.length; i++) {
            if (toolCallArgsStrings[i]) {
                try {
                    toolCalls[i].arguments = JSON.parse(toolCallArgsStrings[i]);
                    activityLogger.debug("Parsed tool call arguments", {
                        toolName: toolCalls[i].name,
                        argsString: toolCallArgsStrings[i],
                        parsedArgs: toolCalls[i].arguments
                    });
                } catch (parseError) {
                    // If parsing fails, use empty object
                    activityLogger.warn("Failed to parse tool call arguments", {
                        toolName: toolCalls[i].name,
                        argsString: toolCallArgsStrings[i],
                        error: parseError instanceof Error ? parseError.message : "Unknown error"
                    });
                    toolCalls[i].arguments = {};
                }
            } else {
                activityLogger.warn("No arguments string accumulated for tool call", {
                    toolName: toolCalls[i].name,
                    toolCallIndex: i
                });
            }
        }
    }

    return {
        content: fullContent,
        tool_calls: toolCalls,
        isComplete: finishReason === "stop" && !toolCalls,
        usage
    };
}

async function callAnthropic(input: AnthropicCallInput): Promise<LLMResponse> {
    const { model, apiKey, messages, tools, temperature, maxTokens, executionId, threadId } = input;

    // Extract system prompt (first message)
    const systemPrompt = messages.find((m) => m.role === "system")?.content || "";
    const threadMessages = messages.filter((m) => m.role !== "system");

    // Format messages for Anthropic (sanitize tool names for consistency)
    const formattedMessages = threadMessages.map((msg) => {
        if (msg.role === "assistant") {
            return {
                role: "assistant",
                content: msg.tool_calls
                    ? [
                          { type: "text", text: msg.content },
                          ...msg.tool_calls.map((tc) => ({
                              type: "tool_use",
                              id: tc.id,
                              name: sanitizeToolName(tc.name),
                              input: tc.arguments
                          }))
                      ]
                    : msg.content
            };
        } else if (msg.role === "tool") {
            return {
                role: "user",
                content: [
                    {
                        type: "tool_result",
                        tool_use_id: msg.tool_call_id,
                        content: msg.content
                    }
                ]
            };
        } else {
            return {
                role: "user",
                content: msg.content
            };
        }
    });

    // Format tools for Anthropic with name and schema sanitization
    const formattedTools = tools.map((tool) => ({
        name: sanitizeToolName(tool.name),
        description: tool.description,
        input_schema: sanitizeJsonSchema(tool.schema)
    }));

    // Call Anthropic API with streaming enabled
    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
            model,
            system: systemPrompt,
            messages: formattedMessages,
            tools: formattedTools.length > 0 ? formattedTools : undefined,
            temperature,
            max_tokens: maxTokens,
            stream: true
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    // Process streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let toolCalls: ToolCall[] | undefined;
    let stopReason = "";
    let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;
    // Track tokens across streaming events (Anthropic may split input/output across events)
    let streamedInputTokens = 0;
    let streamedOutputTokens = 0;
    let sawUsageEvent = false;

    if (!reader) {
        throw new Error("Failed to get response reader");
    }

    // Track current tool use being built
    let currentToolUse: { id: string; name: string; input: string } | null = null;

    // Process streaming response chunks
    let done = false;
    while (!done) {
        const result = await reader.read();
        done = result.done;
        if (done) break;

        const chunk = decoder.decode(result.value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
            if (line.startsWith("data: ")) {
                const data = line.slice(6);

                try {
                    const parsed = JSON.parse(data) as {
                        type: string;
                        index?: number;
                        delta?: {
                            type?: string;
                            text?: string;
                            stop_reason?: string;
                        };
                        content_block?: {
                            type: string;
                            id?: string;
                            name?: string;
                            text?: string;
                            input?: JsonObject;
                        };
                        usage?: {
                            input_tokens?: number;
                            output_tokens?: number;
                        };
                        message?: {
                            usage?: {
                                input_tokens: number;
                                output_tokens: number;
                            };
                        };
                    };

                    // Handle content block delta (streaming text)
                    if (
                        parsed.type === "content_block_delta" &&
                        parsed.delta?.type === "text_delta"
                    ) {
                        const text = parsed.delta.text;
                        if (text && executionId) {
                            // Emit token immediately for streaming
                            await emitAgentToken({ executionId, token: text, threadId });
                            fullContent += text;
                        }
                    }

                    // Handle content block start (for tool use)
                    if (
                        parsed.type === "content_block_start" &&
                        parsed.content_block?.type === "tool_use"
                    ) {
                        currentToolUse = {
                            id: parsed.content_block.id || "",
                            name: parsed.content_block.name || "",
                            input: ""
                        };
                    }

                    // Handle input_json delta (for tool arguments)
                    if (
                        parsed.type === "content_block_delta" &&
                        parsed.delta?.type === "input_json_delta"
                    ) {
                        if (currentToolUse && parsed.delta.text) {
                            currentToolUse.input += parsed.delta.text;
                        }
                    }

                    // Handle content block stop (finalize tool use)
                    if (parsed.type === "content_block_stop" && currentToolUse) {
                        if (!toolCalls) toolCalls = [];
                        try {
                            toolCalls.push({
                                id: currentToolUse.id,
                                name: currentToolUse.name,
                                arguments: JSON.parse(currentToolUse.input)
                            });
                        } catch (error) {
                            activityLogger.error(
                                "Failed to parse Anthropic tool input JSON",
                                error instanceof Error ? error : new Error(String(error))
                            );
                        }
                        currentToolUse = null;
                    }

                    // Handle message delta (stop reason)
                    if (parsed.type === "message_delta" && parsed.delta?.stop_reason) {
                        stopReason = parsed.delta.stop_reason;
                    }

                    // Capture usage tokens (Anthropic streams usage on multiple event types)
                    if (parsed.usage) {
                        if (typeof parsed.usage.input_tokens === "number") {
                            streamedInputTokens = parsed.usage.input_tokens;
                        }
                        if (typeof parsed.usage.output_tokens === "number") {
                            streamedOutputTokens = parsed.usage.output_tokens;
                        }
                        sawUsageEvent = true;
                    }

                    // Also capture usage from message payloads if present
                    if (
                        (parsed.type === "message_start" || parsed.type === "message_stop") &&
                        parsed.message?.usage
                    ) {
                        streamedInputTokens =
                            parsed.message.usage.input_tokens ?? streamedInputTokens;
                        streamedOutputTokens =
                            parsed.message.usage.output_tokens ?? streamedOutputTokens;
                        sawUsageEvent = true;
                    }
                } catch {
                    // Skip invalid JSON lines
                    continue;
                }
            }
        }
    }

    // Finalize usage if we captured any token counts (or saw an explicit usage event)
    if (sawUsageEvent || streamedInputTokens > 0 || streamedOutputTokens > 0) {
        usage = {
            promptTokens: streamedInputTokens,
            completionTokens: streamedOutputTokens,
            totalTokens: streamedInputTokens + streamedOutputTokens
        };
    }

    return {
        content: fullContent,
        tool_calls: toolCalls,
        isComplete: stopReason === "end_turn" && !toolCalls,
        usage
    };
}

async function callGoogle(input: GoogleCallInput): Promise<LLMResponse> {
    const { model, apiKey, messages, tools, temperature, maxTokens, executionId, threadId } = input;

    // Extract system prompt
    const systemPrompt = messages.find((m) => m.role === "system")?.content || "";
    const threadMessages = messages.filter((m) => m.role !== "system");

    // Format messages for Gemini (sanitize tool names for consistency)
    const formattedMessages = threadMessages.map((msg) => {
        if (msg.role === "assistant") {
            return {
                role: "model",
                parts: [{ text: msg.content }]
            };
        } else if (msg.role === "tool") {
            return {
                role: "function",
                parts: [
                    {
                        functionResponse: {
                            name: sanitizeToolName(msg.tool_name || ""),
                            response: {
                                content: msg.content
                            }
                        }
                    }
                ]
            };
        } else {
            return {
                role: "user",
                parts: [{ text: msg.content }]
            };
        }
    });

    // Format tools for Gemini with name sanitization
    const formattedTools =
        tools.length > 0
            ? {
                  functionDeclarations: tools.map((tool) => ({
                      name: sanitizeToolName(tool.name),
                      description: tool.description,
                      parameters: sanitizeJsonSchema(tool.schema)
                  }))
              }
            : undefined;

    // Call Google Gemini API with streaming
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            contents: formattedMessages,
            tools: formattedTools ? [formattedTools] : undefined,
            systemInstruction: systemPrompt
                ? {
                      parts: [{ text: systemPrompt }]
                  }
                : undefined,
            generationConfig: {
                temperature,
                maxOutputTokens: maxTokens
            }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google API error: ${response.status} - ${error}`);
    }

    // Process streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let toolCalls: ToolCall[] | undefined;
    let finishReason = "";
    let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;

    if (!reader) {
        throw new Error("Failed to get response reader");
    }

    let done = false;
    while (!done) {
        const result = await reader.read();
        done = result.done;
        if (done) break;

        const chunk = decoder.decode(result.value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
            if (line.startsWith("data: ")) {
                const data = line.slice(6);

                try {
                    const parsed = JSON.parse(data) as {
                        candidates?: Array<{
                            content?: {
                                parts?: Array<{
                                    text?: string;
                                    functionCall?: {
                                        name: string;
                                        args: JsonObject;
                                    };
                                }>;
                            };
                            finishReason?: string;
                        }>;
                        usageMetadata?: {
                            promptTokenCount: number;
                            candidatesTokenCount: number;
                            totalTokenCount: number;
                        };
                    };

                    const candidate = parsed.candidates?.[0];
                    if (candidate?.content?.parts) {
                        for (const part of candidate.content.parts) {
                            if (part.text) {
                                fullContent += part.text;
                                if (executionId) {
                                    await emitAgentToken({
                                        executionId,
                                        token: part.text,
                                        threadId
                                    });
                                }
                            }
                            if (part.functionCall) {
                                if (!toolCalls) toolCalls = [];
                                toolCalls.push({
                                    id: `google-${Date.now()}-${toolCalls.length}`,
                                    name: part.functionCall.name,
                                    arguments: part.functionCall.args
                                });
                            }
                        }
                    }

                    if (candidate?.finishReason) {
                        finishReason = candidate.finishReason;
                    }

                    if (parsed.usageMetadata) {
                        usage = {
                            promptTokens: parsed.usageMetadata.promptTokenCount,
                            completionTokens: parsed.usageMetadata.candidatesTokenCount,
                            totalTokens: parsed.usageMetadata.totalTokenCount
                        };
                    }
                } catch {
                    // Skip invalid JSON lines
                    continue;
                }
            }
        }
    }

    return {
        content: fullContent,
        tool_calls: toolCalls,
        isComplete: finishReason === "STOP" && !toolCalls,
        usage
    };
}

async function callCohere(input: CohereCallInput): Promise<LLMResponse> {
    const { model, apiKey, messages, tools, temperature, maxTokens, executionId, threadId } = input;

    // Extract system prompt
    const systemPrompt = messages.find((m) => m.role === "system")?.content || "";
    const threadMessages = messages.filter((m) => m.role !== "system");

    // Format messages for Cohere
    const formattedMessages = threadMessages.map((msg) => ({
        role: msg.role === "assistant" ? "CHATBOT" : "USER",
        message: msg.content
    }));

    // Format tools for Cohere with name sanitization
    const formattedTools =
        tools.length > 0
            ? tools.map((tool) => ({
                  name: sanitizeToolName(tool.name),
                  description: tool.description,
                  parameter_definitions: tool.schema.properties || {}
              }))
            : undefined;

    // Call Cohere API with streaming
    const response = await fetch("https://api.cohere.ai/v1/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            message: formattedMessages[formattedMessages.length - 1]?.message || "",
            chat_history: formattedMessages.slice(0, -1),
            preamble: systemPrompt || undefined,
            tools: formattedTools,
            temperature,
            max_tokens: maxTokens,
            stream: true
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cohere API error: ${response.status} - ${error}`);
    }

    // Process streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let toolCalls: ToolCall[] | undefined;
    let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;

    if (!reader) {
        throw new Error("Failed to get response reader");
    }

    let done = false;
    while (!done) {
        const result = await reader.read();
        done = result.done;
        if (done) break;

        const chunk = decoder.decode(result.value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
            try {
                const jsonLine = line.startsWith("data: ") ? line.slice(6) : line;
                const parsed = JSON.parse(jsonLine) as {
                    event_type?: string;
                    text?: string;
                    tool_calls?: Array<{
                        name: string;
                        parameters: JsonObject;
                    }>;
                    finish_reason?: string;
                    meta?: {
                        tokens?: {
                            input_tokens?: number;
                            output_tokens?: number;
                        };
                    };
                    response?: {
                        meta?: {
                            tokens?: {
                                input_tokens?: number;
                                output_tokens?: number;
                            };
                        };
                    };
                };

                if (parsed.event_type === "text-generation" && parsed.text) {
                    fullContent += parsed.text;
                    if (executionId) {
                        await emitAgentToken({ executionId, token: parsed.text, threadId });
                    }
                }

                if (parsed.event_type === "tool-calls-generation" && parsed.tool_calls) {
                    toolCalls = parsed.tool_calls.map((tc, idx) => ({
                        id: `cohere-${Date.now()}-${idx}`,
                        name: tc.name,
                        arguments: tc.parameters
                    }));
                }

                if (parsed.meta?.tokens) {
                    usage = {
                        promptTokens: parsed.meta.tokens.input_tokens || 0,
                        completionTokens: parsed.meta.tokens.output_tokens || 0,
                        totalTokens:
                            (parsed.meta.tokens.input_tokens || 0) +
                            (parsed.meta.tokens.output_tokens || 0)
                    };
                }

                // Final token usage may arrive on stream-end response envelope
                if (parsed.event_type === "stream-end" && parsed.response?.meta?.tokens) {
                    const tokens = parsed.response.meta.tokens;
                    usage = {
                        promptTokens: tokens.input_tokens || 0,
                        completionTokens: tokens.output_tokens || 0,
                        totalTokens: (tokens.input_tokens || 0) + (tokens.output_tokens || 0)
                    };
                }
            } catch {
                continue;
            }
        }
    }

    return {
        content: fullContent,
        tool_calls: toolCalls,
        isComplete: !toolCalls,
        usage
    };
}

async function callHuggingFace(input: HuggingFaceCallInput): Promise<LLMResponse> {
    const { model, apiKey, messages, temperature, maxTokens, executionId, threadId } = input;

    // Format messages for Hugging Face (OpenAI-compatible format)
    const formattedMessages = messages.map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : msg.role === "tool" ? "assistant" : "user",
        content: msg.content
    }));

    // Using the OpenAI-compatible Inference API endpoint
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: `${model}:fastest`, // Use :fastest suffix for best performance
            messages: formattedMessages,
            temperature,
            max_tokens: maxTokens,
            stream: true // Enable streaming for token-by-token responses
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Hugging Face API error: ${response.status} - ${error}`);
    }

    let fullContent = "";

    // Handle streaming response (SSE format)
    if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let result = await reader.read();
        while (!result.done) {
            const chunk = decoder.decode(result.value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
                if (!line.trim() || line.startsWith(":")) continue;

                if (line.startsWith("data: ")) {
                    const data = line.slice(6);
                    if (data === "[DONE]") continue;

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content || "";

                        if (content) {
                            fullContent += content;
                            if (executionId) {
                                await emitAgentToken({ executionId, token: content, threadId });
                            }
                        }
                    } catch {
                        continue;
                    }
                }
            }

            result = await reader.read();
        }
    }

    return {
        content: fullContent,
        tool_calls: undefined,
        isComplete: true,
        usage: undefined
    };
}

// =============================================================================
// Internal Tool Execution Functions
// =============================================================================

async function executeWorkflowTool(input: ExecuteWorkflowToolInput): Promise<JsonObject> {
    const { tool, arguments: args, userId } = input;

    if (!tool.config.workflowId) {
        throw new Error("Workflow tool missing workflowId in config");
    }

    // Load workflow
    const workflow = await workflowRepo.findById(tool.config.workflowId);
    if (!workflow) {
        throw new Error(`Workflow ${tool.config.workflowId} not found`);
    }

    // Verify ownership
    if (workflow.user_id !== userId) {
        throw new Error("Access denied to workflow");
    }

    // Validate workflow definition
    if (!workflow.definition || typeof workflow.definition !== "object") {
        throw new Error(`Workflow ${workflow.id} has invalid definition`);
    }

    interface WorkflowDefinition {
        nodes: Record<string, unknown>;
        edges: Array<unknown>;
    }

    const definition = workflow.definition as WorkflowDefinition;
    if (!definition.nodes || !definition.edges) {
        throw new Error(`Workflow ${workflow.id} definition missing nodes or edges`);
    }

    // Import Temporal client for workflow execution
    const { Connection, Client } = await import("@temporalio/client");
    const connection = await Connection.connect({
        address: appConfig.temporal.address
    });
    const client = new Client({
        connection,
        namespace: "default"
    });

    // Generate execution ID for the workflow
    const workflowExecutionId = `wf-tool-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
        // Start workflow execution
        const handle = await client.workflow.start("orchestratorWorkflow", {
            taskQueue: "flowmaestro-orchestrator",
            workflowId: workflowExecutionId,
            args: [
                {
                    executionId: workflowExecutionId,
                    workflowDefinition: {
                        name: workflow.name,
                        nodes: definition.nodes,
                        edges: definition.edges
                    },
                    inputs: args,
                    userId
                }
            ]
        });

        // Wait for workflow to complete
        const result = await handle.result();

        // Return workflow execution result
        return {
            success: result.success,
            workflowId: workflow.id,
            workflowName: workflow.name,
            executionId: workflowExecutionId,
            outputs: result.outputs,
            ...(result.error && { error: result.error })
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Workflow execution failed: ${errorMessage}`);
    }
}

async function executeFunctionTool(input: ExecuteFunctionToolInput): Promise<JsonObject> {
    const { tool, arguments: args, userId, agentId, executionId } = input;

    // Built-in functions
    switch (tool.config.functionName) {
        case "search_thread_memory":
            if (!agentId || !userId) {
                throw new Error("search_thread_memory requires agentId and userId");
            }
            return await executeSearchThreadMemory({
                agentId,
                userId,
                executionId,
                arguments: args
            });

        case "clear_thread_memory":
            if (!agentId || !userId || !executionId) {
                throw new Error("clear_thread_memory requires agentId, userId, and executionId");
            }
            // Require explicit confirmation to prevent accidental clearing
            if (args.confirmation !== true) {
                return {
                    success: false,
                    error: "confirmation_required",
                    message:
                        "You must set confirmation: true to clear thread memory. This prevents accidental clearing."
                };
            }
            return await executeClearThreadMemory({
                executionId,
                agentId,
                userId,
                reason: typeof args.reason === "string" ? args.reason : undefined
            });

        case "update_working_memory":
            if (!agentId || !userId) {
                throw new Error("update_working_memory requires agentId and userId");
            }
            if (typeof args.newMemory !== "string" || args.newMemory.trim().length === 0) {
                return {
                    success: false,
                    error: "invalid_input",
                    message: "newMemory must be a non-empty string"
                };
            }
            return await executeUpdateWorkingMemory({
                agentId,
                userId,
                newMemory: args.newMemory,
                searchString: typeof args.searchString === "string" ? args.searchString : undefined
            });

        case "get_current_time":
            return await getCurrentTime(args);

        case "calculate":
            return await calculate(args);

        case "format_date":
            return await formatDate(args);

        case "parse_json":
            return await parseJson(args);

        case "validate_email":
            return await validateEmail(args);

        case "generate_random_number":
            return await generateRandomNumber(args);

        case "generate_uuid":
            return await generateUuid();

        case "encode_base64":
            return await encodeBase64(args);

        case "decode_base64":
            return await decodeBase64(args);

        case "hash_text":
            return await hashText(args);

        default:
            throw new Error(`Unknown function: ${tool.config.functionName}`);
    }
}

async function executeBuiltInTool(input: ExecuteBuiltInToolInput): Promise<JsonObject> {
    const { tool, arguments: args, userId, workspaceId, executionId, metadata } = input;

    activityLogger.info("Executing built-in tool", {
        toolName: tool.name,
        userId,
        workspaceId
    });

    // Determine execution mode based on metadata
    const mode = metadata?.personaInstanceId ? "persona" : "agent";

    // Create execution context for the tools module
    const context: ToolExecutionContext = {
        userId,
        workspaceId,
        mode,
        traceId: executionId,
        metadata
    };

    // Execute via the tools module
    const result = await executeTool(tool.name, args as Record<string, unknown>, context);

    if (!result.success) {
        const errorMessage = result.error?.message || `Built-in tool ${tool.name} execution failed`;
        activityLogger.error("Built-in tool execution failed", new Error(errorMessage), {
            toolName: tool.name,
            code: result.error?.code
        });
        throw new Error(errorMessage);
    }

    activityLogger.info("Built-in tool execution completed", {
        toolName: tool.name,
        durationMs: result.metadata?.durationMs,
        creditCost: result.metadata?.creditCost
    });

    return (result.data as JsonObject) || { success: true };
}

async function executeKnowledgeBaseTool(input: ExecuteKnowledgeBaseToolInput): Promise<JsonObject> {
    const { tool, arguments: args, userId } = input;

    if (!tool.config.knowledgeBaseId) {
        throw new Error("Knowledge base tool missing knowledgeBaseId in config");
    }

    if (typeof args.query !== "string") {
        throw new Error("Knowledge base tool requires 'query' string argument");
    }

    const query = args.query;
    const topK = typeof args.topK === "number" ? args.topK : 10;
    // Default to 0.3 to match the API endpoint behavior (0.7 was too restrictive)
    const minScore = typeof args.minScore === "number" ? args.minScore : 0.3;

    activityLogger.info("Executing knowledge base search", {
        knowledgeBaseId: tool.config.knowledgeBaseId,
        query,
        topK,
        minScore
    });

    // Import required services
    const { KnowledgeBaseRepository } = await import(
        "../../../storage/repositories/KnowledgeBaseRepository"
    );
    const { KnowledgeChunkRepository } = await import(
        "../../../storage/repositories/KnowledgeChunkRepository"
    );
    const { EmbeddingService } = await import("../../../services/embeddings/EmbeddingService");

    const kbRepo = new KnowledgeBaseRepository();
    const chunkRepo = new KnowledgeChunkRepository();
    const embeddingService = new EmbeddingService();

    try {
        // Load knowledge base
        const knowledgeBase = await kbRepo.findById(tool.config.knowledgeBaseId);
        if (!knowledgeBase) {
            throw new Error(`Knowledge base ${tool.config.knowledgeBaseId} not found`);
        }

        // Verify ownership (knowledge bases are user-scoped)
        if (knowledgeBase.user_id !== userId) {
            throw new Error("Access denied to knowledge base");
        }

        // Generate embedding for the query
        const queryEmbedding = await embeddingService.generateQueryEmbedding(
            query,
            {
                model: knowledgeBase.config.embeddingModel || "text-embedding-3-small",
                provider: knowledgeBase.config.embeddingProvider || "openai",
                dimensions: knowledgeBase.config.embeddingDimensions
            },
            userId
        );

        // Search for similar chunks
        const searchResults = await chunkRepo.searchSimilar({
            knowledge_base_id: tool.config.knowledgeBaseId,
            query_embedding: queryEmbedding,
            top_k: topK,
            similarity_threshold: minScore
        });

        activityLogger.info("Knowledge base search completed", {
            knowledgeBaseId: tool.config.knowledgeBaseId,
            knowledgeBaseName: knowledgeBase.name,
            query,
            resultCount: searchResults.length,
            topSimilarity: searchResults.length > 0 ? searchResults[0].similarity : null
        });

        // Format results for the agent
        const formattedResults = searchResults.map((result, index) => ({
            rank: index + 1,
            content: result.content,
            source: result.document_name,
            chunkIndex: result.chunk_index,
            similarity: result.similarity,
            metadata: result.metadata
        }));

        return {
            success: true,
            query,
            knowledgeBaseName: knowledgeBase.name,
            resultCount: formattedResults.length,
            results: formattedResults as unknown as JsonValue[],
            // Provide a summary for the LLM
            summary:
                formattedResults.length > 0
                    ? `Found ${formattedResults.length} relevant document chunks from "${knowledgeBase.name}"`
                    : `No relevant information found in "${knowledgeBase.name}" for the query`
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Knowledge base query failed: ${errorMessage}`);
    }
}

async function executeAgentTool(input: ExecuteAgentToolInput): Promise<JsonObject> {
    const { tool, arguments: args, userId } = input;

    if (!tool.config.agentId) {
        throw new Error("Agent tool missing agentId in config");
    }

    // Extract input from arguments
    const agentInput = (args.input as string) || "";
    const agentContext = (args.context as JsonObject) || {};

    // Import Temporal client for agent execution
    const { Connection, Client } = await import("@temporalio/client");
    const connection = await Connection.connect({
        address: appConfig.temporal.address
    });
    const client = new Client({
        connection,
        namespace: "default"
    });

    // Generate execution ID for the agent
    const agentExecutionId = `agent-tool-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
        // Import repositories
        const { ThreadRepository } = await import("../../../storage/repositories/ThreadRepository");
        const { AgentRepository } = await import("../../../storage/repositories/AgentRepository");
        const threadRepo = new ThreadRepository();
        const agentRepo = new AgentRepository();

        // Get the agent to retrieve its workspace_id
        const agent = await agentRepo.findById(tool.config.agentId);
        if (!agent) {
            throw new Error(`Agent ${tool.config.agentId} not found`);
        }

        // Create a thread for this agent execution
        const thread = await threadRepo.create({
            user_id: userId,
            workspace_id: agent.workspace_id,
            agent_id: tool.config.agentId,
            title: `Agent Tool Call: ${agentInput.substring(0, 50)}...`
        });

        // Create execution record linked to thread
        const execution = await executionRepo.create({
            agent_id: tool.config.agentId,
            user_id: userId,
            thread_id: thread.id,
            status: "running",
            thread_history: [
                {
                    id: `user-${Date.now()}`,
                    role: "user",
                    content: agentInput,
                    timestamp: new Date()
                }
            ],
            metadata: {
                message: agentInput,
                context: agentContext
            }
        });

        // Start agent execution workflow
        const handle = await client.workflow.start("agentOrchestratorWorkflow", {
            taskQueue: "flowmaestro-orchestrator",
            workflowId: agentExecutionId,
            args: [
                {
                    executionId: execution.id,
                    agentId: tool.config.agentId,
                    userId,
                    threadId: thread.id,
                    initialMessage: agentInput
                }
            ]
        });

        // Wait for agent to complete (with timeout)
        const result = await handle.result();

        if (!result.success) {
            throw new Error(result.error || "Agent execution failed");
        }

        // Return agent's final response
        return {
            success: true,
            agentId: tool.config.agentId,
            agentName: tool.config.agentName || "Unknown Agent",
            executionId: execution.id,
            response: result.finalMessage || "",
            iterations: result.iterations,
            // Include the full thread messages if needed
            threadMessages: result.serializedConversation?.messages.map((msg: ThreadMessage) => ({
                role: msg.role,
                content: msg.content
            }))
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Agent execution failed: ${errorMessage}`);
    }
}

async function executeMCPToolCall(input: ExecuteMCPToolInput): Promise<JsonObject> {
    const { tool, arguments: args, userId } = input;

    if (!tool.config.connectionId) {
        throw new Error("MCP tool missing connectionId in config");
    }

    if (!tool.config.provider) {
        throw new Error("MCP tool missing provider in config");
    }

    // Load connection
    const connection = await connectionRepo.findByIdWithData(tool.config.connectionId);
    if (!connection) {
        throw new Error(`Connection ${tool.config.connectionId} not found`);
    }

    // Verify ownership
    if (connection.user_id !== userId) {
        throw new Error("Access denied to connection");
    }

    // Execute MCP tool via ExecutionRouter
    try {
        const result = await executionRouter.executeMCPTool(
            tool.config.provider,
            tool.name,
            args,
            connection
        );

        return {
            success: true,
            provider: tool.config.provider,
            toolName: tool.name,
            result: result as JsonValue
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        activityLogger.error(
            "MCP tool execution failed",
            error instanceof Error ? error : new Error(errorMessage),
            { toolName: tool.name }
        );
        throw new Error(`MCP tool execution failed: ${errorMessage}`);
    }
}

// =============================================================================
// Internal Built-in Function Implementations
// =============================================================================

async function executeSearchThreadMemory(
    input: ExecuteSearchThreadMemoryInput
): Promise<JsonObject> {
    const { agentId, userId, executionId, arguments: args } = input;

    if (typeof args.query !== "string") {
        throw new Error("search_thread_memory requires 'query' string argument");
    }

    const query = args.query;
    const topK = typeof args.topK === "number" ? args.topK : 5;
    const similarityThreshold =
        typeof args.similarityThreshold === "number" ? args.similarityThreshold : 0.7;
    const contextWindow = typeof args.contextWindow === "number" ? args.contextWindow : 2;
    // Default to searching past executions (true) since the tool is for recalling past interactions
    // Only search current execution if explicitly set to false
    const searchPastExecutions = args.searchPastExecutions !== false;
    const messageRoles = Array.isArray(args.messageRoles) ? args.messageRoles : undefined;

    try {
        const result = await searchThreadMemoryActivity({
            agentId,
            userId,
            query,
            topK,
            similarityThreshold,
            contextWindow,
            // When searching past executions: don't filter by executionId, but exclude current
            // When searching only current: filter by executionId, don't exclude
            executionId: searchPastExecutions ? undefined : executionId,
            excludeCurrentExecution: searchPastExecutions && executionId ? true : false,
            messageRoles: messageRoles as ("user" | "assistant" | "system" | "tool")[] | undefined
        });

        return {
            success: true,
            query: result.query,
            resultCount: result.totalResults,
            contextWindow: result.contextWindowSize,
            // Return formatted text for easy inclusion in LLM context
            formattedResults: result.formattedForLLM,
            // Also return structured data
            results: result.results.map(
                (r: {
                    content: string;
                    message_role: string;
                    similarity: number;
                    execution_id: string;
                    context_before?: Array<{ role: string; content: string }>;
                    context_after?: Array<{ role: string; content: string }>;
                }) => ({
                    content: r.content,
                    role: r.message_role,
                    similarity: r.similarity,
                    executionId: r.execution_id,
                    contextBefore:
                        r.context_before
                            ?.map(
                                (c: { role: string; content: string }) => `${c.role}: ${c.content}`
                            )
                            .join("\n") || null,
                    contextAfter:
                        r.context_after
                            ?.map(
                                (c: { role: string; content: string }) => `${c.role}: ${c.content}`
                            )
                            .join("\n") || null
                })
            )
        };
    } catch (error) {
        activityLogger.error(
            "Error searching conversation memory",
            error instanceof Error ? error : new Error(String(error))
        );
        return {
            success: false,
            error: true,
            message: error instanceof Error ? error.message : "Failed to search conversation memory"
        };
    }
}

async function getCurrentTime(args: JsonObject): Promise<JsonObject> {
    const timezone = typeof args.timezone === "string" ? args.timezone : "UTC";
    const date = new Date();

    return {
        timestamp: date.toISOString(),
        timezone,
        unix: Math.floor(date.getTime() / 1000),
        formatted: date.toLocaleString("en-US", { timeZone: timezone })
    };
}

async function calculate(args: JsonObject): Promise<JsonObject> {
    if (typeof args.expression !== "string") {
        throw new Error("Calculate requires 'expression' string argument");
    }

    try {
        // Use mathjs for safe mathematical expression evaluation
        const { evaluate } = await import("mathjs");
        const result = evaluate(args.expression);

        return {
            expression: args.expression,
            result: typeof result === "number" ? result : String(result)
        };
    } catch (error) {
        throw new Error(
            `Calculate error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

async function formatDate(args: JsonObject): Promise<JsonObject> {
    const dateInput = args.date;
    const format = typeof args.format === "string" ? args.format : "ISO";

    let date: Date;
    if (typeof dateInput === "string") {
        date = new Date(dateInput);
    } else if (typeof dateInput === "number") {
        date = new Date(dateInput);
    } else {
        date = new Date();
    }

    if (isNaN(date.getTime())) {
        throw new Error("Invalid date input");
    }

    const formats: Record<string, string> = {
        ISO: date.toISOString(),
        UTC: date.toUTCString(),
        locale: date.toLocaleString(),
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString()
    };

    return {
        formatted: formats[format] || date.toISOString(),
        timestamp: date.toISOString()
    };
}

async function parseJson(args: JsonObject): Promise<JsonObject> {
    if (typeof args.json !== "string") {
        throw new Error("parseJson requires 'json' string argument");
    }

    try {
        const parsed = JSON.parse(args.json);
        return {
            success: true,
            data: parsed
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Invalid JSON"
        };
    }
}

async function validateEmail(args: JsonObject): Promise<JsonObject> {
    if (typeof args.email !== "string") {
        throw new Error("validateEmail requires 'email' string argument");
    }

    // Basic email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(args.email);

    return {
        email: args.email,
        isValid,
        reason: isValid ? "Valid email format" : "Invalid email format"
    };
}

async function generateRandomNumber(args: JsonObject): Promise<JsonObject> {
    const min = typeof args.min === "number" ? args.min : 0;
    const max = typeof args.max === "number" ? args.max : 100;

    const random = Math.floor(Math.random() * (max - min + 1)) + min;

    return {
        number: random,
        min,
        max
    };
}

async function generateUuid(): Promise<JsonObject> {
    // Simple UUID v4 generation
    const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });

    return {
        uuid
    };
}

async function encodeBase64(args: JsonObject): Promise<JsonObject> {
    if (typeof args.text !== "string") {
        throw new Error("encodeBase64 requires 'text' string argument");
    }

    const encoded = Buffer.from(args.text, "utf-8").toString("base64");

    return {
        original: args.text,
        encoded
    };
}

async function decodeBase64(args: JsonObject): Promise<JsonObject> {
    if (typeof args.encoded !== "string") {
        throw new Error("decodeBase64 requires 'encoded' string argument");
    }

    try {
        const decoded = Buffer.from(args.encoded, "base64").toString("utf-8");

        return {
            encoded: args.encoded,
            decoded
        };
    } catch (_error) {
        throw new Error("Invalid base64 string");
    }
}

async function hashText(args: JsonObject): Promise<JsonObject> {
    if (typeof args.text !== "string") {
        throw new Error("hashText requires 'text' string argument");
    }

    const { createHash } = await import("crypto");
    const algorithm = typeof args.algorithm === "string" ? args.algorithm : "sha256";

    try {
        const hash = createHash(algorithm).update(args.text).digest("hex");

        return {
            text: args.text,
            algorithm,
            hash
        };
    } catch (error) {
        throw new Error(
            `Hashing error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}
