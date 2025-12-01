/**
 * ConversationManager - Message Abstraction for Agent Conversations
 * Implements Mastra-inspired MessageList pattern with multi-format support
 */

import { v4 as uuidv4 } from "uuid";
import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import type {
    ConversationMessage,
    MessageRole,
    ToolCall
} from "../../storage/models/AgentExecution";

/**
 * Message source types for tracking persistence state
 */
export enum MessageSource {
    MEMORY = "memory", // Loaded from database/memory
    NEW = "new", // Newly added in this session
    SYSTEM = "system" // System messages
}

/**
 * Internal message with source tracking
 */
interface TrackedMessage extends ConversationMessage {
    source: MessageSource;
}

/**
 * OpenAI-compatible message format
 */
export interface OpenAIMessage {
    role: MessageRole;
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
}

/**
 * Anthropic-compatible message format
 */
export interface AnthropicMessage {
    role: "user" | "assistant";
    content:
        | string
        | Array<{
              type: "text" | "tool_use" | "tool_result";
              text?: string;
              id?: string;
              name?: string;
              input?: JsonObject;
              tool_use_id?: string;
              content?: string;
          }>;
}

/**
 * Serialized conversation state for workflow persistence
 */
export interface SerializedConversation {
    messages: ConversationMessage[];
    savedMessageIds: string[];
    metadata: JsonObject;
}

/**
 * ConversationManager - Manages conversation state with source tracking
 */
export class ConversationManager {
    private messages: TrackedMessage[] = [];
    private savedMessageIds = new Set<string>();
    private metadata: JsonObject = {};

    constructor(initialMetadata?: JsonObject) {
        this.metadata = initialMetadata || {};
    }

    /**
     * Add messages loaded from memory/database (already persisted)
     */
    addFromMemory(messages: ConversationMessage[]): void {
        const trackedMessages: TrackedMessage[] = messages.map((msg) => ({
            ...msg,
            source: msg.role === "system" ? MessageSource.SYSTEM : MessageSource.MEMORY
        }));

        this.messages.push(...trackedMessages);

        // Mark as already saved
        messages.forEach((msg) => this.savedMessageIds.add(msg.id));
    }

    /**
     * Add system message (usually at conversation start)
     */
    addSystemMessage(content: string, id?: string): ConversationMessage {
        const message: ConversationMessage = {
            id: id || `sys-${Date.now()}-${uuidv4()}`,
            role: "system",
            content,
            timestamp: new Date()
        };

        this.messages.push({
            ...message,
            source: MessageSource.SYSTEM
        });

        return message;
    }

    /**
     * Add user message (new in this session)
     */
    addUserMessage(content: string, id?: string): ConversationMessage {
        const message: ConversationMessage = {
            id: id || `user-${Date.now()}-${uuidv4()}`,
            role: "user",
            content,
            timestamp: new Date()
        };

        this.messages.push({
            ...message,
            source: MessageSource.NEW
        });

        return message;
    }

    /**
     * Add assistant message with optional tool calls
     */
    addAssistantMessage(content: string, toolCalls?: ToolCall[], id?: string): ConversationMessage {
        const message: ConversationMessage = {
            id: id || `asst-${Date.now()}-${uuidv4()}`,
            role: "assistant",
            content,
            tool_calls: toolCalls,
            timestamp: new Date()
        };

        this.messages.push({
            ...message,
            source: MessageSource.NEW
        });

        return message;
    }

    /**
     * Add tool result message
     */
    addToolMessage(
        content: string,
        toolName: string,
        toolCallId: string,
        id?: string
    ): ConversationMessage {
        const message: ConversationMessage = {
            id: id || `tool-${Date.now()}-${uuidv4()}`,
            role: "tool",
            content,
            tool_name: toolName,
            tool_call_id: toolCallId,
            timestamp: new Date()
        };

        this.messages.push({
            ...message,
            source: MessageSource.NEW
        });

        return message;
    }

    /**
     * Get all messages (without source tracking)
     */
    getAll(): ConversationMessage[] {
        return this.messages.map((msg) => {
            const { source: _source, ...message } = msg;
            return message;
        });
    }

    /**
     * Get only unsaved messages (for incremental persistence)
     */
    getUnsaved(): ConversationMessage[] {
        return this.messages
            .filter((msg) => !this.savedMessageIds.has(msg.id))
            .map((msg) => {
                const { source: _source, ...message } = msg;
                return message;
            });
    }

    /**
     * Mark messages as saved (after persisting to database)
     */
    markSaved(messageIds: string[]): void {
        messageIds.forEach((id) => this.savedMessageIds.add(id));
    }

    /**
     * Get message count
     */
    count(): number {
        return this.messages.length;
    }

    /**
     * Get unsaved message count
     */
    unsavedCount(): number {
        return this.messages.filter((msg) => !this.savedMessageIds.has(msg.id)).length;
    }

    /**
     * Convert to OpenAI format
     * OpenAI expects all messages in a single array with tool_calls
     */
    toOpenAI(): OpenAIMessage[] {
        return this.messages.map((msg) => {
            const openaiMsg: OpenAIMessage = {
                role: msg.role as "system" | "user" | "assistant" | "tool",
                content: msg.content
            };

            // Add tool calls for assistant messages
            if (msg.tool_calls && msg.tool_calls.length > 0) {
                openaiMsg.tool_calls = msg.tool_calls.map((tc) => ({
                    id: tc.id,
                    type: "function" as const,
                    function: {
                        name: tc.name,
                        arguments: JSON.stringify(tc.arguments)
                    }
                }));
            }

            // Add tool metadata for tool messages
            if (msg.role === "tool") {
                openaiMsg.tool_call_id = msg.tool_call_id;
                openaiMsg.name = msg.tool_name;
            }

            return openaiMsg;
        });
    }

