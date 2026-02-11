/**
 * Admin Middleware
 *
 * Middleware to restrict access to admin-only routes.
 * Must be used after authMiddleware to ensure request.user is available.
 */

import { FastifyRequest } from "fastify";
import { UserRepository } from "../../storage/repositories/UserRepository";
import { ForbiddenError, UnauthorizedError } from "./error-handler";

const userRepository = new UserRepository();

/**
 * Middleware that requires the authenticated user to have admin privileges.
 * Fetches the user from database to ensure fresh admin status.
 */
export async function adminMiddleware(request: FastifyRequest): Promise<void> {
    if (!request.user?.id) {
        throw new UnauthorizedError("Authentication required");
    }

    const user = await userRepository.findById(request.user.id);

    if (!user) {
        throw new UnauthorizedError("User not found");
    }

    if (!user.is_admin) {
        throw new ForbiddenError("Admin access required");
    }
}
