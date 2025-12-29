/**
 * Temporal Error Classes
 *
 * Custom error types for Temporal activities with retry control.
 */

// ============================================================================
// BASE ERROR
// ============================================================================

/**
 * Base error class for all Temporal activity errors.
 */
export class TemporalActivityError extends Error {
    constructor(
        message: string,
        public readonly retryable: boolean = false
    ) {
        super(message);
        this.name = "TemporalActivityError";
    }
}

// ============================================================================
// PROVIDER ERRORS
// ============================================================================

/**
 * Error thrown when an LLM provider rate limits the request.
 */
export class RateLimitError extends TemporalActivityError {
    constructor(
        public readonly provider: string,
        public readonly retryAfter?: number
    ) {
        super(
            `Rate limited by ${provider}${retryAfter ? ` (retry after ${retryAfter}s)` : ""}`,
            true
        );
        this.name = "RateLimitError";
    }
}

/**
 * Error thrown when an external provider (LLM, API, etc.) returns an error.
 */
export class ProviderError extends TemporalActivityError {
    constructor(
        public readonly provider: string,
        public readonly statusCode: number,
        message: string
    ) {
        const retryable = [429, 500, 502, 503, 529].includes(statusCode);
        super(`${provider} error (${statusCode}): ${message}`, retryable);
        this.name = "ProviderError";
    }
}

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

/**
 * Error thrown when input validation fails.
 */
export class ValidationError extends TemporalActivityError {
    constructor(
        message: string,
        public readonly field?: string,
        public readonly details?: Record<string, unknown>
    ) {
        super(field ? `Validation error in '${field}': ${message}` : message, false);
        this.name = "ValidationError";
    }
}

/**
 * Error thrown when variable interpolation fails.
 */
export class InterpolationError extends TemporalActivityError {
    constructor(
        message: string,
        public readonly variablePath?: string
    ) {
        super(
            variablePath ? `Interpolation error for '${variablePath}': ${message}` : message,
            false
        );
        this.name = "InterpolationError";
    }
}

// ============================================================================
// CONFIGURATION ERRORS
// ============================================================================

/**
 * Error thrown when a required configuration is missing.
 */
export class ConfigurationError extends TemporalActivityError {
    constructor(
        message: string,
        public readonly configKey?: string
    ) {
        super(configKey ? `Configuration error for '${configKey}': ${message}` : message, false);
        this.name = "ConfigurationError";
    }
}

// ============================================================================
// RESOURCE ERRORS
// ============================================================================

/**
 * Error thrown when a required resource is not found.
 */
export class NotFoundError extends TemporalActivityError {
    constructor(resource: string, identifier?: string) {
        super(
            identifier ? `${resource} '${identifier}' not found` : `${resource} not found`,
            false
        );
        this.name = "NotFoundError";
    }
}

/**
 * Error thrown when a timeout occurs.
 */
export class TimeoutError extends TemporalActivityError {
    constructor(
        operation: string,
        public readonly timeoutMs: number
    ) {
        super(`Operation '${operation}' timed out after ${timeoutMs}ms`, true);
        this.name = "TimeoutError";
    }
}

// ============================================================================
// EXECUTION ERRORS
// ============================================================================

/**
 * Error thrown when code execution fails.
 */
export class CodeExecutionError extends TemporalActivityError {
    constructor(
        message: string,
        public readonly language: string,
        public readonly output?: string
    ) {
        super(`Code execution error (${language}): ${message}`, false);
        this.name = "CodeExecutionError";
    }
}
