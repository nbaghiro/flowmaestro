import { FastifyInstance } from "fastify";
import { PasswordUtils } from "../../../core/utils/password";
import {
    generateCode,
    hashCode,
    formatPhoneNumber,
    normalizeAndHashBackupCode
} from "../../../core/utils/two-factor";
import { sendSms } from "../../../services/TwilioService";
import { UserRepository } from "../../../storage/repositories";
import { TwoFactorBackupCodeRepository } from "../../../storage/repositories/TwoFactorBackupCodeRepository";
import { TwoFactorTokenRepository } from "../../../storage/repositories/TwoFactorTokenRepository";
import { validateRequest, UnauthorizedError } from "../../middleware";
import { loginSchema, LoginRequest } from "../../schemas/auth-schemas";

export async function loginRoute(fastify: FastifyInstance) {
    const twoFactorTokenRepo = new TwoFactorTokenRepository();
    const twoFactorBackupCodeRepo = new TwoFactorBackupCodeRepository();

    fastify.post(
        "/login",
        {
            preHandler: [validateRequest(loginSchema)]
        },
        async (request, reply) => {
            const userRepository = new UserRepository();
            const body = request.body as LoginRequest;

            // Find user by email
            const user = await userRepository.findByEmail(body.email);
            if (!user) {
                throw new UnauthorizedError("Invalid credentials");
            }

            // Check if user is OAuth-only (no password)
            if (!user.password_hash) {
                throw new UnauthorizedError(
                    "This account uses Google sign-in. Please use the 'Continue with Google' button."
                );
            }

            // Verify password
            const isValidPassword = await PasswordUtils.verify(body.password, user.password_hash);
            if (!isValidPassword) {
                throw new UnauthorizedError("Invalid credentials");
            }

            // If 2FA is enabled, require code verification
            if (user.two_factor_enabled) {
                if (!user.two_factor_phone || !user.two_factor_phone_verified) {
                    fastify.log.warn(
                        `[2FA] User ${user.id} has 2FA enabled but missing/invalid phone. Skipping 2FA for login.`
                    );
                } else if (body.code) {
                    let verified = false;

                    // Try SMS/primary token first
                    const token = await twoFactorTokenRepo.findValidCode(user.id);
                    if (token) {
                        const inputHash = hashCode(body.code);
                        if (inputHash === token.code_hash) {
                            await twoFactorTokenRepo.consumeCode(token.id);
                            verified = true;
                        }
                    }

                    // If not verified, try backup codes
                    if (!verified) {
                        const normalizedCode = body.code.replace(/-/g, "").toUpperCase();
                        const backupHash = normalizeAndHashBackupCode(normalizedCode);
                        const consumed = await twoFactorBackupCodeRepo.consumeCode(
                            user.id,
                            backupHash
                        );
                        if (consumed) {
                            verified = true;
                        }
                    }

                    if (!verified) {
                        throw new UnauthorizedError("Invalid or expired verification code");
                    }
                } else {
                    const code = generateCode();
                    const codeHash = hashCode(code);

                    await twoFactorTokenRepo.saveCode({
                        user_id: user.id,
                        code_hash: codeHash,
                        expires_at: new Date(Date.now() + 5 * 60 * 1000),
                        ip_address: request.ip,
                        user_agent: request.headers["user-agent"]
                    });

                    await sendSms(
                        user.two_factor_phone,
                        `Your FlowMaestro verification code: ${code}`
                    );

                    return reply.send({
                        success: true,
                        data: {
                            two_factor_required: true,
                            masked_phone: formatPhoneNumber(user.two_factor_phone)
                        }
                    });
                }
            }

            // Update last login
            await userRepository.update(user.id, {
                last_login_at: new Date()
            });

            // Generate JWT token
            const token = fastify.jwt.sign({
                id: user.id,
                email: user.email
            });

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
                        has_password: !!user.password_hash,
                        two_factor_enabled: user.two_factor_enabled,
                        two_factor_phone: user.two_factor_phone,
                        two_factor_phone_verified: user.two_factor_phone_verified
                    },
                    token
                }
            });
        }
    );
}
