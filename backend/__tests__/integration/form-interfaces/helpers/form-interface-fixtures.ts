/**
 * Form Interface Test Fixtures
 *
 * Factory functions for creating test data for form interface integration tests.
 * All fixtures use deterministic IDs for reproducible tests.
 */

import { v4 as uuidv4 } from "uuid";
import type {
    FormInterface,
    FormInterfaceSubmission,
    PublicFormInterface,
    FormInterfaceFileAttachment,
    FormInterfaceUrlAttachment,
    CreateFormInterfaceInput,
    UpdateFormInterfaceInput,
    FormSubmissionExecutionStatus
} from "@flowmaestro/shared";
import { generateDeterministicEmbedding } from "../../knowledge-base/helpers/embedding-mock";

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_USER_ID = "test-user-001";
const DEFAULT_WORKSPACE_ID = "test-workspace-001";
const DEFAULT_WORKFLOW_ID = "test-workflow-001";
const DEFAULT_AGENT_ID = "test-agent-001";

// ============================================================================
// RESERVED SLUGS
// ============================================================================

export const RESERVED_SLUGS = [
    "api",
    "admin",
    "login",
    "logout",
    "signup",
    "register",
    "settings",
    "dashboard",
    "workflows",
    "agents",
    "i",
    "form-interfaces",
    "connections",
    "knowledge-bases",
    "templates"
];

export const INVALID_SLUG_EXAMPLES = [
    { slug: "a", reason: "Too short - must be at least 2 characters" },
    { slug: "-invalid", reason: "Cannot start with hyphen" },
    { slug: "invalid-", reason: "Cannot end with hyphen" },
    { slug: "UPPERCASE", reason: "Must be lowercase" },
    { slug: "has spaces", reason: "Cannot contain spaces" },
    { slug: "special@chars", reason: "Cannot contain special characters" },
    { slug: "api", reason: "Reserved slug" }
];

// ============================================================================
// FORM INTERFACE FIXTURES
// ============================================================================

/**
 * Create a test form interface with default or custom values.
 */
export function createTestFormInterface(overrides: Partial<FormInterface> = {}): FormInterface {
    const id = overrides.id || `fi-${uuidv4().slice(0, 8)}`;
    const slug = overrides.slug || `test-form-${id.slice(3)}`;

    return {
        id,
        userId: overrides.userId || DEFAULT_USER_ID,

        // Identity
        name: overrides.name || "Test Form Interface",
        slug,

        // Target
        targetType: overrides.targetType || "workflow",
        workflowId: overrides.workflowId !== undefined ? overrides.workflowId : DEFAULT_WORKFLOW_ID,
        agentId: overrides.agentId !== undefined ? overrides.agentId : null,
        triggerId: overrides.triggerId !== undefined ? overrides.triggerId : null,

        // Branding
        coverType: overrides.coverType || "color",
        coverValue: overrides.coverValue || "#6366f1",
        iconUrl: overrides.iconUrl !== undefined ? overrides.iconUrl : null,
        title: overrides.title || "Test Form",
        description:
            overrides.description !== undefined ? overrides.description : "A test form interface",

        // Input Config
        inputPlaceholder: overrides.inputPlaceholder || "Enter your request...",
        inputLabel: overrides.inputLabel || "Your Request",
        fileUploadLabel: overrides.fileUploadLabel || "Upload files",
        urlInputLabel: overrides.urlInputLabel || "Add URLs",
        allowFileUpload: overrides.allowFileUpload ?? true,
        allowUrlInput: overrides.allowUrlInput ?? true,
        maxFiles: overrides.maxFiles ?? 5,
        maxFileSizeMb: overrides.maxFileSizeMb ?? 10,
        allowedFileTypes: overrides.allowedFileTypes || [
            "application/pdf",
            "text/plain",
            "image/*"
        ],

        // Output Config
        outputLabel: overrides.outputLabel || "Result",
        showCopyButton: overrides.showCopyButton ?? true,
        showDownloadButton: overrides.showDownloadButton ?? true,
        allowOutputEdit: overrides.allowOutputEdit ?? false,

        // Submit Button
        submitButtonText: overrides.submitButtonText || "Submit",
        submitLoadingText: overrides.submitLoadingText || "Processing...",

        // State
        status: overrides.status || "published",
        publishedAt: overrides.publishedAt !== undefined ? overrides.publishedAt : new Date(),

        // Stats
        submissionCount: overrides.submissionCount ?? 0,
        lastSubmissionAt: overrides.lastSubmissionAt !== undefined ? overrides.lastSubmissionAt : null,

        // Timestamps
        createdAt: overrides.createdAt || new Date(),
        updatedAt: overrides.updatedAt || new Date()
    };
}

