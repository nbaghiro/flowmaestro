/**
 * Orchestration Activities Index
 * Core activities for workflow orchestration
 */

// Event emissions
export {
    emitExecutionStarted,
    emitExecutionProgress,
    emitExecutionCompleted,
    emitExecutionFailed,
    emitNodeStarted,
    emitNodeCompleted,
    emitNodeFailed,
    type EmitExecutionStartedInput,
    type EmitExecutionProgressInput,
    type EmitExecutionCompletedInput,
    type EmitExecutionFailedInput,
    type EmitNodeStartedInput,
    type EmitNodeCompletedInput,
    type EmitNodeFailedInput
} from "./events";

// Span management
export { createSpan, endSpan, endSpanWithError, setSpanAttributes } from "./spans";

// Workflow validation
export {
    validateInputsActivity,
    validateOutputsActivity,
    validateContextActivity
} from "./validation";

// Trigger execution
export {
    prepareTriggeredExecution,
    completeTriggeredExecution,
    type TriggerExecutionInput,
    type TriggerExecutionResult
} from "./triggers";

// Document processing
export {
    extractTextActivity,
    chunkTextActivity,
    generateAndStoreEmbeddingsActivity,
    completeDocumentProcessingActivity,
    type ProcessDocumentInput
} from "./documents";

// Node batch execution
export { executeNodeBatch } from "./node-batch";
