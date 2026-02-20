/**
 * Temporal Workflows Index
 *
 * Consolidated exports from:
 * - workflow-orchestrator.ts - Main workflow orchestrator
 * - agent-orchestrator.ts - Agent orchestrator workflow
 * - triggered.ts - Triggered workflow
 * - document-processor.ts - Document processing workflow
 */

// Main workflow orchestrator
export {
    orchestratorWorkflow,
    type OrchestratorInput,
    type OrchestratorResult,
    type WorkflowDefinition,
    // Signals
    cancelWorkflowSignal,
    pauseWorkflowSignal,
    resumeWorkflowSignal,
    humanReviewResponseSignal,
    // Queries
    executionProgressQuery,
    nodeStatusQuery,
    executionSummaryQuery,
    // Query result types
    type ExecutionProgressResult,
    type NodeStatusResult,
    type ExecutionSummaryResult,
    type HumanReviewResponsePayload
} from "./workflow-orchestrator";

// Agent orchestrator workflow
export {
    agentOrchestratorWorkflow,
    userMessageSignal,
    type AgentOrchestratorInput,
    type AgentOrchestratorResult,
    type AgentConfig,
    type LLMResponse
} from "./agent-orchestrator";

// Triggered workflow
export {
    triggeredWorkflow,
    type TriggeredWorkflowInput,
    type TriggeredWorkflowResult
} from "./trigger-handler";

// Document processor workflow (unified for all storage targets)
export {
    processDocumentWorkflow,
    type ProcessDocumentWorkflowInput,
    type ProcessDocumentWorkflowResult,
    type StorageTarget,
    type DocumentSource,
    type DocumentProcessingResult
} from "./document-processor";

// Form submission attachment processor workflow (DEPRECATED - use processDocumentWorkflow with storageTarget: "form-submission")
// The processFormSubmissionAttachmentsWorkflow has been replaced by processDocumentWorkflow

// Persona orchestrator workflow (background execution)
export {
    personaOrchestratorWorkflow,
    personaUserMessageSignal,
    skipClarificationSignal,
    type PersonaOrchestratorInput,
    type PersonaOrchestratorResult
} from "./persona-orchestrator";

// Integration import workflow (knowledge base document import from providers)
export {
    integrationImportWorkflow,
    type IntegrationImportWorkflowInput,
    type IntegrationImportWorkflowResult,
    type ImportFileResult
} from "./integration-import";

// Sync scheduler workflow (cron workflow for scheduled syncs)
export {
    syncSchedulerWorkflow,
    type SyncSchedulerWorkflowInput,
    type SyncSchedulerWorkflowResult
} from "./sync-scheduler";

// Workflow logger (direct import, not from barrel)
export { createWorkflowLogger } from "../core/workflow-logger";
export type { WorkflowLogContext, WorkflowLogger } from "../core/workflow-logger";
