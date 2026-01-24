import { z } from "zod";
import { createServiceLogger } from "../../../core/logging";
import { isOAuth1Provider } from "../../../services/oauth/OAuth1ProviderRegistry";
import { oauth1Service } from "../../../services/oauth/OAuth1Service";
import type { FastifyRequest, FastifyReply } from "fastify";

const logger = createServiceLogger("OAuth1RequestToken");

const paramsSchema = z.object({
    provider: z.string()
});

interface RequestTokenParams {
    provider: string;
}

type RequestTokenRequest = FastifyRequest<{
    Params: RequestTokenParams;
}>;

/**
 * GET /oauth1/:provider/request-token
 *
 * Initiates OAuth 1.0a flow by:
 * 1. Getting a request token from the provider
 * 2. Returning the authorization URL for the user to visit
 *
 * This is the first step in OAuth 1.0a (equivalent to OAuth 2.0's authorize endpoint)
 */
export async function requestTokenHandler(
    request: RequestTokenRequest,
    reply: FastifyReply
): Promise<void> {
    try {
        // Validate params
        const { provider } = paramsSchema.parse(request.params);

        // Check if provider uses OAuth 1.0a
        if (!isOAuth1Provider(provider)) {
            return reply.code(400).send({
                success: false,
                error: `Provider ${provider} does not use OAuth 1.0a`
            });
        }

        // Get user from auth middleware (set by fastify-jwt)
        const userId = request.user.id;

        // Get workspace ID from header
        const workspaceId = request.headers["x-workspace-id"] as string;
        if (!workspaceId) {
            return reply.code(400).send({
                success: false,
                error: "Workspace ID required"
            });
        }

        logger.info({ provider, userId }, "Starting OAuth 1.0a flow");

        // Get request token and authorization URL
        const result = await oauth1Service.getRequestToken(provider, userId, workspaceId);

        reply.send({
            success: true,
            data: {
                authUrl: result.authUrl,
                provider
            }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.error({ err: errorMessage }, "Failed to get request token");

        reply.code(500).send({
            success: false,
            error: `Failed to initiate OAuth 1.0a flow: ${errorMessage}`
        });
    }
}
