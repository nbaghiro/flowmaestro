/**
 * Persona Activities Index
 * All persona-related Temporal activities for background execution
 */

export {
    // Config
    getPersonaConfig,
    type GetPersonaConfigInput,
    // Progress tracking
    updatePersonaInstanceProgress,
    type UpdatePersonaInstanceProgressInput,
    // Status updates
    updatePersonaInstanceStatus,
    type UpdatePersonaInstanceStatusInput,
    // Clarification phase
    getPersonaClarificationState,
    type GetPersonaClarificationStateInput,
    type PersonaClarificationState,
    updatePersonaClarificationState,
    type UpdatePersonaClarificationStateInput,
    // Messages
    addPersonaMessage,
    type AddPersonaMessageInput,
    // Memory summarization
    summarizeThreadContext,
    type SummarizeThreadContextInput,
    // Workflow control tools (handled directly, not via executeToolCall)
    createPersonaDeliverable,
    type CreatePersonaDeliverableInput,
    type CreatePersonaDeliverableResult
} from "./persona";

// Real-time event emission
export {
    emitPersonaStarted,
    emitPersonaProgress,
    emitPersonaDeliverable,
    emitPersonaCompleted,
    emitPersonaFailed,
    emitCreditThresholdAlert,
    emitPersonaPaused,
    emitApprovalExpiring,
    type EmitPersonaStartedInput,
    type EmitPersonaProgressInput,
    type EmitPersonaDeliverableInput,
    type EmitPersonaCompletedInput,
    type EmitPersonaFailedInput,
    type EmitCreditThresholdInput,
    type EmitPersonaPausedInput,
    type EmitApprovalExpiringInput
} from "./events";

// Credit threshold management
export {
    checkCreditThreshold,
    updateThresholdNotified,
    resetThresholdNotifications,
    type CheckCreditThresholdInput,
    type CheckCreditThresholdResult,
    type UpdateThresholdNotifiedInput
} from "./credit-threshold";

// Approval handling
export {
    // Risk assessment
    checkToolRequiresApproval,
    getToolRiskLevel,
    generateToolDescription,
    // Approval request lifecycle
    createPersonaApprovalRequest,
    emitApprovalNeeded,
    emitApprovalResolved,
    clearPendingApproval,
    parseApprovalSignal,
    // Types
    type CreatePersonaApprovalRequestInput,
    type CreatePersonaApprovalRequestResult,
    type CheckToolRequiresApprovalInput,
    type EmitApprovalNeededInput,
    type EmitApprovalResolvedInput,
    type ClearPendingApprovalInput
} from "./approvals";
