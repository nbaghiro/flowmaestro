import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import {
    validateToolInput,
    coerceToolArguments,
    createValidationErrorResponse
} from "../../../core/validation/tool-validation";
import { ExecutionRouter } from "../../../integrations/core/ExecutionRouter";
import { providerRegistry } from "../../../integrations/registry";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { WorkflowRepository } from "../../../storage/repositories/WorkflowRepository";
import { emitAgentToken } from "./agent-events"; // OLD: Will be removed after migration
import { searchThreadMemory as searchThreadMemoryActivity } from "./thread-memory-activities";
import { injectThreadMemoryTool } from "./thread-memory-tool";
import type { Tool } from "../../../storage/models/Agent";
import type { ThreadMessage, ToolCall } from "../../../storage/models/AgentExecution";
import type { AgentConfig, LLMResponse } from "../../workflows/agent-orchestrator-workflow";

const agentRepo = new AgentRepository();
const executionRepo = new AgentExecutionRepository();
const workflowRepo = new WorkflowRepository();
const connectionRepo = new ConnectionRepository();
const executionRouter = new ExecutionRouter(providerRegistry);

/**
 * Get agent configuration for workflow execution
 */
export interface GetAgentConfigInput {
    agentId: string;
    userId: string;
}

export async function getAgentConfig(input: GetAgentConfigInput): Promise<AgentConfig> {
    const { agentId, userId } = input;

    const agent = await agentRepo.findByIdAndUserId(agentId, userId);
    if (!agent) {
        throw new Error(`Agent ${agentId} not found or access denied`);
    }

    // Inject conversation memory tool for semantic search
    const toolsWithMemory = injectThreadMemoryTool(agent.available_tools);

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
    threadId: string; // NEW: Required for thread-scoped streaming events
}

