/**
 * Temporal Constants
 *
 * Configuration constants for activities, retries, task queues, and heartbeats.
 */

// ============================================================================
// ACTIVITY TIMEOUTS
// ============================================================================

/**
 * Activity timeout configurations.
 * Use these instead of hardcoding timeout values in workflow definitions.
 */
export const ACTIVITY_TIMEOUTS = {
    /** For long-running operations like LLM calls, document processing */
    LONG_RUNNING: "10 minutes",
    /** For standard operations like HTTP requests, database queries */
    STANDARD: "2 minutes",
    /** For quick operations like validation, simple transforms */
    VALIDATION: "30 seconds",
    /** For fire-and-forget operations like event emissions */
    EVENTS: "5 seconds"
} as const;

// ============================================================================
// RETRY POLICIES
// ============================================================================

/**
 * Retry policy configurations for different activity types.
 */
export const RETRY_POLICIES = {
    /** Default retry policy for most activities */
    DEFAULT: {
        maximumAttempts: 3,
        backoffCoefficient: 2
    },
    /** Retry policy for LLM provider calls with rate limiting */
    LLM: {
        maximumAttempts: 3,
        initialInterval: "1s",
        maximumInterval: "10s",
        backoffCoefficient: 2
    },
    /** Retry policy for HTTP requests to external services */
    HTTP: {
        maximumAttempts: 3,
        initialInterval: "500ms",
        maximumInterval: "5s",
        backoffCoefficient: 2
    },
    /** No retry - for deterministic operations like validation */
    NO_RETRY: {
        maximumAttempts: 1
    }
} as const;

// ============================================================================
// TASK QUEUES
// ============================================================================

/**
 * Task queue names.
 * Separate queues allow for:
 * - Priority-based processing (urgent vs background)
 * - Resource isolation between workflow types
 * - Independent scaling of different workload types
 */
export const TASK_QUEUES = {
    /** Main orchestrator queue for workflow executions */
    ORCHESTRATOR: "flowmaestro-orchestrator",
    /** Heavy document processing (PDF parsing, embeddings) */
    DOCUMENT_PROCESSING: "flowmaestro-documents",
    /** Agent workflows (LLM calls, tool execution) */
    AGENTS: "flowmaestro-agents"
} as const;

// ============================================================================
// HEARTBEAT CONFIGURATION
// ============================================================================

/**
 * Heartbeat intervals for long-running activities.
 */
export const HEARTBEAT_INTERVALS = {
    /** Default heartbeat interval */
    DEFAULT: 30000, // 30 seconds
    /** Shorter interval for operations with progress tracking */
    FREQUENT: 10000, // 10 seconds
    /** For streaming operations (LLM streaming, file downloads) */
    STREAMING: 5000 // 5 seconds
} as const;

/**
 * Heartbeat timeout configurations (how long before Temporal considers activity dead).
 * Should be 2-3x the heartbeat interval.
 */
export const HEARTBEAT_TIMEOUTS = {
    /** Default timeout - activity should heartbeat at least every 60s */
    DEFAULT: "60 seconds",
    /** For streaming operations */
    STREAMING: "15 seconds",
    /** For long-running operations with progress tracking */
    LONG_RUNNING: "90 seconds"
} as const;
