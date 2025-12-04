import { FastifyInstance } from "fastify";
import { PasswordUtils } from "../../../core/utils/password";
import { TokenUtils } from "../../../core/utils/token";
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

            // If user has no password AND is using OAuth, block email change
            if (!user.password_hash && (user.google_id || user.microsoft_id)) {
                return reply.status(400).send({
                    success: false,
                    error: "You must set a password before changing your email"
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
            const rawToken = TokenUtils.generate();
            const tokenHash = TokenUtils.hash(rawToken);

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
            await emailService.sendEmailVerification(
                newEmail,
                rawToken,
                user.name || "",
                undefined,
                "change-email"
            );

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

    fastify.post(
        "/me/set-password",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const userRepository = new UserRepository();
            const userId = request.user.id;

            const { password } = request.body as { password: string };

            if (!password || typeof password !== "string" || password.length < 8) {
                return reply.status(400).send({
                    success: false,
                    error: "Password must be at least 8 characters long"
                });
            }

            const user = await userRepository.findById(userId);

            if (!user) {
                return reply.status(404).send({
                    success: false,
                    error: "User not found"
                });
            }

            if (user.password_hash) {
                return reply.status(404).send({
                    success: false,
                    error: "Password is already set. Use change password instead"
                });
            }

            const passwordHash = await PasswordUtils.hash(password);
            await userRepository.updatePassword(user.id, passwordHash);

            const updated = await userRepository.findById(userId);

            if (!updated) {
                return reply.status(500).send({
                    success: false,
                    error: "Failed to set password"
                });
            }

            try {
                await emailService.sendPasswordChangedNotification(
                    updated.email,
                    updated.name || undefined
                );
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                fastify.log.error(
                    `Failed to send password changed notification to ${updated.email}: ${errorMsg}`
                );
            }

            return reply.send({
                success: true,
                message: "Password set successfully",
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
        "/me/password",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const userRepository = new UserRepository();
            const userId = request.user.id;

            const { currentPassword, newPassword } = request.body as {
                currentPassword: string;
                newPassword: string;
            };

            if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
                return reply.status(400).send({
                    success: false,
                    error: "New password must be at least 8 characters long"
                });
            }

            const user = await userRepository.findById(userId);

            if (!user) {
                return reply.status(404).send({
                    success: false,
                    error: "User not found"
                });
            }

            if (!user.password_hash) {
                return reply.status(400).send({
                    success: false,
                    error: "No password set for this account. Use set Password instead"
                });
            }

            const isValid = await PasswordUtils.verify(currentPassword || "", user.password_hash);

            if (!isValid) {
                return reply.status(400).send({
                    success: false,
                    error: "Current password is incorrect"
                });
            }

            const newPasswordHash = await PasswordUtils.hash(newPassword);
            await userRepository.update(user.id, { password_hash: newPasswordHash });

            const updated = await userRepository.findById(userId);

            if (!updated) {
                return reply.status(500).send({
                    success: false,
                    error: "Failed to change password"
                });
            }

            try {
                await emailService.sendPasswordChangedNotification(
                    updated.email,
                    updated.name || undefined
                );
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                fastify.log.error(
                    `Failed to send password changed notification to ${updated.email}: ${errorMsg}`
                );
            }

            return reply.send({
                success: true,
                message: "Password changed successfully",
                data: {
                    user: {
                        id: updated.id,
                        email: updated.email,
                        name: updated.name,
                        avatar_url: updated.avatar_url,
                        google_id: updated.google_id,
                        microsoft_id: updated.microsoft_id,
                        has_password: !!updated.password_hash
                    }
                }
            });
        }
    );
}
