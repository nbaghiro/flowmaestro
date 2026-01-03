/**
 * Google Drive Webhook Handler
 *
 * Handles push notifications from Google Drive API.
 * Google Drive uses a watch/channel system similar to Calendar:
 *
 * 1. Create a watch on a file or changes feed
 * 2. Google sends push notifications when changes occur
 * 3. Headers contain channel and resource information
 * 4. Actual changes must be fetched via Drive API
 *
 * Can watch:
 * - Individual files (for file-level changes)
 * - Changes feed (for all changes in Drive)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { providerWebhookService } from "../../../temporal/core/services/provider-webhook";

const logger = createServiceLogger("GoogleDriveWebhook");

/**
 * Google Drive push notification headers
 */
interface GoogleDrivePushHeaders {
    "x-goog-channel-id"?: string;
    "x-goog-channel-token"?: string;
    "x-goog-channel-expiration"?: string;
    "x-goog-resource-id"?: string;
    "x-goog-resource-uri"?: string;
    "x-goog-resource-state"?: string;
    "x-goog-message-number"?: string;
    "x-goog-changed"?: string; // Comma-separated list of change types
}

export async function googleDriveWebhookRoutes(fastify: FastifyInstance) {
    /**
     * Google Drive Push Notification Receiver
     * Route: POST /google-drive/:triggerId
     *
     * Receives push notifications from Google Drive API watches.
     */
    fastify.post(
        "/google-drive/:triggerId",
        {
            config: {
                rawBody: true
            }
        },
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;
            const headers = request.headers as GoogleDrivePushHeaders;

            const resourceState = headers["x-goog-resource-state"];
            const channelId = headers["x-goog-channel-id"];
            const channelToken = headers["x-goog-channel-token"];
            const resourceId = headers["x-goog-resource-id"];
            const resourceUri = headers["x-goog-resource-uri"];
            const messageNumber = headers["x-goog-message-number"];
            const channelExpiration = headers["x-goog-channel-expiration"];
            const changedTypes = headers["x-goog-changed"];

            logger.info(
                {
                    triggerId,
                    resourceState,
                    channelId,
                    resourceId,
                    messageNumber,
                    changedTypes
                },
                "Received Google Drive push notification"
            );

            // Handle sync message (initial notification when watch is created)
            if (resourceState === "sync") {
                logger.info({ triggerId, channelId }, "Google Drive watch sync confirmed");
                return reply.status(200).send({ success: true, message: "Sync acknowledged" });
            }

            // Get raw body
            const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;

            // Parse changed types (e.g., "content,properties,permissions")
            const changes = changedTypes ? changedTypes.split(",").map((c) => c.trim()) : [];

            // Determine event type from resource state and changes
            const eventType = mapDriveResourceState(resourceState, changes);

            // Process through provider webhook service
            const response = await providerWebhookService.processProviderWebhook({
                providerId: "google-drive",
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
                    changes,
                    // The actual file data needs to be fetched via Drive API
                    note: "Fetch file details via Drive API using resourceUri or resourceId"
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
     * Google Drive Changes Feed Webhook
     * Route: POST /google-drive/:triggerId/changes
     *
     * Receives push notifications for the changes feed.
     * This watches all changes in a user's Drive.
     */
    fastify.post(
        "/google-drive/:triggerId/changes",
        {
            config: {
                rawBody: true
            }
        },
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;
            const headers = request.headers as GoogleDrivePushHeaders;

            const resourceState = headers["x-goog-resource-state"];
            const channelId = headers["x-goog-channel-id"];
            const resourceId = headers["x-goog-resource-id"];

            logger.info(
                { triggerId, resourceState, channelId, resourceId },
                "Received Google Drive changes feed notification"
            );

            // Handle sync message
            if (resourceState === "sync") {
                logger.info({ triggerId, channelId }, "Google Drive changes watch sync confirmed");
                return reply.status(200).send({ success: true, message: "Sync acknowledged" });
            }

            // Get raw body
            const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;

            // Process through provider webhook service
            const response = await providerWebhookService.processProviderWebhook({
                providerId: "google-drive",
                triggerId,
                headers: request.headers as Record<string, string | string[] | undefined>,
                body: {
                    eventType: "changes_detected",
                    channelId,
                    resourceId,
                    resourceState,
                    watchType: "changes-feed",
                    // Use Drive API changes.list with pageToken to get actual changes
                    note: "Use changes.list API with saved pageToken to get changed files"
                },
                rawBody,
                query: request.query as Record<string, unknown>,
                method: request.method,
                path: request.url,
                ip: request.ip,
                userAgent: request.headers["user-agent"] as string
            });

            return reply.status(200).send({
                success: response.success,
                executionId: response.executionId
            });
        }
    );

    /**
     * Google Drive Webhook Verification/Ping Handler
     * Route: GET /google-drive/:triggerId
     */
    fastify.get(
        "/google-drive/:triggerId",
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;

            logger.info({ triggerId }, "Google Drive webhook verification ping");

            return reply.status(200).send({
                success: true,
                message: "Google Drive webhook endpoint is active",
                triggerId,
                watchTypes: ["file", "changes-feed"]
            });
        }
    );
}

/**
 * Map Google Drive resource state and changes to event type
 */
function mapDriveResourceState(state: string | undefined, changes: string[]): string {
    // For file watches, state indicates the file status
    switch (state) {
        case "sync":
            return "sync";
        case "add":
            return "file_created";
        case "remove":
            return "file_deleted";
        case "trash":
            return "file_trashed";
        case "untrash":
            return "file_restored";
        case "change":
        case "update":
            // Use changes header to be more specific
            if (changes.includes("content")) {
                return "file_content_changed";
            }
            if (changes.includes("properties")) {
                return "file_properties_changed";
            }
            if (changes.includes("permissions")) {
                return "file_permissions_changed";
            }
            if (changes.includes("parents")) {
                return "file_moved";
            }
            return "file_updated";
        default:
            return state || "unknown";
    }
}

/**
 * Google Drive Push Notification Types:
 *
 * Resource States:
 * - sync - Initial sync notification when watch is created
 * - add - File added (new file created)
 * - remove - File permanently deleted
 * - update - File updated
 * - trash - File moved to trash
 * - untrash - File restored from trash
 * - change - Generic change notification
 *
 * Change Types (X-Goog-Changed header):
 * - content - File content was modified
 * - properties - File properties/metadata changed
 * - permissions - Sharing permissions changed
 * - parents - File was moved (parent folder changed)
 *
 * Watch Types:
 * 1. File Watch - Watch a specific file for changes
 *    - Good for monitoring important documents
 *    - Get notified when file is edited, shared, moved, trashed
 *
 * 2. Changes Feed Watch - Watch all changes in Drive
 *    - Good for syncing or monitoring all activity
 *    - Use changes.list API to get actual changed files
 *    - More efficient than watching many individual files
 *
 * Important Notes:
 * 1. Push notifications only signal that something changed
 * 2. Actual change details must be fetched via Drive API
 * 3. Watches expire (default ~1 hour, can request up to 24 hours)
 * 4. Channel tokens should be used to verify requests
 * 5. For shared drives, use driveId parameter in watch request
 */
