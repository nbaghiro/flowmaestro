import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import {
    validateToolInput,
    coerceToolArguments,
    createValidationErrorResponse
} from "../../../core/validation/tool-validation";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { WorkflowRepository } from "../../../storage/repositories/WorkflowRepository";
import { emitAgentToken } from "./agent-events";
import { searchConversationMemory as searchConversationMemoryActivity } from "./conversation-memory-activities";
import { injectConversationMemoryTool } from "./conversation-memory-tool";
import { executeMCPTool } from "./mcp-tool-executor";
import { normalizeSchemaForLLM } from "./schema-normalizer";
import type { Tool } from "../../../storage/models/Agent";
import type { ConversationMessage, ToolCall } from "../../../storage/models/AgentExecution";
import type { AgentConfig, LLMResponse } from "../../workflows/agent-orchestrator-workflow";

const agentRepo = new AgentRepository();
const executionRepo = new AgentExecutionRepository();
const workflowRepo = new WorkflowRepository();
const connectionRepo = new ConnectionRepository();

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
    const toolsWithMemory = injectConversationMemoryTool(agent.available_tools);

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
 * Call LLM with conversation history and tools
 */
export interface CallLLMInput {
    model: string;
    provider: string;
    connectionId: string | null;
    messages: ConversationMessage[];
    tools: Tool[];
    temperature: number;
    maxTokens: number;
    executionId?: string; // For streaming token emission
}

export async function callLLM(input: CallLLMInput): Promise<LLMResponse> {
    const { model, provider, connectionId, messages, tools, temperature, maxTokens, executionId } =
        input;

    // Mock mode for testing without using LLM tokens
    const mockMode = process.env.AGENT_MOCK_MODE === "true" || process.env.AGENT_MOCK_MODE === "1";
    if (mockMode) {
        console.log("[callLLM] 🧪 MOCK MODE: Returning mock response without calling LLM");

        // Get the last user message for context
        const lastUserMessage = messages.filter((m) => m.role === "user").pop();
        const userQuery = lastUserMessage?.content || "Hello";

        // Generate a mock response
        const mockResponse = `This is a mock response to: "${userQuery}". In a real scenario, I would analyze your request and provide a helpful answer. This response is generated in mock mode to test the agent flow without consuming LLM tokens.`;

        // Emit tokens as if streaming (for realistic testing)
        if (executionId) {
            const tokens = mockResponse.split(" ");
            for (const token of tokens) {
                await emitAgentToken({ executionId, token: token + " " });
                // Small delay to simulate streaming
                await new Promise((resolve) => setTimeout(resolve, 50));
            }
        }

        return {
            content: mockResponse,
            tool_calls: undefined,
            isComplete: true,
            usage: {
                promptTokens: 100,
                completionTokens: 50,
                totalTokens: 150
            }
        };
    }

    // Helper function to clean API keys (remove invisible characters)
    const cleanApiKey = (key: string | null | undefined): string | null => {
        if (!key) return null;
        return (
            key
                .trim()
                .replace(/[\u200B-\u200D\uFEFF\u2008-\u200F]/g, "") // Remove zero-width spaces and similar
                .replace(/[^\x20-\x7E]/g, "") || // Remove any non-printable ASCII characters
            null
        );
    };

    // Get API credentials from connection
    let apiKey: string | null = null;
    if (connectionId) {
        const connection = await connectionRepo.findByIdWithData(connectionId);
        if (connection && connection.data) {
            // Extract API key from connection data
            const connectionData = connection.data;
            if ("api_key" in connectionData) {
                apiKey = cleanApiKey(connectionData.api_key as string);
            } else if ("apiKey" in connectionData) {
                apiKey = cleanApiKey((connectionData as Record<string, unknown>).apiKey as string);
            }
        }
    }

    // If no connection or API key, try environment variables
    if (!apiKey) {
        switch (provider) {
            case "openai":
                apiKey = cleanApiKey(process.env.OPENAI_API_KEY);
                break;
            case "anthropic":
                apiKey = cleanApiKey(process.env.ANTHROPIC_API_KEY);
                break;
            case "google":
                apiKey = cleanApiKey(process.env.GOOGLE_API_KEY);
                break;
            case "cohere":
                apiKey = cleanApiKey(process.env.COHERE_API_KEY);
                break;
        }
    }

    if (!apiKey) {
        throw new Error(`No API key found for provider ${provider}`);
    }

    // Call appropriate LLM provider
    switch (provider) {
        case "openai":
            return await callOpenAI({
                model,
                apiKey,
                messages,
                tools,
                temperature,
                maxTokens,
                executionId: input.executionId
            });
        case "anthropic":
            return await callAnthropic({
                model,
                apiKey,
                messages,
                tools,
                temperature,
                maxTokens,
                executionId: input.executionId
            });
        case "google":
            return await callGoogle({
                model,
                apiKey,
                messages,
                tools,
                temperature,
                maxTokens,
                executionId: input.executionId
            });
        case "cohere":
            return await callCohere({
                model,
                apiKey,
                messages,
                tools,
                temperature,
                maxTokens,
                executionId: input.executionId
            });
        default:
            throw new Error(`Provider ${provider} not yet implemented`);
    }
}

