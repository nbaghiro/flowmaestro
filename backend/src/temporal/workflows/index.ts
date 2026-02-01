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
    type WorkflowDefinition
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

// Document processor workflow
export {
    processDocumentWorkflow,
    type ProcessDocumentWorkflowInput,
    type ProcessDocumentWorkflowResult
} from "./document-processor";

// Form submission attachment processor workflow
export {
    processFormSubmissionAttachmentsWorkflow,
    type FormSubmissionAttachmentInput,
    type FormSubmissionAttachmentResult
} from "./form-submission-attachment-processor";

// Persona orchestrator workflow (background execution)
export {
    personaOrchestratorWorkflow,
    personaUserMessageSignal,
    skipClarificationSignal,
    type PersonaOrchestratorInput,
    type PersonaOrchestratorResult
} from "./persona-orchestrator";

// Workflow logger (direct import, not from barrel)
export { createWorkflowLogger } from "../core/workflow-logger";
export type { WorkflowLogContext, WorkflowLogger } from "../core/workflow-logger";
