/**
 * Conversation Activities - Activities for managing conversations with ConversationManager
 */

import { ConversationManager } from "../../../services/conversation/ConversationManager";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import type { ConversationMessage } from "../../../storage/models/AgentExecution";

const executionRepo = new AgentExecutionRepository();

/**
 * Load conversation history for an execution
 * Returns messages that have been persisted to the database
 */
export interface LoadConversationHistoryInput {
    executionId: string;
}

export async function loadConversationHistory(
    input: LoadConversationHistoryInput
): Promise<ConversationMessage[]> {
    const { executionId } = input;

    // Load execution from database
    const execution = await executionRepo.findById(executionId);

    if (!execution) {
        throw new Error(`Execution ${executionId} not found`);
    }

    // Return conversation history
    return execution.conversation_history || [];
}

/**
 * Save new conversation messages incrementally
 * Only saves messages that haven't been saved yet
 *
 * Thread-aware: Saves messages to both execution and agent_messages table with thread_id
 */
export interface SaveConversationIncrementalInput {
    executionId: string;
    threadId: string; // Thread ID for message persistence
    messages: ConversationMessage[];
    markCompleted?: boolean; // If true, mark execution as completed after saving
}

export async function saveConversationIncremental(
    input: SaveConversationIncrementalInput
): Promise<{ saved: number }> {
    const { executionId, threadId, messages, markCompleted } = input;

    if (messages.length === 0) {
        return { saved: 0 };
    }

    // Load current execution
    const execution = await executionRepo.findById(executionId);

    if (!execution) {
        throw new Error(`Execution ${executionId} not found`);
    }

    // Use ConversationManager for proper handling
    const conversation = new ConversationManager();

    // Add existing messages from database (mark as saved)
    if (execution.conversation_history && execution.conversation_history.length > 0) {
        conversation.addFromMemory(execution.conversation_history);
    }

    // Add new messages
    messages.forEach((msg) => {
        switch (msg.role) {
            case "user":
                conversation.addUserMessage(msg.content, msg.id);
                break;
            case "assistant":
                conversation.addAssistantMessage(msg.content, msg.tool_calls, msg.id);
                break;
            case "tool":
                if (msg.tool_name && msg.tool_call_id) {
                    conversation.addToolMessage(
                        msg.content,
                        msg.tool_name,
                        msg.tool_call_id,
                        msg.id
                    );
                }
                break;
            case "system":
                conversation.addSystemMessage(msg.content, msg.id);
                break;
        }
    });

    // Get all messages for storage
    const allMessages = conversation.toDatabase();

    // Update execution with all messages (for backward compatibility)
    await executionRepo.update(executionId, {
        conversation_history: allMessages
    });

    // Also save individual messages to agent_messages table with thread_id
    // This allows messages to persist across multiple executions in the same thread
    await executionRepo.saveMessagesToThread(threadId, executionId, messages);

    // Optionally mark execution as completed
    if (markCompleted) {
        await executionRepo.update(executionId, {
            status: "completed",
            completed_at: new Date()
        });
    }

    console.log(
        `[ConversationActivity] Saved ${messages.length} new messages for execution ${executionId} in thread ${threadId}${markCompleted ? " (marked as completed)" : ""}`
    );

    return { saved: messages.length };
}

/**
 * Convert conversation to OpenAI format
 * Useful for format conversion in activities
 */
export interface ConvertToOpenAIInput {
    messages: ConversationMessage[];
}

export async function convertToOpenAI(input: ConvertToOpenAIInput): Promise<unknown[]> {
    const { messages } = input;

    const conversation = new ConversationManager();
    conversation.addFromMemory(messages);

    return conversation.toOpenAI();
}

/**
 * Convert conversation to Anthropic format
 * Useful for format conversion in activities
 */
export interface ConvertToAnthropicInput {
    messages: ConversationMessage[];
}

export async function convertToAnthropic(
    input: ConvertToAnthropicInput
): Promise<{ system: string; messages: unknown[] }> {
    const { messages } = input;

    const conversation = new ConversationManager();
    conversation.addFromMemory(messages);

    return conversation.toAnthropic();
}
