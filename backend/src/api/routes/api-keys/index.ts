import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { SCOPE_BUNDLES } from "../../../storage/models/ApiKey";
import { ApiKeyRepository } from "../../../storage/repositories/ApiKeyRepository";
import { authMiddleware } from "../../middleware/auth";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";
import type {
    ApiKeyScope,
    ScopeBundleName,
    CreateApiKeyInput
} from "../../../storage/models/ApiKey";

const logger = createServiceLogger("ApiKeyRoutes");

// Valid scopes for API keys
const VALID_SCOPES: ApiKeyScope[] = [
    "workflows:read",
    "workflows:execute",
    "executions:read",
    "executions:cancel",
    "agents:read",
    "agents:execute",
    "threads:read",
    "threads:write",
    "triggers:read",
    "triggers:execute",
    "knowledge-bases:read",
    "knowledge-bases:query",
    "webhooks:read",
    "webhooks:write"
];

interface CreateApiKeyBody {
    name: string;
    scopes?: ApiKeyScope[];
    bundle?: ScopeBundleName;
    rate_limit_per_minute?: number;
    rate_limit_per_day?: number;
    expires_in_days?: number;
}

interface UpdateApiKeyBody {
    name?: string;
    scopes?: ApiKeyScope[];
    rate_limit_per_minute?: number;
    rate_limit_per_day?: number;
    is_active?: boolean;
}

/**
 * API Key management routes (internal, JWT-authenticated).
 * These routes are used by the dashboard for managing API keys.
 */
