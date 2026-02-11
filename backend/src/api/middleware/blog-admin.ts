/**
 * Blog Admin Middleware
 *
 * Restricts blog admin routes to authorized users.
 * Access is controlled by the BLOG_ADMIN_EMAIL environment variable.
 */

import { FastifyRequest } from "fastify";
import { config } from "../../core/config";
import { ForbiddenError } from "./error-handler";

/**
 * Middleware that checks if the authenticated user is a blog admin.
 * Must be used after authMiddleware.
 */
export async function blogAdminMiddleware(request: FastifyRequest) {
    const blogAdminEmail = config.blogAdminEmail || "blog@flowmaestro.ai";

    if (!request.user || request.user.email !== blogAdminEmail) {
        throw new ForbiddenError("Blog admin access required");
    }
}
