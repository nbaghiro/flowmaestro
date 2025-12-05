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
    CopyAgentTemplateResponse
} from "@flowmaestro/shared";

// Re-export types for use in components
export type { JsonObject };

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

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

    const response = await fetch(`${API_BASE_URL}/api/workflows/execute`, {
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
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
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
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
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
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
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
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
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
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
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

    const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
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

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
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

/**
 * Get list of workflows for current user
 */
export async function getWorkflows(limit = 50, offset = 0) {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/workflows?limit=${limit}&offset=${offset}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/workflows/${workflowId}`, {
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
                    inputVariable: "userInput"
                },
                position: { x: 100, y: 200 }
            },
            [llmNodeId]: {
                type: "llm",
                name: "LLM",
                config: {
                    prompt: "{{userInput}}",
                    outputVariable: "llmResponse"
                },
                position: { x: 400, y: 200 }
            },
            [outputNodeId]: {
                type: "output",
                name: "Output",
                config: {
                    outputVariable: "llmResponse"
                },
                position: { x: 700, y: 200 }
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

    const response = await fetch(`${API_BASE_URL}/api/workflows`, {
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

    const response = await fetch(`${API_BASE_URL}/api/workflows/${workflowId}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/workflows/${workflowId}`, {
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

// ===== Trigger API Functions =====

/**
 * Create a new trigger for a workflow
 */
export async function createTrigger(
    input: CreateTriggerInput
): Promise<{ success: boolean; data: WorkflowTrigger; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/triggers`, {
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

    const response = await fetch(`${API_BASE_URL}/api/triggers?workflowId=${workflowId}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/triggers/${triggerId}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/triggers/${triggerId}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/triggers/${triggerId}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/triggers/${triggerId}/execute`, {
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
    return `${API_BASE_URL}/api/webhooks/${triggerId}`;
}

// ===== Execution API Functions =====

export interface Execution {
    id: string;
    workflow_id: string;
    status: "pending" | "running" | "completed" | "failed" | "cancelled";
    inputs: JsonObject | null;
    outputs: JsonObject | null;
    current_state: JsonValue | null;
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
        status?: "pending" | "running" | "completed" | "failed" | "cancelled";
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

    const response = await fetch(
        `${API_BASE_URL}/api/executions${queryParams.toString() ? `?${queryParams.toString()}` : ""}`,
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

    const response = await fetch(`${API_BASE_URL}/api/executions/${executionId}`, {
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
 * Submit user input to a running workflow execution
 */
export async function submitUserInput(
    executionId: string,
    userResponse: string,
    nodeId?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/executions/${executionId}/submit-input`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
            userResponse,
            nodeId
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
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
    };
    capabilities: JsonObject;
    last_tested_at: string | null;
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

    const response = await fetch(`${API_BASE_URL}/api/connections`, {
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

    const response = await fetch(
        `${API_BASE_URL}/api/connections${queryParams.toString() ? `?${queryParams.toString()}` : ""}`,
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

    const response = await fetch(`${API_BASE_URL}/api/connections/${connectionId}`, {
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
 * Test a connection without saving it first
 */
export async function testConnectionBeforeSave(input: CreateConnectionInput): Promise<{
    success: boolean;
    data: { test_result: JsonValue; connection_valid: boolean };
    error?: string;
}> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/connections/test`, {
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
 * Test an existing connection
 */
export async function testConnection(connectionId: string): Promise<{
    success: boolean;
    data: { connection_id: string; test_result: JsonValue };
    error?: string;
}> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/connections/${connectionId}/test`, {
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
 * Update a connection
 */
export async function updateConnection(
    connectionId: string,
    input: Partial<CreateConnectionInput>
): Promise<{ success: boolean; data: Connection; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/connections/${connectionId}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/connections/${connectionId}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/connections/${connectionId}/mcp-tools`, {
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

    const response = await fetch(`${API_BASE_URL}/api/workflows/generate`, {
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
}

export async function chatWorkflow(
    request: ChatWorkflowRequest
): Promise<{ success: boolean; data: { executionId: string }; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/workflows/chat`, {
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
 * Stream chat response via Server-Sent Events
 */
export function streamChatResponse(
    executionId: string,
    callbacks: {
        onToken: (token: string) => void;
        onComplete: (data: ChatWorkflowResponse) => void;
        onError: (error: string) => void;
    }
): () => void {
    const token = getAuthToken();
    const url = new URL(`${API_BASE_URL}/api/workflows/chat-stream/${executionId}`);

    // EventSource doesn't support custom headers, so pass token as query param
    if (token) {
        url.searchParams.set("token", token);
    }

    const eventSource = new EventSource(url.toString());

    eventSource.addEventListener("connected", (event) => {
        console.log("[SSE] Connected:", event.data);
    });

    eventSource.addEventListener("token", (event) => {
        const data = JSON.parse(event.data);
        callbacks.onToken(data.token);
    });

    eventSource.addEventListener("complete", (event) => {
        const data = JSON.parse(event.data);
        callbacks.onComplete(data as ChatWorkflowResponse);
        eventSource.close();
    });

    eventSource.addEventListener("error", (event) => {
        try {
            const data = JSON.parse((event as MessageEvent).data);
            callbacks.onError(data.message);
        } catch {
            callbacks.onError("Connection error");
        }
        eventSource.close();
    });

    eventSource.onerror = () => {
        callbacks.onError("Connection lost");
        eventSource.close();
    };

    // Return cleanup function
    return () => {
        eventSource.close();
    };
}

// ===== Agent API Functions =====

export interface Tool {
    id: string;
    name: string;
    description: string;
    type: "workflow" | "function" | "knowledge_base" | "mcp";
    schema: JsonObject;
    config: ToolConfig;
}

export interface ToolConfig {
    workflowId?: string;
    functionName?: string;
    knowledgeBaseId?: string;
    connectionId?: string; // For MCP tools - references the connection
    provider?: string; // For MCP tools - provider name for display
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
 * Response from GET /api/connections/:id/mcp-tools
 */
export interface ConnectionMCPToolsResponse {
    connectionId: string;
    provider: string;
    connectionName: string;
    tools: MCPTool[];
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
    provider: "openai" | "anthropic" | "google" | "cohere" | "huggingface";
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
    provider: "openai" | "anthropic" | "google" | "cohere" | "huggingface";
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
    provider?: "openai" | "anthropic" | "google" | "cohere" | "huggingface";
    connection_id?: string | null;
    system_prompt?: string;
    temperature?: number;
    max_tokens?: number;
    max_iterations?: number;
    available_tools?: Tool[];
    memory_config?: MemoryConfig;
}

// Thread types
export interface Thread {
    id: string;
    user_id: string;
    agent_id: string;
    title: string | null;
    status: "active" | "archived" | "deleted";
    metadata: JsonObject;
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

    const response = await fetch(`${API_BASE_URL}/api/agents`, {
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
export async function getAgents(): Promise<{
    success: boolean;
    data: { agents: Agent[]; total: number };
    error?: string;
}> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/agents`, {
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

    const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}/execute`, {
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

    const response = await fetch(
        `${API_BASE_URL}/api/agents/${agentId}/executions/${executionId}/message`,
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
 * Connect to agent execution SSE stream for real-time token streaming
 */
export function streamAgentExecution(
    agentId: string,
    executionId: string,
    callbacks: {
        onToken?: (token: string) => void;
        onMessage?: (message: ThreadMessage) => void;
        onToolCallStarted?: (data: { toolName: string; arguments: JsonObject }) => void;
        onToolCallCompleted?: (data: { toolName: string; result: JsonObject }) => void;
        onToolCallFailed?: (data: { toolName: string; error: string }) => void;
        onCompleted?: (data: { finalMessage: string; iterations: number }) => void;
        onError?: (error: string) => void;
        onConnected?: () => void;
    }
): () => void {
    const token = getAuthToken();
    if (!token) {
        callbacks.onError?.("Authentication required");
        return () => {}; // Return no-op cleanup function
    }

    // EventSource doesn't support custom headers, so we pass token as query param
    const url = `${API_BASE_URL}/api/agents/${agentId}/executions/${executionId}/stream?token=${encodeURIComponent(token)}`;

    const eventSource = new EventSource(url, {
        withCredentials: true
    });

    eventSource.addEventListener("connected", () => {
        callbacks.onConnected?.();
    });

    eventSource.addEventListener("token", (event) => {
        try {
            const data = JSON.parse(event.data) as { token: string; executionId: string };
            if (data.executionId === executionId) {
                callbacks.onToken?.(data.token);
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("message", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                message: ThreadMessage;
                executionId: string;
            };
            if (data.executionId === executionId && data.message) {
                callbacks.onMessage?.(data.message);
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("tool_call_started", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                toolName: string;
                arguments: JsonObject;
                executionId: string;
            };
            if (data.executionId === executionId) {
                callbacks.onToolCallStarted?.({
                    toolName: data.toolName,
                    arguments: data.arguments
                });
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("tool_call_completed", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                toolName: string;
                result: JsonObject;
                executionId: string;
            };
            if (data.executionId === executionId) {
                callbacks.onToolCallCompleted?.({
                    toolName: data.toolName,
                    result: data.result
                });
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("tool_call_failed", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                toolName: string;
                error: string;
                executionId: string;
            };
            if (data.executionId === executionId) {
                callbacks.onToolCallFailed?.({
                    toolName: data.toolName,
                    error: data.error
                });
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("completed", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                finalMessage: string;
                iterations: number;
                executionId: string;
            };
            if (data.executionId === executionId) {
                callbacks.onCompleted?.({
                    finalMessage: data.finalMessage,
                    iterations: data.iterations
                });
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("error", (event) => {
        try {
            const data = JSON.parse((event as MessageEvent).data) as {
                error: string;
                executionId: string;
            };
            if (data.executionId === executionId) {
                callbacks.onError?.(data.error);
            }
        } catch {
            // Generic error
            callbacks.onError?.("Stream connection error");
        }
    });

    // Track if we've received a completed event
    let completedReceived = false;

    // Override the completed handler to mark it as received
    const originalOnCompleted = callbacks.onCompleted;
    callbacks.onCompleted = (data) => {
        completedReceived = true;
        originalOnCompleted?.(data);
    };

    eventSource.onerror = () => {
        if (eventSource.readyState === EventSource.CLOSED) {
            // If stream closed without completed event, treat it as completion
            // This handles cases where the stream closes before the completed event arrives
            if (!completedReceived) {
                // Small delay to allow any pending completed event to arrive
                setTimeout(() => {
                    if (!completedReceived) {
                        originalOnCompleted?.({
                            finalMessage: "",
                            iterations: 0
                        });
                    }
                }, 1000);
            }
        } else {
            callbacks.onError?.("Stream connection failed");
        }
    };

    // Return cleanup function
    return () => {
        eventSource.close();
    };
}

/**
 * Get agent execution details
 */
export async function getAgentExecution(
    agentId: string,
    executionId: string
): Promise<{ success: boolean; data: AgentExecution; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(
        `${API_BASE_URL}/api/agents/${agentId}/executions/${executionId}`,
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
 * Add a tool to an agent
 */
export interface AddToolRequest {
    type: "workflow" | "function" | "knowledge_base" | "mcp";
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

    const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}/tools`, {
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
 * Remove a tool from an agent
 */
export async function removeAgentTool(
    agentId: string,
    toolId: string
): Promise<{ success: boolean; data: { agent: Agent }; error?: string }> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}/tools/${toolId}`, {
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

    const url = `${API_BASE_URL}/api/threads${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await fetch(url, {
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
    const url = `${API_BASE_URL}/api/threads/${threadId}${includeStats ? "?include_stats=true" : ""}`;

    const response = await fetch(url, {
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
    const url = `${API_BASE_URL}/api/threads/${threadId}/messages`;

    const response = await fetch(url, {
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

    const response = await fetch(`${API_BASE_URL}/api/threads`, {
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

    const response = await fetch(`${API_BASE_URL}/api/threads/${threadId}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/threads/${threadId}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/threads/${threadId}/archive`, {
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

    const response = await fetch(`${API_BASE_URL}/api/threads/${threadId}/unarchive`, {
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
export async function getKnowledgeBases(): Promise<ApiResponse<KnowledgeBase[]>> {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases`, {
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

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${id}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases`, {
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

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${id}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${id}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${id}/stats`, {
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

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${id}/documents`, {
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

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${id}/documents/upload`, {
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

    const response = await fetch(
        `${API_BASE_URL}/api/knowledge-bases/${kbId}/documents/${docId}/download`,
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

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${id}/documents/url`, {
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

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${id}/query`, {
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

    const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${kbId}/documents/${docId}`, {
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

    const response = await fetch(
        `${API_BASE_URL}/api/knowledge-bases/${kbId}/documents/${docId}/reprocess`,
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

    const response = await fetch(`${API_BASE_URL}/api/integrations/providers`, {
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
 */
export async function getProviderOperations(provider: string): Promise<{
    success: boolean;
    data: { provider: string; operations: OperationSummary[] };
    error?: string;
}> {
    const token = getAuthToken();

    const response = await fetch(
        `${API_BASE_URL}/api/integrations/providers/${provider}/operations`,
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

    const response = await fetch(`${API_BASE_URL}/api/analytics/overview${queryParams}`, {
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

    const url = `${API_BASE_URL}/api/analytics/daily${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await fetch(url, {
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

    const url = `${API_BASE_URL}/api/analytics/models${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await fetch(url, {
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

    const response = await fetch(`${API_BASE_URL}/api/checkpoints/workflow/${workflowId}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/checkpoints/${workflowId}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/checkpoints/restore/${checkpointId}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/checkpoints/${checkpointId}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/checkpoints/rename/${id}`, {
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
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.offset) queryParams.set("offset", params.offset.toString());

    const url = `${API_BASE_URL}/api/templates${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await fetch(url, {
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
    const response = await fetch(`${API_BASE_URL}/api/templates/categories`, {
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
    const response = await fetch(`${API_BASE_URL}/api/templates/${templateId}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/templates/${templateId}/copy`, {
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

    const url = `${API_BASE_URL}/api/agent-templates${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await fetch(url, {
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
    const response = await fetch(`${API_BASE_URL}/api/agent-templates/categories`, {
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
    const response = await fetch(`${API_BASE_URL}/api/agent-templates/${templateId}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/agent-templates/${templateId}/copy`, {
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
