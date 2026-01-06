/**
 * FlowMaestro SDK Types
 */

// Client configuration
export interface FlowMaestroClientOptions {
    /** API key for authentication (format: fm_live_xxx or fm_test_xxx) */
    apiKey: string;
    /** Base URL for the API (default: https://api.flowmaestro.io) */
    baseUrl?: string;
    /** Request timeout in milliseconds (default: 30000) */
    timeout?: number;
    /** Maximum number of retries for failed requests (default: 3) */
    maxRetries?: number;
    /** Custom headers to include with every request */
    headers?: Record<string, string>;
}

// Pagination
export interface PaginationParams {
    page?: number;
    per_page?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        per_page: number;
        total_count: number;
        has_more: boolean;
    };
    meta: ResponseMeta;
}

export interface ResponseMeta {
    request_id: string;
    timestamp: string;
}

export interface ApiResponse<T> {
    data: T;
    meta: ResponseMeta;
}

// Workflows
export interface Workflow {
    id: string;
    name: string;
    description: string | null;
    version: number;
    inputs: Record<string, WorkflowInput> | null;
    created_at: string;
    updated_at: string;
}

export interface WorkflowInput {
    type: string;
    label: string;
    required: boolean;
    description?: string;
}

export interface ExecuteWorkflowOptions {
    inputs?: Record<string, unknown>;
}

export interface ExecuteWorkflowResponse {
    execution_id: string;
    workflow_id: string;
    status: ExecutionStatus;
    inputs: Record<string, unknown>;
}

// Executions
export type ExecutionStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface Execution {
    id: string;
    workflow_id: string;
    status: ExecutionStatus;
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown> | null;
    error: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
}

export interface ListExecutionsOptions extends PaginationParams {
    workflow_id?: string;
    status?: ExecutionStatus;
}

export interface WaitForCompletionOptions {
    /** Polling interval in milliseconds (default: 1000) */
    pollInterval?: number;
    /** Maximum wait time in milliseconds (default: 300000 = 5 minutes) */
    timeout?: number;
}

// Execution Events (SSE)
export type ExecutionEventType =
    | "connected"
    | "execution:started"
    | "execution:progress"
    | "node:started"
    | "node:completed"
    | "node:failed"
    | "execution:completed"
    | "execution:failed"
    | "execution:cancelled";

export interface ExecutionEvent {
    type: ExecutionEventType;
    execution_id: string;
    status?: ExecutionStatus;
    outputs?: Record<string, unknown>;
    error?: string;
    node_id?: string;
    node_type?: string;
    progress?: number;
    message?: string;
    completed_at?: string;
}

// Agents
export interface Agent {
    id: string;
    name: string;
    description: string | null;
    system_prompt: string | null;
    model: string;
    created_at: string;
    updated_at: string;
}

export interface CreateThreadOptions {
    metadata?: Record<string, unknown>;
}

// Threads
export interface Thread {
    id: string;
    agent_id: string;
    status: ThreadStatus;
    metadata: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
}

export type ThreadStatus = "active" | "archived" | "deleted";

export interface ThreadMessage {
    id: string;
    thread_id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
}

export interface SendMessageOptions {
    content: string;
    /** Enable streaming response */
    stream?: boolean;
}

export interface SendMessageResponse {
    message_id: string;
    thread_id: string;
    status: "pending" | "processing" | "completed" | "failed";
}

// Thread Events (SSE)
export type ThreadEventType =
    | "connected"
    | "message:started"
    | "message:token"
    | "message:completed"
    | "message:failed";

export interface ThreadEvent {
    type: ThreadEventType;
    thread_id: string;
    message_id?: string;
    content?: string;
    token?: string;
    error?: string;
}

// Streaming callbacks
export interface StreamCallbacks<T> {
    onEvent?: (event: T) => void;
    onError?: (error: Error) => void;
    onClose?: () => void;
}

export interface MessageStreamCallbacks extends StreamCallbacks<ThreadEvent> {
    onToken?: (token: string) => void;
    onComplete?: (message: ThreadMessage) => void;
}

// Triggers
export interface Trigger {
    id: string;
    workflow_id: string;
    name: string;
    trigger_type: string;
    enabled: boolean;
    last_triggered_at: string | null;
    trigger_count: number;
    created_at: string;
    updated_at: string;
}

export interface ExecuteTriggerOptions {
    inputs?: Record<string, unknown>;
}

export interface ExecuteTriggerResponse {
    execution_id: string;
    workflow_id: string;
    trigger_id: string;
    status: ExecutionStatus;
    inputs: Record<string, unknown>;
}

// Knowledge Bases
export interface KnowledgeBase {
    id: string;
    name: string;
    description: string | null;
    embedding_model: string;
    document_count: number;
    chunk_count: number;
    created_at: string;
    updated_at: string;
}

export interface QueryKnowledgeBaseOptions {
    query: string;
    top_k?: number;
}

export interface KnowledgeBaseResult {
    chunk_id: string;
    document_id: string;
    content: string;
    similarity: number;
    metadata: Record<string, unknown>;
}

export interface QueryKnowledgeBaseResponse {
    results: KnowledgeBaseResult[];
    query: string;
    knowledge_base_id: string;
}

// Webhooks
export type WebhookEventType =
    | "execution.started"
    | "execution.completed"
    | "execution.failed"
    | "thread.message.created"
    | "thread.message.completed";

export interface Webhook {
    id: string;
    name: string;
    url: string;
    events: WebhookEventType[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateWebhookOptions {
    name: string;
    url: string;
    events: WebhookEventType[];
    headers?: Record<string, string>;
}

export interface TestWebhookResponse {
    success: boolean;
    status_code: number;
    response_time_ms: number;
    error?: string;
}

// API Error
export interface ApiErrorResponse {
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
    meta: ResponseMeta;
}
