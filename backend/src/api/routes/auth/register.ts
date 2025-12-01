import { FastifyInstance } from "fastify";
import { PasswordUtils } from "../../../core/utils/password";
import { TokenUtils } from "../../../core/utils/token";
import { emailService } from "../../../services/email/EmailService";
import { UserRepository } from "../../../storage/repositories";
import { EmailVerificationTokenRepository } from "../../../storage/repositories/EmailVerificationTokenRepository";
import { validateRequest, ValidationError } from "../../middleware";
import { registerSchema, RegisterRequest } from "../../schemas/auth-schemas";

export async function registerRoute(fastify: FastifyInstance) {
    fastify.post(
        "/register",
        {
            preHandler: [validateRequest(registerSchema)]
        },
        async (request, reply) => {
            const userRepository = new UserRepository();
            const body = request.body as RegisterRequest;

            // Check if user already exists
            const existingUser = await userRepository.findByEmail(body.email);

            // Hash password
            const passwordHash = await PasswordUtils.hash(body.password);

            let user;

            if (existingUser) {
                // Check if this is a Google-only account (no password set)
                if (existingUser.auth_provider === "google" && !existingUser.password_hash) {
                    // Link password to existing Google account
                    const updatedUser = await userRepository.update(existingUser.id, {
                        password_hash: passwordHash,
                        name: body.name || existingUser.name || undefined
                    });

                    if (!updatedUser) {
                        throw new ValidationError("Failed to link password to account");
                    }

                    user = updatedUser;
                } else {
                    // User already has a password or is a local account
                    throw new ValidationError("Email already registered");
                }
            } else {
                // Create new user
                user = await userRepository.create({
                    email: body.email,
                    password_hash: passwordHash,
                    name: body.name
                });

                // Generate verification token for new local users
                const verificationToken = TokenUtils.generate();
                const tokenHash = TokenUtils.hash(verificationToken);
                const expiresAt = TokenUtils.generateExpiryDate();

                // Store verification token in database
                const verificationTokenRepo = new EmailVerificationTokenRepository();
                await verificationTokenRepo.create({
                    userId: user.id,
                    email: user.email,
                    tokenHash,
                    expiresAt,
                    ipAddress: request.ip,
                    userAgent: request.headers["user-agent"]
                });

                // Send verification email
                try {
                    await emailService.sendEmailVerification(
                        user.email,
                        verificationToken,
                        user.name || undefined
                    );
                    fastify.log.info(`Verification email sent to: ${user.email}`);
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    fastify.log.error(
                        `Failed to send verification email to ${user.email}: ${errorMsg}`
                    );
                    // Don't fail registration if email fails
                }
            }

            // Generate JWT token
            const token = fastify.jwt.sign({
                id: user.id,
                email: user.email
            });

            return reply.status(201).send({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        avatar_url: user.avatar_url,
                        google_id: user.google_id,
                        has_password: !!user.password_hash,
                        email_verified: user.email_verified
                    },
                    token
                }
            });
        }
    );
}