/**
 * Create a public form interface (stripped for embedding).
 */
export function createPublicFormInterface(
    overrides: Partial<PublicFormInterface> = {}
): PublicFormInterface {
    const id = overrides.id || `fi-${uuidv4().slice(0, 8)}`;
    const slug = overrides.slug || `test-form-${id.slice(3)}`;

    return {
        id,
        slug,
        coverType: overrides.coverType || "color",
        coverValue: overrides.coverValue || "#6366f1",
        iconUrl: overrides.iconUrl !== undefined ? overrides.iconUrl : null,
        title: overrides.title || "Test Form",
        description:
            overrides.description !== undefined ? overrides.description : "A test form interface",
        inputPlaceholder: overrides.inputPlaceholder || "Enter your request...",
        inputLabel: overrides.inputLabel || "Your Request",
        fileUploadLabel: overrides.fileUploadLabel || "Upload files",
        urlInputLabel: overrides.urlInputLabel || "Add URLs",
        allowFileUpload: overrides.allowFileUpload ?? true,
        allowUrlInput: overrides.allowUrlInput ?? true,
        maxFiles: overrides.maxFiles ?? 5,
        maxFileSizeMb: overrides.maxFileSizeMb ?? 10,
        allowedFileTypes: overrides.allowedFileTypes || [
            "application/pdf",
            "text/plain",
            "image/*"
        ],
        submitButtonText: overrides.submitButtonText || "Submit",
        submitLoadingText: overrides.submitLoadingText || "Processing...",
        outputLabel: overrides.outputLabel || "Result",
        showCopyButton: overrides.showCopyButton ?? true,
        showDownloadButton: overrides.showDownloadButton ?? true,
        allowOutputEdit: overrides.allowOutputEdit ?? false
    };
}

/**
 * Create a draft (unpublished) form interface.
 */
export function createDraftFormInterface(overrides: Partial<FormInterface> = {}): FormInterface {
    return createTestFormInterface({
        ...overrides,
        status: "draft",
        publishedAt: null
    });
}

/**
 * Create a published form interface.
 */
export function createPublishedFormInterface(
    overrides: Partial<FormInterface> = {}
): FormInterface {
    return createTestFormInterface({
        ...overrides,
        status: "published",
        publishedAt: new Date()
    });
}

/**
 * Create a form interface with workflow target.
 */
export function createWorkflowTargetFormInterface(
    workflowId: string,
    overrides: Partial<FormInterface> = {}
): FormInterface {
    return createTestFormInterface({
        ...overrides,
        targetType: "workflow",
        workflowId,
        agentId: null
    });
}

/**
 * Create a form interface with agent target.
 */
export function createAgentTargetFormInterface(
    agentId: string,
    overrides: Partial<FormInterface> = {}
): FormInterface {
    return createTestFormInterface({
        ...overrides,
        targetType: "agent",
        workflowId: null,
        agentId
    });
}

/**
 * Create a form interface with file uploads disabled.
 */
