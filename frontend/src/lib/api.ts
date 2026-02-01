/**
 * API Client for FlowMaestro Backend
 */

import type {
    JsonObject,
    JsonValue,
    WorkflowNode,
    WorkflowEdge,
    WorkflowTrigger,
    TriggerWithScheduleInfo,
    CreateTriggerInput,
    UpdateTriggerInput,
    Template,
    TemplateListParams,
    TemplateListResponse,
    CategoryInfo,
    CopyTemplateResponse,
    TemplateCategory,
    AgentTemplate,
    AgentTemplateListParams,
    AgentTemplateListResponse,
    CopyAgentTemplateResponse,
    FormInterface,
    FormInterfaceSubmission,
    CreateFormInterfaceInput,
    UpdateFormInterfaceInput,
    PublicFormInterface,
    ChatInterface,
    ChatInterfaceSession,
    CreateChatInterfaceInput,
    UpdateChatInterfaceInput,
    PublicChatInterface,
    ChatSessionResponse,
    CreateChatSessionInput,
    SendChatMessageInput,
    ChatMessageAttachment,
    PublicChatMessage,
    Folder,
    FolderWithCounts,
    FolderTreeNode,
    FolderContents,
    CreateFolderInput,
    UpdateFolderInput,
    MoveItemsToFolderInput,
    RemoveItemsFromFolderInput,
    MoveFolderInput,
    FolderResourceType,
    GenerationChatMessage,
    GenerationChatRequest,
    GenerationChatResponse,
    WorkflowPlan,
    Workspace,
    WorkspaceWithStats,
    WorkspaceMember,
    WorkspaceMemberWithUser,
    WorkspaceRole,
    GetWorkspacesResponse,
    CreateWorkspaceInput,
    UpdateWorkspaceInput,
    InviteMemberInput,
    CreditBalance,
    CreditTransaction,
    PersonaDefinition,
    PersonaDefinitionSummary,
    PersonaDefinitionListParams,
    PersonaDefinitionListResponse,
    PersonaCategory,
    PersonaInstance,
    PersonaInstanceSummary,
    PersonaInstanceListParams,
    PersonaInstanceListResponse,
    PersonaInstanceDashboardResponse,
    PersonaInstanceStatus,
    CreatePersonaInstanceRequest,
    PersonaInstanceMessage,
    PersonaInstanceDeliverable,
    PersonaInstanceDeliverableSummary,
    PersonaInputField,
    PersonaDeliverableSpec,
    PersonaEstimatedDuration,
    PersonaStructuredInputs,
    InputFieldType,
    InputFieldOption,
    DeliverableType,
    PersonaInstanceProgress,
    PersonaProgressStep,
    ProgressStepStatus,
    PersonaTaskTemplate,
    PersonaTaskTemplateSummary,
    PersonaTaskTemplateListResponse,
    GenerateFromTemplateResponse,
    PersonaConnectionRequirement,
    PersonaInstanceConnection
} from "@flowmaestro/shared";
import { getCurrentWorkspaceId } from "../stores/workspaceStore";
import { logger } from "./logger";

// Re-export types for use in components
export type { JsonObject };

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Enhanced fetch wrapper that captures correlation IDs for logging
 */
async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
    // Add session ID header for request correlation
    const sessionId = logger.getSessionId();
    const headers = new Headers(options?.headers);
    if (!headers.has("X-Session-ID")) {
        headers.set("X-Session-ID", sessionId);
    }

    // Add workspace ID header for workspace context
    const workspaceId = getCurrentWorkspaceId();
    if (workspaceId && !headers.has("X-Workspace-Id")) {
        headers.set("X-Workspace-Id", workspaceId);
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    // Capture correlation IDs from response
    logger.captureCorrelationId(response);

    return response;
}

// ===== Knowledge Base Types =====

export interface KnowledgeBase {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    config: {
        embeddingModel: string;
        embeddingProvider: string;
        chunkSize: number;
        chunkOverlap: number;
        embeddingDimensions: number;
    };
    created_at: string;
    updated_at: string;
}

