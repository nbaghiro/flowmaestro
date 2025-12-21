/**
 * Agent Activities Index
 * All agent-related Temporal activities
 */

// Core agent activities
export {
    getAgentConfig,
    callLLM,
    executeToolCall,
    saveAgentCheckpoint,
    type GetAgentConfigInput,
    type CallLLMInput,
    type ExecuteToolCallInput,
    type SaveAgentCheckpointInput
} from "./core";

// Agent event emissions
export {
    emitAgentExecutionStarted,
    emitAgentMessage,
    emitAgentThinking,
    emitAgentToolCallStarted,
    emitAgentToolCallCompleted,
    emitAgentToolCallFailed,
    emitAgentExecutionCompleted,
    emitAgentExecutionFailed,
    type EmitAgentExecutionStartedInput,
    type EmitAgentMessageInput,
    type EmitAgentThinkingInput,
    type EmitAgentToolCallStartedInput,
    type EmitAgentToolCallCompletedInput,
    type EmitAgentToolCallFailedInput,
    type EmitAgentExecutionCompletedInput,
    type EmitAgentExecutionFailedInput
} from "./events";

// Safety validation
export {
    validateInput,
    validateOutput,
    logSafetyEvent,
    type ValidateInputInput,
    type ValidateInputResult,
    type ValidateOutputInput,
    type ValidateOutputResult,
    type LogSafetyEventInput
} from "./safety";

// Tool generation
export * from "./tools";

// Streaming events
export * from "./streaming";

// Thread activities
export {
    loadThreadHistory,
    saveThreadIncremental,
    updateThreadTokens,
    convertToOpenAI,
    convertToAnthropic,
    type LoadThreadHistoryInput,
    type SaveThreadIncrementalInput,
    type UpdateThreadTokensInput,
    type ConvertToOpenAIInput,
    type ConvertToAnthropicInput
} from "./memory/thread";

// Thread memory
export {
    storeThreadEmbeddings,
    searchThreadMemory,
    getThreadMemoryStats,
    clearExecutionMemory,
    type StoreThreadEmbeddingsInput,
    type SearchThreadMemoryInput,
    type SearchThreadMemoryResult,
    type GetMemoryStatsInput,
    type MemoryStatsResult,
    type ClearExecutionMemoryInput
} from "./memory/thread-memory";