export function createNoUploadFormInterface(
    overrides: Partial<FormInterface> = {}
): FormInterface {
    return createTestFormInterface({
        ...overrides,
        allowFileUpload: false,
        allowUrlInput: false
    });
}

// ============================================================================
// SUBMISSION FIXTURES
// ============================================================================

/**
 * Create a test submission with default or custom values.
 */
export function createTestSubmission(
    interfaceId: string,
    overrides: Partial<FormInterfaceSubmission> = {}
): FormInterfaceSubmission {
    const id = overrides.id || `sub-${uuidv4().slice(0, 8)}`;

    return {
        id,
        interfaceId,

        // User Input
        message: overrides.message !== undefined ? overrides.message : "Test submission message",
        files: overrides.files || [],
        urls: overrides.urls || [],

        // Output
        output: overrides.output !== undefined ? overrides.output : null,
        outputEditedAt: overrides.outputEditedAt !== undefined ? overrides.outputEditedAt : null,

        // Execution tracking
        executionId: overrides.executionId,
        executionStatus: overrides.executionStatus || "pending",
        attachmentsStatus: overrides.attachmentsStatus || "pending",

        // Metadata
        ipAddress: overrides.ipAddress !== undefined ? overrides.ipAddress : "127.0.0.1",
        userAgent:
            overrides.userAgent !== undefined
                ? overrides.userAgent
                : "Mozilla/5.0 (Test Browser)",
        submittedAt: overrides.submittedAt || new Date(),
        createdAt: overrides.createdAt || new Date()
    };
}

/**
 * Create a running submission with execution in progress.
 */
export function createRunningSubmission(
    interfaceId: string,
    executionId: string,
    overrides: Partial<FormInterfaceSubmission> = {}
): FormInterfaceSubmission {
    return createTestSubmission(interfaceId, {
        ...overrides,
        executionId,
        executionStatus: "running",
        attachmentsStatus: "ready"
    });
}

/**
 * Create a completed submission with output.
 */
export function createCompletedSubmission(
    interfaceId: string,
    output: string,
    overrides: Partial<FormInterfaceSubmission> = {}
): FormInterfaceSubmission {
    return createTestSubmission(interfaceId, {
        ...overrides,
        executionId: overrides.executionId || `exec-${uuidv4().slice(0, 8)}`,
        executionStatus: "completed",
        attachmentsStatus: "ready",
        output
    });
}

/**
 * Create a failed submission.
 */
export function createFailedSubmission(
    interfaceId: string,
    overrides: Partial<FormInterfaceSubmission> = {}
): FormInterfaceSubmission {
    return createTestSubmission(interfaceId, {
        ...overrides,
        executionId: overrides.executionId || `exec-${uuidv4().slice(0, 8)}`,
        executionStatus: "failed",
        attachmentsStatus: "ready"
    });
}

/**
 * Create a submission with pending attachments.
 */
export function createSubmissionWithPendingAttachments(
    interfaceId: string,
    files: FormInterfaceFileAttachment[],
    overrides: Partial<FormInterfaceSubmission> = {}
): FormInterfaceSubmission {
    return createTestSubmission(interfaceId, {
        ...overrides,
        files,
        executionStatus: "running",
        attachmentsStatus: "processing"
    });
}

// ============================================================================
// ATTACHMENT FIXTURES
// ============================================================================

/**
 * Create a test file attachment.
 */
export function createTestFileAttachment(
    overrides: Partial<FormInterfaceFileAttachment> = {}
): FormInterfaceFileAttachment {
    const id = uuidv4().slice(0, 8);
    const fileName = overrides.fileName || "test-document.pdf";

    return {
        fileName,
        fileSize: overrides.fileSize ?? 1024 * 100, // 100KB
        mimeType: overrides.mimeType || "application/pdf",
        gcsUri: overrides.gcsUri || `gs://test-bucket/form-submissions/fi-001/session-001/${id}_${fileName}`,
        downloadUrl:
            overrides.downloadUrl ||
            `https://storage.googleapis.com/test-bucket/form-submissions/fi-001/session-001/${id}_${fileName}?signed=true`
    };
}

