import { FastifyInstance } from "fastify";
import { twoFactorRoutes } from "./2fa";
import { forgotPasswordRoute } from "./forgot-password";
import { googleAuthRoutes } from "./google";
import { loginRoute } from "./login";
import { meRoute } from "./me";
import { microsoftAuthRoutes } from "./microsoft";
import { registerRoute } from "./register";
import { resendVerificationRoute } from "./resend-verification";
import { resetPasswordRoute } from "./reset-password";
import { verifyEmailRoute } from "./verify-email";

export async function authRoutes(fastify: FastifyInstance) {
    await registerRoute(fastify);
    await loginRoute(fastify);
    await meRoute(fastify);
    await googleAuthRoutes(fastify);
    await microsoftAuthRoutes(fastify);
    await forgotPasswordRoute(fastify);
    await resetPasswordRoute(fastify);
    await verifyEmailRoute(fastify);
    await resendVerificationRoute(fastify);
    await twoFactorRoutes(fastify);
}
