/**
 * Custom error classes for the Unified AI SDK
 */

import type { AIProvider, ProviderErrorDetails } from "../types";

/**
 * Base AI SDK Error
 */
export class AIError extends Error {
    readonly provider: AIProvider;
    readonly statusCode?: number;
    readonly errorCode?: string;
    readonly errorType?: string;
    readonly retryable: boolean;
    readonly retryAfterMs?: number;

    constructor(message: string, details: ProviderErrorDetails, cause?: Error) {
        super(message);
        this.name = "AIError";
        this.provider = details.provider;
        this.statusCode = details.statusCode;
        this.errorCode = details.errorCode;
        this.errorType = details.errorType;
        this.retryable = details.retryable;
        this.retryAfterMs = details.retryAfterMs;
        this.cause = cause;
    }
}

/**
 * Authentication error - missing or invalid API key
 */
export class AuthenticationError extends AIError {
    constructor(provider: AIProvider, message: string) {
        super(message, {
            provider,
            errorCode: "AUTH_ERROR",
            errorType: "authentication",
            retryable: false
        });
        this.name = "AuthenticationError";
    }
}

/**
 * Rate limit error - too many requests
 */
export class RateLimitError extends AIError {
    constructor(provider: AIProvider, retryAfterMs?: number) {
        super(`Rate limit exceeded for ${provider}`, {
            provider,
            statusCode: 429,
            errorCode: "RATE_LIMIT",
            errorType: "rate_limit_error",
            retryable: true,
            retryAfterMs
        });
        this.name = "RateLimitError";
    }
}

/**
 * Provider unavailable error - temporary outage
 */
export class ProviderUnavailableError extends AIError {
    constructor(provider: AIProvider, message?: string) {
        super(message ?? `Provider ${provider} is temporarily unavailable`, {
            provider,
            statusCode: 503,
            errorCode: "PROVIDER_UNAVAILABLE",
            errorType: "overloaded_error",
            retryable: true
        });
        this.name = "ProviderUnavailableError";
    }
}

/**
 * Model not found error
 */
export class ModelNotFoundError extends AIError {
    constructor(provider: AIProvider, model: string) {
        super(`Model ${model} not found for provider ${provider}`, {
            provider,
            statusCode: 404,
            errorCode: "MODEL_NOT_FOUND",
            errorType: "invalid_request",
            retryable: false
        });
        this.name = "ModelNotFoundError";
    }
}

/**
 * Validation error - invalid request parameters
 */
export class ValidationError extends AIError {
    readonly field?: string;

    constructor(provider: AIProvider, message: string, field?: string) {
        super(message, {
            provider,
            errorCode: `VALIDATION_ERROR${field ? `:${field}` : ""}`,
            errorType: "validation",
            retryable: false
        });
        this.name = "ValidationError";
        this.field = field;
    }
}

/**
 * Timeout error - operation took too long
 */
export class TimeoutError extends AIError {
    readonly operationType: string;
    readonly timeoutMs: number;

    constructor(provider: AIProvider, operationType: string, timeoutMs: number) {
        super(`${operationType} timed out after ${timeoutMs}ms`, {
            provider,
            errorCode: "TIMEOUT",
            errorType: "timeout",
            retryable: true
        });
        this.name = "TimeoutError";
        this.operationType = operationType;
        this.timeoutMs = timeoutMs;
    }
}

/**
 * Content filter error - content blocked by safety filters
 */
export class ContentFilterError extends AIError {
    constructor(provider: AIProvider, message?: string) {
        super(message ?? "Content blocked by safety filter", {
            provider,
            errorCode: "CONTENT_FILTER",
            errorType: "content_filter",
            retryable: false
        });
        this.name = "ContentFilterError";
    }
}

/**
 * Insufficient quota error - billing/usage limit reached
 */
export class InsufficientQuotaError extends AIError {
    constructor(provider: AIProvider, message?: string) {
        super(message ?? `Insufficient quota for ${provider}`, {
            provider,
            statusCode: 402,
            errorCode: "INSUFFICIENT_QUOTA",
            errorType: "quota_exceeded",
            retryable: false
        });
        this.name = "InsufficientQuotaError";
    }
}