/**
 * Create a test URL attachment.
 */
export function createTestUrlAttachment(
    overrides: Partial<FormInterfaceUrlAttachment> = {}
): FormInterfaceUrlAttachment {
    return {
        url: overrides.url || "https://example.com/document",
        title: overrides.title
    };
}

/**
 * Create attachments for different file types.
 */
export function createFileTypeAttachments(): Record<string, FormInterfaceFileAttachment> {
    const fileTypes = [
        { ext: "pdf", mime: "application/pdf" },
        {
            ext: "docx",
            mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        },
        { ext: "txt", mime: "text/plain" },
        { ext: "md", mime: "text/markdown" },
        { ext: "png", mime: "image/png" },
        { ext: "jpg", mime: "image/jpeg" },
        { ext: "csv", mime: "text/csv" }
    ];

    const result: Record<string, FormInterfaceFileAttachment> = {};

    for (const { ext, mime } of fileTypes) {
        result[ext] = createTestFileAttachment({
            fileName: `test-document.${ext}`,
            mimeType: mime
        });
    }

    return result;
}

/**
 * Create an oversized file attachment (for testing size limits).
 */
export function createOversizedFileAttachment(
    sizeMb: number = 30
): FormInterfaceFileAttachment {
    return createTestFileAttachment({
        fileName: "large-file.pdf",
        fileSize: sizeMb * 1024 * 1024
    });
}

/**
 * Create a file attachment with invalid type.
 */
export function createInvalidTypeFileAttachment(): FormInterfaceFileAttachment {
    return createTestFileAttachment({
        fileName: "executable.exe",
        mimeType: "application/x-msdownload"
    });
}

// ============================================================================
// INPUT FIXTURES FOR API CALLS
// ============================================================================

/**
 * Create valid input for creating a workflow-targeted form interface.
 */
export function createValidWorkflowFormInput(
    workflowId: string = DEFAULT_WORKFLOW_ID,
    overrides: Partial<CreateFormInterfaceInput> = {}
): CreateFormInterfaceInput {
    return {
        name: overrides.name || "Test Workflow Form",
        slug: overrides.slug || `test-workflow-form-${Date.now()}`,
        title: overrides.title || "Test Form Title",
        targetType: "workflow",
        workflowId,
        description: overrides.description || "A test form for workflow",
        coverType: overrides.coverType || "color",
        coverValue: overrides.coverValue || "#6366f1"
    };
}

/**
 * Create valid input for creating an agent-targeted form interface.
 */
export function createValidAgentFormInput(
    agentId: string = DEFAULT_AGENT_ID,
    overrides: Partial<CreateFormInterfaceInput> = {}
): CreateFormInterfaceInput {
    return {
        name: overrides.name || "Test Agent Form",
        slug: overrides.slug || `test-agent-form-${Date.now()}`,
        title: overrides.title || "Test Form Title",
        targetType: "agent",
        agentId,
        description: overrides.description || "A test form for agent",
        coverType: overrides.coverType || "color",
        coverValue: overrides.coverValue || "#6366f1"
    };
}

/**
 * Create valid input for updating a form interface.
 */
export function createValidUpdateInput(
    overrides: Partial<UpdateFormInterfaceInput> = {}
): UpdateFormInterfaceInput {
    return {
        name: overrides.name,
        slug: overrides.slug,
        title: overrides.title,
        description: overrides.description,
        coverType: overrides.coverType,
        coverValue: overrides.coverValue,
        inputPlaceholder: overrides.inputPlaceholder,
        inputLabel: overrides.inputLabel,
        allowFileUpload: overrides.allowFileUpload,
        maxFiles: overrides.maxFiles,
        maxFileSizeMb: overrides.maxFileSizeMb
    };
}

// ============================================================================
// CHUNK FIXTURES
// ============================================================================

