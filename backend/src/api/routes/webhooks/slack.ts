/**
 * Slack Webhook Handler
 *
 * Handles incoming webhooks from Slack for:
 * - Message events
 * - Reaction events
 * - App mention events
 * - Slash commands
 * - Interactive components
 *
 * Signature verification uses X-Slack-Signature header with HMAC-SHA256
 * and X-Slack-Request-Timestamp for replay attack prevention
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { providerWebhookService } from "../../../temporal/core/services/provider-webhook";

const logger = createServiceLogger("SlackWebhook");

interface SlackEventPayload {
    type: string;
    token?: string;
    challenge?: string;
    team_id?: string;
    api_app_id?: string;
    event?: {
        type: string;
        user?: string;
        channel?: string;
        text?: string;
        ts?: string;
        [key: string]: unknown;
    };
    event_id?: string;
    event_time?: number;
    [key: string]: unknown;
}

interface SlackSlashCommandPayload {
    command: string;
    text?: string;
    response_url?: string;
    trigger_id?: string;
    user_id?: string;
    user_name?: string;
    channel_id?: string;
    channel_name?: string;
    team_id?: string;
    team_domain?: string;
    [key: string]: unknown;
}

export async function slackWebhookRoutes(fastify: FastifyInstance) {
    /**
     * Slack Events API Webhook
     * Route: POST /slack/:triggerId
     *
     * Handles Events API callbacks and URL verification
     */
    fastify.post(
        "/slack/:triggerId",
        {
            config: {
                rawBody: true // Need raw body for signature verification
            }
        },
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;
            const payload = request.body as SlackEventPayload;

            logger.info({ triggerId, eventType: payload.type }, "Received Slack webhook");

            // Handle URL verification challenge (Slack sends this when setting up webhooks)
            if (payload.type === "url_verification" && payload.challenge) {
                logger.info({ triggerId }, "Slack URL verification challenge");
                return reply.status(200).send({ challenge: payload.challenge });
            }

            // Get raw body for signature verification
            const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;

            // Process through provider webhook service
            const response = await providerWebhookService.processProviderWebhook({
                providerId: "slack",
                triggerId,
                headers: request.headers as Record<string, string | string[] | undefined>,
                body: request.body,
                rawBody,
                query: request.query as Record<string, unknown>,
                method: request.method,
                path: request.url,
                ip: request.ip,
                userAgent: request.headers["user-agent"] as string
            });

            return reply.status(response.statusCode).send({
                success: response.success,
                executionId: response.executionId,
                message: response.message,
                error: response.error
            });
        }
    );

    /**
     * Slack Slash Commands Handler
     * Route: POST /slack/:triggerId/command
     *
     * Handles incoming slash commands
     * Slack expects a response within 3 seconds
     */
    fastify.post(
        "/slack/:triggerId/command",
        {
            config: {
                rawBody: true
            }
        },
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;
            const payload = request.body as SlackSlashCommandPayload;

            logger.info({ triggerId, command: payload.command }, "Received Slack slash command");

            // Get raw body for signature verification
            const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;

            // Process through provider webhook service
            const response = await providerWebhookService.processProviderWebhook({
                providerId: "slack",
                triggerId,
                headers: request.headers as Record<string, string | string[] | undefined>,
                body: {
                    type: "slash_command",
                    ...payload
                },
                rawBody,
                query: request.query as Record<string, unknown>,
                method: request.method,
                path: request.url,
                ip: request.ip,
                userAgent: request.headers["user-agent"] as string
            });

            // Slack expects immediate acknowledgment
            // We return a simple response while the workflow runs async
            if (response.success) {
                return reply.status(200).send({
                    response_type: "ephemeral",
                    text: "Processing your request..."
                });
            }

            return reply.status(response.statusCode).send({
                response_type: "ephemeral",
                text: response.error || "An error occurred"
            });
        }
    );

    /**
     * Slack Interactive Components Handler
     * Route: POST /slack/:triggerId/interactive
     *
     * Handles button clicks, select menus, modal submissions, etc.
     */
    fastify.post(
        "/slack/:triggerId/interactive",
        {
            config: {
                rawBody: true
            }
        },
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;

            // Interactive payloads are URL-encoded with a "payload" field containing JSON
            let payload: Record<string, unknown>;
            const body = request.body as { payload?: string } | Record<string, unknown>;

            if (typeof body === "object" && "payload" in body && typeof body.payload === "string") {
                payload = JSON.parse(body.payload);
            } else {
                payload = body as Record<string, unknown>;
            }

            logger.info({ triggerId, type: payload.type }, "Received Slack interactive component");

            // Get raw body for signature verification
            const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;

            // Process through provider webhook service
            const response = await providerWebhookService.processProviderWebhook({
                providerId: "slack",
                triggerId,
                headers: request.headers as Record<string, string | string[] | undefined>,
                body: {
                    type: "interactive_message",
                    ...payload
                },
                rawBody,
                query: request.query as Record<string, unknown>,
                method: request.method,
                path: request.url,
                ip: request.ip,
                userAgent: request.headers["user-agent"] as string
            });

            // Acknowledge immediately
            if (response.success) {
                return reply.status(200).send();
            }

            return reply.status(response.statusCode).send({
                error: response.error
            });
        }
    );
}
