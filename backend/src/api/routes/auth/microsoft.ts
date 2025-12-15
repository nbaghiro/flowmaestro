import { FastifyInstance } from "fastify";
import { oauthService } from "../../../services/oauth/OAuthService";
import { UserRepository } from "../../../storage/repositories/UserRepository";
import { authMiddleware } from "../../middleware";

/**
 * Microsoft OAuth routes for authentication
 */
export async function microsoftAuthRoutes(fastify: FastifyInstance) {
    /**
     * GET /auth/microsoft
     *
     * Initiate Microsoft OAuth authentication flow
     * Redirects to Microsoft consent screen for login/signup
     */
    fastify.get("/microsoft", async (_request, reply) => {
        try {
            // Use "PENDING_AUTH" as userId since user doesn't exist yet
            const authUrl = oauthService.generateAuthUrl("microsoft-auth", "PENDING_AUTH");
            return reply.redirect(authUrl);
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            fastify.log.error(error, "Failed to initiate Microsoft OAuth");

            return reply.status(500).send({
                success: false,
                error: errorMsg
            });
        }
    });

    /**
     * POST /auth/microsoft/unlink
     *
     * Unlink Microsoft account from user
     * Requires authentication and that user has a password set
     */
    fastify.post(
        "/microsoft/unlink",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const userId = request.user!.id;
            const userRepository = new UserRepository();

            try {
                // Get user to check if they have a password
                const user = await userRepository.findById(userId);

                if (!user) {
                    return reply.status(404).send({
                        success: false,
                        error: "User not found"
                    });
                }

                // Don't allow unlinking if user doesn't have another auth method
                const hasOtherAuthMethod = !!user.password_hash || !!user.google_id;
                if (!hasOtherAuthMethod) {
                    return reply.status(400).send({
                        success: false,
                        error: "Cannot unlink Microsoft account. Please set a password or connect another account first."
                    });
                }

                // Check if Microsoft is actually linked
                if (!user.microsoft_id) {
                    return reply.status(400).send({
                        success: false,
                        error: "Microsoft account is not linked"
                    });
                }

                // Unlink Microsoft account
                await userRepository.update(userId, {
                    microsoft_id: null,
                    avatar_url: null
                });

                fastify.log.info(`User ${userId} unlinked Microsoft account`);

                return reply.send({
                    success: true,
                    data: {
                        message: "Microsoft account disconnected successfully"
                    }
                });
            } catch (error: unknown) {
                const errorMsg = error instanceof Error ? error.message : "Unknown error";
                fastify.log.error(error, `Failed to unlink Microsoft for user ${userId}`);

                return reply.status(500).send({
                    success: false,
                    error: errorMsg
                });
            }
        }
    );
}