export interface CreateSubmissionChunkInput {
    submissionId: string;
    sourceType: "file" | "url";
    sourceName: string;
    sourceIndex: number;
    content: string;
    chunkIndex: number;
    embedding: number[];
    metadata?: Record<string, unknown>;
}

/**
 * Create a test chunk for RAG testing.
 */
export function createTestChunk(
    submissionId: string,
    overrides: Partial<CreateSubmissionChunkInput> = {}
): CreateSubmissionChunkInput {
    const content =
        overrides.content ||
        "This is sample chunk content for testing form interface RAG functionality.";

    return {
        submissionId,
        sourceType: overrides.sourceType || "file",
        sourceName: overrides.sourceName || "test-document.pdf",
        sourceIndex: overrides.sourceIndex ?? 0,
        content,
        chunkIndex: overrides.chunkIndex ?? 0,
        embedding: overrides.embedding || generateDeterministicEmbedding(content),
        metadata: overrides.metadata || { fileName: "test-document.pdf" }
    };
}

/**
 * Create multiple chunks for a submission.
 */
export function createTestChunks(
    submissionId: string,
    count: number,
    sourceName: string = "test-document.pdf",
    contentGenerator?: (index: number) => string
): CreateSubmissionChunkInput[] {
    const defaultGenerator = (i: number) =>
        `Chunk ${i + 1} content from ${sourceName} with meaningful text for semantic search testing.`;

    const generator = contentGenerator || defaultGenerator;

    return Array.from({ length: count }, (_, i) => {
        const content = generator(i);
        return createTestChunk(submissionId, {
            content,
            chunkIndex: i,
            sourceName,
            sourceIndex: 0,
            embedding: generateDeterministicEmbedding(content),
            metadata: { chunkIndex: i, source: sourceName }
        });
    });
}

// ============================================================================
// SCENARIO FIXTURES
// ============================================================================

/**
 * Create a complete test scenario with form interface and submission.
 */
export function createCompleteScenario(
    options: {
        formName?: string;
        targetType?: "workflow" | "agent";
        withSubmission?: boolean;
        submissionStatus?: FormSubmissionExecutionStatus;
    } = {}
): {
    formInterface: FormInterface;
    submission?: FormInterfaceSubmission;
} {
    const targetType = options.targetType || "workflow";

    const formInterface = createTestFormInterface({
        id: "fi-scenario-001",
        name: options.formName || "Scenario Form Interface",
        targetType,
        workflowId: targetType === "workflow" ? DEFAULT_WORKFLOW_ID : null,
        agentId: targetType === "agent" ? DEFAULT_AGENT_ID : null
    });

    const result: { formInterface: FormInterface; submission?: FormInterfaceSubmission } = {
        formInterface
    };

    if (options.withSubmission) {
        result.submission = createTestSubmission(formInterface.id, {
            id: "sub-scenario-001",
            executionStatus: options.submissionStatus || "running",
            executionId: "exec-scenario-001"
        });
    }

    return result;
}

/**
 * Create a full submission flow scenario (form -> submission -> output).
 */
export function createSubmissionFlowScenario(): {
    formInterface: FormInterface;
    pendingSubmission: FormInterfaceSubmission;
    runningSubmission: FormInterfaceSubmission;
    completedSubmission: FormInterfaceSubmission;
} {
    const formInterface = createTestFormInterface({
        id: "fi-flow-001",
        name: "Submission Flow Test Form"
    });

    const pendingSubmission = createTestSubmission(formInterface.id, {
        id: "sub-pending-001",
        executionStatus: "pending"
    });

    const runningSubmission = createTestSubmission(formInterface.id, {
        id: "sub-running-001",
        executionId: "exec-001",
        executionStatus: "running"
    });

    const completedSubmission = createTestSubmission(formInterface.id, {
        id: "sub-completed-001",
        executionId: "exec-002",
        executionStatus: "completed",
        output: "This is the workflow output."
    });

    return {
        formInterface,
        pendingSubmission,
        runningSubmission,
        completedSubmission
    };
}

