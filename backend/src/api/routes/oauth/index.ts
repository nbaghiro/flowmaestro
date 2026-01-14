import { FastifyInstance } from "fastify";
import { authMiddleware } from "../../middleware/auth";
import { authorizeRoute } from "./authorize";
import { callbackRoute } from "./callback";
import { deviceFlowRoutes } from "./device";
import { listProvidersRoute } from "./list-providers";
import { refreshRoute } from "./refresh";
import { revokeRoute } from "./revoke";
import {
    getSchedulerStatus,
    triggerSchedulerRefresh,
    resetCircuitBreaker
} from "./scheduler-status";

/**
 * OAuth Routes
 *
 * Generic OAuth 2.0 integration system.
 * Works with ANY OAuth provider configured in the registry.
 *
 * Routes:
 * - GET  /oauth/providers                      - List available providers
 * - GET  /oauth/:provider/authorize            - Get authorization URL
 * - GET  /oauth/:provider/callback             - OAuth callback handler (generic!)
 * - POST /oauth/:provider/refresh/:credentialId - Manually refresh token
 * - POST /oauth/:provider/revoke/:credentialId  - Revoke token and delete credential
 * - GET  /oauth/scheduler/status               - Get scheduler status (admin)
 * - POST /oauth/scheduler/refresh              - Trigger manual refresh (admin)
 * - POST /oauth/scheduler/reset-circuit        - Reset circuit breaker (admin)
 *
 * Device Authorization Flow (RFC 8628) for CLI:
 * - POST /oauth/device/code                    - Generate device code for CLI
 * - POST /oauth/device/token                   - Poll for token (CLI polling)
 * - GET  /oauth/device/verify                  - User verification page
 * - POST /oauth/device/verify                  - Authorize/deny device
 */
export async function oauthRoutes(fastify: FastifyInstance) {
    await listProvidersRoute(fastify);
    await authorizeRoute(fastify);
    await callbackRoute(fastify);
    await refreshRoute(fastify);
    await revokeRoute(fastify);
    await deviceFlowRoutes(fastify);

    // Admin endpoints for scheduler monitoring
    fastify.get("/oauth/scheduler/status", { preHandler: [authMiddleware] }, getSchedulerStatus);
    fastify.post(
        "/oauth/scheduler/refresh",
        { preHandler: [authMiddleware] },
        triggerSchedulerRefresh
    );
    fastify.post(
        "/oauth/scheduler/reset-circuit",
        { preHandler: [authMiddleware] },
        resetCircuitBreaker
    );
}
