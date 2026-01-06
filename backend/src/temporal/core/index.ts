/**
 * Core Module
 *
 * Consolidated exports for the temporal execution engine core functionality.
 * This module provides all shared types, utilities, and infrastructure.
 *
 * ============================================================================
 * WORKFLOW-SAFE EXPORTS (can be used in Temporal V8 sandbox)
 * ============================================================================
 * - Types (always safe - no runtime code)
 * - SpanType enum
 * - Constants: ACTIVITY_TIMEOUTS, RETRY_POLICIES, TASK_QUEUES, etc.
 * - Errors: all error classes
 * - Utils: interpolateVariables, deepClone, parseValue, etc.
 * - Context: createContext, storeNodeOutput, initializeQueue, etc.
 * - Builder: buildWorkflow, getWorkflowSummary, etc.
 * - Schemas: all Zod schemas
 * - createWorkflowLogger (console-based, no external deps)
 *
 * ============================================================================
 * ACTIVITY-ONLY EXPORTS (Node.js dependencies - NOT workflow-safe)
 * ============================================================================
 * - activityLogger, createActivityLogger (pino)
 * - createRuntimeLogger (pino)
 * - SnapshotRepository, snapshotRepository (database)
 * - NodeLogRepository, nodeLogRepository (database)
 * - SSEManager, sseManager, StreamSplitter (fastify/redis)
 * - Health checks: performHealthCheck, isAlive, isReady (database)
 * - HeartbeatManager, withHeartbeat (@temporalio/activity)
 * - llmCircuitBreakers (external state)
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
    // Base execution types
    BaseNodeConfig,
    ExecutionContext,
    NodeExecutorResult,
    NodeExecutionStatus,
    NodeExecutionState,
    ExecutionQueueState,
    // Context types
    ContextStorageConfig,
    ContextSnapshot,
    VariableResolution,
    LoopIterationState,
    ParallelBranchState,
    // Shared memory types
    SharedMemoryConfig,
    SharedMemoryState,
    SharedMemoryEntry,
    // Re-exports
    JsonObject,
    JsonValue
} from "./types";

export { SpanType } from "./types";

// ============================================================================
// CONTEXT
// ============================================================================

export {
    // Context functions
    createContext,
    storeNodeOutput,
    getNodeOutput,
    setVariable,
    getVariable,
    deleteVariable,
    resolveVariable,
    interpolateString,
    getExecutionContext,
    buildFinalOutputs,
    mergeContext,
    // Shared memory functions
    DEFAULT_SHARED_MEMORY_CONFIG,
    createSharedMemory,
    setSharedMemoryValue,
    getSharedMemoryValue,
    getSharedMemoryEntry,
    deleteSharedMemoryValue,
    appendSharedMemoryValue,
    getSharedMemoryKeys,
    searchSharedMemory,
    getSharedMemoryStats,
    // Shared memory serialization
    serializeSharedMemoryState,
    deserializeSharedMemoryState,
    type SerializedSharedMemoryState,
    // Queue functions
    initializeQueue,
    getReadyNodes,
    markExecuting,
    markCompleted,
    markFailed,
    markSkipped,
    markRetry,
    isExecutionComplete,
    canContinue,
    getExecutionSummary,
    getExecutionProgress,
    getNodeState,
    getNodesByStatus,
    resetNodeForIteration,
    resetNodesForIteration
} from "./services/context";

// Note: context functions return their results inline, no separate type exports needed

// ============================================================================
// STATE (SNAPSHOTS)
// ============================================================================

export type {
    // Snapshot types
    SnapshotType,
    SnapshotNodeState,
    SnapshotLoopState,
    SnapshotParallelState,
    SnapshotPauseContext,
    WorkflowSnapshot,
    CreateSnapshotOptions,
    LoadSnapshotOptions,
    SnapshotValidationResult,
    WorkflowSnapshotRecord
} from "./services/snapshot";

export {
    // Snapshot functions
    createSnapshot,
    validateSnapshot,
    serializeSnapshot,
    deserializeSnapshot,
    restoreQueueState,
    restoreContextSnapshot,
    restoreLoopStates,
    getSnapshotTypeDescription,
    // Snapshot repository
    SnapshotRepository,
    snapshotRepository
} from "./services/snapshot";

// ============================================================================
// EXECUTION LOGS
// ============================================================================

export type {
    // Logging types
    NodeLogStatus,
    NodeTokenUsage,
    NodeLogEntry,
    NodeLogRecord,
    NodeLogQueryOptions,
    NodeLogSummary,
    NodeLoggingConfig
} from "./services/execution-logs";

export {
    // Node log repository
    NodeLogRepository,
    nodeLogRepository
} from "./services/execution-logs";

// ============================================================================
// STREAMING
// ============================================================================

export type {
    // Event types
    ExecutionStreamEventType,
    BaseStreamEvent,
    ExecutionStartedEvent,
    ExecutionProgressEvent,
    ExecutionCompletedEvent,
    ExecutionFailedEvent,
    ExecutionPausedEvent,
    ExecutionResumedEvent,
    ExecutionCancelledEvent,
    NodeStartedEvent,
    NodeCompletedEvent,
    NodeFailedEvent,
    NodeSkippedEvent,
    NodeRetryingEvent,
    NodeTokenEvent,
    NodeStreamStartEvent,
    NodeStreamEndEvent,
    SnapshotCreatedEvent,
    VariableUpdatedEvent,
    KeepaliveEvent,
    StreamErrorEvent,
    ExecutionStreamEvent,
    // SSE types
    SSEManagerConfig,
    // Stream splitter types
    StreamToken,
    StreamConsumer,
    StreamMetadata,
    StreamSplitterConfig
} from "./services/streaming";

export {
    // Event helpers
    createBaseEvent,
    serializeEvent,
    parseEvent,
    // SSE Manager
    SSEManager,
    // Stream Splitter
    StreamSplitter,
    // SSE integration
    createSSEConsumer,
    createCaptureConsumer,
    // Singleton instances
    sseManager,
    streamSplitter
} from "./services/streaming";

// ============================================================================
// CONSTANTS
// ============================================================================

export {
    ACTIVITY_TIMEOUTS,
    RETRY_POLICIES,
    TASK_QUEUES,
    HEARTBEAT_INTERVALS,
    HEARTBEAT_TIMEOUTS
} from "./constants";

// ============================================================================
// ERRORS
// ============================================================================

export {
    TemporalActivityError,
    RateLimitError,
    ValidationError,
    ProviderError,
    ConfigurationError,
    TimeoutError,
    NotFoundError,
    CodeExecutionError,
    InterpolationError
} from "./errors";

// ============================================================================
// UTILS
// ============================================================================

export {
    interpolateVariables,
    interpolateWithObjectSupport,
    deepClone,
    resolveArrayPath,
    parseValue,
    evaluateCondition
} from "./utils";

export type { InterpolateOptions } from "./utils";

// ============================================================================
// SCHEMAS
// ============================================================================

export {
    // Base schemas
    OutputVariableSchema,
    VariableReferenceSchema,
    KeyValuePairSchema,
    // AI schemas
    LLMNodeConfigSchema,
    VisionNodeConfigSchema,
    AudioNodeConfigSchema,
    EmbeddingsNodeConfigSchema,
    RouterRouteSchema,
    RouterNodeConfigSchema,
    // Integration schemas
    HTTPNodeConfigSchema,
    CodeNodeConfigSchema,
    DatabaseNodeConfigSchema,
    FileOperationsNodeConfigSchema,
    IntegrationNodeConfigSchema,
    KnowledgeBaseQueryNodeConfigSchema,
    // Logic schemas
    ConditionalNodeConfigSchema,
    LoopNodeConfigSchema,
    SwitchCaseSchema,
    SwitchNodeConfigSchema,
    WaitNodeConfigSchema,
    // Data schemas
    TransformNodeConfigSchema,
    SharedMemoryNodeConfigSchema,
    OutputNodeConfigSchema,
    TemplateOutputNodeConfigSchema,
    // Validation functions
    validateConfig,
    validateOrThrow,
    NodeSchemaRegistry,
    getNodeSchema,
    validateNodeConfig
} from "./schemas";

export type {
    LLMNodeConfig,
    VisionNodeConfig,
    AudioNodeConfig,
    EmbeddingsNodeConfig,
    RouterNodeConfig,
    HTTPNodeConfig,
    CodeNodeConfig,
    DatabaseNodeConfig,
    FileOperationsNodeConfig,
    IntegrationNodeConfig,
    KnowledgeBaseQueryNodeConfig,
    ConditionalNodeConfig,
    LoopNodeConfig,
    SwitchNodeConfig,
    WaitNodeConfig,
    TransformNodeConfig,
    SharedMemoryNodeConfig,
    OutputNodeConfig,
    TemplateOutputNodeConfig,
    SchemaValidationResult
} from "./schemas";

// ============================================================================
// CIRCUIT BREAKERS
// ============================================================================

export {
    llmCircuitBreakers,
    getLLMCircuitBreaker,
    getLLMCircuitBreakerStatus
} from "./services/circuit-breakers";

export type { LLMProvider } from "./services/circuit-breakers";

// ============================================================================
// LOGGING
// ============================================================================

export {
    // Workflow logging (V8 sandbox)
    createWorkflowLogger,
    // Activity logging (pino-based)
    activityLogger,
    createActivityLogger,
    // Runtime logger
    createRuntimeLogger,
    getActivityBaseLogger
} from "./logger";

export type { WorkflowLogContext, WorkflowLogger, LogContext, ActivityLogger } from "./logger";

// ============================================================================
// HEALTH CHECKS
// ============================================================================

export {
    recordActivityCompletion,
    incrementExecuting,
    decrementExecuting,
    getWorkerMetrics,
    resetMetrics,
    performHealthCheck,
    isAlive,
    isReady
} from "./services/health";

export type { ComponentHealth, HealthCheckResult, WorkerMetrics } from "./services/health";

// ============================================================================
// HEARTBEAT
// ============================================================================

export {
    HeartbeatManager,
    createHeartbeatManager,
    sendHeartbeat,
    isCancelled,
    getCancellationSignal,
    withHeartbeat,
    createStreamingProgressCallback
} from "./services/heartbeat";

export type { HeartbeatProgress, HeartbeatOperations } from "./services/heartbeat";

// ============================================================================
// BUILDER
// ============================================================================

export type {
    // Edge types
    EdgeHandleType,
    TypedEdge,
    // Node types
    ExecutableNodeType,
    LoopContext,
    ExecutableNode,
    // Built workflow
    BuiltWorkflow,
    // Pipeline result types
    PathConstructorResult,
    LoopConstructorResult,
    NodeConstructorResult,
    EdgeConstructorResult,
    // Validation types
    BuildValidationError,
    BuildResult
} from "../activities/execution/types";

export {
    // Main builder
    buildWorkflow,
    validateBuiltWorkflow,
    getWorkflowSummary,
    // Stage 1: Path Constructor
    constructPaths,
    computeExecutionLevels,
    detectCycles,
    getMaxDepth,
    getNodesAtDepth,
    findTerminalNodes,
    topologicalSort,
    // Stage 2: Loop Constructor
    constructLoops,
    isLoopSentinel,
    getLoopNodeIdFromSentinel,
    // Stage 3: Node Constructor
    constructNodes,
    isExpandedBranch,
    getParallelNodeIdFromBranch,
    getBranchesForParallelNode,
    // Stage 4: Edge Constructor
    constructEdges,
    getEdgesFromSource,
    getEdgesToTarget,
    getEdgesByHandle,
    findBranchTarget,
    getHandleTypesFromSource
} from "../activities/execution/builder";
