import crypto from "crypto";
import { FastifyInstance } from "fastify";
import { emailService } from "../../../services/email/EmailService";
import { UserRepository } from "../../../storage/repositories";
import { EmailVerificationTokenRepository } from "../../../storage/repositories/EmailVerificationTokenRepository";
import { authMiddleware } from "../../middleware";

export async function meRoute(fastify: FastifyInstance) {
    fastify.get(
        "/me",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const userRepository = new UserRepository();

            // User is authenticated, request.user is set by authMiddleware
            const userId = request.user.id;

            // Get fresh user data from database
            const user = await userRepository.findById(userId);

            if (!user) {
                return reply.status(404).send({
                    success: false,
                    error: "User not found"
                });
            }

            return reply.send({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        avatar_url: user.avatar_url,
                        google_id: user.google_id,
                        microsoft_id: user.microsoft_id,
                        has_password: !!user.password_hash
                    }
                }
            });
        }
    );

    fastify.post(
        "/me/name",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const userRepository = new UserRepository();
            const userId = request.user.id;

            const { name } = request.body as { name: string };

            // Update user
            const updated = await userRepository.update(userId, { name });

            if (!updated) {
                return reply.status(404).send({
                    success: false,
                    error: "User not found"
                });
            }

            // Notification email
            await emailService.sendNameChangedNotification(updated.email, updated.name || "");

            return reply.send({
                success: true,
                data: {
                    user: {
                        id: updated.id,
                        email: updated.email,
                        avatar_url: updated.avatar_url,
                        google_id: updated.google_id,
                        microsoft_id: updated.microsoft_id,
                        has_password: !!updated.password_hash
                    }
                }
            });
        }
    );

    fastify.post(
        "/me/email",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const userRepository = new UserRepository();
            const tokenRepo = new EmailVerificationTokenRepository();

            const userId = request.user.id;
            const { email: newEmail } = request.body as { email: string };

            // Load user
            const user = await userRepository.findById(userId);
            if (!user) {
                return reply.status(404).send({
                    success: false,
                    error: "User not found"
                });
            }

            // Block Google/Microsoft users
            if (user.auth_provider !== "local") {
                return reply.status(400).send({
                    success: false,
                    error: "Email cannot be changed for Google or Microsoft accounts"
                });
            }

            // Validate new email format
            if (!newEmail || typeof newEmail !== "string" || !newEmail.includes("@")) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalide email address"
                });
            }

            // If same as current -> block
            if (newEmail.toLocaleLowerCase() === user.email.toLocaleLowerCase()) {
                return reply.status(400).send({
                    success: false,
                    error: "New email must be different from current email"
                });
            }

            // Ensure email not already taken
            const existing = await userRepository.findByEmail(newEmail);
            if (existing) {
                return reply.status(400).send({
                    success: false,
                    error: "Email is already in use"
                });
            }

            //Invalidate prior pending token
            const pending = await tokenRepo.findPendingByUserId(userId);
            if (pending) {
                await tokenRepo.markAsVerified(pending.id);
            }

            // Generate token
            const rawToken = crypto.randomUUID() + crypto.randomUUID();
            const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

            // Store verification token
            await tokenRepo.create({
                userId,
                email: newEmail,
                tokenHash,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
                ipAddress: request.ip,
                userAgent: request.headers["user-agent"]
            });

            // Send warning to old email + verification to new email
            await emailService.sendEmailChangedNotification(user.email, newEmail, user.name || "");

            await emailService.sendEmailVerification(newEmail, rawToken, user.name || "");

            // Mark email as unverified (will finalize after token verification)
            await userRepository.update(userId, {
                email_verified: false,
                email_verified_at: null
            });

            return reply.send({
                success: true,
                message: "Verification link sent to your new email address"
            });
        }
    );
}
