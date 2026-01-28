// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Represents any value that can be safely serialized to JSON.
 * Use this instead of `any` when dealing with JSON-serializable data.
 */
export type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | { [key: string]: JsonValue };

/**
 * Represents a JSON object (key-value pairs).
 */
export type JsonObject = { [key: string]: JsonValue };

/**
 * Represents a JSON array.
 */
export type JsonArray = JsonValue[];

/**
 * Type for JSON Schema objects
 * JSON Schema is always an object with specific properties
 */
export interface JsonSchema {
    type?: string | string[];
    properties?: Record<string, JsonSchema>;
    items?: JsonSchema | JsonSchema[];
    required?: string[];
    additionalProperties?: boolean | JsonSchema;
    enum?: JsonValue[];
    const?: JsonValue;
    default?: JsonValue;
    description?: string;
    title?: string;
    $schema?: string;
    $ref?: string;
    anyOf?: JsonSchema[];
    oneOf?: JsonSchema[];
    allOf?: JsonSchema[];
    not?: JsonSchema;
    [key: string]:
        | JsonValue
        | JsonSchema
        | JsonSchema[]
        | Record<string, JsonSchema>
        | boolean
        | string[]
        | undefined;
}

/**
 * Type guard to check if a value is a valid JsonValue.
 */
export function isJsonValue(value: unknown): value is JsonValue {
    if (value === null) return true;
    if (typeof value === "string") return true;
    if (typeof value === "number") return isFinite(value);
    if (typeof value === "boolean") return true;
    if (Array.isArray(value)) return value.every(isJsonValue);
    if (typeof value === "object") {
        return Object.values(value).every(isJsonValue);
    }
    return false;
}

// ============================================================================
// WORKFLOW DSL TYPES
// ============================================================================

export interface WorkflowDefinition {
    id?: string;
    name: string;
    description?: string;
    version?: number;
    nodes: Record<string, WorkflowNode>;
    edges: WorkflowEdge[];
    entryPoint: string;
    settings?: WorkflowSettings;
}

export interface WorkflowNode {
    type: string;
    name: string;
    config: JsonObject;
    position: { x: number; y: number };
    style?: JsonObject; // React Flow node styles (width, height, etc.)
    onError?: ErrorHandlingConfig;
}

export interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
}

export interface WorkflowSettings {
    timeout?: number;
    maxConcurrentNodes?: number;
    enableCache?: boolean;
}

export interface ErrorHandlingConfig {
    strategy: "continue" | "fallback" | "goto" | "fail";
    fallbackValue?: JsonValue;
    gotoNode?: string;
}

// Execution Types
export type ExecutionStatus =
    | "pending"
    | "running"
    | "paused"
    | "completed"
    | "failed"
    | "cancelled";

/**
 * Node execution status - Single source of truth for all node states.
 *
 * State transitions:
 *   idle → pending → ready → executing → completed
 *                         ↘            ↘ failed
 *   pending → skipped (when branch not taken)
 */
export type NodeExecutionStatus =
    | "idle" // Initial state, not part of current execution
    | "pending" // Waiting for dependencies to complete
    | "ready" // Dependencies done, queued for execution
    | "executing" // Currently running
    | "completed" // Finished successfully
    | "failed" // Finished with error
    | "skipped"; // Skipped (e.g., conditional branch not taken)

export interface ExecutionPauseContext {
    reason: string;
    nodeId: string;
    nodeName?: string;
    pausedAt: number;
    resumeTrigger?: "manual" | "timeout" | "webhook" | "signal";
    timeoutMs?: number;
    // Data needed to collect and validate user response
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
    workflowId: string;
    status: ExecutionStatus;
    inputs?: JsonObject;
    outputs?: JsonObject;
    currentState?: JsonValue;
    pauseContext?: ExecutionPauseContext;
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
    createdAt: Date;
}

export interface ExecutionContext {
    executionId: string;
    workflowId: string;
    userId: string;
    variables: JsonObject;
    nodeStatus: Record<string, NodeExecutionStatus>;
    metadata: JsonObject;
}

// ============================================================================
// NODE TYPES
// ============================================================================

export interface NodeExecutionResult {
    success: boolean;
    output?: JsonValue;
    error?: string;
    metadata?: JsonObject;
}

