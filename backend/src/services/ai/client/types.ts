/**
 * Core types for the Unified AI SDK
 */

// ============================================================================
// PROVIDER TYPES
// ============================================================================

/**
 * Supported AI providers
 */
export type AIProvider =
    | "openai"
    | "anthropic"
    | "google"
    | "cohere"
    | "huggingface"
    | "replicate"
    | "stabilityai"
    | "fal"
    | "runway"
    | "luma"
    | "elevenlabs";

/**
 * Configuration for a specific provider
 */
export interface ProviderConfig {
    /** API key for direct authentication */
    apiKey?: string;
    /** Base URL override for the provider API */
    baseUrl?: string;
    /** Default model to use for this provider */
    defaultModel?: string;
    /** Provider-specific options */
    options?: Record<string, unknown>;
}

// ============================================================================
// AUTH TYPES
// ============================================================================

/**
 * Authentication resolver function type
 * Used for dynamic API key resolution from connection IDs
 * Returns the API key, or null to fall back to provider config / env vars
 */
export type AuthResolver = (provider: AIProvider, connectionId?: string) => Promise<string | null>;

// ============================================================================
// LOGGING TYPES
// ============================================================================

/**
 * Logging interface for observability
 */
export interface AILogger {
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, error?: Error, context?: Record<string, unknown>): void;
}

// ============================================================================
// RETRY TYPES
// ============================================================================

/**
 * Retry configuration
 */
export interface RetryConfig {
    /** Maximum number of retry attempts */
    maxRetries: number;
    /** Initial delay in milliseconds */
    initialDelayMs: number;
    /** Maximum delay in milliseconds */
    maxDelayMs: number;
    /** Backoff multiplier */
    backoffMultiplier: number;
    /** HTTP status codes to retry on */
    retryableStatuses: number[];
}

// ============================================================================
// POLLING TYPES
// ============================================================================

/**
 * Polling configuration for async operations
 */
export interface PollConfig {
    /** Maximum number of polling attempts */
    maxAttempts: number;
    /** Initial polling interval in milliseconds */
    intervalMs: number;
    /** Backoff multiplier for polling interval */
    backoffMultiplier: number;
    /** Maximum polling interval in milliseconds */
    maxIntervalMs: number;
}

/**
 * Status of a polling operation
 */
export type PollStatus = "pending" | "processing" | "completed" | "failed";

/**
 * Result of a poll check
 */
export interface PollResult<T> {
    status: PollStatus;
    progress?: number;
    result?: T;
    error?: string;
}

// ============================================================================
// CLIENT CONFIG
// ============================================================================

/**
 * Main client configuration
 */
export interface AIClientConfig {
    /** Provider-specific configurations */
    providers?: Partial<Record<AIProvider, ProviderConfig>>;

    /** Custom auth resolver for multi-tenant scenarios */
    authResolver?: AuthResolver;

    /** Default retry configuration */
    retry?: Partial<RetryConfig>;

    /** Default polling configuration */
    polling?: Partial<PollConfig>;

    /** Custom logger implementation */
    logger?: AILogger;

    /** Request timeout in milliseconds */
    timeoutMs?: number;

    /** Enable detailed logging */
    debug?: boolean;
}

// ============================================================================
// COMMON RESPONSE TYPES
// ============================================================================

/**
 * Token usage information
 */
export interface TokenUsage {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    /** Tokens used for extended thinking (if enabled) */
    thinkingTokens?: number;
}

/**
 * Base response metadata
 */
export interface ResponseMetadata {
    /** Request ID for tracing */
    requestId?: string;
    /** Processing time in milliseconds */
    processingTimeMs: number;
    /** Provider used */
    provider: AIProvider;
    /** Model used */
    model: string;
    /** Token usage if available */
    usage?: TokenUsage;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Provider-specific error details
 */
export interface ProviderErrorDetails {
    provider: AIProvider;
    statusCode?: number;
    errorCode?: string;
    errorType?: string;
    retryable: boolean;
    retryAfterMs?: number;
}

// ============================================================================
// MESSAGE TYPES (for chat/text completion)
// ============================================================================

/**
 * Message role in a conversation
 */
export type MessageRole = "system" | "user" | "assistant";

/**
 * Single message in a conversation
 */
export interface Message {
    role: MessageRole;
    content: string;
}

// ============================================================================
// MEDIA TYPES
// ============================================================================

/**
 * Image size (provider-specific support)
 */
export type ImageSize = "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792";

/**
 * Aspect ratio (for providers that use it)
 */
export type AspectRatio = "1:1" | "16:9" | "9:16" | "21:9" | "9:21" | "4:3" | "3:4" | "3:2" | "2:3";

/**
 * Image quality option
 */
export type ImageQuality = "standard" | "hd";

/**
 * Image style option (DALL-E)
 */
export type ImageStyle = "vivid" | "natural";

/**
 * Image output format
 */
export type ImageOutputFormat = "url" | "base64";

/**
 * Image operation type
 */
export type ImageOperation =
    | "generate"
    | "inpaint"
    | "outpaint"
    | "upscale"
    | "removeBackground"
    | "styleTransfer";

/**
 * Video output format
 */
export type VideoOutputFormat = "url" | "base64";

/**
 * Audio output format
 */
export type AudioFormat = "mp3" | "wav" | "opus" | "aac" | "flac";

/**
 * Vision detail level
 */
export type VisionDetail = "low" | "high" | "auto";

// ============================================================================
// EMBEDDING TYPES
// ============================================================================

/**
 * Task type for embeddings (affects optimization)
 */
export type EmbeddingTaskType =
    | "search_document"
    | "search_query"
    | "classification"
    | "clustering";

/**
 * Truncation strategy for long inputs
 */
export type TruncationStrategy = "start" | "end" | "none";
