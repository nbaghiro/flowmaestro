/**
 * Activities Index
 * Central export point for all Temporal activities
 * This is what the worker imports to register all activities
 */

// Node executors
export { executeNode, type ExecuteNodeInput, type NodeResult } from "./execution";

// Execution events (from events.ts)
export {
    // Events
    emitExecutionStarted,
    emitExecutionProgress,
    emitExecutionCompleted,
    emitExecutionFailed,
    emitExecutionPaused,
    emitNodeStarted,
    emitNodeCompleted,
    emitNodeFailed,
    type EmitExecutionStartedInput,
    type EmitExecutionProgressInput,
    type EmitExecutionCompletedInput,
    type EmitExecutionFailedInput,
    type EmitExecutionPausedInput,
    type EmitNodeStartedInput,
    type EmitNodeCompletedInput,
    type EmitNodeFailedInput,
    // Validation
    validateInputsActivity,
    validateOutputsActivity,
    validateContextActivity,
    // Documents
    extractTextActivity,
    chunkTextActivity,
    generateAndStoreEmbeddingsActivity,
    completeDocumentProcessingActivity,
    type ProcessDocumentInput,
    // Node batch
    executeNodeBatch
} from "./events";

// Tracing activities (from tracing.ts)
export { createSpan, endSpan, endSpanWithError, setSpanAttributes } from "./tracing";

// Trigger activities
export {
    prepareTriggeredExecution,
    completeTriggeredExecution,
    type TriggerExecutionInput,
    type TriggerExecutionResult
} from "./triggers";

// Credit activities
export {
    checkCredits,
    shouldAllowExecution,
    getCreditsBalance,
    reserveCredits,
    releaseCredits,
    finalizeCredits,
    calculateLLMCredits,
    calculateNodeCredits,
    estimateWorkflowCredits,
    type CheckCreditsInput,
    type ShouldAllowExecutionInput,
    type GetBalanceInput,
    type ReserveCreditsInput,
    type ReleaseCreditsInput,
    type FinalizeCreditsInput,
    type CalculateLLMCreditsInput,
    type CalculateNodeCreditsInput,
    type EstimateWorkflowCreditsInput
} from "./credits";

// Agent activities
export {
    // Core
    getAgentConfig,
    callLLM,
    executeToolCall,
    saveAgentCheckpoint,
    type GetAgentConfigInput,
    type CallLLMInput,
    type ExecuteToolCallInput,
    type SaveAgentCheckpointInput,
    // Events
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
    type EmitAgentExecutionFailedInput,
    // Safety
    validateInput,
    validateOutput,
    logSafetyEvent,
    type ValidateInputInput,
    type ValidateInputResult,
    type ValidateOutputInput,
    type ValidateOutputResult,
    type LogSafetyEventInput,
    // Thread
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
    type ClearExecutionMemoryInput
} from "./agents";

// Persona activities (separate from agents - background execution)
export {
    getPersonaConfig,
    updatePersonaInstanceProgress,
    updatePersonaInstanceStatus,
    getPersonaClarificationState,
    updatePersonaClarificationState,
    addPersonaMessage,
    type GetPersonaConfigInput,
    type UpdatePersonaInstanceProgressInput,
    type UpdatePersonaInstanceStatusInput,
    type GetPersonaClarificationStateInput,
    type PersonaClarificationState,
    type UpdatePersonaClarificationStateInput,
    type AddPersonaMessageInput
} from "./personas";

// Form submission attachment activities
export {
    extractSubmissionAttachmentText,
    chunkSubmissionAttachmentText,
    generateAndStoreSubmissionChunks,
    completeSubmissionAttachmentProcessing,
    type ExtractSubmissionAttachmentInput,
    type ChunkSubmissionAttachmentInput,
    type ChunkResult,
    type StoreSubmissionChunksInput,
    type CompleteSubmissionProcessingInput
} from "./form-submission-attachments";