// ============================================================================
// SSE EVENT FIXTURES
// ============================================================================

/**
 * Create a workflow started event.
 */
export function createWorkflowStartedEvent(
    executionId: string,
    workflowName: string
): Record<string, unknown> {
    return {
        type: "execution:started",
        executionId,
        workflowName,
        timestamp: Date.now()
    };
}

/**
 * Create a workflow progress event.
 */
export function createWorkflowProgressEvent(
    executionId: string,
    completed: number,
    total: number
): Record<string, unknown> {
    return {
        type: "execution:progress",
        executionId,
        progress: { completed, total },
        timestamp: Date.now()
    };
}

/**
 * Create a node completed event.
 */
export function createNodeCompletedEvent(
    executionId: string,
    nodeId: string,
    output: unknown
): Record<string, unknown> {
    return {
        type: "node:completed",
        executionId,
        nodeId,
        output,
        timestamp: Date.now()
    };
}

/**
 * Create a workflow completed event.
 */
export function createWorkflowCompletedEvent(
    executionId: string,
    outputs: unknown
): Record<string, unknown> {
    return {
        type: "execution:completed",
        executionId,
        outputs,
        timestamp: Date.now()
    };
}

/**
 * Create a workflow failed event.
 */
export function createWorkflowFailedEvent(
    executionId: string,
    error: string
): Record<string, unknown> {
    return {
        type: "execution:failed",
        executionId,
        error,
        timestamp: Date.now()
    };
}

/**
 * Create an agent token event.
 */
export function createAgentTokenEvent(
    executionId: string,
    token: string
): Record<string, unknown> {
    return {
        type: "agent:execution:token",
        executionId,
        token,
        timestamp: Date.now()
    };
}

/**
 * Create an agent completed event.
 */
export function createAgentCompletedEvent(
    executionId: string,
    finalMessage: string
): Record<string, unknown> {
    return {
        type: "agent:execution:completed",
        executionId,
        finalMessage,
        timestamp: Date.now()
    };
}

/**
 * Create an agent failed event.
 */
export function createAgentFailedEvent(
    executionId: string,
    error: string
): Record<string, unknown> {
    return {
        type: "agent:execution:failed",
        executionId,
        error,
        timestamp: Date.now()
    };
}

// ============================================================================
// SAMPLE CONTENT FIXTURES
// ============================================================================

export const sampleContents = {
    pdf: `Company Policy Document
This document contains important company policies.

Section 1: Remote Work
Employees may work remotely up to 3 days per week.

Section 2: Expense Reports
All expenses must be submitted within 30 days.`,

    txt: `Meeting Notes - Project Alpha

Attendees: Alice, Bob, Charlie

Action Items:
1. Complete API integration by Friday
2. Review security requirements`,

    csv: `name,email,department
John Doe,john@example.com,Engineering
Jane Smith,jane@example.com,Marketing`,

    json: `{
  "project": "FlowMaestro",
  "version": "1.0.0",
  "features": ["forms", "workflows", "agents"]
}`
};

// ============================================================================
// TEST USER/WORKSPACE FIXTURES
// ============================================================================

export function createTestUser(overrides: Partial<{ id: string; email: string }> = {}): {
    id: string;
    email: string;
} {
    return {
        id: overrides.id || DEFAULT_USER_ID,
        email: overrides.email || `test-${Date.now()}@example.com`
    };
}

export function createTestWorkspace(
    overrides: Partial<{ id: string; name: string; ownerId: string }> = {}
): { id: string; name: string; ownerId: string } {
    return {
        id: overrides.id || DEFAULT_WORKSPACE_ID,
        name: overrides.name || "Test Workspace",
        ownerId: overrides.ownerId || DEFAULT_USER_ID
    };
}
