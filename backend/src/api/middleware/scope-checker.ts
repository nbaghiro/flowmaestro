import * as crypto from "crypto";
import { FastifyRequest, FastifyReply } from "fastify";
import type { PublicApiErrorCode } from "./api-key-auth";
import type { ApiKeyScope } from "../../storage/models/ApiKey";

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
 * Create a scope checker middleware that requires specific scopes.
 *
 * @param requiredScopes - Array of scopes that are required for the endpoint
 * @returns Fastify middleware that checks if the API key has all required scopes
 *
 * @example
 * // Single scope
 * fastify.get("/workflows", { preHandler: [requireScopes("workflows:read")] }, handler);
 *
 * // Multiple scopes (all required)
 * fastify.post("/workflows/:id/execute", {
 *   preHandler: [requireScopes("workflows:read", "workflows:execute")]
 * }, handler);
 */
export function requireScopes(...requiredScopes: ApiKeyScope[]) {
    return async function scopeCheckerMiddleware(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        const scopes = request.apiKeyScopes;

        // If no scopes are available, the API key auth middleware didn't run
        if (!scopes) {
            const response: PublicApiErrorResponse = {
                error: {
                    code: "insufficient_scope",
                    message: "No authorization scopes available. Ensure you are authenticated."
                },
                meta: {
                    request_id: crypto.randomUUID(),
                    timestamp: new Date().toISOString()
                }
            };

            reply.status(403).send(response);
            return;
        }

        // Check which scopes are missing
        const missingScopes = requiredScopes.filter((scope) => !scopes.has(scope));

        if (missingScopes.length > 0) {
            const response: PublicApiErrorResponse = {
                error: {
                    code: "insufficient_scope",
                    message: `Missing required scopes: ${missingScopes.join(", ")}`,
                    details: {
                        required_scopes: requiredScopes,
                        missing_scopes: missingScopes,
                        your_scopes: Array.from(scopes)
                    }
                },
                meta: {
                    request_id: crypto.randomUUID(),
                    timestamp: new Date().toISOString()
                }
            };

            reply.status(403).send(response);
            return;
        }

        // All required scopes are present, continue
    };
}

/**
 * Create a scope checker middleware that requires at least one of the specified scopes.
 *
 * @param anyOfScopes - Array of scopes where at least one is required
 * @returns Fastify middleware that checks if the API key has any of the scopes
 *
 * @example
 * // User needs either read OR execute access
 * fastify.get("/workflows/:id", {
 *   preHandler: [requireAnyScope("workflows:read", "workflows:execute")]
 * }, handler);
 */
export function requireAnyScope(...anyOfScopes: ApiKeyScope[]) {
    return async function scopeCheckerMiddleware(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        const scopes = request.apiKeyScopes;

        if (!scopes) {
            const response: PublicApiErrorResponse = {
                error: {
                    code: "insufficient_scope",
                    message: "No authorization scopes available. Ensure you are authenticated."
                },
                meta: {
                    request_id: crypto.randomUUID(),
                    timestamp: new Date().toISOString()
                }
            };

            reply.status(403).send(response);
            return;
        }

        // Check if at least one scope is present
        const hasAnyScope = anyOfScopes.some((scope) => scopes.has(scope));

        if (!hasAnyScope) {
            const response: PublicApiErrorResponse = {
                error: {
                    code: "insufficient_scope",
                    message: `This operation requires one of: ${anyOfScopes.join(", ")}`,
                    details: {
                        required_any_of: anyOfScopes,
                        your_scopes: Array.from(scopes)
                    }
                },
                meta: {
                    request_id: crypto.randomUUID(),
                    timestamp: new Date().toISOString()
                }
            };

            reply.status(403).send(response);
            return;
        }

        // At least one required scope is present, continue
    };
}

/**
 * Helper to check if a scope is present without failing the request.
 * Useful for conditional logic in handlers.
 */
export function hasScope(request: FastifyRequest, scope: ApiKeyScope): boolean {
    return request.apiKeyScopes?.has(scope) ?? false;
}

/**
 * Helper to check if all scopes are present without failing the request.
 */
export function hasAllScopes(request: FastifyRequest, scopes: ApiKeyScope[]): boolean {
    const keyScopes = request.apiKeyScopes;
    if (!keyScopes) return false;
    return scopes.every((scope) => keyScopes.has(scope));
}

/**
 * Helper to check if any scope is present without failing the request.
 */
export function hasAnyOfScopes(request: FastifyRequest, scopes: ApiKeyScope[]): boolean {
    const keyScopes = request.apiKeyScopes;
    if (!keyScopes) return false;
    return scopes.some((scope) => keyScopes.has(scope));
}
