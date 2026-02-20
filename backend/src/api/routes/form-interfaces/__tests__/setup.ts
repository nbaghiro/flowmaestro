/**
 * Shared test setup for Form Interface route tests
 */

import { v4 as uuidv4 } from "uuid";
import { DEFAULT_TEST_WORKSPACE_ID } from "../../../../../__tests__/helpers/fastify-test-client";

// Re-export test helpers
export {
    authenticatedRequest,
    unauthenticatedRequest,
    createTestServer,
    closeTestServer,
    createTestUser,
    expectStatus,
    expectSuccessResponse,
    expectErrorResponse,
    DEFAULT_TEST_WORKSPACE_ID
} from "../../../../../__tests__/helpers/fastify-test-client";

// ============================================================================
// MOCK DATA TYPES
// ============================================================================

export interface MockFormInterface {
    id: string;
    userId: string;
    workspaceId: string;
    name: string;
    slug: string;
    title: string;
    description: string | null;
    targetType: "workflow" | "agent";
    workflowId: string | null;
    agentId: string | null;
    triggerId: string | null;
    status: "draft" | "published";
    coverType: "gradient" | "image" | "color";
    coverValue: string;
    iconUrl: string | null;
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
    folderId: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

export function createMockFormInterface(
    overrides: Partial<MockFormInterface> = {}
): MockFormInterface {
    return {
        id: overrides.id || uuidv4(),
        userId: overrides.userId || uuidv4(),
        workspaceId: overrides.workspaceId || DEFAULT_TEST_WORKSPACE_ID,
        name: overrides.name || "Test Form Interface",
        slug: overrides.slug || `test-form-${Date.now()}`,
        title: overrides.title || "Test Form",
        description: overrides.description ?? "A test form interface",
        targetType: overrides.targetType || "workflow",
        workflowId: "workflowId" in overrides ? (overrides.workflowId ?? null) : uuidv4(),
        agentId: "agentId" in overrides ? (overrides.agentId ?? null) : null,
        triggerId: overrides.triggerId ?? null,
        status: overrides.status || "draft",
        coverType: overrides.coverType || "gradient",
        coverValue: overrides.coverValue || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        iconUrl: overrides.iconUrl ?? null,
        inputPlaceholder: overrides.inputPlaceholder || "Enter your message...",
        inputLabel: overrides.inputLabel || "Message",
        fileUploadLabel: overrides.fileUploadLabel || "Upload files",
        urlInputLabel: overrides.urlInputLabel || "Add URLs",
        allowFileUpload: overrides.allowFileUpload ?? false,
        allowUrlInput: overrides.allowUrlInput ?? false,
        maxFiles: overrides.maxFiles ?? 5,
        maxFileSizeMb: overrides.maxFileSizeMb ?? 10,
        allowedFileTypes: overrides.allowedFileTypes || ["application/pdf"],
        submitButtonText: overrides.submitButtonText || "Submit",
        submitLoadingText: overrides.submitLoadingText || "Processing...",
        outputLabel: overrides.outputLabel || "Result",
        showCopyButton: overrides.showCopyButton ?? true,
        showDownloadButton: overrides.showDownloadButton ?? false,
        allowOutputEdit: overrides.allowOutputEdit ?? false,
        folderId: overrides.folderId ?? null,
        publishedAt: overrides.publishedAt ?? null,
        createdAt: overrides.createdAt || new Date(),
        updatedAt: overrides.updatedAt || new Date(),
        deletedAt: overrides.deletedAt ?? null
    };
}

export function createMockSubmission(
    overrides: Partial<{
        id: string;
        interfaceId: string;
        message: string;
        executionStatus: string;
        executionId: string | null;
        output: string | null;
        files: Array<{ name: string; size: number; type: string; url: string }>;
        createdAt: Date;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        interfaceId: overrides.interfaceId || uuidv4(),
        message: overrides.message || "Test submission",
        executionStatus: overrides.executionStatus || "completed",
        executionId: overrides.executionId ?? uuidv4(),
        output: overrides.output ?? "Test output",
        files: overrides.files || [],
        urls: [],
        attachmentsStatus: "ready",
        createdAt: overrides.createdAt || new Date(),
        updatedAt: new Date()
    };
}