export interface KnowledgeDocument {
    id: string;
    knowledge_base_id: string;
    name: string;
    source_type: "file" | "url";
    source_url: string | null;
    file_path: string | null;
    file_type: string;
    file_size: bigint | null;
    content: string | null;
    metadata: Record<string, unknown>;
    status: "pending" | "processing" | "ready" | "failed";
    error_message: string | null;
    processing_started_at: string | null;
    processing_completed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface KnowledgeBaseStats {
    id: string;
    name: string;
    document_count: number;
    chunk_count: number;
    total_size_bytes: number;
    last_updated: string;
}

export interface ChunkSearchResult {
    id: string;
    document_id: string;
    document_name: string;
    chunk_index: number;
    content: string;
    metadata: Record<string, unknown>;
    similarity: number;
}

export interface CreateKnowledgeBaseInput {
    name: string;
    description?: string;
    config?: Partial<KnowledgeBase["config"]>;
}

export interface UpdateKnowledgeBaseInput {
    name?: string;
    description?: string;
    config?: Partial<KnowledgeBase["config"]>;
}

export interface QueryKnowledgeBaseInput {
    query: string;
    top_k?: number;
    similarity_threshold?: number;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

interface ExecuteWorkflowRequest {
    workflowDefinition: {
        nodes: WorkflowNode[];
        edges: WorkflowEdge[];
    };
    inputs?: JsonObject;
}

interface ExecuteWorkflowResponse {
    success: boolean;
    data?: {
        workflowId: string;
        result: {
            success: boolean;
            outputs: JsonObject;
            error?: string;
        };
    };
    error?: string;
}

interface AuthResponse {
    success: boolean;
    data?: {
        user: ApiUser;
        token: string;
    };
    error?: string;
}

interface LoginRequest {
    email: string;
    password: string;
    code?: string;
}

interface RegisterRequest {
    email: string;
    password: string;
    name?: string;
}

interface UserResponse {
    success: boolean;
    data?: {
        user: ApiUser;
    };
    error?: string;
}

export interface LoginTwoFactorResponse {
    success: boolean;
    data?: {
        two_factor_required: true;
        masked_phone?: string;
    };
    error?: string;
}

export type LoginApiResponse = AuthResponse | LoginTwoFactorResponse;

export interface ApiUser {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
    google_id?: string | null;
    microsoft_id?: string | null;
    has_password?: boolean;
    email_verified?: boolean;
    two_factor_enabled?: boolean;
    two_factor_phone?: string | null;
    two_factor_phone_verified?: boolean;
}

/**
 * Get auth token from localStorage
 */
export function getAuthToken(): string | null {
    return localStorage.getItem("auth_token");
}

/**
 * Execute a workflow
 */
export async function executeWorkflow(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    inputs: JsonObject = {}
): Promise<ExecuteWorkflowResponse> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/workflows/execute`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
            workflowDefinition: { nodes, edges },
            inputs
        } as ExecuteWorkflowRequest)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Save auth token to localStorage
 */
export function setAuthToken(token: string): void {
    localStorage.setItem("auth_token", token);
}

/**
 * Remove auth token from localStorage
 */
export function clearAuthToken(): void {
    localStorage.removeItem("auth_token");
}

/**
 * Login with email and password (and optional 2FA code)
 */
export async function login(
    email: string,
    password: string,
    code?: string
): Promise<LoginApiResponse> {
    const response = await apiFetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password, code } as LoginRequest)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Register a new user
 */
export async function register(
    email: string,
    password: string,
    name?: string
): Promise<AuthResponse> {
    const response = await apiFetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password, name } as RegisterRequest)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Request password reset email
 */
export async function forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiFetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Reset password with token
 */
export async function resetPassword(
    token: string,
    password: string
): Promise<ApiResponse<{ message: string }>> {
    const response = await apiFetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ token, password })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiFetch(`${API_BASE_URL}/auth/verify-email`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ token })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Resend email verification
 */
export async function resendVerificationEmail(): Promise<ApiResponse<{ message: string }>> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("No authentication token found");
    }

    const response = await apiFetch(`${API_BASE_URL}/auth/resend-verification`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get current user info (validates token)
 */
export async function getCurrentUser(): Promise<UserResponse> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("No authentication token found");
    }

    const response = await apiFetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== Profile & Account API Functions =====

/**
 * Update user's display name
 */
export async function updateUserName(name: string): Promise<ApiResponse> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("No authentication token found");
    }

    const response = await apiFetch(`${API_BASE_URL}/auth/me/name`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Update user's email address
 */
export async function updateUserEmail(email: string): Promise<ApiResponse> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("No authentication token found");
    }

    const response = await apiFetch(`${API_BASE_URL}/auth/me/email`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Set password for OAuth-only users
 */
export async function setUserPassword(password: string): Promise<ApiResponse> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("No authentication token found");
    }

    const response = await apiFetch(`${API_BASE_URL}/auth/me/set-password`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Change user's password
 */
export async function changeUserPassword(
    currentPassword: string,
    newPassword: string
): Promise<ApiResponse> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("No authentication token found");
    }

    const response = await apiFetch(`${API_BASE_URL}/auth/me/password`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== Two-Factor Authentication API Functions =====

/**
 * Send 2FA verification code to phone
 */
export async function sendTwoFactorCode(phone: string): Promise<ApiResponse> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("No authentication token found");
    }

    const response = await apiFetch(`${API_BASE_URL}/auth/2fa/send-code`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ phone })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Verify 2FA code and enable two-factor authentication
 */
export async function verifyTwoFactorCode(code: string, phone: string): Promise<ApiResponse> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("No authentication token found");
    }

    const response = await apiFetch(`${API_BASE_URL}/auth/2fa/verify/code`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code, phone })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Disable two-factor authentication
 */
export async function disableTwoFactor(): Promise<ApiResponse> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("No authentication token found");
    }

    const response = await apiFetch(`${API_BASE_URL}/auth/2fa/disable`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== OAuth Account Linking API Functions =====

/**
 * Get Google OAuth URL for account linking
 */
export function getGoogleAuthUrl(): string {
    return `${API_BASE_URL}/auth/google`;
}

/**
 * Get Microsoft OAuth URL for account linking
 */
export function getMicrosoftAuthUrl(): string {
    return `${API_BASE_URL}/auth/microsoft`;
}

/**
 * Unlink Google account from user
 */
export async function unlinkGoogleAccount(): Promise<ApiResponse> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("No authentication token found");
    }

    const response = await apiFetch(`${API_BASE_URL}/auth/google/unlink`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Unlink Microsoft account from user
 */
export async function unlinkMicrosoftAccount(): Promise<ApiResponse> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("No authentication token found");
    }

    const response = await apiFetch(`${API_BASE_URL}/auth/microsoft/unlink`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get list of workflows for current user
 */
export async function getWorkflows(params?: {
    limit?: number;
    offset?: number;
    folderId?: string | null;
}) {
    const token = getAuthToken();
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;

    const queryParams = new URLSearchParams();
    queryParams.set("limit", limit.toString());
    queryParams.set("offset", offset.toString());

    // folderId: null means root level (no folder), undefined means all
    if (params?.folderId === null) {
        queryParams.set("folderId", "null");
    } else if (params?.folderId !== undefined) {
        queryParams.set("folderId", params.folderId);
    }

    const response = await apiFetch(`${API_BASE_URL}/workflows?${queryParams.toString()}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a specific workflow by ID
 */
export async function getWorkflow(workflowId: string) {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/workflows/${workflowId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

export interface WorkflowDefinition {
    name?: string;
    description?: string;
    nodes: Record<string, WorkflowNode>;
    edges: WorkflowEdge[];
    entryPoint: string;
}

/**
 * Create a new workflow
 */
/**
 * Creates a default workflow structure with Input -> LLM -> Output nodes
 */
function createDefaultWorkflowDefinition(name: string): WorkflowDefinition {
    const inputNodeId = "node-input-1";
    const llmNodeId = "node-llm-1";
    const outputNodeId = "node-output-1";

    return {
        name,
        nodes: {
            [inputNodeId]: {
                type: "input",
                name: "Input",
                config: {
                    inputName: "userInput",
                    inputVariable: "userInput",
                    inputType: "text",
                    required: true,
                    description: "",
                    defaultValue: "",
                    validation: ""
                },
                position: { x: 100, y: 100 }
            },
            [llmNodeId]: {
                type: "llm",
                name: "LLM",
                config: {
                    provider: "openai",
                    model: "gpt-4o",
                    prompt: "{{userInput}}",
                    systemPrompt: "",
                    temperature: 0.7,
                    maxTokens: 1000,
                    topP: 1,
                    outputVariable: "llmResponse"
                },
                position: { x: 400, y: 220 }
            },
            [outputNodeId]: {
                type: "output",
                name: "Output",
                config: {
                    outputName: "result",
                    value: "{{llmResponse.text}}",
                    format: "string",
                    description: ""
                },
                position: { x: 700, y: 340 }
            }
        },
        edges: [
            {
                id: "edge-1",
                source: inputNodeId,
                target: llmNodeId
            },
            {
                id: "edge-2",
                source: llmNodeId,
                target: outputNodeId
            }
        ],
        entryPoint: inputNodeId
    };
}

export async function createWorkflow(
    name: string,
    description?: string,
    definition?: WorkflowDefinition
) {
    const token = getAuthToken();

    const workflowDefinition: WorkflowDefinition =
        definition || createDefaultWorkflowDefinition(name);

    const requestBody = {
        name,
        description,
        definition: workflowDefinition
    };

    const response = await apiFetch(`${API_BASE_URL}/workflows`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Update an existing workflow
 */
export async function updateWorkflow(
    workflowId: string,
    updates: {
        name?: string;
        description?: string;
        definition?: {
            name: string;
            nodes: Record<string, WorkflowNode>;
            edges: WorkflowEdge[];
            entryPoint: string;
        };
    }
) {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/workflows/${workflowId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(updates)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(workflowId: string) {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/workflows/${workflowId}`, {
        method: "DELETE",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    // 204 No Content means successful deletion
    return { success: true };
}

// ===== Workflow Files API Functions =====

/**
 * Uploaded file info returned from the upload endpoint
 */
export interface WorkflowFileUpload {
    fileName: string;
    fileType: string;
    gcsUri: string;
    fileSize: number;
}

/**
 * Upload files for workflow execution.
 * Returns GCS URIs that can be passed as workflow inputs to Files nodes.
 */
export async function uploadWorkflowFiles(files: File[]): Promise<{
    success: boolean;
    data?: { files: WorkflowFileUpload[]; uploadBatchId: string };
    error?: string;
}> {
    const token = getAuthToken();
    const formData = new FormData();

    for (const file of files) {
        formData.append("files", file);
    }

    const response = await apiFetch(`${API_BASE_URL}/workflows/files/upload`, {
        method: "POST",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
            // Note: Don't set Content-Type for FormData - browser sets it with boundary
        },
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
            success: false,
            error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
        };
    }

    return response.json();
}

// ===== Trigger API Functions =====

/**
 * Create a new trigger for a workflow
 */
export async function createTrigger(
    input: CreateTriggerInput
): Promise<{ success: boolean; data: WorkflowTrigger; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/triggers`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get list of triggers for a workflow
 */
export async function getTriggers(
    workflowId: string
): Promise<{ success: boolean; data: WorkflowTrigger[]; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/triggers?workflowId=${workflowId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a specific trigger by ID
 */
export async function getTrigger(
    triggerId: string
): Promise<{ success: boolean; data: TriggerWithScheduleInfo; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/triggers/${triggerId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Update a trigger
 */
export async function updateTrigger(
    triggerId: string,
    input: UpdateTriggerInput
): Promise<{ success: boolean; data: WorkflowTrigger; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/triggers/${triggerId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Delete a trigger
 */
export async function deleteTrigger(
    triggerId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/triggers/${triggerId}`, {
        method: "DELETE",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Execute a trigger
 */
export async function executeTrigger(
    triggerId: string,
    inputs?: JsonObject
): Promise<{
    success: boolean;
    data?: {
        executionId: string;
        workflowId: string;
        triggerId: string;
        status: string;
        inputs: JsonObject;
    };
    error?: string;
}> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/triggers/${triggerId}/execute`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ inputs })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get webhook URL for a trigger
 */
export function getWebhookUrl(triggerId: string): string {
    return `${API_BASE_URL}/webhooks/${triggerId}`;
}

/**
 * Get webhook URL for a provider-based trigger
 */
export function getProviderWebhookUrl(providerId: string, triggerId: string): string {
    return `${API_BASE_URL}/webhooks/provider/${providerId}/${triggerId}`;
}

// ===== Trigger Provider API Functions =====

export interface TriggerProviderSummary {
    providerId: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    eventCount: number;
    requiresConnection: boolean;
    webhookSetupType: "automatic" | "manual" | "polling";
}

export interface ListTriggerProvidersResponse {
    success: boolean;
    data: {
        providers: TriggerProviderSummary[];
    };
    error?: string;
}

/**
 * Get list of trigger providers
 */
export async function getTriggerProviders(
    category?: string
): Promise<ListTriggerProvidersResponse> {
    let url = `${API_BASE_URL}/triggers/providers`;
    if (category) {
        url += `?category=${encodeURIComponent(category)}`;
    }

    const response = await apiFetch(url, {
        method: "GET"
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

export interface TriggerConfigField {
    name: string;
    label: string;
    type: "text" | "select" | "multiselect" | "boolean" | "number" | "json";
    required: boolean;
    description?: string;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
    defaultValue?: string | boolean | number;
    dynamicOptions?: {
        operation: string;
        labelField: string;
        valueField: string;
    };
}

export interface TriggerEvent {
    id: string;
    name: string;
    description: string;
    payloadSchema?: JsonObject;
    requiredScopes?: string[];
    configFields?: TriggerConfigField[];
    tags?: string[];
}

export interface WebhookConfig {
    setupType: "automatic" | "manual" | "polling";
    signatureType: "hmac-sha256" | "hmac-sha1" | "ed25519" | "timestamp" | "custom" | "none";
    signatureHeader?: string;
    eventHeader?: string;
    timestampHeader?: string;
}

export interface TriggerProvider {
    providerId: string;
    name: string;
    description?: string;
    icon?: string;
    category: string;
    triggers: TriggerEvent[];
    webhookConfig: WebhookConfig;
    requiresConnection: boolean;
    enabled: boolean;
}

export interface GetTriggerProviderResponse {
    success: boolean;
    data: {
        provider: TriggerProvider;
    };
    error?: string;
}

/**
 * Get trigger provider details with events
 */
export async function getTriggerProvider(providerId: string): Promise<GetTriggerProviderResponse> {
    const response = await apiFetch(`${API_BASE_URL}/triggers/providers/${providerId}`, {
        method: "GET"
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

export interface GetTriggerEventsResponse {
    success: boolean;
    data: {
        providerId: string;
        events: TriggerEvent[];
    };
    error?: string;
}

/**
 * Get trigger events for a provider
 */
export async function getTriggerEvents(providerId: string): Promise<GetTriggerEventsResponse> {
    const response = await apiFetch(`${API_BASE_URL}/triggers/providers/${providerId}/events`, {
        method: "GET"
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== Execution API Functions =====

export interface ExecutionPauseContext {
    reason: string;
    nodeId: string;
    nodeName?: string;
    pausedAt: number;
    resumeTrigger?: "manual" | "timeout" | "webhook" | "signal";
    timeoutMs?: number;
    prompt?: string;
    description?: string;
    variableName: string;
    inputType: "text" | "number" | "boolean" | "json";
    placeholder?: string;
    validation?: JsonObject;
    required?: boolean;
}

export interface Execution {
    id: string;
    workflow_id: string;
    status: "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";
    inputs: JsonObject | null;
    outputs: JsonObject | null;
    current_state: JsonValue | null;
    pause_context: ExecutionPauseContext | null;
    error: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
}

export interface ListExecutionsResponse {
    success: boolean;
    data: {
        items: Execution[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
    };
    error?: string;
}

/**
 * Get list of executions for a workflow
 */
export async function getExecutions(
    workflowId?: string,
    params?: {
        status?: "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";
        limit?: number;
        offset?: number;
    }
): Promise<ListExecutionsResponse> {
    const token = getAuthToken();

    const queryParams = new URLSearchParams();
    if (workflowId) queryParams.append("workflowId", workflowId);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.offset) queryParams.append("offset", params.offset.toString());

    const response = await apiFetch(
        `${API_BASE_URL}/executions${queryParams.toString() ? `?${queryParams.toString()}` : ""}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` })
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a specific execution by ID
 */
export async function getExecution(
    executionId: string
): Promise<{ success: boolean; data: Execution; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/executions/${executionId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Submit user response to a paused workflow execution (Human Review node)
 */
export async function submitUserResponse(
    executionId: string,
    response: string | number | boolean | Record<string, unknown>
): Promise<{ success: boolean; data?: Execution; message?: string; error?: string }> {
    const token = getAuthToken();

    const fetchResponse = await apiFetch(
        `${API_BASE_URL}/executions/${executionId}/submit-response`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` })
            },
            body: JSON.stringify({ response })
        }
    );

    if (!fetchResponse.ok) {
        const errorData = await fetchResponse.json().catch(() => ({}));
        throw new Error(
            errorData.error || `HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`
        );
    }

    return fetchResponse.json();
}

// ===== Connection API Functions =====

export type ConnectionMethod = "api_key" | "oauth2" | "basic_auth" | "custom";
export type ConnectionStatus = "active" | "invalid" | "expired" | "revoked";

export interface Connection {
    id: string;
    name: string;
    connection_method: ConnectionMethod;
    provider: string;
    status: ConnectionStatus;
    metadata?: {
        scopes?: string[];
        expires_at?: number;
        account_info?: {
            email?: string;
            username?: string;
            workspace?: string;
        };
        /** When true, operations return mock/test data instead of real API calls */
        isTestConnection?: boolean;
    };
    capabilities: JsonObject;
    last_used_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateConnectionInput {
    name: string;
    connection_method: ConnectionMethod;
    provider: string;
    data: JsonObject & {
        api_key?: string;
        api_secret?: string;
        bearer_token?: string;
        username?: string;
        password?: string;
    };
    metadata?: JsonObject;
    capabilities?: JsonObject;
}

/**
 * Create a new connection
 */
export async function createConnection(
    input: CreateConnectionInput
): Promise<{ success: boolean; data: Connection; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/connections`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get list of connections
 */
export async function getConnections(params?: {
    provider?: string;
    connection_method?: ConnectionMethod;
    status?: ConnectionStatus;
}): Promise<{
    success: boolean;
    data: Connection[];
    pagination: { total: number; limit: number; offset: number };
    error?: string;
}> {
    const token = getAuthToken();

    const queryParams = new URLSearchParams();
    if (params?.provider) queryParams.append("provider", params.provider);
    if (params?.connection_method)
        queryParams.append("connection_method", params.connection_method);
    if (params?.status) queryParams.append("status", params.status);

    const response = await apiFetch(
        `${API_BASE_URL}/connections${queryParams.toString() ? `?${queryParams.toString()}` : ""}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` })
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a specific connection by ID
 */
export async function getConnection(
    connectionId: string
): Promise<{ success: boolean; data: Connection; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/connections/${connectionId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Update a connection
 */
export async function updateConnection(
    connectionId: string,
    input: Partial<CreateConnectionInput>
): Promise<{ success: boolean; data: Connection; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/connections/${connectionId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Delete a connection
 */
export async function deleteConnection(
    connectionId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/connections/${connectionId}`, {
        method: "DELETE",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get MCP tools available from a connection's provider
 */
export async function getConnectionMCPTools(connectionId: string): Promise<{
    success: boolean;
    data: ConnectionMCPToolsResponse;
    error?: string;
}> {
    const token = getAuthToken();
    const workspaceId = getCurrentWorkspaceId();

    if (!workspaceId) {
        throw new Error("Workspace context required");
    }

    const response = await apiFetch(`${API_BASE_URL}/connections/${connectionId}/mcp-tools`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
            "X-Workspace-Id": workspaceId
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get all available builtin tools
 */
export async function getBuiltinTools(category?: BuiltinToolCategory): Promise<{
    success: boolean;
    data: BuiltinTool[];
    error?: string;
}> {
    const token = getAuthToken();
    const workspaceId = getCurrentWorkspaceId();

    if (!workspaceId) {
        throw new Error("Workspace context required");
    }

    const params = new URLSearchParams();
    if (category) {
        params.set("category", category);
    }

    const url = `${API_BASE_URL}/tools/builtin${params.toString() ? `?${params.toString()}` : ""}`;

    const response = await apiFetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
            "X-Workspace-Id": workspaceId
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== AI Workflow Generation =====

export interface GenerateWorkflowRequest {
    prompt: string;
    connectionId: string;
    model: string;
}

export interface GeneratedWorkflow {
    nodes: Array<{
        id: string;
        type: string;
        label: string;
        config: JsonObject;
        status?: string;
        onError?: {
            strategy: "continue" | "fallback" | "goto" | "fail";
            fallbackValue?: JsonValue;
            gotoNode?: string;
        };
    }>;
    edges: Array<{
        source: string;
        target: string;
        sourceHandle: string;
        targetHandle: string;
    }>;
    metadata: {
        name: string;
        entryNodeId: string;
        description: string;
    };
}

/**
 * Generate workflow from natural language prompt using AI
 */
export async function generateWorkflow(
    request: GenerateWorkflowRequest
): Promise<{ success: boolean; data: GeneratedWorkflow; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/workflows/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(request)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            errorData.error?.message ||
                errorData.error ||
                `HTTP ${response.status}: ${response.statusText}`
        );
    }

    return response.json();
}

/**
 * Chat message for conversation history
 */
export interface ChatMessage {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: Date;
    proposedChanges?: Array<{
        type: "add" | "modify" | "remove";
        nodeId?: string;
        nodeType?: string;
        nodeLabel?: string;
        config?: JsonObject;
        position?: { x: number; y: number };
        connectTo?: string;
        updates?: JsonObject;
    }>;
}

/**
 * Chat with AI about workflow
 */
export interface ChatWorkflowRequest {
    workflowId?: string;
    action: "add" | "modify" | "remove" | null;
    message: string;
    context: {
        nodes: unknown[];
        edges: unknown[];
        selectedNodeId?: string | null;
        executionHistory?: unknown[];
    };
    conversationHistory?: ChatMessage[];
    connectionId: string;
    model?: string;
    enableThinking?: boolean;
    thinkingBudget?: number;
}

export interface ChatWorkflowResponse {
    response: string;
    changes?: Array<{
        type: "add" | "modify" | "remove";
        nodeId?: string;
        nodeType?: string;
        nodeLabel?: string;
        config?: JsonObject;
        position?: { x: number; y: number };
        connectTo?: string;
        updates?: JsonObject;
    }>;
    thinking?: string;
}

export async function chatWorkflow(
    request: ChatWorkflowRequest
): Promise<{ success: boolean; data: { executionId: string }; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/workflows/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(request)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            errorData.error?.message ||
                errorData.error ||
                `HTTP ${response.status}: ${response.statusText}`
        );
    }

    return response.json();
}

// ===== Agent API Functions =====

export interface Tool {
    id: string;
    name: string;
    description: string;
    type: "workflow" | "function" | "knowledge_base" | "mcp" | "builtin";
    schema: JsonObject;
    config: ToolConfig;
}

export interface ToolConfig {
    workflowId?: string;
    functionName?: string;
    knowledgeBaseId?: string;
    connectionId?: string; // For MCP tools - references the connection
    provider?: string; // For MCP tools - provider name for display
    category?: string; // For builtin tools - tool category
    creditCost?: number; // For builtin tools - credit cost per use
}

/**
 * MCP Tool from a provider
 */
export interface MCPTool {
    name: string;
    description: string;
    inputSchema: JsonObject;
    executeRef?: string;
}

/**
 * Response from GET /connections/:id/mcp-tools
 */
export interface ConnectionMCPToolsResponse {
    connectionId: string;
    provider: string;
    connectionName: string;
    tools: MCPTool[];
}

/**
 * Builtin tool category
 */
export type BuiltinToolCategory = "web" | "code" | "file" | "data" | "media" | "integration";

/**
 * Builtin tool risk level
 */
export type BuiltinToolRiskLevel = "none" | "low" | "medium" | "high";

/**
 * Builtin tool from the system
 */
export interface BuiltinTool {
    name: string;
    displayName: string;
    description: string;
    category: BuiltinToolCategory;
    riskLevel: BuiltinToolRiskLevel;
    inputSchema: JsonObject;
    enabledByDefault: boolean;
    creditCost: number;
    tags?: string[];
}

export interface MemoryConfig {
    type: "buffer" | "summary" | "vector";
    max_messages: number;
}

export interface Agent {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    model: string;
    provider: "openai" | "anthropic" | "google" | "xai" | "cohere" | "huggingface";
    connection_id: string | null;
    system_prompt: string;
    temperature: number;
    max_tokens: number;
    max_iterations: number;
    available_tools: Tool[];
    memory_config: MemoryConfig;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface CreateAgentRequest {
    name: string;
    description?: string;
    model: string;
    provider: "openai" | "anthropic" | "google" | "xai" | "cohere" | "huggingface";
    connection_id?: string | null;
    system_prompt?: string;
    temperature?: number;
    max_tokens?: number;
    max_iterations?: number;
    available_tools?: Tool[];
    memory_config?: MemoryConfig;
}

export interface UpdateAgentRequest {
    name?: string;
    description?: string;
    model?: string;
    provider?: "openai" | "anthropic" | "google" | "xai" | "cohere" | "huggingface";
    connection_id?: string | null;
    system_prompt?: string;
    temperature?: number;
    max_tokens?: number;
    max_iterations?: number;
    available_tools?: Tool[];
    memory_config?: MemoryConfig;
}

// Thread types
export interface ThreadTokenUsage extends JsonObject {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    totalCost: number;
    lastUpdatedAt: string;
    executionCount: number;
}

export interface ThreadMetadata {
    tokenUsage?: ThreadTokenUsage;
    [key: string]: JsonValue | ThreadTokenUsage | undefined;
}

export interface Thread {
    id: string;
    user_id: string;
    agent_id: string;
    title: string | null;
    status: "active" | "archived" | "deleted";
    metadata: ThreadMetadata;
    created_at: string;
    updated_at: string;
    last_message_at: string | null;
    archived_at: string | null;
    deleted_at: string | null;
}

export interface ThreadWithStats extends Thread {
    stats: {
        message_count: number;
        execution_count: number;
        first_message_at: string | null;
        last_message_at: string | null;
    };
}

export interface CreateThreadRequest {
    agent_id: string;
    title?: string;
    status?: "active" | "archived";
    metadata?: JsonObject;
}

export interface UpdateThreadRequest {
    title?: string;
    status?: "active" | "archived";
    metadata?: JsonObject;
}

export interface AgentExecution {
    id: string;
    agent_id: string;
    user_id: string;
    thread_id: string; // Thread this execution belongs to
    status: "running" | "completed" | "failed";
    thread_history: ThreadMessage[];
    iterations: number;
    error: string | null;
    started_at: string;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface ThreadMessage {
    id: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    tool_calls?: Array<{
        id: string;
        name: string;
        arguments: JsonObject;
    }>;
    tool_name?: string;
    tool_call_id?: string;
    timestamp: string;
}

/**
 * Create a new agent
 */
export async function createAgent(
    data: CreateAgentRequest
): Promise<{ success: boolean; data: Agent; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/agents`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get all agents for the current user
 */
export async function getAgents(params?: {
    limit?: number;
    offset?: number;
    folderId?: string | null;
}): Promise<{
    success: boolean;
    data: { agents: Agent[]; total: number };
    error?: string;
}> {
    const token = getAuthToken();

    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.offset) queryParams.set("offset", params.offset.toString());

    // folderId: null means root level (no folder), undefined means all
    if (params?.folderId === null) {
        queryParams.set("folderId", "null");
    } else if (params?.folderId !== undefined) {
        queryParams.set("folderId", params.folderId);
    }

    const url = queryParams.toString()
        ? `${API_BASE_URL}/agents?${queryParams.toString()}`
        : `${API_BASE_URL}/agents`;

    const response = await apiFetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a specific agent by ID
 */
export async function getAgent(
    agentId: string
): Promise<{ success: boolean; data: Agent; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/agents/${agentId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Update an agent
 */
export async function updateAgent(
    agentId: string,
    data: UpdateAgentRequest
): Promise<{ success: boolean; data: Agent; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/agents/${agentId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Delete an agent
 */
export async function deleteAgent(
    agentId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/agents/${agentId}`, {
        method: "DELETE",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Execute an agent with an initial message
 * Optionally continue an existing thread
 * Optionally override agent's default connection and model
 */
export async function executeAgent(
    agentId: string,
    message: string,
    threadId?: string,
    connectionId?: string,
    model?: string
): Promise<{
    success: boolean;
    data: { executionId: string; threadId: string; agentId: string; status: string };
    error?: string;
}> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/agents/${agentId}/execute`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
            message,
            ...(threadId && { thread_id: threadId }),
            ...(connectionId && { connection_id: connectionId }),
            ...(model && { model })
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Send a message to a running agent execution
 */
export async function sendAgentMessage(
    agentId: string,
    executionId: string,
    message: string
): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(
        `${API_BASE_URL}/agents/${agentId}/executions/${executionId}/message`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` })
            },
            body: JSON.stringify({ message })
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get agent execution details
 */
export async function getAgentExecution(
    agentId: string,
    executionId: string
): Promise<{ success: boolean; data: AgentExecution; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/agents/${agentId}/executions/${executionId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Add a tool to an agent
 */
export interface AddToolRequest {
    type: "workflow" | "function" | "knowledge_base" | "mcp" | "builtin";
    name: string;
    description: string;
    schema: JsonObject;
    config: ToolConfig;
}

export async function addAgentTool(
    agentId: string,
    data: AddToolRequest
): Promise<{ success: boolean; data: { tool: Tool; agent: Agent }; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/agents/${agentId}/tools`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Response type for batch add tools
 */
export interface AddToolsBatchResponse {
    success: boolean;
    data: {
        added: Tool[];
        skipped: { name: string; reason: string }[];
        agent: Agent;
    };
    error?: string;
}

/**
 * Add multiple tools to an agent in a single atomic operation.
 * This avoids race conditions when adding multiple tools simultaneously.
 */
export async function addAgentToolsBatch(
    agentId: string,
    tools: AddToolRequest[]
): Promise<AddToolsBatchResponse> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/agents/${agentId}/tools/batch`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ tools })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Remove a tool from an agent
 */
export async function removeAgentTool(
    agentId: string,
    toolId: string
): Promise<{ success: boolean; data: { agent: Agent }; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/agents/${agentId}/tools/${toolId}`, {
        method: "DELETE",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== Thread API Functions =====

/**
 * Get threads (conversations) for an agent or all agents
 */
export async function getThreads(params?: {
    agent_id?: string;
    status?: "active" | "archived";
    limit?: number;
    offset?: number;
    search?: string;
}): Promise<{ success: boolean; data: { threads: Thread[]; total: number }; error?: string }> {
    const token = getAuthToken();
    const queryParams = new URLSearchParams();

    if (params?.agent_id) queryParams.set("agent_id", params.agent_id);
    if (params?.status) queryParams.set("status", params.status);
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.offset) queryParams.set("offset", params.offset.toString());
    if (params?.search) queryParams.set("search", params.search);

    const url = `${API_BASE_URL}/threads${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await apiFetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a specific thread with optional stats
 */
export async function getThread(
    threadId: string,
    includeStats = false
): Promise<{ success: boolean; data: ThreadWithStats | Thread; error?: string }> {
    const token = getAuthToken();
    const url = `${API_BASE_URL}/threads/${threadId}${includeStats ? "?include_stats=true" : ""}`;

    const response = await apiFetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get messages for a thread
 */
export async function getThreadMessages(
    threadId: string
): Promise<{ success: boolean; data: { messages: ThreadMessage[] }; error?: string }> {
    const token = getAuthToken();
    const url = `${API_BASE_URL}/threads/${threadId}/messages`;

    const response = await apiFetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Create a new thread
 */
export async function createThread(
    data: CreateThreadRequest
): Promise<{ success: boolean; data: Thread; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/threads`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Update thread (e.g., change title or status)
 */
export async function updateThread(
    threadId: string,
    data: UpdateThreadRequest
): Promise<{ success: boolean; data: Thread; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/threads/${threadId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Delete a thread
 */
export async function deleteThread(
    threadId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/threads/${threadId}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Archive a thread
 */
export async function archiveThread(
    threadId: string
): Promise<{ success: boolean; data: Thread; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/threads/${threadId}/archive`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Unarchive a thread
 */
export async function unarchiveThread(
    threadId: string
): Promise<{ success: boolean; data: Thread; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/threads/${threadId}/unarchive`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== Knowledge Base API Functions =====

/**
 * Get all knowledge bases
 */
export async function getKnowledgeBases(params?: {
    limit?: number;
    offset?: number;
    folderId?: string | null;
}): Promise<ApiResponse<KnowledgeBase[]>> {
    const token = getAuthToken();

    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.offset) queryParams.set("offset", params.offset.toString());

    // folderId: null means root level (no folder), undefined means all
    if (params?.folderId === null) {
        queryParams.set("folderId", "null");
    } else if (params?.folderId !== undefined) {
        queryParams.set("folderId", params.folderId);
    }

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/knowledge-bases${queryString ? `?${queryString}` : ""}`;

    const response = await apiFetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a knowledge base by ID
 */
export async function getKnowledgeBase(id: string): Promise<ApiResponse<KnowledgeBase>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/knowledge-bases/${id}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Create a knowledge base
 */
export async function createKnowledgeBase(
    input: CreateKnowledgeBaseInput
): Promise<ApiResponse<KnowledgeBase>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/knowledge-bases`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Update a knowledge base
 */
export async function updateKnowledgeBase(
    id: string,
    input: UpdateKnowledgeBaseInput
): Promise<ApiResponse<KnowledgeBase>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/knowledge-bases/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Delete a knowledge base
 */
export async function deleteKnowledgeBase(id: string): Promise<ApiResponse> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/knowledge-bases/${id}`, {
        method: "DELETE",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get knowledge base stats
 */
export async function getKnowledgeBaseStats(id: string): Promise<ApiResponse<KnowledgeBaseStats>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/knowledge-bases/${id}/stats`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get documents in a knowledge base
 */
export async function getKnowledgeDocuments(id: string): Promise<ApiResponse<KnowledgeDocument[]>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/knowledge-bases/${id}/documents`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Upload a document to a knowledge base
 */
export async function uploadDocument(id: string, file: File): Promise<ApiResponse> {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiFetch(`${API_BASE_URL}/knowledge-bases/${id}/documents/upload`, {
        method: "POST",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Download a document from a knowledge base
 * Returns a signed URL that can be used to download the file
 */
export async function downloadDocument(
    kbId: string,
    docId: string
): Promise<
    ApiResponse<{
        url: string;
        expiresAt: string;
        expiresIn: number;
        filename: string;
    }>
> {
    const token = getAuthToken();

    const response = await apiFetch(
        `${API_BASE_URL}/knowledge-bases/${kbId}/documents/${docId}/download`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` })
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Helper function to trigger browser download using signed URL
 */
export async function triggerDocumentDownload(kbId: string, docId: string): Promise<void> {
    const result = await downloadDocument(kbId, docId);

    if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to get download URL");
    }

    // Open the signed URL in a new window/tab to trigger download
    window.open(result.data.url, "_blank");
}

/**
 * Add a URL to a knowledge base
 */
export async function addUrlToKnowledgeBase(
    id: string,
    url: string,
    name?: string
): Promise<ApiResponse> {
    const token = getAuthToken();

    const body: { url: string; name?: string } = { url: url.trim() };
    if (name && name.trim()) {
        body.name = name.trim();
    }

    const response = await apiFetch(`${API_BASE_URL}/knowledge-bases/${id}/documents/url`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Query a knowledge base
 */
export async function queryKnowledgeBase(
    id: string,
    input: QueryKnowledgeBaseInput
): Promise<ApiResponse<{ query: string; results: ChunkSearchResult[]; count: number }>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/knowledge-bases/${id}/query`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Delete a document from a knowledge base
 */
export async function deleteDocument(kbId: string, docId: string): Promise<ApiResponse> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/knowledge-bases/${kbId}/documents/${docId}`, {
        method: "DELETE",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Reprocess a document (retry failed processing or regenerate embeddings)
 */
export async function reprocessDocument(kbId: string, docId: string): Promise<ApiResponse> {
    const token = getAuthToken();

    const response = await apiFetch(
        `${API_BASE_URL}/knowledge-bases/${kbId}/documents/${docId}/reprocess`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` })
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== Integration Provider API Functions =====

export interface ProviderSummary {
    name: string;
    displayName: string;
    authMethod: "oauth2" | "api_key" | "mcp";
    category: string;
    description?: string;
}

export interface OperationParameter {
    name: string;
    type: string;
    description?: string;
    required: boolean;
    default?: unknown;
}

export interface OperationSummary {
    id: string;
    name: string;
    description: string;
    category?: string;
    actionType: "read" | "write";
    parameters: OperationParameter[];
    inputSchemaJSON: JsonObject;
}

/**
 * Get all available integration providers
 */
export async function getIntegrationProviders(): Promise<{
    success: boolean;
    data: ProviderSummary[];
    error?: string;
}> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/integrations/providers`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get operations for a specific provider
 * @param provider - Provider name (e.g., "slack", "gmail")
 * @param nodeType - Optional filter: "action" for write operations, "integration" for read operations
 */
export async function getProviderOperations(
    provider: string,
    nodeType?: "action" | "integration"
): Promise<{
    success: boolean;
    data: { provider: string; operations: OperationSummary[] };
    error?: string;
}> {
    const token = getAuthToken();

    // Build URL with optional nodeType query param
    const url = new URL(`${API_BASE_URL}/integrations/providers/${provider}/operations`);
    if (nodeType) {
        url.searchParams.set("nodeType", nodeType);
    }

    const response = await apiFetch(url.toString(), {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== Analytics API Functions =====

export interface AnalyticsOverview {
    period: string;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    totalTokens: number;
    totalCost: number;
    avgDurationMs: number;
    topModels: Array<{
        provider: string;
        model: string;
        totalCost: number;
    }>;
}

export interface DailyAnalytics {
    date: string;
    entityType: string;
    entityId: string;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    totalTokens: number;
    totalCost: number;
    avgDurationMs: number;
}

export interface ModelAnalytics {
    provider: string;
    model: string;
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    totalTokens: number;
    totalCost: number;
    avgCostPerCall: number;
    avgDurationMs: number;
}

/**
 * Get analytics overview
 */
export async function getAnalyticsOverview(days?: number): Promise<ApiResponse<AnalyticsOverview>> {
    const token = getAuthToken();
    const queryParams = days ? `?days=${days}` : "";

    const response = await apiFetch(`${API_BASE_URL}/analytics/overview${queryParams}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get daily analytics time-series data
 */
export async function getDailyAnalytics(params?: {
    days?: number;
    entityType?: string;
    entityId?: string;
}): Promise<ApiResponse<DailyAnalytics[]>> {
    const token = getAuthToken();
    const queryParams = new URLSearchParams();

    if (params?.days) queryParams.set("days", params.days.toString());
    if (params?.entityType) queryParams.set("entityType", params.entityType);
    if (params?.entityId) queryParams.set("entityId", params.entityId);

    const url = `${API_BASE_URL}/analytics/daily${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await apiFetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get model usage analytics
 */
export async function getModelAnalytics(params?: {
    days?: number;
    provider?: string;
}): Promise<ApiResponse<ModelAnalytics[]>> {
    const token = getAuthToken();
    const queryParams = new URLSearchParams();

    if (params?.days) queryParams.set("days", params.days.toString());
    if (params?.provider) queryParams.set("provider", params.provider);

    const url = `${API_BASE_URL}/analytics/models${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await apiFetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== Checkpoint API Functions =====

interface CheckpointRow {
    id: string;
    name: string | null;
    created_at: string;
    snapshot: Record<string, unknown>;
    description?: string | null;
}

export interface Checkpoint {
    id: string;
    name: string | null;
    createdAt: string;
    snapshot: Record<string, unknown>;
    formatted: string;
}

/**
 * List checkpoints for a workflow
 */
export async function listCheckpoints(workflowId: string): Promise<Checkpoint[]> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/checkpoints/workflow/${workflowId}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) throw new Error("Failed to fetch checkpoints");
    const json = await response.json();
    return json.data.map((cp: CheckpointRow) => ({
        id: cp.id,
        name: cp.name,
        createdAt: cp.created_at,
        snapshot: cp.snapshot,
        formatted: new Date(cp.created_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
        })
    }));
}

/**
 * Create a checkpoint for a workflow
 */
export async function createCheckpoint(workflowId: string, name?: string) {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/checkpoints/${workflowId}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name })
    });

    if (!response.ok) throw new Error("Failed to create checkpoint");
    return response.json();
}

/**
 * Restore a checkpoint
 */
export async function restoreCheckpoint(checkpointId: string) {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/checkpoints/restore/${checkpointId}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) throw new Error("Failed to restore checkpoint");
    return response.json();
}

/**
 * Delete a checkpoint
 */
export async function deleteCheckpoint(
    checkpointId: string,
    workflowId: string
): Promise<Checkpoint[]> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/checkpoints/${checkpointId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) throw new Error("Failed to delete checkpoint");

    return listCheckpoints(workflowId);
}

/**
 * Rename a checkpoint
 */
export async function renameCheckpoint(id: string, newName: string) {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/checkpoints/rename/${id}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newName })
    });

    if (!response.ok) throw new Error("Failed to rename checkpoint");
    return response.json();
}

// ===== Template API Functions =====

export type { Template, TemplateListParams, TemplateListResponse, CategoryInfo, TemplateCategory };

/**
 * Get list of workflow templates with optional filters
 */
export async function getTemplates(
    params?: TemplateListParams
): Promise<{ success: boolean; data: TemplateListResponse; error?: string }> {
    const queryParams = new URLSearchParams();

    if (params?.category) queryParams.set("category", params.category);
    if (params?.tags && params.tags.length > 0) queryParams.set("tags", params.tags.join(","));
    if (params?.featured !== undefined) queryParams.set("featured", params.featured.toString());
    if (params?.search) queryParams.set("search", params.search);
    if (params?.sortBy) queryParams.set("sortBy", params.sortBy);
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.offset) queryParams.set("offset", params.offset.toString());

    const url = `${API_BASE_URL}/templates${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await apiFetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get template categories with counts
 */
export async function getTemplateCategories(): Promise<{
    success: boolean;
    data: CategoryInfo[];
    error?: string;
}> {
    const response = await apiFetch(`${API_BASE_URL}/templates/categories`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a specific template by ID
 */
export async function getTemplate(
    templateId: string
): Promise<{ success: boolean; data: Template; error?: string }> {
    const response = await apiFetch(`${API_BASE_URL}/templates/${templateId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Copy a template to user's workspace
 */
export async function copyTemplate(
    templateId: string,
    name?: string
): Promise<{ success: boolean; data: CopyTemplateResponse; error?: string }> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("Authentication required to copy templates");
    }

    const response = await apiFetch(`${API_BASE_URL}/templates/${templateId}/copy`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== Agent Template API Functions =====

export type { AgentTemplate, AgentTemplateListParams, AgentTemplateListResponse };

/**
 * Get list of agent templates with optional filters
 */
export async function getAgentTemplates(
    params?: AgentTemplateListParams
): Promise<{ success: boolean; data: AgentTemplateListResponse; error?: string }> {
    const queryParams = new URLSearchParams();

    if (params?.category) queryParams.set("category", params.category);
    if (params?.tags && params.tags.length > 0) queryParams.set("tags", params.tags.join(","));
    if (params?.featured !== undefined) queryParams.set("featured", params.featured.toString());
    if (params?.search) queryParams.set("search", params.search);
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.offset) queryParams.set("offset", params.offset.toString());

    const url = `${API_BASE_URL}/agent-templates${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await apiFetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get agent template categories with counts
 */
export async function getAgentTemplateCategories(): Promise<{
    success: boolean;
    data: CategoryInfo[];
    error?: string;
}> {
    const response = await apiFetch(`${API_BASE_URL}/agent-templates/categories`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a specific agent template by ID
 */
export async function getAgentTemplate(
    templateId: string
): Promise<{ success: boolean; data: AgentTemplate; error?: string }> {
    const response = await apiFetch(`${API_BASE_URL}/agent-templates/${templateId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Copy an agent template to user's agents
 */
export async function copyAgentTemplate(
    templateId: string,
    name?: string
): Promise<{ success: boolean; data: CopyAgentTemplateResponse; error?: string }> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("Authentication required to copy agent templates");
    }

    const response = await apiFetch(`${API_BASE_URL}/agent-templates/${templateId}/copy`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== Form Interface API =====

/**
 * List form interface response
 */
export interface FormInterfaceListResponse {
    success: boolean;
    data: {
        items: FormInterface[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
    };
    error?: string;
}

/**
 * Get all form interfaces for the current user
 */
export async function getFormInterfaces(params?: {
    limit?: number;
    offset?: number;
    workflowId?: string;
    agentId?: string;
    folderId?: string | null;
}): Promise<FormInterfaceListResponse> {
    const token = getAuthToken();

    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.offset) queryParams.set("offset", params.offset.toString());
    if (params?.workflowId) queryParams.set("workflowId", params.workflowId);
    if (params?.agentId) queryParams.set("agentId", params.agentId);

    // folderId: null means root level (no folder), undefined means all
    if (params?.folderId === null) {
        queryParams.set("folderId", "null");
    } else if (params?.folderId !== undefined) {
        queryParams.set("folderId", params.folderId);
    }

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/form-interfaces${queryString ? `?${queryString}` : ""}`;

    const response = await apiFetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a specific form interface by ID
 */
export async function getFormInterface(
    id: string
): Promise<{ success: boolean; data: FormInterface; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/form-interfaces/${id}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Create a new form interface
 */
export async function createFormInterface(
    input: CreateFormInterfaceInput
): Promise<{ success: boolean; data: FormInterface; error?: string }> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await apiFetch(`${API_BASE_URL}/form-interfaces`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Update a form interface
 */
export async function updateFormInterface(
    id: string,
    input: UpdateFormInterfaceInput
): Promise<{ success: boolean; data: FormInterface; error?: string }> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await apiFetch(`${API_BASE_URL}/form-interfaces/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Delete a form interface
 */
export async function deleteFormInterface(
    id: string
): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await apiFetch(`${API_BASE_URL}/form-interfaces/${id}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Publish a form interface
 */
export async function publishFormInterface(
    id: string
): Promise<{ success: boolean; data: FormInterface; error?: string }> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await apiFetch(`${API_BASE_URL}/form-interfaces/${id}/publish`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Unpublish a form interface
 */
export async function unpublishFormInterface(
    id: string
): Promise<{ success: boolean; data: FormInterface; error?: string }> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await apiFetch(`${API_BASE_URL}/form-interfaces/${id}/unpublish`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Duplicate a form interface
 */
export async function duplicateFormInterface(
    id: string
): Promise<{ success: boolean; data: FormInterface; error?: string }> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await apiFetch(`${API_BASE_URL}/form-interfaces/${id}/duplicate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Upload a form interface asset (cover or icon)
 */
export async function uploadFormInterfaceAsset(
    id: string,
    file: File,
    assetType: "cover" | "icon"
): Promise<{
    success: boolean;
    data: { url: string; formInterface: FormInterface };
    error?: string;
}> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const formData = new FormData();
    formData.append(assetType, file);

    const response = await apiFetch(`${API_BASE_URL}/form-interfaces/${id}/assets`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get submissions for a form interface
 */
export async function getFormInterfaceSubmissions(
    id: string,
    params?: { limit?: number; offset?: number }
): Promise<{
    success: boolean;
    data: {
        items: FormInterfaceSubmission[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
    };
    error?: string;
}> {
    const token = getAuthToken();

    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.offset) queryParams.set("offset", params.offset.toString());

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/form-interfaces/${id}/submissions${queryString ? `?${queryString}` : ""}`;

    const response = await apiFetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== Public Form Interface API (No Auth Required) =====

/**
 * Get a public form interface by slug
 */
export async function getPublicFormInterface(
    slug: string
): Promise<{ success: boolean; data: PublicFormInterface; error?: string }> {
    const response = await apiFetch(`${API_BASE_URL}/public/form-interfaces/${slug}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Submit to a public form interface
 * Phase 2: Now returns executionId for real-time streaming
 */
export async function submitPublicFormInterface(
    slug: string,
    data: {
        message: string;
        files?: Array<{
            filename: string;
            size: number;
            mimeType: string;
            gcsUri: string;
            downloadUrl?: string;
        }>;
        urls?: Array<{ url: string; title?: string }>;
    }
): Promise<{
    success: boolean;
    data: { submissionId: string; executionId: string };
    error?: string;
}> {
    const response = await apiFetch(`${API_BASE_URL}/public/form-interfaces/${slug}/submit`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Upload a file to a public form interface
 * Returns a signed URL for download and GCS URI for submission
 */
export async function uploadPublicFormFile(
    slug: string,
    file: File
): Promise<{
    success: boolean;
    data: {
        filename: string;
        size: number;
        mimeType: string;
        gcsUri: string;
        downloadUrl: string;
    };
    error?: string;
}> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiFetch(`${API_BASE_URL}/public/form-interfaces/${slug}/files`, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get form submission execution status
 */
export async function getPublicFormSubmissionStatus(
    slug: string,
    submissionId: string
): Promise<{
    success: boolean;
    data: {
        status: "pending" | "running" | "completed" | "failed";
        output?: string;
        error?: string;
    };
    error?: string;
}> {
    const response = await apiFetch(
        `${API_BASE_URL}/public/form-interfaces/${slug}/submissions/${submissionId}/status`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Create an SSE connection for streaming form execution results
 * Returns a cleanup function to close the connection
 */
export function subscribeToFormExecutionStream(
    slug: string,
    submissionId: string,
    executionId: string,
    handlers: {
        onMessage?: (content: string) => void;
        onComplete?: (output: string) => void;
        onError?: (error: string) => void;
    }
): () => void {
    const url = `${API_BASE_URL}/public/form-interfaces/${slug}/submissions/${submissionId}/stream?executionId=${executionId}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case "message":
                case "token":
                    if (handlers.onMessage && data.content) {
                        handlers.onMessage(data.content);
                    }
                    break;
                case "complete":
                    if (handlers.onComplete) {
                        handlers.onComplete(data.output || "");
                    }
                    eventSource.close();
                    break;
                case "error":
                    if (handlers.onError) {
                        handlers.onError(data.error || "Unknown error");
                    }
                    eventSource.close();
                    break;
            }
        } catch {
            // Ignore parse errors
        }
    };

    eventSource.onerror = () => {
        if (handlers.onError) {
            handlers.onError("Connection error");
        }
        eventSource.close();
    };

    return () => {
        eventSource.close();
    };
}

/**
 * Query form submission attachments (RAG)
 */
export async function queryFormSubmissionAttachments(
    slug: string,
    submissionId: string,
    query: string,
    options?: { topK?: number; similarityThreshold?: number }
): Promise<{
    success: boolean;
    data: {
        results: Array<{
            content: string;
            similarity: number;
            sourceName: string;
            sourceType: string;
            chunkIndex: number;
        }>;
    };
    error?: string;
}> {
    const response = await apiFetch(
        `${API_BASE_URL}/public/form-interfaces/${slug}/submissions/${submissionId}/query`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                query,
                topK: options?.topK || 5,
                similarityThreshold: options?.similarityThreshold || 0.7
            })
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== Chat Interface API =====

/**
 * List chat interface response
 */
export interface ChatInterfaceListResponse {
    success: boolean;
    data: {
        items: ChatInterface[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
    };
    error?: string;
}

/**
 * Get all chat interfaces for the current user
 */
export async function getChatInterfaces(params?: {
    limit?: number;
    offset?: number;
    agentId?: string;
    folderId?: string | null;
}): Promise<ChatInterfaceListResponse> {
    const token = getAuthToken();

    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.offset) queryParams.set("offset", params.offset.toString());
    if (params?.agentId) queryParams.set("agentId", params.agentId);

    // folderId: null means root level (no folder), undefined means all
    if (params?.folderId === null) {
        queryParams.set("folderId", "null");
    } else if (params?.folderId !== undefined) {
        queryParams.set("folderId", params.folderId);
    }

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/chat-interfaces${queryString ? `?${queryString}` : ""}`;

    const response = await apiFetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a specific chat interface by ID
 */
export async function getChatInterface(
    id: string
): Promise<{ success: boolean; data: ChatInterface; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/chat-interfaces/${id}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Create a new chat interface
 */
export async function createChatInterface(
    input: CreateChatInterfaceInput
): Promise<{ success: boolean; data: ChatInterface; error?: string }> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await apiFetch(`${API_BASE_URL}/chat-interfaces`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Update a chat interface
 */
export async function updateChatInterface(
    id: string,
    input: UpdateChatInterfaceInput
): Promise<{ success: boolean; data: ChatInterface; error?: string }> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await apiFetch(`${API_BASE_URL}/chat-interfaces/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Delete a chat interface
 */
export async function deleteChatInterface(
    id: string
): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await apiFetch(`${API_BASE_URL}/chat-interfaces/${id}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Publish a chat interface
 */
export async function publishChatInterface(
    id: string
): Promise<{ success: boolean; data: ChatInterface; error?: string }> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await apiFetch(`${API_BASE_URL}/chat-interfaces/${id}/publish`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Unpublish a chat interface
 */
export async function unpublishChatInterface(
    id: string
): Promise<{ success: boolean; data: ChatInterface; error?: string }> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await apiFetch(`${API_BASE_URL}/chat-interfaces/${id}/unpublish`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Duplicate a chat interface
 */
export async function duplicateChatInterface(
    id: string
): Promise<{ success: boolean; data: ChatInterface; error?: string }> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await apiFetch(`${API_BASE_URL}/chat-interfaces/${id}/duplicate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Upload a chat interface asset (cover or icon)
 */
export async function uploadChatInterfaceAsset(
    id: string,
    file: File,
    assetType: "cover" | "icon"
): Promise<{
    success: boolean;
    data: { url: string; chatInterface: ChatInterface };
    error?: string;
}> {
    const token = getAuthToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const formData = new FormData();
    formData.append(assetType, file);

    const response = await apiFetch(`${API_BASE_URL}/chat-interfaces/${id}/assets`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get sessions for a chat interface
 */
export async function getChatInterfaceSessions(
    id: string,
    params?: { limit?: number; offset?: number; status?: "active" | "ended" | "expired" }
): Promise<{
    success: boolean;
    data: {
        items: ChatInterfaceSession[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
    };
    error?: string;
}> {
    const token = getAuthToken();

    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.offset) queryParams.set("offset", params.offset.toString());
    if (params?.status) queryParams.set("status", params.status);

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/chat-interfaces/${id}/sessions${queryString ? `?${queryString}` : ""}`;

    const response = await apiFetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get statistics for a chat interface
 */
export async function getChatInterfaceStats(
    id: string,
    hours?: number
): Promise<{
    success: boolean;
    data: {
        activeSessions: number;
        endedSessions: number;
        totalMessages: number;
        avgMessagesPerSession: number;
        period: string;
        chatInterface: {
            id: string;
            name: string;
            sessionCount: number;
            messageCount: number;
        };
    };
    error?: string;
}> {
    const token = getAuthToken();

    const queryParams = new URLSearchParams();
    if (hours) queryParams.set("hours", hours.toString());

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/chat-interfaces/${id}/stats${queryString ? `?${queryString}` : ""}`;

    const response = await apiFetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== Public Chat Interface API (No Auth Required) =====

/**
 * Get a public chat interface by slug
 */
export async function getPublicChatInterface(
    slug: string
): Promise<{ success: boolean; data: PublicChatInterface; error?: string }> {
    const response = await apiFetch(`${API_BASE_URL}/public/chat-interfaces/${slug}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Create or resume a chat session
 */
export async function createChatSession(
    slug: string,
    input: CreateChatSessionInput
): Promise<{ success: boolean; data: ChatSessionResponse; error?: string }> {
    const response = await apiFetch(`${API_BASE_URL}/public/chat-interfaces/${slug}/sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get message history for a chat session
 */
export async function getChatSessionMessages(
    slug: string,
    sessionToken: string
): Promise<{
    success: boolean;
    data: {
        messages: PublicChatMessage[];
        sessionId: string;
        messageCount: number;
    };
    error?: string;
}> {
    const response = await apiFetch(
        `${API_BASE_URL}/public/chat-interfaces/${slug}/sessions/${sessionToken}/messages`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Send a message in a chat session
 * Returns executionId and threadId for streaming connection
 */
export async function sendChatMessage(
    slug: string,
    input: SendChatMessageInput
): Promise<{
    success: boolean;
    data: { executionId: string; threadId: string; status: string };
    error?: string;
}> {
    const response = await apiFetch(`${API_BASE_URL}/public/chat-interfaces/${slug}/messages`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Upload a file for a chat session
 */
export async function uploadChatInterfaceFile(
    slug: string,
    sessionToken: string,
    file: File
): Promise<{
    success: boolean;
    data: ChatMessageAttachment;
    error?: string;
}> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
        `${API_BASE_URL}/public/chat-interfaces/${slug}/sessions/${sessionToken}/files`,
        {
            method: "POST",
            body: formData
            // No content-type header, let browser set boundary
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get the SSE stream URL for chat interface execution
 */
export function getChatInterfaceStreamUrl(slug: string, sessionToken: string): string {
    return `${API_BASE_URL}/public/chat-interfaces/${slug}/sessions/${sessionToken}/stream`;
}

// ===== API Keys =====

export type ApiKeyScope =
    | "workflows:read"
    | "workflows:execute"
    | "executions:read"
    | "executions:cancel"
    | "agents:read"
    | "agents:execute"
    | "threads:read"
    | "threads:write"
    | "triggers:read"
    | "triggers:execute"
    | "knowledge-bases:read"
    | "knowledge-bases:query"
    | "webhooks:read"
    | "webhooks:write";

export interface ApiKey {
    id: string;
    name: string;
    key_prefix: string;
    scopes: ApiKeyScope[];
    rate_limit_per_minute: number;
    rate_limit_per_day: number;
    expires_at: string | null;
    last_used_at: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateApiKeyInput {
    name: string;
    scopes: ApiKeyScope[];
    rate_limit_per_minute?: number;
    rate_limit_per_day?: number;
    expires_in_days?: number;
}

export interface CreateApiKeyResponse {
    id: string;
    name: string;
    key: string; // Full key, only returned on creation
    key_prefix: string;
    scopes: ApiKeyScope[];
    rate_limit_per_minute: number;
    rate_limit_per_day: number;
    expires_at: string | null;
    created_at: string;
}

export interface ApiKeyScopesResponse {
    scopes: ApiKeyScope[];
    bundles: {
        name: string;
        description: string;
        scopes: ApiKeyScope[];
    }[];
}

export async function getApiKeys(): Promise<ApiResponse<ApiKey[]>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/api-keys`, {
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

export async function getApiKey(id: string): Promise<ApiResponse<ApiKey>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/api-keys/${id}`, {
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

export async function getApiKeyScopes(): Promise<ApiResponse<ApiKeyScopesResponse>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/api-keys/scopes`, {
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

export async function createApiKey(
    input: CreateApiKeyInput
): Promise<ApiResponse<CreateApiKeyResponse>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/api-keys`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

export async function updateApiKey(
    id: string,
    input: { name?: string; scopes?: ApiKeyScope[]; is_active?: boolean }
): Promise<ApiResponse<ApiKey>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/api-keys/${id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

export async function rotateApiKey(id: string): Promise<ApiResponse<CreateApiKeyResponse>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/api-keys/${id}/rotate`, {
        method: "POST",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

export async function revokeApiKey(id: string): Promise<ApiResponse> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/api-keys/${id}`, {
        method: "DELETE",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== Folder API Functions =====

// Re-export folder types for components
export type {
    Folder,
    FolderWithCounts,
    FolderTreeNode,
    FolderContents,
    CreateFolderInput,
    UpdateFolderInput,
    MoveItemsToFolderInput,
    MoveFolderInput,
    FolderResourceType
};

/**
 * List all folders for the current user with item counts
 */
export async function getFolders(): Promise<ApiResponse<FolderWithCounts[]>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/folders`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a specific folder by ID
 */
export async function getFolder(id: string): Promise<ApiResponse<Folder>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/folders/${id}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get folder contents grouped by type
 */
export async function getFolderContents(id: string): Promise<ApiResponse<FolderContents>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/folders/${id}/contents`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Create a new folder
 */
export async function createFolder(input: CreateFolderInput): Promise<ApiResponse<Folder>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/folders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Update a folder
 */
export async function updateFolder(
    id: string,
    input: UpdateFolderInput
): Promise<ApiResponse<Folder>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/folders/${id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Delete a folder (items are moved to root, not deleted)
 */
export async function deleteFolder(id: string): Promise<ApiResponse> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/folders/${id}`, {
        method: "DELETE",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get folder tree structure (all folders as nested tree)
 */
export async function getFolderTree(): Promise<ApiResponse<FolderTreeNode[]>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/folders/tree`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get direct children of a folder
 */
export async function getFolderChildren(id: string): Promise<ApiResponse<FolderWithCounts[]>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/folders/${id}/children`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Move a folder to a new parent folder (or to root if newParentId is null)
 */
export async function moveFolder(
    id: string,
    input: Omit<MoveFolderInput, "folderId">
): Promise<ApiResponse<Folder>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/folders/${id}/move`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Move items to a folder
 */
export async function moveItemsToFolder(
    input: MoveItemsToFolderInput
): Promise<ApiResponse<{ movedCount: number }>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/folders/move`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Remove items from a folder (or from all folders if folderId is not provided)
 */
export async function removeItemsFromFolder(
    input: RemoveItemsFromFolderInput
): Promise<ApiResponse<{ removedCount: number }>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/folders/remove`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== Workflow Generation Chat API Functions =====

/**
 * Initiate a workflow generation chat message
 * Returns an execution ID for streaming the response
 */
export async function initiateGenerationChat(
    request: GenerationChatRequest
): Promise<ApiResponse<{ executionId: string; messageId: string }>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/workflows/generation/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(request)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Create a workflow from an approved generation plan
 */
export async function createWorkflowFromPlan(
    plan: WorkflowPlan,
    folderId?: string
): Promise<ApiResponse<{ workflowId: string; name: string }>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/workflows/generation/create`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ plan, folderId })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// Re-export generation chat types for convenience
export type { GenerationChatMessage, GenerationChatRequest, GenerationChatResponse, WorkflowPlan };

// ===== Workspace API =====

// Re-export workspace types
export type {
    Workspace,
    WorkspaceWithStats,
    WorkspaceMember,
    WorkspaceMemberWithUser,
    WorkspaceRole,
    GetWorkspacesResponse,
    CreditBalance,
    CreditTransaction
};

/**
 * Get all workspaces for the current user (owned and member)
 */
export async function getWorkspaces(): Promise<ApiResponse<GetWorkspacesResponse>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/workspaces`, {
        method: "GET",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a single workspace by ID
 */
export async function getWorkspace(
    workspaceId: string
): Promise<ApiResponse<{ workspace: WorkspaceWithStats; role: WorkspaceRole; isOwner: boolean }>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/workspaces/${workspaceId}`, {
        method: "GET",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Create a new workspace
 */
export async function createWorkspace(
    input: CreateWorkspaceInput
): Promise<ApiResponse<Workspace>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/workspaces`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Update a workspace
 */
export async function updateWorkspace(
    workspaceId: string,
    input: UpdateWorkspaceInput
): Promise<ApiResponse<Workspace>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/workspaces/${workspaceId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Delete a workspace
 */
export async function deleteWorkspace(workspaceId: string): Promise<ApiResponse<void>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/workspaces/${workspaceId}`, {
        method: "DELETE",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get workspace members
 */
export async function getWorkspaceMembers(
    workspaceId: string
): Promise<ApiResponse<WorkspaceMemberWithUser[]>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/workspaces/${workspaceId}/members`, {
        method: "GET",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Invite a member to workspace
 */
export async function inviteWorkspaceMember(
    workspaceId: string,
    input: InviteMemberInput
): Promise<ApiResponse<{ id: string; email: string; role: WorkspaceRole }>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/workspaces/${workspaceId}/members/invite`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Remove a member from workspace
 */
export async function removeWorkspaceMember(
    workspaceId: string,
    userId: string
): Promise<ApiResponse<void>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/workspaces/${workspaceId}/members/${userId}`, {
        method: "DELETE",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Update member role
 */
export async function updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
): Promise<ApiResponse<WorkspaceMember>> {
    const token = getAuthToken();

    const response = await apiFetch(
        `${API_BASE_URL}/workspaces/${workspaceId}/members/${userId}/role`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` })
            },
            body: JSON.stringify({ role })
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get credits balance
 */
export async function getCreditsBalance(workspaceId: string): Promise<ApiResponse<CreditBalance>> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/workspaces/${workspaceId}/credits/balance`, {
        method: "GET",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get credit transactions
 */
export async function getCreditsTransactions(
    workspaceId: string,
    options?: { limit?: number; offset?: number }
): Promise<ApiResponse<CreditTransaction[]>> {
    const token = getAuthToken();
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", options.limit.toString());
    if (options?.offset) params.set("offset", options.offset.toString());

    const url = `${API_BASE_URL}/workspaces/${workspaceId}/credits/transactions${params.toString() ? `?${params}` : ""}`;

    const response = await apiFetch(url, {
        method: "GET",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get invitation by token (public)
 */
export async function getInvitation(token: string): Promise<
    ApiResponse<{
        id: string;
        email: string;
        role: WorkspaceRole;
        message: string | null;
        expiresAt: string;
        workspace: { id: string; name: string; slug: string };
        inviter: { id: string; name: string | null; email: string };
    }>
> {
    const response = await apiFetch(`${API_BASE_URL}/workspaces/invitations/${token}`, {
        method: "GET"
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Accept invitation
 */
export async function acceptInvitation(
    invitationToken: string
): Promise<ApiResponse<{ workspaceId: string; role: WorkspaceRole }>> {
    const token = getAuthToken();

    const response = await apiFetch(
        `${API_BASE_URL}/workspaces/invitations/${invitationToken}/accept`,
        {
            method: "POST",
            headers: {
                ...(token && { Authorization: `Bearer ${token}` })
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Decline invitation
 */
export async function declineInvitation(invitationToken: string): Promise<ApiResponse<void>> {
    const token = getAuthToken();

    const response = await apiFetch(
        `${API_BASE_URL}/workspaces/invitations/${invitationToken}/decline`,
        {
            method: "POST",
            headers: {
                ...(token && { Authorization: `Bearer ${token}` })
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Upgrade workspace plan
 */
export async function upgradeWorkspace(
    workspaceId: string,
    plan: "free" | "pro" | "team"
): Promise<
    ApiResponse<{
        id: string;
        name: string;
        type: string;
        limits: {
            maxWorkflows: number;
            maxAgents: number;
            maxKnowledgeBases: number;
            maxKbChunks: number;
            maxMembers: number;
            maxConnections: number;
            executionHistoryDays: number;
        };
    }>
> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/workspaces/${workspaceId}/upgrade`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ plan })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// =============================================================================
// WORKFLOW CHAT (Flow Builder Chat Interface)
// =============================================================================

export interface WorkflowConversationResponse {
    id: string;
    workflowId: string;
    title: string | null;
    status: "active" | "archived";
    messageCount: number;
    lastMessageAt: string | null;
    createdAt: string;
}

export interface WorkflowChatMessageResponse {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    isStreaming: boolean;
    attachments: Array<{
        fileName: string;
        fileType: string;
        fileSize: number;
        url: string;
    }>;
    executionId: string | null;
    tokenCount: number | null;
    createdAt: string;
}

export interface WorkflowChatMessagesResponse {
    messages: WorkflowChatMessageResponse[];
    total: number;
    hasMore: boolean;
}

export interface SendWorkflowChatMessageResponse {
    messageId: string;
    assistantMessageId: string;
    conversationId: string;
}

/**
 * Get or create the active conversation for a workflow
 */
export async function getWorkflowConversation(
    workflowId: string
): Promise<WorkflowConversationResponse> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/workflows/${workflowId}/conversation`, {
        method: "GET",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
        );
    }

    const result = await response.json();
    return result.data;
}

/**
 * Get messages for the active conversation
 */
export async function getWorkflowChatMessages(
    workflowId: string,
    options?: { limit?: number; offset?: number }
): Promise<WorkflowChatMessagesResponse> {
    const token = getAuthToken();

    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", options.limit.toString());
    if (options?.offset) params.set("offset", options.offset.toString());

    const url = `${API_BASE_URL}/workflows/${workflowId}/conversation/messages${params.toString() ? `?${params}` : ""}`;

    const response = await apiFetch(url, {
        method: "GET",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
        );
    }

    const result = await response.json();
    return result.data;
}

/**
 * Send a chat message to a workflow
 */
export async function sendWorkflowChatMessage(
    workflowId: string,
    message: string,
    attachments?: Array<{
        fileName: string;
        fileType: string;
        fileSize: number;
        url: string;
    }>
): Promise<SendWorkflowChatMessageResponse> {
    const token = getAuthToken();

    const response = await apiFetch(
        `${API_BASE_URL}/workflows/${workflowId}/conversation/messages`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` })
            },
            body: JSON.stringify({
                message,
                attachments: attachments || []
            })
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
        );
    }

    const result = await response.json();
    return result.data;
}

/**
 * Clear all messages in the active conversation
 */
export async function clearWorkflowConversation(workflowId: string): Promise<void> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/workflows/${workflowId}/conversation`, {
        method: "DELETE",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
        );
    }
}

/**
 * Get the SSE stream URL for workflow chat
 */
export function getWorkflowChatStreamUrl(workflowId: string): string {
    const token = getAuthToken();
    return `${API_BASE_URL}/workflows/${workflowId}/conversation/stream${token ? `?token=${token}` : ""}`;
}

// =============================================================================
// PERSONA DEFINITIONS
// =============================================================================

/**
 * Get all persona definitions
 */
export async function getPersonas(params?: PersonaDefinitionListParams): Promise<{
    success: boolean;
    data: PersonaDefinitionListResponse;
    error?: string;
}> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.set("category", params.category);
    if (params?.featured !== undefined) queryParams.set("featured", String(params.featured));
    if (params?.status) queryParams.set("status", params.status);
    if (params?.search) queryParams.set("search", params.search);
    if (params?.limit) queryParams.set("limit", String(params.limit));
    if (params?.offset) queryParams.set("offset", String(params.offset));

    const url = queryParams.toString()
        ? `${API_BASE_URL}/personas?${queryParams.toString()}`
        : `${API_BASE_URL}/personas`;

    const response = await apiFetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get personas grouped by category
 */
export async function getPersonasByCategory(): Promise<{
    success: boolean;
    data: Record<PersonaCategory, PersonaDefinitionSummary[]>;
    error?: string;
}> {
    const response = await apiFetch(`${API_BASE_URL}/personas/categories`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a specific persona by slug
 */
export async function getPersona(slug: string): Promise<{
    success: boolean;
    data: PersonaDefinition;
    error?: string;
}> {
    const response = await apiFetch(`${API_BASE_URL}/personas/${slug}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// =============================================================================
// PERSONA INSTANCES
// =============================================================================

/**
 * Create a new persona instance (launch a task)
 */
export async function createPersonaInstance(
    data: CreatePersonaInstanceRequest
): Promise<{ success: boolean; data: PersonaInstance; error?: string }> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/persona-instances`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get all persona instances for the current user
 */
export async function getPersonaInstances(params?: PersonaInstanceListParams): Promise<{
    success: boolean;
    data: PersonaInstanceListResponse;
    error?: string;
}> {
    const token = getAuthToken();

    const queryParams = new URLSearchParams();
    if (params?.status) {
        const statusValue = Array.isArray(params.status) ? params.status.join(",") : params.status;
        queryParams.set("status", statusValue);
    }
    if (params?.persona_definition_id) {
        queryParams.set("persona_definition_id", params.persona_definition_id);
    }
    if (params?.limit) queryParams.set("limit", String(params.limit));
    if (params?.offset) queryParams.set("offset", String(params.offset));

    const url = queryParams.toString()
        ? `${API_BASE_URL}/persona-instances?${queryParams.toString()}`
        : `${API_BASE_URL}/persona-instances`;

    const response = await apiFetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get persona instances dashboard (optimized for dashboard view)
 */
export async function getPersonaInstancesDashboard(): Promise<{
    success: boolean;
    data: PersonaInstanceDashboardResponse;
    error?: string;
}> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/persona-instances/dashboard`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get count of persona instances needing attention (for badge)
 */
export async function getPersonaInstancesCount(): Promise<{
    success: boolean;
    data: { count: number };
    error?: string;
}> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/persona-instances/count`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a specific persona instance
 */
export async function getPersonaInstance(id: string): Promise<{
    success: boolean;
    data: PersonaInstance & {
        persona: {
            name: string;
            slug: string;
            avatar_url: string | null;
            category: PersonaCategory;
        } | null;
    };
    error?: string;
}> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/persona-instances/${id}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Send a message to a running persona instance
 */
export async function sendPersonaInstanceMessage(
    id: string,
    content: string
): Promise<{
    success: boolean;
    data: { message: string; instance_id: string; content: string };
    error?: string;
}> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/persona-instances/${id}/message`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ content })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Cancel a running persona instance
 */
export async function cancelPersonaInstance(id: string): Promise<{
    success: boolean;
    data: PersonaInstance;
    error?: string;
}> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/persona-instances/${id}/cancel`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Mark a persona instance as user-completed (after reviewing deliverables)
 */
export async function completePersonaInstance(id: string): Promise<{
    success: boolean;
    data: PersonaInstance;
    error?: string;
}> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/persona-instances/${id}/complete`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Continue work on a completed persona instance with additional instructions
 */
export async function continuePersonaInstance(
    id: string,
    data: {
        additional_instructions: string;
        max_duration_hours?: number;
        max_cost_credits?: number;
    }
): Promise<{
    success: boolean;
    data: PersonaInstance;
    message: string;
}> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/persona-instances/${id}/continue`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Skip clarification for a persona instance and proceed to running
 */
export async function skipPersonaInstanceClarification(id: string): Promise<{
    success: boolean;
    data: PersonaInstance;
    message: string;
}> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/persona-instances/${id}/skip-clarification`, {
        method: "POST",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get connections granted to a persona instance
 */
export async function getPersonaInstanceConnections(id: string): Promise<{
    success: boolean;
    data: PersonaInstanceConnection[];
}> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/persona-instances/${id}/connections`, {
        method: "GET",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Grant a connection to a persona instance
 */
export async function grantPersonaInstanceConnection(
    id: string,
    connectionId: string,
    scopes?: string[]
): Promise<{
    success: boolean;
    data: PersonaInstanceConnection;
}> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/persona-instances/${id}/connections`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ connection_id: connectionId, scopes })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Revoke a connection from a persona instance
 */
export async function revokePersonaInstanceConnection(
    id: string,
    connectionId: string
): Promise<{
    success: boolean;
    message: string;
}> {
    const token = getAuthToken();

    const response = await apiFetch(
        `${API_BASE_URL}/persona-instances/${id}/connections/${connectionId}`,
        {
            method: "DELETE",
            headers: {
                ...(token && { Authorization: `Bearer ${token}` })
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// =============================================================================
// PERSONA INSTANCE DELIVERABLES
// =============================================================================

/**
 * Get all deliverables for a persona instance
 */
export async function getPersonaInstanceDeliverables(instanceId: string): Promise<{
    success: boolean;
    data: PersonaInstanceDeliverableSummary[];
}> {
    const token = getAuthToken();

    const response = await apiFetch(
        `${API_BASE_URL}/persona-instances/${instanceId}/deliverables`,
        {
            method: "GET",
            headers: {
                ...(token && { Authorization: `Bearer ${token}` })
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a specific deliverable with its full content
 */
export async function getPersonaInstanceDeliverable(
    instanceId: string,
    deliverableId: string
): Promise<{
    success: boolean;
    data: PersonaInstanceDeliverable;
}> {
    const token = getAuthToken();

    const response = await apiFetch(
        `${API_BASE_URL}/persona-instances/${instanceId}/deliverables/${deliverableId}`,
        {
            method: "GET",
            headers: {
                ...(token && { Authorization: `Bearer ${token}` })
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Download a deliverable as a file
 * Returns the URL for download or initiates direct download
 */
export async function downloadPersonaInstanceDeliverable(
    instanceId: string,
    deliverableId: string
): Promise<void> {
    const token = getAuthToken();

    const response = await apiFetch(
        `${API_BASE_URL}/persona-instances/${instanceId}/deliverables/${deliverableId}/download`,
        {
            method: "GET",
            headers: {
                ...(token && { Authorization: `Bearer ${token}` })
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Check if we got a redirect URL or direct content
    const contentDisposition = response.headers.get("Content-Disposition");
    if (contentDisposition) {
        // Direct download - create blob and trigger download
        const blob = await response.blob();
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        const filename = filenameMatch ? filenameMatch[1] : "deliverable";

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else {
        // Redirect - open in new tab
        const redirectUrl = response.url;
        window.open(redirectUrl, "_blank");
    }
}

/**
 * Delete a deliverable
 */
export async function deletePersonaInstanceDeliverable(
    instanceId: string,
    deliverableId: string
): Promise<{
    success: boolean;
    message: string;
}> {
    const token = getAuthToken();

    const response = await apiFetch(
        `${API_BASE_URL}/persona-instances/${instanceId}/deliverables/${deliverableId}`,
        {
            method: "DELETE",
            headers: {
                ...(token && { Authorization: `Bearer ${token}` })
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Delete a persona instance
 */
export async function deletePersonaInstance(id: string): Promise<void> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/persona-instances/${id}`, {
        method: "DELETE",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
}

// =============================================================================
// PERSONA TASK TEMPLATES
// =============================================================================

/**
 * Get all task templates for a persona
 */
export async function getPersonaTemplates(slug: string): Promise<{
    success: boolean;
    data: PersonaTaskTemplateListResponse;
}> {
    const token = getAuthToken();

    const response = await apiFetch(`${API_BASE_URL}/personas/${slug}/templates`, {
        method: "GET",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` })
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Generate a task description from a template with variables
 */
export async function generateFromTemplate(
    slug: string,
    templateId: string,
    variables: Record<string, string | number | boolean | string[]>
): Promise<{
    success: boolean;
    data: GenerateFromTemplateResponse;
}> {
    const token = getAuthToken();

    const response = await apiFetch(
        `${API_BASE_URL}/personas/${slug}/templates/${templateId}/generate`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` })
            },
            body: JSON.stringify({ variables })
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// Re-export persona types for components
export type {
    PersonaDefinition,
    PersonaDefinitionSummary,
    PersonaCategory,
    PersonaInstance,
    PersonaInstanceSummary,
    PersonaInstanceStatus,
    CreatePersonaInstanceRequest,
    PersonaInstanceDashboardResponse,
    PersonaInstanceMessage,
    PersonaInstanceDeliverable,
    PersonaInstanceDeliverableSummary,
    PersonaInputField,
    PersonaDeliverableSpec,
    PersonaEstimatedDuration,
    PersonaStructuredInputs,
    InputFieldType,
    InputFieldOption,
    DeliverableType,
    PersonaInstanceProgress,
    PersonaProgressStep,
    ProgressStepStatus,
    PersonaTaskTemplate,
    PersonaTaskTemplateSummary,
    PersonaTaskTemplateListResponse,
    GenerateFromTemplateResponse,
    PersonaConnectionRequirement,
    PersonaInstanceConnection
};