/**
 * Validate message sequence for OpenAI API requirements
 * Tool messages must immediately follow assistant messages with tool_calls
 */
function validateMessageSequence(messages: ConversationMessage[]): void {
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];

        // If this is a tool message, verify previous message is assistant with tool_calls
        if (msg.role === "tool") {
            if (i === 0) {
                throw new Error("Tool message cannot be first message");
            }

            const prevMsg = messages[i - 1];
            if (prevMsg.role !== "assistant") {
                // Log full context for debugging
                console.error("[Validation] Message sequence error - full history:", {
                    totalMessages: messages.length,
                    errorIndex: i,
                    messages: messages.map((m, idx) => ({
                        index: idx,
                        role: m.role,
                        hasContent: !!m.content,
                        hasToolCalls: !!(m as unknown as { tool_calls?: unknown[] }).tool_calls,
                        toolCallCount:
                            ((m as unknown as { tool_calls?: unknown[] }).tool_calls
                                ?.length as number) || 0,
                        toolCallId: (m as unknown as { tool_call_id?: string }).tool_call_id
                    }))
                });

                throw new Error(
                    `Tool message at index ${i} must follow an assistant message, ` +
                        `but previous message has role "${prevMsg.role}"`
                );
            }

            if (!prevMsg.tool_calls || prevMsg.tool_calls.length === 0) {
                // Log full context for debugging
                console.error("[Validation] Message sequence error - full history:", {
                    totalMessages: messages.length,
                    errorIndex: i,
                    prevMessageIndex: i - 1,
                    messages: messages.map((m, idx) => ({
                        index: idx,
                        role: m.role,
                        hasContent: !!m.content,
                        contentPreview: m.content ? m.content.substring(0, 50) : null,
                        hasToolCalls: !!m.tool_calls,
                        toolCallCount: m.tool_calls?.length || 0,
                        toolCallId: (m as unknown as { tool_call_id?: string }).tool_call_id,
                        toolName: (m as unknown as { tool_name?: string }).tool_name
                    }))
                });

                throw new Error(
                    `Tool message at index ${i} must follow an assistant message with tool_calls, ` +
                        "but previous assistant message has no tool_calls"
                );
            }

            // Verify tool_call_id matches one of the tool_calls
            const matchingCall = prevMsg.tool_calls.find((tc) => tc.id === msg.tool_call_id);
            if (!matchingCall) {
                throw new Error(
                    `Tool message tool_call_id "${msg.tool_call_id}" does not match any ` +
                        "tool_call in previous assistant message"
                );
            }
        }
    }
}

/**
 * Call OpenAI API
 */
interface OpenAICallInput {
    model: string;
    apiKey: string;
    messages: ConversationMessage[];
    tools: Tool[];
    temperature: number;
    maxTokens: number;
    executionId?: string;
}