export interface NodeMetadata {
    type: string;
    displayName: string;
    description: string;
    icon?: string;
    category: string;
    inputs: Record<string, NodeFieldSchema>;
    outputs: Record<string, NodeFieldSchema>;
    configForm: NodeConfigField[];
}

export interface NodeFieldSchema {
    type: "string" | "number" | "boolean" | "object" | "array";
    required?: boolean;
    description?: string;
}

export interface NodeConfigField {
    field: string;
    label: string;
    type: "text" | "textarea" | "number" | "dropdown" | "checkbox";
    placeholder?: string;
    required?: boolean;
    supportsVariables?: boolean;
    fetch?: string;
    options?: Array<{ label: string; value: string }>;
}

// ============================================================================
// FILES NODE TYPES
// ============================================================================

/**
 * Represents a chunk of text extracted from a file.
 * Used by the Files node for chunked output.
 */
export interface FileChunk {
    content: string;
    index: number;
    metadata: {
        fileName: string;
        fileType: string;
        start_char?: number;
        end_char?: number;
        sentence_count?: number;
    };
}

/**
 * Represents a processed file with extracted text and chunks.
 */
export interface ProcessedFile {
    fileName: string;
    fileType: string;
    gcsUri: string;
    chunks: FileChunk[];
    extractedText: string;
    metadata: {
        wordCount?: number;
        pages?: number;
        [key: string]: JsonValue | undefined;
    };
}

/**
 * Output structure from the Files node.
 * Provides multiple ways to access the extracted content.
 */
export interface FilesNodeOutput {
    /** Array of processed files with individual chunks */
    files: ProcessedFile[];
    /** Flattened array of all chunks from all files */
    allChunks: FileChunk[];
    /** All extracted text concatenated */
    combinedText: string;
    /** Number of files processed */
    fileCount: number;
    /** Total number of chunks across all files */
    totalChunkCount: number;
}

/**
 * Input data for a single file in workflow inputs.
 * Files are uploaded before workflow execution and passed as GCS URIs.
 */
export interface FileInputData {
    fileName: string;
    fileType: string;
    gcsUri: string;
}

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

