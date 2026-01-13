import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../../../core/logging";
import { WEBHOOK_EVENT_TYPES } from "../../../../storage/models/OutgoingWebhook";
import {
    OutgoingWebhookRepository,
    WebhookDeliveryRepository
} from "../../../../storage/repositories/OutgoingWebhookRepository";
import { requireScopes } from "../../../middleware/scope-checker";
import {
    sendSuccess,
    sendPaginated,
    sendNotFound,
    sendError,
    sendValidationError,
    parsePaginationQuery
} from "../response-helpers";
import type { WebhookEventType } from "../../../../storage/models/OutgoingWebhook";

const logger = createServiceLogger("PublicApiWebhooks");

interface CreateWebhookBody {
    name: string;
    url: string;
    events: WebhookEventType[];
    headers?: Record<string, string>;
}

interface UpdateWebhookBody {
    name?: string;
    url?: string;
    events?: WebhookEventType[];
    headers?: Record<string, string>;
    is_active?: boolean;
}

/**
 * Public API v1 - Webhooks routes.
 */
export async function webhooksV1Routes(fastify: FastifyInstance): Promise<void> {
    // GET /api/v1/webhooks - List webhooks
    fastify.get(
        "/",
        {
            preHandler: [requireScopes("webhooks:read")]
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const workspaceId = request.apiKeyWorkspaceId!;
            const { page, per_page, offset } = parsePaginationQuery(
                request.query as Record<string, unknown>
            );

            const webhookRepo = new OutgoingWebhookRepository();
            const { webhooks, total } = await webhookRepo.findByWorkspaceId(workspaceId, {
                limit: per_page,
                offset
            });

            return sendPaginated(reply, webhooks, {
                page,
                per_page,
                total_count: total
            });
        }
    );

    // GET /api/v1/webhooks/:id - Get webhook by ID
    fastify.get<{ Params: { id: string } }>(
        "/:id",
        {
            preHandler: [requireScopes("webhooks:read")]
        },
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const workspaceId = request.apiKeyWorkspaceId!;
            const webhookId = request.params.id;

            const webhookRepo = new OutgoingWebhookRepository();
            const webhook = await webhookRepo.findByIdAndWorkspaceId(webhookId, workspaceId);

            if (!webhook) {
                return sendNotFound(reply, "Webhook", webhookId);
            }

            // Don't expose the secret in GET responses
            return sendSuccess(reply, {
                id: webhook.id,
                name: webhook.name,
                url: webhook.url,
                events: webhook.events,
                headers: webhook.headers,
                is_active: webhook.is_active,
                created_at: webhook.created_at.toISOString(),
                updated_at: webhook.updated_at.toISOString()
            });
        }
    );

    // POST /api/v1/webhooks - Create webhook
    fastify.post<{ Body: CreateWebhookBody }>(
        "/",
        {
            preHandler: [requireScopes("webhooks:write")]
        },
        async (request: FastifyRequest<{ Body: CreateWebhookBody }>, reply: FastifyReply) => {
            const userId = request.apiKeyUserId!;
            const workspaceId = request.apiKeyWorkspaceId!;
            const { name, url, events, headers } = request.body || {};

            // Validate required fields
            if (!name || typeof name !== "string") {
                return sendValidationError(reply, "Name is required");
            }

            if (!url || typeof url !== "string") {
                return sendValidationError(reply, "URL is required");
            }

            // Validate URL format
            try {
                new URL(url);
            } catch {
                return sendValidationError(reply, "Invalid URL format");
            }

            if (!events || !Array.isArray(events) || events.length === 0) {
                return sendValidationError(reply, "At least one event type is required");
            }

            // Validate event types
            const invalidEvents = events.filter((e) => !WEBHOOK_EVENT_TYPES.includes(e));
            if (invalidEvents.length > 0) {
                return sendValidationError(
                    reply,
                    `Invalid event types: ${invalidEvents.join(", ")}. Valid types: ${WEBHOOK_EVENT_TYPES.join(", ")}`
                );
            }

            try {
                const webhookRepo = new OutgoingWebhookRepository();
                const webhook = await webhookRepo.create({
                    user_id: userId,
                    workspace_id: workspaceId,
                    name,
                    url,
                    events,
                    headers
                });

                logger.info(
                    { webhookId: webhook.id, workspaceId },
                    "Webhook created via public API"
                );

                // Return with secret (only time it's shown)
                return sendSuccess(
                    reply,
                    {
                        id: webhook.id,
                        name: webhook.name,
                        url: webhook.url,
                        secret: webhook.secret,
                        events: webhook.events,
                        headers: webhook.headers,
                        is_active: webhook.is_active,
                        created_at: webhook.created_at.toISOString()
                    },
                    201
                );
            } catch (error: unknown) {
                const errorMsg =
                    error instanceof Error ? error.message : "Failed to create webhook";
                logger.error({ error, workspaceId }, "Failed to create webhook");
                return sendError(reply, 500, "internal_error", errorMsg);
            }
        }
    );

    // PATCH /api/v1/webhooks/:id - Update webhook
    fastify.patch<{ Params: { id: string }; Body: UpdateWebhookBody }>(
        "/:id",
        {
            preHandler: [requireScopes("webhooks:write")]
        },
        async (
            request: FastifyRequest<{ Params: { id: string }; Body: UpdateWebhookBody }>,
            reply: FastifyReply
        ) => {
            const workspaceId = request.apiKeyWorkspaceId!;
            const webhookId = request.params.id;
            const body = request.body || {};

            const webhookRepo = new OutgoingWebhookRepository();
            const existing = await webhookRepo.findByIdAndWorkspaceId(webhookId, workspaceId);

            if (!existing) {
                return sendNotFound(reply, "Webhook", webhookId);
            }

            // Validate URL if provided
            if (body.url) {
                try {
                    new URL(body.url);
                } catch {
                    return sendValidationError(reply, "Invalid URL format");
                }
            }

            // Validate events if provided
            if (body.events) {
                const invalidEvents = body.events.filter((e) => !WEBHOOK_EVENT_TYPES.includes(e));
                if (invalidEvents.length > 0) {
                    return sendValidationError(
                        reply,
                        `Invalid event types: ${invalidEvents.join(", ")}`
                    );
                }
            }

            try {
                const updated = await webhookRepo.updateByWorkspace(webhookId, workspaceId, body);

                if (!updated) {
                    return sendNotFound(reply, "Webhook", webhookId);
                }

                logger.info({ webhookId, workspaceId }, "Webhook updated via public API");

                return sendSuccess(reply, {
                    id: updated.id,
                    name: updated.name,
                    url: updated.url,
                    events: updated.events,
                    headers: updated.headers,
                    is_active: updated.is_active,
                    updated_at: updated.updated_at.toISOString()
                });
            } catch (error: unknown) {
                const errorMsg =
                    error instanceof Error ? error.message : "Failed to update webhook";
                logger.error({ error, webhookId, workspaceId }, "Failed to update webhook");
                return sendError(reply, 500, "internal_error", errorMsg);
            }
        }
    );

    // DELETE /api/v1/webhooks/:id - Delete webhook
    fastify.delete<{ Params: { id: string } }>(
        "/:id",
        {
            preHandler: [requireScopes("webhooks:write")]
        },
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const workspaceId = request.apiKeyWorkspaceId!;
            const webhookId = request.params.id;

            const webhookRepo = new OutgoingWebhookRepository();
            const deleted = await webhookRepo.deleteByWorkspace(webhookId, workspaceId);

            if (!deleted) {
                return sendNotFound(reply, "Webhook", webhookId);
            }

            logger.info({ webhookId, workspaceId }, "Webhook deleted via public API");

            return sendSuccess(reply, { id: webhookId, deleted: true });
        }
    );

    // POST /api/v1/webhooks/:id/test - Send test webhook
    fastify.post<{ Params: { id: string } }>(
        "/:id/test",
        {
            preHandler: [requireScopes("webhooks:write")]
        },
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const workspaceId = request.apiKeyWorkspaceId!;
            const webhookId = request.params.id;

            const webhookRepo = new OutgoingWebhookRepository();
            const webhook = await webhookRepo.findByIdAndWorkspaceId(webhookId, workspaceId);

            if (!webhook) {
                return sendNotFound(reply, "Webhook", webhookId);
            }

            // Send a test webhook
            try {
                const testPayload = {
                    id: `test_${Date.now()}`,
                    event: "test",
                    created_at: new Date().toISOString(),
                    data: {
                        message: "This is a test webhook from FlowMaestro",
                        webhook_id: webhookId
                    }
                };

                // Generate signature
                const crypto = await import("crypto");
                const body = JSON.stringify(testPayload);
                const signature = crypto
                    .createHmac("sha256", webhook.secret)
                    .update(body)
                    .digest("hex");

                const response = await fetch(webhook.url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-FlowMaestro-Signature": `v1=${signature}`,
                        "X-FlowMaestro-Delivery-ID": testPayload.id,
                        ...(webhook.headers || {})
                    },
                    body,
                    signal: AbortSignal.timeout(10000)
                });

                logger.info(
                    { webhookId, workspaceId, status: response.status },
                    "Test webhook sent"
                );

                return sendSuccess(reply, {
                    success: response.ok,
                    status_code: response.status,
                    message: response.ok
                        ? "Test webhook delivered successfully"
                        : `Test webhook failed with status ${response.status}`
                });
            } catch (error: unknown) {
                const errorMsg =
                    error instanceof Error ? error.message : "Failed to send test webhook";
                logger.error({ error, webhookId, workspaceId }, "Test webhook failed");
                return sendSuccess(reply, {
                    success: false,
                    error: errorMsg,
                    message: "Failed to deliver test webhook"
                });
            }
        }
    );

    // GET /api/v1/webhooks/:id/deliveries - List webhook deliveries
    fastify.get<{ Params: { id: string } }>(
        "/:id/deliveries",
        {
            preHandler: [requireScopes("webhooks:read")]
        },
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const workspaceId = request.apiKeyWorkspaceId!;
            const webhookId = request.params.id;
            const { page, per_page, offset } = parsePaginationQuery(
                request.query as Record<string, unknown>
            );

            const webhookRepo = new OutgoingWebhookRepository();
            const webhook = await webhookRepo.findByIdAndWorkspaceId(webhookId, workspaceId);

            if (!webhook) {
                return sendNotFound(reply, "Webhook", webhookId);
            }

            const deliveryRepo = new WebhookDeliveryRepository();
            const { deliveries, total } = await deliveryRepo.findByWebhookId(webhookId, {
                limit: per_page,
                offset
            });

            const publicDeliveries = deliveries.map((d) => ({
                id: d.id,
                event_type: d.event_type,
                status: d.status,
                attempts: d.attempts,
                response_status: d.response_status,
                error_message: d.error_message,
                created_at: d.created_at.toISOString(),
                last_attempt_at: d.last_attempt_at?.toISOString() || null
            }));

            return sendPaginated(reply, publicDeliveries, {
                page,
                per_page,
                total_count: total
            });
        }
    );
}
