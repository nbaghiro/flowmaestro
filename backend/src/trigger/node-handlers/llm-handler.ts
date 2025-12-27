import { BaseNodeHandler, NodeHandlerInput, NodeHandlerOutput } from "./types";
import { config } from "../../core/config";

/**
 * LLM Message structure for chat completions.
 */
export interface LLMMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

/**
 * Provider configuration for different LLM providers.
 */
type LLMProvider = "openai" | "anthropic" | "google" | "cohere";

/**
 * LLMHandler - Handles LLM/AI nodes with streaming support.
 *
 * Supported node types:
 * - llm: General LLM completion
 * - chat: Chat completion
 * - completion: Text completion
 * - vision: Vision/image analysis
 *
 * Streaming is handled via Trigger.dev Realtime when running in a task context.
 */
export class LLMHandler extends BaseNodeHandler {
    protected nodeTypes = ["llm", "chat", "completion", "vision"];

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const { config: nodeConfig, context, nodeId } = input;

        try {
            // Extract configuration
            const provider = (nodeConfig.provider as LLMProvider) || "openai";
            const model = (nodeConfig.model as string) || this.getDefaultModel(provider);
            const systemPrompt = nodeConfig.systemPrompt as string | undefined;
            const userPrompt = nodeConfig.prompt as string | undefined;
            const messages = nodeConfig.messages as unknown as LLMMessage[] | undefined;
            const temperature = (nodeConfig.temperature as number) ?? 0.7;
            const maxTokens = (nodeConfig.maxTokens as number) ?? 4096;
            const stream = nodeConfig.stream !== false; // Default to streaming

            // Build messages array
            const resolvedMessages = this.buildMessages(
                systemPrompt,
                userPrompt,
                messages,
                context
            );

            if (resolvedMessages.length === 0) {
                throw new Error("No prompt or messages provided for LLM node");
            }

            // Execute based on provider
            let result: LLMResult;
            switch (provider) {
                case "openai":
                    result = await this.executeOpenAI(
                        model,
                        resolvedMessages,
                        temperature,
                        maxTokens,
                        stream,
                        nodeId
                    );
                    break;
                case "anthropic":
                    result = await this.executeAnthropic(
                        model,
                        resolvedMessages,
                        temperature,
                        maxTokens,
                        stream,
                        nodeId
                    );
                    break;
                case "google":
                    result = await this.executeGoogle(
                        model,
                        resolvedMessages,
                        temperature,
                        maxTokens,
                        nodeId
                    );
                    break;
                default:
                    throw new Error(`Unsupported LLM provider: ${provider}`);
            }

            const durationMs = Date.now() - startTime;

            return {
                success: true,
                data: {
                    text: result.text,
                    model: result.model,
                    provider
                },
                streaming: stream
                    ? {
                          streamId: `llm-${nodeId}`,
                          tokenUsage: result.usage
                              ? {
                                    input: result.usage.promptTokens,
                                    output: result.usage.completionTokens,
                                    model: result.model
                                }
                              : undefined
                      }
                    : undefined,
                metadata: {
                    durationMs,
                    tokenUsage: result.usage,
                    finishReason: result.finishReason
                }
            };
        } catch (error) {
            return this.failure(
                error instanceof Error ? error.message : String(error),
                {
                    code: "LLM_ERROR",
                    activateErrorPort: true
                }
            );
        }
    }

    /**
     * Build messages array from various input formats.
     */
    private buildMessages(
        systemPrompt: string | undefined,
        userPrompt: string | undefined,
        messages: LLMMessage[] | undefined,
        context: NodeHandlerInput["context"]
    ): LLMMessage[] {
        const result: LLMMessage[] = [];

        if (messages && messages.length > 0) {
            // Use provided messages, resolving variables
            for (const msg of messages) {
                result.push({
                    role: msg.role,
                    content: this.resolveVariables(msg.content, context)
                });
            }
        } else {
            // Build from prompts
            if (systemPrompt) {
                result.push({
                    role: "system",
                    content: this.resolveVariables(systemPrompt, context)
                });
            }

            if (userPrompt) {
                result.push({
                    role: "user",
                    content: this.resolveVariables(userPrompt, context)
                });
            }
        }

        return result;
    }

    /**
     * Resolve variable references in a string.
     * Supports: {{nodeId.path}}, {{inputs.field}}, {{variables.name}}, {{loop.index}}
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

    /**
     * Get default model for a provider.
     */
    private getDefaultModel(provider: LLMProvider): string {
        switch (provider) {
            case "openai":
                return "gpt-4o";
            case "anthropic":
                return "claude-sonnet-4-20250514";
            case "google":
                return "gemini-1.5-pro";
            case "cohere":
                return "command-r-plus";
            default:
                return "gpt-4o";
        }
    }

    /**
     * Execute OpenAI completion.
     */
    private async executeOpenAI(
        model: string,
        messages: LLMMessage[],
        temperature: number,
        maxTokens: number,
        stream: boolean,
        nodeId: string
    ): Promise<LLMResult> {
        const apiKey = config.ai.openai.apiKey;
        if (!apiKey) {
            throw new Error("OpenAI API key not configured");
        }

        const requestBody = {
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            stream
        };

        if (stream) {
            return this.streamOpenAI(apiKey, requestBody, nodeId);
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

        const data = (await response.json()) as OpenAIResponse;

        return {
            text: data.choices[0]?.message?.content || "",
            model: data.model,
            usage: data.usage
                ? {
                      promptTokens: data.usage.prompt_tokens,
                      completionTokens: data.usage.completion_tokens,
                      totalTokens: data.usage.total_tokens
                  }
                : undefined,
            finishReason: data.choices[0]?.finish_reason
        };
    }

    /**
     * Stream OpenAI completion.
     * In task context, this uses Trigger.dev streams.pipe().
     * Otherwise, collects chunks manually.
     */
    private async streamOpenAI(
        apiKey: string,
        requestBody: Record<string, unknown>,
        _nodeId: string
    ): Promise<LLMResult> {
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

        // Try to use Trigger.dev streams if available
        // This will be handled by the node-executor task when running in Trigger.dev
        // For now, we collect the stream manually
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error("No response body for streaming");
        }

        const decoder = new TextDecoder();
        let text = "";
        let model = "";
        let finishReason: string | undefined;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n").filter((line) => line.trim() !== "");

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const data = line.slice(6);
                    if (data === "[DONE]") continue;

                    try {
                        const parsed = JSON.parse(data) as OpenAIStreamChunk;
                        if (!model && parsed.model) {
                            model = parsed.model;
                        }
                        const delta = parsed.choices[0]?.delta?.content;
                        if (delta) {
                            text += delta;
                        }
                        if (parsed.choices[0]?.finish_reason) {
                            finishReason = parsed.choices[0].finish_reason;
                        }
                    } catch {
                        // Skip invalid JSON
                    }
                }
            }
        }

        return {
            text,
            model: model || (requestBody.model as string),
            finishReason
        };
    }

    /**
     * Execute Anthropic completion.
     */
    private async executeAnthropic(
        model: string,
        messages: LLMMessage[],
        temperature: number,
        maxTokens: number,
        stream: boolean,
        nodeId: string
    ): Promise<LLMResult> {
        const apiKey = config.ai.anthropic.apiKey;
        if (!apiKey) {
            throw new Error("Anthropic API key not configured");
        }

        // Anthropic uses separate system parameter
        const systemMessages = messages.filter((m) => m.role === "system");
        const chatMessages = messages.filter((m) => m.role !== "system");

        const requestBody: Record<string, unknown> = {
            model,
            messages: chatMessages.map((m) => ({
                role: m.role,
                content: m.content
            })),
            max_tokens: maxTokens,
            temperature,
            stream
        };

        if (systemMessages.length > 0) {
            requestBody.system = systemMessages.map((m) => m.content).join("\n\n");
        }

        if (stream) {
            return this.streamAnthropic(apiKey, requestBody, nodeId);
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

        // Extract text from content blocks
        const textContent = data.content.find((c) => c.type === "text");

        return {
            text: textContent?.text || "",
            model: data.model,
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
     * Stream Anthropic completion.
     */
    private async streamAnthropic(
        apiKey: string,
        requestBody: Record<string, unknown>,
        _nodeId: string
    ): Promise<LLMResult> {
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

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error("No response body for streaming");
        }

        const decoder = new TextDecoder();
        let text = "";
        let model = "";
        let finishReason: string | undefined;
        let usage: LLMResult["usage"];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n").filter((line) => line.trim() !== "");

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const data = line.slice(6);

                    try {
                        const parsed = JSON.parse(data) as AnthropicStreamEvent;

                        if (parsed.type === "message_start" && parsed.message) {
                            model = parsed.message.model;
                        } else if (
                            parsed.type === "content_block_delta" &&
                            parsed.delta?.type === "text_delta"
                        ) {
                            text += parsed.delta.text;
                        } else if (parsed.type === "message_delta") {
                            finishReason = parsed.delta?.stop_reason;
                            if (parsed.usage) {
                                usage = {
                                    promptTokens: 0, // Not in delta
                                    completionTokens: parsed.usage.output_tokens,
                                    totalTokens: parsed.usage.output_tokens
                                };
                            }
                        }
                    } catch {
                        // Skip invalid JSON
                    }
                }
            }
        }

        return {
            text,
            model: model || (requestBody.model as string),
            usage,
            finishReason
        };
    }

    /**
     * Execute Google Gemini completion (non-streaming only for now).
     */
    private async executeGoogle(
        model: string,
        messages: LLMMessage[],
        temperature: number,
        maxTokens: number,
        _nodeId: string
    ): Promise<LLMResult> {
        const apiKey = config.ai.google.apiKey;
        if (!apiKey) {
            throw new Error("Google API key not configured");
        }

        // Convert messages to Gemini format
        const contents = messages
            .filter((m) => m.role !== "system")
            .map((m) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }]
            }));

        // System instruction is separate
        const systemInstruction = messages
            .filter((m) => m.role === "system")
            .map((m) => m.content)
            .join("\n\n");

        const requestBody: Record<string, unknown> = {
            contents,
            generationConfig: {
                temperature,
                maxOutputTokens: maxTokens
            }
        };

        if (systemInstruction) {
            requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            }
        );

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(
                (error as { error?: { message?: string } }).error?.message ||
                    `Google API error: ${response.status}`
            );
        }

        const data = (await response.json()) as GoogleGeminiResponse;

        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        return {
            text: textContent,
            model,
            usage: data.usageMetadata
                ? {
                      promptTokens: data.usageMetadata.promptTokenCount,
                      completionTokens: data.usageMetadata.candidatesTokenCount,
                      totalTokens: data.usageMetadata.totalTokenCount
                  }
                : undefined,
            finishReason: data.candidates?.[0]?.finishReason
        };
    }
}

/**
 * LLM execution result.
 */
interface LLMResult {
    text: string;
    model: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finishReason?: string;
}

/**
 * OpenAI API response types.
 */
interface OpenAIResponse {
    id: string;
    model: string;
    choices: Array<{
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

interface OpenAIStreamChunk {
    model: string;
    choices: Array<{
        delta: {
            content?: string;
        };
        finish_reason?: string;
    }>;
}

/**
 * Anthropic API response types.
 */
interface AnthropicResponse {
    id: string;
    model: string;
    content: Array<{
        type: string;
        text?: string;
    }>;
    stop_reason: string;
    usage?: {
        input_tokens: number;
        output_tokens: number;
    };
}

interface AnthropicStreamEvent {
    type: string;
    message?: {
        model: string;
    };
    delta?: {
        type?: string;
        text?: string;
        stop_reason?: string;
    };
    usage?: {
        output_tokens: number;
    };
}

/**
 * Google Gemini API response types.
 */
interface GoogleGeminiResponse {
    candidates?: Array<{
        content: {
            parts: Array<{
                text: string;
            }>;
        };
        finishReason: string;
    }>;
    usageMetadata?: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
    };
}