export async function apiKeyRoutes(fastify: FastifyInstance): Promise<void> {
    // Apply JWT authentication and workspace context to all routes
    fastify.addHook("preHandler", authMiddleware);
    fastify.addHook("preHandler", workspaceContextMiddleware);

    // GET /api-keys - List workspace's API keys
    fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
        const workspaceId = request.workspace!.id;
        const query = request.query as {
            page?: string;
            per_page?: string;
            include_revoked?: string;
        };

        const page = Math.max(1, parseInt(query.page || "1"));
        const perPage = Math.min(100, Math.max(1, parseInt(query.per_page || "50")));
        const includeRevoked = query.include_revoked === "true";
        const offset = (page - 1) * perPage;

        const apiKeyRepo = new ApiKeyRepository();
        const { keys, total } = await apiKeyRepo.findByWorkspaceId(workspaceId, {
            limit: perPage,
            offset,
            includeRevoked
        });

        return reply.send({
            success: true,
            data: keys,
            pagination: {
                page,
                per_page: perPage,
                total_count: total,
                total_pages: Math.ceil(total / perPage)
            }
        });
    });

    // GET /api-keys/scopes - List available scopes and bundles
    fastify.get("/scopes", async (_request: FastifyRequest, reply: FastifyReply) => {
        return reply.send({
            success: true,
            data: {
                scopes: VALID_SCOPES,
                bundles: Object.entries(SCOPE_BUNDLES).map(([name, scopes]) => ({
                    name,
                    scopes,
                    description: getBundleDescription(name as ScopeBundleName)
                }))
            }
        });
    });

    // GET /api-keys/:id - Get API key by ID
    fastify.get<{ Params: { id: string } }>(
        "/:id",
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const workspaceId = request.workspace!.id;
            const keyId = request.params.id;

            const apiKeyRepo = new ApiKeyRepository();
            const apiKey = await apiKeyRepo.findByIdAndWorkspaceId(keyId, workspaceId);

            if (!apiKey) {
                return reply.status(404).send({
                    success: false,
                    error: {
                        code: "not_found",
                        message: "API key not found"
                    }
                });
            }

            return reply.send({
                success: true,
                data: {
                    id: apiKey.id,
                    name: apiKey.name,
                    key_prefix: apiKey.key_prefix,
                    scopes: apiKey.scopes,
                    rate_limit_per_minute: apiKey.rate_limit_per_minute,
                    rate_limit_per_day: apiKey.rate_limit_per_day,
                    expires_at: apiKey.expires_at?.toISOString() || null,
                    last_used_at: apiKey.last_used_at?.toISOString() || null,
                    last_used_ip: apiKey.last_used_ip,
                    is_active: apiKey.is_active,
                    created_at: apiKey.created_at.toISOString(),
                    updated_at: apiKey.updated_at.toISOString(),
                    revoked_at: apiKey.revoked_at?.toISOString() || null
                }
            });
        }
    );

    // POST /api-keys - Create a new API key
    fastify.post<{ Body: CreateApiKeyBody }>(
        "/",
        async (request: FastifyRequest<{ Body: CreateApiKeyBody }>, reply: FastifyReply) => {
            const userId = request.user.id;
            const workspaceId = request.workspace!.id;
            const body = request.body || {};

            // Validate name
            if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
                return reply.status(400).send({
                    success: false,
                    error: {
                        code: "validation_error",
                        message: "Name is required"
                    }
                });
            }

            if (body.name.length > 100) {
                return reply.status(400).send({
                    success: false,
                    error: {
                        code: "validation_error",
                        message: "Name must be 100 characters or less"
                    }
                });
            }

            // Resolve scopes from bundle or explicit scopes
            let scopes: ApiKeyScope[];
            if (body.bundle) {
                if (!SCOPE_BUNDLES[body.bundle]) {
                    return reply.status(400).send({
                        success: false,
                        error: {
                            code: "validation_error",
                            message: `Invalid bundle: ${body.bundle}. Valid bundles: ${Object.keys(SCOPE_BUNDLES).join(", ")}`
                        }
                    });
                }
                scopes = SCOPE_BUNDLES[body.bundle];
            } else if (body.scopes && Array.isArray(body.scopes)) {
                // Validate individual scopes
                const invalidScopes = body.scopes.filter((s) => !VALID_SCOPES.includes(s));
                if (invalidScopes.length > 0) {
                    return reply.status(400).send({
                        success: false,
                        error: {
                            code: "validation_error",
                            message: `Invalid scopes: ${invalidScopes.join(", ")}`
                        }
                    });
                }
                scopes = body.scopes;
            } else {
                return reply.status(400).send({
                    success: false,
                    error: {
                        code: "validation_error",
                        message: "Either scopes or bundle is required"
                    }
                });
            }

            // Calculate expiration
            let expiresAt: Date | null = null;
            if (body.expires_in_days && body.expires_in_days > 0) {
                expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + body.expires_in_days);
            }

            // Create the API key
            try {
                const apiKeyRepo = new ApiKeyRepository();
                const createInput: CreateApiKeyInput = {
                    user_id: userId,
                    workspace_id: workspaceId,
                    name: body.name.trim(),
                    scopes,
                    rate_limit_per_minute: body.rate_limit_per_minute,
                    rate_limit_per_day: body.rate_limit_per_day,
                    expires_at: expiresAt
                };

                const apiKey = await apiKeyRepo.create(createInput);

                logger.info({ keyId: apiKey.id, userId }, "API key created");

                // Return with the raw key (only shown once)
                return reply.status(201).send({
                    success: true,
                    data: {
                        id: apiKey.id,
                        name: apiKey.name,
                        key: apiKey.key, // Raw key - only shown on creation
                        key_prefix: apiKey.key_prefix,
                        scopes: apiKey.scopes,
                        rate_limit_per_minute: apiKey.rate_limit_per_minute,
                        rate_limit_per_day: apiKey.rate_limit_per_day,
                        expires_at: apiKey.expires_at?.toISOString() || null,
                        is_active: apiKey.is_active,
                        created_at: apiKey.created_at.toISOString()
                    },
                    message: "Store this API key securely. It will not be shown again."
                });
            } catch (error) {
                logger.error({ error, userId }, "Failed to create API key");
                return reply.status(500).send({
                    success: false,
                    error: {
                        code: "internal_error",
                        message: "Failed to create API key"
                    }
                });
            }
        }
    );

    // PATCH /api-keys/:id - Update an API key
    fastify.patch<{ Params: { id: string }; Body: UpdateApiKeyBody }>(
        "/:id",
        async (
            request: FastifyRequest<{ Params: { id: string }; Body: UpdateApiKeyBody }>,
            reply: FastifyReply
        ) => {
            const workspaceId = request.workspace!.id;
            const keyId = request.params.id;
            const body = request.body || {};

            // Validate name if provided
            if (body.name !== undefined) {
                if (typeof body.name !== "string" || body.name.trim().length === 0) {
                    return reply.status(400).send({
                        success: false,
                        error: {
                            code: "validation_error",
                            message: "Name cannot be empty"
                        }
                    });
                }
                if (body.name.length > 100) {
                    return reply.status(400).send({
                        success: false,
                        error: {
                            code: "validation_error",
                            message: "Name must be 100 characters or less"
                        }
                    });
                }
            }

            // Validate scopes if provided
            if (body.scopes !== undefined) {
                if (!Array.isArray(body.scopes) || body.scopes.length === 0) {
                    return reply.status(400).send({
                        success: false,
                        error: {
                            code: "validation_error",
                            message: "Scopes must be a non-empty array"
                        }
                    });
                }
                const invalidScopes = body.scopes.filter((s) => !VALID_SCOPES.includes(s));
                if (invalidScopes.length > 0) {
                    return reply.status(400).send({
                        success: false,
                        error: {
                            code: "validation_error",
                            message: `Invalid scopes: ${invalidScopes.join(", ")}`
                        }
                    });
                }
            }

            try {
                const apiKeyRepo = new ApiKeyRepository();
                const updated = await apiKeyRepo.updateByWorkspaceId(keyId, workspaceId, {
                    name: body.name?.trim(),
                    scopes: body.scopes,
                    rate_limit_per_minute: body.rate_limit_per_minute,
                    rate_limit_per_day: body.rate_limit_per_day,
                    is_active: body.is_active
                });

                if (!updated) {
                    return reply.status(404).send({
                        success: false,
                        error: {
                            code: "not_found",
                            message: "API key not found or already revoked"
                        }
                    });
                }

                logger.info({ keyId, workspaceId }, "API key updated");

                return reply.send({
                    success: true,
                    data: {
                        id: updated.id,
                        name: updated.name,
                        key_prefix: updated.key_prefix,
                        scopes: updated.scopes,
                        rate_limit_per_minute: updated.rate_limit_per_minute,
                        rate_limit_per_day: updated.rate_limit_per_day,
                        is_active: updated.is_active,
                        updated_at: updated.updated_at.toISOString()
                    }
                });
            } catch (error) {
                logger.error({ error, keyId, workspaceId }, "Failed to update API key");
                return reply.status(500).send({
                    success: false,
                    error: {
                        code: "internal_error",
                        message: "Failed to update API key"
                    }
                });
            }
        }
    );

    // POST /api-keys/:id/rotate - Rotate an API key (revoke old, create new)
    fastify.post<{ Params: { id: string } }>(
        "/:id/rotate",
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const userId = request.user.id;
            const workspaceId = request.workspace!.id;
            const keyId = request.params.id;

            try {
                const apiKeyRepo = new ApiKeyRepository();
                const newKey = await apiKeyRepo.rotateByWorkspaceId(keyId, workspaceId, userId);

                if (!newKey) {
                    return reply.status(404).send({
                        success: false,
                        error: {
                            code: "not_found",
                            message: "API key not found or already revoked"
                        }
                    });
                }

                logger.info(
                    { oldKeyId: keyId, newKeyId: newKey.id, workspaceId },
                    "API key rotated"
                );

                return reply.send({
                    success: true,
                    data: {
                        id: newKey.id,
                        name: newKey.name,
                        key: newKey.key, // Raw key - only shown on creation/rotation
                        key_prefix: newKey.key_prefix,
                        scopes: newKey.scopes,
                        rate_limit_per_minute: newKey.rate_limit_per_minute,
                        rate_limit_per_day: newKey.rate_limit_per_day,
                        expires_at: newKey.expires_at?.toISOString() || null,
                        is_active: newKey.is_active,
                        created_at: newKey.created_at.toISOString()
                    },
                    message:
                        "API key rotated. The old key has been revoked. Store this new key securely."
                });
            } catch (error) {
                logger.error({ error, keyId, workspaceId }, "Failed to rotate API key");
                return reply.status(500).send({
                    success: false,
                    error: {
                        code: "internal_error",
                        message: "Failed to rotate API key"
                    }
                });
            }
        }
    );

    // DELETE /api-keys/:id - Revoke an API key
    fastify.delete<{ Params: { id: string } }>(
        "/:id",
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const workspaceId = request.workspace!.id;
            const keyId = request.params.id;

            try {
                const apiKeyRepo = new ApiKeyRepository();
                const revoked = await apiKeyRepo.revokeByWorkspaceId(keyId, workspaceId);

                if (!revoked) {
                    return reply.status(404).send({
                        success: false,
                        error: {
                            code: "not_found",
                            message: "API key not found or already revoked"
                        }
                    });
                }

                logger.info({ keyId, workspaceId }, "API key revoked");

                return reply.send({
                    success: true,
                    data: {
                        id: keyId,
                        revoked: true
                    }
                });
            } catch (error) {
                logger.error({ error, keyId, workspaceId }, "Failed to revoke API key");
                return reply.status(500).send({
                    success: false,
                    error: {
                        code: "internal_error",
                        message: "Failed to revoke API key"
                    }
                });
            }
        }
    );
}

/**
 * Get a human-readable description for a scope bundle.
 */
function getBundleDescription(bundle: ScopeBundleName): string {
    switch (bundle) {
        case "workflow-executor":
            return "Execute workflows and monitor executions";
        case "agent-executor":
            return "Run AI agents and manage conversation threads";
        case "knowledge-base-reader":
            return "Query knowledge bases for semantic search";
        case "read-only":
            return "Read-only access to all resources";
        case "full-access":
            return "Full access to all API resources";
        default:
            return "";
    }
}
