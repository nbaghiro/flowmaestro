import { FastifyInstance } from "fastify";
import { oauthService } from "../../../services/oauth/OAuthService";
import { UserRepository } from "../../../storage/repositories/UserRepository";
import { authMiddleware } from "../../middleware";

/**
 * Google OAuth routes for authentication
 */
export async function googleAuthRoutes(fastify: FastifyInstance) {
    /**
     * GET /auth/google
     *
     * Initiate Google OAuth authentication flow
     * Redirects to Google consent screen for login/signup
     */
    fastify.get("/google", async (_request, reply) => {
        try {
            // Use "PENDING_AUTH" as userId/workspaceId since user doesn't exist yet
            // For auth flows (google-auth), the workspaceId in state is not used since
            // the callback handles auth differently (creates user, not connection)
            const authUrl = oauthService.generateAuthUrl(
                "google-auth",
                "PENDING_AUTH",
                "PENDING_AUTH"
            );
            return reply.redirect(authUrl);
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            fastify.log.error(error, "Failed to initiate Google OAuth");

            return reply.status(500).send({
                success: false,
                error: errorMsg
            });
        }
    });

    /**
     * POST /auth/google/unlink
     *
     * Unlink Google account from user
     * Requires authentication and that user has a password set
     */
    fastify.post(
        "/google/unlink",
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
                const hasOtherAuthMethod = !!user.password_hash || !!user.microsoft_id;
                if (!hasOtherAuthMethod) {
                    return reply.status(400).send({
                        success: false,
                        error: "Cannot unlink Google account. Please set a password or connect another account first."
                    });
                }

                // Check if Google is actually linked
                if (!user.google_id) {
                    return reply.status(400).send({
                        success: false,
                        error: "Google account is not linked"
                    });
                }

                // Unlink Google account
                await userRepository.update(userId, {
                    google_id: null,
                    avatar_url: null
                });

                fastify.log.info(`User ${userId} unlinked Google account`);

                return reply.send({
                    success: true,
                    data: {
                        message: "Google account disconnected successfully"
                    }
                });
            } catch (error: unknown) {
                const errorMsg = error instanceof Error ? error.message : "Unknown error";
                fastify.log.error(error, `Failed to unlink Google for user ${userId}`);

                return reply.status(500).send({
                    success: false,
                    error: errorMsg
                });
            }
        }
    );
}
