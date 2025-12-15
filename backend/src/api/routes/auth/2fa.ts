import { FastifyInstance } from "fastify";
import {
    generateCode,
    hashCode,
    validatePhoneNumber,
    generateBackupCodes,
    normalizeAndHashBackupCode
} from "../../../core/utils/two-factor";
import { emailService } from "../../../services/email/EmailService";
import { sendSms } from "../../../services/TwilioService";
import { UserRepository } from "../../../storage/repositories";
import { TwoFactorBackupCodeRepository } from "../../../storage/repositories/TwoFactorBackupCodeRepository";
import { TwoFactorTokenRepository } from "../../../storage/repositories/TwoFactorTokenRepository";
import { authMiddleware } from "../../middleware";

export async function twoFactorRoutes(fastify: FastifyInstance) {
    const tokenRepo = new TwoFactorTokenRepository();
    const backupCodeReo = new TwoFactorBackupCodeRepository();
    const userRepo = new UserRepository();

    fastify.post(
        "/2fa/send-code",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const userId = request.user.id;
            const { phone } = request.body as { phone: string };

            if (!phone) {
                return reply.status(400).send({
                    success: false,
                    error: "Phone number is required"
                });
            }

            if (!validatePhoneNumber(phone)) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid phone number format"
                });
            }

            const code = generateCode();
            const codeHash = hashCode(code);

            await tokenRepo.saveCode({
                user_id: userId,
                code_hash: codeHash,
                expires_at: new Date(Date.now() + 5 * 60 * 1000)
            });

            await sendSms(phone, `Your FlowMaestro verification code: ${code}`);

            return reply.send({
                success: true,
                message: "Verification code sent"
            });
        }
    );

    fastify.post(
        "/2fa/verify/code",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            console.log("[2FA][DEBUG] REQUEST USER:", request.user);
            console.log("[2FA][DEBUG] HEADERS:", request.headers);

            const userId = request.user.id;
            const { code } = request.body as { code: string; phone?: string };
            const { phone } = request.body as { phone?: string; code: string };

            if (!code) {
                return reply.status(400).send({
                    success: false,
                    error: "Verification code is required"
                });
            }

            const token = await tokenRepo.findValidCode(userId);

            if (!token) {
                return reply.status(400).send({
                    success: false,
                    error: "No valid verification code found or code expired"
                });
            }

            const inputHash = hashCode(code);

            if (inputHash !== token.code_hash) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid verification code"
                });
            }

            await tokenRepo.consumeCode(token.id);
            const backupCodes = generateBackupCodes();

            for (const backupCode of backupCodes) {
                await backupCodeReo.create({
                    user_id: userId,
                    code_hash: normalizeAndHashBackupCode(backupCode)
                });
            }

            await userRepo.update(userId, {
                two_factor_enabled: true,
                two_factor_phone: phone || null,
                two_factor_phone_verified: true
            });

            try {
                const updatedUser = await userRepo.findById(userId);
                if (updatedUser) {
                    await emailService.sendTwoFactorEnabledNotification(
                        updatedUser.email,
                        phone || updatedUser.two_factor_phone || "",
                        backupCodes,
                        updatedUser.name || undefined
                    );
                }
            } catch (err) {
                fastify.log.error(
                    `[2FA] Failed to send 2FA enabled email for user ${userId}: ${
                        err instanceof Error ? err.message : String(err)
                    }`
                );
            }

            return reply.send({
                success: true,
                message: "Two-factor authentication enabled",
                backupCodes
            });
        }
    );

    fastify.post(
        "/2fa/disable",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const userId = request.user.id;

            await userRepo.update(userId, {
                two_factor_enabled: false,
                two_factor_phone: null,
                two_factor_phone_verified: false,
                two_factor_secret: null
            });

            await tokenRepo.deleteByUserId(userId);
            await backupCodeReo.deleteByUserId(userId);

            try {
                const updatedUser = await userRepo.findById(userId);
                if (updatedUser) {
                    await emailService.sendTwoFactorDisabledNotification(
                        updatedUser.email,
                        updatedUser.name || undefined
                    );
                }
            } catch (err) {
                fastify.log.error(
                    `[2FA] Failed to send 2FA disabled email for user ${userId}: ${
                        err instanceof Error ? err.message : String(err)
                    }`
                );
            }

            return reply.send({
                success: true,
                message: "Two-factor authentication disabled"
            });
        }
    );
}
