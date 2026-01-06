/**
 * FlowMaestro SDK Error Classes
 */

export interface ErrorDetails {
    code: string;
    message: string;
    statusCode?: number;
    requestId?: string;
    details?: Record<string, unknown>;
}

/**
 * Base error class for all FlowMaestro SDK errors
 */
export class FlowMaestroError extends Error {
    public readonly code: string;
    public readonly statusCode?: number;
    public readonly requestId?: string;
    public readonly details?: Record<string, unknown>;

    constructor(details: ErrorDetails) {
        super(details.message);
        this.name = "FlowMaestroError";
        this.code = details.code;
        this.statusCode = details.statusCode;
        this.requestId = details.requestId;
        this.details = details.details;

        // Maintains proper stack trace for where our error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, FlowMaestroError);
        }
    }
}

/**
 * Authentication error (401)
 * Thrown when API key is invalid, expired, or revoked
 */
export class AuthenticationError extends FlowMaestroError {
    constructor(details: Omit<ErrorDetails, "code"> & { code?: string }) {
        super({
            ...details,
            code: details.code || "authentication_error",
            statusCode: details.statusCode || 401
        });
        this.name = "AuthenticationError";
    }
}

/**
 * Authorization error (403)
 * Thrown when API key lacks required scopes
 */
export class AuthorizationError extends FlowMaestroError {
    constructor(details: Omit<ErrorDetails, "code"> & { code?: string }) {
        super({
            ...details,
            code: details.code || "authorization_error",
            statusCode: details.statusCode || 403
        });
        this.name = "AuthorizationError";
    }
}

/**
 * Resource not found error (404)
 */
export class NotFoundError extends FlowMaestroError {
    constructor(details: Omit<ErrorDetails, "code"> & { code?: string }) {
        super({
            ...details,
            code: details.code || "not_found",
            statusCode: details.statusCode || 404
        });
        this.name = "NotFoundError";
    }
}

/**
 * Validation error (400)
 * Thrown when request body or parameters are invalid
 */
export class ValidationError extends FlowMaestroError {
    constructor(details: Omit<ErrorDetails, "code"> & { code?: string }) {
        super({
            ...details,
            code: details.code || "validation_error",
            statusCode: details.statusCode || 400
        });
        this.name = "ValidationError";
    }
}

/**
 * Rate limit error (429)
 * Thrown when API rate limit is exceeded
 */
export class RateLimitError extends FlowMaestroError {
    public readonly retryAfter?: number;

    constructor(details: Omit<ErrorDetails, "code"> & { code?: string; retryAfter?: number }) {
        super({
            ...details,
            code: details.code || "rate_limit_exceeded",
            statusCode: details.statusCode || 429
        });
        this.name = "RateLimitError";
        this.retryAfter = details.retryAfter;
    }
}

/**
 * Server error (5xx)
 * Thrown when the server encounters an error
 */
export class ServerError extends FlowMaestroError {
    constructor(details: Omit<ErrorDetails, "code"> & { code?: string }) {
        super({
            ...details,
            code: details.code || "server_error",
            statusCode: details.statusCode || 500
        });
        this.name = "ServerError";
    }
}

/**
 * Timeout error
 * Thrown when a request or operation times out
 */
export class TimeoutError extends FlowMaestroError {
    constructor(message: string = "Request timed out") {
        super({
            code: "timeout",
            message
        });
        this.name = "TimeoutError";
    }
}

/**
 * Connection error
 * Thrown when unable to connect to the API
 */
export class ConnectionError extends FlowMaestroError {
    constructor(message: string = "Unable to connect to FlowMaestro API") {
        super({
            code: "connection_error",
            message
        });
        this.name = "ConnectionError";
    }
}

/**
 * Stream error
 * Thrown when SSE stream encounters an error
 */
export class StreamError extends FlowMaestroError {
    constructor(message: string, details?: Record<string, unknown>) {
        super({
            code: "stream_error",
            message,
            details
        });
        this.name = "StreamError";
    }
}

/**
 * Parse error from API response
 */
export function parseApiError(
    statusCode: number,
    body: { error?: { code?: string; message?: string; details?: Record<string, unknown> } },
    requestId?: string
): FlowMaestroError {
    const code = body.error?.code || "unknown_error";
    const message = body.error?.message || "An unknown error occurred";
    const details = body.error?.details;

    const errorDetails: ErrorDetails = {
        code,
        message,
        statusCode,
        requestId,
        details
    };

    switch (statusCode) {
        case 400:
            return new ValidationError(errorDetails);
        case 401:
            return new AuthenticationError(errorDetails);
        case 403:
            return new AuthorizationError(errorDetails);
        case 404:
            return new NotFoundError(errorDetails);
        case 429:
            return new RateLimitError(errorDetails);
        default:
            if (statusCode >= 500) {
                return new ServerError(errorDetails);
            }
            return new FlowMaestroError(errorDetails);
    }
}