export async function callLLM(input: CallLLMInput): Promise<LLMResponse> {
    const { model, provider, connectionId, messages, tools, temperature, maxTokens, threadId } =
        input;

    // Get API credentials from connection
    // Also update provider if connection is overridden (connection determines provider)
    let apiKey: string | null = null;
    let actualProvider = provider;

    if (connectionId) {
        const connection = await connectionRepo.findByIdWithData(connectionId);
        if (connection && connection.data) {
            // Use the connection's provider (important for overrides)
            actualProvider = connection.provider as typeof provider;

            console.log(
                `[callLLM] Connection override detected: ${provider} -> ${actualProvider}, model: ${model}`
            );

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
                apiKey = process.env.OPENAI_API_KEY || null;
                break;
            case "anthropic":
                apiKey = process.env.ANTHROPIC_API_KEY || null;
                break;
            case "google":
                apiKey = process.env.GOOGLE_API_KEY || null;
                break;
            case "cohere":
                apiKey = process.env.COHERE_API_KEY || null;
                break;
            case "huggingface":
                apiKey = process.env.HUGGINGFACE_API_KEY || null;
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

/**
 * Call OpenAI API
 */
interface OpenAICallInput {
    model: string;
    apiKey: string;
    messages: ThreadMessage[];
    tools: Tool[];
    temperature: number;
    maxTokens: number;
    executionId?: string;
    threadId: string; // NEW: Required for thread-scoped streaming events
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

async function callOpenAI(input: OpenAICallInput): Promise<LLMResponse> {
    const { model, apiKey, messages, tools, temperature, maxTokens, executionId } = input;

    // Format messages for OpenAI
    const formattedMessages = messages.map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : msg.role === "tool" ? "tool" : "user",
        content: msg.content,
        ...(msg.tool_calls && {
            tool_calls: msg.tool_calls.map((tc) => ({
                id: tc.id,
                type: "function",
                function: {
                    name: tc.name,
                    arguments:
                        typeof tc.arguments === "string"
                            ? tc.arguments
                            : JSON.stringify(tc.arguments)
                }
            }))
        }),
        ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
        ...(msg.tool_name && { name: msg.tool_name })
    }));

    // Format tools for OpenAI function calling with schema sanitization
    const formattedTools = tools.map((tool) => ({
        type: "function",
        function: {
            name: tool.name,
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
                            console.log(
                                `[LLM Stream] Emitting token for execution ${executionId}: "${delta.content}"`
                            );
                            await emitAgentToken({ executionId, token: delta.content });
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
                                    }
                                    if (toolCall.function?.arguments) {
                                        try {
                                            const existingArgs =
                                                (toolCalls[toolCall.index].arguments as Record<
                                                    string,
                                                    unknown
                                                >) || {};
                                            const newArgs = JSON.parse(toolCall.function.arguments);
                                            toolCalls[toolCall.index].arguments = {
                                                ...existingArgs,
                                                ...newArgs
                                            };
                                        } catch {
                                            // Partial JSON, continue accumulating
                                        }
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

    return {
        content: fullContent,
        tool_calls: toolCalls,
        isComplete: finishReason === "stop" && !toolCalls,
        usage
    };
}

/**
 * Call Anthropic API
 */
interface AnthropicCallInput {
    model: string;
    apiKey: string;
    messages: ThreadMessage[];
    tools: Tool[];
    temperature: number;
    maxTokens: number;
    executionId?: string;
    threadId: string; // NEW: Required for thread-scoped streaming events
}

async function callAnthropic(input: AnthropicCallInput): Promise<LLMResponse> {
    const { model, apiKey, messages, tools, temperature, maxTokens, executionId } = input;

    // Extract system prompt (first message)
    const systemPrompt = messages.find((m) => m.role === "system")?.content || "";
    const threadMessages = messages.filter((m) => m.role !== "system");

    // Format messages for Anthropic
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
                              name: tc.name,
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

    // Format tools for Anthropic with schema sanitization
    const formattedTools = tools.map((tool) => ({
        name: tool.name,
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
            stream: true // ✅ Enable streaming
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
                            // ✅ Emit token immediately for streaming
                            console.log(
                                `[LLM Stream] Emitting Anthropic token for execution ${executionId}: "${text}"`
                            );
                            await emitAgentToken({ executionId, token: text });
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
                            console.error("[Anthropic] Failed to parse tool input JSON:", error);
                        }
                        currentToolUse = null;
                    }

                    // Handle message delta (stop reason)
                    if (parsed.type === "message_delta" && parsed.delta?.stop_reason) {
                        stopReason = parsed.delta.stop_reason;
                    }

                    // Handle message start (usage info)
                    if (parsed.type === "message_start" && parsed.message?.usage) {
                        usage = {
                            promptTokens: parsed.message.usage.input_tokens,
                            completionTokens: parsed.message.usage.output_tokens,
                            totalTokens:
                                parsed.message.usage.input_tokens +
                                parsed.message.usage.output_tokens
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
        isComplete: stopReason === "end_turn" && !toolCalls,
        usage
    };
}

/**
 * Call Google Gemini API
 */
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

async function callGoogle(input: GoogleCallInput): Promise<LLMResponse> {
    const { model, apiKey, messages, tools, temperature, maxTokens, executionId } = input;

    // Extract system prompt
    const systemPrompt = messages.find((m) => m.role === "system")?.content || "";
    const threadMessages = messages.filter((m) => m.role !== "system");

    // Format messages for Gemini
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
                            name: msg.tool_name || "",
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

    // Format tools for Gemini
    const formattedTools =
        tools.length > 0
            ? {
                  functionDeclarations: tools.map((tool) => ({
                      name: tool.name,
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
                                    await emitAgentToken({ executionId, token: part.text });
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

/**
 * Call Cohere API
 */
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

async function callCohere(input: CohereCallInput): Promise<LLMResponse> {
    const { model, apiKey, messages, tools, temperature, maxTokens, executionId } = input;

    // Extract system prompt
    const systemPrompt = messages.find((m) => m.role === "system")?.content || "";
    const threadMessages = messages.filter((m) => m.role !== "system");

    // Format messages for Cohere
    const formattedMessages = threadMessages.map((msg) => ({
        role: msg.role === "assistant" ? "CHATBOT" : "USER",
        message: msg.content
    }));

    // Format tools for Cohere
    const formattedTools =
        tools.length > 0
            ? tools.map((tool) => ({
                  name: tool.name,
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
                const parsed = JSON.parse(line) as {
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
                };

                if (parsed.event_type === "text-generation" && parsed.text) {
                    fullContent += parsed.text;
                    if (executionId) {
                        await emitAgentToken({ executionId, token: parsed.text });
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

/**
 * Call Hugging Face Inference API
 */
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

async function callHuggingFace(input: HuggingFaceCallInput): Promise<LLMResponse> {
    const { model, apiKey, messages, temperature, maxTokens, executionId } = input;

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
                                await emitAgentToken({ executionId, token: content });
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

/**
 * Execute tool call (workflow, function, or knowledge base)
 */
export interface ExecuteToolCallInput {
    executionId: string;
    toolCall: ToolCall;
    availableTools: Tool[];
    userId: string;
    agentId?: string; // Optional for built-in tools
}

export async function executeToolCall(input: ExecuteToolCallInput): Promise<JsonObject> {
    const { toolCall, availableTools, userId, agentId, executionId } = input;

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
        // Return validation error to LLM (don't throw, let LLM retry)
        console.warn(`Tool "${toolCall.name}" validation failed:`, validation.error?.message);

        return createValidationErrorResponse(toolCall.name, validation);
    }

    // Use validated and coerced data
    const validatedArgs = validation.data as JsonObject;

    switch (tool.type) {
        case "workflow":
            return await executeWorkflowTool({ tool, arguments: validatedArgs, userId });
        case "function":
            return await executeFunctionTool({
                tool,
                arguments: validatedArgs,
                userId,
                agentId,
                executionId
            });
        case "knowledge_base":
            return await executeKnowledgeBaseTool({ tool, arguments: validatedArgs, userId });
        case "agent":
            return await executeAgentTool({ tool, arguments: validatedArgs, userId });
        case "mcp":
            return await executeMCPToolCall({ tool, arguments: validatedArgs, userId });
        default:
            throw new Error(`Unknown tool type: ${tool.type}`);
    }
}

/**
 * Execute workflow as tool
 */
interface ExecuteWorkflowToolInput {
    tool: Tool;
    arguments: JsonObject;
    userId: string;
}

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
        address: process.env.TEMPORAL_ADDRESS || "localhost:7233"
    });
    const client = new Client({
        connection,
        namespace: process.env.TEMPORAL_NAMESPACE || "default"
    });

    // Generate execution ID for the workflow
    const workflowExecutionId = `wf-tool-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
        // Start workflow execution
        const handle = await client.workflow.start("orchestratorWorkflow", {
            taskQueue: process.env.TEMPORAL_TASK_QUEUE || "flowmaestro",
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

/**
 * Execute function tool
 */
interface ExecuteFunctionToolInput {
    tool: Tool;
    arguments: JsonObject;
    userId?: string;
    agentId?: string;
    executionId?: string;
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

/**
 * Built-in function implementations
 */

/**
 * Execute search conversation memory tool
 */
interface ExecuteSearchThreadMemoryInput {
    agentId: string;
    userId: string;
    executionId?: string;
    arguments: JsonObject;
}

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
    const searchPastExecutions = args.searchPastExecutions === true;
    const messageRoles = Array.isArray(args.messageRoles) ? args.messageRoles : undefined;

    try {
        const result = await searchThreadMemoryActivity({
            agentId,
            userId,
            query,
            topK,
            similarityThreshold,
            contextWindow,
            executionId: searchPastExecutions ? undefined : executionId,
            excludeCurrentExecution: !searchPastExecutions && executionId ? true : false,
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
            results: result.results.map((r) => ({
                content: r.content,
                role: r.message_role,
                similarity: r.similarity,
                executionId: r.execution_id,
                contextBefore:
                    r.context_before?.map((c) => `${c.role}: ${c.content}`).join("\n") || null,
                contextAfter:
                    r.context_after?.map((c) => `${c.role}: ${c.content}`).join("\n") || null
            }))
        };
    } catch (error) {
        console.error("Error searching conversation memory:", error);
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

/**
 * Execute knowledge base tool
 */
interface ExecuteKnowledgeBaseToolInput {
    tool: Tool;
    arguments: JsonObject;
    userId: string;
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
    const topK = typeof args.topK === "number" ? args.topK : 5;
    const minScore = typeof args.minScore === "number" ? args.minScore : 0.7;

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

/**
 * Execute agent as tool (multi-agent orchestration)
 */
interface ExecuteAgentToolInput {
    tool: Tool;
    arguments: JsonObject;
    userId: string;
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
        address: process.env.TEMPORAL_ADDRESS || "localhost:7233"
    });
    const client = new Client({
        connection,
        namespace: process.env.TEMPORAL_NAMESPACE || "default"
    });

    // Generate execution ID for the agent
    const agentExecutionId = `agent-tool-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
        // Import ThreadRepository
        const { ThreadRepository } = await import("../../../storage/repositories/ThreadRepository");
        const threadRepo = new ThreadRepository();

        // Create a thread for this agent execution
        const thread = await threadRepo.create({
            user_id: userId,
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
            taskQueue: process.env.TEMPORAL_TASK_QUEUE || "flowmaestro-orchestrator",
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

/**
 * Execute MCP tool
 */
interface ExecuteMCPToolInput {
    tool: Tool;
    arguments: JsonObject;
    userId: string;
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
        console.error(`[MCP Tool] Execution failed for ${tool.name}:`, errorMessage);
        throw new Error(`MCP tool execution failed: ${errorMessage}`);
    }
}

/**
 * Save agent checkpoint for continue-as-new
 */
export interface SaveAgentCheckpointInput {
    executionId: string;
    messages: ThreadMessage[];
    iterations: number;
}

export async function saveAgentCheckpoint(input: SaveAgentCheckpointInput): Promise<void> {
    const { executionId, messages, iterations } = input;

    await executionRepo.update(executionId, {
        thread_history: messages,
        iterations
    });
}
