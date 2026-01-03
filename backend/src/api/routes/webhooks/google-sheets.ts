/**
 * Google Sheets Webhook Handler
 *
 * Google Sheets doesn't have native webhook support.
 * This handler supports two approaches:
 *
 * 1. Google Apps Script triggers - Users can set up Apps Script
 *    that sends HTTP requests to our webhook on changes
 *
 * 2. Drive API watch notifications - Since Sheets are Drive files,
 *    we can watch for file changes via Drive API push notifications
 *
 * For polling-based triggers, see the scheduled trigger system.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { providerWebhookService } from "../../../temporal/core/services/provider-webhook";

const logger = createServiceLogger("GoogleSheetsWebhook");

/**
 * Google Apps Script webhook payload
 * This is what users would send from their Apps Script
 */
interface AppsScriptWebhookPayload {
    spreadsheetId: string;
    spreadsheetName?: string;
    sheetId?: number;
    sheetName?: string;
    eventType: string; // "onEdit", "onChange", "onFormSubmit"
    range?: string;
    oldValue?: unknown;
    newValue?: unknown;
    user?: {
        email?: string;
        name?: string;
    };
    timestamp?: string;
    [key: string]: unknown;
}

/**
 * Google Drive push notification headers
 * Used when watching a spreadsheet via Drive API
 */
interface GoogleDrivePushHeaders {
    "x-goog-channel-id"?: string;
    "x-goog-channel-token"?: string;
    "x-goog-channel-expiration"?: string;
    "x-goog-resource-id"?: string;
    "x-goog-resource-uri"?: string;
    "x-goog-resource-state"?: string;
    "x-goog-message-number"?: string;
}

export async function googleSheetsWebhookRoutes(fastify: FastifyInstance) {
    /**
     * Google Sheets Apps Script Webhook
     * Route: POST /google-sheets/:triggerId
     *
     * Receives webhooks from Google Apps Script triggers.
     * Users configure Apps Script to POST to this endpoint on sheet changes.
     */
    fastify.post(
        "/google-sheets/:triggerId",
        {
            config: {
                rawBody: true
            }
        },
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;
            const headers = request.headers as GoogleDrivePushHeaders;

            // Check if this is a Drive API push notification or Apps Script webhook
            const isDrivePush = headers["x-goog-resource-state"] !== undefined;

            if (isDrivePush) {
                return handleDrivePushNotification(request, reply, triggerId, headers);
            }

            // Apps Script webhook
            const payload = request.body as AppsScriptWebhookPayload;

            logger.info(
                {
                    triggerId,
                    spreadsheetId: payload.spreadsheetId,
                    eventType: payload.eventType,
                    sheetName: payload.sheetName
                },
                "Received Google Sheets Apps Script webhook"
            );

            // Get raw body for logging
            const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;

            // Process through provider webhook service
            const response = await providerWebhookService.processProviderWebhook({
                providerId: "google-sheets",
                triggerId,
                headers: request.headers as Record<string, string | string[] | undefined>,
                body: {
                    ...payload,
                    source: "apps-script"
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
                error: response.error
            });
        }
    );

    /**
     * Google Sheets Webhook Ping Handler
     * Route: GET /google-sheets/:triggerId
     */
    fastify.get(
        "/google-sheets/:triggerId",
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;

            logger.info({ triggerId }, "Google Sheets webhook verification ping");

            return reply.status(200).send({
                success: true,
                message: "Google Sheets webhook endpoint is active",
                triggerId,
                supportedSources: ["apps-script", "drive-push"]
            });
        }
    );
}

/**
 * Handle Google Drive push notification for a spreadsheet
 */
async function handleDrivePushNotification(
    request: FastifyRequest<{ Params: { triggerId: string } }>,
    reply: FastifyReply,
    triggerId: string,
    headers: GoogleDrivePushHeaders
): Promise<void> {
    const resourceState = headers["x-goog-resource-state"];
    const channelId = headers["x-goog-channel-id"];
    const resourceId = headers["x-goog-resource-id"];
    const messageNumber = headers["x-goog-message-number"];

    logger.info(
        {
            triggerId,
            resourceState,
            channelId,
            resourceId,
            messageNumber
        },
        "Received Google Drive push notification for spreadsheet"
    );

    // Handle sync message (initial notification when watch is created)
    if (resourceState === "sync") {
        logger.info({ triggerId, channelId }, "Google Drive watch sync confirmed");
        reply.status(200).send({ success: true, message: "Sync acknowledged" });
        return;
    }

    // Get raw body
    const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;

    // Map Drive resource states to event types
    const eventType = mapDriveResourceState(resourceState);

    // Process through provider webhook service
    const response = await providerWebhookService.processProviderWebhook({
        providerId: "google-sheets",
        triggerId,
        headers: request.headers as Record<string, string | string[] | undefined>,
        body: {
            eventType,
            source: "drive-push",
            channelId,
            resourceId,
            resourceState,
            messageNumber,
            resourceUri: headers["x-goog-resource-uri"],
            channelExpiration: headers["x-goog-channel-expiration"]
        },
        rawBody,
        query: request.query as Record<string, unknown>,
        method: request.method,
        path: request.url,
        ip: request.ip,
        userAgent: request.headers["user-agent"] as string
    });

    reply.status(response.statusCode).send({
        success: response.success,
        executionId: response.executionId
    });
}

/**
 * Map Google Drive resource state to event type
 */
function mapDriveResourceState(state: string | undefined): string {
    switch (state) {
        case "sync":
            return "sync";
        case "add":
            return "file_created";
        case "remove":
            return "file_deleted";
        case "update":
            return "file_updated";
        case "trash":
            return "file_trashed";
        case "untrash":
            return "file_restored";
        case "change":
            return "file_changed";
        default:
            return state || "unknown";
    }
}

/**
 * Google Sheets Event Types:
 *
 * Apps Script Triggers (user-configured):
 * - onEdit - Cell edited by user
 * - onChange - Structural changes (add/remove sheets, rows, columns)
 * - onFormSubmit - Form response submitted to sheet
 * - onOpen - Spreadsheet opened (limited use for webhooks)
 *
 * Drive Push Notifications (file-level):
 * - sync - Initial sync when watch is created
 * - add - File created (not applicable for existing sheets)
 * - remove - File permanently deleted
 * - update - File content or metadata changed
 * - trash - File moved to trash
 * - untrash - File restored from trash
 * - change - Generic change notification
 *
 * Note: For real-time cell-level changes, Apps Script triggers
 * provide more granular data than Drive push notifications.
 */
