import { BaseNodeHandler, NodeHandlerInput, NodeHandlerOutput } from "./types";
import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { config } from "../../core/config";
import { providerRegistry } from "../../integrations/registry";
import { ConnectionRepository } from "../../storage/repositories/ConnectionRepository";

/**
 * Tool definition for agent execution.
 */
interface AgentTool {
    name: string;
    description: string;
    parameters: JsonObject;
    provider?: string;
    operation?: string;
    connectionId?: string;
}

/**
 * Tool call from the LLM.
 */
interface ToolCall {
    id: string;
    name: string;
    arguments: JsonObject;
}

/**
 * Message in the conversation.
 */
interface ConversationMessage {
    role: "system" | "user" | "assistant" | "tool";
    content: string | null;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
    name?: string;
}

/**
 * AgentHandler - Handles AI agent nodes with tool-calling capabilities.
 *
 * Supported node types:
 * - agent: AI agent with tools (ReAct pattern)
 * - agent-tool: Tool definition for agents
 *
 * Features:
 * - Multi-turn conversation with tool calling
 * - Integration with provider tools (MCP)
 * - Custom tool definitions
 * - Memory/context management
 * - Streaming support
 */
export class AgentHandler extends BaseNodeHandler {
    protected nodeTypes = ["agent", "agent-tool"];

    private connectionRepo = new ConnectionRepository();

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();