async function callOpenAI(input: OpenAICallInput): Promise<LLMResponse> {
    const { model, apiKey, messages, tools, temperature, maxTokens, executionId } = input;

    // Validate message sequence before sending to OpenAI
    validateMessageSequence(messages);

    // Format messages for OpenAI
    const formattedMessages = messages.map((msg) => {
        const formatted: {
            role: string;
            content: string | null;
            tool_calls?: Array<{
                id: string;
                type: "function";
                function: {
                    name: string;
                    arguments: string;
                };
            }>;
            tool_call_id?: string;
            name?: string;
        } = {
            role: msg.role === "assistant" ? "assistant" : msg.role === "tool" ? "tool" : "user",
            content: msg.content
        };

        // Format tool_calls for OpenAI (requires type: "function" and arguments as JSON string)
        if (msg.tool_calls && msg.tool_calls.length > 0) {
            formatted.tool_calls = msg.tool_calls.map((tc) => ({
                id: tc.id,
                type: "function" as const,
                function: {
                    name: tc.name,
                    arguments: JSON.stringify(tc.arguments)
                }
            }));
        }

        if (msg.tool_call_id) {
            formatted.tool_call_id = msg.tool_call_id;
        }

        if (msg.tool_name) {
            formatted.name = msg.tool_name;
        }

        return formatted;
    });

    // Format tools for OpenAI function calling
    // Normalize schemas to ensure compatibility (arrays must have items per JSON Schema spec)
    const formattedTools = tools.map((tool) => ({
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: normalizeSchemaForLLM(tool.schema)
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
            stream: true // Enable streaming
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
    // Track raw argument strings for each tool call (arguments stream as partial JSON)
    const toolCallArgumentStrings: Map<number, string> = new Map();
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
                            await emitAgentToken({ executionId, token: delta.content });
                            fullContent += delta.content;
                        }

                        if (delta?.tool_calls) {
                            // Handle tool calls - accumulate argument strings
                            if (!toolCalls) {
                                toolCalls = [];
                            }
                            for (const toolCall of delta.tool_calls) {
                                if (toolCall.index !== undefined) {
                                    // Initialize tool call if needed
                                    if (!toolCalls[toolCall.index]) {
                                        toolCalls[toolCall.index] = {
                                            id: toolCall.id || "",
                                            name: toolCall.function?.name || "",
                                            arguments: {}
                                        };
                                    }

                                    // Accumulate argument string (arguments stream as partial JSON)
                                    if (toolCall.function?.arguments) {
                                        const existingString =
                                            toolCallArgumentStrings.get(toolCall.index) || "";
                                        const newString =
                                            existingString + toolCall.function.arguments;
                                        toolCallArgumentStrings.set(toolCall.index, newString);
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

    // Parse accumulated argument strings after streaming is complete
    if (toolCalls) {
        for (let i = 0; i < toolCalls.length; i++) {
            const argumentString = toolCallArgumentStrings.get(i);
            if (argumentString && argumentString.trim()) {
                try {
                    const parsed = JSON.parse(argumentString);
                    toolCalls[i].arguments = parsed;
                    console.log(
                        `[OpenAI Stream] Successfully parsed arguments for ${toolCalls[i].name}:`,
                        JSON.stringify(parsed, null, 2)
                    );
                } catch (error) {
                    console.error(
                        `[OpenAI Stream] Failed to parse final tool arguments for ${toolCalls[i].name}:`,
                        error instanceof Error ? error.message : error,
                        "Raw arguments string:",
                        argumentString
                    );
                    // Keep empty object if parsing fails
                    toolCalls[i].arguments = {};
                }
            } else {
                // No arguments were provided - log warning with details
                console.warn(
                    `[OpenAI Stream] Tool call ${toolCalls[i].name} (index ${i}) has no arguments. ` +
                        `Argument string was: "${argumentString || "(undefined)"}". ` +
                        "This may indicate the LLM didn't provide required parameters in the stream."
                );
                // Keep empty object - validation will catch missing required fields
                toolCalls[i].arguments = {};
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
 * Call Google Gemini API
 */
interface GoogleCallInput {
    model: string;
    apiKey: string;
    messages: ConversationMessage[];
    tools: Tool[];
    temperature: number;
    maxTokens: number;
    executionId?: string;
}

async function callGoogle(input: GoogleCallInput): Promise<LLMResponse> {
    const { model, apiKey, messages, tools, temperature, maxTokens, executionId } = input;

    if (!apiKey || apiKey.length === 0) {
        throw new Error("Google API key is missing or empty after cleaning");
    }

    // Extract system prompt (Gemini uses systemInstruction)
    const systemPrompt = messages.find((m) => m.role === "system")?.content || "";
    const conversationMessages = messages.filter((m) => m.role !== "system");

    // Format messages for Gemini API (parts-based structure)
    // Gemini expects alternating user/model turns, with function responses as user messages
    const formattedContents: Array<{
        role: "user" | "model";
        parts: Array<{ text?: string; functionCall?: unknown; functionResponse?: unknown }>;
    }> = [];

    // Group tool messages by their tool_call_id to match with assistant messages
    const toolMessagesByCallId = new Map<string, ConversationMessage[]>();
    for (const msg of conversationMessages) {
        if (msg.role === "tool" && msg.tool_call_id) {
            const existing = toolMessagesByCallId.get(msg.tool_call_id) || [];
            existing.push(msg);
            toolMessagesByCallId.set(msg.tool_call_id, existing);
        }
    }

    for (let i = 0; i < conversationMessages.length; i++) {
        const msg = conversationMessages[i];

        // Skip tool messages - they're handled when processing assistant messages
        if (msg.role === "tool") {
            continue;
        }

        if (msg.role === "user") {
            formattedContents.push({
                role: "user",
                parts: [{ text: msg.content || "" }]
            });
        } else if (msg.role === "assistant") {
            const parts: Array<{ text?: string; functionCall?: unknown }> = [];

            // Add text content if present
            if (msg.content) {
                parts.push({ text: msg.content });
            }

            // Add function calls if present
            if (msg.tool_calls && msg.tool_calls.length > 0) {
                for (const toolCall of msg.tool_calls) {
                    parts.push({
                        functionCall: {
                            name: toolCall.name,
                            args: toolCall.arguments
                        }
                    });
                }
            }

            if (parts.length > 0) {
                formattedContents.push({
                    role: "model",
                    parts
                });

                // If there are tool calls, add function responses as a user message
                if (msg.tool_calls && msg.tool_calls.length > 0) {
                    const functionResponses: Array<{ functionResponse: unknown }> = [];
                    for (const toolCall of msg.tool_calls) {
                        const toolMsgs = toolMessagesByCallId.get(toolCall.id) || [];
                        for (const toolMsg of toolMsgs) {
                            let responseContent: JsonObject;
                            if (typeof toolMsg.content === "string") {
                                try {
                                    responseContent = JSON.parse(toolMsg.content);
                                } catch {
                                    responseContent = { result: toolMsg.content };
                                }
                            } else {
                                responseContent = toolMsg.content as JsonObject;
                            }

                            functionResponses.push({
                                functionResponse: {
                                    name: toolCall.name,
                                    response: responseContent
                                }
                            });
                        }
                    }

                    if (functionResponses.length > 0) {
                        formattedContents.push({
                            role: "user",
                            parts: functionResponses
                        });
                    }
                }
            }
        }
    }

    // Format tools as function_declarations for Gemini
    // Gemini expects a single tools array with functionDeclarations
    const formattedTools =
        tools.length > 0
            ? [
                  {
                      functionDeclarations: tools.map((tool) => ({
                          name: tool.name,
                          description: tool.description,
                          parameters: normalizeSchemaForLLM(tool.schema, "google")
                      }))
                  }
              ]
            : undefined;

    // Build request body
    const requestBody: {
        contents: typeof formattedContents;
        systemInstruction?: { parts: Array<{ text: string }> };
        tools?: typeof formattedTools;
        generationConfig?: {
            temperature?: number;
            maxOutputTokens?: number;
        };
    } = {
        contents: formattedContents,
        generationConfig: {
            temperature,
            maxOutputTokens: maxTokens
        }
    };

    if (systemPrompt) {
        requestBody.systemInstruction = {
            parts: [{ text: systemPrompt }]
        };
    }

    if (formattedTools) {
        requestBody.tools = formattedTools;
    }

    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };
    headers["x-goog-api-key"] = apiKey;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent`,
        {
            method: "POST",
            headers,
            body: JSON.stringify(requestBody)
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error("[Google] API error response:", errorText);
        throw new Error(`Google Gemini API error: ${response.status} - ${errorText}`);
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

    // Process streaming response chunks
    // Gemini streams the JSON response in chunks - we need to accumulate and parse incrementally
    // Track function calls by name+args to avoid duplicates
    const seenFunctionCalls = new Set<string>();
    let fullResponseBuffer = "";
    let done = false;

    // Accumulate all chunks first (Gemini streams the JSON object in pieces)
    while (!done) {
        const result = await reader.read();
        done = result.done;
        if (done) break;

        const value = result.value;
        const chunk = decoder.decode(value, { stream: true });
        fullResponseBuffer += chunk;
    }

    // Now parse the complete JSON response
    try {
        // Gemini may return an array of responses or a single object
        let parsed: {
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
                promptTokenCount?: number;
                candidatesTokenCount?: number;
                totalTokenCount?: number;
            };
        };

        // Try parsing as array first (some responses come as array)
        const trimmed = fullResponseBuffer.trim();
        if (trimmed.startsWith("[")) {
            const array = JSON.parse(trimmed) as Array<unknown>;
            // Process each item in the array
            for (const item of array) {
                parsed = item as typeof parsed;
                await processGeminiResponse(parsed);
            }
        } else {
            // Single object response
            parsed = JSON.parse(trimmed);
            await processGeminiResponse(parsed);
        }
    } catch (error) {
        console.error(
            "[Google] Failed to parse complete response:",
            error instanceof Error ? error.message : error
        );
        console.error("[Google] Response buffer length:", fullResponseBuffer.length);
        console.error("[Google] Response preview:", fullResponseBuffer.substring(0, 500));
        throw new Error(
            `Failed to parse Google Gemini response: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }

    // Helper function to process a parsed Gemini response
    async function processGeminiResponse(parsed: {
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
            promptTokenCount?: number;
            candidatesTokenCount?: number;
            totalTokenCount?: number;
        };
    }): Promise<void> {
        if (parsed.candidates && parsed.candidates[0]) {
            const candidate = parsed.candidates[0];
            const parts = candidate.content?.parts || [];

            for (const part of parts) {
                if (part.text) {
                    // Emit token for streaming
                    if (executionId) {
                        await emitAgentToken({ executionId, token: part.text });
                    }
                    fullContent += part.text;
                }

                if (part.functionCall) {
                    // Create a unique key for this function call to avoid duplicates
                    const callKey = `${part.functionCall.name}:${JSON.stringify(part.functionCall.args)}`;
                    if (!seenFunctionCalls.has(callKey)) {
                        seenFunctionCalls.add(callKey);
                        if (!toolCalls) {
                            toolCalls = [];
                        }
                        toolCalls.push({
                            id: `call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                            name: part.functionCall.name,
                            arguments: part.functionCall.args
                        });
                    }
                }
            }
        }

        if (parsed.usageMetadata) {
            usage = {
                promptTokens: parsed.usageMetadata.promptTokenCount || 0,
                completionTokens: parsed.usageMetadata.candidatesTokenCount || 0,
                totalTokens: parsed.usageMetadata.totalTokenCount || 0
            };
        }
    }

    // Determine if response is complete (no tool calls means complete)
    const isComplete = !toolCalls || toolCalls.length === 0;

    return {
        content: fullContent,
        tool_calls: toolCalls,
        isComplete,
        usage
    };
}

/**
 * Call Cohere API
 */
interface CohereCallInput {
    model: string;
    apiKey: string;
    messages: ConversationMessage[];
    tools: Tool[];
    temperature: number;
    maxTokens: number;
    executionId?: string;
}

async function callCohere(input: CohereCallInput): Promise<LLMResponse> {
    const { model, apiKey, messages, tools, temperature, maxTokens, executionId } = input;

    if (!apiKey || apiKey.length === 0) {
        throw new Error("Cohere API key is missing or empty after cleaning");
    }

    // Import Cohere client
    const { CohereClient } = await import("cohere-ai");
    const cohere = new CohereClient({ token: apiKey });

    // Extract system prompt (Cohere uses preamble)
    const systemPrompt = messages.find((m) => m.role === "system")?.content || "";
    const conversationMessages = messages.filter((m) => m.role !== "system");

    // Cohere chat API expects a conversation history format
    // Cohere uses "User" and "Chatbot"
    const chatHistory: Array<
        { role: "User"; message: string } | { role: "Chatbot"; message: string }
    > = [];

    for (const msg of conversationMessages) {
        if (msg.role === "user") {
            chatHistory.push({
                role: "User",
                message: msg.content || ""
            });
        } else if (msg.role === "assistant") {
            // For assistant messages, include text content
            // Note: Cohere doesn't support tool calls natively, so we format them as text
            let assistantMessage = msg.content || "";

            // If there are tool calls, format them clearly
            if (msg.tool_calls && msg.tool_calls.length > 0) {
                // Format tool calls as text (Cohere doesn't have native tool calling)
                const toolCallsText = msg.tool_calls
                    .map((tc) => `${tc.name}(${JSON.stringify(tc.arguments)})`)
                    .join(", ");
                assistantMessage += `\n[Tool calls: ${toolCallsText}]`;
            }

            // Only add assistant message if it has content (empty messages can cause 400 errors)
            if (assistantMessage.trim().length > 0) {
                chatHistory.push({
                    role: "Chatbot",
                    message: assistantMessage.trim()
                });
            }
        } else if (msg.role === "tool") {
            // Tool results are added to the previous assistant message
            // If there's no previous assistant message, create one
            const lastMessage = chatHistory[chatHistory.length - 1];
            const toolResult =
                typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
            if (lastMessage && "role" in lastMessage && lastMessage.role === "Chatbot") {
                lastMessage.message += `\n[Tool result: ${msg.tool_name || "unknown"}: ${toolResult}]`;
            } else {
                // Create a new assistant message for the tool result
                chatHistory.push({
                    role: "Chatbot",
                    message: `[Tool result: ${msg.tool_name || "unknown"}: ${toolResult}]`
                });
            }
        }
    }

    // Cohere API expects the last user message as 'message' and previous messages as 'chatHistory'
    // Find the last user message
    let currentMessage = "";
    let previousMessages: Array<
        { role: "User"; message: string } | { role: "Chatbot"; message: string }
    > = [];

    // Find the last user message
    for (let i = chatHistory.length - 1; i >= 0; i--) {
        if (chatHistory[i].role === "User") {
            currentMessage = chatHistory[i].message;
            previousMessages = chatHistory.slice(0, i);
            break;
        }
    }

    // If no user message found, use empty string (shouldn't happen, but handle gracefully)
    if (!currentMessage && chatHistory.length > 0) {
        // Fallback: use the last message if it's not a user message
        const lastMsg = chatHistory[chatHistory.length - 1];
        if (lastMsg.role === "Chatbot") {
            // This shouldn't happen in normal flow, but handle it
            currentMessage = "";
            previousMessages = chatHistory;
        } else {
            currentMessage = lastMsg.message;
            previousMessages = chatHistory.slice(0, -1);
        }
    }

    // Build chat options - match the format used in llm-executor.ts
    const chatOptions: {
        model: string;
        message: string;
        chatHistory?: Array<
            { role: "User"; message: string } | { role: "Chatbot"; message: string }
        >;
        preamble?: string;
        temperature?: number;
        maxTokens?: number;
    } = {
        model,
        message: currentMessage,
        temperature,
        maxTokens
    };

    if (systemPrompt) {
        chatOptions.preamble = systemPrompt;
    }

    if (previousMessages.length > 0) {
        chatOptions.chatHistory = previousMessages;
    }

    // Tools are disabled for now - Cohere's tool support varies by model
    // and can cause 400 errors if the model doesn't support them
    // TODO: Re-enable when we can detect which models support tools
    if (tools.length > 0) {
        console.warn(
            `[Cohere] Tools provided (${tools.length}) but not included in request - Cohere tool support varies by model`
        );
    }

    try {
        // Use streaming API with type assertion to handle SDK type strictness
        const stream = await cohere.chatStream(
            chatOptions as Parameters<typeof cohere.chatStream>[0]
        );

        let fullContent = "";
        let toolCalls: ToolCall[] | undefined;
        let usage:
            | { promptTokens: number; completionTokens: number; totalTokens: number }
            | undefined;

        // Process streaming response
        for await (const chunk of stream) {
            if (chunk.eventType === "text-generation") {
                const delta = chunk.text || "";
                if (delta) {
                    // Emit token for streaming
                    if (executionId) {
                        await emitAgentToken({ executionId, token: delta });
                    }
                    fullContent += delta;
                }
            } else if (
                (chunk.eventType === "tool-calls-generation" ||
                    chunk.eventType === "tool-calls-chunk") &&
                "toolCalls" in chunk
            ) {
                // Handle tool calls if Cohere supports them
                const toolCallsData = chunk.toolCalls as Array<{
                    name?: string;
                    parameters?: unknown;
                }>;
                if (toolCallsData) {
                    if (!toolCalls) {
                        toolCalls = [];
                    }
                    for (const toolCall of toolCallsData) {
                        toolCalls.push({
                            id: `call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                            name: toolCall.name || "",
                            arguments: (toolCall.parameters as JsonObject) || {}
                        });
                    }
                }
            } else if (chunk.eventType === "stream-end") {
                // Extract usage information if available
                if (chunk.response && "usage" in chunk.response) {
                    const usageData = chunk.response.usage as {
                        inputTokens?: number;
                        outputTokens?: number;
                    };
                    if (usageData) {
                        usage = {
                            promptTokens: usageData.inputTokens || 0,
                            completionTokens: usageData.outputTokens || 0,
                            totalTokens:
                                (usageData.inputTokens || 0) + (usageData.outputTokens || 0)
                        };
                    }
                }
            }
        }

        return {
            content: fullContent,
            tool_calls: toolCalls,
            isComplete: !toolCalls || toolCalls.length === 0,
            usage
        };
    } catch (error) {
        // Enhanced error logging for Cohere API
        if (error && typeof error === "object" && "statusCode" in error) {
            const cohereError = error as {
                statusCode?: number;
                body?: unknown;
                message?: string;
            };

            // Try to read the body if it's a ReadableStream
            let bodyText = "";
            if (
                cohereError.body &&
                typeof cohereError.body === "object" &&
                "getReader" in cohereError.body
            ) {
                try {
                    const reader = (cohereError.body as ReadableStream).getReader();
                    const decoder = new TextDecoder();
                    const result = await reader.read();
                    if (!result.done) {
                        bodyText = decoder.decode(result.value);
                    }
                } catch {
                    bodyText = "[Could not read error body]";
                }
            } else {
                bodyText = JSON.stringify(cohereError.body);
            }

            console.error("[Cohere] API error details:", {
                statusCode: cohereError.statusCode,
                message: cohereError.message,
                body: bodyText
            });

            // Log the chat history that caused the error for debugging
            console.error(
                "[Cohere] Chat history that caused error:",
                JSON.stringify(previousMessages, null, 2)
            );
            console.error("[Cohere] Current message:", currentMessage);

            throw new Error(
                `Cohere API error: ${cohereError.statusCode || "Unknown"} - ${cohereError.message || bodyText || "Unknown error"}`
            );
        }
        console.error("[Cohere] API error:", error instanceof Error ? error.message : error);
        throw new Error(
            `Cohere API error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Call Anthropic API
 */
interface AnthropicCallInput {
    model: string;
    apiKey: string;
    messages: ConversationMessage[];
    tools: Tool[];
    temperature: number;
    maxTokens: number;
    executionId?: string;
}

async function callAnthropic(input: AnthropicCallInput): Promise<LLMResponse> {
    const { model, apiKey, messages, tools, temperature, maxTokens } = input;

    // Extract system prompt (first message)
    const systemPrompt = messages.find((m) => m.role === "system")?.content || "";
    const conversationMessages = messages.filter((m) => m.role !== "system");

    // Format messages for Anthropic
    const formattedMessages = conversationMessages.map((msg) => {
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

    // Format tools for Anthropic
    // Normalize schemas to ensure compatibility (arrays must have items per JSON Schema spec)
    const formattedTools = tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: normalizeSchemaForLLM(tool.schema)
    }));

    // Call Anthropic API
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
            max_tokens: maxTokens
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    interface AnthropicResponse {
        content: Array<
            | { type: "text"; text: string }
            | { type: "tool_use"; id: string; name: string; input: JsonObject }
        >;
        stop_reason: string;
        usage?: {
            input_tokens: number;
            output_tokens: number;
        };
    }

    const data = (await response.json()) as AnthropicResponse;

    // Parse response
    let content = "";
    let toolCalls: ToolCall[] | undefined;

    for (const block of data.content) {
        if (block.type === "text") {
            content += block.text;
        } else if (block.type === "tool_use") {
            if (!toolCalls) toolCalls = [];
            toolCalls.push({
                id: block.id,
                name: block.name,
                arguments: block.input
            });
        }
    }

    return {
        content,
        tool_calls: toolCalls,
        isComplete: data.stop_reason === "end_turn" && !toolCalls,
        usage: data.usage
            ? {
                  promptTokens: data.usage.input_tokens,
                  completionTokens: data.usage.output_tokens,
                  totalTokens: data.usage.input_tokens + data.usage.output_tokens
              }
            : undefined
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
            return await executeMCPTool({ tool, arguments: validatedArgs, userId, executionId });
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
        case "search_conversation_memory":
            if (!agentId || !userId) {
                throw new Error("search_conversation_memory requires agentId and userId");
            }
            return await executeSearchConversationMemory({
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
interface ExecuteSearchConversationMemoryInput {
    agentId: string;
    userId: string;
    executionId?: string;
    arguments: JsonObject;
}

async function executeSearchConversationMemory(
    input: ExecuteSearchConversationMemoryInput
): Promise<JsonObject> {
    const { agentId, userId, executionId, arguments: args } = input;

    if (typeof args.query !== "string") {
        throw new Error("search_conversation_memory requires 'query' string argument");
    }

    const query = args.query;
    const topK = typeof args.topK === "number" ? args.topK : 5;
    const similarityThreshold =
        typeof args.similarityThreshold === "number" ? args.similarityThreshold : 0.7;
    const contextWindow = typeof args.contextWindow === "number" ? args.contextWindow : 2;
    const searchPastExecutions = args.searchPastExecutions === true;
    const messageRoles = Array.isArray(args.messageRoles) ? args.messageRoles : undefined;

    try {
        const result = await searchConversationMemoryActivity({
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
            conversation_history: [
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
            // Include the full conversation if needed
            conversationHistory: result.serializedConversation?.messages.map(
                (msg: ConversationMessage) => ({
                    role: msg.role,
                    content: msg.content
                })
            )
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Agent execution failed: ${errorMessage}`);
    }
}

/**
 * Save agent checkpoint for continue-as-new
 */
export interface SaveAgentCheckpointInput {
    executionId: string;
    messages: ConversationMessage[];
    iterations: number;
}

export async function saveAgentCheckpoint(input: SaveAgentCheckpointInput): Promise<void> {
    const { executionId, messages, iterations } = input;

    await executionRepo.update(executionId, {
        conversation_history: messages,
        iterations
    });
}
