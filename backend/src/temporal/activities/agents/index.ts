/**
 * Agent Activities Index
 * All agent-related Temporal activities
 */

// Core agent activities (merged from core.ts + tools.ts + safety.ts)
export {
    // Agent config
    getAgentConfig,
    type GetAgentConfigInput,
    // LLM calls
    callLLM,
    type CallLLMInput,
    // Tool execution
    executeToolCall,
    type ExecuteToolCallInput,
    // Checkpoints
    saveAgentCheckpoint,
    type SaveAgentCheckpointInput,
    // Safety validation
    validateInput,
    validateOutput,
    logSafetyEvent,
    type ValidateInputInput,
    type ValidateInputResult,
    type ValidateOutputInput,
    type ValidateOutputResult,
    type LogSafetyEventInput,
    // Multi-agent orchestration
    generateAgentTool,
    generateAgentToolName,
    generateAgentToolsForWorkspace,
    generateAgentToolById,
    injectAgentTools,
    isAgentTool,
    getAgentIdFromTool,
    // Knowledge base tool generation
    generateKnowledgeBaseTool,
    generateKnowledgeBaseToolName
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

// Streaming events
export * from "./streaming";

// Memory activities (merged from memory/)
export {
    // Thread activities
    loadThreadHistory,
    saveThreadIncremental,
    updateThreadTokens,
    convertToOpenAI,
    convertToAnthropic,
    type LoadThreadHistoryInput,
    type SaveThreadIncrementalInput,
    type UpdateThreadTokensInput,
    type ConvertToOpenAIInput,
    type ConvertToAnthropicInput,
    // Thread memory
    storeThreadEmbeddings,
    searchThreadMemory,
    getThreadMemoryStats,
    clearExecutionMemory,
    type StoreThreadEmbeddingsInput,
    type SearchThreadMemoryInput,
    type SearchThreadMemoryResult,
    type GetMemoryStatsInput,
    type MemoryStatsResult,
    type ClearExecutionMemoryInput,
    // Memory tools
    createThreadMemoryTool,
    injectThreadMemoryTool,
    injectThreadMemoryTools,
    createClearThreadMemoryTool,
    executeClearThreadMemory,
    type ClearThreadMemoryInput,
    createWorkingMemoryTool,
    executeUpdateWorkingMemory,
    getWorkingMemoryForAgent,
    isWorkingMemoryEnabled,
    injectWorkingMemoryTool,
    type UpdateWorkingMemoryInput,
    // Shared memory tools (workflow-scoped key-value storage)
    createReadSharedMemoryTool,
    createWriteSharedMemoryTool,
    createSearchSharedMemoryTool,
    injectSharedMemoryTools,
    isSharedMemoryTool,
    type SharedMemoryToolInput,
    type SharedMemoryToolResult,
    // Message summarization
    summarizeMessages,
    type SummarizeMessagesInput,
    type SummarizeMessagesResult
} from "./memory";
