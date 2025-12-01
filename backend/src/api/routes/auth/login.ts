import { FastifyInstance } from "fastify";
import { PasswordUtils } from "../../../core/utils/password";
import { UserRepository } from "../../../storage/repositories";
import { validateRequest, UnauthorizedError } from "../../middleware";
import { loginSchema, LoginRequest } from "../../schemas/auth-schemas";

export async function loginRoute(fastify: FastifyInstance) {
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
                        has_password: !!user.password_hash
                    },
                    token
                }
            });
        }
    );
}
