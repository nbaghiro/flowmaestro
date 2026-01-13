import * as crypto from "crypto";
import { FastifyRequest, FastifyReply } from "fastify";
import { ApiKeyRepository } from "../../storage/repositories/ApiKeyRepository";
import type { ApiKeyModel, ApiKeyScope } from "../../storage/models/ApiKey";

/**
 * Extend FastifyRequest to include API key context for public API routes.
 */
declare module "fastify" {
    interface FastifyRequest {
        apiKey?: ApiKeyModel;
        apiKeyScopes?: Set<ApiKeyScope>;
        apiKeyUserId?: string;
        apiKeyWorkspaceId?: string;
    }
}

const API_KEY_PREFIX = "fm_live_";

/**
 * Public API error codes.
 */
export type PublicApiErrorCode =
    | "invalid_api_key"
    | "expired_api_key"
    | "revoked_api_key"
    | "insufficient_scope"
    | "rate_limit_exceeded"
    | "resource_not_found"
    | "validation_error"
    | "execution_failed"
    | "internal_error"
    | "service_unavailable"
    | "not_implemented"
    | "timeout";

/**
 * Standard public API error response.
 */
interface PublicApiErrorResponse {
    error: {
        code: PublicApiErrorCode;
        message: string;
        details?: Record<string, unknown>;
    };
    meta?: {
        request_id: string;
        timestamp: string;
    };
}

/**
 * Send a public API error response.
 */
function sendError(
    reply: FastifyReply,
    statusCode: number,
    code: PublicApiErrorCode,
    message: string,
    details?: Record<string, unknown>
): FastifyReply {
    const response: PublicApiErrorResponse = {
        error: {
            code,
            message,
            ...(details && { details })
        },
        meta: {
            request_id: crypto.randomUUID(),
            timestamp: new Date().toISOString()
        }
    };

    return reply.status(statusCode).send(response);
}

/**
 * API Key authentication middleware for public API routes.
 *
 * Validates the API key from the X-API-Key header or Authorization Bearer token.
 * Attaches the API key model and scopes to the request for downstream handlers.
 */
export async function apiKeyAuthMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    // Try X-API-Key header first (preferred)
    let apiKeyValue = request.headers["x-api-key"];

    // Fallback to Authorization: Bearer header
    if (!apiKeyValue) {
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.slice(7);
            // Only use Bearer token if it looks like an API key (not a JWT)
            if (token.startsWith(API_KEY_PREFIX)) {
                apiKeyValue = token;
            }
        }
    }

    // Normalize to string
    if (Array.isArray(apiKeyValue)) {
        apiKeyValue = apiKeyValue[0];
    }

    // Check if API key is provided
    if (!apiKeyValue || typeof apiKeyValue !== "string") {
        sendError(
            reply,
            401,
            "invalid_api_key",
            "Missing API key. Provide it via X-API-Key header or Authorization: Bearer header."
        );
        return;
    }

    // Validate key format
    if (!apiKeyValue.startsWith(API_KEY_PREFIX)) {
        sendError(reply, 401, "invalid_api_key", "Invalid API key format.");
        return;
    }

    // Hash the key for lookup
    const keyHash = crypto.createHash("sha256").update(apiKeyValue).digest("hex");

    // Look up the key
    const apiKeyRepo = new ApiKeyRepository();
    const apiKey = await apiKeyRepo.findByHash(keyHash);

    if (!apiKey) {
        sendError(reply, 401, "invalid_api_key", "API key not found.");
        return;
    }

    // Check if revoked
    if (apiKey.revoked_at) {
        sendError(
            reply,
            401,
            "revoked_api_key",
            "This API key has been revoked. Please generate a new key."
        );
        return;
    }

    // Check if expired
    if (apiKey.expires_at && new Date() > apiKey.expires_at) {
        sendError(
            reply,
            401,
            "expired_api_key",
            "This API key has expired. Please generate a new key."
        );
        return;
    }

    // Check if active
    if (!apiKey.is_active) {
        sendError(reply, 401, "invalid_api_key", "This API key is inactive.");
        return;
    }

    // Attach to request for downstream handlers
    request.apiKey = apiKey;
    request.apiKeyScopes = new Set(apiKey.scopes);
    request.apiKeyUserId = apiKey.user_id;
    request.apiKeyWorkspaceId = apiKey.workspace_id;

    // Update last used (async, non-blocking)
    const clientIp = request.ip || null;
    apiKeyRepo.updateLastUsed(apiKey.id, clientIp).catch(() => {
        // Silently ignore errors - this is non-critical
    });
}

/**
 * Optional API key authentication - doesn't fail if no key is provided.
 * Useful for endpoints that support both authenticated and anonymous access.
 */
export async function optionalApiKeyAuthMiddleware(
    request: FastifyRequest,
    _reply: FastifyReply
): Promise<void> {
    let apiKeyValue = request.headers["x-api-key"];

    if (!apiKeyValue) {
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.slice(7);
            if (token.startsWith(API_KEY_PREFIX)) {
                apiKeyValue = token;
            }
        }
    }

    if (Array.isArray(apiKeyValue)) {
        apiKeyValue = apiKeyValue[0];
    }

    if (
        !apiKeyValue ||
        typeof apiKeyValue !== "string" ||
        !apiKeyValue.startsWith(API_KEY_PREFIX)
    ) {
        // No valid API key - continue without authentication
        return;
    }

    const keyHash = crypto.createHash("sha256").update(apiKeyValue).digest("hex");
    const apiKeyRepo = new ApiKeyRepository();
    const apiKey = await apiKeyRepo.findByHash(keyHash);

    if (apiKey && apiKeyRepo.isValid(apiKey)) {
        request.apiKey = apiKey;
        request.apiKeyScopes = new Set(apiKey.scopes);
        request.apiKeyUserId = apiKey.user_id;
        request.apiKeyWorkspaceId = apiKey.workspace_id;

        const clientIp = request.ip || null;
        apiKeyRepo.updateLastUsed(apiKey.id, clientIp).catch(() => {});
    }
}
