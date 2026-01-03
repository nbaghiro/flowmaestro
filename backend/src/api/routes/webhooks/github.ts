/**
 * GitHub Webhook Handler
 *
 * Handles incoming webhooks from GitHub for:
 * - Push events
 * - Pull request events
 * - Issue events
 * - Release events
 * - Workflow run events
 *
 * Signature verification uses X-Hub-Signature-256 header with HMAC-SHA256
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { providerWebhookService } from "../../../temporal/core/services/provider-webhook";

const logger = createServiceLogger("GitHubWebhook");

interface GitHubWebhookHeaders {
    "x-github-event"?: string;
    "x-github-delivery"?: string;
    "x-hub-signature-256"?: string;
    "x-github-hook-id"?: string;
    "x-github-hook-installation-target-type"?: string;
    "x-github-hook-installation-target-id"?: string;
}

export async function githubWebhookRoutes(fastify: FastifyInstance) {
    /**
     * GitHub Webhook Receiver
     * Route: POST /github/:triggerId
     */
    fastify.post(
        "/github/:triggerId",
        {
            config: {
                rawBody: true // Need raw body for HMAC signature verification
            }
        },
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;
            const headers = request.headers as GitHubWebhookHeaders;

            const eventType = headers["x-github-event"];
            const deliveryId = headers["x-github-delivery"];

            logger.info({ triggerId, eventType, deliveryId }, "Received GitHub webhook");

            // Get raw body for signature verification
            const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;

            // Process through provider webhook service
            const response = await providerWebhookService.processProviderWebhook({
                providerId: "github",
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
     * GitHub Webhook Ping Handler
     * GitHub sends a ping event when a webhook is first created
     */
    fastify.get(
        "/github/:triggerId",
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;

            logger.info({ triggerId }, "GitHub webhook ping received");

            return reply.status(200).send({
                success: true,
                message: "GitHub webhook endpoint is active",
                triggerId
            });
        }
    );
}
