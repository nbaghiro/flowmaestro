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
    summarizeMessages,
    // Working memory
    getWorkingMemoryForAgent,
    type StoreThreadEmbeddingsInput,
    type SearchThreadMemoryInput,
    type SearchThreadMemoryResult,
    type GetMemoryStatsInput,
    type MemoryStatsResult,
    type ClearExecutionMemoryInput,
    type SummarizeMessagesInput,
    type SummarizeMessagesResult
} from "./agents";

// Persona activities (separate from agents - background execution)
export {
    getPersonaConfig,
    updatePersonaInstanceProgress,
    updatePersonaInstanceStatus,
    getPersonaClarificationState,
    updatePersonaClarificationState,
    addPersonaMessage,
    summarizeThreadContext,
    createPersonaDeliverable,
    // Real-time event emission
    emitPersonaStarted,
    emitPersonaProgress,
    emitPersonaDeliverable,
    emitPersonaCompleted,
    emitPersonaFailed,
    emitCreditThresholdAlert,
    emitPersonaPaused,
    emitApprovalExpiring,
    // Credit threshold activities
    checkCreditThreshold,
    updateThresholdNotified,
    resetThresholdNotifications,
    // Approval activities
    checkToolRequiresApproval,
    getToolRiskLevel,
    generateToolDescription,
    createPersonaApprovalRequest,
    emitApprovalNeeded,
    emitApprovalResolved,
    clearPendingApproval,
    parseApprovalSignal,
    type GetPersonaConfigInput,
    type UpdatePersonaInstanceProgressInput,
    type UpdatePersonaInstanceStatusInput,
    type GetPersonaClarificationStateInput,
    type PersonaClarificationState,
    type UpdatePersonaClarificationStateInput,
    type AddPersonaMessageInput,
    type SummarizeThreadContextInput,
    type CreatePersonaDeliverableInput,
    type CreatePersonaDeliverableResult,
    type EmitPersonaStartedInput,
    type EmitPersonaProgressInput,
    type EmitPersonaDeliverableInput,
    type EmitPersonaCompletedInput,
    type EmitPersonaFailedInput,
    type EmitCreditThresholdInput,
    type EmitPersonaPausedInput,
    type EmitApprovalExpiringInput,
    type CheckCreditThresholdInput,
    type CheckCreditThresholdResult,
    type UpdateThresholdNotifiedInput,
    type CreatePersonaApprovalRequestInput,
    type CreatePersonaApprovalRequestResult,
    type CheckToolRequiresApprovalInput,
    type EmitApprovalNeededInput,
    type EmitApprovalResolvedInput,
    type ClearPendingApprovalInput
} from "./personas";

// Form submission attachment activities have been replaced by unified document-processing activities
// Use extractDocumentText, chunkDocumentText, generateAndStoreChunks, completeDocumentProcessing instead

// Unified document processing activities (supports all storage targets)
export {
    // Activities
    extractDocumentText,
    chunkDocumentText,
    generateAndStoreChunks,
    completeDocumentProcessing,
    // Types
    type DocumentSource,
    type StorageTargetConfig,
    type KnowledgeBaseTarget,
    type FormSubmissionTarget,
    type ChatInterfaceTarget,
    type DocumentProcessingInput,
    type ExtractTextInput,
    type ChunkTextInput,
    type ChunkResult as DocumentChunkResult,
    type EmbedAndStoreInput,
    type EmbedAndStoreResult,
    type CompleteProcessingInput as CompleteDocumentProcessingInput
} from "./document-processing";

// Integration import activities
export {
    listIntegrationFiles,
    checkExistingDocuments,
    downloadIntegrationFile,
    storeDocumentFile,
    createIntegrationDocument,
    updateSourceSyncStatus,
    findSourcesDueForSync,
    type ListIntegrationFilesInput,
    type CheckExistingDocumentsInput,
    type ExistingDocumentInfo,
    type DownloadIntegrationFileInput,
    type DownloadResult as IntegrationDownloadResult,
    type StoreDocumentFileInput,
    type CreateIntegrationDocumentInput,
    type UpdateSourceSyncStatusInput,
    type SourceDueForSync
} from "./integration-import";