    /**
     * Convert to Anthropic format
     * Anthropic requires system messages separate and different structure
     */
    toAnthropic(): { system: string; messages: AnthropicMessage[] } {
        // Extract system messages
        const systemMessages = this.messages.filter((msg) => msg.role === "system");
        const system = systemMessages.map((msg) => msg.content).join("\n\n");

        // Convert other messages to Anthropic format
        const anthropicMessages: AnthropicMessage[] = [];

        for (const msg of this.messages) {
            if (msg.role === "system") continue; // Already in system

            if (msg.role === "user") {
                anthropicMessages.push({
                    role: "user",
                    content: msg.content
                });
            } else if (msg.role === "assistant") {
                const content: Array<{
                    type: "text" | "tool_use";
                    text?: string;
                    id?: string;
                    name?: string;
                    input?: JsonObject;
                }> = [];

                // Add text content if present
                if (msg.content) {
                    content.push({
                        type: "text",
                        text: msg.content
                    });
                }

                // Add tool uses
                if (msg.tool_calls && msg.tool_calls.length > 0) {
                    msg.tool_calls.forEach((tc) => {
                        content.push({
                            type: "tool_use",
                            id: tc.id,
                            name: tc.name,
                            input: tc.arguments
                        });
                    });
                }

                anthropicMessages.push({
                    role: "assistant",
                    content:
                        content.length === 1 && content[0].type === "text"
                            ? content[0].text!
                            : content
                });
            } else if (msg.role === "tool") {
                // Tool results go as user messages in Anthropic
                anthropicMessages.push({
                    role: "user",
                    content: [
                        {
                            type: "tool_result",
                            tool_use_id: msg.tool_call_id,
                            content: msg.content
                        }
                    ]
                });
            }
        }

        return { system, messages: anthropicMessages };
    }

    /**
     * Convert to database format (for storage)
     */
    toDatabase(): ConversationMessage[] {
        return this.getAll();
    }

    /**
     * Serialize for workflow persistence (e.g., continue-as-new)
     */
    serialize(): SerializedConversation {
        return {
            messages: this.getAll(),
            savedMessageIds: Array.from(this.savedMessageIds),
            metadata: this.metadata
        };
    }

    /**
     * Deserialize from workflow persistence
     */
    static deserialize(serialized: SerializedConversation): ConversationManager {
        const manager = new ConversationManager(serialized.metadata);

        // Add all messages as memory (they're from previous workflow run)
        manager.addFromMemory(serialized.messages);

        return manager;
    }

    /**
     * Deduplicate messages by ID
     */
    deduplicate(): void {
        const seen = new Set<string>();
        this.messages = this.messages.filter((msg) => {
            if (seen.has(msg.id)) {
                return false;
            }
            seen.add(msg.id);
            return true;
        });
    }

    /**
     * Keep only last N messages (for memory management)
     */
    keepLast(count: number): ConversationMessage[] {
        if (this.messages.length <= count) {
            return [];
        }

        const removed = this.messages.slice(0, this.messages.length - count);
        this.messages = this.messages.slice(-count);

        return removed.map((msg) => {
            const { source: _source, ...message } = msg;
            return message;
        });
    }

    /**
     * Summarize and compress conversation history
     * This would typically call an LLM to create a summary
     */
    async summarize(
        maxMessages: number,
        summarizer?: (messages: ConversationMessage[]) => Promise<string>
    ): Promise<void> {
        if (this.messages.length <= maxMessages) {
            return; // No need to summarize
        }

        // Keep system messages and last N messages
        const systemMessages = this.messages.filter((msg) => msg.role === "system");
        const recentMessages = this.messages.slice(-maxMessages);
        const toSummarize = this.messages.slice(
            systemMessages.length,
            this.messages.length - maxMessages
        );

        if (toSummarize.length === 0) {
            return;
        }

        // Create summary
        let summaryContent: string;
        if (summarizer) {
            const messagesToSummarize = toSummarize.map((msg) => {
                const { source: _source, ...message } = msg;
                return message;
            });
            summaryContent = await summarizer(messagesToSummarize);
        } else {
            // Default summary (just metadata)
            summaryContent = `[Previous conversation summarized: ${toSummarize.length} messages, ${toSummarize.filter((m) => m.tool_calls).length} tool calls]`;
        }

        // Create summary message
        const summaryMessage: TrackedMessage = {
            id: `summary-${Date.now()}-${uuidv4()}`,
            role: "system",
            content: summaryContent,
            timestamp: new Date(),
            source: MessageSource.SYSTEM
        };

        // Replace old messages with summary
        this.messages = [...systemMessages, summaryMessage, ...recentMessages];
    }

    /**
     * Get metadata
     */
    getMetadata(): JsonObject {
        return { ...this.metadata };
    }

    /**
     * Set metadata
     */
    setMetadata(key: string, value: JsonValue): void {
        this.metadata[key] = value;
    }

    /**
     * Clear all messages (dangerous - use with caution)
     */
    clear(): void {
        this.messages = [];
        this.savedMessageIds.clear();
    }

    /**
     * Clone the conversation manager
     */
    clone(): ConversationManager {
        return ConversationManager.deserialize(this.serialize());
    }
}