export interface Integration {
    id: string;
    name: string;
    type: string;
    config: JsonObject;
    credentials: JsonObject;
    userId: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IntegrationConfig {
    name: string;
    displayName: string;
    description: string;
    icon: string;
    version: string;
    author: string;
    authType: "api-key" | "oauth2" | "basic" | "none";
    authConfig?: {
        oauth?: {
            authUrl: string;
            tokenUrl: string;
            scopes: string[];
        };
        apiKey?: {
            headerName: string;
            valuePrefix?: string;
        };
    };
    nodeTypes: NodeMetadata[];
    configSchema: JsonObject;
}

// ============================================================================
// API TYPES
// ============================================================================

export interface ApiResponse<T = JsonValue> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T = JsonValue> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

// ============================================================================
// WEBSOCKET EVENT TYPES
// ============================================================================

export type WebSocketEventType =
    | "connection:established"
    | "execution:started"
    | "execution:progress"
    | "execution:paused"
    | "execution:resumed"
    | "execution:completed"
    | "execution:failed"
    | "node:started"
    | "node:completed"
    | "node:failed"
    | "node:retry"
    | "node:stream"
    | "user:input:required"
    | "user:input:response"
    | "kb:document:processing"
    | "kb:document:completed"
    | "kb:document:failed"
    | "agent:execution:started"
    | "agent:message:new"
    | "agent:thinking"
    | "agent:token"
    | "agent:tool:call:started"
    | "agent:tool:call:completed"
    | "agent:tool:call:failed"
    | "agent:execution:completed"
    | "agent:execution:failed";

/**
 * Base WebSocket event interface.
 * Use discriminated unions for specific event types.
 */
export interface BaseWebSocketEvent {
    type: WebSocketEventType;
    timestamp: number;
}

/**
 * Specific WebSocket event types with proper payloads.
 * Using intersection types to allow additional properties while maintaining type safety.
 */
export type WebSocketEvent =
    | ({ type: "connection:established"; timestamp: number; userId: string } & JsonObject)
    | ({
          type: "execution:started";
          timestamp: number;
          executionId: string;
          workflowId?: string;
          workflowName?: string;
          totalNodes?: number;
      } & JsonObject)
    | ({
          type: "execution:progress";
          timestamp: number;
          executionId: string;
          progress?: number;
          completed?: number;
          total?: number;
          percentage?: number;
          currentNode?: string;
      } & JsonObject)
    | ({
          type: "execution:completed";
          timestamp: number;
          executionId: string;
          outputs?: JsonObject;
          duration?: number;
          status?: string;
      } & JsonObject)
    | ({
          type: "execution:failed";
          timestamp: number;
          executionId: string;
          error: string;
          failedNode?: string;
          failedNodeId?: string;
          status?: string;
      } & JsonObject)
    | ({
          type: "execution:paused";
          timestamp: number;
          executionId: string;
          status?: string;
          reason?: string;
          pausedAtNodeId?: string;
          pausedAtNodeName?: string;
          pauseContext?: {
              prompt?: string;
              description?: string;
              variableName: string;
              inputType: "text" | "number" | "boolean" | "json";
              placeholder?: string;
              validation?: JsonObject;
              required?: boolean;
          };
      } & JsonObject)
    | ({
          type: "execution:resumed";
          timestamp: number;
          executionId: string;
          status?: string;
          variableName?: string;
          response?: JsonValue;
      } & JsonObject)
    | ({
          type: "node:started";
          timestamp: number;
          executionId: string;
          nodeId: string;
          nodeName?: string;
          nodeType?: string;
      } & JsonObject)
    | ({
          type: "node:completed";
          timestamp: number;
          executionId: string;
          nodeId: string;
          output?: JsonValue;
          duration?: number;
          metadata?: JsonObject;
      } & JsonObject)
    | ({
          type: "node:failed";
          timestamp: number;
          executionId: string;
          nodeId: string;
          error: string;
          willRetry?: boolean;
      } & JsonObject)
    | ({
          type: "node:retry";
          timestamp: number;
          executionId: string;
          nodeId: string;
          attempt: number;
          maxAttempts: number;
      } & JsonObject)
    | ({
          type: "node:stream";
          timestamp: number;
          executionId: string;
          nodeId: string;
          chunk: string;
          isComplete: boolean;
      } & JsonObject)
    | ({
          type: "user:input:required";
          timestamp: number;
          executionId: string;
          nodeId: string;
          prompt: string;
          inputType: string;
      } & JsonObject)
    | ({
          type: "user:input:response";
          timestamp: number;
          executionId: string;
          nodeId: string;
          response: JsonValue;
      } & JsonObject)
    | ({
          type: "kb:document:processing";
          timestamp: number;
          documentId: string;
          fileName: string;
          progress: number;
      } & JsonObject)
    | ({
          type: "kb:document:completed";
          timestamp: number;
          documentId: string;
          fileName: string;
          chunksCreated: number;
      } & JsonObject)
    | ({
          type: "kb:document:failed";
          timestamp: number;
          documentId: string;
          fileName: string;
          error: string;
      } & JsonObject)
    | ({
          type: "agent:execution:started";
          timestamp: number;
          executionId: string;
          agentId: string;
          agentName: string;
      } & JsonObject)
    | ({
          type: "agent:message:new";
          timestamp: number;
          executionId: string;
          message: JsonObject;
      } & JsonObject)
    | ({
          type: "agent:thinking";
          timestamp: number;
          executionId: string;
      } & JsonObject)
    | ({
          type: "agent:tool:call:started";
          timestamp: number;
          executionId: string;
          toolName: string;
          arguments: JsonObject;
      } & JsonObject)
    | ({
          type: "agent:tool:call:completed";
          timestamp: number;
          executionId: string;
          toolName: string;
          result: JsonObject;
      } & JsonObject)
    | ({
          type: "agent:tool:call:failed";
          timestamp: number;
          executionId: string;
          toolName: string;
          error: string;
      } & JsonObject)
    | ({
          type: "agent:execution:completed";
          timestamp: number;
          executionId: string;
          finalMessage: string;
          iterations: number;
      } & JsonObject)
    | ({
          type: "agent:execution:failed";
          timestamp: number;
          executionId: string;
          error: string;
      } & JsonObject);
