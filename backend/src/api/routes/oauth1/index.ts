import { authMiddleware } from "../../middleware/auth";
import { oauth1CallbackRoute } from "./callback";
import { requestTokenHandler } from "./request-token";
import type { FastifyInstance } from "fastify";

/**
 * OAuth 1.0a routes
 *
 * Handles OAuth 1.0a authorization flows for providers like Evernote.
 */
export async function oauth1Routes(fastify: FastifyInstance): Promise<void> {
    // Request token endpoint (requires auth - initiates the flow)
    fastify.get<{ Params: { provider: string } }>(
        "/:provider/request-token",
        {
            preHandler: [authMiddleware]
        },
        requestTokenHandler
    );

    // Callback endpoint (no auth - receives the callback from provider)
    await fastify.register(oauth1CallbackRoute);
}
