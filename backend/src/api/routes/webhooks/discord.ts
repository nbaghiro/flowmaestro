/**
 * Discord Webhook Handler
 *
 * Handles incoming webhooks from Discord for:
 * - Message events (MESSAGE_CREATE, MESSAGE_UPDATE, MESSAGE_DELETE)
 * - Interaction events (slash commands, buttons, select menus)
 * - Member events (GUILD_MEMBER_ADD, GUILD_MEMBER_REMOVE)
 * - Reaction events (MESSAGE_REACTION_ADD, MESSAGE_REACTION_REMOVE)
 *
 * Signature verification uses Ed25519 with X-Signature-Ed25519 and X-Signature-Timestamp headers
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { providerWebhookService } from "../../../temporal/core/services/provider-webhook";

const logger = createServiceLogger("DiscordWebhook");

interface DiscordInteractionPayload {
    type: number; // 1 = PING, 2 = APPLICATION_COMMAND, 3 = MESSAGE_COMPONENT, etc.
    id: string;
    application_id: string;
    token?: string;
    guild_id?: string;
    channel_id?: string;
    member?: {
        user: {
            id: string;
            username: string;
            discriminator: string;
        };
        roles?: string[];
    };
    user?: {
        id: string;
        username: string;
        discriminator: string;
    };
    data?: {
        id?: string;
        name?: string;
        type?: number;
        options?: Array<{
            name: string;
            type: number;
            value?: unknown;
        }>;
        custom_id?: string;
        component_type?: number;
        values?: string[];
    };
    message?: {
        id: string;
        content: string;
        author: {
            id: string;
            username: string;
        };
    };
    [key: string]: unknown;
}

// Discord interaction types
const INTERACTION_TYPE = {
    PING: 1,
    APPLICATION_COMMAND: 2,
    MESSAGE_COMPONENT: 3,
    APPLICATION_COMMAND_AUTOCOMPLETE: 4,
    MODAL_SUBMIT: 5
};

// Discord interaction response types
const INTERACTION_RESPONSE_TYPE = {
    PONG: 1,
    CHANNEL_MESSAGE_WITH_SOURCE: 4,
    DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
    DEFERRED_UPDATE_MESSAGE: 6,
    UPDATE_MESSAGE: 7,
    APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
    MODAL: 9
};

export async function discordWebhookRoutes(fastify: FastifyInstance) {
    /**
     * Discord Interactions Webhook
     * Route: POST /discord/:triggerId
     *
     * Handles Discord interactions (slash commands, buttons, etc.)
     * Discord requires immediate response within 3 seconds.
     */
    fastify.post(
        "/discord/:triggerId",
        {
            config: {
                rawBody: true // Need raw body for Ed25519 signature verification
            }
        },
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;
            const payload = request.body as DiscordInteractionPayload;

            logger.info(
                {
                    triggerId,
                    interactionType: payload.type,
                    interactionId: payload.id
                },
                "Received Discord webhook"
            );

            // Handle PING interaction (Discord verification)
            if (payload.type === INTERACTION_TYPE.PING) {
                logger.info({ triggerId }, "Discord PING verification");
                return reply.status(200).send({
                    type: INTERACTION_RESPONSE_TYPE.PONG
                });
            }

            // Get raw body for signature verification
            const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;

            // Process through provider webhook service
            const response = await providerWebhookService.processProviderWebhook({
                providerId: "discord",
                triggerId,
                headers: request.headers as Record<string, string | string[] | undefined>,
                body: {
                    ...payload,
                    // Add derived event type for easier filtering
                    eventType: getDiscordEventType(payload)
                },
                rawBody,
                query: request.query as Record<string, unknown>,
                method: request.method,
                path: request.url,
                ip: request.ip,
                userAgent: request.headers["user-agent"] as string
            });

            // Discord expects specific response format for interactions
            if (response.success) {
                // For slash commands and components, respond with deferred message
                // This allows the workflow to take longer than 3 seconds
                if (
                    payload.type === INTERACTION_TYPE.APPLICATION_COMMAND ||
                    payload.type === INTERACTION_TYPE.MESSAGE_COMPONENT
                ) {
                    return reply.status(200).send({
                        type: INTERACTION_RESPONSE_TYPE.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
                    });
                }

                // For autocomplete, we can't defer
                if (payload.type === INTERACTION_TYPE.APPLICATION_COMMAND_AUTOCOMPLETE) {
                    return reply.status(200).send({
                        type: INTERACTION_RESPONSE_TYPE.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
                        data: { choices: [] }
                    });
                }

                // For modal submissions
                if (payload.type === INTERACTION_TYPE.MODAL_SUBMIT) {
                    return reply.status(200).send({
                        type: INTERACTION_RESPONSE_TYPE.DEFERRED_UPDATE_MESSAGE
                    });
                }
            }

            // For errors, still return a valid response to Discord
            return reply.status(200).send({
                type: INTERACTION_RESPONSE_TYPE.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: response.error || "An error occurred processing your request.",
                    flags: 64 // Ephemeral flag - only visible to user
                }
            });
        }
    );

    /**
     * Discord Gateway Events Webhook
     * Route: POST /discord/:triggerId/events
     *
     * For Discord bot events sent via custom webhook (not standard Discord interactions).
     * This is for bots that forward gateway events to a webhook URL.
     */
    fastify.post(
        "/discord/:triggerId/events",
        {
            config: {
                rawBody: true
            }
        },
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;
            const payload = request.body as Record<string, unknown>;

            const eventType = (payload.t || payload.type || "unknown") as string;

            logger.info({ triggerId, eventType }, "Received Discord gateway event");

            // Get raw body for signature verification
            const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;

            // Process through provider webhook service
            const response = await providerWebhookService.processProviderWebhook({
                providerId: "discord",
                triggerId,
                headers: request.headers as Record<string, string | string[] | undefined>,
                body: {
                    ...payload,
                    eventType
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
     * Discord Webhook Ping Handler
     * Route: GET /discord/:triggerId
     */
    fastify.get(
        "/discord/:triggerId",
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;

            logger.info({ triggerId }, "Discord webhook verification ping");

            return reply.status(200).send({
                success: true,
                message: "Discord webhook endpoint is active",
                triggerId
            });
        }
    );
}

/**
 * Get Discord event type from interaction payload
 */
function getDiscordEventType(payload: DiscordInteractionPayload): string {
    switch (payload.type) {
        case INTERACTION_TYPE.PING:
            return "ping";

        case INTERACTION_TYPE.APPLICATION_COMMAND:
            if (payload.data?.name) {
                return `command:${payload.data.name}`;
            }
            return "command";

        case INTERACTION_TYPE.MESSAGE_COMPONENT:
            if (payload.data?.custom_id) {
                return `component:${payload.data.custom_id}`;
            }
            return "component";

        case INTERACTION_TYPE.APPLICATION_COMMAND_AUTOCOMPLETE:
            return "autocomplete";

        case INTERACTION_TYPE.MODAL_SUBMIT:
            if (payload.data?.custom_id) {
                return `modal:${payload.data.custom_id}`;
            }
            return "modal";

        default:
            return "unknown";
    }
}

/**
 * Discord Event Types (for gateway events):
 *
 * Messages:
 * - MESSAGE_CREATE - New message sent
 * - MESSAGE_UPDATE - Message edited
 * - MESSAGE_DELETE - Message deleted
 * - MESSAGE_DELETE_BULK - Multiple messages deleted
 *
 * Reactions:
 * - MESSAGE_REACTION_ADD - Reaction added to message
 * - MESSAGE_REACTION_REMOVE - Reaction removed from message
 * - MESSAGE_REACTION_REMOVE_ALL - All reactions removed
 *
 * Members:
 * - GUILD_MEMBER_ADD - Member joined server
 * - GUILD_MEMBER_REMOVE - Member left/kicked from server
 * - GUILD_MEMBER_UPDATE - Member updated (roles, nickname)
 *
 * Channels:
 * - CHANNEL_CREATE - Channel created
 * - CHANNEL_UPDATE - Channel updated
 * - CHANNEL_DELETE - Channel deleted
 *
 * Voice:
 * - VOICE_STATE_UPDATE - Voice state changed (join/leave/mute/deaf)
 *
 * Interactions:
 * - INTERACTION_CREATE - Slash command, button, select menu used
 */
