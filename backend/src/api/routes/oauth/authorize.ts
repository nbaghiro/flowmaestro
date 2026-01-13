import { FastifyInstance } from "fastify";
import { oauthService } from "../../../services/oauth/OAuthService";
import { authMiddleware } from "../../middleware";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";

interface AuthorizeParams {
    provider: string;
}

interface AuthorizeQuerystring {
    subdomain?: string;
    // Add other provider-specific settings here as needed
}

/**
 * GET /oauth/:provider/authorize
 *
 * Generate OAuth authorization URL for the specified provider.
 * User will be redirected to this URL to grant permissions.
 *
 * Query parameters can include provider-specific settings:
 * - subdomain: Required for Zendesk (e.g., ?subdomain=mycompany)
 *
 * Requires authentication and workspace context.
 */
export async function authorizeRoute(fastify: FastifyInstance) {
    fastify.get<{ Params: AuthorizeParams; Querystring: AuthorizeQuerystring }>(
        "/:provider/authorize",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware]
        },
        async (request, reply) => {
            const { provider } = request.params;
            const { subdomain } = request.query;
            const userId = request.user!.id;
            const workspaceId = request.workspace!.id;

            try {
                // Build options object from query params
                const options: { subdomain?: string } = {};
                if (subdomain) {
                    options.subdomain = subdomain;
                }

                const authUrl = oauthService.generateAuthUrl(
                    provider,
                    userId,
                    workspaceId,
                    Object.keys(options).length > 0 ? options : undefined
                );

                return reply.send({
                    success: true,
                    data: {
                        authUrl,
                        provider
                    }
                });
            } catch (error: unknown) {
                const errorMsg = error instanceof Error ? error.message : "Unknown error";
                fastify.log.error(error, `Failed to generate auth URL for ${provider}`);

                return reply.status(400).send({
                    success: false,
                    error: errorMsg || `Failed to generate authorization URL for ${provider}`
                });
            }
        }
    );
}
