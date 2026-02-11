// Form Interface Types
// Public-facing forms linked to workflows or agents

// Cover photo types
export type FormInterfaceCoverType = "image" | "color" | "stock";

// Target type
export type FormInterfaceTargetType = "workflow" | "agent";

// Form interface status
export type FormInterfaceStatus = "draft" | "published";

// File attachment
export interface FormInterfaceFileAttachment {
    fileName: string;
    fileSize: number;
    mimeType: string;
    gcsUri: string;
    downloadUrl?: string; // Signed URL for download
}

// URL attachment
export interface FormInterfaceUrlAttachment {
    url: string;
    title?: string;
}

// Main form interface configuration
export interface FormInterface {
    id: string;
    userId: string;

    // Identity
    name: string;
    slug: string;

    // Target (REQUIRED)
    targetType: FormInterfaceTargetType;
    workflowId: string | null;
    agentId: string | null;

    // Trigger (auto-created for workflows on publish)
    triggerId: string | null;

    // Branding
    coverType: FormInterfaceCoverType;
    coverValue: string;
    iconUrl: string | null;
    title: string;
    description: string | null;

    // Input Config
    inputPlaceholder: string;
    inputLabel: string;
    fileUploadLabel: string;
    urlInputLabel: string;
    allowFileUpload: boolean;
    allowUrlInput: boolean;
    maxFiles: number;
    maxFileSizeMb: number;
    allowedFileTypes: string[];

    // Output Config
    outputLabel: string;
    showCopyButton: boolean;
    showDownloadButton: boolean;
    allowOutputEdit: boolean;

    // Submit Button
    submitButtonText: string;
    submitLoadingText: string;

    // State
    status: FormInterfaceStatus;
    publishedAt: Date | null;

    // Stats
    submissionCount: number;
    lastSubmissionAt: Date | null;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// Execution status types
export type FormSubmissionExecutionStatus = "pending" | "running" | "completed" | "failed";
export type FormSubmissionAttachmentsStatus = "pending" | "processing" | "ready" | "failed";

// Form interface submission
export interface FormInterfaceSubmission {
    id: string;
    interfaceId: string;

    // User Input
    message: string | null;
    files: FormInterfaceFileAttachment[];
    urls: FormInterfaceUrlAttachment[];

    // Output
    output: string | null;
    outputEditedAt: Date | null;

    // Execution tracking (Phase 2)
    executionId?: string;
    executionStatus: FormSubmissionExecutionStatus;
    attachmentsStatus: FormSubmissionAttachmentsStatus;

    // Metadata
    ipAddress: string | null;
    userAgent: string | null;
    submittedAt: Date;
    createdAt: Date;
}

// Create form interface input
export interface CreateFormInterfaceInput {
    name: string;
    slug: string;
    title: string;
    // Target is REQUIRED - must provide exactly one
    targetType: FormInterfaceTargetType;
    workflowId?: string; // Required if targetType = 'workflow'
    agentId?: string; // Required if targetType = 'agent'
    description?: string;
    coverType?: FormInterfaceCoverType;
    coverValue?: string;
}

// Update form interface input
export interface UpdateFormInterfaceInput {
    name?: string;
    slug?: string;
    title?: string;
    description?: string;
    coverType?: FormInterfaceCoverType;
    coverValue?: string;
    iconUrl?: string | null;
    inputPlaceholder?: string;
    inputLabel?: string;
    fileUploadLabel?: string;
    urlInputLabel?: string;
    allowFileUpload?: boolean;
    allowUrlInput?: boolean;
    maxFiles?: number;
    maxFileSizeMb?: number;
    allowedFileTypes?: string[];
    submitButtonText?: string;
    submitLoadingText?: string;
    outputLabel?: string;
    showCopyButton?: boolean;
    showDownloadButton?: boolean;
    allowOutputEdit?: boolean;
    // Target can be changed (rare, but allowed)
    targetType?: FormInterfaceTargetType;
    workflowId?: string | null;
    agentId?: string | null;
}

// Public form interface response (for rendering, excludes sensitive fields)
export interface PublicFormInterface {
    id: string;
    slug: string;
    coverType: FormInterfaceCoverType;
    coverValue: string;
    iconUrl: string | null;
    title: string;
    description: string | null;
    inputPlaceholder: string;
    inputLabel: string;
    fileUploadLabel: string;
    urlInputLabel: string;
    allowFileUpload: boolean;
    allowUrlInput: boolean;
    maxFiles: number;
    maxFileSizeMb: number;
    allowedFileTypes: string[];
    submitButtonText: string;
    submitLoadingText: string;
    outputLabel: string;
    showCopyButton: boolean;
    showDownloadButton: boolean;
    allowOutputEdit: boolean;
}

// Public form submission input (from external users)
export interface SubmitFormInterfaceInput {
    message: string;
    fileUrls?: string[]; // GCS URLs after upload
    urls?: string[];
}

// Submission result returned to public form
export interface FormInterfaceSubmissionResult {
    submissionId: string;
    message: string;
}

// Form interface with related entity names (for list display)
export interface FormInterfaceWithTarget extends FormInterface {
    workflowName?: string;
    agentName?: string;
}

// ============================================================================
// Phase 2: Execution Types
// ============================================================================

// Public form submit input (with full file metadata)
export interface PublicFormSubmitInput {
    message: string;
    files?: FormInterfaceFileAttachment[]; // Full metadata from upload
    urls?: FormInterfaceUrlAttachment[];
}

// Public form submit response
export interface PublicFormSubmitResponse {
    submissionId: string;
    executionId: string;
}

// Public file upload response (artifacts bucket is PRIVATE - uses signed URLs)
export interface PublicFileUploadResponse {
    gcsUri: string; // Internal reference: gs://bucket/path (stored in DB)
    downloadUrl: string; // Signed URL valid for 24h (for workflow access)
    fileName: string;
    fileSize: number;
    mimeType: string;
}

// Submission chunk for RAG
export interface FormInterfaceSubmissionChunk {
    id: string;
    submissionId: string;
    sourceType: "file" | "url";
    sourceName: string;
    sourceIndex: number;
    content: string;
    chunkIndex: number;
    metadata: Record<string, unknown>;
    createdAt: Date;
}

// Chunk search result
export interface FormSubmissionChunkSearchResult {
    id: string;
    content: string;
    sourceName: string;
    sourceType: "file" | "url";
    similarity: number;
    metadata: Record<string, unknown>;
}
