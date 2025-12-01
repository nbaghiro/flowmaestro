import { FastifyInstance } from "fastify";
import { config } from "../../../core/config";
import { rateLimiter } from "../../../core/utils/rate-limiter";
import { TokenUtils } from "../../../core/utils/token";
import { emailService } from "../../../services/email/EmailService";
import { PasswordResetTokenRepository } from "../../../storage/repositories/PasswordResetTokenRepository";
import { UserRepository } from "../../../storage/repositories/UserRepository";
import { validateRequest } from "../../middleware";
import { forgotPasswordSchema, ForgotPasswordRequest } from "../../schemas/auth-schemas";

export async function forgotPasswordRoute(fastify: FastifyInstance) {
    fastify.post(
        "/forgot-password",
        {
            preHandler: [validateRequest(forgotPasswordSchema)]
        },
        async (request, reply) => {
            const body = request.body as ForgotPasswordRequest;
            const email = body.email;

            // Check rate limit (3 requests per hour per email)
            const isLimited = await rateLimiter.isRateLimited(
                `password-reset:${email}`,
                config.rateLimit.passwordReset.maxRequests,
                config.rateLimit.passwordReset.windowMinutes
            );

            if (isLimited) {
                const resetTime = await rateLimiter.getResetTime(`password-reset:${email}`);
                return reply.code(429).send({
                    success: false,
                    error: "Too many password reset requests. Please try again later.",
                    details: { retryAfter: resetTime }
                });
            }

            // Find user by email
            const userRepository = new UserRepository();
            const user = await userRepository.findByEmail(email);

            // Anti-enumeration: Always return success even if user doesn't exist
            if (!user) {
                fastify.log.info(`Password reset requested for non-existent email: ${email}`);
                return reply.send({
                    success: true,
                    message:
                        "If an account exists with this email, you will receive a password reset link shortly."
                });
            }

            // Check if user has a password (OAuth users don't)
            if (!user.password_hash) {
                fastify.log.info(`Password reset requested for OAuth-only user: ${email}`);
                // Still return success (anti-enumeration)
                return reply.send({
                    success: true,
                    message:
                        "If an account exists with this email, you will receive a password reset link shortly."
                });
            }

            // Generate token
            const token = TokenUtils.generate();
            const tokenHash = TokenUtils.hash(token);
            const expiresAt = TokenUtils.generateExpiryDate();

            // Store token in database
            const tokenRepository = new PasswordResetTokenRepository();
            await tokenRepository.create({
                userId: user.id,
                tokenHash,
                expiresAt,
                ipAddress: request.ip,
                userAgent: request.headers["user-agent"]
            });

            // Send password reset email
            try {
                await emailService.sendPasswordResetEmail(email, token, user.name || undefined);
                fastify.log.info(`Password reset email sent to: ${email}`);
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                fastify.log.error(`Failed to send password reset email to ${email}: ${errorMsg}`);
                // Don't reveal email sending failure to user
            }

            return reply.send({
                success: true,
                message:
                    "If an account exists with this email, you will receive a password reset link shortly."
            });
        }
    );
}
