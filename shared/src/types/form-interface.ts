export type InterfaceCoverType = "image" | "color" | "stock";
export type InterfaceTargetType = "workflow" | "agent";
export type InterfaceStatus = "draft" | "published";

export interface InterfaceFileAttachment {
    fileName: string;
    fileSize: number;
    mimeType: string;
    gcsUri: string;
    downloadUrl?: string;
}

export interface InterfaceUrlAttachment {
    url: string;
    title?: string;
}

export interface FormInterface {
    id: string;
    userId: string;

    name: string;
    slug: string;

    targetType: InterfaceTargetType;
    workflowId: string | null;
    agentId: string | null;

    coverType: InterfaceCoverType;
    coverValue: string;
    iconUrl: string | null;
    title: string;
    description: string | null;

    inputPlaceholder: string;
    inputLabel: string;
    allowFileUpload: boolean;
    allowUrlInput: boolean;
    maxFiles: number;
    maxFileSizeMb: number;
    allowedFileTypes: string[];

    outputLabel: string;
    showCopyButton: boolean;
    showDownloadButton: boolean;
    allowOutputEdit: boolean;

    submitButtonText: string;
    submitLoadingText: string;

    status: InterfaceStatus;
    publishedAt: Date | null;

    submissionCount: number;
    lastSubmissionAt: Date | null;

    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

export interface InterfaceSubmission {
    id: string;
    interfaceId: string;

    message: string | null;
    files: InterfaceFileAttachment[];
    urls: InterfaceUrlAttachment[];

    output: string | null;
    outputEditedAt: Date | null;

    ipAddress: string | null;
    userAgent: string | null;
    submittedAt: Date;
}

export interface CreateFormInterfaceInput {
    name: string;
    slug: string;
    title: string;

    targetType: InterfaceTargetType;
    workflowId?: string;
    agentId?: string;

    description?: string;
    coverType?: InterfaceCoverType;
    coverValue?: string;
}

export interface UpdateFormInterfaceInput {
    name?: string;
    slug?: string;
    title?: string;
    description?: string;
    coverType?: InterfaceCoverType;
    coverValue?: string;
    iconUrl?: string;

    inputPlaceholder?: string;
    inputLabel?: string;
    allowFileUpload?: boolean;
    allowUrlInput?: boolean;
    maxFiles?: number;
    maxFileSizeMb?: number;
    allowedFileTypes?: string[];

    outputLabel?: string;
    showCopyButton?: boolean;
    showDownloadButton?: boolean;
    allowOutputEdit?: boolean;

    submitButtonText?: string;
    submitLoadingText?: string;

    targetType?: InterfaceTargetType;
    workflowId?: string;
    agentId?: string;
}

export interface PublicFormInterface {
    id: string;
    slug: string;

    coverType: InterfaceCoverType;
    coverValue: string;
    iconUrl: string | null;
    title: string;
    description: string | null;

    inputPlaceholder: string;
    inputLabel: string;
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