        try {
            let result: NodeHandlerOutput;

            switch (input.nodeType) {
                case "agent":
                    result = await this.executeAgent(input);
                    break;
                case "agent-tool":
                    result = await this.executeAgentTool(input);
                    break;
                default:
                    result = this.success({ passthrough: true });
            }

            // Add duration metadata
            if (result.metadata) {
                result.metadata.durationMs = Date.now() - startTime;
            } else {
                result.metadata = { durationMs: Date.now() - startTime };
            }

            return result;
        } catch (error) {
            return this.failure(
                error instanceof Error ? error.message : String(error),
                { code: "AGENT_ERROR", activateErrorPort: true }
            );
        }
    }

    /**
     * Execute agent node with tool-calling loop.
     */
    private async executeAgent(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const { config: nodeConfig, context, userId, executionId } = input;

        // Extract configuration
        const provider = (nodeConfig.provider as string) || "openai";
        const model = (nodeConfig.model as string) || this.getDefaultModel(provider);
        const systemPrompt = nodeConfig.systemPrompt as string | undefined;
        const messages = nodeConfig.messages as string | ConversationMessage[] | undefined;
        const tools = (nodeConfig.tools as unknown as AgentTool[]) || [];
        const maxIterations = (nodeConfig.maxIterations as number) || 10;
        const temperature = (nodeConfig.temperature as number) ?? 0.7;
        const maxTokens = (nodeConfig.maxTokens as number) ?? 4096;
        const responseFormat = nodeConfig.responseFormat as JsonObject | undefined;

        // Build initial conversation
        const conversation: ConversationMessage[] = [];

        // Add system prompt
        if (systemPrompt) {
            conversation.push({
                role: "system",
                content: this.resolveVariables(systemPrompt, context)
            });
        }

        // Add user messages
        if (typeof messages === "string") {
            conversation.push({
                role: "user",
                content: this.resolveVariables(messages, context)
            });
        } else if (Array.isArray(messages)) {
            for (const msg of messages) {
                conversation.push({
                    ...msg,
                    content: msg.content ? this.resolveVariables(msg.content, context) : null
                });
            }
        }

        // Build tool definitions for the LLM
        const toolDefinitions = await this.buildToolDefinitions(tools, userId);

        // Agent loop (ReAct pattern)
        let iteration = 0;
        let totalTokens = { input: 0, output: 0 };
        const toolResults: Array<{ tool: string; result: unknown }> = [];

        while (iteration < maxIterations) {
            iteration++;

            // Call LLM
            const llmResponse = await this.callLLM(
                provider,
                model,
                conversation,
                toolDefinitions,
                temperature,
                maxTokens,
                responseFormat
            );

            totalTokens.input += llmResponse.usage?.promptTokens || 0;
            totalTokens.output += llmResponse.usage?.completionTokens || 0;

            // Add assistant response to conversation
            conversation.push({
                role: "assistant",
                content: llmResponse.content,
                tool_calls: llmResponse.toolCalls
            });

            // Check if we have tool calls to execute
            if (!llmResponse.toolCalls || llmResponse.toolCalls.length === 0) {
                // No tool calls - agent is done
                break;
            }

            // Execute tool calls
            for (const toolCall of llmResponse.toolCalls) {
                const tool = tools.find((t) => t.name === toolCall.name);

                let toolResult: unknown;
                try {
                    if (tool?.provider && tool?.operation) {
                        // Provider-based tool
                        toolResult = await this.executeProviderTool(
                            tool.provider,
                            tool.operation,
                            toolCall.arguments,
                            tool.connectionId || (nodeConfig.connectionId as string),
                            userId,
                            { mode: "agent", conversationId: executionId, toolCallId: toolCall.id }
                        );
                    } else {
                        // Custom tool - look for handler in context or return arguments
                        toolResult = await this.executeCustomTool(
                            toolCall.name,
                            toolCall.arguments,
                            context
                        );
                    }
                } catch (error) {
                    toolResult = {
                        error: true,
                        message: error instanceof Error ? error.message : String(error)
                    };
                }

                toolResults.push({ tool: toolCall.name, result: toolResult });

                // Add tool result to conversation
                conversation.push({
                    role: "tool",
                    content: JSON.stringify(toolResult),
                    tool_call_id: toolCall.id,
                    name: toolCall.name
                });
            }
        }

        // Get final response
        const finalMessage = conversation.filter((m) => m.role === "assistant").pop();
        const finalContent = finalMessage?.content || "";

        // Parse structured output if response format specified
        let structuredOutput: JsonValue = null;
        if (responseFormat && finalContent) {
            try {
                structuredOutput = JSON.parse(finalContent);
            } catch {
                structuredOutput = finalContent;
            }
        }

        return {
            success: true,
            data: {
                response: finalContent,
                structured: structuredOutput,
                iterations: iteration,
                toolCalls: toolResults as unknown as JsonValue,
                conversation: conversation.map((m) => ({
                    role: m.role,
                    content: m.content
                })) as JsonValue
            },
            metadata: {
                model,
                provider,
                tokenUsage: totalTokens,
                toolsUsed: toolResults.map((t) => t.tool)
            }
        };
    }

    /**
     * Execute agent-tool node (defines a tool for agents).
     */
    private async executeAgentTool(
        input: NodeHandlerInput
    ): Promise<NodeHandlerOutput> {
        const { config: nodeConfig } = input;

        // Tool definition node just passes through tool config
        return this.success({
            tool: {
                name: nodeConfig.name as string,
                description: nodeConfig.description as string,
                parameters: (nodeConfig.parameters || {}) as JsonValue,
                provider: (nodeConfig.provider || null) as JsonValue,
                operation: (nodeConfig.operation || null) as JsonValue
            }
        });
    }

    /**
     * Build tool definitions for the LLM.
     */
    private async buildToolDefinitions(
        tools: AgentTool[],
        _userId: string
    ): Promise<OpenAITool[]> {
        const definitions: OpenAITool[] = [];

        for (const tool of tools) {
            if (tool.provider && tool.operation) {
                // Get tool definition from provider
                try {
                    const provider = await providerRegistry.loadProvider(tool.provider);
                    const mcpTools = provider.getMCPTools();
                    const mcpTool = mcpTools.find(
                        (t) => t.name === `${tool.provider}_${tool.operation}` || t.name === tool.operation
                    );

                    if (mcpTool) {
                        definitions.push({
                            type: "function",
                            function: {
                                name: tool.name || mcpTool.name,
                                description: tool.description || mcpTool.description,
                                parameters: mcpTool.inputSchema as JsonObject
                            }
                        });
                        continue;
                    }
                } catch {
                    // Provider not available, use custom definition
                }
            }

            // Custom tool definition
            definitions.push({
                type: "function",
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters || {
                        type: "object",
                        properties: {},
                        required: []
                    }
                }
            });
        }

        return definitions;
    }

    /**
     * Execute a provider-based tool.
     */
    private async executeProviderTool(
        providerName: string,
        operation: string,
        params: JsonObject,
        connectionId: string | undefined,
        userId: string,
        executionContext: { mode: "agent"; conversationId: string; toolCallId: string }
    ): Promise<unknown> {
        // Load provider
        const provider = await providerRegistry.loadProvider(providerName);

        // Get connection
        let connection;
        if (connectionId) {
            connection = await this.connectionRepo.findByIdWithData(connectionId);
        } else {
            // Try to find a connection for this provider
            const connections = await this.connectionRepo.findByProvider(userId, providerName);
            if (connections.length > 0) {
                // Get full connection data for the first matching connection
                connection = await this.connectionRepo.findByIdWithData(connections[0].id);
            }
        }

        if (!connection) {
            throw new Error(`No connection found for provider ${providerName}`);
        }

        // Execute operation
        const result = await provider.executeOperation(
            operation,
            params,
            connection,
            executionContext
        );

        if (!result.success) {
            throw new Error(result.error?.message || "Tool execution failed");
        }

        return result.data;
    }

    /**
     * Execute a custom tool.
     */
    private async executeCustomTool(
        toolName: string,
        params: JsonObject,
        context: NodeHandlerInput["context"]
    ): Promise<unknown> {
        // Check if there's a tool handler in node outputs
        const toolHandler = context.nodeOutputs[`tool_${toolName}`];
        if (toolHandler && typeof toolHandler === "object" && "execute" in toolHandler) {
            // Custom tool handler
            const handler = toolHandler as unknown as { execute: (params: JsonObject) => Promise<unknown> };
            return handler.execute(params);
        }

        // Return parameters as-is for now (placeholder for custom tool execution)
        return {
            tool: toolName,
            params,
            note: "Custom tool execution not implemented"
        };
    }

    /**
     * Call LLM with tool support.
     */
    private async callLLM(
        provider: string,
        model: string,
        messages: ConversationMessage[],
        tools: OpenAITool[],
        temperature: number,
        maxTokens: number,
        responseFormat?: JsonObject
    ): Promise<LLMResponse> {
        switch (provider) {
            case "openai":
                return this.callOpenAI(model, messages, tools, temperature, maxTokens, responseFormat);
            case "anthropic":
                return this.callAnthropic(model, messages, tools, temperature, maxTokens);
            default:
                throw new Error(`Unsupported agent provider: ${provider}`);
        }
    }

    /**
     * Call OpenAI with function calling.
     */
    private async callOpenAI(
        model: string,
        messages: ConversationMessage[],
        tools: OpenAITool[],
        temperature: number,
        maxTokens: number,
        responseFormat?: JsonObject
    ): Promise<LLMResponse> {
        const apiKey = config.ai.openai.apiKey;
        if (!apiKey) {
            throw new Error("OpenAI API key not configured");
        }

        const requestBody: Record<string, unknown> = {
            model,
            messages: messages.map((m) => {
                if (m.role === "tool") {
                    return {
                        role: "tool",
                        content: m.content,
                        tool_call_id: m.tool_call_id
                    };
                }
                if (m.tool_calls) {
                    return {
                        role: m.role,
                        content: m.content,
                        tool_calls: m.tool_calls.map((tc) => ({
                            id: tc.id,
                            type: "function",
                            function: {
                                name: tc.name,
                                arguments: JSON.stringify(tc.arguments)
                            }
                        }))
                    };
                }
                return { role: m.role, content: m.content };
            }),
            temperature,
            max_tokens: maxTokens
        };

        if (tools.length > 0) {
            requestBody.tools = tools;
            requestBody.tool_choice = "auto";
        }

        if (responseFormat) {
            requestBody.response_format = responseFormat;
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(
                (error as { error?: { message?: string } }).error?.message ||
                    `OpenAI API error: ${response.status}`
            );
        }

        const data = (await response.json()) as OpenAIChatResponse;
        const choice = data.choices[0];

        return {
            content: choice.message.content,
            toolCalls: choice.message.tool_calls?.map((tc) => ({
                id: tc.id,
                name: tc.function.name,
                arguments: JSON.parse(tc.function.arguments)
            })),
            usage: data.usage
                ? {
                      promptTokens: data.usage.prompt_tokens,
                      completionTokens: data.usage.completion_tokens,
                      totalTokens: data.usage.total_tokens
                  }
                : undefined,
            finishReason: choice.finish_reason
        };
    }

    /**
     * Call Anthropic with tool use.
     */
    private async callAnthropic(
        model: string,
        messages: ConversationMessage[],
        tools: OpenAITool[],
        temperature: number,
        maxTokens: number
    ): Promise<LLMResponse> {
        const apiKey = config.ai.anthropic.apiKey;
        if (!apiKey) {
            throw new Error("Anthropic API key not configured");
        }

        // Convert messages to Anthropic format
        const systemMessages = messages.filter((m) => m.role === "system");
        const chatMessages = messages.filter((m) => m.role !== "system");

        // Convert to Anthropic message format
        const anthropicMessages: AnthropicMessage[] = [];
        for (const msg of chatMessages) {
            if (msg.role === "tool") {
                // Tool results go as user messages with tool_result content
                anthropicMessages.push({
                    role: "user",
                    content: [
                        {
                            type: "tool_result",
                            tool_use_id: msg.tool_call_id!,
                            content: msg.content || ""
                        }
                    ]
                });
            } else if (msg.role === "assistant" && msg.tool_calls) {
                // Assistant with tool calls
                const content: AnthropicContentBlock[] = [];
                if (msg.content) {
                    content.push({ type: "text", text: msg.content });
                }
                for (const tc of msg.tool_calls) {
                    content.push({
                        type: "tool_use",
                        id: tc.id,
                        name: tc.name,
                        input: tc.arguments
                    });
                }
                anthropicMessages.push({ role: "assistant", content });
            } else {
                anthropicMessages.push({
                    role: msg.role === "user" ? "user" : "assistant",
                    content: msg.content || ""
                });
            }
        }

        // Convert tools to Anthropic format
        const anthropicTools = tools.map((t) => ({
            name: t.function.name,
            description: t.function.description,
            input_schema: t.function.parameters
        }));

        const requestBody: Record<string, unknown> = {
            model,
            messages: anthropicMessages,
            max_tokens: maxTokens,
            temperature
        };

        if (systemMessages.length > 0) {
            requestBody.system = systemMessages.map((m) => m.content).join("\n\n");
        }

        if (anthropicTools.length > 0) {
            requestBody.tools = anthropicTools;
        }

        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(
                (error as { error?: { message?: string } }).error?.message ||
                    `Anthropic API error: ${response.status}`
            );
        }

        const data = (await response.json()) as AnthropicResponse;

        // Extract content and tool calls
        let textContent = "";
        const toolCalls: ToolCall[] = [];

        for (const block of data.content) {
            if (block.type === "text") {
                textContent += block.text;
            } else if (block.type === "tool_use") {
                toolCalls.push({
                    id: block.id!,
                    name: block.name!,
                    arguments: block.input as JsonObject
                });
            }
        }

        return {
            content: textContent || null,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            usage: data.usage
                ? {
                      promptTokens: data.usage.input_tokens,
                      completionTokens: data.usage.output_tokens,
                      totalTokens: data.usage.input_tokens + data.usage.output_tokens
                  }
                : undefined,
            finishReason: data.stop_reason
        };
    }

    /**
     * Get default model for provider.
     */
    private getDefaultModel(provider: string): string {
        switch (provider) {
            case "openai":
                return "gpt-4o";
            case "anthropic":
                return "claude-sonnet-4-20250514";
            default:
                return "gpt-4o";
        }
    }

    /**
     * Resolve variables in a string.
     */
    private resolveVariables(
        text: string,
        context: NodeHandlerInput["context"]
    ): string {
        return text.replace(/\{\{([^}]+)\}\}/g, (_match, path: string) => {
            const value = this.resolvePath(path.trim(), context);
            if (value === undefined || value === null) {
                return "";
            }
            if (typeof value === "object") {
                return JSON.stringify(value);
            }
            return String(value);
        });
    }

    /**
     * Resolve a dot-notation path to a value.
     */
    private resolvePath(
        path: string,
        context: NodeHandlerInput["context"]
    ): unknown {
        const parts = path.split(".");
        const root = parts[0];

        let value: unknown;

        if (root === "inputs") {
            value = context.inputs;
        } else if (root === "variables" || root === "var") {
            value = context.workflowVariables;
        } else if (root === "loop" && context.loopContext) {
            value = context.loopContext;
        } else if (root === "parallel" && context.parallelContext) {
            value = context.parallelContext;
        } else if (context.nodeOutputs[root]) {
            value = context.nodeOutputs[root];
        } else {
            return undefined;
        }

        // Navigate remaining path
        for (let i = 1; i < parts.length && value != null; i++) {
            value = (value as Record<string, unknown>)[parts[i]];
        }

        return value;
    }
}

/**
 * OpenAI tool definition.
 */
interface OpenAITool {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: JsonObject;
    };
}

/**
 * OpenAI chat completion response.
 */
interface OpenAIChatResponse {
    choices: Array<{
        message: {
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
        };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

/**
 * Anthropic message format.
 */
interface AnthropicMessage {
    role: "user" | "assistant";
    content: string | AnthropicContentBlock[];
}

/**
 * Anthropic content block.
 */
interface AnthropicContentBlock {
    type: "text" | "tool_use" | "tool_result";
    text?: string;
    id?: string;
    name?: string;
    input?: unknown;
    tool_use_id?: string;
    content?: string;
}

/**
 * Anthropic response.
 */
interface AnthropicResponse {
    content: AnthropicContentBlock[];
    stop_reason: string;
    usage?: {
        input_tokens: number;
        output_tokens: number;
    };
}

/**
 * LLM response.
 */
interface LLMResponse {
    content: string | null;
    toolCalls?: ToolCall[];
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finishReason?: string;
}
