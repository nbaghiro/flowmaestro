/**
 * Google Calendar Webhook Handler
 *
 * Handles push notifications from Google Calendar API.
 * Google Calendar uses a watch/channel system:
 *
 * 1. Create a watch on a calendar or event list
 * 2. Google sends push notifications to our webhook URL
 * 3. We receive headers with channel and resource info
 * 4. The body is typically empty - we need to fetch changes via API
 *
 * Signature verification: Google uses channel tokens for verification
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { providerWebhookService } from "../../../temporal/core/services/provider-webhook";

const logger = createServiceLogger("GoogleCalendarWebhook");

/**
 * Google Calendar push notification headers
 */
interface GoogleCalendarPushHeaders {
    "x-goog-channel-id"?: string;
    "x-goog-channel-token"?: string;
    "x-goog-channel-expiration"?: string;
    "x-goog-resource-id"?: string;
    "x-goog-resource-uri"?: string;
    "x-goog-resource-state"?: string;
    "x-goog-message-number"?: string;
}

export async function googleCalendarWebhookRoutes(fastify: FastifyInstance) {
    /**
     * Google Calendar Push Notification Receiver
     * Route: POST /google-calendar/:triggerId
     *
     * Receives push notifications from Google Calendar API watches.
     * The body is typically empty - changes must be fetched via Calendar API.
     */
    fastify.post(
        "/google-calendar/:triggerId",
        {
            config: {
                rawBody: true
            }
        },
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;
            const headers = request.headers as GoogleCalendarPushHeaders;

            const resourceState = headers["x-goog-resource-state"];
            const channelId = headers["x-goog-channel-id"];
            const channelToken = headers["x-goog-channel-token"];
            const resourceId = headers["x-goog-resource-id"];
            const resourceUri = headers["x-goog-resource-uri"];
            const messageNumber = headers["x-goog-message-number"];
            const channelExpiration = headers["x-goog-channel-expiration"];

            logger.info(
                {
                    triggerId,
                    resourceState,
                    channelId,
                    resourceId,
                    messageNumber
                },
                "Received Google Calendar push notification"
            );

            // Handle sync message (initial notification when watch is created)
            if (resourceState === "sync") {
                logger.info({ triggerId, channelId }, "Google Calendar watch sync confirmed");
                return reply.status(200).send({ success: true, message: "Sync acknowledged" });
            }

            // Get raw body (usually empty for Calendar notifications)
            const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;

            // Determine event type from resource state
            const eventType = mapCalendarResourceState(resourceState);

            // Process through provider webhook service
            const response = await providerWebhookService.processProviderWebhook({
                providerId: "google-calendar",
                triggerId,
                headers: request.headers as Record<string, string | string[] | undefined>,
                body: {
                    eventType,
                    channelId,
                    channelToken,
                    resourceId,
                    resourceUri,
                    resourceState,
                    messageNumber,
                    channelExpiration,
                    // The actual event data needs to be fetched via Calendar API
                    // The workflow should use the resourceUri to get updated events
                    note: "Fetch updated events via Calendar API using resourceUri"
                },
                rawBody,
                query: request.query as Record<string, unknown>,
                method: request.method,
                path: request.url,
                ip: request.ip,
                userAgent: request.headers["user-agent"] as string
            });

            // Google expects a quick 200 response
            return reply.status(200).send({
                success: response.success,
                executionId: response.executionId
            });
        }
    );

    /**
     * Google Calendar Webhook Verification/Ping Handler
     * Route: GET /google-calendar/:triggerId
     */
    fastify.get(
        "/google-calendar/:triggerId",
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;

            logger.info({ triggerId }, "Google Calendar webhook verification ping");

            return reply.status(200).send({
                success: true,
                message: "Google Calendar webhook endpoint is active",
                triggerId
            });
        }
    );

    /**
     * Stop Channel Handler
     * Route: POST /google-calendar/:triggerId/stop
     *
     * Endpoint to receive channel stop confirmations.
     * Called when a watch is explicitly stopped.
     */
    fastify.post(
        "/google-calendar/:triggerId/stop",
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;
            const headers = request.headers as GoogleCalendarPushHeaders;

            const channelId = headers["x-goog-channel-id"];

            logger.info({ triggerId, channelId }, "Google Calendar watch stopped");

            return reply.status(200).send({
                success: true,
                message: "Watch stop acknowledged"
            });
        }
    );
}

/**
 * Map Google Calendar resource state to event type
 */
function mapCalendarResourceState(state: string | undefined): string {
    switch (state) {
        case "sync":
            return "sync";
        case "exists":
            return "calendar_updated";
        case "not_exists":
            return "calendar_deleted";
        default:
            return state || "unknown";
    }
}

/**
 * Google Calendar Push Notification Types:
 *
 * Resource States:
 * - sync - Initial sync notification when watch is created
 * - exists - Resource exists and has been modified
 * - not_exists - Resource has been deleted
 *
 * Watch Types (what you can watch):
 * - Calendar List - Changes to user's calendar list
 * - Events - Changes to events on a specific calendar
 * - ACL - Changes to calendar access control
 * - Settings - Changes to user calendar settings
 *
 * Common Event Changes Detected:
 * - Event created
 * - Event updated (time, title, description, attendees)
 * - Event deleted
 * - Event response changed (accepted, declined, tentative)
 * - Recurring event instance modified
 *
 * Important Notes:
 * 1. Push notifications only indicate that something changed
 * 2. The actual change details must be fetched via Calendar API
 * 3. Use incremental sync (syncToken) to get only changed events
 * 4. Watches expire after ~7 days and must be renewed
 * 5. Channel tokens can be used for verification
 */
