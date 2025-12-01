import { FastifyInstance } from "fastify";
import { PasswordUtils } from "../../../core/utils/password";
import { TokenUtils } from "../../../core/utils/token";
import { emailService } from "../../../services/email/EmailService";
import { PasswordResetTokenRepository } from "../../../storage/repositories/PasswordResetTokenRepository";
import { UserRepository } from "../../../storage/repositories/UserRepository";
import { validateRequest, UnauthorizedError } from "../../middleware";
import { resetPasswordSchema, ResetPasswordRequest } from "../../schemas/auth-schemas";

export async function resetPasswordRoute(fastify: FastifyInstance) {
    fastify.post(
        "/reset-password",
        {
            preHandler: [validateRequest(resetPasswordSchema)]
        },
        async (request, reply) => {
            const body = request.body as ResetPasswordRequest;
            const { token, password } = body;

            // Hash the token to find it in database
            const tokenHash = TokenUtils.hash(token);

            // Find token in database
            const tokenRepository = new PasswordResetTokenRepository();
            const resetToken = await tokenRepository.findByTokenHash(tokenHash);

            if (!resetToken) {
                throw new UnauthorizedError(
                    "Invalid or expired token. Please request a new password reset."
                );
            }

            // Check if token has expired
            if (TokenUtils.isExpired(resetToken.expires_at)) {
                throw new UnauthorizedError(
                    "Token has expired. Please request a new password reset link."
                );
            }

            // Check if token has already been used
            if (resetToken.used_at) {
                throw new UnauthorizedError(
                    "This token has already been used. Please request a new password reset."
                );
            }

            // Get user
            const userRepository = new UserRepository();
            const user = await userRepository.findById(resetToken.user_id);

            if (!user) {
                throw new UnauthorizedError("User not found.");
            }

            // Hash new password
            const passwordHash = await PasswordUtils.hash(password);

            // Update user password
            await userRepository.updatePassword(user.id, passwordHash);

            // Mark token as used
            await tokenRepository.markAsUsed(resetToken.id);

            // Send password changed notification email
            try {
                await emailService.sendPasswordChangedNotification(
                    user.email,
                    user.name || undefined
                );
                fastify.log.info(`Password changed notification sent to: ${user.email}`);
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                fastify.log.error(
                    `Failed to send password changed notification to ${user.email}: ${errorMsg}`
                );
                // Don't fail the request if email fails
            }

            fastify.log.info(`Password reset successful for user: ${user.email}`);

            return reply.send({
                success: true,
                message: "Password reset successfully. You can now log in with your new password."
            });
        }
    );
}
