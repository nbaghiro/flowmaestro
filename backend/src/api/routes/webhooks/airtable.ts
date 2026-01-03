/**
 * Airtable Webhook Handler
 *
 * Handles incoming webhooks from Airtable for:
 * - Record created events
 * - Record updated events
 * - Record deleted events
 *
 * Airtable webhooks use HMAC-SHA256 signature verification
 * with the X-Airtable-Content-MAC header
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { providerWebhookService } from "../../../temporal/core/services/provider-webhook";

const logger = createServiceLogger("AirtableWebhook");

interface AirtableWebhookHeaders {
    "x-airtable-content-mac"?: string;
    "x-airtable-webhook-id"?: string;
}

interface AirtableWebhookPayload {
    base: {
        id: string;
    };
    webhook: {
        id: string;
    };
    timestamp: string;
    cursor?: number;
    payloadFormat?: string;
    actionMetadata?: {
        source?: string;
        sourceMetadata?: {
            user?: {
                id: string;
                email: string;
                name?: string;
            };
        };
    };
    changedTablesById?: Record<
        string,
        {
            createdRecordsById?: Record<string, AirtableRecord>;
            changedRecordsById?: Record<string, AirtableRecord>;
            destroyedRecordIds?: string[];
            changedFieldsById?: Record<string, unknown>;
            createdFieldsById?: Record<string, unknown>;
            destroyedFieldIds?: string[];
            changedViewsById?: Record<string, unknown>;
            createdViewsById?: Record<string, unknown>;
            destroyedViewIds?: string[];
        }
    >;
    [key: string]: unknown;
}

interface AirtableRecord {
    id: string;
    cellValuesByFieldId: Record<string, unknown>;
    createdTime?: string;
}

export async function airtableWebhookRoutes(fastify: FastifyInstance) {
    /**
     * Airtable Webhook Receiver
     * Route: POST /airtable/:triggerId
     */
    fastify.post(
        "/airtable/:triggerId",
        {
            config: {
                rawBody: true // Need raw body for HMAC signature verification
            }
        },
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;
            const headers = request.headers as AirtableWebhookHeaders;
            const payload = request.body as AirtableWebhookPayload;

            const webhookId = headers["x-airtable-webhook-id"];

            logger.info(
                { triggerId, webhookId, baseId: payload.base?.id },
                "Received Airtable webhook"
            );

            // Get raw body for signature verification
            const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;

            // Determine event type from payload
            const eventType = determineAirtableEventType(payload);

            // Process through provider webhook service
            const response = await providerWebhookService.processProviderWebhook({
                providerId: "airtable",
                triggerId,
                headers: request.headers as Record<string, string | string[] | undefined>,
                body: {
                    ...payload,
                    eventType // Add derived event type
                },
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
     * Airtable Webhook Ping/Verification Handler
     * Airtable may send a GET request to verify the endpoint
     */
    fastify.get(
        "/airtable/:triggerId",
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;

            logger.info({ triggerId }, "Airtable webhook verification ping");

            return reply.status(200).send({
                success: true,
                message: "Airtable webhook endpoint is active",
                triggerId
            });
        }
    );
}

/**
 * Determine the Airtable event type from the webhook payload
 */
function determineAirtableEventType(payload: AirtableWebhookPayload): string {
    if (!payload.changedTablesById) {
        return "unknown";
    }

    // Check each table for changes
    for (const tableChanges of Object.values(payload.changedTablesById)) {
        // Record created
        if (
            tableChanges.createdRecordsById &&
            Object.keys(tableChanges.createdRecordsById).length > 0
        ) {
            return "record_created";
        }

        // Record updated
        if (
            tableChanges.changedRecordsById &&
            Object.keys(tableChanges.changedRecordsById).length > 0
        ) {
            return "record_updated";
        }

        // Record deleted
        if (tableChanges.destroyedRecordIds && tableChanges.destroyedRecordIds.length > 0) {
            return "record_deleted";
        }

        // Field changes (schema changes)
        if (
            tableChanges.changedFieldsById &&
            Object.keys(tableChanges.changedFieldsById).length > 0
        ) {
            return "field_changed";
        }

        if (
            tableChanges.createdFieldsById &&
            Object.keys(tableChanges.createdFieldsById).length > 0
        ) {
            return "field_created";
        }

        if (tableChanges.destroyedFieldIds && tableChanges.destroyedFieldIds.length > 0) {
            return "field_deleted";
        }
    }

    return "unknown";
}
