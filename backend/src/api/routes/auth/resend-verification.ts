import { FastifyInstance } from "fastify";
import { config } from "../../../core/config";
import { rateLimiter } from "../../../core/utils/rate-limiter";
import { TokenUtils } from "../../../core/utils/token";
import { emailService } from "../../../services/email/EmailService";
import { EmailVerificationTokenRepository } from "../../../storage/repositories/EmailVerificationTokenRepository";
import { UserRepository } from "../../../storage/repositories/UserRepository";
import { authMiddleware, BadRequestError } from "../../middleware";

export async function resendVerificationRoute(fastify: FastifyInstance) {
    fastify.post(
        "/resend-verification",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            // User is authenticated via JWT
            const userId = request.user.id;

            // Get user data
            const userRepository = new UserRepository();
            const user = await userRepository.findById(userId);

            if (!user) {
                return reply.code(404).send({
                    success: false,
                    error: "User not found"
                });
            }

            // Check if email is already verified
            if (user.email_verified) {
                throw new BadRequestError("Your email is already verified.");
            }

            // OAuth users don't need email verification
            if (user.auth_provider !== "local") {
                throw new BadRequestError("Email verification not required for OAuth accounts.");
            }

            // Check rate limit (5 requests per hour per user)
            const isLimited = await rateLimiter.isRateLimited(
                `email-verification:${userId}`,
                config.rateLimit.emailVerification.maxRequests,
                config.rateLimit.emailVerification.windowMinutes
            );

            if (isLimited) {
                const resetTime = await rateLimiter.getResetTime(`email-verification:${userId}`);
                return reply.code(429).send({
                    success: false,
                    error: "Too many requests. Please wait before requesting another verification email.",
                    details: { retryAfter: resetTime }
                });
            }

            // Generate new verification token
            const token = TokenUtils.generate();
            const tokenHash = TokenUtils.hash(token);
            const expiresAt = TokenUtils.generateExpiryDate();

            // Store token in database
            const tokenRepository = new EmailVerificationTokenRepository();
            await tokenRepository.create({
                userId: user.id,
                email: user.email,
                tokenHash,
                expiresAt,
                ipAddress: request.ip,
                userAgent: request.headers["user-agent"]
            });

            // Send verification email
            try {
                await emailService.sendEmailVerification(user.email, token, user.name || undefined);
                fastify.log.info(`Verification email resent to: ${user.email}`);
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                fastify.log.error(
                    `Failed to send verification email to ${user.email}: ${errorMsg}`
                );
                return reply.code(500).send({
                    success: false,
                    error: "Failed to send verification email. Please try again later."
                });
            }

            return reply.send({
                success: true,
                message: "Verification email sent. Please check your inbox."
            });
        }
    );
}
