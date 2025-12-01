import { FastifyInstance } from "fastify";
import { TokenUtils } from "../../../core/utils/token";
import { EmailVerificationTokenRepository } from "../../../storage/repositories/EmailVerificationTokenRepository";
import { UserRepository } from "../../../storage/repositories/UserRepository";
import { validateRequest, UnauthorizedError } from "../../middleware";
import { verifyEmailSchema, VerifyEmailRequest } from "../../schemas/auth-schemas";

export async function verifyEmailRoute(fastify: FastifyInstance) {
    fastify.post(
        "/verify-email",
        {
            preHandler: [validateRequest(verifyEmailSchema)]
        },
        async (request, reply) => {
            const body = request.body as VerifyEmailRequest;
            const { token } = body;

            // Hash the token to find it in database
            const tokenHash = TokenUtils.hash(token);

            // Find token in database
            const tokenRepository = new EmailVerificationTokenRepository();
            const verificationToken = await tokenRepository.findByTokenHash(tokenHash);

            if (!verificationToken) {
                throw new UnauthorizedError(
                    "Invalid or expired verification link. Please request a new one."
                );
            }

            // Check if token has expired
            if (TokenUtils.isExpired(verificationToken.expires_at)) {
                throw new UnauthorizedError(
                    "Verification link has expired. Please request a new one."
                );
            }

            // Check if token has already been used
            if (verificationToken.verified_at) {
                // Get user to check current verification status
                const userRepository = new UserRepository();
                const user = await userRepository.findById(verificationToken.user_id);

                if (user?.email_verified) {
                    return reply.send({
                        success: true,
                        message: "This email has already been verified."
                    });
                }
            }

            // Get user
            const userRepository = new UserRepository();
            const user = await userRepository.findById(verificationToken.user_id);

            if (!user) {
                throw new UnauthorizedError("User not found.");
            }

            // Update user email verification status
            await userRepository.updateEmailVerification(user.id);

            // Mark token as verified
            await tokenRepository.markAsVerified(verificationToken.id);

            fastify.log.info(`Email verified for user: ${user.email}`);

            return reply.send({
                success: true,
                message: "Email verified successfully!"
            });
        }
    );
}
