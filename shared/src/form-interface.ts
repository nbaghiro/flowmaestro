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
